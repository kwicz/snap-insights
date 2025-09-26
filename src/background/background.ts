/**
 * Background script - Streamlined main entry point
 * Uses extracted services for better code organization
 */

import {
  ExtensionMessage,
  ActivateExtensionMessage,
  DeactivateExtensionMessage,
  ScreenshotData,
  ExtensionSettings,
} from '../types';
import { ExtensionError } from '../types';
import { screenshotService } from './services/screenshot-service';
import { journeyService } from './services/journey-service';
import { storageService } from './services/storage-service';
import { settingsService } from './services/settings-service';
import { backgroundLogger } from '../utils/debug-logger';

// Rate limiting for screenshot captures
let lastCaptureTime = 0;
const MIN_CAPTURE_INTERVAL = 1000; // 1 second between captures

/**
 * Handle screenshot capture request
 */
export async function handleScreenshotCapture(
  captureData: any,
  tabId?: number
): Promise<{
  success: boolean;
  dataUrl?: string;
  error?: string;
}> {
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

    return await screenshotService.handleScreenshotCapture(captureData, tabId);
  } catch (error) {
    backgroundLogger.error('Screenshot capture failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Screenshot capture failed',
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
    const result = await screenshotService.saveScreenshot(screenshotData);
    if (!result.success || !result.downloadId) {
      throw new ExtensionError(
        'Failed to save screenshot',
        'storage',
        'save_error',
        { originalError: result.error }
      );
    }
    return { downloadId: result.downloadId };
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
    const result = await settingsService.handleSettingsUpdate(settings);
    if (!result.success) {
      throw new ExtensionError(
        'Failed to update settings',
        'storage',
        'settings_error',
        { originalError: result.error }
      );
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
    const result = await settingsService.handleGetSettings();
    if (!result.success || !result.settings) {
      throw new ExtensionError(
        'Failed to get settings',
        'storage',
        'get_settings_error',
        { originalError: result.error }
      );
    }
    return { settings: result.settings };
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
  stats: any;
}> {
  try {
    const result = await storageService.getStorageStats();
    if (!result.success || !result.stats) {
      throw new ExtensionError(
        'Failed to get storage stats',
        'storage',
        'get_stats_error',
        { originalError: result.error }
      );
    }
    return { stats: result.stats };
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
 * Handle mode toggle
 */
export async function handleModeToggle(): Promise<{
  success: boolean;
  mode?: string;
  error?: string;
}> {
  try {
    const result = await settingsService.handleModeToggle();
    return result;
  } catch (error) {
    backgroundLogger.error('Mode toggle failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Mode toggle failed',
    };
  }
}

/**
 * Handle extension activation
 */
export async function handleActivateExtension(data: {
  mode: string;
  selectedIcon: string;
}): Promise<{ success: boolean }> {
  try {
    backgroundLogger.info('Activating extension:', data);

    // Store the active state
    await chrome.storage.local.set({
      currentMode: data.mode,
      selectedIcon: data.selectedIcon,
    });

    // Update badge based on mode
    if (data.mode === 'journey') {
      await chrome.action.setBadgeText({ text: 'J' });
      await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
      await chrome.action.setTitle({ title: 'SnapInsights - Journey Mode' });
    } else {
      await chrome.action.setBadgeText({ text: 'S' });
      await chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' });
      await chrome.action.setTitle({ title: 'SnapInsights - Snap Mode' });
    }

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
          `Cannot activate extension on system pages like ${tab.url}. Please navigate to a regular website and try again.`
        );
      }

      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js'],
        });

        // Wait for script to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Send activation message to content script
        await chrome.tabs.sendMessage(tab.id, {
          type: 'ACTIVATE_EXTENSION',
          data: { mode: data.mode, selectedIcon: data.selectedIcon },
        });
      } catch (messageError) {
        backgroundLogger.warn('Failed to inject or message content script:', messageError);
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
          type: 'DEACTIVATE_EXTENSION',
        });
      } catch (error) {
        // Content script might not be injected, ignore error
        backgroundLogger.warn('Failed to send deactivation message:', error);
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
  data: { mode: string },
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
 * Start journey mode recording
 */
export async function startJourney(): Promise<{
  success: boolean;
  journeyState?: any;
}> {
  try {
    const result = await journeyService.startJourney();
    if (!result.success) {
      return {
        success: false,
        journeyState: result.journeyState,
      };
    }

    // Update badge to show journey mode
    await chrome.action.setBadgeText({ text: 'J' });
    await chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    await chrome.action.setTitle({ title: 'SnapInsights - Journey Mode Active' });

    // Inject content script for journey mode
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
        backgroundLogger.error('Invalid tab URL for injection:', tab.url);
        throw new Error(
          `Cannot use Journey Mode on system pages like ${tab.url}. Please navigate to a regular website (like google.com) and try again.`
        );
      }

      try {
        backgroundLogger.info('Injecting content script for journey mode');
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content/content.js'],
        });

        // Wait for script to load
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Send start journey message to content script
        await chrome.tabs.sendMessage(tab.id, {
          type: 'START_JOURNEY',
          timestamp: Date.now(),
        });
      } catch (messageError) {
        backgroundLogger.error('Failed to send START_JOURNEY message:', messageError);
        throw messageError;
      }
    } else {
      throw new Error('No active tab found');
    }

    return { success: true, journeyState: result.journeyState };
  } catch (error) {
    throw new ExtensionError(
      'Failed to start journey',
      'operation',
      'start_journey_error',
      { originalError: error }
    );
  }
}

/**
 * Stop journey mode recording
 */
export async function stopJourney(): Promise<{
  success: boolean;
  journeyState?: any;
}> {
  try {
    const result = await journeyService.stopJourney();
    if (!result.success) {
      return {
        success: false,
        journeyState: result.journeyState,
      };
    }

    // Clear badge
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'SnapInsights' });

    // Send stop journey message to content script
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tab?.id) {
      try {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'STOP_JOURNEY',
          timestamp: Date.now(),
        });
      } catch (messageError) {
        backgroundLogger.warn('Failed to send stop journey message:', messageError);
      }
    }

    return { success: true, journeyState: result.journeyState };
  } catch (error) {
    throw new ExtensionError(
      'Failed to stop journey',
      'operation',
      'stop_journey_error',
      { originalError: error }
    );
  }
}

/**
 * Add screenshot to journey collection
 */
export async function addJourneyScreenshot(
  screenshotData: ScreenshotData,
  elementInfo?: any
): Promise<{ success: boolean; journeyState?: any }> {
  try {
    const result = await journeyService.addJourneyScreenshot(screenshotData, elementInfo);
    return result;
  } catch (error) {
    throw new ExtensionError(
      'Failed to add journey screenshot',
      'operation',
      'add_journey_screenshot_error',
      { originalError: error }
    );
  }
}

/**
 * Save journey collection as organized files
 */
export async function saveJourneyCollection(): Promise<{
  success: boolean;
  downloadIds?: number[];
}> {
  try {
    const result = await journeyService.saveJourneyCollection();
    return result;
  } catch (error) {
    throw new ExtensionError(
      'Failed to save journey collection',
      'operation',
      'save_journey_collection_error',
      { originalError: error }
    );
  }
}

/**
 * Get current journey state
 */
export async function getJourneyState(): Promise<{
  journeyState?: any;
}> {
  try {
    const result = await journeyService.getJourneyState();
    if (!result.success) {
      throw new ExtensionError(
        'Failed to get journey state',
        'operation',
        'get_journey_state_error',
        { originalError: result.error }
      );
    }
    return { journeyState: result.journeyState };
  } catch (error) {
    throw new ExtensionError(
      'Failed to get journey state',
      'operation',
      'get_journey_state_error',
      { originalError: error }
    );
  }
}

/**
 * Clear journey state (cleanup)
 */
export async function clearJourneyState(): Promise<{ success: boolean }> {
  try {
    const result = await journeyService.clearJourney();
    return result;
  } catch (error) {
    throw new ExtensionError(
      'Failed to clear journey state',
      'operation',
      'clear_journey_state_error',
      { originalError: error }
    );
  }
}

// Keep service worker alive
function keepAlive() {
  chrome.alarms.create('keepAlive', {
    periodInMinutes: 0.5, // Every 30 seconds
  });
}

// Listen for alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'keepAlive') {
    backgroundLogger.debug('Service worker keep-alive ping');
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
        try {
          if (!sender.tab?.id) {
            sendResponse({ success: false, error: 'No valid tab context' });
            return true;
          }

          const captureData = (message as any).data;
          const isJourneyMode = captureData?.mode === 'journey';

          handleScreenshotCapture(captureData, sender.tab?.id)
            .then(async (result) => {
              if (isJourneyMode && result.success && result.dataUrl) {
                try {
                  const screenshotData: ScreenshotData = {
                    dataUrl: result.dataUrl,
                    url: sender.tab?.url || '',
                    timestamp: Date.now(),
                    coordinates: captureData.coordinates || { x: 0, y: 0 },
                    annotation: captureData.annotation,
                  };

                  await addJourneyScreenshot(screenshotData, captureData.elementInfo);
                } catch (journeyError) {
                  backgroundLogger.error('Failed to add journey screenshot:', journeyError);
                }
              }
              sendResponse(result);
            })
            .catch((error) => {
              backgroundLogger.error('Screenshot capture error:', error);
              if (
                error.message?.includes('Extension context invalidated') ||
                error.message?.includes('Could not establish connection')
              ) {
                sendResponse({
                  success: false,
                  error: 'Extension context invalidated. Please refresh the page and try again.',
                });
              } else {
                sendResponse({ success: false, error: error.message });
              }
            });
        } catch (error) {
          backgroundLogger.error('Message handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        return true;

      case 'SAVE_SCREENSHOT':
        try {
          saveScreenshot((message as any).data)
            .then(sendResponse)
            .catch((error) => {
              backgroundLogger.error('Save screenshot error:', error);
              sendResponse({
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save screenshot',
              });
            });
        } catch (error) {
          backgroundLogger.error('Save screenshot handler error:', error);
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
        handleDeactivateExtension()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'START_CAPTURE':
        handleStartCapture((message as any).data, sender.tab?.id)
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'START_JOURNEY':
        startJourney()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'STOP_JOURNEY':
        stopJourney()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'SAVE_JOURNEY_COLLECTION':
        saveJourneyCollection()
          .then(sendResponse)
          .catch((error) => sendResponse({ success: false, error }));
        return true;

      case 'GET_JOURNEY_STATE':
        getJourneyState()
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
    backgroundLogger.info('Extension installed, setting up defaults');

    // Initialize default settings using settings service
    await settingsService.resetToDefaults();

    // Set initial extension state to no mode selected
    await chrome.storage.local.set({
      currentMode: null,
      selectedIcon: 'blue',
    });

    // Clear any badge text (extension starts OFF)
    await chrome.action.setBadgeText({ text: '' });
    await chrome.action.setTitle({ title: 'SnapInsights' });

    backgroundLogger.info('Extension setup completed');
  }
});