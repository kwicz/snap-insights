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
            annotationText,
            captureData.devicePixelRatio || 1
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
    annotation?: string,
    devicePixelRatio: number = 1
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

        // Scale coordinates by device pixel ratio
        const scaledCoordinates = {
          x: coordinates.x * devicePixelRatio,
          y: coordinates.y * devicePixelRatio
        };

        // Get marker settings from storage or use defaults
        const markerSettings = await this.getMarkerSettings();

        // Draw marker
        await this.drawMarker(ctx, scaledCoordinates, selectedIcon, markerSettings);

        // Draw annotation if provided
        if (annotation) {
          // Use the actual default marker size (40px) not the settings value
          // The settings might return a scaled or incorrect value
          const actualMarkerSize = 40;
          this.drawAnnotationText(
            ctx,
            scaledCoordinates,
            annotation,
            actualMarkerSize
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
    const { size } = settings;

    // Try to load and draw icon (service worker compatible)
    try {
      const iconUrl = chrome.runtime.getURL(
        `assets/icons/touchpoint-${selectedIcon}.png`
      );

      // Fetch icon and create ImageBitmap (service worker compatible)
      const iconResponse = await fetch(iconUrl);
      const iconBlob = await iconResponse.blob();
      const iconImg = await createImageBitmap(iconBlob);

      // Draw icon at full size (64px as designed)
      const iconSize = 64;

      // Add shadow for better visibility
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      ctx.globalAlpha = 1;
      ctx.drawImage(
        iconImg,
        x - iconSize / 2,
        y - iconSize / 2,
        iconSize,
        iconSize
      );

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

    } catch (error) {
      backgroundLogger.warn('Failed to load icon, drawing fallback marker:', error);

      // Fallback: draw a simple circle with white border
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;

      // Draw white circle as fallback
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(x, y, size / 2, 0, 2 * Math.PI);
      ctx.fill();

      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Reset alpha
    ctx.globalAlpha = 1;
  }

  /**
   * Draw annotation text in speech bubble pointing to marker
   */
  private drawAnnotationText(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    annotation: string,
    markerSize: number
  ): void {
    // Get canvas dimensions for bounds checking
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;

    // Set text properties with fallback fonts
    ctx.font =
      '500 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Wrap text and calculate dimensions
    const maxTextWidth = 200;
    const lines = this.wrapText(ctx, annotation, maxTextWidth);
    const lineHeight = 20;
    const padding = 16;
    const borderRadius = 12;
    const tailSize = 12; // Visible tail size
    const gapFromMarker = 12; // Gap equals tail size for proper spacing

    const textWidth = Math.max(
      ...lines.map((line) => ctx.measureText(line).width)
    );
    const bubbleWidth = Math.max(textWidth + padding * 2, 80); // Minimum width
    const bubbleHeight = lines.length * lineHeight + padding * 2;

    // Calculate marker bounds (marker is centered at coordinates)
    const markerRadius = markerSize / 2;
    const markerTop = coordinates.y - markerRadius;
    const markerBottom = coordinates.y + markerRadius;

    // Calculate bubble position - position it above the marker
    const bubbleBottom = markerTop - gapFromMarker;
    const bubbleY = bubbleBottom - bubbleHeight;

    // Center bubble horizontally over marker
    let bubbleX = coordinates.x - bubbleWidth / 2;

    // Keep bubble within canvas bounds with margin
    const margin = 10;
    bubbleX = Math.max(margin, Math.min(bubbleX, canvasWidth - bubbleWidth - margin));

    // If bubble would go above canvas, position it below marker instead
    const positionBelow = bubbleY < margin;
    const finalBubbleY = positionBelow
      ? markerBottom + gapFromMarker  // Position below the marker bottom edge
      : bubbleY;

    // Also check if bubble would go below canvas when positioned below marker
    if (positionBelow && finalBubbleY + bubbleHeight > canvasHeight - margin) {
      // Not enough space above or below - skip drawing to avoid clipping
      return;
    }

    // Text position
    const textX = bubbleX + padding;
    const textY = finalBubbleY + padding;

    // Apply shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 2;

    // Draw speech bubble
    ctx.fillStyle = COLORS.PRIMARY;

    this.drawSpeechBubble(
      ctx,
      bubbleX,
      finalBubbleY,
      bubbleWidth,
      bubbleHeight,
      borderRadius,
      tailSize,
      coordinates,
      markerRadius,
      positionBelow
    );

    // Reset shadow for text
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw text
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, textY + index * lineHeight);
    });
  }

  /**
   * Draw speech bubble with tail pointing to marker edge
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
    markerRadius: number,
    tailAtTop: boolean = false // If true, tail points down; if false, tail points up
  ): void {
    ctx.beginPath();

    // Calculate where tail should connect to bubble and where it should point to
    const tailX = markerCoordinates.x;
    const tailXClamped = Math.max(
      x + borderRadius + tailSize,
      Math.min(tailX, x + width - borderRadius - tailSize)
    );

    // Calculate where tail tip should end (at edge of marker, not center)
    const tailTipY = tailAtTop
      ? markerCoordinates.y + markerRadius  // Point to bottom edge of marker when bubble is below
      : markerCoordinates.y - markerRadius; // Point to top edge of marker when bubble is above

    if (tailAtTop) {
      // Bubble is below marker - tail points UP to bottom edge of marker
      ctx.moveTo(x + borderRadius, y);

      // Top edge up to tail
      ctx.lineTo(tailXClamped - tailSize, y);

      // Draw tail pointing up to bottom edge of marker (not center)
      ctx.lineTo(tailX, tailTipY);
      ctx.lineTo(tailXClamped + tailSize, y);

      // Continue top edge and corners
      ctx.lineTo(x + width - borderRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);

      // Right edge
      ctx.lineTo(x + width, y + height - borderRadius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);

      // Bottom edge
      ctx.lineTo(x + borderRadius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);

      // Left edge
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    } else {
      // Bubble is above marker - tail points DOWN to top edge of marker
      ctx.moveTo(x + borderRadius, y);

      // Top edge and top-right corner
      ctx.lineTo(x + width - borderRadius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius);

      // Right edge and bottom-right corner
      ctx.lineTo(x + width, y + height - borderRadius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius, y + height);

      // Bottom edge up to tail
      ctx.lineTo(tailXClamped + tailSize, y + height);

      // Draw tail pointing down to top edge of marker (not center)
      ctx.lineTo(tailX, tailTipY);
      ctx.lineTo(tailXClamped - tailSize, y + height);

      // Continue bottom edge and bottom-left corner
      ctx.lineTo(x + borderRadius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius);

      // Left edge and top-left corner
      ctx.lineTo(x, y + borderRadius);
      ctx.quadraticCurveTo(x, y, x + borderRadius, y);
    }

    ctx.closePath();
    ctx.fill();
  }

  /**
   * Wrap text to fit within maximum width using actual canvas text measurement
   */
  private wrapText(
    ctx: OffscreenCanvasRenderingContext2D,
    text: string,
    maxWidth: number
  ): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);

      if (metrics.width <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) {
          lines.push(currentLine);
        }
        currentLine = word;

        // Check if single word is too long
        if (ctx.measureText(word).width > maxWidth) {
          // Word is too long, it will overflow but at least it's on its own line
          console.warn('Word too long to fit:', word);
        }
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
