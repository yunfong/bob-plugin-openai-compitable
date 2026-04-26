# OpenAI Compatible Translator - Bob Plugin

A Bob translation plugin that supports any OpenAI-compatible API, works with DeepSeek, OpenAI, Ollama, OpenRouter and more.

## Features

- Text translation: supports 100+ languages
- Text polishing: automatically enters polishing mode when source and target languages match
- Custom Prompts: supports custom System Prompt and User Prompt
- Multi API Key load balancing: comma-separated keys supported
- Configurable model: enter any model name

## Usage

1. Install [Bob](https://bobtranslate.com/guide/#%E5%AE%89%E8%A3%85) (version >= 0.50), a macOS translation and OCR app

2. Download the latest `.bobplugin` file from [Releases](https://github.com/yunfong/bob-plugin-openai-compitable/releases/latest)

3. Double-click the downloaded `.bobplugin` file to install

4. Configure the plugin in Bob Preferences > Services:
   - **API URL**: Your API address (default `https://api.deepseek.com`)
   - **API KEY**: Your API key
   - **Model**: Model name (default `deepseek-v4-flash`)
