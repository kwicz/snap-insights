/**
 * Tests for click handler
 */

import { createClickHandler } from '@/content/modules/click-handler';

describe('ClickHandler', () => {
  let mockConfig: any;
  let clickHandler: any;

  beforeEach(() => {
    mockConfig = {
      onSnapClick: jest.fn(),
      onAnnotateClick: jest.fn(),
      onTranscribeClick: jest.fn(),
    };
    
    clickHandler = createClickHandler(mockConfig);
    jest.clearAllMocks();
  });

  afterEach(() => {
    clickHandler.cleanup();
  });

  describe('Initialization', () => {
    test('should create click handler with config', () => {
      expect(clickHandler).toBeDefined();
      expect(clickHandler.isClickHandlerActive()).toBe(false);
      expect(clickHandler.getCurrentMode()).toBe('snap');
    });
  });

  describe('Activation and Deactivation', () => {
    test('should activate click handler', () => {
      clickHandler.activate('annotate');
      
      expect(clickHandler.isClickHandlerActive()).toBe(true);
      expect(clickHandler.getCurrentMode()).toBe('annotate');
    });

    test('should deactivate click handler', () => {
      clickHandler.activate('snap');
      clickHandler.deactivate();
      
      expect(clickHandler.isClickHandlerActive()).toBe(false);
    });

    test('should handle mode changes', () => {
      clickHandler.activate('snap');
      expect(clickHandler.getCurrentMode()).toBe('snap');
      
      clickHandler.activate('transcribe');
      expect(clickHandler.getCurrentMode()).toBe('transcribe');
    });
  });

  describe('Click Event Handling', () => {
    beforeEach(() => {
      clickHandler.activate('snap');
    });

    test('should handle Alt+Click in snap mode', () => {
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
        bubbles: true,
      });
      
      // Spy on preventDefault and stopPropagation
      jest.spyOn(mockEvent, 'preventDefault');
      jest.spyOn(mockEvent, 'stopPropagation');
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onSnapClick).toHaveBeenCalledWith({ x: 100, y: 200 });
      expect(mockEvent.preventDefault).toHaveBeenCalled();
      expect(mockEvent.stopPropagation).toHaveBeenCalled();
    });

    test('should handle Alt+Click in annotate mode', () => {
      clickHandler.activate('annotate');
      
      const mockEvent = new MouseEvent('click', {
        clientX: 150,
        clientY: 250,
        altKey: true,
        bubbles: true,
      });
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onAnnotateClick).toHaveBeenCalledWith({ x: 150, y: 250 });
    });

    test('should handle Alt+Click in transcribe mode', () => {
      clickHandler.activate('transcribe');
      
      const mockEvent = new MouseEvent('click', {
        clientX: 200,
        clientY: 300,
        altKey: true,
        bubbles: true,
      });
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onTranscribeClick).toHaveBeenCalledWith({ x: 200, y: 300 });
    });

    test('should ignore clicks without Alt key', () => {
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: false,
        bubbles: true,
      });
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onSnapClick).not.toHaveBeenCalled();
      expect(mockConfig.onAnnotateClick).not.toHaveBeenCalled();
      expect(mockConfig.onTranscribeClick).not.toHaveBeenCalled();
    });

    test('should ignore clicks when inactive', () => {
      clickHandler.deactivate();
      
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
        bubbles: true,
      });
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onSnapClick).not.toHaveBeenCalled();
    });

    test('should handle clicks with different coordinates', () => {
      const testCases = [
        { x: 0, y: 0 },
        { x: 500, y: 300 },
        { x: 1920, y: 1080 },
      ];
      
      testCases.forEach(coords => {
        const mockEvent = new MouseEvent('click', {
          clientX: coords.x,
          clientY: coords.y,
          altKey: true,
          bubbles: true,
        });
        
        document.dispatchEvent(mockEvent);
        
        expect(mockConfig.onSnapClick).toHaveBeenCalledWith(coords);
        mockConfig.onSnapClick.mockClear();
      });
    });
  });

  describe('Mode Switching', () => {
    test('should switch between all modes', () => {
      const modes = ['snap', 'annotate', 'transcribe'] as const;
      
      modes.forEach(mode => {
        clickHandler.activate(mode);
        expect(clickHandler.getCurrentMode()).toBe(mode);
        expect(clickHandler.isClickHandlerActive()).toBe(true);
      });
    });

    test('should handle rapid mode switching', () => {
      clickHandler.activate('snap');
      clickHandler.activate('annotate');
      clickHandler.activate('transcribe');
      clickHandler.activate('snap');
      
      expect(clickHandler.getCurrentMode()).toBe('snap');
      expect(clickHandler.isClickHandlerActive()).toBe(true);
    });
  });

  describe('Event Listener Management', () => {
    test('should add event listener on creation', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      
      const newHandler = createClickHandler(mockConfig);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      
      newHandler.cleanup();
      addEventListenerSpy.mockRestore();
    });

    test('should remove event listener on cleanup', () => {
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');
      
      clickHandler.cleanup();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function), true);
      
      removeEventListenerSpy.mockRestore();
    });

    test('should not respond to clicks after cleanup', () => {
      clickHandler.activate('snap');
      clickHandler.cleanup();
      
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
        bubbles: true,
      });
      
      document.dispatchEvent(mockEvent);
      
      expect(mockConfig.onSnapClick).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    test('should handle callback errors gracefully', () => {
      mockConfig.onSnapClick = jest.fn().mockImplementation(() => {
        throw new Error('Callback error');
      });
      
      clickHandler.activate('snap');
      
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
        bubbles: true,
      });
      
      // Should not throw
      expect(() => document.dispatchEvent(mockEvent)).not.toThrow();
    });

    test('should handle missing callback functions', () => {
      const incompleteConfig = {
        onSnapClick: jest.fn(),
        // Missing onAnnotateClick and onTranscribeClick
      };
      
      const handler = createClickHandler(incompleteConfig as any);
      handler.activate('annotate');
      
      const mockEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 200,
        altKey: true,
        bubbles: true,
      });
      
      // Should not throw even with missing callback
      expect(() => document.dispatchEvent(mockEvent)).not.toThrow();
      
      handler.cleanup();
    });
  });

  describe('State Management', () => {
    test('should maintain correct state through lifecycle', () => {
      // Initial state
      expect(clickHandler.isClickHandlerActive()).toBe(false);
      expect(clickHandler.getCurrentMode()).toBe('snap');
      
      // After activation
      clickHandler.activate('annotate');
      expect(clickHandler.isClickHandlerActive()).toBe(true);
      expect(clickHandler.getCurrentMode()).toBe('annotate');
      
      // After deactivation
      clickHandler.deactivate();
      expect(clickHandler.isClickHandlerActive()).toBe(false);
      expect(clickHandler.getCurrentMode()).toBe('annotate'); // Mode persists
      
      // After cleanup
      clickHandler.cleanup();
      expect(clickHandler.isClickHandlerActive()).toBe(false);
    });
  });
});