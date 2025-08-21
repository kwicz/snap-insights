export interface Position {
  x: number;
  y: number;
}

export interface Dimensions {
  width: number;
  height: number;
}

export interface Viewport {
  width: number;
  height: number;
  scrollX: number;
  scrollY: number;
}

export interface PositioningOptions {
  preferredPosition?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  offset?: number;
  margin?: number;
  allowFlip?: boolean;
  keepInViewport?: boolean;
  centerOnTarget?: boolean;
}

export interface PositionResult {
  x: number;
  y: number;
  position: 'top' | 'bottom' | 'left' | 'right';
  isFlipped: boolean;
  isConstrained: boolean;
}

type Direction = 'top' | 'bottom' | 'left' | 'right';
type Distances = Record<Direction, number>;

/**
 * Intelligent dialog positioning system
 * Calculates optimal position for dialogs relative to target elements
 */
export class DialogPositioner {
  private viewport!: Viewport;
  private defaultOptions: Required<PositioningOptions> = {
    preferredPosition: 'auto',
    offset: 8,
    margin: 20,
    allowFlip: true,
    keepInViewport: true,
    centerOnTarget: false,
  };

  constructor() {
    this.updateViewport();

    // Update viewport on scroll and resize
    window.addEventListener('scroll', this.updateViewport.bind(this));
    window.addEventListener('resize', this.updateViewport.bind(this));
  }

  /**
   * Calculate optimal position for dialog
   */
  calculatePosition(
    targetPosition: Position,
    targetDimensions: Dimensions,
    dialogDimensions: Dimensions,
    options: PositioningOptions = {}
  ): PositionResult {
    const opts = { ...this.defaultOptions, ...options };
    this.updateViewport();

    // Try preferred position first
    let position = opts.preferredPosition;
    let result: PositionResult;

    if (position === 'auto') {
      // Auto-detect best position based on available space
      position = this.detectBestPosition(
        targetPosition,
        targetDimensions,
        dialogDimensions,
        opts
      );
    }

    result = this.positionDialog(
      targetPosition,
      targetDimensions,
      dialogDimensions,
      position as Direction,
      opts
    );

    // If dialog doesn't fit and flipping is allowed, try alternative positions
    if (!this.fitsInViewport(result, dialogDimensions) && opts.allowFlip) {
      const alternatives = this.getAlternativePositions(result.position);

      for (const altPosition of alternatives) {
        const altResult = this.positionDialog(
          targetPosition,
          targetDimensions,
          dialogDimensions,
          altPosition,
          opts
        );

        if (this.fitsInViewport(altResult, dialogDimensions)) {
          result = { ...altResult, isFlipped: true };
          break;
        }
      }
    }

    // Constrain to viewport if necessary
    if (opts.keepInViewport) {
      result = this.constrainToViewport(result, dialogDimensions);
    }

    return result;
  }

  /**
   * Position dialog relative to click coordinates
   */
  positionAtClick(
    clickPosition: Position,
    dialogDimensions: Dimensions,
    options: PositioningOptions = {}
  ): PositionResult {
    const opts = { ...this.defaultOptions, ...options };
    this.updateViewport();

    // Treat click as a point target
    const targetDimensions = { width: 0, height: 0 };

    return this.calculatePosition(
      clickPosition,
      targetDimensions,
      dialogDimensions,
      {
        ...opts,
        preferredPosition: 'bottom', // Default to bottom-right of click
        centerOnTarget: false,
      }
    );
  }

  /**
   * Position dialog relative to DOM element
   */
  positionRelativeToElement(
    element: HTMLElement,
    dialogDimensions: Dimensions,
    options: PositioningOptions = {}
  ): PositionResult {
    const rect = element.getBoundingClientRect();
    const targetPosition = {
      x: rect.left + this.viewport.scrollX,
      y: rect.top + this.viewport.scrollY,
    };
    const targetDimensions = {
      width: rect.width,
      height: rect.height,
    };

    return this.calculatePosition(
      targetPosition,
      targetDimensions,
      dialogDimensions,
      options
    );
  }

  /**
   * Update viewport information
   */
  private updateViewport(): void {
    this.viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
      scrollX: window.scrollX || window.pageXOffset,
      scrollY: window.scrollY || window.pageYOffset,
    };
  }

  /**
   * Detect best position based on available space
   */
  private detectBestPosition(
    targetPosition: Position,
    targetDimensions: Dimensions,
    dialogDimensions: Dimensions,
    options: Required<PositioningOptions>
  ): Direction {
    const spaces = this.calculateAvailableSpaces(
      targetPosition,
      targetDimensions
    );

    // Check which positions have enough space
    const positions: Array<{ position: Direction; space: number }> = [
      { position: 'bottom', space: spaces.bottom },
      { position: 'top', space: spaces.top },
      { position: 'right', space: spaces.right },
      { position: 'left', space: spaces.left },
    ];

    // Filter positions that have enough space
    const validPositions = positions.filter((p) => {
      if (p.position === 'top' || p.position === 'bottom') {
        return p.space >= dialogDimensions.height + options.offset;
      } else {
        return p.space >= dialogDimensions.width + options.offset;
      }
    });

    // Return position with most space, or bottom as fallback
    if (validPositions.length > 0) {
      return validPositions.sort((a, b) => b.space - a.space)[0].position;
    }

    return 'bottom';
  }

  /**
   * Calculate available space in each direction
   */
  private calculateAvailableSpaces(
    targetPosition: Position,
    targetDimensions: Dimensions
  ): Distances {
    const targetCenterX = targetPosition.x + targetDimensions.width / 2;
    const targetCenterY = targetPosition.y + targetDimensions.height / 2;

    return {
      top: targetPosition.y - this.viewport.scrollY,
      bottom:
        this.viewport.height -
        (targetPosition.y + targetDimensions.height - this.viewport.scrollY),
      left: targetPosition.x - this.viewport.scrollX,
      right:
        this.viewport.width -
        (targetPosition.x + targetDimensions.width - this.viewport.scrollX),
    };
  }

  /**
   * Position dialog in specific direction
   */
  private positionDialog(
    targetPosition: Position,
    targetDimensions: Dimensions,
    dialogDimensions: Dimensions,
    position: Direction,
    options: Required<PositioningOptions>
  ): PositionResult {
    let x: number, y: number;

    switch (position) {
      case 'top':
        x = options.centerOnTarget
          ? targetPosition.x +
            (targetDimensions.width - dialogDimensions.width) / 2
          : targetPosition.x;
        y = targetPosition.y - dialogDimensions.height - options.offset;
        break;

      case 'bottom':
        x = options.centerOnTarget
          ? targetPosition.x +
            (targetDimensions.width - dialogDimensions.width) / 2
          : targetPosition.x;
        y = targetPosition.y + targetDimensions.height + options.offset;
        break;

      case 'left':
        x = targetPosition.x - dialogDimensions.width - options.offset;
        y = options.centerOnTarget
          ? targetPosition.y +
            (targetDimensions.height - dialogDimensions.height) / 2
          : targetPosition.y;
        break;

      case 'right':
        x = targetPosition.x + targetDimensions.width + options.offset;
        y = options.centerOnTarget
          ? targetPosition.y +
            (targetDimensions.height - dialogDimensions.height) / 2
          : targetPosition.y;
        break;
    }

    return {
      x,
      y,
      position,
      isFlipped: false,
      isConstrained: false,
    };
  }

  /**
   * Get alternative positions for flipping
   */
  private getAlternativePositions(position: Direction): Direction[] {
    const alternatives: Record<Direction, Direction[]> = {
      top: ['bottom', 'right', 'left'],
      bottom: ['top', 'right', 'left'],
      left: ['right', 'bottom', 'top'],
      right: ['left', 'bottom', 'top'],
    };

    return alternatives[position] || [];
  }

  /**
   * Check if dialog fits in viewport
   */
  private fitsInViewport(
    position: PositionResult,
    dialogDimensions: Dimensions
  ): boolean {
    const viewportBounds = {
      left: this.viewport.scrollX,
      top: this.viewport.scrollY,
      right: this.viewport.scrollX + this.viewport.width,
      bottom: this.viewport.scrollY + this.viewport.height,
    };

    const dialogBounds = {
      left: position.x,
      top: position.y,
      right: position.x + dialogDimensions.width,
      bottom: position.y + dialogDimensions.height,
    };

    return (
      dialogBounds.left >= viewportBounds.left &&
      dialogBounds.top >= viewportBounds.top &&
      dialogBounds.right <= viewportBounds.right &&
      dialogBounds.bottom <= viewportBounds.bottom
    );
  }

  /**
   * Constrain dialog position to viewport
   */
  private constrainToViewport(
    position: PositionResult,
    dialogDimensions: Dimensions
  ): PositionResult {
    const margin = this.defaultOptions.margin;
    const viewportBounds = {
      left: this.viewport.scrollX + margin,
      top: this.viewport.scrollY + margin,
      right: this.viewport.scrollX + this.viewport.width - margin,
      bottom: this.viewport.scrollY + this.viewport.height - margin,
    };

    let { x, y } = position;
    let isConstrained = false;

    // Constrain horizontally
    if (x < viewportBounds.left) {
      x = viewportBounds.left;
      isConstrained = true;
    } else if (x + dialogDimensions.width > viewportBounds.right) {
      x = viewportBounds.right - dialogDimensions.width;
      isConstrained = true;
    }

    // Constrain vertically
    if (y < viewportBounds.top) {
      y = viewportBounds.top;
      isConstrained = true;
    } else if (y + dialogDimensions.height > viewportBounds.bottom) {
      y = viewportBounds.bottom - dialogDimensions.height;
      isConstrained = true;
    }

    return {
      ...position,
      x,
      y,
      isConstrained,
    };
  }

  /**
   * Cleanup event listeners
   */
  dispose(): void {
    window.removeEventListener('scroll', this.updateViewport.bind(this));
    window.removeEventListener('resize', this.updateViewport.bind(this));
  }
}

/**
 * Utility functions for positioning
 */
export const PositioningUtils = {
  /**
   * Get element dimensions including margins
   */
  getElementDimensions(
    element: HTMLElement,
    includeMargins = false
  ): Dimensions {
    const rect = element.getBoundingClientRect();

    if (!includeMargins) {
      return { width: rect.width, height: rect.height };
    }

    const styles = window.getComputedStyle(element);
    const marginLeft = parseFloat(styles.marginLeft) || 0;
    const marginRight = parseFloat(styles.marginRight) || 0;
    const marginTop = parseFloat(styles.marginTop) || 0;
    const marginBottom = parseFloat(styles.marginBottom) || 0;

    return {
      width: rect.width + marginLeft + marginRight,
      height: rect.height + marginTop + marginBottom,
    };
  },

  /**
   * Get element position relative to document
   */
  getElementPosition(element: HTMLElement): Position {
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left + (window.scrollX || window.pageXOffset),
      y: rect.top + (window.scrollY || window.pageYOffset),
    };
  },

  /**
   * Check if point is within element bounds
   */
  isPointInElement(point: Position, element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const elementBounds = {
      left: rect.left + scrollX,
      top: rect.top + scrollY,
      right: rect.right + scrollX,
      bottom: rect.bottom + scrollY,
    };

    return (
      point.x >= elementBounds.left &&
      point.x <= elementBounds.right &&
      point.y >= elementBounds.top &&
      point.y <= elementBounds.bottom
    );
  },

  /**
   * Calculate distance between two points
   */
  calculateDistance(point1: Position, point2: Position): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Find closest edge of element to point
   */
  findClosestEdge(point: Position, element: HTMLElement): Direction {
    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    const elementCenter = {
      x: rect.left + scrollX + rect.width / 2,
      y: rect.top + scrollY + rect.height / 2,
    };

    const distances: Distances = {
      top: Math.abs(point.y - (rect.top + scrollY)),
      bottom: Math.abs(point.y - (rect.bottom + scrollY)),
      left: Math.abs(point.x - (rect.left + scrollX)),
      right: Math.abs(point.x - (rect.right + scrollX)),
    };

    return Object.entries(distances).reduce<Direction>(
      (closest, [edge, distance]) =>
        distance < distances[closest] ? (edge as Direction) : closest,
      'top'
    );
  },
};

// Export singleton instance
export const dialogPositioner = new DialogPositioner();
