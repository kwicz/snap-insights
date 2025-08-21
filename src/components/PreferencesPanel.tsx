import React from 'react';
import { VoicePreferences, TextPreferences } from '@/types';
import './PreferencesPanel.css';

const FONT_FAMILIES = [
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: 'Helvetica, sans-serif', label: 'Helvetica' },
  { value: 'Times New Roman, serif', label: 'Times New Roman' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Courier New, monospace', label: 'Courier New' },
];

const LANGUAGES = [
  { code: 'en-US', name: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)' },
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'ja-JP', name: 'Japanese' },
];

const QUALITY_LEVELS = [
  { value: 'low', label: 'Low (Faster)' },
  { value: 'medium', label: 'Medium (Balanced)' },
  { value: 'high', label: 'High (Better Quality)' },
];

export interface PreferencesPanelProps {
  voicePrefs: VoicePreferences;
  textPrefs: TextPreferences;
  onVoicePrefsChange: (prefs: Partial<VoicePreferences>) => void;
  onTextPrefsChange: (prefs: Partial<TextPreferences>) => void;
  className?: string;
}

export const PreferencesPanel: React.FC<PreferencesPanelProps> = ({
  voicePrefs,
  textPrefs,
  onVoicePrefsChange,
  onTextPrefsChange,
  className = '',
}) => {
  return (
    <div className={`preferences-panel ${className}`}>
      {/* Voice Preferences */}
      <section className='preferences-panel__section'>
        <h3 className='preferences-panel__title'>Voice Settings</h3>

        <div className='preferences-panel__group'>
          <label className='preferences-panel__row'>
            <span>Enable Voice Input</span>
            <input
              type='checkbox'
              checked={voicePrefs.enabled}
              onChange={(e) =>
                onVoicePrefsChange({ enabled: e.target.checked })
              }
              className='preferences-panel__toggle'
            />
          </label>

          {voicePrefs.enabled && (
            <>
              <label className='preferences-panel__row'>
                <span>Auto-Transcribe</span>
                <input
                  type='checkbox'
                  checked={voicePrefs.autoTranscribe}
                  onChange={(e) =>
                    onVoicePrefsChange({ autoTranscribe: e.target.checked })
                  }
                  className='preferences-panel__toggle'
                />
              </label>

              <label className='preferences-panel__row'>
                <span>Language</span>
                <select
                  value={voicePrefs.language}
                  onChange={(e) =>
                    onVoicePrefsChange({ language: e.target.value })
                  }
                  className='preferences-panel__select'
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className='preferences-panel__row'>
                <span>Max Duration (seconds)</span>
                <input
                  type='number'
                  min='10'
                  max='300'
                  value={voicePrefs.maxDuration}
                  onChange={(e) =>
                    onVoicePrefsChange({ maxDuration: Number(e.target.value) })
                  }
                  className='preferences-panel__number'
                />
              </label>

              <label className='preferences-panel__row'>
                <span>Recording Quality</span>
                <select
                  value={voicePrefs.quality}
                  onChange={(e) =>
                    onVoicePrefsChange({
                      quality: e.target.value as 'low' | 'medium' | 'high',
                    })
                  }
                  className='preferences-panel__select'
                >
                  {QUALITY_LEVELS.map((quality) => (
                    <option key={quality.value} value={quality.value}>
                      {quality.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className='preferences-panel__row'>
                <span>Noise Reduction</span>
                <input
                  type='checkbox'
                  checked={voicePrefs.noiseReduction}
                  onChange={(e) =>
                    onVoicePrefsChange({ noiseReduction: e.target.checked })
                  }
                  className='preferences-panel__toggle'
                />
              </label>

              <label className='preferences-panel__row'>
                <span>Echo Cancellation</span>
                <input
                  type='checkbox'
                  checked={voicePrefs.echoCancellation}
                  onChange={(e) =>
                    onVoicePrefsChange({ echoCancellation: e.target.checked })
                  }
                  className='preferences-panel__toggle'
                />
              </label>
            </>
          )}
        </div>
      </section>

      {/* Text Preferences */}
      <section className='preferences-panel__section'>
        <h3 className='preferences-panel__title'>Text Settings</h3>

        <div className='preferences-panel__group'>
          <label className='preferences-panel__row'>
            <span>Font Size</span>
            <div className='preferences-panel__font-size'>
              <input
                type='range'
                min='12'
                max='24'
                value={textPrefs.defaultFontSize}
                onChange={(e) =>
                  onTextPrefsChange({ defaultFontSize: Number(e.target.value) })
                }
                className='preferences-panel__slider'
              />
              <span className='preferences-panel__font-size-value'>
                {textPrefs.defaultFontSize}px
              </span>
            </div>
          </label>

          <label className='preferences-panel__row'>
            <span>Text Color</span>
            <input
              type='color'
              value={textPrefs.defaultColor}
              onChange={(e) =>
                onTextPrefsChange({ defaultColor: e.target.value })
              }
              className='preferences-panel__color'
            />
          </label>

          <label className='preferences-panel__row'>
            <span>Font Family</span>
            <select
              value={textPrefs.fontFamily}
              onChange={(e) =>
                onTextPrefsChange({ fontFamily: e.target.value })
              }
              className='preferences-panel__select'
            >
              {FONT_FAMILIES.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </label>

          <label className='preferences-panel__row'>
            <span>Spell Check</span>
            <input
              type='checkbox'
              checked={textPrefs.spellCheck}
              onChange={(e) =>
                onTextPrefsChange({ spellCheck: e.target.checked })
              }
              className='preferences-panel__toggle'
            />
          </label>

          <label className='preferences-panel__row'>
            <span>Auto-Save</span>
            <input
              type='checkbox'
              checked={textPrefs.autoSave}
              onChange={(e) =>
                onTextPrefsChange({ autoSave: e.target.checked })
              }
              className='preferences-panel__toggle'
            />
          </label>

          <label className='preferences-panel__row'>
            <span>Max Length</span>
            <input
              type='number'
              min='100'
              max='1000'
              step='50'
              value={textPrefs.maxLength}
              onChange={(e) =>
                onTextPrefsChange({ maxLength: Number(e.target.value) })
              }
              className='preferences-panel__number'
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export default PreferencesPanel;
