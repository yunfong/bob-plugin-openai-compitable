//@ts-check

var lang = require("./lang.js")

/**
 * @param {string}  url
 * @returns {string}
 */
function ensureHttpsAndNoTrailingSlash(url) {
  const hasProtocol = /^[a-z]+:\/\//i.test(url)
  const modifiedUrl = hasProtocol ? url : "https://" + url

  return modifiedUrl.endsWith("/") ? modifiedUrl.slice(0, -1) : modifiedUrl
}

/**
 * @param {string} apiKey - The authentication API key.
 * @returns {{
 *   "Content-Type": string;
 *   "Authorization": string;
 * }}
 */
function buildHeader(apiKey) {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  }
}

/**
 * @param {Bob.TranslateQuery} query
 * @returns {{
 *  systemPrompt: string,
 *  userPrompt: string
 * }}
 */
function generatePrompts(query) {
  const sourceLang = lang.langMap.get(query.detectFrom) || query.detectFrom
  const targetLang = lang.langMap.get(query.detectTo) || query.detectTo

  // Source and target language are the same: polishing mode
  if (query.detectFrom === query.detectTo) {
    return {
      systemPrompt:
        "You are a text polishing engine. Your task is to refine and improve the given text for clarity, fluency and style, in its original language. Output only the polished text, with no explanations.",
      userPrompt: `Polish the following text:\n\n"${query.text}"`,
    }
  }

  // Translation mode
  let systemPrompt =
    "You are a professional multilingual translator. Translate the given text accurately and naturally, " +
    "preserving the original meaning, tone, and style. For individual words, provide precise translations. " +
    "For sentences, consider cultural nuances, regional differences, and historical references where applicable. " +
    "Output only the translated text, with no explanations or additional commentary."

  let userPrompt = `Translate the following text from ${sourceLang} to ${targetLang}:\n\n"${query.text}"`

  // Special handling for Chinese variants as target
  if (query.detectTo === "zh-Hant") {
    userPrompt = `Translate the following text into Traditional Chinese (繁體中文):\n\n"${query.text}"`
  } else if (query.detectTo === "zh-Hans") {
    userPrompt = `Translate the following text into Simplified Chinese (简体中文):\n\n"${query.text}"`
  } else if (query.detectTo === "yue") {
    userPrompt = `Translate the following text into Cantonese (粤语白话文):\n\n"${query.text}"`
  } else if (query.detectTo === "wyw") {
    userPrompt = `Translate the following text into Classical Chinese (文言文):\n\n"${query.text}"`
  }

  // When translating from Classical Chinese, clarify the source
  if (query.detectFrom === "wyw") {
    userPrompt = userPrompt.replace(
      "Translate the following text",
      "Translate the following Classical Chinese (文言文) text"
    )
  }

  return { systemPrompt, userPrompt }
}

/**
 * @param {string} model
 * @param {Bob.TranslateQuery} query
 * @returns {{
 *  model: string;
 *  messages: {
 *    role: "system" | "user";
 *    content: string;
 *  }[];
 * }}
 */
function buildRequestBody(model, query) {
  const { customSystemPrompt, customUserPrompt } = $option
  const { systemPrompt, userPrompt } =
    customSystemPrompt || customUserPrompt
      ? {
          systemPrompt:
            customSystemPrompt || "Follow the user's instructions carefully.",
          userPrompt: `${customUserPrompt}:\n\n"${query.text}"`,
        }
      : generatePrompts(query)

  return {
    model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ],
  }
}

/**
 * @param {Bob.Completion} completion
 * @param {Bob.HttpResponse} result
 * @returns {void}
 */
function handleError(completion, result) {
  const { statusCode } = result.response
  const reason = statusCode >= 400 && statusCode < 500 ? "param" : "api"
  completion({
    error: {
      type: reason,
      message: `接口响应错误 - ${result.data.error.message}`,
      addtion: JSON.stringify(result),
    },
  })
}

/**
 * @param {Bob.Completion} completion
 * @param {Bob.TranslateQuery} query
 * @param {Bob.HttpResponse} result
 * @returns {void}
 */
function handleResponse(completion, query, result) {
  const { choices } = result.data

  if (!choices || choices.length === 0) {
    completion({
      error: {
        type: "api",
        message: "接口未返回结果",
        addtion: JSON.stringify(result),
      },
    })
    return
  }

  let targetText = choices[0].message.content.trim()

  // Remove wrapping quotes that models sometimes add
  targetText = targetText.replace(/^["「『"'"]+|["」』"'"]+$/g, "")
  // Remove trailing `" =>` artifacts
  if (targetText.endsWith('" =>')) {
    targetText = targetText.slice(0, -4)
  }

  completion({
    result: {
      from: query.detectFrom,
      to: query.detectTo,
      toParagraphs: targetText.split("\n"),
    },
  })
}

/**
 * @type {Bob.Translate}
 */
function translate(query, completion) {
  if (!lang.langMap.get(query.detectTo)) {
    completion({
      error: {
        type: "unsupportLanguage",
        message: "不支持该语种",
        addtion: "不支持该语种",
      },
    })
    return
  }

  const { model, apiKeys, apiUrl } = $option

  if (!apiKeys) {
    completion({
      error: {
        type: "secretKey",
        message: "配置错误 - 请确保您在插件配置中填入了正确的 API Keys",
        addtion: "请在插件配置中填写 API Keys",
      },
    })
    return
  }

  const trimmedApiKeys = apiKeys.endsWith(",") ? apiKeys.slice(0, -1) : apiKeys
  const apiKeySelection = trimmedApiKeys.split(",").map((key) => key.trim())
  const apiKey =
    apiKeySelection[Math.floor(Math.random() * apiKeySelection.length)]

  const modifiedApiUrl = ensureHttpsAndNoTrailingSlash(
    apiUrl || "https://api.deepseek.com"
  )

  const header = buildHeader(apiKey)
  const body = buildRequestBody(model, query)

  ;(async () => {
    const result = await $http.request({
      method: "POST",
      url: modifiedApiUrl + "/v1/chat/completions",
      header,
      body,
    })

    if (result.error) {
      handleError(completion, result)
    } else {
      handleResponse(completion, query, result)
    }
  })().catch((err) => {
    completion({
      error: {
        type: err._type || "unknown",
        message: err._message || "未知错误",
        addtion: err._addition,
      },
    })
  })
}

function supportLanguages() {
  return lang.supportLanguages.map(([standardLang]) => standardLang)
}

exports.supportLanguages = supportLanguages
exports.translate = translate
