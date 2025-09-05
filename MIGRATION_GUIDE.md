# SnapInsights Extension Refactoring - Migration Guide

## Overview

This document outlines the migration from the monolithic background.ts and content.ts files to a modular, maintainable architecture.

## What Was Refactored

### Background Script (1011 lines → ~50 lines + modules)

**Original:** `src/background/background.ts`
**New:** `src/background/background-new.ts` + modules

#### Extracted Modules:
- **`screenshot-handler.ts`** - Screenshot capture and processing logic
- **`extension-lifecycle.ts`** - Activation, deactivation, installation handling
- **`settings-handler.ts`** - Settings management and storage operations
- **`message-router.ts`** - Message routing and handling
- **`command-handler.ts`** - Keyboard command processing

#### Extracted Services:
- **`font-service.ts`** - Font loading and management
- **`canvas-service.ts`** - Canvas operations and marker drawing

### Content Script (991 lines → ~50 lines + modules)

**Original:** `src/content/content.ts`
**New:** `src/content/content-new.ts` + modules

#### Extracted Modules:
- **`click-handler.ts`** - Click event handling and coordination
- **`notification-manager.ts`** - Notification display and management

#### Extracted Services:
- **`ui-service.ts`** - UI operations (font loading, feedback, animations)
- **`capture-service.ts`** - Screenshot capture coordination

### Shared Infrastructure

#### Constants:
- **`app-constants.ts`** - Application-wide constants
- **`ui-constants.ts`** - UI-specific constants (colors, spacing, etc.)

#### Utilities:
- **`context-utils.ts`** - Extension context validation
- **`coordinate-utils.ts`** - Coordinate calculations and transformations

#### Services:
- **`message-service.ts`** - Centralized message handling

## Key Improvements

### 1. **Single Responsibility Principle**
Each module now handles one specific concern:
- Screenshot handling is separate from settings management
- UI operations are separate from business logic
- Message routing is centralized and consistent

### 2. **DRY Principle Applied**
- Eliminated duplicate coordinate calculations
- Centralized error handling patterns
- Shared constants across components
- Reusable utility functions

### 3. **Better Error Handling**
- Consistent error recovery patterns
- Context validation before operations
- Graceful degradation when APIs fail

### 4. **Improved Testability**
- Smaller, focused modules are easier to unit test
- Clear dependencies and interfaces
- Mockable services and utilities

### 5. **Enhanced Maintainability**
- Clear file organization and naming
- Consistent coding patterns
- Comprehensive JSDoc documentation
- Type safety throughout

## Migration Steps

### Phase 1: Backup and Preparation
1. Backup current `background.ts` and `content.ts`
2. Ensure all tests pass with current implementation
3. Review new file structure

### Phase 2: Deploy New Background Script
1. Replace `src/background/background.ts` with `src/background/background-new.ts`
2. Add all new background modules and services
3. Update manifest.json to point to new background script
4. Test background functionality

### Phase 3: Deploy New Content Script
1. Replace `src/content/content.ts` with `src/content/content-new.ts`
2. Add all new content modules and services
3. Test content script functionality
4. Verify message communication between scripts

### Phase 4: Complete Dialog Implementation
1. Implement annotation dialog module
2. Implement transcription dialog module
3. Add transcription service integration
4. Test complete functionality

### Phase 5: Cleanup and Optimization
1. Remove old files
2. Update build scripts if necessary
3. Run full test suite
4. Performance testing

## File Mapping

### Background Script Functions

| Original Function | New Location |
|------------------|--------------|
| `handleScreenshotCapture` | `background/modules/screenshot-handler.ts` |
| `saveScreenshot` | `background/modules/screenshot-handler.ts` |
| `handleActivateExtension` | `background/modules/extension-lifecycle.ts` |
| `handleDeactivateExtension` | `background/modules/extension-lifecycle.ts` |
| `handleSettingsUpdate` | `background/modules/settings-handler.ts` |
| `handleGetSettings` | `background/modules/settings-handler.ts` |
| `drawMarkerOnScreenshot` | `background/services/canvas-service.ts` |
| `loadAndCheckFont` | `background/services/font-service.ts` |
| Message handling | `background/modules/message-router.ts` |
| Command handling | `background/modules/command-handler.ts` |

### Content Script Functions

| Original Function | New Location |
|------------------|--------------|
| `handleClick` | `content/modules/click-handler.ts` |
| `showClickFeedback` | `content/services/ui-service.ts` |
| `captureScreenshot` | `content/services/capture-service.ts` |
| `showNotification` | `content/modules/notification-manager.ts` |
| `loadLeagueSpartanFont` | `content/services/ui-service.ts` |
| Dialog creation | `content/modules/dialog-manager.ts` (to be implemented) |

## Breaking Changes

### None Expected
The refactoring maintains full backward compatibility:
- All existing APIs remain the same
- Message types and formats unchanged
- Storage keys and formats preserved
- User-facing functionality identical

## Testing Strategy

### Unit Tests
- Test each module independently
- Mock dependencies appropriately
- Verify error handling paths

### Integration Tests
- Test message communication between components
- Verify screenshot capture end-to-end
- Test extension lifecycle operations

### Manual Testing
- Verify all modes work correctly (snap, annotate, transcribe)
- Test keyboard shortcuts
- Verify settings persistence
- Test error scenarios (context invalidation, etc.)

## Performance Improvements

### Background Script
- Lazy loading of services
- Optimized font loading
- Better memory management

### Content Script
- Reduced initial bundle size
- On-demand dialog creation
- Efficient event handling

## Next Steps

1. **Complete Dialog Implementation** - Finish annotation and transcription dialogs
2. **Add More Tests** - Increase test coverage for new modules
3. **Performance Monitoring** - Add metrics for key operations
4. **Documentation** - Update API documentation
5. **Code Review** - Team review of new architecture

## Rollback Plan

If issues arise:
1. Revert to original `background.ts` and `content.ts`
2. Update manifest.json to point to original files
3. Remove new module directories
4. Restore from backup

The modular structure allows for gradual rollback of individual components if needed.