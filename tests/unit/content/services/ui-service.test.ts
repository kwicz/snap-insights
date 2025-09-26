/**
 * Tests for UI service - Fixed to match actual implementation
 */

import '@testing-library/jest-dom';
import { uiService } from '@/content/services/ui-service';

describe('UIService', () => {
  const mockCoordinates = { x: 100, y: 200 };

  beforeEach(() => {
    jest.clearAllMocks();

    // Clear DOM
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  afterEach(() => {
    // Clean up any created elements
    uiService.cleanup();
  });

  describe('loadFont', () => {
    test('should load League Spartan font', () => {
      uiService.loadFont();

      const fontLink = document.querySelector('#insight-clip-font-loader');
      expect(fontLink).toBeInTheDocument();
      expect(fontLink?.getAttribute('href')).toContain('fonts.googleapis.com');
    });

    test('should not load font twice', () => {
      uiService.loadFont();
      uiService.loadFont();

      const fontLinks = document.querySelectorAll('#insight-clip-font-loader');
      expect(fontLinks).toHaveLength(1);
    });

    test('should mark font as loaded', () => {
      expect(uiService.isFontLoaded()).toBe(false);
      uiService.loadFont();
      expect(uiService.isFontLoaded()).toBe(true);
    });
  });

  describe('showClickFeedback', () => {
    test('should create and show click feedback marker', () => {
      uiService.showClickFeedback(mockCoordinates, 'blue');

      const marker = document.querySelector('div[style*="position: fixed"]');
      expect(marker).toBeInTheDocument();
    });

    test('should position marker correctly', () => {
      uiService.showClickFeedback(mockCoordinates, 'blue');

      const marker = document.querySelector('div[style*="position: fixed"]') as HTMLElement;
      expect(marker.style.left).toBe('68px'); // x - 32
      expect(marker.style.top).toBe('168px'); // y - 32
    });

    test('should handle different icon types', () => {
      const iconTypes: ('light' | 'blue' | 'dark')[] = ['light', 'blue', 'dark'];

      iconTypes.forEach(iconType => {
        document.body.innerHTML = '';
        uiService.showClickFeedback(mockCoordinates, iconType);

        const marker = document.querySelector('div[style*="position: fixed"]');
        expect(marker).toBeInTheDocument();
      });
    });

    test('should create fallback icon when extension context is invalid', () => {
      // Mock invalid extension context
      const originalGetURL = chrome.runtime.getURL;
      chrome.runtime.getURL = jest.fn().mockImplementation(() => {
        throw new Error('Extension context invalid');
      });

      uiService.showClickFeedback(mockCoordinates, 'blue');

      const marker = document.querySelector('div[style*="position: fixed"]');
      expect(marker).toBeInTheDocument();

      // Restore
      chrome.runtime.getURL = originalGetURL;
    });

    test('should remove marker after animation delay', async () => {
      uiService.showClickFeedback(mockCoordinates, 'blue');

      const marker = document.querySelector('div[style*="position: fixed"]');
      expect(marker).toBeInTheDocument();

      // Wait for removal timeout (600ms)
      await new Promise(resolve => setTimeout(resolve, 650));

      const markerAfter = document.querySelector('div[style*="position: fixed"]');
      expect(markerAfter).not.toBeInTheDocument();
    });
  });

  describe('createRecordingIndicator', () => {
    test('should create recording indicator element', () => {
      const indicator = uiService.createRecordingIndicator();

      expect(indicator).toBeInstanceOf(HTMLElement);
      expect(indicator.textContent).toContain('Recording...');
    });

    test('should have proper styling', () => {
      const indicator = uiService.createRecordingIndicator();

      expect(indicator.style.display).toBe('flex');
      expect(indicator.style.alignItems).toBe('center');
    });
  });

  describe('journeyProgressIndicator', () => {
    // Note: Journey progress UI has been removed from display but methods preserved for future use
    test('should create journey progress indicator element (not displayed)', () => {
      const indicator = uiService.createJourneyProgressIndicator(3);

      expect(indicator).toBeInstanceOf(HTMLElement);
      expect(indicator.textContent).toContain('Journey Mode: 3 screenshots');
      expect(indicator.id).toBe('snapinsights-journey-indicator');
    });

    test.skip('should show journey progress indicator - REMOVED FROM UI', () => {
      // Journey progress indicator removed from UI per requirements
      // Screenshot count is still tracked internally but not displayed
      uiService.showJourneyProgressIndicator(5);

      const indicator = document.getElementById('snapinsights-journey-indicator');
      expect(indicator).toBeInTheDocument();
      expect(indicator?.textContent).toContain('Journey Mode: 5 screenshots');
    });

    test.skip('should update journey progress indicator - REMOVED FROM UI', () => {
      // Journey progress indicator removed from UI per requirements
      // Screenshot count is still tracked internally but not displayed
      uiService.showJourneyProgressIndicator(2);
      uiService.updateJourneyProgressIndicator(7);

      const indicator = document.getElementById('snapinsights-journey-indicator');
      expect(indicator?.textContent).toContain('Journey Mode: 7 screenshots');
    });

    test.skip('should hide journey progress indicator - REMOVED FROM UI', async () => {
      // Journey progress indicator removed from UI per requirements
      uiService.showJourneyProgressIndicator(1);

      let indicator = document.getElementById('snapinsights-journey-indicator');
      expect(indicator).toBeInTheDocument();

      uiService.hideJourneyProgressIndicator();

      // Wait for animation and removal
      await new Promise(resolve => setTimeout(resolve, 350));

      indicator = document.getElementById('snapinsights-journey-indicator');
      expect(indicator).not.toBeInTheDocument();
    });

    test('should remove existing indicator before showing new one', () => {
      uiService.showJourneyProgressIndicator(1);
      uiService.showJourneyProgressIndicator(2);

      const indicators = document.querySelectorAll('#snapinsights-journey-indicator');
      expect(indicators).toHaveLength(1);
    });
  });

  describe('injectAnimations', () => {
    test('should inject CSS animations', () => {
      uiService.injectAnimations();

      const style = document.querySelector('#insight-clip-animations');
      expect(style).toBeInTheDocument();
      expect(style?.textContent).toContain('@keyframes pulse');
    });

    test('should not inject animations twice', () => {
      uiService.injectAnimations();
      uiService.injectAnimations();

      const styles = document.querySelectorAll('#insight-clip-animations');
      expect(styles).toHaveLength(1);
    });

    test('should include all required animations', () => {
      uiService.injectAnimations();

      const style = document.querySelector('#insight-clip-animations');
      const content = style?.textContent || '';

      expect(content).toContain('@keyframes pulse');
      expect(content).toContain('@keyframes slideIn');
      expect(content).toContain('@keyframes slideOut');
    });
  });

  describe('cleanup', () => {
    test('should remove font link', () => {
      uiService.loadFont();
      expect(document.querySelector('#insight-clip-font-loader')).toBeInTheDocument();

      uiService.cleanup();
      expect(document.querySelector('#insight-clip-font-loader')).not.toBeInTheDocument();
    });

    test('should remove animations', () => {
      uiService.injectAnimations();
      expect(document.querySelector('#insight-clip-animations')).toBeInTheDocument();

      uiService.cleanup();
      expect(document.querySelector('#insight-clip-animations')).not.toBeInTheDocument();
    });

    test('should reset font loaded state', () => {
      uiService.loadFont();
      expect(uiService.isFontLoaded()).toBe(true);

      uiService.cleanup();
      expect(uiService.isFontLoaded()).toBe(false);
    });

    test('should handle cleanup with no elements', () => {
      expect(() => uiService.cleanup()).not.toThrow();
    });
  });

  describe('createFallbackIcon', () => {
    test('should create fallback icon when extension context invalid', () => {
      // Mock HTMLCanvasElement.prototype.toDataURL for jsdom compatibility
      const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
      HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mockdata');

      // Mock invalid extension context by making chrome.runtime.getURL throw
      const originalGetURL = chrome.runtime.getURL;
      chrome.runtime.getURL = jest.fn().mockImplementation(() => {
        throw new Error('Extension context invalid');
      });

      uiService.showClickFeedback(mockCoordinates, 'blue');

      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toContain('data:image/png;base64');

      // Restore
      chrome.runtime.getURL = originalGetURL;
      HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
    });
  });

  describe('error handling', () => {
    test('should handle font loading errors gracefully', () => {
      // Mock document.head.appendChild to throw
      const originalAppendChild = document.head.appendChild;
      document.head.appendChild = jest.fn().mockImplementation(() => {
        throw new Error('Failed to append');
      });

      expect(() => uiService.loadFont()).not.toThrow();
      expect(uiService.isFontLoaded()).toBe(false);

      // Restore
      document.head.appendChild = originalAppendChild;
    });
  });
});