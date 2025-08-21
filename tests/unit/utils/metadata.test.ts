import { MetadataEmbedder, MetadataUtils } from '../../../src/utils/metadata';
import { createMockScreenshot } from '../../utils';

// Mock browser APIs
global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  devicePixelRatio: 2,
} as any;

global.navigator = {
  userAgent: 'Mozilla/5.0 (Test Browser)',
} as any;

// Mock atob and btoa
global.atob = jest.fn().mockImplementation((str: string) => {
  // Simple mock implementation
  return Buffer.from(str, 'base64').toString('binary');
});

global.btoa = jest.fn().mockImplementation((str: string) => {
  // Simple mock implementation
  return Buffer.from(str, 'binary').toString('base64');
});

describe('MetadataEmbedder', () => {
  let embedder: MetadataEmbedder;

  beforeEach(() => {
    embedder = new MetadataEmbedder();
    jest.clearAllMocks();
  });

  describe('Metadata Creation', () => {
    it('should create complete metadata from screenshot data', () => {
      const screenshotData = createMockScreenshot({
        url: 'https://example.com/test',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        annotation: 'Test annotation',
        voiceNote: 'Test voice note',
      });

      // Access private method for testing
      const metadata = (embedder as any).createMetadata(screenshotData);

      expect(metadata).toEqual({
        url: 'https://example.com/test',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        annotation: 'Test annotation',
        voiceNote: 'Test voice note',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
        captureMethod: undefined,
      });
    });

    it('should handle missing optional fields', () => {
      const screenshotData = createMockScreenshot({
        annotation: undefined,
        voiceNote: undefined,
      });

      const metadata = (embedder as any).createMetadata(screenshotData);

      expect(metadata.annotation).toBeUndefined();
      expect(metadata.voiceNote).toBeUndefined();
      expect(metadata.url).toBeDefined();
      expect(metadata.timestamp).toBeDefined();
    });
  });

  describe('PNG Text Chunk Creation', () => {
    it('should create valid text chunk', () => {
      const keyword = 'InsightClip:URL';
      const text = 'https://example.com';

      const chunk = (embedder as any).createTextChunk(keyword, text);

      expect(chunk).toBeInstanceOf(Uint8Array);
      expect(chunk.length).toBeGreaterThan(0);

      // Check chunk structure
      const length = (embedder as any).readUint32BE(chunk, 0);
      const type = new TextDecoder().decode(chunk.slice(4, 8));

      expect(type).toBe('tEXt');
      expect(length).toBe(keyword.length + 1 + text.length);
    });

    it('should create multiple text chunks for metadata', () => {
      const metadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        userAgent: 'Test Browser',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
      };

      const chunks = (embedder as any).createTextChunks(metadata);

      expect(chunks).toBeInstanceOf(Array);
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks.every((chunk: any) => chunk instanceof Uint8Array)).toBe(
        true
      );
    });
  });

  describe('Data URL Conversion', () => {
    it('should convert data URL to array buffer', () => {
      const dataUrl =
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

      const arrayBuffer = (embedder as any).dataUrlToArrayBuffer(dataUrl);

      expect(arrayBuffer).toBeInstanceOf(ArrayBuffer);
      expect(arrayBuffer.byteLength).toBeGreaterThan(0);
    });

    it('should convert array buffer to data URL', () => {
      const testData = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature

      const dataUrl = (embedder as any).arrayBufferToDataUrl(testData.buffer);

      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
      expect(dataUrl.length).toBeGreaterThan(22); // Minimum length for data URL prefix
    });
  });

  describe('CRC32 Calculation', () => {
    it('should calculate CRC32 checksum', () => {
      const testData = new Uint8Array([116, 69, 88, 116]); // "tEXt"

      const crc = (embedder as any).calculateCRC32(testData);

      expect(typeof crc).toBe('number');
      expect(crc).toBeGreaterThanOrEqual(0);
      expect(crc).toBeLessThanOrEqual(0xffffffff);
    });

    it('should generate CRC table', () => {
      const table = (embedder as any).generateCRCTable();

      expect(table).toBeInstanceOf(Uint32Array);
      expect(table.length).toBe(256);
      expect(table.every((value: number) => typeof value === 'number')).toBe(
        true
      );
    });
  });

  describe('Metadata Field Parsing', () => {
    it('should parse URL field', () => {
      const metadata: any = {};
      (embedder as any).parseMetadataField(
        metadata,
        'URL',
        'https://example.com'
      );

      expect(metadata.url).toBe('https://example.com');
    });

    it('should parse timestamp field', () => {
      const metadata: any = {};
      (embedder as any).parseMetadataField(
        metadata,
        'Timestamp',
        '1692531000000'
      );

      expect(metadata.timestamp).toBe(1692531000000);
    });

    it('should parse coordinates field', () => {
      const metadata: any = {};
      (embedder as any).parseMetadataField(
        metadata,
        'Coordinates',
        '{"x":100,"y":200}'
      );

      expect(metadata.coordinates).toEqual({ x: 100, y: 200 });
    });

    it('should handle invalid JSON gracefully', () => {
      const metadata: any = {};
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      (embedder as any).parseMetadataField(
        metadata,
        'Coordinates',
        'invalid-json'
      );

      expect(metadata.coordinates).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle embedding errors gracefully', async () => {
      const invalidDataUrl = 'invalid-data-url';
      const screenshotData = createMockScreenshot();

      const result = await embedder.embedMetadata(
        invalidDataUrl,
        screenshotData
      );

      // Should return original data URL on error
      expect(result).toBe(invalidDataUrl);
    });

    it('should handle extraction errors gracefully', async () => {
      const invalidDataUrl = 'invalid-data-url';

      const result = await embedder.extractMetadata(invalidDataUrl);

      expect(result).toBeNull();
    });
  });
});

describe('MetadataUtils', () => {
  describe('Metadata Formatting', () => {
    it('should format metadata for display', () => {
      const metadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        annotation: 'Test annotation',
        voiceNote: 'Test voice note',
        userAgent: 'Test Browser',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
      };

      const formatted = MetadataUtils.formatMetadata(metadata);

      expect(formatted['URL']).toBe('https://example.com');
      expect(formatted['Coordinates']).toBe('(100, 200)');
      expect(formatted['Annotation']).toBe('Test annotation');
      expect(formatted['Voice Note']).toBe('Yes');
      expect(formatted['Viewport']).toBe('1920x1080');
    });

    it('should handle missing optional fields in formatting', () => {
      const metadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        userAgent: 'Test Browser',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
      };

      const formatted = MetadataUtils.formatMetadata(metadata);

      expect(formatted['Annotation']).toBe('None');
      expect(formatted['Voice Note']).toBe('No');
    });
  });

  describe('Metadata Validation', () => {
    it('should validate complete metadata', () => {
      const metadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        userAgent: 'Test Browser',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
      };

      expect(MetadataUtils.isValidMetadata(metadata)).toBe(true);
    });

    it('should reject incomplete metadata', () => {
      const incompleteMetadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        // Missing required fields
      };

      expect(MetadataUtils.isValidMetadata(incompleteMetadata)).toBe(false);
    });
  });

  describe('Metadata Size Calculation', () => {
    it('should calculate metadata size', () => {
      const metadata = {
        url: 'https://example.com',
        timestamp: 1692531000000,
        coordinates: { x: 100, y: 200 },
        userAgent: 'Test Browser',
        viewport: { width: 1920, height: 1080 },
        devicePixelRatio: 2,
        extensionVersion: '1.0.0',
      };

      const size = MetadataUtils.calculateMetadataSize(metadata);

      expect(typeof size).toBe('number');
      expect(size).toBeGreaterThan(0);
    });
  });
});
