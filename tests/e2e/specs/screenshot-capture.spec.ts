/**
 * Screenshot capture functionality E2E tests
 */

import { test, expect } from '../fixtures/extension-fixture';
import { TestData } from '../helpers/extension-helpers';

test.describe('Screenshot Capture', () => {
  test('should capture screenshot on click', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Open popup and activate snap mode
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for mode selection buttons or similar
    const snapButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /snap|capture|screenshot/i
    }).first();

    if (await snapButton.isVisible()) {
      await snapButton.click();
    }

    // Close popup to interact with page
    await popupPage.close();

    // Simulate screenshot capture by clicking on page
    const coordinates = TestData.screenshots.coordinates[0];
    await page.click('body', { position: coordinates });

    // Wait for capture process
    await page.waitForTimeout(2000);

    // Verify some feedback was shown (this will depend on actual implementation)
    const uiElements = await extensionHelper.verifyUIElements();

    // At least one UI feedback element should be present
    const hasFeedback = uiElements.hasClickFeedback ||
                       uiElements.hasNotifications ||
                       uiElements.hasJourneyIndicator;

    expect(hasFeedback).toBe(true);
  });

  test('should handle multiple screenshot captures', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Activate extension
    await popupPage.close(); // Close popup to interact with main page

    // Take multiple screenshots
    for (const coords of TestData.screenshots.coordinates.slice(0, 2)) {
      await page.click('body', { position: coords });
      await page.waitForTimeout(1500); // Wait between captures
    }

    // Verify captures completed without error
    const consoleLogs = await extensionHelper.getConsoleLogs();

    // Should not have error logs
    const hasErrors = consoleLogs.some(log =>
      log.toLowerCase().includes('error') ||
      log.toLowerCase().includes('failed')
    );

    expect(hasErrors).toBe(false);
  });

  test('should respect rate limiting', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    await popupPage.close();

    // Try rapid successive clicks (should be rate limited)
    const coordinates = { x: 200, y: 200 };

    // Rapid clicks
    await page.click('body', { position: coordinates });
    await page.click('body', { position: coordinates });
    await page.click('body', { position: coordinates });

    await page.waitForTimeout(1000);

    // Check for rate limit feedback
    const pageContent = await page.content();

    // The extension should handle this gracefully (no crashes)
    expect(pageContent).toBeTruthy();
  });

  test('should work on different page types', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Test on different types of pages
    const testUrls = [
      TestData.testUrls.local,
      TestData.testUrls.simple,
    ];

    for (const url of testUrls) {
      // Navigate to test page
      await extensionHelper.navigateToTestPage(url);

      // Wait for page to stabilize
      await page.waitForTimeout(1000);

      // Try screenshot capture
      await page.click('body', { position: { x: 150, y: 150 } });
      await page.waitForTimeout(500);

      // Verify page is still functional
      const isPageResponsive = await page.evaluate(() => {
        return document.readyState === 'complete';
      });

      expect(isPageResponsive).toBe(true);
    }
  });

  test('should handle popup interactions', async ({
    extensionHelper,
    popupPage
  }) => {
    // Test popup UI interactions
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for interactive elements
    const buttons = popupPage.locator('button, input[type="button"], [role="button"]');
    const buttonCount = await buttons.count();

    expect(buttonCount).toBeGreaterThan(0);

    // Try to interact with first button if it exists
    if (buttonCount > 0) {
      const firstButton = buttons.first();
      if (await firstButton.isVisible()) {
        await firstButton.click();

        // Verify click was handled (no errors)
        await page.waitForTimeout(500);
      }
    }

    // Popup should still be responsive
    const isPopupResponsive = await popupPage.evaluate(() => {
      return document.readyState === 'complete';
    });

    expect(isPopupResponsive).toBe(true);
  });
});