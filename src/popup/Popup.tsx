import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '@/types';
import './Popup.css';

// Components
import { TabIcons } from '@/components/TabNav';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  activeMode: 'snap' | 'annotate' | 'transcribe';
  selectedIcon: 'light' | 'blue' | 'dark';
  isExtensionActive: boolean;
  stats: {
    totalScreenshots: number;
    lastCaptured: number | null;
  };
}

const DEFAULT_SETTINGS: ExtensionSettings = {
  mode: 'snap',
  markerColor: {
    color: '#3b82f6',
    size: 12,
    opacity: 1,
    style: 'solid',
  },
  saveLocation: {
    path: 'Downloads',
    createMonthlyFolders: true,
    organizeByDomain: true,
  },
  voice: {
    enabled: true,
    autoTranscribe: true,
    language: 'en-US',
    maxDuration: 30,
    quality: 'medium',
    noiseReduction: true,
    echoCancellation: true,
  },
  text: {
    defaultFontSize: 14,
    defaultColor: '#000000',
    fontFamily: 'Arial, sans-serif',
    autoSave: true,
    spellCheck: true,
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

export const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    settings: DEFAULT_SETTINGS,
    isLoading: false,
    error: null,
    activeMode: 'snap', // Default mode selection
    selectedIcon: 'blue', // Default to blue touchpoint
    isExtensionActive: false, // Default to OFF state
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
  });

  // Load extension state when popup opens
  useEffect(() => {
    const loadExtensionState = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        // Test background script connection first
        const testResponse = await chrome.runtime.sendMessage({
          type: 'TEST_MESSAGE',
        });
        console.log('Background connection test:', testResponse);

        if (!testResponse || !testResponse.success) {
          throw new Error('Background script not responding');
        }

        // Get current extension state from storage
        const result = await chrome.storage.local.get([
          'extensionActive',
          'currentMode',
          'selectedIcon',
        ]);

        // Ensure proper boolean conversion and default values
        let isActive = result.extensionActive === true;
        const mode = result.currentMode || 'snap';
        const icon = result.selectedIcon || 'blue';

        // If storage says extension is active, verify it's actually working
        if (isActive) {
          try {
            // Test if content script is actually active on current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab?.id) {
              const pingResponse = await chrome.tabs.sendMessage(tab.id, { type: 'PING' });
              
              // If content script doesn't respond, extension isn't actually active
              if (!pingResponse?.success) {
                isActive = false;
                await chrome.storage.local.set({ extensionActive: false });
              }
            } else {
              isActive = false;
              await chrome.storage.local.set({ extensionActive: false });
            }
          } catch (error) {
            isActive = false;
            await chrome.storage.local.set({ extensionActive: false });
          }
        }

        setState((prev) => ({
          ...prev,
          activeMode: mode, // Always show the selected mode
          selectedIcon: icon,
          isExtensionActive: isActive, // Track the ON/OFF state separately
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to load extension state:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: `Failed to load extension state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        }));
      }
    };

    loadExtensionState();

    const handleWindowBlur = () => {
      // The popup will automatically close when focus is lost
      // This is just to ensure any cleanup if needed
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handleModeSelect = async (mode: 'snap' | 'annotate' | 'transcribe') => {
    setState((prev) => ({
      ...prev,
      activeMode: mode,
      error: null,
    }));

    // Save the selected mode to storage immediately
    try {
      await chrome.storage.local.set({ currentMode: mode });
    } catch (error) {
      console.error('Failed to save mode selection:', error);
    }

    // If extension is currently active, update the mode immediately
    if (state.isExtensionActive) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode,
            selectedIcon: state.selectedIcon,
          },
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to update mode');
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: `Failed to update mode: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        }));
      }
    }
  };

  const handleIconSelect = async (icon: 'light' | 'blue' | 'dark') => {
    setState((prev) => ({
      ...prev,
      selectedIcon: icon,
    }));

    // Persist the selected icon to storage
    try {
      await chrome.storage.local.set({ selectedIcon: icon });

      // If extension is currently active, update the mode with new icon
      if (state.isExtensionActive) {
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode: state.activeMode,
            selectedIcon: icon,
          },
        });

        if (!response.success) {
          console.error('Failed to update active extension with new icon:', response.error);
        }
      }
    } catch (error) {
      console.error('Failed to save icon selection:', error);
    }
  };

  const handleToggleExtension = async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (enabled) {
        // If turning on, use the selected mode
        const mode = state.activeMode;

        // Send message to background script to activate extension
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode,
            selectedIcon: state.selectedIcon,
          },
        });

        if (response.success) {
          setState((prev) => ({
            ...prev,
            isExtensionActive: true,
            isLoading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to activate extension');
        }
      } else {
        // Send message to background script to deactivate extension
        const response = await chrome.runtime.sendMessage({
          type: 'DEACTIVATE_EXTENSION',
        });

        if (response.success) {
          setState((prev) => ({
            ...prev,
            isExtensionActive: false,
            isLoading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to deactivate extension');
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to ${enabled ? 'activate' : 'deactivate'} extension: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      }));
    }
  };

  if (state.isLoading) {
    return (
      <div className='popup popup--loading'>
        <div className='popup__loading'>
          <div className='popup__spinner' />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='popup'>
      <div className='popup-header'>
        <div className='app-icon'>
          <img src='../assets/icons/icon.png' alt='InsightClip' />
        </div>
        <h1 className='app-title'>InsightClip</h1>
      </div>

      <div className='mode-selection'>
        <h2 className='section-title'>Choose your mode:</h2>
        <div className='mode-grid'>
          <button
            className={`mode-button snap-button ${
              state.activeMode === 'snap' ? 'active' : ''
            }`}
            onClick={() => handleModeSelect('snap')}
            disabled={state.isLoading}
          >
            <div className='mode-icon'>{TabIcons.Snap}</div>
            <span className='mode-label'>Snap</span>
          </button>

          <button
            className={`mode-button annotate-button ${
              state.activeMode === 'annotate' ? 'active' : ''
            }`}
            onClick={() => handleModeSelect('annotate')}
            disabled={state.isLoading}
          >
            <div className='mode-icon'>{TabIcons.Annotate}</div>
            <span className='mode-label'>Annotate</span>
          </button>

          <button
            className={`mode-button transcribe-button ${
              state.activeMode === 'transcribe' ? 'active' : ''
            }`}
            onClick={() => handleModeSelect('transcribe')}
            disabled={state.isLoading}
          >
            <div className='mode-icon'>{TabIcons.Transcribe}</div>
            <span className='mode-label'>Transcribe</span>
          </button>
        </div>
      </div>

      <div className='icon-selection'>
        <h2 className='section-title'>Choose your icon:</h2>
        <div className='icon-selection-container'>
          <div className='icon-grid'>
            <div
              className={`icon-option ${
                state.selectedIcon === 'light' ? 'selected' : ''
              }`}
              onClick={() => handleIconSelect('light')}
            >
              <img
                src='../assets/icons/touchpoint-light.png'
                alt='Light Touchpoint'
              />
            </div>
            <div
              className={`icon-option ${
                state.selectedIcon === 'blue' ? 'selected' : ''
              }`}
              onClick={() => handleIconSelect('blue')}
            >
              <img
                src='../assets/icons/touchpoint-blue.png'
                alt='Blue Touchpoint'
              />
            </div>
            <div
              className={`icon-option ${
                state.selectedIcon === 'dark' ? 'selected' : ''
              }`}
              onClick={() => handleIconSelect('dark')}
            >
              <img
                src='../assets/icons/touchpoint-dark.png'
                alt='Dark Touchpoint'
              />
            </div>
          </div>
        </div>
      </div>

      <div className='toggle-section'>
        <div className='toggle-container'>
          <label className='toggle-switch'>
            <input
              type='checkbox'
              checked={state.isExtensionActive}
              onChange={(e) => handleToggleExtension(e.target.checked)}
              disabled={state.isLoading}
            />
            <span className='toggle-slider'></span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default Popup;
