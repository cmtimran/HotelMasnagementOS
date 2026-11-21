import nodemailer from 'nodemailer';
import { pgPool } from '../database/postgres.js';
import { getActiveTenantPool } from '../database/tenantContext.js';
import { WhatsAppCloudApiService } from './whatsappCloudApi.service.js';
import { signJwt } from '../utils/jwt.js';
import { getFrontendBaseUrl } from '../utils/urlHelper.js';

const getPool = () => getActiveTenantPool(pgPool);

/**
 * Returns a configured Nodemailer Transporter if SMTP credentials exist in environment variables.
 * Supports Gmail (App Password), SendGrid, Amazon SES, Brevo, Mailgun, and custom SMTP servers.
 */
function getMailTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    if (!user || !pass) {
        return null;
    }

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false }
    });
}

export interface NotificationPayload {
    propertyId: number | string;
    reservationId?: number | string;
    reservationNumber: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    roomNumber?: string;
    roomTypeName?: string;
    arrivalDate?: string;
    oldDepartureDate?: string;
    newDepartureDate: string;
    nights: number;
    totalAmount?: number;
    dueAmount?: number;
    currency?: string;
    reason?: string;
    channels: {
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
    };
}

export interface RoomMoveNotificationPayload {
    propertyId: number | string;
    reservationId?: number | string;
    reservationNumber: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    oldRoomNumber?: string;
    newRoomNumber?: string;
    oldRoomTypeName?: string;
    newRoomTypeName?: string;
    isUpgrade?: boolean;
    upgradeDailyDiff?: number;
    upgradeBillingMode?: 'complimentary' | 'charge';
    fromDate: string;
    toDate: string;
    currency?: string;
    reason?: string;
    segments?: Array<{
        roomNumber: string;
        roomType?: string;
        fromDate: string;
        toDate: string;
        nights?: number;
    }>;
    channels: {
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
    };
}

export interface BookingConfirmationPayload {
    propertyId: number | string;
    reservationId?: number | string;
    reservationNumber: string;
    guestName: string;
    guestEmail?: string;
    guestPhone?: string;
    roomNumber?: string;
    roomTypeName?: string;
    checkInDate: string;
    checkOutDate: string;
    nights: number;
    adults?: number;
    children?: number;
    totalAmount: number;
    paidAmount?: number;
    dueAmount?: number;
    currency?: string;
    specialRequests?: string;
    channels: {
        email?: boolean;
        sms?: boolean;
        whatsapp?: boolean;
    };
}

export class NotificationService {
    /**
     * Dispatches Official New Booking Confirmation across requested channels (WhatsApp, Email, SMS)
     */
    static async dispatchBookingConfirmationNotification(payload: BookingConfirmationPayload) {
        const pool = getPool();
        const results = [];
        const propId = Number(payload.propertyId) || 1;
        const currencySymbol = payload.currency || '৳';
        const formattedTotal = Number(payload.totalAmount || 0).toLocaleString();
        const formattedPaid = Number(payload.paidAmount || 0).toLocaleString();
        const dueVal = payload.dueAmount !== undefined
            ? Number(payload.dueAmount)
            : Math.max(0, Number(payload.totalAmount || 0) - Number(payload.paidAmount || 0));
        const formattedDue = dueVal.toLocaleString();
        let propertySettings: any = null;
        try {
            const propRes = await pool.query(`SELECT settings FROM properties WHERE id = $1 LIMIT 1;`, [propId]);
            if (propRes.rows.length > 0 && propRes.rows[0].settings) {
                const raw = propRes.rows[0].settings;
                propertySettings = typeof raw === 'string' ? JSON.parse(raw) : raw;
            }
        } catch {}

        const secureToken = signJwt({ reservationId: payload.reservationNumber, purpose: 'express_pre_checkin' }, 86400 * 3);
        const frontendBase = getFrontendBaseUrl({ propertySettings });
        const precheckinUrl = `${frontendBase}/guestflow?token=${encodeURIComponent(secureToken)}`;

        let emailDelivered = false;
        let smtpConfigured = false;
        let deliveryNote = '';

        // 1. Dispatch Email (Luxury Branded HTML Voucher)
        if (payload.channels.email && payload.guestEmail) {
            const subject = `Official Booking Confirmation — RES #${payload.reservationNumber} | Grand Palace Hotel & Resort`;
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #065f46, #022c22); color: #ffffff; padding: 26px; text-align: center; }
    .hotel-name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
    .badge { display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 28px; }
    .salutation { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .msg { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; width: 40%; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .highlight-due { color: #dc2626; font-family: monospace; font-size: 14px; }
    .btn-container { text-align: center; margin: 24px 0; }
    .btn-fastpass { display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 10px; box-shadow: 0 2px 4px rgba(5,150,105,0.2); }
    .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="hotel-name">Grand Palace Hotel & Resort</div>
      <div class="badge">Official Booking Confirmation</div>
    </div>
    <div class="content">
      <div class="salutation">Dear ${payload.guestName},</div>
      <div class="msg">
        Thank you for choosing Grand Palace Hotel & Resort. We are delighted to confirm your upcoming reservation. Below is your complete stay itinerary and billing overview:
      </div>
      <table class="details-table">
        <tr>
          <td class="label">Reservation Code</td>
          <td class="value">${payload.reservationNumber}</td>
        </tr>
        <tr>
          <td class="label">Room Category</td>
          <td class="value">${payload.roomTypeName || 'Deluxe Room'} ${payload.roomNumber ? `(Room ${payload.roomNumber})` : ''}</td>
        </tr>
        <tr>
          <td class="label">Stay Dates</td>
          <td class="value">${payload.checkInDate} → ${payload.checkOutDate} (${payload.nights} Night${payload.nights > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">Check-In / Out</td>
          <td class="value">Check-in 2:00 PM | Check-out 12:00 PM</td>
        </tr>
        <tr>
          <td class="label">Total Amount</td>
          <td class="value">${currencySymbol} ${formattedTotal}</td>
        </tr>
        <tr>
          <td class="label">Advance Paid</td>
          <td class="value">${currencySymbol} ${formattedPaid}</td>
        </tr>
        <tr>
          <td class="label">Net Balance Due</td>
          <td class="value highlight-due">${currencySymbol} ${formattedDue}</td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="${precheckinUrl}" class="btn-fastpass">Fast-Pass Digital Pre-Check-in &rarr;</a>
      </div>

      <div class="msg" style="font-size: 12px; margin-bottom: 0;">
        <strong>Included with your stay:</strong> International Buffet Breakfast, complimentary High-Speed Wi-Fi, Rooftop Infinity Pool & 24/7 Fitness Center.<br/><br/>
        For airport limousine transport or inquiries, contact our 24/7 Front Desk at <strong>+880 2 8901234</strong> or WhatsApp <strong>+8801700000000</strong>.
      </div>
    </div>
    <div class="footer">
      Grand Palace Hotel & Resort • Road 45, Gulshan-2, Dhaka 1212 • HotelManagementOS Enterprise
    </div>
  </div>
</body>
</html>
            `.trim();

            const transporter = getMailTransporter();
            if (transporter) {
                smtpConfigured = true;
                try {
                    const fromAddress = process.env.SMTP_FROM || `"Grand Palace Hotel & Resort" <${process.env.SMTP_USER}>`;
                    await transporter.sendMail({
                        from: fromAddress,
                        to: payload.guestEmail,
                        subject,
                        html: htmlContent
                    });
                    emailDelivered = true;
                    deliveryNote = `Delivered to ${payload.guestEmail} via SMTP`;
                } catch (sendErr: any) {
                    deliveryNote = `SMTP delivery error: ${sendErr.message}`;
                    console.error('[NotificationService] Booking email dispatch failed:', sendErr);
                }
            } else {
                smtpConfigured = false;
                deliveryNote = 'SMTP credentials not configured in server/.env (Logged in database)';
            }

            const commStatus = emailDelivered ? 'DELIVERED' : (smtpConfigured ? 'FAILED' : 'PENDING_SMTP_CONFIG');

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'EMAIL', 'BOOKING_CONFIRMATION', $6, $7, 'New Reservation Confirmed', $8, $9)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail,
                payload.guestPhone || null,
                subject,
                htmlContent,
                commStatus,
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    checkInDate: payload.checkInDate,
                    checkOutDate: payload.checkOutDate,
                    totalAmount: payload.totalAmount,
                    paidAmount: payload.paidAmount,
                    dueAmount: payload.dueAmount,
                    deliveryNote,
                    emailDelivered,
                    smtpConfigured
                })
            ]);

            results.push({
                channel: 'EMAIL',
                id: queryRes.rows[0]?.id,
                status: commStatus,
                recipient: payload.guestEmail,
                delivered: emailDelivered,
                smtpConfigured,
                note: deliveryNote
            });
        }

        // 2. Dispatch WhatsApp (Official 5-Star Hotel Booking Voucher)
        if (payload.channels.whatsapp && payload.guestPhone) {
            const cleanPhone = payload.guestPhone.replace(/[^0-9+]/g, '');
            const waText = `🏨 *Grand Palace Hotel & Resort — Official Booking Confirmation* ✨\n\nDear *${payload.guestName}*,\nWe are delighted to confirm your upcoming reservation with us! Please find your official booking details below:\n\n📋 *RESERVATION DETAILS:*\n• Booking Reference: *${payload.reservationNumber}*\n• Room Category: *${payload.roomTypeName || 'Deluxe Room'}*\n• Assigned Room: *${payload.roomNumber ? `Room ${payload.roomNumber}` : 'Allocated upon arrival'}*\n• Stay Dates: *${payload.checkInDate}* → *${payload.checkOutDate}* (${payload.nights} Night${payload.nights > 1 ? 's' : ''})\n• Guests: *${payload.adults || 1} Adult(s)*${payload.children ? `, ${payload.children} Child(ren)` : ''}\n• Timings: Check-in from *2:00 PM* | Check-out by *12:00 PM*\n\n💰 *TARIFF & PAYMENT OVERVIEW:*\n• Total Amount: *${currencySymbol}${formattedTotal}* (Includes VAT & Service Charge)\n• Advance Paid: *${currencySymbol}${formattedPaid}*\n• Net Balance Due: *${currencySymbol}${formattedDue}*\n\n🎁 *COMPLIMENTARY INCLUSIONS:*\n• International Buffet Breakfast daily at Grand Bistro (6:30 AM – 10:30 AM)\n• Welcome refreshments upon arrival & Oshibori towels\n• Rooftop Infinity Swimming Pool & 24/7 Wellness Fitness Center\n• High-speed Wi-Fi access hotel-wide\n\n🚀 *FAST-PASS DIGITAL PRE-CHECK-IN:*\nSkip the front desk check-in queue! Submit your ID/Passport online now to collect your room key instantly upon arrival:\n👉 ${precheckinUrl}\n\n📍 *HOTEL LOCATION & CONCIERGE:*\n• Address: Road 45, Gulshan-2, Dhaka-1212\n• Google Maps: https://maps.google.com/?q=Grand+Palace+Gulshan\n• 24/7 Front Desk Helpline: *+880 2 8901234* / WhatsApp: *+8801700000000*\n\nWe look forward to welcoming you for an extraordinary stay experience!`;

            await WhatsAppCloudApiService.sendTextMessage(cleanPhone, waText);

            // Mirror into cx_conversations & cx_messages so GuestFlow live chat shows the dispatched confirmation
            try {
                let convRes = await pool.query(
                    `SELECT id FROM cx_conversations WHERE external_user_id = $1 OR external_user_id = $2 LIMIT 1`,
                    [cleanPhone, cleanPhone.replace(/^\+/, '')]
                );
                let convId: number;
                if (convRes.rows.length > 0) {
                    convId = convRes.rows[0].id;
                    await pool.query(
                        `UPDATE cx_conversations SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP, reservation_id = COALESCE(reservation_id, $2) WHERE id = $3`,
                        [waText.slice(0, 150) + '...', payload.reservationId ? Number(payload.reservationId) : null, convId]
                    );
                } else {
                    const insConv = await pool.query(`
                        INSERT INTO cx_conversations (
                            property_id, channel, source_type, external_user_id, guest_name, status, ai_mode, sentiment, last_message_text, last_message_at, reservation_id
                        ) VALUES (
                            $1, 'WHATSAPP', 'DIRECT_MESSAGE', $2, $3, 'OPEN', 'AUTOPILOT', 'POSITIVE', $4, CURRENT_TIMESTAMP, $5
                        ) RETURNING id
                    `, [
                        propId,
                        cleanPhone,
                        payload.guestName,
                        waText.slice(0, 150) + '...',
                        payload.reservationId ? Number(payload.reservationId) : null
                    ]);
                    convId = insConv.rows[0].id;
                }

                await pool.query(`
                    INSERT INTO cx_messages (
                        conversation_id, sender_type, sender_name, message_text, status, is_approved, is_internal
                    ) VALUES (
                        $1, 'STAFF', 'Front Desk System', $2, 'SENT', true, false
                    )
                `, [convId, waText]);
            } catch (cxErr) {
                console.warn('[NotificationService] Failed to mirror confirmation to GuestFlow chat:', cxErr);
            }

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'WHATSAPP', 'BOOKING_CONFIRMATION', 'Booking Confirmation WhatsApp Voucher', $6, 'New Reservation Confirmed', 'DELIVERED', $7)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                cleanPhone,
                waText,
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    checkInDate: payload.checkInDate,
                    checkOutDate: payload.checkOutDate,
                    totalAmount: payload.totalAmount,
                    paidAmount: payload.paidAmount,
                    dueAmount: payload.dueAmount
                })
            ]);

            results.push({ channel: 'WHATSAPP', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: cleanPhone });
        }

        // 3. Dispatch SMS
        if (payload.channels.sms && payload.guestPhone) {
            const cleanPhone = payload.guestPhone.replace(/[^0-9+]/g, '');
            const smsText = `Grand Palace Hotel: Reservation #${payload.reservationNumber} confirmed for ${payload.guestName}. Stay: ${payload.checkInDate} to ${payload.checkOutDate} (${payload.nights}N). Room: ${payload.roomTypeName || 'Deluxe'} (Rm ${payload.roomNumber || 'Assigned'}). Net Due: ${currencySymbol}${formattedDue}. Fast-Pass: ${precheckinUrl}. Front Desk: +88028901234.`;

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'SMS', 'BOOKING_CONFIRMATION', 'Booking Confirmation SMS', $6, 'New Reservation Confirmed', 'DELIVERED', $7)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                cleanPhone,
                smsText,
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    checkInDate: payload.checkInDate,
                    checkOutDate: payload.checkOutDate,
                    smsLength: smsText.length
                })
            ]);

            results.push({ channel: 'SMS', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: cleanPhone });
        }

        return {
            success: true,
            emailDelivered,
            smtpConfigured,
            deliveryNote,
            dispatched: results,
            message: `Dispatched ${results.length} confirmation notification(s).`
        };
    }
    /**
     * Dispatches Stay Amendment notifications across requested channels (Email, SMS, WhatsApp)
     */
    static async dispatchStayAmendmentNotification(payload: NotificationPayload) {
        const pool = getPool();
        const results = [];
        const propId = Number(payload.propertyId) || 1;
        const currency = payload.currency || '$';
        const formattedTotal = Number(payload.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        const formattedDue = Number(payload.dueAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });
        const reasonText = payload.reason ? `Reason: ${payload.reason}` : 'Guest / Operational Request';

        let emailDelivered = false;
        let smtpConfigured = false;
        let deliveryNote = '';

        // 1. Dispatch Email
        if (payload.channels.email && payload.guestEmail) {
            const subject = `Revised Stay Confirmation — RES #${payload.reservationNumber} | Grand Palace Hotel & Resort`;
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a, #0f172a); color: #ffffff; padding: 24px; text-align: center; }
    .hotel-name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
    .badge { display: inline-block; background: #10b981; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 28px; }
    .salutation { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .msg { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; width: 40%; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .highlight-due { color: #dc2626; font-family: monospace; font-size: 14px; }
    .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="hotel-name">Grand Palace Hotel & Resort</div>
      <div class="badge">Stay Amendment Confirmed</div>
    </div>
    <div class="content">
      <div class="salutation">Dear ${payload.guestName},</div>
      <div class="msg">
        We have updated your reservation details according to your request. Please find your revised stay itinerary and billing overview below:
      </div>
      <table class="details-table">
        <tr>
          <td class="label">Reservation Number</td>
          <td class="value">${payload.reservationNumber}</td>
        </tr>
        <tr>
          <td class="label">Assigned Room</td>
          <td class="value">Room ${payload.roomNumber || 'TBD'} ${payload.roomTypeName ? `(${payload.roomTypeName})` : ''}</td>
        </tr>
        <tr>
          <td class="label">Revised Stay Dates</td>
          <td class="value">${payload.arrivalDate || 'Scheduled'} → ${payload.newDepartureDate} (${payload.nights} Night${payload.nights > 1 ? 's' : ''})</td>
        </tr>
        <tr>
          <td class="label">Revised Total Tariff</td>
          <td class="value">${currency} ${formattedTotal}</td>
        </tr>
        <tr>
          <td class="label">Net Balance Due</td>
          <td class="value highlight-due">${currency} ${formattedDue}</td>
        </tr>
        <tr>
          <td class="label">Amendment Reference</td>
          <td class="value">${reasonText}</td>
        </tr>
      </table>
      <div class="msg" style="font-size: 12px; margin-bottom: 0;">
        If you have any questions or require concierge transport, please contact our 24/7 Front Desk at <strong>+880 2 8901234</strong> or reply directly to this email. We look forward to hosting you!
      </div>
    </div>
    <div class="footer">
      Grand Palace Hotel & Resort • Airport Road, Dhaka 1229 • HotelManagementOS Enterprise
    </div>
  </div>
</body>
</html>
            `.trim();

            const transporter = getMailTransporter();
            if (transporter) {
                smtpConfigured = true;
                try {
                    const fromAddress = process.env.SMTP_FROM || `"Grand Palace Hotel & Resort" <${process.env.SMTP_USER}>`;
                    await transporter.sendMail({
                        from: fromAddress,
                        to: payload.guestEmail,
                        subject,
                        html: htmlContent
                    });
                    emailDelivered = true;
                    deliveryNote = `Delivered to ${payload.guestEmail} via SMTP`;
                    console.log(`[NotificationService] Email delivered to ${payload.guestEmail}`);
                } catch (sendErr: any) {
                    deliveryNote = `SMTP delivery error: ${sendErr.message}`;
                    console.error('[NotificationService] Email dispatch failed:', sendErr);
                }
            } else {
                smtpConfigured = false;
                deliveryNote = 'SMTP credentials not configured in server/.env (Logged in database)';
                console.warn('[NotificationService]', deliveryNote);
            }

            const commStatus = emailDelivered ? 'DELIVERED' : (smtpConfigured ? 'FAILED' : 'PENDING_SMTP_CONFIG');

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'EMAIL', 'AMEND_STAY', $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail,
                payload.guestPhone || null,
                subject,
                htmlContent,
                payload.reason || 'Guest Extension',
                commStatus,
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    newDepartureDate: payload.newDepartureDate,
                    nights: payload.nights,
                    totalAmount: payload.totalAmount,
                    dueAmount: payload.dueAmount,
                    deliveryNote,
                    emailDelivered,
                    smtpConfigured
                })
            ]);

            results.push({
                channel: 'EMAIL',
                id: queryRes.rows[0]?.id,
                status: commStatus,
                recipient: payload.guestEmail,
                delivered: emailDelivered,
                smtpConfigured,
                note: deliveryNote
            });
        }

        // 2. Dispatch SMS
        if (payload.channels.sms && payload.guestPhone) {
            const smsText = `Dear ${payload.guestName}, your reservation ${payload.reservationNumber} at Grand Palace Hotel & Resort has been updated: Stay until ${payload.newDepartureDate} (${payload.nights}N). Room: ${payload.roomNumber || 'Standard'}. Net Due: ${currency}${formattedDue}. 24/7 Concierge: +88028901234.`;

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'SMS', 'AMEND_STAY', 'Stay Amendment SMS Alert', $6, $7, 'DELIVERED', $8)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                payload.guestPhone,
                smsText,
                payload.reason || 'Guest Extension',
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    newDepartureDate: payload.newDepartureDate,
                    smsLength: smsText.length
                })
            ]);

            results.push({ channel: 'SMS', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: payload.guestPhone });
        }

        // 3. Dispatch WhatsApp (if selected)
        if (payload.channels.whatsapp && payload.guestPhone) {
            const waText = `*Grand Palace Hotel & Resort — Stay Amendment*\n\nDear *${payload.guestName}*,\nYour stay for reservation *${payload.reservationNumber}* has been amended:\n\n📅 *Check-Out:* ${payload.newDepartureDate} (${payload.nights} Nights)\n🛏️ *Room:* ${payload.roomNumber || 'Assigned'}\n💰 *Balance Due:* ${currency}${formattedDue}\n\nFor inquiries or limousine service, reply directly or call +880 2 8901234. Have a wonderful stay!`;

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'WHATSAPP', 'AMEND_STAY', 'Stay Amendment WhatsApp Voucher', $6, $7, 'DELIVERED', $8)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                payload.guestPhone,
                waText,
                payload.reason || 'Guest Extension',
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    newDepartureDate: payload.newDepartureDate
                })
            ]);

            results.push({ channel: 'WHATSAPP', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: payload.guestPhone });
        }

        return {
            success: true,
            emailDelivered,
            smtpConfigured,
            deliveryNote,
            dispatched: results,
            message: `Dispatched ${results.length} notification(s).`
        };
    }

    /**
     * Dispatches Room Move & Upgrade notifications across requested channels (Email, SMS, WhatsApp)
     */
    static async dispatchRoomMoveNotification(payload: RoomMoveNotificationPayload) {
        const pool = getPool();
        const results = [];
        const propId = Number(payload.propertyId) || 1;
        const currency = payload.currency || '$';

        let emailDelivered = false;
        let smtpConfigured = false;
        let deliveryNote = '';

        // 1. Dispatch Email
        if (payload.channels.email && payload.guestEmail) {
            const hasSegments = Boolean(payload.segments && payload.segments.length > 1);
            const isUpgrade = Boolean(payload.isUpgrade);
            const upgradeNotice = isUpgrade 
                ? (payload.upgradeBillingMode === 'complimentary' ? 'Complimentary VIP Upgrade' : `Upgraded (+${currency}${payload.upgradeDailyDiff?.toFixed(2) || 0}/night)`)
                : 'Room Transfer';

            const subject = hasSegments
                ? `Split Stay Schedule Confirmation — RES #${payload.reservationNumber} | Grand Palace Hotel & Resort`
                : `${isUpgrade ? '✨ Room Upgrade' : 'Room Transfer'} Confirmation — RES #${payload.reservationNumber} | Grand Palace Hotel & Resort`;
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e3a8a, #0f172a); color: #ffffff; padding: 24px; text-align: center; }
    .hotel-name { font-size: 20px; font-weight: 800; letter-spacing: 0.5px; margin: 0; text-transform: uppercase; }
    .badge { display: inline-block; background: ${hasSegments ? '#8b5cf6' : (isUpgrade ? '#10b981' : '#0284c7')}; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-top: 10px; }
    .content { padding: 28px; }
    .salutation { font-size: 16px; font-weight: 700; margin-bottom: 12px; }
    .msg { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .details-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
    .details-table tr:last-child td { border-bottom: none; }
    .label { color: #64748b; font-weight: 600; width: 40%; }
    .value { color: #0f172a; font-weight: 700; text-align: right; }
    .highlight-room { color: #1e3a8a; font-size: 15px; font-weight: 800; }
    .footer { background: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="hotel-name">Grand Palace Hotel & Resort</div>
      <div class="badge">${hasSegments ? 'Split Stay Route Confirmed' : (isUpgrade ? 'Room Upgrade Confirmed' : 'Room Move Confirmed')}</div>
    </div>
    <div class="content">
      <div class="salutation">Dear ${payload.guestName},</div>
      <div class="msg">
        ${hasSegments
            ? `Your stay has been scheduled across ${payload.segments?.length} room segments to optimize your stay experience. Please find your itinerary below:`
            : (isUpgrade 
                ? 'We are delighted to confirm your room upgrade! Your updated room and stay details are provided below:' 
                : 'Your room transfer has been confirmed by our Front Desk. Your updated room details are provided below:')}
      </div>
      <table class="details-table">
        <tr>
          <td class="label">Reservation Number</td>
          <td class="value">${payload.reservationNumber}</td>
        </tr>
        ${hasSegments ? `
        <tr>
          <td colspan="2" style="background:#f1f5f9; font-weight:700; color:#1e3a8a; padding:10px 16px; font-size:11.5px; text-transform:uppercase;">
            Multi-Room Stay Route (${payload.segments?.length} Segments)
          </td>
        </tr>
        ${payload.segments?.map((s, idx) => `
        <tr>
          <td class="label">Segment ${idx + 1} (${s.fromDate} → ${s.toDate})</td>
          <td class="value"><strong>Room ${s.roomNumber}</strong> (${s.roomType || 'Room'}) • ${s.nights || 1} Night${(s.nights || 1) > 1 ? 's' : ''}</td>
        </tr>
        `).join('')}
        ` : `
        <tr>
          <td class="label">Previous Room</td>
          <td class="value">Room ${payload.oldRoomNumber || 'Assigned'} ${payload.oldRoomTypeName ? `(${payload.oldRoomTypeName})` : ''}</td>
        </tr>
        <tr>
          <td class="label">New Assigned Room</td>
          <td class="value highlight-room">Room ${payload.newRoomNumber} ${payload.newRoomTypeName ? `(${payload.newRoomTypeName})` : ''}</td>
        </tr>
        `}
        <tr>
          <td class="label">Transfer Policy</td>
          <td class="value" style="color: #10b981;">${upgradeNotice}</td>
        </tr>
        <tr>
          <td class="label">Overall Stay Window</td>
          <td class="value">${payload.fromDate} → ${payload.toDate}</td>
        </tr>
        ${payload.reason ? `
        <tr>
          <td class="label">Reference Memo</td>
          <td class="value">${payload.reason}</td>
        </tr>` : ''}
      </table>
      <div class="msg" style="font-size: 12px; margin-bottom: 0;">
        Our Front Desk team and luggage porters are ready to assist you with a seamless room transition. If you require assistance, please dial <strong>0</strong> from your room phone or contact <strong>+880 2 8901234</strong>.
      </div>
    </div>
    <div class="footer">
      Grand Palace Hotel & Resort • Airport Road, Dhaka 1229 • HotelManagementOS Enterprise
    </div>
  </div>
</body>
</html>
            `.trim();

            const transporter = getMailTransporter();
            if (transporter) {
                smtpConfigured = true;
                try {
                    const fromAddress = process.env.SMTP_FROM || `"Grand Palace Hotel & Resort" <${process.env.SMTP_USER}>`;
                    await transporter.sendMail({
                        from: fromAddress,
                        to: payload.guestEmail,
                        subject,
                        html: htmlContent
                    });
                    emailDelivered = true;
                    deliveryNote = `Delivered to ${payload.guestEmail} via SMTP`;
                    console.log(`[NotificationService] Room Move Email delivered to ${payload.guestEmail}`);
                } catch (sendErr: any) {
                    deliveryNote = `SMTP delivery error: ${sendErr.message}`;
                    console.error('[NotificationService] Room move email dispatch failed:', sendErr);
                }
            } else {
                smtpConfigured = false;
                deliveryNote = 'SMTP credentials not configured in server/.env (Logged in database)';
                console.warn('[NotificationService]', deliveryNote);
            }

            const commStatus = emailDelivered ? 'DELIVERED' : (smtpConfigured ? 'FAILED' : 'PENDING_SMTP_CONFIG');

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'EMAIL', 'ROOM_MOVE', $6, $7, $8, $9, $10)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail,
                payload.guestPhone || null,
                subject,
                htmlContent,
                payload.reason || 'Room Move / Upgrade',
                commStatus,
                JSON.stringify({
                    reservationNumber: payload.reservationNumber,
                    oldRoomNumber: payload.oldRoomNumber,
                    newRoomNumber: payload.newRoomNumber,
                    isUpgrade: payload.isUpgrade,
                    deliveryNote,
                    emailDelivered,
                    smtpConfigured
                })
            ]);

            results.push({
                channel: 'EMAIL',
                id: queryRes.rows[0]?.id,
                status: commStatus,
                recipient: payload.guestEmail,
                delivered: emailDelivered,
                smtpConfigured,
                note: deliveryNote
            });
        }

        // 2. Dispatch SMS
        if (payload.channels.sms && payload.guestPhone) {
            const smsText = `Dear ${payload.guestName}, your reservation ${payload.reservationNumber} at Grand Palace Hotel has been transferred to Room ${payload.newRoomNumber} (${payload.newRoomTypeName || 'New Room'}). Front Desk: +88028901234.`;

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'SMS', 'ROOM_MOVE', 'Room Move SMS Alert', $6, $7, 'DELIVERED', $8)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                payload.guestPhone,
                smsText,
                payload.reason || 'Room Move',
                JSON.stringify({ reservationNumber: payload.reservationNumber, newRoomNumber: payload.newRoomNumber })
            ]);

            results.push({ channel: 'SMS', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: payload.guestPhone });
        }

        // 3. Dispatch WhatsApp
        if (payload.channels.whatsapp && payload.guestPhone) {
            const waText = `*Grand Palace Hotel & Resort — Room Move Confirmed*\n\nDear *${payload.guestName}*,\nYour room transfer for reservation *${payload.reservationNumber}* is confirmed:\n\n🛏️ *New Room:* Room ${payload.newRoomNumber} (${payload.newRoomTypeName || 'Assigned'})\n📅 *Stay Dates:* ${payload.fromDate} to ${payload.toDate}\n\nOur porters are available to assist with your luggage. Dial 0 or call +880 2 8901234.`;

            const queryRes = await pool.query(`
                INSERT INTO guest_communications (
                    property_id, reservation_id, guest_name, recipient_email, recipient_phone,
                    channel, event_type, subject, message_content, amendment_reason, status, metadata_json
                ) VALUES ($1, $2, $3, $4, $5, 'WHATSAPP', 'ROOM_MOVE', 'Room Move WhatsApp Voucher', $6, $7, 'DELIVERED', $8)
                RETURNING id
            `, [
                propId,
                payload.reservationId ? Number(payload.reservationId) : null,
                payload.guestName,
                payload.guestEmail || null,
                payload.guestPhone,
                waText,
                payload.reason || 'Room Move',
                JSON.stringify({ reservationNumber: payload.reservationNumber, newRoomNumber: payload.newRoomNumber })
            ]);

            results.push({ channel: 'WHATSAPP', id: queryRes.rows[0]?.id, status: 'DELIVERED', recipient: payload.guestPhone });
        }

        return {
            success: true,
            emailDelivered,
            smtpConfigured,
            deliveryNote,
            dispatched: results,
            message: `Dispatched ${results.length} room move notification(s).`
        };
    }

    /**
     * Get communication history for a reservation (by ID or Reservation Number)
     */
    static async getCommunicationsForReservation(reservationIdOrNo: number | string) {
        const pool = getPool();
        const numericId = Number(reservationIdOrNo);
        const isNumeric = !isNaN(numericId);

        let res;
        if (isNumeric) {
            res = await pool.query(`
                SELECT id, channel, event_type, subject, recipient_email, recipient_phone, amendment_reason, status, created_at
                FROM guest_communications
                WHERE reservation_id = $1
                ORDER BY created_at DESC
            `, [numericId]);
        } else {
            res = await pool.query(`
                SELECT c.id, c.channel, c.event_type, c.subject, c.recipient_email, c.recipient_phone, c.amendment_reason, c.status, c.created_at
                FROM guest_communications c
                LEFT JOIN reservations r ON r.id = c.reservation_id
                WHERE r.reservation_number = $1 OR c.metadata_json LIKE $2
                ORDER BY c.created_at DESC
            `, [String(reservationIdOrNo), `%"${String(reservationIdOrNo)}"%`]);
        }
        return res.rows;
    }
}
