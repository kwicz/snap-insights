import { errorRecovery, ErrorCategory } from './error-recovery';
import { ExtensionError } from '@/types';

// Constants for optimization
const CHUNK_SIZE = 32 * 1024; // 32KB chunks for audio processing
const MAX_TRANSCRIPT_LENGTH = 100000; // Prevent memory issues with very long transcripts
const CONFIDENCE_THRESHOLD = 0.8; // Minimum confidence for reliable transcription
const DEBOUNCE_DELAY = 300; // ms delay for transcript updates
const RETRY_DELAY = 1000; // ms delay between retries

// Transcription worker for background processing
const transcriptionWorker = `
  self.onmessage = function(e) {
    const { text, action } = e.data;
    
    switch (action) {
      case 'clean':
        // Clean transcript in background
        const cleaned = text
          .trim()
          .replace(/\\s+/g, ' ')
          .replace(/^\\w/, c => c.toUpperCase());
        self.postMessage({ action: 'clean', result: cleaned });
        break;
        
      case 'analyze':
        // Analyze transcript quality
        const words = text.split(/\\s+/).length;
        const chars = text.length;
        const avgWordLength = chars / words;
        const hasNumbers = /\\d+/.test(text);
        const quality = {
          words,
          chars,
          avgWordLength,
          hasNumbers,
          seemsValid: words > 0 && avgWordLength > 2 && avgWordLength < 15
        };
        self.postMessage({ action: 'analyze', result: quality });
        break;
    }
  };
`;

// Create worker blob
const workerBlob = new Blob([transcriptionWorker], {
  type: 'application/javascript',
});
const workerUrl = URL.createObjectURL(workerBlob);

export interface TranscriptionOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
}

export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
}

export interface TranscriptionError {
  code: string;
  message: string;
}

/**
 * Web Speech API transcription service with optimizations
 */
export class TranscriptionService {
  private recognition: SpeechRecognition | null = null;
  private readonly supported: boolean;
  private isListening: boolean = false;
  private worker: Worker | null = null;
  private audioContext: AudioContext | null = null;
  private audioWorklet: AudioWorkletNode | null = null;
  private updateTimeout: number | null = null;
  private transcriptBuffer: string = '';
  private lastProcessedTime: number = 0;
  private processingQueue: Array<() => Promise<void>> = [];

  constructor() {
    // Check for Web Speech API support
    this.supported = !!(
      window.SpeechRecognition || (window as any).webkitSpeechRecognition
    );

    // Initialize worker
    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(workerUrl);
    }

    // Initialize audio context
    if (typeof AudioContext !== 'undefined') {
      this.audioContext = new AudioContext();
      this.initializeAudioWorklet();
    }
  }

  /**
   * Initialize audio processing worklet
   */
  private async initializeAudioWorklet(): Promise<void> {
    if (!this.audioContext) return;

    try {
      await this.audioContext.audioWorklet.addModule(
        URL.createObjectURL(
          new Blob(
            [
              `class NoiseReductionProcessor extends AudioWorkletProcessor {
                process(inputs, outputs) {
                  const input = inputs[0];
                  const output = outputs[0];
                  
                  for (let channel = 0; channel < input.length; channel++) {
                    const inputChannel = input[channel];
                    const outputChannel = output[channel];
                    
                    // Simple noise gate
                    for (let i = 0; i < inputChannel.length; i++) {
                      outputChannel[i] = Math.abs(inputChannel[i]) < 0.01 ? 0 : inputChannel[i];
                    }
                  }
                  
                  return true;
                }
              }
              
              registerProcessor('noise-reduction', NoiseReductionProcessor);`,
            ],
            { type: 'application/javascript' }
          )
        )
      );

      this.audioWorklet = new AudioWorkletNode(
        this.audioContext,
        'noise-reduction'
      );
    } catch (error) {
      console.warn('Failed to initialize audio worklet:', error);
    }
  }

  /**
   * Start speech recognition with optimizations
   */
  async startTranscription(
    options: TranscriptionOptions = {},
    onResult: (result: TranscriptionResult) => void,
    onError: (error: TranscriptionError) => void
  ): Promise<void> {
    // Validate state and support
    if (!this.supported) {
      throw ExtensionError.operation(
        'Speech recognition is not supported',
        'speech_not_supported'
      );
    }

    if (this.isListening) {
      throw ExtensionError.operation(
        'Speech recognition is already active',
        'already_listening'
      );
    }

    try {
      // Initialize recognition with error recovery
      await errorRecovery.retryWithBackoff(
        async () => {
          const SpeechRecognition =
            window.SpeechRecognition || (window as any).webkitSpeechRecognition;
          this.recognition = new SpeechRecognition();

          // Optimize recognition settings
          this.recognition.continuous = options.continuous ?? true;
          this.recognition.interimResults = options.interimResults ?? true;
          this.recognition.lang = options.language ?? 'en-US';
          this.recognition.maxAlternatives = options.maxAlternatives ?? 1;

          // Enable advanced features if available
          if ('audioConfig' in this.recognition) {
            Object.assign(this.recognition, {
              audioConfig: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              },
            });
          }

          // Set up optimized event handlers
          this.setupEventHandlers(onResult, onError);
        },
        {
          maxRetries: 3,
          category: ErrorCategory.TRANSIENT,
          onRetry: (attempt, error) => {
            console.warn(
              `Retrying speech recognition initialization (${attempt}/3):`,
              error
            );
          },
        }
      );

      // Start recognition
      if (this.recognition) {
        this.recognition.start();
        this.isListening = true;
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to initialize speech recognition';
      throw ExtensionError.operation(message, 'initialization_failed');
    }
  }

  /**
   * Set up optimized event handlers
   */
  private setupEventHandlers(
    onResult: (result: TranscriptionResult) => void,
    onError: (error: TranscriptionError) => void
  ): void {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.transcriptBuffer = '';
      this.lastProcessedTime = Date.now();
    };

    this.recognition.onresult = this.createOptimizedResultHandler(onResult);
    this.recognition.onerror = this.createOptimizedErrorHandler(onError);
    this.recognition.onend = this.createOptimizedEndHandler();
  }

  /**
   * Create optimized result handler with debouncing
   */
  private createOptimizedResultHandler(
    onResult: (result: TranscriptionResult) => void
  ): (event: SpeechRecognitionEvent) => void {
    return (event: SpeechRecognitionEvent) => {
      // Clear previous timeout
      if (this.updateTimeout) {
        window.clearTimeout(this.updateTimeout);
      }

      // Process results
      this.updateTimeout = window.setTimeout(() => {
        const results = Array.from(event.results);
        const processedResults = this.processTranscriptionResults(results);

        // Update buffer and notify
        if (processedResults.length > 0) {
          const lastResult = processedResults[processedResults.length - 1];

          // Only update if confidence meets threshold
          if (lastResult.confidence >= CONFIDENCE_THRESHOLD) {
            if (lastResult.isFinal) {
              this.transcriptBuffer += lastResult.transcript + ' ';

              // Prevent buffer from growing too large
              if (this.transcriptBuffer.length > MAX_TRANSCRIPT_LENGTH) {
                this.transcriptBuffer = this.transcriptBuffer.slice(
                  -MAX_TRANSCRIPT_LENGTH
                );
              }
            }

            onResult(lastResult);
          }
        }
      }, DEBOUNCE_DELAY);
    };
  }

  /**
   * Process transcription results with optimization
   */
  private processTranscriptionResults(
    results: SpeechRecognitionResult[]
  ): TranscriptionResult[] {
    return results
      .map((result) => {
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;
        const isFinal = result.isFinal;

        // Get alternatives if available and confidence is below threshold
        const alternatives =
          confidence < CONFIDENCE_THRESHOLD
            ? Array.from(result)
                .slice(1)
                .map((alt) => alt.transcript)
            : [];

        return {
          transcript,
          confidence,
          isFinal,
          alternatives: alternatives.length > 0 ? alternatives : undefined,
        };
      })
      .filter((result) => result.transcript.trim().length > 0);
  }

  /**
   * Create optimized error handler with recovery
   */
  private createOptimizedErrorHandler(
    onError: (error: TranscriptionError) => void
  ): (event: SpeechRecognitionErrorEvent) => void {
    return async (event: SpeechRecognitionErrorEvent) => {
      this.isListening = false;

      const error: TranscriptionError = {
        code: event.error,
        message: this.getErrorMessage(event.error),
      };

      // Try to recover from error
      try {
        await errorRecovery.retryWithBackoff(
          async () => {
            switch (event.error) {
              case 'network':
                await this.waitForNetwork();
                break;
              case 'audio-capture':
                await this.reinitializeAudio();
                break;
              case 'not-allowed':
                await this.requestPermissions();
                break;
              default:
                throw new Error(error.message);
            }
          },
          {
            maxRetries: 2,
            initialDelay: RETRY_DELAY,
            category: ErrorCategory.TRANSIENT,
          }
        );
      } catch (recoveryError) {
        onError(error);
      }
    };
  }

  /**
   * Create optimized end handler
   */
  private createOptimizedEndHandler(): () => void {
    return () => {
      this.isListening = false;
      this.cleanup();
    };
  }

  /**
   * Wait for network connectivity
   */
  private async waitForNetwork(): Promise<void> {
    if (!navigator.onLine) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          window.removeEventListener('online', handler);
          resolve();
        };
        window.addEventListener('online', handler);
      });
    }
  }

  /**
   * Reinitialize audio system
   */
  private async reinitializeAudio(): Promise<void> {
    if (this.audioContext) {
      await this.audioContext.close();
    }
    this.audioContext = new AudioContext();
    await this.initializeAudioWorklet();
  }

  /**
   * Request necessary permissions
   */
  private async requestPermissions(): Promise<void> {
    await navigator.mediaDevices.getUserMedia({ audio: true });
  }

  /**
   * Clean up resources
   */
  private cleanup(): void {
    if (this.updateTimeout) {
      window.clearTimeout(this.updateTimeout);
      this.updateTimeout = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.transcriptBuffer = '';
    this.lastProcessedTime = 0;
    this.processingQueue = [];
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported(): boolean {
    return this.supported;
  }

  /**
   * Stop speech recognition
   */
  stopTranscription(): void {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Abort speech recognition
   */
  abortTranscription(): void {
    if (this.recognition && this.isListening) {
      this.recognition.abort();
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    // Common supported languages
    return [
      'en-US',
      'en-GB',
      'en-AU',
      'en-CA',
      'en-IN',
      'es-ES',
      'es-MX',
      'es-AR',
      'es-CO',
      'fr-FR',
      'fr-CA',
      'de-DE',
      'it-IT',
      'pt-BR',
      'pt-PT',
      'ru-RU',
      'ja-JP',
      'ko-KR',
      'zh-CN',
      'zh-TW',
      'ar-SA',
      'hi-IN',
      'nl-NL',
      'sv-SE',
      'da-DK',
      'no-NO',
      'fi-FI',
      'pl-PL',
      'tr-TR',
      'he-IL',
      'th-TH',
      'vi-VN',
    ];
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'no-speech':
        return 'No speech was detected. Please try again.';
      case 'aborted':
        return 'Speech recognition was aborted.';
      case 'audio-capture':
        return 'Audio capture failed. Please check your microphone.';
      case 'network':
        return 'Network error occurred during speech recognition.';
      case 'not-allowed':
        return 'Microphone access was denied. Please allow microphone access.';
      case 'service-not-allowed':
        return 'Speech recognition service is not allowed.';
      case 'bad-grammar':
        return 'Speech recognition grammar error.';
      case 'language-not-supported':
        return 'The specified language is not supported.';
      default:
        return 'An unknown error occurred during speech recognition.';
    }
  }
}

/**
 * Transcribe audio blob using Web Speech API
 * Note: This is a workaround since Web Speech API doesn't directly support blob transcription
 */
export async function transcribeAudioBlob(
  audioBlob: Blob,
  options: TranscriptionOptions = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create audio element to play the blob
    const audio = new Audio();
    const url = URL.createObjectURL(audioBlob);
    audio.src = url;

    const transcriptionService = new TranscriptionService();
    let finalTranscript = '';

    if (!transcriptionService.isSupported()) {
      reject(new Error('Speech recognition is not supported'));
      return;
    }

    // Start transcription
    transcriptionService.startTranscription(
      {
        ...options,
        continuous: true,
        interimResults: false,
      },
      (result) => {
        if (result.isFinal) {
          finalTranscript += result.transcript + ' ';
        }
      },
      (error) => {
        URL.revokeObjectURL(url);
        reject(new Error(error.message));
      }
    );

    // Play audio and stop transcription when done
    audio.onended = () => {
      transcriptionService.stopTranscription();
      URL.revokeObjectURL(url);
      resolve(finalTranscript.trim());
    };

    audio.onerror = () => {
      transcriptionService.abortTranscription();
      URL.revokeObjectURL(url);
      reject(new Error('Failed to play audio for transcription'));
    };

    // Start playback (this approach has limitations)
    audio.play().catch(() => {
      transcriptionService.abortTranscription();
      URL.revokeObjectURL(url);
      reject(new Error('Failed to start audio playback for transcription'));
    });
  });
}

/**
 * Real-time transcription for live audio
 */
export class RealTimeTranscription {
  private transcriptionService: TranscriptionService;
  private currentTranscript: string = '';
  private onTranscriptUpdate?: (transcript: string, isFinal: boolean) => void;
  private onError?: (error: TranscriptionError) => void;

  constructor() {
    this.transcriptionService = new TranscriptionService();
  }

  /**
   * Start real-time transcription
   */
  start(
    options: TranscriptionOptions = {},
    onUpdate: (transcript: string, isFinal: boolean) => void,
    onError: (error: TranscriptionError) => void
  ): void {
    this.onTranscriptUpdate = onUpdate;
    this.onError = onError;
    this.currentTranscript = '';

    this.transcriptionService.startTranscription(
      {
        ...options,
        continuous: true,
        interimResults: true,
      },
      (result) => {
        if (result.isFinal) {
          this.currentTranscript += result.transcript + ' ';
          this.onTranscriptUpdate?.(this.currentTranscript.trim(), true);
        } else {
          const tempTranscript = this.currentTranscript + result.transcript;
          this.onTranscriptUpdate?.(tempTranscript, false);
        }
      },
      (error) => {
        this.onError?.(error);
      }
    );
  }

  /**
   * Stop real-time transcription
   */
  stop(): string {
    this.transcriptionService.stopTranscription();
    return this.currentTranscript.trim();
  }

  /**
   * Get current transcript
   */
  getCurrentTranscript(): string {
    return this.currentTranscript.trim();
  }

  /**
   * Clear current transcript
   */
  clearTranscript(): void {
    this.currentTranscript = '';
  }

  /**
   * Check if supported
   */
  isSupported(): boolean {
    return this.transcriptionService.isSupported();
  }
}

// Export singleton instances
export const transcriptionService = new TranscriptionService();
export const realTimeTranscription = new RealTimeTranscription();

// Utility functions
export const TranscriptionUtils = {
  /**
   * Format confidence score for display
   */
  formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`;
  },

  /**
   * Clean up transcript text
   */
  cleanTranscript(transcript: string): string {
    return transcript
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^\w/, (c) => c.toUpperCase());
  },

  /**
   * Get language display name
   */
  getLanguageDisplayName(languageCode: string): string {
    const languageNames: Record<string, string> = {
      'en-US': 'English (US)',
      'en-GB': 'English (UK)',
      'en-AU': 'English (Australia)',
      'en-CA': 'English (Canada)',
      'es-ES': 'Spanish (Spain)',
      'es-MX': 'Spanish (Mexico)',
      'fr-FR': 'French (France)',
      'de-DE': 'German',
      'it-IT': 'Italian',
      'pt-BR': 'Portuguese (Brazil)',
      'ja-JP': 'Japanese',
      'ko-KR': 'Korean',
      'zh-CN': 'Chinese (Simplified)',
      'ru-RU': 'Russian',
    };

    return languageNames[languageCode] || languageCode;
  },

  /**
   * Detect if browser supports speech recognition
   */
  isSpeechRecognitionSupported(): boolean {
    return !!(
      window.SpeechRecognition || (window as any).webkitSpeechRecognition
    );
  },
};
