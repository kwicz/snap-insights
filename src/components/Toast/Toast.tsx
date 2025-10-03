import React, { useEffect } from 'react';
import './Toast.css';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="assertive">
      <span className="toast__message">{message}</span>
      <button
        className="toast__close"
        onClick={onClose}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
};

export default Toast;
