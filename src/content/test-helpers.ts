// Test helper functions
export function setupTestExports(functions: {
  handleClick: (event: MouseEvent) => void;
  showClickFeedback: (coordinates: { x: number; y: number }) => void;
  captureScreenshotWithTouchpoint: (coordinates: { x: number; y: number }) => void;
  updateCursorState: () => void;
  loadSettings: () => Promise<void>;
}): void {
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, 'insightClipContent', {
      value: functions,
      writable: false,
      configurable: true,
    });
  }
}
