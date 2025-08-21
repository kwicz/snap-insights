import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '../utils';
import '@testing-library/jest-dom';

// Example component for testing
const TestComponent: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const [count, setCount] = React.useState(0);

  return (
    <div>
      <h1>Test Component</h1>
      <p data-testid='count'>Count: {count}</p>
      <button data-testid='increment' onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
      {onClick && (
        <button data-testid='custom-action' onClick={onClick}>
          Custom Action
        </button>
      )}
    </div>
  );
};

describe('React Component Testing', () => {
  it('should render component correctly', () => {
    render(<TestComponent />);

    expect(screen.getByText('Test Component')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('Count: 0');
    expect(screen.getByTestId('increment')).toBeInTheDocument();
  });

  it('should handle state updates', () => {
    render(<TestComponent />);

    const incrementButton = screen.getByTestId('increment');
    const countDisplay = screen.getByTestId('count');

    expect(countDisplay).toHaveTextContent('Count: 0');

    fireEvent.click(incrementButton);
    expect(countDisplay).toHaveTextContent('Count: 1');

    fireEvent.click(incrementButton);
    expect(countDisplay).toHaveTextContent('Count: 2');
  });

  it('should handle custom click handlers', () => {
    const mockOnClick = jest.fn();
    render(<TestComponent onClick={mockOnClick} />);

    const customButton = screen.getByTestId('custom-action');
    fireEvent.click(customButton);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should not render custom action button when onClick is not provided', () => {
    render(<TestComponent />);

    expect(screen.queryByTestId('custom-action')).not.toBeInTheDocument();
  });
});
