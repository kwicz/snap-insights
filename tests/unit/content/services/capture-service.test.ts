/**
 * Tests for capture service - Simplified to match actual implementation
 */

import { captureService, CaptureOptions } from '@/content/services/capture-service';

// Mock dependencies
jest.mock('@/content/modules/notification-manager', () => ({
  showSuccessNotification: jest.fn(),
  showErrorNotification: jest.fn(),
}));

jest.mock('@/shared/services/message-service', () => ({
  getContentMessageService: () => ({
    sendToBackground: jest.fn().mockResolvedValue({
      success: true,
      data: { dataUrl: 'data:image/png;base64,mock' },
    }),
    testConnection: jest.fn().mockResolvedValue(true),
  }),
}));

describe('CaptureService', () => {
  const mockCaptureOptions: CaptureOptions = {
    coordinates: { x: 100, y: 200 },
    selectedIcon: 'blue',
    mode: 'snap',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('captureScreenshot', () => {
    test('should capture screenshot without throwing errors', async () => {
      await expect(captureService.captureScreenshot(mockCaptureOptions)).resolves.not.toThrow();
    });
  });

  describe('captureAnnotatedScreenshot', () => {
    test('should capture annotated screenshot with annotation', async () => {
      const optionsWithAnnotation = {
        ...mockCaptureOptions,
        annotation: 'Test annotation',
      };

      await expect(captureService.captureAnnotatedScreenshot(optionsWithAnnotation)).resolves.not.toThrow();
    });

    test('should handle missing annotation', async () => {
      await expect(captureService.captureAnnotatedScreenshot(mockCaptureOptions)).resolves.not.toThrow();
    });
  });

  describe('captureTranscribedScreenshot', () => {
    test('should capture transcribed screenshot with transcription', async () => {
      const optionsWithTranscription = {
        ...mockCaptureOptions,
        transcription: 'Test transcription',
      };

      await expect(captureService.captureTranscribedScreenshot(optionsWithTranscription)).resolves.not.toThrow();
    });

    test('should handle missing transcription', async () => {
      await expect(captureService.captureTranscribedScreenshot(mockCaptureOptions)).resolves.not.toThrow();
    });
  });

  describe('captureJourneyScreenshot', () => {
    test('should capture journey screenshot without throwing errors', async () => {
      await expect(captureService.captureJourneyScreenshot(mockCaptureOptions)).resolves.not.toThrow();
    });

    test('should call completion callback when provided', async () => {
      const onComplete = jest.fn();
      await captureService.captureJourneyScreenshot(mockCaptureOptions, onComplete);

      // Should call onComplete eventually
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('testConnection', () => {
    test('should test connection to background script', async () => {
      const result = await captureService.testConnection();
      expect(typeof result).toBe('boolean');
    });
  });
});