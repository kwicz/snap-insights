/**
 * Tests for extension lifecycle handler
 */

import { extensionLifecycleHandler } from '@/background/modules/extension-lifecycle';
import { STORAGE_KEYS, EXTENSION_MODES, ICON_TYPES } from '@/shared/constants/app-constants';

describe('ExtensionLifecycleHandler', () => {
  const mockTab = (global as any).testUtils.createMockTab();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
    chrome.storage.sync.set = jest.fn().mockResolvedValue(undefined);
    chrome.tabs.query = jest.fn().mockResolvedValue([mockTab]);
    chrome.scripting.executeScript = jest.fn().mockResolvedValue([]);
    chrome.tabs.sendMessage = jest.fn().mockResolvedValue({ success: true });
    chrome.action.setBadgeText = jest.fn().mockResolvedValue(undefined);
    chrome.action.setTitle = jest.fn().mockResolvedValue(undefined);
  });

  describe('handleActivateExtension', () => {
    const activationData = {
      mode: EXTENSION_MODES.SNAP as any,
      selectedIcon: ICON_TYPES.BLUE as any,
    };

    test('should activate extension successfully', async () => {
      const result = await extensionLifecycleHandler.handleActivateExtension(activationData);
      
      expect(result.success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.EXTENSION_ACTIVE]: true,
        [STORAGE_KEYS.CURRENT_MODE]: activationData.mode,
        [STORAGE_KEYS.SELECTED_ICON]: activationData.selectedIcon,
      });
    });

    test('should update badge on activation', async () => {
      await extensionLifecycleHandler.handleActivateExtension(activationData);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'S' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Snap Mode' });
    });

    test('should inject content script', async () => {
      await extensionLifecycleHandler.handleActivateExtension(activationData);
      
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
        target: { tabId: mockTab.id },
        files: ['content/content.js'],
      });
    });

    test('should send activation message to content script', async () => {
      await extensionLifecycleHandler.handleActivateExtension(activationData);
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
        type: 'ACTIVATE_CAPTURE_MODE',
        data: activationData,
      });
    });

    test('should handle system page URLs', async () => {
      const systemTab = { ...mockTab, url: 'chrome://settings' };
      chrome.tabs.query = jest.fn().mockResolvedValue([systemTab]);
      
      await expect(extensionLifecycleHandler.handleActivateExtension(activationData))
        .rejects.toThrow(/system pages/);
    });

    test('should handle missing active tab', async () => {
      chrome.tabs.query = jest.fn().mockResolvedValue([]);
      
      await expect(extensionLifecycleHandler.handleActivateExtension(activationData))
        .rejects.toThrow('No active tab found');
    });

    test('should handle content script injection failure', async () => {
      chrome.scripting.executeScript = jest.fn().mockRejectedValue(new Error('Injection failed'));
      
      await expect(extensionLifecycleHandler.handleActivateExtension(activationData))
        .rejects.toThrow('Injection failed');
    });

    test('should handle message sending failure', async () => {
      chrome.tabs.sendMessage = jest.fn().mockRejectedValue(new Error('Message failed'));
      
      await expect(extensionLifecycleHandler.handleActivateExtension(activationData))
        .rejects.toThrow('Message failed');
    });
  });

  describe('handleDeactivateExtension', () => {
    test('should deactivate extension successfully', async () => {
      const result = await extensionLifecycleHandler.handleDeactivateExtension();
      
      expect(result.success).toBe(true);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.EXTENSION_ACTIVE]: false,
        [STORAGE_KEYS.CURRENT_MODE]: null,
        [STORAGE_KEYS.SELECTED_ICON]: null,
      });
    });

    test('should clear badge on deactivation', async () => {
      await extensionLifecycleHandler.handleDeactivateExtension();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'SnapInsights' });
    });

    test('should send deactivation message to content script', async () => {
      await extensionLifecycleHandler.handleDeactivateExtension();
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(mockTab.id, {
        type: 'DEACTIVATE_CAPTURE_MODE',
      });
    });

    test('should handle content script message failure gracefully', async () => {
      chrome.tabs.sendMessage = jest.fn().mockRejectedValue(new Error('Message failed'));
      
      const result = await extensionLifecycleHandler.handleDeactivateExtension();
      
      // Should still succeed even if message fails
      expect(result.success).toBe(true);
    });

    test('should handle missing active tab gracefully', async () => {
      chrome.tabs.query = jest.fn().mockResolvedValue([]);
      
      const result = await extensionLifecycleHandler.handleDeactivateExtension();
      
      expect(result.success).toBe(true);
    });
  });

  describe('handleInstallation', () => {
    test('should set up default settings on installation', async () => {
      await extensionLifecycleHandler.handleInstallation();
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.SETTINGS]: expect.objectContaining({
          mode: EXTENSION_MODES.SNAP,
          markerColor: expect.any(Object),
          saveLocation: expect.any(Object),
          voice: expect.any(Object),
          text: expect.any(Object),
          transcription: expect.any(Object),
        }),
      });
    });

    test('should set initial extension state', async () => {
      await extensionLifecycleHandler.handleInstallation();
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        [STORAGE_KEYS.EXTENSION_ACTIVE]: false,
        [STORAGE_KEYS.CURRENT_MODE]: EXTENSION_MODES.SNAP,
        [STORAGE_KEYS.SELECTED_ICON]: ICON_TYPES.BLUE,
      });
    });

    test('should clear badge on installation', async () => {
      await extensionLifecycleHandler.handleInstallation();
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'SnapInsights' });
    });

    test('should handle storage errors during installation', async () => {
      chrome.storage.sync.set = jest.fn().mockRejectedValue(new Error('Storage failed'));
      
      await expect(extensionLifecycleHandler.handleInstallation())
        .rejects.toThrow('Failed to initialize extension');
    });
  });

  describe('updateBadge', () => {
    test('should update badge for snap mode', async () => {
      await extensionLifecycleHandler.updateBadge(EXTENSION_MODES.SNAP as any);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'S' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Snap Mode' });
    });

    test('should update badge for annotate mode', async () => {
      await extensionLifecycleHandler.updateBadge(EXTENSION_MODES.ANNOTATE as any);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'A' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Annotate Mode' });
    });

    test('should update badge for transcribe mode', async () => {
      await extensionLifecycleHandler.updateBadge(EXTENSION_MODES.TRANSCRIBE as any);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'T' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Transcribe Mode' });
    });

    test('should handle unknown mode', async () => {
      await extensionLifecycleHandler.updateBadge('unknown' as any);
      
      expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: 'S' });
      expect(chrome.action.setTitle).toHaveBeenCalledWith({ title: 'Snap Mode' });
    });
  });
});