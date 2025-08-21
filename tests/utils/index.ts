/**
 * Re-export test utilities for easier importing
 */

// Test utilities from src
export {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  userEvent,
  mockChromeExtension,
  simulateKeyPress,
  simulateMouseClick,
  createMockScreenshot,
  simulateDragAndDrop,
  waitForStorageUpdate,
  simulateTabCapture,
  sendExtensionMessage,
  createTestFile,
} from '../../src/utils/test-utils';

// Chrome API mocks
export {
  chromeMock,
  createChromeMock,
  resetChromeMocks,
} from '../__mocks__/chrome-api';

// Browser API mocks
export { mockBrowserAPIs } from '../__mocks__/browser';

// Test helper types
export type { CustomRenderOptions } from '../../src/utils/test-utils';
