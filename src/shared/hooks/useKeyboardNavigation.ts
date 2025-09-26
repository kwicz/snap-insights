/**
 * Keyboard navigation hook for popup interface accessibility
 * Provides comprehensive keyboard navigation with focus management
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { eventBus } from '../services/event-bus';

export interface NavigationItem {
  id: string;
  element?: HTMLElement;
  tabIndex?: number;
  disabled?: boolean;
  group?: string;
  ariaLabel?: string;
  role?: string;
}

export interface KeyboardNavigationOptions {
  /** Enable arrow key navigation */
  enableArrowKeys?: boolean;
  /** Enable tab/shift+tab navigation */
  enableTabKeys?: boolean;
  /** Enable Enter/Space activation */
  enableActivation?: boolean;
  /** Enable Escape key handling */
  enableEscape?: boolean;
  /** Wrap around when reaching end of navigation items */
  wrapAround?: boolean;
  /** Focus trap within container */
  trapFocus?: boolean;
  /** Auto-focus first item on mount */
  autoFocus?: boolean;
}

const defaultOptions: KeyboardNavigationOptions = {
  enableArrowKeys: true,
  enableTabKeys: true,
  enableActivation: true,
  enableEscape: true,
  wrapAround: true,
  trapFocus: true,
  autoFocus: true,
};

/**
 * Custom hook for comprehensive keyboard navigation
 */
export const useKeyboardNavigation = (
  items: NavigationItem[] = [],
  options: KeyboardNavigationOptions = {}
) => {
  const opts = { ...defaultOptions, ...options };
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  // Filter out disabled items for navigation
  const navigableItems = items.filter(item => !item.disabled);

  /**
   * Move focus to specific index
   */
  const focusItem = useCallback((index: number) => {
    if (!navigableItems[index]) return;

    const item = navigableItems[index];
    const element = item.element || document.getElementById(item.id);

    if (element) {
      element.focus();
      setCurrentIndex(index);

      // Emit navigation event
      eventBus.emit('ui:keyboard:focus', {
        itemId: item.id,
        index,
        element,
      });
    }
  }, [navigableItems]);

  /**
   * Move to next item
   */
  const focusNext = useCallback(() => {
    const nextIndex = opts.wrapAround
      ? (currentIndex + 1) % navigableItems.length
      : Math.min(currentIndex + 1, navigableItems.length - 1);
    focusItem(nextIndex);
  }, [currentIndex, navigableItems.length, opts.wrapAround, focusItem]);

  /**
   * Move to previous item
   */
  const focusPrevious = useCallback(() => {
    const prevIndex = opts.wrapAround
      ? (currentIndex - 1 + navigableItems.length) % navigableItems.length
      : Math.max(currentIndex - 1, 0);
    focusItem(prevIndex);
  }, [currentIndex, navigableItems.length, opts.wrapAround, focusItem]);

  /**
   * Move to first item
   */
  const focusFirst = useCallback(() => {
    if (navigableItems.length > 0) {
      focusItem(0);
    }
  }, [navigableItems.length, focusItem]);

  /**
   * Move to last item
   */
  const focusLast = useCallback(() => {
    if (navigableItems.length > 0) {
      focusItem(navigableItems.length - 1);
    }
  }, [navigableItems.length, focusItem]);

  /**
   * Activate current item
   */
  const activateItem = useCallback(() => {
    if (!navigableItems[currentIndex]) return;

    const item = navigableItems[currentIndex];
    const element = item.element || document.getElementById(item.id);

    if (element) {
      // Trigger click event for activation
      element.click();

      // Emit activation event
      eventBus.emit('ui:keyboard:activate', {
        itemId: item.id,
        index: currentIndex,
        element,
      });
    }
  }, [currentIndex, navigableItems]);

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isActive || navigableItems.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        if (opts.enableArrowKeys) {
          event.preventDefault();
          focusNext();
        }
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        if (opts.enableArrowKeys) {
          event.preventDefault();
          focusPrevious();
        }
        break;

      case 'Home':
        event.preventDefault();
        focusFirst();
        break;

      case 'End':
        event.preventDefault();
        focusLast();
        break;

      case 'Tab':
        if (opts.enableTabKeys) {
          if (opts.trapFocus) {
            event.preventDefault();
            if (event.shiftKey) {
              focusPrevious();
            } else {
              focusNext();
            }
          }
        }
        break;

      case 'Enter':
      case ' ':
        if (opts.enableActivation) {
          event.preventDefault();
          activateItem();
        }
        break;

      case 'Escape':
        if (opts.enableEscape) {
          event.preventDefault();
          setIsActive(false);

          // Emit escape event
          eventBus.emit('ui:keyboard:escape', {
            currentItemId: navigableItems[currentIndex]?.id,
            currentIndex,
          });
        }
        break;

      default:
        // Handle alphanumeric shortcuts
        if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
          const shortcutItem = navigableItems.find(item =>
            item.ariaLabel?.toLowerCase().startsWith(event.key.toLowerCase()) ||
            item.id.toLowerCase().startsWith(event.key.toLowerCase())
          );

          if (shortcutItem) {
            const index = navigableItems.indexOf(shortcutItem);
            focusItem(index);
          }
        }
        break;
    }
  }, [isActive, navigableItems, opts, currentIndex, focusNext, focusPrevious, focusFirst, focusLast, activateItem]);

  /**
   * Set up event listeners and initialize
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add keyboard event listener
    const handleContainerKeyDown = (event: KeyboardEvent) => {
      handleKeyDown(event);
    };

    container.addEventListener('keydown', handleContainerKeyDown);

    // Handle focus events
    const handleFocusIn = (event: FocusEvent) => {
      if (container.contains(event.target as Node)) {
        setIsActive(true);

        // Find the focused item index
        const focusedElement = event.target as HTMLElement;
        const focusedIndex = navigableItems.findIndex(item => {
          const element = item.element || document.getElementById(item.id);
          return element === focusedElement;
        });

        if (focusedIndex >= 0) {
          setCurrentIndex(focusedIndex);
        }
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      // Check if focus is moving outside the container
      if (!container.contains(event.relatedTarget as Node)) {
        setIsActive(false);
      }
    };

    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    // Auto-focus first item if requested
    if (opts.autoFocus && navigableItems.length > 0 && document.activeElement === document.body) {
      setTimeout(() => focusFirst(), 100);
    }

    return () => {
      container.removeEventListener('keydown', handleContainerKeyDown);
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [navigableItems, opts.autoFocus, handleKeyDown, focusFirst]);

  /**
   * Update navigation items accessibility attributes
   */
  useEffect(() => {
    navigableItems.forEach((item, index) => {
      const element = item.element || document.getElementById(item.id);
      if (element) {
        // Set tabindex
        element.tabIndex = item.tabIndex ?? (index === currentIndex ? 0 : -1);

        // Set ARIA attributes
        if (item.ariaLabel) {
          element.setAttribute('aria-label', item.ariaLabel);
        }

        if (item.role) {
          element.setAttribute('role', item.role);
        }

        // Add keyboard navigation indicators
        element.setAttribute('data-keyboard-nav', 'true');
        element.setAttribute('data-nav-index', index.toString());

        // Add current indicator
        if (index === currentIndex && isActive) {
          element.setAttribute('data-keyboard-current', 'true');
        } else {
          element.removeAttribute('data-keyboard-current');
        }
      }
    });
  }, [navigableItems, currentIndex, isActive]);

  return {
    containerRef,
    currentIndex,
    isActive,
    navigableItems,

    // Navigation methods
    focusItem,
    focusNext,
    focusPrevious,
    focusFirst,
    focusLast,
    activateItem,

    // State methods
    setActive: setIsActive,
    getCurrentItem: () => navigableItems[currentIndex],

    // Utility methods
    getNavigationStats: () => ({
      totalItems: items.length,
      navigableItems: navigableItems.length,
      currentIndex,
      isActive,
    }),
  };
};

/**
 * Hook for managing focus trap in modal dialogs
 */
export const useFocusTrap = (isOpen: boolean, containerRef: React.RefObject<HTMLElement>) => {
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);

    // Focus first element when opened
    if (firstElement) {
      firstElement.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, containerRef]);
};

/**
 * Hook for keyboard shortcuts
 */
export const useKeyboardShortcuts = (shortcuts: Record<string, () => void>) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const modifierKey = event.ctrlKey || event.metaKey ? 'ctrl+' : '';
      const shiftKey = event.shiftKey ? 'shift+' : '';
      const altKey = event.altKey ? 'alt+' : '';

      const combination = `${modifierKey}${shiftKey}${altKey}${key}`;

      if (shortcuts[combination]) {
        event.preventDefault();
        shortcuts[combination]();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
};