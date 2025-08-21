import React, { useState, useEffect } from 'react';
import { ExtensionSettings, ExtensionMode } from '@/types';
import './Popup.css';
import MarkerColorPicker from '@/components/MarkerColorPicker';
import PreferencesPanel from '@/components/PreferencesPanel';
import DirectoryPicker from '@/components/DirectoryPicker';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  stats: {
    totalScreenshots: number;
    lastCaptured: number | null;
  };
}

/**
 * Main extension popup component
 */
export const Popup: React.FC = () => {
  const [state, setState] = useState<PopupState>({
    settings: {
      mode: 'screenshot',
      markerColor: {
        color: '#00ff00',
        opacity: 1,
        size: 12,
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
    },
    isLoading: true,
    error: null,
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
  });

  // Load settings and stats on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      // Load settings from background
      const settingsResponse = await chrome.runtime.sendMessage({
        type: 'GET_SETTINGS',
      });
      if (settingsResponse.error) {
        throw new Error(settingsResponse.error);
      }

      // Load storage stats
      const statsResponse = await chrome.runtime.sendMessage({
        type: 'GET_STORAGE_STATS',
      });

      setState((prev) => ({
        ...prev,
        settings: settingsResponse.settings || prev.settings,
        stats: {
          totalScreenshots: statsResponse.stats?.totalScreenshots || 0,
          lastCaptured: statsResponse.stats?.lastSaved || null,
        },
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to load popup data:', error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : 'Failed to load settings',
        isLoading: false,
      }));
    }
  };

  const updateSettings = async (newSettings: Partial<ExtensionSettings>) => {
    try {
      const updatedSettings = { ...state.settings, ...newSettings };

      const response = await chrome.runtime.sendMessage({
        type: 'UPDATE_SETTINGS',
        data: updatedSettings,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setState((prev) => ({
        ...prev,
        settings: updatedSettings,
        error: null,
      }));
    } catch (error) {
      console.error('Failed to update settings:', error);
      setState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : 'Failed to update settings',
      }));
    }
  };

  const toggleMode = async () => {
    const newMode: ExtensionMode =
      state.settings.mode === 'screenshot' ? 'annotation' : 'screenshot';
    await updateSettings({ mode: newMode });
  };

  const openOptionsPage = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup/popup.html') });
    window.close();
  };

  const formatLastCaptured = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';

    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (state.isLoading) {
    return (
      <div className='popup popup--loading'>
        <div className='popup__loading'>
          <div className='popup__spinner'></div>
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className='popup'>
      {/* Header */}
      <header className='popup__header'>
        <div className='popup__logo'>
          <span className='popup__logo-icon'>📷</span>
          <h1 className='popup__title'>Insight Clip</h1>
        </div>
        <div className='popup__version'>v1.0.0</div>
      </header>

      {/* Error Message */}
      {state.error && (
        <div className='popup__error'>
          <span className='popup__error-icon'>⚠️</span>
          <span className='popup__error-message'>{state.error}</span>
          <button
            className='popup__error-dismiss'
            onClick={() => setState((prev) => ({ ...prev, error: null }))}
            aria-label='Dismiss error'
          >
            ×
          </button>
        </div>
      )}

      {/* Mode Toggle */}
      <section className='popup__section'>
        <h2 className='popup__section-title'>Current Mode</h2>
        <div className='popup__mode-toggle'>
          <button
            className={`popup__mode-button ${
              state.settings.mode === 'screenshot'
                ? 'popup__mode-button--active'
                : ''
            }`}
            onClick={toggleMode}
          >
            <span className='popup__mode-icon'>📷</span>
            <div className='popup__mode-info'>
              <span className='popup__mode-name'>Screenshot</span>
              <span className='popup__mode-description'>
                Alt+Click to capture
              </span>
            </div>
          </button>

          <button
            className={`popup__mode-button ${
              state.settings.mode === 'annotation'
                ? 'popup__mode-button--active'
                : ''
            }`}
            onClick={toggleMode}
          >
            <span className='popup__mode-icon'>✏️</span>
            <div className='popup__mode-info'>
              <span className='popup__mode-name'>Annotation</span>
              <span className='popup__mode-description'>Click to annotate</span>
            </div>
          </button>
        </div>
      </section>

      {/* Voice and Text Settings */}
      <section className='popup__section'>
        <h2 className='popup__section-title'>Input Settings</h2>
        <PreferencesPanel
          voicePrefs={state.settings.voice}
          textPrefs={state.settings.text}
          onVoicePrefsChange={(prefs) =>
            updateSettings({ voice: { ...state.settings.voice, ...prefs } })
          }
          onTextPrefsChange={(prefs) =>
            updateSettings({ text: { ...state.settings.text, ...prefs } })
          }
          className='popup__preferences'
        />
      </section>

      {/* Save Location */}
      <section className='popup__section'>
        <h2 className='popup__section-title'>Save Location</h2>
        <DirectoryPicker
          value={state.settings.saveLocation}
          onChange={(saveLocation) => updateSettings({ saveLocation })}
          className='popup__directory-picker'
        />
      </section>

      {/* Statistics */}
      <section className='popup__section'>
        <h2 className='popup__section-title'>Statistics</h2>
        <div className='popup__stats'>
          <div className='popup__stat'>
            <span className='popup__stat-value'>
              {state.stats.totalScreenshots}
            </span>
            <span className='popup__stat-label'>Screenshots</span>
          </div>
          <div className='popup__stat'>
            <span className='popup__stat-value'>
              {formatLastCaptured(state.stats.lastCaptured)}
            </span>
            <span className='popup__stat-label'>Last Captured</span>
          </div>
        </div>
      </section>

      {/* Instructions */}
      <section className='popup__section'>
        <h2 className='popup__section-title'>How to Use</h2>
        <div className='popup__instructions'>
          {state.settings.mode === 'screenshot' ? (
            <div className='popup__instruction'>
              <span className='popup__instruction-icon'>⌨️</span>
              <span className='popup__instruction-text'>
                Hold <kbd>Alt</kbd> and click anywhere to capture a screenshot
              </span>
            </div>
          ) : (
            <div className='popup__instruction'>
              <span className='popup__instruction-icon'>✏️</span>
              <span className='popup__instruction-text'>
                Click anywhere to add text or voice annotations
              </span>
            </div>
          )}

          <div className='popup__instruction'>
            <span className='popup__instruction-icon'>⌨️</span>
            <span className='popup__instruction-text'>
              Press <kbd>Alt+Shift+S</kbd> to quick capture
            </span>
          </div>

          <div className='popup__instruction'>
            <span className='popup__instruction-icon'>⌨️</span>
            <span className='popup__instruction-text'>
              Press <kbd>Alt+Shift+M</kbd> to toggle mode
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='popup__footer'>
        <button className='popup__footer-button' onClick={openOptionsPage}>
          Advanced Settings
        </button>

        <div className='popup__footer-links'>
          <a
            href='https://github.com/your-repo/insight-clip'
            target='_blank'
            rel='noopener noreferrer'
            className='popup__footer-link'
          >
            Help
          </a>
          <span className='popup__footer-separator'>•</span>
          <a
            href='https://github.com/your-repo/insight-clip/issues'
            target='_blank'
            rel='noopener noreferrer'
            className='popup__footer-link'
          >
            Feedback
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Popup;
