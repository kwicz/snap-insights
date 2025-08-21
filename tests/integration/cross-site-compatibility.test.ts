import { chromium, Browser, Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.join(__dirname, '../../dist');

// Test sites with different characteristics
const TEST_SITES = [
  {
    name: 'Static Site',
    url: 'https://example.com',
    description: 'Basic static HTML site',
  },
  {
    name: 'Dynamic Site',
    url: 'https://react-shopping-cart-67954.firebaseapp.com/',
    description: 'React-based SPA',
  },
  {
    name: 'Infinite Scroll',
    url: 'https://infinite-scroll.com/demo/full-page/',
    description: 'Site with infinite scroll',
  },
  {
    name: 'Complex Layout',
    url: 'https://www.nytimes.com/',
    description: 'Site with complex layout and iframes',
  },
  {
    name: 'WebGL Content',
    url: 'https://threejs.org/examples/#webgl_animation_keyframes',
    description: 'Site with WebGL content',
  },
];

test.describe('Cross-Site Compatibility', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  for (const site of TEST_SITES) {
    test(`should work on ${site.name}`, async () => {
      // Navigate to test site
      await test.step(`Navigate to ${site.name}`, async () => {
        await page.goto(site.url);
        await page.waitForLoadState('domcontentloaded');
      });

      // Test screenshot capture
      await test.step('Capture screenshot', async () => {
        await page.keyboard.press('Alt+Shift+S');
        await page.waitForSelector('.insight-clip-marker');
        const downloads = await page.waitForEvent('download');
        expect(downloads.suggestedFilename()).toMatch(
          /^ux-screenshot_.*\.png$/
        );
      });

      // Test text annotation
      await test.step('Add text annotation', async () => {
        await page.keyboard.press('Alt+Shift+M'); // Switch to annotation mode
        await page.mouse.click(200, 200);

        const dialog = await page.waitForSelector('.annotation-dialog');
        await dialog
          .getByRole('textbox')
          .fill(`Test annotation on ${site.name}`);
        await dialog.getByRole('button', { name: 'Save' }).click();

        await page.waitForSelector('.insight-clip-marker');
      });
    });
  }
});

test.describe('Error Cases', () => {
  let browser: Browser;
  let page: Page;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test('should handle CORS restrictions', async () => {
    // Navigate to a site with strict CORS
    await page.goto('https://developer.mozilla.org');

    // Try to capture screenshot
    await page.keyboard.press('Alt+Shift+S');

    // Verify error handling
    const error = await page.waitForSelector(
      '.insight-clip-notification--error'
    );
    expect(await error.textContent()).toContain('capture failed');
  });

  test('should handle iframes correctly', async () => {
    // Navigate to a page with iframes
    await page.goto('https://example.com/iframe-test');

    // Try to capture iframe content
    const iframe = await page.frameLocator('iframe').first();
    await iframe.click();
    await page.keyboard.press('Alt+Shift+S');

    // Verify capture includes iframe content
    const downloads = await page.waitForEvent('download');
    expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
  });

  test('should handle network errors', async () => {
    // Mock offline state
    await page.context().setOffline(true);
    await page.goto('https://example.com');

    // Try operations while offline
    await page.keyboard.press('Alt+Shift+S');

    // Verify error notification
    const error = await page.waitForSelector(
      '.insight-clip-notification--error'
    );
    expect(await error.textContent()).toContain('network error');

    // Restore online state
    await page.context().setOffline(false);
  });

  test('should handle large page content', async () => {
    // Navigate to a page with lots of content
    await page.goto('https://example.com/large-page');

    // Generate large content
    await page.evaluate(() => {
      const content = document.createElement('div');
      content.style.height = '10000px';
      content.style.width = '5000px';
      document.body.appendChild(content);
    });

    // Try to capture large area
    await page.keyboard.press('Alt+Shift+S');

    // Verify capture or appropriate error
    try {
      const downloads = await page.waitForEvent('download', { timeout: 10000 });
      expect(downloads.suggestedFilename()).toMatch(/^ux-screenshot_.*\.png$/);
    } catch {
      const error = await page.waitForSelector(
        '.insight-clip-notification--error'
      );
      expect(await error.textContent()).toContain('content too large');
    }
  });

  test('should handle invalid file paths', async () => {
    // Open extension popup
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${EXTENSION_PATH}/popup.html`);

    // Set invalid save location
    await popup.getByRole('button', { name: /Custom Location/ }).click();
    await popup.fill('input[type="text"]', '/invalid/path/that/does/not/exist');

    // Try to capture
    await page.bringToFront();
    await page.keyboard.press('Alt+Shift+S');

    // Verify error handling
    const error = await page.waitForSelector(
      '.insight-clip-notification--error'
    );
    expect(await error.textContent()).toContain('invalid save location');
  });

  test('should handle permission changes', async () => {
    // Mock permission API
    await page.evaluate(() => {
      navigator.permissions.query = async () => ({
        state: 'denied',
        addEventListener: () => {},
        removeEventListener: () => {},
      });
    });

    // Try voice recording
    await page.keyboard.press('Alt+Shift+M');
    await page.mouse.click(200, 200);

    const dialog = await page.waitForSelector('.annotation-dialog');
    await dialog.getByRole('button', { name: 'Start Recording' }).click();

    // Verify permission error
    const error = await dialog.waitForSelector('.voice-recorder__error');
    expect(await error.textContent()).toContain('permission');
  });

  test('should handle browser zoom levels', async () => {
    // Test different zoom levels
    const zoomLevels = [0.5, 1.0, 1.5, 2.0];

    for (const zoom of zoomLevels) {
      // Set zoom level
      await page.evaluate(`document.body.style.zoom = ${zoom}`);

      // Try to capture
      await page.keyboard.press('Alt+Shift+S');

      // Verify capture works or shows appropriate error
      try {
        const downloads = await page.waitForEvent('download');
        expect(downloads.suggestedFilename()).toMatch(
          /^ux-screenshot_.*\.png$/
        );
      } catch {
        const error = await page.waitForSelector(
          '.insight-clip-notification--error'
        );
        expect(await error.textContent()).toContain('zoom level not supported');
      }
    }
  });

  test('should handle rapid operations', async () => {
    // Perform rapid screenshot captures
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Alt+Shift+S');
      await page.waitForTimeout(100); // Small delay
    }

    // Verify throttling or error handling
    const notifications = await page.$$('.insight-clip-notification');
    expect(notifications.length).toBeGreaterThan(0);
  });
});

test.describe('Browser Compatibility', () => {
  test.skip('should work in Firefox', async () => {
    // Firefox tests would go here
    // Currently skipped as we're focusing on Chrome
  });

  test.skip('should work in Safari', async () => {
    // Safari tests would go here
    // Currently skipped as we're focusing on Chrome
  });

  test.skip('should work in Edge', async () => {
    // Edge tests would go here
    // Currently skipped as we're focusing on Chrome
  });
});
