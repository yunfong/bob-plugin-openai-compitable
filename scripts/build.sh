#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SRC_DIR="$PROJECT_DIR/src"
DIST_DIR="$PROJECT_DIR/dist"
PLUGIN_NAME="openai-compitable-translator"

# 清理旧产物
rm -rf "$DIST_DIR" "$PROJECT_DIR/$PLUGIN_NAME.bobplugin"

# 复制插件文件到 dist
mkdir -p "$DIST_DIR"
cp "$SRC_DIR"/info.json "$SRC_DIR"/main.js "$SRC_DIR"/lang.js "$SRC_DIR"/icon.png "$DIST_DIR/"

echo "[1/2] 复制文件到 dist/ 完成"

# 调试模式：重命名 dist 为 .bobplugin 后缀，Bob 可直接加载
mv "$DIST_DIR" "$PROJECT_DIR/$PLUGIN_NAME.bobplugin"

echo "[2/2] 调试模式: dist -> $PLUGIN_NAME.bobplugin"
echo "Bob 可直接加载: $PROJECT_DIR/$PLUGIN_NAME.bobplugin"
ls -la "$PROJECT_DIR/$PLUGIN_NAME.bobplugin"
