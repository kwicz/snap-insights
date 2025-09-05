/**
 * Tests for coordinate utility functions
 */

import {
  getViewportInfo,
  clientToViewport,
  viewportToPage,
  pageToViewport,
  constrainToViewport,
  calculateDialogPosition,
  calculateMarkerPosition,
  calculateTextBoxPosition,
  isInViewport,
  calculateDistance,
  roundCoordinates,
} from '@/shared/utils/coordinate-utils';

// Mock window properties
Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });
Object.defineProperty(window, 'scrollX', { value: 0, writable: true });
Object.defineProperty(window, 'scrollY', { value: 0, writable: true });
Object.defineProperty(window, 'devicePixelRatio', { value: 1, writable: true });

describe('Coordinate Utils', () => {
  describe('getViewportInfo', () => {
    test('should return current viewport information', () => {
      const viewport = getViewportInfo();
      
      expect(viewport).toEqual({
        width: 1024,
        height: 768,
        scrollX: 0,
        scrollY: 0,
        devicePixelRatio: 1,
      });
    });

    test('should handle different viewport sizes', () => {
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });
      
      const viewport = getViewportInfo();
      
      expect(viewport.width).toBe(1920);
      expect(viewport.height).toBe(1080);
      
      // Reset
      Object.defineProperty(window, 'innerWidth', { value: 1024 });
      Object.defineProperty(window, 'innerHeight', { value: 768 });
    });
  });

  describe('clientToViewport', () => {
    test('should return same coordinates (client = viewport)', () => {
      const coordinates = { x: 100, y: 200 };
      const result = clientToViewport(coordinates);
      
      expect(result).toEqual(coordinates);
    });
  });

  describe('viewportToPage', () => {
    test('should add scroll offset to coordinates', () => {
      Object.defineProperty(window, 'scrollX', { value: 50 });
      Object.defineProperty(window, 'scrollY', { value: 100 });
      
      const coordinates = { x: 100, y: 200 };
      const result = viewportToPage(coordinates);
      
      expect(result).toEqual({ x: 150, y: 300 });
      
      // Reset
      Object.defineProperty(window, 'scrollX', { value: 0 });
      Object.defineProperty(window, 'scrollY', { value: 0 });
    });
  });

  describe('pageToViewport', () => {
    test('should subtract scroll offset from coordinates', () => {
      Object.defineProperty(window, 'scrollX', { value: 50 });
      Object.defineProperty(window, 'scrollY', { value: 100 });
      
      const coordinates = { x: 150, y: 300 };
      const result = pageToViewport(coordinates);
      
      expect(result).toEqual({ x: 100, y: 200 });
      
      // Reset
      Object.defineProperty(window, 'scrollX', { value: 0 });
      Object.defineProperty(window, 'scrollY', { value: 0 });
    });
  });

  describe('constrainToViewport', () => {
    test('should keep coordinates within viewport bounds', () => {
      const coordinates = { x: 1100, y: 800 }; // Outside viewport
      const result = constrainToViewport(coordinates);
      
      expect(result.x).toBeLessThanOrEqual(1024);
      expect(result.y).toBeLessThanOrEqual(768);
    });

    test('should account for element size', () => {
      const coordinates = { x: 1000, y: 700 };
      const elementSize = { width: 100, height: 100 };
      const result = constrainToViewport(coordinates, elementSize);
      
      expect(result.x).toBeLessThanOrEqual(1024 - 100);
      expect(result.y).toBeLessThanOrEqual(768 - 100);
    });

    test('should not modify coordinates already in bounds', () => {
      const coordinates = { x: 100, y: 200 };
      const result = constrainToViewport(coordinates);
      
      expect(result).toEqual(coordinates);
    });
  });

  describe('calculateDialogPosition', () => {
    test('should position dialog with offset', () => {
      const clickCoordinates = { x: 100, y: 200 };
      const dialogSize = { width: 300, height: 200 };
      const result = calculateDialogPosition(clickCoordinates, dialogSize);
      
      expect(result.x).toBeGreaterThan(clickCoordinates.x);
      expect(result.y).toBeLessThanOrEqual(clickCoordinates.y);
    });

    test('should adjust position when dialog would go off-screen', () => {
      const clickCoordinates = { x: 900, y: 700 }; // Near bottom-right
      const dialogSize = { width: 300, height: 200 };
      const result = calculateDialogPosition(clickCoordinates, dialogSize);
      
      // Should be adjusted to fit in viewport
      expect(result.x + dialogSize.width).toBeLessThanOrEqual(1024 - 10);
      expect(result.y + dialogSize.height).toBeLessThanOrEqual(768 - 10);
    });
  });

  describe('calculateMarkerPosition', () => {
    test('should center marker on coordinates', () => {
      const coordinates = { x: 100, y: 200 };
      const markerSize = 64;
      const result = calculateMarkerPosition(coordinates, markerSize);
      
      expect(result).toEqual({ x: 68, y: 168 }); // 100-32, 200-32
    });
  });

  describe('calculateTextBoxPosition', () => {
    test('should position text box to the right of marker', () => {
      const markerCoordinates = { x: 100, y: 200 };
      const markerSize = 64;
      const textBoxSize = { width: 200, height: 100 };
      const result = calculateTextBoxPosition(markerCoordinates, markerSize, textBoxSize);
      
      expect(result.x).toBeGreaterThan(markerCoordinates.x);
    });

    test('should adjust position when text box would go off-screen', () => {
      const markerCoordinates = { x: 900, y: 200 }; // Near right edge
      const markerSize = 64;
      const textBoxSize = { width: 200, height: 100 };
      const result = calculateTextBoxPosition(markerCoordinates, markerSize, textBoxSize);
      
      // Should be positioned to the left of marker
      expect(result.x).toBeLessThan(markerCoordinates.x);
    });
  });

  describe('isInViewport', () => {
    test('should return true for coordinates within viewport', () => {
      expect(isInViewport({ x: 100, y: 200 })).toBe(true);
      expect(isInViewport({ x: 0, y: 0 })).toBe(true);
      expect(isInViewport({ x: 1024, y: 768 })).toBe(true);
    });

    test('should return false for coordinates outside viewport', () => {
      expect(isInViewport({ x: -10, y: 200 })).toBe(false);
      expect(isInViewport({ x: 100, y: -10 })).toBe(false);
      expect(isInViewport({ x: 1100, y: 200 })).toBe(false);
      expect(isInViewport({ x: 100, y: 800 })).toBe(false);
    });
  });

  describe('calculateDistance', () => {
    test('should calculate distance between two points', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      const distance = calculateDistance(point1, point2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    test('should return 0 for same points', () => {
      const point = { x: 100, y: 200 };
      const distance = calculateDistance(point, point);
      
      expect(distance).toBe(0);
    });
  });

  describe('roundCoordinates', () => {
    test('should round coordinates to integers', () => {
      const coordinates = { x: 100.7, y: 200.3 };
      const result = roundCoordinates(coordinates);
      
      expect(result).toEqual({ x: 101, y: 200 });
    });

    test('should not modify integer coordinates', () => {
      const coordinates = { x: 100, y: 200 };
      const result = roundCoordinates(coordinates);
      
      expect(result).toEqual(coordinates);
    });
  });
});