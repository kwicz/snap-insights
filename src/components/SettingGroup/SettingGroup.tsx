import React from 'react';
import './SettingGroup.css';

interface SettingGroupProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const SettingGroup: React.FC<SettingGroupProps> = ({
  label,
  description,
  children,
}) => {
  return (
    <div className='setting-group'>
      <label className='setting-label'>{label}</label>
      {description && <p className='setting-description'>{description}</p>}
      <div className='setting-content'>{children}</div>
    </div>
  );
};

export interface SettingRowProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const SettingRow: React.FC<SettingRowProps> = ({
  title,
  description,
  children,
}) => {
  return (
    <div className='setting-row'>
      <div className='setting-row-text'>
        <div className='setting-row-title'>{title}</div>
        {description && (
          <div className='setting-row-description'>{description}</div>
        )}
      </div>
      {children}
    </div>
  );
};

export default SettingGroup;
