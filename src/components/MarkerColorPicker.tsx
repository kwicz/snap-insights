import React from 'react';
import { MarkerColorSettings } from '@/types';
import './MarkerColorPicker.css';

const PRESET_COLORS = [
  '#00ff00', // Green (Default)
  '#ff0000', // Red
  '#0000ff', // Blue
  '#ffff00', // Yellow
  '#ff00ff', // Magenta
  '#00ffff', // Cyan
  '#ff8c00', // Dark Orange
  '#ffffff', // White
];

const MARKER_SIZES = [
  { value: 8, label: 'Small' },
  { value: 12, label: 'Medium' },
  { value: 16, label: 'Large' },
];

type MarkerStyle = 'solid' | 'dashed' | 'dotted';

const MARKER_STYLES: Array<{ value: MarkerStyle; label: string }> = [
  { value: 'solid', label: 'Solid' },
  { value: 'dashed', label: 'Dashed' },
  { value: 'dotted', label: 'Dotted' },
];

export interface MarkerColorPickerProps {
  value: MarkerColorSettings;
  onChange: (settings: MarkerColorSettings) => void;
  className?: string;
}

export const MarkerColorPicker: React.FC<MarkerColorPickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const handleColorChange = (color: string) => {
    onChange({ ...value, color });
  };

  const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const opacity = Number(e.target.value) / 100;
    onChange({ ...value, opacity });
  };

  const handleSizeChange = (size: number) => {
    onChange({ ...value, size });
  };

  const handleStyleChange = (style: MarkerStyle) => {
    onChange({ ...value, style });
  };

  return (
    <div className={`marker-color-picker ${className}`}>
      {/* Color Selection */}
      <div className='marker-color-picker__section'>
        <label className='marker-color-picker__label' id='color-label'>
          Color
        </label>
        <div
          className='marker-color-picker__colors'
          role='group'
          aria-labelledby='color-label'
        >
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`marker-color-picker__color ${
                value.color === color ? 'active' : ''
              }`}
              style={{
                backgroundColor: color,
                opacity: value.opacity,
              }}
              onClick={() => handleColorChange(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
          <input
            type='color'
            value={value.color}
            onChange={(e) => handleColorChange(e.target.value)}
            className='marker-color-picker__custom-color'
            aria-label='Select custom color'
          />
        </div>
      </div>

      {/* Opacity Slider */}
      <div className='marker-color-picker__section'>
        <label className='marker-color-picker__label' id='opacity-label'>
          Opacity: {Math.round(value.opacity * 100)}%
        </label>
        <input
          type='range'
          min='10'
          max='100'
          value={value.opacity * 100}
          onChange={handleOpacityChange}
          className='marker-color-picker__slider'
          aria-labelledby='opacity-label'
        />
      </div>

      {/* Size Selection */}
      <div className='marker-color-picker__section'>
        <label className='marker-color-picker__label' id='size-label'>
          Size
        </label>
        <div
          className='marker-color-picker__sizes'
          role='group'
          aria-labelledby='size-label'
        >
          {MARKER_SIZES.map((size) => (
            <button
              key={size.value}
              className={`marker-color-picker__size ${
                value.size === size.value ? 'active' : ''
              }`}
              onClick={() => handleSizeChange(size.value)}
            >
              <div
                className='marker-color-picker__size-preview'
                style={{
                  width: size.value,
                  height: size.value,
                  backgroundColor: value.color,
                  opacity: value.opacity,
                }}
              />
              <span>{size.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Style Selection */}
      <div className='marker-color-picker__section'>
        <label className='marker-color-picker__label' id='style-label'>
          Style
        </label>
        <div
          className='marker-color-picker__styles'
          role='group'
          aria-labelledby='style-label'
        >
          {MARKER_STYLES.map((style) => (
            <button
              key={style.value}
              className={`marker-color-picker__style ${
                value.style === style.value ? 'active' : ''
              }`}
              onClick={() => handleStyleChange(style.value)}
            >
              <div
                className={`marker-color-picker__style-preview ${style.value}`}
                data-testid={`style-preview-${style.value}`}
                style={{
                  backgroundColor: value.color,
                  opacity: value.opacity,
                }}
              />
              <span>{style.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarkerColorPicker;
