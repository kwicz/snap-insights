# SnapInsights - Project Overview & Architecture Analysis

## 📖 Project Summary

**SnapInsights** is a Chrome browser extension designed specifically for UX researchers to capture screenshots with contextual annotations and voice-recorded insights. The extension provides multiple interaction modes for different research scenarios and includes a unique "journey mode" for recording complete user flows.

### Key Information
- **Name**: SnapInsights (package: insight-clip)
- **Type**: Chrome Extension (Manifest V3)
- **Author**: Katy Solovewicz @ The Good
- **Technology Stack**: TypeScript, React, Webpack, Chrome Extension APIs
- **Primary Use Case**: UX Research & User Journey Documentation

---

## 🎯 Core Features

### 1. **Multiple Capture Modes**
- **Snap Mode**: Quick screenshot capture with Alt+Click
- **Annotate Mode**: Screenshot capture + text annotation dialog
- **Transcribe Mode**: Screenshot capture + voice recording and transcription
- **Journey Mode**: Automatic screenshot capture on any user interaction

### 2. **Visual Feedback System**
- Customizable touchpoint markers (light, blue, dark themes)
- Real-time visual feedback on interactions
- Professional marker overlays with annotations

### 3. **Journey Recording**
- Captures complete user workflows automatically
- Organizes screenshots with metadata and sequence numbers
- Exports structured journey collections with JSON metadata

### 4. **Voice & Text Integration**
- Browser-based speech recognition
- Audio recording with MediaRecorder API
- Text annotation with rich formatting

---

## 🏗️ Current Architecture

### **High-Level Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Popup UI      │    │  Content Script │    │ Background SW   │
│   (React)       │    │   (Injection)   │    │  (Service W.)   │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│• Mode Selection │◄──►│• Event Handling │◄──►│• Screenshot API │
│• Icon Config    │    │• Visual Feedback│    │• State Mgmt     │
│• Settings UI    │    │• Annotation UI  │    │• File Downloads │
│• Tab Interface  │    │• Voice Recording│    │• Message Router │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **Component Breakdown**

#### 1. **Background Service Worker** (`src/background/background.ts`)
**Responsibilities:**
- Screenshot capture using Chrome tabs API
- Canvas-based marker and annotation rendering
- Extension state management and persistence
- Journey mode orchestration
- File download and organization
- Message routing between components

**Key Functions:**
- `handleScreenshotCapture()` - Core screenshot functionality
- `drawMarkerOnScreenshot()` - Visual marker overlay
- `startJourney()` / `stopJourney()` - Journey mode management
- `saveJourneyCollection()` - Export organized file collections

#### 2. **Content Scripts** (`src/content/content.ts`)
**Responsibilities:**
- User interaction capture (clicks, Alt+clicks)
- Visual feedback display
- Annotation and transcription dialog management
- Voice recording via MediaRecorder API
- Page-level state management

**Key Patterns:**
- Event listener management with proper cleanup
- Dynamic dialog creation and positioning
- Media stream handling for voice recording
- Extension context validation

#### 3. **Popup Interface** (`src/popup/Popup.tsx`)
**Responsibilities:**
- Mode selection and configuration
- Tab-based interface (Moment vs Journey)
- Icon theme selection
- Extension activation/deactivation
- Journey collection management

**Design Patterns:**
- React hooks for state management
- Persistent state synchronization
- Error boundary handling
- Chrome storage API integration

#### 4. **Type System** (`src/types/`)
**Structure:**
- Comprehensive TypeScript definitions
- Message protocol definitions
- Extension settings interfaces
- Custom error classes with categorization

---

## 🔄 Data Flow & Communication

### **Message-Based Architecture**
The extension uses Chrome's message passing for component communication:

```typescript
// Example message flow
Popup → Background: { type: 'ACTIVATE_EXTENSION', data: { mode, selectedIcon } }
Background → Content: { type: 'START_JOURNEY' }
Content → Background: { type: 'CAPTURE_SCREENSHOT', data: { coordinates, annotation } }
```

### **Storage Strategy**
- **Chrome Storage Sync**: User settings and preferences
- **Chrome Storage Local**: Extension state and journey data
- **File System**: Screenshot downloads with structured naming

### **State Management**
- Centralized state in background service worker
- React state in popup with Chrome storage synchronization
- Content script maintains minimal local state

---

## 🛠️ Build System & Development

### **Webpack Configuration**
- Multiple entry points: background, content, popup
- TypeScript compilation with ts-loader
- CSS processing with different strategies for content scripts
- Asset handling for icons, fonts, and static files
- Development vs production optimization

### **Key Build Features**
- Dynamic manifest modification for dev builds
- Source map generation in development
- Asset bundling and optimization
- Chrome extension specific configurations

---

## 📂 Project Structure

```
src/
├── background/           # Background service worker
│   ├── background.ts     # Main background script
│   ├── modules/          # Feature-specific modules
│   └── services/         # Canvas and font services
├── content/              # Content scripts
│   ├── content.ts        # Main content script
│   ├── sidebar-injector.ts
│   └── styles.css        # Injected styles
├── popup/                # Extension popup
│   ├── Popup.tsx         # Main popup component
│   ├── index.tsx         # Entry point
│   └── popup.html        # HTML template
├── components/           # Shared React components
│   └── TabNav/           # Tab navigation
├── types/                # TypeScript definitions
│   ├── index.ts          # Main type exports
│   ├── messages.ts       # Message protocols
│   └── screenshot.ts     # Screenshot-related types
├── utils/                # Utility functions
├── shared/               # Shared services and constants
└── assets/               # Static assets (icons, fonts)
```

---

## ⚡ Technical Highlights

### **Performance Optimizations**
- Rate limiting for screenshot captures (1-second minimum interval)
- Efficient canvas-based image processing
- Lazy loading of fonts and assets
- Memory cleanup for media streams and DOM elements

### **Error Handling**
- Custom `ExtensionError` class with categorization
- Context invalidation detection and recovery
- Graceful fallbacks for missing permissions or APIs

### **Chrome Extension Best Practices**
- Manifest V3 compliance
- Proper permission declaration
- Content Security Policy configuration
- Service worker lifecycle management

---

## 🔍 Current Strengths

1. **Well-Structured Type System**: Comprehensive TypeScript definitions
2. **Clean Separation of Concerns**: Clear architectural boundaries
3. **Robust Message Protocol**: Well-defined inter-component communication
4. **Professional UI/UX**: Polished React-based interface
5. **Comprehensive Feature Set**: Multiple capture modes for different use cases
6. **Journey Mode Innovation**: Unique approach to user flow documentation
7. **Production Ready**: Professional error handling and state management

---

## 🚀 Technology Choices Analysis

### **✅ Good Choices**
- **TypeScript**: Provides excellent type safety and developer experience
- **React**: Modern, maintainable UI framework
- **Webpack**: Flexible build system suitable for Chrome extensions
- **Manifest V3**: Future-proof Chrome extension standard
- **Canvas API**: Efficient image processing for markers and annotations

### **🤔 Trade-offs**
- **React for Small UI**: React might be overkill for simple popup, but provides scalability
- **Complex Build Setup**: Webpack configuration is sophisticated but may be over-engineered for current needs
- **Message Passing Complexity**: Rich message protocol provides flexibility but adds complexity

---

This analysis forms the foundation for understanding the current state and planning future improvements for the SnapInsights extension.