import React from 'react';
import './Button.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  iconOnly?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      icon,
      iconOnly = false,
      loading = false,
      fullWidth = false,
      className = '',
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const classes = [
      'btn',
      `btn-${variant}`,
      size !== 'md' && `btn-${size}`,
      iconOnly && 'btn-icon',
      loading && 'btn-loading',
      fullWidth && 'btn-full',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button
        ref={ref}
        className={classes}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className='btn-loading-content'>{children}</span>
        ) : (
          <>
            {icon}
            {!iconOnly && children}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
