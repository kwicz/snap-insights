/**
 * Tests for UI service
 */

import { uiService } from '@/content/services/ui-service';
import { notificationManager } from '@/content/modules/notification-manager';

// Mock dependencies
jest.mock('@/content/modules/notification-manager');

describe('UIService', () => {
  const mockCoordinates = { x: 100, y: 200 };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear DOM
    document.body.innerHTML = '';
    
    // Mock notification manager
    (notificationManager.showSuccess as jest.Mock) = jest.fn();
    (notificationManager.showError as jest.Mock) = jest.fn();
    (notificationManager.showInfo as jest.Mock) = jest.fn();
  });

  afterEach(() => {
    // Clean up any created dialogs
    uiService.cleanup();
  });

  describe('showAnnotationDialog', () => {
    test('should create and show annotation dialog', async () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('annotation-dialog');
    });

    test('should position dialog correctly', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog') as HTMLElement;
      expect(dialog.style.position).toBe('fixed');
      expect(dialog.style.left).toContain('px');
      expect(dialog.style.top).toContain('px');
    });

    test('should handle save action', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      const saveButton = document.querySelector('.save-button') as HTMLButtonElement;
      
      textarea.value = 'Test annotation';
      saveButton.click();
      
      expect(onSave).toHaveBeenCalledWith('Test annotation');
    });

    test('should handle cancel action', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const cancelButton = document.querySelector('.cancel-button') as HTMLButtonElement;
      cancelButton.click();
      
      expect(onCancel).toHaveBeenCalled();
    });

    test('should handle escape key', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const event = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(event);
      
      expect(onCancel).toHaveBeenCalled();
    });

    test('should prevent multiple dialogs', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const dialogs = document.querySelectorAll('.insight-clip-dialog');
      expect(dialogs).toHaveLength(1);
    });
  });

  describe('showTranscriptionDialog', () => {
    test('should create and show transcription dialog', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showTranscriptionDialog(mockCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveClass('transcription-dialog');
    });

    test('should show recording controls', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showTranscriptionDialog(mockCoordinates, onSave, onCancel);
      
      const recordButton = document.querySelector('.record-button');
      const stopButton = document.querySelector('.stop-button');
      
      expect(recordButton).toBeInTheDocument();
      expect(stopButton).toBeInTheDocument();
    });

    test('should handle recording start', async () => {
      // Mock media devices
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn().mockResolvedValue({
            getTracks: () => [{ stop: jest.fn() }],
          }),
        },
      });

      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showTranscriptionDialog(mockCoordinates, onSave, onCancel);
      
      const recordButton = document.querySelector('.record-button') as HTMLButtonElement;
      recordButton.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    test('should handle recording errors', async () => {
      // Mock media devices with error
      Object.defineProperty(navigator, 'mediaDevices', {
        writable: true,
        value: {
          getUserMedia: jest.fn().mockRejectedValue(new Error('Media access denied')),
        },
      });

      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showTranscriptionDialog(mockCoordinates, onSave, onCancel);
      
      const recordButton = document.querySelector('.record-button') as HTMLButtonElement;
      recordButton.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(notificationManager.showError).toHaveBeenCalledWith(
        expect.stringContaining('Media access denied')
      );
    });
  });

  describe('showMarker', () => {
    test('should create and show marker', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      
      const marker = document.querySelector('.insight-clip-marker');
      expect(marker).toBeInTheDocument();
    });

    test('should position marker correctly', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      
      const marker = document.querySelector('.insight-clip-marker') as HTMLElement;
      expect(marker.style.position).toBe('fixed');
      expect(marker.style.left).toBe('90px'); // x - 10 (half marker size)
      expect(marker.style.top).toBe('190px'); // y - 10 (half marker size)
    });

    test('should apply correct icon style', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      
      const marker = document.querySelector('.insight-clip-marker') as HTMLElement;
      expect(marker.classList).toContain('blue-icon');
    });

    test('should handle different icon types', () => {
      const iconTypes = ['light', 'blue', 'dark'] as const;
      
      iconTypes.forEach(iconType => {
        document.body.innerHTML = '';
        uiService.showMarker(mockCoordinates, iconType);
        
        const marker = document.querySelector('.insight-clip-marker') as HTMLElement;
        expect(marker.classList).toContain(`${iconType}-icon`);
      });
    });

    test('should remove existing markers', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      uiService.showMarker({ x: 150, y: 250 }, 'red');
      
      const markers = document.querySelectorAll('.insight-clip-marker');
      expect(markers).toHaveLength(1);
    });
  });

  describe('hideMarker', () => {
    test('should remove marker from DOM', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      
      let marker = document.querySelector('.insight-clip-marker');
      expect(marker).toBeInTheDocument();
      
      uiService.hideMarker();
      
      marker = document.querySelector('.insight-clip-marker');
      expect(marker).not.toBeInTheDocument();
    });

    test('should handle no marker gracefully', () => {
      expect(() => uiService.hideMarker()).not.toThrow();
    });
  });

  describe('showLoadingIndicator', () => {
    test('should create and show loading indicator', () => {
      uiService.showLoadingIndicator('Processing...');
      
      const indicator = document.querySelector('.insight-clip-loading');
      expect(indicator).toBeInTheDocument();
      expect(indicator).toHaveTextContent('Processing...');
    });

    test('should position loading indicator correctly', () => {
      uiService.showLoadingIndicator('Loading...');
      
      const indicator = document.querySelector('.insight-clip-loading') as HTMLElement;
      expect(indicator.style.position).toBe('fixed');
      expect(indicator.style.top).toBe('50%');
      expect(indicator.style.left).toBe('50%');
    });
  });

  describe('hideLoadingIndicator', () => {
    test('should remove loading indicator', () => {
      uiService.showLoadingIndicator('Loading...');
      
      let indicator = document.querySelector('.insight-clip-loading');
      expect(indicator).toBeInTheDocument();
      
      uiService.hideLoadingIndicator();
      
      indicator = document.querySelector('.insight-clip-loading');
      expect(indicator).not.toBeInTheDocument();
    });
  });

  describe('showTooltip', () => {
    test('should create and show tooltip', () => {
      uiService.showTooltip(mockCoordinates, 'Test tooltip');
      
      const tooltip = document.querySelector('.insight-clip-tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Test tooltip');
    });

    test('should auto-hide tooltip after delay', async () => {
      uiService.showTooltip(mockCoordinates, 'Test tooltip', 100);
      
      let tooltip = document.querySelector('.insight-clip-tooltip');
      expect(tooltip).toBeInTheDocument();
      
      // Wait for auto-hide
      await new Promise(resolve => setTimeout(resolve, 150));
      
      tooltip = document.querySelector('.insight-clip-tooltip');
      expect(tooltip).not.toBeInTheDocument();
    });
  });

  describe('cleanup', () => {
    test('should remove all UI elements', () => {
      uiService.showMarker(mockCoordinates, 'blue');
      uiService.showLoadingIndicator('Loading...');
      uiService.showTooltip(mockCoordinates, 'Tooltip');
      
      expect(document.querySelector('.insight-clip-marker')).toBeInTheDocument();
      expect(document.querySelector('.insight-clip-loading')).toBeInTheDocument();
      expect(document.querySelector('.insight-clip-tooltip')).toBeInTheDocument();
      
      uiService.cleanup();
      
      expect(document.querySelector('.insight-clip-marker')).not.toBeInTheDocument();
      expect(document.querySelector('.insight-clip-loading')).not.toBeInTheDocument();
      expect(document.querySelector('.insight-clip-tooltip')).not.toBeInTheDocument();
    });

    test('should handle cleanup with no elements', () => {
      expect(() => uiService.cleanup()).not.toThrow();
    });
  });

  describe('dialog positioning', () => {
    test('should adjust dialog position when near viewport edge', () => {
      const edgeCoordinates = { x: window.innerWidth - 50, y: window.innerHeight - 50 };
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(edgeCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog') as HTMLElement;
      const rect = dialog.getBoundingClientRect();
      
      // Dialog should be positioned to stay within viewport
      expect(rect.right).toBeLessThanOrEqual(window.innerWidth);
      expect(rect.bottom).toBeLessThanOrEqual(window.innerHeight);
    });
  });

  describe('accessibility', () => {
    test('should set proper ARIA attributes on dialogs', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog') as HTMLElement;
      expect(dialog.getAttribute('role')).toBe('dialog');
      expect(dialog.getAttribute('aria-modal')).toBe('true');
    });

    test('should focus first input in dialog', () => {
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe('responsive design', () => {
    test('should adapt dialog size for small screens', () => {
      // Mock small screen
      Object.defineProperty(window, 'innerWidth', { value: 400, writable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, writable: true });
      
      const onSave = jest.fn();
      const onCancel = jest.fn();
      
      uiService.showAnnotationDialog(mockCoordinates, onSave, onCancel);
      
      const dialog = document.querySelector('.insight-clip-dialog') as HTMLElement;
      const rect = dialog.getBoundingClientRect();
      
      expect(rect.width).toBeLessThan(window.innerWidth);
    });
  });
});