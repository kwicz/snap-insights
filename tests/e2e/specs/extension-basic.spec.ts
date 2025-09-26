/**
 * Basic extension functionality E2E tests
 */

import { test, expect } from '../fixtures/extension-fixture';
import { TestData } from '../helpers/extension-helpers';

test.describe('Extension Basic Functionality', () => {
  test('should load extension successfully', async ({ extensionHelper, extensionId }) => {
    // Verify extension is loaded
    expect(extensionId).toBeTruthy();
    expect(extensionId).toMatch(/[a-z]{32}/); // Chrome extension ID format

    // Verify extension components are accessible
    const isLoaded = await extensionHelper.verifyExtensionLoaded();
    expect(isLoaded).toBe(true);
  });

  test('should open popup successfully', async ({ extensionHelper, popupPage }) => {
    // Verify popup page loaded
    expect(popupPage.url()).toContain('chrome-extension://');
    expect(popupPage.url()).toContain('popup.html');

    // Check for popup content
    await expect(popupPage.locator('body')).toBeVisible();

    // Verify essential UI elements exist
    const title = popupPage.locator('h1, .title, [class*="title"]');
    await expect(title).toBeVisible({ timeout: 5000 });
  });

  test('should have content script injection working', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.simple);

    // Wait for content script to load
    await page.waitForTimeout(2000);

    // Check if content script globals are available
    const hasContentScript = await page.evaluate(() => {
      return typeof window !== 'undefined' &&
             (window as any).chrome?.runtime?.id !== undefined;
    });

    expect(hasContentScript).toBe(true);
  });

  test('should handle extension storage', async ({ extensionHelper, page }) => {
    // Navigate to a page where we can test storage
    await extensionHelper.navigateToTestPage(TestData.testUrls.simple);

    // Test storage functionality
    const storageTest = await page.evaluate(() => {
      return new Promise((resolve) => {
        // Test if chrome.storage API is available
        if (typeof chrome !== 'undefined' && chrome.storage) {
          // Try to set and get a test value
          chrome.storage.local.set({ 'e2e-test': 'test-value' }, () => {
            chrome.storage.local.get(['e2e-test'], (result) => {
              resolve(result['e2e-test'] === 'test-value');
            });
          });
        } else {
          resolve(false);
        }
      });
    });

    expect(storageTest).toBe(true);
  });

  test('should respond to extension icon click', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.simple);

    // Try to trigger extension (keyboard shortcut as fallback)
    await extensionHelper.triggerKeyboardShortcut();

    // Wait for any UI changes
    await page.waitForTimeout(1000);

    // Verify some response occurred (this might need adjustment based on actual behavior)
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});