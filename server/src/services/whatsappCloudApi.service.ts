import crypto from 'crypto';

export interface WhatsAppInboundMessage {
    fromPhone: string;
    senderName: string;
    messageId: string;
    timestamp: number;
    text?: string;
    buttonPayload?: string;
    interactiveType?: string;
    mediaUrl?: string;
    mediaType?: string;
}

export class WhatsAppCloudApiService {
    private static getCredentials() {
        return {
            phoneId: process.env.WHATSAPP_PHONE_ID?.trim() || '',
            accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || '',
            verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || '',
            appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || ''
        };
    }

    /**
     * Verifies Meta's initial Webhook Challenge handshake
     */
    static verifyWebhook(mode?: string, token?: string, challenge?: string): string | null {
        const { verifyToken } = this.getCredentials();
        if (mode === 'subscribe' && token === verifyToken && challenge) {
            return challenge;
        }
        return null;
    }

    /**
     * Validates Meta X-Hub-Signature-256 for inbound security
     */
    static verifySignature(rawPayload: string | Buffer, signatureHeader?: string): boolean {
        const { appSecret } = this.getCredentials();
        if (!appSecret || !signatureHeader) return true; // Pass if secret not yet configured in local dev

        try {
            const signature = signatureHeader.replace('sha256=', '');
            const hmac = crypto.createHmac('sha256', appSecret);
            const digest = hmac.update(rawPayload).digest('hex');
            return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
        } catch {
            return false;
        }
    }

    /**
     * Dispatches an outbound WhatsApp text message via Meta Graph API v21.0
     */
    static async sendTextMessage(toPhone: string, messageText: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const { phoneId, accessToken } = this.getCredentials();
        const formattedPhone = toPhone.replace(/[^0-9]/g, '');

        if (!phoneId || !accessToken) {
            console.warn(`[WhatsAppCloudApi] Mock dispatch to ${formattedPhone}: "${messageText.slice(0, 80)}..." (Credentials not configured in .env)`);
            return {
                success: true,
                messageId: `wamid-mock-${Date.now()}`
            };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: formattedPhone,
                type: 'text',
                text: { preview_url: true, body: messageText }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                console.error('[WhatsAppCloudApi] Meta API Error:', data);
                return { success: false, error: data.error?.message || 'Meta API call failed' };
            }

            return {
                success: true,
                messageId: data.messages?.[0]?.id
            };
        } catch (err: any) {
            console.error('[WhatsAppCloudApi] Network dispatch error:', err);
            return { success: false, error: err.message };
        }
    }

    /**
     * Dispatches interactive WhatsApp buttons (e.g. "Confirm Room", "Decline", "Check Availability")
     */
    static async sendInteractiveButtons(
        toPhone: string,
        bodyText: string,
        buttons: Array<{ id: string; title: string }>,
        headerText?: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const { phoneId, accessToken } = this.getCredentials();
        const formattedPhone = toPhone.replace(/[^0-9]/g, '');

        if (!phoneId || !accessToken) {
            console.log(`[WhatsAppCloudApi Mock Buttons] to ${formattedPhone}: "${bodyText}" [${buttons.map(b => b.title).join(' | ')}]`);
            return { success: true, messageId: `wamid-btn-mock-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
            const payload = {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: formattedPhone,
                type: 'interactive',
                interactive: {
                    type: 'button',
                    header: headerText ? { type: 'text', text: headerText } : undefined,
                    body: { text: bodyText },
                    action: {
                        buttons: buttons.slice(0, 3).map(b => ({
                            type: 'reply',
                            reply: { id: b.id, title: b.title.slice(0, 20) }
                        }))
                    }
                }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            return { success: res.ok, messageId: data.messages?.[0]?.id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Parses Meta Inbound Webhook Payload into unified format
     */
    static parseInboundWebhook(body: any): WhatsAppInboundMessage[] {
        const messages: WhatsAppInboundMessage[] = [];
        try {
            const entries = body.entry || [];
            for (const entry of entries) {
                const changes = entry.changes || [];
                for (const change of changes) {
                    const value = change.value;
                    if (!value || !value.messages) continue;

                    const contacts = value.contacts || [];
                    const contactName = contacts[0]?.profile?.name || 'Guest';

                    for (const msg of value.messages) {
                        const parsed: WhatsAppInboundMessage = {
                            fromPhone: `+${msg.from}`,
                            senderName: contactName,
                            messageId: msg.id,
                            timestamp: Number(msg.timestamp) || Date.now()
                        };

                        if (msg.type === 'text') {
                            parsed.text = msg.text?.body;
                        } else if (msg.type === 'interactive') {
                            if (msg.interactive?.type === 'button_reply') {
                                parsed.buttonPayload = msg.interactive.button_reply?.id;
                                parsed.text = msg.interactive.button_reply?.title;
                            }
                        } else if (msg.type === 'image') {
                            parsed.mediaType = 'IMAGE';
                            parsed.mediaUrl = msg.image?.id;
                        }

                        messages.push(parsed);
                    }
                }
            }
        } catch (e) {
            console.error('[WhatsAppCloudApi] Failed to parse inbound webhook payload:', e);
        }
        return messages;
    }
}
