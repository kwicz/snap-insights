/**
 * Tests for message service
 */

import { 
  getBackgroundMessageService, 
  getContentMessageService,
  MessageService 
} from '@/shared/services/message-service';

describe('MessageService', () => {
  let messageService: MessageService;
  const mockSender = {
    tab: { id: 1, url: 'https://example.com' },
    frameId: 0,
  };
  const mockSendResponse = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.runtime.onMessage = {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
    chrome.runtime.sendMessage = jest.fn();
    chrome.tabs.sendMessage = jest.fn();
  });

  describe('Background Message Service', () => {
    beforeEach(() => {
      messageService = getBackgroundMessageService();
    });

    test('should create singleton instance', () => {
      const service1 = getBackgroundMessageService();
      const service2 = getBackgroundMessageService();
      expect(service1).toBe(service2);
    });

    test('should register message handlers', () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should handle registered messages', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      // Get the registered listener
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'TEST_MESSAGE', data: { test: true } };
      await listener(message, mockSender, mockSendResponse);
      
      expect(handler).toHaveBeenCalledWith(message, mockSender, mockSendResponse);
    });

    test('should ignore unregistered messages', async () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'UNKNOWN_MESSAGE', data: {} };
      const result = await listener(message, mockSender, mockSendResponse);
      
      expect(handler).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should handle handler errors gracefully', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Handler error'));
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'TEST_MESSAGE', data: {} };
      await expect(listener(message, mockSender, mockSendResponse)).resolves.not.toThrow();
    });

    test('should send messages to content scripts', async () => {
      chrome.tabs.sendMessage = jest.fn().mockResolvedValue({ success: true });
      
      const result = await messageService.sendToContentScript(1, {
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      
      expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      expect(result).toEqual({ success: true });
    });

    test('should handle content script message errors', async () => {
      chrome.tabs.sendMessage = jest.fn().mockRejectedValue(new Error('Tab not found'));
      
      await expect(messageService.sendToContentScript(1, {
        type: 'TEST_MESSAGE',
        data: {},
      })).rejects.toThrow('Tab not found');
    });

    test('should send messages to background', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue({ success: true });
      
      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      expect(result).toEqual({ success: true });
    });

    test('should handle background message errors', async () => {
      chrome.runtime.sendMessage = jest.fn().mockRejectedValue(new Error('Background not available'));
      
      await expect(messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        data: {},
      })).rejects.toThrow('Background not available');
    });
  });

  describe('Content Message Service', () => {
    beforeEach(() => {
      messageService = getContentMessageService();
    });

    test('should create singleton instance', () => {
      const service1 = getContentMessageService();
      const service2 = getContentMessageService();
      expect(service1).toBe(service2);
    });

    test('should register message handlers', () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalled();
    });

    test('should handle registered messages', async () => {
      const handler = jest.fn().mockResolvedValue({ success: true });
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'TEST_MESSAGE', data: { test: true } };
      await listener(message, mockSender, mockSendResponse);
      
      expect(handler).toHaveBeenCalledWith(message, mockSender, mockSendResponse);
    });

    test('should send messages to background', async () => {
      chrome.runtime.sendMessage = jest.fn().mockResolvedValue({ success: true });
      
      const result = await messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      
      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'TEST_MESSAGE',
        data: { test: true },
      });
      expect(result).toEqual({ success: true });
    });

    test('should not have sendToContentScript method', () => {
      expect((messageService as any).sendToContentScript).toBeUndefined();
    });
  });

  describe('Message Handler Registration', () => {
    beforeEach(() => {
      messageService = getBackgroundMessageService();
    });

    test('should replace existing handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      
      messageService.registerHandler('TEST_MESSAGE', handler1);
      messageService.registerHandler('TEST_MESSAGE', handler2);
      
      // Should only register one listener
      expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledTimes(1);
    });

    test('should handle multiple message types', async () => {
      const handler1 = jest.fn().mockResolvedValue({ result: 'handler1' });
      const handler2 = jest.fn().mockResolvedValue({ result: 'handler2' });
      
      messageService.registerHandler('MESSAGE_1', handler1);
      messageService.registerHandler('MESSAGE_2', handler2);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      await listener({ type: 'MESSAGE_1', data: {} }, mockSender, mockSendResponse);
      await listener({ type: 'MESSAGE_2', data: {} }, mockSender, mockSendResponse);
      
      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('Message Validation', () => {
    beforeEach(() => {
      messageService = getBackgroundMessageService();
    });

    test('should handle messages without type', async () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { data: {} }; // No type
      const result = await listener(message, mockSender, mockSendResponse);
      
      expect(handler).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    test('should handle null/undefined messages', async () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const result1 = await listener(null, mockSender, mockSendResponse);
      const result2 = await listener(undefined, mockSender, mockSendResponse);
      
      expect(handler).not.toHaveBeenCalled();
      expect(result1).toBe(false);
      expect(result2).toBe(false);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      messageService = getBackgroundMessageService();
    });

    test('should handle synchronous handler errors', async () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'TEST_MESSAGE', data: {} };
      await expect(listener(message, mockSender, mockSendResponse)).resolves.not.toThrow();
    });

    test('should handle async handler errors', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Async error'));
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      const listener = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls[0][0];
      
      const message = { type: 'TEST_MESSAGE', data: {} };
      await expect(listener(message, mockSender, mockSendResponse)).resolves.not.toThrow();
    });

    test('should handle Chrome API errors', async () => {
      chrome.runtime.sendMessage = jest.fn().mockImplementation(() => {
        throw new Error('Chrome API error');
      });
      
      await expect(messageService.sendToBackground({
        type: 'TEST_MESSAGE',
        data: {},
      })).rejects.toThrow('Chrome API error');
    });
  });

  describe('Cleanup', () => {
    beforeEach(() => {
      messageService = getBackgroundMessageService();
    });

    test('should cleanup message listeners', () => {
      const handler = jest.fn();
      messageService.registerHandler('TEST_MESSAGE', handler);
      
      messageService.cleanup();
      
      expect(chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
    });

    test('should handle cleanup when no listeners exist', () => {
      expect(() => messageService.cleanup()).not.toThrow();
    });
  });

  describe('Context Detection', () => {
    test('should detect background context', () => {
      // Mock service worker context
      (global as any).importScripts = jest.fn();
      delete (global as any).window;
      
      const service = getBackgroundMessageService();
      expect(service).toBeDefined();
    });

    test('should detect content context', () => {
      // Mock content script context
      delete (global as any).importScripts;
      (global as any).window = {};
      
      const service = getContentMessageService();
      expect(service).toBeDefined();
    });
  });
});