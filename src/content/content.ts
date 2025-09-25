import SidebarManager from './sidebar-injector';

console.log('🚀 SnapInsights content script loaded!');

// Extension state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null = null;
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';

// Sidebar instance
let sidebarManager: SidebarManager | null = null;

// Annotation dialog state
let currentAnnotationDialog: HTMLElement | null = null;

// Transcription state variables
let currentTranscriptionDialog: HTMLElement | null = null;
let currentMediaRecorder: MediaRecorder | null = null;
let currentRecognition: any = null;
let currentMediaStream: MediaStream | null = null;
let transcriptionText: string = '';
let isManualStop = false;

// Add this function to load the Google Font
function loadLeagueSpartanFont(): void {
  // Check if font is already loaded
  if (document.querySelector('#insight-clip-font-loader')) {
    return;
  }

  // Create and inject Google Fonts link
  const fontLink = document.createElement('link');
  fontLink.id = 'insight-clip-font-loader';
  fontLink.href =
    'https://fonts.googleapis.com/css2?family=League+Spartan:wght@300;400;500;600;700&display=swap';
  fontLink.rel = 'stylesheet';
  fontLink.type = 'text/css';

  document.head.appendChild(fontLink);
}

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
  console.log('🖱️ Click detected', {
    extensionActive,
    currentMode,
    altKey: event.altKey,
  });

  // Only handle clicks when extension is active and a mode is selected
  if (!extensionActive || !currentMode) {
    console.log('❌ Extension not active or no mode selected');
    return;
  }

  // Journey mode captures ANY click, other modes require Alt+Click
  if (currentMode === 'start') {
    console.log(
      '🎯 JOURNEY MODE CLICK DETECTED! User clicked on the page while journey mode is active!',
      {
        clientX: event.clientX,
        clientY: event.clientY,
        target: (event.target as HTMLElement)?.tagName,
        timestamp: new Date().toISOString(),
      }
    );

    // Skip clicks on the extension's own sidebar
    const target = event.target as HTMLElement;
    if (target && target.closest('.snapinsights-sidebar')) {
      console.log('🚫 Skipping click on extension sidebar');
      return;
    }

    // Prevent the original action temporarily
    event.preventDefault();
    event.stopPropagation();

    // Get coordinates for screenshot
    const coordinates = {
      x: event.clientX,
      y: event.clientY,
    };

    // Capture screenshot in background
    captureJourneyScreenshot(coordinates);

    // Execute the original action after a short delay
    setTimeout(() => {
      const newEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        clientX: event.clientX,
        clientY: event.clientY,
        button: event.button,
        buttons: event.buttons,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
        metaKey: event.metaKey,
      });
      target.dispatchEvent(newEvent);
    }, 50);

    return;
  }

  // Other modes require Alt+Click
  if (!event.altKey) {
    return;
  }

  // Use viewport coordinates for both dialog and screenshot
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
      startTranscription(coordinates);
      break;
  }

  event.preventDefault();
  event.stopPropagation();
}

// Capture journey screenshot
async function captureJourneyScreenshot(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    console.log('📸 Capturing journey screenshot...');

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        mode: 'journey',
      },
    });

    if (response.success) {
      console.log('✅ Journey screenshot captured successfully');
    } else {
      console.error('❌ Journey screenshot failed:', response.error);
    }
  } catch (error) {
    console.error('❌ Journey screenshot error:', error);
  }
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
    pointer-events: none;
    z-index: 999999;
    background-image: url('${chrome.runtime.getURL(
      `assets/icons/touchpoint-${selectedIcon}.png`
    )}');
    background-size: contain;
    background-repeat: no-repeat;
    animation: fadeInOut 1s ease-in-out;
  `;

  // Add CSS animation if not already present
  if (!document.querySelector('#insight-clip-animations')) {
    const style = document.createElement('style');
    style.id = 'insight-clip-animations';
    style.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: scale(0.5); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 0; transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  document.body.appendChild(marker);

  // Remove marker after animation
  setTimeout(() => {
    if (marker.parentNode) {
      marker.parentNode.removeChild(marker);
    }
  }, 1000);
}

// Capture screenshot
async function captureScreenshot(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
      },
    });

    if (response.success && response.dataUrl) {
      // Save screenshot
      await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
        },
      });
    }
  } catch (error) {
    console.error('Screenshot capture failed:', error);
  }
}

// Show annotation dialog
function showAnnotationDialog(coordinates: { x: number; y: number }): void {
  // Remove any existing dialog
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
  }

  const dialog = document.createElement('div');
  dialog.className = 'insight-clip-input-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: ${Math.min(coordinates.x + 20, window.innerWidth - 320)}px;
    top: ${Math.min(coordinates.y + 20, window.innerHeight - 200)}px;
    width: 300px;
    min-height: 200px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
  `;

  dialog.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">Add Annotation</h3>
      <button id="close-dialog" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">&times;</button>
    </div>
    <div style="padding: 20px; flex: 1;">
      <textarea 
        id="annotation-text" 
        placeholder="Enter your annotation here..." 
        style="width: 100%; height: 100px; border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; font-family: inherit; font-size: 14px; resize: vertical; outline: none;"
      ></textarea>
    </div>
    <div style="padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-annotation" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; font-family: inherit;">Cancel</button>
      <button id="save-annotation" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
    </div>
  `;

  document.body.appendChild(dialog);
  currentAnnotationDialog = dialog;

  // Focus textarea
  const textarea = dialog.querySelector(
    '#annotation-text'
  ) as HTMLTextAreaElement;
  textarea.focus();

  // Event listeners
  dialog.querySelector('#close-dialog')?.addEventListener('click', () => {
    dialog.remove();
    currentAnnotationDialog = null;
  });

  dialog.querySelector('#cancel-annotation')?.addEventListener('click', () => {
    dialog.remove();
    currentAnnotationDialog = null;
  });

  dialog.querySelector('#save-annotation')?.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (text) {
      captureScreenshotWithAnnotation(coordinates, text);
    }
    dialog.remove();
    currentAnnotationDialog = null;
  });

  // Close on escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dialog.remove();
      currentAnnotationDialog = null;
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

// Capture screenshot with annotation
async function captureScreenshotWithAnnotation(
  coordinates: { x: number; y: number },
  annotation: string
): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        annotation,
      },
    });

    if (response.success && response.dataUrl) {
      // Save screenshot with annotation
      await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
          annotation,
        },
      });
    }
  } catch (error) {
    console.error('Screenshot capture with annotation failed:', error);
  }
}

// Add click listener
document.addEventListener('click', handleClick, true);

// Handle messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 Content script received message:', message.type);

  // Check if extension context is valid before processing messages
  if (!isExtensionContextValid()) {
    sendResponse({ error: 'Extension context invalidated' });
    return;
  }

  switch (message.type) {
    case 'PING':
      sendResponse({ success: true, message: 'Content script is alive!' });
      break;

    case 'ACTIVATE_EXTENSION':
      extensionActive = true;
      currentMode = message.data.mode || null;
      selectedIcon = message.data.selectedIcon || 'blue';

      // Load the font when extension activates
      loadLeagueSpartanFont();

      sendResponse({ success: true });
      break;

    case 'DEACTIVATE_EXTENSION':
      extensionActive = false;
      sendResponse({ success: true });
      break;

    case 'START_JOURNEY':
      console.log('📨 Received START_JOURNEY message in content script');
      extensionActive = true;
      currentMode = 'start';
      selectedIcon = 'blue';

      // Load the font when journey mode starts
      loadLeagueSpartanFont();

      console.log('🎯 Journey mode started successfully');
      sendResponse({ success: true });
      break;

    case 'STOP_JOURNEY':
      console.log('📨 Received STOP_JOURNEY message in content script');
      extensionActive = false;
      currentMode = null;
      console.log('🎯 Journey mode stopped');
      sendResponse({ success: true });
      break;

    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Start transcription process
async function startTranscription(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  showTranscriptionDialog(coordinates);
}

// Show transcription dialog with recording interface
async function showTranscriptionDialog(captureCoordinates: {
  x: number;
  y: number;
}): Promise<void> {
  // Remove any existing dialog
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
  }

  const dialog = document.createElement('div');
  dialog.className = 'insight-clip-input-dialog';
  dialog.style.cssText = `
    position: fixed;
    left: ${Math.min(captureCoordinates.x + 20, window.innerWidth - 320)}px;
    top: ${Math.min(captureCoordinates.y + 20, window.innerHeight - 200)}px;
    width: 300px;
    min-height: 200px;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    z-index: 999999;
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
  `;

  dialog.innerHTML = `
    <div style="padding: 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">Voice Transcription</h3>
      <button id="close-transcription-dialog" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">&times;</button>
    </div>
    <div style="padding: 20px; flex: 1;">
      <div id="transcription-status" style="text-align: center; margin-bottom: 20px; color: #6b7280;">
        Click the microphone to start recording
      </div>
      <div id="transcription-controls" style="text-align: center;">
        <button id="start-recording" style="padding: 12px 24px; background: #ef4444; color: white; border: none; border-radius: 50px; cursor: pointer; font-family: inherit; font-size: 16px; display: flex; align-items: center; gap: 8px; margin: 0 auto;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
          Start Recording
        </button>
        <button id="stop-recording" style="padding: 12px 24px; background: #6b7280; color: white; border: none; border-radius: 50px; cursor: pointer; font-family: inherit; font-size: 16px; display: none; align-items: center; gap: 8px; margin: 0 auto;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2"/>
          </svg>
          Stop Recording
        </button>
      </div>
      <div id="transcription-text-display" style="margin-top: 20px; padding: 12px; background: #f9fafb; border-radius: 6px; min-height: 60px; font-size: 14px; color: #374151; white-space: pre-wrap;"></div>
    </div>
    <div style="padding: 20px; border-top: 1px solid #e5e7eb; display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-transcription" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; font-family: inherit;">Cancel</button>
      <button id="save-transcription" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
    </div>
  `;

  document.body.appendChild(dialog);
  currentTranscriptionDialog = dialog;

  // Event listeners
  const startButton = dialog.querySelector(
    '#start-recording'
  ) as HTMLButtonElement;
  const stopButton = dialog.querySelector(
    '#stop-recording'
  ) as HTMLButtonElement;
  const statusDiv = dialog.querySelector(
    '#transcription-status'
  ) as HTMLDivElement;
  const textDisplay = dialog.querySelector(
    '#transcription-text-display'
  ) as HTMLDivElement;

  startButton.addEventListener('click', async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      currentMediaStream = stream;

      const mediaRecorder = new MediaRecorder(stream);
      currentMediaRecorder = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // For now, just show the audio URL
        textDisplay.textContent = `Audio recorded: ${audioUrl}`;
        transcriptionText = textDisplay.textContent;

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();

      startButton.style.display = 'none';
      stopButton.style.display = 'flex';
      statusDiv.textContent = 'Recording... Click stop when finished';
    } catch (error) {
      console.error('Error accessing microphone:', error);
      statusDiv.textContent = 'Error: Could not access microphone';
    }
  });

  stopButton.addEventListener('click', () => {
    if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
      currentMediaRecorder.stop();
      stopButton.style.display = 'none';
      startButton.style.display = 'flex';
      statusDiv.textContent = 'Recording stopped. Click save to continue.';
    }
  });

  dialog
    .querySelector('#close-transcription-dialog')
    ?.addEventListener('click', () => {
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });

  dialog
    .querySelector('#cancel-transcription')
    ?.addEventListener('click', () => {
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });

  dialog.querySelector('#save-transcription')?.addEventListener('click', () => {
    if (transcriptionText) {
      captureScreenshotWithTranscription(captureCoordinates, transcriptionText);
    }
    stopTranscription();
    dialog.remove();
    currentTranscriptionDialog = null;
  });

  // Close on escape key
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
}

// Stop transcription and clean up
function stopTranscription(): void {
  if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
    currentMediaRecorder.stop();
  }

  if (currentMediaStream) {
    currentMediaStream.getTracks().forEach((track) => track.stop());
    currentMediaStream = null;
  }

  currentMediaRecorder = null;
  transcriptionText = '';
}

// Capture screenshot with transcription
async function captureScreenshotWithTranscription(
  coordinates: { x: number; y: number },
  transcription: string
): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        transcription,
      },
    });

    if (response.success && response.dataUrl) {
      // Save screenshot with transcription
      await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
          transcription,
        },
      });
    }
  } catch (error) {
    console.error('Screenshot capture with transcription failed:', error);
  }
}

// Initialize sidebar manager
if (!sidebarManager) {
  // Check if there's already a global instance
  if (window.snapInsightsSidebarManager) {
    console.log('SnapInsights: Reusing existing global sidebar manager');
    sidebarManager = window.snapInsightsSidebarManager;
  } else {
    // Check if there's already a sidebar in the DOM from a previous instance
    const existingSidebar = document.querySelector('.snapinsights-sidebar');
    if (existingSidebar) {
      console.log(
        'SnapInsights: Found existing sidebar in DOM, creating manager to reuse it'
      );
    }
    sidebarManager = new SidebarManager();
    console.log('SnapInsights: Sidebar manager created');
  }
} else {
  console.log('SnapInsights: Sidebar manager already exists, reusing instance');
}

// Make sidebar manager globally available
window.snapInsightsSidebarManager = sidebarManager;

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
  }
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
  }
});
