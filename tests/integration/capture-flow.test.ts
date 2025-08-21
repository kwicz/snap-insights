import { chromium, Browser, Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

test.describe('Screenshot Capture Flow', () => {
  let browser: Browser;
  let page: Page;
  let downloadPath: string;

  test.beforeAll(async () => {
    // Launch browser with extension
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });

    // Set up download path
    downloadPath = path.join(__dirname, '../downloads');
    await browser.setDefaultDownloadPath(downloadPath);
  });

  test.beforeEach(async () => {
    // Create new page for each test
    page = await browser.newPage();
    await page.goto('https://example.com');

    // Wait for extension to initialize
    await page.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should capture screenshot in default mode', async () => {
    // Open extension popup
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);

    // Ensure screenshot mode is selected
    const screenshotModeButton = await popup.getByRole('button', {
      name: /Screenshot/,
    });
    await screenshotModeButton.click();

    // Switch back to main page
    await page.bringToFront();

    // Trigger screenshot capture (Alt + Click)
    await page.keyboard.down('Alt');
    await page.mouse.click(100, 100);
    await page.keyboard.up('Alt');

    // Wait for capture feedback
    await page.waitForSelector('.insight-clip-marker');

    // Verify screenshot was saved
    const downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
  });

  test('should capture screenshot with annotation', async () => {
    // Open extension popup and switch to annotation mode
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);
    const annotationModeButton = await popup.getByRole('button', {
      name: /Annotation/,
    });
    await annotationModeButton.click();

    // Switch back to main page
    await page.bringToFront();

    // Click to add annotation
    await page.mouse.click(100, 100);

    // Wait for annotation dialog
    const dialog = await page.waitForSelector('.annotation-dialog');

    // Add text annotation
    const textarea = await dialog.getByRole('textbox');
    await textarea.fill('Test annotation');

    // Save annotation
    const saveButton = await dialog.getByRole('button', { name: 'Save' });
    await saveButton.click();

    // Wait for capture feedback
    await page.waitForSelector('.insight-clip-marker');

    // Verify screenshot was saved with annotation
    const downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
  });

  test('should capture screenshot with voice annotation', async () => {
    // Open extension popup and switch to annotation mode
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);
    const annotationModeButton = await popup.getByRole('button', {
      name: /Annotation/,
    });
    await annotationModeButton.click();

    // Enable voice recording
    await popup.getByRole('checkbox', { name: 'Voice Recording' }).check();

    // Switch back to main page
    await page.bringToFront();

    // Click to add annotation
    await page.mouse.click(100, 100);

    // Wait for annotation dialog
    const dialog = await page.waitForSelector('.annotation-dialog');

    // Start voice recording
    const recordButton = await dialog.getByRole('button', {
      name: 'Start Recording',
    });
    await recordButton.click();

    // Wait for recording duration
    await page.waitForTimeout(2000);

    // Stop recording
    const stopButton = await dialog.getByRole('button', { name: 'Stop' });
    await stopButton.click();

    // Wait for transcription
    await dialog.waitForSelector('.voice-recorder__transcription');

    // Save annotation
    const saveButton = await dialog.getByRole('button', { name: 'Save' });
    await saveButton.click();

    // Wait for capture feedback
    await page.waitForSelector('.insight-clip-marker');

    // Verify screenshot was saved with voice annotation
    const downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
  });

  test('should respect marker color settings', async () => {
    // Open extension popup
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);

    // Change marker color
    const colorPicker = await popup.getByRole('button', {
      name: /Select color #ff0000/,
    });
    await colorPicker.click();

    // Switch back to main page
    await page.bringToFront();

    // Trigger screenshot capture
    await page.keyboard.down('Alt');
    await page.mouse.click(100, 100);
    await page.keyboard.up('Alt');

    // Verify marker color
    const marker = await page.waitForSelector('.insight-clip-marker');
    const markerColor = await marker.evaluate(
      (el) => window.getComputedStyle(el).backgroundColor
    );
    expect(markerColor).toBe('rgb(255, 0, 0)');
  });

  test('should handle keyboard shortcuts', async () => {
    // Quick capture shortcut (Alt+Shift+S)
    await page.keyboard.press('Alt+Shift+S');
    await page.waitForSelector('.insight-clip-marker');
    let downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);

    // Toggle mode shortcut (Alt+Shift+M)
    await page.keyboard.press('Alt+Shift+M');
    await page.waitForTimeout(500); // Wait for mode switch

    // Click to add annotation
    await page.mouse.click(200, 200);
    await page.waitForSelector('.annotation-dialog');

    // Save with keyboard shortcut (Ctrl+Enter)
    await page.keyboard.press('Control+Enter');
    await page.waitForSelector('.insight-clip-marker');
    downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
  });

  test('should handle errors gracefully', async () => {
    // Test invalid screenshot coordinates
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight + 1000);
    });
    await page.keyboard.down('Alt');
    await page.mouse.click(100, 100);
    await page.keyboard.up('Alt');

    // Verify error notification
    const errorNotification = await page.waitForSelector(
      '.insight-clip-notification--error'
    );
    const errorText = await errorNotification.textContent();
    expect(errorText).toContain('Screenshot capture failed');

    // Test microphone permission denial
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);
    await popup.getByRole('button', { name: /Annotation/ }).click();
    await popup.getByRole('checkbox', { name: 'Voice Recording' }).check();

    // Mock permission denial
    await page.evaluate(() => {
      navigator.mediaDevices.getUserMedia = async () => {
        throw new Error('Permission denied');
      };
    });

    await page.bringToFront();
    await page.mouse.click(100, 100);

    // Verify error handling in voice recorder
    const dialog = await page.waitForSelector('.annotation-dialog');
    const errorMessage = await dialog.waitForSelector('.voice-recorder__error');
    expect(await errorMessage.textContent()).toContain('Permission denied');
  });
});
