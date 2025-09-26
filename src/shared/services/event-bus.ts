/**
 * Event bus system for inter-component communication
 * Provides typed, decoupled messaging across the extension
 */

import { backgroundLogger } from '../../utils/debug-logger';

export type EventCallback<T = any> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  id: string;
  event: string;
  callback: EventCallback;
  once: boolean;
  priority: number;
}

export interface EventBusEvents {
  // State events
  'state:initialized': any;
  'state:changed': { oldState: any; newState: any };
  'state:reset': void;
  'state:isActive:changed': { property: string; oldValue: boolean; newValue: boolean };
  'state:currentMode:changed': { property: string; oldValue: any; newValue: any };

  // Extension lifecycle events
  'extension:activated': { mode: string; selectedIcon: string };
  'extension:deactivated': void;
  'extension:mode:changed': { oldMode: string | null; newMode: string };
  'extension:icon:changed': { oldIcon: string; newIcon: string };

  // Screenshot events
  'screenshot:captured': { dataUrl: string; coordinates: { x: number; y: number } };
  'screenshot:failed': { error: string; context: any };
  'screenshot:saved': { downloadId: number; filename: string };

  // Journey events
  'journey:started': { journeyState: any };
  'journey:stopped': { journeyState: any };
  'journey:screenshot:added': { screenshot: any; totalCount: number };
  'journey:collection:saved': { downloadIds: number[]; totalFiles: number };

  // Settings events
  'settings:updated': { oldSettings: any; newSettings: any };
  'settings:loaded': { settings: any };
  'settings:reset': void;

  // UI events
  'ui:popup:opened': void;
  'ui:popup:closed': void;
  'ui:sidebar:opened': void;
  'ui:sidebar:closed': void;
  'ui:notification:show': { message: string; type: 'info' | 'success' | 'warning' | 'error' };

  // Error events
  'error:occurred': { error: Error; context: string; severity: 'low' | 'medium' | 'high' };
  'error:recovered': { error: Error; resolution: string };

  // Performance events
  'performance:capture:start': { operation: string };
  'performance:capture:end': { operation: string; duration: number };

  // Debug events
  'debug:log': { level: string; message: string; data?: any };
}

/**
 * Type-safe event bus for extension-wide communication
 */
export class EventBus {
  private _subscriptions = new Map<string, EventSubscription[]>();
  private _eventHistory: Array<{ event: string; data: any; timestamp: number }> = [];
  private _maxHistorySize = 100;
  private _nextId = 1;

  constructor() {
    // Initialize event bus
  }

  /**
   * Subscribe to an event
   */
  on<K extends keyof EventBusEvents>(
    event: K,
    callback: EventCallback<EventBusEvents[K]>,
    options: { priority?: number; once?: boolean } = {}
  ): () => void {
    const subscription: EventSubscription = {
      id: `sub_${this._nextId++}`,
      event: event as string,
      callback: callback as EventCallback,
      once: options.once || false,
      priority: options.priority || 0,
    };

    // Get existing subscriptions for this event
    const eventSubs = this._subscriptions.get(event as string) || [];

    // Insert based on priority (higher priority first)
    const insertIndex = eventSubs.findIndex(sub => sub.priority < subscription.priority);
    if (insertIndex === -1) {
      eventSubs.push(subscription);
    } else {
      eventSubs.splice(insertIndex, 0, subscription);
    }

    this._subscriptions.set(event as string, eventSubs);

    backgroundLogger.debug(`Event subscription added: ${event as string}`, {
      id: subscription.id,
      priority: subscription.priority,
      once: subscription.once,
    });

    // Return unsubscribe function
    return () => this.off(event, subscription.id);
  }

  /**
   * Subscribe to an event once (auto-unsubscribe after first emission)
   */
  once<K extends keyof EventBusEvents>(
    event: K,
    callback: EventCallback<EventBusEvents[K]>,
    options: { priority?: number } = {}
  ): () => void {
    return this.on(event, callback, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof EventBusEvents>(event: K, subscriptionId?: string): void {
    const eventSubs = this._subscriptions.get(event as string);
    if (!eventSubs) return;

    if (subscriptionId) {
      // Remove specific subscription
      const index = eventSubs.findIndex(sub => sub.id === subscriptionId);
      if (index !== -1) {
        eventSubs.splice(index, 1);
        backgroundLogger.debug(`Event subscription removed: ${event as string}`, { id: subscriptionId });
      }
    } else {
      // Remove all subscriptions for this event
      this._subscriptions.delete(event as string);
      backgroundLogger.debug(`All subscriptions removed for event: ${event as string}`);
    }

    // Clean up empty event arrays
    if (eventSubs.length === 0) {
      this._subscriptions.delete(event as string);
    }
  }

  /**
   * Emit an event to all subscribers
   */
  async emit<K extends keyof EventBusEvents>(
    event: K,
    data: EventBusEvents[K]
  ): Promise<void> {
    try {
      const eventSubs = this._subscriptions.get(event as string);
      if (!eventSubs || eventSubs.length === 0) {
        backgroundLogger.debug(`No subscribers for event: ${event as string}`);
        return;
      }

      // Add to event history
      this._eventHistory.push({
        event: event as string,
        data,
        timestamp: Date.now(),
      });

      // Keep history size manageable
      if (this._eventHistory.length > this._maxHistorySize) {
        this._eventHistory = this._eventHistory.slice(-this._maxHistorySize);
      }

      backgroundLogger.debug(`Emitting event: ${event as string}`, {
        subscriberCount: eventSubs.length,
        data,
      });

      // Execute callbacks in priority order
      const subscriptionsToRemove: string[] = [];

      for (const subscription of eventSubs) {
        try {
          await subscription.callback(data);

          // Mark once-only subscriptions for removal
          if (subscription.once) {
            subscriptionsToRemove.push(subscription.id);
          }
        } catch (error) {
          backgroundLogger.error(`Error in event callback for ${event as string}:`, {
            subscriptionId: subscription.id,
            error,
          });

          // Emit error event (but don't recurse if this is already an error event)
          if (event !== 'error:occurred') {
            this.emit('error:occurred', {
              error: error instanceof Error ? error : new Error(String(error)),
              context: `EventBus callback for ${event as string}`,
              severity: 'medium' as const,
            });
          }
        }
      }

      // Remove once-only subscriptions
      subscriptionsToRemove.forEach(id => this.off(event, id));

    } catch (error) {
      backgroundLogger.error(`Error emitting event ${event as string}:`, error);
    }
  }

  /**
   * Emit event synchronously (for simple callbacks only)
   */
  emitSync<K extends keyof EventBusEvents>(
    event: K,
    data: EventBusEvents[K]
  ): void {
    const eventSubs = this._subscriptions.get(event as string);
    if (!eventSubs || eventSubs.length === 0) return;

    const subscriptionsToRemove: string[] = [];

    for (const subscription of eventSubs) {
      try {
        const result = subscription.callback(data);

        // Handle promises by logging warning
        if (result && typeof result === 'object' && 'then' in result) {
          backgroundLogger.warn(`Async callback used with emitSync for event: ${event as string}`);
        }

        if (subscription.once) {
          subscriptionsToRemove.push(subscription.id);
        }
      } catch (error) {
        backgroundLogger.error(`Error in sync event callback for ${event as string}:`, {
          subscriptionId: subscription.id,
          error,
        });
      }
    }

    // Remove once-only subscriptions
    subscriptionsToRemove.forEach(id => this.off(event, id));
  }

  /**
   * Get all subscriptions for debugging
   */
  getSubscriptions(): Map<string, EventSubscription[]> {
    return new Map(this._subscriptions);
  }

  /**
   * Get subscription count for an event
   */
  getSubscriptionCount<K extends keyof EventBusEvents>(event: K): number {
    return this._subscriptions.get(event as string)?.length || 0;
  }

  /**
   * Get recent event history
   */
  getEventHistory(limit = 50): Array<{ event: string; data: any; timestamp: number }> {
    return this._eventHistory.slice(-limit);
  }

  /**
   * Clear all subscriptions
   */
  clear(): void {
    this._subscriptions.clear();
    backgroundLogger.info('Event bus cleared');
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this._eventHistory = [];
    backgroundLogger.info('Event bus history cleared');
  }

  /**
   * Get event bus statistics
   */
  getStats(): {
    totalSubscriptions: number;
    eventCount: number;
    historySize: number;
    events: Array<{ event: string; subscriptions: number }>;
  } {
    const events: Array<{ event: string; subscriptions: number }> = [];
    let totalSubscriptions = 0;

    this._subscriptions.forEach((subs, event) => {
      events.push({ event, subscriptions: subs.length });
      totalSubscriptions += subs.length;
    });

    return {
      totalSubscriptions,
      eventCount: this._subscriptions.size,
      historySize: this._eventHistory.length,
      events: events.sort((a, b) => b.subscriptions - a.subscriptions),
    };
  }

  /**
   * Create a namespaced event bus
   */
  createNamespace(namespace: string): EventBusNamespace {
    return new EventBusNamespace(this, namespace);
  }
}

/**
 * Namespaced event bus for component-specific events
 */
export class EventBusNamespace {
  constructor(
    private _parent: EventBus,
    private _namespace: string
  ) {}

  on<K extends keyof EventBusEvents>(
    event: K,
    callback: EventCallback<EventBusEvents[K]>,
    options?: { priority?: number; once?: boolean }
  ): () => void {
    const namespacedEvent = `${this._namespace}:${event as string}` as K;
    return this._parent.on(namespacedEvent, callback, options);
  }

  once<K extends keyof EventBusEvents>(
    event: K,
    callback: EventCallback<EventBusEvents[K]>,
    options?: { priority?: number }
  ): () => void {
    const namespacedEvent = `${this._namespace}:${event as string}` as K;
    return this._parent.once(namespacedEvent, callback, options);
  }

  emit<K extends keyof EventBusEvents>(
    event: K,
    data: EventBusEvents[K]
  ): Promise<void> {
    const namespacedEvent = `${this._namespace}:${event as string}` as K;
    return this._parent.emit(namespacedEvent, data);
  }

  off<K extends keyof EventBusEvents>(event: K, subscriptionId?: string): void {
    const namespacedEvent = `${this._namespace}:${event as string}` as K;
    this._parent.off(namespacedEvent, subscriptionId);
  }
}

// Export singleton instance
export const eventBus = new EventBus();