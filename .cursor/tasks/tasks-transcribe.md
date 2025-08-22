# Transcribe Feature Implementation Tasks

## 1. Update Types and Core Components

- [x] Add 'transcribe' to ExtensionMode type in src/types/index.ts
- [x] Update ModeToggle component to include transcribe mode with 🎙️ icon
- [x] Add transcribe mode to ExtensionSettings interface
- [x] Update any relevant tests for type changes

## 2. Create Transcription UI Components

- [x] Create TranscriptionIndicator component for visual feedback
  - [x] Add pulsing microphone icon
  - [x] Show transcription status
  - [x] Add stop/pause controls
- [x] Extend AnnotationDialog to support transcription mode
  - [x] Add transcription status indicator
  - [x] Modify text area to update in real-time
  - [x] Add visual feedback for speech detection

## 3. Implement Transcription Logic

- [x] Enhance existing TranscriptionService with additional features
  - [x] Initialize Web Speech API (already implemented)
  - [x] Handle permissions (already implemented)
  - [x] Manage transcription lifecycle (already implemented)
- [ ] Integrate RealTimeTranscription service with AnnotationDialog
  - [ ] Handle start/stop transcription
  - [ ] Update text in real-time
  - [ ] Handle errors gracefully

## 4. Content Script Integration

- [x] Update click handler to support transcribe mode
- [x] Modify screenshot capture to include transcription UI
- [x] Add transcription-specific error handling
- [x] Ensure cleanup of transcription resources

## 5. Storage and Settings

- [x] Add transcription preferences to settings
  - [x] Language selection
  - [x] Auto-stop duration
  - [x] Confidence threshold
- [x] Implement storage for transcription settings
- [x] Add transcription metadata to saved screenshots

## 6. Testing

- [ ] Add unit tests for TranscriptionController
- [ ] Add integration tests for transcription flow
- [ ] Test error cases and recovery
- [ ] Test across different browsers
- [ ] Test with different languages

## 7. UI Polish

- [ ] Add loading states for transcription
- [ ] Improve error messages and recovery UI
- [ ] Add keyboard shortcuts for transcription control
- [ ] Ensure consistent styling with existing components

## 8. Documentation

- [ ] Update README with transcription feature
- [ ] Add JSDoc comments to new components
- [ ] Document keyboard shortcuts
- [ ] Add troubleshooting guide for common issues

## 9. Performance & Optimization

- [ ] Optimize transcription update frequency
- [ ] Implement cleanup for unused resources
- [ ] Add error boundary for transcription failures
- [ ] Optimize re-renders during transcription

## 10. Final Testing & Validation

- [ ] Test end-to-end flow
- [ ] Verify all error cases
- [ ] Check browser compatibility
- [ ] Validate accessibility
- [ ] Performance testing
