/**
 * Simplified Content Script for Insight Clip
 * Handles basic click detection and screenshot capture
 */

// Simple state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' = 'snap';
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';

// Add click listener
document.addEventListener('click', handleClick, true);

// Handle click events
function handleClick(event: MouseEvent): void {
  // Only handle Alt+Click when extension is active
  if (!extensionActive) {
    return;
  }
  
  if (!event.altKey) {
    return;
  }

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
      // TODO: Add simple annotation handling
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
    iconImg.src = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
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

// Check if extension context is valid
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// Simple screenshot capture
async function captureScreenshot(coordinates: { x: number; y: number }): Promise<void> {
  try {
    // Check if extension context is still valid
    if (!isExtensionContextValid()) {
      showErrorNotification('Extension needs to be reloaded. Please refresh the page.');
      return;
    }
    
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: { 
        coordinates,
        selectedIcon 
      },
    });

    if (response.success && response.dataUrl) {
      // Check context again before saving
      if (!isExtensionContextValid()) {
        showErrorNotification('Extension context lost during save. Please refresh the page.');
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
    if (error instanceof Error && (
      error.message.includes('Extension context invalidated') ||
      error.message.includes('Could not establish connection') ||
      error.message.includes('The message port closed before a response was received')
    )) {
      showErrorNotification('Extension context lost. Please refresh the page and try again.');
      // Deactivate extension to prevent further errors
      extensionActive = false;
    } else {
      showErrorNotification('Screenshot capture error');
    }
  }
}

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

// Show success notification
function showSuccessNotification(message: string): void {
  showNotification(message, 'success');
}

// Show error notification
function showErrorNotification(message: string): void {
  showNotification(message, 'error');
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

  // Remove after 3 seconds
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

// Add animations and styles
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

// Content script loaded