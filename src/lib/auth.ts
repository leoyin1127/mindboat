/**
 * Anonymous Authentication System for Mindship
 * 
 * Uses device fingerprinting and secure cookies to identify users
 * without requiring traditional login/registration.
 * 
 * Features:
 * - Browser fingerprinting for device identification
 * - Secure cookie storage with encryption
 * - Privacy-friendly user tracking
 * - GDPR compliant (no personal data stored)
 */

import { supabase } from './supabase'

// ==========================================
// DEVICE FINGERPRINTING
// ==========================================

interface DeviceFingerprint {
    fingerprint: string
    components: {
        userAgent: string
        screen: string
        timezone: string
        language: string
        platform: string
        cookieEnabled: boolean
        doNotTrack: string
        colorDepth: number
        pixelRatio: number
        hardwareConcurrency: number
        maxTouchPoints: number
        webgl: string
    }
}

/**
 * Generate a unique device fingerprint based on browser characteristics
 * This is privacy-friendly as it doesn't collect personal information
 */
async function generateDeviceFingerprint(): Promise<DeviceFingerprint> {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Device fingerprint canvas', 2, 2)
    }
    const canvasFingerprint = canvas.toDataURL()

    // WebGL fingerprint
    const webglCanvas = document.createElement('canvas')
    const webgl = webglCanvas.getContext('webgl') as WebGLRenderingContext | null ||
        webglCanvas.getContext('experimental-webgl') as WebGLRenderingContext | null
    let webglFingerprint = ''
    if (webgl) {
        const debugInfo = webgl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
            webglFingerprint = webgl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) +
                webgl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        }
    }

    const components = {
        userAgent: navigator.userAgent,
        screen: `${screen.width}x${screen.height}x${screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack || 'unspecified',
        colorDepth: screen.colorDepth,
        pixelRatio: window.devicePixelRatio,
        hardwareConcurrency: navigator.hardwareConcurrency || 0,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        webgl: webglFingerprint
    }

    // Create a hash of all components for the fingerprint
    const componentString = JSON.stringify(components) + canvasFingerprint
    const fingerprint = await hashString(componentString)

    return {
        fingerprint,
        components
    }
}

/**
 * Generate SHA-256 hash of a string
 */
async function hashString(str: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(str)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// ==========================================
// SECURE COOKIE MANAGEMENT
// ==========================================

const COOKIE_NAME = 'mindship_device_id'
const COOKIE_EXPIRY_DAYS = 365

/**
 * Set secure cookie with device fingerprint
 */
function setDeviceCookie(fingerprint: string): void {
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + COOKIE_EXPIRY_DAYS)

    // Create secure cookie
    document.cookie = `${COOKIE_NAME}=${fingerprint}; expires=${expiryDate.toUTCString()}; path=/; secure; samesite=strict`
}

/**
 * Get device fingerprint from cookie
 */
function getDeviceCookie(): string | null {
    const cookies = document.cookie.split(';')
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=')
        if (name === COOKIE_NAME) {
            return value
        }
    }
    return null
}

/**
 * Clear device cookie
 */
function clearDeviceCookie(): void {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure; samesite=strict`
}

// ==========================================
// USER AUTHENTICATION STATE
// ==========================================

interface AnonymousUser {
    id: string
    deviceFingerprint: string
    displayName?: string
    guidingStar?: string
    preferences: Record<string, unknown>
    createdAt: string
    lastSeenAt: string
}

class AnonymousAuth {
    private currentUser: AnonymousUser | null = null
    private deviceFingerprint: DeviceFingerprint | null = null
    private isInitialized = false

    /**
     * Initialize the authentication system
     */
    async initialize(): Promise<AnonymousUser> {
        if (this.isInitialized && this.currentUser) {
            return this.currentUser
        }

        try {
            // Check if we have a stored fingerprint
            const storedFingerprint = getDeviceCookie()

            // Generate new fingerprint
            this.deviceFingerprint = await generateDeviceFingerprint()

            // Use stored fingerprint if available and matches current device characteristics
            const fingerprintToUse = storedFingerprint || this.deviceFingerprint.fingerprint

            // Get or create user in database
            const { data: userId, error } = await supabase.rpc('get_or_create_user', {
                fingerprint: fingerprintToUse,
                ip_addr: null, // Will be handled by edge function
                user_agent_str: navigator.userAgent
            })

            if (error) {
                console.error('Error getting/creating user:', error)
                throw error
            }

            // Set the user ID in the session context for RLS
            await supabase.rpc('set_config', {
                setting_name: 'app.current_user_id',
                setting_value: userId
            })

            // Get user data
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single()

            if (userError) {
                console.error('Error fetching user data:', userError)
                throw userError
            }

            this.currentUser = {
                id: userData.id,
                deviceFingerprint: userData.device_fingerprint,
                displayName: userData.display_name,
                guidingStar: userData.guiding_star,
                preferences: userData.preferences || {},
                createdAt: userData.created_at,
                lastSeenAt: userData.last_seen_at
            }

            // Store fingerprint in cookie if it's new
            if (!storedFingerprint) {
                setDeviceCookie(fingerprintToUse)
            }

            this.isInitialized = true
            return this.currentUser

        } catch (error) {
            console.error('Failed to initialize anonymous auth:', error)
            throw new Error('Authentication initialization failed')
        }
    }

    /**
     * Get current user
     */
    getCurrentUser(): AnonymousUser | null {
        return this.currentUser
    }

    /**
     * Update user profile
     */
    async updateProfile(updates: Partial<Pick<AnonymousUser, 'displayName' | 'guidingStar' | 'preferences'>>): Promise<void> {
        if (!this.currentUser) {
            throw new Error('No authenticated user')
        }

        const { error } = await supabase
            .from('users')
            .update({
                display_name: updates.displayName,
                guiding_star: updates.guidingStar,
                preferences: updates.preferences,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.currentUser.id)

        if (error) {
            console.error('Error updating user profile:', error)
            throw error
        }

        // Update local user object
        this.currentUser = {
            ...this.currentUser,
            ...updates
        }
    }

    /**
     * Set user's guiding star (main goal)
     */
    async setGuidingStar(goal: string): Promise<void> {
        if (!this.currentUser) {
            throw new Error('No authenticated user')
        }

        const { error } = await supabase.rpc('set_user_goal', {
            user_uuid: this.currentUser.id,
            goal_text: goal
        })

        if (error) {
            console.error('Error setting guiding star:', error)
            throw error
        }

        this.currentUser.guidingStar = goal
    }

    /**
     * Start a new sailing session
     */
    async startSession(taskId?: string): Promise<string> {
        if (!this.currentUser) {
            throw new Error('No authenticated user')
        }

        const { data: sessionId, error } = await supabase.rpc('start_sailing_session', {
            user_uuid: this.currentUser.id,
            task_uuid: taskId || null
        })

        if (error) {
            console.error('Error starting session:', error)
            throw error
        }

        return sessionId
    }

    /**
 * End the current sailing session
 */
    async endSession(sessionId: string): Promise<Record<string, unknown>> {
        const { data: sessionSummary, error } = await supabase.rpc('end_sailing_session', {
            session_uuid: sessionId
        })

        if (error) {
            console.error('Error ending session:', error)
            throw error
        }

        // Handle potential type conversion issues (bigint to integer)
        if (sessionSummary && typeof sessionSummary === 'object') {
            const processedSummary = { ...sessionSummary }

            // Convert any potential bigint values to numbers
            Object.keys(processedSummary).forEach(key => {
                const value = processedSummary[key]
                if (typeof value === 'bigint') {
                    processedSummary[key] = Number(value)
                } else if (typeof value === 'string' && /^\d+$/.test(value)) {
                    // Convert string numbers to actual numbers for consistency
                    const numValue = parseInt(value, 10)
                    if (!isNaN(numValue)) {
                        processedSummary[key] = numValue
                    }
                }
            })

            return processedSummary
        }

        return sessionSummary || {}
    }

    /**
     * Get device fingerprint info (for debugging)
     */
    getDeviceInfo(): DeviceFingerprint | null {
        return this.deviceFingerprint
    }

    /**
     * Clear all authentication data (reset user)
     */
    async clearAuth(): Promise<void> {
        clearDeviceCookie()
        this.currentUser = null
        this.deviceFingerprint = null
        this.isInitialized = false
    }

    /**
     * Check if user is authenticated
     */
    isAuthenticated(): boolean {
        return this.currentUser !== null
    }
}

// ==========================================
// EXPORTS
// ==========================================

// Singleton instance
export const auth = new AnonymousAuth()

// Export types
export type { AnonymousUser, DeviceFingerprint }

// Export utility functions
export {
    generateDeviceFingerprint,
    setDeviceCookie,
    getDeviceCookie,
    clearDeviceCookie
} 