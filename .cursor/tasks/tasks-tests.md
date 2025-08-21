## Relevant Files

- `jest.config.js` - Jest configuration file that needs path updates
- `tsconfig.json` - TypeScript configuration file that needs path alias updates
- `.eslintrc.js` - ESLint configuration file that needs to be created/updated
- `src/utils/test-utils.tsx` - Test utilities that need proper exports and imports
- `tests/jest.setup.ts` - Test setup file that needs proper Chrome API mocks
- `tests/mocks/chrome.ts` - Chrome API mocks that need type-safe implementation
- `tests/components/example.test.tsx` - Example test file that needs import fixes
- `tests/components/*.test.tsx` - All component test files that need updating
- `src/types/index.ts` - Type definitions file that needs proper exports

### Notes

- Jest and React Testing Library should be used for all component testing
- Chrome API mocks should match the actual Chrome extension API types
- Test files should be consistently organized (either in tests/ or co-located with source)
- All test files should follow the same import patterns
- ESLint should be configured to catch common testing issues

## Tasks

- [x] 1.0 Fix Configuration Files

  - [x] 1.1 Update Jest configuration paths in jest.config.js
  - [x] 1.2 Add path aliases to tsconfig.json
  - [x] 1.3 Create/update .eslintrc.js with proper testing rules
  - [x] 1.4 Verify all configuration files are properly linked

- [x] 2.0 Update Test Utilities

  - [x] 2.1 Fix imports in test-utils.tsx
  - [x] 2.2 Add proper re-exports for testing library functions
  - [x] 2.3 Update type imports to use correct paths
  - [x] 2.4 Add missing utility functions for common test operations

- [x] 3.0 Improve Chrome API Mocks

  - [x] 3.1 Create comprehensive Chrome API type definitions
  - [x] 3.2 Implement type-safe mock functions
  - [x] 3.3 Add storage API mocks
  - [x] 3.4 Add runtime API mocks
  - [x] 3.5 Add tabs API mocks

- [x] 4.0 Fix Test Files Organization

  - [x] 4.1 Establish consistent test file location strategy
  - [x] 4.2 Move test files to agreed-upon locations
  - [x] 4.3 Update import paths in all test files
  - [x] 4.4 Create index files for test utilities if needed

- [x] 5.0 Update Component Tests

  - [x] 5.1 Fix imports in example.test.tsx
  - [x] 5.2 Update in AnnotationDialog.test.tsx
  - [x] 5.3 Update in MarkerColorPicker.test.tsx
  - [x] 5.4 Update in VoiceRecorder.test.tsx
  - [x] 5.5 Add missing component tests

- [x] 6.0 Add Type Definitions

  - [x] 6.1 Create missing type definitions
  - [x] 6.2 Update existing type exports
  - [x] 6.3 Add proper type documentation
  - [x] 6.4 Ensure all test files use proper types

- [x] 7.0 Clean Up Test Directory Structure

  - [x] 7.1 Remove duplicate/empty directories

          - [x] Remove empty tests/mocks directory

    - [x] Remove empty tests/{components} directory
    - [x] Verify all mocks are in **mocks** directory

  - [x] 7.2 Organize test files correctly

    - [x] Move any misplaced component tests to tests/components
    - [x] Move any misplaced unit tests to tests/unit
    - [x] Ensure snapshot directories are properly placed

  - [x] 7.3 Verify directory structure matches README.md
    - [x] Check all directories exist as documented
    - [x] Verify test file locations follow guidelines
    - [x] Update README.md if structure changes

- [ ] 8.0 Complete Test Coverage

  - [x] 8.1 Add missing background script tests

    - [ ] Test message handling
    - [ ] Test browser action handlers
    - [ ] Test extension lifecycle events

  - [ ] 8.2 Add missing content script tests

    - [ ] Test DOM manipulation
    - [ ] Test message passing
    - [ ] Test content script injection

  - [ ] 8.3 Add missing utility tests

    - [ ] Test error handling utilities
    - [ ] Test storage utilities
    - [ ] Test screenshot utilities

  - [ ] 8.4 Add integration tests

    - [ ] Test screenshot capture flow
    - [ ] Test annotation workflow
    - [ ] Test settings persistence
    - [ ] Test cross-tab communication

  - [ ] 8.5 Verify test coverage
    - [ ] Run coverage report
    - [ ] Identify uncovered code
    - [ ] Add tests for uncovered paths

- [ ] 9.0 Verify and Document

  - [ ] 9.1 Run full test suite and fix remaining issues
  - [ ] 9.2 Update test documentation
  - [ ] 9.3 Add examples of proper test patterns
  - [ ] 9.4 Document Chrome API mock usage
  - [ ] 9.5 Create test writing guidelines
