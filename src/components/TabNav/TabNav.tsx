import React from 'react';
import './TabNav.css';

export interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface TabNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const TabNav: React.FC<TabNavProps> = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div className='tab-nav'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onTabChange(tab.id)}
          data-tab={tab.id}
        >
          <span className='tab-label'>{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

// Default icons for the tabs
export const TabIcons = {
  Snap: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
      />
    </svg>
  ),
  Annotate: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z'
      />
    </svg>
  ),
  Transcribe: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z'
      />
    </svg>
  ),
  Start: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M8 5v14l11-7z'
      />
    </svg>
  ),
  Pause: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M6 4h4v16H6V4zm8 0h4v16h-4V4z'
      />
    </svg>
  ),
  Save: (
    <svg viewBox='0 0 24 24'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='1'
        d='M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4'
      />
    </svg>
  ),
};

export default TabNav;
