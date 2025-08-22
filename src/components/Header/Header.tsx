import React from 'react';
import './Header.css';

interface HeaderProps {
  status?: 'online' | 'offline' | 'error';
  statusText?: string;
}

const Header: React.FC<HeaderProps> = ({
  status = 'online',
  statusText = 'Ready to capture',
}) => {
  return (
    <div className='header'>
      <div className='logo'>
        <svg
          className='logo-icon'
          viewBox='0 0 24 24'
          fill='none'
          xmlns='http://www.w3.org/2000/svg'
        >
          <rect
            x='3'
            y='3'
            width='18'
            height='18'
            rx='2'
            stroke='currentColor'
            strokeWidth='2'
          />
          <circle cx='12' cy='12' r='3' fill='currentColor' />
          <path
            d='M16 8l2-2M8 8L6 6M8 16l-2 2M16 16l2 2'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
          />
        </svg>
        <span className='logo-text'>SnapContext</span>
      </div>
      <div className='status'>
        <span
          className={`status-dot ${status} ${
            status === 'online' ? 'active' : ''
          }`}
        />
        {statusText}
      </div>
    </div>
  );
};

export default Header;
