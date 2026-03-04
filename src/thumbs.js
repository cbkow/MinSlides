#!/usr/bin/env node
/**
 * thumbs.js — Generate slide thumbnails via Puppeteer.
 * Reads build/composed/slideshow.html, screenshots each .slide section,
 * saves as WebP at 80% quality to thumbs/<name>.webp.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const COMPOSED = path.resolve(__dirname, 'build', 'composed', 'slideshow.html');
const THUMBS_DIR = path.resolve(__dirname, 'thumbs');

async function main() {
  if (!fs.existsSync(COMPOSED)) {
    console.error(`Error: ${COMPOSED} not found. Run compose.js first.`);
    process.exit(1);
  }

  fs.mkdirSync(THUMBS_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Load via file:// so local CSS/fonts resolve
  await page.goto(`file://${COMPOSED}`, { waitUntil: 'networkidle2', timeout: 30000 });

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

    await slide.evaluate(el => el.scrollIntoView());
    await new Promise(r => setTimeout(r, 300));

    const outPath = path.join(THUMBS_DIR, filename);
    await slide.screenshot({ path: outPath, type: 'webp', quality: 80 });
    console.log(`  ${filename}`);
  }

  await browser.close();
  console.log(`\nThumbnails → ${path.relative(process.cwd(), THUMBS_DIR)}/`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
