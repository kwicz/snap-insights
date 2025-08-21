import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface VoiceRecorderProps {
  onRecordingComplete: (audioBlob: Blob, duration: number) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onError?: (error: string) => void;
  maxDuration?: number; // in seconds
  isEnabled?: boolean;
  className?: string;
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  error: string | null;
}

export interface AudioVisualizationData {
  levels: number[];
  currentLevel: number;
}

type TimeoutRef = ReturnType<typeof setTimeout>;

/**
 * VoiceRecorder component for capturing audio with visualization
 */
export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onError,
  maxDuration = 30, // 30 seconds default
  isEnabled = true,
  className = '',
}) => {
  // State
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioLevel: 0,
    error: null,
  });

  const [isSupported, setIsSupported] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(
    null
  );
  const [visualizationData, setVisualizationData] =
    useState<AudioVisualizationData>({
      levels: [],
      currentLevel: 0,
    });

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const durationIntervalRef = useRef<TimeoutRef | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Check browser support on mount
  useEffect(() => {
    const checkSupport = () => {
      const hasMediaRecorder = typeof MediaRecorder !== 'undefined';
      const hasGetUserMedia = !!(
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
      );
      setIsSupported(hasMediaRecorder && hasGetUserMedia);
    };

    checkSupport();
  }, []);

  // Request microphone permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Stop immediately, just checking permission
      setPermissionGranted(true);
      return true;
    } catch (error) {
      console.error('Microphone permission denied:', error);
      setPermissionGranted(false);
      const errorMessage =
        error instanceof Error ? error.message : 'Microphone access denied';
      setRecordingState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
      return false;
    }
  }, [onError]);

  // Initialize audio context and analyser
  const initializeAudioAnalysis = useCallback((stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      return { audioContext, analyser };
    } catch (error) {
      console.error('Failed to initialize audio analysis:', error);
      return null;
    }
  }, []);

  // Audio level visualization
  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average audio level
    const average =
      dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const normalizedLevel = Math.min(average / 128, 1); // Normalize to 0-1

    setRecordingState((prev) => ({ ...prev, audioLevel: normalizedLevel }));
    setVisualizationData((prev) => ({
      levels: [...prev.levels.slice(-50), normalizedLevel], // Keep last 50 levels
      currentLevel: normalizedLevel,
    }));

    if (recordingState.isRecording && !recordingState.isPaused) {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [recordingState.isRecording, recordingState.isPaused]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!isSupported) {
      const error = 'Voice recording is not supported in this browser';
      setRecordingState((prev) => ({ ...prev, error }));
      onError?.(error);
      return;
    }

    if (permissionGranted === null) {
      const granted = await requestPermission();
      if (!granted) return;
    }

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100,
        },
      });

      audioStreamRef.current = stream;

      // Initialize audio analysis
      initializeAudioAnalysis(stream);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType,
        });
        onRecordingComplete(audioBlob, recordingState.duration);
        onRecordingStop?.();
      };

      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms

      // Update state
      setRecordingState((prev) => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0,
        error: null,
      }));

      // Start duration timer
      durationIntervalRef.current = setInterval(() => {
        setRecordingState((prev) => {
          const newDuration = prev.duration + 0.1;

          // Auto-stop at max duration
          if (newDuration >= maxDuration) {
            stopRecording();
            return prev;
          }

          return { ...prev, duration: newDuration };
        });
      }, 100);

      // Start audio level monitoring
      updateAudioLevel();
      onRecordingStart?.();
    } catch (error) {
      console.error('Failed to start recording:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to start recording';
      setRecordingState((prev) => ({ ...prev, error: errorMessage }));
      onError?.(errorMessage);
    }
  }, [
    isSupported,
    permissionGranted,
    requestPermission,
    initializeAudioAnalysis,
    updateAudioLevel,
    maxDuration,
    onRecordingComplete,
    onRecordingStart,
    onRecordingStop,
    onError,
    recordingState.duration,
  ]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
    }

    // Clean up
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => track.stop());
      audioStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setRecordingState((prev) => ({
      ...prev,
      isRecording: false,
      isPaused: false,
      audioLevel: 0,
    }));

    setVisualizationData({ levels: [], currentLevel: 0 });
  }, [recordingState.isRecording]);

  // Pause/Resume recording
  const togglePause = useCallback(() => {
    if (!mediaRecorderRef.current) return;

    if (recordingState.isPaused) {
      mediaRecorderRef.current.resume();
      if (durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
          setRecordingState((prev) => ({
            ...prev,
            duration: prev.duration + 0.1,
          }));
        }, 100);
      }
      updateAudioLevel();
    } else {
      mediaRecorderRef.current.pause();
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
        durationIntervalRef.current = null;
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    setRecordingState((prev) => ({ ...prev, isPaused: !prev.isPaused }));
  }, [recordingState.isPaused, updateAudioLevel]);

  // Format duration for display
  const formatDuration = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const decisecs = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${decisecs}`;
  }, []);

  // Calculate remaining time
  const remainingTime = Math.max(0, maxDuration - recordingState.duration);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  // Render error state
  if (!isSupported) {
    return (
      <div className={`voice-recorder voice-recorder--error ${className}`}>
        <div className='voice-recorder__error'>
          <span className='voice-recorder__error-icon'>⚠️</span>
          <p>Voice recording is not supported in this browser.</p>
        </div>
      </div>
    );
  }

  if (recordingState.error) {
    return (
      <div className={`voice-recorder voice-recorder--error ${className}`}>
        <div className='voice-recorder__error'>
          <span className='voice-recorder__error-icon'>⚠️</span>
          <p>{recordingState.error}</p>
          <button
            className='voice-recorder__retry-button'
            onClick={() => {
              setRecordingState((prev) => ({ ...prev, error: null }));
              setPermissionGranted(null);
            }}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`voice-recorder ${
        recordingState.isRecording ? 'voice-recorder--recording' : ''
      } ${className}`}
    >
      {/* Audio Visualization */}
      <div className='voice-recorder__visualization'>
        <div className='voice-recorder__waveform'>
          {visualizationData.levels.map((level, index) => (
            <div
              key={index}
              className='voice-recorder__wave-bar'
              style={{
                height: `${Math.max(2, level * 40)}px`,
                opacity:
                  index === visualizationData.levels.length - 1
                    ? 1
                    : 0.7 - (visualizationData.levels.length - index) * 0.01,
              }}
            />
          ))}
        </div>

        {/* Current level indicator */}
        <div
          className='voice-recorder__level-indicator'
          style={{
            transform: `scale(${1 + visualizationData.currentLevel * 0.5})`,
            opacity: recordingState.isRecording ? 1 : 0.3,
          }}
        />
      </div>

      {/* Controls */}
      <div className='voice-recorder__controls'>
        {!recordingState.isRecording ? (
          <button
            className='voice-recorder__button voice-recorder__button--start'
            onClick={startRecording}
            disabled={!isEnabled}
            aria-label='Start recording'
          >
            <span className='voice-recorder__button-icon'>🎤</span>
            Start Recording
          </button>
        ) : (
          <div className='voice-recorder__recording-controls'>
            <button
              className='voice-recorder__button voice-recorder__button--pause'
              onClick={togglePause}
              aria-label={
                recordingState.isPaused ? 'Resume recording' : 'Pause recording'
              }
            >
              <span className='voice-recorder__button-icon'>
                {recordingState.isPaused ? '▶️' : '⏸️'}
              </span>
              {recordingState.isPaused ? 'Resume' : 'Pause'}
            </button>

            <button
              className='voice-recorder__button voice-recorder__button--stop'
              onClick={stopRecording}
              aria-label='Stop recording'
            >
              <span className='voice-recorder__button-icon'>⏹️</span>
              Stop
            </button>
          </div>
        )}
      </div>

      {/* Duration and Status */}
      <div className='voice-recorder__status'>
        <div className='voice-recorder__duration'>
          <span className='voice-recorder__time'>
            {formatDuration(recordingState.duration)}
          </span>
          {recordingState.isRecording && (
            <span className='voice-recorder__remaining'>
              / {formatDuration(maxDuration)} max
            </span>
          )}
        </div>

        {recordingState.isRecording && (
          <div className='voice-recorder__recording-indicator'>
            <span className='voice-recorder__recording-dot' />
            {recordingState.isPaused ? 'Paused' : 'Recording'}
          </div>
        )}
      </div>

      {/* Progress bar */}
      {recordingState.isRecording && (
        <div className='voice-recorder__progress'>
          <div
            className='voice-recorder__progress-bar'
            style={{
              width: `${(recordingState.duration / maxDuration) * 100}%`,
            }}
          />
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
