import type { Pool } from 'pg';

/**
 * GuestFlow (StayPulse) Database Schema
 * Manages Omnichannel Conversations, Message History, AI Reply Modes, 
 * Pre-Arrival Digital KYC, and Automated Guest Journeys.
 */
export async function ensureGuestCxSchema(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        // 1. Extend reservations table with Pre-Check-in & Digital KYC columns
        await client.query(`
            ALTER TABLE reservations 
            ADD COLUMN IF NOT EXISTS is_pre_checked_in BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS pre_checkin_eta VARCHAR(16),
            ADD COLUMN IF NOT EXISTS kyc_verified BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS digital_signature_data TEXT,
            ADD COLUMN IF NOT EXISTS id_document_type VARCHAR(32),
            ADD COLUMN IF NOT EXISTS id_document_number VARCHAR(64),
            ADD COLUMN IF NOT EXISTS id_document_front_url TEXT,
            ADD COLUMN IF NOT EXISTS id_document_back_url TEXT,
            ADD COLUMN IF NOT EXISTS luggage_tag_number VARCHAR(64),
            ADD COLUMN IF NOT EXISTS arrived_early_at TIMESTAMPTZ;
        `);

        // 2. Connected Multi-Channel Social & Messaging Accounts Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS cx_connected_accounts (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                channel_type VARCHAR(32) NOT NULL, -- 'WHATSAPP', 'FACEBOOK_PAGE', 'INSTAGRAM_BUSINESS'
                account_name VARCHAR(128) NOT NULL, -- e.g. "Main Front Desk WhatsApp", "Grand Palace FB Page", "@grandpalace_resort IG"
                account_identifier VARCHAR(128) NOT NULL, -- Phone Number ID / FB Page ID / Instagram Account ID
                page_username VARCHAR(128), -- e.g. @grandpalacehotel
                phone_number VARCHAR(32), -- formatted phone number
                access_token TEXT NOT NULL, -- Meta Graph Page Token or System User Token
                verify_token VARCHAR(128),
                app_secret VARCHAR(128),
                ai_mode VARCHAR(32) NOT NULL DEFAULT 'SUGGEST', -- 'OFF', 'SUGGEST', 'AUTOPILOT'
                auto_reply_comments BOOLEAN DEFAULT TRUE, -- Automatically reply to comments on posts/reels
                send_private_dm_on_comment BOOLEAN DEFAULT TRUE, -- Automatically send private DM when someone comments
                comment_ai_prompt TEXT, -- Custom system prompt or guidance for comments
                is_active BOOLEAN DEFAULT TRUE,
                metadata_json JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_channel_account UNIQUE (property_id, channel_type, account_identifier)
            );
        `);

        // 3. Unified Guest Conversations Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS cx_conversations (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                channel_account_id BIGINT REFERENCES cx_connected_accounts(id) ON DELETE SET NULL,
                guest_id BIGINT,
                reservation_id BIGINT,
                channel VARCHAR(32) NOT NULL DEFAULT 'WHATSAPP', -- 'WHATSAPP', 'MESSENGER', 'FACEBOOK_COMMENT', 'INSTAGRAM_DM', 'INSTAGRAM_COMMENT', 'WEB_CHAT', 'SMS'
                source_type VARCHAR(32) DEFAULT 'DIRECT_MESSAGE', -- 'DIRECT_MESSAGE', 'POST_COMMENT'
                external_user_id VARCHAR(128) NOT NULL, -- Phone Number, FB Scoped ID, or IG Scoped ID
                guest_name VARCHAR(128) NOT NULL DEFAULT 'Guest',
                status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'PENDING_APPROVAL', 'RESOLVED', 'BOT_ACTIVE'
                ai_mode VARCHAR(32) NOT NULL DEFAULT 'SUGGEST', -- 'OFF', 'SUGGEST', 'AUTOPILOT'
                sentiment VARCHAR(32) NOT NULL DEFAULT 'NEUTRAL', -- 'POSITIVE', 'NEUTRAL', 'FRUSTRATED', 'ANGRY'
                last_message_text TEXT,
                last_message_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                unread_count INT NOT NULL DEFAULT 0,
                assigned_staff_id BIGINT,
                post_id VARCHAR(128),
                comment_id VARCHAR(128),
                post_url TEXT,
                metadata_json JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_channel_external_user UNIQUE (property_id, channel, external_user_id)
            );
        `);

        // Migration safety: Ensure new columns exist if table was already created
        await client.query(`
            ALTER TABLE cx_conversations
            ADD COLUMN IF NOT EXISTS channel_account_id BIGINT REFERENCES cx_connected_accounts(id) ON DELETE SET NULL,
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'DIRECT_MESSAGE',
            ADD COLUMN IF NOT EXISTS post_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS comment_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS post_url TEXT,
            ADD COLUMN IF NOT EXISTS takeover_until TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS handoff_reason VARCHAR(64);

            ALTER TABLE cx_messages
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'DIRECT_MESSAGE',
            ADD COLUMN IF NOT EXISTS post_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS comment_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;
        `);

        // Index on last_message_at and status for ultra-fast inbox queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cx_conv_prop_status 
            ON cx_conversations (property_id, status, last_message_at DESC);
        `);

        // 4. Message History Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS cx_messages (
                id BIGSERIAL PRIMARY KEY,
                conversation_id BIGINT NOT NULL REFERENCES cx_conversations(id) ON DELETE CASCADE,
                sender_type VARCHAR(32) NOT NULL, -- 'GUEST', 'STAFF', 'AI_BOT'
                sender_id BIGINT, -- Staff user id if sender_type = 'STAFF'
                sender_name VARCHAR(128),
                message_text TEXT NOT NULL,
                media_url VARCHAR(512),
                media_type VARCHAR(64), -- 'TEXT', 'IMAGE', 'PDF', 'AUDIO', 'ROOM_CARD', 'PAYMENT_LINK'
                status VARCHAR(32) NOT NULL DEFAULT 'DELIVERED', -- 'SENT', 'DELIVERED', 'READ', 'FAILED'
                suggested_reply TEXT, -- AI-generated response waiting for staff approval in SUGGEST mode
                is_approved BOOLEAN DEFAULT TRUE,
                source_type VARCHAR(32) DEFAULT 'DIRECT_MESSAGE', -- 'DIRECT_MESSAGE', 'POST_COMMENT'
                post_id VARCHAR(128),
                comment_id VARCHAR(128),
                parent_comment_id VARCHAR(128),
                metadata_json JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            ALTER TABLE cx_messages
            ADD COLUMN IF NOT EXISTS source_type VARCHAR(32) DEFAULT 'DIRECT_MESSAGE',
            ADD COLUMN IF NOT EXISTS post_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS comment_id VARCHAR(128),
            ADD COLUMN IF NOT EXISTS parent_comment_id VARCHAR(128);
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cx_msg_conv 
            ON cx_messages (conversation_id, created_at ASC);
        `);

        // 4. Automated StayPulse Guest Journeys Table
        await client.query(`
            CREATE TABLE IF NOT EXISTS cx_guest_journeys (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1,
                reservation_id BIGINT,
                guest_phone VARCHAR(64) NOT NULL,
                journey_type VARCHAR(64) NOT NULL, -- 'PRE_ARRIVAL_KYC', 'WELCOME_WIFI', 'IN_STAY_SERVICE', 'CHECKOUT_INVOICE', 'REVIEW_BOOSTER'
                scheduled_for TIMESTAMPTZ NOT NULL,
                status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'SENT', 'FAILED', 'CANCELLED'
                dispatched_at TIMESTAMPTZ,
                secure_token VARCHAR(256),
                metadata_json JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_cx_journeys_sched 
            ON cx_guest_journeys (status, scheduled_for ASC);
        `);

        console.log('✓ [GuestFlow / StayPulse] Database schema verified and active.');
    } catch (err: any) {
        console.error('Failed to initialize GuestFlow database schema:', err);
    } finally {
        client.release();
    }
}
