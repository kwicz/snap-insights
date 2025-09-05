/**
 * Tests for command handler
 */

import { commandHandler } from '@/background/modules/command-handler';
import { screenshotHandler } from '@/background/modules/screenshot-handler';
import { settingsHandler } from '@/background/modules/settings-handler';

// Mock dependencies
jest.mock('@/background/modules/screenshot-handler');
jest.mock('@/background/modules/settings-handler');

describe('CommandHandler', () => {
  const mockTab = (global as any).testUtils.createMockTab();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Chrome APIs
    chrome.commands = {
      onCommand: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
    };
    chrome.tabs.query = jest.fn().mockResolvedValue([mockTab]);
    
    // Mock handlers
    (screenshotHandler.handleScreenshotCapture as jest.Mock).mockResolvedValue({
      success: true,
      dataUrl: 'data:image/png;base64,mock',
    });
    (settingsHandler.handleModeToggle as jest.Mock).mockResolvedValue({
      success: true,
      mode: 'annotate',
    });
  });

  describe('initialize', () => {
    test('should setup command listener when API is available', () => {
      commandHandler.initialize();
      
      expect(chrome.commands.onCommand.addListener).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });

    test('should handle missing commands API gracefully', () => {
      delete (chrome as any).commands;
      
      expect(() => commandHandler.initialize()).not.toThrow();
    });
  });

  describe('command handling', () => {
    let commandListener: (command: string) => Promise<void>;

    beforeEach(() => {
      commandHandler.initialize();
      commandListener = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];
    });

    test('should handle toggle-mode command', async () => {
      await commandListener('toggle-mode');
      
      expect(settingsHandler.handleModeToggle).toHaveBeenCalled();
    });

    test('should handle capture-screenshot command', async () => {
      await commandListener('capture-screenshot');
      
      expect(chrome.tabs.query).toHaveBeenCalledWith({
        active: true,
        currentWindow: true,
      });
      expect(screenshotHandler.handleScreenshotCapture).toHaveBeenCalledWith(
        { coordinates: { x: 0, y: 0 } },
        mockTab.id
      );
    });

    test('should handle unknown commands gracefully', async () => {
      await expect(commandListener('unknown-command')).resolves.not.toThrow();
    });

    test('should handle toggle mode errors', async () => {
      (settingsHandler.handleModeToggle as jest.Mock).mockRejectedValue(
        new Error('Toggle failed')
      );
      
      await expect(commandListener('toggle-mode')).resolves.not.toThrow();
    });

    test('should handle screenshot capture errors', async () => {
      (screenshotHandler.handleScreenshotCapture as jest.Mock).mockRejectedValue(
        new Error('Capture failed')
      );
      
      await expect(commandListener('capture-screenshot')).resolves.not.toThrow();
    });

    test('should handle missing active tab for screenshot', async () => {
      chrome.tabs.query = jest.fn().mockResolvedValue([]);
      
      await commandListener('capture-screenshot');
      
      expect(screenshotHandler.handleScreenshotCapture).not.toHaveBeenCalled();
    });

    test('should handle tab query errors', async () => {
      chrome.tabs.query = jest.fn().mockRejectedValue(new Error('Query failed'));
      
      await expect(commandListener('capture-screenshot')).resolves.not.toThrow();
    });
  });

  describe('cleanup', () => {
    test('should cleanup without errors', () => {
      expect(() => commandHandler.cleanup()).not.toThrow();
    });
  });

  describe('error handling', () => {
    test('should handle command listener errors', async () => {
      commandHandler.initialize();
      const commandListener = (chrome.commands.onCommand.addListener as jest.Mock).mock.calls[0][0];
      
      // Mock an error in command handling
      (settingsHandler.handleModeToggle as jest.Mock).mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      
      await expect(commandListener('toggle-mode')).resolves.not.toThrow();
    });
  });
});