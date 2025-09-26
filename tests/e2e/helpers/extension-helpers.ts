/**
 * Helper utilities for Chrome Extension E2E testing with Playwright
 */

import { Page, BrowserContext, expect } from '@playwright/test';

export class ExtensionHelper {
  constructor(private page: Page, private context: BrowserContext) {}

  /**
   * Get the extension ID from the loaded extension
   */
  async getExtensionId(): Promise<string> {
    // Navigate to chrome://extensions to get extension ID
    await this.page.goto('chrome://extensions/');

    // Enable developer mode if not already enabled
    const devModeToggle = this.page.locator('[aria-label="Developer mode"]');
    if (await devModeToggle.isVisible()) {
      await devModeToggle.click();
    }

    // Find our extension by name
    const extensionCard = this.page.locator('[data-testid="extensions-card"]').filter({
      hasText: 'SnapInsights'
    }).first();

    // Get the extension ID from the card
    const extensionId = await extensionCard.getAttribute('id');

    if (!extensionId) {
      throw new Error('Could not find SnapInsights extension ID');
    }

    return extensionId;
  }

  /**
   * Open the extension popup
   */
  async openPopup(): Promise<Page> {
    const extensionId = await this.getExtensionId();
    const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;

    const popupPage = await this.context.newPage();
    await popupPage.goto(popupUrl);

    return popupPage;
  }

  /**
   * Navigate to a test page and inject content script
   */
  async navigateToTestPage(url = 'https://example.com'): Promise<void> {
    await this.page.goto(url);
    await this.page.waitForLoadState('domcontentloaded');

    // Wait a bit for content script injection
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if extension is properly loaded
   */
  async verifyExtensionLoaded(): Promise<boolean> {
    try {
      const extensionId = await this.getExtensionId();
      return extensionId.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Get extension service worker page
   */
  async getServiceWorkerPage(): Promise<Page | null> {
    const pages = this.context.pages();

    for (const page of pages) {
      const url = page.url();
      if (url.includes('chrome-extension://') && url.includes('background')) {
        return page;
      }
    }

    // If not found, try to navigate to service worker
    try {
      const extensionId = await this.getExtensionId();
      const swPage = await this.context.newPage();
      await swPage.goto(`chrome-extension://${extensionId}/background/background.html`);
      return swPage;
    } catch {
      return null;
    }
  }

  /**
   * Trigger extension activation via keyboard shortcut
   */
  async triggerKeyboardShortcut(): Promise<void> {
    // Default shortcut is typically Ctrl+Shift+Y or Cmd+Shift+Y
    const modifier = process.platform === 'darwin' ? 'Meta' : 'Control';
    await this.page.keyboard.press(`${modifier}+Shift+KeyY`);
    await this.page.waitForTimeout(500);
  }

  /**
   * Click extension icon in toolbar
   */
  async clickExtensionIcon(): Promise<void> {
    // This is browser-specific and might need adjustment
    const extensionIcon = this.page.locator('[aria-label*="SnapInsights"]');
    if (await extensionIcon.isVisible()) {
      await extensionIcon.click();
    } else {
      // Fallback: use keyboard shortcut
      await this.triggerKeyboardShortcut();
    }
  }

  /**
   * Wait for content script to be injected and ready
   */
  async waitForContentScript(): Promise<void> {
    await this.page.waitForFunction(() => {
      return window.hasOwnProperty('snapInsightsContentScriptLoaded');
    }, { timeout: 5000 });
  }

  /**
   * Simulate taking a screenshot at specific coordinates
   */
  async simulateScreenshot(x = 100, y = 100): Promise<void> {
    await this.page.click(`body`, { position: { x, y } });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Check if UI elements are present on page
   */
  async verifyUIElements(): Promise<{
    hasClickFeedback: boolean;
    hasJourneyIndicator: boolean;
    hasNotifications: boolean;
  }> {
    const hasClickFeedback = await this.page.locator('[id*="insight-clip"]').count() > 0;
    const hasJourneyIndicator = await this.page.locator('#snapinsights-journey-indicator').isVisible();
    const hasNotifications = await this.page.locator('[class*="notification"]').count() > 0;

    return {
      hasClickFeedback,
      hasJourneyIndicator,
      hasNotifications,
    };
  }

  /**
   * Get extension console logs
   */
  async getConsoleLogs(): Promise<string[]> {
    const logs: string[] = [];

    this.page.on('console', (msg) => {
      if (msg.text().includes('INSIGHT-CLIP')) {
        logs.push(msg.text());
      }
    });

    return logs;
  }

  /**
   * Check if extension storage contains expected data
   */
  async verifyExtensionStorage(): Promise<{
    hasSettings: boolean;
    hasCurrentMode: boolean;
  }> {
    const storageCheck = await this.page.evaluate(() => {
      return new Promise((resolve) => {
        chrome.storage.sync.get(['settings'], (syncResult) => {
          chrome.storage.local.get(['currentMode'], (localResult) => {
            resolve({
              hasSettings: !!syncResult.settings,
              hasCurrentMode: !!localResult.currentMode,
            });
          });
        });
      });
    });

    return storageCheck as { hasSettings: boolean; hasCurrentMode: boolean };
  }

  /**
   * Take screenshot of current page state for debugging
   */
  async takeDebugScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/${name}-${Date.now()}.png`,
      fullPage: true
    });
  }
}

/**
 * Test data and fixtures
 */
export const TestData = {
  testUrls: {
    simple: 'https://example.com',
    complex: 'https://github.com',
    local: 'data:text/html,<html><body><h1>Test Page</h1><p>Content for testing</p></body></html>',
  },

  screenshots: {
    coordinates: [
      { x: 100, y: 100 },
      { x: 300, y: 200 },
      { x: 500, y: 300 },
    ],
  },

  modes: ['snap', 'annotate', 'transcribe', 'start'] as const,

  icons: ['light', 'blue', 'dark'] as const,
};

/**
 * Custom assertions for extension testing
 */
export const ExtensionAssertions = {
  async toHaveExtensionLoaded(helper: ExtensionHelper) {
    const isLoaded = await helper.verifyExtensionLoaded();
    expect(isLoaded).toBe(true);
  },

  async toHaveContentScriptInjected(page: Page) {
    await expect(page).toHaveFunction('snapInsightsContentScriptLoaded');
  },

  async toHaveUIFeedback(helper: ExtensionHelper) {
    const ui = await helper.verifyUIElements();
    expect(ui.hasClickFeedback || ui.hasNotifications).toBe(true);
  },
};