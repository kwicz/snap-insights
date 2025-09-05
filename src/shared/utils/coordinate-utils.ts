/**
 * Utility functions for coordinate calculations and transformations
 */

export interface Coordinates {
  x: number;
  y: number;
}

export interface Bounds {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ViewportInfo {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
  devicePixelRatio: number;
}

/**
 * Get current viewport information
 */
export function getViewportInfo(): ViewportInfo {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    scrollX: window.scrollX || window.pageXOffset,
    scrollY: window.scrollY || window.pageYOffset,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

/**
 * Convert client coordinates to viewport coordinates
 * Chrome's captureVisibleTab captures only the visible viewport
 */
export function clientToViewport(coordinates: Coordinates): Coordinates {
  return {
    x: coordinates.x,
    y: coordinates.y,
  };
}

/**
 * Convert viewport coordinates to page coordinates
 */
export function viewportToPage(coordinates: Coordinates): Coordinates {
  const viewport = getViewportInfo();
  return {
    x: coordinates.x + viewport.scrollX,
    y: coordinates.y + viewport.scrollY,
  };
}

/**
 * Convert page coordinates to viewport coordinates
 */
export function pageToViewport(coordinates: Coordinates): Coordinates {
  const viewport = getViewportInfo();
  return {
    x: coordinates.x - viewport.scrollX,
    y: coordinates.y - viewport.scrollY,
  };
}

/**
 * Constrain coordinates to viewport bounds
 */
export function constrainToViewport(
  coordinates: Coordinates,
  elementSize?: { width: number; height: number }
): Coordinates {
  const viewport = getViewportInfo();
  const size = elementSize || { width: 0, height: 0 };
  
  return {
    x: Math.max(0, Math.min(coordinates.x, viewport.width - size.width)),
    y: Math.max(0, Math.min(coordinates.y, viewport.height - size.height)),
  };
}

/**
 * Calculate optimal position for a dialog relative to click coordinates
 */
export function calculateDialogPosition(
  clickCoordinates: Coordinates,
  dialogSize: { width: number; height: number },
  offset: number = 20,
  margin: number = 10
): Coordinates {
  const viewport = getViewportInfo();
  
  // Start with offset position (to the right and slightly down)
  let x = clickCoordinates.x + offset;
  let y = Math.max(clickCoordinates.y - offset, margin);
  
  // Adjust if dialog would go off-screen horizontally
  if (x + dialogSize.width > viewport.width - margin) {
    x = Math.max(margin, viewport.width - dialogSize.width - margin);
  }
  
  // Adjust if dialog would go off-screen vertically
  if (y + dialogSize.height > viewport.height - margin) {
    y = Math.max(margin, viewport.height - dialogSize.height - margin);
  }
  
  return { x, y };
}

/**
 * Calculate marker position for screenshot annotation
 * Ensures marker is positioned correctly for screenshot capture
 */
export function calculateMarkerPosition(
  coordinates: Coordinates,
  markerSize: number
): Coordinates {
  return {
    x: coordinates.x - markerSize / 2,
    y: coordinates.y - markerSize / 2,
  };
}

/**
 * Calculate text box position relative to marker
 */
export function calculateTextBoxPosition(
  markerCoordinates: Coordinates,
  markerSize: number,
  textBoxSize: { width: number; height: number },
  offset: number = 10
): Coordinates {
  const viewport = getViewportInfo();
  
  // Default position: to the right of the marker
  let x = markerCoordinates.x + markerSize / 2 + offset;
  let y = markerCoordinates.y - markerSize / 2;
  
  // Adjust if text box would go off-screen horizontally
  if (x + textBoxSize.width > viewport.width) {
    // Position to the left of the marker
    x = markerCoordinates.x - markerSize / 2 - textBoxSize.width - offset;
  }
  
  // Adjust if text box would go off-screen vertically
  if (y + textBoxSize.height > viewport.height) {
    y = viewport.height - textBoxSize.height;
  }
  
  // Ensure minimum margins
  x = Math.max(10, x);
  y = Math.max(10, y);
  
  return { x, y };
}

/**
 * Check if coordinates are within viewport bounds
 */
export function isInViewport(coordinates: Coordinates): boolean {
  const viewport = getViewportInfo();
  return (
    coordinates.x >= 0 &&
    coordinates.y >= 0 &&
    coordinates.x <= viewport.width &&
    coordinates.y <= viewport.height
  );
}

/**
 * Get element bounds relative to viewport
 */
export function getElementBounds(element: Element): Bounds {
  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Check if coordinates are within element bounds
 */
export function isWithinElement(coordinates: Coordinates, element: Element): boolean {
  const bounds = getElementBounds(element);
  return (
    coordinates.x >= bounds.left &&
    coordinates.x <= bounds.right &&
    coordinates.y >= bounds.top &&
    coordinates.y <= bounds.bottom
  );
}

/**
 * Calculate distance between two points
 */
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Round coordinates to avoid sub-pixel positioning issues
 */
export function roundCoordinates(coordinates: Coordinates): Coordinates {
  return {
    x: Math.round(coordinates.x),
    y: Math.round(coordinates.y),
  };
}