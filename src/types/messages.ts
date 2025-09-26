/**
 * Message types for communication between extension components
 */

import { ExtensionMode, ExtensionSettings, ScreenshotData } from './index';
import { ScreenshotOptions, ScreenshotAnnotation } from './screenshot';

/**
 * Message types for different operations
 */
export type MessageType =
  // Screenshot operations
  | 'CAPTURE_SCREENSHOT'
  | 'SCREENSHOT_CAPTURED'
  | 'SCREENSHOT_ERROR'
  | 'SAVE_SCREENSHOT'
  | 'SCREENSHOT_SAVED'
  | 'START_CAPTURE'
  | 'ACTIVATE_EXTENSION'
  | 'DEACTIVATE_EXTENSION'
  | 'ACTIVATE_CAPTURE_MODE'
  | 'DEACTIVATE_CAPTURE_MODE'
  | 'TRIGGER_SCREENSHOT_MODE'
  | 'TOGGLE_MODE'
  | 'GET_SETTINGS'
  | 'GET_STORAGE_STATS'
  // Annotation operations
  | 'START_ANNOTATION'
  | 'ANNOTATION_ADDED'
  | 'ANNOTATION_UPDATED'
  | 'ANNOTATION_DELETED'
  | 'ANNOTATIONS_CLEARED'
  // Voice operations
  | 'START_RECORDING'
  | 'STOP_RECORDING'
  | 'RECORDING_SAVED'
  | 'TRANSCRIPTION_READY'
  // Settings operations
  | 'UPDATE_SETTINGS'
  | 'SETTINGS_UPDATED'
  | 'RESET_SETTINGS'
  // Error handling
  | 'ERROR_OCCURRED'
  | 'CLEAR_ERROR'
  // Journey mode operations
  | 'START_JOURNEY'
  | 'STOP_JOURNEY'
  | 'SAVE_JOURNEY_COLLECTION'
  | 'GET_JOURNEY_STATE'
  | 'GET_JOURNEY_STATS'
  | 'JOURNEY_SCREENSHOT_ADDED'
  | 'JOURNEY_STATE_UPDATED';

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
}

export interface StartCaptureMessage extends BaseMessage {
  type: 'START_CAPTURE';
  data: {
    mode: ExtensionMode;
  };
}

export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'SETTINGS_UPDATED';
  settings: ExtensionSettings;
}

/**
 * Screenshot capture messages
 */
export interface CaptureScreenshotMessage extends BaseMessage {
  type: 'CAPTURE_SCREENSHOT';
  options?: ScreenshotOptions;
  data?: {
    coordinates: { x: number; y: number };
  };
}

export interface ScreenshotCapturedMessage extends BaseMessage {
  type: 'SCREENSHOT_CAPTURED';
  screenshot: ScreenshotData;
}

export interface ScreenshotErrorMessage extends BaseMessage {
  type: 'SCREENSHOT_ERROR';
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Annotation messages
 */
export interface StartAnnotationMessage extends BaseMessage {
  type: 'START_ANNOTATION';
  mode: ExtensionMode;
  screenshot?: ScreenshotData;
}

export interface AnnotationAddedMessage extends BaseMessage {
  type: 'ANNOTATION_ADDED';
  annotation: ScreenshotAnnotation;
}

export interface AnnotationUpdatedMessage extends BaseMessage {
  type: 'ANNOTATION_UPDATED';
  annotation: ScreenshotAnnotation;
}

export interface AnnotationDeletedMessage extends BaseMessage {
  type: 'ANNOTATION_DELETED';
  annotationId: string;
}

export interface AnnotationsClearedMessage extends BaseMessage {
  type: 'ANNOTATIONS_CLEARED';
}

/**
 * Voice recording messages
 */
export interface StartRecordingMessage extends BaseMessage {
  type: 'START_RECORDING';
  maxDuration: number;
}

export interface StopRecordingMessage extends BaseMessage {
  type: 'STOP_RECORDING';
}

export interface RecordingSavedMessage extends BaseMessage {
  type: 'RECORDING_SAVED';
  audioUrl: string;
  duration: number;
}

export interface TranscriptionReadyMessage extends BaseMessage {
  type: 'TRANSCRIPTION_READY';
  text: string;
  confidence: number;
}

/**
 * Settings messages
 */
export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  settings: Partial<ExtensionSettings>;
}

export interface SettingsUpdatedMessage extends BaseMessage {
  type: 'SETTINGS_UPDATED';
  settings: ExtensionSettings;
}

export interface ResetSettingsMessage extends BaseMessage {
  type: 'RESET_SETTINGS';
}

/**
 * Error messages
 */
export interface ErrorOccurredMessage extends BaseMessage {
  type: 'ERROR_OCCURRED';
  error: {
    code: string;
    message: string;
    category: string;
    details?: Record<string, unknown>;
  };
}

export interface ClearErrorMessage extends BaseMessage {
  type: 'CLEAR_ERROR';
}

/**
 * Journey mode messages
 */
export interface StartJourneyMessage extends BaseMessage {
  type: 'START_JOURNEY';
}

export interface StopJourneyMessage extends BaseMessage {
  type: 'STOP_JOURNEY';
}

export interface SaveJourneyCollectionMessage extends BaseMessage {
  type: 'SAVE_JOURNEY_COLLECTION';
}

export interface GetJourneyStateMessage extends BaseMessage {
  type: 'GET_JOURNEY_STATE';
}

export interface GetJourneyStatsMessage extends BaseMessage {
  type: 'GET_JOURNEY_STATS';
}

export interface JourneyScreenshotAddedMessage extends BaseMessage {
  type: 'JOURNEY_SCREENSHOT_ADDED';
  data: {
    screenshotId: string;
    sequence: number;
    totalScreenshots: number;
  };
}

export interface JourneyStateUpdatedMessage extends BaseMessage {
  type: 'JOURNEY_STATE_UPDATED';
  data: {
    isActive: boolean;
    screenshotCount: number;
    startTime?: number;
  };
}

/**
 * Screenshot trigger message
 */
export interface TriggerScreenshotModeMessage extends BaseMessage {
  type: 'TRIGGER_SCREENSHOT_MODE';
}

/**
 * Save screenshot message
 */
export interface SaveScreenshotMessage extends BaseMessage {
  type: 'SAVE_SCREENSHOT';
  data: ScreenshotData;
}

/**
 * Toggle mode message
 */
export interface ToggleModeMessage extends BaseMessage {
  type: 'TOGGLE_MODE';
}

/**
 * Get settings message
 */
export interface GetSettingsMessage extends BaseMessage {
  type: 'GET_SETTINGS';
}

export interface GetStorageStatsMessage extends BaseMessage {
  type: 'GET_STORAGE_STATS';
}

/**
 * Extension state messages
 */
export interface ActivateExtensionMessage extends BaseMessage {
  type: 'ACTIVATE_EXTENSION';
  data: {
    mode: ExtensionMode;
    selectedIcon: 'light' | 'blue' | 'dark';
  };
}

export interface DeactivateExtensionMessage extends BaseMessage {
  type: 'DEACTIVATE_EXTENSION';
}

export interface ActivateCaptureModeMessage extends BaseMessage {
  type: 'ACTIVATE_CAPTURE_MODE';
  data: {
    mode?: ExtensionMode;
    selectedIcon?: 'light' | 'blue' | 'dark';
  };
}

export interface DeactivateCaptureModeMessage extends BaseMessage {
  type: 'DEACTIVATE_CAPTURE_MODE';
}

/**
 * Union type of all possible messages
 */
export type ExtensionMessage =
  | CaptureScreenshotMessage
  | ScreenshotCapturedMessage
  | ScreenshotErrorMessage
  | StartAnnotationMessage
  | AnnotationAddedMessage
  | AnnotationUpdatedMessage
  | AnnotationDeletedMessage
  | AnnotationsClearedMessage
  | StartRecordingMessage
  | StopRecordingMessage
  | RecordingSavedMessage
  | TranscriptionReadyMessage
  | UpdateSettingsMessage
  | SettingsUpdatedMessage
  | ResetSettingsMessage
  | ErrorOccurredMessage
  | ClearErrorMessage
  | TriggerScreenshotModeMessage
  | SaveScreenshotMessage
  | ToggleModeMessage
  | GetSettingsMessage
  | GetStorageStatsMessage
  | StartCaptureMessage
  | ActivateExtensionMessage
  | DeactivateExtensionMessage
  | ActivateCaptureModeMessage
  | DeactivateCaptureModeMessage
  | StartJourneyMessage
  | StopJourneyMessage
  | SaveJourneyCollectionMessage
  | GetJourneyStateMessage
  | GetJourneyStatsMessage
  | JourneyScreenshotAddedMessage
  | JourneyStateUpdatedMessage;

/**
 * Message handler type
 */
export type MessageHandler<T extends ExtensionMessage> = (
  message: T,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
) => void | boolean | Promise<any>;
