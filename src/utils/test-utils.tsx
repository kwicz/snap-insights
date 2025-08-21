import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  RenderResult,
  RenderOptions,
} from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ScreenshotData, ExtensionMessage, ExtensionSettings } from '../types';

// Mock Chrome Extension API
export interface ChromeMockAPI {
  mockStorageGet: (data: Record<string, unknown>) => void;
  mockRuntimeMessage: (response: ExtensionMessage) => void;
  mockCaptureTab: (dataUrl: string) => void;
  resetMocks: () => void;
}

export const mockChromeExtension: ChromeMockAPI = {
  mockStorageGet: (data: Record<string, unknown>) => {
    (chrome.storage.local.get as jest.Mock).mockImplementation(
      (keys: string | string[] | null) => {
        if (Array.isArray(keys)) {
          const result: Record<string, unknown> = {};
          keys.forEach((key) => {
            result[key] = data[key];
          });
          return Promise.resolve(result);
        }
        return Promise.resolve(data);
      }
    );
  },

  mockRuntimeMessage: (response: ExtensionMessage) => {
    (chrome.runtime.sendMessage as jest.Mock).mockResolvedValue(response);
  },

  mockCaptureTab: (dataUrl: string) => {
    (chrome.tabs.captureVisibleTab as jest.Mock).mockResolvedValue(dataUrl);
  },

  resetMocks: () => {
    jest.clearAllMocks();
  },
};

// Mock screenshot data creator
export const createMockScreenshot = (
  overrides: Partial<ScreenshotData> = {}
): ScreenshotData => ({
  dataUrl: 'data:image/png;base64,mockImageData',
  url: 'https://example.com',
  timestamp: Date.now(),
  coordinates: { x: 100, y: 100 },
  ...overrides,
});

// Keyboard and mouse event simulation
export const simulateKeyPress = (
  key: string,
  options: Partial<KeyboardEventInit> = {}
) => {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
};

export const simulateMouseClick = (
  x: number,
  y: number,
  options: Partial<MouseEventInit> = {}
) => {
  const event = new MouseEvent('click', {
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    ...options,
  });
  document.dispatchEvent(event);
  return event;
};

// Custom render function with common providers/wrappers if needed
interface CustomRenderOptions extends RenderOptions {
  initialSettings?: Partial<ExtensionSettings>;
}

const customRender = (
  ui: React.ReactElement,
  options: CustomRenderOptions = {}
): RenderResult => {
  const { initialSettings, ...renderOptions } = options;

  // Mock initial extension settings if provided
  if (initialSettings) {
    mockChromeExtension.mockStorageGet(initialSettings);
  }

  return render(ui, { ...renderOptions });
};

// Helper to wait for chrome storage updates
export const waitForStorageUpdate = async (): Promise<void> => {
  await waitFor(() => {
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
};

// Helper to simulate tab capture
export const simulateTabCapture = async (
  imageDataUrl: string
): Promise<void> => {
  mockChromeExtension.mockCaptureTab(imageDataUrl);
  await waitFor(() => {
    expect(chrome.tabs.captureVisibleTab).toHaveBeenCalled();
  });
};

// Helper to simulate extension message
export const sendExtensionMessage = async (
  message: ExtensionMessage
): Promise<void> => {
  mockChromeExtension.mockRuntimeMessage(message);
  await waitFor(() => {
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(message);
  });
};

// Helper to create a fake file for upload tests
export const createTestFile = (
  name: string,
  type: string,
  content = 'test content'
): File => {
  return new File([content], name, { type });
};

// Helper to simulate drag and drop
export const simulateDragAndDrop = async (
  dragElement: Element,
  dropElement: Element
): Promise<void> => {
  fireEvent.dragStart(dragElement);
  fireEvent.dragEnter(dropElement);
  fireEvent.dragOver(dropElement);
  fireEvent.drop(dropElement);
  fireEvent.dragEnd(dragElement);
};

// Re-export testing utilities with our custom render
export {
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  userEvent,
  customRender as render,
};
