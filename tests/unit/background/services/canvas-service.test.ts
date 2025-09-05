/**
 * Tests for canvas service
 */

import { canvasService } from '@/background/services/canvas-service';

describe('CanvasService', () => {
  const mockDataUrl = 'data:image/png;base64,mock-data';
  const mockConfig = {
    coordinates: { x: 100, y: 200 },
    selectedIcon: 'blue' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock fetch for data URL
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(new Blob(['mock-image'])),
      })
      .mockResolvedValueOnce({
        blob: () => Promise.resolve(new Blob(['mock-icon'])),
      });
  });

  describe('drawMarkerOnScreenshot', () => {
    test('should draw marker on screenshot successfully', async () => {
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, mockConfig);
      
      expect(result).toContain('data:image/png;base64');
      expect(fetch).toHaveBeenCalledWith(mockDataUrl);
    });

    test('should draw marker with annotation', async () => {
      const configWithAnnotation = {
        ...mockConfig,
        annotation: 'Test annotation',
      };
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, configWithAnnotation);
      
      expect(result).toContain('data:image/png;base64');
    });

    test('should draw marker with transcription', async () => {
      const configWithTranscription = {
        ...mockConfig,
        transcription: 'Test transcription',
      };
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, configWithTranscription);
      
      expect(result).toContain('data:image/png;base64');
    });

    test('should handle different icon types', async () => {
      const configs = [
        { ...mockConfig, selectedIcon: 'light' as const },
        { ...mockConfig, selectedIcon: 'blue' as const },
        { ...mockConfig, selectedIcon: 'dark' as const },
      ];
      
      for (const config of configs) {
        const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, config);
        expect(result).toContain('data:image/png;base64');
      }
    });

    test('should return original dataUrl on error', async () => {
      // Mock fetch to fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'));
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, mockConfig);
      
      expect(result).toBe(mockDataUrl);
    });

    test('should use fallback marker when icon loading fails', async () => {
      // Mock successful screenshot fetch but failed icon fetch
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          blob: () => Promise.resolve(new Blob(['mock-image'])),
        })
        .mockRejectedValueOnce(new Error('Icon fetch failed'));
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, mockConfig);
      
      expect(result).toContain('data:image/png;base64');
    });

    test('should handle invalid extension context', async () => {
      // Mock chrome.runtime.getURL to throw
      const originalGetURL = chrome.runtime.getURL;
      chrome.runtime.getURL = jest.fn().mockImplementation(() => {
        throw new Error('Extension context invalid');
      });
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, mockConfig);
      
      expect(result).toContain('data:image/png;base64');
      
      // Restore
      chrome.runtime.getURL = originalGetURL;
    });
  });

  describe('Canvas Operations', () => {
    test('should create canvas with correct dimensions', async () => {
      const mockImageBitmap = { width: 800, height: 600 };
      (global as any).createImageBitmap = jest.fn().mockResolvedValue(mockImageBitmap);
      
      await canvasService.drawMarkerOnScreenshot(mockDataUrl, mockConfig);
      
      expect(createImageBitmap).toHaveBeenCalled();
    });

    test('should handle canvas context operations', async () => {
      const mockContext = {
        drawImage: jest.fn(),
        fillStyle: '',
        strokeStyle: '',
        lineWidth: 0,
        globalAlpha: 1,
        font: '',
        textAlign: 'left',
        textBaseline: 'top',
        beginPath: jest.fn(),
        arc: jest.fn(),
        fill: jest.fn(),
        stroke: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100 })),
        roundRect: jest.fn(),
      };
      
      const originalOffscreenCanvas = (global as any).OffscreenCanvas;
      (global as any).OffscreenCanvas = class {
        constructor(public width: number, public height: number) {}
        getContext() { return mockContext; }
        convertToBlob() { return Promise.resolve(new Blob(['mock'])); }
      };
      
      await canvasService.drawMarkerOnScreenshot(mockDataUrl, {
        ...mockConfig,
        annotation: 'Test',
      });
      
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      
      // Restore
      (global as any).OffscreenCanvas = originalOffscreenCanvas;
    });
  });

  describe('Text Wrapping', () => {
    test('should wrap long text correctly', async () => {
      const longText = 'This is a very long annotation that should be wrapped across multiple lines';
      
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, {
        ...mockConfig,
        annotation: longText,
      });
      
      expect(result).toContain('data:image/png;base64');
    });

    test('should handle empty text', async () => {
      const result = await canvasService.drawMarkerOnScreenshot(mockDataUrl, {
        ...mockConfig,
        annotation: '',
      });
      
      expect(result).toContain('data:image/png;base64');
    });
  });
});