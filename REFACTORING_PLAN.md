# SnapInsights Extension Refactoring Plan

## New File Structure

```
src/
├── background/
│   ├── background.ts (entry point - 50 lines)
│   ├── modules/
│   │   ├── screenshot-handler.ts
│   │   ├── settings-handler.ts
│   │   ├── extension-lifecycle.ts
│   │   ├── message-router.ts
│   │   └── command-handler.ts
│   └── services/
│       ├── screenshot-service.ts
│       ├── canvas-service.ts
│       └── font-service.ts
├── content/
│   ├── content.ts (entry point - 50 lines)
│   ├── modules/
│   │   ├── click-handler.ts
│   │   ├── dialog-manager.ts
│   │   ├── annotation-dialog.ts
│   │   ├── transcription-dialog.ts
│   │   └── notification-manager.ts
│   └── services/
│       ├── capture-service.ts
│       ├── transcription-service.ts
│       └── ui-service.ts
├── shared/
│   ├── constants/
│   │   ├── app-constants.ts
│   │   ├── ui-constants.ts
│   │   └── api-constants.ts
│   ├── services/
│   │   ├── message-service.ts
│   │   ├── storage-service.ts
│   │   └── validation-service.ts
│   └── utils/
│       ├── dom-utils.ts
│       ├── coordinate-utils.ts
│       └── context-utils.ts
└── types/ (existing, enhanced)
```

## Migration Strategy

1. **Phase 1**: Extract constants and shared utilities
2. **Phase 2**: Create service modules for background script
3. **Phase 3**: Create service modules for content script
4. **Phase 4**: Implement message routing system
5. **Phase 5**: Update entry points and test

## Key Improvements

- **Single Responsibility**: Each module handles one specific concern
- **DRY Principle**: Shared utilities eliminate code duplication
- **Consistent Patterns**: Standardized service and module patterns
- **Better Error Handling**: Centralized error recovery
- **Improved Testability**: Smaller, focused modules are easier to test