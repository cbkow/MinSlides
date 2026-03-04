#!/usr/bin/env node
/**
 * build.js — Encrypt slideshow with StatiCrypt
 * Cross-platform Node.js build script.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const COMPOSED = path.join('build', 'composed', 'slideshow.html');
const SOURCE = COMPOSED;
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
  // Compose partials into single HTML
  console.log('Composing slides...');
  execSync('node compose.js', { stdio: 'inherit', shell: true });

  // Generate thumbnails
  console.log('Generating thumbnails...');
  execSync('node thumbs.js', { stdio: 'inherit', shell: true });

  // Check source
  if (!fs.existsSync(SOURCE)) {
    console.error(`Error: ${SOURCE} not found.`);
    process.exit(1);
  }

  // Output name
  const rawName = await ask('Output filename (e.g., My Project Name)', 'slideshow');
  const outputName = sanitize(rawName) + '.html';
  const outputDir = path.join('dist', outputName.replace('.html', ''));
  fs.mkdirSync(outputDir, { recursive: true });

  // Password
  const password = await askHidden('Enter password');
  const confirm = await askHidden('Confirm password');

  if (password !== confirm) {
    console.error('Error: Passwords don\'t match.');
    process.exit(1);
  }

  // Encrypt
  console.log(`\nEncrypting ${SOURCE} → ${outputDir}/${outputName}...`);

  execSync([
    'npx', 'staticrypt', `"${SOURCE}"`,
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

  // Rename if needed (StatiCrypt outputs using the input's basename)
  const sourceName = path.basename(SOURCE);
  const defaultOutput = path.join(outputDir, sourceName);
  const finalOutput = path.join(outputDir, outputName);
  if (outputName !== sourceName && fs.existsSync(defaultOutput)) {
    fs.renameSync(defaultOutput, finalOutput);
  }

  // Copy assets
  console.log('Copying assets...');
  fs.copyFileSync('styles.css', path.join(outputDir, 'styles.css'));
  fs.copyFileSync(TEMPLATE, path.join(outputDir, TEMPLATE));
  copyDir('fonts', path.join(outputDir, 'fonts'));
  copyDir('images', path.join(outputDir, 'images'));
  copyDir('thumbs', path.join(outputDir, 'thumbs'));
  console.log(`\nDone. Deployable package: ${outputDir}/`);
  console.log('');
  fs.readdirSync(outputDir).forEach(f => console.log(`  ${f}`));

  rl.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
