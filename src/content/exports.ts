// Export content script functions for testing
export interface ContentScriptExports {
  handleClick: (event: MouseEvent) => void;
  showClickFeedback: (coordinates: { x: number; y: number }) => void;
  captureScreenshot: (coordinates: { x: number; y: number }) => void;
  updateCursorState: () => void;
  loadSettings: () => Promise<void>;
}

export function exportContentScriptFunctions(
  functions: ContentScriptExports
): void {
  if (typeof window !== 'undefined') {
    (window as any).insightClipContent = functions;
  }
}
