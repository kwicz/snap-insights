/**
 * Enhanced centralized state management for SnapInsights extension
 * Provides reactive state management with event-driven updates
 */

import { ExtensionSettings, JourneyState, ExtensionMode } from '../../types';
import { backgroundLogger } from '../../utils/debug-logger';
import { EventBus } from './event-bus';

export interface AppState {
  // Extension activation state
  isActive: boolean;
  currentMode: ExtensionMode | null;
  selectedIcon: 'light' | 'blue' | 'dark';

  // Settings state
  settings?: ExtensionSettings;
  settingsLoaded: boolean;

  // Journey mode state
  journey?: JourneyState;
  journeyLoaded: boolean;

  // UI state
  popupOpen: boolean;
  sidebarOpen: boolean;

  // System state
  lastUpdated: number;
  version: string;
}

const DEFAULT_STATE: AppState = {
  isActive: false,
  currentMode: null,
  selectedIcon: 'blue',
  settingsLoaded: false,
  journeyLoaded: false,
  popupOpen: false,
  sidebarOpen: false,
  lastUpdated: Date.now(),
  version: '1.0.0',
};

const STATE_KEY = 'appState';

/**
 * Enhanced state management service with reactive updates
 */
export class StateService {
  private _state: AppState = { ...DEFAULT_STATE };
  private _initialized = false;
  private _eventBus: EventBus;
  private _subscribers = new Map<string, (state: AppState) => void>();

  constructor() {
    this._eventBus = new EventBus();
    this.setupStorageListener();
  }

  /**
   * Initialize state service and load initial state
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    try {
      backgroundLogger.info('Initializing state service...');

      // Load state from storage
      await this.loadState();

      // Mark as initialized
      this._initialized = true;

      // Emit initialization event
      this._eventBus.emit('state:initialized', this._state);

      backgroundLogger.info('State service initialized successfully');
    } catch (error) {
      backgroundLogger.error('Failed to initialize state service:', error);
      this._state = { ...DEFAULT_STATE };
      this._initialized = true;
    }
  }

  /**
   * Get current state (read-only)
   */
  getState(): Readonly<AppState> {
    return { ...this._state };
  }

  /**
   * Get specific state property
   */
  get<K extends keyof AppState>(key: K): AppState[K] {
    return this._state[key];
  }

  /**
   * Update state with partial updates
   */
  async setState(updates: Partial<AppState>, persist = true): Promise<void> {
    try {
      const oldState = { ...this._state };
      const newState = {
        ...this._state,
        ...updates,
        lastUpdated: Date.now(),
      };

      // Validate state updates
      this.validateStateUpdate(updates);

      // Update in-memory state
      this._state = newState;

      // Persist to storage if requested
      if (persist) {
        await this.saveState();
      }

      // Emit state change events
      this.emitStateChanges(oldState, newState);

      backgroundLogger.debug('State updated:', { updates, newState: this._state });
    } catch (error) {
      backgroundLogger.error('Failed to update state:', error);
      throw error;
    }
  }

  /**
   * Update specific state property
   */
  async set<K extends keyof AppState>(key: K, value: AppState[K], persist = true): Promise<void> {
    await this.setState({ [key]: value } as Partial<AppState>, persist);
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback: (state: AppState) => void): () => void {
    const id = Math.random().toString(36);
    this._subscribers.set(id, callback);

    // Return unsubscribe function
    return () => {
      this._subscribers.delete(id);
    };
  }

  /**
   * Subscribe to specific state property changes
   */
  subscribeToProperty<K extends keyof AppState>(
    key: K,
    callback: (value: AppState[K], oldValue: AppState[K]) => void
  ): () => void {
    return this.subscribe((newState) => {
      const oldState = this.getState();
      if (oldState[key] !== newState[key]) {
        callback(newState[key], oldState[key]);
      }
    });
  }

  /**
   * Reset state to defaults
   */
  async reset(): Promise<void> {
    await this.setState({ ...DEFAULT_STATE }, true);
    this._eventBus.emit('state:reset', undefined);
    backgroundLogger.info('State reset to defaults');
  }

  /**
   * Load state from storage
   */
  private async loadState(): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        backgroundLogger.warn('Chrome storage not available, using default state');
        return;
      }

      const result = await chrome.storage.local.get(STATE_KEY);
      const storedState = result[STATE_KEY];

      if (storedState) {
        // Merge with defaults to handle missing properties
        this._state = {
          ...DEFAULT_STATE,
          ...storedState,
          lastUpdated: Date.now(),
        };

        // Validate loaded state
        this.validateState(this._state);
      }

      backgroundLogger.debug('State loaded from storage:', this._state);
    } catch (error) {
      backgroundLogger.error('Failed to load state from storage:', error);
      this._state = { ...DEFAULT_STATE };
    }
  }

  /**
   * Save state to storage
   */
  private async saveState(): Promise<void> {
    try {
      if (!chrome?.storage?.local) {
        backgroundLogger.warn('Chrome storage not available, state not persisted');
        return;
      }

      await chrome.storage.local.set({ [STATE_KEY]: this._state });
      backgroundLogger.debug('State saved to storage');
    } catch (error) {
      backgroundLogger.error('Failed to save state to storage:', error);
    }
  }

  /**
   * Setup storage change listener
   */
  private setupStorageListener(): void {
    try {
      if (!chrome?.storage?.onChanged) {
        backgroundLogger.warn('Chrome storage change listener not available');
        return;
      }

      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes[STATE_KEY] && changes[STATE_KEY].newValue) {
          const newState = changes[STATE_KEY].newValue as AppState;

          // Only update if the change came from another context
          if (newState.lastUpdated !== this._state.lastUpdated) {
            const oldState = { ...this._state };
            this._state = newState;
            this.emitStateChanges(oldState, newState);
            backgroundLogger.debug('State synchronized from storage');
          }
        }
      });
    } catch (error) {
      backgroundLogger.error('Failed to setup storage listener:', error);
    }
  }

  /**
   * Emit state change events
   */
  private emitStateChanges(oldState: AppState, newState: AppState): void {
    // Notify all subscribers
    this._subscribers.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        backgroundLogger.error('Error in state subscriber:', error);
      }
    });

    // Emit specific property change events for known state properties
    if (oldState.isActive !== newState.isActive) {
      this._eventBus.emit('state:isActive:changed', {
        property: 'isActive',
        oldValue: oldState.isActive,
        newValue: newState.isActive,
      });
    }

    if (oldState.currentMode !== newState.currentMode) {
      this._eventBus.emit('state:currentMode:changed', {
        property: 'currentMode',
        oldValue: oldState.currentMode,
        newValue: newState.currentMode,
      });
    }

    // Emit general state change event
    this._eventBus.emit('state:changed', { oldState, newState });
  }

  /**
   * Validate state update
   */
  private validateStateUpdate(updates: Partial<AppState>): void {
    // Validate currentMode
    if (updates.currentMode !== undefined && updates.currentMode !== null) {
      if (!['snap', 'annotate', 'transcribe', 'start', 'journey'].includes(updates.currentMode)) {
        throw new Error(`Invalid currentMode: ${updates.currentMode}`);
      }
    }

    // Validate selectedIcon
    if (updates.selectedIcon && !['light', 'blue', 'dark'].includes(updates.selectedIcon)) {
      throw new Error(`Invalid selectedIcon: ${updates.selectedIcon}`);
    }

    // Validate version format
    if (updates.version && !/^\d+\.\d+\.\d+$/.test(updates.version)) {
      throw new Error(`Invalid version format: ${updates.version}`);
    }
  }

  /**
   * Validate entire state object
   */
  private validateState(state: AppState): void {
    const requiredProperties: Array<keyof AppState> = [
      'isActive', 'selectedIcon', 'settingsLoaded', 'journeyLoaded',
      'popupOpen', 'sidebarOpen', 'lastUpdated', 'version'
    ];

    for (const prop of requiredProperties) {
      if (state[prop] === undefined) {
        backgroundLogger.warn(`Missing required state property: ${prop}`);
        (state as any)[prop] = (DEFAULT_STATE as any)[prop];
      }
    }
  }

  /**
   * Get event bus for external use
   */
  getEventBus(): EventBus {
    return this._eventBus;
  }

  /**
   * Get state statistics
   */
  getStats(): {
    initialized: boolean;
    subscriberCount: number;
    lastUpdated: number;
    stateSize: number;
  } {
    return {
      initialized: this._initialized,
      subscriberCount: this._subscribers.size,
      lastUpdated: this._state.lastUpdated,
      stateSize: JSON.stringify(this._state).length,
    };
  }

  /**
   * Export state for debugging
   */
  exportState(): string {
    return JSON.stringify(this._state, null, 2);
  }

  /**
   * Import state from JSON (for debugging/testing)
   */
  async importState(stateJson: string): Promise<void> {
    try {
      const importedState = JSON.parse(stateJson) as AppState;
      this.validateState(importedState);
      await this.setState(importedState, true);
      backgroundLogger.info('State imported successfully');
    } catch (error) {
      backgroundLogger.error('Failed to import state:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const stateService = new StateService();