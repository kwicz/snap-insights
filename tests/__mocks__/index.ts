/**
 * Re-export all mocks for easier importing
 */

export { chromeMock, createChromeMock, resetChromeMocks } from './chrome-api';
export { mockBrowserAPIs } from './browser';

// Re-export types
export type {
  ChromeAPIMock,
  ChromeStorageMock,
  ChromeRuntimeMock,
  ChromeTabsMock,
  ChromeDownloadsMock,
  ChromePermissionsMock,
  ChromeNotificationsMock,
  StorageGetResult,
  StorageChangeEvent,
  ChromeTab,
  DownloadOptions,
  PermissionRequest,
  NotificationOptions,
} from '../../src/types/chrome-api';
