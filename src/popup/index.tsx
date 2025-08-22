import React from 'react';
import { createRoot } from 'react-dom/client';
import '@/styles/theme.css';
import './Popup.css';
import Popup from './Popup';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize popup
  const container = document.getElementById('popup-root');
  if (!container) {
    console.error('Popup root element not found');
    return;
  }

  try {
    const root = createRoot(container);
    root.render(
      <React.StrictMode>
        <Popup />
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Failed to render popup:', error);
  }
});
