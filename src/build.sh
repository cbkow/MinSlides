#!/usr/bin/env bash
# ============================================
# build.sh — Encrypt slideshow with StatiCrypt
# No npm install required, uses npx.
# ============================================

set -e

TEMPLATE="password_template.html"
TITLE="Presentation"
INSTRUCTIONS="Enter the password to view this presentation."
COLOR_PRIMARY="rgb(0, 120, 212)"

# ---- Compose + generate thumbnails ----
echo "Composing slides..."
node compose.js

echo "Generating thumbnails..."
node thumbs.js

SOURCE="build/composed/slideshow.html"

# ---- Check source exists ----
if [ ! -f "$SOURCE" ]; then
  echo "Error: $SOURCE not found."
  exit 1
fi

# ---- Prompt for output name ----
echo -n "Output filename (e.g., My Project Name) [slideshow]: "
read RAW_NAME
RAW_NAME="${RAW_NAME:-slideshow}"

# Sanitize: lowercase, spaces to underscores, strip illegal chars, collapse underscores
OUTPUT_NAME=$(echo "$RAW_NAME" \
  | tr '[:upper:]' '[:lower:]' \
  | tr ' ' '_' \
  | tr -cd 'a-z0-9_-' \
  | sed 's/__*/_/g; s/^_//; s/_$//')
OUTPUT_NAME="${OUTPUT_NAME}.html"

OUTPUT_DIR="dist/${OUTPUT_NAME%.html}"

mkdir -p "$OUTPUT_DIR"

# ---- Prompt for password ----
PASSWORD="${1:-}"
if [ -z "$PASSWORD" ]; then
  echo -n "Enter password: "
  read -s PASSWORD
  echo
  echo -n "Confirm password: "
  read -s PASSWORD_CONFIRM
  echo

  if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo "Error: Passwords don't match."
    exit 1
  fi
fi

# ---- Encrypt ----
echo ""
echo "Encrypting ${SOURCE} → ${OUTPUT_DIR}/${OUTPUT_NAME}..."

npx staticrypt "$SOURCE" \
  -d "$OUTPUT_DIR" \
  -t "$TEMPLATE" \
  --short \
  --password "$PASSWORD" \
  --template-title "$TITLE" \
  --template-instructions "$INSTRUCTIONS" \
  --template-color-primary "$COLOR_PRIMARY" \
  --template-button-label "Open" \
  --remember 30

# StatiCrypt outputs with the source basename — rename to our output name
SOURCE_BASE="$(basename "$SOURCE")"
if [ "$OUTPUT_NAME" != "$SOURCE_BASE" ] && [ -f "$OUTPUT_DIR/$SOURCE_BASE" ]; then
  mv "$OUTPUT_DIR/$SOURCE_BASE" "$OUTPUT_DIR/$OUTPUT_NAME"
fi

# ---- Copy sidecar files ----
echo "Copying assets..."
cp styles.css "$OUTPUT_DIR/"
cp password_template.html "$OUTPUT_DIR/"
cp -r fonts "$OUTPUT_DIR/"
cp -r images "$OUTPUT_DIR/"
[ -d thumbs ] && cp -r thumbs "$OUTPUT_DIR/"

echo ""
echo "Done. Deployable package: ${OUTPUT_DIR}/"
echo ""
ls -1 "$OUTPUT_DIR/"
