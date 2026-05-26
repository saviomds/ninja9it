/**
 * Generates PWA icons (192x192 and 512x512 PNG) from public/logo.jpg
 * Run once: node scripts/gen-icons.js
 */
const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

// Check if sharp is available, install if not
try {
  require.resolve('sharp');
} catch {
  console.log('Installing sharp (one-time)...');
  execSync('npm install sharp --save-dev', { cwd: path.join(__dirname, '..'), stdio: 'inherit' });
}

const sharp = require('sharp');
const src   = path.join(__dirname, '..', 'public', 'logo.jpg');

async function run() {
  console.log('Generating icons from logo.jpg...');

  await sharp(src).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192.png'));
  console.log('  ✓ icon-192.png');

  await sharp(src).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512.png'));
  console.log('  ✓ icon-512.png');

  console.log('\nDone! Icons saved to public/icons/');
}

run().catch(err => { console.error(err); process.exit(1); });
