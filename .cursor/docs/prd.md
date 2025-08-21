# Product Requirements Document: UX Research Screenshot Extension

## Introduction/Overview

The UX Research Screenshot Extension is a Chrome browser extension designed specifically for User Experience Researchers conducting competitive analysis and usability research. The extension enables researchers to quickly capture screenshots with contextual annotations and voice-recorded insights while browsing websites, streamlining the documentation process for UX research workflows.

The core problem this solves is the fragmented nature of current UX research documentation - researchers typically juggle multiple tools (screenshot apps, note-taking software, voice recorders) while conducting competitive analysis or user journey mapping. This extension consolidates these activities into a seamless, in-browser workflow that preserves context and accelerates insight capture.

## Goals

1. **Streamline UX research documentation** by providing integrated screenshot, annotation, and voice recording capabilities within the browser
2. **Improve research quality** by enabling contextual note-taking that preserves the exact location and visual state of user interactions
3. **Accelerate competitive analysis workflows** by reducing tool-switching and maintaining research flow state
4. **Enhance accessibility** by offering both text and voice input options for different research scenarios and user preferences
5. **Maintain research context** by automatically capturing webpage URLs, timestamps, and interaction coordinates with each screenshot

## User Stories

1. **As a UX researcher conducting competitive analysis**, I want to quickly capture screenshots with my thoughts attached so that I can document design patterns and usability issues without breaking my research flow.

2. **As a UX researcher analyzing user journeys**, I want to mark specific UI elements with contextual notes so that I can create detailed documentation of user interaction points and potential pain points.

3. **As a UX researcher working in noisy environments or with accessibility needs**, I want to record voice memos instead of typing so that I can capture nuanced observations quickly and hands-free.

4. **As a UX researcher collaborating with stakeholders**, I want to create annotated screenshots with clear visual markers so that I can communicate findings effectively in research reports and presentations.

5. **As a UX researcher conducting heuristic evaluations**, I want to systematically document usability violations with precise location markers so that I can create comprehensive audit reports with visual evidence.

## Functional Requirements

### Core Screenshot Functionality

1. **The system must provide two distinct capture modes** accessible via extension icon toggle:

   - Screenshot Mode: `Alt + Click` captures screenshot with circular marker at click location
   - Annotation Mode: Single click opens text/voice input dialog at click location

2. **The system must display visual feedback** when capture mode is active:

   - Cursor changes to crosshair when Alt key is held in Screenshot Mode
   - Extension icon badge shows current mode (📷 for Screenshot, ✏️ for Annotation)
   - Tooltip appears showing "Click to screenshot" during Alt+Click interaction

3. **The system must capture full webpage screenshots** including:
   - Visible viewport content at time of capture
   - Circular marker (12px diameter, #35C274 primary green) at exact click coordinates
   - Preserved image quality suitable for research documentation

### Annotation System

4. **The system must support text-based annotations**:

   - Text input dialog appears at click location with 200-character maximum
   - Auto-focus text input for immediate typing
   - Enter key or click outside dialog confirms annotation
   - Text renders inside circle marker with readable contrast

5. **The system must support voice-based annotations**:

   - Voice recording button in annotation dialog
   - Real-time transcription using Web Speech API
   - Visual recording indicator (red dot animation)
   - Playback controls to review recording before saving
   - Fallback to text input if speech recognition unavailable

6. **The system must handle annotation positioning intelligently**:
   - Keep annotation dialogs within viewport boundaries
   - Avoid overlap with existing page elements where possible
   - Maintain visual association between marker and input location

### File Management

7. **The system must automatically save screenshots** with structured naming:

   - Format: `ux-screenshot_YYYY-MM-DD_HH-mm-ss_[domain-name].png`
   - Location: User's Downloads folder in `/UX-Research-Screenshots/` subdirectory
   - Create monthly subfolders for organization

8. **The system must embed metadata** in saved screenshots:
   - Original webpage URL
   - Timestamp of capture
   - Click coordinates (x, y pixels from top-left)
   - Annotation text or voice transcription
   - Browser viewport dimensions

### User Interface

9. **The system must provide settings panel** accessible via extension popup:

   - Mode toggle (Screenshot/Annotation)
   - Marker color selection (5 UX-appropriate colors based on style guide)
   - Voice/text preference for annotations
   - Save location directory selector

10. **The system must show capture feedback**:
    - Brief screen flash animation on successful capture
    - Toast notification with "Screenshot saved!" message
    - Progress indicator during voice transcription processing

### Voice Recording Features

11. **The system must provide voice recording capabilities**:

    - One-touch recording start/stop in annotation dialog
    - Real-time transcription display during recording
    - Maximum 30-second recording length per annotation
    - Audio waveform visualization during recording

12. **The system must handle transcription processing**:
    - Use browser's native Speech Recognition API
    - Display transcription in real-time as user speaks
    - Allow editing of transcribed text before saving
    - Handle recognition errors gracefully with retry option

## Non-Goals (Out of Scope)

1. **Video recording or screen capture** - Extension focuses on static screenshots with annotations only
2. **Cloud storage or synchronization** - Files save locally to user's device only
3. **Team collaboration features** - No sharing, commenting, or multi-user functionality
4. **Advanced image editing** - No cropping, filtering, or post-processing capabilities
5. **Integration with external research tools** - No direct exports to Figma, Miro, or other platforms
6. **Batch operations** - No multi-select, bulk editing, or automated capture sequences
7. **Mobile browser support** - Chrome desktop extension only
8. **Comprehensive accessibility audit tools** - Focused on capture and annotation, not analysis

## Design Considerations

### Visual Design Implementation

Following the provided Customer Insights Dashboard Style Guide:

**Color Usage:**

- Primary marker color: `#35C274` (primary green)
- Annotation text background: `#FFFFFF` with `rgba(0,0,0,0.8)` text
- UI elements: Primary dark `#1A1A1A` for text, light gray `#F1EFE2` for backgrounds
- Voice recording indicator: `#DD3A6C` (secondary pink) for active recording state

**Typography:**

- Extension UI: Hanken Grotesk font family
- Annotation text: 14px (text-sm) medium weight for readability
- Settings labels: 12px (text-xs) with secondary text color `#666666`

**Component Styling:**

- Rounded corners: 8px border radius for all dialog boxes
- Button styling: Primary green buttons for main actions, ghost buttons for secondary
- Input fields: Standard form styling with green focus states
- Hover effects: Subtle elevation and color changes

### User Experience Flow

**Screenshot Mode Flow:**

1. User clicks extension icon to verify/set Screenshot mode
2. User holds Alt key → cursor changes to crosshair
3. User clicks desired location → flash animation + circle marker appears
4. Screenshot processes → toast notification appears
5. File saves automatically → notification shows "View" button option

**Annotation Mode Flow:**

1. User clicks extension icon to set Annotation mode
2. User clicks desired location → annotation dialog appears
3. User chooses text input OR voice recording
4. User completes annotation → screenshot captures with annotation
5. File saves with embedded annotation data

## Technical Considerations

### Browser Permissions Required

- `activeTab`: For capturing screenshot of current webpage
- `storage`: For saving user preferences and settings
- `downloads`: For automatically saving screenshot files to user's Downloads folder
- `scripting`: For injecting content scripts to handle click interactions

### Cross-Site Compatibility

**Supported Sites:**

- Standard HTTP/HTTPS websites
- Single-page applications (SPAs)
- Dynamic content sites with JavaScript

**Limited Support Sites:**

- Banking and financial sites (security restrictions)
- Sites with Content Security Policy restrictions
- Chrome internal pages (chrome://, chrome-extension://)

**Error Handling:**

- Display user-friendly message when screenshots blocked
- Provide alternative capture methods where possible
- Log compatibility issues for future improvement

### Performance Considerations

- Screenshot processing time target: <2 seconds
- Voice transcription response time: Real-time (streaming)
- Extension memory usage: <50MB maximum
- File compression: Balance quality vs. file size (85% JPEG quality)

### Voice Technology Integration

**Speech Recognition Implementation:**

- Use Web Speech Recognition API (built into Chrome)
- Graceful degradation when API unavailable
- Support for multiple languages (initially English only)
- Noise cancellation and audio enhancement where possible

**Transcription Accuracy:**

- Display confidence indicators for transcribed text
- Allow manual correction of transcription errors
- Provide retry mechanism for poor recognition results

## Success Metrics

### User Engagement Metrics

1. **Daily Active Researchers**: Number of unique users taking screenshots daily
2. **Screenshots per Research Session**: Average captures per user per browsing session
3. **Feature Adoption Rate**: Percentage using voice annotations vs. text-only
4. **Mode Usage Distribution**: Screenshot mode vs. Annotation mode usage ratio

### Quality Indicators

5. **Capture Success Rate**: Percentage of successful screenshot captures vs. attempts
6. **Voice Transcription Accuracy**: Subjective user satisfaction with transcription quality
7. **User Retention**: Researchers continuing to use extension after 1 week, 1 month
8. **Error Rate**: Failed captures, transcription errors, compatibility issues

### Research Workflow Impact

9. **Time-to-Documentation**: Average time from observation to saved screenshot
10. **Research Session Duration**: Impact on total time spent in competitive analysis
11. **Context Preservation**: User feedback on annotation quality and usefulness

### Technical Performance

12. **Screenshot Processing Speed**: Average time from click to saved file
13. **Extension Performance**: Impact on browser memory and CPU usage
14. **Cross-Site Compatibility**: Percentage of sites where extension functions properly

Success will be measured through browser extension analytics (with user consent), user feedback surveys, and usage pattern analysis to ensure the extension effectively supports UX research workflows while maintaining high technical performance standards.

## Open Questions

1. **Voice Recording Storage**: Should voice recordings be saved separately as audio files, or only as transcribed text with the screenshots?

2. **Annotation Editing**: After placing an annotation, should researchers be able to edit or delete it before the screenshot is saved?

3. **Keyboard Shortcuts**: Beyond Alt+Click, should we provide additional keyboard shortcuts for power users (e.g., Alt+V for voice mode)?

4. **Research Session Management**: Would researchers benefit from grouping screenshots into research sessions or projects within the extension?

5. **Transcription Languages**: What priority should we place on supporting multiple languages for voice transcription?

6. **Screenshot Quality Settings**: Should users be able to adjust screenshot quality/compression settings, or is automatic optimization sufficient?

7. **Annotation Styling**: Should researchers be able to customize annotation appearance (font size, colors) beyond the default style guide implementation?

8. **Integration Hooks**: While external integrations are out of scope for MVP, should we design the data structure to support future export capabilities?
