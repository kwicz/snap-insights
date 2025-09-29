/**
 * Screenshot capture and processing service
 * Extracted from background.ts for better code organization
 */

import { ScreenshotData, MarkerColorSettings } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';
import { COLORS } from '../../shared/constants/ui-constants';

// Default marker settings
const DEFAULT_MARKER_SETTINGS: MarkerColorSettings = {
  color: '#3b82f6',
  opacity: 1.0,
  size: 40,
  style: 'solid',
};

/**
 * Screenshot capture and processing service
 */
export class ScreenshotService {
  /**
   * Handle screenshot capture request
   */
  async handleScreenshotCapture(
    captureData: any,
    tabId?: number
  ): Promise<{
    success: boolean;
    dataUrl?: string;
    error?: string;
  }> {
    try {
      backgroundLogger.debug('Capturing screenshot with data:', captureData);

      // Get current tab info
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const currentTab = tabs[0];

      if (!currentTab?.id) {
        throw new Error('No active tab found');
      }

      // Capture the visible tab
      const dataUrl = await chrome.tabs.captureVisibleTab(currentTab.windowId, {
        format: 'png' as const,
      });

      if (!dataUrl) {
        throw new Error('Failed to capture screenshot');
      }

      // If we have marker data, draw the marker on the screenshot
      let processedDataUrl = dataUrl;
      if (captureData?.coordinates) {
        const annotationText = captureData.annotation || captureData.transcription;

        try {
          processedDataUrl = await this.drawMarkerOnScreenshot(
            dataUrl,
            captureData.coordinates,
            captureData.selectedIcon || 'blue',
            annotationText
          );
        } catch (markerError) {
          backgroundLogger.warn(
            'Failed to draw marker, using original screenshot:',
            markerError
          );
          // Continue with original screenshot if marker drawing fails
        }
      }

      backgroundLogger.info('Screenshot captured successfully');
      return {
        success: true,
        dataUrl: processedDataUrl,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
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
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
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
    return new Promise(async (resolve, reject) => {
      try {
        // Convert data URL to blob for service worker compatibility
        const response = await fetch(dataUrl);
        const imageBlob = await response.blob();

        // Create ImageBitmap from blob (service worker compatible)
        const img = await createImageBitmap(imageBlob);
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
          this.drawAnnotationText(
            ctx,
            coordinates,
            annotation,
            markerSettings.size
          );
        }

        // Convert to data URL
        const canvasBlob = await canvas.convertToBlob({ type: 'image/png' });
        const reader = new FileReader();

        reader.onload = () => {
          resolve(reader.result as string);
        };

        reader.onerror = () => {
          reject(new Error('Failed to convert canvas to data URL'));
        };

        reader.readAsDataURL(canvasBlob);
      } catch (error) {
        backgroundLogger.error('Error in drawMarkerOnScreenshot:', error);
        reject(error);
      }
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

    // Add shadow for better visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Set drawing properties
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;

    // Draw circular marker
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.fill();

    // Reset shadow for border
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw white border for contrast
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
    ctx.stroke();

    // Try to load and draw icon (service worker compatible)
    try {
      const iconUrl = chrome.runtime.getURL(
        `assets/icons/touchpoint-${selectedIcon}.png`
      );

      // Fetch icon and create ImageBitmap (service worker compatible)
      const iconResponse = await fetch(iconUrl);
      const iconBlob = await iconResponse.blob();
      const iconImg = await createImageBitmap(iconBlob);

      const iconSize = size * 0.6;
      ctx.globalAlpha = 1;
      ctx.drawImage(
        iconImg,
        x - iconSize / 2,
        y - iconSize / 2,
        iconSize,
        iconSize
      );

    } catch (error) {
      // Icon loading failed, marker circle is already drawn
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  /**
   * Draw annotation text in speech bubble
   */
  private drawAnnotationText(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    annotation: string,
    markerSize: number
  ): void {
    // Get canvas dimensions to determine positioning
    const canvasWidth = ctx.canvas.width;
    // Set text properties with fallback fonts
    ctx.font =
      '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Determine if touchpoint is in right half of screen
    const isRightHalf = coordinates.x > canvasWidth / 2;

    // Calculate text position - left or right of marker based on screen position
    let textX: number;
    if (isRightHalf) {
      // Position to the left of the touchpoint with more space
      textX = coordinates.x - markerSize / 2 - 20;
    } else {
      // Position to the right of the touchpoint (original behavior)
      textX = coordinates.x + markerSize / 2 + 12;
    }

    const textY = coordinates.y - markerSize / 2 - 85; // Move up by 85px (50 + 35)

    // Wrap text and calculate dimensions
    const lines = this.wrapText(annotation, 200);
    const lineHeight = 20;
    const padding = 16;
    const borderRadius = 12;
    const tailSize = 6; // Smaller tail for closer positioning

    const textWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width)
    );
    const textHeight = lines.length * lineHeight;

    // Speech bubble dimensions - adjust X position for left-side placement
    let bubbleX: number;
    if (isRightHalf) {
      // When on left side of touchpoint, bubble should extend further left
      bubbleX = textX - textWidth - padding;
    } else {
      // Original behavior - bubble to the right
      bubbleX = textX - padding;
    }

    const bubbleY = textY - padding;
    const bubbleWidth = textWidth + padding * 2;
    const bubbleHeight = textHeight + padding * 2;

    // Apply shadow before drawing speech bubble
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Draw speech bubble with rounded rectangle + tail using primary blue
    ctx.fillStyle = COLORS.PRIMARY;

    this.drawSpeechBubble(
      ctx,
      bubbleX,
      bubbleY,
      bubbleWidth,
      bubbleHeight,
      borderRadius,
      tailSize,
      coordinates,
      isRightHalf // Pass positioning info for tail direction
    );


    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Draw text in white - adjust alignment for left-side placement
    ctx.fillStyle = '#ffffff';

    if (isRightHalf) {
      // When bubble is on left side, align text to right within bubble
      ctx.textAlign = 'right';
      lines.forEach((line, index) => {
        ctx.fillText(line, textX, textY + index * lineHeight);
      });
    } else {
      // Original behavior - left aligned text
      ctx.textAlign = 'left';
      lines.forEach((line, index) => {
        ctx.fillText(line, textX, textY + index * lineHeight);
      });
    }
  }

  /**
   * Draw speech bubble shape with rounded corners and tail
   */
  private drawSpeechBubble(
    ctx: OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    borderRadius: number,
    tailSize: number,
    markerCoordinates: { x: number; y: number },
    isLeftSide: boolean = false // True when bubble is on left side of touchpoint
  ): void {
    ctx.beginPath();

    const tailY = markerCoordinates.y; // Align tail with marker center

    if (isLeftSide) {
      // When bubble is on LEFT side of touchpoint, tail points RIGHT
      // Start from top-left corner
      ctx.moveTo(x + borderRadius, y);

      // Top edge and top-right corner
      ctx.lineTo(x + width - borderRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);

      // Right edge with tail
      const bubbleRight = x + width;
      const tailYClamped = Math.max(y + borderRadius + tailSize, Math.min(tailY, y + height - borderRadius - tailSize));

      // Draw right edge down to tail start
      ctx.lineTo(bubbleRight, tailYClamped - tailSize);
      // Draw tail pointing right to marker
      ctx.lineTo(bubbleRight + tailSize, tailYClamped);
      ctx.lineTo(bubbleRight, tailYClamped + tailSize);

      // Continue right edge and bottom-right corner
      ctx.lineTo(bubbleRight, y + height - borderRadius);
      ctx.quadraticCurveTo(bubbleRight, y + height, bubbleRight - borderRadius, y + height);

      // Bottom edge and bottom-left corner
      ctx.lineTo(x + borderRadius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);

      // Left edge and close path
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);

    } else {
      // When bubble is on RIGHT side of touchpoint, tail points LEFT
      // Start from top-left corner
      ctx.moveTo(x + borderRadius, y);

      // Top edge and top-right corner
      ctx.lineTo(x + width - borderRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);

      // Right edge and bottom-right corner
      ctx.lineTo(x + width, y + height - borderRadius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);

      // Bottom edge and bottom-left corner
      ctx.lineTo(x + borderRadius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);

      // Left edge with tail
      const tailYClamped = Math.max(y + borderRadius + tailSize, Math.min(tailY, y + height - borderRadius - tailSize));

      ctx.lineTo(x, tailYClamped + tailSize);
      // Draw tail pointing left to marker
      ctx.lineTo(x - tailSize, tailYClamped);
      ctx.lineTo(x, tailYClamped - tailSize);

      // Continue left edge and close path
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    }

    ctx.closePath();
    ctx.fill();
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
      backgroundLogger.warn(
        'Failed to get marker settings, using defaults:',
        error
      );
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
