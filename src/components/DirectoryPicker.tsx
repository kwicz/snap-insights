import React, { useState } from 'react';
import { SaveLocationSettings } from '@/types';
import './DirectoryPicker.css';

const DEFAULT_DIRECTORIES = [
  { id: 'downloads', name: 'Downloads', path: 'Downloads' },
  { id: 'pictures', name: 'Pictures', path: 'Pictures/Screenshots' },
  { id: 'documents', name: 'Documents', path: 'Documents/Screenshots' },
];

export interface DirectoryPickerProps {
  value: SaveLocationSettings;
  onChange: (settings: SaveLocationSettings) => void;
  className?: string;
}

export const DirectoryPicker: React.FC<DirectoryPickerProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isCustomPath, setIsCustomPath] = useState(
    !DEFAULT_DIRECTORIES.some((dir) => dir.path === value.path)
  );

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = event.target.value;

    if (selectedValue === 'custom') {
      setIsCustomPath(true);
      return;
    }

    setIsCustomPath(false);
    onChange({
      ...value,
      path: selectedValue,
    });
  };

  const handleCustomPathSelect = async () => {
    try {
      // Request directory access using Chrome's file system API
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'downloads',
      });

      // Get the directory path
      const path = dirHandle.name;
      onChange({
        ...value,
        path,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // User cancelled the picker - revert to previous selection
        setIsCustomPath(false);
        return;
      }

      console.error('Failed to select directory:', error);
    }
  };

  const handleOrganizationChange = (
    setting: keyof Omit<SaveLocationSettings, 'path'>,
    checked: boolean
  ) => {
    onChange({
      ...value,
      [setting]: checked,
    });
  };

  return (
    <div className={`directory-picker ${className}`}>
      <div className='directory-picker__row'>
        <select
          value={isCustomPath ? 'custom' : value.path}
          onChange={handleSelectChange}
          className='directory-picker__select'
        >
          {DEFAULT_DIRECTORIES.map((dir) => (
            <option key={dir.id} value={dir.path}>
              {dir.name}
            </option>
          ))}
          <option value='custom'>Custom Location...</option>
        </select>

        {isCustomPath && (
          <button
            onClick={handleCustomPathSelect}
            className='directory-picker__button'
          >
            Browse...
          </button>
        )}
      </div>

      {isCustomPath && (
        <div className='directory-picker__path'>
          Current: {value.path || 'No directory selected'}
        </div>
      )}

      <div className='directory-picker__options'>
        <label className='directory-picker__option'>
          <input
            type='checkbox'
            checked={value.createMonthlyFolders}
            onChange={(e) =>
              handleOrganizationChange('createMonthlyFolders', e.target.checked)
            }
            className='directory-picker__checkbox'
          />
          <span>Create monthly folders</span>
        </label>

        <label className='directory-picker__option'>
          <input
            type='checkbox'
            checked={value.organizeByDomain}
            onChange={(e) =>
              handleOrganizationChange('organizeByDomain', e.target.checked)
            }
            className='directory-picker__checkbox'
          />
          <span>Organize by website</span>
        </label>
      </div>
    </div>
  );
};

export default DirectoryPicker;
