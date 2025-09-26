/**
 * Screenshot capture and processing service
 * Extracted from background.ts for better code organization
 */

import { ScreenshotData, MarkerColorSettings } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';

// Default marker settings
const DEFAULT_MARKER_SETTINGS: MarkerColorSettings = {
  color: '#FF0000',
  opacity: 0.8,
  size: 32,
  style: 'solid',
};

/**
 * Screenshot capture and processing service
 */
export class ScreenshotService {
  /**
   * Handle screenshot capture request
   */
  async handleScreenshotCapture(captureData: any, tabId?: number): Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Capturing screenshot with data:', captureData);

      // Get current tab info
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error('No active tab found');
      }

      // Capture the visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(
        currentTab.windowId,
        { format: 'png' as const }
      );

      if (!dataUrl) {
        throw new Error('Failed to capture screenshot');
      }

      // If we have marker data, draw the marker on the screenshot
      let processedDataUrl = dataUrl;
      if (captureData?.coordinates || captureData?.annotation) {
        try {
          processedDataUrl = await this.drawMarkerOnScreenshot(
            dataUrl,
            captureData.coordinates || { x: 0, y: 0 },
            captureData.selectedIcon || 'blue',
            captureData.annotation
          );
        } catch (markerError) {
          backgroundLogger.warn('Failed to draw marker, using original screenshot:', markerError);
          // Continue with original screenshot if marker drawing fails
        }
      }

      backgroundLogger.info('Screenshot captured successfully');
      return {
        success: true,
        dataUrl: processedDataUrl,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Screenshot capture failed:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Save screenshot to downloads
   */
  async saveScreenshot(screenshotData: ScreenshotData): Promise<{
    success: boolean;
    downloadId?: number;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Saving screenshot:', screenshotData);

      // Create filename from URL and timestamp
      const url = new URL(screenshotData.url);
      const timestamp = new Date(screenshotData.timestamp)
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5); // Remove milliseconds and Z

      const filename = `insight-clip_${url.hostname}_${timestamp}.png`;

      // Download the screenshot
      const downloadId = await chrome.downloads.download({
        url: screenshotData.dataUrl,
        filename: filename,
        saveAs: false,
      });

      backgroundLogger.info(`Screenshot saved as: ${filename}`);
      return {
        success: true,
        downloadId,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      backgroundLogger.error('Failed to save screenshot:', error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Draw marker on screenshot
   */
  private async drawMarkerOnScreenshot(
    dataUrl: string,
    coordinates: { x: number; y: number },
    selectedIcon: string = 'blue',
    annotation?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = async () => {
        try {
          // Create canvas with image dimensions
          const canvas = new OffscreenCanvas(img.width, img.height);
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Draw original image
          ctx.drawImage(img, 0, 0);

          // Get marker settings from storage or use defaults
          const markerSettings = await this.getMarkerSettings();

          // Draw marker
          await this.drawMarker(ctx, coordinates, selectedIcon, markerSettings);

          // Draw annotation if provided
          if (annotation) {
            this.drawAnnotationText(ctx, coordinates, annotation, markerSettings.size);
          }

          // Convert to data URL
          const blob = await canvas.convertToBlob({ type: 'image/png' });
          const reader = new FileReader();

          reader.onload = () => {
            resolve(reader.result as string);
          };

          reader.onerror = () => {
            reject(new Error('Failed to convert canvas to data URL'));
          };

          reader.readAsDataURL(blob);
        } catch (error) {
          reject(error);
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = dataUrl;
    });
  }

  /**
   * Draw marker on canvas
   */
  private async drawMarker(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    selectedIcon: string,
    settings: MarkerColorSettings
  ): Promise<void> {
    const { x, y } = coordinates;
    const { size, color, opacity } = settings;

    // Set drawing properties
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    // Draw circular marker
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Draw border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Try to load and draw icon
    try {
      const iconUrl = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
      const iconImg = new Image();

      await new Promise<void>((resolve, reject) => {
        iconImg.onload = () => {
          const iconSize = size * 0.6;
          ctx.globalAlpha = 1;
          ctx.drawImage(
            iconImg,
            x - iconSize / 2,
            y - iconSize / 2,
            iconSize,
            iconSize
          );
          resolve();
        };

        iconImg.onerror = () => {
          // Fallback to simple circle if icon fails
          resolve();
        };

        iconImg.src = iconUrl;
      });
    } catch (error) {
      // Icon loading failed, marker circle is already drawn
      backgroundLogger.warn('Failed to load marker icon:', error);
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  /**
   * Draw annotation text
   */
  private drawAnnotationText(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    annotation: string,
    markerSize: number
  ): void {
    // Set text properties
    ctx.font = '400 14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Calculate text position
    const textX = coordinates.x + markerSize / 2 + 10;
    const textY = coordinates.y - markerSize / 2;

    // Wrap text and calculate dimensions
    const lines = this.wrapText(annotation, 200);
    const lineHeight = 18;
    const padding = 8;

    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const textHeight = lines.length * lineHeight;

    // Draw background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(
      textX - padding,
      textY - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw border
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 1;
    ctx.strokeRect(
      textX - padding,
      textY - padding,
      textWidth + padding * 2,
      textHeight + padding * 2
    );

    // Draw text
    ctx.fillStyle = '#000000';
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, textY + index * lineHeight);
    });
  }

  /**
   * Wrap text to fit within maximum width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;

      // Simple character-based width estimation (more accurate would require canvas measurement)
      if (testLine.length * 8 <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines.length > 0 ? lines : [text];
  }

  /**
   * Get marker settings from storage
   */
  private async getMarkerSettings(): Promise<MarkerColorSettings> {
    try {
      const result = await chrome.storage.sync.get('settings');
      const settings = result.settings;

      if (settings?.markerColor) {
        return {
          ...DEFAULT_MARKER_SETTINGS,
          ...settings.markerColor,
        };
      }

      return DEFAULT_MARKER_SETTINGS;
    } catch (error) {
      backgroundLogger.warn('Failed to get marker settings, using defaults:', error);
      return DEFAULT_MARKER_SETTINGS;
    }
  }

  /**
   * Generate filename for screenshot
   */
  private generateFilename(url: string, timestamp: number): string {
    try {
      const urlObj = new URL(url);
      const date = new Date(timestamp)
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5); // Remove milliseconds and Z

      return `insight-clip_${urlObj.hostname}_${date}.png`;
    } catch (error) {
      // Fallback if URL parsing fails
      const date = new Date(timestamp)
        .toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);

      return `insight-clip_screenshot_${date}.png`;
    }
  }
}

// Export singleton instance
export const screenshotService = new ScreenshotService();