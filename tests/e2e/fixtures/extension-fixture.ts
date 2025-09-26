/**
 * Playwright fixture for Chrome Extension testing
 */

import { test as base, expect } from '@playwright/test';
import { ExtensionHelper } from '../helpers/extension-helpers';

type ExtensionFixtures = {
  extensionHelper: ExtensionHelper;
  extensionId: string;
  popupPage: any;
};

export const test = base.extend<ExtensionFixtures>({
  // Extension helper fixture
  extensionHelper: async ({ page, context }, use) => {
    const helper = new ExtensionHelper(page, context);

    // Verify extension is loaded before tests
    const isLoaded = await helper.verifyExtensionLoaded();
    expect(isLoaded).toBe(true);

    await use(helper);
  },

  // Extension ID fixture
  extensionId: async ({ extensionHelper }, use) => {
    const extensionId = await extensionHelper.getExtensionId();
    await use(extensionId);
  },

  // Popup page fixture
  popupPage: async ({ extensionHelper }, use) => {
    const popupPage = await extensionHelper.openPopup();
    await use(popupPage);

    // Cleanup
    await popupPage.close();
  },
});

export { expect } from '@playwright/test';