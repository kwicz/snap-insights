/**
 * Tests for context utility functions
 */

import {
  isExtensionContextValid,
  isServiceWorker,
  isContentScript,
  isPopupContext,
  isValidTabUrl,
  getContextType,
  checkBrowserSupport,
  safeChromeCall,
  isSystemPage,
  getSystemPageError,
} from '@/shared/utils/context-utils';

describe('Context Utils', () => {
  describe('isExtensionContextValid', () => {
    test('should return true when chrome runtime is available', () => {
      expect(isExtensionContextValid()).toBe(true);
    });

    test('should return false when chrome is not available', () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;
      
      expect(isExtensionContextValid()).toBe(false);
      
      (global as any).chrome = originalChrome;
    });

    test('should return false when chrome.runtime is not available', () => {
      const originalRuntime = (global as any).chrome.runtime;
      delete (global as any).chrome.runtime;
      
      expect(isExtensionContextValid()).toBe(false);
      
      (global as any).chrome.runtime = originalRuntime;
    });
  });

  describe('isServiceWorker', () => {
    test('should return false in test environment', () => {
      expect(isServiceWorker()).toBe(false);
    });

    test('should detect service worker context', () => {
      const originalWindow = (global as any).window;
      const originalImportScripts = (global as any).importScripts;
      
      delete (global as any).window;
      (global as any).importScripts = jest.fn();
      
      expect(isServiceWorker()).toBe(true);
      
      (global as any).window = originalWindow;
      (global as any).importScripts = originalImportScripts;
    });
  });

  describe('isContentScript', () => {
    test('should return true in test environment', () => {
      expect(isContentScript()).toBe(true);
    });

    test('should return false when chrome is not available', () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;
      
      expect(isContentScript()).toBe(false);
      
      (global as any).chrome = originalChrome;
    });
  });

  describe('isPopupContext', () => {
    test('should return false in test environment', () => {
      expect(isPopupContext()).toBe(false);
    });

    test('should detect popup context', () => {
      const originalLocation = (global as any).window?.location;
      
      Object.defineProperty(window, 'location', {
        value: { protocol: 'chrome-extension:' },
        writable: true,
      });
      
      expect(isPopupContext()).toBe(true);
      
      if (originalLocation) {
        Object.defineProperty(window, 'location', {
          value: originalLocation,
          writable: true,
        });
      }
    });
  });

  describe('isValidTabUrl', () => {
    test('should return true for valid URLs', () => {
      expect(isValidTabUrl('https://example.com')).toBe(true);
      expect(isValidTabUrl('http://example.com')).toBe(true);
      expect(isValidTabUrl('https://google.com/search')).toBe(true);
    });

    test('should return false for system URLs', () => {
      expect(isValidTabUrl('chrome://settings')).toBe(false);
      expect(isValidTabUrl('chrome-extension://abc123')).toBe(false);
      expect(isValidTabUrl('edge://settings')).toBe(false);
      expect(isValidTabUrl('about:blank')).toBe(false);
    });

    test('should return false for undefined/null URLs', () => {
      expect(isValidTabUrl(undefined)).toBe(false);
      expect(isValidTabUrl('')).toBe(false);
    });
  });

  describe('getContextType', () => {
    test('should return content-script in test environment', () => {
      expect(getContextType()).toBe('content-script');
    });
  });

  describe('checkBrowserSupport', () => {
    test('should return supported status', () => {
      const support = checkBrowserSupport();
      
      expect(support).toHaveProperty('supported');
      expect(support).toHaveProperty('missing');
      expect(Array.isArray(support.missing)).toBe(true);
    });

    test('should detect missing APIs', () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome.tabs;
      
      const support = checkBrowserSupport();
      expect(support.missing).toContain('chrome.tabs');
      
      (global as any).chrome = originalChrome;
    });
  });

  describe('safeChromeCall', () => {
    test('should execute API call when context is valid', async () => {
      const mockApiCall = jest.fn().mockResolvedValue('success');
      
      const result = await safeChromeCall(mockApiCall);
      
      expect(mockApiCall).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    test('should return fallback when context is invalid', async () => {
      const originalChrome = (global as any).chrome;
      delete (global as any).chrome;
      
      const mockApiCall = jest.fn();
      const fallback = 'fallback-value';
      
      const result = await safeChromeCall(mockApiCall, fallback);
      
      expect(mockApiCall).not.toHaveBeenCalled();
      expect(result).toBe(fallback);
      
      (global as any).chrome = originalChrome;
    });

    test('should return fallback on API error', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));
      const fallback = 'fallback-value';
      
      const result = await safeChromeCall(mockApiCall, fallback);
      
      expect(result).toBe(fallback);
    });
  });

  describe('isSystemPage', () => {
    test('should detect system pages', () => {
      expect(isSystemPage('chrome://settings')).toBe(true);
      expect(isSystemPage('chrome-extension://abc123')).toBe(true);
      expect(isSystemPage('about:blank')).toBe(true);
    });

    test('should allow regular pages', () => {
      expect(isSystemPage('https://example.com')).toBe(false);
      expect(isSystemPage('http://google.com')).toBe(false);
    });
  });

  describe('getSystemPageError', () => {
    test('should return descriptive error message', () => {
      const error = getSystemPageError('chrome://settings');
      
      expect(error).toContain('Cannot use Snap Mode');
      expect(error).toContain('settings'); // hostname extraction from chrome://settings
      expect(error).toContain('regular website');
    });

    test('should handle URLs without protocol', () => {
      const error = getSystemPageError();
      
      expect(error).toContain('Cannot use Snap Mode');
      expect(typeof error).toBe('string');
    });
  });
});