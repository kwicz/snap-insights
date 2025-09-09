Journey Mode Implementation Task List
Summary
You're implementing a "Journey Mode" that automatically captures screenshots when users interact with any element on the page (without requiring Alt+Click). This mode records a user's entire journey through a website by capturing each click, then saves all screenshots as a collection when the user stops the recording. Unlike other modes, clicks still perform their normal actions (navigation, button clicks, etc.) while also capturing screenshots.

DO NOT CHANGE THE UI.
DO NOT CHANGE OTHER MODES.
Journey mode is different from the other modes and should operate with its own set of functions.
Some of these steps are already coded out, but don't work properly. Fix as you go.

Task List

1. Background Script Updates

   1.1 Check project for existing journey mode state management

If needed:  
Add isJourneyMode and journeyScreenshots arrays to background script state
Create functions to start/stop journey recording
Add cleanup function to reset journey state

1.2 Handle journey screenshot collection

Modify screenshot capture to add to journey collection instead of immediately saving
Create function to save entire journey collection as zip file or organized folder
Add timestamp and sequence numbering to journey screenshots

1.3 Update message handlers

Add START_JOURNEY and STOP_JOURNEY message types
Modify existing CAPTURE_SCREENSHOT to handle journey mode differently
Add SAVE_JOURNEY_COLLECTION message type

2. Content Script Updates

   2.1 Add journey mode click listener

Create separate click event listener that doesn't require Alt key
Ensure this listener captures the click coordinates before the default action
Make sure it only activates when journey mode is enabled

2.2 Implement click-through functionality

Allow normal click behavior to proceed after screenshot capture
Handle different element types (buttons, links, form elements)
Ensure proper event propagation for normal page functionality

2.3 Add journey progress indicator

Create visual indicator showing journey recording is active
Display count of screenshots captured in current journey
Add visual feedback for each screenshot capture (similar to existing touchpoint)

3. Popup UI Updates

   3.1 Update journey tab interface

Change "Start" button to toggle between "Start Journey" and "Stop Journey"
Add journey status indicator (recording/stopped)
Show count of screenshots in current journey

3.2 Handle journey state persistence

Save journey mode state to chrome.storage
Restore journey state when popup reopens
Clear journey state when collection is saved

4. Sidebar Updates

   4.1 Update sidebar journey button

Make journey button toggle between start/pause states
Update button icon based on current journey state
Add visual indicator when journey is recording

4.2 Add journey controls

Add stop/save journey functionality to sidebar
Show journey screenshot count in sidebar (optional)

5. Storage and File Management

   5.1 Implement journey collection storage

Create temporary storage structure for journey screenshots
Add metadata for each screenshot (timestamp, sequence, coordinates, element info)
Implement cleanup of temporary storage

5.2 Create collection save functionality

Generate unique journey folder name with timestamp
Save all screenshots with sequential naming (001_screenshot.png, 002_screenshot.png, etc.)
Create journey metadata file (JSON with click info, timestamps, URLs)

6. Error Handling and Edge Cases

   6.1 Handle page navigation during journey

Maintain journey state across page changes
Continue capturing on new pages until stopped
Handle cases where content script is reloaded

6.2 Add journey limits and safeguards

Implement maximum screenshots per journey (prevent infinite collections)
Add storage space checks
Handle cleanup if journey is abandoned

7. User Experience Enhancements

   7.1 Add journey notifications

Success notification when journey starts
Progress notifications during recording (optional)
Completion notification with save location

7.2 Add journey controls accessibility

Keyboard shortcuts for start/stop journey
Clear visual feedback for recording state
Accessible button labels and states

8. Testing and Validation

   8.1 Test journey mode functionality

Verify screenshots capture on all click types
Test click-through functionality works correctly
Validate collection saving and organization

8.2 Test state management

Verify journey persists across popup opens/closes
Test journey cleanup when completed or cancelled
Validate proper mode switching between journey and other modes

9. Documentation Updates

   9.1 Update README with journey mode instructions
   9.2 Add code comments explaining journey mode logic
   9.3 Document journey collection file structure

Implementation Priority
Start with tasks 1-3 for core functionality, then add tasks 4-5 for complete feature implementation. Tasks 6-9 can be done incrementally for polish and reliability.
