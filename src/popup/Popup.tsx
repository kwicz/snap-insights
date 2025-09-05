import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '@/types';
import './Popup.css';

// Components
import TabNav, { TabIcons } from '@/components/TabNav';
import TheGoodLogo from '@/components/thegoodlogo';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  activeTab: 'moment' | 'journey';
  activeMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null;
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
    activeTab: 'moment', // Default to moment tab
    activeMode: null, // No mode selected by default
    selectedIcon: 'blue', // Default to blue touchpoint
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
  });

  // Tab definitions
  const tabs = [
    {
      id: 'moment',
      label: 'Snap a moment',
      icon: TabIcons.Snap,
    },
    {
      id: 'journey',
      label: 'Snap a journey',
      icon: TabIcons.Start,
    },
  ];

  // Load extension state when popup opens
  useEffect(() => {
    const loadExtensionState = async () => {
      try {
        setState((prev) => ({ ...prev, isLoading: true }));

        // Test background script connection first
        const testResponse = await chrome.runtime.sendMessage({
          type: 'TEST_MESSAGE',
        });

        if (!testResponse || !testResponse.success) {
          throw new Error('Background script not responding');
        }

        // Get current extension state from storage
        const result = await chrome.storage.local.get([
          'currentMode',
          'selectedIcon',
        ]);

        const mode = result.currentMode || null;
        const icon = result.selectedIcon || 'blue';

        setState((prev) => ({
          ...prev,
          activeMode: mode, // Show the selected mode (null if none selected)
          selectedIcon: icon,
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

  const handleTabChange = (tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTab: tabId as 'moment' | 'journey',
      activeMode: null, // Reset mode when switching tabs
      error: null,
    }));
  };

  const handleModeSelect = async (
    mode: 'snap' | 'annotate' | 'transcribe' | 'start' | null
  ) => {
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

    // Activate or deactivate extension based on mode selection
    try {
      if (mode) {
        // Activate extension with selected mode
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode,
            selectedIcon: state.selectedIcon,
          },
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to activate extension');
        }
      } else {
        // Deactivate extension when no mode is selected
        const response = await chrome.runtime.sendMessage({
          type: 'DEACTIVATE_EXTENSION',
        });

        if (!response.success) {
          throw new Error(response.error || 'Failed to deactivate extension');
        }
      }
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Failed to ${mode ? 'activate' : 'deactivate'} extension: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      }));
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

      // If extension is currently active (has a mode selected), update with new icon
      if (state.activeMode) {
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode: state.activeMode,
            selectedIcon: icon,
          },
        });

        if (!response.success) {
          console.error(
            'Failed to update active extension with new icon:',
            response.error
          );
        }
      }
    } catch (error) {
      console.error('Failed to save icon selection:', error);
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
          <img src='../assets/icons/icon.png' alt='SnapInsights' />
        </div>
        <h1 className='app-title'>SnapInsights</h1>
      </div>

      <TabNav
        tabs={tabs}
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
      />

      <div className='popup-body'>
        {state.activeTab === 'moment' && (
          <>
            <div className='mode-selection'>
              <h2 className='section-title'>Choose your mode:</h2>
              <div className='mode-grid'>
                <button
                  className={`mode-button snap-button ${
                    state.activeMode === 'snap' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'snap' ? null : 'snap'
                    )
                  }
                  disabled={state.isLoading}
                >
                  <div className='mode-icon'>{TabIcons.Snap}</div>
                  <span className='mode-label'>Snap</span>
                </button>

                <button
                  className={`mode-button annotate-button ${
                    state.activeMode === 'annotate' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'annotate' ? null : 'annotate'
                    )
                  }
                  disabled={state.isLoading}
                >
                  <div className='mode-icon'>{TabIcons.Annotate}</div>
                  <span className='mode-label'>Annotate</span>
                </button>

                <button
                  className={`mode-button transcribe-button ${
                    state.activeMode === 'transcribe' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'transcribe' ? null : 'transcribe'
                    )
                  }
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
          </>
        )}

        {state.activeTab === 'journey' && (
          <>
            <div className='mode-selection'>
              <h2 className='section-title'>Choose your mode:</h2>
              <div className='mode-grid'>
                <button
                  className={`mode-button start-button ${
                    state.activeMode === 'start' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'start' ? null : 'start'
                    )
                  }
                  disabled={state.isLoading}
                >
                  <div className='mode-icon'>
                    {state.activeMode === 'start'
                      ? TabIcons.Pause
                      : TabIcons.Start}
                  </div>
                  <span className='mode-label'>
                    {state.activeMode === 'start' ? 'Pause' : 'Start'}
                  </span>
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
          </>
        )}
      </div>

      <div className='footer-section'>
        <small className='footer-text'>Alt + Click to capture</small>
      </div>
      {/* <div className='footer-container'>
        <small className='footer-text'>
          Powered by <TheGoodLogo />
        </small>
      </div> */}
    </div>
  );
};

export default Popup;
