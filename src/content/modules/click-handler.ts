/**
 * Click event handling for content script
 */

import { EXTENSION_MODES } from '@/shared/constants/app-constants';
import { clientToViewport } from '@/shared/utils/coordinate-utils';
import { contentLogger } from '@/utils/debug-logger';

export interface ClickHandlerConfig {
  onSnapClick: (coordinates: { x: number; y: number }) => void;
  onAnnotateClick: (coordinates: { x: number; y: number }) => void;
  onTranscribeClick: (coordinates: { x: number; y: number }) => void;
  onJourneyClick: (coordinates: { x: number; y: number }, originalEvent: MouseEvent) => void;
}

/**
 * Handler for click events in content script
 */
export class ClickHandler {
  private isActive = false;
  private currentMode: 'snap' | 'annotate' | 'transcribe' | 'start' = 'snap';
  private config: ClickHandlerConfig;

  constructor(config: ClickHandlerConfig) {
    this.config = config;
    this.setupClickListener();
  }

  /**
   * Activate click handling
   */
  activate(mode: 'snap' | 'annotate' | 'transcribe' | 'start'): void {
    this.isActive = true;
    this.currentMode = mode;
    contentLogger.debug('Click handler activated', { mode });
  }

  /**
   * Deactivate click handling
   */
  deactivate(): void {
    this.isActive = false;
    contentLogger.debug('Click handler deactivated');
  }

  /**
   * Check if click handler is active
   */
  isClickHandlerActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current mode
   */
  getCurrentMode(): 'snap' | 'annotate' | 'transcribe' | 'start' {
    return this.currentMode;
  }

  /**
   * Setup click event listener
   */
  private setupClickListener(): void {
    document.addEventListener('click', this.handleClick.bind(this), true);
    contentLogger.debug('Click listener setup complete');
  }

  /**
   * Handle click events
   */
  private handleClick(event: MouseEvent): void {
    // Only handle clicks when extension is active
    if (!this.isActive) {
      return;
    }

    // Journey mode captures ANY click, other modes require Alt+Click
    if (this.currentMode === EXTENSION_MODES.JOURNEY) {
      // For journey mode, capture screenshot before allowing the original action
      this.handleJourneyClick(event);
      return;
    }

    // Other modes require Alt+Click
    if (!event.altKey) {
      return;
    }

    contentLogger.debug('Alt+Click detected', { 
      mode: this.currentMode,
      clientX: event.clientX,
      clientY: event.clientY 
    });

    // Use viewport coordinates for both dialog and screenshot
    // Chrome's captureVisibleTab captures only the visible viewport
    const coordinates = clientToViewport({
      x: event.clientX,
      y: event.clientY,
    });

    // Handle based on current mode
    try {
      switch (this.currentMode) {
        case EXTENSION_MODES.SNAP:
          if (this.config.onSnapClick) {
            this.config.onSnapClick(coordinates);
          }
          break;

        case EXTENSION_MODES.ANNOTATE:
          if (this.config.onAnnotateClick) {
            this.config.onAnnotateClick(coordinates);
          }
          break;

        case EXTENSION_MODES.TRANSCRIBE:
          if (this.config.onTranscribeClick) {
            this.config.onTranscribeClick(coordinates);
          }
          break;

        default:
          contentLogger.warn('Unknown mode:', this.currentMode);
      }
    } catch (error) {
      contentLogger.error('Error handling click:', error);
    }

    event.preventDefault();
    event.stopPropagation();
  }

  /**
   * Handle journey mode clicks - capture screenshot before allowing original action
   */
  private handleJourneyClick(event: MouseEvent): void {
    // Skip clicks on the extension's own sidebar
    const target = event.target as HTMLElement;
    if (target && target.closest('.snapinsights-sidebar')) {
      return;
    }

    contentLogger.debug('Journey click detected', { 
      clientX: event.clientX,
      clientY: event.clientY,
      target: target?.tagName
    });

    // Prevent the original action temporarily
    event.preventDefault();
    event.stopPropagation();

    // Get coordinates for screenshot
    const coordinates = clientToViewport({
      x: event.clientX,
      y: event.clientY,
    });

    // Call the journey click handler with the original event
    try {
      if (this.config.onJourneyClick) {
        this.config.onJourneyClick(coordinates, event);
      }
    } catch (error) {
      contentLogger.error('Error handling journey click:', error);
      // If there's an error, still allow the original action to proceed
      this.executeOriginalAction(event);
    }
  }

  /**
   * Execute the original click action after screenshot is taken
   */
  public executeOriginalAction(originalEvent: MouseEvent): void {
    const target = originalEvent.target as HTMLElement;
    
    // Re-dispatch the click event to allow the original action
    setTimeout(() => {
      if (target) {
        // Create a new click event that won't be intercepted
        const newEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: originalEvent.clientX,
          clientY: originalEvent.clientY,
          button: originalEvent.button,
          buttons: originalEvent.buttons,
          ctrlKey: originalEvent.ctrlKey,
          shiftKey: originalEvent.shiftKey,
          altKey: originalEvent.altKey,
          metaKey: originalEvent.metaKey
        });

        // Temporarily disable our click handler to avoid infinite loop
        const wasActive = this.isActive;
        this.isActive = false;
        
        target.dispatchEvent(newEvent);
        
        // Re-enable our click handler
        this.isActive = wasActive;
      }
    }, 50); // Small delay to ensure screenshot is processed
  }

  /**
   * Cleanup click handler
   */
  cleanup(): void {
    document.removeEventListener('click', this.handleClick.bind(this), true);
    this.isActive = false;
    contentLogger.debug('Click handler cleanup completed');
  }
}

/**
 * Create click handler with default configuration
 */
export function createClickHandler(config: ClickHandlerConfig): ClickHandler {
  return new ClickHandler(config);
}