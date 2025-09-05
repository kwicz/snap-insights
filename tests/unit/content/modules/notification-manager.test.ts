/**
 * Tests for notification manager
 */

import { 
  notificationManager,
  showSuccessNotification,
  showErrorNotification,
  showWarningNotification,
  showInfoNotification,
} from '@/content/modules/notification-manager';

describe('NotificationManager', () => {
  beforeEach(async () => {
    // Clear any existing notifications
    notificationManager.dismissAll();
    
    // Wait for any pending dismissals to complete
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Clear DOM completely
    document.body.innerHTML = '';
    
    // Reset the notification manager's internal state
    (notificationManager as any).activeNotifications.clear();
    
    jest.clearAllMocks();
  });

  afterEach(async () => {
    notificationManager.cleanup();
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Ensure DOM is clean
    document.body.innerHTML = '';
  });

  describe('Basic Notification Display', () => {
    test('should show success notification', () => {
      notificationManager.showSuccess('Test success message');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Test success message');
    });

    test('should show error notification', () => {
      notificationManager.showError('Test error message');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Test error message');
    });

    test('should show warning notification', () => {
      notificationManager.showWarning('Test warning message');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Test warning message');
    });

    test('should show info notification', () => {
      notificationManager.showInfo('Test info message');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Test info message');
    });
  });

  describe('Notification Styling', () => {
    test('should apply correct background color for success', () => {
      notificationManager.showSuccess('Success');
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.backgroundColor).toBe('rgb(16, 185, 129)'); // #10b981
    });

    test('should apply correct background color for error', () => {
      notificationManager.showError('Error');
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.backgroundColor).toBe('rgb(239, 68, 68)'); // #ef4444
    });

    test('should apply correct background color for warning', () => {
      notificationManager.showWarning('Warning');
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.backgroundColor).toBe('rgb(245, 158, 11)'); // #f59e0b
    });

    test('should apply correct background color for info', () => {
      notificationManager.showInfo('Info');
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.backgroundColor).toBe('rgb(2, 119, 192)'); // #0277c0
    });
  });

  describe('Notification Positioning', () => {
    test('should position notification in top-right by default', () => {
      notificationManager.showSuccess('Test');
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.top).toBe('20px');
      expect(notification.style.right).toBe('20px');
    });

    test('should position notification in top-left when specified', () => {
      notificationManager.showSuccess('Test', { position: 'top-left' });
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.top).toBe('20px');
      expect(notification.style.left).toBe('20px');
    });

    test('should position notification in bottom-right when specified', () => {
      notificationManager.showSuccess('Test', { position: 'bottom-right' });
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.bottom).toBe('20px');
      expect(notification.style.right).toBe('20px');
    });

    test('should position notification in bottom-left when specified', () => {
      notificationManager.showSuccess('Test', { position: 'bottom-left' });
      
      const notification = document.querySelector('.insight-clip-notification') as HTMLElement;
      expect(notification.style.bottom).toBe('20px');
      expect(notification.style.left).toBe('20px');
    });
  });

  describe('Auto-dismiss Functionality', () => {
    test('should auto-dismiss notification after default duration', (done) => {
      notificationManager.showSuccess('Test', { duration: 100 });
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      
      setTimeout(() => {
        expect(notification).not.toBeInTheDocument();
        done();
      }, 450); // 100ms duration + 300ms animation + buffer
    });

    test('should not auto-dismiss when duration is 0', (done) => {
      notificationManager.showSuccess('Test', { duration: 0 });
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      
      setTimeout(() => {
        expect(notification).toBeInTheDocument();
        done();
      }, 100);
    });

    test('should respect custom duration', (done) => {
      notificationManager.showSuccess('Test', { duration: 50 });
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      
      setTimeout(() => {
        expect(notification).not.toBeInTheDocument();
        done();
      }, 400); // 50ms duration + 300ms animation + buffer
    });
  });

  describe('Dismissible Notifications', () => {
    test('should show close button for dismissible notifications', () => {
      notificationManager.showSuccess('Test', { dismissible: true });
      
      const closeButton = document.querySelector('.insight-clip-notification button');
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveTextContent('×');
    });

    test('should not show close button for non-dismissible notifications', () => {
      notificationManager.showSuccess('Test', { dismissible: false });
      
      const closeButton = document.querySelector('.insight-clip-notification button');
      expect(closeButton).not.toBeInTheDocument();
    });

    test('should dismiss notification when close button is clicked', () => {
      notificationManager.showSuccess('Test', { dismissible: true });
      
      const notification = document.querySelector('.insight-clip-notification');
      const closeButton = notification?.querySelector('button');
      
      expect(notification).toBeInTheDocument();
      
      closeButton?.click();
      
      // Should start dismiss animation
      expect(notification?.style.animation).toContain('slideOut');
    });
  });

  describe('Multiple Notifications', () => {
    test('should show multiple notifications simultaneously', () => {
      notificationManager.showSuccess('Success 1');
      notificationManager.showError('Error 1');
      notificationManager.showWarning('Warning 1');
      
      const notifications = document.querySelectorAll('.insight-clip-notification');
      expect(notifications).toHaveLength(3);
    });

    test('should track active notification count', () => {
      expect(notificationManager.getActiveCount()).toBe(0);
      
      notificationManager.showSuccess('Test 1');
      expect(notificationManager.getActiveCount()).toBe(1);
      
      notificationManager.showError('Test 2');
      expect(notificationManager.getActiveCount()).toBe(2);
    });

    test('should dismiss all notifications', async () => {
      notificationManager.showSuccess('Test 1');
      notificationManager.showError('Test 2');
      notificationManager.showWarning('Test 3');
      
      expect(notificationManager.getActiveCount()).toBe(3);
      
      notificationManager.dismissAll();
      
      // Should start dismiss animations for all
      const notifications = document.querySelectorAll('.insight-clip-notification');
      notifications.forEach(notification => {
        expect((notification as HTMLElement).style.animation).toContain('slideOut');
      });
      
      // Wait for animations to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(notificationManager.getActiveCount()).toBe(0);
    });
  });

  describe('Convenience Functions', () => {
    test('should work with showSuccessNotification function', () => {
      showSuccessNotification('Success test');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Success test');
    });

    test('should work with showErrorNotification function', () => {
      showErrorNotification('Error test');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Error test');
    });

    test('should work with showWarningNotification function', () => {
      showWarningNotification('Warning test');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Warning test');
    });

    test('should work with showInfoNotification function', () => {
      showInfoNotification('Info test');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent('Info test');
    });
  });

  describe('Cleanup', () => {
    test('should remove all notifications on cleanup', async () => {
      notificationManager.showSuccess('Test 1');
      notificationManager.showError('Test 2');
      
      expect(notificationManager.getActiveCount()).toBe(2);
      
      notificationManager.cleanup();
      
      // Wait for cleanup animations to complete
      await new Promise(resolve => setTimeout(resolve, 400));
      
      expect(notificationManager.getActiveCount()).toBe(0);
    });

    test('should handle cleanup with no active notifications', () => {
      expect(() => notificationManager.cleanup()).not.toThrow();
      expect(notificationManager.getActiveCount()).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty message', () => {
      notificationManager.showSuccess('');
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
    });

    test('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      notificationManager.showSuccess(longMessage);
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification).toHaveTextContent(longMessage);
    });

    test('should handle special characters in messages', () => {
      const specialMessage = 'Test with <script>alert("xss")</script> & special chars';
      notificationManager.showSuccess(specialMessage);
      
      const notification = document.querySelector('.insight-clip-notification');
      expect(notification).toBeInTheDocument();
      expect(notification?.textContent).toContain('Test with');
      expect(notification?.textContent).toContain('& special chars');
    });

    test('should handle rapid successive notifications', () => {
      for (let i = 0; i < 10; i++) {
        notificationManager.showSuccess(`Message ${i}`);
      }
      
      expect(notificationManager.getActiveCount()).toBe(10);
      
      const notifications = document.querySelectorAll('.insight-clip-notification');
      expect(notifications).toHaveLength(10);
    });
  });
});