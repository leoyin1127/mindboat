/**
 * Voice Service for MindBoat
 * 
 * Handles speech recognition, voice interactions, and coordinates with ElevenLabs
 * for comprehensive voice-based sailing experience.
 */

import { ElevenLabsService } from './ElevenLabsService';
import { VoiceTranscriptService } from './VoiceTranscriptService';

export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export interface VoiceInteractionResponse {
  type: 'return_to_course' | 'exploring' | 'inspiration' | 'unknown';
  content: string;
  confidence: number;
}

export class VoiceService {
  private static recognition: any = null; // SpeechRecognition
  private static isListening = false;
  private static isInitialized = false;

  private static config: VoiceConfig = {
    language: 'en-US', // English for voice recognition
    continuous: false,
    interimResults: true,
    maxAlternatives: 1
  };

  /**
   * Initialize the voice service
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('🎤 [VOICE SERVICE] Starting initialization...');

      // Initialize ElevenLabs service
      const elevenLabsInitialized = ElevenLabsService.initialize();
      console.log('🎤 [VOICE SERVICE] ElevenLabs initialized:', elevenLabsInitialized);

      // Initialize Speech Recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = this.config.continuous;
        this.recognition.interimResults = this.config.interimResults;
        this.recognition.lang = this.config.language;
        this.recognition.maxAlternatives = this.config.maxAlternatives;

        console.log('🎤 [VOICE SERVICE] Speech Recognition configured:', {
          continuous: this.config.continuous,
          interimResults: this.config.interimResults,
          language: this.config.language
        });
      } else {
        console.warn('🎤 [VOICE SERVICE] Speech Recognition not supported in this browser');
      }

      this.isInitialized = !!this.recognition;

      console.log('🎤 [VOICE SERVICE] Initialization complete:', {
        speechRecognition: !!this.recognition,
        elevenLabs: elevenLabsInitialized,
        isInitialized: this.isInitialized
      });

      return this.isInitialized;
    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Check if voice features are supported
   */
  static isSupported(): {
    speechRecognition: boolean;
    elevenLabs: boolean;
    fullFeatures: boolean;
  } {
    const speechRecognition = !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    const elevenLabs = ElevenLabsService.isConfigured();

    return {
      speechRecognition,
      elevenLabs,
      fullFeatures: speechRecognition && elevenLabs
    };
  }

  /**
   * Listen for speech input with timeout
   */
  static async listen(timeoutMs: number = 10000): Promise<SpeechRecognitionResult> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      if (this.isListening) {
        reject(new Error('Already listening'));
        return;
      }

      console.log(`🎤 [VOICE SERVICE] Starting to listen (timeout: ${timeoutMs}ms)...`);
      this.isListening = true;
      let finalResult: SpeechRecognitionResult | null = null;

      const timeout = setTimeout(() => {
        console.log('🎤 [VOICE SERVICE] Listen timeout reached');
        this.recognition.stop();
        this.isListening = false;
        if (!finalResult) {
          reject(new Error('Speech recognition timeout'));
        }
      }, timeoutMs);

      this.recognition.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence || 0.5;
        const isFinal = result.isFinal;

        console.log('🎤 [VOICE SERVICE] Speech result:', {
          transcript,
          confidence,
          isFinal
        });

        const speechResult: SpeechRecognitionResult = {
          transcript: transcript.trim(),
          confidence,
          isFinal
        };

        if (isFinal) {
          finalResult = speechResult;
          clearTimeout(timeout);
          this.isListening = false;
          console.log('🎤 [VOICE SERVICE] ✅ Final speech result:', speechResult);
          resolve(speechResult);
        }
      };

      this.recognition.onerror = (event: any) => {
        console.error('🎤 [VOICE SERVICE] Speech recognition error:', event.error);
        clearTimeout(timeout);
        this.isListening = false;
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      this.recognition.onend = () => {
        console.log('🎤 [VOICE SERVICE] Speech recognition ended');
        clearTimeout(timeout);
        this.isListening = false;
        if (!finalResult) {
          reject(new Error('Speech recognition ended without result'));
        }
      };

      try {
        this.recognition.start();
        console.log('🎤 [VOICE SERVICE] Speech recognition started');
      } catch (error) {
        console.error('🎤 [VOICE SERVICE] Failed to start speech recognition:', error);
        clearTimeout(timeout);
        this.isListening = false;
        reject(error);
      }
    });
  }

  /**
   * Stop listening
   */
  static stopListening(): void {
    if (this.recognition && this.isListening) {
      console.log('🎤 [VOICE SERVICE] Stopping speech recognition');
      this.recognition.stop();
      this.isListening = false;
    }
  }

  /**
   * Analyze voice input for distraction response
   */
  static analyzeDistractionResponse(transcript: string): VoiceInteractionResponse {
    const text = transcript.toLowerCase().trim();
    console.log('🎤 [VOICE SERVICE] Analyzing transcript:', text);

    // English phrases for "I'm exploring"
    const exploringPhrases = [
      'exploring', 'i\'m exploring', 'i am exploring', 'learning', 'researching',
      'looking up', 'checking', 'working', 'work related', 'this is work',
      'thinking', 'searching', 'need to check', 'work needs', 'studying'
    ];

    // English phrases for "return to course"
    const returnPhrases = [
      'return', 'back', 'continue', 'focus', 'return to course', 'back to course',
      'continue work', 'back to work', 'concentrate', 'focus up', 'okay', 'yes',
      'got it', 'understood', 'will do'
    ];

    // Check for exploring intent
    for (const phrase of exploringPhrases) {
      if (text.includes(phrase)) {
        console.log('🎤 [VOICE SERVICE] ✅ Detected exploring intent with phrase:', phrase);
        return {
          type: 'exploring',
          content: transcript,
          confidence: 0.9
        };
      }
    }

    // Check for return intent
    for (const phrase of returnPhrases) {
      if (text.includes(phrase)) {
        console.log('🎤 [VOICE SERVICE] ✅ Detected return intent with phrase:', phrase);
        return {
          type: 'return_to_course',
          content: transcript,
          confidence: 0.9
        };
      }
    }

    // Check if it's inspiration content
    const inspirationKeywords = [
      'record', 'inspiration', 'idea', 'note', 'remember', 'thought', 'found',
      'learned', 'summary', 'insight', 'reflection', 'discovery', 'takeaway'
    ];

    for (const keyword of inspirationKeywords) {
      if (text.includes(keyword)) {
        console.log('🎤 [VOICE SERVICE] ✅ Detected inspiration intent with keyword:', keyword);
        return {
          type: 'inspiration',
          content: transcript,
          confidence: 0.8
        };
      }
    }

    console.log('🎤 [VOICE SERVICE] ⚠️ Unknown intent, defaulting to return_to_course');
    return {
      type: 'return_to_course', // Default to return to course for safety
      content: transcript,
      confidence: 0.5
    };
  }

  /**
   * Handle distraction alert with voice interaction
   */
  static async handleDistractionAlert(
    distractionType: string,
    onResponse: (response: 'return_to_course' | 'exploring') => void
  ): Promise<void> {
    try {
      console.log('🎤 [VOICE SERVICE] 🚨 Starting distraction alert for type:', distractionType);

      // Check if ElevenLabs is available for AI voice
      if (ElevenLabsService.isConfigured()) {
        console.log('🎤 [VOICE SERVICE] 🔊 Speaking distraction alert...');
        await ElevenLabsService.speakDistractionAlert(distractionType);
        console.log('🎤 [VOICE SERVICE] ✅ Distraction alert spoken');
      } else {
        console.log('🎤 [VOICE SERVICE] ⚠️ ElevenLabs not configured, skipping AI voice');
        // Still proceed with speech recognition even without AI voice
      }

      // Wait a moment, then start listening for response
      setTimeout(async () => {
        try {
          console.log('🎤 [VOICE SERVICE] 🎤 Starting to listen for user response...');
          const result = await this.listen(15000); // 15 second timeout
          const analysis = this.analyzeDistractionResponse(result.transcript);

          console.log('🎤 [VOICE SERVICE] 🧠 Voice analysis result:', analysis);

          if (analysis.type === 'exploring') {
            if (ElevenLabsService.isConfigured()) {
              await ElevenLabsService.speakExplorationConfirmation();
            }
            console.log('🎤 [VOICE SERVICE] ✅ User chose exploring mode');
            onResponse('exploring');
          } else if (analysis.type === 'return_to_course') {
            if (ElevenLabsService.isConfigured()) {
              await ElevenLabsService.speakReturnConfirmation();
            }
            console.log('🎤 [VOICE SERVICE] ✅ User chose return to course');
            onResponse('return_to_course');
          } else {
            // If unclear, default to return to course
            if (ElevenLabsService.isConfigured()) {
              await ElevenLabsService.speakReturnConfirmation();
            }
            console.log('🎤 [VOICE SERVICE] ⚠️ Unclear response, defaulting to return to course');
            onResponse('return_to_course');
          }
        } catch (error) {
          console.warn('🎤 [VOICE SERVICE] ⚠️ Voice response not detected, defaulting to return to course:', error);
          onResponse('return_to_course');
        }
      }, ElevenLabsService.isConfigured() ? 2000 : 500); // Wait longer if AI voice is speaking

    } catch (error) {
      console.error('🎤 [VOICE SERVICE] ❌ Failed to handle distraction alert:', error);
      // Fallback to non-voice interaction
      onResponse('return_to_course');
    }
  }

  /**
   * Capture inspiration via voice
   */
  static async captureVoiceInspiration(): Promise<string | null> {
    try {
      console.log('🎤 [VOICE SERVICE] Starting voice inspiration capture...');
      const result = await this.listen(30000); // 30 second timeout for inspiration

      if (result.transcript && result.transcript.length > 5) {
        if (ElevenLabsService.isConfigured()) {
          await ElevenLabsService.speakInspirationConfirmation('voice');
        }
        console.log('🎤 [VOICE SERVICE] ✅ Voice inspiration captured:', result.transcript);
        return result.transcript;
      }

      console.log('🎤 [VOICE SERVICE] ⚠️ No meaningful inspiration captured');
      return null;
    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Failed to capture voice inspiration:', error);
      return null;
    }
  }

  /**
   * Announce voyage completion
   */
  static async announceVoyageCompletion(destinationName: string, duration: string): Promise<void> {
    try {
      console.log('🎤 [VOICE SERVICE] Announcing voyage completion...');
      if (ElevenLabsService.isConfigured()) {
        await ElevenLabsService.speakVoyageCompletion(destinationName, duration);
        console.log('🎤 [VOICE SERVICE] ✅ Voyage completion announced');
      } else {
        console.log('🎤 [VOICE SERVICE] ⚠️ ElevenLabs not configured, skipping announcement');
      }
    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Failed to announce voyage completion:', error);
    }
  }

  /**
   * Get service status
   */
  static getStatus(): {
    initialized: boolean;
    listening: boolean;
    features: ReturnType<typeof VoiceService.isSupported>;
  } {
    return {
      initialized: this.isInitialized,
      listening: this.isListening,
      features: this.isSupported()
    };
  }

  // Continuous Recording Methods for Voice Transcripts

  private static continuousRecognition: any = null;
  private static isContinuousRecording = false;
  private static currentSegmentStartTime: Date | null = null;

  /**
   * Start continuous voice recording for the entire voyage
   */
  static async startContinuousRecording(
    voyageId: string,
    userSettings?: any
  ): Promise<boolean> {
    try {
      console.log('🎤 [VOICE SERVICE] Starting continuous recording for voyage:', voyageId);

      if (!this.recognition) {
        console.error('🎤 [VOICE SERVICE] Speech recognition not available');
        return false;
      }

      // Initialize transcript service
      const transcriptStarted = await VoiceTranscriptService.startVoyageRecording(voyageId, userSettings);
      if (!transcriptStarted) {
        console.log('🎤 [VOICE SERVICE] Transcript service not started');
        return false;
      }

      // Create a separate recognition instance for continuous recording
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      this.continuousRecognition = new SpeechRecognition();

      // Configure for continuous recording
      this.continuousRecognition.continuous = true;
      this.continuousRecognition.interimResults = true;
      this.continuousRecognition.lang = this.config.language;
      this.continuousRecognition.maxAlternatives = 1;

      this.isContinuousRecording = true;
      this.currentSegmentStartTime = new Date();

      // Set up event handlers
      this.continuousRecognition.onresult = (event: any) => {
        this.handleContinuousResult(event);
      };

      this.continuousRecognition.onerror = (event: any) => {
        console.warn('🎤 [VOICE SERVICE] Continuous recording error:', event.error);
        // Auto-restart on most errors (except permission issues)
        if (event.error !== 'not-allowed' && this.isContinuousRecording) {
          setTimeout(() => {
            if (this.isContinuousRecording) {
              this.restartContinuousRecording();
            }
          }, 1000);
        }
      };

      this.continuousRecognition.onend = () => {
        console.log('🎤 [VOICE SERVICE] Continuous recording ended');
        // Auto-restart if still supposed to be recording
        if (this.isContinuousRecording) {
          setTimeout(() => {
            this.restartContinuousRecording();
          }, 100);
        }
      };

      // Start recording
      this.continuousRecognition.start();
      console.log('🎤 [VOICE SERVICE] ✅ Continuous recording started');
      return true;

    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Failed to start continuous recording:', error);
      return false;
    }
  }

  /**
   * Stop continuous recording
   */
  static async stopContinuousRecording(): Promise<void> {
    try {
      console.log('🎤 [VOICE SERVICE] Stopping continuous recording...');

      // Set flag to false FIRST to prevent any restart attempts
      this.isContinuousRecording = false;

      if (this.continuousRecognition) {
        try {
          // Remove event listeners to prevent any callbacks during shutdown
          this.continuousRecognition.onresult = null;
          this.continuousRecognition.onerror = null;
          this.continuousRecognition.onend = null;

          // Stop the recognition
          this.continuousRecognition.stop();
        } catch (stopError) {
          console.warn('🎤 [VOICE SERVICE] Error stopping recognition instance:', stopError);
        }

        this.continuousRecognition = null;
      }

      // Finalize the current segment if exists
      if (this.currentSegmentStartTime) {
        // Any pending transcription will be handled by the last onresult event
        this.currentSegmentStartTime = null;
      }

      // Stop transcript service and get analysis
      const analysis = await VoiceTranscriptService.stopVoyageRecording();
      console.log('🎤 [VOICE SERVICE] ✅ Continuous recording stopped, analysis:', analysis ? 'generated' : 'not generated');

    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Error stopping continuous recording:', error);
    }
  }

  // Add static variables to track last stored segment for deduplication
  private static lastStoredTranscript: string = '';
  private static lastStoredTime: number = 0;

  /**
   * Handle continuous speech recognition results
   */
  private static handleContinuousResult(event: any): void {
    if (!this.isContinuousRecording || !this.currentSegmentStartTime) {
      return;
    }

    try {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence || 0.5;
      const isFinal = result.isFinal;

      // Only process meaningful speech (filter out very short utterances)
      if (transcript.length < 3) {
        return;
      }

      console.log('🎤 [VOICE SERVICE] Continuous result:', {
        transcript: transcript.substring(0, 50) + (transcript.length > 50 ? '...' : ''),
        confidence,
        isFinal,
        length: transcript.length
      });

      // Only store FINAL results to avoid duplication
      if (isFinal) {
        // Deduplication: check if this transcript is very similar to the last one
        const now = Date.now();
        const timeSinceLastStore = now - this.lastStoredTime;
        const similarity = this.calculateSimilarity(transcript, this.lastStoredTranscript);

        // Skip if very similar transcript was stored recently (< 2 seconds ago)
        if (similarity > 0.8 && timeSinceLastStore < 2000) {
          console.log('🎤 [VOICE SERVICE] Skipping duplicate transcript (similarity:', similarity.toFixed(2), ')');
          return;
        }

        // Store the final transcript segment
        const endTime = new Date();
        VoiceTranscriptService.storeTranscriptSegment(
          transcript,
          confidence,
          this.currentSegmentStartTime,
          endTime,
          false, // isInterim = false (final result)
          true // isUserSpeech
        );

        // Update deduplication tracking
        this.lastStoredTranscript = transcript;
        this.lastStoredTime = now;

        // Start new segment for next speech
        this.currentSegmentStartTime = new Date();
      }
      // For interim results, we can provide real-time feedback without storing
      // This gives users immediate feedback while avoiding database duplication

    } catch (error) {
      console.error('🎤 [VOICE SERVICE] Error handling continuous result:', error);
    }
  }

  /**
   * Calculate similarity between two strings (0 = completely different, 1 = identical)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple similarity calculation based on common words
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const allWords = new Set([...words1, ...words2]);

    let commonWords = 0;
    for (const word of allWords) {
      if (words1.includes(word) && words2.includes(word)) {
        commonWords++;
      }
    }

    return (commonWords * 2) / (words1.length + words2.length);
  }

  /**
   * Restart continuous recording after interruption
   */
  private static restartContinuousRecording(): void {
    if (!this.isContinuousRecording) {
      console.log('🎤 [VOICE SERVICE] Not restarting - recording disabled');
      return;
    }

    try {
      console.log('🎤 [VOICE SERVICE] Restarting continuous recording...');

      // Stop the current recognition instance first
      if (this.continuousRecognition) {
        try {
          this.continuousRecognition.stop();
        } catch (e) {
          // Ignore errors when stopping
        }
        this.continuousRecognition = null;
      }

      // Create new recognition instance
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        console.error('🎤 [VOICE SERVICE] Speech recognition not available');
        return;
      }

      this.continuousRecognition = new SpeechRecognition();

      // Configure for continuous recording
      this.continuousRecognition.continuous = true;
      this.continuousRecognition.interimResults = true;
      this.continuousRecognition.lang = this.config.language;
      this.continuousRecognition.maxAlternatives = 1;

      // Set up event handlers
      this.continuousRecognition.onresult = (event: any) => {
        this.handleContinuousResult(event);
      };

      this.continuousRecognition.onerror = (event: any) => {
        console.warn('🎤 [VOICE SERVICE] Continuous recording error:', event.error);
        // Auto-restart on most errors (except permission issues)
        if (event.error !== 'not-allowed' && this.isContinuousRecording) {
          setTimeout(() => {
            if (this.isContinuousRecording) {
              this.restartContinuousRecording();
            }
          }, 2000);
        }
      };

      this.continuousRecognition.onend = () => {
        console.log('🎤 [VOICE SERVICE] Continuous recording ended');
        // Auto-restart if still supposed to be recording
        if (this.isContinuousRecording) {
          setTimeout(() => {
            if (this.isContinuousRecording) {
              this.restartContinuousRecording();
            }
          }, 500);
        }
      };

      // Start recording
      this.continuousRecognition.start();
      this.currentSegmentStartTime = new Date();
      console.log('🎤 [VOICE SERVICE] ✅ Continuous recording restarted');

    } catch (error) {
      console.warn('🎤 [VOICE SERVICE] Failed to restart continuous recording:', error);
      // Try again after a longer delay
      setTimeout(() => {
        if (this.isContinuousRecording) {
          this.restartContinuousRecording();
        }
      }, 5000);
    }
  }

  /**
   * Get continuous recording status
   */
  static getContinuousRecordingStatus(): {
    isRecording: boolean;
    transcriptStatus: any;
  } {
    return {
      isRecording: this.isContinuousRecording,
      transcriptStatus: VoiceTranscriptService.getRecordingStatus()
    };
  }
}