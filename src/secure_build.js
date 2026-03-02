#!/usr/bin/env node
/**
 * secure_build.js — Sign CDN URLs + encrypt with StatiCrypt
 * Cross-platform Node.js build script.
 *
 * Env variables (skip prompts):
 *   BUNNY_CDN_HOST, BUNNY_CDN_KEY
 *   BUNNY_STREAM_HOST, BUNNY_STREAM_KEY
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const SOURCE = 'slideshow.html';
const SIGNED = '_signed.html';
const TEMPLATE = 'password_template.html';
const TITLE = 'Presentation';
const INSTRUCTIONS = 'Enter the password to view this presentation.';
const COLOR_PRIMARY = 'rgb(0, 120, 212)';
const BUTTON_LABEL = 'Enter';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultVal) {
  return new Promise(resolve => {
    const prompt = defaultVal ? `${question} [${defaultVal}]: ` : `${question}: `;
    rl.question(prompt, answer => resolve(answer || defaultVal || ''));
  });
}

function askHidden(question) {
  return new Promise(resolve => {
    process.stdout.write(`${question}: `);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let input = '';
    const onData = (ch) => {
      if (ch === '\r' || ch === '\n') {
        stdin.setRawMode(wasRaw);
        stdin.removeListener('data', onData);
        stdin.pause();
        process.stdout.write('\n');
        resolve(input);
      } else if (ch === '\u0003') {
        process.exit();
      } else if (ch === '\u007F' || ch === '\b') {
        input = input.slice(0, -1);
      } else {
        input += ch;
      }
    };
    stdin.on('data', onData);
  });
}

function sanitize(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log('=== Secure Build ===\n');

  if (!fs.existsSync(SOURCE)) {
    console.error(`Error: ${SOURCE} not found.`);
    process.exit(1);
  }

  // Output name
  const rawName = await ask('Output filename (e.g., My Project Name)', 'slideshow');
  const outputName = sanitize(rawName) + '.html';
  const outputDir = path.join('dist', outputName.replace('.html', ''));
  fs.mkdirSync(outputDir, { recursive: true });

  // CDN credentials
  const cdnHost = process.env.BUNNY_CDN_HOST || await ask('Bunny CDN hostname (e.g., your-zone.b-cdn.net)');
  const cdnKey = process.env.BUNNY_CDN_KEY || await askHidden('Bunny CDN security key');
  const streamHost = process.env.BUNNY_STREAM_HOST || await ask('Bunny Stream hostname (e.g., vz-xxxxx.b-cdn.net)');
  const streamKey = process.env.BUNNY_STREAM_KEY || await askHidden('Bunny Stream security key');

  // Expiration
  const expiresIn = await ask('URL expiration (e.g., 7d, 30d, 90d)', '30d');

  // Password
  const password = await askHidden('Slideshow password');
  const confirm = await askHidden('Confirm password');

  if (password !== confirm) {
    console.error('Error: Passwords don\'t match.');
    process.exit(1);
  }

  // Step 1: Sign URLs
  console.log('\nSigning CDN URLs...');

  execSync([
    'node', 'sign_urls.js', `"${SOURCE}"`,
    '--cdn-host', `"${cdnHost}"`,
    '--cdn-key', `"${cdnKey}"`,
    '--stream-host', `"${streamHost}"`,
    '--stream-key', `"${streamKey}"`,
    '--expires-in', `"${expiresIn}"`,
    '--output', `"${SIGNED}"`
  ].join(' '), { stdio: 'inherit', shell: true });

  // Step 2: Encrypt
  console.log(`Encrypting → ${outputDir}/${outputName}...`);

  execSync([
    'npx', 'staticrypt', `"${SIGNED}"`,
    '-d', `"${outputDir}"`,
    '-t', `"${TEMPLATE}"`,
    '--short',
    '--password', `"${password}"`,
    '--template-title', `"${TITLE}"`,
    '--template-instructions', `"${INSTRUCTIONS}"`,
    '--template-color-primary', `"${COLOR_PRIMARY}"`,
    '--template-button-label', `"${BUTTON_LABEL}"`,
    '--remember', '30'
  ].join(' '), { stdio: 'inherit', shell: true });

  // Rename
  const signedOutput = path.join(outputDir, SIGNED);
  const finalOutput = path.join(outputDir, outputName);
  if (fs.existsSync(signedOutput)) {
    fs.renameSync(signedOutput, finalOutput);
  }

  // Step 3: Copy assets
  console.log('Copying assets...');
  fs.copyFileSync('styles.css', path.join(outputDir, 'styles.css'));
  fs.copyFileSync(TEMPLATE, path.join(outputDir, TEMPLATE));
  copyDir('fonts', path.join(outputDir, 'fonts'));
  copyDir('images', path.join(outputDir, 'images'));
  copyDir('slides', path.join(outputDir, 'slides'));

  // Cleanup
  if (fs.existsSync(SIGNED)) fs.unlinkSync(SIGNED);

  // Expiry date
  const match = expiresIn.match(/^(\d+)([dhm])$/);
  const mult = { d: 86400, h: 3600, m: 60 };
  const expiryDate = new Date(Date.now() + parseInt(match[1]) * mult[match[2]] * 1000)
    .toISOString().split('T')[0];

  console.log(`\nDone. Deployable package: ${outputDir}/`);
  console.log('');
  fs.readdirSync(outputDir).forEach(f => console.log(`  ${f}`));
  console.log(`\n!! Signed URLs expire: ${expiryDate}`);
  console.log('!! Rebuild before then to keep the slideshow working.');

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
