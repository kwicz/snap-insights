#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 Creating extension package...\n');

// Check if dist directory exists
if (!fs.existsSync('dist')) {
  console.error('❌ dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Read manifest for version info
const manifestPath = path.join(__dirname, '../dist/manifest.json');
let version = 'unknown';
try {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  version = manifest.version;
} catch (error) {
  console.warn('⚠️  Could not read version from manifest.json');
}

// Create zip filename
const zipName = `insight-clip-v${version}.zip`;
const zipPath = path.join(__dirname, '../releases', zipName);

// Create releases directory
const releasesDir = path.join(__dirname, '../releases');
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
  console.log('✅ Created releases/ directory');
}

// Create zip file
try {
  // Change to dist directory and zip contents
  process.chdir(path.join(__dirname, '../dist'));
  
  // Use different zip commands based on platform
  const isWindows = process.platform === 'win32';
  const zipCommand = isWindows 
    ? `powershell Compress-Archive -Path * -DestinationPath "${zipPath}" -Force`
    : `zip -r "${zipPath}" .`;
  
  execSync(zipCommand, { stdio: 'inherit' });
  
  console.log(`\n✅ Extension packaged successfully!`);
  console.log(`📁 Package: ${zipName}`);
  console.log(`📍 Location: releases/${zipName}`);
  
  // Show file size
  const stats = fs.statSync(zipPath);
  const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
  console.log(`📊 Size: ${fileSizeInMB} MB`);
  
} catch (error) {
  console.error('❌ Failed to create zip package:', error.message);
  process.exit(1);
} finally {
  // Change back to project root
  process.chdir(path.join(__dirname, '..'));
}