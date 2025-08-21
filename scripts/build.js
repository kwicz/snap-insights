#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Chrome Extension...\n');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Cleaned dist directory');
}

// Run webpack build
try {
  execSync('webpack --mode=production', { stdio: 'inherit' });
  console.log('\n✅ Webpack build completed');
} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}

// Validate manifest.json
const manifestPath = path.join(__dirname, '../dist/manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('✅ Manifest validation passed');
    console.log(`   Extension: ${manifest.name} v${manifest.version}`);
  } catch (error) {
    console.error('❌ Invalid manifest.json:', error.message);
    process.exit(1);
  }
} else {
  console.error('❌ manifest.json not found in dist/');
  process.exit(1);
}

// Check required files
const requiredFiles = [
  'background/background.js',
  'content/content.js',
  'popup/popup.html',
  'popup/popup.js'
];

const missingFiles = requiredFiles.filter(file => 
  !fs.existsSync(path.join(__dirname, '../dist', file))
);

if (missingFiles.length > 0) {
  console.error('❌ Missing required files:', missingFiles);
  process.exit(1);
}

console.log('✅ All required files present');
console.log('\n🎉 Build completed successfully!');
console.log('📁 Extension files are in the dist/ directory');
console.log('🔧 Load the extension in Chrome by going to chrome://extensions/');