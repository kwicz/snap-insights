import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E tests...');

  // Cleanup any global resources if needed
  // For now, we'll just log completion

  console.log('✅ Global teardown complete');
}

export default globalTeardown;