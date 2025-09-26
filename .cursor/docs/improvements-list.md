# Snap Insights - Improvements Todo List

## 1. Browser Icon Mode Indicators
- [x] Add letter overlay to browser icon based on active mode:
  - "S" for Snap mode
  - "A" for Annotate mode
  - "T" for Transcribe mode
  - "J" for Journey mode
  - No letter when no mode is active

## 2. Tab Sizing Issue
- [x] Fix tab size change when Journey mode is activated
  - "Snap a moment" and "Snap a journey" tabs should maintain consistent size
  - Currently they become shorter when Journey mode starts - this should not happen

## 3. Modal Border Removal
- [x] Remove borders from Annotation popup modal
- [x] Remove borders from Transcription popup modal

## 4. Modal Auto-Close Functionality
- [x] Annotation modal should close automatically after clicking "Save"
- [x] Transcription modal should close automatically after clicking "Save"
- [x] Both modals should close when clicking "Cancel"
- [x] Implement single modal constraint - only one annotation or transcription modal can be open at a time

## 5. Transcription Mode Fixes
- [x] Remove "Start Recording" button from transcription modal
- [x] Add recording indicator to show recording is active
- [x] Update placeholder text to: "Start speaking to record your thoughts..."
- [x] Implement real-time speech-to-text display as user speaks
  - Words should appear in text input box as they are captured

## 6. Footer Text Corrections
- [x] Update footer text on "Snap a moment" tab to: "Alt + Click to Snap"
- [x] Verify "Snap a journey" tab footer text is correct

## 7. Journey Mode Critical Bug
- [x] Fix Chrome browser crash when clicking "Start" on Journey mode
  - This is a critical issue that needs immediate attention

## 8. Journey Mode Progress Section
- [x] Remove the Journey mode progress section from the UI
- [x] Store the screenshot count variable for future use
- [x] Number of screenshots captured should be saved but not displayed yet
  - Will determine display location later

## 9. Annotate Modal Closing Issue
- [x] Fix issue where Annotate modal doesn't close after clicking Save
- [x] Add event.preventDefault() and stopPropagation() to button handlers
- [x] Ensure dialog is removed immediately before processing screenshot
- [x] Prevent modal from being recreated on save

## 10. Icon Mode Indicator Colors
- [x] Change all mode indicators to white background with blue text
- [x] Use consistent colors: white (#FFFFFF) background with blue (#3b82f6) text
- [x] Apply to all modes: Snap (S), Annotate (A), Transcribe (T), Journey (J)

## 11. Transcribe Modal UI Simplification
- [x] Remove "Stop Recording" button from the modal
- [x] Remove "Recording stopped. Click save to continue." message
- [x] Add red blinking dot in text area to indicate recording
- [x] Ensure modal starts recording automatically when opened
- [x] Simplify UI to just show recording indicator and text area

## 12. Journey Mode Chrome Crash Fix (Second Fix)
- [x] Remove problematic event re-dispatching causing infinite loops
- [x] Add rate limiting (1 second minimum between screenshots)
- [x] Add isProcessingJourneyClick flag to prevent recursion
- [x] Let clicks go through naturally without preventDefault/re-dispatch

## Priority Order
1. **Critical**: Journey mode browser crash (items 7, 12)
2. **High**: Transcription mode functionality (items 5, 11)
3. **Medium**: Modal auto-close and single instance (items 4, 9)
4. **Medium**: Mode indicator icons (items 1, 10)
5. **Low**: UI polish - borders, sizing, text (items 2, 3, 6, 8)