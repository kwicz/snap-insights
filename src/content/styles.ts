/**
 * Utility function to inject CSS styles into the page
 */
export function injectStyles(styles: string, id?: string): void {
  // Remove existing style element if it exists
  if (id) {
    const existingStyle = document.getElementById(id);
    if (existingStyle) {
      existingStyle.remove();
    }
  }

  // Create and inject new style element
  const styleElement = document.createElement('style');
  styleElement.textContent = styles;
  if (id) {
    styleElement.id = id;
  }
  document.head.appendChild(styleElement);
}

/**
 * Remove injected styles by ID
 */
export function removeStyles(id: string): void {
  const styleElement = document.getElementById(id);
  if (styleElement) {
    styleElement.remove();
  }
}
