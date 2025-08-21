/**
 * Screenshot capture options and related types
 */

import { MarkerColorSettings } from './index';

/**
 * Screenshot capture options
 */
export interface ScreenshotOptions {
  /** Include cursor in screenshot */
  includeCursor?: boolean;
  /** Delay before capture (in milliseconds) */
  delay?: number;
  /** Capture full page or just viewport */
  captureFullPage?: boolean;
  /** Image format */
  format?: 'png' | 'jpeg';
  /** Image quality (for JPEG only) */
  quality?: number;
  /** Scale factor for high DPI displays */
  scale?: number;
}

/**
 * Screenshot region selection
 */
export interface ScreenshotRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Original page scroll position */
  scrollPosition: {
    x: number;
    y: number;
  };
}

/**
 * Screenshot metadata
 */
export interface ScreenshotMetadata {
  /** Page title when screenshot was taken */
  pageTitle: string;
  /** Page URL */
  pageUrl: string;
  /** Timestamp when screenshot was taken */
  timestamp: number;
  /** Browser information */
  browser: {
    name: string;
    version: string;
  };
  /** Screen dimensions */
  screen: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
}

/**
 * Screenshot processing options
 */
export interface ScreenshotProcessingOptions {
  /** Apply image filters */
  filters?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    blur?: number;
  };
  /** Resize options */
  resize?: {
    width?: number;
    height?: number;
    maintainAspectRatio?: boolean;
  };
  /** Crop options */
  crop?: ScreenshotRegion;
}

/**
 * Screenshot annotation tool
 */
export type AnnotationTool =
  | 'marker'
  | 'rectangle'
  | 'ellipse'
  | 'arrow'
  | 'text'
  | 'blur'
  | 'highlight';

/**
 * Screenshot annotation
 */
export interface ScreenshotAnnotation {
  /** Unique identifier */
  id: string;
  /** Tool type */
  tool: AnnotationTool;
  /** Position and size */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Style settings */
  style: MarkerColorSettings;
  /** Text content (for text annotations) */
  text?: string;
  /** Blur radius (for blur tool) */
  blurRadius?: number;
  /** Rotation angle in degrees */
  rotation?: number;
  /** Z-index for layering */
  zIndex: number;
}

/**
 * Screenshot edit history entry
 */
export interface ScreenshotHistoryEntry {
  /** Timestamp of the edit */
  timestamp: number;
  /** Type of edit operation */
  operation: 'add' | 'modify' | 'delete' | 'clear';
  /** Affected annotation IDs */
  annotationIds: string[];
  /** Previous state (for undo) */
  previousState?: ScreenshotAnnotation[];
  /** New state (for redo) */
  newState?: ScreenshotAnnotation[];
}
