# SnapInsights - Ideal Architecture Design

## 🎯 Architecture Goals

The ideal architecture for SnapInsights should optimize for:
- **Maintainability**: Clear separation of concerns and modular design
- **Testability**: Easy unit and integration testing
- **Extensibility**: Simple addition of new capture modes and features
- **Performance**: Efficient resource usage and fast operations
- **Reliability**: Robust error handling and state management
- **Developer Experience**: Clear APIs and debugging capabilities

---

## 🏗️ Proposed Ideal Architecture

### **1. Layered Architecture Overview**

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  Popup UI (React)           │  Content Script UI (Vanilla)      │
│  • Mode Selection           │  • Annotation Dialogs             │
│  • Settings Interface       │  • Visual Feedback               │
│  • Journey Management       │  • Voice Recording UI             │
└─────────────────────────────┴─────────────────────────────────────┘
                                       │
                                    Message
                                    Protocol
                                       │
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                   Extension State Manager                       │
│  • Mode Coordination        • Settings Management              │
│  • Journey State            • Error Handling                   │
│  • UI State Synchronization • Performance Monitoring           │
└─────────────────────────────────────────────────────────────────┘
                                       │
                                   Service
                                   Layer
                                       │
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│ Capture Service │ Storage Service │ Voice Service │ Export Service│
│ • Screenshot    │ • Chrome Storage│ • Recording   │ • File Export │
│ • Canvas Draw   │ • State Persist │ • Transcribe  │ • Journey ZIP │
│ • Annotation    │ • Settings Mgmt │ • Audio Proc  │ • Metadata    │
└─────────────────┴─────────────────┴───────────────┴───────────────┘
                                       │
                                   Platform
                                   Adapters
                                       │
┌─────────────────────────────────────────────────────────────────┐
│                       PLATFORM LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│ Chrome APIs     │ Web APIs        │ File System   │ External APIs │
│ • tabs          │ • MediaRecorder │ • Downloads   │ • Transcription│
│ • storage       │ • Canvas 2D     │ • File Access │ • Cloud Storage│
│ • scripting     │ • SpeechRecog   │ • ZIP Creation│ • Analytics   │
└─────────────────┴─────────────────┴───────────────┴───────────────┘
```

---

## 🧩 Component Design Patterns

### **1. Service-Oriented Architecture**

```typescript
// Core Service Interface
interface ExtensionService {
  initialize(): Promise<void>;
  destroy(): Promise<void>;
  getStatus(): ServiceStatus;
}

// Example: Capture Service
class CaptureService implements ExtensionService {
  constructor(
    private canvasRenderer: CanvasRenderer,
    private screenshotApi: ScreenshotAPI,
    private eventBus: EventBus
  ) {}

  async captureWithAnnotation(
    coordinates: Coordinates,
    annotation: Annotation
  ): Promise<CaptureResult> {
    // Implementation with proper error handling
    // Event emission for state updates
    // Performance monitoring
  }
}
```

### **2. Event-Driven Communication**

```typescript
// Replace direct message passing with event bus
interface EventBus {
  emit<T>(event: ExtensionEvent<T>): void;
  subscribe<T>(eventType: string, handler: EventHandler<T>): Subscription;
  unsubscribe(subscription: Subscription): void;
}

// Type-safe events
type ExtensionEvent<T = any> = {
  type: string;
  payload: T;
  timestamp: number;
  source: ComponentId;
};
```

### **3. State Management Pattern**

```typescript
// Centralized state with Redux-like pattern
interface ExtensionState {
  ui: UIState;
  capture: CaptureState;
  journey: JourneyState;
  settings: SettingsState;
  errors: ErrorState[];
}

class StateManager {
  private state: ExtensionState;
  private subscribers: StateSubscriber[];

  dispatch(action: ExtensionAction): void {
    const newState = this.reducer(this.state, action);
    this.notifySubscribers(newState);
  }

  subscribe(selector: StateSelector, callback: StateCallback): Subscription {
    // Efficient subscription with selectors
  }
}
```

---

## 🏛️ Modular Architecture Design

### **1. Plugin-Based Capture Modes**

```typescript
// Extensible capture mode system
interface CaptureMode {
  id: string;
  name: string;
  icon: ReactNode;

  initialize(context: ModeContext): Promise<void>;
  handleInteraction(event: InteractionEvent): Promise<CaptureResult>;
  renderSettings(): ReactNode;
  cleanup(): Promise<void>;
}

class SnapMode implements CaptureMode {
  id = 'snap';
  name = 'Quick Snap';

  async handleInteraction(event: InteractionEvent): Promise<CaptureResult> {
    // Mode-specific implementation
  }
}

// Register modes dynamically
const modeRegistry = new ModeRegistry();
modeRegistry.register(new SnapMode());
modeRegistry.register(new AnnotateMode());
modeRegistry.register(new TranscribeMode());
modeRegistry.register(new JourneyMode());
```

### **2. Configurable UI Components**

```typescript
// Composable UI system
interface UIComponent {
  render(props: ComponentProps): ReactNode;
  getDefaultProps(): ComponentProps;
}

// Mode-specific UI configurations
const uiConfig = {
  popup: {
    tabs: ['moment', 'journey'],
    theme: 'default',
    customizations: {...}
  },
  content: {
    dialogs: ['annotation', 'transcription'],
    positioning: 'smart',
    animations: true
  }
};
```

---

## 📊 Data Layer Architecture

### **1. Repository Pattern for Storage**

```typescript
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: string): Promise<boolean>;
}

class SettingsRepository implements Repository<ExtensionSettings> {
  constructor(private storageAdapter: StorageAdapter) {}

  async save(settings: ExtensionSettings): Promise<ExtensionSettings> {
    await this.storageAdapter.set('settings', settings);
    this.eventBus.emit({ type: 'SETTINGS_UPDATED', payload: settings });
    return settings;
  }
}

class JourneyRepository implements Repository<JourneyState> {
  // Journey-specific storage logic with serialization
  // Metadata management and indexing
}
```

### **2. Caching Strategy**

```typescript
class CacheManager {
  private cache = new Map<string, CachedItem>();

  async get<T>(key: string, fetcher: () => Promise<T>, ttl = 300000): Promise<T> {
    const cached = this.cache.get(key);
    if (cached && !this.isExpired(cached)) {
      return cached.value;
    }

    const value = await fetcher();
    this.cache.set(key, { value, timestamp: Date.now(), ttl });
    return value;
  }
}
```

---

## 🔌 Extension Points & Hooks

### **1. Lifecycle Hooks**

```typescript
interface ExtensionLifecycle {
  onInstall(details: InstallDetails): Promise<void>;
  onStartup(): Promise<void>;
  onSuspend(): Promise<void>;
  onUpdateAvailable(details: UpdateDetails): Promise<void>;
}

class LifecycleManager implements ExtensionLifecycle {
  private hooks: LifecycleHook[] = [];

  registerHook(hook: LifecycleHook): void {
    this.hooks.push(hook);
  }

  async onInstall(details: InstallDetails): Promise<void> {
    for (const hook of this.hooks) {
      await hook.onInstall?.(details);
    }
  }
}
```

### **2. Middleware System**

```typescript
interface Middleware {
  process(context: ProcessContext): Promise<ProcessContext>;
}

class CaptureMiddleware implements Middleware {
  async process(context: ProcessContext): Promise<ProcessContext> {
    // Pre-processing: validation, rate limiting
    const result = await context.next();
    // Post-processing: logging, analytics
    return result;
  }
}

// Middleware pipeline
const pipeline = new Pipeline([
  new AuthenticationMiddleware(),
  new ValidationMiddleware(),
  new CaptureMiddleware(),
  new StorageMiddleware()
]);
```

---

## 🧪 Testing Architecture

### **1. Test Structure**

```
tests/
├── unit/                 # Unit tests for services and utilities
│   ├── services/
│   ├── utils/
│   └── components/
├── integration/          # Integration tests for workflows
│   ├── capture-flow/
│   ├── journey-mode/
│   └── storage/
├── e2e/                 # End-to-end tests with browser automation
│   ├── popup-interaction/
│   ├── content-script/
│   └── full-workflow/
├── fixtures/            # Test data and mock responses
├── helpers/             # Test utilities and setup
└── mocks/               # Mock implementations
```

### **2. Testable Design Patterns**

```typescript
// Dependency injection for testability
class CaptureService {
  constructor(
    private screenshotApi: ScreenshotAPI,
    private canvasRenderer: CanvasRenderer,
    private logger: Logger
  ) {}
}

// Test with mocked dependencies
describe('CaptureService', () => {
  let service: CaptureService;
  let mockScreenshotApi: jest.Mocked<ScreenshotAPI>;

  beforeEach(() => {
    mockScreenshotApi = createMockScreenshotApi();
    service = new CaptureService(mockScreenshotApi, mockRenderer, mockLogger);
  });
});
```

---

## 🔧 Development Experience

### **1. Developer Tools Integration**

```typescript
class DevTools {
  private enabled = process.env.NODE_ENV === 'development';

  logStateChange(prevState: ExtensionState, nextState: ExtensionState): void {
    if (this.enabled) {
      console.group('State Change');
      console.log('Previous:', prevState);
      console.log('Next:', nextState);
      console.groupEnd();
    }
  }

  inspectPerformance(): PerformanceMetrics {
    // Performance monitoring and reporting
  }
}
```

### **2. Configuration Management**

```typescript
interface EnvironmentConfig {
  apiEndpoints: {
    transcription: string;
    analytics: string;
  };
  features: {
    voiceRecording: boolean;
    journeyMode: boolean;
    cloudSync: boolean;
  };
  debug: {
    logging: boolean;
    devtools: boolean;
  };
}

class ConfigManager {
  private config: EnvironmentConfig;

  get(key: string): any {
    return this.getNestedValue(this.config, key);
  }

  isFeatureEnabled(feature: string): boolean {
    return this.config.features[feature] ?? false;
  }
}
```

---

## 🚀 Performance Optimizations

### **1. Lazy Loading Strategy**

```typescript
// Lazy load services and components
class ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, ServiceFactory>();

  get<T>(serviceId: string): T {
    if (!this.services.has(serviceId)) {
      const factory = this.factories.get(serviceId);
      this.services.set(serviceId, factory.create());
    }
    return this.services.get(serviceId);
  }
}

// Lazy React components
const JourneyModePanel = lazy(() => import('./JourneyModePanel'));
```

### **2. Resource Management**

```typescript
class ResourceManager {
  private resources = new Set<Disposable>();

  register(resource: Disposable): void {
    this.resources.add(resource);
  }

  async dispose(): Promise<void> {
    await Promise.all([...this.resources].map(r => r.dispose()));
    this.resources.clear();
  }
}

interface Disposable {
  dispose(): Promise<void>;
}
```

---

## 📈 Monitoring & Analytics

### **1. Performance Monitoring**

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, PerformanceEntry[]>();

  measure(name: string, fn: () => Promise<any>): Promise<any> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }

  getMetrics(): PerformanceReport {
    // Aggregate and analyze performance data
  }
}
```

### **2. Error Tracking**

```typescript
class ErrorTracker {
  track(error: ExtensionError, context: ErrorContext): void {
    const errorData = {
      ...error,
      context,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      extensionVersion: chrome.runtime.getManifest().version
    };

    // Log to console in development
    // Send to analytics in production
    this.sendToAnalytics(errorData);
  }
}
```

---

## 🔄 Migration Strategy

The ideal architecture should be implemented gradually:

1. **Phase 1**: Extract services from background script
2. **Phase 2**: Implement event bus communication
3. **Phase 3**: Add state management layer
4. **Phase 4**: Create plugin system for modes
5. **Phase 5**: Add comprehensive testing
6. **Phase 6**: Performance optimization and monitoring

This approach maintains functionality while improving the architecture incrementally.