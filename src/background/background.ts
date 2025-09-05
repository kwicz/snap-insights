import {
  ExtensionMode,
  ExtensionSettings,
  ScreenshotData,
  ExtensionMessage,
  MarkerColorSettings,
  ActivateExtensionMessage,
  DeactivateExtensionMessage,
} from '../types';
import { ExtensionError } from '../types';

// Font loading utility
async function loadAndCheckFont(): Promise<void> {
  // Create a temporary canvas to check font loading
  const canvas = new OffscreenCanvas(100, 100);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Load the font using FontFace API
  try {
    const font = new FontFace(
      'League Spartan',
      'url(https://fonts.gstatic.com/s/leaguespartan/v11/kJEqBuEW6A0lliaV_m88ja5Tws-Xv8Sic3WG.woff2) format("woff2")',
      {
        weight: '400',
      }
    );

    // Wait for font to load
    await font.load();
    // Add to FontFaceSet
    //@ts-ignore
    if (self.fonts) {
      //@ts-ignore
      self.fonts.add(font);
    }
  } catch (err) {
    console.warn('Failed to load League Spartan font:', err);
  }
}

// Default marker settings
const DEFAULT_MARKER_SETTINGS: MarkerColorSettings = {
  color: '#FF0000',
  opacity: 0.8,
  size: 32,
  style: 'solid',
};

// Draw annotation text next to marker
// function drawAnnotationText(
//   ctx: OffscreenCanvasRenderingContext2D,
//   coordinates: { x: number; y: number },
//   annotation: string,
//   markerSize: number
// ): void {
//   // Set text properties with specific font weight
//   ctx.font =
//     '400 14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
//   ctx.textAlign = 'left';
//   ctx.textBaseline = 'top';

//   // Calculate text position (to the right of the marker)
//   const textX = coordinates.x + markerSize / 2 + 10;
//   const textY = coordinates.y - markerSize / 2;

//   // Measure text to create background
//   const lines = wrapText(annotation, 200); // Max width 200px
//   const lineHeight = 18;
//   const padding = 8;
//   const textWidth = Math.max(
//     ...lines.map((line) => ctx.measureText(line).width)
//   );
//   const textHeight = lines.length * lineHeight;

//   // Draw background rectangle
//   ctx.fillStyle = '#0277c0'; // Updated background color

//   // Create rounded rectangle for background
//   ctx.beginPath();
//   ctx.roundRect(
//     textX - padding,
//     textY - padding,
//     textWidth + padding * 2,
//     textHeight + padding * 2,
//     12 // border radius
//   );
//   ctx.fill();

//   // Draw border with rounded corners
//   ctx.strokeStyle = '#e5e7eb';
//   ctx.lineWidth = 1;
//   ctx.stroke();

//   // Draw text
//   ctx.fillStyle = '#ffffff';
//   lines.forEach((line, index) => {
//     ctx.fillText(line, textX, textY + index * lineHeight);
//   });
// }

// Wrap text to fit within max width
function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    if (testLine.length * 8 > maxWidth && currentLine) {
      // Rough character width estimation
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// Draw transcription text next to marker
// function drawTranscriptionText(
//   ctx: OffscreenCanvasRenderingContext2D,
//   coordinates: { x: number; y: number },
//   transcription: string,
//   markerSize: number
// ): void {
//   // Set text properties with specific font weight
//   ctx.font =
//     '400 14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
//   ctx.textAlign = 'left';
//   ctx.textBaseline = 'top';

//   // Position to the right of the marker (same as annotations)
//   const textX = coordinates.x + markerSize / 2 + 10;
//   const textY = coordinates.y - markerSize / 2;

//   const lines = wrapText(transcription, 250);
//   const lineHeight = 18;
//   const padding = 12;
//   const textWidth = Math.max(
//     ...lines.map((line) => ctx.measureText(line).width)
//   );
//   const textHeight = lines.length * lineHeight;

//   // Draw background with blue styling for transcriptions
//   ctx.fillStyle = '#0277c0'; // Updated background color

//   // Create rounded rectangle for background
//   ctx.beginPath();
//   ctx.roundRect(
//     textX - padding,
//     textY - padding,
//     textWidth + padding * 2,
//     textHeight + padding * 2,
//     12 // border radius
//   );
//   ctx.fill();

//   // Draw border with rounded corners
//   ctx.strokeStyle = '#2563eb';
//   ctx.lineWidth = 2;
//   ctx.stroke();

//   // Add label
//   ctx.fillStyle = '#ffffff';
//   ctx.font =
//     '400 12px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
//   ctx.fillText('TRANSCRIPTION', textX, textY - padding - 18);

//   // Draw transcription text
//   ctx.font =
//     '14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
//   ctx.fillStyle = '#ffffff';
//   lines.forEach((line, index) => {
//     ctx.fillText(line, textX, textY + index * lineHeight);
//   });
// }

function drawTextBox(
  ctx: OffscreenCanvasRenderingContext2D,
  coordinates: { x: number; y: number },
  text: string,
  markerSize: number,
  type: 'annotation' | 'transcription'
): void {
  // Set text properties with specific font weight
  ctx.font =
    '400 14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Position to the right of the marker
  const textX = coordinates.x + markerSize / 2 + 10;
  const textY = coordinates.y - markerSize / 2;

  // Configure styling based on type
  const config = {
    annotation: {
      maxWidth: 200,
      padding: 8,
      backgroundColor: '#0277c0',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      label: null,
    },
    transcription: {
      maxWidth: 250,
      padding: 12,
      backgroundColor: '#0277c0',
      borderColor: '#2563eb',
      borderWidth: 2,
      label: 'TRANSCRIPTION',
    },
  }[type];

  const lines = wrapText(text, config.maxWidth);
  const lineHeight = 18;
  const textWidth = Math.max(
    ...lines.map((line) => ctx.measureText(line).width)
  );
  const textHeight = lines.length * lineHeight;

  // Draw background rectangle
  ctx.fillStyle = config.backgroundColor;
  ctx.beginPath();
  ctx.roundRect(
    textX - config.padding,
    textY - config.padding,
    textWidth + config.padding * 2,
    textHeight + config.padding * 2,
    12
  );
  ctx.fill();

  // Draw border
  ctx.strokeStyle = config.borderColor;
  ctx.lineWidth = config.borderWidth;
  ctx.stroke();

  // Add label if specified (for transcriptions)
  if (config.label) {
    ctx.fillStyle = '#ffffff';
    ctx.font =
      '400 12px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(config.label, textX, textY - config.padding - 18);
  }

  // Draw text
  ctx.font =
    '400 14px "League Spartan", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, textY + index * lineHeight);
  });
}

// Draw marker on screenshot
async function drawMarkerOnScreenshot(
  dataUrl: string,
  coordinates: { x: number; y: number },
  selectedIcon: 'light' | 'blue' | 'dark' = 'blue',
  annotation?: string,
  transcription?: string
): Promise<string> {
  try {
    // Convert data URL to ImageBitmap (works in service worker)
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    // Create a canvas to draw on
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d')!;

    // Draw the screenshot
    ctx.drawImage(imageBitmap, 0, 0);

    // Load the touchpoint icon
    try {
      const iconUrl = chrome.runtime.getURL(
        `assets/icons/touchpoint-${selectedIcon}.png`
      );
      const iconResponse = await fetch(iconUrl);
      const iconBlob = await iconResponse.blob();
      const iconBitmap = await createImageBitmap(iconBlob);

      // Draw the touchpoint icon at the click location (64px size)
      const iconSize = 64;

      // Match content script's showClickFeedback positioning exactly
      const drawX = coordinates.x - 32; // Same as content script: coordinates.x - 32
      const drawY = coordinates.y - 32; // Same as content script: coordinates.y - 32

      ctx.drawImage(iconBitmap, drawX, drawY, iconSize, iconSize);

      // Draw annotation or transcription text if provided
      if (transcription) {
        drawTextBox(ctx, coordinates, transcription, iconSize, 'transcription');
      } else if (annotation) {
        drawTextBox(ctx, coordinates, annotation, iconSize, 'annotation');
      }
    } catch (iconError) {
      // Failed to load touchpoint icon, using fallback circle

      // Fallback: draw a colored circle if icon loading fails
      const size = 32;
      ctx.beginPath();
      ctx.arc(coordinates.x, coordinates.y, size / 2, 0, 2 * Math.PI);
      ctx.fillStyle =
        selectedIcon === 'blue'
          ? '#3b82f6'
          : selectedIcon === 'dark'
          ? '#1f2937'
          : '#f3f4f6';
      ctx.globalAlpha = 0.8;
      ctx.fill();

      // Add white border for visibility
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 1;
      ctx.stroke();

      // Add inner border for better contrast
      ctx.beginPath();
      ctx.arc(coordinates.x, coordinates.y, size / 2, 0, 2 * Math.PI);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Draw annotation text if provided
      if (annotation) {
        drawTextBox(ctx, coordinates, annotation, size, 'annotation');
      }
    }

    // Convert to data URL
    const resultBlob = await canvas.convertToBlob({ type: 'image/png' });
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(resultBlob);
    });
  } catch (error) {
    // If marker drawing fails, return original screenshot
    return dataUrl;
  }
}

interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

interface CaptureData {
  coordinates: { x: number; y: number };
  annotation?: string;
  transcription?: string;
  selectedIcon?: 'light' | 'blue' | 'dark';
}

/**
 * Handle screenshot capture request
 */
export async function handleScreenshotCapture(
  captureData: CaptureData,
  tabId?: number
): Promise<CaptureResult> {
  try {
    // Rate limiting check
    const now = Date.now();
    if (now - lastCaptureTime < MIN_CAPTURE_INTERVAL) {
      return {
        success: false,
        error: 'Please wait a moment before taking another screenshot',
      };
    }
    lastCaptureTime = now;

    // Get active tab if not provided
    const tab = tabId
      ? await chrome.tabs.get(tabId)
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

    if (!tab || !tab.id) {
      return { success: false, error: 'No active tab found' };
    }

    // Capture the visible tab
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });

    // Add marker to screenshot if coordinates are provided
    if (captureData.coordinates && dataUrl) {
      const markedDataUrl = await drawMarkerOnScreenshot(
        dataUrl,
        captureData.coordinates,
        captureData.selectedIcon || 'blue',
        captureData.annotation,
        captureData.transcription
      );
      return { success: true, dataUrl: markedDataUrl };
    }

    return { success: true, dataUrl };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Screenshot capture failed',
    };
  }
}

/**
 * Save screenshot to file
 */
export async function saveScreenshot(
  screenshotData: ScreenshotData
): Promise<{ downloadId: number }> {
  try {
    // Generate filename based on page and timestamp
    const url = new URL(screenshotData.url);
    const timestamp = new Date(screenshotData.timestamp)
      .toISOString()
      .replace(/[:.]/g, '-');
    const filename = `insight-clip_${url.hostname}_${timestamp}.png`;

    // Start download
    const downloadId = await chrome.downloads.download({
      url: screenshotData.dataUrl,
      filename,
      saveAs: false,
    });

    return { downloadId };
  } catch (error) {
    throw new ExtensionError(
      'Failed to save screenshot',
      'storage',
      'save_error',
      { originalError: error }
    );
  }
}

/**
 * Update extension settings
 */
export async function handleSettingsUpdate(
  settings: Partial<ExtensionSettings>
): Promise<void> {
  try {
    // Get current settings
    const { settings: currentSettings } = await chrome.storage.sync.get(
      'settings'
    );

    // Update settings
    const newSettings = { ...currentSettings, ...settings };
    await chrome.storage.sync.set({ settings: newSettings });

    // Update badge if mode changed
    if (settings.mode) {
      await updateBadge(settings.mode);
    }
  } catch (error) {
    throw new ExtensionError(
      'Failed to update settings',
      'storage',
      'settings_error',
      { originalError: error }
    );
  }
}

/**
 * Get current extension settings
 */
export async function handleGetSettings(): Promise<{
  settings: ExtensionSettings;
}> {
  try {
    const { settings } = await chrome.storage.sync.get('settings');

    // Return default settings if none exist
    if (!settings) {
      const defaultSettings: ExtensionSettings = {
        mode: 'snap',
        markerColor: {
          color: '#FF0000',
          opacity: 0.8,
          size: 20,
          style: 'solid',
        },
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

      await chrome.storage.sync.set({ settings: defaultSettings });
      return { settings: defaultSettings };
    }

    return { settings };
  } catch (error) {
    throw new ExtensionError(
      'Failed to get settings',
      'storage',
      'get_settings_error',
      { originalError: error }
    );
  }
}

/**
 * Get storage statistics
 */
export async function handleGetStorageStats(): Promise<{
  stats: { totalScreenshots: number; lastSaved: number | null };
}> {
  try {
    const { screenshots, stats } = await chrome.storage.local.get([
      'screenshots',
      'stats',
    ]);

    const totalScreenshots = screenshots ? Object.keys(screenshots).length : 0;
    const lastSaved = stats?.lastSaved || null;

    return {
      stats: {
        totalScreenshots,
        lastSaved,
      },
    };
  } catch (error) {
    throw new ExtensionError(
      'Failed to get storage stats',
      'storage',
      'get_stats_error',
      { originalError: error }
    );
  }
}

/**
 * Toggle between screenshot and annotation modes
 */
export async function handleModeToggle(): Promise<{ mode: ExtensionMode }> {
  try {
    // Get current settings
    const { settings } = await chrome.storage.sync.get('settings');
    const currentMode = settings?.mode || 'screenshot';

    // Toggle mode
    const newMode: ExtensionMode = currentMode === 'snap' ? 'annotate' : 'snap';

    // Update settings
    await handleSettingsUpdate({ mode: newMode });

    return { mode: newMode };
  } catch (error) {
    throw new ExtensionError(
      'Failed to toggle mode',
      'operation',
      'toggle_error',
      { originalError: error }
    );
  }
}

/**
 * Handle extension activation
 */
export async function handleActivateExtension(data: {
  mode: ExtensionMode;
  selectedIcon: 'light' | 'blue' | 'dark';
}): Promise<{ success: boolean }> {
  try {
    // Load font before activation
    await loadAndCheckFont();

    // Store the current mode and selected icon
    await chrome.storage.local.set({
      currentMode: data.mode,
      selectedIcon: data.selectedIcon,
    });

    // Update badge
    await updateBadge(data.mode);

    // Inject content script into active tab
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab?.id) {
      // Check if tab URL is valid for injection
      if (
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('chrome-extension://') ||
        tab.url?.startsWith('edge://') ||
        tab.url?.startsWith('about:')
      ) {
        throw new Error(
          `Cannot use Snap Mode on system pages like ${tab.url}. Please navigate to a regular website (like google.com) and try again.`
        );
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js'],
        });
      } catch (scriptError) {
        throw scriptError;
      }

      // Wait a bit for script to load
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Test if content script is responsive first
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'PING',
        });
      } catch (pingError) {
        // Content script not responding, but continue anyway
      }

      // Send activation message to content script
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'ACTIVATE_CAPTURE_MODE',
          data: { mode: data.mode, selectedIcon: data.selectedIcon },
        });
      } catch (messageError) {
        throw messageError;
      }
    } else {
      throw new Error('No active tab found');
    }

    return { success: true };
  } catch (error) {
    throw new ExtensionError(
      'Failed to activate extension',
      'operation',
      'activation_error',
      { originalError: error }
    );
  }
}

/**
 * Handle extension deactivation
 */
export async function handleDeactivateExtension(): Promise<{
  success: boolean;
}> {
  try {
    // Store the inactive state
    await chrome.storage.local.set({
      currentMode: null,
      selectedIcon: null,
    });

    // Clear badge
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'SnapInsights' });

    // Send deactivation message to content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'DEACTIVATE_CAPTURE_MODE',
        });
      } catch (error) {
        // Content script might not be injected, ignore error
      }
    }

    return { success: true };
  } catch (error) {
    throw new ExtensionError(
      'Failed to deactivate extension',
      'operation',
      'deactivation_error',
      { originalError: error }
    );
  }
}

/**
 * Handle start capture (legacy support)
 */
export async function handleStartCapture(
  data: { mode: ExtensionMode },
  tabId?: number
): Promise<{ success: boolean }> {
  try {
    // Get the selected icon from storage
    const { selectedIcon } = await chrome.storage.local.get('selectedIcon');

    // Activate extension with the mode and icon
    return await handleActivateExtension({
      mode: data.mode,
      selectedIcon: selectedIcon || 'blue',
    });
  } catch (error) {
    throw new ExtensionError(
      'Failed to start capture',
      'operation',
      'start_capture_error',
      { originalError: error }
    );
  }
}

/**
 * Update extension badge based on mode
 */
export async function updateBadge(mode: ExtensionMode): Promise<void> {
  let text = 'S';
  let title = 'Snap Mode';

  switch (mode) {
    case 'snap':
      text = 'S';
      title = 'Snap Mode';
      break;
    case 'annotate':
      text = 'A';
      title = 'Annotate Mode';
      break;
    case 'transcribe':
      text = 'T';
      title = 'Transcribe Mode';
      break;
    case 'start':
      text = 'J';
      title = 'Journey Mode';
      break;
    default:
      text = 'S';
      title = 'Snap Mode';
  }

  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title });
}

// Keep service worker alive
const PING_INTERVAL = 20000; // 20 seconds

// Rate limiting for screenshot captures
let lastCaptureTime = 0;
const MIN_CAPTURE_INTERVAL = 1000; // 1 second between captures

function keepAlive() {
  // Create an alarm that fires periodically
  chrome.alarms.create('keepAlive', {
    periodInMinutes: 0.5, // Every 30 seconds
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    // Keep the worker alive
  }
});

// Start keepalive
keepAlive();

// Message handling
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Handle different message types
    switch (message.type) {
      case 'TEST_MESSAGE' as any:
        sendResponse({
          success: true,
          message: 'Background script is working!',
        });
        return true;
      case 'CAPTURE_SCREENSHOT':
        // Wrap in try-catch to handle context invalidation
        try {
          // Check if we can still communicate with the sender tab
          if (!sender.tab?.id) {
            sendResponse({ success: false, error: 'No valid tab context' });
            return true;
          }

          handleScreenshotCapture((message as any).data, sender.tab?.id)
            .then(sendResponse)
            .catch((error) => {
              console.error('Screenshot capture error:', error);
              // Check if this is a context invalidation error
              if (
                error.message?.includes('Extension context invalidated') ||
                error.message?.includes('Could not establish connection')
              ) {
                sendResponse({
                  success: false,
                  error:
                    'Extension context invalidated. Please refresh the page and try again.',
                });
              } else {
                sendResponse({ success: false, error: error.message });
              }
            });
        } catch (error) {
          console.error('Message handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        return true; // Keep message channel open for async response

      case 'SAVE_SCREENSHOT':
        try {
          saveScreenshot((message as any).data)
            .then(sendResponse)
            .catch((error) => {
              console.error('Save screenshot error:', error);
              sendResponse({
                success: false,
                error:
                  error instanceof Error
                    ? error.message
                    : 'Failed to save screenshot',
              });
            });
        } catch (error) {
          console.error('Save screenshot handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        return true;

      case 'UPDATE_SETTINGS':
        handleSettingsUpdate((message as any).data)
          .then(() => sendResponse({ success: true }))
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'TOGGLE_MODE':
        handleModeToggle()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'GET_SETTINGS':
        handleGetSettings()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'GET_STORAGE_STATS':
        handleGetStorageStats()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'ACTIVATE_EXTENSION':
        const activateMsg = message as ActivateExtensionMessage;
        handleActivateExtension({
          mode: activateMsg.data.mode,
          selectedIcon: activateMsg.data.selectedIcon,
        })
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'DEACTIVATE_EXTENSION':
        const deactivateMsg = message as DeactivateExtensionMessage;
        handleDeactivateExtension()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'START_CAPTURE':
        handleStartCapture((message as any).data, sender.tab?.id)
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;
    }
  }
);

// Keyboard command handling
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-mode':
      await handleModeToggle();
      break;
    case 'capture-screenshot':
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (tab?.id) {
        await handleScreenshotCapture({ coordinates: { x: 0, y: 0 } }, tab.id);
      }
      break;
  }
});

// Installation handling
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default settings
    const defaultSettings: ExtensionSettings = {
      mode: 'snap',
      markerColor: {
        color: '#FF0000',
        opacity: 0.8,
        size: 5,
        style: 'solid',
      },
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

    await chrome.storage.sync.set({ settings: defaultSettings });

    // Set initial extension state to no mode selected
    await chrome.storage.local.set({
      currentMode: null,
      selectedIcon: 'blue',
    });

    // Clear any badge text (extension starts OFF)
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'SnapInsights' });
  }
});
