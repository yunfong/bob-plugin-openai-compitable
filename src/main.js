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
        "你是文字润色专家。改善给定文本的流畅度和表达，保持原意。只输出润色后的文本。",
      userPrompt: `润色以下文本：\n\n"${query.text}"`,
    }
  }

  // Translation mode
  let systemPrompt =
    "你是专业翻译。优先准确传达原文含义（六成），同时用目标语言的地道表达（四成）。只输出译文。"

  let userPrompt = `将以下文本从${sourceLang}翻译为${targetLang}：\n\n"${query.text}"`

  if (query.detectTo === "zh-Hant") {
    userPrompt = `将以下文本翻译为繁體中文：\n\n"${query.text}"`
  } else if (query.detectTo === "zh-Hans") {
    userPrompt = `将以下文本翻译为简体中文：\n\n"${query.text}"`
  } else if (query.detectTo === "yue") {
    userPrompt = `将以下文本翻译为粤语白话文：\n\n"${query.text}"`
  } else if (query.detectTo === "wyw") {
    userPrompt = `将以下文本翻译为文言文：\n\n"${query.text}"`
  }

  if (query.detectFrom === "wyw") {
    userPrompt = userPrompt.replace("将以下文本", "将以下文言文")
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

  const body = {
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

  const temperature = parseFloat($option.temperature)
  if (!isNaN(temperature) && temperature >= 0 && temperature <= 2) {
    body.temperature = temperature
  }

  return body
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
