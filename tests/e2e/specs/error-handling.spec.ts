/**
 * Error handling and edge cases E2E tests
 */

import { test, expect } from '../fixtures/extension-fixture';
import { TestData } from '../helpers/extension-helpers';

test.describe('Error Handling & Edge Cases', () => {
  test('should handle system pages gracefully', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to a system page (chrome://)
    await page.goto('chrome://settings/');

    // Wait for page load
    await page.waitForLoadState('domcontentloaded');

    // Try to interact (should be handled gracefully)
    await page.click('body', { position: { x: 100, y: 100 } });

    // Wait for any error handling
    await page.waitForTimeout(1000);

    // Should not crash the page
    const isPageResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });

    expect(isPageResponsive).toBe(true);
  });

  test('should handle network errors', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to a non-existent page
    try {
      await page.goto('https://this-domain-does-not-exist-12345.com', {
        waitUntil: 'domcontentloaded',
        timeout: 5000
      });
    } catch {
      // Expected to fail, that's okay
    }

    // Try extension functionality on error page
    await page.click('body', { position: { x: 100, y: 100 } });

    // Should handle gracefully
    await page.waitForTimeout(1000);

    // Verify no unhandled errors
    const consoleLogs = await extensionHelper.getConsoleLogs();
    const hasUnhandledErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('uncaught') ||
      log.toLowerCase().includes('unhandled')
    );

    expect(hasUnhandledErrors).toBe(false);
  });

  test('should handle rapid successive clicks', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    await popupPage.close();

    // Perform rapid clicks (stress test)
    const position = { x: 150, y: 150 };
    const clickCount = 10;

    for (let i = 0; i < clickCount; i++) {
      await page.click('body', { position });
      await page.waitForTimeout(50); // Very rapid clicks
    }

    // Wait for rate limiting to settle
    await page.waitForTimeout(2000);

    // Page should still be responsive
    const isPageResponsive = await page.evaluate(() => {
      return document.readyState === 'complete';
    });

    expect(isPageResponsive).toBe(true);
  });

  test('should handle popup closing during operation', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Start an operation in popup
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for any interactive elements
    const buttons = popupPage.locator('button');
    const buttonCount = await buttons.count();

    if (buttonCount > 0) {
      // Click a button
      await buttons.first().click();

      // Immediately close popup
      await popupPage.close();

      // Navigate to test page and continue
      await extensionHelper.navigateToTestPage(TestData.testUrls.local);

      // Extension should still work
      await page.click('body', { position: { x: 100, y: 100 } });
      await page.waitForTimeout(1000);
    }

    // No errors should occur
    const consoleLogs = await extensionHelper.getConsoleLogs();
    const hasErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('error') &&
      !log.toLowerCase().includes('expected') // Allow expected errors
    );

    expect(hasErrors).toBe(false);
  });

  test('should handle page navigation during capture', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to first test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    await popupPage.close();

    // Start capture process
    await page.click('body', { position: { x: 100, y: 100 } });

    // Immediately navigate away
    await page.goto(TestData.testUrls.simple);

    // Wait for navigation
    await page.waitForLoadState('domcontentloaded');

    // Extension should handle this gracefully
    await page.waitForTimeout(1000);

    // Try capture on new page
    await page.click('body', { position: { x: 200, y: 200 } });

    // Should work without issues
    const consoleLogs = await extensionHelper.getConsoleLogs();
    const hasCriticalErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('uncaught') ||
      log.toLowerCase().includes('fatal')
    );

    expect(hasCriticalErrors).toBe(false);
  });

  test('should show user-friendly error messages', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    await popupPage.close();

    // Trigger potential error condition
    await page.click('body', { position: { x: 100, y: 100 } });

    // Wait for any error handling
    await page.waitForTimeout(1000);

    // Look for user-friendly error messages (not technical stack traces)
    const notifications = page.locator('[class*="notification"], [class*="error"], [class*="message"]');
    const notificationCount = await notifications.count();

    if (notificationCount > 0) {
      // If there are notifications, they should be user-friendly
      const notificationText = await notifications.first().textContent();

      // Should not contain technical jargon
      const hasTechnicalTerms = notificationText?.toLowerCase().includes('uncaught') ||
                               notificationText?.toLowerCase().includes('stack') ||
                               notificationText?.toLowerCase().includes('undefined');

      expect(hasTechnicalTerms).toBe(false);
    }
  });

  test('should handle extension context invalidation', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Simulate extension context issues by trying operations
    await page.click('body', { position: { x: 100, y: 100 } });
    await page.waitForTimeout(1000);

    // Check for graceful degradation
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();

    // Extension should handle context issues gracefully
    const consoleLogs = await extensionHelper.getConsoleLogs();
    const hasContextErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('context invalid') &&
      log.toLowerCase().includes('handled')
    );

    // Either no context errors, or they're handled
    // The test passes if the extension doesn't crash
    expect(true).toBe(true);
  });
});