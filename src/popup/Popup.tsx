import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '@/types';
import './Popup.css';

// Components
import TabNav, { TabIcons } from '@/components/TabNav';
import TheGoodLogo from '@/components/thegoodlogo';
import Toast from '@/components/Toast';

// Hooks
import {
  useKeyboardNavigation,
  NavigationItem,
} from '@/shared/hooks/useKeyboardNavigation';
import { eventBus } from '@/shared/services/event-bus';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  activeTab: 'modes' | 'settings';
  activeMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null;
  selectedIcon: 'light' | 'blue' | 'dark';
  stats: {
    totalScreenshots: number;
    lastCaptured: number | null;
  };
  toast: {
    message: string;
    type: 'success' | 'error' | 'info';
  } | null;
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
    activeTab: 'modes', // Default to modes tab
    activeMode: null, // No mode selected by default
    selectedIcon: 'blue', // Default to blue touchpoint
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
    toast: null,
  });

  // Keyboard navigation setup
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);

  const keyboardNav = useKeyboardNavigation(navigationItems, {
    enableArrowKeys: true,
    enableTabKeys: true,
    enableActivation: true,
    enableEscape: true,
    wrapAround: true,
    trapFocus: true,
    autoFocus: true,
  });

  // Toast helper
  const showToast = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    setState((prev) => ({
      ...prev,
      toast: { message, type },
    }));
  };

  const hideToast = () => {
    setState((prev) => ({
      ...prev,
      toast: null,
    }));
  };

  // Tab definitions
  const tabs = [
    {
      id: 'modes',
      label: 'Modes',
      icon: TabIcons.Snap,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: TabIcons.Journey,
    },
  ];

  // Update navigation items when state changes
  useEffect(() => {
    const items: NavigationItem[] = [];

    // Add tab navigation items
    items.push(
      {
        id: 'tab-modes',
        ariaLabel: 'Modes tab',
        role: 'tab',
        group: 'tabs',
      },
      {
        id: 'tab-settings',
        ariaLabel: 'Settings tab',
        role: 'tab',
        group: 'tabs',
      }
    );

    // Add mode buttons based on active tab
    if (state.activeTab === 'modes') {
      // Snap a moment buttons
      items.push(
        {
          id: 'mode-snap',
          ariaLabel: 'Snap mode',
          role: 'button',
          group: 'modes',
          disabled: state.isLoading,
        },
        {
          id: 'mode-annotate',
          ariaLabel: 'Annotate mode',
          role: 'button',
          group: 'modes',
          disabled: state.isLoading,
        },
        {
          id: 'mode-transcribe',
          ariaLabel: 'Transcribe mode',
          role: 'button',
          group: 'modes',
          disabled: state.isLoading,
        }
      );

      // Snap a journey button
      if (!state.activeMode) {
        items.push({
          id: 'mode-start',
          ariaLabel: 'Start journey',
          role: 'button',
          group: 'modes',
          disabled: state.isLoading,
        });
      } else if (state.activeMode === 'start') {
        // Only show save button if journey is active
        items.push({
          id: 'save-journey',
          ariaLabel: 'Save journey',
          role: 'button',
          group: 'modes',
          disabled: state.isLoading,
        });
      }
    } else if (state.activeTab === 'settings') {
      // Add icon selection items only on settings tab
      items.push(
        {
          id: 'icon-light',
          ariaLabel: 'Light touchpoint icon',
          role: 'button',
          group: 'icons',
        },
        {
          id: 'icon-blue',
          ariaLabel: 'Blue touchpoint icon',
          role: 'button',
          group: 'icons',
        },
        {
          id: 'icon-dark',
          ariaLabel: 'Dark touchpoint icon',
          role: 'button',
          group: 'icons',
        }
      );
    }

    setNavigationItems(items);
  }, [state.activeTab, state.activeMode, state.isLoading]);

  // Set up keyboard navigation event handlers
  useEffect(() => {
    const handleKeyboardActivation = (data: {
      itemId: string;
      index: number;
      element: HTMLElement;
    }) => {
      const { itemId } = data;

      // Handle tab navigation
      if (itemId === 'tab-modes') {
        handleTabChange('modes');
      } else if (itemId === 'tab-settings') {
        handleTabChange('settings');
      }
      // Handle mode selection
      else if (itemId === 'mode-snap') {
        handleModeSelect(state.activeMode === 'snap' ? null : 'snap');
      } else if (itemId === 'mode-annotate') {
        handleModeSelect(state.activeMode === 'annotate' ? null : 'annotate');
      } else if (itemId === 'mode-transcribe') {
        handleModeSelect(
          state.activeMode === 'transcribe' ? null : 'transcribe'
        );
      } else if (itemId === 'mode-start') {
        handleModeSelect('start');
      } else if (itemId === 'save-journey') {
        handleSaveJourney();
      }
      // Handle icon selection
      else if (itemId === 'icon-light') {
        handleIconSelect('light');
      } else if (itemId === 'icon-blue') {
        handleIconSelect('blue');
      } else if (itemId === 'icon-dark') {
        handleIconSelect('dark');
      }
    };

    const handleEscape = () => {
      // Close popup on escape (popup will close automatically)
      window.close();
    };

    const unsubscribeActivate = eventBus.on(
      'ui:keyboard:activate',
      handleKeyboardActivation
    );
    const unsubscribeEscape = eventBus.on('ui:keyboard:escape', handleEscape);

    return () => {
      unsubscribeActivate();
      unsubscribeEscape();
    };
  }, [state.activeMode, state.activeTab]);

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

        // Default to modes tab (no need to change based on mode anymore)
        const activeTab = 'modes';

        setState((prev) => ({
          ...prev,
          activeMode: mode, // Show the selected mode (null if none selected)
          selectedIcon: icon,
          activeTab: activeTab, // Set the correct tab based on mode
          isLoading: false,
        }));
      } catch (error) {
        console.error('Failed to load extension state:', error);
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
        showToast(
          `Failed to load extension state: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
          'error'
        );
      }
    };

    loadExtensionState();

    // Close popup when clicking outside - DISABLED FOR DEBUGGING
    // const handleDocumentClick = (event: MouseEvent) => {
    //   const target = event.target as HTMLElement;
    //   // Check if click is outside the popup container
    //   if (!target.closest('.popup')) {
    //     window.close();
    //   }
    // };

    // // Use a slight delay to avoid immediate closure
    // setTimeout(() => {
    //   document.addEventListener('click', handleDocumentClick);
    // }, 100);

    // const handleWindowBlur = () => {
    //   // Chrome automatically closes popup on blur, but we can force it
    //   setTimeout(() => {
    //     // Only close if the popup truly lost focus
    //     if (!document.hasFocus()) {
    //       window.close();
    //     }
    //   }, 100);
    // };

    // window.addEventListener('blur', handleWindowBlur);

    // return () => {
    //   window.removeEventListener('blur', handleWindowBlur);
    //   document.removeEventListener('click', handleDocumentClick);
    // };
  }, []);

  // Load journey stats when journey mode is active
  useEffect(() => {
    const loadJourneyStats = async () => {
      if (state.activeMode === 'start') {
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'GET_JOURNEY_STATS',
          });

          if (response.success && response.stats) {
            setState((prev) => ({
              ...prev,
              stats: {
                ...prev.stats,
                totalScreenshots: response.stats.totalScreenshots || 0,
                lastCaptured: response.stats.lastCaptured || null,
              },
            }));
          }
        } catch (error) {
          console.error('Failed to load journey stats:', error);
        }
      }
    };

    loadJourneyStats();

    // Set up interval to periodically update stats when journey is active
    let statsInterval: number | null = null;
    if (state.activeMode === 'start') {
      statsInterval = setInterval(loadJourneyStats, 5000); // Update every 5 seconds
    }

    return () => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    };
  }, [state.activeMode]);

  const handleTabChange = (tabId: string) => {
    setState((prev) => ({
      ...prev,
      activeTab: tabId as 'modes' | 'settings',
    }));
  };

  const handleModeSelect = async (
    mode: 'snap' | 'annotate' | 'transcribe' | 'start' | null
  ) => {
    setState((prev) => ({
      ...prev,
      activeMode: mode,
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
        if (mode === 'start') {
          // Start journey mode
          const response = await chrome.runtime.sendMessage({
            type: 'START_JOURNEY',
            timestamp: Date.now(),
          });

          if (!response.success) {
            const errorMsg =
              typeof response.error === 'string'
                ? response.error
                : 'Failed to start journey';
            throw new Error(errorMsg);
          }
        } else {
          // Activate extension with selected mode (snap, annotate, transcribe)
          const response = await chrome.runtime.sendMessage({
            type: 'ACTIVATE_EXTENSION',
            data: {
              mode,
              selectedIcon: state.selectedIcon,
            },
          });

          if (!response || !response.success) {
            console.error('Activation failed with response:', response);
            const errorMsg =
              response?.error && typeof response.error === 'string'
                ? response.error
                : 'Failed to activate extension';
            throw new Error(errorMsg);
          }
        }
      } else {
        // Deactivate extension or stop journey
        if (state.activeMode === 'start') {
          // Stop journey mode
          const response = await chrome.runtime.sendMessage({
            type: 'STOP_JOURNEY',
            timestamp: Date.now(),
          });

          if (!response.success) {
            const errorMsg =
              typeof response.error === 'string'
                ? response.error
                : 'Failed to stop journey';
            throw new Error(errorMsg);
          }
        } else {
          // Deactivate extension
          const response = await chrome.runtime.sendMessage({
            type: 'DEACTIVATE_EXTENSION',
          });

          if (!response.success) {
            const errorMsg =
              typeof response.error === 'string'
                ? response.error
                : 'Failed to deactivate extension';
            throw new Error(errorMsg);
          }
        }
      }
    } catch (error) {
      // If the error is about system pages, keep the popup open to show the error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      showToast(errorMessage, 'error');

      setState((prev) => ({
        ...prev,
        activeMode: null, // Reset mode on error
      }));

      // Also clear the stored mode on error
      try {
        await chrome.storage.local.set({ currentMode: null });
      } catch (storageError) {
        console.error('Failed to clear mode after error:', storageError);
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

  const handleSaveJourney = async () => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      // Save journey collection
      const response = await chrome.runtime.sendMessage({
        type: 'SAVE_JOURNEY_COLLECTION',
        timestamp: Date.now(),
      });

      if (!response.success) {
        const errorMsg =
          typeof response.error === 'string'
            ? response.error
            : 'Failed to save journey collection';
        throw new Error(errorMsg);
      }

      // Journey collection saved successfully - now deactivate the mode
      await chrome.storage.local.set({ currentMode: null });
      const deactivateResponse = await chrome.runtime.sendMessage({
        type: 'DEACTIVATE_EXTENSION',
      });

      if (!deactivateResponse?.success) {
        console.warn(
          'Failed to deactivate extension after save:',
          deactivateResponse?.error
        );
      }

      // Update UI to reflect deactivation
      setState((prev) => ({
        ...prev,
        activeMode: null,
        isLoading: false,
      }));

      showToast('Journey saved successfully!', 'success');
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));

      showToast(
        `Failed to save journey: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
    }
  };

  if (state.isLoading) {
    return (
      <div
        className='popup popup--loading'
        role='application'
        aria-label='SnapInsights Extension Popup'
      >
        <div className='popup__loading' role='status' aria-live='polite'>
          <div className='popup__spinner' aria-hidden='true' />
          <span>Loading extension...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className='popup'
      ref={keyboardNav.containerRef as React.RefObject<HTMLDivElement>}
      role='application'
      aria-label='SnapInsights Extension Popup'
    >
      <header className='popup-header' role='banner'>
        <div className='app-icon'>
          <img
            src='../assets/icons/icon.png'
            alt='SnapInsights Extension Icon'
          />
        </div>
        <div className='app-title-group'>
          <h1 className='app-title' id='main-title'>
            SnapInsights
          </h1>
          <div className='header-attribution'>
            <span>Created by</span>
            <a
              href='https://thegood.com/'
              target='_blank'
              rel='noopener noreferrer'
              className='header-logo-link'
            >
              <TheGoodLogo />
            </a>
          </div>
        </div>
      </header>

      <TabNav
        tabs={tabs}
        activeTab={state.activeTab}
        onTabChange={handleTabChange}
      />

      <main className='popup-body' role='main' aria-labelledby='main-title'>
        {state.activeTab === 'modes' && (
          <div
            id='panel-modes'
            role='tabpanel'
            aria-labelledby='tab-modes'
            className='modes-container'
          >
            <div className='mode-selection'>
              <h2 className='section-title'>Snap a moment</h2>
              <div className='mode-footer-text'>Alt + Click to Snap</div>
              <div
                className='mode-grid'
                role='group'
                aria-label='Moment mode selection'
              >
                <button
                  id='mode-snap'
                  className={`mode-button snap-button ${
                    state.activeMode === 'snap' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'snap' ? null : 'snap'
                    )
                  }
                  disabled={state.isLoading}
                  aria-pressed={state.activeMode === 'snap'}
                  aria-describedby='snap-description'
                >
                  <div className='mode-icon'>{TabIcons.Snap}</div>
                  <span className='mode-label'>Snap</span>
                  <span id='snap-description' className='sr-only'>
                    Capture screenshot on click
                  </span>
                </button>

                <button
                  id='mode-annotate'
                  className={`mode-button annotate-button ${
                    state.activeMode === 'annotate' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'annotate' ? null : 'annotate'
                    )
                  }
                  disabled={state.isLoading}
                  aria-pressed={state.activeMode === 'annotate'}
                  aria-describedby='annotate-description'
                >
                  <div className='mode-icon'>{TabIcons.Annotate}</div>
                  <span className='mode-label'>Annotate</span>
                  <span id='annotate-description' className='sr-only'>
                    Capture screenshot with annotation tools
                  </span>
                </button>

                <button
                  id='mode-transcribe'
                  className={`mode-button transcribe-button ${
                    state.activeMode === 'transcribe' ? 'active' : ''
                  }`}
                  onClick={() =>
                    handleModeSelect(
                      state.activeMode === 'transcribe' ? null : 'transcribe'
                    )
                  }
                  disabled={state.isLoading}
                  aria-pressed={state.activeMode === 'transcribe'}
                  aria-describedby='transcribe-description'
                >
                  <div className='mode-icon'>{TabIcons.Transcribe}</div>
                  <span className='mode-label'>Transcribe</span>
                  <span id='transcribe-description' className='sr-only'>
                    Capture audio with transcription
                  </span>
                </button>
              </div>
            </div>

            <div className='mode-selection'>
              <h2 className='section-title'>Snap a journey</h2>
              <div className='mode-footer-text'>
                Snap as you go, save when you're ready
              </div>
              <div
                className='mode-grid'
                role='group'
                aria-label='Journey controls'
              >
                {!state.activeMode || state.activeMode !== 'start' ? (
                  <button
                    id='mode-start'
                    className='mode-button start-button'
                    onClick={() => handleModeSelect('start')}
                    disabled={state.isLoading}
                    aria-pressed={false}
                    aria-describedby='start-description'
                  >
                    <div className='mode-icon'>{TabIcons.Start}</div>
                    <span className='mode-label'>Embark</span>
                    <span id='start-description' className='sr-only'>
                      Embark on a journey
                    </span>
                  </button>
                ) : (
                  <button
                    id='save-journey'
                    className='mode-button save-button active'
                    onClick={handleSaveJourney}
                    disabled={state.isLoading}
                    aria-describedby='save-description'
                  >
                    <div className='mode-icon'>{TabIcons.Save}</div>
                    <span className='mode-label'>Save Journey</span>
                    <span id='save-description' className='sr-only'>
                      Save all journey screenshots
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {state.activeTab === 'settings' && (
          <div
            id='panel-settings'
            role='tabpanel'
            aria-labelledby='tab-settings'
          >
            <div className='icon-selection'>
              <h2 className='section-title'>Choose your touchpoint</h2>
              <div className='icon-selection-container'>
                <div
                  className='icon-grid'
                  role='group'
                  aria-label='Icon selection'
                >
                  <button
                    id='icon-light'
                    className={`icon-option ${
                      state.selectedIcon === 'light' ? 'selected' : ''
                    }`}
                    onClick={() => handleIconSelect('light')}
                    aria-pressed={state.selectedIcon === 'light'}
                    aria-label='Select light touchpoint icon'
                  >
                    <img
                      src='../assets/icons/touchpoint-light.png'
                      alt='Light Touchpoint'
                    />
                  </button>
                  <button
                    id='icon-blue'
                    className={`icon-option ${
                      state.selectedIcon === 'blue' ? 'selected' : ''
                    }`}
                    onClick={() => handleIconSelect('blue')}
                    aria-pressed={state.selectedIcon === 'blue'}
                    aria-label='Select blue touchpoint icon'
                  >
                    <img
                      src='../assets/icons/touchpoint-blue.png'
                      alt='Blue Touchpoint'
                    />
                  </button>
                  <button
                    id='icon-dark'
                    className={`icon-option ${
                      state.selectedIcon === 'dark' ? 'selected' : ''
                    }`}
                    onClick={() => handleIconSelect('dark')}
                    aria-pressed={state.selectedIcon === 'dark'}
                    aria-label='Select dark touchpoint icon'
                  >
                    <img
                      src='../assets/icons/touchpoint-dark.png'
                      alt='Dark Touchpoint'
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {state.toast && (
        <Toast
          message={state.toast.message}
          type={state.toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default Popup;
