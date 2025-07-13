import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Check, X, AlertCircle } from 'lucide-react';

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
            // If user hasn't requested screen sharing yet, it's unknown
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

    const getPermissionStatus = (status: string) => {
        switch (status) {
            case 'granted':
                return { color: 'text-green-400', bg: 'bg-green-400/20 border-green-400/30', icon: Check };
            case 'denied':
                return { color: 'text-red-400', bg: 'bg-red-400/20 border-red-400/30', icon: X };
            default:
                return { color: 'text-yellow-400', bg: 'bg-yellow-400/20 border-yellow-400/30', icon: AlertCircle };
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

    const canStartSailing = hasEssentialPermissions;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}></div>

            {/* Panel */}
            <div className="relative bg-gradient-to-br from-slate-800/95 via-slate-700/90 to-slate-900/95 
                      backdrop-blur-2xl border border-white/25 rounded-3xl p-8 max-w-md w-full mx-4
                      shadow-[0_8px_32px_rgba(0,0,0,0.3)]">

                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-playfair font-medium text-white mb-2">
                        Media Permissions
                    </h2>
                    <p className="text-white/70 text-sm font-inter">
                        Grant access to enable all sailing session features
                    </p>
                </div>

                {/* Permission Items */}
                <div className="space-y-4 mb-6">
                    {/* Microphone - Required */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getPermissionStatus(permissions.microphone).bg}`}>
                                {getPermissionIcon(permissions.microphone, 'microphone')}
                            </div>
                            <div>
                                <div className="text-white font-inter font-medium flex items-center gap-2">
                                    Microphone
                                    <span className="text-red-400 text-xs font-normal">Required</span>
                                </div>
                                <div className="text-white/60 text-xs">
                                    {getPermissionText(permissions.microphone)} • Voice input & AI interaction
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${getPermissionStatus(permissions.microphone).color}`}>
                                {React.createElement(getPermissionStatus(permissions.microphone).icon, { className: "w-4 h-4" })}
                            </div>
                            {permissions.microphone !== 'granted' && (
                                <button
                                    onClick={() => requestPermission('microphone')}
                                    disabled={isRequesting}
                                    className="text-xs px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-400 
                                             rounded-lg hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                                >
                                    {isRequesting ? 'Requesting...' : 'Grant'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Camera - Optional */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getPermissionStatus(permissions.camera).bg}`}>
                                {getPermissionIcon(permissions.camera, 'camera')}
                            </div>
                            <div>
                                <div className="text-white font-inter font-medium flex items-center gap-2">
                                    Camera
                                    <span className="text-yellow-400 text-xs font-normal">Optional</span>
                                </div>
                                <div className="text-white/60 text-xs">
                                    {getPermissionText(permissions.camera)} • Focus monitoring & drift detection
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${getPermissionStatus(permissions.camera).color}`}>
                                {React.createElement(getPermissionStatus(permissions.camera).icon, { className: "w-4 h-4" })}
                            </div>
                            {permissions.camera !== 'granted' && (
                                <button
                                    onClick={() => requestPermission('camera')}
                                    disabled={isRequesting}
                                    className="text-xs px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-400 
                                             rounded-lg hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                                >
                                    {isRequesting ? 'Requesting...' : 'Grant'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Screen Share - Optional */}
                    <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/20">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getPermissionStatus(permissions.screen).bg}`}>
                                {getPermissionIcon(permissions.screen, 'screen')}
                            </div>
                            <div>
                                <div className="text-white font-inter font-medium flex items-center gap-2">
                                    Screen Sharing
                                    <span className="text-yellow-400 text-xs font-normal">Optional</span>
                                </div>
                                <div className="text-white/60 text-xs">
                                    {getPermissionText(permissions.screen)} • Activity monitoring & context awareness
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`p-1 rounded-full ${getPermissionStatus(permissions.screen).color}`}>
                                {React.createElement(getPermissionStatus(permissions.screen).icon, { className: "w-4 h-4" })}
                            </div>
                            {permissions.screen !== 'granted' && (
                                <button
                                    onClick={() => requestPermission('screen')}
                                    disabled={isRequesting}
                                    className="text-xs px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-400 
                                             rounded-lg hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                                >
                                    {isRequesting ? 'Requesting...' : 'Grant'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-3 bg-gradient-to-br from-red-500/20 via-red-400/15 to-red-600/25 
                          backdrop-blur-md rounded-xl border border-red-400/30">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-400" />
                            <span className="text-red-100 font-inter text-sm">{error}</span>
                        </div>
                    </div>
                )}

                {/* Permission Summary */}
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-400/20">
                    <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1 rounded-full ${hasEssentialPermissions ? 'text-green-400' : 'text-yellow-400'}`}>
                            {hasEssentialPermissions ?
                                <Check className="w-4 h-4" /> :
                                <AlertCircle className="w-4 h-4" />
                            }
                        </div>
                        <span className="text-white font-inter font-medium text-sm">
                            {hasEssentialPermissions ? 'Ready to sail!' : 'Microphone required to start'}
                        </span>
                    </div>
                    <div className="text-white/60 text-xs">
                        {hasAllPermissions ?
                            'All permissions granted. Full functionality available.' :
                            hasEssentialPermissions ?
                                'Essential permissions granted. Optional features may be limited.' :
                                'Please grant microphone access to begin your sailing session.'
                        }
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {!hasEssentialPermissions && (
                        <button
                            onClick={requestAllPermissions}
                            disabled={isRequesting}
                            className="flex-1 bg-gradient-to-r from-blue-500/30 to-blue-600/30 
                                     hover:from-blue-500/40 hover:to-blue-600/40 
                                     text-white font-inter font-medium py-3 px-6 rounded-xl 
                                     border border-blue-400/30 transition-all duration-300 
                                     disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isRequesting ? 'Requesting Permissions...' : 'Grant All Permissions'}
                        </button>
                    )}

                    {canStartSailing && (
                        <button
                            onClick={onClose}
                            className="flex-1 bg-gradient-to-r from-green-500/30 to-green-600/30 
                                     hover:from-green-500/40 hover:to-green-600/40 
                                     text-white font-inter font-medium py-3 px-6 rounded-xl 
                                     border border-green-400/30 transition-all duration-300"
                        >
                            Start Sailing
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="bg-gradient-to-br from-white/10 to-white/5 
                                 hover:from-white/15 hover:to-white/10 
                                 text-white/80 hover:text-white font-inter font-medium 
                                 py-3 px-6 rounded-xl border border-white/20 
                                 transition-all duration-300"
                    >
                        {canStartSailing ? 'Close' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
    );
}; 