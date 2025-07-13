import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, AlertCircle, Lock, Unlock } from 'lucide-react';

interface PermissionStatus {
    microphone: 'granted' | 'denied' | 'prompt' | 'unknown';
    camera: 'granted' | 'denied' | 'prompt' | 'unknown';
    screen: 'granted' | 'denied' | 'prompt' | 'unknown';
}

interface PermissionPanelProps {
    isVisible: boolean;
    onClose?: () => void;
    onPermissionsGranted?: (hasAllPermissions: boolean) => void;
}

export const PermissionPanel: React.FC<PermissionPanelProps> = ({
    isVisible,
    onClose,
    onPermissionsGranted
}) => {
    const [permissions, setPermissions] = useState<PermissionStatus>({
        microphone: 'unknown',
        camera: 'unknown',
        screen: 'unknown'
    });
    const [isRequesting, setIsRequesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasRequestedScreen, setHasRequestedScreen] = useState(false);

    // Check current permission status
    const checkPermissions = async () => {
        try {
            // Check microphone permission
            try {
                const micPermission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                setPermissions(prev => ({ ...prev, microphone: micPermission.state }));
            } catch (error) {
                console.warn('Could not check microphone permission:', error);
                setPermissions(prev => ({ ...prev, microphone: 'unknown' }));
            }

            // Check camera permission
            try {
                const cameraPermission = await navigator.permissions.query({ name: 'camera' as PermissionName });
                setPermissions(prev => ({ ...prev, camera: cameraPermission.state }));
            } catch (error) {
                console.warn('Could not check camera permission:', error);
                setPermissions(prev => ({ ...prev, camera: 'unknown' }));
            }

            // Screen sharing permission can't be queried - we track if user has granted it
            if (!hasRequestedScreen) {
                setPermissions(prev => ({ ...prev, screen: 'unknown' }));
            }
        } catch (error) {
            console.warn('Error checking permissions:', error);
        }
    };

    // Request specific permission
    const requestPermission = async (type: 'microphone' | 'camera' | 'screen') => {
        if (isRequesting) return;

        setIsRequesting(true);
        setError(null);

        try {
            let stream: MediaStream | null = null;

            if (type === 'microphone') {
                stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    }
                });
                setPermissions(prev => ({ ...prev, microphone: 'granted' }));
            } else if (type === 'camera') {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                });
                setPermissions(prev => ({ ...prev, camera: 'granted' }));
            } else if (type === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        width: { max: 1920 },
                        height: { max: 1080 },
                        frameRate: { max: 30 }
                    },
                    audio: false
                });
                setPermissions(prev => ({ ...prev, screen: 'granted' }));
                setHasRequestedScreen(true);
            }

            // Clean up stream immediately
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }

            console.log(`${type} permission granted successfully`);
        } catch (error) {
            console.error(`Error requesting ${type} permission:`, error);
            setPermissions(prev => ({ ...prev, [type]: 'denied' }));

            if (type === 'screen') {
                setHasRequestedScreen(true);
            }

            // Set user-friendly error messages
            if (type === 'microphone') {
                setError('Microphone access is required for sailing sessions. Please allow microphone access in your browser settings.');
            } else if (type === 'camera') {
                setError('Camera access was denied. This is optional but helps with focus monitoring.');
            } else if (type === 'screen') {
                setError('Screen sharing was denied. This is optional but helps with activity monitoring.');
            }
        } finally {
            setIsRequesting(false);
        }
    };

    // Request all permissions sequentially
    const requestAllPermissions = async () => {
        if (isRequesting) return;

        setError(null);

        // Request microphone first (required)
        if (permissions.microphone !== 'granted') {
            await requestPermission('microphone');
        }

        // Request camera (optional)
        if (permissions.camera !== 'granted') {
            await requestPermission('camera');
        }

        // Request screen sharing (optional)
        if (permissions.screen !== 'granted') {
            await requestPermission('screen');
        }
    };

    // Check if we have essential permissions (microphone is required)
    const hasEssentialPermissions = permissions.microphone === 'granted';

    // Check if we have all possible permissions
    const hasAllPermissions = permissions.microphone === 'granted' &&
        permissions.camera === 'granted' &&
        permissions.screen === 'granted';

    // Update parent component when permissions change
    useEffect(() => {
        if (isVisible) {
            checkPermissions();
        }
    }, [isVisible, hasRequestedScreen]);

    // Notify parent about permission status changes
    useEffect(() => {
        onPermissionsGranted?.(hasEssentialPermissions);
    }, [hasEssentialPermissions, onPermissionsGranted]);

    if (!isVisible) return null;

    const getPermissionIcon = (status: string, type: 'microphone' | 'camera' | 'screen') => {
        const icons = {
            microphone: { granted: Mic, denied: MicOff, default: Mic },
            camera: { granted: Video, denied: VideoOff, default: Video },
            screen: { granted: Monitor, denied: MonitorOff, default: Monitor }
        };

        const IconComponent = status === 'granted' ? icons[type].granted :
            status === 'denied' ? icons[type].denied :
                icons[type].default;

        return <IconComponent className="w-5 h-5" />;
    };

    const getPermissionStatusColor = (status: string) => {
        switch (status) {
            case 'granted':
                return 'text-green-400';
            case 'denied':
                return 'text-red-400';
            default:
                return 'text-yellow-400';
        }
    };

    const getPermissionStatusBg = (status: string) => {
        switch (status) {
            case 'granted':
                return 'bg-green-400/20 border-green-400/30';
            case 'denied':
                return 'bg-red-400/20 border-red-400/30';
            default:
                return 'bg-yellow-400/20 border-yellow-400/30';
        }
    };

    const getPermissionText = (status: string) => {
        switch (status) {
            case 'granted':
                return 'Granted';
            case 'denied':
                return 'Denied';
            case 'prompt':
                return 'Needs permission';
            default:
                return 'Unknown';
        }
    };

    return (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-[600px]">
            {/* Enhanced glass panel with sophisticated design system */}
            <div className="relative bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 
                          backdrop-blur-2xl border border-white/25 rounded-3xl p-8
                          shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_16px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15)]
                          before:absolute before:inset-0 before:rounded-3xl 
                          before:bg-gradient-to-br before:from-slate-400/10 before:via-transparent before:to-transparent 
                          before:pointer-events-none overflow-hidden">

                {/* Inner glow overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 via-transparent to-transparent 
                              rounded-3xl pointer-events-none" />

                {/* Content */}
                <div className="relative z-10">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <div className="bg-gradient-to-br from-slate-500/20 via-slate-400/15 to-slate-600/25 
                                          backdrop-blur-md rounded-2xl p-3 border border-white/25">
                                <Lock className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-playfair font-medium text-white">
                                Media Permissions
                            </h2>
                        </div>
                        <p className="text-white/70 text-sm font-inter">
                            Grant access to enable all sailing session features
                        </p>
                    </div>

                    {/* Permission Items */}
                    <div className="space-y-4 mb-8">
                        {/* Microphone - Required */}
                        <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/3 
                                      backdrop-blur-lg border border-white/20 rounded-2xl p-5
                                      shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl border backdrop-blur-md ${getPermissionStatusBg(permissions.microphone)}`}>
                                        {getPermissionIcon(permissions.microphone, 'microphone')}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white font-inter font-medium">Microphone</span>
                                            <span className="px-2 py-1 text-xs font-inter bg-red-400/20 text-red-400 
                                                           rounded-full border border-red-400/30">
                                                Required
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white/60">
                                            <span className={getPermissionStatusColor(permissions.microphone)}>
                                                {getPermissionText(permissions.microphone)}
                                            </span>
                                            <span>•</span>
                                            <span>Voice input & AI interaction</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => requestPermission('microphone')}
                                    disabled={isRequesting || permissions.microphone === 'granted'}
                                    className="bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                                             backdrop-blur-md border border-white/25 hover:from-white/20 
                                             hover:via-white/15 hover:to-white/12 hover:border-white/35 
                                             text-white/90 hover:text-white rounded-xl px-4 py-2 
                                             transition-all duration-300 font-inter font-medium text-sm
                                             disabled:opacity-50 disabled:cursor-not-allowed
                                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]"
                                >
                                    {permissions.microphone === 'granted' ? 'Granted' : 'Allow'}
                                </button>
                            </div>
                        </div>

                        {/* Camera - Optional */}
                        <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/3 
                                      backdrop-blur-lg border border-white/20 rounded-2xl p-5
                                      shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl border backdrop-blur-md ${getPermissionStatusBg(permissions.camera)}`}>
                                        {getPermissionIcon(permissions.camera, 'camera')}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white font-inter font-medium">Camera</span>
                                            <span className="px-2 py-1 text-xs font-inter bg-white/10 text-white/60 
                                                           rounded-full border border-white/20">
                                                Optional
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white/60">
                                            <span className={getPermissionStatusColor(permissions.camera)}>
                                                {getPermissionText(permissions.camera)}
                                            </span>
                                            <span>•</span>
                                            <span>Focus monitoring & insights</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => requestPermission('camera')}
                                    disabled={isRequesting || permissions.camera === 'granted'}
                                    className="bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                                             backdrop-blur-md border border-white/25 hover:from-white/20 
                                             hover:via-white/15 hover:to-white/12 hover:border-white/35 
                                             text-white/90 hover:text-white rounded-xl px-4 py-2 
                                             transition-all duration-300 font-inter font-medium text-sm
                                             disabled:opacity-50 disabled:cursor-not-allowed
                                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]"
                                >
                                    {permissions.camera === 'granted' ? 'Granted' : 'Allow'}
                                </button>
                            </div>
                        </div>

                        {/* Screen Sharing - Optional */}
                        <div className="bg-gradient-to-br from-white/10 via-white/5 to-white/3 
                                      backdrop-blur-lg border border-white/20 rounded-2xl p-5
                                      shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-xl border backdrop-blur-md ${getPermissionStatusBg(permissions.screen)}`}>
                                        {getPermissionIcon(permissions.screen, 'screen')}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="text-white font-inter font-medium">Screen Sharing</span>
                                            <span className="px-2 py-1 text-xs font-inter bg-white/10 text-white/60 
                                                           rounded-full border border-white/20">
                                                Optional
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-white/60">
                                            <span className={getPermissionStatusColor(permissions.screen)}>
                                                {getPermissionText(permissions.screen)}
                                            </span>
                                            <span>•</span>
                                            <span>Activity monitoring & context</span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => requestPermission('screen')}
                                    disabled={isRequesting || permissions.screen === 'granted'}
                                    className="bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                                             backdrop-blur-md border border-white/25 hover:from-white/20 
                                             hover:via-white/15 hover:to-white/12 hover:border-white/35 
                                             text-white/90 hover:text-white rounded-xl px-4 py-2 
                                             transition-all duration-300 font-inter font-medium text-sm
                                             disabled:opacity-50 disabled:cursor-not-allowed
                                             shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]"
                                >
                                    {permissions.screen === 'granted' ? 'Granted' : 'Allow'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-400/20 border border-red-400/30 rounded-2xl 
                                      backdrop-blur-md flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                            <p className="text-red-400 text-sm font-inter">{error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between gap-4">
                        <button
                            onClick={onClose}
                            className="bg-gradient-to-br from-white/15 via-white/10 to-white/8 
                                     backdrop-blur-md border border-white/25 hover:from-white/20 
                                     hover:via-white/15 hover:to-white/12 hover:border-white/35 
                                     text-white/90 hover:text-white rounded-xl px-6 py-3 
                                     transition-all duration-300 font-inter font-medium
                                     shadow-[0_4px_16px_rgba(0,0,0,0.1),0_1px_4px_rgba(0,0,0,0.06)]"
                        >
                            {hasEssentialPermissions ? 'Continue' : 'Skip'}
                        </button>

                        {!hasAllPermissions && (
                            <button
                                onClick={requestAllPermissions}
                                disabled={isRequesting}
                                className="bg-gradient-to-r from-blue-400/30 to-purple-400/30 
                                         hover:from-blue-400/40 hover:to-purple-400/40 
                                         text-white rounded-xl px-6 py-3 
                                         transition-all duration-300 font-inter font-medium
                                         shadow-[0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] 
                                         backdrop-blur-md border border-white/25
                                         disabled:opacity-50 disabled:cursor-not-allowed
                                         flex items-center gap-2"
                            >
                                <Unlock className="w-4 h-4" />
                                {isRequesting ? 'Requesting...' : 'Allow All'}
                            </button>
                        )}
                    </div>

                    {/* Status Summary */}
                    <div className="mt-6 pt-6 border-t border-white/20">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-white/60 font-inter">
                                Permissions Status
                            </span>
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${hasEssentialPermissions ? 'bg-green-400' : 'bg-red-400'}`} />
                                <span className={`font-inter ${hasEssentialPermissions ? 'text-green-400' : 'text-red-400'}`}>
                                    {hasEssentialPermissions ? 'Ready to sail' : 'Microphone required'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}; 