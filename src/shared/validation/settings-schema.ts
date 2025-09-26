/**
 * Validation schemas and utilities for extension settings
 * Provides runtime type checking and validation for all settings
 */

import { ExtensionSettings, MarkerColorSettings, SaveLocationSettings, VoicePreferences, TextPreferences, TranscriptionPreferences, ExtensionMode } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface ValidationRule<T = any> {
  name: string;
  validate: (value: T) => boolean;
  message: string;
  sanitize?: (value: T) => T;
}

/**
 * Base validation rules
 */
const ValidationRules = {
  required: <T>(name: string): ValidationRule<T> => ({
    name: `${name}_required`,
    validate: (value: T) => value !== undefined && value !== null,
    message: `${name} is required`,
  }),

  string: (name: string): ValidationRule<string> => ({
    name: `${name}_string`,
    validate: (value: string) => typeof value === 'string',
    message: `${name} must be a string`,
  }),

  number: (name: string): ValidationRule<number> => ({
    name: `${name}_number`,
    validate: (value: number) => typeof value === 'number' && !isNaN(value),
    message: `${name} must be a valid number`,
  }),

  boolean: (name: string): ValidationRule<boolean> => ({
    name: `${name}_boolean`,
    validate: (value: boolean) => typeof value === 'boolean',
    message: `${name} must be a boolean`,
  }),

  range: (name: string, min: number, max: number): ValidationRule<number> => ({
    name: `${name}_range`,
    validate: (value: number) => value >= min && value <= max,
    message: `${name} must be between ${min} and ${max}`,
    sanitize: (value: number) => Math.max(min, Math.min(max, value)),
  }),

  enum: <T extends string>(name: string, values: T[]): ValidationRule<T> => ({
    name: `${name}_enum`,
    validate: (value: T) => values.includes(value),
    message: `${name} must be one of: ${values.join(', ')}`,
    sanitize: (value: T) => values.includes(value) ? value : values[0],
  }),

  hexColor: (name: string): ValidationRule<string> => ({
    name: `${name}_hex_color`,
    validate: (value: string) => /^#([0-9A-F]{3}){1,2}$/i.test(value),
    message: `${name} must be a valid hex color (e.g., #FF0000)`,
    sanitize: (value: string) => {
      if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) return value;
      return '#FF0000'; // Default red
    },
  }),

  opacity: (name: string): ValidationRule<number> => ({
    name: `${name}_opacity`,
    validate: (value: number) => value >= 0 && value <= 1,
    message: `${name} opacity must be between 0 and 1`,
    sanitize: (value: number) => Math.max(0, Math.min(1, value)),
  }),

  path: (name: string): ValidationRule<string> => ({
    name: `${name}_path`,
    validate: (value: string) => typeof value === 'string' && value.length > 0,
    message: `${name} must be a valid path string`,
    sanitize: (value: string) => value.replace(/[<>:"|?*]/g, '_'), // Sanitize invalid filename chars
  }),

  languageCode: (name: string): ValidationRule<string> => ({
    name: `${name}_language_code`,
    validate: (value: string) => /^[a-z]{2}-[A-Z]{2}$/.test(value),
    message: `${name} must be in format 'xx-XX' (e.g., 'en-US')`,
    sanitize: (value: string) => {
      if (/^[a-z]{2}-[A-Z]{2}$/.test(value)) return value;
      return 'en-US'; // Default language
    },
  }),

  fontFamily: (name: string): ValidationRule<string> => ({
    name: `${name}_font_family`,
    validate: (value: string) => typeof value === 'string' && value.length > 0,
    message: `${name} must be a valid font family`,
    sanitize: (value: string) => value || 'Arial, sans-serif',
  }),
};

/**
 * Schema definitions for each settings section
 */
export const SettingsSchemas = {
  markerColor: {
    rules: [
      ValidationRules.required<MarkerColorSettings>('markerColor'),
      {
        name: 'markerColor_structure',
        validate: (settings: MarkerColorSettings) => {
          return settings &&
                 typeof settings === 'object' &&
                 'color' in settings &&
                 'opacity' in settings &&
                 'size' in settings &&
                 'style' in settings;
        },
        message: 'markerColor must contain color, opacity, size, and style properties',
      },
    ],
    nested: {
      color: [ValidationRules.hexColor('color')],
      opacity: [ValidationRules.opacity('opacity')],
      size: [ValidationRules.range('size', 1, 100)],
      style: [ValidationRules.enum('style', ['solid', 'dashed', 'dotted'])],
    },
  },

  saveLocation: {
    rules: [ValidationRules.required<SaveLocationSettings>('saveLocation')],
    nested: {
      path: [ValidationRules.path('path')],
      createMonthlyFolders: [ValidationRules.boolean('createMonthlyFolders')],
      organizeByDomain: [ValidationRules.boolean('organizeByDomain')],
    },
  },

  voice: {
    rules: [ValidationRules.required<VoicePreferences>('voice')],
    nested: {
      enabled: [ValidationRules.boolean('enabled')],
      autoTranscribe: [ValidationRules.boolean('autoTranscribe')],
      language: [ValidationRules.languageCode('language')],
      maxDuration: [ValidationRules.range('maxDuration', 1, 300)],
      quality: [ValidationRules.enum('quality', ['low', 'medium', 'high'])],
      noiseReduction: [ValidationRules.boolean('noiseReduction')],
      echoCancellation: [ValidationRules.boolean('echoCancellation')],
    },
  },

  text: {
    rules: [ValidationRules.required<TextPreferences>('text')],
    nested: {
      defaultFontSize: [ValidationRules.range('defaultFontSize', 8, 72)],
      defaultColor: [ValidationRules.hexColor('defaultColor')],
      fontFamily: [ValidationRules.fontFamily('fontFamily')],
      spellCheck: [ValidationRules.boolean('spellCheck')],
      autoSave: [ValidationRules.boolean('autoSave')],
      maxLength: [ValidationRules.range('maxLength', 1, 5000)],
    },
  },

  transcription: {
    rules: [ValidationRules.required<TranscriptionPreferences>('transcription')],
    nested: {
      enabled: [ValidationRules.boolean('enabled')],
      language: [ValidationRules.languageCode('language')],
      maxDuration: [ValidationRules.range('maxDuration', 1, 3600)], // Up to 1 hour
      confidenceThreshold: [ValidationRules.range('confidenceThreshold', 0, 1)],
      interimResults: [ValidationRules.boolean('interimResults')],
      silenceTimeout: [ValidationRules.range('silenceTimeout', 0.5, 10)],
    },
  },

  extensionSettings: {
    rules: [ValidationRules.required<ExtensionSettings>('extensionSettings')],
    nested: {
      mode: [ValidationRules.enum('mode', ['snap', 'annotate', 'transcribe', 'start', 'journey'] as ExtensionMode[])],
      markerColor: [], // Handled by nested validation
      saveLocation: [], // Handled by nested validation
      voice: [], // Handled by nested validation
      text: [], // Handled by nested validation
      transcription: [], // Handled by nested validation
    },
  },
};

/**
 * Validation service for settings
 */
export class SettingsValidator {
  /**
   * Validate a single value against rules
   */
  private validateValue<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let sanitized = value;

    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);

        // Try to sanitize if possible
        if (rule.sanitize) {
          try {
            sanitized = rule.sanitize(value);
            warnings.push(`${rule.name}: Value sanitized`);
          } catch (error) {
            backgroundLogger.warn(`Sanitization failed for rule ${rule.name}:`, error);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: sanitized !== value ? sanitized : undefined,
    };
  }

  /**
   * Validate marker color settings
   */
  validateMarkerColor(markerColor: Partial<MarkerColorSettings>): ValidationResult {
    const schema = SettingsSchemas.markerColor;
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Partial<MarkerColorSettings> = { ...markerColor };

    // Validate structure
    for (const rule of schema.rules) {
      const result = this.validateValue(markerColor as MarkerColorSettings, [rule]);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Validate nested properties
    for (const [key, rules] of Object.entries(schema.nested)) {
      if (key in markerColor) {
        const value = (markerColor as any)[key];
        const result = this.validateValue(value, rules);

        errors.push(...result.errors.map(err => `markerColor.${err}`));
        warnings.push(...result.warnings.map(warn => `markerColor.${warn}`));

        if (result.sanitized !== undefined) {
          (sanitized as any)[key] = result.sanitized;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: JSON.stringify(sanitized) !== JSON.stringify(markerColor) ? sanitized : undefined,
    };
  }

  /**
   * Validate save location settings
   */
  validateSaveLocation(saveLocation: Partial<SaveLocationSettings>): ValidationResult {
    return this.validateNestedSchema(saveLocation, SettingsSchemas.saveLocation, 'saveLocation');
  }

  /**
   * Validate voice preferences
   */
  validateVoicePreferences(voice: Partial<VoicePreferences>): ValidationResult {
    return this.validateNestedSchema(voice, SettingsSchemas.voice, 'voice');
  }

  /**
   * Validate text preferences
   */
  validateTextPreferences(text: Partial<TextPreferences>): ValidationResult {
    return this.validateNestedSchema(text, SettingsSchemas.text, 'text');
  }

  /**
   * Validate transcription preferences
   */
  validateTranscriptionPreferences(transcription: Partial<TranscriptionPreferences>): ValidationResult {
    return this.validateNestedSchema(transcription, SettingsSchemas.transcription, 'transcription');
  }

  /**
   * Validate complete extension settings
   */
  validateExtensionSettings(settings: Partial<ExtensionSettings>): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: Partial<ExtensionSettings> = { ...settings };

    // Validate top-level properties
    if (settings.mode) {
      const modeResult = this.validateValue(settings.mode, [
        ValidationRules.enum('mode', ['snap', 'annotate', 'transcribe', 'start', 'journey'] as ExtensionMode[])
      ]);
      errors.push(...modeResult.errors);
      warnings.push(...modeResult.warnings);
      if (modeResult.sanitized !== undefined) {
        sanitized.mode = modeResult.sanitized;
      }
    }

    // Validate nested sections
    const nestedValidations = [
      { key: 'markerColor', method: this.validateMarkerColor.bind(this) },
      { key: 'saveLocation', method: this.validateSaveLocation.bind(this) },
      { key: 'voice', method: this.validateVoicePreferences.bind(this) },
      { key: 'text', method: this.validateTextPreferences.bind(this) },
      { key: 'transcription', method: this.validateTranscriptionPreferences.bind(this) },
    ];

    for (const { key, method } of nestedValidations) {
      if (key in settings) {
        const result = method((settings as any)[key]);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
        if (result.sanitized !== undefined) {
          (sanitized as any)[key] = result.sanitized;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: JSON.stringify(sanitized) !== JSON.stringify(settings) ? sanitized : undefined,
    };
  }

  /**
   * Sanitize settings with validation
   */
  sanitizeSettings(settings: Partial<ExtensionSettings>): {
    sanitized: ExtensionSettings;
    errors: string[];
    warnings: string[];
  } {
    const result = this.validateExtensionSettings(settings);

    // Apply default values for missing required fields
    const defaultSettings: ExtensionSettings = {
      mode: 'snap',
      markerColor: {
        color: '#FF0000',
        opacity: 0.8,
        size: 32,
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
        confidenceThreshold: 0.7,
        interimResults: true,
        silenceTimeout: 2,
      },
    };

    const sanitized: ExtensionSettings = {
      ...defaultSettings,
      ...settings,
      ...(result.sanitized || {}),
    };

    return {
      sanitized,
      errors: result.errors,
      warnings: result.warnings,
    };
  }

  /**
   * Helper method for validating nested schemas
   */
  private validateNestedSchema(
    value: any,
    schema: { rules: ValidationRule[]; nested: Record<string, ValidationRule[]> },
    prefix: string
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const sanitized: any = { ...value };

    // Validate structure rules
    for (const rule of schema.rules) {
      const result = this.validateValue(value, [rule]);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    }

    // Validate nested properties
    for (const [key, rules] of Object.entries(schema.nested)) {
      if (key in value) {
        const nestedValue = value[key];
        const result = this.validateValue(nestedValue, rules);

        errors.push(...result.errors.map(err => `${prefix}.${err}`));
        warnings.push(...result.warnings.map(warn => `${prefix}.${warn}`));

        if (result.sanitized !== undefined) {
          sanitized[key] = result.sanitized;
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      sanitized: JSON.stringify(sanitized) !== JSON.stringify(value) ? sanitized : undefined,
    };
  }
}

// Export singleton instance
export const settingsValidator = new SettingsValidator();