import React from 'react';
import {
  ExtensionSettings,
  ExtensionMessage,
  MarkerColorSettings,
  AnnotationData,
  SettingsUpdatedMessage,
  ActivateCaptureModeMessage,
  DeactivateCaptureModeMessage,
} from '@/types';
import { createRoot } from 'react-dom/client';
import { AnnotationDialog } from '@/components/AnnotationDialog';
import { TranscriptionDialog } from '@/components/TranscriptionDialog';
import { setupTestExports } from './test-helpers';
import { injectStyles, removeStyles } from './styles';
import annotationDialogStyles from '@/components/AnnotationDialog.css';
import transcriptionDialogStyles from '@/components/TranscriptionDialog/TranscriptionDialog.css';

// Content script state
let isAltPressed = false;
let currentSettings: ExtensionSettings | null = null;
let isScreenshotMode = false;
let originalCursor = '';
let annotationDialogRoot: HTMLDivElement | null = null;
let currentAnnotationCoordinates: { x: number; y: number } | null = null;
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';
let extensionActive = false;

// Immediate logging to verify script execution
console.warn('INSIGHT-CLIP: Script starting');
console.warn('INSIGHT-CLIP: Document state:', document.readyState);
console.warn('INSIGHT-CLIP: URL:', window.location.href);

// Function to initialize the debug box
function createDebugBox() {
  console.warn('INSIGHT-CLIP: Attempting to create debug box');
  console.warn('INSIGHT-CLIP: document.body exists?', !!document.body);
  console.warn('INSIGHT-CLIP: document.readyState:', document.readyState);

  try {
    const debugBox = document.createElement('div');
    debugBox.id = 'insight-clip-debug';
    debugBox.style.cssText = `
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
    debugBox.textContent = 'Insight Clip Active';

    if (document.body) {
      document.body.appendChild(debugBox);
      console.warn('INSIGHT-CLIP: Debug box created successfully');
    } else {
      console.error('INSIGHT-CLIP: No document.body available');
    }
  } catch (error) {
    console.error('INSIGHT-CLIP: Error creating debug box:', error);
  }
}

// Try to create debug box at different stages
createDebugBox(); // Immediate attempt

// Try again when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.warn('INSIGHT-CLIP: DOMContentLoaded fired');
    createDebugBox();
    loadSettings();
  });
} else {
  console.warn('INSIGHT-CLIP: Document already loaded');
  createDebugBox();
  loadSettings();
}

// Event listeners
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
document.addEventListener('click', handleClick, true); // Use capture phase
document.addEventListener('mousemove', handleMouseMove);
window.addEventListener('beforeunload', function cleanup(): void {
  document.removeEventListener('keydown', handleKeyDown);
  document.removeEventListener('keyup', handleKeyUp);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('mousemove', handleMouseMove);
});

// Trigger screenshot mode (for keyboard shortcuts)
function triggerScreenshotMode(): void {
  if (!currentSettings) return;

  // Temporarily enable screenshot mode
  const wasAltPressed = isAltPressed;
  isAltPressed = true;
  updateCursorState();

  // Show instruction (removed notification)

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

// Listen for messages from background script
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    console.log('Content script received message:', message);

    switch (message.type) {
      case 'SETTINGS_UPDATED':
        currentSettings = (message as SettingsUpdatedMessage).settings;
        updateCursorState();
        sendResponse({ success: true });
        break;

      case 'START_CAPTURE':
        // Update settings with the mode from the message
        const captureData = (message as any).data;
        if (captureData?.mode && currentSettings) {
          currentSettings = {
            ...currentSettings,
            mode: captureData.mode,
          };
          updateCursorState();
        }

        // If in screenshot mode, trigger screenshot mode
        if (currentSettings?.mode === 'screenshot') {
          triggerScreenshotMode();
        }

        sendResponse({ success: true });
        break;

      case 'TRIGGER_SCREENSHOT_MODE':
        triggerScreenshotMode();
        sendResponse({ success: true });
        break;

      case 'ACTIVATE_CAPTURE_MODE':
        const activateMsg = message as ActivateCaptureModeMessage;
        extensionActive = true;
        selectedIcon = activateMsg.data.selectedIcon || 'blue';
        if (activateMsg.data.mode && currentSettings) {
          currentSettings = {
            ...currentSettings,
            mode: activateMsg.data.mode,
          };
        }
        updateCursorState();
        sendResponse({ success: true });
        break;

      case 'DEACTIVATE_CAPTURE_MODE':
        extensionActive = false;
        selectedIcon = 'blue';
        updateCursorState();
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
    console.warn('INSIGHT-CLIP: Loading settings...');
    console.warn('INSIGHT-CLIP: Extension ID:', chrome.runtime.id);

    // Check if extension is properly connected
    if (!chrome.runtime.id) {
      console.error('INSIGHT-CLIP: Extension context is invalid');
      return;
    }

    const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    console.warn(
      'INSIGHT-CLIP: Settings response:',
      JSON.stringify(response, null, 2)
    );

    if (response?.settings) {
      currentSettings = response.settings;
      console.warn(
        'INSIGHT-CLIP: Current settings updated:',
        JSON.stringify(currentSettings, null, 2)
      );
      console.warn('INSIGHT-CLIP: Mode:', response.settings.mode);
      updateCursorState();
    } else {
      console.error('INSIGHT-CLIP: No settings received from background');
      // Try to use default settings
      currentSettings = {
        mode: 'screenshot',
        markerColor: DEFAULT_MARKER_SETTINGS,
        saveLocation: {
          path: 'Downloads/Screenshots',
          createMonthlyFolders: true,
          organizeByDomain: true,
        },
        voice: {
          enabled: true,
          autoTranscribe: false,
          language: 'en-US',
          maxDuration: 60,
          quality: 'medium',
          noiseReduction: true,
          echoCancellation: true,
        },
        text: {
          defaultFontSize: 16,
          defaultColor: '#000000',
          fontFamily: 'Arial, sans-serif',
          spellCheck: true,
          autoSave: true,
          maxLength: 500,
        },
        transcription: {
          enabled: true,
          language: 'en-US',
          maxDuration: 300,
          confidenceThreshold: 0.8,
          interimResults: true,
          silenceTimeout: 2,
        },
      };
      console.warn('INSIGHT-CLIP: Using default settings:', currentSettings);
    }
  } catch (error) {
    console.error('INSIGHT-CLIP: Failed to load settings:', error);
    if (error instanceof Error) {
      console.error('INSIGHT-CLIP: Error details:', {
        message: error.message,
        stack: error.stack,
      });
    }
  }
}

// Handle keydown events
function handleKeyDown(event: KeyboardEvent): void {
  if (event.key === 'Alt') {
    const debugBox = document.getElementById('insight-clip-debug');
    if (debugBox) {
      debugBox.textContent = 'Alt Key Pressed';
      debugBox.style.backgroundColor = 'green';
    }
  }
}

// Handle keyup events
function handleKeyUp(event: KeyboardEvent): void {
  if (event.key === 'Alt') {
    const debugBox = document.getElementById('insight-clip-debug');
    if (debugBox) {
      debugBox.textContent = 'Insight Clip Active';
      debugBox.style.backgroundColor = 'red';
    }
  }
}

// Handle click events
function handleClick(event: MouseEvent): void {
  const debugBox = document.getElementById('insight-clip-debug');
  if (!debugBox) return;

  // Update debug info
  debugBox.textContent = `Alt pressed: ${event.altKey}\nMode: ${currentSettings?.mode}`;

  // Log click event
  console.log('Click event:', {
    altKey: event.altKey,
    mode: currentSettings?.mode,
    settings: currentSettings,
  });

  // Get coordinates
  const clickCoordinates = {
    x: event.clientX,
    y: event.clientY,
  };

  // Handle based on mode, extension active state, and Alt key
  if (!extensionActive) {
    debugBox.style.backgroundColor = 'red';
    console.warn('Action not taken: Extension not active');
    return;
  }

  // Require Alt+Click for all actions
  if (!event.altKey) {
    debugBox.style.backgroundColor = 'red';
    console.warn('Action not taken: Alt key not pressed');
    return;
  }

  // Handle different modes
  switch (currentSettings?.mode) {
    case 'snap':
    case 'screenshot':
      // SNAP MODE: Direct screenshot with touchpoint icon at click location (Alt+Click)
      debugBox.style.backgroundColor = 'green';
      showClickFeedback(clickCoordinates);
      captureScreenshotWithTouchpoint(clickCoordinates);
      break;
      
    case 'annotate':
    case 'annotation':
      // ANNOTATION MODE: Show dialog for text input, then screenshot with touchpoint + text (Alt+Click)
      debugBox.style.backgroundColor = 'blue';
      showAnnotationDialog(clickCoordinates);
      break;
      
    case 'transcribe':
      // TRANSCRIBE MODE: Voice recording and transcription (Alt+Click)
      debugBox.style.backgroundColor = 'purple';
      showTranscriptionDialog(clickCoordinates);
      break;
      
    default:
      debugBox.style.backgroundColor = 'red';
      console.warn('Action not taken: Invalid mode', currentSettings?.mode);
      return;
  }

  // Prevent default click behavior
  event.preventDefault();
  event.stopPropagation();

  console.log('Click handled:', {
    coordinates: clickCoordinates,
    mode: currentSettings?.mode,
  });
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
  color: '#FF0000',
  opacity: 0.8,
  size: 20,
  style: 'solid',
};

// Update showClickFeedback function
function showClickFeedback(coordinates: { x: number; y: number }): void {
  // Create marker element using selected touchpoint icon
  const marker = document.createElement('div');
  marker.className = 'insight-clip-marker';

  // Create image element for the touchpoint
  const iconImg = document.createElement('img');
  const iconPath = chrome.runtime.getURL(
    `assets/icons/touchpoint-${selectedIcon}.png`
  );
  iconImg.src = iconPath;
  iconImg.style.cssText = `
    width: 32px;
    height: 32px;
    display: block;
  `;

  // Position the marker
  marker.style.cssText = `
    position: fixed;
    left: ${coordinates.x - 16}px;
    top: ${coordinates.y - 16}px;
    width: 32px;
    height: 32px;
    z-index: 999999;
    pointer-events: none;
    animation: insight-clip-pulse 0.6s ease-out;
  `;

  // Add the icon to the marker
  marker.appendChild(iconImg);

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

// Capture screenshot with retry
// Draw touchpoint icon on screenshot
async function drawTouchpointOnScreenshot(
  dataUrl: string,
  coordinates: { x: number; y: number }
): Promise<string> {
  console.warn(
    'INSIGHT-CLIP: Drawing marker...',
    JSON.stringify(
      {
        coordinates,
        scroll: { x: window.scrollX, y: window.scrollY },
        viewport: { width: window.innerWidth, height: window.innerHeight },
      },
      null,
      2
    )
  );

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create a canvas to draw on
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;

        console.warn(
          'INSIGHT-CLIP: Canvas dimensions:',
          JSON.stringify(
            {
              width: canvas.width,
              height: canvas.height,
            },
            null,
            2
          )
        );

        // Draw the screenshot
        ctx.drawImage(img, 0, 0);

        // Get marker settings
        const markerSettings =
          currentSettings?.markerColor || DEFAULT_MARKER_SETTINGS;
        const size = markerSettings.size;

        console.warn('INSIGHT-CLIP: Marker settings:', markerSettings);

        // Calculate the actual coordinates based on scroll position and image scale
        const scale = img.width / window.innerWidth;
        const actualX = coordinates.x * scale;
        const actualY = coordinates.y * scale;

        console.warn(
          'INSIGHT-CLIP: Drawing marker at:',
          JSON.stringify(
            {
              original: coordinates,
              scale,
              actual: { x: actualX, y: actualY },
              markerSize: size,
              markerColor: markerSettings.color,
              markerOpacity: markerSettings.opacity,
            },
            null,
            2
          )
        );

        // Load and draw the selected touchpoint icon
        const iconImg = new Image();
        iconImg.crossOrigin = 'anonymous';

        iconImg.onload = () => {
          try {
            // Draw the touchpoint icon at the click coordinates
            const iconSize = 32; // Fixed size for touchpoint icons
            ctx.drawImage(
              iconImg,
              actualX - iconSize / 2,
              actualY - iconSize / 2,
              iconSize,
              iconSize
            );

            // Convert to data URL and resolve
            const finalDataUrl = canvas.toDataURL('image/png');
            console.warn(
              'INSIGHT-CLIP: Final data URL with touchpoint icon length:',
              finalDataUrl.length
            );
            resolve(finalDataUrl);
          } catch (error) {
            console.error(
              'INSIGHT-CLIP: Error drawing touchpoint icon:',
              error
            );
            reject(error);
          }
        };

        iconImg.onerror = () => {
          console.error(
            'INSIGHT-CLIP: Failed to load touchpoint icon, using fallback'
          );
          // Fallback to circle marker
          ctx.beginPath();
          ctx.arc(actualX, actualY, size / 2, 0, 2 * Math.PI);
          ctx.fillStyle = markerSettings.color;
          ctx.globalAlpha = markerSettings.opacity;
          ctx.fill();

          // Add white border
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Reset opacity
          ctx.globalAlpha = 1;

          const finalDataUrl = canvas.toDataURL('image/png');
          resolve(finalDataUrl);
        };

        // Load the selected touchpoint icon
        const iconPath = chrome.runtime.getURL(
          `assets/icons/touchpoint-${selectedIcon}.png`
        );
        iconImg.src = iconPath;
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Draw touchpoint icon and annotation text on screenshot (ANNOTATION MODE)
async function drawTouchpointAndAnnotationOnScreenshot(
  dataUrl: string,
  coordinates: { x: number; y: number },
  annotationText: string
): Promise<string> {
  console.warn(
    'INSIGHT-CLIP: Drawing touchpoint and annotation...',
    JSON.stringify({ coordinates, annotationText }, null, 2)
  );

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        // Create a canvas to draw on
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;

        // Draw the screenshot
        ctx.drawImage(img, 0, 0);

        // Calculate the actual coordinates based on scroll position and image scale
        const scale = img.width / window.innerWidth;
        const actualX = coordinates.x * scale;
        const actualY = coordinates.y * scale;

        // Load and draw the selected touchpoint icon
        const iconImg = new Image();
        iconImg.crossOrigin = 'anonymous';
        
        iconImg.onload = () => {
          try {
            // Draw the touchpoint icon at the click coordinates
            const iconSize = 32; // Fixed size for touchpoint icons
            ctx.drawImage(
              iconImg, 
              actualX - iconSize / 2, 
              actualY - iconSize / 2, 
              iconSize, 
              iconSize
            );

            // Draw annotation text near the touchpoint
            const textPadding = 10;
            const textX = actualX + iconSize / 2 + textPadding;
            const textY = actualY - iconSize / 2;

            // Style the text
            ctx.font = '16px Arial, sans-serif';
            ctx.fillStyle = '#000000';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;

            // Draw text background for better readability
            const textMetrics = ctx.measureText(annotationText);
            const textWidth = textMetrics.width;
            const textHeight = 20;
            
            // Background rectangle
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.fillRect(
              textX - 5, 
              textY - textHeight, 
              textWidth + 10, 
              textHeight + 5
            );

            // Draw text outline (for better visibility)
            ctx.strokeText(annotationText, textX, textY);
            
            // Draw text
            ctx.fillStyle = '#000000';
            ctx.fillText(annotationText, textX, textY);

            // Convert to data URL and resolve
            const finalDataUrl = canvas.toDataURL('image/png');
            console.warn(
              'INSIGHT-CLIP: Final data URL with touchpoint and annotation length:',
              finalDataUrl.length
            );
            resolve(finalDataUrl);
          } catch (error) {
            console.error('INSIGHT-CLIP: Error drawing touchpoint and annotation:', error);
            reject(error);
          }
        };

        iconImg.onerror = () => {
          console.error('INSIGHT-CLIP: Failed to load touchpoint icon for annotation, using fallback');
          // Fallback: just draw text with a simple circle marker
          const markerSettings = currentSettings?.markerColor || DEFAULT_MARKER_SETTINGS;
          
          // Draw circle marker
          ctx.beginPath();
          ctx.arc(actualX, actualY, 10, 0, 2 * Math.PI);
          ctx.fillStyle = markerSettings.color;
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw annotation text
          const textPadding = 15;
          const textX = actualX + textPadding;
          const textY = actualY - 10;

          ctx.font = '16px Arial, sans-serif';
          ctx.fillStyle = '#000000';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;

          // Text background
          const textMetrics = ctx.measureText(annotationText);
          const textWidth = textMetrics.width;
          const textHeight = 20;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.fillRect(textX - 5, textY - textHeight, textWidth + 10, textHeight + 5);

          // Draw text
          ctx.strokeText(annotationText, textX, textY);
          ctx.fillStyle = '#000000';
          ctx.fillText(annotationText, textX, textY);

          const finalDataUrl = canvas.toDataURL('image/png');
          resolve(finalDataUrl);
        };

        // Load the selected touchpoint icon
        const iconPath = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
        iconImg.src = iconPath;

        // Convert to data URL and resolve
        const finalDataUrl = canvas.toDataURL('image/png');
        console.warn(
          'INSIGHT-CLIP: Final data URL with touchpoint icon length:',
          finalDataUrl.length
        );
        resolve(finalDataUrl);
      } catch (error) {
        reject(error);
      }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

// Capture screenshot with touchpoint icon (SNAP MODE)
async function captureScreenshotWithTouchpoint(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    console.warn('INSIGHT-CLIP: Capturing screenshot...');

    // First get the raw screenshot
    console.warn(
      'INSIGHT-CLIP: Requesting screenshot with coordinates:',
      coordinates
    );

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: { coordinates },
    });

    console.warn(
      'INSIGHT-CLIP: Screenshot response:',
      JSON.stringify(
        {
          success: response.success,
          hasDataUrl: !!response.dataUrl,
          dataUrlLength: response.dataUrl?.length || 0,
          error: response.error,
        },
        null,
        2
      )
    );

    if (response.success && response.dataUrl) {
      // Draw touchpoint icon on the screenshot
      console.warn('INSIGHT-CLIP: Drawing touchpoint icon...');
      const markedDataUrl = await drawTouchpointOnScreenshot(
        response.dataUrl,
        coordinates
      );

      // Save the screenshot with touchpoint
      console.warn('INSIGHT-CLIP: Saving screenshot with touchpoint...');

      const saveData = {
        dataUrl: markedDataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates,
        mode: 'snap',
      };

      console.warn(
        'INSIGHT-CLIP: Save data:',
        JSON.stringify(
          {
            url: saveData.url,
            timestamp: saveData.timestamp,
            coordinates: saveData.coordinates,
            dataUrlLength: saveData.dataUrl.length,
          },
          null,
          2
        )
      );

      const saveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: saveData,
      });

      console.warn(
        'INSIGHT-CLIP: Save response:',
        JSON.stringify(saveResponse, null, 2)
      );

      if (saveResponse.downloadId) {
        console.warn(
          'INSIGHT-CLIP: Screenshot saved successfully with download ID:',
          saveResponse.downloadId
        );
      } else if (saveResponse.error) {
        console.error(
          'INSIGHT-CLIP: Failed to save screenshot:',
          saveResponse.error
        );
      } else {
        console.error(
          'INSIGHT-CLIP: Unexpected save response:',
          JSON.stringify(saveResponse, null, 2)
        );
      }
    } else {
      console.error('INSIGHT-CLIP: Screenshot capture failed:', response.error);
    }
  } catch (error) {
    console.error('INSIGHT-CLIP: Screenshot error:', error);
  }
}

// Show annotation dialog at click coordinates
function showAnnotationDialog(coordinates: { x: number; y: number }): void {
  // Store coordinates for later use
  currentAnnotationCoordinates = coordinates;

  // Create root element if it doesn't exist
  if (!annotationDialogRoot) {
    const container = document.createElement('div');
    container.id = 'insight-clip-annotation-dialog';
    document.body.appendChild(container);
    annotationDialogRoot = container;
  }

  // Inject styles
  injectStyles(annotationDialogStyles, 'insight-clip-annotation-styles');

  // Create React root and render dialog
  const root = createRoot(annotationDialogRoot);
  root.render(
    React.createElement(AnnotationDialog, {
      isOpen: true,
      position: coordinates,
      onSave: handleAnnotationSave,
      onCancel: handleAnnotationCancel,
      maxLength: currentSettings?.text?.maxLength || 500,
      placeholder: 'Add your annotation...',
      autoFocus: true,
    })
  );
}

// Handle annotation save (ANNOTATION MODE)
async function handleAnnotationSave(annotation: AnnotationData): Promise<void> {
  try {
    if (!currentAnnotationCoordinates) {
      throw new Error('No coordinates available for annotation');
    }

    // Show visual feedback
    showClickFeedback(currentAnnotationCoordinates);

    // Take screenshot with annotation text and touchpoint
    if (!annotation.text) {
      throw new Error('Annotation text is required');
    }
    await captureScreenshotWithAnnotation(
      currentAnnotationCoordinates,
      annotation.text
    );

    // Clean up dialog
    handleAnnotationCancel();

    // Success - annotation saved
    console.log('INSIGHT-CLIP: Annotation saved successfully');
  } catch (error) {
    console.error('INSIGHT-CLIP: Failed to save annotation:', error);
  }
}

// Handle annotation cancel
function handleAnnotationCancel(): void {
  if (annotationDialogRoot) {
    // Unmount React component
    const root = createRoot(annotationDialogRoot);
    root.unmount();

    // Remove container
    annotationDialogRoot.remove();
    annotationDialogRoot = null;

    // Remove injected styles
    removeStyles('insight-clip-annotation-styles');
    removeStyles('insight-clip-transcription-styles');
  }

  // Clear stored coordinates
  currentAnnotationCoordinates = null;
}

// Show transcription dialog at click coordinates
function showTranscriptionDialog(coordinates: { x: number; y: number }): void {
  // Store coordinates for later use
  currentAnnotationCoordinates = coordinates;

  // Create root element if it doesn't exist
  if (!annotationDialogRoot) {
    const container = document.createElement('div');
    container.id = 'insight-clip-transcription-dialog';
    document.body.appendChild(container);
    annotationDialogRoot = container;
  }

  // Inject styles
  injectStyles(transcriptionDialogStyles, 'insight-clip-transcription-styles');

  // Create React root and render dialog
  const root = createRoot(annotationDialogRoot);
  root.render(
    React.createElement(TranscriptionDialog, {
      isOpen: true,
      position: coordinates,
      onSave: handleAnnotationSave,
      onCancel: handleAnnotationCancel,
      maxLength: currentSettings?.text?.maxLength || 500,
    })
  );
}

// Capture screenshot with annotation (ANNOTATION MODE)
async function captureScreenshotWithAnnotation(
  coordinates: { x: number; y: number },
  annotationText: string
): Promise<void> {
  try {
    // First capture the screenshot
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: { coordinates },
    });

    if (response.success && response.dataUrl) {
      // Draw touchpoint icon and annotation text on the screenshot
      const annotatedDataUrl = await drawTouchpointAndAnnotationOnScreenshot(
        response.dataUrl,
        coordinates,
        annotationText
      );

      // Save the annotated screenshot
      const saveData = {
        dataUrl: annotatedDataUrl,
        url: window.location.href,
        timestamp: Date.now(),
        coordinates,
        annotation: annotationText,
        mode: 'annotation',
      };

      const saveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: saveData,
      });

      if (!saveResponse.downloadId) {
        throw new Error(
          saveResponse.error || 'Failed to save annotated screenshot'
        );
      }
    } else {
      throw new Error(response.error || 'Failed to capture screenshot');
    }
  } catch (error) {
    console.error('INSIGHT-CLIP: Screenshot with annotation error:', error);
    throw error;
  }
}

// Export for testing
setupTestExports({
  handleClick,
  showClickFeedback,
  captureScreenshotWithTouchpoint,
  updateCursorState,
  loadSettings,
});
