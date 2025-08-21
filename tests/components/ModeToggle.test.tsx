import React from 'react';
import { render, screen, fireEvent, act } from '../utils';
import '@testing-library/jest-dom';
import { ModeToggle } from '../../src/components/ModeToggle';
import type { ExtensionMode } from '@/types';

describe('ModeToggle', () => {
  const defaultProps = {
    currentMode: 'screenshot' as ExtensionMode,
    onModeChange: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Default Variant', () => {
    it('should render with default settings', () => {
      render(<ModeToggle {...defaultProps} />);

      expect(screen.getByText('Mode')).toBeInTheDocument();
      expect(screen.getByText('Screenshot')).toBeInTheDocument();
      expect(screen.getByText('Annotation')).toBeInTheDocument();
      expect(screen.getByText('Alt+Shift+M')).toBeInTheDocument();
    });

    it('should show active mode indicator', () => {
      render(<ModeToggle {...defaultProps} />);

      const screenshotButton = screen.getByRole('button', {
        name: /screenshot/i,
      });
      expect(screenshotButton).toHaveClass('mode-toggle__option--active');
      expect(screen.getByText('✓')).toBeInTheDocument();
    });

    it('should handle mode change', async () => {
      render(<ModeToggle {...defaultProps} />);

      const annotationButton = screen.getByRole('button', {
        name: /annotation/i,
      });
      await act(async () => {
        fireEvent.click(annotationButton);
      });

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('annotation');
      expect(screen.getByText('Switching mode...')).toBeInTheDocument();

      // Fast-forward through loading state
      act(() => {
        jest.advanceTimersByTime(200);
      });

      expect(screen.queryByText('Switching mode...')).not.toBeInTheDocument();
    });

    it('should handle keyboard shortcut', async () => {
      render(<ModeToggle {...defaultProps} />);

      await act(async () => {
        fireEvent.keyDown(document, {
          key: 'M',
          altKey: true,
          shiftKey: true,
        });
      });

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('annotation');
    });

    it('should debounce rapid mode changes', async () => {
      render(<ModeToggle {...defaultProps} />);

      const annotationButton = screen.getByRole('button', {
        name: /annotation/i,
      });

      // First click
      await act(async () => {
        fireEvent.click(annotationButton);
      });

      // Second click immediately after
      await act(async () => {
        fireEvent.click(annotationButton);
      });

      expect(defaultProps.onModeChange).toHaveBeenCalledTimes(1);
    });

    it('should handle error during mode change', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const failedProps = {
        ...defaultProps,
        onModeChange: jest
          .fn()
          .mockRejectedValue(new Error('Failed to change mode')),
      };

      render(<ModeToggle {...failedProps} />);

      const annotationButton = screen.getByRole('button', {
        name: /annotation/i,
      });
      await act(async () => {
        fireEvent.click(annotationButton);
      });

      expect(consoleError).toHaveBeenCalledWith(
        'Failed to change mode:',
        expect.any(Error)
      );

      // Fast-forward through loading state
      act(() => {
        jest.advanceTimersByTime(200);
      });

      consoleError.mockRestore();
    });
  });

  describe('Compact Variant', () => {
    it('should render compact toggle button', () => {
      render(<ModeToggle {...defaultProps} variant='compact' />);

      expect(screen.getByRole('button')).toHaveClass(
        'mode-toggle__compact-button'
      );
      expect(screen.getByText('⇄')).toBeInTheDocument();
    });

    it('should toggle modes in compact view', async () => {
      render(<ModeToggle {...defaultProps} variant='compact' />);

      const toggleButton = screen.getByRole('button');
      await act(async () => {
        fireEvent.click(toggleButton);
      });

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('annotation');
    });

    it('should show/hide labels based on showLabels prop', () => {
      const { rerender } = render(
        <ModeToggle {...defaultProps} variant='compact' showLabels={true} />
      );
      expect(screen.getByText('Screenshot')).toBeInTheDocument();

      rerender(
        <ModeToggle {...defaultProps} variant='compact' showLabels={false} />
      );
      expect(screen.queryByText('Screenshot')).not.toBeInTheDocument();
    });
  });

  describe('Pills Variant', () => {
    it('should render pill buttons', () => {
      render(<ModeToggle {...defaultProps} variant='pills' />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
      expect(buttons[0]).toHaveClass('mode-toggle__pill');
    });

    it('should show active pill', () => {
      render(<ModeToggle {...defaultProps} variant='pills' />);

      const screenshotPill = screen.getByRole('button', {
        name: /screenshot/i,
      });
      expect(screenshotPill).toHaveClass('mode-toggle__pill--active');
    });

    it('should handle mode change with pills', async () => {
      render(<ModeToggle {...defaultProps} variant='pills' />);

      const annotationPill = screen.getByRole('button', {
        name: /annotation/i,
      });
      await act(async () => {
        fireEvent.click(annotationPill);
      });

      expect(defaultProps.onModeChange).toHaveBeenCalledWith('annotation');
    });
  });

  describe('Disabled State', () => {
    it('should disable all buttons when disabled prop is true', () => {
      render(<ModeToggle {...defaultProps} disabled={true} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });

    it('should not trigger mode change when disabled', async () => {
      render(<ModeToggle {...defaultProps} disabled={true} />);

      const annotationButton = screen.getByRole('button', {
        name: /annotation/i,
      });
      await act(async () => {
        fireEvent.click(annotationButton);
      });

      expect(defaultProps.onModeChange).not.toHaveBeenCalled();
    });

    it('should show disabled state visually', () => {
      render(<ModeToggle {...defaultProps} disabled={true} />);
      expect(screen.getByRole('group').parentElement).toHaveClass(
        'mode-toggle--disabled'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button labels', () => {
      render(<ModeToggle {...defaultProps} />);

      expect(
        screen.getByRole('button', { name: /screenshot/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /annotation/i })
      ).toBeInTheDocument();
    });

    it('should show tooltips in compact mode', () => {
      render(<ModeToggle {...defaultProps} variant='compact' />);

      const toggleButton = screen.getByRole('button');
      expect(toggleButton).toHaveAttribute(
        'title',
        'Switch to annotation mode'
      );
    });

    it('should show tooltips in pills mode', () => {
      render(<ModeToggle {...defaultProps} variant='pills' />);

      const screenshotButton = screen.getByRole('button', {
        name: /screenshot/i,
      });
      expect(screenshotButton).toHaveAttribute(
        'title',
        'Screenshot: Alt+Click to capture'
      );
    });
  });
});
