import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
  within,
  userEvent,
} from '../utils';
import '@testing-library/jest-dom';
import { AnnotationDialog } from '../../src/components/AnnotationDialog';

describe('AnnotationDialog', () => {
  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 100 },
    onSave: jest.fn(),
    onCancel: jest.fn(),
    initialText: '',
    maxLength: 200,
    placeholder: 'Add your annotation...',
    autoFocus: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render when open', () => {
      render(<AnnotationDialog {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Add Annotation')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Add your annotation...')
      ).toBeInTheDocument();
    });

    it('should not render when closed', () => {
      render(<AnnotationDialog {...defaultProps} isOpen={false} />);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should position dialog correctly', () => {
      render(<AnnotationDialog {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveStyle({
        position: 'fixed',
        left: '100px',
        top: '100px',
      });
    });

    it('should show initial text', () => {
      render(<AnnotationDialog {...defaultProps} initialText='Initial text' />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toHaveValue('Initial text');
    });
  });

  describe('User Interaction', () => {
    it('should handle text input', async () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, 'Test annotation');
      });

      expect(textarea).toHaveValue('Test annotation');
    });

    it('should enforce maxLength', async () => {
      render(<AnnotationDialog {...defaultProps} maxLength={10} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, 'This is a very long text');
      });

      await waitFor(() => {
        expect(textarea).toHaveValue('This is a v');
      });
    });

    it('should show character count', async () => {
      render(<AnnotationDialog {...defaultProps} maxLength={100} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, 'Test');
      });

      expect(screen.getByText('4/100')).toBeInTheDocument();
    });

    it('should save on button click', async () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, 'Test annotation');
      });

      const saveButton = screen.getByRole('button', { name: /save/i });
      await act(async () => {
        await userEvent.click(saveButton);
      });

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        text: 'Test annotation',
        coordinates: { x: 100, y: 100 },
      });
    });

    it('should cancel on button click', () => {
      render(<AnnotationDialog {...defaultProps} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(defaultProps.onCancel).toHaveBeenCalled();
    });

    it('should save on Ctrl+Enter', async () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, 'Test annotation');
        await userEvent.keyboard('{Control>}{Enter}{/Control}');
      });

      expect(defaultProps.onSave).toHaveBeenCalledWith({
        text: 'Test annotation',
        coordinates: { x: 100, y: 100 },
      });
    });

    it('should cancel on Escape', async () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await act(async () => {
        await userEvent.type(textarea, '{Escape}');
      });

      await waitFor(() => {
        expect(defaultProps.onCancel).toHaveBeenCalled();
      });
    });
  });

  describe('Validation', () => {
    it('should disable save button for empty text', () => {
      render(<AnnotationDialog {...defaultProps} />);

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('should disable save button for whitespace-only text', () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '   ' } });

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeDisabled();
    });

    it('should enable save button for valid text', () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Valid text' } });

      const saveButton = screen.getByText('Save');
      expect(saveButton).toBeEnabled();
    });
  });

  describe('Focus Management', () => {
    it('should auto-focus textarea when opened', async () => {
      render(<AnnotationDialog {...defaultProps} />);

      const textarea = screen.getByRole('textbox');
      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    });

    it('should not auto-focus when autoFocus is false', () => {
      render(<AnnotationDialog {...defaultProps} autoFocus={false} />);

      const textarea = screen.getByRole('textbox');
      expect(textarea).not.toHaveFocus();
    });

    it('should close on click outside', () => {
      render(
        <div>
          <div data-testid='outside'>Outside</div>
          <AnnotationDialog {...defaultProps} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside'));
      expect(defaultProps.onCancel).toHaveBeenCalled();
    });
  });

  describe('Position Adjustment', () => {
    beforeEach(() => {
      // Mock window dimensions
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
    });

    it('should adjust position when near bottom edge', () => {
      render(
        <AnnotationDialog
          {...defaultProps}
          position={{ x: 100, y: 700 }} // Near bottom
        />
      );

      const dialog = screen.getByRole('dialog');
      const dialogRect = dialog.getBoundingClientRect();
      expect(dialogRect.bottom).toBeLessThanOrEqual(window.innerHeight);
    });

    it('should adjust position when near right edge', () => {
      render(
        <AnnotationDialog
          {...defaultProps}
          position={{ x: 900, y: 100 }} // Near right edge
        />
      );

      const dialog = screen.getByRole('dialog');
      const dialogRect = dialog.getBoundingClientRect();
      expect(dialogRect.right).toBeLessThanOrEqual(window.innerWidth);
    });
  });
});
