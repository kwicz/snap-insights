import { ExtensionSettings, ExtensionMessage } from './index';

/**
 * Chrome Storage API mock types
 */
export interface ChromeStorageMock {
  local: {
    get: jest.Mock;
    set: jest.Mock;
    remove: jest.Mock;
    clear: jest.Mock;
    onChanged: {
      addListener: jest.Mock;
      removeListener: jest.Mock;
    };
  };
  sync: {
    get: jest.Mock;
    set: jest.Mock;
    remove: jest.Mock;
    clear: jest.Mock;
    onChanged: {
      addListener: jest.Mock;
      removeListener: jest.Mock;
    };
  };
}

/**
 * Chrome Runtime API mock types
 */
export interface ChromeRuntimeMock {
  sendMessage: jest.Mock;
  onMessage: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  onInstalled: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  getManifest: jest.Mock;
  getURL: jest.Mock;
}

/**
 * Chrome Tabs API mock types
 */
export interface ChromeTabsMock {
  query: jest.Mock;
  captureVisibleTab: jest.Mock;
  sendMessage: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  onUpdated: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  onActivated: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
}

/**
 * Chrome Downloads API mock types
 */
export interface ChromeDownloadsMock {
  download: jest.Mock;
  onChanged: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
}

/**
 * Chrome Permissions API mock types
 */
export interface ChromePermissionsMock {
  request: jest.Mock;
  contains: jest.Mock;
  remove: jest.Mock;
  onAdded: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  onRemoved: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
}

/**
 * Chrome Notifications API mock types
 */
export interface ChromeNotificationsMock {
  create: jest.Mock;
  clear: jest.Mock;
  onClicked: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
}

/**
 * Combined Chrome API mock types
 */
export interface ChromeAPIMock {
  storage: ChromeStorageMock;
  runtime: ChromeRuntimeMock;
  tabs: ChromeTabsMock;
  downloads: ChromeDownloadsMock;
  permissions: ChromePermissionsMock;
  notifications: ChromeNotificationsMock;
}

/**
 * Storage operation result types
 */
export interface StorageGetResult<T = unknown> {
  [key: string]: T;
}

export interface StorageChangeEvent {
  [key: string]: {
    oldValue?: unknown;
    newValue?: unknown;
  };
}

/**
 * Tab types
 */
export interface ChromeTab {
  id?: number;
  index: number;
  windowId: number;
  url?: string;
  title?: string;
  active: boolean;
  status?: 'loading' | 'complete';
}

/**
 * Download types
 */
export interface DownloadOptions {
  url: string;
  filename?: string;
  saveAs?: boolean;
}

/**
 * Permission types
 */
export interface PermissionRequest {
  permissions?: string[];
  origins?: string[];
}

/**
 * Notification types
 */
export interface NotificationOptions {
  type: 'basic' | 'image' | 'list' | 'progress';
  title: string;
  message: string;
  iconUrl?: string;
  buttons?: Array<{ title: string }>;
}
