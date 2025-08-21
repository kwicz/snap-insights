// Chrome Extension API mock
interface StorageArea {
  get: jest.Mock;
  set: jest.Mock;
  remove: jest.Mock;
  clear: jest.Mock;
}

interface ChromeStorage {
  local: StorageArea;
  sync: StorageArea;
}

interface ChromeDownloads {
  download: jest.Mock;
  cancel: jest.Mock;
  search: jest.Mock;
  getFileIcon: jest.Mock;
  open: jest.Mock;
  show: jest.Mock;
  showDefaultFolder: jest.Mock;
  erase: jest.Mock;
  removeFile: jest.Mock;
  acceptDanger: jest.Mock;
  drag: jest.Mock;
  setShelfEnabled: jest.Mock;
}

interface ChromeRuntime {
  lastError: chrome.runtime.LastError | undefined;
  sendMessage: jest.Mock;
  onMessage: {
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
}

export const mockStorageArea = (): StorageArea => ({
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});

export const mockChromeExtension = {
  storage: {
    local: mockStorageArea(),
    sync: mockStorageArea(),
  } as ChromeStorage,

  downloads: {
    download: jest.fn(),
    cancel: jest.fn(),
    search: jest.fn(),
    getFileIcon: jest.fn(),
    open: jest.fn(),
    show: jest.fn(),
    showDefaultFolder: jest.fn(),
    erase: jest.fn(),
    removeFile: jest.fn(),
    acceptDanger: jest.fn(),
    drag: jest.fn(),
    setShelfEnabled: jest.fn(),
  } as ChromeDownloads,

  runtime: {
    lastError: undefined,
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  } as ChromeRuntime,

  // Helper methods for tests
  resetMocks() {
    // Reset storage mocks
    Object.values(this.storage).forEach((storage: StorageArea) => {
      Object.values(storage).forEach((mock: jest.Mock) => mock.mockReset());
    });

    // Reset downloads mocks
    Object.values(this.downloads).forEach((mock: jest.Mock) =>
      mock.mockReset()
    );

    // Reset runtime mocks
    this.runtime.sendMessage.mockReset();
    this.runtime.onMessage.addListener.mockReset();
    this.runtime.onMessage.removeListener.mockReset();
    this.runtime.lastError = undefined;
  },

  // Helper to mock storage.local.get responses
  mockStorageGet(data: Record<string, any>) {
    this.storage.local.get.mockImplementation(
      (keys: string | string[] | null, callback?: Function) => {
        if (callback) {
          callback(data);
          return;
        }
        return Promise.resolve(data);
      }
    );
  },

  // Helper to mock storage.local.set responses
  mockStorageSet(callback?: (items: Record<string, any>) => void) {
    this.storage.local.set.mockImplementation(
      (items: Record<string, any>, cb?: Function) => {
        if (callback) {
          callback(items);
        }
        if (cb) {
          cb();
          return;
        }
        return Promise.resolve();
      }
    );
  },
};
