import React from 'react';
import { render, screen, fireEvent } from '../utils';
import '@testing-library/jest-dom';
import { PreferencesPanel } from '../../src/components/PreferencesPanel';
import type { VoicePreferences, TextPreferences } from '@/types';

describe('PreferencesPanel', () => {
  const defaultVoicePrefs: VoicePreferences = {
    enabled: true,
    autoTranscribe: false,
    language: 'en-US',
    maxDuration: 60,
    quality: 'medium',
    noiseReduction: true,
    echoCancellation: true,
  };

  const defaultTextPrefs: TextPreferences = {
    defaultFontSize: 16,
    defaultColor: '#000000',
    fontFamily: 'Arial, sans-serif',
    spellCheck: true,
    autoSave: true,
    maxLength: 500,
  };

  const defaultProps = {
    voicePrefs: defaultVoicePrefs,
    textPrefs: defaultTextPrefs,
    onVoicePrefsChange: jest.fn(),
    onTextPrefsChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Voice Settings', () => {
    it('should render voice settings section', () => {
      render(<PreferencesPanel {...defaultProps} />);
      expect(screen.getByText('Voice Settings')).toBeInTheDocument();
    });

    it('should handle voice input toggle', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const enableToggle = screen.getByRole('checkbox', {
        name: /enable voice input/i,
      });
      fireEvent.click(enableToggle);

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        enabled: false,
      });
    });

    it('should show additional settings when voice input is enabled', () => {
      render(<PreferencesPanel {...defaultProps} />);

      expect(screen.getByText('Auto-Transcribe')).toBeInTheDocument();
      expect(screen.getByText('Language')).toBeInTheDocument();
      expect(screen.getByText('Recording Quality')).toBeInTheDocument();
    });

    it('should hide additional settings when voice input is disabled', () => {
      render(
        <PreferencesPanel
          {...defaultProps}
          voicePrefs={{ ...defaultVoicePrefs, enabled: false }}
        />
      );

      expect(screen.queryByText('Auto-Transcribe')).not.toBeInTheDocument();
      expect(screen.queryByText('Language')).not.toBeInTheDocument();
      expect(screen.queryByText('Recording Quality')).not.toBeInTheDocument();
    });

    it('should handle language selection', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const languageSelect = screen.getByRole('combobox', {
        name: /language/i,
      });
      fireEvent.change(languageSelect, { target: { value: 'es-ES' } });

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        language: 'es-ES',
      });
    });

    it('should handle max duration change', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const durationInput = screen.getByRole('spinbutton', {
        name: /max duration/i,
      });
      fireEvent.change(durationInput, { target: { value: '120' } });

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        maxDuration: 120,
      });
    });

    it('should handle quality selection', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const qualitySelect = screen.getByRole('combobox', {
        name: /recording quality/i,
      });
      fireEvent.change(qualitySelect, { target: { value: 'high' } });

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        quality: 'high',
      });
    });

    it('should handle audio processing toggles', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const noiseReductionToggle = screen.getByRole('checkbox', {
        name: /noise reduction/i,
      });
      fireEvent.click(noiseReductionToggle);

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        noiseReduction: false,
      });

      const echoCancellationToggle = screen.getByRole('checkbox', {
        name: /echo cancellation/i,
      });
      fireEvent.click(echoCancellationToggle);

      expect(defaultProps.onVoicePrefsChange).toHaveBeenCalledWith({
        echoCancellation: false,
      });
    });
  });

  describe('Text Settings', () => {
    it('should render text settings section', () => {
      render(<PreferencesPanel {...defaultProps} />);
      expect(screen.getByText('Text Settings')).toBeInTheDocument();
    });

    it('should handle font size changes', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const fontSizeSlider = screen.getByRole('slider', {
        name: /font size/i,
      });
      fireEvent.change(fontSizeSlider, { target: { value: '20' } });

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        defaultFontSize: 20,
      });
      const fontSizeValue = screen.getByText('20px');
      expect(fontSizeValue).toBeInTheDocument();
    });

    it('should handle color changes', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const colorPicker = screen.getByLabelText(/text color/i);
      fireEvent.change(colorPicker, { target: { value: '#FF0000' } });

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        defaultColor: '#ff0000',
      });
    });

    it('should handle font family selection', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const fontSelect = screen.getByRole('combobox', {
        name: /font family/i,
      });
      fireEvent.change(fontSelect, {
        target: { value: 'Times New Roman, serif' },
      });

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        fontFamily: 'Times New Roman, serif',
      });
    });

    it('should handle spell check toggle', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const spellCheckToggle = screen.getByRole('checkbox', {
        name: /spell check/i,
      });
      fireEvent.click(spellCheckToggle);

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        spellCheck: false,
      });
    });

    it('should handle auto-save toggle', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const autoSaveToggle = screen.getByRole('checkbox', {
        name: /auto-save/i,
      });
      fireEvent.click(autoSaveToggle);

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        autoSave: false,
      });
    });

    it('should handle max length changes', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const maxLengthInput = screen.getByRole('spinbutton', {
        name: /max length/i,
      });
      fireEvent.change(maxLengthInput, { target: { value: '750' } });

      expect(defaultProps.onTextPrefsChange).toHaveBeenCalledWith({
        maxLength: 750,
      });
    });

    it('should respect min/max constraints', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const maxLengthInput = screen.getByRole('spinbutton', {
        name: /max length/i,
      });
      expect(maxLengthInput).toHaveAttribute('min', '100');
      expect(maxLengthInput).toHaveAttribute('max', '1000');
      expect(maxLengthInput).toHaveAttribute('step', '50');

      const fontSizeSlider = screen.getByRole('slider', {
        name: /font size/i,
      });
      expect(fontSizeSlider).toHaveAttribute('min', '12');
      expect(fontSizeSlider).toHaveAttribute('max', '24');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form controls', () => {
      render(<PreferencesPanel {...defaultProps} />);

      // Check that all inputs have associated labels
      const inputs = screen.getAllByRole('checkbox');
      inputs.forEach((input) => {
        expect(input).toHaveAccessibleName();
      });

      const selects = screen.getAllByRole('combobox');
      selects.forEach((select) => {
        expect(select).toHaveAccessibleName();
      });

      const numbers = screen.getAllByRole('spinbutton');
      numbers.forEach((number) => {
        expect(number).toHaveAccessibleName();
      });

      const sliders = screen.getAllByRole('slider');
      sliders.forEach((slider) => {
        expect(slider).toHaveAccessibleName();
      });
    });

    it('should maintain focus after value changes', () => {
      render(<PreferencesPanel {...defaultProps} />);

      const fontSizeSlider = screen.getByRole('slider', {
        name: /font size/i,
      });
      fontSizeSlider.focus();
      fireEvent.change(fontSizeSlider, { target: { value: '20' } });
      expect(fontSizeSlider).toHaveFocus();
    });
  });
});
