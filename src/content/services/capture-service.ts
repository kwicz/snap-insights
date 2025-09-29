/**
 * Screenshot capture service for content script
 */

import { getContentMessageService } from '@/shared/services/message-service';
import { isExtensionContextValid } from '@/shared/utils/context-utils';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '@/shared/constants/app-constants';
import { showSuccessNotification, showErrorNotification } from '../modules/notification-manager';
import { contentLogger } from '@/utils/debug-logger';

export interface CaptureOptions {
  coordinates: { x: number; y: number };
  selectedIcon: 'light' | 'blue' | 'dark';
  annotation?: string;
  transcription?: string;
  mode: 'snap' | 'annotate' | 'transcribe' | 'journey' | 'start';
}

/**
 * Service for handling screenshot capture in content script
 */
export class CaptureService {
  private messageService = getContentMessageService();

  /**
   * Capture simple screenshot
   */
  async captureScreenshot(options: CaptureOptions): Promise<void> {
    try {
      contentLogger.debug('Capturing screenshot', options);

      // Check if extension context is still valid
      if (!isExtensionContextValid()) {
        showErrorNotification(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID);
        return;
      }

      const response = await this.messageService.sendToBackground({
        type: 'CAPTURE_SCREENSHOT',
        data: {
          coordinates: options.coordinates,
          selectedIcon: options.selectedIcon,
        },
      } as any);

      if (!response.success || !response.data?.dataUrl) {
        showErrorNotification(response.error || ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED);
        return;
      }

      // Save screenshot
      await this.saveScreenshot({
        dataUrl: response.data.dataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates: options.coordinates,
        mode: options.mode,
      });

      showSuccessNotification(SUCCESS_MESSAGES.SCREENSHOT_SAVED);
      contentLogger.info('Screenshot captured and saved successfully');

    } catch (error) {
      contentLogger.error('Screenshot capture failed:', error);
      this.handleCaptureError(error);
    }
  }

  /**
   * Capture screenshot with annotation
   */
  async captureAnnotatedScreenshot(options: CaptureOptions): Promise<void> {
    if (!options.annotation) {
      showErrorNotification('No annotation text provided');
      return;
    }

    try {
      contentLogger.debug('Capturing annotated screenshot', options);

      if (!isExtensionContextValid()) {
        showErrorNotification(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID);
        return;
      }

      const response = await this.messageService.sendToBackground({
        type: 'CAPTURE_SCREENSHOT',
        data: {
          coordinates: options.coordinates,
          selectedIcon: options.selectedIcon,
          annotation: options.annotation,
        },
      } as any);

      if (!response.success || !response.data?.dataUrl) {
        showErrorNotification(response.error || ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED);
        return;
      }

      // Save screenshot with annotation
      await this.saveScreenshot({
        dataUrl: response.data.dataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates: options.coordinates,
        mode: options.mode,
        annotation: options.annotation,
      });

      showSuccessNotification(SUCCESS_MESSAGES.ANNOTATED_SCREENSHOT_SAVED);
      contentLogger.info('Annotated screenshot captured and saved successfully');

    } catch (error) {
      contentLogger.error('Annotated screenshot capture failed:', error);
      this.handleCaptureError(error);
    }
  }

  /**
   * Capture screenshot with transcription
   */
  async captureTranscribedScreenshot(options: CaptureOptions): Promise<void> {
    if (!options.transcription) {
      showErrorNotification('No transcription text provided');
      return;
    }

    try {
      contentLogger.debug('Capturing transcribed screenshot', options);

      if (!isExtensionContextValid()) {
        showErrorNotification(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID);
        return;
      }

      const response = await this.messageService.sendToBackground({
        type: 'CAPTURE_SCREENSHOT',
        data: {
          coordinates: options.coordinates,
          selectedIcon: options.selectedIcon,
          transcription: options.transcription,
        },
      } as any);

      if (!response.success || !response.data?.dataUrl) {
        showErrorNotification(response.error || ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED);
        return;
      }

      // Save screenshot with transcription
      await this.saveScreenshot({
        dataUrl: response.data.dataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates: options.coordinates,
        mode: options.mode,
        transcription: options.transcription,
      });

      showSuccessNotification(SUCCESS_MESSAGES.TRANSCRIBED_SCREENSHOT_SAVED);
      contentLogger.info('Transcribed screenshot captured and saved successfully');

    } catch (error) {
      contentLogger.error('Transcribed screenshot capture failed:', error);
      this.handleCaptureError(error);
    }
  }

  /**
   * Capture journey screenshot (for user interaction tracking)
   */
  async captureJourneyScreenshot(options: CaptureOptions, onComplete?: () => void): Promise<void> {
    try {
      contentLogger.debug('Capturing journey screenshot', options);

      // Check extension context and handle gracefully for journey mode
      if (!isExtensionContextValid()) {
        contentLogger.debug('Extension context invalid for journey screenshot, proceeding with original action');
        // For journey mode, prioritize user experience - allow original action to proceed
        if (onComplete) onComplete();
        return;
      }

      // Use shorter timeout and include mode for journey screenshots
      const response = await this.messageService.sendToBackground({
        type: 'CAPTURE_SCREENSHOT',
        data: {
          coordinates: options.coordinates,
          selectedIcon: options.selectedIcon,
          mode: 'journey',
        },
      } as any, { timeout: 2000, retries: 1 });

      if (!response.success || !response.data?.dataUrl) {
        // For journey mode, don't show error notifications to avoid interrupting flow
        // Suppress rate limiting errors to keep Extensions errors clean
        if (response.error?.includes('wait a moment before taking another screenshot')) {
          contentLogger.info('Journey screenshot rate limited');
        } else {
          contentLogger.error('Journey screenshot failed:', response.error);
        }
        if (onComplete) onComplete();
        return;
      }

      // Save screenshot with journey metadata
      await this.saveScreenshot({
        dataUrl: response.data.dataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates: options.coordinates,
        mode: 'journey',
        annotation: `User interaction at ${new Date().toLocaleTimeString()}`,
      });

      // Don't show notification for journey mode to avoid interrupting user flow
      contentLogger.info('Journey screenshot captured and saved successfully');
      
      // Call completion callback to allow original action to proceed
      if (onComplete) {
        onComplete();
      }

    } catch (error) {
      contentLogger.error('Journey screenshot capture failed:', error);
      // Still call completion callback even if capture fails
      if (onComplete) {
        onComplete();
      }
      // Don't show error notification to avoid interrupting user flow
    }
  }

  /**
   * Save screenshot data
   */
  private async saveScreenshot(data: {
    dataUrl: string;
    url: string;
    timestamp: number;
    coordinates: { x: number; y: number };
    mode: string;
    annotation?: string;
    transcription?: string;
  }): Promise<void> {
    if (!isExtensionContextValid()) {
      showErrorNotification(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID);
      return;
    }

    const response = await this.messageService.sendToBackground({
      type: 'SAVE_SCREENSHOT',
      data,
    } as any);

    if (!response.success) {
      throw new Error(response.error || 'Failed to save screenshot');
    }
  }

  /**
   * Handle capture errors
   */
  private handleCaptureError(error: any): void {
    // Check if this is a context invalidation error
    if (
      error instanceof Error &&
      (error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes('The message port closed before a response was received'))
    ) {
      showErrorNotification(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID);
    } else {
      showErrorNotification(ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED);
    }
  }

  /**
   * Test connection to background script
   */
  async testConnection(): Promise<boolean> {
    try {
      return await this.messageService.testConnection();
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const captureService = new CaptureService();