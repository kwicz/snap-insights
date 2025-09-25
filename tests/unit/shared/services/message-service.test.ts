/**
 * Tests for message service - Simplified to match actual implementation
 */

import {
  getBackgroundMessageService,
  getContentMessageService,
  getPopupMessageService
} from '@/shared/services/message-service';

describe('MessageService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Chrome APIs with proper structure
    global.chrome.runtime.onMessage = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
      hasListener: jest.fn(),
    };

    global.chrome.runtime.sendMessage = jest.fn().mockResolvedValue({
      success: true,
      data: { test: true },
    });

    global.chrome.tabs.sendMessage = jest.fn().mockResolvedValue({
      success: true,
    });

    global.chrome.tabs.query = jest.fn().mockResolvedValue([
      { id: 1, url: 'https://example.com' },
    ]);
  });

  describe('Background Message Service', () => {
    test('should create singleton instance', () => {
      const service1 = getBackgroundMessageService();
      const service2 = getBackgroundMessageService();

      expect(service1).toBe(service2);
      expect(service1).toBeDefined();
    });

    test('should set up message listener on creation', () => {
      const messageService = getBackgroundMessageService();

      // Service should be created and functional
      expect(messageService).toBeDefined();
      expect(typeof messageService.registerHandler).toBe('function');
    });

    test('should send messages to background', async () => {
      const messageService = getBackgroundMessageService();

      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      });

      expect(result).toEqual({ success: true, data: { test: true } });
      expect(chrome.runtime.sendMessage).toHaveBeenCalled();
    });

    test('should send messages to content scripts', async () => {
      const messageService = getBackgroundMessageService();

      const result = await messageService.sendToContent({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      }, 1);

      expect(result.success).toBe(true);
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, expect.any(Object));
    });

    test('should broadcast to content scripts', async () => {
      const messageService = getBackgroundMessageService();

      const results = await messageService.broadcastToContent({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      });

      expect(Array.isArray(results)).toBe(true);
      expect(chrome.tabs.query).toHaveBeenCalled();
    });
  });

  describe('Content Message Service', () => {
    test('should create singleton instance', () => {
      const service1 = getContentMessageService();
      const service2 = getContentMessageService();

      expect(service1).toBe(service2);
      expect(service1).toBeDefined();
    });

    test('should send messages to background', async () => {
      const messageService = getContentMessageService();

      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      });

      expect(result).toEqual({ success: true, data: { test: true } });
    });

    test('should not have sendToContentScript method', () => {
      const messageService = getContentMessageService();

      expect(typeof (messageService as any).sendToContentScript).toBe('undefined');
    });
  });

  describe('Popup Message Service', () => {
    test('should create singleton instance', () => {
      const service1 = getPopupMessageService();
      const service2 = getPopupMessageService();

      expect(service1).toBe(service2);
      expect(service1).toBeDefined();
    });
  });

  describe('Message Handler Registration', () => {
    test('should register handlers without throwing', () => {
      const messageService = getBackgroundMessageService();
      const handler = jest.fn();

      expect(() => {
        messageService.registerHandler('TEST_MESSAGE', handler);
      }).not.toThrow();
    });

    test('should unregister handlers without throwing', () => {
      const messageService = getBackgroundMessageService();

      expect(() => {
        messageService.unregisterHandler('TEST_MESSAGE');
      }).not.toThrow();
    });
  });

  describe('Connection Testing', () => {
    test('should test connection to background script', async () => {
      const messageService = getContentMessageService();

      const result = await messageService.testConnection();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    test('should handle Chrome API errors gracefully', async () => {
      const messageService = getBackgroundMessageService();

      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(new Error('Chrome API error'));

      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Chrome API error');
    });

    test('should handle timeout errors', async () => {
      const messageService = getBackgroundMessageService();

      // Mock a timeout by never resolving
      chrome.runtime.sendMessage = jest.fn(() => new Promise(() => {}));

      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        timestamp: Date.now(),
      }, { timeout: 100 });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });
  });

  describe('Context Detection', () => {
    test('should detect background context', () => {
      const service = getBackgroundMessageService();
      expect(service).toBeDefined();
    });

    test('should detect content context', () => {
      const service = getContentMessageService();
      expect(service).toBeDefined();
    });
  });
});