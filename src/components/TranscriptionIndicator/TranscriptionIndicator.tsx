import React from 'react';
import './TranscriptionIndicator.css';

export interface TranscriptionIndicatorProps {
  isActive: boolean;
  confidence?: number;
  hasError?: boolean;
  errorMessage?: string;
  onStop?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  className?: string;
}

/**
 * Visual indicator for transcription status with controls
 */
export const TranscriptionIndicator: React.FC<TranscriptionIndicatorProps> = ({
  isActive,
  confidence = 1,
  hasError = false,
  errorMessage = '',
  onStop,
  onPause,
  onResume,
  className = '',
}) => {
  // Normalize confidence to 0-1 range
  const normalizedConfidence = Math.max(0, Math.min(1, confidence));

  // Dynamic classes based on state
  const containerClasses = [
    'transcription-indicator',
    isActive ? 'transcription-indicator--active' : '',
    hasError ? 'transcription-indicator--error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses} role='status'>
      {/* Microphone icon with pulse animation */}
      <div className='transcription-indicator__icon-container'>
        <div
          className='transcription-indicator__icon'
          style={{ opacity: normalizedConfidence }}
        >
          🎙️
        </div>
        {isActive && !hasError && (
          <div className='transcription-indicator__pulse' />
        )}
      </div>

      {/* Status text */}
      <div className='transcription-indicator__status'>
        {hasError ? (
          <span className='transcription-indicator__error'>
            {errorMessage || 'Error during transcription'}
          </span>
        ) : (
          <span>{isActive ? 'Transcribing...' : 'Ready to transcribe'}</span>
        )}
      </div>

      {/* Control buttons */}
      <div className='transcription-indicator__controls'>
        {isActive ? (
          <>
            <button
              className='transcription-indicator__button'
              onClick={onStop}
              title='Stop transcription'
            >
              ⏹️
            </button>
            <button
              className='transcription-indicator__button'
              onClick={onPause}
              title='Pause transcription'
            >
              ⏸️
            </button>
          </>
        ) : (
          <button
            className='transcription-indicator__button'
            onClick={onResume}
            title='Resume transcription'
            disabled={hasError}
          >
            ▶️
          </button>
        )}
      </div>
    </div>
  );
};

export default TranscriptionIndicator;
