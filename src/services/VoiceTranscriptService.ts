/**
 * Voice Transcript Service for Continuous Journey Recording
 * 
 * This service handles:
 * - Continuous voice recording during voyages
 * - Transcript storage and retrieval
 * - AI analysis of voice transcripts for insights
 * - Privacy controls and data management
 */

import { supabase } from '../lib/supabase';
import { GeminiService } from './GeminiService';
import type {
    VoiceTranscriptSegment,
    VoiceTranscriptData,
    VoiceAnalysisData,
    VoiceRecordingSettings
} from '../types';

export class VoiceTranscriptService {
    private static currentVoyageId: string | null = null;
    private static segmentCounter = 0;
    private static isRecording = false;
    private static settings: VoiceRecordingSettings = {
        enabled: false,
        continuous: true,
        saveTranscripts: true,
        autoAnalyze: true,
        privacyMode: false,
        retentionDays: 30
    };

    /**
     * Initialize voice recording for a voyage
     */
    static async startVoyageRecording(
        voyageId: string,
        userSettings?: Partial<VoiceRecordingSettings>
    ): Promise<boolean> {
        try {
            console.log('🎤 [TRANSCRIPT] Starting voyage recording for:', voyageId);

            // Update settings
            this.settings = { ...this.settings, ...userSettings };

            if (!this.settings.enabled) {
                console.log('🎤 [TRANSCRIPT] Recording disabled by user settings');
                return false;
            }

            // Initialize voyage recording in database
            const { error } = await supabase
                .from('voyages')
                .update({
                    voice_recording_enabled: true,
                    total_transcript_duration: 0,
                    transcript_confidence_avg: 0.0
                })
                .eq('id', voyageId);

            if (error) {
                console.error('🎤 [TRANSCRIPT] Failed to initialize recording:', error);
                return false;
            }

            this.currentVoyageId = voyageId;
            this.segmentCounter = 0;
            this.isRecording = true;

            console.log('🎤 [TRANSCRIPT] ✅ Recording started for voyage:', voyageId);
            return true;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Failed to start recording:', error);
            return false;
        }
    }

    /**
     * Stop voyage recording and trigger analysis
     */
    static async stopVoyageRecording(): Promise<VoiceAnalysisData | null> {
        try {
            if (!this.currentVoyageId || !this.isRecording) {
                console.log('🎤 [TRANSCRIPT] No active recording to stop');
                return null;
            }

            console.log('🎤 [TRANSCRIPT] Stopping recording for voyage:', this.currentVoyageId);

            this.isRecording = false;
            const voyageId = this.currentVoyageId;
            this.currentVoyageId = null;

            // Calculate final statistics
            await this.updateVoyageTranscriptStats(voyageId);

            // Trigger analysis if enabled
            if (this.settings.autoAnalyze) {
                console.log('🎤 [TRANSCRIPT] Starting automatic analysis...');
                return await this.analyzeVoyageTranscript(voyageId);
            }

            return null;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Failed to stop recording:', error);
            return null;
        }
    }

    /**
     * Store a transcript segment
     */
    static async storeTranscriptSegment(
        transcriptText: string,
        confidence: number,
        startTime: Date,
        endTime: Date,
        isInterim: boolean = false,
        isUserSpeech: boolean = true
    ): Promise<boolean> {
        try {
            if (!this.currentVoyageId || !this.isRecording || !this.settings.saveTranscripts) {
                return false;
            }

            const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);

            // Skip very short segments or low confidence non-interim results
            if (durationSeconds < 1 || (!isInterim && confidence < 0.6)) {
                return false;
            }

            // Anonymize if privacy mode is enabled
            const finalText = this.settings.privacyMode
                ? this.anonymizeTranscript(transcriptText)
                : transcriptText;

            const segment: Omit<VoiceTranscriptSegment, 'id' | 'created_at'> = {
                voyage_id: this.currentVoyageId,
                segment_number: this.segmentCounter++,
                transcript_text: finalText,
                confidence_score: confidence,
                start_time: startTime.toISOString(),
                end_time: endTime.toISOString(),
                duration_seconds: durationSeconds,
                is_interim: isInterim,
                is_user_speech: isUserSpeech
            };

            const { error } = await supabase
                .from('voice_transcripts')
                .insert(segment);

            if (error) {
                console.error('🎤 [TRANSCRIPT] Failed to store segment:', error);
                return false;
            }

            console.log('🎤 [TRANSCRIPT] ✅ Stored segment:', {
                segmentNumber: segment.segment_number,
                duration: durationSeconds,
                confidence,
                textLength: finalText.length
            });

            return true;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Error storing segment:', error);
            return false;
        }
    }

    /**
     * Get complete transcript for a voyage
     */
    static async getVoyageTranscript(voyageId: string): Promise<VoiceTranscriptData | null> {
        try {
            const { data, error } = await supabase
                .rpc('get_voyage_voice_transcript', { voyage_id_param: voyageId });

            if (error) {
                console.error('🎤 [TRANSCRIPT] Failed to get transcript:', error);
                return null;
            }

            return data as VoiceTranscriptData;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Error getting transcript:', error);
            return null;
        }
    }

    /**
     * Analyze voyage transcript using AI
     */
    static async analyzeVoyageTranscript(voyageId: string): Promise<VoiceAnalysisData | null> {
        try {
            console.log('🎤 [TRANSCRIPT] Starting AI analysis for voyage:', voyageId);

            // Get transcript data
            const transcriptData = await this.getVoyageTranscript(voyageId);
            if (!transcriptData || !transcriptData.full_text || transcriptData.word_count < 50) {
                console.log('🎤 [TRANSCRIPT] Insufficient transcript data for analysis');
                return null;
            }

            // Get voyage context
            const { data: voyage, error: voyageError } = await supabase
                .from('voyages')
                .select(`
          *,
          destination:destinations(*)
        `)
                .eq('id', voyageId)
                .single();

            if (voyageError || !voyage) {
                console.error('🎤 [TRANSCRIPT] Failed to get voyage context:', voyageError);
                return null;
            }

            const analysisResults: VoiceAnalysisData = {};

            // Run different analysis types
            const analysisTypes = [
                'journey_summary',
                'work_patterns',
                'achievements',
                'mood_analysis',
                'productivity_insights'
            ] as const;

            for (const analysisType of analysisTypes) {
                try {
                    const analysis = await this.performAIAnalysis(
                        transcriptData.full_text,
                        analysisType,
                        voyage,
                        transcriptData
                    );

                    if (analysis) {
                        analysisResults[analysisType] = analysis;

                        // Store analysis in database
                        await supabase
                            .from('voice_analysis')
                            .upsert({
                                voyage_id: voyageId,
                                analysis_type: analysisType,
                                analysis_data: analysis.data,
                                confidence_score: analysis.confidence
                            });
                    }
                } catch (error) {
                    console.warn(`🎤 [TRANSCRIPT] Failed ${analysisType} analysis:`, error);
                }
            }

            console.log('🎤 [TRANSCRIPT] ✅ Analysis complete:', Object.keys(analysisResults));
            return analysisResults;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Analysis failed:', error);
            return null;
        }
    }

    /**
     * Get stored analysis for a voyage
     */
    static async getVoyageAnalysis(voyageId: string): Promise<VoiceAnalysisData | null> {
        try {
            const { data, error } = await supabase
                .rpc('get_voyage_voice_analysis', { voyage_id_param: voyageId });

            if (error) {
                console.error('🎤 [TRANSCRIPT] Failed to get analysis:', error);
                return null;
            }

            return data as VoiceAnalysisData;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Error getting analysis:', error);
            return null;
        }
    }

    /**
     * Update voyage transcript statistics
     */
    private static async updateVoyageTranscriptStats(voyageId: string): Promise<void> {
        try {
            const { data: stats, error } = await supabase
                .from('voice_transcripts')
                .select('duration_seconds, confidence_score')
                .eq('voyage_id', voyageId)
                .eq('is_user_speech', true);

            if (error || !stats?.length) {
                console.warn('🎤 [TRANSCRIPT] No transcript stats to update');
                return;
            }

            const totalDuration = stats.reduce((sum: number, s: { duration_seconds: number; confidence_score: number }) => sum + s.duration_seconds, 0);
            const avgConfidence = stats.reduce((sum: number, s: { duration_seconds: number; confidence_score: number }) => sum + s.confidence_score, 0) / stats.length;

            await supabase
                .from('voyages')
                .update({
                    total_transcript_duration: totalDuration,
                    transcript_confidence_avg: avgConfidence
                })
                .eq('id', voyageId);

            console.log('🎤 [TRANSCRIPT] ✅ Updated stats:', { totalDuration, avgConfidence });
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Failed to update stats:', error);
        }
    }

    /**
 * Perform AI analysis using Gemini
 */
    private static async performAIAnalysis(
        transcript: string,
        analysisType: keyof VoiceAnalysisData,
        voyage: { destination?: { destination_name?: string; description?: string }; actual_duration?: number },
        transcriptData: VoiceTranscriptData
    ): Promise<{ data: unknown; confidence: number; generated_at: string } | null> {
        if (!GeminiService.isConfigured()) {
            console.warn('🎤 [TRANSCRIPT] Gemini not configured, skipping analysis');
            return null;
        }

        const prompts = {
            journey_summary: `
        Analyze this voice transcript from a work session and provide a comprehensive summary.
        
        Context:
        - Destination/Goal: ${voyage.destination?.destination_name || 'Unknown'}
        - Task: ${voyage.destination?.description || 'General work'}
        - Duration: ${Math.floor((voyage.actual_duration || 0) / 60)} hours
        - Speaking time: ${Math.floor(transcriptData.total_duration / 60)} minutes
        
        Transcript:
        ${transcript}
        
        Provide a JSON response with:
        {
          "key_achievements": ["list of main accomplishments mentioned"],
          "main_activities": ["primary work activities identified"],
          "work_patterns": ["patterns in how work was approached"],
          "challenges_discussed": ["problems or obstacles mentioned"],
          "breakthrough_moments": ["moments of insight or progress"],
          "total_speaking_time": ${transcriptData.total_duration},
          "words_spoken": ${transcriptData.word_count}
        }
      `,

            achievements: `
        Extract specific achievements and accomplishments from this work session transcript.
        
        Context: ${voyage.destination?.destination_name || 'Work session'}
        
        Transcript:
        ${transcript}
        
        Provide a JSON response with:
        {
          "completed_tasks": ["specific tasks that were finished"],
          "progress_made": ["areas where progress was made"],
          "learnings": ["new things learned or understood"],
          "decisions_made": ["important decisions or choices made"],
          "problems_solved": ["specific problems that were resolved"],
          "skills_practiced": ["skills that were developed or used"]
        }
      `,

            mood_analysis: `
        Analyze the emotional tone and energy patterns in this work session transcript.
        
        Transcript:
        ${transcript}
        
        Provide a JSON response with:
        {
          "overall_mood": "positive|neutral|negative|mixed",
          "energy_levels": [{"time": "beginning|middle|end", "level": "high|medium|low", "indicators": ["clues from speech"]}],
          "frustration_points": ["moments of frustration or difficulty"],
          "excitement_moments": ["moments of enthusiasm or breakthrough"],
          "stress_indicators": ["signs of stress or pressure"],
          "satisfaction_level": 7
        }
      `
        };

        const prompt = prompts[analysisType as keyof typeof prompts];
        if (!prompt) return null;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        temperature: 0.3,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: 2000
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status}`);
            }

            const data = await response.json();
            const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

            if (!responseText) {
                throw new Error('No response from Gemini');
            }

            // Extract JSON from response
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const analysisData = JSON.parse(jsonMatch[0]);
                return {
                    data: analysisData,
                    confidence: 0.8,
                    generated_at: new Date().toISOString()
                };
            }

            throw new Error('Could not parse JSON response');
        } catch (error) {
            console.error(`🎤 [TRANSCRIPT] ${analysisType} analysis failed:`, error);
            return null;
        }
    }

    /**
     * Anonymize transcript for privacy
     */
    private static anonymizeTranscript(text: string): string {
        return text
            .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]') // Full names
            .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]') // Emails
            .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]') // Phone numbers
            .replace(/\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g, '[CARD]'); // Credit cards
    }

    /**
     * Delete transcript data for privacy
     */
    static async deleteVoyageTranscripts(voyageId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('voice_transcripts')
                .delete()
                .eq('voyage_id', voyageId);

            if (error) {
                console.error('🎤 [TRANSCRIPT] Failed to delete transcripts:', error);
                return false;
            }

            // Also delete analysis
            await supabase
                .from('voice_analysis')
                .delete()
                .eq('voyage_id', voyageId);

            console.log('🎤 [TRANSCRIPT] ✅ Transcripts deleted for voyage:', voyageId);
            return true;
        } catch (error) {
            console.error('🎤 [TRANSCRIPT] Error deleting transcripts:', error);
            return false;
        }
    }

    /**
     * Get recording status
     */
    static getRecordingStatus() {
        return {
            isRecording: this.isRecording,
            currentVoyageId: this.currentVoyageId,
            segmentCounter: this.segmentCounter,
            settings: { ...this.settings }
        };
    }

    /**
     * Update recording settings
     */
    static updateSettings(newSettings: Partial<VoiceRecordingSettings>) {
        this.settings = { ...this.settings, ...newSettings };
        console.log('🎤 [TRANSCRIPT] Settings updated:', this.settings);
    }
} 