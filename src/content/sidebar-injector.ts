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
   * Toggle sidebar dropdown state
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

    const dropdown = this.container.querySelector(
      '.sidebar-dropdown'
    ) as HTMLElement;
    const iconButton = this.container.querySelector(
      '.sidebar-icon-button'
    ) as HTMLElement;

    if (this.state.isExpanded) {
      // Show dropdown with slide down animation
      if (dropdown) {
        dropdown.style.display = 'block';
        dropdown.style.animation = 'slideDown 0.3s ease-out forwards';
      }
      // Update icon button border radius when expanded
      if (iconButton) {
        iconButton.style.borderRadius = '12px 0 0 0';
      }
    } else {
      // Hide dropdown with slide up animation
      if (dropdown) {
        dropdown.style.animation = 'slideUp 0.3s ease-in forwards';
        setTimeout(() => {
          dropdown.style.display = 'none';
        }, 300);
      }
      // Update icon button border radius when collapsed
      if (iconButton) {
        iconButton.style.borderRadius = '12px 0 0 12px';
      }
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

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'snapinsights-sidebar';
    this.container.style.cssText = `
      position: fixed;
      top: 150px;
      right: 0;
      z-index: 999999;
      pointer-events: auto;
      font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    `;

    // Create icon button (always visible)
    const iconButton = document.createElement('button');
    iconButton.className = 'sidebar-icon-button';
    iconButton.style.cssText = `
      width: 60px;
      height: 60px;
      border: none;
      border-radius: 14px 0 0 0;
      background: #0277c0;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      position: relative;
      z-index: 2;
    `;

    const iconImg = document.createElement('img');
    iconImg.src = chrome.runtime.getURL('assets/icons/icon.png');
    iconImg.alt = 'SnapInsights';
    iconImg.style.cssText = `
      width: 32px;
      height: 32px;
      object-fit: contain;
      filter: brightness(0) invert(1);
    `;

    iconButton.appendChild(iconImg);
    iconButton.addEventListener('click', () => this.toggleDropdown());
    // Remove hover effects to prevent gap

    // Create dropdown content (initially hidden)
    const dropdown = document.createElement('div');
    dropdown.className = 'sidebar-dropdown';
    dropdown.style.cssText = `
      position: absolute;
      top: 60px;
      right: 0;
      width: 60px;
      background: #0277c0;
      border-radius: 14px 0 0 14px;
      box-shadow: -2px 2px 8px rgba(0, 0, 0, 0.1);
      padding: 16px 8px;
      display: none;
      transform-origin: top center;
      box-sizing: border-box;
      z-index: 1;
    `;

    // Create modes section for dropdown
    const modes = document.createElement('div');
    modes.className = 'sidebar-modes';
    modes.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
    `;

    // Create mode buttons
    const modeConfigs = [
      { mode: 'snap', title: 'Snap Mode', icon: this.getSnapIcon() },
      {
        mode: 'annotate',
        title: 'Annotate Mode',
        icon: this.getAnnotateIcon(),
      },
      {
        mode: 'transcribe',
        title: 'Transcribe Mode',
        icon: this.getTranscribeIcon(),
      },
      { mode: 'start', title: 'Start Journey Mode', icon: this.getStartIcon() },
    ];

    modeConfigs.forEach(({ mode, title, icon }) => {
      const button = this.createModeButton(mode as any, title, icon);
      modes.appendChild(button);
    });

    // Create footer with close button
    const footer = document.createElement('div');
    footer.className = 'sidebar-footer';
    footer.style.cssText = 'margin-top: 16px;';

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      width: 44px;
      height: 32px;
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

    footer.appendChild(closeButton);

    // Assemble dropdown
    dropdown.appendChild(modes);
    dropdown.appendChild(footer);

    // Assemble sidebar
    this.container.appendChild(iconButton);
    this.container.appendChild(dropdown);

    // Add CSS animations for dropdown
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: scaleY(0) translateY(-10px);
          opacity: 0;
        }
        to {
          transform: scaleY(1) translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes slideUp {
        from {
          transform: scaleY(1) translateY(0);
          opacity: 1;
        }
        to {
          transform: scaleY(0) translateY(-10px);
          opacity: 0;
        }
      }
      
      .sidebar-dropdown {
        transform-origin: top center;
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
      height: 36px;
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
    button.title = title;

    // Add event listeners
    button.addEventListener('click', () => {
      this.handleModeSelect(mode);
      // Close dropdown after selection
      this.state.isExpanded = false;
      this.updateDropdownState();
    });
    button.addEventListener('mouseenter', () => {
      if (this.state.activeMode !== mode) {
        button.style.background = 'rgba(255, 255, 255, 0.1)';
      }
      button.style.transform = 'scale(1.05)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background =
        this.state.activeMode === mode ? 'white' : 'transparent';
      button.style.transform = 'scale(1)';
    });

    return button;
  }

  private updateSidebarState() {
    if (!this.container) return;

    console.log(
      'SnapInsights: Updating sidebar state to mode:',
      this.state.activeMode
    );
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

      // Update start/pause icon
      if (mode === 'start') {
        const iconContainer = button.querySelector('div');
        if (iconContainer) {
          iconContainer.innerHTML = isActive
            ? this.getPauseIcon()
            : this.getStartIcon();
          const newSvg = iconContainer.querySelector('svg');
          if (newSvg) {
            newSvg.style.stroke = isActive ? '#0277c0' : 'white';
            newSvg.style.fill = 'none';
            newSvg.style.width = '100%';
            newSvg.style.height = '100%';
          }
        }
      }
    });
  }

  private async handleModeSelect(
    mode: 'snap' | 'annotate' | 'transcribe' | 'start' | null
  ) {
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

  private getPauseIcon(): string {
    return `<svg viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
    </svg>`;
  }

  public destroy() {
    this.removeSidebar();
    chrome.storage.onChanged.removeListener(() => {});
  }
}

export default SidebarManager;
