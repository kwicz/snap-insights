import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface AudioPlayerProps {
  audioBlob: Blob;
  transcript?: string;
  onDelete?: () => void;
  onRerecord?: () => void;
  className?: string;
  showTranscript?: boolean;
  autoPlay?: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoaded: boolean;
  isLoading: boolean;
}

/**
 * AudioPlayer component for playing back recorded voice notes
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioBlob,
  transcript,
  onDelete,
  onRerecord,
  className = '',
  showTranscript = true,
  autoPlay = false
}) => {
  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    isLoaded: false,
    isLoading: true
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Initialize audio element
  useEffect(() => {
    if (audioBlob) {
      // Create object URL for the blob
      audioUrlRef.current = URL.createObjectURL(audioBlob);
      
      // Create audio element
      const audio = new Audio(audioUrlRef.current);
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadedmetadata', () => {
        setState(prev => ({
          ...prev,
          duration: audio.duration,
          isLoaded: true,
          isLoading: false
        }));
      });

      audio.addEventListener('timeupdate', () => {
        setState(prev => ({
          ...prev,
          currentTime: audio.currentTime
        }));
      });

      audio.addEventListener('ended', () => {
        setState(prev => ({
          ...prev,
          isPlaying: false,
          currentTime: 0
        }));
        audio.currentTime = 0;
      });

      audio.addEventListener('play', () => {
        setState(prev => ({ ...prev, isPlaying: true }));
      });

      audio.addEventListener('pause', () => {
        setState(prev => ({ ...prev, isPlaying: false }));
      });

      audio.addEventListener('error', () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isLoaded: false
        }));
      });

      // Auto-play if requested
      if (autoPlay) {
        audio.play().catch(console.error);
      }

      // Cleanup function
      return () => {
        audio.pause();
        audio.removeEventListener('loadedmetadata', () => {});
        audio.removeEventListener('timeupdate', () => {});
        audio.removeEventListener('ended', () => {});
        audio.removeEventListener('play', () => {});
        audio.removeEventListener('pause', () => {});
        audio.removeEventListener('error', () => {});
        
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };
    }
  }, [audioBlob, autoPlay]);

  // Play/pause toggle
  const togglePlayback = useCallback(() => {
    if (!audioRef.current || !state.isLoaded) return;

    if (state.isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  }, [state.isPlaying, state.isLoaded]);

  // Seek to specific time
  const seekTo = useCallback((time: number) => {
    if (!audioRef.current || !state.isLoaded) return;
    
    audioRef.current.currentTime = Math.max(0, Math.min(time, state.duration));
  }, [state.isLoaded, state.duration]);

  // Handle progress bar click
  const handleProgressClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !state.isLoaded) return;

    const rect = progressRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * state.duration;
    
    seekTo(newTime);
  }, [state.isLoaded, state.duration, seekTo]);

  // Volume control
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
    
    setState(prev => ({ ...prev, volume: clampedVolume }));
  }, []);

  // Skip forward/backward
  const skip = useCallback((seconds: number) => {
    if (!audioRef.current || !state.isLoaded) return;
    
    const newTime = state.currentTime + seconds;
    seekTo(newTime);
  }, [state.currentTime, state.isLoaded, seekTo]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  if (state.isLoading) {
    return (
      <div className={`audio-player audio-player--loading ${className}`}>
        <div className="audio-player__loading">
          <div className="audio-player__spinner"></div>
          <span>Loading audio...</span>
        </div>
      </div>
    );
  }

  if (!state.isLoaded) {
    return (
      <div className={`audio-player audio-player--error ${className}`}>
        <div className="audio-player__error">
          <span className="audio-player__error-icon">⚠️</span>
          <span>Failed to load audio</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`audio-player ${className}`}>
      {/* Main Controls */}
      <div className="audio-player__controls">
        {/* Play/Pause Button */}
        <button
          className="audio-player__play-button"
          onClick={togglePlayback}
          aria-label={state.isPlaying ? 'Pause' : 'Play'}
        >
          <span className="audio-player__play-icon">
            {state.isPlaying ? '⏸️' : '▶️'}
          </span>
        </button>

        {/* Progress Bar */}
        <div className="audio-player__progress-container">
          <div
            ref={progressRef}
            className="audio-player__progress-bar"
            onClick={handleProgressClick}
            role="slider"
            aria-label="Audio progress"
            aria-valuemin={0}
            aria-valuemax={state.duration}
            aria-valuenow={state.currentTime}
          >
            <div
              className="audio-player__progress-fill"
              style={{ width: `${progressPercentage}%` }}
            />
            <div
              className="audio-player__progress-handle"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
          
          {/* Time Display */}
          <div className="audio-player__time">
            <span className="audio-player__current-time">
              {formatTime(state.currentTime)}
            </span>
            <span className="audio-player__separator">/</span>
            <span className="audio-player__duration">
              {formatTime(state.duration)}
            </span>
          </div>
        </div>
      </div>

      {/* Secondary Controls */}
      <div className="audio-player__secondary-controls">
        {/* Skip Controls */}
        <div className="audio-player__skip-controls">
          <button
            className="audio-player__skip-button"
            onClick={() => skip(-10)}
            aria-label="Skip back 10 seconds"
          >
            <span className="audio-player__skip-icon">⏪</span>
            <span className="audio-player__skip-text">-10s</span>
          </button>
          
          <button
            className="audio-player__skip-button"
            onClick={() => skip(10)}
            aria-label="Skip forward 10 seconds"
          >
            <span className="audio-player__skip-icon">⏩</span>
            <span className="audio-player__skip-text">+10s</span>
          </button>
        </div>

        {/* Volume Control */}
        <div className="audio-player__volume-control">
          <span className="audio-player__volume-icon">🔊</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={state.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="audio-player__volume-slider"
            aria-label="Volume"
          />
        </div>

        {/* Action Buttons */}
        <div className="audio-player__actions">
          {onRerecord && (
            <button
              className="audio-player__action-button audio-player__action-button--rerecord"
              onClick={onRerecord}
              aria-label="Record again"
            >
              <span className="audio-player__action-icon">🎤</span>
              <span>Re-record</span>
            </button>
          )}
          
          {onDelete && (
            <button
              className="audio-player__action-button audio-player__action-button--delete"
              onClick={onDelete}
              aria-label="Delete recording"
            >
              <span className="audio-player__action-icon">🗑️</span>
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Transcript Display */}
      {showTranscript && transcript && (
        <div className="audio-player__transcript">
          <div className="audio-player__transcript-header">
            <span className="audio-player__transcript-icon">📝</span>
            <span className="audio-player__transcript-label">Transcript:</span>
          </div>
          <div className="audio-player__transcript-content">
            {transcript}
          </div>
        </div>
      )}

      {/* Waveform Visualization (Optional) */}
      <div className="audio-player__waveform">
        <div className="audio-player__waveform-bars">
          {Array.from({ length: 40 }, (_, i) => (
            <div
              key={i}
              className={`audio-player__waveform-bar ${
                (i / 40) * 100 <= progressPercentage ? 'audio-player__waveform-bar--active' : ''
              }`}
              style={{
                height: `${Math.random() * 60 + 20}%`,
                animationDelay: `${i * 0.05}s`
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;