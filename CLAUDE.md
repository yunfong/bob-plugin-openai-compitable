# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Bob (macOS translation/OCR app) plugin that uses any OpenAI-compatible API for translation and text polishing. Bob plugins run in Bob's built-in JavaScript runtime — there are no npm dependencies.

## Build & Development Commands

```bash
# Build the plugin (creates openai-compitable-translator.bobplugin directory)
bash scripts/build.sh

# Release: triggered by pushing a version tag
git tag v0.1.0
git push origin v0.1.0
```

The build script copies `src/` files into a `.bobplugin` directory that Bob can load directly. There are no tests or linting configured.

## Architecture

**Plugin entry points** (`src/main.js` exports):
- `supportLanguages()` — returns list of supported language codes
- `translate(query, completion)` — main translation function

**Key flow**: `translate()` reads `$option` (Bob-provided config) → builds API request via `buildRequestBody()` → calls OpenAI-compatible chat completions API (`/v1/chat/completions`) → processes response through `handleResponse()` → calls `completion()` with result.

**Prompt generation** (`generatePrompts()` in `src/main.js`):
- When source and target languages differ: generates translation prompts in English
- When they match: switches to text polishing mode
- Special handling for Chinese variants (zh-Hans/zh-Hant), Cantonese (yue), and Classical Chinese (wyw)
- Custom prompts (`customSystemPrompt`/`customUserPrompt` in `$option`) override the defaults

**Multi-API-key load balancing**: `apiKeys` option accepts comma-separated keys; one is selected randomly per request.

## Bob Plugin Globals

The runtime provides global variables (`$http`, `$option`, `$info`, `$log`, `$data`, `$file`) typed in `global.d.ts`. Bob's plugin API documentation: https://ripperhe.gitee.io/bob/#/plugin/quickstart/info

## Plugin Configuration

Defined in `src/info.json` under `options`: `apiUrl`, `apiKeys`, `model` (free text input), `customSystemPrompt`, `customUserPrompt`.

## Release Process

Pushing a `v*.*.*` tag triggers `.github/workflows/release.yaml` which:
1. Updates version in `src/info.json`
2. Zips `src/` into a `.bobplugin` file
3. Runs `scripts/update_release.py` to update `appcast.json` with SHA256 and version info
4. Commits and pushes changes, uploads release artifact
