#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Starting development build with watch mode...\n');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
  console.log('✅ Cleaned dist directory');
}

// Start webpack in watch mode
const webpack = spawn('webpack', ['--mode=development', '--watch'], {
  stdio: 'inherit',
  shell: true
});

webpack.on('close', (code) => {
  if (code !== 0) {
    console.error(`❌ Webpack process exited with code ${code}`);
    process.exit(code);
  }
});

webpack.on('error', (error) => {
  console.error('❌ Failed to start webpack:', error);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Stopping development server...');
  webpack.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  webpack.kill('SIGTERM');
  process.exit(0);
});