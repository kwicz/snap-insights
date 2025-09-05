Development Guidelines for Modular Chrome Extension

1. Before Adding Any New Feature
   Ask these questions first:
   □ Does similar functionality already exist in any module?
   □ Can this be broken into smaller, reusable components?
   □ Which existing modules/utilities can I leverage?
   □ Will this be used in multiple places (background, content, popup)?
   □ Does this belong in an existing module or need a new one?
2. Module Placement Rules
   Background Script Modules (modules/background/):

API calls and external data fetching
Chrome API interactions (tabs, storage, notifications)
Extension lifecycle management
Cross-script communication coordination
Background data processing

Content Script Modules (modules/content/):

DOM manipulation and page interaction
Page-specific event handling
UI injection and modification
Page data extraction

Shared Modules (modules/shared/):

Data validation and formatting
Common algorithms and calculations
Utility functions used by both scripts
Constants and configuration
Error handling helpers

3. Code Reuse Checklist
   Before writing new code:
   javascript// 1. Check existing utilities
   import { validateEmail, formatDate } from '../shared/validators.js';
   import { debounce, throttle } from '../shared/performance.js';
   import { logError, handleApiError } from '../shared/error-handling.js';

// 2. Check for similar patterns in existing modules
// Look for: API calls, DOM queries, data transformations, event handlers

// 3. Use existing constants
import { API_ENDPOINTS, SELECTORS, TIMEOUTS } from '../shared/constants.js'; 4. New Feature Development Template
Step 1: Plan the module structure
javascript// For a new feature like "user preferences"
// Create: modules/shared/user-preferences.js

/\*\*

- User Preferences Module
- Handles all user preference operations
  \*/

// Import existing utilities
import { getData, saveData } from './storage.js';
import { validatePreferences } from './validators.js';
import { logError } from './error-handling.js';

// Define constants
const PREF_KEYS = {
THEME: 'user_theme',
LANGUAGE: 'user_language',
NOTIFICATIONS: 'user_notifications'
};

// Implement functionality
export class UserPreferences {
// ... implementation
}
Step 2: Check for reusable patterns
javascript// DON'T create new DOM manipulation - reuse existing
import { createElement, findElement } from '../shared/dom-utils.js';

// DON'T create new API pattern - extend existing
import { apiRequest } from '../shared/api-client.js';

// DO extend existing modules when appropriate
import { StorageModule } from '../shared/storage.js';
export class UserPreferences extends StorageModule {
// Inherits save/load functionality
} 5. Style and CSS Reuse Guidelines
CSS Structure:
css/_ styles/shared/variables.css - Define once, use everywhere _/
:root {
--primary-color: #007bff;
--secondary-color: #6c757d;
--success-color: #28a745;
--error-color: #dc3545;
--border-radius: 4px;
--box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

/_ styles/shared/components.css - Reusable component styles _/
.extension-button {
background: var(--primary-color);
border-radius: var(--border-radius);
/_ ... _/
}

.extension-modal {
box-shadow: var(--box-shadow);
/_ ... _/
}
CSS Import Pattern:
javascript// In any content script module
export function createFeatureUI() {
// Inject shared styles if not already present
if (!document.querySelector('#extension-shared-styles')) {
const link = document.createElement('link');
link.id = 'extension-shared-styles';
link.rel = 'stylesheet';
link.href = chrome.runtime.getURL('styles/shared/components.css');
document.head.appendChild(link);
}

// Use existing CSS classes
const button = createElement('button', {
className: 'extension-button extension-button--primary'
});
} 6. Development Workflow
Before coding a new feature:

Audit existing code: grep -r "similar functionality" modules/
Review shared utilities: Check modules/shared/ for applicable functions
Check constants: See if new values should go in constants.js
Plan module placement: Background, content, or shared?

While coding:

Import first: Always import existing utilities before writing new ones
One responsibility: Each function should do one thing well
Export appropriately: Make reusable functions available to other modules
Document dependencies: Use JSDoc to note what the function relies on

After coding:

Refactor check: Can anything be extracted for reuse?
Update documentation: Add new utilities to your internal docs
Test reusability: Try using the new code in a different context
