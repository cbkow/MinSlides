#!/usr/bin/env node
/**
 * thumbs.js — Generate slide thumbnails via Puppeteer.
 * Serves src/ locally so relative CSS/font/image paths resolve,
 * then screenshots each .slide section as WebP to thumbs/.
 */

const fs = require('fs');
const http = require('http');
const path = require('path');
const puppeteer = require('puppeteer');

const SRC_DIR = __dirname;
const COMPOSED = path.resolve(SRC_DIR, 'build', 'composed', 'slideshow.html');
const THUMBS_DIR = path.resolve(SRC_DIR, 'thumbs');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

function startServer() {
  return new Promise(resolve => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url);
      // Serve composed HTML at root so relative paths (styles.css, fonts/, images/) resolve against src/
      const filePath = urlPath === '/slideshow.html'
        ? COMPOSED
        : path.join(SRC_DIR, urlPath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end();
          return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
  });
}

async function main() {
  if (!fs.existsSync(COMPOSED)) {
    console.error(`Error: ${COMPOSED} not found. Run compose.js first.`);
    process.exit(1);
  }

  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  // Serve src/ so relative paths (styles.css, fonts/, images/) resolve
  const server = await startServer();
  const port = server.address().port;
  const url = `http://127.0.0.1:${port}/slideshow.html`;

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  const slides = await page.$$('.slide');
  console.log(`Found ${slides.length} slides`);

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];

    // Get thumb filename from data-thumb attribute
    const thumbAttr = await slide.evaluate(el => el.dataset.thumb);
    let filename;
    if (thumbAttr) {
      filename = path.basename(thumbAttr);
    } else {
      filename = `slide-${String(i + 1).padStart(2, '0')}.webp`;
    }

    await slide.evaluate(el => el.scrollIntoView({ behavior: 'instant' }));
    await new Promise(r => setTimeout(r, 500));

    const outPath = path.join(THUMBS_DIR, filename);
    await page.screenshot({ path: outPath, type: 'webp', quality: 80 });
    console.log(`  ${filename}`);
  }

  await browser.close();
  server.close();
  console.log(`\nThumbnails → ${path.relative(process.cwd(), THUMBS_DIR)}/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
