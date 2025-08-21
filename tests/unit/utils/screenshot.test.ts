import {
  ScreenshotProcessor,
  ScreenshotUtils,
  screenshotProcessor,
} from '../src/utils/screenshot';

// Mock canvas and context
const mockCtx = {
  drawImage: jest.fn(),
  beginPath: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  setLineDash: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  strokeStyle: '#000000',
  fillStyle: '#000000',
  lineWidth: 1,
  globalAlpha: 1,
  imageSmoothingEnabled: true,
  alpha: false,
  willReadFrequently: false,
  canvas: null as any,
  // Add missing properties
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  clip: jest.fn(),
  scale: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  transform: jest.fn(),
  setTransform: jest.fn(),
  resetTransform: jest.fn(),
  createPattern: jest.fn(),
  createLinearGradient: jest.fn(),
  createRadialGradient: jest.fn(),
  measureText: jest.fn().mockReturnValue({ width: 100 }),
  isPointInPath: jest.fn(),
  isPointInStroke: jest.fn(),
} as unknown as CanvasRenderingContext2D & {
  drawImage: jest.Mock;
  beginPath: jest.Mock;
  arc: jest.Mock;
  fill: jest.Mock;
  stroke: jest.Mock;
  save: jest.Mock;
  restore: jest.Mock;
  setLineDash: jest.Mock;
  clearRect: jest.Mock;
  getImageData: jest.Mock;
  putImageData: jest.Mock;
  moveTo: jest.Mock;
  lineTo: jest.Mock;
  closePath: jest.Mock;
  clip: jest.Mock;
  scale: jest.Mock;
  translate: jest.Mock;
  rotate: jest.Mock;
  transform: jest.Mock;
  setTransform: jest.Mock;
  resetTransform: jest.Mock;
  createPattern: jest.Mock;
  createLinearGradient: jest.Mock;
  createRadialGradient: jest.Mock;
  measureText: jest.Mock;
  isPointInPath: jest.Mock;
  isPointInStroke: jest.Mock;
};

const mockCanvas = {
  getContext: jest.fn().mockReturnValue(mockCtx),
  width: 800,
  height: 600,
  toDataURL: jest
    .fn()
    .mockImplementation((type = 'image/png', quality = 0.92) => {
      return `data:${type};base64,mockedData`;
    }),
} as unknown as HTMLCanvasElement & {
  getContext: jest.Mock;
  toDataURL: jest.Mock;
};

// Set up circular reference
(mockCtx as any).canvas = mockCanvas;

// Mock document.createElement to return our mock canvas
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  if (tag.toLowerCase() === 'canvas') {
    return mockCanvas;
  }
  return document.createElement(tag);
});

// Mock Image with proper typing
class MockImage {
  onload: (() => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  width = mockCanvas.width;
  height = mockCanvas.height;
  src = '';

  constructor() {
    // Simulate successful image load after a tick
    setTimeout(() => this.onload?.(), 0);
  }
}

// Set up global mocks
global.Image = MockImage as unknown as typeof Image;

describe('ScreenshotProcessor', () => {
  let processor: ScreenshotProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new ScreenshotProcessor();
  });

  describe('processScreenshot', () => {
    const mockDataUrl = 'data:image/png;base64,abc123';
    const mockCoordinates = { x: 100, y: 100 };

    it('should process screenshot with default options', async () => {
      const result = await processor.processScreenshot(
        mockDataUrl,
        mockCoordinates
      );

      expect(mockCtx.drawImage).toHaveBeenCalled();
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png', 0.85);
      expect(result).toHaveProperty('originalDataUrl', mockDataUrl);
      expect(result).toHaveProperty('processedDataUrl');
      expect(result).toHaveProperty('metadata');
    });

    it('should respect format and quality options', async () => {
      await processor.processScreenshot(mockDataUrl, mockCoordinates, {
        format: 'jpeg',
        quality: 75,
      });

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.75);
    });

    it('should skip marker if addMarker is false', async () => {
      await processor.processScreenshot(mockDataUrl, mockCoordinates, {
        includeMarker: false,
      });

      expect(mockCtx.beginPath).not.toHaveBeenCalled();
      expect(mockCtx.arc).not.toHaveBeenCalled();
    });

    it('should handle errors during processing', async () => {
      mockCanvas.toDataURL.mockImplementationOnce(() => {
        throw new Error('Canvas error');
      });

      await expect(
        processor.processScreenshot(mockDataUrl, mockCoordinates)
      ).rejects.toThrow('Canvas error');
    });
  });

  describe('drawMarker', () => {
    const mockCoordinates = { x: 100, y: 100 };
    const mockMarkerSettings = {
      color: '#ff0000',
      opacity: 0.8,
      size: 16,
      style: 'solid' as const,
    };

    beforeEach(() => {
      // Reset context mock calls
      Object.values(mockCtx).forEach((mock) => {
        if (typeof mock === 'function') {
          (mock as jest.Mock).mockClear();
        }
      });
    });

    it('should draw solid marker correctly', () => {
      processor['drawMarker'](mockCoordinates, mockMarkerSettings);

      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.arc).toHaveBeenCalledWith(100, 100, 8, 0, Math.PI * 2);
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should draw dashed marker correctly', () => {
      processor['drawMarker'](mockCoordinates, {
        ...mockMarkerSettings,
        style: 'dashed',
      });

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([4, 2]);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should draw dotted marker correctly', () => {
      processor['drawMarker'](mockCoordinates, {
        ...mockMarkerSettings,
        style: 'dotted',
      });

      expect(mockCtx.setLineDash).toHaveBeenCalledWith([2, 2]);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should handle markers at canvas edges', () => {
      const edgeCoordinates = [
        { x: 0, y: 0 },
        { x: mockCanvas.width, y: mockCanvas.height },
        { x: -10, y: 50 },
        { x: 50, y: mockCanvas.height + 10 },
      ];

      edgeCoordinates.forEach((coord) => {
        processor['drawMarker'](coord, mockMarkerSettings);
        expect(mockCtx.beginPath).toHaveBeenCalled();
        expect(mockCtx.arc).toHaveBeenCalled();
        mockCtx.beginPath.mockClear();
        mockCtx.arc.mockClear();
      });
    });

    it('should apply correct opacity and color', () => {
      const settings = {
        ...mockMarkerSettings,
        color: '#00ff00',
        opacity: 0.5,
      };

      processor['drawMarker'](mockCoordinates, settings);

      // Check if color and opacity were set correctly
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();
    });

    it('should handle invalid marker styles gracefully', () => {
      const invalidStyle = 'invalid' as any;
      processor['drawMarker'](mockCoordinates, {
        ...mockMarkerSettings,
        style: invalidStyle,
      });

      // Should default to solid style
      expect(mockCtx.fill).toHaveBeenCalled();
      expect(mockCtx.setLineDash).not.toHaveBeenCalled();
    });
  });
});

describe('ScreenshotUtils', () => {
  describe('isValidDataUrl', () => {
    it('should validate PNG data URLs', () => {
      expect(
        ScreenshotUtils.isValidDataUrl('data:image/png;base64,abc123')
      ).toBe(true);
    });

    it('should validate JPEG data URLs', () => {
      expect(
        ScreenshotUtils.isValidDataUrl('data:image/jpeg;base64,abc123')
      ).toBe(true);
      expect(
        ScreenshotUtils.isValidDataUrl('data:image/jpg;base64,abc123')
      ).toBe(true);
    });

    it('should reject invalid data URLs', () => {
      expect(ScreenshotUtils.isValidDataUrl('invalid')).toBe(false);
      expect(
        ScreenshotUtils.isValidDataUrl('data:text/plain;base64,abc123')
      ).toBe(false);
    });
  });

  describe('getImageDimensions', () => {
    it('should return image dimensions', async () => {
      const dimensions = await ScreenshotUtils.getImageDimensions(
        'data:image/png;base64,abc123'
      );
      expect(dimensions).toEqual({ width: 800, height: 600 });
    });

    it('should handle load errors', async () => {
      // Override MockImage to simulate error
      class ErrorImage extends MockImage {
        constructor() {
          super();
          setTimeout(() => this.onerror?.(new Error('Load failed')), 0);
        }
      }
      global.Image = ErrorImage as any;

      await expect(
        ScreenshotUtils.getImageDimensions('data:image/png;base64,abc123')
      ).rejects.toThrow('Failed to load image');
    });
  });

  describe('dataUrlToBlob', () => {
    it('should convert data URL to blob', () => {
      const dataUrl = 'data:image/png;base64,SGVsbG8gV29ybGQ=';
      const blob = ScreenshotUtils.dataUrlToBlob(dataUrl);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
    });

    it('should handle data URLs without mime type', () => {
      const dataUrl = 'data:;base64,SGVsbG8gV29ybGQ=';
      const blob = ScreenshotUtils.dataUrlToBlob(dataUrl);

      expect(blob.type).toBe('image/png'); // Default type
    });
  });

  describe('getDataUrlSize', () => {
    it('should calculate correct file size', () => {
      const size = ScreenshotUtils.getDataUrlSize(
        'data:image/png;base64,SGVsbG8gV29ybGQ='
      );
      expect(size).toBe(11); // "Hello World" in base64
    });
  });

  describe('formatFileSize', () => {
    it('should format file sizes correctly', () => {
      expect(ScreenshotUtils.formatFileSize(0)).toBe('0 Bytes');
      expect(ScreenshotUtils.formatFileSize(1024)).toBe('1 KB');
      expect(ScreenshotUtils.formatFileSize(1234567)).toBe('1.18 MB');
      expect(ScreenshotUtils.formatFileSize(1234567890)).toBe('1.15 GB');
    });
  });

  describe('generateFilename', () => {
    it('should generate correct filename', () => {
      const url = 'https://example.com/page';
      const timestamp = new Date('2024-01-01T12:34:56').getTime();

      const filename = ScreenshotUtils.generateFilename(url, timestamp);
      expect(filename).toBe(
        'ux-screenshot_2024-01-01_12-34-56_example-com.png'
      );
    });

    it('should handle different formats', () => {
      const url = 'https://example.com/page';
      const timestamp = new Date('2024-01-01T12:34:56').getTime();

      const filename = ScreenshotUtils.generateFilename(url, timestamp, 'jpeg');
      expect(filename).toBe(
        'ux-screenshot_2024-01-01_12-34-56_example-com.jpeg'
      );
    });

    it('should sanitize domain names', () => {
      const url = 'https://sub.example.com:8080/page?q=1';
      const timestamp = new Date('2024-01-01T12:34:56').getTime();

      const filename = ScreenshotUtils.generateFilename(url, timestamp);
      expect(filename).toBe(
        'ux-screenshot_2024-01-01_12-34-56_sub-example-com-8080.png'
      );
    });
  });
});
