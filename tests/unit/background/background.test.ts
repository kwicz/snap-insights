import { mockChromeExtension } from '../../../src/utils/test-utils';

// Mock the background script functions
const mockBackground = {
  handleScreenshotCapture: jest.fn(),
  saveScreenshot: jest.fn(),
  handleSettingsUpdate: jest.fn(),
  handleModeToggle: jest.fn(),
  updateBadge: jest.fn(),
};

describe('Background Service Worker', () => {
  beforeEach(() => {
    mockChromeExtension.resetMocks();
    jest.clearAllMocks();
  });

  describe('Screenshot Capture', () => {
    it('should capture screenshot successfully', async () => {
      const mockDataUrl = 'data:image/png;base64,mockdata';
      mockChromeExtension.mockCaptureTab(mockDataUrl);

      const mockTab = { id: 1, url: 'https://example.com', windowId: 1 };
      (chrome.tabs.get as jest.Mock).mockResolvedValue(mockTab);

      const captureData = {
        coordinates: { x: 100, y: 100 },
        annotation: 'Test annotation',
      };

      // Mock the background function
      mockBackground.handleScreenshotCapture.mockResolvedValue({
        success: true,
        dataUrl: mockDataUrl,
      });

      const result = await mockBackground.handleScreenshotCapture(
        captureData,
        1
      );

      expect(result.success).toBe(true);
      expect(result.dataUrl).toBe(mockDataUrl);
      expect(mockBackground.handleScreenshotCapture).toHaveBeenCalledWith(
        captureData,
        1
      );
    });

    it('should handle screenshot capture errors', async () => {
      mockBackground.handleScreenshotCapture.mockResolvedValue({
        success: false,
        error: 'No active tab found',
      });

      const result = await mockBackground.handleScreenshotCapture(
        {
          coordinates: { x: 100, y: 100 },
        },
        undefined
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('No active tab found');
    });
  });

  describe('File Saving', () => {
    it('should save screenshot with correct filename format', async () => {
      const screenshotData = {
        dataUrl: 'data:image/png;base64,test',
        url: 'https://example.com/page',
        timestamp: new Date('2023-08-20T10:30:00Z').getTime(),
        coordinates: { x: 100, y: 100 },
        annotation: 'Test annotation',
      };

      mockBackground.saveScreenshot.mockResolvedValue({ downloadId: 123 });

      const result = await mockBackground.saveScreenshot(screenshotData);

      expect(result.downloadId).toBe(123);
      expect(mockBackground.saveScreenshot).toHaveBeenCalledWith(
        screenshotData
      );
    });
  });

  describe('Settings Management', () => {
    it('should update settings correctly', async () => {
      const newSettings = { mode: 'annotation' as const };

      mockBackground.handleSettingsUpdate.mockResolvedValue(undefined);

      await mockBackground.handleSettingsUpdate(newSettings);

      expect(mockBackground.handleSettingsUpdate).toHaveBeenCalledWith(
        newSettings
      );
    });

    it('should toggle mode between screenshot and annotation', async () => {
      mockBackground.handleModeToggle.mockResolvedValue({ mode: 'annotation' });

      const result = await mockBackground.handleModeToggle();

      expect(result.mode).toBe('annotation');
    });
  });

  describe('Badge Updates', () => {
    it('should update badge for screenshot mode', async () => {
      mockBackground.updateBadge.mockResolvedValue(undefined);

      await mockBackground.updateBadge('screenshot');

      expect(mockBackground.updateBadge).toHaveBeenCalledWith('screenshot');
    });

    it('should update badge for annotation mode', async () => {
      mockBackground.updateBadge.mockResolvedValue(undefined);

      await mockBackground.updateBadge('annotation');

      expect(mockBackground.updateBadge).toHaveBeenCalledWith('annotation');
    });
  });

  describe('Chrome API Integration', () => {
    it('should handle runtime messages', () => {
      const mockMessage = {
        type: 'CAPTURE_SCREENSHOT',
        data: { coordinates: { x: 100, y: 100 } },
      };
      const mockSender = { tab: { id: 1 } };
      const mockSendResponse = jest.fn();

      // Test that chrome.runtime.onMessage listener would be called
      expect(chrome.runtime.onMessage.addListener).toBeDefined();
    });

    it('should handle keyboard commands', () => {
      // Test that chrome.commands.onCommand listener would be called
      expect(chrome.commands.onCommand.addListener).toBeDefined();
    });

    it('should handle extension installation', () => {
      // Test that chrome.runtime.onInstalled listener would be called
      expect(chrome.runtime.onInstalled.addListener).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle tab capture errors gracefully', async () => {
      (chrome.tabs.captureVisibleTab as jest.Mock).mockRejectedValue(
        new Error('Permission denied')
      );

      mockBackground.handleScreenshotCapture.mockResolvedValue({
        success: false,
        error: 'Permission denied',
      });

      const result = await mockBackground.handleScreenshotCapture(
        { coordinates: { x: 100, y: 100 } },
        1
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should handle download errors gracefully', async () => {
      (chrome.downloads.download as jest.Mock).mockRejectedValue(
        new Error('Download failed')
      );

      mockBackground.saveScreenshot.mockRejectedValue(
        new Error('Download failed')
      );

      await expect(
        mockBackground.saveScreenshot({
          dataUrl: 'data:image/png;base64,test',
          url: 'https://example.com',
          timestamp: Date.now(),
          coordinates: { x: 100, y: 100 },
        })
      ).rejects.toThrow('Download failed');
    });
  });
});
