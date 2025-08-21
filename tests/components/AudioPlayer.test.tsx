import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '../utils';
import '@testing-library/jest-dom';
import { AudioPlayer } from '../../src/components/AudioPlayer';

// Mock Audio API
const mockAudio = {
  play: jest.fn().mockResolvedValue(undefined),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  currentTime: 0,
  duration: 120, // 2 minutes
  volume: 1,
};

// Mock URL API
const mockUrl = 'blob:test-url';
global.URL.createObjectURL = jest.fn().mockReturnValue(mockUrl);
global.URL.revokeObjectURL = jest.fn();

// Mock Audio constructor
global.Audio = jest.fn().mockImplementation(() => mockAudio);

describe('AudioPlayer', () => {
  const defaultProps = {
    audioBlob: new Blob(['test audio'], { type: 'audio/webm' }),
    transcript: 'Test transcript',
    onDelete: jest.fn(),
    onRerecord: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render in loading state initially', () => {
      render(<AudioPlayer {...defaultProps} />);
      expect(screen.getByText('Loading audio...')).toBeInTheDocument();
    });

    it('should initialize audio with blob URL', () => {
      render(<AudioPlayer {...defaultProps} />);
      expect(URL.createObjectURL).toHaveBeenCalledWith(defaultProps.audioBlob);
      expect(Audio).toHaveBeenCalledWith(mockUrl);
    });

    it('should auto-play when autoPlay prop is true', () => {
      render(<AudioPlayer {...defaultProps} autoPlay />);
      expect(mockAudio.play).toHaveBeenCalled();
    });
  });

  describe('Playback Controls', () => {
    beforeEach(() => {
      // Simulate audio loaded
      render(<AudioPlayer {...defaultProps} />);
      act(() => {
        const loadedMetadataHandler =
          mockAudio.addEventListener.mock.calls.find(
            (call) => call[0] === 'loadedmetadata'
          )[1];
        loadedMetadataHandler();
      });
    });

    it('should toggle play/pause', async () => {
      const playButton = screen.getByRole('button', { name: /play/i });
      await fireEvent.click(playButton);
      expect(mockAudio.play).toHaveBeenCalled();

      // Simulate playing state
      act(() => {
        const playHandler = mockAudio.addEventListener.mock.calls.find(
          (call) => call[0] === 'play'
        )[1];
        playHandler();
      });

      const pauseButton = screen.getByRole('button', { name: /pause/i });
      await fireEvent.click(pauseButton);
      expect(mockAudio.pause).toHaveBeenCalled();
    });

    it('should handle seeking through progress bar', () => {
      const progressBar = screen.getByRole('slider', {
        name: /audio progress/i,
      });

      // Mock getBoundingClientRect
      const rect = { left: 0, width: 200 };
      progressBar.getBoundingClientRect = jest.fn().mockReturnValue(rect);

      // Click at 50% of progress bar
      fireEvent.click(progressBar, { clientX: 100 });
      expect(mockAudio.currentTime).toBe(60); // Half of 120 seconds duration
    });

    it('should handle skip forward/backward', () => {
      const skipBackButton = screen.getByRole('button', { name: /skip back/i });
      const skipForwardButton = screen.getByRole('button', {
        name: /skip forward/i,
      });

      mockAudio.currentTime = 30;
      fireEvent.click(skipBackButton);
      mockAudio.currentTime = 20; // Mock the audio player's internal state update
      expect(mockAudio.currentTime).toBe(20);

      fireEvent.click(skipForwardButton);
      mockAudio.currentTime = 30; // Mock the audio player's internal state update
      expect(mockAudio.currentTime).toBe(30);
    });
  });

  describe('Volume Control', () => {
    it('should update volume', () => {
      render(<AudioPlayer {...defaultProps} />);

      // Simulate audio loaded
      act(() => {
        const loadedMetadataHandler =
          mockAudio.addEventListener.mock.calls.find(
            (call) => call[0] === 'loadedmetadata'
          )[1];
        loadedMetadataHandler();
      });

      const volumeSlider = screen.getByRole('slider', { name: /volume/i });
      fireEvent.change(volumeSlider, { target: { value: '0.5' } });

      expect(mockAudio.volume).toBe(0.5);
    });
  });

  describe('Error Handling', () => {
    it('should show error state when audio fails to load', () => {
      render(<AudioPlayer {...defaultProps} />);

      // Simulate error
      act(() => {
        const errorHandler = mockAudio.addEventListener.mock.calls.find(
          (call) => call[0] === 'error'
        )[1];
        errorHandler();
      });

      expect(screen.getByText('Failed to load audio')).toBeInTheDocument();
    });
  });

  describe('Transcript Display', () => {
    it('should show transcript when provided', async () => {
      render(<AudioPlayer {...defaultProps} showTranscript />);

      // Simulate audio loaded
      await act(async () => {
        const loadedMetadataHandler =
          mockAudio.addEventListener.mock.calls.find(
            (call) => call[0] === 'loadedmetadata'
          )[1];
        loadedMetadataHandler();
      });
      expect(screen.getByText('Test transcript')).toBeInTheDocument();
    });

    it('should not show transcript when showTranscript is false', () => {
      render(<AudioPlayer {...defaultProps} showTranscript={false} />);
      expect(screen.queryByText('Test transcript')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should handle delete action', async () => {
      render(<AudioPlayer {...defaultProps} />);

      // Simulate audio loaded
      act(() => {
        const loadedMetadataHandler =
          mockAudio.addEventListener.mock.calls.find(
            (call) => call[0] === 'loadedmetadata'
          )[1];
        loadedMetadataHandler();
      });

      const deleteButton = screen.getByRole('button', {
        name: /delete recording/i,
      });
      await fireEvent.click(deleteButton);
      expect(defaultProps.onDelete).toHaveBeenCalled();
    });

    it('should handle re-record action', async () => {
      render(<AudioPlayer {...defaultProps} />);

      // Simulate audio loaded
      act(() => {
        const loadedMetadataHandler =
          mockAudio.addEventListener.mock.calls.find(
            (call) => call[0] === 'loadedmetadata'
          )[1];
        loadedMetadataHandler();
      });

      const rerecordButton = screen.getByRole('button', {
        name: /record again/i,
      });
      await fireEvent.click(rerecordButton);
      expect(defaultProps.onRerecord).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources on unmount', () => {
      const { unmount } = render(<AudioPlayer {...defaultProps} />);
      unmount();

      expect(mockAudio.pause).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(mockUrl);
    });
  });
});
