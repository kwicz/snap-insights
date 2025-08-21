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
import { VoiceRecorder } from '../../src/components/VoiceRecorder';

// Mock MediaRecorder
const mockMediaRecorder = {
  start: jest.fn(),
  stop: jest.fn(),
  pause: jest.fn(),
  resume: jest.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
  isTypeSupported: jest.fn().mockReturnValue(true),
};

// Mock MediaStream
const mockMediaStream = {
  getTracks: jest.fn().mockReturnValue([{ stop: jest.fn() }]),
};

// Mock AudioContext and AnalyserNode
const mockAnalyser = {
  fftSize: 256,
  frequencyBinCount: 128,
  smoothingTimeConstant: 0.8,
  getByteFrequencyData: jest.fn(),
  connect: jest.fn(),
};

const mockAudioContext = {
  createAnalyser: jest.fn().mockReturnValue(mockAnalyser),
  createMediaStreamSource: jest.fn().mockReturnValue({ connect: jest.fn() }),
  close: jest.fn(),
};

// Mock navigator.mediaDevices
const mockGetUserMedia = jest.fn();
Object.defineProperty(navigator, 'mediaDevices', {
  value: { getUserMedia: mockGetUserMedia },
  writable: true,
});

// Mock window.AudioContext
Object.defineProperty(window, 'AudioContext', {
  value: jest.fn().mockImplementation(() => mockAudioContext),
  writable: true,
});

// Mock MediaRecorder
Object.defineProperty(window, 'MediaRecorder', {
  value: Object.assign(
    jest.fn().mockImplementation(() => mockMediaRecorder),
    {
      isTypeSupported: jest.fn().mockReturnValue(true),
    }
  ),
  writable: true,
});

describe('VoiceRecorder', () => {
  const defaultProps = {
    onRecordingComplete: jest.fn(),
    onRecordingStart: jest.fn(),
    onRecordingStop: jest.fn(),
    onError: jest.fn(),
    maxDuration: 30,
    isEnabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserMedia.mockResolvedValue(mockMediaStream);
    mockAnalyser.getByteFrequencyData.mockImplementation((array) => {
      array.fill(128); // Mid-level audio
    });
  });

  describe('Initialization', () => {
    it('should render in initial state', () => {
      render(<VoiceRecorder {...defaultProps} />);

      expect(screen.getByText('Start Recording')).toBeInTheDocument();
      expect(screen.queryByText('Stop')).not.toBeInTheDocument();
      expect(screen.queryByText('Pause')).not.toBeInTheDocument();
    });

    it('should be disabled when isEnabled is false', () => {
      render(<VoiceRecorder {...defaultProps} isEnabled={false} />);

      const startButton = screen.getByText('Start Recording');
      expect(startButton).toBeDisabled();
    });

    it('should show error when browser is not supported', () => {
      // Temporarily remove MediaRecorder
      const originalMediaRecorder = window.MediaRecorder;
      delete (window as any).MediaRecorder;

      render(<VoiceRecorder {...defaultProps} />);

      expect(
        screen.getByText('Voice recording is not supported in this browser.')
      ).toBeInTheDocument();

      // Restore MediaRecorder
      window.MediaRecorder = originalMediaRecorder;
    });
  });

  describe('Recording Flow', () => {
    it('should start recording when start button is clicked', async () => {
      render(<VoiceRecorder {...defaultProps} />);

      const startButton = screen.getByRole('button', {
        name: /start recording/i,
      });
      await userEvent.click(startButton);

      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
        expect(mockMediaRecorder.start).toHaveBeenCalled();
        expect(defaultProps.onRecordingStart).toHaveBeenCalled();
      });

      const controls = screen.getByRole('group', {
        name: /recording controls/i,
      });
      expect(
        within(controls).getByRole('button', { name: /stop/i })
      ).toBeInTheDocument();
      expect(
        within(controls).getByRole('button', { name: /pause/i })
      ).toBeInTheDocument();
    });

    it('should stop recording when stop button is clicked', async () => {
      render(<VoiceRecorder {...defaultProps} />);

      // Start recording
      await userEvent.click(
        screen.getByRole('button', { name: /start recording/i })
      );

      // Stop recording
      const controls = screen.getByRole('group', {
        name: /recording controls/i,
      });
      await userEvent.click(
        within(controls).getByRole('button', { name: /stop/i })
      );

      await waitFor(() => {
        expect(mockMediaRecorder.stop).toHaveBeenCalled();
        expect(mockMediaStream.getTracks).toHaveBeenCalled();
        expect(mockAudioContext.close).toHaveBeenCalled();
        expect(defaultProps.onRecordingStop).toHaveBeenCalled();
      });
    });

    it('should pause and resume recording', async () => {
      render(<VoiceRecorder {...defaultProps} />);

      // Start recording
      await userEvent.click(
        screen.getByRole('button', { name: /start recording/i })
      );

      // Get recording controls
      const controls = screen.getByRole('group', {
        name: /recording controls/i,
      });

      // Pause recording
      await userEvent.click(
        within(controls).getByRole('button', { name: /pause/i })
      );

      await waitFor(() => {
        expect(mockMediaRecorder.pause).toHaveBeenCalled();
      });

      const status = screen.getByRole('status');
      expect(
        within(controls).getByRole('button', { name: /resume/i })
      ).toBeInTheDocument();
      expect(status).toHaveTextContent(/paused/i);

      // Resume recording
      await userEvent.click(
        within(controls).getByRole('button', { name: /resume/i })
      );

      await waitFor(() => {
        expect(mockMediaRecorder.resume).toHaveBeenCalled();
      });

      expect(
        within(controls).getByRole('button', { name: /pause/i })
      ).toBeInTheDocument();
      expect(status).toHaveTextContent(/recording/i);
    });

    it('should handle recording completion', async () => {
      const audioBlob = new Blob(['test audio'], { type: 'audio/webm' });
      render(<VoiceRecorder {...defaultProps} />);

      // Start recording
      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      // Simulate data available
      act(() => {
        mockMediaRecorder.ondataavailable?.({ data: audioBlob } as BlobEvent);
      });

      // Simulate recording stop
      act(() => {
        mockMediaRecorder.onstop?.({} as Event);
      });

      expect(defaultProps.onRecordingComplete).toHaveBeenCalledWith(
        expect.any(Blob),
        expect.any(Number)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle microphone permission denial', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      render(<VoiceRecorder {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      expect(defaultProps.onError).toHaveBeenCalledWith('Permission denied');
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should handle recording start failure', async () => {
      const error = new Error('Recording failed');
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);
      window.MediaRecorder = Object.assign(
        jest.fn().mockImplementationOnce(() => {
          throw error;
        }),
        {
          isTypeSupported: jest.fn().mockReturnValue(true),
        }
      );

      render(<VoiceRecorder {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      expect(defaultProps.onError).toHaveBeenCalledWith('Recording failed');
    });

    it('should allow retrying after error', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Permission denied'));

      render(<VoiceRecorder {...defaultProps} />);

      // First attempt fails
      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      expect(screen.getByText('Try Again')).toBeInTheDocument();

      // Reset mock to succeed on next attempt
      mockGetUserMedia.mockResolvedValueOnce(mockMediaStream);

      // Click try again
      await act(async () => {
        fireEvent.click(screen.getByText('Try Again'));
      });

      expect(screen.getByText('Start Recording')).toBeInTheDocument();
    });
  });

  describe('Audio Visualization', () => {
    it('should update visualization during recording', async () => {
      render(<VoiceRecorder {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      // Wait for recording to start
      await waitFor(
        () => {
          expect(
            screen.getByRole('group', { name: /recording controls/i })
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Simulate recording started
      act(() => {
        mockMediaRecorder.ondataavailable?.({
          data: new Blob(['test']),
        } as BlobEvent);
      });

      const waveformBars = document.querySelectorAll(
        '.voice-recorder__wave-bar'
      );
      expect(waveformBars.length).toBeGreaterThan(0);
    });

    it('should clear visualization when recording stops', async () => {
      render(<VoiceRecorder {...defaultProps} />);

      // Start and then stop recording
      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      // Wait for recording to start
      await waitFor(
        () => {
          expect(
            screen.getByRole('group', { name: /recording controls/i })
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Simulate recording started
      act(() => {
        mockMediaRecorder.ondataavailable?.({
          data: new Blob(['test']),
        } as BlobEvent);
      });

      // Stop recording
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /stop/i }));
      });

      const waveformBars = document.querySelectorAll(
        '.voice-recorder__wave-bar'
      );
      expect(waveformBars.length).toBe(0);
    });
  });

  describe('Duration and Progress', () => {
    it('should show recording duration', async () => {
      jest.useFakeTimers();

      render(<VoiceRecorder {...defaultProps} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      // Wait for recording to start
      await waitFor(
        () => {
          expect(
            screen.getByRole('group', { name: /recording controls/i })
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );

      // Simulate recording started
      act(() => {
        mockMediaRecorder.ondataavailable?.({
          data: new Blob(['test']),
        } as BlobEvent);
      });

      // Advance time by 1.5 seconds
      act(() => {
        jest.advanceTimersByTime(1500);
      });

      expect(screen.getByText('0:01.5')).toBeInTheDocument();

      jest.useRealTimers();
    });

    it('should auto-stop at max duration', async () => {
      jest.useFakeTimers();

      render(<VoiceRecorder {...defaultProps} maxDuration={2} />);

      await act(async () => {
        fireEvent.click(screen.getByText('Start Recording'));
      });

      // Advance time past max duration
      act(() => {
        jest.advanceTimersByTime(2100); // 2.1 seconds
      });

      expect(mockMediaRecorder.stop).toHaveBeenCalled();
      expect(screen.getByText('Start Recording')).toBeInTheDocument();

      jest.useRealTimers();
    });
  });
});
