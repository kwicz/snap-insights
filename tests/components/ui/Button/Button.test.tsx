import React from 'react';
import { render, screen, fireEvent } from '../../../utils';
import '@testing-library/jest-dom';
import Button from '@/components/ui/Button';

describe('Button Component', () => {
  it('renders with default props', () => {
    render(<Button>Click me</Button>);

    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn-primary');
  });

  it('renders different variants', () => {
    const { rerender } = render(<Button variant='secondary'>Secondary</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-secondary');

    rerender(<Button variant='ghost'>Ghost</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-ghost');
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Button size='sm'>Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-sm');

    rerender(<Button size='lg'>Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-lg');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    const icon = <svg data-testid='test-icon' />;
    render(<Button icon={icon}>With Icon</Button>);

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.getByText('With Icon')).toBeInTheDocument();
  });

  it('renders icon only button', () => {
    const icon = <svg data-testid='test-icon' />;
    render(
      <Button icon={icon} iconOnly>
        Icon Only
      </Button>
    );

    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    expect(screen.queryByText('Icon Only')).not.toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveClass('btn-icon');
  });

  it('renders in loading state', () => {
    render(<Button loading>Loading</Button>);

    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-loading');
    expect(button).toBeDisabled();
  });

  it('renders full width', () => {
    render(<Button fullWidth>Full Width</Button>);

    expect(screen.getByRole('button')).toHaveClass('btn-full');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<Button ref={ref}>Ref Test</Button>);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
