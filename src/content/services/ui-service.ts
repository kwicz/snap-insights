/**
 * UI service for content script operations
 */

import {
  GOOGLE_FONTS_URL,
  CSS_CLASSES,
  ICON_SIZES,
  COLORS,
  TYPOGRAPHY,
} from '@/shared/constants/ui-constants';
import { isExtensionContextValid } from '@/shared/utils/context-utils';
import { contentLogger } from '@/utils/debug-logger';

/**
 * Service for UI operations in content script
 */
export class UIService {
  private fontLoaded = false;

  /**
   * Load League Spartan font
   */
  loadFont(): void {
    if (this.fontLoaded) {
      return;
    }

    // Check if font is already loaded
    if (document.querySelector(`#${CSS_CLASSES.FONT_LOADER}`)) {
      this.fontLoaded = true;
      return;
    }

    try {
      // Create and inject Google Fonts link
      const fontLink = document.createElement('link');
      fontLink.id = CSS_CLASSES.FONT_LOADER;
      fontLink.href = GOOGLE_FONTS_URL;
      fontLink.rel = 'stylesheet';
      fontLink.type = 'text/css';

      document.head.appendChild(fontLink);
      this.fontLoaded = true;

      contentLogger.debug('League Spartan font loaded');
    } catch (error) {
      contentLogger.warn('Failed to load League Spartan font:', error);
    }
  }

  /**
   * Show visual feedback at click location
   */
  showClickFeedback(
    coordinates: { x: number; y: number },
    selectedIcon: 'light' | 'blue' | 'dark' = 'blue'
  ): void {
    const marker = document.createElement('div');
    marker.style.cssText = `
      position: fixed;
      left: ${coordinates.x - 32}px;
      top: ${coordinates.y - 32}px;
      width: ${ICON_SIZES.TOUCHPOINT}px;
      height: ${ICON_SIZES.TOUCHPOINT}px;
      z-index: 999999;
      pointer-events: none;
      animation: pulse 0.6s ease-out;
    `;

    // Add touchpoint icon
    const iconImg = document.createElement('img');

    // Check if extension context is valid before getting URL
    if (isExtensionContextValid()) {
      iconImg.src = chrome.runtime.getURL(
        `assets/icons/touchpoint-${selectedIcon}.png`
      );
    } else {
      // Fallback: create a simple colored circle if extension context is invalid
      iconImg.src = this.createFallbackIcon(selectedIcon);
    }

    iconImg.style.cssText = `width: ${ICON_SIZES.TOUCHPOINT}px; height: ${ICON_SIZES.TOUCHPOINT}px; display: block;`;
    marker.appendChild(iconImg);

    document.body.appendChild(marker);

    // Remove after animation
    setTimeout(() => {
      if (marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }, 600);

    contentLogger.debug('Click feedback shown', { coordinates, selectedIcon });
  }

  /**
   * Create fallback icon when extension context is invalid
   */
  private createFallbackIcon(selectedIcon: 'light' | 'blue' | 'dark'): string {
    const canvas = document.createElement('canvas');
    canvas.width = ICON_SIZES.TOUCHPOINT;
    canvas.height = ICON_SIZES.TOUCHPOINT;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.beginPath();
      ctx.arc(32, 32, 24, 0, 2 * Math.PI);

      // Use proper colors for each icon type
      let fillColor: string = COLORS.ICON_BLUE; // default blue
      if (selectedIcon === 'light') {
        fillColor = COLORS.ICON_LIGHT;
      } else if (selectedIcon === 'dark') {
        fillColor = COLORS.ICON_DARK;
      }

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = selectedIcon === 'light' ? '#64748b' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    return canvas.toDataURL();
  }

  /**
   * Create recording indicator component
   */
  createRecordingIndicator(): HTMLElement {
    const recordingIndicator = document.createElement('div');
    recordingIndicator.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;

    const recordingDot = document.createElement('div');
    recordingDot.style.cssText = `
      width: 12px;
      height: 12px;
      background: ${COLORS.ERROR};
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
    `;

    const recordingText = document.createElement('span');
    recordingText.textContent = 'Recording...';
    recordingText.style.cssText = `
      font-size: 12px;
      color: ${COLORS.ERROR};
      font-weight: 500;
    `;

    recordingIndicator.appendChild(recordingDot);
    recordingIndicator.appendChild(recordingText);

    return recordingIndicator;
  }

  /**
   * Create journey progress indicator component
   */
  createJourneyProgressIndicator(screenshotCount: number = 0): HTMLElement {
    const journeyIndicator = document.createElement('div');
    journeyIndicator.id = 'snapinsights-journey-indicator';
    journeyIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: ${TYPOGRAPHY.FONT_FAMILY};
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      animation: slideIn 0.3s ease-out;
    `;

    const journeyIcon = document.createElement('div');
    journeyIcon.style.cssText = `
      width: 12px;
      height: 12px;
      background: #3b82f6;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    `;

    const journeyText = document.createElement('span');
    journeyText.textContent = `Journey Mode: ${screenshotCount} screenshots`;
    journeyText.style.cssText = `
      font-size: 14px;
      color: white;
      font-weight: 500;
    `;

    journeyIndicator.appendChild(journeyIcon);
    journeyIndicator.appendChild(journeyText);

    return journeyIndicator;
  }

  /**
   * Update journey progress indicator
   */
  updateJourneyProgressIndicator(screenshotCount: number): void {
    const indicator = document.getElementById('snapinsights-journey-indicator');
    if (indicator) {
      const textElement = indicator.querySelector('span');
      if (textElement) {
        textElement.textContent = `Journey Mode: ${screenshotCount} screenshots`;
      }
    }
  }

  /**
   * Show journey progress indicator
   */
  showJourneyProgressIndicator(screenshotCount: number = 0): void {
    // Remove existing indicator if any
    this.hideJourneyProgressIndicator();

    const indicator = this.createJourneyProgressIndicator(screenshotCount);
    document.body.appendChild(indicator);

    contentLogger.debug('Journey progress indicator shown', {
      screenshotCount,
    });
  }

  /**
   * Hide journey progress indicator
   */
  hideJourneyProgressIndicator(): void {
    const indicator = document.getElementById('snapinsights-journey-indicator');
    if (indicator) {
      indicator.style.animation = 'slideOut 0.3s ease-out';
      setTimeout(() => {
        indicator.remove();
      }, 300);
    }
  }

  /**
   * Inject CSS animations if not already present
   */
  injectAnimations(): void {
    if (document.querySelector('#insight-clip-animations')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'insight-clip-animations';
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;

    document.head.appendChild(style);
    contentLogger.debug('CSS animations injected');
  }

  /**
   * Check if font is loaded
   */
  isFontLoaded(): boolean {
    return this.fontLoaded;
  }

  /**
   * Cleanup UI service
   */
  cleanup(): void {
    // Remove injected styles and fonts
    const fontLink = document.querySelector(`#${CSS_CLASSES.FONT_LOADER}`);
    if (fontLink) {
      fontLink.remove();
    }

    const animations = document.querySelector('#insight-clip-animations');
    if (animations) {
      animations.remove();
    }

    this.fontLoaded = false;
    contentLogger.debug('UI service cleanup completed');
  }
}

// Singleton instance
export const uiService = new UIService();
