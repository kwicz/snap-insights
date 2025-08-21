import {
  TranscriptionService,
  RealTimeTranscription,
  TranscriptionUtils,
  transcribeAudioBlob,
} from '../src/utils/transcription';

// Define Speech Recognition types for tests
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

// Create a mock SpeechRecognition class that extends EventTarget
class MockSpeechRecognition extends EventTarget implements SpeechRecognition {
  start = jest.fn();
  stop = jest.fn();
  abort = jest.fn();
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null = null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null = null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null = null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null = null;
  continuous = false;
  interimResults = false;
  lang = 'en-US';
  maxAlternatives = 1;
}

// Create mock instance
const mockSpeechRecognition = new MockSpeechRecognition();

// Extend Window interface to include SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: jest.Mock;
  }
}

// Mock window.SpeechRecognition
Object.defineProperty(window, 'SpeechRecognition', {
  writable: true,
  value: jest.fn().mockImplementation(() => mockSpeechRecognition),
});

// Mock URL methods
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Define types for our mock Audio
interface MockAudio {
  play: jest.Mock;
  onended: ((this: HTMLAudioElement, ev: Event) => any) | null;
  onerror: ((this: HTMLAudioElement, ev: Event) => any) | null;
  src: string;
}

// Mock Audio
global.Audio = jest.fn().mockImplementation(
  () =>
    ({
      play: jest.fn().mockResolvedValue(undefined),
      onended: null,
      onerror: null,
      src: '',
    } as MockAudio)
);

describe('TranscriptionService', () => {
  let service: TranscriptionService;

  beforeEach(() => {
    service = new TranscriptionService();
    jest.clearAllMocks();
  });

  describe('Browser Support Detection', () => {
    it('should detect when speech recognition is supported', () => {
      expect(service.isSupported()).toBe(true);
    });

    it('should detect when speech recognition is not supported', () => {
      // Temporarily remove SpeechRecognition
      const originalSpeechRecognition = window.SpeechRecognition;
      delete (window as any).SpeechRecognition;

      const unsupportedService = new TranscriptionService();
      expect(unsupportedService.isSupported()).toBe(false);

      // Restore
      window.SpeechRecognition = originalSpeechRecognition;
    });
  });

  describe('Speech Recognition Initialization', () => {
    it('should start transcription with default options', async () => {
      const onResult = jest.fn();
      const onError = jest.fn();

      await service.startTranscription({}, onResult, onError);

      expect(window.SpeechRecognition).toHaveBeenCalled();
      expect(mockSpeechRecognition.start).toHaveBeenCalled();
      expect(mockSpeechRecognition.continuous).toBe(true);
      expect(mockSpeechRecognition.interimResults).toBe(true);
      expect(mockSpeechRecognition.lang).toBe('en-US');
    });

    it('should start transcription with custom options', async () => {
      const onResult = jest.fn();
      const onError = jest.fn();
      const options = {
        language: 'es-ES',
        continuous: false,
        interimResults: false,
        maxAlternatives: 3,
      };

      await service.startTranscription(options, onResult, onError);

      expect(mockSpeechRecognition.lang).toBe('es-ES');
      expect(mockSpeechRecognition.continuous).toBe(false);
      expect(mockSpeechRecognition.interimResults).toBe(false);
      expect(mockSpeechRecognition.maxAlternatives).toBe(3);
    });

    it('should handle unsupported browser', async () => {
      const originalSpeechRecognition = window.SpeechRecognition;
      delete (window as any).SpeechRecognition;

      const unsupportedService = new TranscriptionService();
      const onResult = jest.fn();
      const onError = jest.fn();

      await unsupportedService.startTranscription({}, onResult, onError);

      expect(onError).toHaveBeenCalledWith({
        code: 'not-supported',
        message: 'Speech recognition is not supported in this browser',
      });

      window.SpeechRecognition = originalSpeechRecognition;
    });
  });

  describe('Speech Recognition Events', () => {
    it('should handle speech recognition results', async () => {
      const onResult = jest.fn();
      const onError = jest.fn();

      await service.startTranscription({}, onResult, onError);

      // Create a proper mock event with correctly structured results
      const mockEvent = new Event('result') as SpeechRecognitionEvent;
      const mockResult = {
        0: { transcript: 'Hello world', confidence: 0.95 },
        1: { transcript: 'Hello word', confidence: 0.85 },
        length: 2,
        isFinal: true,
        item: (index: number) => mockResult[index],
      } as SpeechRecognitionResult;

      const mockResults = {
        0: mockResult,
        length: 1,
        item: (index: number) => mockResults[index],
      } as unknown as SpeechRecognitionResultList;

      Object.assign(mockEvent, {
        resultIndex: 0,
        results: mockResults,
      });

      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult(mockEvent as SpeechRecognitionEvent);
      }

      expect(onResult).toHaveBeenCalledWith({
        transcript: 'Hello world',
        confidence: 0.95,
        isFinal: true,
        alternatives: ['Hello word'],
      });
    });

    it('should handle speech recognition errors', async () => {
      const onResult = jest.fn();
      const onError = jest.fn();

      await service.startTranscription({}, onResult, onError);

      // Simulate speech recognition error
      const mockError = new Event('error') as SpeechRecognitionErrorEvent;
      Object.assign(mockError, {
        error: 'no-speech',
        message: 'No speech was detected',
      });
      if (mockSpeechRecognition.onerror) {
        mockSpeechRecognition.onerror(mockError as SpeechRecognitionErrorEvent);
      }

      expect(onError).toHaveBeenCalledWith({
        code: 'no-speech',
        message: 'No speech was detected. Please try again.',
      });
    });
  });

  describe('Control Methods', () => {
    it('should stop transcription', () => {
      service.stopTranscription();
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
    });

    it('should abort transcription', () => {
      service.abortTranscription();
      expect(mockSpeechRecognition.abort).toHaveBeenCalled();
    });

    it('should track listening state', async () => {
      const onResult = jest.fn();
      const onError = jest.fn();

      expect(service.isCurrentlyListening()).toBe(false);

      await service.startTranscription({}, onResult, onError);

      // Simulate start event
      if (mockSpeechRecognition.onstart) {
        mockSpeechRecognition.onstart(new Event('start'));
      }
      expect(service.isCurrentlyListening()).toBe(true);

      // Simulate end event
      if (mockSpeechRecognition.onend) {
        mockSpeechRecognition.onend(new Event('end'));
      }
      expect(service.isCurrentlyListening()).toBe(false);
    });
  });

  describe('Language Support', () => {
    it('should return supported languages', () => {
      const languages = service.getSupportedLanguages();

      expect(languages).toContain('en-US');
      expect(languages).toContain('es-ES');
      expect(languages).toContain('fr-FR');
      expect(languages).toContain('de-DE');
      expect(languages.length).toBeGreaterThan(10);
    });
  });
});

describe('RealTimeTranscription', () => {
  let realTime: RealTimeTranscription;

  beforeEach(() => {
    realTime = new RealTimeTranscription();
    jest.clearAllMocks();
  });

  describe('Real-time Processing', () => {
    it('should accumulate final results', () => {
      const onUpdate = jest.fn();
      const onError = jest.fn();

      realTime.start({}, onUpdate, onError);

      // Simulate interim result
      const interimEvent = new Event('result') as SpeechRecognitionEvent;
      const interimResult = {
        0: { transcript: 'Hello', confidence: 0.8 },
        length: 1,
        isFinal: false,
        item: (index: number) => interimResult[index],
      } as SpeechRecognitionResult;

      const interimResults = {
        0: interimResult,
        length: 1,
        item: (index: number) => interimResults[index],
      } as unknown as SpeechRecognitionResultList;

      Object.assign(interimEvent, {
        resultIndex: 0,
        results: interimResults,
      });

      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult(interimEvent as SpeechRecognitionEvent);
      }
      expect(onUpdate).toHaveBeenCalledWith('Hello', false);

      // Simulate final result
      const finalEvent = new Event('result') as SpeechRecognitionEvent;
      const finalResult = {
        0: { transcript: 'Hello world', confidence: 0.95 },
        length: 1,
        isFinal: true,
        item: (index: number) => finalResult[index],
      } as SpeechRecognitionResult;

      const finalResults = {
        0: finalResult,
        length: 1,
        item: (index: number) => finalResults[index],
      } as unknown as SpeechRecognitionResultList;

      Object.assign(finalEvent, {
        resultIndex: 0,
        results: finalResults,
      });

      if (mockSpeechRecognition.onresult) {
        mockSpeechRecognition.onresult(finalEvent as SpeechRecognitionEvent);
      }
      expect(onUpdate).toHaveBeenCalledWith('Hello world', true);
    });

    it('should clear transcript', () => {
      realTime.clearTranscript();
      expect(realTime.getCurrentTranscript()).toBe('');
    });

    it('should stop and return final transcript', () => {
      const result = realTime.stop();
      expect(mockSpeechRecognition.stop).toHaveBeenCalled();
      expect(typeof result).toBe('string');
    });
  });
});

describe('Audio Blob Transcription', () => {
  it('should transcribe audio blob', async () => {
    const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
    const mockAudio = {
      play: jest.fn().mockResolvedValue(undefined),
      onended: null as unknown as
        | ((this: HTMLAudioElement, ev: Event) => any)
        | null,
      onerror: null as unknown as
        | ((this: HTMLAudioElement, ev: Event) => any)
        | null,
      src: '',
    };

    (global.Audio as jest.Mock).mockImplementation(() => mockAudio);

    // Start transcription
    const transcriptionPromise = transcribeAudioBlob(mockBlob);

    // Simulate audio ended
    setTimeout(() => {
      if (mockAudio.onended) {
        const event = new Event('ended');
        mockAudio.onended.call(mockAudio, event);
      }
    }, 100);

    const result = await transcriptionPromise;
    expect(typeof result).toBe('string');
    expect(URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('should handle audio playback errors', async () => {
    const mockBlob = new Blob(['audio data'], { type: 'audio/wav' });
    const mockAudio = {
      play: jest.fn().mockRejectedValue(new Error('Playback failed')),
      onended: null,
      onerror: null,
      src: '',
    };

    (global.Audio as jest.Mock).mockImplementation(() => mockAudio);

    await expect(transcribeAudioBlob(mockBlob)).rejects.toThrow(
      'Failed to start audio playback for transcription'
    );
  });
});

describe('TranscriptionUtils', () => {
  describe('Utility Functions', () => {
    it('should format confidence score', () => {
      expect(TranscriptionUtils.formatConfidence(0.95)).toBe('95%');
      expect(TranscriptionUtils.formatConfidence(0.123)).toBe('12%');
    });

    it('should clean transcript text', () => {
      expect(TranscriptionUtils.cleanTranscript('  hello   world  ')).toBe(
        'Hello world'
      );
      expect(TranscriptionUtils.cleanTranscript('test')).toBe('Test');
    });

    it('should get language display names', () => {
      expect(TranscriptionUtils.getLanguageDisplayName('en-US')).toBe(
        'English (US)'
      );
      expect(TranscriptionUtils.getLanguageDisplayName('es-ES')).toBe(
        'Spanish (Spain)'
      );
      expect(TranscriptionUtils.getLanguageDisplayName('unknown')).toBe(
        'unknown'
      );
    });

    it('should detect speech recognition support', () => {
      expect(TranscriptionUtils.isSpeechRecognitionSupported()).toBe(true);
    });
  });
});
