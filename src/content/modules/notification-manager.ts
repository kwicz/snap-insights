/**
 * Notification management for content script
 */

import { COLORS, Z_INDEX, ANIMATIONS } from '@/shared/constants/ui-constants';
import { SUCCESS_MESSAGES, ERROR_MESSAGES } from '@/shared/constants/app-constants';
import { contentLogger } from '@/utils/debug-logger';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationOptions {
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  dismissible?: boolean;
}

/**
 * Manager for showing notifications in content script
 */
export class NotificationManager {
  private activeNotifications = new Set<HTMLElement>();

  /**
   * Show success notification
   */
  showSuccess(message: string, options: NotificationOptions = {}): void {
    this.showNotification(message, 'success', options);
  }

  /**
   * Show error notification
   */
  showError(message: string, options: NotificationOptions = {}): void {
    this.showNotification(message, 'error', options);
  }

  /**
   * Show warning notification
   */
  showWarning(message: string, options: NotificationOptions = {}): void {
    this.showNotification(message, 'warning', options);
  }

  /**
   * Show info notification
   */
  showInfo(message: string, options: NotificationOptions = {}): void {
    this.showNotification(message, 'info', options);
  }

  /**
   * Show notification with specified type
   */
  private showNotification(
    message: string,
    type: NotificationType,
    options: NotificationOptions = {}
  ): void {
    const {
      duration = 3000,
      position = 'top-right',
      dismissible = true,
    } = options;

    contentLogger.debug('Showing notification', { message, type, options });

    const notification = this.createNotificationElement(message, type, position, dismissible);
    document.body.appendChild(notification);
    this.activeNotifications.add(notification);

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        this.dismissNotification(notification);
      }, duration);
    }
  }

  /**
   * Create notification element
   */
  private createNotificationElement(
    message: string,
    type: NotificationType,
    position: string,
    dismissible: boolean
  ): HTMLElement {
    const notification = document.createElement('div');
    notification.className = 'insight-clip-notification';
    
    // Position styles
    const positionStyles = this.getPositionStyles(position);
    
    notification.style.cssText = `
      position: fixed;
      ${positionStyles}
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: ${Z_INDEX.NOTIFICATION};
      pointer-events: ${dismissible ? 'auto' : 'none'};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      animation: slideIn ${ANIMATIONS.NORMAL} ease-out;
      background-color: ${this.getBackgroundColor(type)};
      max-width: 400px;
      word-wrap: break-word;
    `;

    // Add message text
    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    // Add close button if dismissible
    if (dismissible) {
      const closeButton = document.createElement('button');
      closeButton.innerHTML = '&times;';
      closeButton.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        font-weight: bold;
        margin-left: 12px;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      `;
      
      closeButton.onmouseover = () => {
        closeButton.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      };
      closeButton.onmouseout = () => {
        closeButton.style.backgroundColor = 'transparent';
      };
      
      closeButton.onclick = (e) => {
        e.stopPropagation();
        this.dismissNotification(notification);
      };
      
      notification.appendChild(closeButton);
    }

    return notification;
  }

  /**
   * Get position styles for notification
   */
  private getPositionStyles(position: string): string {
    switch (position) {
      case 'top-left':
        return 'top: 20px; left: 20px;';
      case 'top-right':
        return 'top: 20px; right: 20px;';
      case 'bottom-left':
        return 'bottom: 20px; left: 20px;';
      case 'bottom-right':
        return 'bottom: 20px; right: 20px;';
      default:
        return 'top: 20px; right: 20px;';
    }
  }

  /**
   * Get background color for notification type
   */
  private getBackgroundColor(type: NotificationType): string {
    switch (type) {
      case 'success':
        return COLORS.SUCCESS;
      case 'error':
        return COLORS.ERROR;
      case 'warning':
        return COLORS.WARNING;
      case 'info':
        return COLORS.PRIMARY;
      default:
        return COLORS.PRIMARY;
    }
  }

  /**
   * Dismiss notification with animation
   */
  private dismissNotification(notification: HTMLElement): void {
    if (!notification.parentNode) {
      return;
    }

    notification.style.animation = `slideOut ${ANIMATIONS.NORMAL} ease-in`;
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.activeNotifications.delete(notification);
    }, 300);
  }

  /**
   * Dismiss all notifications
   */
  dismissAll(): void {
    this.activeNotifications.forEach(notification => {
      this.dismissNotification(notification);
    });
  }

  /**
   * Get count of active notifications
   */
  getActiveCount(): number {
    return this.activeNotifications.size;
  }

  /**
   * Cleanup all notifications
   */
  cleanup(): void {
    this.dismissAll();
    contentLogger.debug('Notification manager cleanup completed');
  }
}

// Singleton instance
export const notificationManager = new NotificationManager();

// Convenience functions
export function showSuccessNotification(message: string, options?: NotificationOptions): void {
  notificationManager.showSuccess(message, options);
}

export function showErrorNotification(message: string, options?: NotificationOptions): void {
  notificationManager.showError(message, options);
}

export function showWarningNotification(message: string, options?: NotificationOptions): void {
  notificationManager.showWarning(message, options);
}

export function showInfoNotification(message: string, options?: NotificationOptions): void {
  notificationManager.showInfo(message, options);
}