/**
 * Tests for screenshot handler
 */

import { screenshotHandler } from '@/background/modules/screenshot-handler';

describe('ScreenshotHandler', () => {
  const mockTab = (global as any).testUtils.createMockTab();
  const mockCaptureData = {
    coordinates: { x: 100, y: 200 },
    selectedIcon: 'blue' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    screenshotHandler.resetRateLimit();
    
    // Mock Chrome APIs
    chrome.tabs.query = jest.fn().mockResolvedValue([mockTab]);
    chrome.tabs.get = jest.fn().mockResolvedValue(mockTab);
    chrome.tabs.captureVisibleTab = jest.fn().mockResolvedValue('data:image/png;base64,mock');
    chrome.downloads.download = jest.fn().mockResolvedValue(123);
  });

  describe('handleScreenshotCapture', () => {
    test('should capture screenshot successfully', async () => {
      const result = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      
      expect(result.success).toBe(true);
      expect(result.dataUrl).toContain('data:image/png;base64');
      expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
    });

    test('should capture screenshot with specific tab ID', async () => {
      const result = await screenshotHandler.handleScreenshotCapture(mockCaptureData, 1);
      
      expect(result.success).toBe(true);
      expect(chrome.tabs.get).toHaveBeenCalledWith(1);
    });

    test('should handle rate limiting', async () => {
      // First capture should succeed
      const result1 = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      expect(result1.success).toBe(true);
      
      // Immediate second capture should be rate limited
      const result2 = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      expect(result2.success).toBe(false);
      expect(result2.error).toContain('wait a moment');
    });

    test('should reject invalid tab URLs', async () => {
      const systemTab = { ...mockTab, url: 'chrome://settings' };
      chrome.tabs.query = jest.fn().mockResolvedValue([systemTab]);
      
      const result = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('system pages');
    });

    test('should handle missing tab', async () => {
      chrome.tabs.query = jest.fn().mockResolvedValue([]);
      
      const result = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No active tab');
    });

    test('should handle capture API errors', async () => {
      chrome.tabs.captureVisibleTab = jest.fn().mockRejectedValue(new Error('Capture failed'));
      
      const result = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Capture failed');
    });

    test('should process annotation data', async () => {
      const dataWithAnnotation = {
        ...mockCaptureData,
        annotation: 'Test annotation',
      };
      
      const result = await screenshotHandler.handleScreenshotCapture(dataWithAnnotation);
      
      expect(result.success).toBe(true);
      expect(result.dataUrl).toContain('data:image/png;base64');
    });

    test('should process transcription data', async () => {
      const dataWithTranscription = {
        ...mockCaptureData,
        transcription: 'Test transcription',
      };
      
      const result = await screenshotHandler.handleScreenshotCapture(dataWithTranscription);
      
      expect(result.success).toBe(true);
      expect(result.dataUrl).toContain('data:image/png;base64');
    });
  });

  describe('saveScreenshot', () => {
    const mockScreenshotData = {
      dataUrl: 'data:image/png;base64,mock',
      url: 'https://example.com',
      timestamp: Date.now(),
      coordinates: { x: 100, y: 200 },
      mode: 'snap',
    };

    test('should save screenshot successfully', async () => {
      const result = await screenshotHandler.saveScreenshot(mockScreenshotData);
      
      expect(result.downloadId).toBe(123);
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: mockScreenshotData.dataUrl,
        filename: expect.stringContaining('insight-clip_example.com'),
        saveAs: false,
      });
    });

    test('should generate filename with annotation suffix', async () => {
      const dataWithAnnotation = {
        ...mockScreenshotData,
        annotation: 'Test annotation',
      };
      
      await screenshotHandler.saveScreenshot(dataWithAnnotation);
      
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: dataWithAnnotation.dataUrl,
        filename: expect.stringContaining('_annotated.png'),
        saveAs: false,
      });
    });

    test('should generate filename with transcription suffix', async () => {
      const dataWithTranscription = {
        ...mockScreenshotData,
        transcription: 'Test transcription',
      };
      
      await screenshotHandler.saveScreenshot(dataWithTranscription);
      
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: dataWithTranscription.dataUrl,
        filename: expect.stringContaining('_transcribed.png'),
        saveAs: false,
      });
    });

    test('should handle invalid URLs in filename generation', async () => {
      const dataWithInvalidUrl = {
        ...mockScreenshotData,
        url: 'invalid-url',
      };
      
      const result = await screenshotHandler.saveScreenshot(dataWithInvalidUrl);
      
      expect(result.downloadId).toBe(123);
      expect(chrome.downloads.download).toHaveBeenCalledWith({
        url: dataWithInvalidUrl.dataUrl,
        filename: expect.stringContaining('insight-clip_screenshot'),
        saveAs: false,
      });
    });

    test('should handle download API errors', async () => {
      chrome.downloads.download = jest.fn().mockRejectedValue(new Error('Download failed'));
      
      await expect(screenshotHandler.saveScreenshot(mockScreenshotData))
        .rejects.toThrow('Failed to save screenshot');
    });
  });

  describe('Rate Limiting', () => {
    test('should allow capture after rate limit period', async () => {
      // First capture
      const result1 = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      expect(result1.success).toBe(true);
      
      // Reset rate limit manually (simulating time passage)
      screenshotHandler.resetRateLimit();
      
      // Second capture should succeed
      const result2 = await screenshotHandler.handleScreenshotCapture(mockCaptureData);
      expect(result2.success).toBe(true);
    });

    test('should reset rate limit state', () => {
      screenshotHandler.resetRateLimit();
      // Should not throw and should allow immediate capture
      expect(() => screenshotHandler.resetRateLimit()).not.toThrow();
    });
  });

  describe('Filename Generation', () => {
    test('should generate valid filenames', async () => {
      const testCases = [
        {
          url: 'https://example.com/path',
          expected: 'example.com',
        },
        {
          url: 'https://subdomain.example.com',
          expected: 'subdomain.example.com',
        },
        {
          url: 'http://localhost:3000',
          expected: 'localhost',
        },
      ];

      for (const testCase of testCases) {
        const data = { 
          dataUrl: 'data:image/png;base64,mock',
          url: testCase.url,
          coordinates: { x: 100, y: 200 },
          selectedIcon: 'blue' as const,
          timestamp: Date.now(),
        };
        await screenshotHandler.saveScreenshot(data);
        
        expect(chrome.downloads.download).toHaveBeenCalledWith({
          url: data.dataUrl,
          filename: expect.stringContaining(testCase.expected),
          saveAs: false,
        });
      }
    });

    test('should sanitize timestamps in filenames', async () => {
      const mockData = {
        dataUrl: 'data:image/png;base64,mock',
        url: 'https://example.com',
        coordinates: { x: 100, y: 200 },
        selectedIcon: 'blue' as const,
        timestamp: Date.now(),
      };
      await screenshotHandler.saveScreenshot(mockData);
      
      const call = (chrome.downloads.download as jest.Mock).mock.calls[0][0];
      const filename = call.filename;
      
      // Should not contain colons (replaced with dashes) or periods in timestamp
      expect(filename).not.toMatch(/:/);
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/);
    });
  });
});