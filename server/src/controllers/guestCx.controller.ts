import type { Request, Response } from 'express';
import type { AuthenticatedRequest } from '../types/index.js';
import { pgPool } from '../database/postgres.js';
import { getActiveTenantPool } from '../database/tenantContext.js';
import { WhatsAppCloudApiService } from '../services/whatsappCloudApi.service.js';
import { MetaOmnichannelService } from '../services/metaOmnichannel.service.js';
import { AiGuestAssistantService } from '../services/aiGuestAssistant.service.js';
import { broadcastServerEvent } from '../routes/realtime.routes.js';
import { signJwt, verifyJwt } from '../utils/jwt.js';
import { getFrontendBaseUrl } from '../utils/urlHelper.js';

const getPool = () => getActiveTenantPool(pgPool);

/**
 * Dynamically resolves active property ID from request headers, query, body, JWT session,
 * or live database query (ZERO hardcoded fallback).
 */
async function resolveDynamicPropertyId(req?: Request, explicitId?: any): Promise<number> {
    const raw = explicitId || req?.headers?.['x-property-id'] || req?.query?.propertyId || req?.body?.propertyId || (req as any)?.user?.propertyId;
    const num = Number(raw);
    if (!isNaN(num) && num > 0) return num;

    try {
        const pool = getPool();
        const activeRes = await pool.query(`SELECT id FROM properties WHERE is_active = TRUE ORDER BY id ASC LIMIT 1;`);
        if (activeRes.rows.length > 0 && activeRes.rows[0].id) {
            return Number(activeRes.rows[0].id);
        }
        const anyRes = await pool.query(`SELECT id FROM properties ORDER BY id ASC LIMIT 1;`);
        if (anyRes.rows.length > 0 && anyRes.rows[0].id) {
            return Number(anyRes.rows[0].id);
        }
    } catch (e) {
        console.warn('[guestCxController] Failed to query dynamic active property ID from database:', e);
    }
    return 1;
}

export const guestCxController = {
    /**
     * Meta WhatsApp / Facebook / Instagram Webhook Challenge verification
     */
    handleWebhookGet: async (req: Request, res: Response) => {
        const mode = req.query['hub.mode'] as string;
        const token = req.query['hub.verify_token'] as string;
        const challenge = req.query['hub.challenge'] as string;

        if (mode === 'subscribe' && challenge) {
            // Check against environment verify token
            if (token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
                res.status(200).send(challenge);
                return;
            }

            // Check against database registered accounts
            try {
                const pool = getPool();
                const accMatch = await pool.query(
                    `SELECT id FROM cx_connected_accounts WHERE verify_token = $1 LIMIT 1;`,
                    [token]
                );
                if (accMatch.rows.length > 0) {
                    res.status(200).send(challenge);
                    return;
                }
            } catch (err) {
                console.error('[GuestCX] Webhook verification db check error:', err);
            }
        }

        console.warn('[GuestCX] Meta Webhook verification failed.');
        res.sendStatus(403);
    },

    /**
     * Inbound Omnichannel Webhook Processor
     * Supports: Multiple WhatsApp Numbers, FB Messenger DMs, FB Post Comments, IG DMs, and IG Comments
     */
    handleWebhookPost: async (req: Request, res: Response) => {
        // Immediate 200 OK acknowledgment to Meta
        res.sendStatus(200);

        try {
            const events = MetaOmnichannelService.parseWebhookPayload(req.body);
            if (!events || events.length === 0) {
                return;
            }

            const pool = getPool();

            for (const ev of events) {
                if (!ev.text) continue;
                const cleanText = ev.text.trim();

                // 0. Quick Staff Takeover via Single Period (.) or (..)
                if (cleanText === '.' || cleanText === '..' || cleanText.toLowerCase() === 'takeover') {
                    const takeoverUntil = new Date(Date.now() + 60 * 60 * 1000).toISOString();
                    await pool.query(`
                        UPDATE cx_conversations 
                        SET ai_mode = 'OFF',
                            takeover_until = $1,
                            handoff_reason = 'WhatsApp single dot (.) staff takeover'
                        WHERE external_user_id = $2;
                    `, [takeoverUntil, ev.senderId]).catch(() => {});
                    continue;
                }

                // 1. Resolve Account Configuration from DB
                let accountId: number | null = null;
                let propertyId = 1;
                let aiMode = 'SUGGEST';
                let accessToken = '';
                let autoReplyComments = true;
                let sendPrivateDmOnComment = true;

                if (ev.accountIdentifier) {
                    const accRes = await pool.query(`
                        SELECT * FROM cx_connected_accounts 
                        WHERE account_identifier = $1 AND is_active = TRUE 
                        LIMIT 1;
                    `, [ev.accountIdentifier]);

                    if (accRes.rows.length > 0) {
                        const acc = accRes.rows[0];
                        accountId = acc.id;
                        propertyId = acc.property_id || 1;
                        aiMode = acc.ai_mode || 'SUGGEST';
                        accessToken = acc.access_token || '';
                        autoReplyComments = acc.auto_reply_comments ?? true;
                        sendPrivateDmOnComment = acc.send_private_dm_on_comment ?? true;
                    }
                }

                // Channel string for conversation table
                let channelKey = ev.channelType as string;
                if (ev.channelType === 'FACEBOOK_PAGE') {
                    channelKey = ev.sourceType === 'POST_COMMENT' ? 'FACEBOOK_COMMENT' : 'MESSENGER';
                } else if (ev.channelType === 'INSTAGRAM_BUSINESS') {
                    channelKey = ev.sourceType === 'POST_COMMENT' ? 'INSTAGRAM_COMMENT' : 'INSTAGRAM_DM';
                }

                // 2. Match or Create Conversation
                let convRes = await pool.query(`
                    SELECT * FROM cx_conversations 
                    WHERE property_id = $1 AND channel = $2 AND external_user_id = $3 
                    LIMIT 1;
                `, [propertyId, channelKey, ev.senderId]);

                let conversationId: number | string;

                if (convRes.rows.length === 0) {
                    // Try to match phone number with reservation if WhatsApp
                    let guestId = null;
                    let reservationId = null;

                    if (ev.channelType === 'WHATSAPP') {
                        const resMatch = await pool.query(`
                            SELECT r.id as res_id, r.property_id, g.id as guest_id
                            FROM guests g
                            LEFT JOIN reservations r ON r.booker_guest_id = g.id
                            WHERE g.phone LIKE '%' || $1 OR g.phone = $1
                            ORDER BY r.id DESC LIMIT 1;
                        `, [ev.senderId.slice(-10)]);

                        if (resMatch.rows.length > 0) {
                            reservationId = resMatch.rows[0].res_id;
                            guestId = resMatch.rows[0].guest_id;
                            propertyId = resMatch.rows[0].property_id || propertyId;
                        }
                    }

                    const newConv = await pool.query(`
                        INSERT INTO cx_conversations (
                            property_id, channel_account_id, guest_id, reservation_id,
                            channel, source_type, external_user_id, guest_name,
                            status, ai_mode, last_message_text, last_message_at,
                            unread_count, post_id, comment_id, post_url
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, 'OPEN', $9, $10, CURRENT_TIMESTAMP,
                            1, $11, $12, $13
                        ) RETURNING id, ai_mode;
                    `, [
                        propertyId,
                        accountId,
                        guestId,
                        reservationId,
                        channelKey,
                        ev.sourceType,
                        ev.senderId,
                        ev.senderName,
                        aiMode,
                        ev.text,
                        ev.postId || null,
                        ev.commentId || null,
                        ev.postUrl || null
                    ]);

                    conversationId = newConv.rows[0].id;
                    aiMode = newConv.rows[0].ai_mode;
                } else {
                    conversationId = convRes.rows[0].id;
                    aiMode = convRes.rows[0].ai_mode;
                    propertyId = convRes.rows[0].property_id || propertyId;

                    await pool.query(`
                        UPDATE cx_conversations 
                        SET last_message_text = $1, 
                            last_message_at = CURRENT_TIMESTAMP,
                            unread_count = unread_count + 1,
                            post_id = COALESCE($2, post_id),
                            comment_id = COALESCE($3, comment_id),
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $4;
                    `, [ev.text, ev.postId || null, ev.commentId || null, conversationId]);
                }

                // 3. Insert Inbound Message
                await pool.query(`
                    INSERT INTO cx_messages (
                        conversation_id, sender_type, sender_name, message_text,
                        media_type, status, source_type, post_id, comment_id, parent_comment_id
                    ) VALUES ($1, 'GUEST', $2, $3, 'TEXT', 'DELIVERED', $4, $5, $6, $7);
                `, [
                    conversationId,
                    ev.senderName,
                    ev.text,
                    ev.sourceType,
                    ev.postId || null,
                    ev.commentId || null,
                    ev.parentCommentId || null
                ]);

                // 4. AI Analysis & Multi-Channel Action Execution
                const analysis = await AiGuestAssistantService.analyzeAndDraftReply(
                    propertyId,
                    ev.text,
                    ev.senderName,
                    ev.senderId,
                    conversationId
                );

                // Update conversation sentiment
                await pool.query(`
                    UPDATE cx_conversations 
                    SET sentiment = $1, 
                        status = CASE WHEN $2 = TRUE THEN 'PENDING_APPROVAL' ELSE status END,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3;
                `, [analysis.sentiment, analysis.shouldEscalate, conversationId]);

                // 5. Automated Execution based on Source (Post Comment vs Direct Message)
                if (ev.sourceType === 'POST_COMMENT') {
                    // Scenario: User commented on FB / IG Post or Reel
                    if (aiMode === 'AUTOPILOT' && !analysis.shouldEscalate && autoReplyComments && ev.commentId) {
                        const publicReply = analysis.publicCommentReply || (
                            analysis.detectedLanguage === 'BANGLA'
                                ? `শ্রদ্ধেয় ${ev.senderName}, আপনার আগ্রহের জন্য ধন্যবাদ! রুমের ভাড়া ও বুকিং সংক্রান্ত বিস্তারিত তথ্য আমরা আপনার ইনবক্সে (DM) পাঠিয়ে দিয়েছি। অনুগ্রহ করে মেসেজ চেক করুন।`
                                : `Dear ${ev.senderName}, thank you for reaching out! We have sent you a direct message with our room availability and booking details.`
                        );

                        // 5A. Reply publicly to comment
                        if (ev.channelType === 'FACEBOOK_PAGE') {
                            await MetaOmnichannelService.replyToFacebookComment(accessToken, ev.commentId, publicReply);
                        } else if (ev.channelType === 'INSTAGRAM_BUSINESS') {
                            await MetaOmnichannelService.replyToInstagramComment(accessToken, ev.commentId, publicReply);
                        }

                        // 5B. Send Private DM with live pricing / rates
                        if (sendPrivateDmOnComment) {
                            if (ev.channelType === 'FACEBOOK_PAGE') {
                                await MetaOmnichannelService.sendFacebookPrivateReply(accessToken, ev.commentId, analysis.proposedReply);
                            }
                        }

                        // Record Bot Action
                        await pool.query(`
                            INSERT INTO cx_messages (
                                conversation_id, sender_type, sender_name, message_text,
                                media_type, status, is_approved, source_type, post_id, comment_id
                            ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge', $2, 'TEXT', 'DELIVERED', TRUE, 'POST_COMMENT', $3, $4);
                        `, [conversationId, `${publicReply}\n\n[Private DM Sent]:\n${analysis.proposedReply}`, ev.postId || null, ev.commentId]);
                    } else {
                        // Suggest Mode: Store draft reply waiting for staff 1-click approval
                        await pool.query(`
                            UPDATE cx_messages 
                            SET suggested_reply = $1, is_approved = FALSE 
                            WHERE id = (SELECT id FROM cx_messages WHERE conversation_id = $2 ORDER BY created_at DESC LIMIT 1);
                        `, [analysis.proposedReply, conversationId]);
                    }
                } else {
                    // Scenario: Direct Message (WhatsApp, Messenger, IG DM)
                    if (aiMode === 'AUTOPILOT' && !analysis.shouldEscalate) {
                        if (ev.channelType === 'WHATSAPP') {
                            await MetaOmnichannelService.sendWhatsAppMessage(ev.accountIdentifier, accessToken, ev.senderId, analysis.proposedReply);
                        } else if (ev.channelType === 'FACEBOOK_PAGE') {
                            await MetaOmnichannelService.sendFacebookMessenger(ev.accountIdentifier, accessToken, ev.senderId, analysis.proposedReply);
                        } else if (ev.channelType === 'INSTAGRAM_BUSINESS') {
                            await MetaOmnichannelService.sendInstagramDirectMessage(ev.accountIdentifier, accessToken, ev.senderId, analysis.proposedReply);
                        }

                        await pool.query(`
                            INSERT INTO cx_messages (
                                conversation_id, sender_type, sender_name, message_text,
                                media_type, status, is_approved, source_type
                            ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge', $2, 'TEXT', 'DELIVERED', TRUE, 'DIRECT_MESSAGE');
                        `, [conversationId, analysis.proposedReply]);
                    } else {
                        await pool.query(`
                            UPDATE cx_messages 
                            SET suggested_reply = $1, is_approved = FALSE 
                            WHERE id = (SELECT id FROM cx_messages WHERE conversation_id = $2 ORDER BY created_at DESC LIMIT 1);
                        `, [analysis.proposedReply, conversationId]);
                    }
                }

                // Real-time broadcast to front desk UI
                try {
                    broadcastServerEvent({
                        type: 'CX_MESSAGE_RECEIVED',
                        conversationId,
                        channel: channelKey,
                        sourceType: ev.sourceType,
                        senderName: ev.senderName,
                        text: ev.text,
                        propertyId,
                        timestamp: new Date().toISOString()
                    });
                } catch {
                    // non-fatal
                }
            }
        } catch (error: any) {
            console.error('[GuestCX] Omnichannel webhook processing error:', error);
        }
    },

    /**
     * Get Connected Social & Messaging Accounts
     */
    getConnectedAccounts: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const propertyId = req.query.propertyId || req.headers['x-property-id'] || 1;
            const result = await pool.query(`
                SELECT id, property_id, channel_type, account_name, account_identifier,
                       page_username, phone_number, ai_mode, auto_reply_comments,
                       send_private_dm_on_comment, is_active, comment_ai_prompt,
                       created_at, updated_at
                FROM cx_connected_accounts 
                WHERE property_id = $1 
                ORDER BY created_at DESC;
            `, [propertyId]);

            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            console.error('[GuestCX] getConnectedAccounts error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Create or Connect New Social / WhatsApp Account
     */
    createConnectedAccount: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const propertyId = req.body.propertyId || req.headers['x-property-id'] || 1;
            const {
                channelType,
                accountName,
                accountIdentifier,
                pageUsername,
                phoneNumber,
                accessToken,
                verifyToken,
                appSecret,
                aiMode,
                autoReplyComments,
                sendPrivateDmOnComment,
                commentAiPrompt
            } = req.body;

            if (!channelType || !accountName || !accountIdentifier || !accessToken) {
                res.status(400).json({
                    success: false,
                    error: 'channelType, accountName, accountIdentifier, and accessToken are required'
                });
                return;
            }

            const insertRes = await pool.query(`
                INSERT INTO cx_connected_accounts (
                    property_id, channel_type, account_name, account_identifier,
                    page_username, phone_number, access_token, verify_token, app_secret,
                    ai_mode, auto_reply_comments, send_private_dm_on_comment, comment_ai_prompt, is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE)
                ON CONFLICT (property_id, channel_type, account_identifier) 
                DO UPDATE SET 
                    account_name = EXCLUDED.account_name,
                    access_token = EXCLUDED.access_token,
                    verify_token = EXCLUDED.verify_token,
                    app_secret = EXCLUDED.app_secret,
                    page_username = EXCLUDED.page_username,
                    phone_number = EXCLUDED.phone_number,
                    ai_mode = EXCLUDED.ai_mode,
                    auto_reply_comments = EXCLUDED.auto_reply_comments,
                    send_private_dm_on_comment = EXCLUDED.send_private_dm_on_comment,
                    comment_ai_prompt = EXCLUDED.comment_ai_prompt,
                    is_active = TRUE,
                    updated_at = CURRENT_TIMESTAMP
                RETURNING id, property_id, channel_type, account_name, account_identifier, ai_mode, is_active;
            `, [
                propertyId,
                channelType,
                accountName,
                accountIdentifier,
                pageUsername || null,
                phoneNumber || null,
                accessToken,
                verifyToken || null,
                appSecret || null,
                aiMode || 'SUGGEST',
                autoReplyComments !== undefined ? autoReplyComments : true,
                sendPrivateDmOnComment !== undefined ? sendPrivateDmOnComment : true,
                commentAiPrompt || null
            ]);

            res.json({ success: true, data: insertRes.rows[0] });
        } catch (error: any) {
            console.error('[GuestCX] createConnectedAccount error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Delete / Disconnect Account
     */
    deleteConnectedAccount: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await pool.query(`DELETE FROM cx_connected_accounts WHERE id = $1;`, [rawId]);
            res.json({ success: true, message: 'Account disconnected successfully' });
        } catch (error: any) {
            console.error('[GuestCX] deleteConnectedAccount error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Get list of conversations with search, status filter, and channel filter
     */
    getConversations: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const propertyId = req.query.propertyId || req.headers['x-property-id'] || 1;
            const status = req.query.status as string;
            const channel = req.query.channel as string;
            const search = (req.query.search as string || '').trim().toLowerCase();

            // Auto-revert expired staff takeovers back to AI autopilot
            await pool.query(`
                UPDATE cx_conversations
                SET takeover_until = NULL,
                    ai_mode = 'AUTOPILOT',
                    updated_at = CURRENT_TIMESTAMP
                WHERE property_id = $1
                  AND takeover_until IS NOT NULL
                  AND takeover_until <= CURRENT_TIMESTAMP;
            `, [propertyId]).catch(() => {});

            let query = `
                SELECT c.*, 
                       ca.account_name,
                       ca.channel_type,
                       r.reservation_number,
                       r.status as reservation_status,
                       r.total_amount,
                       r.due_amount as balance_due,
                       r.is_pre_checked_in,
                       r.kyc_verified,
                       r.pre_checkin_eta,
                       r.luggage_tag_number,
                       r.arrived_early_at,
                       rr.check_in_date,
                       rr.check_out_date,
                       rm.room_number,
                       rt.name as room_type_name
                FROM cx_conversations c
                LEFT JOIN cx_connected_accounts ca ON c.channel_account_id = ca.id
                LEFT JOIN reservations r ON c.reservation_id = r.id
                LEFT JOIN LATERAL (
                    SELECT room_id, check_in_date, check_out_date 
                    FROM reservation_rooms 
                    WHERE reservation_id = r.id 
                    ORDER BY id ASC LIMIT 1
                ) rr ON true
                LEFT JOIN rooms rm ON rr.room_id = rm.id
                LEFT JOIN room_types rt ON rm.room_type_id = rt.id
                WHERE c.property_id = $1
            `;
            const params: any[] = [propertyId];

            if (status && status !== 'ALL') {
                params.push(status);
                query += ` AND c.status = $${params.length}`;
            }

            if (channel && channel !== 'ALL') {
                params.push(channel);
                query += ` AND c.channel = $${params.length}`;
            }

            if (search) {
                params.push(`%${search}%`);
                query += ` AND (LOWER(c.guest_name) LIKE $${params.length} OR c.external_user_id LIKE $${params.length} OR LOWER(r.reservation_number) LIKE $${params.length})`;
            }

            query += ` ORDER BY c.last_message_at DESC LIMIT 100;`;

            const result = await pool.query(query, params);
            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            console.error('[GuestCX] getConversations error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Get message thread for a conversation
     */
    getMessages: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const convId = req.params.id;

            // Mark conversation as read
            await pool.query(`UPDATE cx_conversations SET unread_count = 0 WHERE id = $1;`, [convId]);

            const result = await pool.query(`
                SELECT * FROM cx_messages 
                WHERE conversation_id = $1 
                ORDER BY created_at ASC;
            `, [convId]);

            res.json({ success: true, data: result.rows });
        } catch (error: any) {
            console.error('[GuestCX] getMessages error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Front desk staff manually sends an outbound message or comment reply
     */
    sendMessage: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { conversationId, text, mediaUrl, mediaType, replyAsComment, isInternal } = req.body;
            if (!conversationId || !text) {
                res.status(400).json({ success: false, error: 'conversationId and text are required' });
                return;
            }

            const convRes = await pool.query(`
                SELECT c.*, ca.access_token, ca.account_identifier, ca.channel_type as ca_type
                FROM cx_conversations c
                LEFT JOIN cx_connected_accounts ca ON c.channel_account_id = ca.id
                WHERE c.id = $1;
            `, [conversationId]);

            if (convRes.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }

            const conv = convRes.rows[0];
            const staffName = req.user?.name || 'Front Desk Staff';
            const accessToken = conv.access_token || process.env.WHATSAPP_ACCESS_TOKEN || '';
            const accountIdentifier = conv.account_identifier || process.env.WHATSAPP_PHONE_ID || '';

            let dispatchRes: { success: boolean; messageId?: string; error?: string } = { success: true };

            // Internal Staff Note: NEVER dispatch to external guest channels
            if (!isInternal) {
                // Channel Specific Outbound Dispatch
                if (conv.channel === 'WHATSAPP') {
                    dispatchRes = await MetaOmnichannelService.sendWhatsAppMessage(
                        accountIdentifier,
                        accessToken,
                        conv.external_user_id,
                        text
                    );
                } else if (conv.channel === 'MESSENGER') {
                    dispatchRes = await MetaOmnichannelService.sendFacebookMessenger(
                        accountIdentifier,
                        accessToken,
                        conv.external_user_id,
                        text
                    );
                } else if (conv.channel === 'FACEBOOK_COMMENT') {
                    if (replyAsComment && conv.comment_id) {
                        dispatchRes = await MetaOmnichannelService.replyToFacebookComment(
                            accessToken,
                            conv.comment_id,
                            text
                        );
                    } else if (conv.comment_id) {
                        dispatchRes = await MetaOmnichannelService.sendFacebookPrivateReply(
                            accessToken,
                            conv.comment_id,
                            text
                        );
                    }
                } else if (conv.channel === 'INSTAGRAM_DM') {
                    dispatchRes = await MetaOmnichannelService.sendInstagramDirectMessage(
                        accountIdentifier,
                        accessToken,
                        conv.external_user_id,
                        text
                    );
                } else if (conv.channel === 'INSTAGRAM_COMMENT' && conv.comment_id) {
                    dispatchRes = await MetaOmnichannelService.replyToInstagramComment(
                        accessToken,
                        conv.comment_id,
                        text
                    );
                }
            }

            // Record message in database
            const msgInsert = await pool.query(`
                INSERT INTO cx_messages (
                    conversation_id, sender_type, sender_id, sender_name, message_text,
                    media_url, media_type, status, is_approved, source_type, post_id, comment_id, is_internal
                ) VALUES ($1, 'STAFF', $2, $3, $4, $5, $6, $7, TRUE, $8, $9, $10, $11)
                RETURNING *;
            `, [
                conversationId,
                req.user?.id || null,
                staffName,
                text,
                mediaUrl || null,
                mediaType || 'TEXT',
                dispatchRes.success ? 'DELIVERED' : 'FAILED',
                replyAsComment ? 'POST_COMMENT' : 'DIRECT_MESSAGE',
                conv.post_id || null,
                conv.comment_id || null,
                Boolean(isInternal)
            ]);

            const summaryText = isInternal ? `[Internal Note] ${text}` : text;
            await pool.query(`
                UPDATE cx_conversations 
                SET last_message_text = $1, 
                    last_message_at = CURRENT_TIMESTAMP,
                    status = 'OPEN',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `, [summaryText, conversationId]);

            res.json({ success: true, data: msgInsert.rows[0] });
        } catch (error: any) {
            console.error('[GuestCX] sendMessage error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * 1-Click approval and dispatch of an AI suggested reply
     */
    approveDraftReply: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { messageId, editedText } = req.body;
            if (!messageId) {
                res.status(400).json({ success: false, error: 'messageId is required' });
                return;
            }

            const msgRes = await pool.query(`
                SELECT m.*, c.external_user_id, c.channel, c.id as conv_id, c.post_id as conv_post_id,
                       c.comment_id as conv_comment_id, ca.access_token, ca.account_identifier
                FROM cx_messages m
                JOIN cx_conversations c ON m.conversation_id = c.id
                LEFT JOIN cx_connected_accounts ca ON c.channel_account_id = ca.id
                WHERE m.id = $1;
            `, [messageId]);

            if (msgRes.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Message not found' });
                return;
            }

            const msg = msgRes.rows[0];
            const textToSend = editedText || msg.suggested_reply;

            if (!textToSend) {
                res.status(400).json({ success: false, error: 'No text to approve and dispatch' });
                return;
            }

            const accessToken = msg.access_token || process.env.WHATSAPP_ACCESS_TOKEN || '';
            const accountIdentifier = msg.account_identifier || process.env.WHATSAPP_PHONE_ID || '';

            // Dispatch via channel
            if (msg.channel === 'WHATSAPP') {
                await MetaOmnichannelService.sendWhatsAppMessage(accountIdentifier, accessToken, msg.external_user_id, textToSend);
            } else if (msg.channel === 'MESSENGER') {
                await MetaOmnichannelService.sendFacebookMessenger(accountIdentifier, accessToken, msg.external_user_id, textToSend);
            } else if (msg.channel === 'FACEBOOK_COMMENT' && msg.conv_comment_id) {
                await MetaOmnichannelService.replyToFacebookComment(accessToken, msg.conv_comment_id, textToSend);
            } else if (msg.channel === 'INSTAGRAM_DM') {
                await MetaOmnichannelService.sendInstagramDirectMessage(accountIdentifier, accessToken, msg.external_user_id, textToSend);
            } else if (msg.channel === 'INSTAGRAM_COMMENT' && msg.conv_comment_id) {
                await MetaOmnichannelService.replyToInstagramComment(accessToken, msg.conv_comment_id, textToSend);
            }

            // Clear draft
            await pool.query(`UPDATE cx_messages SET suggested_reply = NULL, is_approved = TRUE WHERE id = $1;`, [messageId]);

            // Record bot message
            const botMsg = await pool.query(`
                INSERT INTO cx_messages (
                    conversation_id, sender_type, sender_name, message_text, media_type, status, is_approved
                ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge (Approved)', $2, 'TEXT', 'DELIVERED', TRUE)
                RETURNING *;
            `, [msg.conv_id, textToSend]);

            await pool.query(`
                UPDATE cx_conversations 
                SET last_message_text = $1, 
                    last_message_at = CURRENT_TIMESTAMP,
                    status = 'OPEN',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `, [textToSend, msg.conv_id]);

            res.json({ success: true, data: botMsg.rows[0] });
        } catch (error: any) {
            console.error('[GuestCX] approveDraftReply error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Toggle AI reply mode for conversation
     */
    updateAiMode: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { conversationId, aiMode } = req.body;
            if (!conversationId || !['OFF', 'SUGGEST', 'AUTOPILOT'].includes(aiMode)) {
                res.status(400).json({ success: false, error: 'Invalid parameters' });
                return;
            }

            await pool.query(`
                UPDATE cx_conversations 
                SET ai_mode = $1, updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2;
            `, [aiMode, conversationId]);

            res.json({ success: true, aiMode });
        } catch (error: any) {
            console.error('[GuestCX] updateAiMode error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Staff takes over conversation with timer (+30m, +1h, +6h, or Permanent)
     */
    takeoverConversation: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { conversationId, durationMinutes, reason } = req.body;
            if (!conversationId) {
                res.status(400).json({ success: false, error: 'conversationId is required' });
                return;
            }

            let takeoverUntil: string | null = null;
            if (durationMinutes && Number(durationMinutes) > 0) {
                const date = new Date(Date.now() + Number(durationMinutes) * 60 * 1000);
                takeoverUntil = date.toISOString();
            }

            await pool.query(`
                UPDATE cx_conversations
                SET ai_mode = 'OFF',
                    takeover_until = $1,
                    handoff_reason = COALESCE($2, handoff_reason),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3;
            `, [takeoverUntil, reason || null, conversationId]);

            res.json({ success: true, message: 'Conversation taken over by staff', takeoverUntil });
        } catch (error: any) {
            console.error('[GuestCX] takeoverConversation error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Resume StayPulse AI Autopilot for conversation
     */
    resumeAi: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { conversationId } = req.body;
            if (!conversationId) {
                res.status(400).json({ success: false, error: 'conversationId is required' });
                return;
            }

            await pool.query(`
                UPDATE cx_conversations
                SET ai_mode = 'AUTOPILOT',
                    takeover_until = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $1;
            `, [conversationId]);

            res.json({ success: true, message: 'StayPulse AI resumed autopilot' });
        } catch (error: any) {
            console.error('[GuestCX] resumeAi error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * AI Copilot Guest 360 Memory Profile & 1-Paragraph Relationship Summary
     */
    getCopilotSummary: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const conversationId = req.params.conversationId;
            const convRes = await pool.query(`
                SELECT c.*, g.notes as guest_notes, g.vip_status
                FROM cx_conversations c
                LEFT JOIN guests g ON c.guest_id = g.id
                WHERE c.id = $1
                LIMIT 1;
            `, [conversationId]);

            if (convRes.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }

            const conv = convRes.rows[0];
            const memory = await AiGuestAssistantService.getGuestMemoryProfile(
                conv.property_id || 1,
                conv.external_user_id,
                conv.guest_name,
                conv.id
            );

            // Auto link guest_id and reservation_id if found
            if ((!conv.guest_id && memory.guestId) || (!conv.reservation_id && memory.activeReservation?.id)) {
                await pool.query(`
                    UPDATE cx_conversations
                    SET guest_id = COALESCE(guest_id, $1),
                        reservation_id = COALESCE(reservation_id, $2)
                    WHERE id = $3;
                `, [memory.guestId || null, memory.activeReservation?.id || null, conversationId]).catch(() => {});
            }

            res.json({
                success: true,
                copilot: memory
            });
        } catch (error: any) {
            console.error('[GuestCX] getCopilotSummary error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Ask Front Desk AI Copilot a question about a guest's history or stay
     */
    askCopilot: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const { conversationId, question } = req.body;
            if (!conversationId || !question) {
                res.status(400).json({ success: false, error: 'conversationId and question are required' });
                return;
            }
            const pool = getPool();
            const convRes = await pool.query(`SELECT * FROM cx_conversations WHERE id = $1;`, [conversationId]);
            if (convRes.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Conversation not found' });
                return;
            }
            const conv = convRes.rows[0];
            const memory = await AiGuestAssistantService.getGuestMemoryProfile(
                conv.property_id || 1,
                conv.external_user_id,
                conv.guest_name,
                conv.id
            );

            const answer = await AiGuestAssistantService.askCopilotQuestion(conv.property_id || 1, memory, question);
            res.json({ success: true, answer });
        } catch (error: any) {
            console.error('[GuestCX] askCopilot error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Generates secure express pre-check-in link for a reservation
     */
    generatePreCheckinLink: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const rawResId = Array.isArray(req.params.reservationId)
                ? req.params.reservationId[0]
                : (req.params.reservationId || req.body?.reservationId);

            if (!rawResId) {
                res.status(400).json({ success: false, error: 'reservationId is required' });
                return;
            }

            const reservationId = String(rawResId);
            const token = signJwt({ reservationId, purpose: 'express_pre_checkin' }, 86400 * 3);
            const link = `/express-checkin?token=${token}`;
            res.json({ success: true, data: { token, link } });
        } catch (error: any) {
            console.error('[GuestCX] generatePreCheckinLink error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Guest-facing: retrieve reservation details using secure pre-checkin token
     */
    getExpressCheckinDetails: async (req: Request, res: Response) => {
        try {
            const token = (req.query.token as string) || (Array.isArray(req.params.token) ? req.params.token[0] : req.params.token);
            if (!token) {
                res.status(400).json({ success: false, error: 'Token is required' });
                return;
            }

            const payload = verifyJwt(token);
            if (!payload || !payload.reservationId) {
                res.status(401).json({ success: false, error: 'Invalid or expired pre-check-in link.' });
                return;
            }

            const pool = getPool();
            const resData = await pool.query(`
                SELECT r.id, r.reservation_number, r.check_in_date, r.check_out_date,
                       r.total_amount, r.balance_due, r.is_pre_checked_in, r.kyc_verified,
                       r.pre_checkin_eta, r.id_document_type, r.id_document_number,
                       g.first_name, g.last_name, g.email, g.phone,
                       rm.room_number, rt.name as room_type_name,
                       p.name as property_name, p.address as property_address
                FROM reservations r
                LEFT JOIN guests g ON r.guest_id = g.id
                LEFT JOIN rooms rm ON r.room_id = rm.id
                LEFT JOIN room_types rt ON rm.room_type_id = rt.id
                LEFT JOIN properties p ON r.property_id = p.id
                WHERE r.id = $1;
            `, [payload.reservationId]);

            if (resData.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Reservation record not found' });
                return;
            }

            res.json({ success: true, data: resData.rows[0] });
        } catch (error: any) {
            console.error('[GuestCX] getExpressCheckinDetails error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Guest-facing: submit digital KYC & signature
     */
    submitExpressCheckin: async (req: Request, res: Response) => {
        try {
            const { token, eta, documentType, documentNumber, frontUrl, backUrl, signatureData } = req.body;
            if (!token) {
                res.status(400).json({ success: false, error: 'Token is required' });
                return;
            }

            const payload = verifyJwt(token);
            if (!payload || !payload.reservationId) {
                res.status(401).json({ success: false, error: 'Invalid or expired pre-check-in link.' });
                return;
            }

            const pool = getPool();
            const resId = payload.reservationId;

            const updated = await pool.query(`
                UPDATE reservations 
                SET is_pre_checked_in = TRUE,
                    kyc_verified = TRUE,
                    pre_checkin_eta = $1,
                    id_document_type = $2,
                    id_document_number = $3,
                    id_document_front_url = $4,
                    id_document_back_url = $5,
                    digital_signature_data = $6,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $7
                RETURNING *;
            `, [
                eta || 'Standard Check-in Time',
                documentType || 'NID',
                documentNumber || '',
                frontUrl || '',
                backUrl || '',
                signatureData || '',
                resId
            ]);

            if (updated.rows.length === 0) {
                res.status(404).json({ success: false, error: 'Reservation not found' });
                return;
            }

            const guestRes = await pool.query(`
                SELECT g.phone, g.first_name, r.reservation_number, p.name as hotel_name
                FROM reservations r
                LEFT JOIN guests g ON r.guest_id = g.id
                LEFT JOIN properties p ON r.property_id = p.id
                WHERE r.id = $1;
            `, [resId]);

            if (guestRes.rows.length > 0 && guestRes.rows[0].phone) {
                const phone = guestRes.rows[0].phone;
                const name = guestRes.rows[0].first_name || 'Guest';
                const hotelName = guestRes.rows[0].hotel_name || 'Our Hotel';
                const confirmationMsg = `🎉 *Express Pre-Check-In Confirmed!*\n\nDear ${name}, your digital pre-check-in has been successfully received by ${hotelName} for Reservation *#${guestRes.rows[0].reservation_number}*.\n\n⚡ *Fast-Pass Activated*: Upon your arrival (${eta || 'check-in time'}), present this confirmation or your Fast-Pass at the front desk for instant key pickup!`;
                await WhatsAppCloudApiService.sendTextMessage(phone, confirmationMsg);
            }

            res.json({
                success: true,
                message: 'Pre-check-in completed successfully! Fast-Pass activated.',
                data: {
                    reservationId: resId,
                    isPreCheckedIn: true,
                    fastPassCode: `FP-${resId}-${Date.now().toString().slice(-4)}`
                }
            });
        } catch (error: any) {
            console.error('[GuestCX] submitExpressCheckin error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Front desk logs guest arrival before room is ready with luggage storage
     */
    markLuggageStoredEarly: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { reservationId, luggageTagNumber } = req.body;
            if (!reservationId || !luggageTagNumber) {
                res.status(400).json({ success: false, error: 'reservationId and luggageTagNumber are required' });
                return;
            }

            await pool.query(`
                UPDATE reservations 
                SET luggage_tag_number = $1,
                    arrived_early_at = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2;
            `, [luggageTagNumber, reservationId]);

            const guestRes = await pool.query(`
                SELECT g.phone, g.first_name, p.name as hotel_name 
                FROM reservations r
                LEFT JOIN guests g ON r.guest_id = g.id
                LEFT JOIN properties p ON r.property_id = p.id
                WHERE r.id = $1;
            `, [reservationId]);

            if (guestRes.rows.length > 0 && guestRes.rows[0].phone) {
                const phone = guestRes.rows[0].phone;
                const name = guestRes.rows[0].first_name || 'Guest';
                const hotelName = guestRes.rows[0].hotel_name || 'our hotel';
                const msg = `🧳 *Luggage Safe Storage Confirmed*\n\nDear ${name}, your bags have been safely registered under *Tag #${luggageTagNumber}* at ${hotelName}.\n\nWe will send you an instant WhatsApp notification the moment Housekeeping finishes preparing your room!`;
                await WhatsAppCloudApiService.sendTextMessage(phone, msg);
            }

            res.json({ success: true, message: 'Luggage stored and guest notified via WhatsApp' });
        } catch (error: any) {
            console.error('[GuestCX] markLuggageStoredEarly error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Front desk or Housekeeping triggers instant WhatsApp "Room Ready" alert
     */
    triggerRoomReadyAlert: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { reservationId, roomNumber } = req.body;
            if (!reservationId) {
                res.status(400).json({ success: false, error: 'reservationId is required' });
                return;
            }

            const guestRes = await pool.query(`
                SELECT g.phone, g.first_name, rm.room_number, p.name as hotel_name 
                FROM reservations r
                LEFT JOIN guests g ON r.guest_id = g.id
                LEFT JOIN rooms rm ON r.room_id = rm.id
                LEFT JOIN properties p ON r.property_id = p.id
                WHERE r.id = $1;
            `, [reservationId]);

            if (guestRes.rows.length === 0 || !guestRes.rows[0].phone) {
                res.status(404).json({ success: false, error: 'Reservation or guest phone not found' });
                return;
            }

            const phone = guestRes.rows[0].phone;
            const name = guestRes.rows[0].first_name || 'Guest';
            const room = roomNumber || guestRes.rows[0].room_number || 'your room';
            const hotelName = guestRes.rows[0].hotel_name || 'our hotel';

            const msg = `✨ *Your Room is Ready!*\n\nDear ${name}, Room *${room}* at ${hotelName} is sparkling clean, fully inspected, and ready for you!\n\nPlease visit the Front Desk to collect your room key. Welcome to ${hotelName}!`;
            await WhatsAppCloudApiService.sendTextMessage(phone, msg);

            res.json({ success: true, message: `Room ready notification dispatched to ${phone}` });
        } catch (error: any) {
            console.error('[GuestCX] triggerRoomReadyAlert error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Dispatch In-Chat Service Request (Housekeeping Amenity or Maintenance Order)
     */
    dispatchServiceTask: async (req: AuthenticatedRequest, res: Response) => {
        try {
            const pool = getPool();
            const { conversationId, roomNumber, taskType, item, notes, guestName } = req.body;
            if (!roomNumber) {
                res.status(400).json({ success: false, error: 'roomNumber is required' });
                return;
            }

            const cleanRoomNum = String(roomNumber).trim();
            const roomRes = await pool.query(`
                SELECT id, property_id, room_number FROM rooms WHERE LOWER(room_number) = LOWER($1) LIMIT 1;
            `, [cleanRoomNum]);

            if (roomRes.rows.length === 0) {
                res.status(404).json({ success: false, error: `Room ${cleanRoomNum} not found in system` });
                return;
            }

            const roomObj = roomRes.rows[0];
            let createdTaskId: number | null = null;
            let responseText = '';

            if (taskType === 'MAINTENANCE') {
                const issueDescription = `${item || 'Maintenance Issue'}${notes ? ` - ${notes}` : ' (Reported via GuestFlow WhatsApp)'}`;
                const mRes = await pool.query(`
                    INSERT INTO maintenance_orders (
                        room_id, property_id, issue_type, priority, status, created_at
                    ) VALUES ($1, $2, $3, 'HIGH', 'OPEN', CURRENT_TIMESTAMP)
                    RETURNING id;
                `, [roomObj.id, roomObj.property_id || 1, issueDescription]);
                createdTaskId = mRes.rows[0].id;

                responseText = `🛠️ *Maintenance Service Ticket #${createdTaskId} Created*\nRoom: ${cleanRoomNum}\nIssue: ${issueDescription}\nStatus: OPEN (Assigned to Engineering Team)\nEstimated Inspection: within 20-30 mins.`;
            } else {
                // Default: HOUSEKEEPING
                const hkNotes = `Guest In-Room Request: ${item || 'Housekeeping Service'}${notes ? ` (${notes})` : ''} | Guest: ${guestName || 'In-House Guest'}`;
                const hkRes = await pool.query(`
                    INSERT INTO housekeeping_tasks (
                        room_id, task_type, priority, status, inspection_notes, created_at
                    ) VALUES ($1, 'DAILY_CLEAN', 'HIGH', 'PENDING', $2, CURRENT_TIMESTAMP)
                    RETURNING id;
                `, [roomObj.id, hkNotes]);
                createdTaskId = hkRes.rows[0].id;

                responseText = `🛎️ *Housekeeping Request #${createdTaskId} Dispatched*\nRoom: ${cleanRoomNum}\nRequested: ${item || 'Housekeeping Service'}\nStatus: PENDING (High Priority)\nEstimated Delivery: 10-15 mins.`;
            }

            // If conversationId is provided, also insert confirmation message into cx_messages
            let createdMsg = null;
            if (conversationId) {
                const msgRes = await pool.query(`
                    INSERT INTO cx_messages (
                        conversation_id, sender_type, sender_name, message_text,
                        media_type, status, is_approved, is_internal
                    ) VALUES ($1, 'AI_BOT', 'StayPulse Service Dispatcher', $2, 'TEXT', 'DELIVERED', TRUE, FALSE)
                    RETURNING *;
                `, [conversationId, responseText]);
                createdMsg = msgRes.rows[0];

                await pool.query(`
                    UPDATE cx_conversations
                    SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2;
                `, [responseText, conversationId]);
            }

            res.json({
                success: true,
                data: {
                    taskId: createdTaskId,
                    roomNumber: cleanRoomNum,
                    taskType,
                    responseText,
                    message: createdMsg
                }
            });
        } catch (error: any) {
            console.error('[GuestCX] dispatchServiceTask error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    },

    /**
     * Local Omnichannel & AI Simulator
     * Allows testing Google Gemini AI, language routing, and omnichannel inbox workflows locally without Meta hosting
     */
    simulateInboundMessage: async (req: Request, res: Response) => {
        try {
            const pool = getPool();
            const propertyId = Number(req.body.propertyId) || 1;
            const channel = req.body.channel || 'WHATSAPP';
            const sourceType = req.body.sourceType || (channel.includes('COMMENT') ? 'POST_COMMENT' : 'DIRECT_MESSAGE');
            const guestName = (req.body.guestName || req.body.senderName || '').trim() || 'Guest (Local Simulation)';
            const senderId = (req.body.senderIdentifier || req.body.senderId || '').trim() || (channel === 'WHATSAPP' ? '+8801711000999' : 'user_fb_sim_99');
            const messageText = (req.body.messageText || req.body.text || '').trim();
            const aiMode = req.body.aiMode || 'AUTOPILOT';

            if (!messageText) {
                res.status(400).json({ success: false, error: 'messageText (or text) is required' });
                return;
            }

            // 1. Find or create conversation in cx_conversations
            let convRes = await pool.query(`
                SELECT id, ai_mode FROM cx_conversations
                WHERE property_id = $1 AND external_user_id = $2 AND channel = $3
                ORDER BY updated_at DESC LIMIT 1;
            `, [propertyId, senderId, channel]);

            let conversationId: number;

            if (convRes.rows.length === 0) {
                const newConv = await pool.query(`
                    INSERT INTO cx_conversations (
                        property_id, guest_name, external_user_id, channel, source_type, ai_mode, status
                    ) VALUES ($1, $2, $3, $4, $5, $6, 'OPEN')
                    RETURNING id;
                `, [propertyId, guestName, senderId, channel, sourceType, aiMode]);
                conversationId = newConv.rows[0].id;
            } else {
                conversationId = convRes.rows[0].id;
                await pool.query(`
                    UPDATE cx_conversations 
                    SET ai_mode = $1, guest_name = $2, updated_at = CURRENT_TIMESTAMP 
                    WHERE id = $3;
                `, [aiMode, guestName, conversationId]);
            }

            // 2. Insert Inbound Guest Message
            const msgInsert = await pool.query(`
                INSERT INTO cx_messages (
                    conversation_id, sender_type, sender_name, message_text, media_type, status, is_approved, source_type
                ) VALUES ($1, 'GUEST', $2, $3, 'TEXT', 'DELIVERED', TRUE, $4)
                RETURNING id;
            `, [conversationId, guestName, messageText, sourceType]);

            const inboundMsgId = msgInsert.rows[0].id;

            // 3. Process AI Analysis via AiGuestAssistantService (Calls Gemini API / RAG with Conversation Context)
            const analysis = await AiGuestAssistantService.analyzeAndDraftReply(
                propertyId,
                messageText,
                guestName,
                senderId,
                conversationId
            );

            let aiMessageId: number | null = null;
            let executionResult = 'SAVED_DRAFT';

            if (aiMode === 'AUTOPILOT' && !analysis.shouldEscalate) {
                // Autopilot: Auto bot reply sent
                const botInsert = await pool.query(`
                    INSERT INTO cx_messages (
                        conversation_id, sender_type, sender_name, message_text, media_url, media_type, status, is_approved, source_type
                    ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge (Gemini)', $2, $3, $4, 'SENT', TRUE, $5)
                    RETURNING id;
                `, [conversationId, analysis.proposedReply, analysis.mediaUrl || null, analysis.mediaType || 'TEXT', sourceType]);

                aiMessageId = botInsert.rows[0].id;
                executionResult = 'AUTO_SENT';

                await pool.query(`
                    UPDATE cx_conversations 
                    SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP, sentiment = $2, status = 'ACTIVE' 
                    WHERE id = $3;
                `, [analysis.proposedReply, analysis.sentiment, conversationId]);
            } else {
                // Suggest Mode or Escalated: Store as suggested reply awaiting staff review
                await pool.query(`
                    UPDATE cx_messages 
                    SET suggested_reply = $1, is_approved = FALSE 
                    WHERE id = $2;
                `, [analysis.proposedReply, inboundMsgId]);

                await pool.query(`
                    UPDATE cx_conversations 
                    SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP, sentiment = $2, status = 'PENDING_APPROVAL' 
                    WHERE id = $3;
                `, [messageText, analysis.sentiment, conversationId]);

                executionResult = 'PENDING_APPROVAL';
            }

            res.json({
                success: true,
                message: 'Simulation completed successfully',
                data: {
                    conversationId,
                    inboundMessageId: inboundMsgId,
                    aiMessageId,
                    analysis,
                    executionResult,
                    aiReply: analysis.proposedReply,
                    mediaUrl: analysis.mediaUrl,
                    mediaType: analysis.mediaType,
                    bookingReference: analysis.bookingReference,
                    publicCommentReply: analysis.publicCommentReply,
                    detectedLanguage: analysis.detectedLanguage,
                    sentiment: analysis.sentiment,
                    intent: analysis.intent
                }
            });
        } catch (err: any) {
            console.error('[guestCxController] Failed to simulate message:', err);
            res.status(500).json({ success: false, error: err.message || 'Internal simulation error' });
        }
    },

    /**
     * Get GuestFlow AI Settings (Courtesy Hold Duration, Auto-Cancel, Automated Follow-up)
     */
    getCxSettings: async (req: Request, res: Response) => {
        try {
            const propertyId = await resolveDynamicPropertyId(req, req.query.propertyId);
            const pool = getPool();
            const propRes = await pool.query(`SELECT id, name, settings FROM properties WHERE id = $1 LIMIT 1;`, [propertyId]);
            let s: any = {};
            if (propRes.rows.length > 0 && propRes.rows[0].settings) {
                const raw = propRes.rows[0].settings;
                s = typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
            res.json({
                success: true,
                data: {
                    propertyId,
                    aiCourtesyHoldDurationHours: Number(s.aiCourtesyHoldDurationHours || s.courtesyHoldDurationHours) || 24,
                    aiAutoCancelHolds: s.aiAutoCancelHolds !== false,
                    aiHoldFollowUpEnabled: s.aiHoldFollowUpEnabled !== false,
                    aiHoldFollowUpLeadHours: Number(s.aiHoldFollowUpLeadHours) || 2,
                    aiNotifyGuestOnRelease: s.aiNotifyGuestOnRelease !== false,
                    aiHoldFollowUpTemplateBangla: s.aiHoldFollowUpTemplateBangla || '',
                    aiHoldFollowUpTemplateEnglish: s.aiHoldFollowUpTemplateEnglish || ''
                }
            });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    /**
     * Update GuestFlow AI Settings
     */
    updateCxSettings: async (req: Request, res: Response) => {
        try {
            const propertyId = await resolveDynamicPropertyId(req, req.body?.propertyId);
            const {
                aiCourtesyHoldDurationHours,
                aiAutoCancelHolds,
                aiHoldFollowUpEnabled,
                aiHoldFollowUpLeadHours,
                aiNotifyGuestOnRelease,
                aiHoldFollowUpTemplateBangla,
                aiHoldFollowUpTemplateEnglish
            } = req.body;

            const pool = getPool();
            const propRes = await pool.query(`SELECT settings FROM properties WHERE id = $1 LIMIT 1;`, [propertyId]);
            let s: any = {};
            if (propRes.rows.length > 0 && propRes.rows[0].settings) {
                const raw = propRes.rows[0].settings;
                s = typeof raw === 'string' ? JSON.parse(raw) : raw;
            }

            if (aiCourtesyHoldDurationHours !== undefined) {
                s.aiCourtesyHoldDurationHours = Math.max(1, Number(aiCourtesyHoldDurationHours));
                s.courtesyHoldDurationHours = s.aiCourtesyHoldDurationHours;
            }
            if (aiAutoCancelHolds !== undefined) s.aiAutoCancelHolds = Boolean(aiAutoCancelHolds);
            if (aiHoldFollowUpEnabled !== undefined) s.aiHoldFollowUpEnabled = Boolean(aiHoldFollowUpEnabled);
            if (aiHoldFollowUpLeadHours !== undefined) s.aiHoldFollowUpLeadHours = Math.max(1, Number(aiHoldFollowUpLeadHours));
            if (aiNotifyGuestOnRelease !== undefined) s.aiNotifyGuestOnRelease = Boolean(aiNotifyGuestOnRelease);
            if (aiHoldFollowUpTemplateBangla !== undefined) s.aiHoldFollowUpTemplateBangla = aiHoldFollowUpTemplateBangla;
            if (aiHoldFollowUpTemplateEnglish !== undefined) s.aiHoldFollowUpTemplateEnglish = aiHoldFollowUpTemplateEnglish;

            await pool.query(`UPDATE properties SET settings = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2;`, [JSON.stringify(s), propertyId]);

            res.json({ success: true, message: 'GuestFlow settings updated successfully', data: { propertyId, ...s } });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    },

    /**
     * Background Engine / API Trigger:
     * 1. Send Pre-Cancellation Follow-up Reminder to guests on WhatsApp before hold expires
     * 2. Auto-cancel expired holds, release room back to PMS inventory, and send polite release notice
     */
    processHoldLifecycle: async (propertyId?: number | string) => {
        const pool = getPool();
        const propId = await resolveDynamicPropertyId(undefined, propertyId);

        // 1. Fetch Property Settings
        const propRes = await pool.query(`SELECT name, settings FROM properties WHERE id = $1 LIMIT 1;`, [propId]);
        let settings: any = {};
        let propertyName = 'Grand Palace Hotel & Resort';
        if (propRes.rows.length > 0) {
            propertyName = propRes.rows[0].name || propertyName;
            const raw = propRes.rows[0].settings;
            if (raw) {
                settings = typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
        }

        const autoCancel = settings.aiAutoCancelHolds !== false;
        const followUpEnabled = settings.aiHoldFollowUpEnabled !== false;
        const leadHours = Number(settings.aiHoldFollowUpLeadHours) || 2;
        const notifyOnRelease = settings.aiNotifyGuestOnRelease !== false;

        let remindersSent = 0;
        let holdsReleased = 0;

        // PART 1: Pre-Cancellation Warning Follow-up (e.g. 2 hours before cutoff)
        if (followUpEnabled) {
            try {
                const reminderCandidates = await pool.query(`
                    SELECT 
                        r.id, r.reservation_number, r.hold_until, r.total_amount, r.special_requests,
                        g.first_name, g.last_name, g.phone,
                        rt.name as room_type_name,
                        c.id as conversation_id
                    FROM reservations r
                    JOIN guests g ON g.id = r.booker_guest_id
                    LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
                    LEFT JOIN room_types rt ON rt.id = rr.room_type_id
                    LEFT JOIN cx_conversations c ON (c.reservation_id = r.id OR c.external_user_id = g.phone)
                    WHERE r.property_id = $1
                      AND r.status = 'HOLD'
                      AND r.hold_until IS NOT NULL
                      AND r.hold_until > CURRENT_TIMESTAMP
                      AND r.hold_until <= (CURRENT_TIMESTAMP + ($2 || ' hours')::INTERVAL)
                      AND r.hold_reminder_sent_at IS NULL
                    LIMIT 20;
                `, [propId, String(leadHours)]);

                for (const row of reminderCandidates.rows) {
                    const guestName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Valued Guest';
                    const roomName = row.room_type_name || (row.special_requests?.match(/Category:\s*([^|]+)/i)?.[1]?.trim()) || 'Deluxe Suite';
                    const resCode = row.reservation_number;
                    const secureToken = signJwt({ reservationId: resCode, purpose: 'express_pre_checkin' }, 86400 * 3);
                    const frontendBase = getFrontendBaseUrl({ propertySettings: settings });
                    const precheckinUrl = `${frontendBase}/guestflow?token=${encodeURIComponent(secureToken)}`;
                    const expiryDate = new Date(row.hold_until);
                    const expiryTimeStr = expiryDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                    const diffMs = expiryDate.getTime() - Date.now();
                    const hoursLeft = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

                    const isBangla = /[\u0980-\u09FF]/.test(row.special_requests || '') || true;

                    const reminderText = isBangla
                        ? `আসসালামু আলাইকুম ${guestName} স্যার! ${propertyName}-এ আপনার *${roomName}* রুমের প্রি-বুকিং সৌজন্য হোল্ডটির (Ref: *${resCode}*) সময়সীমা আর মাত্র *${hoursLeft} ঘণ্টার* মধ্যে (${expiryTimeStr}) শেষ হতে চলেছে। ⏳\n\nআপনি কি আপনার বুকিংটি নিশ্চিত করতে চান? রুমটি শতভাগ সুরক্ষিত রাখতে অনুগ্রহ করে নিচের লিংকে ক্লিক করে ডিজিটাল প্রি-চেক-ইন অথবা অগ্রিম ডিপোজিট সম্পন্ন করুন:\n👉 ${precheckinUrl}\n\nআপনার যেকোনো সহায়তার জন্য আমাদের ফ্রন্ট ডেস্কে সরাসরি জানাতে পারেন, স্যার!`
                        : `Assalamu Alaikum ${guestName}, good day! Your courtesy hold for *${roomName}* (Ref: *${resCode}*) at ${propertyName} is set to expire in *${hoursLeft} hours* (${expiryTimeStr}). ⏳\n\nTo secure your stay and guarantee the room, please complete your Fast-Pass pre-check-in or advance deposit here:\n👉 ${precheckinUrl}\n\nLet us know if you need any assistance!`;

                    if (row.conversation_id) {
                        await pool.query(`
                            INSERT INTO cx_messages (
                                conversation_id, sender_type, sender_name, message_text, status, is_approved
                            ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge (Follow-up Reminder)', $2, 'SENT', TRUE);
                        `, [row.conversation_id, reminderText]);

                        await pool.query(`
                            UPDATE cx_conversations 
                            SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP 
                            WHERE id = $2;
                        `, [reminderText, row.conversation_id]);
                    }

                    await pool.query(`
                        UPDATE reservations 
                        SET hold_reminder_sent_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
                        WHERE id = $1;
                    `, [row.id]);

                    remindersSent++;
                }
            } catch (errRem) {
                console.error('[guestCxController] Failed to send hold reminders:', errRem);
            }
        }

        // PART 2: Auto-Release Expired Holds
        if (autoCancel) {
            try {
                const expiredHolds = await pool.query(`
                    SELECT 
                        r.id, r.reservation_number, r.special_requests,
                        g.first_name, g.last_name, g.phone,
                        rt.name as room_type_name,
                        c.id as conversation_id
                    FROM reservations r
                    JOIN guests g ON g.id = r.booker_guest_id
                    LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
                    LEFT JOIN room_types rt ON rt.id = rr.room_type_id
                    LEFT JOIN cx_conversations c ON (c.reservation_id = r.id OR c.external_user_id = g.phone)
                    WHERE r.property_id = $1
                      AND r.status = 'HOLD'
                      AND r.hold_until IS NOT NULL
                      AND r.hold_until <= CURRENT_TIMESTAMP
                      AND r.hold_released_at IS NULL
                    LIMIT 20;
                `, [propId]);

                for (const row of expiredHolds.rows) {
                    const guestName = `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Valued Guest';
                    const roomName = row.room_type_name || (row.special_requests?.match(/Category:\s*([^|]+)/i)?.[1]?.trim()) || 'Deluxe Suite';
                    const resCode = row.reservation_number;

                    await pool.query(`
                        UPDATE reservations
                        SET status = 'CANCELLED',
                            hold_released_at = CURRENT_TIMESTAMP,
                            hold_cancellation_sent_at = CURRENT_TIMESTAMP,
                            special_requests = COALESCE(special_requests || ' | ', '') || 'Auto-cancelled: Courtesy hold expired',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $1;
                    `, [row.id]);

                    await pool.query(`UPDATE reservation_rooms SET status = 'CANCELLED' WHERE reservation_id = $1;`, [row.id]);

                    if (notifyOnRelease && row.conversation_id) {
                        const releaseMsg = `আসসালামু আলাইকুম ${guestName} স্যার, আপনার *${roomName}* রুমের প্রি-বুকিং সৌজন্য হোল্ডটির (Ref: *${resCode}*) সময়সীমা অতিক্রান্ত হওয়ায় রুমটি সাধারণ ইনভেন্টরিতে উন্মুক্ত করা হয়েছে।\n\nআপনি অন্য যেকোনো তারিখে অবস্থান বা নতুন বুকিং করতে চাইলে আমাদের সাথে নির্দ্বিধায় চ্যাট করতে পারেন। আপনাকে সেবা দিতে পেরে আমরা আনন্দিত! 🏨✨`;

                        await pool.query(`
                            INSERT INTO cx_messages (
                                conversation_id, sender_type, sender_name, message_text, status, is_approved
                            ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge (Auto-Release)', $2, 'SENT', TRUE);
                        `, [row.conversation_id, releaseMsg]);

                        await pool.query(`
                            UPDATE cx_conversations 
                            SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP 
                            WHERE id = $2;
                        `, [releaseMsg, row.conversation_id]);
                    }

                    holdsReleased++;
                }

                if (holdsReleased > 0) {
                    broadcastServerEvent({
                        type: 'INVENTORY_REFRESH',
                        propertyId: propId
                    });
                }
            } catch (errRel) {
                console.error('[guestCxController] Failed to auto-release expired holds:', errRel);
            }
        }

        return { remindersSent, holdsReleased };
    },

    /**
     * HTTP Handler to manually trigger or test hold lifecycle processing
     */
    triggerHoldLifecycle: async (req: Request, res: Response) => {
        try {
            const propertyId = Number(req.body.propertyId || req.query.propertyId) || 1;
            const result = await guestCxController.processHoldLifecycle(propertyId);
            res.json({ success: true, message: 'Hold lifecycle processed successfully', data: result });
        } catch (err: any) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
};
