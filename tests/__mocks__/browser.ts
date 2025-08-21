// Browser APIs mock implementations
import { MockEventTarget } from '../jest.setup';

// Speech Recognition Types and Mocks
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: {
    item(index: number): SpeechRecognitionResult;
    length: number;
    [index: number]: SpeechRecognitionResult;
  };
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

class MockSpeechRecognition extends MockEventTarget {
  continuous: boolean = false;
  interimResults: boolean = false;
  lang: string = 'en-US';
  maxAlternatives: number = 1;

  // Methods
  start = jest.fn(() => {
    const event = new Event('start');
    this.dispatchEvent(event);
    if (this.onstart) this.onstart(event);
  });

  stop = jest.fn(() => {
    const event = new Event('end');
    this.dispatchEvent(event);
    if (this.onend) this.onend(event);
  });

  abort = jest.fn(() => {
    const event = new Event('end');
    this.dispatchEvent(event);
    if (this.onend) this.onend(event);
  });

  // Event handlers
  onstart: ((event: Event) => void) | null = null;
  onend: ((event: Event) => void) | null = null;
  onerror:
    | ((event: Event & { error: string; message?: string }) => void)
    | null = null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null = null;

  // Helper method to simulate speech recognition results
  simulateResult(
    transcript: string,
    isFinal: boolean = true,
    confidence: number = 0.9
  ) {
    const result = {
      0: { transcript, confidence },
      length: 1,
      isFinal,
      item: function (index: number) {
        return this[index];
      },
    };

    const results = {
      0: result,
      length: 1,
      item: function (index: number) {
        return this[index];
      },
    };

    const event = new Event('result') as SpeechRecognitionEvent;
    Object.assign(event, {
      resultIndex: 0,
      results,
    });

    if (this.onresult) {
      this.onresult(event);
    }
  }

  // Helper method to simulate errors
  simulateError(errorType: string, message?: string) {
    const event = new Event('error') as Event & {
      error: string;
      message?: string;
    };
    event.error = errorType;
    event.message = message;

    if (this.onerror) {
      this.onerror(event);
    }
  }
}

// Canvas Mock Implementation
const createCanvasMock = () => {
  const context = {
    // Canvas context properties
    canvas: null as any, // Will be set after canvas creation
    alpha: false,
    willReadFrequently: false,
    imageSmoothingEnabled: false,
    drawImage: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    setLineDash: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(),
    putImageData: jest.fn(),
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    measureText: jest.fn().mockReturnValue({ width: 50 }),
    textAlign: 'left',
    textBaseline: 'top',
    font: '12px Arial',
  };

  const canvas = {
    getContext: jest.fn(
      (contextType: string, options?: CanvasRenderingContext2DSettings) => {
        if (contextType === '2d') {
          // Apply context options if provided
          if (options) {
            Object.assign(context, options);
          }
          // Ensure context is properly configured
          context.canvas = canvas;
          return context;
        }
        return null;
      }
    ),
    width: 800,
    height: 600,
    toDataURL: jest.fn(() => 'data:image/png;base64,mockedBase64Data'),
    toBlob: jest.fn((callback: (blob: Blob) => void) => {
      callback(new Blob(['mocked-image-data'], { type: 'image/png' }));
    }),
  };

  // Set up circular reference
  context.canvas = canvas;
  return { canvas, context };
};

// Storage API Mock
const createStorageMock = () => ({
  estimate: jest.fn().mockResolvedValue({
    quota: 100 * 1024 * 1024, // 100MB
    usage: 0,
    usageDetails: {
      indexedDB: 0,
      caches: 0,
      serviceWorkerRegistrations: 0,
    },
  }),
  persist: jest.fn().mockResolvedValue(true),
  persisted: jest.fn().mockResolvedValue(true),
});

// Audio API Mock
class MockAudio {
  src: string = '';
  onended: ((this: HTMLAudioElement, ev: Event) => any) | null = null;
  onerror: ((this: HTMLAudioElement, ev: Event) => any) | null = null;

  play = jest.fn().mockImplementation(() => {
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        if (this.onended) {
          this.onended(new Event('ended'));
        }
        resolve();
      }, 100);
    });
  });

  pause = jest.fn();
  load = jest.fn();

  // Helper method to simulate errors
  simulateError(error: Error) {
    if (this.onerror) {
      const event = new Event('error');
      Object.assign(event, { error });
      this.onerror(event);
    }
  }
}

// Export all mocks
export const mockBrowserAPIs = {
  SpeechRecognition: MockSpeechRecognition,
  createCanvas: createCanvasMock,
  storage: createStorageMock(),
  Audio: MockAudio,

  // Reset all mocks
  resetMocks() {
    const { canvas, context } = createCanvasMock();
    Object.values(context).forEach((mock) => mock.mockReset());
    Object.values(canvas).forEach((mock) => mock.mockReset && mock.mockReset());

    this.storage.estimate.mockReset();
    this.storage.persist.mockReset();
    this.storage.persisted.mockReset();
  },
};

// Export individual classes/types for direct use in tests
export {
  MockSpeechRecognition,
  MockAudio,
  type SpeechRecognitionEvent,
  type SpeechRecognitionResult,
  type SpeechRecognitionAlternative,
};
