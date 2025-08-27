// Extension state
let extensionActive = false;
let currentMode: 'snap' | 'annotate' | 'transcribe' = 'snap';
let selectedIcon: 'light' | 'blue' | 'dark' = 'blue';

// Annotation dialog state
let currentAnnotationDialog: HTMLElement | null = null;

// Transcription state variables
let currentTranscriptionDialog: HTMLElement | null = null;
let currentMediaRecorder: MediaRecorder | null = null;
let currentRecognition: any = null;
let transcriptionText: string = '';

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
      startTranscription(coordinates);
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
      let fillColor = '#0277C0'; // default blue
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
    y: Math.max(captureCoordinates.y - 10, 10),
  };

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
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
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
    background: #dfedff;
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
    border-radius: 12px;
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
    background: #0277c0;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    margin-top: 16px;
    transition: background-color 0.2s;
  `;
  captureButton.onmouseover = () =>
    (captureButton.style.backgroundColor = '#004e7e');
  captureButton.onmouseout = () =>
    (captureButton.style.backgroundColor = '#0277c0');

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
    await new Promise((resolve) => {
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
      annotation: annotationText,
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

      // Load the font when extension activates
      loadLeagueSpartanFont();

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

// Start transcription process
async function startTranscription(coordinates: {
  x: number;
  y: number;
}): Promise<void> {
  try {
    // Request microphone permission
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        sampleRate: 16000,
      },
    });

    showTranscriptionDialog(coordinates, stream);
  } catch (error: any) {
    if (error.name === 'NotAllowedError') {
      showErrorNotification(
        'Microphone access denied. Please allow microphone access and try again.'
      );
    } else if (error.name === 'NotFoundError') {
      showErrorNotification(
        'No microphone found. Please check your audio device.'
      );
    } else {
      showErrorNotification('Failed to access microphone: ' + error.message);
    }
  }
}

// Show transcription dialog with recording interface
function showTranscriptionDialog(
  captureCoordinates: { x: number; y: number },
  stream: MediaStream
): void {
  // Calculate display coordinates
  const displayCoordinates = {
    x: Math.min(captureCoordinates.x + 20, window.innerWidth - 350),
    y: Math.max(captureCoordinates.y - 10, 10),
  };

  // Remove any existing dialog
  if (currentTranscriptionDialog) {
    stopTranscription();
  }

  // Reset transcription text
  transcriptionText = '';

  // Create dialog container
  const dialog = document.createElement('div');
  dialog.className = 'insight-clip-transcription-dialog';
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
    font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 14px;
    padding: 0;
    overflow: hidden;
  `;

  // Create header
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
  title.textContent = 'Transcription';
  title.style.cssText = `
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
  `;

  // Recording indicator
  const recordingIndicator = document.createElement('div');
  recordingIndicator.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
  `;

  const recordingDot = document.createElement('div');
  recordingDot.style.cssText = `
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 1.5s ease-in-out infinite;
  `;

  const recordingText = document.createElement('span');
  recordingText.textContent = 'Recording...';
  recordingText.style.cssText = `
    font-size: 12px;
    color: #ef4444;
    font-weight: 500;
  `;

  recordingIndicator.appendChild(recordingDot);
  recordingIndicator.appendChild(recordingText);

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

  header.appendChild(title);
  header.appendChild(recordingIndicator);
  header.appendChild(closeButton);

  // Create content area
  const content = document.createElement('div');
  content.style.cssText = `padding: 20px;`;

  // Real-time transcription display
  const transcriptionDisplay = document.createElement('div');
  transcriptionDisplay.style.cssText = `
    min-height: 100px;
    max-height: 200px;
    border: 1px solid #d1d5db;
    border-radius: 12px;
    padding: 12px;
    background: #f9fafb;
    font-size: 14px;
    color: #1f2937;
    overflow-y: auto;
    white-space: pre-wrap;
    line-height: 1.5;
    margin-bottom: 16px;
  `;
  transcriptionDisplay.textContent = 'Start speaking...';

  // Control buttons
  const buttonContainer = document.createElement('div');
  buttonContainer.style.cssText = `
    display: flex;
    gap: 12px;
  `;

  const stopButton = document.createElement('button');
  stopButton.textContent = 'Stop & Save';
  stopButton.style.cssText = `
    flex: 1;
    background: #0277c0;
    color: white;
    border: none;
    border-radius: 12px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  `;
  stopButton.onmouseover = () => (stopButton.style.backgroundColor = '#004e7e');
  stopButton.onmouseout = () => (stopButton.style.backgroundColor = '#0277c0');

  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'Cancel';
  cancelButton.style.cssText = `
    flex: 1;
    background: #6b7280;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 12px 16px;
    font-family: inherit;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  `;

  buttonContainer.appendChild(stopButton);
  buttonContainer.appendChild(cancelButton);

  // Assemble dialog
  content.appendChild(transcriptionDisplay);
  content.appendChild(buttonContainer);
  dialog.appendChild(header);
  dialog.appendChild(content);

  // Event handlers
  const cleanup = () => {
    stopTranscription();
    if (currentTranscriptionDialog) {
      currentTranscriptionDialog.remove();
      currentTranscriptionDialog = null;
    }
  };

  closeButton.onclick = cleanup;
  cancelButton.onclick = cleanup;

  stopButton.onclick = async () => {
    if (transcriptionText.trim()) {
      cleanup();
      await captureTranscribedScreenshot(
        captureCoordinates,
        transcriptionText.trim()
      );
    } else {
      showErrorNotification('No transcription text to save');
    }
  };

  // Add to page
  document.body.appendChild(dialog);
  currentTranscriptionDialog = dialog;

  // Start transcription services
  startWebSpeechRecognition(transcriptionDisplay, stream);
  startMediaRecorder(stream); // Backup audio recording
}

// Web Speech API implementation
function startWebSpeechRecognition(
  display: HTMLElement,
  stream: MediaStream
): void {
  if (!('webkitSpeechRecognition' in window)) {
    showErrorNotification('Speech recognition not supported in this browser');
    return;
  }

  const recognition = new (window as any).webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  let finalTranscript = '';
  let startTime = Date.now();

  recognition.onstart = () => {
    display.textContent = 'Listening...';
  };

  recognition.onresult = (event: any) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript + ' ';
      } else {
        interimTranscript += transcript;
      }
    }

    transcriptionText = finalTranscript + interimTranscript;
    display.textContent = transcriptionText || 'Listening...';

    // Auto-scroll to bottom
    display.scrollTop = display.scrollHeight;
  };

  recognition.onerror = (event: any) => {
    console.error('Speech recognition error:', event.error);
    if (event.error === 'no-speech') {
      display.textContent =
        finalTranscript + '\n[No speech detected - continue speaking]';
    }
  };

  recognition.onend = () => {
    // Auto-restart if dialog is still open (unless manually stopped)
    if (currentTranscriptionDialog && Date.now() - startTime < 300000) {
      // 5 minute max
      setTimeout(() => recognition.start(), 100);
    }
  };

  currentRecognition = recognition;
  recognition.start();
}

// MediaRecorder for audio backup
function startMediaRecorder(stream: MediaStream): void {
  if (!MediaRecorder.isTypeSupported('audio/webm')) {
    console.warn('MediaRecorder not supported');
    return;
  }

  const recorder = new MediaRecorder(stream, {
    mimeType: 'audio/webm',
    audioBitsPerSecond: 128000,
  });

  const audioChunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  recorder.onstop = () => {
    // Audio blob available if needed for future enhancements
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
    console.log('Audio recorded:', audioBlob.size, 'bytes');
  };

  currentMediaRecorder = recorder;
  recorder.start(1000); // Collect data every second
}

// Stop all transcription services
function stopTranscription(): void {
  if (currentRecognition) {
    currentRecognition.stop();
    currentRecognition = null;
  }

  if (currentMediaRecorder && currentMediaRecorder.state === 'recording') {
    currentMediaRecorder.stop();
    currentMediaRecorder = null;
  }

  // Stop all media tracks
  if (currentTranscriptionDialog) {
    const streams = document.querySelectorAll('audio, video');
    streams.forEach((element: any) => {
      if (element.srcObject) {
        element.srcObject
          .getTracks()
          .forEach((track: MediaStreamTrack) => track.stop());
      }
    });
  }
}

// Capture screenshot with transcription
async function captureTranscribedScreenshot(
  coordinates: { x: number; y: number },
  transcriptionText: string
): Promise<void> {
  try {
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
        transcription: transcriptionText,
      },
    });

    if (response.success && response.dataUrl) {
      if (!isExtensionContextValid()) {
        showErrorNotification(
          'Extension context lost during save. Please refresh the page.'
        );
        return;
      }

      const saveResponse = await chrome.runtime.sendMessage({
        type: 'SAVE_SCREENSHOT',
        data: {
          dataUrl: response.dataUrl,
          url: window.location.href,
          timestamp: Date.now(),
          coordinates,
          mode: currentMode,
          transcription: transcriptionText,
        },
      });

      if (saveResponse.downloadId) {
        showSuccessNotification('Transcribed screenshot saved successfully!');
      }
    } else {
      showErrorNotification('Failed to capture screenshot');
    }
  } catch (error) {
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
      extensionActive = false;
    } else {
      showErrorNotification('Screenshot capture error');
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.2); opacity: 0.8; }
    100% { transform: scale(1); opacity: 0; }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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
