/**
 * User notification service for displaying error messages and other notifications
 */

import { UserErrorNotification } from './error-handler';
import { debugLogger } from '@/utils/debug-logger';

/**
 * Interface for notification display options
 */
interface NotificationOptions {
  duration?: number; // Auto-dismiss duration in ms (0 = no auto-dismiss)
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  showProgress?: boolean; // Show countdown progress for auto-dismiss
  allowMultiple?: boolean; // Allow multiple notifications simultaneously
}

/**
 * Interface for notification action handlers
 */
interface NotificationActionHandlers {
  onRetry?: () => void;
  onDismiss?: () => void;
  onShowHelp?: (recoverySteps: string[]) => void;
}

/**
 * User notification service class
 */
export class UserNotificationService {
  private static instance: UserNotificationService;
  private notifications: Map<string, HTMLElement> = new Map();
  private notificationCounter = 0;

  private constructor() {
    this.injectStyles();
  }

  static getInstance(): UserNotificationService {
    if (!UserNotificationService.instance) {
      UserNotificationService.instance = new UserNotificationService();
    }
    return UserNotificationService.instance;
  }

  /**
   * Show error notification from error handler
   */
  showErrorNotification(
    notification: UserErrorNotification,
    options: NotificationOptions = {},
    actionHandlers: NotificationActionHandlers = {}
  ): string {
    const notificationId = `error-notification-${++this.notificationCounter}`;

    const element = this.createErrorNotificationElement(
      notification,
      notificationId,
      options,
      actionHandlers
    );

    this.displayNotification(notificationId, element, options);

    debugLogger.info('Error notification shown:', {
      id: notificationId,
      title: notification.title,
      type: notification.type,
    });

    return notificationId;
  }

  /**
   * Show simple success/info notification
   */
  showNotification(
    message: string,
    type: 'success' | 'info' | 'warning' = 'info',
    options: NotificationOptions = {}
  ): string {
    const notificationId = `notification-${++this.notificationCounter}`;

    const element = this.createSimpleNotificationElement(
      message,
      type,
      notificationId,
      options
    );

    this.displayNotification(notificationId, element, options);

    return notificationId;
  }

  /**
   * Show loading notification
   */
  showLoadingNotification(message: string = 'Processing...', options: NotificationOptions = {}): string {
    const notificationId = `loading-notification-${++this.notificationCounter}`;

    const element = this.createLoadingNotificationElement(
      message,
      notificationId,
      options
    );

    this.displayNotification(notificationId, element, { ...options, duration: 0 });

    return notificationId;
  }

  /**
   * Update loading notification message
   */
  updateLoadingNotification(notificationId: string, message: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      const messageElement = notification.querySelector('.snapinsights-notification-message');
      if (messageElement) {
        messageElement.textContent = message;
      }
    }
  }

  /**
   * Dismiss specific notification
   */
  dismissNotification(notificationId: string): void {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      this.animateOut(notification, () => {
        notification.remove();
        this.notifications.delete(notificationId);
      });
    }
  }

  /**
   * Dismiss all notifications
   */
  dismissAllNotifications(): void {
    this.notifications.forEach((notification, id) => {
      this.dismissNotification(id);
    });
  }

  /**
   * Create error notification element
   */
  private createErrorNotificationElement(
    notification: UserErrorNotification,
    notificationId: string,
    options: NotificationOptions,
    actionHandlers: NotificationActionHandlers
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = `snapinsights-notification snapinsights-notification-${notification.type}`;
    container.id = notificationId;

    // Icon based on type
    const icon = this.getNotificationIcon(notification.type);

    container.innerHTML = `
      <div class="snapinsights-notification-content">
        <div class="snapinsights-notification-header">
          <div class="snapinsights-notification-icon">${icon}</div>
          <h4 class="snapinsights-notification-title">${this.escapeHtml(notification.title)}</h4>
          ${notification.canDismiss ? '<button class="snapinsights-notification-close" type="button">×</button>' : ''}
        </div>
        <p class="snapinsights-notification-message">${this.escapeHtml(notification.message)}</p>
        ${notification.recoverySteps && notification.recoverySteps.length > 0 ? `
          <div class="snapinsights-notification-recovery" style="display: none;">
            <h5>Try these steps:</h5>
            <ul>
              ${notification.recoverySteps.map(step => `<li>${this.escapeHtml(step)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        <div class="snapinsights-notification-actions">
          ${notification.actions.map(action => `
            <button class="snapinsights-notification-action snapinsights-action-${action.action}" type="button" data-action="${action.action}">
              ${this.escapeHtml(action.label)}
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    this.attachErrorNotificationListeners(container, notification, actionHandlers);

    return container;
  }

  /**
   * Create simple notification element
   */
  private createSimpleNotificationElement(
    message: string,
    type: 'success' | 'info' | 'warning',
    notificationId: string,
    options: NotificationOptions
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = `snapinsights-notification snapinsights-notification-${type}`;
    container.id = notificationId;

    const icon = this.getNotificationIcon(type);

    container.innerHTML = `
      <div class="snapinsights-notification-content">
        <div class="snapinsights-notification-header">
          <div class="snapinsights-notification-icon">${icon}</div>
          <p class="snapinsights-notification-message">${this.escapeHtml(message)}</p>
          <button class="snapinsights-notification-close" type="button">×</button>
        </div>
      </div>
    `;

    // Add close listener
    const closeBtn = container.querySelector('.snapinsights-notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissNotification(notificationId);
      });
    }

    return container;
  }

  /**
   * Create loading notification element
   */
  private createLoadingNotificationElement(
    message: string,
    notificationId: string,
    options: NotificationOptions
  ): HTMLElement {
    const container = document.createElement('div');
    container.className = 'snapinsights-notification snapinsights-notification-loading';
    container.id = notificationId;

    container.innerHTML = `
      <div class="snapinsights-notification-content">
        <div class="snapinsights-notification-header">
          <div class="snapinsights-notification-spinner">
            <div class="snapinsights-spinner"></div>
          </div>
          <p class="snapinsights-notification-message">${this.escapeHtml(message)}</p>
        </div>
      </div>
    `;

    return container;
  }

  /**
   * Display notification with positioning and auto-dismiss
   */
  private displayNotification(
    notificationId: string,
    element: HTMLElement,
    options: NotificationOptions
  ): void {
    // Handle multiple notifications
    if (!options.allowMultiple) {
      this.dismissAllNotifications();
    }

    // Set position
    this.setNotificationPosition(element, options.position || 'top-right');

    // Add to DOM
    document.body.appendChild(element);
    this.notifications.set(notificationId, element);

    // Animate in
    this.animateIn(element);

    // Auto-dismiss
    if (options.duration && options.duration > 0) {
      this.setupAutoDismiss(notificationId, options.duration, options.showProgress);
    }
  }

  /**
   * Attach event listeners to error notification
   */
  private attachErrorNotificationListeners(
    container: HTMLElement,
    notification: UserErrorNotification,
    actionHandlers: NotificationActionHandlers
  ): void {
    // Close button
    const closeBtn = container.querySelector('.snapinsights-notification-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.dismissNotification(container.id);
        actionHandlers.onDismiss?.();
      });
    }

    // Action buttons
    const actionButtons = container.querySelectorAll('.snapinsights-notification-action');
    actionButtons.forEach(button => {
      const action = (button as HTMLElement).dataset.action;
      button.addEventListener('click', () => {
        switch (action) {
          case 'retry':
            actionHandlers.onRetry?.();
            this.dismissNotification(container.id);
            break;
          case 'show_help':
            this.toggleRecoverySteps(container);
            if (notification.recoverySteps) {
              actionHandlers.onShowHelp?.(notification.recoverySteps);
            }
            break;
          case 'dismiss':
            this.dismissNotification(container.id);
            actionHandlers.onDismiss?.();
            break;
        }
      });
    });
  }

  /**
   * Toggle recovery steps visibility
   */
  private toggleRecoverySteps(container: HTMLElement): void {
    const recoveryDiv = container.querySelector('.snapinsights-notification-recovery') as HTMLElement;
    const helpButton = container.querySelector('.snapinsights-action-show_help') as HTMLElement;

    if (recoveryDiv && helpButton) {
      if (recoveryDiv.style.display === 'none') {
        recoveryDiv.style.display = 'block';
        helpButton.textContent = 'Hide Help';
      } else {
        recoveryDiv.style.display = 'none';
        helpButton.textContent = 'Help';
      }
    }
  }

  /**
   * Set notification position on screen
   */
  private setNotificationPosition(element: HTMLElement, position: string): void {
    element.style.position = 'fixed';
    element.style.zIndex = '999999';

    switch (position) {
      case 'top-right':
        element.style.top = '20px';
        element.style.right = '20px';
        break;
      case 'top-left':
        element.style.top = '20px';
        element.style.left = '20px';
        break;
      case 'bottom-right':
        element.style.bottom = '20px';
        element.style.right = '20px';
        break;
      case 'bottom-left':
        element.style.bottom = '20px';
        element.style.left = '20px';
        break;
      case 'center':
        element.style.top = '50%';
        element.style.left = '50%';
        element.style.transform = 'translate(-50%, -50%)';
        break;
    }
  }

  /**
   * Setup auto-dismiss with optional progress indicator
   */
  private setupAutoDismiss(notificationId: string, duration: number, showProgress?: boolean): void {
    const notification = this.notifications.get(notificationId);
    if (!notification) return;

    if (showProgress) {
      this.addProgressIndicator(notification, duration);
    }

    setTimeout(() => {
      this.dismissNotification(notificationId);
    }, duration);
  }

  /**
   * Add progress indicator to notification
   */
  private addProgressIndicator(notification: HTMLElement, duration: number): void {
    const progressBar = document.createElement('div');
    progressBar.className = 'snapinsights-notification-progress';
    progressBar.innerHTML = '<div class="snapinsights-notification-progress-bar"></div>';

    const content = notification.querySelector('.snapinsights-notification-content');
    if (content) {
      content.appendChild(progressBar);

      const bar = progressBar.querySelector('.snapinsights-notification-progress-bar') as HTMLElement;
      if (bar) {
        bar.style.animation = `snapinsights-progress ${duration}ms linear forwards`;
      }
    }
  }

  /**
   * Animate notification in
   */
  private animateIn(element: HTMLElement): void {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';
    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';

    requestAnimationFrame(() => {
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    });
  }

  /**
   * Animate notification out
   */
  private animateOut(element: HTMLElement, callback: () => void): void {
    element.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';

    setTimeout(callback, 300);
  }

  /**
   * Get icon for notification type
   */
  private getNotificationIcon(type: string): string {
    const icons = {
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅',
      loading: '⏳',
    };

    return icons[type as keyof typeof icons] || icons.info;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Inject notification styles
   */
  private injectStyles(): void {
    if (document.querySelector('#snapinsights-notification-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'snapinsights-notification-styles';
    style.textContent = `
      .snapinsights-notification {
        max-width: 400px;
        min-width: 300px;
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border: 1px solid #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        font-size: 14px;
        line-height: 1.4;
      }

      .snapinsights-notification-content {
        padding: 16px;
      }

      .snapinsights-notification-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 8px;
      }

      .snapinsights-notification-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .snapinsights-notification-title {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        flex: 1;
      }

      .snapinsights-notification-message {
        margin: 0 0 12px 32px;
        color: #6b7280;
      }

      .snapinsights-notification-close {
        background: none;
        border: none;
        font-size: 20px;
        color: #9ca3af;
        cursor: pointer;
        padding: 0;
        width: 20px;
        height: 20px;
        flex-shrink: 0;
      }

      .snapinsights-notification-close:hover {
        color: #374151;
      }

      .snapinsights-notification-actions {
        display: flex;
        gap: 8px;
        margin-left: 32px;
      }

      .snapinsights-notification-action {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        background: white;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .snapinsights-notification-action:hover {
        background: #f9fafb;
      }

      .snapinsights-action-retry {
        background: #3b82f6;
        color: white;
        border-color: #3b82f6;
      }

      .snapinsights-action-retry:hover {
        background: #2563eb;
      }

      .snapinsights-notification-recovery {
        margin: 12px 0 12px 32px;
        padding: 12px;
        background: #f9fafb;
        border-radius: 6px;
        border: 1px solid #e5e7eb;
      }

      .snapinsights-notification-recovery h5 {
        margin: 0 0 8px 0;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        color: #374151;
      }

      .snapinsights-notification-recovery ul {
        margin: 0;
        padding-left: 16px;
      }

      .snapinsights-notification-recovery li {
        margin-bottom: 4px;
        color: #6b7280;
        font-size: 13px;
      }

      .snapinsights-notification-error {
        border-left: 4px solid #ef4444;
      }

      .snapinsights-notification-warning {
        border-left: 4px solid #f59e0b;
      }

      .snapinsights-notification-success {
        border-left: 4px solid #10b981;
      }

      .snapinsights-notification-info {
        border-left: 4px solid #3b82f6;
      }

      .snapinsights-notification-loading .snapinsights-notification-icon {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .snapinsights-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #3b82f6;
        border-radius: 50%;
        animation: snapinsights-spin 1s linear infinite;
      }

      .snapinsights-notification-progress {
        height: 2px;
        background: #e5e7eb;
        border-radius: 1px;
        margin-top: 8px;
        overflow: hidden;
      }

      .snapinsights-notification-progress-bar {
        height: 100%;
        background: #3b82f6;
        border-radius: 1px;
        width: 0%;
      }

      @keyframes snapinsights-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes snapinsights-progress {
        0% { width: 100%; }
        100% { width: 0%; }
      }
    `;

    document.head.appendChild(style);
  }
}

// Export singleton instance
export const userNotificationService = UserNotificationService.getInstance();