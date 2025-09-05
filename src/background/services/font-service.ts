/**
 * Font loading service for background script
 */

import { LEAGUE_SPARTAN_FONT } from '@/shared/constants/ui-constants';
import { backgroundLogger } from '@/utils/debug-logger';

/**
 * Service for loading and managing fonts in service worker context
 */
export class FontService {
  private fontLoaded = false;
  private loadingPromise: Promise<void> | null = null;

  /**
   * Load and check font availability
   */
  async loadFont(): Promise<void> {
    if (this.fontLoaded) {
      return;
    }

    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = this.performFontLoad();
    return this.loadingPromise;
  }

  /**
   * Perform the actual font loading
   */
  private async performFontLoad(): Promise<void> {
    try {
      backgroundLogger.debug('Loading League Spartan font...');

      // Create a temporary canvas to check font loading
      const canvas = new OffscreenCanvas(100, 100);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load the font using FontFace API
      const font = new FontFace(
        LEAGUE_SPARTAN_FONT.FAMILY,
        LEAGUE_SPARTAN_FONT.URL,
        {
          weight: LEAGUE_SPARTAN_FONT.WEIGHT,
        }
      );

      // Wait for font to load
      await font.load();

      // Add to FontFaceSet if available
      if (typeof self !== 'undefined' && (self as any).fonts) {
        (self as any).fonts.add(font);
      }

      this.fontLoaded = true;
      backgroundLogger.info('League Spartan font loaded successfully');

    } catch (error) {
      backgroundLogger.warn('Failed to load League Spartan font:', error);
      // Don't throw - font loading failure shouldn't break the extension
    }
  }

  /**
   * Check if font is loaded
   */
  isFontLoaded(): boolean {
    return this.fontLoaded;
  }

  /**
   * Get font family string for canvas context
   */
  getFontFamily(size: number = 14, weight: string = '400'): string {
    return `${weight} ${size}px "${LEAGUE_SPARTAN_FONT.FAMILY}", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  }

  /**
   * Reset font loading state (for testing)
   */
  reset(): void {
    this.fontLoaded = false;
    this.loadingPromise = null;
  }
}

// Singleton instance
export const fontService = new FontService();