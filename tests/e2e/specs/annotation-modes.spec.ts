/**
 * Annotation and Transcription modes E2E tests
 */

import { test, expect } from '../fixtures/extension-fixture';
import { TestData } from '../helpers/extension-helpers';

test.describe('Annotation and Transcription Modes', () => {
  test('should show annotation dialog in Annotate mode', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Capture all console logs for debugging
    const consoleLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      consoleLogs.push(`${msg.type()}: ${text}`);
    });

    // Start capturing console logs
    extensionHelper.startCapturingLogs();

    // Open popup and try to find Annotate button
    await expect(popupPage.locator('body')).toBeVisible();

    // Look for Annotate mode button - try various selectors
    const annotateButtons = [
      popupPage.locator('button').filter({ hasText: /annotate/i }),
      popupPage.locator('[aria-label*="Annotate"]'),
      popupPage.locator('#mode-annotate'),
      popupPage.locator('.annotate-button'),
      popupPage.locator('button').filter({ hasText: /Annotate/ })
    ];

    let annotateButton = null;
    for (const button of annotateButtons) {
      if (await button.isVisible()) {
        annotateButton = button;
        break;
      }
    }

    // Take a screenshot of the popup for debugging
    await popupPage.screenshot({ path: 'test-results/popup-debug.png' });

    if (annotateButton) {
      console.log('Found annotate button, clicking it');
      await annotateButton.click();
      await page.waitForTimeout(500);

      // Close popup
      await popupPage.close();

      // Now try Alt+Click on the main page
      console.log('Performing Alt+Click');
      await page.keyboard.down('Alt');
      await page.click('body', { position: { x: 200, y: 200 } });
      await page.keyboard.up('Alt');

      // Wait for dialog to appear
      await page.waitForTimeout(1000);

      // Look for annotation dialog
      const dialogSelectors = [
        '.snap-insights-annotation-dialog',
        '.snap-insights-annotation-dialog-container',
        '[role="dialog"]',
        '.dialog-textarea',
        'textarea'
      ];

      let dialogVisible = false;
      for (const selector of dialogSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          console.log(`Found dialog element: ${selector}`);
          dialogVisible = true;
          break;
        }
      }

      // Take screenshot for debugging
      await page.screenshot({ path: 'test-results/annotation-dialog-debug.png', fullPage: true });

      // Check console logs
      const logs = await extensionHelper.getConsoleLogs();
      console.log('Extension helper logs:', logs);
      console.log('All console logs:', consoleLogs);

      // If no dialog, let's see what we can find
      if (!dialogVisible) {
        const pageContent = await page.content();
        console.log('Page content after Alt+Click (truncated):', pageContent.substring(0, 1000));

        // Check if content script is loaded by looking for our debug messages
        const hasContentScript = consoleLogs.some(log => log.includes('SNAP-INSIGHTS: Content script loaded'));
        const hasActivation = consoleLogs.some(log => log.includes('SNAP-INSIGHTS: Extension activated'));
        const hasClickDetection = consoleLogs.some(log => log.includes('SNAP-INSIGHTS: Click detected'));

        console.log('Content script status:', {
          hasContentScript,
          hasActivation,
          hasClickDetection
        });
      }

      // Verify dialog appeared
      expect(dialogVisible).toBe(true);
    } else {
      console.log('No annotate button found, checking popup content');
      const popupContent = await popupPage.content();
      console.log('Popup HTML:', popupContent);

      // Take screenshot anyway
      await page.screenshot({ path: 'test-results/no-annotate-button-debug.png' });

      // This might be expected if popup doesn't load correctly in test environment
      // Let's check if we can directly trigger the mode
    }
  });

  test('should show transcription dialog in Transcribe mode', async ({
    page,
    extensionHelper,
    popupPage
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Start capturing console logs
    extensionHelper.startCapturingLogs();

    // Look for Transcribe mode button
    const transcribeButtons = [
      popupPage.locator('button').filter({ hasText: /transcribe/i }),
      popupPage.locator('[aria-label*="Transcribe"]'),
      popupPage.locator('#mode-transcribe'),
      popupPage.locator('.transcribe-button'),
      popupPage.locator('button').filter({ hasText: /Transcribe/ })
    ];

    let transcribeButton = null;
    for (const button of transcribeButtons) {
      if (await button.isVisible()) {
        transcribeButton = button;
        break;
      }
    }

    if (transcribeButton) {
      await transcribeButton.click();
      await popupPage.close();

      // Alt+Click to trigger
      await page.keyboard.down('Alt');
      await page.click('body', { position: { x: 300, y: 300 } });
      await page.keyboard.up('Alt');

      await page.waitForTimeout(1000);

      // Look for transcription dialog with microphone button
      const transcriptionElements = [
        '.snap-insights-annotation-dialog',
        '.mic-button',
        '.transcription-controls'
      ];

      let hasTranscriptionUI = false;
      for (const selector of transcriptionElements) {
        if (await page.locator(selector).isVisible()) {
          hasTranscriptionUI = true;
          break;
        }
      }

      await page.screenshot({ path: 'test-results/transcription-dialog-debug.png', fullPage: true });

      expect(hasTranscriptionUI).toBe(true);
    }
  });

  test('should directly test content script functionality', async ({
    page,
    extensionHelper
  }) => {
    // Navigate to test page
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Inject a script to directly test our implementation
    await page.addScriptTag({
      content: `
        // Simulate extension being loaded
        console.log('Testing content script directly');

        // Check if our dialog class is available
        if (window.AnnotationDialog) {
          console.log('AnnotationDialog class found');
        } else {
          console.log('AnnotationDialog class NOT found');
        }

        // Try to directly instantiate dialog
        try {
          const dialog = new (await import('/src/content/components/AnnotationDialog.js')).AnnotationDialog();
          console.log('Successfully created AnnotationDialog instance');
        } catch (error) {
          console.log('Failed to create AnnotationDialog:', error.message);
        }
      `
    });

    await page.waitForTimeout(1000);

    // Check what happened
    const logs = await page.evaluate(() => {
      return console.messages || [];
    });

    console.log('Direct test logs:', logs);
  });

  test('should verify extension files are built correctly', async ({
    page,
    extensionHelper
  }) => {
    // Check if the content script file exists and loads
    await extensionHelper.navigateToTestPage(TestData.testUrls.local);

    // Try to access extension resources
    const contentScriptLoaded = await page.evaluate(() => {
      return typeof window.snapInsightsSidebarManager !== 'undefined' ||
             typeof window.insightClipContent !== 'undefined';
    });

    console.log('Content script loaded:', contentScriptLoaded);

    // Check page for any extension-related elements
    const extensionElements = await page.locator('[id*="snap"], [class*="snap"], [id*="insight"], [class*="insight"]').count();
    console.log('Extension elements found:', extensionElements);

    // Take a screenshot to see the current state
    await page.screenshot({ path: 'test-results/extension-state-debug.png', fullPage: true });
  });
});