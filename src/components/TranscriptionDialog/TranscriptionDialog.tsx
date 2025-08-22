import React, { useState, useEffect, useCallback } from 'react';
import { AnnotationDialog } from '../AnnotationDialog';
import { TranscriptionIndicator } from '../TranscriptionIndicator';
import { RealTimeTranscription } from '@/utils/transcription';
import type { AnnotationData } from '@/types';
import './TranscriptionDialog.css';

export interface TranscriptionDialogProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSave: (annotation: AnnotationData) => void;
  onCancel: () => void;
  maxLength?: number;
}

/**
 * TranscriptionDialog component that combines transcription with annotation
 */
export const TranscriptionDialog: React.FC<TranscriptionDialogProps> = ({
  isOpen,
  position,
  onSave,
  onCancel,
  maxLength = 500,
}) => {
  const [transcription, setTranscription] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [confidence, setConfidence] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [transcriptionService] = useState(() => new RealTimeTranscription());

  // Cleanup function
  const cleanup = useCallback(() => {
    if (isTranscribing) {
      transcriptionService.stop();
      setIsTranscribing(false);
      setError(null);
      setRetryCount(0);
    }
  }, [isTranscribing]);

  // Maximum number of retry attempts
  const MAX_RETRIES = 3;

  // Function to start transcription with error handling
  const startTranscriptionWithRetry = useCallback(async () => {
    if (!transcriptionService.isSupported()) {
      setError('Speech recognition is not supported in your browser');
      setIsTranscribing(false);
      return;
    }

    try {
      setIsTranscribing(true);
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop()); // Clean up stream after permission check

      transcriptionService.start(
        {
          continuous: true,
          interimResults: true,
        },
        (text, isFinal, currentConfidence = 1) => {
          if (isFinal) {
            // For final results, append to existing transcription
            setTranscription((prev) => {
              const newText = prev ? `${prev} ${text}` : text;
              return newText.trim();
            });
          } else {
            // For interim results, show current transcription + interim
            setTranscription((prev) => {
              const baseText = prev || '';
              return `${baseText}${baseText ? ' ' : ''}${text}`.trim();
            });
          }
          setConfidence(currentConfidence);
          // Reset retry count on successful transcription
          setRetryCount(0);
        },
        async (error) => {
          console.error('Transcription error:', error);

          // Handle specific error types
          let errorMessage = error.message;
          if (error.code === 'not-allowed') {
            errorMessage =
              'Microphone access denied. Please enable microphone access and try again.';
          } else if (error.code === 'no-speech') {
            errorMessage = 'No speech detected. Please try speaking again.';
          } else if (error.code === 'network') {
            errorMessage =
              'Network error. Please check your connection and try again.';
          }

          setError(errorMessage);
          setIsTranscribing(false);

          // Attempt retry if under max attempts
          if (retryCount < MAX_RETRIES) {
            setRetryCount((prev) => prev + 1);
            // Wait before retrying
            await new Promise((resolve) => setTimeout(resolve, 1000));
            startTranscriptionWithRetry();
          }
        }
      );
    } catch (err) {
      console.error('Failed to start transcription:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to start transcription';
      setError(errorMessage);
      setIsTranscribing(false);
    }
  }, [retryCount]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Start transcription when dialog opens
  useEffect(() => {
    if (isOpen && !isTranscribing) {
      startTranscriptionWithRetry();
    }

    return cleanup;
  }, [isOpen, startTranscriptionWithRetry, cleanup]);

  // Handle transcription controls
  const handleStop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const handlePause = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const handleResume = useCallback(() => {
    startTranscriptionWithRetry();
  }, [startTranscriptionWithRetry]);

  // Handle dialog actions
  const handleSave = useCallback(
    (annotation: AnnotationData) => {
      handleStop();
      onSave(annotation);
    },
    [onSave, handleStop]
  );

  const handleCancel = useCallback(() => {
    handleStop();
    onCancel();
  }, [onCancel, handleStop]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className='transcription-dialog'>
      <TranscriptionIndicator
        isActive={isTranscribing}
        confidence={confidence}
        hasError={!!error}
        errorMessage={error || ''}
        onStop={handleStop}
        onPause={handlePause}
        onResume={handleResume}
        className='transcription-dialog__indicator'
      />
      <AnnotationDialog
        isOpen={isOpen}
        position={position}
        onSave={handleSave}
        onCancel={handleCancel}
        initialText={transcription}
        maxLength={maxLength}
        placeholder='Start speaking to transcribe...'
        autoFocus={false}
      />
    </div>
  );
};

export default TranscriptionDialog;
