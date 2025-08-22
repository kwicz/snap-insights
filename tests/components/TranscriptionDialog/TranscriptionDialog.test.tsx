import React from 'react';
import { render, screen, fireEvent, act } from '../../utils';
import '@testing-library/jest-dom';
import { TranscriptionDialog } from '@/components/TranscriptionDialog';
import { RealTimeTranscription } from '@/utils/transcription';

// Mock RealTimeTranscription
jest.mock('@/utils/transcription', () => ({
  RealTimeTranscription: jest.fn().mockImplementation(() => ({
    start: jest.fn((_, onUpdate, onError) => {
      // Simulate successful start
      onUpdate('Test transcription', true, 0.9);
    }),
    stop: jest.fn(),
    isSupported: jest.fn(() => true),
  })),
}));

describe('TranscriptionDialog', () => {
  const defaultProps = {
    isOpen: true,
    position: { x: 100, y: 100 },
    onSave: jest.fn(),
    onCancel: jest.fn(),
    maxLength: 500,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts transcription automatically when opened', () => {
    render(<TranscriptionDialog {...defaultProps} />);

    // Check if transcription indicator is shown
    expect(screen.getByText('Transcribing...')).toBeInTheDocument();
    // Check if transcribed text appears
    expect(screen.getByText('Test transcription')).toBeInTheDocument();
  });

  it('shows transcription controls', () => {
    render(<TranscriptionDialog {...defaultProps} />);

    // Check for control buttons
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('handles transcription errors', async () => {
    // Mock transcription error
    const errorMessage = 'Microphone access denied';
    (RealTimeTranscription as jest.Mock).mockImplementation(() => ({
      start: jest.fn((_, __, onError) => {
        onError({ message: errorMessage });
      }),
      stop: jest.fn(),
      isSupported: jest.fn(() => true),
    }));

    render(<TranscriptionDialog {...defaultProps} />);

    // Check if error message is shown
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    // Check if resume button is disabled
    expect(screen.getByRole('button', { name: /resume/i })).toBeDisabled();
  });

  it('handles stop transcription', () => {
    const { rerender } = render(<TranscriptionDialog {...defaultProps} />);

    // Click stop button
    const stopButton = screen.getByRole('button', { name: /stop/i });
    fireEvent.click(stopButton);

    // Check if transcription service stop was called
    const mockTranscription = (RealTimeTranscription as jest.Mock).mock
      .results[0].value;
    expect(mockTranscription.stop).toHaveBeenCalled();

    // Check if resume button appears
    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();
  });

  it('handles save action', () => {
    render(<TranscriptionDialog {...defaultProps} />);

    // Wait for transcription to appear
    const transcribedText = screen.getByText('Test transcription');
    expect(transcribedText).toBeInTheDocument();

    // Click save button
    const saveButton = screen.getByText('Capture');
    fireEvent.click(saveButton);

    // Verify save was called with transcribed text
    expect(defaultProps.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'Test transcription',
        coordinates: defaultProps.position,
      })
    );

    // Verify transcription was stopped
    const mockTranscription = (RealTimeTranscription as jest.Mock).mock
      .results[0].value;
    expect(mockTranscription.stop).toHaveBeenCalled();
  });

  it('handles cancel action', () => {
    render(<TranscriptionDialog {...defaultProps} />);

    // Click close button
    const closeButton = screen.getByLabelText('Close dialog');
    fireEvent.click(closeButton);

    // Verify cancel was called
    expect(defaultProps.onCancel).toHaveBeenCalled();

    // Verify transcription was stopped
    const mockTranscription = (RealTimeTranscription as jest.Mock).mock
      .results[0].value;
    expect(mockTranscription.stop).toHaveBeenCalled();
  });

  it('cleans up transcription on unmount', () => {
    const { unmount } = render(<TranscriptionDialog {...defaultProps} />);

    unmount();

    // Verify transcription was stopped
    const mockTranscription = (RealTimeTranscription as jest.Mock).mock
      .results[0].value;
    expect(mockTranscription.stop).toHaveBeenCalled();
  });

  it('updates text in real-time', () => {
    // Mock continuous transcription updates
    (RealTimeTranscription as jest.Mock).mockImplementation(() => ({
      start: jest.fn((_, onUpdate) => {
        onUpdate('First part', false, 0.9);
        setTimeout(() => {
          onUpdate('First part Second part', true, 0.95);
        }, 100);
      }),
      stop: jest.fn(),
      isSupported: jest.fn(() => true),
    }));

    render(<TranscriptionDialog {...defaultProps} />);

    // Check initial text
    expect(screen.getByText('First part')).toBeInTheDocument();

    // Check updated text after delay
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(screen.getByText('First part Second part')).toBeInTheDocument();
  });
});
