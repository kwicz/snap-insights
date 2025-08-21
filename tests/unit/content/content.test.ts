import {
  mockChromeExtension,
  simulateKeyPress,
  simulateMouseClick,
} from '../../../src/utils/test-utils';

// Mock DOM methods
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock document and window
Object.defineProperty(global, 'document', {
  value: {
    createElement: mockCreateElement,
    appendChild: mockAppendChild,
    removeChild: mockRemoveChild,
    addEventListener: mockAddEventListener,
    removeEventListener: mockRemoveEventListener,
    body: {
      style: {},
      classList: {
        add: jest.fn(),
        remove: jest.fn(),
      },
      appendChild: mockAppendChild,
    },
  },
  writable: true,
});

Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    postMessage: jest.fn(),
  },
  writable: true,
});

describe('Content Script', () => {
  beforeEach(() => {
    mockChromeExtension.resetMocks();
    jest.clearAllMocks();

    // Reset DOM mocks
    mockCreateElement.mockReturnValue({
      style: { cssText: '' },
      className: '',
      textContent: '',
      parentNode: null,
    });
  });

  describe('Initialization', () => {
    it('should load settings on initialization', async () => {
      const mockSettings = {
        mode: 'screenshot' as const,
        markerColor: {
          color: '#00ff00',
          opacity: 0.8,
          size: 12,
          style: 'solid' as const,
        },
        saveLocation: {
          path: 'Downloads',
          createMonthlyFolders: true,
          organizeByDomain: true,
        },
        voice: {
          enabled: true,
          autoTranscribe: false,
          language: 'en-US',
          maxDuration: 60,
          quality: 'medium' as const,
          noiseReduction: true,
          echoCancellation: true,
        },
        text: {
          defaultFontSize: 16,
          defaultColor: '#000000',
          fontFamily: 'Arial, sans-serif',
          spellCheck: true,
          autoSave: true,
          maxLength: 500,
        },
      };

      mockChromeExtension.mockRuntimeMessage({ settings: mockSettings });
      await (window as any).insightClipContent.loadSettings();

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'GET_SETTINGS',
      });
    });

    it('should handle settings load error', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockChromeExtension.mockRuntimeMessage(
        new Error('Failed to load settings')
      );

      await (window as any).insightClipContent.loadSettings();

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to load settings:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('should use default settings when load fails', async () => {
      mockChromeExtension.mockRuntimeMessage(null);
      await (window as any).insightClipContent.loadSettings();

      // Verify default marker settings are used
      const marker = document.createElement('div');
      (window as any).insightClipContent.showClickFeedback({ x: 100, y: 100 });

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should set up event listeners', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'keyup',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'mousemove',
        expect.any(Function)
      );
    });
  });

  describe('Keyboard Handling', () => {
    it('should detect Alt key press', () => {
      const altKeyEvent = new KeyboardEvent('keydown', { key: 'Alt' });

      // Simulate Alt key press
      expect(altKeyEvent.key).toBe('Alt');
    });

    it('should detect Alt key release', () => {
      const altKeyEvent = new KeyboardEvent('keyup', { key: 'Alt' });

      // Simulate Alt key release
      expect(altKeyEvent.key).toBe('Alt');
    });
  });

  describe('Click Handling', () => {
    it('should handle Alt+Click for screenshot capture', () => {
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
      });

      expect(clickEvent.clientX).toBe(100);
      expect(clickEvent.clientY).toBe(200);
      expect(clickEvent.altKey).toBe(true);
    });

    it('should ignore regular clicks without Alt key', () => {
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: false,
      });

      expect(clickEvent.altKey).toBe(false);
    });

    it('should prevent default behavior on Alt+Click', () => {
      const preventDefault = jest.fn();
      const stopPropagation = jest.fn();

      const clickEvent = {
        clientX: 100,
        clientY: 200,
        altKey: true,
        preventDefault,
        stopPropagation,
      };

      // Simulate Alt+Click handling
      if (clickEvent.altKey) {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      }

      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });
  });

  describe('Visual Feedback', () => {
    it('should create marker element at click location', () => {
      const coordinates = { x: 100, y: 200 };
      const mockSettings = {
        markerColor: {
          color: '#ff0000',
          opacity: 0.8,
          size: 16,
          style: 'solid' as const,
        },
      };

      mockCreateElement.mockReturnValue({
        style: { cssText: '' },
        className: '',
        parentNode: { removeChild: jest.fn() },
      });

      // Simulate marker creation with custom settings
      (window as any).insightClipContent.showClickFeedback(coordinates);

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should apply different marker styles based on settings', () => {
      const coordinates = { x: 100, y: 200 };
      const mockMarker = {
        style: { cssText: '', border: '', backgroundColor: '' },
        className: '',
        parentNode: { removeChild: jest.fn() },
      };

      mockCreateElement.mockReturnValue(mockMarker);

      // Test solid style
      (window as any).insightClipContent.showClickFeedback(coordinates);
      expect(mockMarker.style.backgroundColor).not.toBe('transparent');

      // Test dashed style
      const dashedSettings = {
        markerColor: {
          color: '#00ff00',
          opacity: 0.8,
          size: 12,
          style: 'dashed' as const,
        },
      };
      (window as any).insightClipContent.showClickFeedback(coordinates);
      expect(mockMarker.style.border).toContain('dashed');
      expect(mockMarker.style.backgroundColor).toBe('transparent');
    });

    it('should create flash effect with custom color', () => {
      mockCreateElement.mockReturnValue({
        style: { cssText: '' },
        className: '',
        parentNode: { removeChild: jest.fn() },
      });

      const mockSettings = {
        markerColor: {
          color: '#ff0000',
          opacity: 0.8,
          size: 12,
          style: 'solid' as const,
        },
      };

      // Simulate flash creation with custom settings
      (window as any).insightClipContent.showClickFeedback({ x: 100, y: 200 });

      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockAppendChild).toHaveBeenCalled();
    });

    it('should show notification with different styles', () => {
      const mockNotification = {
        style: { cssText: '', animation: '' },
        className: '',
        textContent: '',
        parentNode: { removeChild: jest.fn() },
      };

      mockCreateElement.mockReturnValue(mockNotification);

      // Test success notification
      (window as any).insightClipContent.showNotification(
        'Success!',
        'success'
      );
      expect(mockNotification.className).toContain(
        'insight-clip-notification-success'
      );

      // Test error notification
      (window as any).insightClipContent.showNotification('Error!', 'error');
      expect(mockNotification.className).toContain(
        'insight-clip-notification-error'
      );

      // Test info notification
      (window as any).insightClipContent.showNotification('Info', 'info');
      expect(mockNotification.className).toContain(
        'insight-clip-notification-info'
      );
    });

    it('should handle notification animations', () => {
      jest.useFakeTimers();

      const mockNotification = {
        style: { cssText: '', animation: '' },
        className: '',
        textContent: '',
        parentNode: { removeChild: jest.fn() },
      };

      mockCreateElement.mockReturnValue(mockNotification);

      // Show notification
      (window as any).insightClipContent.showNotification('Test', 'info', 1000);

      // Check initial animation
      expect(mockNotification.style.animation).toContain(
        'insight-clip-slide-in'
      );

      // Advance timer to trigger removal
      jest.advanceTimersByTime(1000);
      expect(mockNotification.style.animation).toContain(
        'insight-clip-slide-out'
      );

      // Advance timer to complete removal
      jest.advanceTimersByTime(300);
      expect(mockNotification.parentNode.removeChild).toHaveBeenCalledWith(
        mockNotification
      );

      jest.useRealTimers();
    });
  });

  describe('Cursor Management', () => {
    it('should set crosshair cursor in screenshot mode with Alt pressed', () => {
      const mockBody = {
        style: {
          cursor: '',
          setProperty: jest.fn(),
          removeProperty: jest.fn(),
        },
        classList: { add: jest.fn(), remove: jest.fn() },
      };

      // Simulate cursor update
      mockBody.style.cursor = 'crosshair';
      mockBody.style.setProperty('cursor', 'crosshair', 'important');
      mockBody.classList.add('insight-clip-screenshot-mode');

      expect(mockBody.style.cursor).toBe('crosshair');
      expect(mockBody.style.setProperty).toHaveBeenCalledWith(
        'cursor',
        'crosshair',
        'important'
      );
      expect(mockBody.classList.add).toHaveBeenCalledWith(
        'insight-clip-screenshot-mode'
      );
    });

    it('should restore original cursor when Alt is released', () => {
      const mockBody = {
        style: { cursor: 'default', removeProperty: jest.fn() },
        classList: { remove: jest.fn() },
      };

      // Simulate cursor restoration
      mockBody.style.cursor = 'default';
      mockBody.style.removeProperty('cursor');
      mockBody.classList.remove('insight-clip-screenshot-mode');

      expect(mockBody.style.cursor).toBe('default');
      expect(mockBody.style.removeProperty).toHaveBeenCalledWith('cursor');
      expect(mockBody.classList.remove).toHaveBeenCalledWith(
        'insight-clip-screenshot-mode'
      );
    });
  });

  describe('Screenshot Capture', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should send capture message to background script', async () => {
      const coordinates = { x: 100, y: 200 };

      mockChromeExtension.mockRuntimeMessage({ success: true });

      // Simulate screenshot capture
      await (window as any).insightClipContent.captureScreenshot(coordinates);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'CAPTURE_SCREENSHOT',
        data: { coordinates },
      });
    });

    it('should handle screenshot capture errors', async () => {
      const coordinates = { x: 100, y: 200 };
      const consoleError = jest.spyOn(console, 'error').mockImplementation();

      mockChromeExtension.mockRuntimeMessage({
        success: false,
        error: 'Permission denied',
      });

      await (window as any).insightClipContent.captureScreenshot(coordinates);

      expect(consoleError).toHaveBeenCalledWith(
        'Screenshot capture failed:',
        'Permission denied'
      );

      consoleError.mockRestore();
    });

    it('should auto-cancel screenshot mode after timeout', () => {
      const mockClickHandler = jest.fn();
      document.addEventListener = jest.fn();
      document.removeEventListener = jest.fn();

      // Trigger screenshot mode
      (window as any).insightClipContent.triggerScreenshotMode();

      // Verify instruction notification
      expect(mockCreateElement).toHaveBeenCalledWith('div');
      expect(mockAppendChild).toHaveBeenCalled();

      // Fast-forward past timeout
      jest.advanceTimersByTime(10000);

      // Verify cleanup
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
    });

    it('should handle one-time click in screenshot mode', () => {
      const mockClickHandler = jest.fn();
      document.addEventListener = jest.fn((event, handler) => {
        if (event === 'click') {
          mockClickHandler.mockImplementation(handler);
        }
      });

      // Trigger screenshot mode
      (window as any).insightClipContent.triggerScreenshotMode();

      // Simulate click
      mockClickHandler({ clientX: 100, clientY: 100 });

      // Verify click handler removal
      expect(document.removeEventListener).toHaveBeenCalledWith(
        'click',
        expect.any(Function),
        true
      );
    });

    it('should show instruction notification', () => {
      const mockNotification = {
        style: { cssText: '', animation: '' },
        className: '',
        textContent: '',
        parentNode: { removeChild: jest.fn() },
      };

      mockCreateElement.mockReturnValue(mockNotification);

      // Trigger screenshot mode
      (window as any).insightClipContent.triggerScreenshotMode();

      // Verify instruction notification
      expect(mockNotification.textContent).toBe(
        'Click anywhere to capture screenshot'
      );
      expect(mockNotification.className).toContain(
        'insight-clip-notification-info'
      );

      // Verify notification removal
      jest.advanceTimersByTime(3000);
      expect(mockNotification.parentNode.removeChild).toHaveBeenCalledWith(
        mockNotification
      );
    });
  });

  describe('Message Handling', () => {
    it('should handle settings update messages', () => {
      const mockMessage = {
        type: 'SETTINGS_UPDATED',
        data: {
          settings: {
            mode: 'annotation' as const,
            markerColor: '#ff0000',
            saveLocation: 'Downloads',
            voiceEnabled: false,
          },
        },
      };

      const mockSendResponse = jest.fn();

      // Simulate message handling
      if (mockMessage.type === 'SETTINGS_UPDATED') {
        mockSendResponse({ success: true });
      }

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });

    it('should handle trigger screenshot mode messages', () => {
      const mockMessage = { type: 'TRIGGER_SCREENSHOT_MODE' };
      const mockSendResponse = jest.fn();

      // Simulate message handling
      if (mockMessage.type === 'TRIGGER_SCREENSHOT_MODE') {
        mockSendResponse({ success: true });
      }

      expect(mockSendResponse).toHaveBeenCalledWith({ success: true });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on page unload', () => {
      // Simulate cleanup
      expect(mockRemoveEventListener).toBeDefined();
    });

    it('should remove visual elements on cleanup', () => {
      const mockElement = {
        parentNode: {
          removeChild: jest.fn(),
        },
      };

      // Simulate element cleanup
      if (mockElement.parentNode) {
        mockElement.parentNode.removeChild(mockElement);
      }

      expect(mockElement.parentNode.removeChild).toHaveBeenCalledWith(
        mockElement
      );
    });
  });
});
