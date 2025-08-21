# Test Organization Strategy

## Directory Structure

```
tests/
├── __mocks__/           # Jest mock implementations
│   ├── chrome-api.ts    # Chrome API mocks
│   ├── browser.ts       # Browser API mocks
│   └── index.ts         # Mock exports
├── components/          # React component tests
│   ├── ui/             # UI component tests
│   │   └── Button/     # Button component and related tests
│   └── *.test.tsx      # Feature component tests
├── integration/         # Integration test suites
│   ├── capture-flow.test.ts
│   └── cross-site-compatibility.test.ts
├── unit/               # Unit tests for non-component code
│   ├── background/     # Background script tests
│   ├── content/        # Content script tests
│   └── utils/          # Utility function tests
├── utils/              # Test utilities and helpers
│   └── index.ts        # Test utility exports
└── jest.setup.ts       # Jest setup and global mocks
```

## Test File Naming

- Test files should be named after the module they test
- Use `.test.ts` or `.test.tsx` extension
- Component tests: `ComponentName.test.tsx`
- Unit tests: `module-name.test.ts`
- Integration tests: `feature-name.test.ts`

## Test Organization Guidelines

1. **Component Tests**

   - Place in `/tests/components/`
   - UI components go in `/tests/components/ui/`
   - Test component rendering, interactions, and state
   - Use React Testing Library patterns
   - Use explicit assertions over snapshots for better maintainability

2. **Unit Tests**

   - Place in `/tests/unit/{module}/`
   - Test individual functions and modules
   - Focus on input/output and edge cases
   - Mock external dependencies

3. **Integration Tests**

   - Place in `/tests/integration/`
   - Test feature workflows end-to-end
   - Focus on user scenarios
   - Minimize mocking where possible

4. **Mock Files**
   - Place in `/tests/__mocks__/`
   - Create dedicated mock files per external dependency
   - Use consistent mock patterns

## Best Practices

1. **File Location**

   - Keep test files separate from source code
   - Mirror source directory structure in test directories
   - Group related tests in feature-specific directories

2. **Test Structure**

   - Use descriptive test suite and case names
   - Follow Arrange-Act-Assert pattern
   - Keep tests focused and independent
   - Use beforeEach/afterEach for setup/cleanup

3. **Mocking Strategy**

   - Use dedicated mock files for external dependencies
   - Prefer mock functions over mock implementations
   - Reset mocks between tests
   - Document mock behavior

4. **Test Coverage**
   - Aim for comprehensive coverage of business logic
   - Focus on critical paths and edge cases
   - Include error handling scenarios
   - Test accessibility for components
