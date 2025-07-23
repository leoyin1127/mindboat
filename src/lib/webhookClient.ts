// Webhook client helper that automatically includes user context
import { AnonymousUser } from './auth';

interface WebhookOptions {
  endpoint: string;
  payload?: any;
  currentUser?: AnonymousUser | null;
}

export class WebhookClient {
  private baseUrl: string;
  private authToken: string;

  constructor() {
    this.baseUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    this.authToken = import.meta.env.VITE_SUPABASE_ANON_KEY;
  }

  async call({ endpoint, payload = {}, currentUser }: WebhookOptions) {
    try {
      // Automatically include user_id in payload
      const enhancedPayload = {
        ...payload,
        user_id: currentUser?.id,
        device_fingerprint: currentUser?.deviceFingerprint,
        timestamp: new Date().toISOString()
      };

      console.log('🚀 Calling webhook:', endpoint, 'with payload:', enhancedPayload);
      console.log('🔗 URL:', `${this.baseUrl}/${endpoint}`);
      console.log('👤 Current user:', currentUser?.id);

      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`,
          'x-user-id': currentUser?.id || '', // Also send as header
        },
        body: JSON.stringify(enhancedPayload)
      });

      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Webhook error response:', errorText);
        throw new Error(`Webhook ${endpoint} failed: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Webhook success:', result);
      return result;
    } catch (error) {
      console.error('❌ Webhook client error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const webhookClient = new WebhookClient();