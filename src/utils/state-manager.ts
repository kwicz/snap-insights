/**
 * Centralized state management for SnapInsights extension
 * Single source of truth using chrome.storage
 */

export interface ExtensionState {
  isActive: boolean;
  currentMode: 'snap' | 'annotate' | 'transcribe';
  selectedIcon: 'light' | 'blue' | 'dark';
  lastUpdated: number;
}

const DEFAULT_STATE: ExtensionState = {
  isActive: false,
  currentMode: 'snap', // Default to Snap mode
  selectedIcon: 'blue', // Default to blue touchpoint
  lastUpdated: Date.now(),
};

const STATE_KEY = 'extensionState';

/**
 * Get current extension state from storage
 */
export async function getExtensionState(): Promise<ExtensionState> {
  try {
    // Check if chrome.storage is available
    if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
      console.warn(
        'INSIGHT-CLIP: Chrome storage API not available, using default state'
      );
      return DEFAULT_STATE;
    }

    const result = await chrome.storage.local.get(STATE_KEY);
    const state = result[STATE_KEY];

    console.log('INSIGHT-CLIP: Raw state from storage:', state);

    if (!state) {
      // No state exists, return default (don't try to save yet)
      console.log('INSIGHT-CLIP: No existing state, using default');
      return DEFAULT_STATE;
    }

    // Validate state structure
    const validatedState = {
      ...DEFAULT_STATE,
      ...state,
      lastUpdated: state.lastUpdated || Date.now(),
    };

    // Ensure mode is valid
    if (
      !['snap', 'annotate', 'transcribe'].includes(validatedState.currentMode)
    ) {
      console.warn(
        'INSIGHT-CLIP: Invalid mode detected, resetting to snap:',
        validatedState.currentMode
      );
      validatedState.currentMode = 'snap';
    }

    // Ensure icon is valid
    if (!['light', 'blue', 'dark'].includes(validatedState.selectedIcon)) {
      console.warn(
        'INSIGHT-CLIP: Invalid icon detected, resetting to blue:',
        validatedState.selectedIcon
      );
      validatedState.selectedIcon = 'blue';
    }

    console.log('INSIGHT-CLIP: Validated state:', validatedState);
    return validatedState;
  } catch (error) {
    console.error('INSIGHT-CLIP: Failed to get extension state:', error);
    console.error('INSIGHT-CLIP: Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return DEFAULT_STATE;
  }
}

/**
 * Save extension state to storage
 */
export async function saveExtensionState(
  state: Partial<ExtensionState>
): Promise<void> {
  try {
    // Check if chrome.storage is available
    if (!chrome?.storage?.local) {
      throw new Error('Chrome storage API not available');
    }

    // Validate input state
    if (
      state.currentMode &&
      !['snap', 'annotate', 'transcribe'].includes(state.currentMode)
    ) {
      throw new Error(`Invalid mode: ${state.currentMode}`);
    }

    if (
      state.selectedIcon &&
      !['light', 'blue', 'dark'].includes(state.selectedIcon)
    ) {
      throw new Error(`Invalid icon: ${state.selectedIcon}`);
    }

    const currentState = await getExtensionState();
    const newState: ExtensionState = {
      ...currentState,
      ...state,
      lastUpdated: Date.now(),
    };

    console.log('INSIGHT-CLIP: Saving state:', newState);
    await chrome.storage.local.set({ [STATE_KEY]: newState });
    console.log('INSIGHT-CLIP: State saved successfully');
  } catch (error) {
    console.error('INSIGHT-CLIP: Failed to save extension state:', error);
    console.error('INSIGHT-CLIP: Save error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      inputState: state,
    });
    throw error;
  }
}

/**
 * Update specific state properties
 */
export async function updateExtensionState(
  updates: Partial<ExtensionState>
): Promise<ExtensionState> {
  await saveExtensionState(updates);
  return await getExtensionState();
}

/**
 * Activate extension with mode and icon
 */
export async function activateExtension(
  mode: 'snap' | 'annotate' | 'transcribe',
  selectedIcon: 'light' | 'blue' | 'dark'
): Promise<void> {
  await saveExtensionState({
    isActive: true,
    currentMode: mode,
    selectedIcon: selectedIcon,
  });
}

/**
 * Deactivate extension
 */
export async function deactivateExtension(): Promise<void> {
  await saveExtensionState({
    isActive: false,
  });
}

/**
 * Set current mode (without changing active state)
 */
export async function setCurrentMode(
  mode: 'snap' | 'annotate' | 'transcribe'
): Promise<void> {
  await saveExtensionState({
    currentMode: mode,
  });
}

/**
 * Set selected icon (without changing active state)
 */
export async function setSelectedIcon(
  icon: 'light' | 'blue' | 'dark'
): Promise<void> {
  await saveExtensionState({
    selectedIcon: icon,
  });
}

/**
 * Listen for state changes
 */
export function onStateChange(callback: (state: ExtensionState) => void): void {
  try {
    if (!chrome?.storage?.onChanged) {
      console.error(
        'INSIGHT-CLIP: Chrome storage change listener not available'
      );
      return;
    }

    chrome.storage.onChanged.addListener((changes, areaName) => {
      try {
        if (areaName === 'local' && changes[STATE_KEY]) {
          const newState = changes[STATE_KEY].newValue;
          if (newState) {
            console.log('INSIGHT-CLIP: State change detected:', newState);
            callback(newState);
          }
        }
      } catch (error) {
        console.error('INSIGHT-CLIP: Error in state change listener:', error);
      }
    });

    console.log('INSIGHT-CLIP: State change listener registered');
  } catch (error) {
    console.error(
      'INSIGHT-CLIP: Failed to register state change listener:',
      error
    );
  }
}

/**
 * Clear all state (for debugging/reset)
 */
export async function clearExtensionState(): Promise<void> {
  try {
    await chrome.storage.local.remove(STATE_KEY);
    console.log('INSIGHT-CLIP: State cleared');
  } catch (error) {
    console.error('INSIGHT-CLIP: Failed to clear state:', error);
  }
}
