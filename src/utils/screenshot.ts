import { ScreenshotData, MarkerColorSettings } from '@/types';

// Default marker settings
const DEFAULT_MARKER_SETTINGS: MarkerColorSettings = {
  color: '#00ff00',
  opacity: 1,
  size: 12,
  style: 'solid',
};

export interface ScreenshotOptions {
  format?: 'png' | 'jpeg';
  quality?: number;
  markerColor?: MarkerColorSettings | string;
  includeMarker?: boolean;
  markerSize?: number;
}

export interface ProcessedScreenshot {
  originalDataUrl: string;
  processedDataUrl: string;
  metadata: ScreenshotMetadata;
}

export interface ScreenshotMetadata {
  url: string;
  timestamp: number;
  coordinates: { x: number; y: number };
  annotation?: string;
  voiceNote?: string;
  dimensions: { width: number; height: number };
  devicePixelRatio: number;
  userAgent: string;
}

/**
 * Screenshot capture and processing utility
 */
export class ScreenshotProcessor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  private imageCache: Map<string, HTMLImageElement> = new Map();

  constructor() {
    // Initialize main canvas
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', {
      alpha: false, // Optimize for non-transparent images
      willReadFrequently: false, // Optimize for write-only operations
    });
    if (!ctx) throw new Error('Failed to get 2D context from canvas');
    this.ctx = ctx;

    // Initialize offscreen canvas if supported
    if (typeof OffscreenCanvas !== 'undefined') {
      this.offscreenCanvas = new OffscreenCanvas(1, 1);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
        alpha: false,
        willReadFrequently: false,
      }) as OffscreenCanvasRenderingContext2D;
    }

    // Enable image smoothing only when needed
    this.ctx.imageSmoothingEnabled = false;
    if (this.offscreenCtx) {
      this.offscreenCtx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Process a screenshot by adding marker overlay and metadata
   */
  async processScreenshot(
    dataUrl: string,
    coordinates: { x: number; y: number },
    options: ScreenshotOptions = {}
  ): Promise<ProcessedScreenshot> {
    const {
      format = 'png',
      quality = 85,
      includeMarker = true,
      markerColor = DEFAULT_MARKER_SETTINGS,
      markerSize = 12,
    } = options;

    const markerSettings: MarkerColorSettings =
      typeof markerColor === 'string'
        ? { ...DEFAULT_MARKER_SETTINGS, color: markerColor }
        : { ...DEFAULT_MARKER_SETTINGS, ...markerColor };

    try {
      // Load and process image in parallel with other operations
      const [img, dimensions] = await Promise.all([
        this.loadImage(dataUrl),
        ScreenshotUtils.getImageDimensions(dataUrl),
      ]);

      // Pre-allocate canvas size
      this.canvas.width = dimensions.width;
      this.canvas.height = dimensions.height;

      // Use offscreen canvas for marker if available
      if (includeMarker && this.offscreenCanvas && this.offscreenCtx) {
        // Draw original image to main canvas
        this.ctx.drawImage(img, 0, 0);

        // Draw marker to offscreen canvas
        this.offscreenCanvas.width = markerSize * 2;
        this.offscreenCanvas.height = markerSize * 2;
        this.drawMarker(
          { x: markerSize, y: markerSize },
          markerSettings,
          markerSize,
          this.offscreenCtx
        );

        // Composite marker onto main canvas
        this.ctx.drawImage(
          this.offscreenCanvas,
          coordinates.x - markerSize,
          coordinates.y - markerSize
        );
      } else {
        // Fallback to direct drawing
        this.ctx.drawImage(img, 0, 0);
        if (includeMarker) {
          this.drawMarker(coordinates, markerSettings, markerSize, this.ctx);
        }
      }

      // Create metadata while canvas is being processed
      const metadata = this.createMetadata(coordinates, img);

      // Convert to output format
      const processedDataUrl = await this.optimizedToDataURL(format, quality);

      // Clear canvas for next use
      this.clear();

      return {
        originalDataUrl: dataUrl,
        processedDataUrl,
        metadata,
      };
    } catch (error) {
      this.clear();
      console.error('Failed to process screenshot:', error);
      throw error;
    }
  }

  /**
   * Optimized image loading with caching
   */
  private async loadImage(dataUrl: string): Promise<HTMLImageElement> {
    // Check cache first
    const cached = this.imageCache.get(dataUrl);
    if (cached) return cached;

    // Load new image
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Cache image for potential reuse
        if (this.imageCache.size > 10) {
          // Limit cache size
          // Limit cache size
          const firstKey = this.imageCache.keys().next().value;
          if (typeof firstKey === 'string') {
            this.imageCache.delete(firstKey);
          }
        }
        this.imageCache.set(dataUrl, img);
        resolve(img);
      };
      img.src = dataUrl;
    });
  }

  /**
   * Optimized marker drawing
   */
  private drawMarker(
    coordinates: { x: number; y: number },
    markerSettings: MarkerColorSettings,
    size?: number,
    context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D = this
      .ctx
  ): void {
    const markerSize = size || markerSettings.size;
    const x = coordinates.x;
    const y = coordinates.y;

    // Save only necessary state
    const previousGlobalAlpha = context.globalAlpha;
    const previousStrokeStyle = context.strokeStyle;
    const previousFillStyle = context.fillStyle;
    const previousLineWidth = context.lineWidth;

    // Set marker styles
    context.globalAlpha = markerSettings.opacity;
    context.strokeStyle = markerSettings.color;
    context.fillStyle = markerSettings.color;
    context.lineWidth = 2;

    // Draw marker based on style
    context.beginPath();
    switch (markerSettings.style) {
      case 'solid':
        context.arc(x, y, markerSize / 2, 0, Math.PI * 2);
        context.fill();
        break;

      case 'dashed':
      case 'dotted':
        context.arc(x, y, markerSize / 2, 0, Math.PI * 2);
        context.setLineDash(
          markerSettings.style === 'dashed' ? [4, 2] : [2, 2]
        );
        context.stroke();
        break;
    }

    // Add white border
    context.globalAlpha = 1;
    context.strokeStyle = 'white';
    context.lineWidth = 2;
    context.setLineDash([]);
    context.stroke();

    // Restore only changed state
    context.globalAlpha = previousGlobalAlpha;
    context.strokeStyle = previousStrokeStyle;
    context.fillStyle = previousFillStyle;
    context.lineWidth = previousLineWidth;
  }

  /**
   * Optimized canvas to data URL conversion
   */
  private async optimizedToDataURL(
    format: string,
    quality: number
  ): Promise<string> {
    // Use blob conversion for better performance
    return new Promise((resolve, reject) => {
      try {
        this.canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob'));
              return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
              if (reader.result) {
                resolve(reader.result as string);
              } else {
                reject(new Error('Failed to read blob'));
              }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(blob);
          },
          format === 'jpeg' ? 'image/jpeg' : 'image/png',
          quality / 100
        );
      } catch (error) {
        // Fallback to synchronous conversion
        resolve(
          this.canvas.toDataURL(
            format === 'jpeg' ? 'image/jpeg' : 'image/png',
            quality / 100
          )
        );
      }
    });
  }

  /**
   * Create metadata object
   */
  private createMetadata(
    coordinates: { x: number; y: number },
    img: HTMLImageElement
  ): ScreenshotMetadata {
    return {
      url: window.location.href,
      timestamp: Date.now(),
      coordinates,
      dimensions: {
        width: img.width,
        height: img.height,
      },
      devicePixelRatio: window.devicePixelRatio || 1,
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Add annotation text to screenshot
   */
  addAnnotation(
    text: string,
    position: { x: number; y: number },
    options: {
      fontSize?: number;
      fontFamily?: string;
      color?: string;
      backgroundColor?: string;
      padding?: number;
      maxWidth?: number;
    } = {}
  ): void {
    const {
      fontSize = 14,
      fontFamily = 'Arial, sans-serif',
      color = '#000000',
      backgroundColor = 'rgba(255, 255, 255, 0.9)',
      padding = 8,
      maxWidth = 300,
    } = options;

    this.ctx.save();

    // Set font
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';

    // Wrap text if needed
    const lines = this.wrapText(text, maxWidth, fontSize);
    const lineHeight = fontSize * 1.2;
    const textHeight = lines.length * lineHeight;
    const textWidth = Math.max(
      ...lines.map((line) => this.ctx.measureText(line).width)
    );

    // Calculate background dimensions
    const bgWidth = textWidth + padding * 2;
    const bgHeight = textHeight + padding * 2;

    // Adjust position to keep annotation within canvas
    let { x, y } = position;
    if (x + bgWidth > this.canvas.width) {
      x = this.canvas.width - bgWidth;
    }
    if (y + bgHeight > this.canvas.height) {
      y = this.canvas.height - bgHeight;
    }

    // Draw background
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(x, y, bgWidth, bgHeight);

    // Draw border
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, bgWidth, bgHeight);

    // Draw text
    this.ctx.fillStyle = color;
    lines.forEach((line, index) => {
      this.ctx.fillText(line, x + padding, y + padding + index * lineHeight);
    });

    this.ctx.restore();
  }

  /**
   * Wrap text to fit within specified width
   */
  private wrapText(text: string, maxWidth: number, fontSize: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    this.ctx.font = `${fontSize}px Arial, sans-serif`;

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = this.ctx.measureText(testLine);

      if (metrics.width > maxWidth && currentLine) {
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
   * Clear canvas efficiently
   */
  clear(): void {
    // Reset canvas dimensions to clear content
    this.canvas.width = 1;
    this.canvas.height = 1;

    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = 1;
      this.offscreenCanvas.height = 1;
    }
  }

  /**
   * Dispose of resources
   */
  dispose(): void {
    this.clear();
    this.imageCache.clear();
    if (this.offscreenCanvas) {
      // @ts-ignore: close() is experimental
      this.offscreenCanvas.close?.();
      this.offscreenCanvas = null;
      this.offscreenCtx = null;
    }
  }
}

/**
 * Utility functions for screenshot operations
 */
export const ScreenshotUtils = {
  /**
   * Validate screenshot data URL
   */
  isValidDataUrl(dataUrl: string): boolean {
    return /^data:image\/(png|jpeg|jpg);base64,/.test(dataUrl);
  },

  /**
   * Get image dimensions from data URL
   */
  async getImageDimensions(
    dataUrl: string
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  },

  /**
   * Convert data URL to blob
   */
  dataUrlToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  },

  /**
   * Calculate file size from data URL
   */
  getDataUrlSize(dataUrl: string): number {
    const base64 = dataUrl.split(',')[1];
    return Math.round((base64.length * 3) / 4);
  },

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * Generate filename for screenshot
   */
  generateFilename(url: string, timestamp: number, format = 'png'): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-'); // HH-mm-ss
    const domain = new URL(url).hostname.replace(/[^a-zA-Z0-9]/g, '-');

    return `ux-screenshot_${dateStr}_${timeStr}_${domain}.${format}`;
  },
};

// Export singleton instance
export const screenshotProcessor = new ScreenshotProcessor();
