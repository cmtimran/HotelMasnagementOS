export type ChannelType = 'WHATSAPP' | 'FACEBOOK_PAGE' | 'INSTAGRAM_BUSINESS';
export type MessageSourceType = 'DIRECT_MESSAGE' | 'POST_COMMENT';

export interface InboundMetaEvent {
    channelType: ChannelType;
    sourceType: MessageSourceType;
    accountIdentifier: string; // phone_id, page_id, or ig_id
    senderId: string; // phone number or scoped user ID
    senderName: string;
    text: string;
    postId?: string;
    commentId?: string;
    parentCommentId?: string;
    postUrl?: string;
    timestamp: number;
}

export class MetaOmnichannelService {
    /**
     * Parse inbound Meta webhook payload (handles WhatsApp, FB Messenger, FB Comments, IG DMs, IG Comments)
     */
    static parseWebhookPayload(body: any): InboundMetaEvent[] {
        const events: InboundMetaEvent[] = [];
        if (!body || !body.object) return events;

        const obj = body.object;

        // 1. WhatsApp Business Account Events
        if (obj === 'whatsapp_business_account') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const changes = entry.changes || [];
                for (const change of changes) {
                    const val = change.value;
                    const phoneId = val?.metadata?.phone_number_id;
                    const messages = val?.messages || [];
                    const contacts = val?.contacts || [];

                    for (const msg of messages) {
                        let text = '';
                        if (msg.type === 'text') text = msg.text?.body || '';
                        else if (msg.type === 'interactive') text = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || '';
                        else if (msg.type === 'button') text = msg.button?.text || '';

                        if (text) {
                            const contact = contacts.find((c: any) => c.wa_id === msg.from);
                            events.push({
                                channelType: 'WHATSAPP',
                                sourceType: 'DIRECT_MESSAGE',
                                accountIdentifier: phoneId || '',
                                senderId: msg.from,
                                senderName: contact?.profile?.name || 'WhatsApp Guest',
                                text,
                                timestamp: Number(msg.timestamp) * 1000 || Date.now()
                            });
                        }
                    }
                }
            }
        }

        // 2. Facebook Page Events (Messenger DMs + Post Comments)
        else if (obj === 'page') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const pageId = entry.id;

                // Messenger Direct Messages
                const messaging = entry.messaging || [];
                for (const m of messaging) {
                    if (m.message && m.message.text && !m.message.is_echo) {
                        events.push({
                            channelType: 'FACEBOOK_PAGE',
                            sourceType: 'DIRECT_MESSAGE',
                            accountIdentifier: pageId,
                            senderId: m.sender?.id,
                            senderName: 'Facebook User',
                            text: m.message.text,
                            timestamp: m.timestamp || Date.now()
                        });
                    }
                }

                // Page Feed Comments on Posts / Ads
                const changes = entry.changes || [];
                for (const change of changes) {
                    if (change.field === 'feed') {
                        const val = change.value;
                        // Item comment or reply
                        if (val.item === 'comment' && val.verb === 'add') {
                            events.push({
                                channelType: 'FACEBOOK_PAGE',
                                sourceType: 'POST_COMMENT',
                                accountIdentifier: pageId,
                                senderId: val.from?.id,
                                senderName: val.from?.name || 'Facebook User',
                                text: val.message || '',
                                postId: val.post_id,
                                commentId: val.comment_id,
                                parentCommentId: val.parent_id !== val.post_id ? val.parent_id : undefined,
                                postUrl: val.post?.permalink_url,
                                timestamp: Number(val.created_time) * 1000 || Date.now()
                            });
                        }
                    }
                }
            }
        }

        // 3. Instagram Business Events (DMs + Post / Reel Comments)
        else if (obj === 'instagram') {
            const entries = body.entry || [];
            for (const entry of entries) {
                const igId = entry.id;

                // Instagram DMs
                const messaging = entry.messaging || [];
                for (const m of messaging) {
                    if (m.message && m.message.text && !m.message.is_echo) {
                        events.push({
                            channelType: 'INSTAGRAM_BUSINESS',
                            sourceType: 'DIRECT_MESSAGE',
                            accountIdentifier: igId,
                            senderId: m.sender?.id,
                            senderName: 'Instagram User',
                            text: m.message.text,
                            timestamp: m.timestamp || Date.now()
                        });
                    }
                }

                // Instagram Comments
                const changes = entry.changes || [];
                for (const change of changes) {
                    if (change.field === 'comments') {
                        const val = change.value;
                        if (val && val.text) {
                            events.push({
                                channelType: 'INSTAGRAM_BUSINESS',
                                sourceType: 'POST_COMMENT',
                                accountIdentifier: igId,
                                senderId: val.from?.id,
                                senderName: val.from?.username || 'Instagram User',
                                text: val.text,
                                postId: val.media?.id,
                                commentId: val.id,
                                parentCommentId: val.parent_id,
                                timestamp: Date.now()
                            });
                        }
                    }
                }
            }
        }

        return events;
    }

    /**
     * Dispatch WhatsApp message using specific account's phone ID & access token
     */
    static async sendWhatsAppMessage(
        phoneId: string,
        accessToken: string,
        toPhone: string,
        messageText: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        const formattedPhone = toPhone.replace(/[^0-9]/g, '');
        if (!phoneId || !accessToken) {
            console.log(`[Meta WhatsApp Mock] Phone ${phoneId} -> ${formattedPhone}: "${messageText.slice(0, 60)}..."`);
            return { success: true, messageId: `mock-wa-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/${phoneId}/messages`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    recipient_type: 'individual',
                    to: formattedPhone,
                    type: 'text',
                    text: { preview_url: true, body: messageText }
                })
            });

            const data = await res.json();
            return { success: res.ok, messageId: data.messages?.[0]?.id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Dispatch Facebook Messenger Direct Message
     */
    static async sendFacebookMessenger(
        pageId: string,
        pageAccessToken: string,
        recipientId: string,
        messageText: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        if (!pageAccessToken) {
            console.log(`[Meta Messenger Mock] Page ${pageId} -> ${recipientId}: "${messageText.slice(0, 60)}..."`);
            return { success: true, messageId: `mock-fb-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientId },
                    message: { text: messageText }
                })
            });

            const data = await res.json();
            return { success: res.ok, messageId: data.message_id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Reply to Facebook Post Comment publicly
     */
    static async replyToFacebookComment(
        pageAccessToken: string,
        commentId: string,
        replyText: string
    ): Promise<{ success: boolean; commentId?: string; error?: string }> {
        if (!pageAccessToken) {
            console.log(`[Meta FB Comment Reply Mock] Comment ${commentId}: "${replyText.slice(0, 60)}..."`);
            return { success: true, commentId: `mock-cm-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/${commentId}/comments?access_token=${encodeURIComponent(pageAccessToken)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyText })
            });

            const data = await res.json();
            return { success: res.ok, commentId: data.id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Send Private Reply DM to a Facebook commenter (Meta official lead gen flow)
     */
    static async sendFacebookPrivateReply(
        pageAccessToken: string,
        commentId: string,
        privateText: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        if (!pageAccessToken) {
            console.log(`[Meta FB Private Reply Mock] Comment ${commentId} -> DM: "${privateText.slice(0, 60)}..."`);
            return { success: true, messageId: `mock-pr-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { comment_id: commentId },
                    message: { text: privateText }
                })
            });

            const data = await res.json();
            return { success: res.ok, messageId: data.message_id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Dispatch Instagram Direct Message (DM)
     */
    static async sendInstagramDirectMessage(
        igAccountId: string,
        pageAccessToken: string,
        recipientIgId: string,
        messageText: string
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        if (!pageAccessToken) {
            console.log(`[Meta IG DM Mock] IG ${igAccountId} -> ${recipientIgId}: "${messageText.slice(0, 60)}..."`);
            return { success: true, messageId: `mock-ig-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${encodeURIComponent(pageAccessToken)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { id: recipientIgId },
                    message: { text: messageText }
                })
            });

            const data = await res.json();
            return { success: res.ok, messageId: data.message_id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }

    /**
     * Reply to Instagram Media / Reel Comment publicly
     */
    static async replyToInstagramComment(
        pageAccessToken: string,
        commentId: string,
        replyText: string
    ): Promise<{ success: boolean; commentId?: string; error?: string }> {
        if (!pageAccessToken) {
            console.log(`[Meta IG Comment Reply Mock] Comment ${commentId}: "${replyText.slice(0, 60)}..."`);
            return { success: true, commentId: `mock-igc-${Date.now()}` };
        }

        try {
            const url = `https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${encodeURIComponent(pageAccessToken)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyText })
            });

            const data = await res.json();
            return { success: res.ok, commentId: data.id, error: data.error?.message };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    }
}
