# 🎭 E2E Testing with Playwright

This directory contains end-to-end (E2E) tests for the SnapInsights Chrome extension using Playwright.

## 📁 Directory Structure

```
tests/e2e/
├── README.md                 # This file
├── fixtures/                 # Test fixtures and custom setup
│   └── extension-fixture.ts   # Extension-specific Playwright fixtures
├── helpers/                  # Test utilities and helper functions
│   ├── extension-helpers.ts   # Chrome extension testing utilities
│   ├── global-setup.ts       # Global test setup (build extension, etc.)
│   └── global-teardown.ts    # Global test cleanup
└── specs/                    # Test specifications
    ├── extension-basic.spec.ts     # Basic extension functionality
    ├── screenshot-capture.spec.ts  # Screenshot capture tests
    ├── journey-mode.spec.ts        # Journey mode functionality
    └── error-handling.spec.ts      # Error handling and edge cases
```

## 🚀 Getting Started

### Prerequisites

1. **Extension Built**: Ensure the extension is built in the `dist/` directory:
   ```bash
   npm run build
   ```

2. **Playwright Installed**: Playwright should already be installed via package.json

3. **Browsers Installed**: Install Playwright browsers (if not already done):
   ```bash
   npx playwright install chromium
   ```

### Running Tests

#### Basic Test Runs

```bash
# Run all E2E tests
npm run test:e2e

# Run with UI mode (interactive)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Debug mode (step through tests)
npm run test:e2e:debug

# Show test report
npm run test:e2e:report
```

#### Advanced Options

```bash
# Run specific test file
npx playwright test extension-basic

# Run specific test
npx playwright test -g "should load extension successfully"

# Run in specific project
npx playwright test --project=chrome-extension

# Run with different reporter
npx playwright test --reporter=json
```

## 🧪 Test Categories

### 1. **Basic Extension Tests** (`extension-basic.spec.ts`)
- Extension loading and initialization
- Popup functionality
- Content script injection
- Storage API functionality
- Icon click handling

### 2. **Screenshot Capture Tests** (`screenshot-capture.spec.ts`)
- Single screenshot capture
- Multiple screenshot handling
- Rate limiting verification
- Cross-page functionality
- Popup interactions

### 3. **Journey Mode Tests** (`journey-mode.spec.ts`)
- Journey mode activation
- Multi-interaction tracking
- Progress indicator display
- Journey completion
- Data export functionality

### 4. **Error Handling Tests** (`error-handling.spec.ts`)
- System page handling
- Network error resilience
- Rapid click handling
- Context invalidation
- User-friendly error messages

## 🔧 Configuration

### Playwright Config (`playwright.config.ts`)

The configuration includes:

- **Extension Loading**: Automatically loads the built extension
- **Two Test Modes**:
  - `chrome-extension`: Headed mode for development
  - `chrome-extension-headless`: Headless mode for CI
- **Timeouts**: Configured for extension testing
- **Artifacts**: Screenshots, videos, and traces on failure

### Key Chrome Args

```javascript
args: [
  `--disable-extensions-except=${path.resolve('./dist')}`,
  `--load-extension=${path.resolve('./dist')}`,
  '--no-sandbox',
  '--disable-setuid-sandbox',
  // ... other Chrome flags
]
```

## 🛠 Helper Classes

### ExtensionHelper

Main utility class for extension testing:

```typescript
const helper = new ExtensionHelper(page, context);

// Get extension ID
const extensionId = await helper.getExtensionId();

// Open popup
const popupPage = await helper.openPopup();

// Navigate and inject content script
await helper.navigateToTestPage('https://example.com');

// Verify extension loaded
const isLoaded = await helper.verifyExtensionLoaded();

// Simulate screenshot capture
await helper.simulateScreenshot(100, 200);
```

### Test Fixtures

Custom Playwright fixtures for extension testing:

```typescript
test('my test', async ({ extensionHelper, extensionId, popupPage }) => {
  // extensionHelper: Ready-to-use ExtensionHelper instance
  // extensionId: Extension ID string
  // popupPage: Opened popup page
});
```

## 📊 Test Data

Test data is centralized in `TestData` object:

```typescript
import { TestData } from '../helpers/extension-helpers';

// Test URLs
TestData.testUrls.simple    // https://example.com
TestData.testUrls.complex   // https://github.com
TestData.testUrls.local     // Local HTML page

// Screenshot coordinates
TestData.screenshots.coordinates  // Array of {x, y} positions

// Extension modes and icons
TestData.modes  // ['snap', 'annotate', 'transcribe', 'start']
TestData.icons  // ['light', 'blue', 'dark']
```

## 🐛 Debugging

### Debug Mode

```bash
npm run test:e2e:debug
```

This opens Playwright Inspector where you can:
- Step through tests line by line
- Inspect page elements
- View console logs
- Take screenshots

### Screenshots and Videos

Failed tests automatically capture:
- Screenshots (`test-results/`)
- Videos (`test-results/`)
- Traces (`test-results/`)

### Console Logs

Extension logs are captured and can be accessed:

```typescript
const logs = await extensionHelper.getConsoleLogs();
console.log('Extension logs:', logs);
```

## 📝 Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures/extension-fixture';

test.describe('My Feature', () => {
  test('should do something', async ({
    page,
    extensionHelper,
    extensionId,
    popupPage
  }) => {
    // Your test code here
    await extensionHelper.navigateToTestPage('https://example.com');

    // Assertions
    expect(something).toBe(true);
  });
});
```

### Best Practices

1. **Use Fixtures**: Always use the provided fixtures for consistent setup
2. **Wait for Stability**: Use appropriate waits for UI elements
3. **Clean State**: Each test should work independently
4. **Error Handling**: Test both success and failure scenarios
5. **Meaningful Names**: Use descriptive test names

### Common Patterns

```typescript
// Wait for element
await expect(page.locator('#my-element')).toBeVisible();

// Wait for extension ready
await helper.waitForContentScript();

// Take debug screenshot
await helper.takeDebugScreenshot('debug-point-1');

// Verify no errors in console
const logs = await helper.getConsoleLogs();
expect(logs.filter(l => l.includes('error'))).toHaveLength(0);
```

## 🚀 CI/CD Integration

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    npm run build
    npm run test:e2e:headless
  env:
    CI: true
```

### Docker Support

For containerized testing:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.55.0-focal
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "test:e2e"]
```

## 📈 Coverage and Reporting

### HTML Report

After tests run, view detailed report:

```bash
npm run test:e2e:report
```

### JSON Report

For CI integration:

```bash
npx playwright test --reporter=json --output-dir=test-results
```

## ⚠️ Known Limitations

1. **Extension Permissions**: Some Chrome APIs may not work in test environment
2. **File Downloads**: Download testing is limited in headless mode
3. **Microphone/Camera**: Media APIs require special permissions
4. **Network Requests**: Some APIs may be blocked in test environment

## 🔍 Troubleshooting

### Common Issues

1. **Extension Not Loading**
   ```bash
   # Ensure extension is built
   npm run build
   ls -la dist/  # Check dist directory exists
   ```

2. **Tests Timing Out**
   ```javascript
   // Increase timeout in test
   test.setTimeout(120000); // 2 minutes
   ```

3. **Element Not Found**
   ```javascript
   // Use more specific selectors
   await expect(page.locator('[data-testid="specific-element"]')).toBeVisible();
   ```

### Debug Commands

```bash
# Run single test with debug info
npx playwright test extension-basic.spec.ts --headed --debug

# Check Playwright version
npx playwright --version

# Update Playwright
npm update @playwright/test
```

## 📚 Resources

- [Playwright Documentation](https://playwright.dev/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_debugging/)
- [Playwright Chrome Extension Example](https://github.com/microsoft/playwright/tree/main/packages/playwright-test/src/fixtures)

---

*Happy Testing! 🎉*