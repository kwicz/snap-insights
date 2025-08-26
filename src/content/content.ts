// Extension state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' = 'snap';
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';

// Annotation dialog state
let currentAnnotationDialog: HTMLElement | null = null;

// Check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// Handle click events
function handleClick(event: MouseEvent): void {
  // Only handle Alt+Click when extension is active
  if (!extensionActive) {
    return;
  }

  // Both snap and annotate modes require Alt+Click
  if (!event.altKey) {
    return;
  }

  // Use viewport coordinates for both dialog and screenshot
  // Chrome's captureVisibleTab captures only the visible viewport
  const coordinates = {
    x: event.clientX,
    y: event.clientY,
  };

  // Handle based on current mode
  switch (currentMode) {
    case 'snap':
      showClickFeedback(coordinates);
      captureScreenshot(coordinates);
      break;

    case 'annotate':
      showClickFeedback(coordinates);
      showAnnotationDialog(coordinates);
      break;

    case 'transcribe':
      showClickFeedback(coordinates);
      // TODO: Add simple transcription handling
      break;
  }

  event.preventDefault();
  event.stopPropagation();
}

// Show visual feedback at click location
function showClickFeedback(coordinates: { x: number; y: number }): void {
  const marker = document.createElement('div');
  marker.style.cssText = `
    position: fixed;
    left: ${coordinates.x - 32}px;
    top: ${coordinates.y - 32}px;
    width: 64px;
    height: 64px;
    z-index: 999999;
    pointer-events: none;
    animation: pulse 0.6s ease-out;
  `;

  // Add touchpoint icon
  const iconImg = document.createElement('img');

  // Check if extension context is valid before getting URL
  if (isExtensionContextValid()) {
    iconImg.src = chrome.runtime.getURL(
      `assets/icons/touchpoint-${selectedIcon}.png`
    );
  } else {
    // Fallback: create a simple colored circle if extension context is invalid
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.arc(32, 32, 24, 0, 2 * Math.PI);

      // Use proper colors for each icon type
      let fillColor = '#3b82f6'; // default blue
      if (selectedIcon === 'light') {
        fillColor = '#f8fafc'; // light gray/white
      } else if (selectedIcon === 'dark') {
        fillColor = '#1e293b'; // dark gray
      }

      ctx.fillStyle = fillColor;
      ctx.fill();
      ctx.strokeStyle = selectedIcon === 'light' ? '#64748b' : '#ffffff';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    iconImg.src = canvas.toDataURL();
  }

  iconImg.style.cssText = 'width: 64px; height: 64px; display: block;';
  marker.appendChild(iconImg);

  document.body.appendChild(marker);

  // Remove after animation
  setTimeout(() => {
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }, 600);
}

// Show annotation dialog at click location
function showAnnotationDialog(captureCoordinates: {
  x: number;
  y: number;
}): void {
  // Calculate display coordinates (handle viewport boundaries)
  const displayCoordinates = {
    x: Math.min(captureCoordinates.x + 20, window.innerWidth - 320),
    y: Math.max(captureCoordinates.y - 10, 10)
  };
  
  // DEBUG: Log coordinates at click capture
  console.log('DEBUG CONTENT: Click coordinates captured:', {
    clientX: captureCoordinates.x,
    clientY: captureCoordinates.y,
    displayX: displayCoordinates.x,
    displayY: displayCoordinates.y
  });

  // Remove any existing dialog
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
    currentAnnotationDialog = null;
  }

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.className = 'insight-clip-annotation-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: ${displayCoordinates.x}px;
    top: ${displayCoordinates.y}px;
    width: 300px;
    background: #ffffff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    padding: 0;
    overflow: hidden;
  `;

  // Create header with close button
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px 12px 20px;
    border-bottom: 1px solid #f3f4f6;
    background: #fafafa;
  `;

  const title = document.createElement('h3');
  title.textContent = 'Add Annotation';
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  `;

  const closeButton = document.createElement('button');
  closeButton.innerHTML = '&times;';
  closeButton.style.cssText = `
    background: none;
    border: none;
    font-size: 24px;
    color: #6b7280;
    cursor: pointer;
    padding: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    transition: background-color 0.2s;
  `;
  closeButton.onmouseover = () =>
    (closeButton.style.backgroundColor = '#f3f4f6');
  closeButton.onmouseout = () =>
    (closeButton.style.backgroundColor = 'transparent');

  header.appendChild(title);
  header.appendChild(closeButton);

  // Create content area
  const content = document.createElement('div');
  content.style.cssText = `
    padding: 20px;
  `;

  // Create textarea
  const textarea = document.createElement('textarea');
  textarea.placeholder = 'Enter your annotation...';
  textarea.style.cssText = `
    width: 100%;
    height: 80px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    padding: 12px;
    font-family: inherit;
    font-size: 14px;
    color: #1f2937;
    resize: vertical;
    min-height: 60px;
    max-height: 200px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  `;
  textarea.onfocus = () => (textarea.style.borderColor = '#3b82f6');
  textarea.onblur = () => (textarea.style.borderColor = '#d1d5db');

  // Create capture button
  const captureButton = document.createElement('button');
  captureButton.textContent = 'Capture';
  captureButton.style.cssText = `
    width: 100%;
    background: #007AFF;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 16px;
    transition: background-color 0.2s;
  `;
  captureButton.onmouseover = () =>
    (captureButton.style.backgroundColor = '#0056CC');
  captureButton.onmouseout = () =>
    (captureButton.style.backgroundColor = '#007AFF');

  // Assemble dialog
  content.appendChild(textarea);
  content.appendChild(captureButton);
  dialog.appendChild(header);
  dialog.appendChild(content);

  // Add event listeners
  const closeDialog = () => {
    if (currentAnnotationDialog) {
      currentAnnotationDialog.remove();
      currentAnnotationDialog = null;
    }
    // Clean up event listeners
    document.removeEventListener('click', handleOutsideClick, true);
  };

  closeButton.onclick = closeDialog;

  // Close on outside click
  const handleOutsideClick = (event: MouseEvent) => {
    if (!dialog.contains(event.target as Node)) {
      closeDialog();
    }
  };

  // Capture button handler
  captureButton.onclick = async (event: MouseEvent) => {
    event.stopPropagation(); // Prevent triggering outside click handler

    const annotationText = textarea.value.trim();
    if (!annotationText) {
      textarea.focus();
      textarea.style.borderColor = '#ef4444';
      setTimeout(() => (textarea.style.borderColor = '#d1d5db'), 2000);
      return;
    }

    // Remove event listeners first to prevent conflicts
    document.removeEventListener('click', handleOutsideClick, true);
    
    // Completely remove dialog instead of hiding to prevent layout interference
    dialog.remove();
    currentAnnotationDialog = null;
    
    // Wait for DOM to fully update using requestAnimationFrame
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setTimeout(resolve, 50);
        });
      });
    });

    // Use the original click coordinates, not display coordinates
    await captureAnnotatedScreenshot(captureCoordinates, annotationText);

    // Clean up
    closeDialog();
  };

  // Add to page
  document.body.appendChild(dialog);
  currentAnnotationDialog = dialog;

  // Focus textarea
  setTimeout(() => textarea.focus(), 100);

  // Add outside click listener after a brief delay to avoid immediate closure
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick, true);
  }, 200);
}

// Simple screenshot capture
async function captureScreenshot(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      showErrorNotification(
        'Extension needs to be reloaded. Please refresh the page.'
      );
      return;
    }

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
      },
    });

    if (response.success && response.dataUrl) {
      // Check context again before saving
      if (!isExtensionContextValid()) {
        showErrorNotification(
          'Extension context lost during save. Please refresh the page.'
        );
        return;
      }

      // Save screenshot
      const saveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
          mode: currentMode,
        },
      });

      if (saveResponse.downloadId) {
        showSuccessNotification('Screenshot saved successfully!');
      }
    } else {
      showErrorNotification('Failed to capture screenshot');
    }
  } catch (error) {
    // Check if this is a context invalidation error
    if (
      error instanceof Error &&
      (error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes(
          'The message port closed before a response was received'
        ))
    ) {
      showErrorNotification(
        'Extension context lost. Please refresh the page and try again.'
      );
      // Deactivate extension to prevent further errors
      extensionActive = false;
    } else {
      showErrorNotification('Screenshot capture error');
    }
  }
}

// Capture screenshot with annotation
async function captureAnnotatedScreenshot(
  coordinates: { x: number; y: number },
  annotationText: string
): Promise<void> {
  try {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      showErrorNotification(
        'Extension needs to be reloaded. Please refresh the page.'
      );
      return;
    }

    // DEBUG: Log coordinates being sent to background
    console.log('DEBUG CONTENT: Sending coordinates to background:', {
      coordinates,
      selectedIcon,
      annotation: annotationText
    });

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        annotation: annotationText,
      },
    });

    if (response.success && response.dataUrl) {
      // Check context again before saving
      if (!isExtensionContextValid()) {
        showErrorNotification(
          'Extension context lost during save. Please refresh the page.'
        );
        return;
      }

      // Save screenshot
      const saveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
          mode: currentMode,
          annotation: annotationText,
        },
      });

      if (saveResponse.downloadId) {
        showSuccessNotification('Annotated screenshot saved successfully!');
      }
    } else {
      showErrorNotification('Failed to capture screenshot');
    }
  } catch (error) {
    // Check if this is a context invalidation error
    if (
      error instanceof Error &&
      (error.message.includes('Extension context invalidated') ||
        error.message.includes('Could not establish connection') ||
        error.message.includes(
          'The message port closed before a response was received'
        ))
    ) {
      showErrorNotification(
        'Extension context lost. Please refresh the page and try again.'
      );
      // Deactivate extension to prevent further errors
      extensionActive = false;
    } else {
      showErrorNotification('Screenshot capture error');
    }
  }
}

// Show error notification
function showErrorNotification(message: string): void {
  showNotification(message, 'error');
}

// Show success notification
function showSuccessNotification(message: string): void {
  showNotification(message, 'success');
}

// Show notification
function showNotification(message: string, type: 'success' | 'error'): void {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 16px;
    border-radius: 8px;
    color: white;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 999999;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideIn 0.3s ease-out;
    background-color: ${type === 'success' ? '#10b981' : '#ef4444'};
  `;

  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideOut 0.3s ease-in';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }, 3000);
}

// Add click listener
document.addEventListener('click', handleClick, true);

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Check if extension context is valid before processing messages
  if (!isExtensionContextValid()) {
    sendResponse({ error: 'Extension context invalidated' });
    return;
  }

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Content script is alive!' });
      break;

    case 'ACTIVATE_CAPTURE_MODE':
      extensionActive = true;
      currentMode = message.data.mode || 'snap';
      selectedIcon = message.data.selectedIcon || 'blue';
      sendResponse({ success: true });
      break;

    case 'DEACTIVATE_CAPTURE_MODE':
      extensionActive = false;
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
    100% { transform: scale(1); opacity: 0; }
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
