import SidebarManager from './sidebar-injector';

console.log('🚀 SnapInsights content script loaded!');

// Extension state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null = null;
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';
let isProcessingJourneyClick = false; // Flag to prevent infinite loops in journey mode
let lastJourneyScreenshotTime = 0; // Rate limiting for journey screenshots

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
    // Prevent infinite loops - skip if we're already processing a journey click
    if (isProcessingJourneyClick) {
      return;
    }

    // Rate limiting - don't capture screenshots too frequently (min 1 second apart)
    const now = Date.now();
    if (now - lastJourneyScreenshotTime < 1000) {
      console.log('⏳ Skipping screenshot - too soon after last capture');
      return;
    }

    console.log(
      '🎯 JOURNEY MODE CLICK DETECTED! User clicked on the page while journey mode is active!',
      {
        clientX: event.clientX,
        clientY: event.clientY,
        target: (event.target as HTMLElement)?.tagName,
        timestamp: new Date().toISOString(),
      }
    );

    // Skip clicks on the extension's own UI elements
    const target = event.target as HTMLElement;
    if (target && (
      target.closest('.snapinsights-sidebar') ||
      target.closest('.insight-clip-input-dialog') ||
      target.id === 'snapinsights-journey-indicator'
    )) {
      console.log('🚫 Skipping click on extension UI');
      return;
    }

    // Update last screenshot time
    lastJourneyScreenshotTime = now;

    // Get coordinates for screenshot
    const coordinates = {
      x: event.clientX,
      y: event.clientY,
    };

    // Capture screenshot in background (don't block the click)
    captureJourneyScreenshot(coordinates);

    // Don't prevent default or re-dispatch - let the click go through naturally
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

    // Show the snap icon at click location BEFORE taking screenshot
    // This ensures the icon is visible in the captured image
    const marker = showPersistentClickFeedback(coordinates);

    // Wait a brief moment for the icon to render
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        mode: 'journey',
      },
    });

    // Remove the icon after screenshot is captured
    setTimeout(() => {
      if (marker && marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }, 500); // Keep it visible for a moment after capture

    if (response.success) {
      console.log('✅ Journey screenshot captured successfully');
    } else {
      // Don't show rate limiting errors to avoid cluttering Extensions errors
      if (response.error?.includes('wait a moment before taking another screenshot')) {
        // Silently handle rate limiting - user will notice from visual feedback
        console.log('⏱️ Screenshot rate limited');
      } else {
        console.error('❌ Journey screenshot failed:', response.error);
      }
    }
  } catch (error) {
    console.error('❌ Journey screenshot error:', error);
  }
}

// Show persistent click feedback that returns the marker element
function showPersistentClickFeedback(coordinates: { x: number; y: number }): HTMLElement {
  const marker = document.createElement('div');
  marker.className = 'snapinsights-click-marker';
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
  `;

  document.body.appendChild(marker);
  return marker;
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
  // Remove any existing dialogs (ensure only one modal at a time)
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
  }
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
    currentTranscriptionDialog = null;
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
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
  `;

  dialog.innerHTML = `
    <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
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
    <div style="padding: 20px; display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-annotation" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; font-family: inherit;">Cancel</button>
      <button id="save-annotation" style="padding: 13px 14px 14px; background: #0277c0; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
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
  dialog.querySelector('#close-dialog')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialog.remove();
    currentAnnotationDialog = null;
  });

  dialog.querySelector('#cancel-annotation')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dialog.remove();
    currentAnnotationDialog = null;
  });

  dialog.querySelector('#save-annotation')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const text = textarea.value.trim();

    // Remove dialog immediately to prevent duplicates
    dialog.remove();
    currentAnnotationDialog = null;

    if (text) {
      await captureScreenshotWithAnnotation(coordinates, text);
    }
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
  // Remove any existing dialogs (ensure only one modal at a time)
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
  }
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
    currentAnnotationDialog = null;
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
    border: none;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 999999;
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    display: flex;
    flex-direction: column;
  `;

  dialog.innerHTML = `
    <div style="padding: 20px; display: flex; justify-content: space-between; align-items: center;">
      <h3 style="margin: 0; font-size: 16px; font-weight: 600; color: #1f2937;">Voice Transcription</h3>
      <button id="close-transcription-dialog" style="background: none; border: none; font-size: 20px; cursor: pointer; color: #6b7280;">&times;</button>
    </div>
    <div style="padding: 20px; flex: 1;">
      <div style="position: relative;">
        <span id="recording-indicator" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); display: inline-block; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; animation: pulse 1.5s infinite; z-index: 1;"></span>
        <textarea id="transcription-text-display" style="padding: 12px 12px 12px 32px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; min-height: 120px; font-size: 14px; color: #374151; white-space: pre-wrap; width: 100%; box-sizing: border-box; resize: vertical; font-family: inherit;" placeholder="Start speaking to record your thoughts..."></textarea>
      </div>
    </div>
    <div style="padding: 20px; display: flex; gap: 12px; justify-content: flex-end;">
      <button id="cancel-transcription" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; border-radius: 6px; cursor: pointer; font-family: inherit;">Cancel</button>
      <button id="save-transcription" style="padding: 13px 14px 14px; background: #0277c0; color: white; border: none; border-radius: 6px; cursor: pointer; font-family: inherit;">Save</button>
    </div>
    <style>
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
      }
    </style>
  `;

  document.body.appendChild(dialog);
  currentTranscriptionDialog = dialog;

  // Event listeners
  const textDisplay = dialog.querySelector(
    '#transcription-text-display'
  ) as HTMLTextAreaElement;
  const recordingIndicator = dialog.querySelector(
    '#recording-indicator'
  ) as HTMLElement;

  // Start recording immediately when dialog opens
  const startRecording = async () => {
    try {
      // Use Web Speech API for real-time transcription
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
            } else {
              interimTranscript += transcript;
            }
          }

          // Update the text display with both final and interim results
          const currentText = textDisplay.value;
          const lastFinalIndex = currentText.lastIndexOf(' ') + 1;
          textDisplay.value = currentText.substring(0, lastFinalIndex) + finalTranscript + interimTranscript;
          transcriptionText = textDisplay.value;
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          // Hide recording indicator on error
          if (recordingIndicator) {
            recordingIndicator.style.display = 'none';
          }
        };

        recognition.onend = () => {
          // Hide recording indicator when stopped
          if (recordingIndicator) {
            recordingIndicator.style.display = 'none';
          }
        };

        recognition.start();
        currentRecognition = recognition;

      } else {
        // Fallback to MediaRecorder if Speech Recognition is not available
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
          textDisplay.value = 'Audio recorded (transcription not available in this browser)';
          transcriptionText = textDisplay.value;
          stream.getTracks().forEach((track) => track.stop());
          // Hide recording indicator when stopped
          if (recordingIndicator) {
            recordingIndicator.style.display = 'none';
          }
        };

        mediaRecorder.start();
      }
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // Hide recording indicator on error
      if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
      }
      textDisplay.placeholder = 'Error: Could not access microphone';
    }
  };

  // Start recording automatically
  startRecording();

  dialog
    .querySelector('#close-transcription-dialog')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });

  dialog
    .querySelector('#cancel-transcription')
    ?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });

  dialog.querySelector('#save-transcription')?.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const transcriptionToSave = textDisplay.value.trim() || transcriptionText;

    // Stop and remove dialog immediately
    stopTranscription();
    dialog.remove();
    currentTranscriptionDialog = null;

    if (transcriptionToSave) {
      await captureScreenshotWithTranscription(captureCoordinates, transcriptionToSave);
    }
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
  if (currentRecognition) {
    currentRecognition.stop();
    currentRecognition = null;
  }

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
