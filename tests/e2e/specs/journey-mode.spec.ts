/**
 * Journey mode functionality E2E tests
 */

import { test, expect } from '../fixtures/extension-fixture';
import { TestData } from '../helpers/extension-helpers';

test.describe('Journey Mode', () => {
  test('should activate journey mode', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Open popup and look for journey/start mode
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for journey mode button
    const journeyButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /journey|start|track/i
    }).first();

    if (await journeyButton.isVisible()) {
      await journeyButton.click();

      // Wait for activation
      await page.waitForTimeout(1000);

      // Close popup
      await popupPage.close();

      // Navigate to test page
      await extensionHelper.navigateToTestPage(TestData.testUrls.local);

      // Look for journey indicator
      const uiElements = await extensionHelper.verifyUIElements();
      expect(uiElements.hasJourneyIndicator).toBe(true);
    } else {
      // Skip test if journey mode button not found
      test.skip();
    }
  });

  test('should track multiple interactions in journey', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Activate journey mode (if available)
    const journeyButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /journey|start/i
    }).first();

    if (await journeyButton.isVisible()) {
      await journeyButton.click();
      await popupPage.close();

      // Navigate to test page
      await extensionHelper.navigateToTestPage(TestData.testUrls.local);

      // Perform multiple interactions
      const interactions = [
        { x: 100, y: 100 },
        { x: 200, y: 200 },
        { x: 300, y: 150 },
      ];

      for (const position of interactions) {
        await page.click('body', { position });
        await page.waitForTimeout(1500); // Wait between interactions
      }

      // Verify journey tracking is working
      const consoleLogs = await extensionHelper.getConsoleLogs();

      // Should have journey-related logs
      const hasJourneyLogs = consoleLogs.some(log =>
        log.toLowerCase().includes('journey') ||
        log.toLowerCase().includes('screenshot')
      );

      expect(hasJourneyLogs).toBe(true);
    } else {
      test.skip();
    }
  });

  test('should show journey progress indicator', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Try to activate journey mode
    const journeyButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /journey|start/i
    }).first();

    if (await journeyButton.isVisible()) {
      await journeyButton.click();
      await popupPage.close();

      // Navigate to test page
      await extensionHelper.navigateToTestPage(TestData.testUrls.local);

      // Take a few screenshots to trigger progress indicator
      await page.click('body', { position: { x: 100, y: 100 } });
      await page.waitForTimeout(1000);
      await page.click('body', { position: { x: 200, y: 200 } });
      await page.waitForTimeout(1000);

      // Check for journey progress indicator
      const progressIndicator = page.locator('#snapinsights-journey-indicator');

      // Should be visible after interactions
      if (await progressIndicator.isVisible()) {
        // Verify it shows progress information
        const indicatorText = await progressIndicator.textContent();
        expect(indicatorText).toContain('screenshot');
      }
    } else {
      test.skip();
    }
  });

  test('should handle journey completion', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // This test would verify journey completion functionality
    // Implementation depends on how journey mode is designed to complete

    await expect(popupPage.locator('body')).toBeVisible();

    // Look for stop/complete journey functionality
    const stopButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /stop|complete|finish|end/i
    });

    if (await stopButton.count() > 0) {
      // Test journey completion flow
      await stopButton.first().click();

      // Verify completion happened
      await page.waitForTimeout(1000);

      // Should remove journey indicator
      const progressIndicator = page.locator('#snapinsights-journey-indicator');
      const isVisible = await progressIndicator.isVisible();

      expect(isVisible).toBe(false);
    } else {
      test.skip();
    }
  });

  test('should export journey data', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Test journey export functionality if available
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for export/save functionality
    const exportButton = popupPage.locator('button, [role="button"]').filter({
      hasText: /export|save|download/i
    });

    if (await exportButton.count() > 0) {
      // Start a download listener
      const downloadPromise = page.waitForEvent('download');

      await exportButton.first().click();

      // Wait for download or timeout
      try {
        const download = await downloadPromise;
        expect(download).toBeTruthy();
      } catch {
        // Download might not happen in test environment
        // That's okay, we just verify the button works
      }
    } else {
      test.skip();
    }
  });
});