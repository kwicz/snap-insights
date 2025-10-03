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

    const modesContainer = this.container.querySelector(
      '.sidebar-modes'
    ) as HTMLElement;
    const divider = this.container.querySelector(
      '.sidebar-divider'
    ) as HTMLElement;
    const closeContainer = this.container.querySelector(
      '.sidebar-close-container'
    ) as HTMLElement;

    if (this.state.isExpanded) {
      // Calculate expanded height: icon (60px) + divider + 4 mode buttons + close button + padding
      const expandedHeight = 60 + 8 + 4 * 44 + 44 + 44; // Approximately 292px

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
      overflow: visible;
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
      {
        mode: 'start',
        title: 'Embark on a journey',
        icon: this.getStartIcon(),
      },
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
        position: absolute;
        right: calc(100% + 12px);
        top: 50%;
        transform: translateY(-50%);
        background: #0277c0;
        color: white;
        padding: 8px 14px;
        border-radius: 6px;
        font-size: 10px;
        font-weight: 600;
        font-family: 'League Spartan', -apple-system, BlinkMacSystemFont, sans-serif;
        text-transform: uppercase;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        z-index: 1000001;
      }

      .sidebar-tooltip::after {
        content: '';
        position: absolute;
        right: -4px;
        top: 50%;
        transform: translateY(-50%);
        border-left: 4px solid #0277c0;
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
    const iconContainer = this.container.querySelector(
      '.sidebar-icon-container'
    ) as HTMLElement;
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
          tooltip.textContent = isActive
            ? 'Save Journey'
            : 'Embark on a journey';
        }
      }
    });
  }

  private async handleModeDeactivate() {
    console.log(
      'SnapInsights: Deactivating current mode:',
      this.state.activeMode
    );

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
          const deactivateResponse = await chrome.runtime.sendMessage({ type: 'DEACTIVATE_EXTENSION' });

          if (deactivateResponse?.success) {
            // Update local state to reflect deactivation
            this.state.activeMode = null;
            this.updateSidebarState();
          }
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
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 535 467"><path fill="white" d="M0 0 C7.71757914 3.3343606 15.45541303 6.53533819 23.31469727 9.52197266 C26.66757353 10.80932669 29.95819205 12.18916803 33.25 13.625 C37.61112055 15.51546356 41.98037872 17.37628012 46.375 19.1875 C50.16489763 20.75659783 53.90409651 22.39897396 57.625 24.125 C61.28973593 25.80835164 64.9703011 27.33451532 68.74609375 28.75 C77.25826902 32.00053012 85.66708575 35.4952469 94.08105469 38.99072266 C96.81336753 40.12536025 99.54723291 41.25619485 102.28125 42.38671875 C118.25790761 49.00733164 118.25790761 49.00733164 125.97265625 52.64086914 C128.4634215 53.74760136 130.98982951 54.66422324 133.5625 55.5625 C137.53570403 56.96513602 141.31736448 58.57087129 145.125 60.375 C150.77241877 63.04014984 156.50431491 65.39537481 162.3125 67.6875 C172.67850253 71.7785138 172.67850253 71.7785138 177.6875 74.125 C182.75472302 76.49450713 187.92848268 78.55972358 193.125 80.625 C194.00760498 80.97578613 194.89020996 81.32657227 195.79956055 81.68798828 C197.51120076 82.36791334 199.22286957 83.04776639 200.93457031 83.72753906 C205.71285063 85.63098059 210.45619512 87.60794201 215.1875 89.625 C216.49485107 90.17873291 216.49485107 90.17873291 217.82861328 90.74365234 C220.90960711 92.05127466 223.98635921 93.36850514 227.0625 94.6875 C228.0625708 95.11144043 229.0626416 95.53538086 230.09301758 95.97216797 C239.88153916 100.19421492 247.05233877 104.22230094 251.1875 114.625 C251.76676426 117.57199812 251.94699297 120.43781281 252 123.4375 C252.02368652 124.13504395 252.04737305 124.83258789 252.07177734 125.55126953 C251.90157793 132.57398347 248.93108391 138.42542449 246.04580688 144.72006226 C244.60234929 147.92369128 243.2727145 151.17359438 241.93359375 154.421875 C241.38386035 155.74365469 240.8337286 157.06526877 240.28320312 158.38671875 C239.45019569 160.38878616 238.61826776 162.39127302 237.78930664 164.39501953 C234.82679397 171.55117394 231.83513994 178.63529601 228.20141602 185.48535156 C227.09364038 187.82307025 226.37348584 190.1333586 225.6875 192.625 C224.45908604 197.0624729 222.6378489 200.86093534 220.5078125 204.9296875 C218.5260364 208.9753251 217.01864765 213.17978454 215.4375 217.39453125 C213.20965372 223.15212147 210.55237425 228.70758129 207.9375 234.296875 C205.17507629 240.27061628 202.74251975 246.29698714 200.49609375 252.484375 C199.26956774 255.42803743 197.78594794 258.06865294 196.17114258 260.8125 C194.53382271 263.82949248 193.44621179 267.01770686 192.3125 270.25 C190.05126843 276.49568503 187.4678916 282.48407805 184.6171875 288.48828125 C183.18955455 291.62049234 181.95197195 294.7751014 180.75 298 C178.50659276 303.97522891 175.89247562 309.6867013 173.12890625 315.43359375 C172.84088135 316.06281738 172.55285645 316.69204102 172.25610352 317.34033203 C171.42588738 319.1153292 170.54657941 320.86739992 169.64819336 322.60888672 C164.95916551 332.31200019 164.42071697 340.2756292 164.625 350.875 C164.9293637 369.1129503 164.9293637 369.1129503 159.1875 377.625 C158.5275 377.625 157.8675 377.625 157.1875 377.625 C157.1875 378.285 157.1875 378.945 157.1875 379.625 C156.5275 379.625 155.8675 379.625 155.1875 379.625 C154.8575 380.615 154.5275 381.605 154.1875 382.625 C149.04850496 386.43806533 143.63248963 387.25860179 137.40673828 387.36691284 C136.54924547 387.39550506 135.69175266 387.42409729 134.80827522 387.45355594 C131.93457095 387.53779796 129.06217243 387.58666266 126.1875 387.625 C125.17966209 387.63900172 124.17182419 387.65300344 123.13344574 387.66742945 C114.98212035 387.76326607 106.83145727 387.76131256 98.6796875 387.75439453 C95.96717751 387.75520346 93.2546692 387.75749907 90.54216003 387.75970459 C83.99026017 387.76411239 77.43837186 387.76320861 70.88647157 387.76029195 C65.5585806 387.75801964 60.23069283 387.75773324 54.90280151 387.75881577 C53.75890063 387.75904561 53.75890063 387.75904561 52.59189063 387.75928011 C51.04206109 387.75959987 49.49223155 387.75992409 47.94240201 387.7602527 C33.46967557 387.76309245 18.99695551 387.75984338 4.52423012 387.75445233 C-7.87008023 387.74997843 -20.26438122 387.75076797 -32.65869141 387.75537109 C-47.0973679 387.76073106 -61.53603884 387.76282546 -75.97471619 387.75975883 C-77.51592 387.75944032 -79.05712382 387.75912595 -80.59832764 387.75881577 C-81.35639788 387.75866149 -82.11446813 387.75850721 -82.8955102 387.75834826 C-88.21559947 387.75748792 -93.5356852 387.75893542 -98.85577393 387.76129532 C-105.34044697 387.76410901 -111.82510792 387.76332173 -118.30977958 387.75801457 C-121.61259768 387.75539981 -124.91539166 387.75487968 -128.21821022 387.75766373 C-131.80817237 387.76041023 -135.3980785 387.75695159 -138.98803711 387.75198364 C-140.0172333 387.75421436 -141.04642948 387.75644509 -142.10681343 387.75874341 C-162.93080373 387.70313053 -162.93080373 387.70313053 -171.8125 381.625 C-171.8125 380.965 -171.8125 380.305 -171.8125 379.625 C-172.4165997 379.3874457 -173.0206994 379.14989141 -173.64310515 378.90513849 C-177.76674344 376.47182023 -179.22736142 371.98183033 -180.8125 367.625 C-181.44520585 364.17249762 -181.49075163 360.84395988 -181.44741821 357.3404541 C-181.45911814 355.86201704 -181.45911814 355.86201704 -181.47105443 354.35371256 C-181.49087159 351.07721597 -181.47524967 347.80189418 -181.45947266 344.52539062 C-181.46625331 342.16577989 -181.47515894 339.80617445 -181.48602295 337.44657898 C-181.50876917 331.05607503 -181.49999889 324.66597581 -181.48412752 318.27546501 C-181.47656052 314.28020707 -181.47692201 310.28500692 -181.48157883 306.28974915 C-181.48234499 305.62512921 -181.48311116 304.96050928 -181.48390054 304.27574936 C-181.48549927 302.92530498 -181.48712034 301.57486064 -181.4887635 300.22441632 C-181.50299848 287.5810882 -181.48666377 274.93794177 -181.45976166 262.29464346 C-181.43742485 251.46180028 -181.44130561 240.62922506 -181.46435547 229.79638672 C-181.49115343 217.19625426 -181.5016254 204.59628077 -181.48629415 191.99612379 C-181.48470152 190.65083284 -181.48312966 189.30554186 -181.48157883 187.96025085 C-181.48080745 187.29845728 -181.48003607 186.6366637 -181.47924132 185.95481578 C-181.47493627 181.3061255 -181.48243122 176.65754067 -181.49397659 172.00886536 C-181.50844901 165.74435419 -181.498348 159.48034769 -181.46950531 153.21589088 C-181.46290945 150.92058461 -181.46476636 148.62523566 -181.47581863 146.32994652 C-181.4895443 143.18924493 -181.47227203 140.05014619 -181.44741821 136.9095459 C-181.45857182 136.00777697 -181.46972543 135.10600804 -181.48121703 134.17691278 C-181.3769209 127.35187867 -179.24570062 122.47587722 -175.8125 116.625 C-175.1525 116.625 -174.4925 116.625 -173.8125 116.625 C-173.8125 115.965 -173.8125 115.305 -173.8125 114.625 C-173.1525 114.625 -172.4925 114.625 -171.8125 114.625 C-171.8125 113.965 -171.8125 113.305 -171.8125 112.625 C-164.50429378 107.40724452 -158.06398234 106.85639919 -149.25 106.8125 C-148.05052734 106.78736328 -146.85105469 106.76222656 -145.61523438 106.73632812 C-142.68065897 106.67787045 -139.74756119 106.64128638 -136.8125 106.625 C-136.679646 105.72015869 -136.54679199 104.81531738 -136.40991211 103.88305664 C-135.57758016 98.25287944 -134.69011131 92.68238277 -133.375 87.14453125 C-132.91596347 85.08843013 -132.51231409 83.02002877 -132.125 80.94921875 C-132.00116943 80.28905762 -131.87733887 79.62889648 -131.74975586 78.94873047 C-131.3913872 77.02544642 -131.04119948 75.10064341 -130.69140625 73.17578125 C-129.3146226 67.6135753 -127.23845928 63.33709488 -122.8125 59.625 C-122.1525 59.625 -121.4925 59.625 -120.8125 59.625 C-120.3175 58.14 -120.3175 58.14 -119.8125 56.625 C-113.07216084 51.6241032 -104.81581521 51.97665707 -96.8125 52.625 C-96.1525 52.955 -95.4925 53.285 -94.8125 53.625 C-92.83645524 53.80834436 -90.85617232 53.94706903 -88.875 54.0625 C-82.74320922 54.48585304 -76.8275445 55.38341767 -70.8125 56.625 C-70.6256665 55.55741455 -70.6256665 55.55741455 -70.43505859 54.46826172 C-69.79755742 51.55675634 -68.90339158 48.92023165 -67.8515625 46.1328125 C-67.46226562 45.09769531 -67.07296875 44.06257813 -66.671875 42.99609375 C-66.26453125 41.92488281 -65.8571875 40.85367188 -65.4375 39.75 C-65.03789062 38.68652344 -64.63828125 37.62304688 -64.2265625 36.52734375 C-60.98884694 27.95378776 -60.98884694 27.95378776 -59.16796875 23.76953125 C-57.80742175 20.61321906 -56.65296873 17.42452903 -55.5 14.1875 C-51.77218704 4.54164568 -47.010823 -1.46922773 -37.8125 -6.375 C-24.32200783 -11.58185663 -12.41140084 -5.39309256 0 0 Z M-35.8125 11.625 C-40.07376414 18.03193596 -42.52155148 25.37902221 -44.8125 32.671875 C-46.4439736 37.48982048 -48.63964008 42.03219911 -50.8125 46.625 C-52.83159818 50.94570393 -54.09903544 54.88838806 -54.8125 59.625 C-43.9384027 61.92014759 -33.14832778 64.00769538 -22.09765625 65.23046875 C-18.8125 65.625 -18.8125 65.625 -16.39941406 66.11132812 C-13.97805564 66.59212636 -11.58662887 66.94169597 -9.13671875 67.23828125 C-7.78815796 67.40577881 -7.78815796 67.40577881 -6.41235352 67.57666016 C-5.45127686 67.6957373 -4.4902002 67.81481445 -3.5 67.9375 C6.08165938 69.15052436 15.59971634 70.62260055 25.11645508 72.2668457 C29.32375046 72.9920425 33.51209293 73.6894037 37.75390625 74.1796875 C41.1875 74.625 41.1875 74.625 43.1875 75.625 C44.99715829 75.78599102 46.81078958 75.90293396 48.625 76 C56.54922874 76.56786004 64.29169771 77.81891627 72.12109375 79.11865234 C77.75017494 80.04816782 83.38368592 80.95047009 89.01641846 81.85754395 C91.00638589 82.1784509 92.9961165 82.50082529 94.98583984 82.82324219 C102.06467063 83.96910586 109.14673731 85.08795543 116.23535156 86.17163086 C120.36788847 86.80627534 124.49627677 87.46610408 128.625 88.125 C134.01541015 88.98152478 139.40622378 89.81107415 144.8125 90.5625 C147.27128993 90.9137557 149.72950753 91.26825613 152.1875 91.625 C153.60119873 91.82778564 153.60119873 91.82778564 155.04345703 92.03466797 C158.32261459 92.5106016 161.59880784 93.00409341 164.875 93.5 C165.92059082 93.64945068 166.96618164 93.79890137 168.04345703 93.95288086 C176.86732709 95.31302437 186.64884687 97.08634687 193.1875 103.625 C193.5175 104.285 193.8475 104.945 194.1875 105.625 C194.8475 105.625 195.5075 105.625 196.1875 105.625 C199.23096369 112.7988787 200.54089362 118.45143544 199.5 126.125 C199.40404541 126.90238525 199.30809082 127.67977051 199.20922852 128.48071289 C198.11920852 136.89176267 196.87352629 145.56692112 194.1875 153.625 C193.89592083 155.10021738 193.62875138 156.58030738 193.375 158.0625 C191.17761795 170.38067089 188.63211095 182.62775378 185.96801758 194.85253906 C183.67580345 205.3808069 181.56063793 215.89376538 179.80126953 226.52368164 C178.06408361 236.77876846 175.85186767 246.93145604 173.64868164 257.09448242 C172.02742896 264.58345558 170.48734408 272.07276655 169.1875 279.625 C169.8475 279.955 170.5075 280.285 171.1875 280.625 C171.43242187 279.965 171.67734375 279.305 171.9296875 278.625 C178.8207347 260.37560604 186.63763143 242.50030683 194.5234375 224.6640625 C200.25274658 211.69773142 205.81264074 198.67873722 211.02807617 185.49707031 C215.13215548 175.1689237 219.51507519 164.95804071 223.86669922 154.73242188 C225.83722228 150.09641124 227.79503347 145.45508787 229.75 140.8125 C230.23339844 139.66672485 230.23339844 139.66672485 230.7265625 138.49780273 C231.30369609 137.12757891 231.87876777 135.75648362 232.45117188 134.38427734 C233.08369005 132.87302869 233.7299641 131.36755044 234.37890625 129.86328125 C235.17349716 127.66376147 235.51554908 125.95376574 235.5625 123.625 C235.59085937 122.985625 235.61921875 122.34625 235.6484375 121.6875 C234.89718557 118.32596593 233.71735174 117.03019238 231.1875 114.625 C227.46716846 112.6692556 223.59997609 111.15181994 219.6875 109.625 C217.61458333 108.79166667 215.54166667 107.95833333 213.46875 107.125 C211.92102905 106.51156738 211.92102905 106.51156738 210.34204102 105.88574219 C206.17768193 104.22141664 202.04039283 102.49526075 197.90405273 100.76269531 C195.18919629 99.62571041 192.4701425 98.49927022 189.75 97.375 C184.33798806 95.12057847 178.94940036 92.81355629 173.5625 90.5 C150.81682232 80.66967538 150.81682232 80.66967538 127.875 71.3125 C123.36158788 69.5337147 118.95347398 67.62516393 114.5625 65.5625 C109.31266698 63.09763938 104.00381965 60.95071465 98.578125 58.90625 C89.61316651 55.51856983 80.71183183 51.99327735 72.04296875 47.8984375 C68.72421034 46.41838929 65.35887167 45.08497454 61.98168945 43.74462891 C55.99526888 41.3458762 50.05780159 38.82702985 44.109375 36.3359375 C39.33886469 34.34210883 34.5640613 32.36721716 29.7578125 30.4609375 C26.47267683 29.15448347 23.25340696 27.77514536 20.0625 26.25 C14.88335594 23.8579377 9.60054474 21.88898319 4.24731445 19.93286133 C-0.18708393 18.29148622 -4.47101052 16.45938509 -8.75 14.4375 C-22.24384538 7.72372694 -22.24384538 7.72372694 -35.8125 11.625 Z M-111.8125 71.625 C-111.8125 72.285 -111.8125 72.945 -111.8125 73.625 C-112.4725 73.625 -113.1325 73.625 -113.8125 73.625 C-114.66930177 78.14523697 -115.52374098 82.66591162 -116.37597656 87.18701172 C-116.66633968 88.72554647 -116.95735241 90.26395876 -117.24902344 91.80224609 C-117.66771839 94.01107559 -118.08408882 96.22033236 -118.5 98.4296875 C-118.69686401 99.46414505 -118.69686401 99.46414505 -118.89770508 100.51950073 C-119.57891883 104.04814247 -119.57891883 104.04814247 -119.8125 107.625 C-33.0225 107.625 53.7675 107.625 143.1875 107.625 C143.1875 107.295 143.1875 106.965 143.1875 106.625 C142.45789063 106.51542969 141.72828125 106.40585938 140.9765625 106.29296875 C136.00817429 105.5385098 131.0430836 104.77801308 126.08984375 103.9296875 C116.62257593 102.30860959 107.14563668 100.88863752 97.62329102 99.62719727 C93.12918681 99.03179112 88.65577825 98.39495755 84.1875 97.625 C82.0213219 97.28850631 79.85464166 96.95523111 77.6875 96.625 C74.56727679 96.14953742 71.44972486 95.66908971 68.3371582 95.14575195 C65.41967985 94.66338769 62.50041442 94.21880228 59.57421875 93.79296875 C58.50494141 93.63642822 57.43566406 93.4798877 56.33398438 93.31860352 C55.19251953 93.15158936 54.05105469 92.9845752 52.875 92.8125 C43.96764162 91.5032616 35.07286773 90.13814229 26.1875 88.6875 C15.41502392 86.93357886 4.61830415 85.39055667 -6.18899536 83.87091064 C-18.01052936 82.20518467 -29.79316037 80.36967331 -41.57373047 78.43432617 C-51.38471829 76.83125256 -61.21204024 75.38585276 -71.05761719 74.01245117 C-76.20212093 73.29274029 -81.33925767 72.55592463 -86.46484375 71.7109375 C-87.32432617 71.56930176 -88.18380859 71.42766602 -89.06933594 71.28173828 C-90.61146941 71.0236834 -92.15263748 70.75973463 -93.69238281 70.48779297 C-103.14262303 68.7457621 -103.14262303 68.7457621 -111.8125 71.625 Z M146.1875 107.625 C148.89827243 110.59626708 151.31901386 111.50743734 155.1875 112.625 C155.1875 113.285 155.1875 113.945 155.1875 114.625 C155.8475 114.625 156.5075 114.625 157.1875 114.625 C157.61781336 115.50231152 157.61781336 115.50231152 158.05681992 116.3973465 C158.74774095 117.75859153 159.46846646 119.10584425 160.23862076 120.42388153 C163.26994866 125.79865622 163.76872444 130.24374695 163.73339844 136.34570312 C163.74890495 137.7519696 163.74890495 137.7519696 163.76472473 139.18664551 C163.79402842 142.26002492 163.79564929 145.3327422 163.796875 148.40625 C163.81186501 150.54717251 163.82859388 152.68808349 163.84698486 154.82897949 C163.89057809 160.4447484 163.9106398 166.06036132 163.92572021 171.67626953 C163.94532015 177.41448153 163.98728698 183.15252579 164.02734375 188.890625 C164.10255901 200.13536483 164.15290315 211.38006695 164.1875 222.625 C164.5175 222.625 164.8475 222.625 165.1875 222.625 C165.65091402 220.7095554 166.10786997 218.79254846 166.5625 216.875 C166.81773437 215.80765625 167.07296875 214.7403125 167.3359375 213.640625 C168.04221285 210.47811773 168.58794474 207.30344927 169.109375 204.10546875 C170.27869582 196.93653814 171.66647967 189.81522782 173.0625 182.6875 C173.59833441 179.94153826 174.13319521 177.19538727 174.66796875 174.44921875 C174.79921646 173.776026 174.93046417 173.10283325 175.06568909 172.40924072 C176.02489951 167.48218017 176.95898963 162.55075322 177.8840332 157.6171875 C179.28700912 150.13837007 180.77328437 142.71130441 182.57421875 135.31640625 C185.04409203 124.82846706 185.04409203 124.82846706 182.6875 114.6875 C173.97825426 107.50237227 157.03190432 108.48173049 146.1875 107.625 Z M-163.8125 128.625 C-165.3402803 133.11398488 -164.95467139 138.06151379 -164.94621277 142.75900269 C-164.94847833 143.68121868 -164.95074388 144.60343468 -164.95307809 145.55359662 C-164.95941012 148.64495604 -164.95858924 151.73627153 -164.95776367 154.82763672 C-164.96075564 157.04358985 -164.96415826 159.25954246 -164.96794128 161.47549438 C-164.97678126 167.49614024 -164.97911939 173.51677189 -164.97975707 179.53742361 C-164.98070634 184.56234994 -164.98438481 189.58727295 -164.98792917 194.612198 C-164.99560836 205.78939746 -164.99859778 216.96659167 -164.99792381 228.14379321 C-164.99788386 228.81418813 -164.9978439 229.48458305 -164.99780273 230.17529297 C-164.99776185 230.84650823 -164.99772097 231.51772348 -164.99767885 232.2092786 C-164.9972724 243.08741067 -165.00684248 253.96550812 -165.0209411 264.84363018 C-165.03530985 276.01851564 -165.04202793 287.19338843 -165.04134732 298.36828434 C-165.04109224 304.64001777 -165.04394938 310.91171202 -165.05452538 317.18343735 C-165.0641999 323.0816452 -165.06428992 328.97977636 -165.05700874 334.87798691 C-165.05596213 337.04232902 -165.05833035 339.20667589 -165.0643692 341.37100983 C-165.07208105 344.32644027 -165.06744955 347.28160534 -165.05973816 350.23703003 C-165.06488172 351.09258386 -165.07002529 351.94813768 -165.07532471 352.82961738 C-165.03948677 359.04913786 -164.34486619 364.32645071 -160.8125 369.625 C-157.83433101 370.617723 -155.88061493 370.75403094 -152.77211189 370.76201439 C-151.20024941 370.7696262 -151.20024941 370.7696262 -149.59663212 370.77739179 C-148.44149676 370.77788955 -147.28636139 370.77838731 -146.09622192 370.77890015 C-144.87212077 370.7832824 -143.64801962 370.78766465 -142.38682449 370.7921797 C-138.98277194 370.80325027 -135.57876538 370.80979395 -132.17470145 370.81436086 C-128.50590316 370.82031618 -124.83712182 370.83192599 -121.16833496 370.84265137 C-112.30631219 370.86717375 -103.4442838 370.88180061 -94.58223754 370.89471143 C-92.08012039 370.89842295 -89.5780038 370.9023962 -87.0758872 370.9064641 C-71.54384316 370.931696 -56.01179825 370.95375279 -40.47973824 370.96619225 C-36.8821627 370.96912201 -33.28458719 370.97208367 -29.68701172 370.97509766 C-28.34574716 370.97621673 -28.34574716 370.97621673 -26.97738634 370.97735842 C-12.48294267 370.99001989 2.01137856 371.02325407 16.50576495 371.06489949 C31.38023813 371.10728748 46.25464855 371.13088349 61.12918198 371.13611281 C69.48346116 371.13953008 77.83754883 371.15132262 86.19176865 371.18421555 C93.30439581 371.21217396 100.41679221 371.22323392 107.52947007 371.21202008 C111.15957244 371.20682288 114.78919123 371.20978801 118.41922379 371.23448563 C122.35209889 371.26102091 126.28430978 371.24895399 130.21725464 371.23300171 C131.36792856 371.2468838 132.51860248 371.26076588 133.70414531 371.27506864 C139.92264935 371.24787214 139.92264935 371.24787214 145.31064034 368.39949989 C149.18927728 362.66583851 149.47787617 358.24486414 149.44819641 351.49099731 C149.45202196 350.56878132 149.45584751 349.64656532 149.45978898 348.69640338 C149.47011096 345.60499877 149.46612831 342.51378016 149.4621582 339.42236328 C149.46650513 337.20640898 149.47168821 334.99045618 149.47764587 332.77450562 C149.49104953 326.75384564 149.49161299 320.73324838 149.48908257 314.71257639 C149.48801374 309.68764644 149.49289403 304.66272923 149.497688 299.637802 C149.50942289 287.10543169 149.50855541 274.57309186 149.50213119 262.0407214 C149.49696304 251.16256844 149.50821491 240.28450506 149.52722941 229.40636982 C149.54661256 218.23148064 149.55457156 207.0566241 149.55110615 195.88171566 C149.54929217 189.60996619 149.55194099 183.33829876 149.56582069 177.06656265 C149.57838506 171.16831874 149.57646797 165.27025421 149.56340981 159.37201309 C149.56104141 157.20767151 149.56378809 155.04331735 149.57203293 152.87899017 C149.58247966 149.92344146 149.57441607 146.96849694 149.5617218 144.01296997 C149.56909609 143.15741614 149.57647037 142.30186232 149.58406812 141.42038262 C149.53030253 135.46601818 148.63655179 130.80568837 144.90162015 125.9549728 C142.56120682 124.13906388 141.04329535 124.24798882 138.09746647 124.24468327 C137.03849126 124.23624332 135.97951605 124.22780338 134.88845068 124.21910769 C133.13721519 124.22812276 133.13721519 124.22812276 131.3506012 124.23731995 C130.11354382 124.23193441 128.87648644 124.22654887 127.60194248 124.22100013 C124.16159915 124.20913903 120.72173814 124.2108059 117.28141344 124.21816695 C113.57376542 124.22288376 109.86617012 124.21040199 106.15853882 124.20014954 C98.89242197 124.18292683 91.62639145 124.1821287 84.36025948 124.18736244 C78.45598881 124.19139897 72.55174373 124.18996675 66.64747429 124.18461418 C65.80810119 124.18386576 64.9687281 124.18311734 64.10391946 124.18234624 C62.39889598 124.18081481 60.6938725 124.17927646 58.98884904 124.17773127 C42.98846075 124.16399364 26.98812131 124.16945275 10.98773413 124.18091648 C-3.65933716 124.19085 -18.30628216 124.1779084 -32.95333397 124.15398229 C-47.98262636 124.12961622 -63.01185986 124.11997728 -78.04117161 124.12663502 C-86.48312207 124.13013282 -94.92497537 124.12785832 -103.36691093 124.11038399 C-110.55349054 124.09569309 -117.73990457 124.09498558 -124.92648082 124.1124549 C-128.59485865 124.12099318 -132.2629403 124.12304616 -135.93130302 124.10780334 C-139.90389444 124.09150044 -143.8760242 124.10604419 -147.84861755 124.12379456 C-149.01387716 124.11418955 -150.17913677 124.10458454 -151.37970728 124.09468848 C-152.44129023 124.10450277 -153.50287319 124.11431706 -154.59662533 124.12442875 C-155.9725708 124.12458975 -155.9725708 124.12458975 -157.37631315 124.12475401 C-160.57723537 124.78203057 -161.77312439 126.12976644 -163.8125 128.625 Z M169.1875 280.625 C170.1875 282.625 170.1875 282.625 170.1875 282.625 Z " transform="translate(244.8125,41.375)"/><path fill="white" d="M0 0 C1.01835937 0.2784375 2.03671875 0.556875 3.0859375 0.84375 C28.38301639 8.54574777 47.99039438 25.75503462 60.96875 48.44140625 C73.83001465 72.82876188 74.57604945 99.66608213 67.25 125.8125 C64.00244638 135.64192755 58.66879059 146.00983914 52 154 C51.34 154 50.68 154 50 154 C49.78988281 154.53367187 49.57976562 155.06734375 49.36328125 155.6171875 C47.46616703 158.93306049 44.875719 161.45303384 42.1875 164.125 C41.66607422 164.66253906 41.14464844 165.20007813 40.60742188 165.75390625 C37.60938578 168.75568521 35.16196369 170.75371882 31 172 C31 172.66 31 173.32 31 174 C27.88085968 176.337595 24.41416624 178.13086608 21 180 C20.08089844 180.51175781 19.16179687 181.02351562 18.21484375 181.55078125 C-4.54741718 193.15683524 -31.5665069 194.06111076 -55.859375 187.19140625 C-65.16943255 184.09264449 -74.83871747 179.44085502 -83 174 C-83 173.34 -83 172.68 -83 172 C-84.07314453 171.6596875 -84.07314453 171.6596875 -85.16796875 171.3125 C-88.60492671 169.71964776 -90.66484167 167.69865027 -93.3125 165 C-94.63701172 163.6696875 -94.63701172 163.6696875 -95.98828125 162.3125 C-98 160 -98 160 -98 158 C-98.66 158 -99.32 158 -100 158 C-100 157.34 -100 156.68 -100 156 C-100.66 156 -101.32 156 -102 156 C-103.69748285 153.84761617 -105.23655507 151.71562996 -106.75 149.4375 C-107.19738525 148.76509277 -107.64477051 148.09268555 -108.10571289 147.39990234 C-112.47333361 140.61529477 -115.33923412 133.58450871 -118 126 C-118.31582031 125.20335937 -118.63164062 124.40671875 -118.95703125 123.5859375 C-127.36982478 101.45573186 -123.44528367 75.37415894 -115 54 C-112.14972769 48.02765106 -108.81163192 42.41005821 -105 37 C-104.57589844 36.36835938 -104.15179688 35.73671875 -103.71484375 35.0859375 C-102.53046812 33.35253643 -101.27030382 31.6714524 -100 30 C-99.34 30 -98.68 30 -98 30 C-97.731875 29.40832031 -97.46375 28.81664062 -97.1875 28.20703125 C-93.30497294 20.99115037 -85.67419618 16.36195575 -79 12 C-78.24074219 11.484375 -77.48148438 10.96875 -76.69921875 10.4375 C-54.42383418 -3.93854651 -25.30567311 -7.00586654 0 0 Z M-47.44335938 43.23632812 C-48.92050758 45.85886855 -49.72269996 47.86840809 -50.25 50.8125 C-50.39953125 51.60269531 -50.5490625 52.39289063 -50.703125 53.20703125 C-50.85007812 54.09455078 -50.85007812 54.09455078 -51 55 C-51.70084717 55.01458252 -52.40169434 55.02916504 -53.1237793 55.04418945 C-56.31223009 55.11885487 -59.49965513 55.21545475 -62.6875 55.3125 C-63.79029297 55.33505859 -64.89308594 55.35761719 -66.02929688 55.38085938 C-67.09599609 55.41630859 -68.16269531 55.45175781 -69.26171875 55.48828125 C-70.24100342 55.51446533 -71.22028809 55.54064941 -72.22924805 55.56762695 C-75.49556518 56.07733245 -77.37130594 57.00731228 -80 59 C-82.32240417 62.48641102 -82.258866 65.58942682 -82.2746582 69.70874023 C-82.27976913 70.37428925 -82.28488007 71.03983826 -82.29014587 71.72555542 C-82.30401663 73.91999366 -82.30308707 76.11411695 -82.30078125 78.30859375 C-82.30466956 79.83789689 -82.30900451 81.36719896 -82.31376648 82.89649963 C-82.32122325 86.10006208 -82.32094137 89.30351431 -82.31567383 92.50708008 C-82.30987972 96.60727662 -82.32681105 100.70702136 -82.3500185 104.80714321 C-82.36476833 107.96505866 -82.36562586 111.12286561 -82.36250877 114.2808094 C-82.36302135 115.79224607 -82.36824727 117.3036889 -82.37832069 118.81509209 C-82.39069259 120.93097964 -82.38388996 123.04599113 -82.37231445 125.16186523 C-82.37294388 126.36447495 -82.3735733 127.56708466 -82.3742218 128.80613708 C-81.8616063 133.18114582 -80.28906666 135.55574155 -77.40391541 138.78823853 C-73.56687098 140.72240917 -69.77395439 140.41665947 -65.53735352 140.38818359 C-64.57919739 140.39344055 -63.62104126 140.39869751 -62.6338501 140.40411377 C-59.46536982 140.41732138 -56.29739168 140.40857212 -53.12890625 140.3984375 C-50.92699589 140.40045818 -48.72508617 140.40336956 -46.5231781 140.40713501 C-41.90723299 140.41155954 -37.29146199 140.40512364 -32.67553711 140.39111328 C-26.75935008 140.37403152 -20.84357163 140.38385559 -14.92739964 140.40183067 C-10.3797854 140.41267349 -5.83226796 140.40921967 -1.2846508 140.4014473 C0.89663809 140.39944615 3.07793577 140.40190154 5.2592144 140.40888596 C8.30903247 140.41650732 11.35819007 140.40488571 14.40795898 140.38818359 C15.76015282 140.39729263 15.76015282 140.39729263 17.1396637 140.40658569 C21.87125011 140.35859742 25.23965416 140.20384196 29 137 C31.47850364 133.62768063 31.25921788 130.28652545 31.2746582 126.19946289 C31.2823246 125.18650902 31.2823246 125.18650902 31.29014587 124.15309143 C31.30401819 121.92618894 31.30308695 119.69959675 31.30078125 117.47265625 C31.30466947 115.92093288 31.3090044 114.36921056 31.31376648 112.81748962 C31.32122359 109.56684925 31.32094112 106.31631749 31.31567383 103.06567383 C31.30987965 98.90494568 31.32681108 94.74466276 31.3500185 90.58400822 C31.36476735 87.37977001 31.36562599 84.17563874 31.36250877 80.9713726 C31.3630214 79.43760738 31.36824823 77.90383607 31.37832069 76.37010384 C31.39069065 74.22308747 31.38389105 72.07693472 31.37231445 69.92993164 C31.37294388 68.70955704 31.3735733 67.48918243 31.3742218 66.23182678 C30.96260793 62.67707739 30.15081049 60.83273103 28 58 C24.7252525 55.816835 23.59634777 55.72401667 19.78125 55.62109375 C18.76675781 55.58693359 17.75226563 55.55277344 16.70703125 55.51757812 C15.64871094 55.49115234 14.59039062 55.46472656 13.5 55.4375 C11.40613571 55.377566 9.31237317 55.31393033 7.21875 55.24609375 C6.28998047 55.22216553 5.36121094 55.1982373 4.40429688 55.17358398 C2 55 2 55 -1 54 C-1.92104159 51.51719223 -2.46102469 49.02350353 -3.05859375 46.4453125 C-4.25238488 43.34442767 -5.09630519 42.62298318 -8 41 C-10.85535499 40.68339282 -13.48776441 40.53199116 -16.34375 40.53125 C-17.14985718 40.52363647 -17.95596436 40.51602295 -18.78649902 40.50817871 C-20.48768013 40.49739246 -22.18892738 40.49451863 -23.89013672 40.49902344 C-26.4916815 40.49999689 -29.0902864 40.45834107 -31.69140625 40.4140625 C-33.34634803 40.40885601 -35.00130004 40.4061673 -36.65625 40.40625 C-37.43238647 40.38985474 -38.20852295 40.37345947 -39.00817871 40.35656738 C-42.79619032 40.40501601 -44.60703228 40.64032931 -47.44335938 43.23632812 Z " transform="translate(263,194)"/></svg>';
  }

  private getSaveIcon(): string {
    return '<svg viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"/></svg>';
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
