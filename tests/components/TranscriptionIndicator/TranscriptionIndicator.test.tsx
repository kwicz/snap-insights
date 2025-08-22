import React from 'react';
import { render, screen, fireEvent } from '../../utils';
import '@testing-library/jest-dom';
import { TranscriptionIndicator } from '../../../src/components/TranscriptionIndicator';

describe('TranscriptionIndicator', () => {
  const defaultProps = {
    isActive: false,
    onStop: jest.fn(),
    onPause: jest.fn(),
    onResume: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders in inactive state', () => {
    render(<TranscriptionIndicator {...defaultProps} />);

    expect(screen.getByText('Ready to transcribe')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('renders in active state', () => {
    render(<TranscriptionIndicator {...defaultProps} isActive={true} />);

    expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows error state', () => {
    const errorMessage = 'Microphone access denied';
    render(
      <TranscriptionIndicator
        {...defaultProps}
        hasError={true}
        errorMessage={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    const resumeButton = screen.getByRole('button', { name: /resume/i });
    expect(resumeButton).toBeDisabled();
  });

  it('handles control button clicks', () => {
    const { rerender } = render(
      <TranscriptionIndicator {...defaultProps} isActive={true} />
    );

    // Test stop button
    fireEvent.click(screen.getByRole('button', { name: /stop/i }));
    expect(defaultProps.onStop).toHaveBeenCalled();

    // Test pause button
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    expect(defaultProps.onPause).toHaveBeenCalled();

    // Test resume button
    rerender(<TranscriptionIndicator {...defaultProps} isActive={false} />);
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(defaultProps.onResume).toHaveBeenCalled();
  });

  it('reflects confidence level visually', () => {
    const confidence = 0.7;
    render(
      <TranscriptionIndicator
        {...defaultProps}
        isActive={true}
        confidence={confidence}
      />
    );

    const icon = screen.getByText('🎙️');
    expect(icon).toHaveStyle({ opacity: confidence.toString() });
  });

  it('applies custom className', () => {
    const customClass = 'custom-indicator';
    render(
      <TranscriptionIndicator {...defaultProps} className={customClass} />
    );

    expect(screen.getByRole('status')).toHaveClass(customClass);
  });
});
