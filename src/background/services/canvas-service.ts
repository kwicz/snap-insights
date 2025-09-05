/**
 * Canvas service for drawing markers and text on screenshots
 */

import { fontService } from './font-service';
import { COLORS, ICON_SIZES } from '@/shared/constants/ui-constants';
import { isExtensionContextValid } from '@/shared/utils/context-utils';
import { backgroundLogger } from '@/utils/debug-logger';

export interface TextBoxConfig {
  text: string;
  coordinates: { x: number; y: number };
  markerSize: number;
  type: 'annotation' | 'transcription';
}

export interface MarkerConfig {
  coordinates: { x: number; y: number };
  selectedIcon: 'light' | 'blue' | 'dark';
  annotation?: string;
  transcription?: string;
}

/**
 * Service for canvas operations in background script
 */
export class CanvasService {
  /**
   * Draw marker and optional text on screenshot
   */
  async drawMarkerOnScreenshot(
    dataUrl: string,
    config: MarkerConfig
  ): Promise<string> {
    try {
      backgroundLogger.debug('Drawing marker on screenshot', config);

      // Convert data URL to ImageBitmap
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const imageBitmap = await createImageBitmap(blob);

      // Create canvas
      const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
      const ctx = canvas.getContext('2d')!;

      // Draw the screenshot
      ctx.drawImage(imageBitmap, 0, 0);

      // Draw touchpoint icon
      await this.drawTouchpointIcon(ctx, config.coordinates, config.selectedIcon);

      // Draw text if provided
      if (config.transcription) {
        this.drawTextBox(ctx, {
          text: config.transcription,
          coordinates: config.coordinates,
          markerSize: ICON_SIZES.TOUCHPOINT,
          type: 'transcription',
        });
      } else if (config.annotation) {
        this.drawTextBox(ctx, {
          text: config.annotation,
          coordinates: config.coordinates,
          markerSize: ICON_SIZES.TOUCHPOINT,
          type: 'annotation',
        });
      }

      // Convert to data URL
      const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
      return this.blobToDataUrl(resultBlob);

    } catch (error) {
      backgroundLogger.error('Failed to draw marker on screenshot:', error);
      // Return original screenshot if marker drawing fails
      return dataUrl;
    }
  }

  /**
   * Draw touchpoint icon at specified coordinates
   */
  private async drawTouchpointIcon(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    selectedIcon: 'light' | 'blue' | 'dark'
  ): Promise<void> {
    try {
      if (!isExtensionContextValid()) {
        throw new Error('Extension context invalid');
      }

      const iconUrl = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
      const iconResponse = await fetch(iconUrl);
      const iconBlob = await iconResponse.blob();
      const iconBitmap = await createImageBitmap(iconBlob);

      const iconSize = ICON_SIZES.TOUCHPOINT;
      const drawX = coordinates.x - iconSize / 2;
      const drawY = coordinates.y - iconSize / 2;

      ctx.drawImage(iconBitmap, drawX, drawY, iconSize, iconSize);

    } catch (error) {
      backgroundLogger.warn('Failed to load touchpoint icon, using fallback:', error);
      this.drawFallbackMarker(ctx, coordinates, selectedIcon);
    }
  }

  /**
   * Draw fallback marker when icon loading fails
   */
  private drawFallbackMarker(
    ctx: OffscreenCanvasRenderingContext2D,
    coordinates: { x: number; y: number },
    selectedIcon: 'light' | 'blue' | 'dark'
  ): void {
    const size = ICON_SIZES.MARKER_FALLBACK;
    
    ctx.beginPath();
    ctx.arc(coordinates.x, coordinates.y, size / 2, 0, 2 * Math.PI);
    
    // Set color based on icon type
    ctx.fillStyle = selectedIcon === 'blue' ? COLORS.ICON_BLUE :
                   selectedIcon === 'dark' ? COLORS.ICON_DARK : COLORS.ICON_LIGHT;
    ctx.globalAlpha = 0.8;
    ctx.fill();

    // Add white border for visibility
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 1;
    ctx.stroke();

    // Add inner border for better contrast
    ctx.beginPath();
    ctx.arc(coordinates.x, coordinates.y, size / 2, 0, 2 * Math.PI);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  /**
   * Draw text box next to marker
   */
  private drawTextBox(ctx: OffscreenCanvasRenderingContext2D, config: TextBoxConfig): void {
    // Ensure font is loaded
    fontService.loadFont();

    // Set text properties
    ctx.font = fontService.getFontFamily(14, '400');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Position to the right of the marker
    const textX = config.coordinates.x + config.markerSize / 2 + 10;
    const textY = config.coordinates.y - config.markerSize / 2;

    // Configure styling based on type
    const styleConfig = this.getTextBoxStyle(config.type);
    const lines = this.wrapText(config.text, styleConfig.maxWidth);
    const lineHeight = 18;
    const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const textHeight = lines.length * lineHeight;

    // Draw background rectangle
    ctx.fillStyle = styleConfig.backgroundColor;
    ctx.beginPath();
    ctx.roundRect(
      textX - styleConfig.padding,
      textY - styleConfig.padding,
      textWidth + styleConfig.padding * 2,
      textHeight + styleConfig.padding * 2,
      12
    );
    ctx.fill();

    // Draw border
    ctx.strokeStyle = styleConfig.borderColor;
    ctx.lineWidth = styleConfig.borderWidth;
    ctx.stroke();

    // Add label if specified (for transcriptions)
    if (styleConfig.label) {
      ctx.fillStyle = '#ffffff';
      ctx.font = fontService.getFontFamily(12, '400');
      ctx.fillText(styleConfig.label, textX, textY - styleConfig.padding - 18);
    }

    // Draw text
    ctx.font = fontService.getFontFamily(14, '400');
    ctx.fillStyle = '#ffffff';
    lines.forEach((line, index) => {
      ctx.fillText(line, textX, textY + index * lineHeight);
    });
  }

  /**
   * Get text box styling configuration
   */
  private getTextBoxStyle(type: 'annotation' | 'transcription') {
    return {
      annotation: {
        maxWidth: 200,
        padding: 8,
        backgroundColor: COLORS.ANNOTATION_BG,
        borderColor: COLORS.ANNOTATION_BORDER,
        borderWidth: 1,
        label: null,
      },
      transcription: {
        maxWidth: 250,
        padding: 12,
        backgroundColor: COLORS.TRANSCRIPTION_BG,
        borderColor: COLORS.TRANSCRIPTION_BORDER,
        borderWidth: 2,
        label: 'TRANSCRIPTION',
      },
    }[type];
  }

  /**
   * Wrap text to fit within max width
   */
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      // Rough character width estimation
      if (testLine.length * 8 > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  /**
   * Convert blob to data URL
   */
  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
}

// Singleton instance
export const canvasService = new CanvasService();