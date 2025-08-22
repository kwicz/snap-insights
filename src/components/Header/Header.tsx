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
        <img
          src={'./assets/icon.png'}
          alt='SnapContext'
          className='logo-icon'
        />
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
