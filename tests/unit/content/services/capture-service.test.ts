/**
 * Tests for capture service
 */

import { captureService } from '@/content/services/capture-service';
import { notificationManager } from '@/content/modules/notification-manager';

// Mock dependencies
jest.mock('@/content/modules/notification-manager');

describe('CaptureService', () => {
  const mockCoordinates = { x: 100, y: 200 };
  const mockCaptureData = {
    coordinates: mockCoordinates,
    selectedIcon: 'blue' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
      success: true,
      dataUrl: 'data:image/png;base64,mock',
    });
    
    // Mock notification manager
    (notificationManager.showSuccess as jest.Mock) = jest.fn();
    (notificationManager.showError as jest.Mock) = jest.fn();
  });

  describe('captureScreenshot', () => {
    test('should capture screenshot successfully', async () => {
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(true);
      expect(result.dataUrl).toBe('data:image/png;base64,mock');
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_SCREENSHOT',
        data: mockCaptureData,
      });
    });

    test('should capture screenshot with annotation', async () => {
      const dataWithAnnotation = {
        ...mockCaptureData,
        annotation: 'Test annotation',
      };
      
      const result = await captureService.captureScreenshot(dataWithAnnotation);
      
      expect(result.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_SCREENSHOT',
        data: dataWithAnnotation,
      });
    });

    test('should capture screenshot with transcription', async () => {
      const dataWithTranscription = {
        ...mockCaptureData,
        transcription: 'Test transcription',
      };
      
      const result = await captureService.captureScreenshot(dataWithTranscription);
      
      expect(result.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_SCREENSHOT',
        data: dataWithTranscription,
      });
    });

    test('should handle capture failure', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
        success: false,
        error: 'Capture failed',
      });
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Capture failed');
    });

    test('should handle message sending errors', async () => {
      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(new Error('Message failed'));
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message failed');
    });

    test('should handle context invalidation errors', async () => {
      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(
        new Error('Extension context invalidated')
      );
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Extension context invalidated');
    });
  });

  describe('saveScreenshot', () => {
    const mockScreenshotData = {
      dataUrl: 'data:image/png;base64,mock',
      url: 'https://example.com',
      timestamp: Date.now(),
      coordinates: mockCoordinates,
    };

    test('should save screenshot successfully', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
        downloadId: 123,
      });
      
      const result = await captureService.saveScreenshot(mockScreenshotData);
      
      expect(result.downloadId).toBe(123);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'SAVE_SCREENSHOT',
        data: mockScreenshotData,
      });
    });

    test('should handle save errors', async () => {
      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(new Error('Save failed'));
      
      await expect(captureService.saveScreenshot(mockScreenshotData))
        .rejects.toThrow('Save failed');
    });

    test('should handle invalid response', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue(null);
      
      await expect(captureService.saveScreenshot(mockScreenshotData))
        .rejects.toThrow('Invalid response from background script');
    });
  });

  describe('captureAndSave', () => {
    const mockScreenshotData = {
      dataUrl: 'data:image/png;base64,mock',
      url: 'https://example.com',
      timestamp: Date.now(),
      coordinates: mockCoordinates,
    };

    test('should capture and save screenshot successfully', async () => {
      chrome.runtime.sendMessage = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          dataUrl: 'data:image/png;base64,mock',
        })
        .mockResolvedValueOnce({
          downloadId: 123,
        });
      
      const result = await captureService.captureAndSave(mockCaptureData, mockScreenshotData);
      
      expect(result.success).toBe(true);
      expect(result.downloadId).toBe(123);
      expect(notificationManager.showSuccess).toHaveBeenCalledWith(
        'Screenshot captured and saved successfully!'
      );
    });

    test('should handle capture failure in captureAndSave', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
        success: false,
        error: 'Capture failed',
      });
      
      const result = await captureService.captureAndSave(mockCaptureData, mockScreenshotData);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Capture failed');
      expect(notificationManager.showError).toHaveBeenCalledWith(
        'Failed to capture screenshot: Capture failed'
      );
    });

    test('should handle save failure in captureAndSave', async () => {
      chrome.runtime.sendMessage = jest.fn()
        .mockResolvedValueOnce({
          success: true,
          dataUrl: 'data:image/png;base64,mock',
        })
        .mockRejectedValueOnce(new Error('Save failed'));
      
      const result = await captureService.captureAndSave(mockCaptureData, mockScreenshotData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Save failed');
      expect(notificationManager.showError).toHaveBeenCalledWith(
        expect.stringContaining('Failed to save screenshot')
      );
    });
  });

  describe('validateCaptureData', () => {
    test('should validate correct capture data', () => {
      const isValid = (captureService as any).validateCaptureData(mockCaptureData);
      expect(isValid).toBe(true);
    });

    test('should reject data without coordinates', () => {
      const invalidData = { selectedIcon: 'blue' };
      const isValid = (captureService as any).validateCaptureData(invalidData);
      expect(isValid).toBe(false);
    });

    test('should reject data with invalid coordinates', () => {
      const invalidData = {
        coordinates: { x: 'invalid', y: 200 },
        selectedIcon: 'blue',
      };
      const isValid = (captureService as any).validateCaptureData(invalidData);
      expect(isValid).toBe(false);
    });

    test('should accept data with optional fields', () => {
      const dataWithOptionals = {
        ...mockCaptureData,
        annotation: 'Test',
        transcription: 'Test transcription',
      };
      const isValid = (captureService as any).validateCaptureData(dataWithOptionals);
      expect(isValid).toBe(true);
    });
  });

  describe('error handling', () => {
    test('should handle runtime errors gracefully', async () => {
      // Mock chrome.runtime as undefined
      const originalRuntime = chrome.runtime;
      delete (chrome as any).runtime;
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Chrome runtime not available');
      
      // Restore
      (chrome as any).runtime = originalRuntime;
    });

    test('should handle malformed responses', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue('invalid response');
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid response');
    });
  });

  describe('retry mechanism', () => {
    test('should retry failed captures', async () => {
      chrome.runtime.sendMessage = jest.fn()
        .mockRejectedValueOnce(new Error('Temporary failure'))
        .mockResolvedValueOnce({
          success: true,
          dataUrl: 'data:image/png;base64,mock',
        });
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(true);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(2);
    });

    test('should give up after max retries', async () => {
      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(new Error('Persistent failure'));
      
      const result = await captureService.captureScreenshot(mockCaptureData);
      
      expect(result.success).toBe(false);
      expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('performance monitoring', () => {
    test('should track capture timing', async () => {
      const startTime = Date.now();
      
      await captureService.captureScreenshot(mockCaptureData);
      
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThan(0);
    });
  });
});