/**
 * Tests for application constants
 */

import {
  APP_NAME,
  EXTENSION_MODES,
  ICON_TYPES,
  STORAGE_KEYS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  DEFAULT_SETTINGS,
} from '@/shared/constants/app-constants';

describe('App Constants', () => {
  describe('Basic Constants', () => {
    test('should have correct app name', () => {
      expect(APP_NAME).toBe('SnapInsights');
    });

    test('should have valid extension modes', () => {
      expect(EXTENSION_MODES.SNAP).toBe('snap');
      expect(EXTENSION_MODES.ANNOTATE).toBe('annotate');
      expect(EXTENSION_MODES.TRANSCRIBE).toBe('transcribe');
    });

    test('should have valid icon types', () => {
      expect(ICON_TYPES.LIGHT).toBe('light');
      expect(ICON_TYPES.BLUE).toBe('blue');
      expect(ICON_TYPES.DARK).toBe('dark');
    });
  });

  describe('Storage Keys', () => {
    test('should have all required storage keys', () => {
      expect(STORAGE_KEYS.SETTINGS).toBe('settings');
      expect(STORAGE_KEYS.SCREENSHOTS).toBe('screenshots');
      expect(STORAGE_KEYS.STATS).toBe('stats');
      expect(STORAGE_KEYS.EXTENSION_STATE).toBe('extensionState');
      expect(STORAGE_KEYS.EXTENSION_ACTIVE).toBe('extensionActive');
      expect(STORAGE_KEYS.CURRENT_MODE).toBe('currentMode');
      expect(STORAGE_KEYS.SELECTED_ICON).toBe('selectedIcon');
    });

    test('storage keys should be unique', () => {
      const values = Object.values(STORAGE_KEYS);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });
  });

  describe('Error Messages', () => {
    test('should have user-friendly error messages', () => {
      expect(ERROR_MESSAGES.EXTENSION_CONTEXT_INVALID).toContain('refresh');
      expect(ERROR_MESSAGES.NO_ACTIVE_TAB).toContain('tab');
      expect(ERROR_MESSAGES.MICROPHONE_ACCESS_DENIED).toContain('microphone');
      expect(ERROR_MESSAGES.SCREENSHOT_CAPTURE_FAILED).toContain('screenshot');
    });

    test('error messages should not be empty', () => {
      Object.values(ERROR_MESSAGES).forEach(message => {
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
        expect(message.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Success Messages', () => {
    test('should have positive success messages', () => {
      expect(SUCCESS_MESSAGES.SCREENSHOT_SAVED).toContain('success');
      expect(SUCCESS_MESSAGES.ANNOTATED_SCREENSHOT_SAVED).toContain('success');
      expect(SUCCESS_MESSAGES.TRANSCRIBED_SCREENSHOT_SAVED).toContain('success');
    });
  });

  describe('Default Settings', () => {
    test('should have valid default mode', () => {
      expect(Object.values(EXTENSION_MODES)).toContain(DEFAULT_SETTINGS.MODE);
    });

    test('should have valid default icon', () => {
      expect(Object.values(ICON_TYPES)).toContain(DEFAULT_SETTINGS.ICON);
    });

    test('should have reasonable default values', () => {
      expect(DEFAULT_SETTINGS.MARKER_SIZE).toBeGreaterThan(0);
      expect(DEFAULT_SETTINGS.MARKER_OPACITY).toBeGreaterThan(0);
      expect(DEFAULT_SETTINGS.MARKER_OPACITY).toBeLessThanOrEqual(1);
      expect(DEFAULT_SETTINGS.FONT_FAMILY).toContain('League Spartan');
    });
  });
});