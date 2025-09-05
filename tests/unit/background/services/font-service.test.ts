/**
 * Tests for font service
 */

import { fontService } from '@/background/services/font-service';

describe('FontService', () => {
  beforeEach(() => {
    fontService.reset();
    jest.clearAllMocks();
  });

  describe('loadFont', () => {
    test('should load font successfully', async () => {
      await fontService.loadFont();
      
      expect(fontService.isFontLoaded()).toBe(true);
    });

    test('should not reload font if already loaded', async () => {
      await fontService.loadFont();
      const firstLoadResult = fontService.isFontLoaded();
      
      await fontService.loadFont();
      const secondLoadResult = fontService.isFontLoaded();
      
      expect(firstLoadResult).toBe(true);
      expect(secondLoadResult).toBe(true);
    });

    test('should handle font loading errors gracefully', async () => {
      // Mock FontFace to throw error
      const originalFontFace = (global as any).FontFace;
      (global as any).FontFace = class {
        constructor() {
          throw new Error('Font loading failed');
        }
      };

      await expect(fontService.loadFont()).resolves.not.toThrow();
      
      // Font should not be marked as loaded on error
      expect(fontService.isFontLoaded()).toBe(false);
      
      // Restore
      (global as any).FontFace = originalFontFace;
    });

    test('should handle missing canvas context', async () => {
      // Mock OffscreenCanvas to return null context
      const originalOffscreenCanvas = (global as any).OffscreenCanvas;
      (global as any).OffscreenCanvas = class {
        getContext() {
          return null;
        }
      };

      await expect(fontService.loadFont()).resolves.not.toThrow();
      
      // Restore
      (global as any).OffscreenCanvas = originalOffscreenCanvas;
    });
  });

  describe('getFontFamily', () => {
    test('should return correct font family string', () => {
      const fontFamily = fontService.getFontFamily();
      
      expect(fontFamily).toContain('League Spartan');
      expect(fontFamily).toContain('14px');
      expect(fontFamily).toContain('400');
    });

    test('should accept custom size and weight', () => {
      const fontFamily = fontService.getFontFamily(18, '600');
      
      expect(fontFamily).toContain('18px');
      expect(fontFamily).toContain('600');
    });

    test('should include fallback fonts', () => {
      const fontFamily = fontService.getFontFamily();
      
      expect(fontFamily).toContain('Arial');
      expect(fontFamily).toContain('sans-serif');
    });
  });

  describe('isFontLoaded', () => {
    test('should return false initially', () => {
      expect(fontService.isFontLoaded()).toBe(false);
    });

    test('should return true after successful load', async () => {
      await fontService.loadFont();
      expect(fontService.isFontLoaded()).toBe(true);
    });
  });

  describe('reset', () => {
    test('should reset font loading state', async () => {
      await fontService.loadFont();
      expect(fontService.isFontLoaded()).toBe(true);
      
      fontService.reset();
      expect(fontService.isFontLoaded()).toBe(false);
    });
  });
});