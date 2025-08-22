import React from 'react';
import SettingGroup from '../SettingGroup';
import './MarkerColorPicker.css';

const PRESET_COLORS = [
  '#3b82f6', // Primary Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
];

const MARKER_SIZES = [
  { value: 8, label: 'Small (8px)' },
  { value: 12, label: 'Medium (12px)' },
  { value: 16, label: 'Large (16px)' },
];

export interface MarkerColorSettings {
  color: string;
  size: number;
}

interface MarkerColorPickerProps {
  value: MarkerColorSettings;
  onChange: (settings: MarkerColorSettings) => void;
  className?: string;
}

const MarkerColorPicker: React.FC<MarkerColorPickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const handleColorChange = (color: string) => {
    onChange({ ...value, color });
  };

  const handleSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const size = Number(e.target.value);
    onChange({ ...value, size });
  };

  return (
    <div className={className}>
      <SettingGroup
        label='Marker Color'
        description='Choose the color for screenshot markers'
      >
        <div className='color-picker'>
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-option ${
                value.color === color ? 'active' : ''
              }`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorChange(color)}
              aria-label={`Select color ${color}`}
            />
          ))}
        </div>
      </SettingGroup>

      <SettingGroup
        label='Marker Size'
        description='Adjust the size of the click marker'
      >
        <select
          className='size-select'
          value={value.size}
          onChange={handleSizeChange}
        >
          {MARKER_SIZES.map((size) => (
            <option key={size.value} value={size.value}>
              {size.label}
            </option>
          ))}
        </select>
      </SettingGroup>
    </div>
  );
};

export default MarkerColorPicker;
