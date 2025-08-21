import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AnnotationData } from '@/types';
import './AnnotationDialog.css';

export interface AnnotationDialogProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onSave: (annotation: AnnotationData) => void;
  onCancel: () => void;
  initialText?: string;
  maxLength?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

export interface AnnotationDialogState {
  text: string;
  isValid: boolean;
  characterCount: number;
}

/**
 * AnnotationDialog component for capturing text annotations
 * Appears at click location with intelligent positioning
 */
export const AnnotationDialog: React.FC<AnnotationDialogProps> = ({
  isOpen,
  position,
  onSave,
  onCancel,
  initialText = '',
  maxLength = 200,
  placeholder = 'Add your annotation...',
  autoFocus = true,
}) => {
  const [text, setText] = useState(initialText);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Character count and validation
  const characterCount = text.length;
  const isValid = text.trim().length > 0 && characterCount <= maxLength;
  const remainingChars = maxLength - characterCount;

  // Reset text when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
    }
  }, [isOpen, initialText]);

  // Auto-focus textarea when dialog opens
  useEffect(() => {
    if (isOpen && autoFocus && textareaRef.current) {
      // Small delay to ensure dialog is rendered
      setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      }, 100);
    }
  }, [isOpen, autoFocus]);

  // Adjust position to keep dialog within viewport
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      const dialog = dialogRef.current;
      const rect = dialog.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let adjustedX = position.x;
      let adjustedY = position.y;

      // Adjust horizontal position
      if (position.x + rect.width > viewport.width) {
        adjustedX = viewport.width - rect.width - 20; // 20px margin
      }
      if (adjustedX < 20) {
        adjustedX = 20;
      }

      // Adjust vertical position
      if (position.y + rect.height > viewport.height) {
        adjustedY = position.y - rect.height - 20; // Position above click point
      }
      if (adjustedY < 20) {
        adjustedY = 20;
      }

      setAdjustedPosition({ x: adjustedX, y: adjustedY });
    }
  }, [isOpen, position]);

  // Handle text change
  const handleTextChange = useCallback(
    (event: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = event.target.value;
      setText(newText.slice(0, maxLength));
    },
    [maxLength]
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (isValid) {
      const annotation: AnnotationData = {
        text: text.trim(),
        coordinates: position,
      };
      onSave(annotation);
    }
  }, [isValid, text, position, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setText(initialText);
    onCancel();
  }, [initialText, onCancel]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        handleSave();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        handleCancel();
      }
    },
    [handleSave, handleCancel]
  );

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dialogRef.current &&
        !dialogRef.current.contains(event.target as Node)
      ) {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, handleCancel]);

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      ref={dialogRef}
      className='annotation-dialog'
      role='dialog'
      aria-labelledby='dialog-title'
      style={{
        position: 'fixed',
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        zIndex: 999999,
      }}
      onKeyDown={handleKeyDown}
    >
      <div className='annotation-dialog__container'>
        <button
          className='annotation-dialog__close'
          onClick={handleCancel}
          aria-label='Close dialog'
        >
          ×
        </button>

        {/* Content */}
        <div className='annotation-dialog__content'>
          <textarea
            ref={textareaRef}
            className='annotation-dialog__textarea'
            value={text}
            onChange={handleTextChange}
            placeholder={placeholder}
            rows={3}
            maxLength={maxLength}
            aria-label='Annotation text'
          />

          {/* Character counter */}
          <div className='annotation-dialog__counter'>
            <span
              className={`annotation-dialog__count ${
                remainingChars < 20 ? 'annotation-dialog__count--warning' : ''
              }`}
            >
              {characterCount}/{maxLength}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className='annotation-dialog__actions'>
          <button
            className='annotation-dialog__button annotation-dialog__button--primary'
            onClick={handleSave}
            disabled={!isValid}
          >
            Capture
          </button>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className='annotation-dialog__hint'>
          <small>
            Press <kbd>Ctrl+Enter</kbd> to capture, <kbd>Esc</kbd> to close
          </small>
        </div>
      </div>

      {/* Pointer arrow */}
      <div
        className='annotation-dialog__arrow'
        style={{
          left: Math.min(Math.max(position.x - adjustedPosition.x, 10), 290), // Keep arrow within dialog bounds
          display: adjustedPosition.y > position.y ? 'block' : 'none', // Only show when dialog is above click point
        }}
      />
    </div>
  );
};

// Default export
export default AnnotationDialog;
