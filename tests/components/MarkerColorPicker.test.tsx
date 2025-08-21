import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
  userEvent,
} from '../utils';
import '@testing-library/jest-dom';
import { MarkerColorPicker } from '../../src/components/MarkerColorPicker';
import { MarkerColorSettings } from '../../src/types';

describe('MarkerColorPicker', () => {
  const defaultSettings: MarkerColorSettings = {
    color: '#00ff00',
    opacity: 1,
    size: 12,
    style: 'solid',
  };

  const defaultProps = {
    value: defaultSettings,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Color Selection', () => {
    it('should render preset colors', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const colorButtons = screen.getAllByRole('button', {
        name: /Select color/,
      });
      expect(colorButtons.length).toBeGreaterThan(0);
    });

    it('should highlight selected color', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const selectedColor = screen.getByRole('button', {
        name: `Select color ${defaultSettings.color}`,
      });
      expect(selectedColor).toHaveClass('active');
    });

    it('should call onChange when color is selected', async () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const newColor = '#ff0000';
      const colorButton = screen.getByRole('button', {
        name: `Select color ${newColor}`,
      });
      await userEvent.click(colorButton);

      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith({
          ...defaultSettings,
          color: newColor,
        });
      });
    });

    it('should allow custom color selection', async () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const colorInput = screen.getByLabelText('Select custom color');
      fireEvent.change(colorInput, { target: { value: '#123456' } });

      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith({
          ...defaultSettings,
          color: '#123456',
        });
      });
    });
  });

  describe('Opacity Control', () => {
    it('should render opacity slider', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const opacitySlider = screen.getByRole('slider', { name: /Opacity/ });
      expect(opacitySlider).toBeInTheDocument();
      expect(opacitySlider).toHaveValue('100');
    });

    it('should update opacity value', async () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const opacitySlider = screen.getByRole('slider', { name: /Opacity/ });
      fireEvent.change(opacitySlider, { target: { value: '50' } });

      await waitFor(() => {
        expect(defaultProps.onChange).toHaveBeenCalledWith({
          ...defaultSettings,
          opacity: 0.5,
        });
      });
    });

    it('should show opacity percentage', () => {
      render(
        <MarkerColorPicker
          value={{ ...defaultSettings, opacity: 0.75 }}
          onChange={defaultProps.onChange}
        />
      );

      expect(screen.getByText(/75/)).toBeInTheDocument();
    });
  });

  describe('Size Selection', () => {
    it('should render size options', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const sizeButtons = screen.getAllByRole('button', {
        name: /^(Small|Medium|Large)$/,
      });
      expect(sizeButtons).toHaveLength(3); // Small, Medium, Large
    });

    it('should highlight selected size', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const mediumButton = screen.getByRole('button', { name: /Medium/ });
      expect(mediumButton).toHaveClass('active');
    });

    it('should update size selection', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const largeButton = screen.getByRole('button', { name: /Large/ });
      fireEvent.click(largeButton);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultSettings,
        size: 16, // Large size
      });
    });
  });

  describe('Style Selection', () => {
    it('should render style options', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const styleButtons = screen.getAllByRole('button', {
        name: /^(Solid|Dashed|Dotted)$/,
      });
      expect(styleButtons).toHaveLength(3); // Solid, Dashed, Dotted
    });

    it('should highlight selected style', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const solidButton = screen.getByRole('button', { name: /Solid/ });
      expect(solidButton).toHaveClass('active');
    });

    it('should update marker style', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const dashedButton = screen.getByRole('button', { name: /Dashed/ });
      fireEvent.click(dashedButton);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultSettings,
        style: 'dashed',
      });
    });

    it('should show style preview with current color and opacity', () => {
      const settings: MarkerColorSettings = {
        color: '#ff0000',
        opacity: 0.5,
        size: 12,
        style: 'solid',
      };

      render(
        <MarkerColorPicker value={settings} onChange={defaultProps.onChange} />
      );

      const stylePreview = screen.getByTestId('style-preview-solid');
      expect(stylePreview).toHaveStyle({
        backgroundColor: '#ff0000',
        opacity: 0.5,
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText(/Opacity:/)).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
      expect(screen.getByText('Style')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(<MarkerColorPicker {...defaultProps} />);

      const colorButton = screen.getByRole('button', {
        name: `Select color ${defaultSettings.color}`,
      });
      const opacitySlider = screen.getByRole('slider', { name: /Opacity/ });
      const sizeButton = screen.getByRole('button', { name: /Medium/ });
      const styleButton = screen.getByRole('button', { name: /Solid/ });

      // All interactive elements should be focusable
      colorButton.focus();
      expect(colorButton).toHaveFocus();

      opacitySlider.focus();
      expect(opacitySlider).toHaveFocus();

      sizeButton.focus();
      expect(sizeButton).toHaveFocus();

      styleButton.focus();
      expect(styleButton).toHaveFocus();
    });
  });
});
