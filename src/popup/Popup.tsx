import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '@/types';
import './Popup.css';

// Components
import { TabIcons } from '@/components/TabNav';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  activeMode: 'inactive' | 'snap' | 'annotate' | 'transcribe';
  selectedIcon: 'light' | 'blue' | 'dark';
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
    activeMode: 'snap', // Default to snap mode
    selectedIcon: 'blue', // Default to blue touchpoint
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
  });

  // Ensure popup closes when clicking outside (browser default behavior)
  useEffect(() => {
    const handleWindowBlur = () => {
      // The popup will automatically close when focus is lost
      // This is just to ensure any cleanup if needed
    };

    window.addEventListener('blur', handleWindowBlur);

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, []);

  const handleModeSelect = (mode: 'snap' | 'annotate' | 'transcribe') => {
    setState((prev) => ({
      ...prev,
      activeMode: mode,
      error: null,
    }));
  };

  const handleIconSelect = (icon: 'light' | 'blue' | 'dark') => {
    setState((prev) => ({
      ...prev,
      selectedIcon: icon,
    }));
  };

  const handleToggleExtension = async (enabled: boolean) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      if (enabled) {
        // If turning on, use the selected mode or default to 'snap'
        const mode =
          state.activeMode !== 'inactive' ? state.activeMode : 'snap';

        // Send message to background script to activate extension
        await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode,
            selectedIcon: state.selectedIcon,
          },
        });

        setState((prev) => ({
          ...prev,
          activeMode: mode,
          isLoading: false,
        }));
      } else {
        // Send message to background script to deactivate extension
        await chrome.runtime.sendMessage({
          type: 'DEACTIVATE_EXTENSION',
        });

        setState((prev) => ({
          ...prev,
          activeMode: 'inactive',
          isLoading: false,
        }));
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: `Failed to ${enabled ? 'activate' : 'deactivate'} extension`,
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
              checked={state.activeMode !== 'inactive'}
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
