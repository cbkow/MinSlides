#!/usr/bin/env bash
# ============================================
# secure_build.sh — Sign CDN URLs + encrypt
#
# Signs all Bunny CDN and Stream URLs in the
# slideshow, then encrypts with StatiCrypt.
#
# Prompts for all secrets interactively unless
# set as env variables:
#   BUNNY_CDN_HOST, BUNNY_CDN_KEY
#   BUNNY_STREAM_HOST, BUNNY_STREAM_KEY
# ============================================

set -e

SOURCE="slideshow.html"
SIGNED="_signed.html"
TEMPLATE="password_template.html"
TITLE="Presentation"
INSTRUCTIONS="Enter the password to view this presentation."
COLOR_PRIMARY="rgb(0, 120, 212)"

# ---- Check source exists ----
if [ ! -f "$SOURCE" ]; then
  echo "Error: $SOURCE not found."
  exit 1
fi

echo "=== Secure Build ==="
echo ""

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

# ---- CDN host/key ----
CDN_HOST="${BUNNY_CDN_HOST:-}"
CDN_KEY="${BUNNY_CDN_KEY:-}"
if [ -z "$CDN_HOST" ]; then
  echo -n "Bunny CDN hostname (e.g., your-zone.b-cdn.net): "
  read CDN_HOST
fi
if [ -z "$CDN_KEY" ]; then
  echo -n "Bunny CDN security key: "
  read -s CDN_KEY
  echo
fi

# ---- Stream host/key ----
STREAM_HOST="${BUNNY_STREAM_HOST:-}"
STREAM_KEY="${BUNNY_STREAM_KEY:-}"
if [ -z "$STREAM_HOST" ]; then
  echo -n "Bunny Stream hostname (e.g., vz-xxxxx.b-cdn.net): "
  read STREAM_HOST
fi
if [ -z "$STREAM_KEY" ]; then
  echo -n "Bunny Stream security key: "
  read -s STREAM_KEY
  echo
fi

# ---- Expiration ----
echo -n "URL expiration (e.g., 7d, 30d, 90d) [30d]: "
read EXPIRES_IN
EXPIRES_IN="${EXPIRES_IN:-30d}"

# ---- StatiCrypt password ----
echo -n "Slideshow password: "
read -s PASSWORD
echo
echo -n "Confirm password: "
read -s PASSWORD_CONFIRM
echo

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
  echo "Error: Passwords don't match."
  exit 1
fi

# ---- Step 1: Sign URLs ----
echo ""
echo "Signing CDN URLs..."

node sign_urls.js "$SOURCE" \
  --cdn-host "$CDN_HOST" \
  --cdn-key "$CDN_KEY" \
  --stream-host "$STREAM_HOST" \
  --stream-key "$STREAM_KEY" \
  --expires-in "$EXPIRES_IN" \
  --output "$SIGNED"

# ---- Step 2: Encrypt ----
echo "Encrypting → ${OUTPUT_DIR}/${OUTPUT_NAME}..."

npx staticrypt "$SIGNED" \
  -d "$OUTPUT_DIR" \
  -t "$TEMPLATE" \
  --short \
  --password "$PASSWORD" \
  --template-title "$TITLE" \
  --template-instructions "$INSTRUCTIONS" \
  --template-color-primary "$COLOR_PRIMARY" \
  --template-button-label "Open" \
  --remember 30

# StatiCrypt outputs with the input filename — rename to our output name
if [ -f "$OUTPUT_DIR/$SIGNED" ]; then
  mv "$OUTPUT_DIR/$SIGNED" "$OUTPUT_DIR/$OUTPUT_NAME"
fi

# ---- Step 3: Copy sidecar files ----
echo "Copying assets..."
cp styles.css "$OUTPUT_DIR/"
cp password_template.html "$OUTPUT_DIR/"
cp -r fonts "$OUTPUT_DIR/"
cp -r images "$OUTPUT_DIR/"
[ -d slides ] && cp -r slides "$OUTPUT_DIR/"

# ---- Cleanup ----
rm -f "$SIGNED"

# ---- Done ----
EXPIRY_DATE=$(node -e "const d='$EXPIRES_IN'.match(/^(\d+)([dhm])$/);const m={d:86400,h:3600,m:60};console.log(new Date(Date.now()+parseInt(d[1])*m[d[2]]*1000).toISOString().split('T')[0])")

echo ""
echo "Done. Deployable package: ${OUTPUT_DIR}/"
echo ""
ls -1 "$OUTPUT_DIR/"
echo ""
echo "!! Signed URLs expire: ${EXPIRY_DATE}"
echo "!! Rebuild before then to keep the slideshow working."
