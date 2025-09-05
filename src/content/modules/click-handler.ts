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
}

/**
 * Handler for click events in content script
 */
export class ClickHandler {
  private isActive = false;
  private currentMode: 'snap' | 'annotate' | 'transcribe' = 'snap';
  private config: ClickHandlerConfig;

  constructor(config: ClickHandlerConfig) {
    this.config = config;
    this.setupClickListener();
  }

  /**
   * Activate click handling
   */
  activate(mode: 'snap' | 'annotate' | 'transcribe'): void {
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
  getCurrentMode(): 'snap' | 'annotate' | 'transcribe' {
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
    // Only handle Alt+Click when extension is active
    if (!this.isActive) {
      return;
    }

    // Both snap and annotate modes require Alt+Click
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
    switch (this.currentMode) {
      case EXTENSION_MODES.SNAP:
        this.config.onSnapClick(coordinates);
        break;

      case EXTENSION_MODES.ANNOTATE:
        this.config.onAnnotateClick(coordinates);
        break;

      case EXTENSION_MODES.TRANSCRIBE:
        this.config.onTranscribeClick(coordinates);
        break;

      default:
        contentLogger.warn('Unknown mode:', this.currentMode);
    }

    event.preventDefault();
    event.stopPropagation();
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