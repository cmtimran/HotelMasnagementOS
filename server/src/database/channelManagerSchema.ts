import { Pool } from 'pg';

export async function ensureChannelManagerSchema(pool: Pool): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Channel Connections (OTA Platforms)
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_connections (
                id VARCHAR(64) PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                name VARCHAR(128) NOT NULL,
                code VARCHAR(64) NOT NULL,
                logo_key VARCHAR(64) NOT NULL DEFAULT 'globe',
                hotel_id VARCHAR(128) NOT NULL DEFAULT 'HTL-88210',
                status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
                sync_type VARCHAR(32) NOT NULL DEFAULT '2-Way Realtime',
                commission_rate NUMERIC(5,2) NOT NULL DEFAULT 15.00,
                rate_multiplier NUMERIC(5,2) NOT NULL DEFAULT 1.00,
                currency VARCHAR(16) NOT NULL DEFAULT 'BDT',
                api_key TEXT DEFAULT '',
                api_secret TEXT DEFAULT '',
                webhook_url TEXT DEFAULT '',
                auto_sync_inventory BOOLEAN NOT NULL DEFAULT TRUE,
                auto_ingest_bookings BOOLEAN NOT NULL DEFAULT TRUE,
                last_sync_at TIMESTAMPTZ,
                last_sync_status VARCHAR(64) DEFAULT 'IDLE',
                last_error_message TEXT DEFAULT '',
                total_bookings_received INT NOT NULL DEFAULT 0,
                total_revenue_generated NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_channel_conn_prop ON channel_connections(property_id, status);
        `);

        // 2. Channel Room & Rate Mappings
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_room_mappings (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                channel_id VARCHAR(64) NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
                room_type_id BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
                rate_plan_id BIGINT REFERENCES rate_plans(id) ON DELETE SET NULL,
                ota_room_code VARCHAR(128) NOT NULL,
                ota_room_name VARCHAR(255) NOT NULL,
                ota_rate_code VARCHAR(128) NOT NULL DEFAULT 'BAR_STD',
                max_allotment INT DEFAULT 0,
                rate_multiplier NUMERIC(5,2) DEFAULT 1.00,
                rate_adjustment_type VARCHAR(32) DEFAULT 'PERCENT',
                rate_adjustment_value NUMERIC(10,2) DEFAULT 0.00,
                stop_sell BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_channel_mappings_prop ON channel_room_mappings(property_id, channel_id, room_type_id);
        `);

        // 3. Channel ARI Overrides (Daily / Bulk Overrides)
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_ari_overrides (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                channel_id VARCHAR(64) REFERENCES channel_connections(id) ON DELETE CASCADE,
                room_type_id BIGINT NOT NULL REFERENCES room_types(id) ON DELETE CASCADE,
                date DATE NOT NULL,
                rate_override NUMERIC(12,2) DEFAULT NULL,
                stop_sell BOOLEAN DEFAULT NULL,
                min_stay INT DEFAULT NULL,
                max_stay INT DEFAULT NULL,
                closed_to_arrival BOOLEAN DEFAULT NULL,
                closed_to_departure BOOLEAN DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT uq_channel_ari_override UNIQUE(property_id, channel_id, room_type_id, date)
            );
            CREATE INDEX IF NOT EXISTS idx_channel_ari_date ON channel_ari_overrides(property_id, room_type_id, date);
        `);

        // 4. Inbound Channel Bookings Queue
        await client.query(`
            CREATE TABLE IF NOT EXISTS channel_bookings (
                id BIGSERIAL PRIMARY KEY,
                property_id BIGINT NOT NULL DEFAULT 1 REFERENCES properties(id) ON DELETE CASCADE,
                reservation_id BIGINT REFERENCES reservations(id) ON DELETE SET NULL,
                channel_id VARCHAR(64) NOT NULL REFERENCES channel_connections(id) ON DELETE CASCADE,
                channel_booking_ref VARCHAR(128) NOT NULL,
                guest_name VARCHAR(255) NOT NULL,
                guest_email VARCHAR(255),
                guest_phone VARCHAR(64),
                room_type_name VARCHAR(128) NOT NULL,
                assigned_room_number VARCHAR(32) DEFAULT 'UNASSIGNED',
                check_in_date DATE NOT NULL,
                check_out_date DATE NOT NULL,
                nights INT NOT NULL DEFAULT 1,
                adults INT NOT NULL DEFAULT 1,
                children INT NOT NULL DEFAULT 0,
                total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                commission_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                net_payout NUMERIC(14,2) NOT NULL DEFAULT 0.00,
                currency VARCHAR(16) NOT NULL DEFAULT 'BDT',
                status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
                raw_payload_json TEXT DEFAULT '{}',
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_channel_bookings_prop ON channel_bookings(property_id, channel_id, created_at DESC);
        `);

        // 5. Seed Default Global OTAs if not existing
        const seedChannels = [
            { id: 'BOOKING_COM', name: 'Booking.com', code: 'BDC', logo_key: 'booking', hotel_id: 'BDC-77491', commission: 15.0, sync_type: '2-Way Realtime', multiplier: 1.15 },
            { id: 'AGODA', name: 'Agoda YCS', code: 'AGD', logo_key: 'agoda', hotel_id: 'AGD-30219', commission: 18.0, sync_type: '2-Way Realtime', multiplier: 1.18 },
            { id: 'EXPEDIA', name: 'Expedia Partner Central', code: 'EXP', logo_key: 'expedia', hotel_id: 'EXP-99214', commission: 16.0, sync_type: '2-Way Realtime', multiplier: 1.16 },
            { id: 'AIRBNB', name: 'Airbnb Pro Host', code: 'ABNB', logo_key: 'airbnb', hotel_id: 'ABNB-5412', commission: 14.0, sync_type: '2-Way Realtime', multiplier: 1.14 },
            { id: 'TRIP_COM', name: 'Trip.com (Ctrip Global)', code: 'TRIP', logo_key: 'trip', hotel_id: 'TRIP-1084', commission: 15.0, sync_type: '2-Way Realtime', multiplier: 1.15 },
            { id: 'MAKEMYTRIP', name: 'MakeMyTrip IngoMMT', code: 'MMT', logo_key: 'mmt', hotel_id: 'MMT-6218', commission: 17.0, sync_type: '2-Way Realtime', multiplier: 1.17 }
        ];

        for (const ch of seedChannels) {
            await client.query(`
                INSERT INTO channel_connections (
                    id, property_id, name, code, logo_key, hotel_id, status, sync_type, commission_rate, rate_multiplier
                ) VALUES ($1, 1, $2, $3, $4, $5, 'ACTIVE', $6, $7, $8)
                ON CONFLICT (id) DO NOTHING;
            `, [ch.id, ch.name, ch.code, ch.logo_key, ch.hotel_id, ch.sync_type, ch.commission, ch.multiplier]);
        }

        // Seed Sample Mappings for room types if available
        const roomTypeRows = await client.query('SELECT id, name FROM room_types WHERE property_id = 1 LIMIT 5;');
        if (roomTypeRows.rows.length > 0) {
            const rt = roomTypeRows.rows[0];
            await client.query(`
                INSERT INTO channel_room_mappings (
                    property_id, channel_id, room_type_id, ota_room_code, ota_room_name, ota_rate_code, rate_multiplier
                ) VALUES 
                (1, 'BOOKING_COM', $1, 'BDC_DLX_KING', $2 || ' (King Bed)', 'BAR_STD', 1.15),
                (1, 'AGODA', $1, 'AGD_DLX_01', $2 || ' YCS Standard', 'AGD_FLEX', 1.18),
                (1, 'EXPEDIA', $1, 'EXP_DLX_SUITE', $2 || ' Premier', 'EXP_PKG', 1.16)
                ON CONFLICT DO NOTHING;
            `, [rt.id, rt.name]);
        }

        // Seed Sample Inbound OTA Booking if empty
        const countBookingsRes = await client.query('SELECT COUNT(*) as c FROM channel_bookings WHERE property_id = 1');
        if (parseInt(countBookingsRes.rows[0]?.c || '0', 10) === 0) {
            await client.query(`
                INSERT INTO channel_bookings (
                    property_id, channel_id, channel_booking_ref, guest_name, guest_email, guest_phone,
                    room_type_name, assigned_room_number, check_in_date, check_out_date, nights,
                    adults, children, total_amount, commission_amount, net_payout, status
                ) VALUES 
                (1, 'BOOKING_COM', 'BDC-9821450', 'Md. Tanvir Ahmed', 'tanvir.ahmed@example.com', '+8801711223344', 'Deluxe Suite', '101', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '3 days', 2, 2, 0, 50000.00, 7500.00, 42500.00, 'CONFIRMED'),
                (1, 'AGODA', 'AGD-4912034', 'Sarah Jenkins', 'sarah.j@travelworld.com', '+447911123456', 'Deluxe Suite', '102', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '5 days', 3, 1, 0, 75000.00, 13500.00, 61500.00, 'CONFIRMED')
                ON CONFLICT DO NOTHING;
            `);
        }

        await client.query('COMMIT');
        console.log('✅ [Cloud PostgreSQL] Enterprise Channel Manager schema (connections, mappings, ARI overrides, inbound bookings) verified and active!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Failed to ensure channel manager schema:', e);
        throw e;
    } finally {
        client.release();
    }
}
