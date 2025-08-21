#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Validating manifest.json...\n');

const manifestPath = path.join(__dirname, '../src/manifest.json');

// Check if manifest exists
if (!fs.existsSync(manifestPath)) {
  console.error('❌ manifest.json not found at src/manifest.json');
  process.exit(1);
}

let manifest;
try {
  const manifestContent = fs.readFileSync(manifestPath, 'utf8');
  manifest = JSON.parse(manifestContent);
  console.log('✅ Valid JSON format');
} catch (error) {
  console.error('❌ Invalid JSON format:', error.message);
  process.exit(1);
}

// Required fields validation
const requiredFields = [
  'manifest_version',
  'name',
  'version',
  'description'
];

const missingFields = requiredFields.filter(field => !manifest[field]);
if (missingFields.length > 0) {
  console.error('❌ Missing required fields:', missingFields);
  process.exit(1);
}

console.log('✅ All required fields present');

// Manifest version validation
if (manifest.manifest_version !== 3) {
  console.error('❌ Manifest version must be 3 for modern Chrome extensions');
  process.exit(1);
}

console.log('✅ Using Manifest V3');

// Permissions validation
const requiredPermissions = ['activeTab', 'storage', 'downloads', 'scripting'];
const missingPermissions = requiredPermissions.filter(
  perm => !manifest.permissions || !manifest.permissions.includes(perm)
);

if (missingPermissions.length > 0) {
  console.warn('⚠️  Missing recommended permissions:', missingPermissions);
}

console.log('✅ Permissions configured');

// Background script validation
if (!manifest.background || !manifest.background.service_worker) {
  console.error('❌ Background service worker not configured');
  process.exit(1);
}

console.log('✅ Background service worker configured');

// Content scripts validation
if (!manifest.content_scripts || manifest.content_scripts.length === 0) {
  console.warn('⚠️  No content scripts configured');
} else {
  console.log('✅ Content scripts configured');
}

// Action (popup) validation
if (!manifest.action) {
  console.warn('⚠️  No action (popup) configured');
} else {
  console.log('✅ Extension action configured');
}

// Icons validation
if (!manifest.icons) {
  console.warn('⚠️  No icons configured');
} else {
  const requiredIconSizes = ['16', '32', '48', '128'];
  const missingIcons = requiredIconSizes.filter(size => !manifest.icons[size]);
  
  if (missingIcons.length > 0) {
    console.warn('⚠️  Missing icon sizes:', missingIcons);
  } else {
    console.log('✅ All required icon sizes configured');
  }
}

// Host permissions validation
if (!manifest.host_permissions) {
  console.warn('⚠️  No host permissions configured - extension may not work on all sites');
} else {
  console.log('✅ Host permissions configured');
}

// CSP validation
if (manifest.content_security_policy) {
  console.log('✅ Content Security Policy configured');
} else {
  console.warn('⚠️  No Content Security Policy configured');
}

console.log('\n🎉 Manifest validation completed!');
console.log(`📋 Extension: ${manifest.name} v${manifest.version}`);
console.log(`📝 Description: ${manifest.description}`);

// Summary
const warnings = [];
if (missingPermissions.length > 0) warnings.push('Missing permissions');
if (!manifest.content_scripts?.length) warnings.push('No content scripts');
if (!manifest.action) warnings.push('No popup action');
if (!manifest.icons) warnings.push('No icons');
if (!manifest.host_permissions) warnings.push('No host permissions');

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:', warnings.join(', '));
} else {
  console.log('\n✨ No warnings - manifest looks great!');
}