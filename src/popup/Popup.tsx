import React, { useState, useEffect } from 'react';
import { ExtensionSettings } from '@/types';
import './Popup.css';

// Components
import Header from '@/components/Header';
import TabNav, { Tab, TabIcons } from '@/components/TabNav';
import SettingGroup, { SettingRow } from '@/components/SettingGroup';
import MarkerColorPicker from '@/components/MarkerColorPicker';
import Toggle from '@/components/Toggle';
import Button from '@/components/ui/Button';

export interface PopupState {
  settings: ExtensionSettings;
  isLoading: boolean;
  error: string | null;
  stats: {
    totalScreenshots: number;
    lastCaptured: number | null;
  };
}

const TABS: Tab[] = [
  { id: 'snap', label: 'Snap', icon: TabIcons.Snap },
  { id: 'annotate', label: 'Annotate', icon: TabIcons.Annotate },
  { id: 'transcribe', label: 'Transcribe', icon: TabIcons.Transcribe },
];

const DEFAULT_SETTINGS: ExtensionSettings = {
  mode: 'screenshot',
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
    isLoading: true,
    error: null,
    stats: {
      totalScreenshots: 0,
      lastCaptured: null,
    },
  });

  const [activeTab, setActiveTab] = useState(() => {
    switch (state.settings.mode) {
      case 'screenshot':
        return 'snap';
      case 'annotation':
        return 'annotate';
      case 'transcribe':
        return 'transcribe';
      default:
        return 'snap';
    }
  });

  // Load settings and stats on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  // Keep tab selection in sync with mode
  useEffect(() => {
    const tab =
      state.settings.mode === 'screenshot'
        ? 'snap'
        : state.settings.mode === 'annotation'
        ? 'annotate'
        : state.settings.mode === 'transcribe'
        ? 'transcribe'
        : activeTab;
    if (tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [state.settings.mode]);

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
        settings: {
          ...DEFAULT_SETTINGS,
          ...settingsResponse.settings,
        },
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

  const handleHelp = () => {
    chrome.tabs.create({
      url: 'https://github.com/your-repo/insight-clip/wiki',
    });
  };

  const handleStartCapture = () => {
    chrome.runtime.sendMessage({ type: 'START_CAPTURE' });
    window.close();
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
      {/* Header */}
      <Header
        status={state.error ? 'error' : 'online'}
        statusText={state.error || 'Ready to capture'}
      />

      {/* Tab Navigation */}
      <TabNav
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          const newMode =
            tab === 'snap'
              ? 'screenshot'
              : tab === 'annotate'
              ? 'annotation'
              : tab === 'transcribe'
              ? 'transcribe'
              : state.settings.mode;
          updateSettings({ mode: newMode });
        }}
      />

      {/* Tab Content */}
      <div className='popup-content'>
        {/* Snap Tab */}
        <div className={`tab-pane ${activeTab === 'snap' ? 'active' : ''}`}>
          <MarkerColorPicker
            value={state.settings.markerColor}
            onChange={(markerColor) => updateSettings({ markerColor })}
          />

          <SettingGroup label='Capture Settings'>
            <SettingRow
              title='Include page URL'
              description='Add URL to filename'
            >
              <Toggle
                checked={state.settings.saveLocation.organizeByDomain}
                onChange={(organizeByDomain) =>
                  updateSettings({
                    saveLocation: {
                      ...state.settings.saveLocation,
                      organizeByDomain,
                    },
                  })
                }
              />
            </SettingRow>
          </SettingGroup>

          <SettingGroup label='Usage Statistics'>
            <div className='stats-grid'>
              <div className='stat-card'>
                <div className='stat-number'>
                  {state.stats.totalScreenshots}
                </div>
                <div className='stat-label'>Today</div>
              </div>
              <div className='stat-card'>
                <div className='stat-number'>147</div>
                <div className='stat-label'>Total</div>
              </div>
            </div>
          </SettingGroup>
        </div>

        {/* Annotate Tab */}
        <div className={`tab-pane ${activeTab === 'annotate' ? 'active' : ''}`}>
          <SettingGroup
            label='Default Text'
            description='Placeholder text for new annotations'
          >
            <input
              type='text'
              className='input-field'
              placeholder='Enter default text...'
              value='UX Research Note'
              onChange={(e) =>
                updateSettings({
                  text: { ...state.settings.text },
                })
              }
            />
          </SettingGroup>

          <SettingGroup
            label='Text Style'
            description='Customize annotation appearance'
          >
            <select
              className='select-field'
              value={state.settings.text.defaultFontSize}
              onChange={(e) =>
                updateSettings({
                  text: {
                    ...state.settings.text,
                    defaultFontSize: Number(e.target.value),
                  },
                })
              }
            >
              <option value={12}>Small (12px)</option>
              <option value={14}>Medium (14px)</option>
              <option value={16}>Large (16px)</option>
            </select>
          </SettingGroup>

          <SettingGroup label='Auto-save'>
            <SettingRow
              title='Save on Enter key'
              description='Automatically save when pressing Enter'
            >
              <Toggle
                checked={state.settings.text.autoSave}
                onChange={(autoSave) =>
                  updateSettings({
                    text: { ...state.settings.text, autoSave },
                  })
                }
              />
            </SettingRow>
          </SettingGroup>
        </div>

        {/* Transcribe Tab */}
        <div
          className={`tab-pane ${activeTab === 'transcribe' ? 'active' : ''}`}
        >
          <SettingGroup
            label='Transcription Quality'
            description='Balance between quality and file size'
          >
            <select
              className='select-field'
              value={state.settings.transcription.confidenceThreshold}
              onChange={(e) =>
                updateSettings({
                  transcription: {
                    ...state.settings.transcription,
                    confidenceThreshold: Number(e.target.value),
                  },
                })
              }
            >
              <option value='0.6'>Low (60% confidence)</option>
              <option value='0.8'>Medium (80% confidence)</option>
              <option value='0.9'>High (90% confidence)</option>
            </select>
          </SettingGroup>

          <SettingGroup label='Auto-transcribe'>
            <SettingRow
              title='Convert speech to text'
              description='Automatically transcribe recordings'
            >
              <Toggle
                checked={state.settings.transcription.enabled}
                onChange={(enabled) =>
                  updateSettings({
                    transcription: { ...state.settings.transcription, enabled },
                  })
                }
              />
            </SettingRow>
          </SettingGroup>

          <SettingGroup
            label='Transcription Length'
            description='Maximum length per recording'
          >
            <select
              className='select-field'
              value={state.settings.transcription.maxDuration}
              onChange={(e) =>
                updateSettings({
                  transcription: {
                    ...state.settings.transcription,
                    maxDuration: Number(e.target.value),
                  },
                })
              }
            >
              <option value={15}>15 seconds</option>
              <option value={30}>30 seconds</option>
              <option value={60}>60 seconds</option>
              <option value={0}>Unlimited</option>
            </select>
          </SettingGroup>

          <SettingGroup
            label='Language'
            description='Speech recognition language'
          >
            <select
              className='select-field'
              value={state.settings.transcription.language}
              onChange={(e) =>
                updateSettings({
                  transcription: {
                    ...state.settings.transcription,
                    language: e.target.value,
                  },
                })
              }
            >
              <option value='en-US'>English (US)</option>
              <option value='en-GB'>English (UK)</option>
              <option value='es'>Spanish</option>
              <option value='fr'>French</option>
              <option value='de'>German</option>
            </select>
          </SettingGroup>
        </div>
      </div>

      {/* Action Buttons */}
      <div className='action-buttons'>
        <Button variant='secondary' onClick={handleHelp}>
          Help
        </Button>
        <Button variant='primary' onClick={handleStartCapture}>
          Start Capturing
        </Button>
      </div>
    </div>
  );
};

export default Popup;
