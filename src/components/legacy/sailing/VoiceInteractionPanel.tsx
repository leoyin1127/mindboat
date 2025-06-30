/**
 * Voice Interaction Panel Component
 * 
 * Provides UI for voice interactions including distraction alerts,
 * exploration mode, and inspiration capture with visual feedback.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, VolumeX, MessageCircle, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { VoiceService } from '../../services/VoiceService';
import { ElevenLabsService } from '../../services/ElevenLabsService';

interface VoiceInteractionPanelProps {
  isVisible: boolean;
  isExploring: boolean;
  onVoiceResponse?: (response: 'return_to_course' | 'exploring') => void;
  onInspirationCaptured?: (content: string, type: 'voice' | 'text') => void;
  className?: string;
}

export const VoiceInteractionPanel: React.FC<VoiceInteractionPanelProps> = ({
  isVisible,
  isExploring,
  onVoiceResponse,
  onInspirationCaptured,
  className = ''
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(VoiceService.getStatus());
  const [lastTranscript, setLastTranscript] = useState('');
  const [isCapturingInspiration, setIsCapturingInspiration] = useState(false);

  // Initialize voice service on mount
  useEffect(() => {
    const initializeVoice = async () => {
      await VoiceService.initialize();
      setVoiceStatus(VoiceService.getStatus());
    };

    initializeVoice();
  }, []);

  // Update voice status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setVoiceStatus(VoiceService.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVoiceCapture = async () => {
    if (isListening) {
      VoiceService.stopListening();
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      setIsCapturingInspiration(true);
      
      const inspiration = await VoiceService.captureVoiceInspiration();
      
      if (inspiration && onInspirationCaptured) {
        onInspirationCaptured(inspiration, 'voice');
        setLastTranscript(inspiration);
      }
    } catch (error) {
      console.error('Voice capture failed:', error);
    } finally {
      setIsListening(false);
      setIsCapturingInspiration(false);
    }
  };

  const handleTestVoice = async () => {
    try {
      setIsSpeaking(true);
      await ElevenLabsService.speakDistractionAlert('tab_switch');
    } catch (error) {
      console.error('Test voice failed:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-20 right-4 z-40 ${className}`}
    >
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-lg max-w-sm">
        <div className="space-y-4">
          {/* Voice Status Indicator */}
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-800 text-sm">AI语音助手</h3>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                voiceStatus.features.fullFeatures ? 'bg-green-400' : 
                voiceStatus.features.speechRecognition ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-xs text-gray-600">
                {voiceStatus.features.fullFeatures ? '完全可用' : 
                 voiceStatus.features.speechRecognition ? '部分可用' : '不可用'}
              </span>
            </div>
          </div>

          {/* Voice Interaction Buttons */}
          <div className="space-y-3">
            {/* Inspiration Capture */}
            <Button
              onClick={handleVoiceCapture}
              disabled={!voiceStatus.features.speechRecognition || isSpeaking}
              className={`w-full ${isListening ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              size="sm"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  停止录音
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  语音记录灵感
                </>
              )}
            </Button>

            {/* Test Voice */}
            {voiceStatus.features.elevenLabs && (
              <Button
                onClick={handleTestVoice}
                disabled={isSpeaking || isListening}
                variant="outline"
                className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                size="sm"
              >
                {isSpeaking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    AI正在说话...
                  </>
                ) : (
                  <>
                    <Volume2 className="w-4 h-4 mr-2" />
                    测试AI语音
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-blue-100 p-3 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="w-3 h-3 bg-red-500 rounded-full"
                  />
                  <span className="text-sm text-blue-800">
                    {isCapturingInspiration ? '正在录制灵感...' : '正在聆听...'}
                  </span>
                </div>
              </motion.div>
            )}

            {isSpeaking && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-green-100 p-3 rounded-lg"
              >
                <div className="flex items-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Volume2 className="w-4 h-4 text-green-600" />
                  </motion.div>
                  <span className="text-sm text-green-800">AI正在回应...</span>
                </div>
              </motion.div>
            )}

            {lastTranscript && !isListening && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-gray-100 p-3 rounded-lg"
              >
                <p className="text-xs text-gray-600 mb-1">最近录制:</p>
                <p className="text-sm text-gray-800">{lastTranscript}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feature Status */}
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>语音识别:</span>
              <span className={voiceStatus.features.speechRecognition ? 'text-green-600' : 'text-red-600'}>
                {voiceStatus.features.speechRecognition ? '✓' : '✗'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>AI语音:</span>
              <span className={voiceStatus.features.elevenLabs ? 'text-green-600' : 'text-red-600'}>
                {voiceStatus.features.elevenLabs ? '✓' : '✗'}
              </span>
            </div>
            {!voiceStatus.features.elevenLabs && (
              <p className="text-yellow-600 text-xs mt-2">
                💡 添加 VITE_ELEVENLABS_API_KEY 到 .env 文件以启用AI语音
              </p>
            )}
          </div>

          {/* Exploration Mode Indicator */}
          {isExploring && (
            <div className="bg-purple-100 p-3 rounded-lg border border-purple-200">
              <div className="flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm text-purple-800 font-medium">勘探模式已激活</span>
              </div>
              <p className="text-xs text-purple-600 mt-1">
                随时说出"返回"来回到主航道
              </p>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
};