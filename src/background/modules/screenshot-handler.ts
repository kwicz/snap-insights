/**
 * Screenshot capture and processing handler for background script
 */

import { canvasService } from '../services/canvas-service';
import { fontService } from '../services/font-service';
import { MIN_CAPTURE_INTERVAL, ERROR_MESSAGES } from '@/shared/constants/app-constants';
import { isValidTabUrl } from '@/shared/utils/context-utils';
import { backgroundLogger } from '@/utils/debug-logger';
import { ExtensionError } from '@/types';

export interface CaptureData {
  coordinates: { x: number; y: number };
  annotation?: string;
  transcription?: string;
  selectedIcon?: 'light' | 'blue' | 'dark';
  mode?: string;
}

export interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

/**
 * Handler for screenshot capture operations
 */
export class ScreenshotHandler {
  private lastCaptureTime = 0;

  /**
   * Handle screenshot capture request
   */
  async handleScreenshotCapture(
    captureData: CaptureData,
    tabId?: number
  ): Promise<CaptureResult> {
    try {
      backgroundLogger.debug('Handling screenshot capture', { captureData, tabId });

      // Rate limiting check
      if (!this.checkRateLimit()) {
        return {
          success: false,
          error: ERROR_MESSAGES.RATE_LIMIT_ERROR,
        };
      }

      // Get active tab if not provided
      const tab = await this.getTargetTab(tabId);
      if (!tab || !tab.id) {
        return { 
          success: false, 
          error: ERROR_MESSAGES.NO_ACTIVE_TAB 
        };
      }

      // Validate tab URL
      if (!isValidTabUrl(tab.url)) {
        return {
          success: false,
          error: ERROR_MESSAGES.SYSTEM_PAGE_ERROR,
        };
      }

      // Ensure font is loaded before capture
      await fontService.loadFont();

      // Capture the visible tab
      const dataUrl = await this.captureTab(tab);

      // Add marker to screenshot if coordinates are provided
      if (captureData.coordinates && dataUrl) {
        const markedDataUrl = await canvasService.drawMarkerOnScreenshot(dataUrl, {
          coordinates: captureData.coordinates,
          selectedIcon: captureData.selectedIcon || 'blue',
          annotation: captureData.annotation,
          transcription: captureData.transcription,
        });
        
        backgroundLogger.info('Screenshot captured and processed successfully');
        return { success: true, dataUrl: markedDataUrl };
      }

      backgroundLogger.info('Screenshot captured successfully');
      return { success: true, dataUrl };

    } catch (error) {
      backgroundLogger.error('Screenshot capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED,
      };
    }
  }

  /**
   * Save screenshot to downloads
   */
  async saveScreenshot(screenshotData: {
    dataUrl: string;
    url: string;
    timestamp: number;
    coordinates?: { x: number; y: number };
    mode?: string;
    annotation?: string;
    transcription?: string;
  }): Promise<{ downloadId: number }> {
    try {
      backgroundLogger.debug('Saving screenshot', { 
        url: screenshotData.url, 
        timestamp: screenshotData.timestamp 
      });

      const filename = this.generateFilename(screenshotData);

      const downloadId = await chrome.downloads.download({
        url: screenshotData.dataUrl,
        filename,
        saveAs: false,
      });

      backgroundLogger.info('Screenshot saved successfully', { downloadId, filename });
      return { downloadId };

    } catch (error) {
      backgroundLogger.error('Failed to save screenshot:', error);
      throw new ExtensionError(
        'Failed to save screenshot',
        'storage',
        'save_error',
        { originalError: error }
      );
    }
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    if (now - this.lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      return false;
    }
    this.lastCaptureTime = now;
    return true;
  }

  /**
   * Get target tab for capture
   */
  private async getTargetTab(tabId?: number): Promise<chrome.tabs.Tab | null> {
    try {
      if (tabId) {
        return await chrome.tabs.get(tabId);
      }
      
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      return tabs[0] || null;
    } catch (error) {
      backgroundLogger.error('Failed to get target tab:', error);
      return null;
    }
  }

  /**
   * Capture visible tab
   */
  private async captureTab(tab: chrome.tabs.Tab): Promise<string> {
    if (!tab.windowId) {
      throw new Error('Tab has no window ID');
    }

    return await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });
  }

  /**
   * Generate filename for screenshot
   */
  private generateFilename(screenshotData: {
    url: string;
    timestamp: number;
    mode?: string;
    annotation?: string;
    transcription?: string;
  }): string {
    try {
      const url = new URL(screenshotData.url);
      const timestamp = new Date(screenshotData.timestamp)
        .toISOString()
        .replace(/[:.]/g, '-');
      
      let suffix = '';
      if (screenshotData.annotation) {
        suffix = '_annotated';
      } else if (screenshotData.transcription) {
        suffix = '_transcribed';
      }
      
      return `insight-clip_${url.hostname}_${timestamp}${suffix}.png`;
    } catch (error) {
      // Fallback filename if URL parsing fails
      const timestamp = new Date(screenshotData.timestamp)
        .toISOString()
        .replace(/[:.]/g, '-');
      return `insight-clip_screenshot_${timestamp}.png`;
    }
  }

  /**
   * Reset rate limiting (for testing)
   */
  resetRateLimit(): void {
    this.lastCaptureTime = 0;
  }
}

// Singleton instance
export const screenshotHandler = new ScreenshotHandler();