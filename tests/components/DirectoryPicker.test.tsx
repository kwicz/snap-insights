import React from 'react';
import { render, screen, fireEvent, act } from '../utils';
import '@testing-library/jest-dom';
import { DirectoryPicker } from '../../src/components/DirectoryPicker';
import type { SaveLocationSettings } from '@/types';

// Mock window.showDirectoryPicker
const mockShowDirectoryPicker = jest.fn();
Object.defineProperty(window, 'showDirectoryPicker', {
  value: mockShowDirectoryPicker,
  writable: true,
});

describe('DirectoryPicker', () => {
  const defaultProps = {
    value: {
      path: 'Downloads',
      createMonthlyFolders: false,
      organizeByDomain: false,
    } as SaveLocationSettings,
    onChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render with default directory selected', () => {
      render(<DirectoryPicker {...defaultProps} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('Downloads');
    });

    it('should initialize with custom path when path is not in defaults', () => {
      const customProps = {
        ...defaultProps,
        value: {
          ...defaultProps.value,
          path: '/custom/path',
        },
      };

      render(<DirectoryPicker {...customProps} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveValue('custom');
      expect(screen.getByText('Current: /custom/path')).toBeInTheDocument();
    });
  });

  describe('Directory Selection', () => {
    it('should handle default directory selection', () => {
      render(<DirectoryPicker {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'Pictures/Screenshots' } });

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        path: 'Pictures/Screenshots',
      });
    });

    it('should show browse button when custom location is selected', () => {
      render(<DirectoryPicker {...defaultProps} />);

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'custom' } });

      expect(
        screen.getByRole('button', { name: /browse/i })
      ).toBeInTheDocument();
    });

    it('should handle custom directory selection', async () => {
      const mockDirHandle = {
        name: '/selected/custom/path',
      };
      mockShowDirectoryPicker.mockResolvedValueOnce(mockDirHandle);

      render(<DirectoryPicker {...defaultProps} />);

      // Select custom option
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'custom' } });

      // Click browse button
      const browseButton = screen.getByRole('button', { name: /browse/i });
      await act(async () => {
        fireEvent.click(browseButton);
      });

      expect(mockShowDirectoryPicker).toHaveBeenCalledWith({
        mode: 'readwrite',
        startIn: 'downloads',
      });

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        path: '/selected/custom/path',
      });
    });

    it('should handle directory picker cancellation', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      mockShowDirectoryPicker.mockRejectedValueOnce(abortError);

      render(<DirectoryPicker {...defaultProps} />);

      // Select custom option
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'custom' } });

      // Click browse button
      const browseButton = screen.getByRole('button', { name: /browse/i });
      await act(async () => {
        fireEvent.click(browseButton);
      });

      // Should revert to previous selection
      expect(select).toHaveValue('Downloads');
    });

    it('should handle directory picker errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockShowDirectoryPicker.mockRejectedValueOnce(
        new Error('Permission denied')
      );

      render(<DirectoryPicker {...defaultProps} />);

      // Select custom option
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'custom' } });

      // Click browse button
      const browseButton = screen.getByRole('button', { name: /browse/i });
      await act(async () => {
        fireEvent.click(browseButton);
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to select directory:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });
  });

  describe('Organization Settings', () => {
    it('should handle monthly folders toggle', () => {
      render(<DirectoryPicker {...defaultProps} />);

      const monthlyFoldersCheckbox = screen.getByRole('checkbox', {
        name: /create monthly folders/i,
      });
      fireEvent.click(monthlyFoldersCheckbox);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        createMonthlyFolders: true,
      });
    });

    it('should handle organize by domain toggle', () => {
      render(<DirectoryPicker {...defaultProps} />);

      const domainOrgCheckbox = screen.getByRole('checkbox', {
        name: /organize by website/i,
      });
      fireEvent.click(domainOrgCheckbox);

      expect(defaultProps.onChange).toHaveBeenCalledWith({
        ...defaultProps.value,
        organizeByDomain: true,
      });
    });

    it('should reflect current organization settings', () => {
      const props = {
        ...defaultProps,
        value: {
          ...defaultProps.value,
          createMonthlyFolders: true,
          organizeByDomain: true,
        },
      };

      render(<DirectoryPicker {...props} />);

      const monthlyFoldersCheckbox = screen.getByRole('checkbox', {
        name: /create monthly folders/i,
      });
      const domainOrgCheckbox = screen.getByRole('checkbox', {
        name: /organize by website/i,
      });

      expect(monthlyFoldersCheckbox).toBeChecked();
      expect(domainOrgCheckbox).toBeChecked();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form controls', () => {
      render(<DirectoryPicker {...defaultProps} />);

      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /create monthly folders/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: /organize by website/i })
      ).toBeInTheDocument();
    });

    it('should maintain focus after directory selection', async () => {
      const mockDirHandle = {
        name: '/selected/path',
      };
      mockShowDirectoryPicker.mockResolvedValueOnce(mockDirHandle);

      render(<DirectoryPicker {...defaultProps} />);

      // Select custom option
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'custom' } });

      // Click browse button
      const browseButton = screen.getByRole('button', { name: /browse/i });
      browseButton.focus();
      await act(async () => {
        fireEvent.click(browseButton);
      });

      expect(browseButton).toHaveFocus();
    });
  });
});
