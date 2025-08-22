import React, { useState, useEffect } from 'react';
import { ExtensionMode } from '@/types';

export interface ModeToggleProps {
  currentMode: ExtensionMode;
  onModeChange: (mode: ExtensionMode) => void;
  disabled?: boolean;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'compact' | 'pills';
  className?: string;
}

export interface ModeOption {
  mode: ExtensionMode;
  icon: string;
  label: string;
  description: string;
  shortcut: string;
}

/**
 * Enhanced mode toggle component with multiple variants
 */
export const ModeToggle: React.FC<ModeToggleProps> = ({
  currentMode,
  onModeChange,
  disabled = false,
  showLabels = true,
  size = 'medium',
  variant = 'default',
  className = '',
}) => {
  const [isToggling, setIsToggling] = useState(false);
  const [lastToggleTime, setLastToggleTime] = useState(0);

  const modes: ModeOption[] = [
    {
      mode: 'screenshot',
      icon: '📷',
      label: 'Screenshot',
      description: 'Alt+Click to capture',
      shortcut: 'Alt+Click',
    },
    {
      mode: 'annotation',
      icon: '✏️',
      label: 'Annotation',
      description: 'Click to annotate',
      shortcut: 'Click',
    },
    {
      mode: 'transcribe',
      icon: '🎙️',
      label: 'Transcribe',
      description: 'Click to transcribe speech',
      shortcut: 'Click',
    },
  ];

  // Handle mode change with debouncing
  const handleModeChange = async (newMode: ExtensionMode) => {
    if (disabled || isToggling || newMode === currentMode) return;

    // Debounce rapid toggles
    const now = Date.now();
    if (now - lastToggleTime < 500) return;

    setIsToggling(true);
    setLastToggleTime(now);

    try {
      await onModeChange(newMode);
    } catch (error) {
      console.error('Failed to change mode:', error);
    } finally {
      // Add slight delay for visual feedback
      setTimeout(() => setIsToggling(false), 200);
    }
  };

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.key === 'M') {
        event.preventDefault();
        const newMode =
          currentMode === 'screenshot' ? 'annotation' : 'screenshot';
        handleModeChange(newMode);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentMode]);

  const getVariantClasses = () => {
    const baseClass = 'mode-toggle';
    const variantClass = `${baseClass}--${variant}`;
    const sizeClass = `${baseClass}--${size}`;
    const disabledClass = disabled ? `${baseClass}--disabled` : '';
    const togglingClass = isToggling ? `${baseClass}--toggling` : '';

    return [
      baseClass,
      variantClass,
      sizeClass,
      disabledClass,
      togglingClass,
      className,
    ]
      .filter(Boolean)
      .join(' ');
  };

  if (variant === 'compact') {
    return (
      <div className={getVariantClasses()}>
        <button
          className='mode-toggle__compact-button'
          onClick={() =>
            handleModeChange(
              currentMode === 'screenshot' ? 'annotation' : 'screenshot'
            )
          }
          disabled={disabled || isToggling}
          title={`Switch to ${
            currentMode === 'screenshot' ? 'annotation' : 'screenshot'
          } mode`}
        >
          <span className='mode-toggle__current-icon'>
            {modes.find((m) => m.mode === currentMode)?.icon}
          </span>
          <span className='mode-toggle__toggle-icon'>⇄</span>
        </button>

        {showLabels && (
          <span className='mode-toggle__current-label'>
            {modes.find((m) => m.mode === currentMode)?.label}
          </span>
        )}
      </div>
    );
  }

  if (variant === 'pills') {
    return (
      <div className={getVariantClasses()}>
        {modes.map((mode) => (
          <button
            key={mode.mode}
            className={`mode-toggle__pill ${
              currentMode === mode.mode ? 'mode-toggle__pill--active' : ''
            }`}
            onClick={() => handleModeChange(mode.mode)}
            disabled={disabled || isToggling}
            title={`${mode.label}: ${mode.description}`}
          >
            <span className='mode-toggle__pill-icon'>{mode.icon}</span>
            {showLabels && (
              <span className='mode-toggle__pill-label'>{mode.label}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Default variant
  return (
    <div className={getVariantClasses()}>
      <div className='mode-toggle__header'>
        <h3 className='mode-toggle__title'>Mode</h3>
        <div className='mode-toggle__shortcut-hint'>
          <kbd>Alt+Shift+M</kbd> to toggle
        </div>
      </div>

      <div
        className='mode-toggle__options'
        role='group'
        aria-label='Mode selection'
      >
        {modes.map((mode) => (
          <button
            key={mode.mode}
            className={`mode-toggle__option ${
              currentMode === mode.mode ? 'mode-toggle__option--active' : ''
            }`}
            onClick={() => handleModeChange(mode.mode)}
            disabled={disabled || isToggling}
          >
            <div className='mode-toggle__option-icon'>{mode.icon}</div>

            {showLabels && (
              <div className='mode-toggle__option-content'>
                <div className='mode-toggle__option-label'>{mode.label}</div>
                <div className='mode-toggle__option-description'>
                  {mode.description}
                </div>
                <div className='mode-toggle__option-shortcut'>
                  {mode.shortcut}
                </div>
              </div>
            )}

            {currentMode === mode.mode && (
              <div className='mode-toggle__active-indicator'>
                <span className='mode-toggle__checkmark'>✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {isToggling && (
        <div className='mode-toggle__loading'>
          <div className='mode-toggle__spinner'></div>
          <span>Switching mode...</span>
        </div>
      )}
    </div>
  );
};

export default ModeToggle;
