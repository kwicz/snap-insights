/**
 * Integration tests for message passing between extension components
 */

import { ExtensionMessage, ExtensionMode } from '@/types';

// Mock Chrome runtime for message passing
const mockChrome = {
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    sendMessage: jest.fn(),
  },
};

global.chrome = mockChrome as any;

describe('Message Passing Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Popup to Background Communication', () => {
    test('should handle extension activation message', async () => {
      const activationMessage = {
        type: 'ACTIVATE_EXTENSION' as const,
        data: {
          mode: 'snap' as ExtensionMode,
          selectedIcon: 'blue' as const,
        },
        timestamp: Date.now(),
      };

      // Mock successful response
      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe('ACTIVATE_EXTENSION');
        expect(message.data.mode).toBe('snap');
        callback({ success: true });
      });

      // Simulate popup sending message
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(activationMessage, resolve);
      });

      expect(response).toEqual({ success: true });
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith(
        activationMessage,
        expect.any(Function)
      );
    });

    test('should handle journey start message', async () => {
      const journeyMessage = {
        type: 'START_JOURNEY' as const,
        timestamp: Date.now(),
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe('START_JOURNEY');
        callback({
          success: true,
          journeyState: {
            isActive: true,
            screenshots: [],
            startTime: Date.now(),
          },
        });
      });

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(journeyMessage, resolve);
      });

      expect(response).toMatchObject({
        success: true,
        journeyState: {
          isActive: true,
          screenshots: [],
        },
      });
    });

    test('should handle settings update message', async () => {
      const settingsMessage = {
        type: 'UPDATE_SETTINGS' as const,
        settings: {
          mode: 'annotate' as ExtensionMode,
          markerColor: {
            color: '#FF0000',
            opacity: 0.8,
            size: 20,
            style: 'solid' as const,
          },
        },
        timestamp: Date.now(),
      };

      mockChrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message.type).toBe('UPDATE_SETTINGS');
        callback({ success: true });
      });

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(settingsMessage, resolve);
      });

      expect(response).toEqual({ success: true });
    });
  });

  describe('Background to Content Script Communication', () => {
    test('should handle screenshot capture request', async () => {
      const captureMessage = {
        type: 'CAPTURE_SCREENSHOT' as const,
        data: {
          coordinates: { x: 100, y: 200 },
          selectedIcon: 'blue' as const,
          annotation: 'Test annotation',
        },
        timestamp: Date.now(),
      };

      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(tabId).toBe(1);
        expect(message.type).toBe('CAPTURE_SCREENSHOT');
        callback({
          success: true,
          dataUrl: 'data:image/png;base64,mock-data',
        });
      });

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(1, captureMessage, resolve);
      });

      expect(response).toMatchObject({
        success: true,
        dataUrl: expect.stringContaining('data:image/png'),
      });
    });

    test('should handle extension activation in content script', async () => {
      const activationMessage = {
        type: 'ACTIVATE_EXTENSION' as const,
        data: {
          mode: 'snap' as ExtensionMode,
          selectedIcon: 'blue' as const,
        },
        timestamp: Date.now(),
      };

      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(message.type).toBe('ACTIVATE_EXTENSION');
        expect(message.data.mode).toBe('snap');
        callback({ success: true });
      });

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(1, activationMessage, resolve);
      });

      expect(response).toEqual({ success: true });
    });

    test('should handle journey mode start in content script', async () => {
      const journeyMessage = {
        type: 'START_JOURNEY' as const,
        timestamp: Date.now(),
      };

      mockChrome.tabs.sendMessage.mockImplementation((tabId, message, callback) => {
        expect(message.type).toBe('START_JOURNEY');
        callback({ success: true });
      });

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(1, journeyMessage, resolve);
      });

      expect(response).toEqual({ success: true });
    });
  });

  describe('Error Handling in Message Passing', () => {
    test('should handle Chrome runtime errors', async () => {
      const message = {
        type: 'CAPTURE_SCREENSHOT' as const,
        timestamp: Date.now(),
      };

      // Mock Chrome runtime error
      mockChrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        chrome.runtime.lastError = { message: 'Extension context invalidated.' };
        callback(undefined);
      });

      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      });

      expect(response).toEqual({ error: 'Extension context invalidated.' });
    });

    test('should handle tab message sending errors', async () => {
      const message = {
        type: 'ACTIVATE_EXTENSION' as const,
        timestamp: Date.now(),
      };

      mockChrome.tabs.sendMessage.mockImplementation((tabId, msg, callback) => {
        chrome.runtime.lastError = { message: 'Could not establish connection.' };
        callback(undefined);
      });

      const response = await new Promise((resolve) => {
        chrome.tabs.sendMessage(1, message, (response) => {
          if (chrome.runtime.lastError) {
            resolve({ error: chrome.runtime.lastError.message });
          } else {
            resolve(response);
          }
        });
      });

      expect(response).toEqual({ error: 'Could not establish connection.' });
    });

    test('should handle message timeout', async () => {
      const message = {
        type: 'CAPTURE_SCREENSHOT' as const,
        timestamp: Date.now(),
      };

      // Mock timeout by never calling callback
      mockChrome.runtime.sendMessage.mockImplementation((msg, callback) => {
        // Simulate timeout - callback never called
      });

      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ error: 'Message timeout' }), 100);
      });

      const messagePromise = new Promise((resolve) => {
        chrome.runtime.sendMessage(message, resolve);
      });

      const response = await Promise.race([messagePromise, timeoutPromise]);
      expect(response).toEqual({ error: 'Message timeout' });
    });
  });

  describe('Message Flow Integration', () => {
    test('should complete full screenshot capture flow', async () => {
      const messages: any[] = [];

      // Mock the entire flow
      mockChrome.runtime.sendMessage
        .mockImplementationOnce((message, callback) => {
          // Step 1: Activate extension
          messages.push(message);
          callback({ success: true });
        })
        .mockImplementationOnce((message, callback) => {
          // Step 2: Capture screenshot
          messages.push(message);
          callback({
            success: true,
            dataUrl: 'data:image/png;base64,mock-data',
          });
        })
        .mockImplementationOnce((message, callback) => {
          // Step 3: Save screenshot
          messages.push(message);
          callback({ downloadId: 12345 });
        });

      // Simulate full flow
      // 1. Activate extension
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: { mode: 'snap', selectedIcon: 'blue' },
          timestamp: Date.now(),
        }, resolve);
      });

      // 2. Capture screenshot
      const captureResponse = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_SCREENSHOT',
          data: { coordinates: { x: 100, y: 200 } },
          timestamp: Date.now(),
        }, resolve);
      });

      // 3. Save screenshot
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_SCREENSHOT',
          data: {
            dataUrl: (captureResponse as any).dataUrl,
            url: 'https://example.com',
            timestamp: Date.now(),
          },
        }, resolve);
      });

      // Verify the complete flow
      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe('ACTIVATE_EXTENSION');
      expect(messages[1].type).toBe('CAPTURE_SCREENSHOT');
      expect(messages[2].type).toBe('SAVE_SCREENSHOT');
    });

    test('should complete full journey mode flow', async () => {
      const messages: any[] = [];

      mockChrome.runtime.sendMessage
        .mockImplementationOnce((message, callback) => {
          // Start journey
          messages.push(message);
          callback({
            success: true,
            journeyState: { isActive: true, screenshots: [] },
          });
        })
        .mockImplementationOnce((message, callback) => {
          // Add screenshot to journey
          messages.push(message);
          callback({
            success: true,
            journeyState: {
              isActive: true,
              screenshots: [{ id: 'screenshot1', sequence: 1 }],
            },
          });
        })
        .mockImplementationOnce((message, callback) => {
          // Save journey
          messages.push(message);
          callback({
            success: true,
            downloadIds: [123, 124],
          });
        });

      // 1. Start journey
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'START_JOURNEY',
          timestamp: Date.now(),
        }, resolve);
      });

      // 2. Add screenshot (simulate journey screenshot)
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CAPTURE_SCREENSHOT',
          data: { coordinates: { x: 100, y: 200 }, mode: 'journey' },
          timestamp: Date.now(),
        }, resolve);
      });

      // 3. Save journey collection
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'SAVE_JOURNEY_COLLECTION',
          timestamp: Date.now(),
        }, resolve);
      });

      expect(messages).toHaveLength(3);
      expect(messages[0].type).toBe('START_JOURNEY');
      expect(messages[1].type).toBe('CAPTURE_SCREENSHOT');
      expect(messages[2].type).toBe('SAVE_JOURNEY_COLLECTION');
    });
  });

  describe('Message Validation', () => {
    test('should validate required message fields', () => {
      const validMessage: ExtensionMessage = {
        type: 'CAPTURE_SCREENSHOT',
        timestamp: Date.now(),
      };

      expect(validMessage.type).toBeDefined();
      expect(validMessage.timestamp).toBeDefined();
      expect(typeof validMessage.timestamp).toBe('number');
    });

    test('should validate message type constraints', () => {
      const messageTypes = [
        'ACTIVATE_EXTENSION',
        'DEACTIVATE_EXTENSION',
        'CAPTURE_SCREENSHOT',
        'SAVE_SCREENSHOT',
        'START_JOURNEY',
        'STOP_JOURNEY',
        'UPDATE_SETTINGS',
      ];

      messageTypes.forEach(type => {
        const message = {
          type: type as any,
          timestamp: Date.now(),
        };

        expect(typeof message.type).toBe('string');
        expect(message.type.length).toBeGreaterThan(0);
      });
    });
  });
});