import React from 'react';
import { render, screen, fireEvent } from '../../../utils';
import '@testing-library/jest-dom';
import Button from '../../../../src/components/ui/Button/Button';

describe('Button', () => {
  const defaultProps = {
    children: 'Click me',
    onClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Button {...defaultProps} />);

      const button = screen.getByRole('button', { name: /click me/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('btn', 'btn--primary', 'btn--md');
    });

    it('should render different variants', () => {
      const variants = [
        'primary',
        'secondary',
        'outline',
        'ghost',
        'link',
      ] as const;

      variants.forEach((variant) => {
        const { rerender } = render(
          <Button {...defaultProps} variant={variant} />
        );

        expect(screen.getByRole('button')).toHaveClass(`btn--${variant}`);
        rerender(<></>);
      });
    });

    it('should render different sizes', () => {
      const sizes = ['sm', 'md', 'lg'] as const;

      sizes.forEach((size) => {
        const { rerender } = render(<Button {...defaultProps} size={size} />);

        expect(screen.getByRole('button')).toHaveClass(`btn--${size}`);
        rerender(<></>);
      });
    });

    it('should handle custom className', () => {
      render(<Button {...defaultProps} className='custom-class' />);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner', () => {
      render(<Button {...defaultProps} loading />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('btn--loading');
      expect(button).toBeDisabled();

      const spinner = screen.getByRole('presentation');
      expect(spinner).toHaveClass('btn__spinner');
    });

    it('should hide icons while loading', () => {
      render(
        <Button
          {...defaultProps}
          loading
          startIcon={<span>Start</span>}
          endIcon={<span>End</span>}
        />
      );

      expect(screen.queryByText('Start')).not.toBeInTheDocument();
      expect(screen.queryByText('End')).not.toBeInTheDocument();
    });
  });

  describe('Icons', () => {
    it('should render start icon', () => {
      render(<Button {...defaultProps} startIcon={<span>Start</span>} />);

      const iconContainer = screen.getByText('Start').parentElement;
      expect(iconContainer).toHaveClass('btn__icon', 'btn__icon--start');
    });

    it('should render end icon', () => {
      render(<Button {...defaultProps} endIcon={<span>End</span>} />);

      const iconContainer = screen.getByText('End').parentElement;
      expect(iconContainer).toHaveClass('btn__icon', 'btn__icon--end');
    });

    it('should render both icons', () => {
      render(
        <Button
          {...defaultProps}
          startIcon={<span>Start</span>}
          endIcon={<span>End</span>}
        />
      );

      expect(screen.getByText('Start')).toBeInTheDocument();
      expect(screen.getByText('End')).toBeInTheDocument();
    });
  });

  describe('Width and Shape', () => {
    it('should render full width button', () => {
      render(<Button {...defaultProps} fullWidth />);
      expect(screen.getByRole('button')).toHaveClass('btn--full-width');
    });

    it('should render rounded button', () => {
      render(<Button {...defaultProps} rounded />);
      expect(screen.getByRole('button')).toHaveClass('btn--rounded');
    });
  });

  describe('States', () => {
    it('should handle active state', () => {
      render(<Button {...defaultProps} active />);
      expect(screen.getByRole('button')).toHaveClass('btn--active');
    });

    it('should handle disabled state', () => {
      render(<Button {...defaultProps} disabled />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();

      fireEvent.click(button);
      expect(defaultProps.onClick).not.toHaveBeenCalled();
    });

    it('should handle click events when enabled', () => {
      render(<Button {...defaultProps} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should forward aria attributes', () => {
      render(
        <Button
          {...defaultProps}
          aria-label='Custom label'
          aria-expanded={true}
        />
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom label');
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should handle keyboard navigation', () => {
      render(<Button {...defaultProps} />);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();

      fireEvent.keyDown(button, { key: 'Enter' });
      expect(defaultProps.onClick).toHaveBeenCalled();

      fireEvent.keyDown(button, { key: ' ' });
      expect(defaultProps.onClick).toHaveBeenCalledTimes(2);
    });

    it('should hide loading spinner from screen readers', () => {
      render(<Button {...defaultProps} loading />);

      const spinner = screen.getByRole('presentation');
      expect(spinner).toHaveAttribute('aria-hidden', 'true');
    });
  });

  describe('Ref Forwarding', () => {
    it('should forward ref to button element', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button {...defaultProps} ref={ref} />);

      expect(ref.current).toBeInstanceOf(HTMLButtonElement);
      expect(ref.current).toHaveClass('btn');
    });

    it('should allow ref to be used for focus', () => {
      const ref = React.createRef<HTMLButtonElement>();
      render(<Button {...defaultProps} ref={ref} />);

      ref.current?.focus();
      expect(ref.current).toHaveFocus();
    });
  });

  describe('Type Attribute', () => {
    it('should default to type="button"', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });

    it('should allow type override', () => {
      render(<Button {...defaultProps} type='submit' />);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });
  });
});
