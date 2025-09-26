import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E tests...');

  // Check if extension is built
  const distPath = path.resolve('./dist');
  const manifestPath = path.join(distPath, 'manifest.json');

  if (!fs.existsSync(distPath) || !fs.existsSync(manifestPath)) {
    console.log('📦 Attempting to build extension...');
    try {
      execSync('npm run build', { stdio: 'inherit' });
      console.log('✅ Extension build successful');
    } catch (error) {
      console.warn('⚠️ Extension build failed, but continuing with E2E setup...');
      console.warn('Note: Some E2E tests may fail without a properly built extension');

      // Create minimal dist structure for testing framework setup
      if (!fs.existsSync(distPath)) {
        fs.mkdirSync(distPath, { recursive: true });
      }

      // Create a minimal manifest for testing
      if (!fs.existsSync(manifestPath)) {
        const minimalManifest = {
          manifest_version: 3,
          name: "SnapInsights",
          version: "1.0.0"
        };
        fs.writeFileSync(manifestPath, JSON.stringify(minimalManifest, null, 2));
      }
    }
  } else {
    console.log('✅ Extension build found');
  }

  // Create test results directory
  const testResultsPath = path.resolve('./test-results');
  if (!fs.existsSync(testResultsPath)) {
    fs.mkdirSync(testResultsPath, { recursive: true });
  }

  console.log('✅ Global setup complete');
}

export default globalSetup;