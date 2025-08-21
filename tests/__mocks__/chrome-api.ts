import {
  ChromeAPIMock,
  ChromeStorageMock,
  ChromeRuntimeMock,
  ChromeTabsMock,
  ChromeDownloadsMock,
  ChromePermissionsMock,
  ChromeNotificationsMock,
  StorageGetResult,
  ChromeTab,
  DownloadOptions,
  PermissionRequest,
  NotificationOptions,
} from '../../src/types/chrome-api';

/**
 * Create a mock event handler with Jest mocks
 */
const createMockEventHandler = () => ({
  addListener: jest.fn(),
  removeListener: jest.fn(),
});

/**
 * Create storage API mock
 */
const createStorageMock = (): ChromeStorageMock => ({
  local: {
    get: jest.fn().mockImplementation((keys) => {
      return Promise.resolve({} as StorageGetResult);
    }),
    set: jest.fn().mockImplementation((items) => Promise.resolve()),
    remove: jest.fn().mockImplementation((keys) => Promise.resolve()),
    clear: jest.fn().mockImplementation(() => Promise.resolve()),
    onChanged: createMockEventHandler(),
  },
  sync: {
    get: jest.fn().mockImplementation((keys) => {
      return Promise.resolve({} as StorageGetResult);
    }),
    set: jest.fn().mockImplementation((items) => Promise.resolve()),
    remove: jest.fn().mockImplementation((keys) => Promise.resolve()),
    clear: jest.fn().mockImplementation(() => Promise.resolve()),
    onChanged: createMockEventHandler(),
  },
});

/**
 * Create runtime API mock
 */
const createRuntimeMock = (): ChromeRuntimeMock => ({
  sendMessage: jest.fn().mockImplementation((message) => Promise.resolve()),
  onMessage: createMockEventHandler(),
  onInstalled: createMockEventHandler(),
  getManifest: jest.fn().mockReturnValue({
    manifest_version: 3,
    name: 'Test Extension',
    version: '1.0.0',
  }),
  getURL: jest
    .fn()
    .mockImplementation((path) => `chrome-extension://test-id/${path}`),
});

/**
 * Create tabs API mock
 */
const createTabsMock = (): ChromeTabsMock => ({
  query: jest.fn().mockImplementation((queryInfo) => {
    const mockTab: ChromeTab = {
      id: 1,
      index: 0,
      windowId: 1,
      url: 'https://example.com',
      title: 'Test Tab',
      active: true,
      status: 'complete',
    };
    return Promise.resolve([mockTab]);
  }),
  captureVisibleTab: jest.fn().mockImplementation((windowId, options) => {
    return Promise.resolve('data:image/png;base64,mockedImageData');
  }),
  sendMessage: jest
    .fn()
    .mockImplementation((tabId, message) => Promise.resolve()),
  create: jest.fn().mockImplementation((createProperties) => {
    const mockTab: ChromeTab = {
      id: 2,
      index: 1,
      windowId: 1,
      url: createProperties.url,
      active: true,
      status: 'loading',
    };
    return Promise.resolve(mockTab);
  }),
  update: jest
    .fn()
    .mockImplementation((tabId, updateProperties) => Promise.resolve()),
  onUpdated: createMockEventHandler(),
  onActivated: createMockEventHandler(),
});

/**
 * Create downloads API mock
 */
const createDownloadsMock = (): ChromeDownloadsMock => ({
  download: jest.fn().mockImplementation((options: DownloadOptions) => {
    return Promise.resolve(1); // Return download ID
  }),
  onChanged: createMockEventHandler(),
});

/**
 * Create permissions API mock
 */
const createPermissionsMock = (): ChromePermissionsMock => ({
  request: jest
    .fn()
    .mockImplementation((permissions: PermissionRequest) =>
      Promise.resolve(true)
    ),
  contains: jest
    .fn()
    .mockImplementation((permissions: PermissionRequest) =>
      Promise.resolve(true)
    ),
  remove: jest
    .fn()
    .mockImplementation((permissions: PermissionRequest) =>
      Promise.resolve(true)
    ),
  onAdded: createMockEventHandler(),
  onRemoved: createMockEventHandler(),
});

/**
 * Create notifications API mock
 */
const createNotificationsMock = (): ChromeNotificationsMock => ({
  create: jest
    .fn()
    .mockImplementation(
      (notificationId: string, options: NotificationOptions) => {
        return Promise.resolve(notificationId);
      }
    ),
  clear: jest
    .fn()
    .mockImplementation((notificationId: string) => Promise.resolve(true)),
  onClicked: createMockEventHandler(),
});

/**
 * Create complete Chrome API mock
 */
export const createChromeMock = (): ChromeAPIMock => ({
  storage: createStorageMock(),
  runtime: createRuntimeMock(),
  tabs: createTabsMock(),
  downloads: createDownloadsMock(),
  permissions: createPermissionsMock(),
  notifications: createNotificationsMock(),
});

/**
 * Reset all Chrome API mocks
 */
export const resetChromeMocks = (chrome: ChromeAPIMock): void => {
  // Reset storage mocks
  jest.clearAllMocks();

  // Reset event handlers
  Object.values(chrome).forEach((api) => {
    Object.values(api).forEach((method) => {
      if (method && typeof method === 'object' && 'addListener' in method) {
        (method.addListener as jest.Mock).mockClear();
        (method.removeListener as jest.Mock).mockClear();
      }
    });
  });
};

/**
 * Default Chrome API mock instance
 */
export const chromeMock = createChromeMock();
