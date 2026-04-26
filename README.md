# OpenAI Compatible Translator - Bob Plugin

一个支持任何 OpenAI 兼容 API 的 Bob 翻译插件，可用于 DeepSeek、OpenAI、Ollama、OpenRouter 等服务。

## 功能

- 文本翻译：支持 100+ 种语言互译
- 文本润色：源语言和目标语言相同时自动进入润色模式
- 自定义 Prompt：支持自定义 System Prompt 和 User Prompt
- 多 API Key 负载均衡：支持逗号分隔多个 API Key
- 模型自由配置：可填写任意模型名称

## 使用方法

1. 安装 [Bob](https://bobtranslate.com/guide/#%E5%AE%89%E8%A3%85)（版本 >= 0.50），macOS 平台的翻译和 OCR 软件

2. 从 [Releases](https://github.com/yunfong/bob-plugin-openai-compitable/releases/latest) 下载最新版本的 `.bobplugin` 文件

3. 双击下载的 `.bobplugin` 文件安装插件

4. 在 Bob 偏好设置 > 服务中配置插件：
   - **API URL**：填写你的 API 地址（默认 `https://api.deepseek.com`）
   - **API KEY**：填写你的 API Key
   - **模型**：填写模型名称（默认 `deepseek-v4-flash`）
