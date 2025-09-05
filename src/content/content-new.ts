/**
 * Refactored content script entry point
 * Modular, maintainable architecture with clear separation of concerns
 */

import { createClickHandler } from './modules/click-handler';
import { notificationManager } from './modules/notification-manager';
import { uiService } from './services/ui-service';
import { captureService } from './services/capture-service';
import { getContentMessageService } from '@/shared/services/message-service';
import { isExtensionContextValid } from '@/shared/utils/context-utils';
import { contentLogger } from '@/utils/debug-logger';

/**
 * Main content script class
 */
class ContentScript {
  private isActive = false;
  private currentMode: 'snap' | 'annotate' | 'transcribe' = 'snap';
  private selectedIcon: 'light' | 'blue' | 'dark' = 'blue';
  private clickHandler!: ReturnType<typeof createClickHandler>;
  private messageService = getContentMessageService();

  /**
   * Initialize the content script
   */
  initialize(): void {
    try {
      contentLogger.info('Initializing content script...');

      // Initialize UI services
      this.initializeUI();

      // Setup click handling
      this.setupClickHandler();

      // Setup message handling
      this.setupMessageHandling();

      contentLogger.info('Content script initialized successfully');

    } catch (error) {
      contentLogger.error('Failed to initialize content script:', error);
    }
  }

  /**
   * Initialize UI services
   */
  private initializeUI(): void {
    // Inject CSS animations
    uiService.injectAnimations();
    
    contentLogger.debug('UI services initialized');
  }

  /**
   * Setup click handling
   */
  private setupClickHandler(): void {
    this.clickHandler = createClickHandler({
      onSnapClick: (coordinates) => {
        uiService.showClickFeedback(coordinates, this.selectedIcon);
        this.handleSnapCapture(coordinates);
      },
      onAnnotateClick: (coordinates) => {
        uiService.showClickFeedback(coordinates, this.selectedIcon);
        this.handleAnnotateCapture(coordinates);
      },
      onTranscribeClick: (coordinates) => {
        uiService.showClickFeedback(coordinates, this.selectedIcon);
        this.handleTranscribeCapture(coordinates);
      },
    });

    contentLogger.debug('Click handler setup complete');
  }

  /**
   * Setup message handling
   */
  private setupMessageHandling(): void {
    // Register message handlers
    this.messageService.registerHandler('PING' as any, (message, sender, sendResponse) => {
      sendResponse({ success: true, message: 'Content script is alive!' });
    });

    this.messageService.registerHandler('ACTIVATE_CAPTURE_MODE', (message, sender, sendResponse) => {
      this.handleActivation((message as any).data);
      sendResponse({ success: true });
    });

    this.messageService.registerHandler('DEACTIVATE_CAPTURE_MODE', (message, sender, sendResponse) => {
      this.handleDeactivation();
      sendResponse({ success: true });
    });

    contentLogger.debug('Message handling setup complete');
  }

  /**
   * Handle extension activation
   */
  private handleActivation(data: { mode: 'snap' | 'annotate' | 'transcribe'; selectedIcon: 'light' | 'blue' | 'dark' }): void {
    this.isActive = true;
    this.currentMode = data.mode || 'snap';
    this.selectedIcon = data.selectedIcon || 'blue';

    // Load the font when extension activates
    uiService.loadFont();

    // Activate click handler
    this.clickHandler.activate(this.currentMode);

    contentLogger.info('Extension activated', { mode: this.currentMode, icon: this.selectedIcon });
  }

  /**
   * Handle extension deactivation
   */
  private handleDeactivation(): void {
    this.isActive = false;
    
    // Deactivate click handler
    this.clickHandler.deactivate();

    // Dismiss any active notifications
    notificationManager.dismissAll();

    contentLogger.info('Extension deactivated');
  }

  /**
   * Handle snap capture
   */
  private async handleSnapCapture(coordinates: { x: number; y: number }): Promise<void> {
    await captureService.captureScreenshot({
      coordinates,
      selectedIcon: this.selectedIcon,
      mode: this.currentMode,
    });
  }

  /**
   * Handle annotate capture
   */
  private handleAnnotateCapture(coordinates: { x: number; y: number }): void {
    // TODO: Show annotation dialog
    // This will be implemented in the next iteration with dialog modules
    contentLogger.debug('Annotation capture requested', coordinates);
    notificationManager.showInfo('Annotation dialog will be implemented in next iteration');
  }

  /**
   * Handle transcribe capture
   */
  private handleTranscribeCapture(coordinates: { x: number; y: number }): void {
    // TODO: Show transcription dialog
    // This will be implemented in the next iteration with dialog modules
    contentLogger.debug('Transcription capture requested', coordinates);
    notificationManager.showInfo('Transcription dialog will be implemented in next iteration');
  }

  /**
   * Check if extension context is valid before processing
   */
  private validateContext(): boolean {
    if (!isExtensionContextValid()) {
      notificationManager.showError('Extension context invalidated. Please refresh the page.');
      this.isActive = false;
      return false;
    }
    return true;
  }

  /**
   * Get current state
   */
  getState(): { isActive: boolean; mode: string; icon: string } {
    return {
      isActive: this.isActive,
      mode: this.currentMode,
      icon: this.selectedIcon,
    };
  }

  /**
   * Cleanup content script
   */
  cleanup(): void {
    try {
      // Cleanup click handler
      this.clickHandler?.cleanup();

      // Cleanup UI services
      uiService.cleanup();

      // Cleanup notifications
      notificationManager.cleanup();

      this.isActive = false;
      
      contentLogger.info('Content script cleanup completed');

    } catch (error) {
      contentLogger.error('Content script cleanup failed:', error);
    }
  }
}

// Initialize content script
const contentScript = new ContentScript();
contentScript.initialize();

// Handle page unload
window.addEventListener('beforeunload', () => {
  contentScript.cleanup();
});

// Export for testing and external access
if (typeof window !== 'undefined') {
  (window as any).insightClipContent = {
    getState: () => contentScript.getState(),
    cleanup: () => contentScript.cleanup(),
  };
}

// Export for testing (browser environment only)
declare const module: any;
if (typeof module !== 'undefined' && module?.exports) {
  module.exports = { contentScript };
}