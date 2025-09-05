/**
 * Utility functions for checking extension context and environment
 */

/**
 * Check if extension context is valid
 */
export function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

/**
 * Check if we're in a service worker context
 */
export function isServiceWorker(): boolean {
  return typeof (globalThis as any).importScripts === 'function' && typeof window === 'undefined';
}

/**
 * Check if we're in a content script context
 */
export function isContentScript(): boolean {
  return typeof window !== 'undefined' && typeof chrome !== 'undefined' && !!chrome.runtime;
}

/**
 * Check if we're in a popup/options context
 */
export function isPopupContext(): boolean {
  return typeof window !== 'undefined' && window.location?.protocol === 'chrome-extension:';
}

/**
 * Check if the current tab URL is valid for content script injection
 */
export function isValidTabUrl(url?: string): boolean {
  if (!url) return false;
  
  const invalidPrefixes = [
    'chrome://',
    'chrome-extension://',
    'edge://',
    'about:',
    'moz-extension://',
    'safari-extension://',
  ];
  
  return !invalidPrefixes.some(prefix => url.startsWith(prefix));
}

/**
 * Get extension context type
 */
export function getContextType(): 'service-worker' | 'content-script' | 'popup' | 'unknown' {
  if (isServiceWorker()) return 'service-worker';
  if (isContentScript() && !isPopupContext()) return 'content-script';
  if (isPopupContext()) return 'popup';
  return 'unknown';
}

/**
 * Check if browser supports required APIs
 */
export function checkBrowserSupport(): {
  supported: boolean;
  missing: string[];
} {
  const missing: string[] = [];
  
  // Check for required Chrome APIs
  if (!chrome?.runtime) missing.push('chrome.runtime');
  if (!chrome?.storage) missing.push('chrome.storage');
  if (!chrome?.tabs) missing.push('chrome.tabs');
  if (!chrome?.scripting) missing.push('chrome.scripting');
  
  // Check for Web APIs (content script context)
  if (isContentScript()) {
    if (!navigator?.mediaDevices) missing.push('navigator.mediaDevices');
    if (!(window as any).webkitSpeechRecognition) missing.push('webkitSpeechRecognition');
    if (!MediaRecorder) missing.push('MediaRecorder');
  }
  
  // Check for service worker APIs
  if (isServiceWorker()) {
    if (!self.createImageBitmap) missing.push('createImageBitmap');
    if (!OffscreenCanvas) missing.push('OffscreenCanvas');
  }
  
  return {
    supported: missing.length === 0,
    missing,
  };
}

/**
 * Safe chrome API call wrapper
 */
export async function safeChromeCall<T>(
  apiCall: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalid, skipping API call');
      return fallback;
    }
    
    return await apiCall();
  } catch (error) {
    console.error('Chrome API call failed:', error);
    return fallback;
  }
}

/**
 * Check if current page is a system page that doesn't allow content scripts
 */
export function isSystemPage(url?: string): boolean {
  if (!url) url = window?.location?.href;
  if (!url) return false;
  
  return !isValidTabUrl(url);
}

/**
 * Get user-friendly error message for system pages
 */
export function getSystemPageError(url?: string): string {
  if (!url) url = window?.location?.href;
  
  const domain = url ? new URL(url).hostname : 'this page';
  
  return `Cannot use Snap Mode on system pages like ${domain}. Please navigate to a regular website (like google.com) and try again.`;
}