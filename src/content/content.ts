import SidebarManager from './sidebar-injector';

console.log('🚀 SNAP-INSIGHTS: Content script loaded!', {
  timestamp: new Date().toISOString(),
  url: window.location.href,
});

// Extension state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null = null;
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';
let isProcessingJourneyClick = false; // Flag to prevent infinite loops in journey mode
let lastJourneyScreenshotTime = 0; // Rate limiting for journey screenshots

// Initialize extension state from storage
(async () => {
  try {
    const result = await chrome.storage.local.get(['currentMode', 'selectedIcon']);
    if (result.currentMode) {
      currentMode = result.currentMode;
      extensionActive = true;
      console.log('🔄 Restored extension state from storage:', {
        mode: currentMode,
        icon: result.selectedIcon,
      });
    }
    if (result.selectedIcon) {
      selectedIcon = result.selectedIcon;
    }
  } catch (error) {
    console.error('Failed to initialize extension state:', error);
  }
})();

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
  console.log('🖱️ SNAP-INSIGHTS: Click detected', {
    extensionActive,
    currentMode,
    altKey: event.altKey,
    timestamp: new Date().toISOString(),
  });

  // Only handle clicks when extension is active and a mode is selected
  if (!extensionActive || !currentMode) {
    console.log('❌ Extension not active or no mode selected');
    return;
  }

  // Skip clicks on the extension's own UI elements (applies to ALL modes)
  const target = event.target as HTMLElement;
  if (
    target &&
    (target.closest('.snapinsights-sidebar') ||
      target.closest('.insight-clip-input-dialog') ||
      target.id === 'snapinsights-journey-indicator')
  ) {
    console.log('🚫 Skipping click on extension UI');
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
      // Don't show feedback here - it will be shown when screenshot is captured
      showAnnotationDialog(coordinates);
      break;

    case 'transcribe':
      // Don't show feedback here - it will be shown when screenshot is captured
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

    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error('❌ Extension context invalidated - please reload the page');
      return;
    }

    // Show the snap icon at click location BEFORE taking screenshot
    // This ensures the icon is visible in the captured image
    const marker = showPersistentClickFeedback(coordinates);

    // Wait a brief moment for the icon to render
    await new Promise((resolve) => setTimeout(resolve, 100));

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
      if (
        response.error?.includes(
          'wait a moment before taking another screenshot'
        )
      ) {
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
function showPersistentClickFeedback(coordinates: {
  x: number;
  y: number;
}): HTMLElement {
  const marker = document.createElement('div');
  marker.className = 'snapinsights-click-marker';

  // Check if extension context is valid before accessing chrome.runtime
  let iconUrl = '';
  if (isExtensionContextValid()) {
    try {
      iconUrl = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
    } catch (error) {
      console.error('Failed to get icon URL:', error);
    }
  }

  marker.style.cssText = `
    position: fixed;
    left: ${coordinates.x - 32}px;
    top: ${coordinates.y - 32}px;
    width: 64px;
    height: 64px;
    pointer-events: none;
    z-index: 999999;
    ${iconUrl ? `background-image: url('${iconUrl}');` : ''}
    background-size: contain;
    background-repeat: no-repeat;
  `;

  document.body.appendChild(marker);
  return marker;
}

// Show visual feedback at click location
function showClickFeedback(coordinates: { x: number; y: number }): void {
  const marker = document.createElement('div');

  // Check if extension context is valid before accessing chrome.runtime
  let iconUrl = '';
  if (isExtensionContextValid()) {
    try {
      iconUrl = chrome.runtime.getURL(`assets/icons/touchpoint-${selectedIcon}.png`);
    } catch (error) {
      console.error('Failed to get icon URL:', error);
    }
  }

  marker.style.cssText = `
    position: fixed;
    left: ${coordinates.x - 32}px;
    top: ${coordinates.y - 32}px;
    width: 64px;
    height: 64px;
    pointer-events: none;
    z-index: 999999;
    ${iconUrl ? `background-image: url('${iconUrl}');` : ''}
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
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error('❌ Extension context invalidated - please reload the page');
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

  // Check existing dialogs before creating new one
  const existingDialogs = document.querySelectorAll('.insight-clip-input-dialog');

  // Remove any existing dialogs (ensure only one modal at a time)
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
    currentAnnotationDialog = null;
  }
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
    currentTranscriptionDialog = null;
  }

  // Force remove any orphaned dialogs
  const allExistingDialogs = document.querySelectorAll('.insight-clip-input-dialog');
  if (allExistingDialogs.length > 0) {
    allExistingDialogs.forEach((dialog, index) => {
      dialog.remove();
    });
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
    <div style="padding: 20px; display: flex; gap: 12px; justify-content: center; flex-direction: row-reverse;">
      <button id="cancel-annotation" style="padding: 12px 24px; border: none; background: white; color: #0277c0; border-radius: 14px; cursor: pointer; font-family: 'League Spartan', sans-serif; font-size: 15px; font-weight: 800; transition: all 0.2s ease;" onmouseover="this.style.background='#dfedff'; this.style.borderColor='#dfedff';" onmouseout="this.style.background='white'; this.style.borderColor='white';">Cancel</button>
      <button id="save-annotation" type="button" style="padding: 12px 24px; background: #0277c0; color: white; border: none; border-radius: 14px; cursor: pointer; font-family: 'League Spartan', sans-serif; font-size: 15px; font-weight: 800; pointer-events: auto; transition: all 0.2s ease;">Save</button>
    </div>
  `;

  document.body.appendChild(dialog);
  currentAnnotationDialog = dialog;

  // Verify dialog was added correctly
  const dialogsAfterCreation = document.querySelectorAll('.insight-clip-input-dialog');

  // Focus textarea
  const textarea = dialog.querySelector(
    '#annotation-text'
  ) as HTMLTextAreaElement;
  textarea.focus();

  // Check if elements exist before adding event listeners
  const saveButton = dialog.querySelector('#save-annotation');
  const cancelButton = dialog.querySelector('#cancel-annotation');
  const closeButton = dialog.querySelector('#close-dialog');



  // Event listeners using direct element references
  if (closeButton) {
    closeButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dialog.remove();
      currentAnnotationDialog = null;
    });
  }

  if (cancelButton) {
    cancelButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dialog.remove();
      currentAnnotationDialog = null;
    });
  }

  if (saveButton) {

    // Use both click and mousedown events as backup
    const handleSave = async (e: Event) => {

      e.preventDefault();
      e.stopPropagation();

      const text = textarea.value.trim();

      try {
        // Remove dialog immediately to prevent it from being in the screenshot

        if (dialog && dialog.parentNode) {

          // Try both removal methods for reliability
          try {
            dialog.remove();
          } catch (error) {
            try {
              dialog.parentNode.removeChild(dialog);
            } catch (error2) {
            }
          }

          // Double-check if dialog is actually removed
          setTimeout(() => {
            const allDialogs = document.querySelectorAll('.insight-clip-input-dialog');

            // Force remove if still present
            if (document.body.contains(dialog)) {
              try {
                dialog.style.display = 'none';
                dialog.parentNode?.removeChild(dialog);
              } catch (error) {
              }
            }
          }, 50);

        } else {
        }

        currentAnnotationDialog = null;

        // Always capture screenshot with annotation, even if text is empty
        // Wait a moment for dialog to be completely removed from DOM
        await new Promise((resolve) => setTimeout(resolve, 100));
        await captureScreenshotWithAnnotation(coordinates, text);
      } catch (error) {
        // Even if there's an error, try to remove the dialog
        if (dialog && dialog.parentNode) {
          dialog.remove();
          currentAnnotationDialog = null;
        }
      }
    };

    // Add both click and mousedown event listeners
    saveButton.addEventListener('click', handleSave, true);
    saveButton.addEventListener('mousedown', (e) => {
    });

    // Also try adding a direct onclick handler as fallback
    (saveButton as HTMLButtonElement).onclick = handleSave;
  } else {
  }

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
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error('❌ Extension context invalidated - please reload the page');
      return;
    }

    // Debug: Log coordinates and screen info
    console.log('🔧 ANNOTATION CAPTURE DEBUG:', {
      coordinates,
      annotation,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      isRightSide: coordinates.x > window.innerWidth / 2
    });

    // Check dialogs before showing marker
    const dialogsBeforeMarker = document.querySelectorAll('.insight-clip-input-dialog');

    // Show the touchpoint marker at click location BEFORE taking screenshot
    // This ensures the touchpoint is visible in the captured image (like journey mode)
    const marker = showPersistentClickFeedback(coordinates);

    // Check dialogs after showing marker
    const dialogsAfterMarker = document.querySelectorAll('.insight-clip-input-dialog');

    // Wait a brief moment for the marker to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        annotation,
      },
    });


    // Remove the marker after screenshot is captured
    setTimeout(() => {
      if (marker && marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }, 500);

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
  console.log(
    '📨 SNAP-INSIGHTS: Content script received message:',
    message.type,
    message
  );

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

      console.log('🎯 SNAP-INSIGHTS: Extension activated!', {
        mode: currentMode,
        icon: selectedIcon,
        active: extensionActive,
      });

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

  // Check existing dialogs before creating new one
  const existingDialogs = document.querySelectorAll('.insight-clip-input-dialog');

  // Remove any existing dialogs (ensure only one modal at a time)
  if (currentTranscriptionDialog) {
    stopTranscription();
    currentTranscriptionDialog.remove();
    currentTranscriptionDialog = null;
  }
  if (currentAnnotationDialog) {
    currentAnnotationDialog.remove();
    currentAnnotationDialog = null;
  }

  // Force remove any orphaned dialogs
  const allExistingDialogs = document.querySelectorAll('.insight-clip-input-dialog');
  if (allExistingDialogs.length > 0) {
    allExistingDialogs.forEach((dialog, index) => {
      dialog.remove();
    });
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
    <div style="padding: 20px; display: flex; gap: 12px; justify-content: center; flex-direction: row-reverse;">
      <button id="cancel-transcription" style="padding: 12px 24px; border: none; background: white; color: #0277c0; border-radius: 14px; cursor: pointer; font-family: 'League Spartan', sans-serif; font-size: 15px; font-weight: 800; transition: all 0.2s ease;" onmouseover="this.style.background='#dfedff'; this.style.borderColor='#dfedff';" onmouseout="this.style.background='white'; this.style.borderColor='white';">Cancel</button>
      <button id="save-transcription" type="button" style="padding: 12px 24px; background: #0277c0; color: white; border: none; border-radius: 14px; cursor: pointer; font-family: 'League Spartan', sans-serif; font-size: 15px; font-weight: 800; pointer-events: auto; transition: all 0.2s ease;">Save</button>
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

  // Verify dialog was added correctly
  const dialogsAfterTranscriptionCreation = document.querySelectorAll('.insight-clip-input-dialog');

  // Event listeners
  const textDisplay = dialog.querySelector(
    '#transcription-text-display'
  ) as HTMLTextAreaElement;
  const recordingIndicator = dialog.querySelector(
    '#recording-indicator'
  ) as HTMLElement;

  // Get button references for debugging
  const saveTranscriptionButton = dialog.querySelector('#save-transcription');
  const cancelTranscriptionButton = dialog.querySelector(
    '#cancel-transcription'
  );
  const closeTranscriptionButton = dialog.querySelector(
    '#close-transcription-dialog'
  );



  // Start recording immediately when dialog opens
  const startRecording = async () => {
    try {

      // Use Web Speech API for real-time transcription
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
        };

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
          textDisplay.value =
            currentText.substring(0, lastFinalIndex) +
            finalTranscript +
            interimTranscript;
          transcriptionText = textDisplay.value;
        };

        recognition.onerror = (event: any) => {
          // Hide recording indicator on error
          if (recordingIndicator) {
            recordingIndicator.style.display = 'none';
          }
          textDisplay.placeholder = `Error: ${event.error}`;
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
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        currentMediaStream = stream;

        const mediaRecorder = new MediaRecorder(stream);
        currentMediaRecorder = mediaRecorder;

        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          textDisplay.value =
            'Audio recorded (transcription not available in this browser)';
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
      // Hide recording indicator on error
      if (recordingIndicator) {
        recordingIndicator.style.display = 'none';
      }
      textDisplay.placeholder =
        'Error: Could not access microphone. Please check permissions.';
    }
  };

  // Start recording automatically
  startRecording();

  // Event listeners using direct element references
  if (closeTranscriptionButton) {
    closeTranscriptionButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });
  }

  if (cancelTranscriptionButton) {
    cancelTranscriptionButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      stopTranscription();
      dialog.remove();
      currentTranscriptionDialog = null;
    });
  }

  if (saveTranscriptionButton) {

    // Use both click and mousedown events as backup
    const handleTranscriptionSave = async (e: Event) => {

      e.preventDefault();
      e.stopPropagation();

      const transcriptionToSave = textDisplay.value.trim() || transcriptionText;

      try {
        // Stop and remove dialog immediately to prevent it from being in the screenshot

        stopTranscription();

        if (dialog && dialog.parentNode) {

          // Try both removal methods for reliability
          try {
            dialog.remove();
          } catch (error) {
            try {
              dialog.parentNode.removeChild(dialog);
            } catch (error2) {
            }
          }

          // Double-check if dialog is actually removed
          setTimeout(() => {
            const allDialogs = document.querySelectorAll('.insight-clip-input-dialog');

            // Force remove if still present
            if (document.body.contains(dialog)) {
              try {
                dialog.style.display = 'none';
                dialog.parentNode?.removeChild(dialog);
              } catch (error) {
              }
            }
          }, 50);

        } else {
        }

        currentTranscriptionDialog = null;

        // Always capture screenshot with transcription, even if text is empty
        // Wait a moment for dialog to be completely removed from DOM
        await new Promise((resolve) => setTimeout(resolve, 100));
        await captureScreenshotWithTranscription(
          captureCoordinates,
          transcriptionToSave
        );
      } catch (error) {
        // Even if there's an error, try to remove the dialog
        if (dialog && dialog.parentNode) {
          dialog.remove();
          currentTranscriptionDialog = null;
        }
      }
    };

    // Add both click and mousedown event listeners
    saveTranscriptionButton.addEventListener('click', handleTranscriptionSave, true);
    saveTranscriptionButton.addEventListener('mousedown', (e) => {
    });

    // Also try adding a direct onclick handler as fallback
    (saveTranscriptionButton as HTMLButtonElement).onclick = handleTranscriptionSave;
  } else {
  }

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
    // Check if extension context is valid
    if (!isExtensionContextValid()) {
      console.error('❌ Extension context invalidated - please reload the page');
      return;
    }

    // Show the touchpoint marker at click location BEFORE taking screenshot
    // This ensures the touchpoint is visible in the captured image (like journey mode)
    const marker = showPersistentClickFeedback(coordinates);

    // Wait a brief moment for the marker to render
    await new Promise((resolve) => setTimeout(resolve, 100));

    const response = await chrome.runtime.sendMessage({
      type: 'CAPTURE_SCREENSHOT',
      data: {
        coordinates,
        selectedIcon,
        transcription,
      },
    });

    // Remove the marker after screenshot is captured
    setTimeout(() => {
      if (marker && marker.parentNode) {
        marker.parentNode.removeChild(marker);
      }
    }, 500);

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
