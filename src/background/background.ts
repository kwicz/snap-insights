import {
  ExtensionMode,
  ExtensionSettings,
  ScreenshotData,
  ExtensionMessage,
} from '../types';
import { ExtensionError } from '../types';

interface CaptureResult {
  success: boolean;
  dataUrl?: string;
  error?: string;
}

interface CaptureData {
  coordinates: { x: number; y: number };
  annotation?: string;
}

/**
 * Handle screenshot capture request
 */
export async function handleScreenshotCapture(
  captureData: CaptureData,
  tabId?: number
): Promise<CaptureResult> {
  try {
    // Get active tab if not provided
    const tab = tabId
      ? await chrome.tabs.get(tabId)
      : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

    if (!tab || !tab.id) {
      return { success: false, error: 'No active tab found' };
    }

    // Capture screenshot
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
      format: 'png',
    });

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
export async function handleGetSettings(): Promise<{ settings: ExtensionSettings }> {
  try {
    const { settings } = await chrome.storage.sync.get('settings');
    
    // Return default settings if none exist
    if (!settings) {
      const defaultSettings: ExtensionSettings = {
        mode: 'screenshot',
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
export async function handleGetStorageStats(): Promise<{ stats: { totalScreenshots: number; lastSaved: number | null } }> {
  try {
    const { screenshots, stats } = await chrome.storage.local.get(['screenshots', 'stats']);
    
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
    const newMode: ExtensionMode =
      currentMode === 'screenshot' ? 'annotation' : 'screenshot';

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
 * Update extension badge based on mode
 */
export async function updateBadge(mode: ExtensionMode): Promise<void> {
  const text = mode === 'screenshot' ? 'S' : 'A';
  const title = mode === 'screenshot' ? 'Screenshot Mode' : 'Annotation Mode';

  await chrome.action.setBadgeText({ text });
  await chrome.action.setTitle({ title });
}

// Message handling
chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Handle different message types
    switch (message.type) {
      case 'CAPTURE_SCREENSHOT':
        handleScreenshotCapture((message as any).data, sender.tab?.id)
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true; // Keep message channel open for async response

      case 'SAVE_SCREENSHOT':
        saveScreenshot((message as any).data)
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
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
      mode: 'screenshot',
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
    };

    await chrome.storage.sync.set({ settings: defaultSettings });
    await updateBadge('screenshot');
  }
});