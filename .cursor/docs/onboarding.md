Coding Prompt: Interactive Onboarding Walkthrough for SnapInsights
Overview
Create a 4-step interactive onboarding walkthrough that appears on first-time installation of SnapInsights. The walkthrough should guide users through the core features with visual highlights and clear instructions.
Technical Requirements
Trigger Conditions

Show onboarding on first extension install/activation
Store completion state in chrome.storage.local with key onboardingCompleted
Include "Skip Tutorial" option on every step
Include "Don't show this again" checkbox on final step

Visual Design

Semi-transparent dark overlay (rgba(0, 0, 0, 0.7)) covering entire viewport
Spotlight effect: highlighted UI elements should have higher z-index and appear fully visible
Walkthrough card positioned near the highlighted element
Use SnapInsights brand colors (primary blue: #0277c0)
Smooth transitions between steps (300ms ease-in-out)

Step-by-Step Content
Step 1: Snap a Moment
Target Element: "Snap a moment" tab and mode selection buttons
Spotlight: Highlight the entire popup content area including:

"Snap a moment" tab (should be active)
The three mode buttons (Snap, Annotate, Transcribe)

Card Content:

Title: "Capture moments instantly"
Body: "Choose a mode, then hold Alt + Click anywhere on a webpage to capture. Try Snap for screenshots, Annotate to add notes, or Transcribe to record audio."
Visual Aid: Show keyboard icon "Alt" + mouse click icon
Button: "Next" (primary button)
Link: "Skip Tutorial" (text link, secondary)

Card Position: Bottom center or right side of popup

Step 2: Snap a Journey
Target Element: "Snap a journey" tab and Start button
Spotlight: Highlight:

"Snap a journey" tab (switch to this tab programmatically)
The Start/Pause button
Icon selection area

Card Content:

Title: "Record a journey"
Body: "Capture multiple moments in sequence. Click Start, then click anywhere on the page to capture each moment. Click Pause to stop and save your journey."
Note: "No Alt key needed in Journey mode - just click!"
Button: "Next" (primary button)
Link: "Skip Tutorial" (text link, secondary)

Card Position: Bottom center or right side of popup

Step 3: Settings (Icon Selection)
Target Element: "Choose your touchpoint" section with icon options
Spotlight: Highlight:

The icon selection area showing all three touchpoint options
Active selection state

Card Content:

Title: "Choose your touchpoint style"
Body: "Select a touchpoint color that works best with your workflow. Light works on dark backgrounds, Blue is balanced, and Dark shows on light backgrounds."
Visual Aid: Show small preview of each icon on sample backgrounds
Button: "Next" (primary button)
Link: "Skip Tutorial" (text link, secondary)

Card Position: Below or beside the icon selection area

Step 4: The Sidebar
Target Element: The sidebar widget on the webpage (switch context to active tab)
Note: This step requires messaging between popup and content script to highlight the sidebar
Spotlight: Highlight:

The entire sidebar widget (in collapsed state)
The dropdown arrow/expand area

Card Content:

Title: "Quick access sidebar"
Body: "Access SnapInsights from any page using this sidebar. Click to expand and switch modes on the fly. You can close it anytime and reopen from the extension icon."
Tip: "Coming soon: Drag to reposition the sidebar anywhere on screen!"
Button: "Get Started" (primary button)
Checkbox: "Don't show this again"

Card Position: Left of the sidebar

Component Structure
javascript// Suggested component structure
const OnboardingWalkthrough = {
steps: [
{
id: 'snap-moment',
target: '.popup-body', // or specific element selector
title: 'Capture moments instantly',
description: '...',
visual: 'alt-click-icon',
position: 'bottom-center'
},
{
id: 'snap-journey',
target: '.mode-button.start-button',
title: 'Record a journey',
description: '...',
note: 'No Alt key needed...',
position: 'bottom-center',
onEnter: () => {
// Switch to journey tab
setActiveTab('journey');
}
},
{
id: 'settings',
target: '.icon-selection',
title: 'Choose your touchpoint style',
description: '...',
position: 'below'
},
{
id: 'sidebar',
target: 'sidebar', // Special case - targets content script
title: 'Quick access sidebar',
description: '...',
position: 'left',
showCheckbox: true
}
]
};
Interaction Requirements
Navigation

Next Button: Advances to next step
Skip Tutorial: Closes walkthrough, marks as completed
Don't show this again (Step 4 only): Sets onboardingCompleted: true in storage
Click outside card: No action (prevent accidental dismissal)
ESC key: Close walkthrough

Tab Switching

Step 2 should automatically switch to "Snap a journey" tab
After walkthrough completion, return to the tab user was on before starting

Content Script Communication

Step 4 requires sending message to content script to highlight sidebar
Message format: { type: 'HIGHLIGHT_SIDEBAR', show: true }
Content script should add temporary highlight class to sidebar

Storage Schema
javascript{
onboardingCompleted: boolean,
onboardingSkipped: boolean, // optional: track skips vs completions
lastOnboardingStep: number // optional: resume capability
}
Accessibility Requirements

Keyboard navigation support (Tab, Enter, ESC)
Focus trap within walkthrough card
ARIA labels for all interactive elements
Screen reader announcements for step changes

Animation Details

Fade in: 300ms ease-in for overlay and card
Spotlight transition: 300ms ease-in-out when moving between elements
Step transition: 200ms fade out old card, 200ms fade in new card
Completion: 300ms fade out entire walkthrough

Edge Cases to Handle

User closes popup during walkthrough → Save progress, resume on reopen (optional)
Sidebar not loaded on page → Show message in Step 4: "Sidebar will appear when you activate a mode"
User already has mode active → Show sidebar highlight immediately
Multiple SnapInsights instances → Only show onboarding in first instance

Testing Checklist

Onboarding appears on fresh install
"Skip Tutorial" works on all steps
"Don't show this again" persists
Tab switching works correctly in Step 2
Sidebar highlight appears in Step 4
ESC key closes walkthrough
Keyboard navigation works
Completion state saves correctly
Walkthrough doesn't reappear after completion

Files to Modify

popup.js - Add onboarding logic, state management
popup.html - Add onboarding markup structure
popup.css - Add onboarding styles, spotlight effects
content.js - Add sidebar highlight handler
background.js - Handle onboarding completion storage (if needed)

Success Metrics

Users should understand how to use all 4 core features after completion
Clear visual hierarchy guides attention
Smooth, professional animations
No confusion about where to click or what to do next
