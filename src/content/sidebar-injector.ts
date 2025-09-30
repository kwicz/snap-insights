/**
 * Sidebar injector for content script
 * Creates and manages the floating sidebar without React
 */

import { TabIcons } from '@/components/TabNav';

// Global reference to prevent multiple instances
declare global {
  interface Window {
    snapInsightsSidebarManager?: SidebarManager;
  }
}

interface SidebarState {
  activeMode: 'snap' | 'annotate' | 'transcribe' | 'start' | null;
  isVisible: boolean;
  isExpanded: boolean;
}

class SidebarManager {
  private container: HTMLElement | null = null;
  private state: SidebarState = {
    activeMode: null,
    isVisible: false,
    isExpanded: false,
  };

  constructor() {
    // Check if there's already a global instance
    if (window.snapInsightsSidebarManager) {
      console.log('SnapInsights: Reusing existing global sidebar manager');
      return window.snapInsightsSidebarManager;
    }

    // Set global reference
    window.snapInsightsSidebarManager = this;
    this.init();
  }

  /**
   * Check if a sidebar already exists in the DOM and reuse it
   */
  private findExistingSidebar(): HTMLElement | null {
    const existingSidebar = document.querySelector(
      '.snapinsights-sidebar'
    ) as HTMLElement;
    if (existingSidebar) {
      console.log('SnapInsights: Found existing sidebar, reusing it');
      return existingSidebar;
    }
    return null;
  }

  /**
   * Clean up any duplicate sidebars that might exist
   */
  private cleanupDuplicateSidebars(): void {
    const sidebars = document.querySelectorAll('.snapinsights-sidebar');
    if (sidebars.length > 1) {
      console.log(
        `SnapInsights: Found ${sidebars.length} sidebars, cleaning up duplicates`
      );
      // Keep the first one, remove the rest
      for (let i = 1; i < sidebars.length; i++) {
        sidebars[i].remove();
      }
    }
  }

  /**
   * Toggle sidebar dropdown state (kept for potential programmatic use)
   */
  private toggleDropdown(): void {
    this.state.isExpanded = !this.state.isExpanded;
    this.updateDropdownState();
    console.log('SnapInsights: Sidebar expanded state:', this.state.isExpanded);
  }

  /**
   * Update dropdown state styling
   */
  private updateDropdownState(): void {
    if (!this.container) return;

    const modesContainer = this.container.querySelector('.sidebar-modes') as HTMLElement;
    const divider = this.container.querySelector('.sidebar-divider') as HTMLElement;
    const closeContainer = this.container.querySelector('.sidebar-close-container') as HTMLElement;

    if (this.state.isExpanded) {
      // Calculate expanded height: icon (60px) + divider + 4 mode buttons + close button + padding
      const expandedHeight = 60 + 8 + (4 * 44) + 44 + 44; // Approximately 292px

      // Expand the sidebar with smooth animation
      this.container.style.height = `${expandedHeight}px`;

      // Fade in the hidden elements after a short delay
      setTimeout(() => {
        if (divider) {
          divider.style.opacity = '1';
        }
        if (modesContainer) {
          modesContainer.style.opacity = '1';
        }
        if (closeContainer) {
          closeContainer.style.opacity = '1';
        }
      }, 150);
    } else {
      // Fade out elements first
      if (divider) {
        divider.style.opacity = '0';
      }
      if (modesContainer) {
        modesContainer.style.opacity = '0';
      }
      if (closeContainer) {
        closeContainer.style.opacity = '0';
      }

      // Collapse the sidebar after fade out
      setTimeout(() => {
        if (this.container) {
          this.container.style.height = '60px';
        }
      }, 100);
    }
  }

  private async init() {
    // Clean up any duplicate sidebars first
    this.cleanupDuplicateSidebars();

    // Try to find and reuse existing sidebar
    const existingSidebar = this.findExistingSidebar();
    if (existingSidebar) {
      this.container = existingSidebar;
      console.log('SnapInsights: Reusing existing sidebar');
    }

    // Load current mode from storage
    try {
      const result = await chrome.storage.local.get(['currentMode']);
      const mode = result.currentMode || null;
      this.state.activeMode = mode;
      this.state.isVisible = true; // Always show sidebar on page load

      // Only create sidebar if none exists
      if (!this.container) {
        this.createSidebar();
      } else {
        // Update existing sidebar with current state
        this.updateSidebarState();
        this.updateDropdownState();
      }
    } catch (error) {
      console.error('Failed to load current mode:', error);
      // Still create sidebar even if storage fails
      if (!this.container) {
        this.createSidebar();
      }
    }

    // Listen for storage changes to sync with popup
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.currentMode) {
        const newMode = changes.currentMode.newValue;
        this.updateMode(newMode);
      }
    });
  }

  private updateMode(
    mode: 'snap' | 'annotate' | 'transcribe' | 'start' | null
  ) {
    this.state.activeMode = mode;
    // Keep sidebar visible - we'll handle hiding logic later
    this.state.isVisible = true;

    // Check if container still exists in DOM (might have been removed)
    if (this.container && !document.contains(this.container)) {
      console.log(
        'SnapInsights: Container no longer in DOM, resetting reference'
      );
      this.container = null;
    }

    // Try to find existing sidebar if we don't have a reference
    if (!this.container) {
      const existingSidebar = this.findExistingSidebar();
      if (existingSidebar) {
        this.container = existingSidebar;
        console.log(
          'SnapInsights: Found and reusing existing sidebar for mode update'
        );
      }
    }

    // Only create sidebar if it doesn't exist, otherwise just update it
    if (!this.container) {
      this.createSidebar();
    } else {
      this.updateSidebarState();
      this.updateDropdownState();
    }
  }

  private createSidebar() {
    if (this.container) {
      return; // Already exists
    }

    console.log(
      'SnapInsights: Creating sidebar with mode:',
      this.state.activeMode
    );

    // Create main container that will stretch
    this.container = document.createElement('div');
    this.container.className = 'snapinsights-sidebar';
    this.container.style.cssText = `
      position: fixed;
      top: 150px;
      right: 0;
      width: 60px;
      background: #0277c0;
      border-radius: 12px 0 0 12px;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      z-index: 999999;
      pointer-events: auto;
      font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0;
      overflow: hidden;
      transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      height: 60px;
    `;

    // Create inner wrapper for all buttons
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'sidebar-buttons-wrapper';
    buttonsWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      padding: 8px;
      box-sizing: border-box;
    `;

    // Create header button (always visible)
    const iconButton = document.createElement('button');
    iconButton.className = 'sidebar-icon-button';
    iconButton.style.cssText = `
      width: 44px;
      height: 44px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      flex-shrink: 0;
    `;

    // Create icon container that will hold either logo or mode icon
    const iconContainer = document.createElement('div');
    iconContainer.className = 'sidebar-icon-container';
    iconContainer.style.cssText = `
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Set initial icon based on active mode
    this.updateHeaderIcon(iconContainer);

    iconButton.appendChild(iconContainer);

    // Make header button non-clickable
    iconButton.style.cursor = 'default';
    iconButton.style.pointerEvents = 'none';

    buttonsWrapper.appendChild(iconButton);

    // Create divider
    const divider = document.createElement('div');
    divider.className = 'sidebar-divider';
    divider.style.cssText = `
      width: 36px;
      height: 1px;
      background: rgba(255, 255, 255, 0.2);
      margin: 8px 0;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    buttonsWrapper.appendChild(divider);

    // Create modes container for mode buttons
    const modesContainer = document.createElement('div');
    modesContainer.className = 'sidebar-modes';
    modesContainer.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      width: 100%;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Create mode buttons
    const modeConfigs = [
      { mode: 'snap', title: 'Snap', icon: this.getSnapIcon() },
      {
        mode: 'annotate',
        title: 'Annotate',
        icon: this.getAnnotateIcon(),
      },
      {
        mode: 'transcribe',
        title: 'Transcribe',
        icon: this.getTranscribeIcon(),
      },
      { mode: 'start', title: 'Start Journey', icon: this.getStartIcon() },
    ];

    modeConfigs.forEach(({ mode, title, icon }) => {
      const button = this.createModeButton(mode as any, title, icon);
      modesContainer.appendChild(button);
    });

    buttonsWrapper.appendChild(modesContainer);

    // Create close button container
    const closeButtonContainer = document.createElement('div');
    closeButtonContainer.className = 'sidebar-close-container';
    closeButtonContainer.style.cssText = `
      margin-top: 12px;
      margin-bottom: 16px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const closeButton = document.createElement('button');
    closeButton.className = 'sidebar-close-button';
    closeButton.style.cssText = `
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 6px;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: white;
    `;
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" width="16" height="16">
        <path
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    `;
    closeButton.title = 'Close Sidebar';
    closeButton.addEventListener('click', () => this.removeSidebar());
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
      closeButton.style.transform = 'scale(1.05)';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'transparent';
      closeButton.style.transform = 'scale(1)';
    });

    closeButtonContainer.appendChild(closeButton);
    buttonsWrapper.appendChild(closeButtonContainer);

    // Assemble sidebar
    this.container.appendChild(buttonsWrapper);

    // Hover-based menu opening
    let hoverTimeout: number | null = null;

    const handleMouseEnter = () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = window.setTimeout(() => {
        this.state.isExpanded = true;
        this.updateDropdownState();
      }, 200); // Small delay to prevent accidental triggers
    };

    const handleMouseLeave = () => {
      if (hoverTimeout) clearTimeout(hoverTimeout);
      hoverTimeout = window.setTimeout(() => {
        this.state.isExpanded = false;
        this.updateDropdownState();
      }, 300); // Small delay before closing
    };

    this.container.addEventListener('mouseenter', handleMouseEnter);
    this.container.addEventListener('mouseleave', handleMouseLeave);

    // Add CSS for tooltips
    const style = document.createElement('style');
    style.textContent = `
      .sidebar-tooltip {
        position: fixed;
        background: rgba(0, 0, 0, 0.9);
        color: white;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 12px;
        font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, sans-serif;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1000000;
      }

      .sidebar-tooltip::after {
        content: '';
        position: absolute;
        right: -4px;
        top: 50%;
        transform: translateY(-50%);
        border-left: 4px solid rgba(0, 0, 0, 0.9);
        border-top: 4px solid transparent;
        border-bottom: 4px solid transparent;
      }
    `;
    document.head.appendChild(style);

    // Add to page
    document.body.appendChild(this.container);
  }

  private createModeButton(
    mode: 'snap' | 'annotate' | 'transcribe' | 'start',
    title: string,
    iconSvg: string
  ) {
    const button = document.createElement('button');
    button.className = `sidebar-mode-button ${
      this.state.activeMode === mode ? 'active' : ''
    }`;
    button.style.cssText = `
      width: 44px;
      height: 44px;
      border: none;
      border-radius: 6px;
      background: ${this.state.activeMode === mode ? 'white' : 'transparent'};
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    `;

    const iconContainer = document.createElement('div');
    iconContainer.style.cssText = `
      width: 20px;
      height: 20px;
      transition: stroke 0.2s ease;
    `;
    iconContainer.innerHTML = iconSvg;

    // Set icon color based on active state
    const svg = iconContainer.querySelector('svg');
    if (svg) {
      svg.style.stroke = this.state.activeMode === mode ? '#0277c0' : 'white';
      svg.style.fill = 'none';
      svg.style.width = '100%';
      svg.style.height = '100%';
    }

    button.appendChild(iconContainer);

    // Create tooltip
    const tooltip = document.createElement('span');
    tooltip.className = 'sidebar-tooltip';
    tooltip.textContent = title;
    button.appendChild(tooltip);

    // Add event listeners
    button.addEventListener('click', () => {
      this.handleModeSelect(mode);
      // Don't close dropdown immediately, let hover handling manage it
    });

    // Tooltip positioning on hover
    button.addEventListener('mouseenter', (e) => {
      if (this.state.activeMode !== mode) {
        button.style.background = 'rgba(255, 255, 255, 0.1)';
      }
      button.style.transform = 'scale(1.05)';

      // Position tooltip to the left of the button
      const rect = button.getBoundingClientRect();
      tooltip.style.top = `${rect.top + rect.height / 2}px`;
      tooltip.style.left = `${rect.left - 8}px`;
      tooltip.style.transform = 'translateX(-100%) translateY(-50%)';
      tooltip.style.opacity = '1';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background =
        this.state.activeMode === mode ? 'white' : 'transparent';
      button.style.transform = 'scale(1)';
      tooltip.style.opacity = '0';
    });

    return button;
  }

  private updateHeaderIcon(iconContainer: HTMLElement) {
    // Clear existing content
    iconContainer.innerHTML = '';

    if (this.state.activeMode) {
      // Show the active mode icon
      let iconSvg = '';
      switch (this.state.activeMode) {
        case 'snap':
          iconSvg = this.getSnapIcon();
          break;
        case 'annotate':
          iconSvg = this.getAnnotateIcon();
          break;
        case 'transcribe':
          iconSvg = this.getTranscribeIcon();
          break;
        case 'start':
          iconSvg = this.getSaveIcon(); // Show save icon when journey is active
          break;
      }

      iconContainer.innerHTML = iconSvg;
      const svg = iconContainer.querySelector('svg');
      if (svg) {
        svg.style.cssText = `
          width: 100%;
          height: 100%;
          stroke: white;
          fill: none;
          stroke-width: 1.5;
        `;
      }
    } else {
      // Show SnapInsights logo when no mode is active
      const iconImg = document.createElement('img');
      iconImg.src = chrome.runtime.getURL('assets/icons/icon.png');
      iconImg.alt = 'SnapInsights';
      iconImg.style.cssText = `
        width: 32px;
        height: 32px;
        object-fit: contain;
        filter: brightness(0) invert(1);
      `;
      iconContainer.appendChild(iconImg);
    }
  }

  private updateSidebarState() {
    if (!this.container) return;

    console.log(
      'SnapInsights: Updating sidebar state to mode:',
      this.state.activeMode
    );

    // Update header icon
    const iconContainer = this.container.querySelector('.sidebar-icon-container') as HTMLElement;
    if (iconContainer) {
      this.updateHeaderIcon(iconContainer);
    }
    const buttons = this.container.querySelectorAll('.sidebar-mode-button');
    const modes = ['snap', 'annotate', 'transcribe', 'start'];

    buttons.forEach((button, index) => {
      const mode = modes[index];
      const isActive = this.state.activeMode === mode;

      (button as HTMLElement).style.background = isActive
        ? 'white'
        : 'transparent';

      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.stroke = isActive ? '#0277c0' : 'white';
      }

      // Update start/save icon for journey mode
      if (mode === 'start') {
        const iconContainer = button.querySelector('div');
        const tooltip = button.querySelector('.sidebar-tooltip') as HTMLElement;
        if (iconContainer) {
          // When journey mode is active, show save icon instead of pause
          iconContainer.innerHTML = isActive
            ? this.getSaveIcon()
            : this.getStartIcon();
          const newSvg = iconContainer.querySelector('svg');
          if (newSvg) {
            newSvg.style.stroke = isActive ? '#0277c0' : 'white';
            newSvg.style.fill = 'none';
            newSvg.style.width = '100%';
            newSvg.style.height = '100%';
          }
        }

        // Update tooltip text when active
        if (tooltip) {
          tooltip.textContent = isActive ? 'Save Journey' : 'Start Journey';
        }
      }
    });
  }

  private async handleModeDeactivate() {
    console.log('SnapInsights: Deactivating current mode:', this.state.activeMode);

    // Save to storage to sync with popup
    try {
      await chrome.storage.local.set({ currentMode: null });
    } catch (error) {
      console.error('Failed to save mode deactivation:', error);
    }

    // Send message to background script to deactivate
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DEACTIVATE_EXTENSION',
      });

      if (!response?.success) {
        console.error('Failed to deactivate extension:', response?.error);
      } else {
        console.log('SnapInsights: Extension deactivated successfully');
      }
    } catch (error) {
      console.error('Failed to communicate with background script:', error);
    }
  }

  private async handleModeSelect(
    mode: 'snap' | 'annotate' | 'transcribe' | 'start' | null
  ) {
    // Special handling for Journey mode
    if (mode === 'start' && this.state.activeMode === 'start') {
      // Journey mode is active, clicking the button should save all journey images
      console.log('SnapInsights: Saving journey...');

      try {
        // Send message to save all journey screenshots
        const response = await chrome.runtime.sendMessage({
          type: 'SAVE_JOURNEY_COLLECTION',
        });

        if (response?.success) {
          console.log('Journey saved successfully');
          // Deactivate journey mode after saving
          await chrome.storage.local.set({ currentMode: null });
          await chrome.runtime.sendMessage({ type: 'DEACTIVATE_EXTENSION' });
        } else {
          console.error('Failed to save journey:', response?.error);
        }
      } catch (error) {
        console.error('Failed to save journey:', error);
      }
      return;
    }

    // Normal mode toggle behavior for other modes
    const newMode = this.state.activeMode === mode ? null : mode;

    // Save to storage to sync with popup
    try {
      await chrome.storage.local.set({ currentMode: newMode });
    } catch (error) {
      console.error('Failed to save mode selection:', error);
    }

    // Send message to background script
    try {
      if (newMode) {
        const response = await chrome.runtime.sendMessage({
          type: 'ACTIVATE_EXTENSION',
          data: {
            mode: newMode,
            selectedIcon: 'blue',
          },
        });

        if (!response?.success) {
          console.error('Failed to activate extension:', response?.error);
        }
      } else {
        const response = await chrome.runtime.sendMessage({
          type: 'DEACTIVATE_EXTENSION',
        });

        if (!response?.success) {
          console.error('Failed to deactivate extension:', response?.error);
        }
      }
    } catch (error) {
      console.error('Failed to communicate with background script:', error);
    }
  }

  private removeSidebar() {
    if (this.container) {
      console.log('SnapInsights: Removing sidebar');

      // Fade out the entire sidebar
      this.container.style.transition =
        'opacity 0.3s ease-out, transform 0.3s ease-out';
      this.container.style.opacity = '0';
      this.container.style.transform = 'scale(0.8)';

      // Remove from DOM after animation
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
        this.container = null;

        // Reset state
        this.state.isVisible = false;
        this.state.isExpanded = false;

        // Clear global reference
        if (window.snapInsightsSidebarManager === this) {
          window.snapInsightsSidebarManager = undefined;
        }
      }, 300);
    }
  }

  // Icon SVG strings
  private getSnapIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
    </svg>`;
  }

  private getAnnotateIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
    </svg>`;
  }

  private getTranscribeIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
    </svg>`;
  }

  private getStartIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 5v14l11-7z"/>
    </svg>`;
  }

  private getSaveIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"/>
    </svg>`;
  }

  private getPauseIcon(): string {
    // Deprecated - keeping for backwards compatibility
    return this.getSaveIcon();
  }

  public destroy() {
    this.removeSidebar();
    chrome.storage.onChanged.removeListener(() => {});
  }
}

export default SidebarManager;
