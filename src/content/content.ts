import {
  ExtensionSettings,
  ExtensionMessage,
  MarkerColorSettings,
} from '@/types';

// Content script state
let isAltPressed = false;
let currentSettings: ExtensionSettings | null = null;
let isScreenshotMode = false;
let originalCursor = '';

// Wrap initialization in try-catch to catch any early errors
try {
  // Log script initialization attempt
  console.log('[INSIGHT-CLIP] Content script starting...');
  console.log('[INSIGHT-CLIP] Current URL:', window.location.href);
  console.log('[INSIGHT-CLIP] Document readyState:', document.readyState);
  console.log('[INSIGHT-CLIP] Body exists:', !!document.body);

  // Function to initialize UI elements
  function initializeUI() {
    try {
      console.log('[INSIGHT-CLIP] Attempting to create debug element...');
      const debugElement = document.createElement('div');
      debugElement.id = 'insight-clip-debug';
      debugElement.style.cssText = `
        position: fixed;
        top: 10px;
        left: 10px;
        background: red;
        color: white;
        padding: 10px;
        z-index: 999999;
        font-family: Arial, sans-serif;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;
      debugElement.textContent = 'Insight Clip Active';

      if (document.body) {
        document.body.appendChild(debugElement);
        console.log('[INSIGHT-CLIP] Debug element added to page');
      } else {
        console.error('[INSIGHT-CLIP] No document.body available');
      }
    } catch (uiError) {
      console.error('[INSIGHT-CLIP] UI initialization error:', uiError);
    }
  }

  // Try immediate initialization
  initializeUI();

  // Also try on DOMContentLoaded
  if (document.readyState === 'loading') {
    console.log(
      '[INSIGHT-CLIP] Document still loading, adding DOMContentLoaded listener'
    );
    document.addEventListener('DOMContentLoaded', () => {
      console.log('[INSIGHT-CLIP] DOMContentLoaded fired');
      initializeUI();
      loadSettings();
    });
  }

  // And try on load just to be sure
  window.addEventListener('load', () => {
    console.log('[INSIGHT-CLIP] Window load event fired');
    initializeUI();
    loadSettings();
  });

  // Load settings immediately as well
  loadSettings();
} catch (error) {
  // Log any initialization errors
  console.error('[INSIGHT-CLIP] Content script initialization error:', error);
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.addEventListener('click', handleClick, true); // Use capture phase
document.addEventListener('mousemove', handleMouseMove);

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log('Content script received message:', message);

    switch (message.type) {
      case 'SETTINGS_UPDATED':
        currentSettings = message.settings;
        updateCursorState();
        sendResponse({ success: true });
        break;

      case 'TRIGGER_SCREENSHOT_MODE':
        triggerScreenshotMode();
        sendResponse({ success: true });
        break;

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }
);

// Listen for window messages (for keyboard shortcuts)
window.addEventListener('message', (event) => {
  if (event.source !== window) return;

  if (event.data.type === 'TRIGGER_SCREENSHOT_MODE') {
    triggerScreenshotMode();
  }
});

// Load settings from background
async function loadSettings(): Promise<void> {
  try {
    console.log('Loading settings...');
    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    console.log('Settings response:', response);
    if (response.settings) {
      currentSettings = response.settings;
      console.log('Current settings updated:', currentSettings);
      updateCursorState();
    } else {
      console.warn('No settings received from background');
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Handle keydown events
function handleKeyDown(event: KeyboardEvent): void {
  console.log('Key down:', event.key, 'Alt pressed:', event.altKey);
  if (event.key === 'Alt' && !isAltPressed) {
    console.log('Setting isAltPressed to true');
    isAltPressed = true;
    updateCursorState();
  }
}

// Handle keyup events
function handleKeyUp(event: KeyboardEvent): void {
  console.log('Key up:', event.key, 'Alt pressed:', event.altKey);
  if (event.key === 'Alt' && isAltPressed) {
    console.log('Setting isAltPressed to false');
    isAltPressed = false;
    updateCursorState();
  }
}

// Handle click events
function handleClick(event: MouseEvent): void {
  // Always alert on Alt+Click regardless of mode
  if (event.altKey) {
    alert(
      'Alt + Click detected! ' +
        'isAltPressed=' +
        isAltPressed +
        ', mode=' +
        currentSettings?.mode
    );
  }

  // Only handle Alt+Click in screenshot mode
  if (
    !isAltPressed ||
    !currentSettings ||
    currentSettings.mode !== 'screenshot'
  ) {
    return;
  }

  // Prevent default click behavior
  event.preventDefault();
  event.stopPropagation();

  // Get click coordinates
  const coordinates = {
    x: event.clientX,
    y: event.clientY,
  };

  console.log('Alt+Click detected at:', coordinates);

  // Show visual feedback
  showClickFeedback(coordinates);

  // Capture screenshot
  captureScreenshot(coordinates);
}

// Handle mouse move for cursor updates
function handleMouseMove(event: MouseEvent): void {
  // Update cursor state if needed
  if (isAltPressed && currentSettings?.mode === 'screenshot') {
    updateCursorState();
  }
}

// Update cursor state based on current mode and Alt key
function updateCursorState(): void {
  if (!currentSettings) return;

  const shouldShowCrosshair =
    isAltPressed && currentSettings.mode === 'screenshot';

  if (shouldShowCrosshair && !isScreenshotMode) {
    // Store original cursor and set crosshair
    originalCursor = document.body.style.cursor || 'default';
    document.body.style.cursor = 'crosshair';
    document.body.style.setProperty('cursor', 'crosshair', 'important');
    isScreenshotMode = true;

    // Add visual indicator class
    document.body.classList.add('insight-clip-screenshot-mode');
  } else if (!shouldShowCrosshair && isScreenshotMode) {
    // Restore original cursor
    document.body.style.cursor = originalCursor;
    document.body.style.removeProperty('cursor');
    isScreenshotMode = false;

    // Remove visual indicator class
    document.body.classList.remove('insight-clip-screenshot-mode');
  }
}

// Default marker settings
const DEFAULT_MARKER_SETTINGS: MarkerColorSettings = {
  color: '#00ff00',
  opacity: 1,
  size: 12,
  style: 'solid',
};

// Update showClickFeedback function
function showClickFeedback(coordinates: { x: number; y: number }): void {
  const markerSettings =
    currentSettings?.markerColor || DEFAULT_MARKER_SETTINGS;

  // Create marker element
  const marker = document.createElement('div');
  marker.className = 'insight-clip-marker';

  // Calculate size based on settings
  const size = markerSettings.size;
  const offset = size / 2;

  marker.style.cssText = `
    position: fixed;
    left: ${coordinates.x - offset}px;
    top: ${coordinates.y - offset}px;
    width: ${size}px;
    height: ${size}px;
    background-color: ${markerSettings.color};
    opacity: ${markerSettings.opacity};
    border: 2px solid white;
    border-radius: 50%;
    z-index: 999999;
    pointer-events: none;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
    animation: insight-clip-pulse 0.6s ease-out;
  `;

  // Add style-specific CSS
  if (markerSettings.style !== 'solid') {
    marker.style.border = `2px ${markerSettings.style} ${markerSettings.color}`;
    marker.style.backgroundColor = 'transparent';
  }

  // Add to document
  document.body.appendChild(marker);

  // Show screen flash effect
  showScreenFlash();

  // Remove marker after animation
  setTimeout(() => {
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }, 600);
}

// Update showScreenFlash function
function showScreenFlash(): void {
  const markerSettings =
    currentSettings?.markerColor || DEFAULT_MARKER_SETTINGS;

  const flash = document.createElement('div');
  flash.className = 'insight-clip-flash';
  flash.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${markerSettings.color};
    opacity: ${markerSettings.opacity * 0.3};
    z-index: 999998;
    pointer-events: none;
    animation: insight-clip-flash 0.2s ease-out;
  `;

  document.body.appendChild(flash);

  setTimeout(() => {
    if (flash.parentNode) {
      flash.parentNode.removeChild(flash);
    }
  }, 200);
}

// Capture screenshot
async function captureScreenshot(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    console.log('Capturing screenshot...');

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: { coordinates },
    });

    if (response.success) {
      console.log('Screenshot captured successfully');
      showNotification('Screenshot captured!', 'success');
    } else {
      console.error('Screenshot capture failed:', response.error);
      showNotification('Screenshot capture failed', 'error');
    }
  } catch (error) {
    console.error('Failed to capture screenshot:', error);
    showNotification('Screenshot capture failed', 'error');
  }
}

// Trigger screenshot mode (for keyboard shortcuts)
function triggerScreenshotMode(): void {
  if (!currentSettings) return;

  // Temporarily enable screenshot mode
  const wasAltPressed = isAltPressed;
  isAltPressed = true;
  updateCursorState();

  // Show instruction
  showNotification('Click anywhere to capture screenshot', 'info', 3000);

  // Set up one-time click listener
  const clickHandler = (event: MouseEvent) => {
    handleClick(event);
    document.removeEventListener('click', clickHandler, true);

    // Restore Alt state after a delay
    setTimeout(() => {
      isAltPressed = wasAltPressed;
      updateCursorState();
    }, 100);
  };

  document.addEventListener('click', clickHandler, true);

  // Auto-cancel after 10 seconds
  setTimeout(() => {
    document.removeEventListener('click', clickHandler, true);
    isAltPressed = wasAltPressed;
    updateCursorState();
  }, 10000);
}

// Show notification
function showNotification(
  message: string,
  type: 'success' | 'error' | 'info' = 'info',
  duration = 2000
): void {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `insight-clip-notification insight-clip-notification-${type}`;
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    background-color: ${
      type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'
    };
    color: white;
    border-radius: 4px;
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
    animation: insight-clip-slide-in 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  // Remove notification after duration
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'insight-clip-slide-out 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, duration);
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('mousemove', handleMouseMove);
});

// Export for testing
if (typeof window !== 'undefined') {
  (window as any).insightClipContent = {
    handleClick,
    showClickFeedback,
    captureScreenshot,
    updateCursorState,
    loadSettings,
  };
}
