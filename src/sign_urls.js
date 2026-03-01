#!/usr/bin/env node
/**
 * sign_urls.js — Signs Bunny CDN and Bunny Stream URLs in an HTML file.
 *
 * Reads the source HTML, finds URLs matching the configured hostnames,
 * signs each with the appropriate security key and expiration, and
 * writes the result to stdout (or a file via --output).
 *
 * Usage:
 *   node sign_urls.js slideshow.html \
 *     --cdn-host your-pullzone.b-cdn.net \
 *     --cdn-key  YOUR_CDN_SECURITY_KEY \
 *     --stream-host vz-xxxxx.b-cdn.net \
 *     --stream-key  YOUR_STREAM_SECURITY_KEY \
 *     --expires-in 30d \
 *     --output signed.html
 */

const crypto = require('crypto');
const fs = require('fs');

// --- Parse CLI args ---
const args = process.argv.slice(2);
const inputFile = args[0];

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const cdnHost    = getArg('--cdn-host');
const cdnKey     = getArg('--cdn-key');
const streamHost = getArg('--stream-host');
const streamKey  = getArg('--stream-key');
const expiresIn  = getArg('--expires-in') || '30d';
const outputFile = getArg('--output');

if (!inputFile || (!cdnHost && !streamHost)) {
  console.error(`
Usage: node sign_urls.js <input.html>
  --cdn-host    <hostname>   Bunny CDN pull zone hostname
  --cdn-key     <key>        Bunny CDN security key
  --stream-host <hostname>   Bunny Stream hostname
  --stream-key  <key>        Bunny Stream security key
  --expires-in  <duration>   Expiration (e.g., 7d, 30d, 90d) [default: 30d]
  --output      <file>       Output file [default: stdout]

At least one host/key pair is required.
  `);
  process.exit(1);
}

// --- Parse duration to unix timestamp ---
function parseExpiration(duration) {
  const match = duration.match(/^(\d+)([dhm])$/);
  if (!match) {
    console.error(`Invalid duration "${duration}". Use format: 7d, 30d, 90d, 24h, etc.`);
    process.exit(1);
  }
  const value = parseInt(match[1]);
  const unit = match[2];
  const multipliers = { d: 86400, h: 3600, m: 60 };
  return Math.floor(Date.now() / 1000) + (value * multipliers[unit]);
}

// --- Sign a single URL ---
function signUrl(rawUrl, securityKey, expires) {
  const parsed = new URL(rawUrl);
  const path = parsed.pathname;
  const token = crypto.createHash('sha256')
    .update(securityKey + path + expires)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${parsed.origin}${path}?token=${token}&expires=${expires}`;
}

// --- Build host-to-key map ---
const hostMap = {};
if (cdnHost && cdnKey)       hostMap[cdnHost] = cdnKey;
if (streamHost && streamKey) hostMap[streamHost] = streamKey;

const expires = parseExpiration(expiresIn);
const expiresDate = new Date(expires * 1000).toISOString().split('T')[0];

// --- Read and process HTML ---
let html = fs.readFileSync(inputFile, 'utf-8');
let signedCount = 0;

// Match URLs containing any of our configured hostnames.
// Captures URLs in: src="...", url('...'), url("..."), data-*="..."
const hostPatterns = Object.keys(hostMap).map(h => h.replace(/\./g, '\\.')).join('|');
const urlRegex = new RegExp(`(https?://(?:${hostPatterns})/[^"'\\s)]+)`, 'g');

html = html.replace(urlRegex, (match) => {
  try {
    const parsed = new URL(match);
    const key = hostMap[parsed.hostname];
    if (!key) return match;
    signedCount++;
    return signUrl(match, key, expires);
  } catch {
    return match;
  }
});

// --- Output ---
if (outputFile) {
  fs.writeFileSync(outputFile, html, 'utf-8');
} else {
  process.stdout.write(html);
}

console.error(`Signed ${signedCount} URL(s), expires ${expiresDate}`);
