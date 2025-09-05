/**
 * Centralized message service for communication between extension components
 */

import { ExtensionMessage, MessageHandler } from '@/types/messages';
import { isExtensionContextValid } from '../utils/context-utils';
import { backgroundLogger, contentLogger, popupLogger } from '@/utils/debug-logger';

export interface MessageOptions {
  timeout?: number;
  retries?: number;
  tabId?: number;
}

export interface MessageResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Message service for handling cross-component communication
 */
export class MessageService {
  private messageHandlers = new Map<string, MessageHandler<any>>();
  private logger: typeof backgroundLogger;

  constructor(context: 'background' | 'content' | 'popup') {
    this.logger = context === 'background' ? backgroundLogger : 
                  context === 'content' ? contentLogger : popupLogger;
    this.setupMessageListener();
  }

  /**
   * Register a message handler for a specific message type
   */
  registerHandler<T extends ExtensionMessage>(
    messageType: T['type'],
    handler: MessageHandler<T>
  ): void {
    this.messageHandlers.set(messageType, handler);
    this.logger.debug(`Registered handler for message type: ${messageType}`);
  }

  /**
   * Unregister a message handler
   */
  unregisterHandler(messageType: string): void {
    this.messageHandlers.delete(messageType);
    this.logger.debug(`Unregistered handler for message type: ${messageType}`);
  }

  /**
   * Send a message to the background script
   */
  async sendToBackground<T = any>(
    message: ExtensionMessage,
    options: MessageOptions = {}
  ): Promise<MessageResponse<T>> {
    return this.sendMessage(message, options);
  }

  /**
   * Send a message to a content script
   */
  async sendToContent<T = any>(
    message: ExtensionMessage,
    tabId: number,
    options: MessageOptions = {}
  ): Promise<MessageResponse<T>> {
    return this.sendMessage(message, { ...options, tabId });
  }

  /**
   * Send a message to all content scripts
   */
  async broadcastToContent<T = any>(
    message: ExtensionMessage,
    options: MessageOptions = {}
  ): Promise<MessageResponse<T>[]> {
    try {
      if (!isExtensionContextValid()) {
        throw new Error('Extension context invalid');
      }

      const tabs = await chrome.tabs.query({});
      const promises = tabs
        .filter(tab => tab.id && tab.url && !tab.url.startsWith('chrome://'))
        .map(tab => this.sendToContent(message, tab.id!, options));

      return Promise.allSettled(promises).then(results =>
        results.map(result => 
          result.status === 'fulfilled' 
            ? result.value 
            : { success: false, error: 'Failed to send message' }
        )
      );
    } catch (error) {
      this.logger.error('Failed to broadcast to content scripts', error);
      return [{ success: false, error: 'Broadcast failed' }];
    }
  }

  /**
   * Send a message with retry logic
   */
  private async sendMessage<T = any>(
    message: ExtensionMessage,
    options: MessageOptions = {}
  ): Promise<MessageResponse<T>> {
    const { timeout = 5000, retries = 2, tabId } = options;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        if (!isExtensionContextValid()) {
          throw new Error('Extension context invalid');
        }

        this.logger.debug(`Sending message (attempt ${attempt + 1}):`, message);

        const response = await this.sendWithTimeout(message, timeout, tabId);
        
        this.logger.debug('Message response received:', response);
        
        // Ensure response has required properties
        if (response && typeof response === 'object' && 'success' in response) {
          return response as MessageResponse<T>;
        }
        
        return { success: true, data: undefined };

      } catch (error) {
        this.logger.warn(`Message send attempt ${attempt + 1} failed:`, error);
        
        if (attempt === retries) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          return { success: false, error: errorMessage };
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }

    return { success: false, error: 'Max retries exceeded' };
  }

  /**
   * Send message with timeout
   */
  private sendWithTimeout<T>(
    message: ExtensionMessage,
    timeout: number,
    tabId?: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, timeout);

      const sendPromise = tabId 
        ? chrome.tabs.sendMessage(tabId, message)
        : chrome.runtime.sendMessage(message);

      sendPromise
        .then(response => {
          clearTimeout(timeoutId);
          resolve(response);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Setup message listener
   */
  private setupMessageListener(): void {
    if (!chrome?.runtime?.onMessage) {
      this.logger.error('Chrome runtime message API not available');
      return;
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async responses
    });

    this.logger.debug('Message listener setup complete');
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(
    message: ExtensionMessage,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      if (!isExtensionContextValid()) {
        sendResponse({ success: false, error: 'Extension context invalid' });
        return;
      }

      const handler = this.messageHandlers.get(message.type);
      
      if (!handler) {
        this.logger.warn(`No handler registered for message type: ${message.type}`);
        sendResponse({ success: false, error: `Unknown message type: ${message.type}` });
        return;
      }

      this.logger.debug(`Handling message: ${message.type}`, message);

      const result = await handler(message, sender, sendResponse);
      
      // If handler didn't call sendResponse, send the result
      if (result !== undefined) {
        sendResponse(result);
      }

    } catch (error) {
      this.logger.error(`Error handling message ${message.type}:`, error);
      sendResponse({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  /**
   * Test connection to background script
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.sendToBackground({ type: 'PING' } as any, { timeout: 2000 });
      return response.success;
    } catch {
      return false;
    }
  }
}

// Singleton instances for different contexts
let backgroundMessageService: MessageService;
let contentMessageService: MessageService;
let popupMessageService: MessageService;

/**
 * Get message service instance for background context
 */
export function getBackgroundMessageService(): MessageService {
  if (!backgroundMessageService) {
    backgroundMessageService = new MessageService('background');
  }
  return backgroundMessageService;
}

/**
 * Get message service instance for content context
 */
export function getContentMessageService(): MessageService {
  if (!contentMessageService) {
    contentMessageService = new MessageService('content');
  }
  return contentMessageService;
}

/**
 * Get message service instance for popup context
 */
export function getPopupMessageService(): MessageService {
  if (!popupMessageService) {
    popupMessageService = new MessageService('popup');
  }
  return popupMessageService;
}