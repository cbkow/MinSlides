#!/usr/bin/env node
/**
 * compose.js — Resolve <include> tags into a single HTML file.
 * Reads index.html, inlines all partials, writes .composed/slideshow.html.
 */

const fs = require('fs');
const path = require('path');

const INPUT = path.resolve(__dirname, 'index.html');
const OUTPUT_DIR = path.resolve(__dirname, '.composed');
const OUTPUT = path.join(OUTPUT_DIR, 'slideshow.html');

let html = fs.readFileSync(INPUT, 'utf-8');

html = html.replace(
  /<include\s+src="([^"]+)">\s*<\/include>/g,
  (_, src) => fs.readFileSync(path.resolve(__dirname, src), 'utf-8')
);

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT, html, 'utf-8');

console.log(`Composed → ${path.relative(process.cwd(), OUTPUT)}`);
