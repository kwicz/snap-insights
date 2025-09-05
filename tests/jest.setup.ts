/**
 * Jest setup file for SnapInsights extension tests
 */

import '@testing-library/jest-dom';

// Mock Chrome APIs
const mockChrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: jest.fn((path: string) => `chrome-extension://test-id/${path}`),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
    getManifest: jest.fn(() => ({ name: 'SnapInsights Test' })),
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    sync: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn(),
    },
    onChanged: {
      addListener: jest.fn(),
      removeListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    get: jest.fn(),
    sendMessage: jest.fn(),
    captureVisibleTab: jest.fn(),
  },
  action: {
    setBadgeText: jest.fn(),
    setTitle: jest.fn(),
  },
  scripting: {
    executeScript: jest.fn(),
  },
  downloads: {
    download: jest.fn(),
  },
  commands: {
    onCommand: {
      addListener: jest.fn(),
    },
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
    },
  },
};

// Global Chrome API mock
(global as any).chrome = mockChrome;

// Mock OffscreenCanvas for service worker tests
(global as any).OffscreenCanvas = class MockOffscreenCanvas {
  width: number;
  height: number;
  
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }
  
  getContext() {
    return {
      drawImage: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      beginPath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      roundRect: jest.fn(),
    };
  }
  
  convertToBlob() {
    return Promise.resolve(new Blob(['mock-image'], { type: 'image/png' }));
  }
};

// Mock createImageBitmap
(global as any).createImageBitmap = jest.fn(() => 
  Promise.resolve({
    width: 800,
    height: 600,
  })
);

// Mock FontFace
(global as any).FontFace = class MockFontFace {
  family: string;
  source: string;
  
  constructor(family: string, source: string) {
    this.family = family;
    this.source = source;
  }
  
  load() {
    return Promise.resolve();
  }
};

// Mock FileReader
(global as any).FileReader = class MockFileReader {
  result: string | null = null;
  onloadend: (() => void) | null = null;
  
  readAsDataURL() {
    this.result = 'data:image/png;base64,mock-data';
    setTimeout(() => this.onloadend?.(), 0);
  }
};

// Mock MediaDevices
Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: {
    getUserMedia: jest.fn(() => 
      Promise.resolve({
        getTracks: () => [{ stop: jest.fn() }],
      })
    ),
  },
});

// Mock MediaRecorder
(global as any).MediaRecorder = class MockMediaRecorder {
  static isTypeSupported = jest.fn(() => true);
  
  ondataavailable: ((event: any) => void) | null = null;
  onstop: (() => void) | null = null;
  state = 'inactive';
  
  start() {
    this.state = 'recording';
  }
  
  stop() {
    this.state = 'inactive';
    setTimeout(() => this.onstop?.(), 0);
  }
};

// Mock webkitSpeechRecognition
(global as any).webkitSpeechRecognition = class MockSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  
  onstart: (() => void) | null = null;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  
  start() {
    setTimeout(() => this.onstart?.(), 0);
  }
  
  stop() {
    setTimeout(() => this.onend?.(), 0);
  }
};

// Console spy setup
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Chrome API mocks
  mockChrome.runtime.sendMessage.mockReset();
  mockChrome.storage.local.get.mockReset();
  mockChrome.storage.local.set.mockReset();
  if (mockChrome.tabs?.query) {
    mockChrome.tabs.query.mockReset();
  }
  if (mockChrome.tabs?.captureVisibleTab) {
    mockChrome.tabs.captureVisibleTab.mockReset();
  }
  
  // Mock fetch for canvas service
  global.fetch = jest.fn()
    .mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(['mock-image'])),
    })
    .mockResolvedValueOnce({
      blob: () => Promise.resolve(new Blob(['mock-icon'])),
    });
});

// Global test utilities
(global as any).testUtils = {
  mockChrome,
  createMockTab: (overrides = {}) => ({
    id: 1,
    url: 'https://example.com',
    windowId: 1,
    active: true,
    ...overrides,
  }),
  createMockMessage: (type: string, data = {}) => ({
    type,
    data,
  }),
  waitFor: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};