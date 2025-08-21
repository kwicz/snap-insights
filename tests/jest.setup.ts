// Global test environment setup
import '@testing-library/jest-dom';

// Mock EventTarget if not available
export class MockEventTarget {
  listeners = new Map();

  addEventListener(type: string, listener: EventListener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type: string, listener: EventListener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  dispatchEvent(event: Event) {
    if (this.listeners.has(event.type)) {
      this.listeners.get(event.type).forEach((listener: EventListener) => {
        listener(event);
      });
    }
    return true;
  }
}

if (typeof EventTarget === 'undefined') {
  (global as any).EventTarget = MockEventTarget;
}

import { chromeMock, resetChromeMocks } from './__mocks__/chrome-api';
import { mockBrowserAPIs } from './__mocks__/browser';

// Setup React environment
const React = require('react');
const ReactDOM = require('react-dom');
const ReactDOMClient = require('react-dom/client');

global.React = React;
global.ReactDOM = ReactDOM;
global.ReactDOMClient = ReactDOMClient;

// Mock Chrome Extension API
global.chrome = chromeMock as unknown as typeof chrome;

// Reset Chrome mocks before each test
beforeEach(() => {
  resetChromeMocks(chromeMock);
});

// Mock Browser APIs
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: mockBrowserAPIs.SpeechRecognition,
});

// Mock navigator APIs
Object.defineProperty(global, 'navigator', {
  value: {
    ...global.navigator,
    storage: mockBrowserAPIs.storage,
  },
  writable: true,
});

// Mock canvas and context
const { canvas, context } = mockBrowserAPIs.createCanvas();

// Store original createElement
const originalCreateElement = document.createElement.bind(document);

// Mock document createElement for canvas
Object.defineProperty(global.document, 'createElement', {
  writable: true,
  value: jest.fn((tag: string) => {
    if (tag.toLowerCase() === 'canvas') {
      return canvas as unknown as HTMLCanvasElement;
    }
    return originalCreateElement(tag);
  }),
});

// Mock OffscreenCanvas
global.OffscreenCanvas = jest
  .fn()
  .mockImplementation((width: number, height: number) => {
    const offscreenCanvas = mockBrowserAPIs.createCanvas().canvas;
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    return offscreenCanvas;
  });

// Mock Audio API
global.Audio = mockBrowserAPIs.Audio;

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn((blob) => {
  return 'blob:mock-url';
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});
