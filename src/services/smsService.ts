// SMS Service - Frontend Mock Implementation
// In production, this should call backend API with Twilio integration

interface SMSTemplate {
    message: string;
}

interface SMSData {
    to: string;
    message: string;
}

class SMSService {
    // SMS templates (160 characters max for single SMS)
    private templates = {
        bookingConfirmation: (data: any): SMSTemplate => ({
            message: `${data.hotelName}: Booking confirmed! ID: ${data.bookingId}. Check-in: ${data.checkIn}. Room: ${data.roomType}. Total: $${data.totalAmount}`
        }),

        paymentConfirmation: (data: any): SMSTemplate => ({
            message: `${data.hotelName}: Payment received! Amount: $${data.amount}. Receipt: ${data.receiptNumber}. Balance: $${data.balance}. Thank you!`
        }),

        checkInReminder: (data: any): SMSTemplate => ({
            message: `${data.hotelName}: Check-in reminder for ${data.date}. Room ${data.roomNumber} ready at ${data.time}. See you soon!`
        }),

        checkOutReminder: (data: any): SMSTemplate => ({
            message: `${data.hotelName}: Check-out reminder for ${data.date} at ${data.time}. Please settle any pending bills. Thank you for staying with us!`
        }),

        promotionalOffer: (data: any): SMSTemplate => ({
            message: `${data.hotelName}: Special offer! ${data.offerText}. Book now: ${data.bookingLink}. Valid till ${data.validTill}`
        })
    };

    /**
     * Send booking confirmation SMS
     * In production: POST /api/sms/booking-confirmation
     */
    async sendBookingConfirmation(data: any): Promise<boolean> {
        try {
            const template = this.templates.bookingConfirmation(data);

            // Mock implementation - log to console
            console.log('📱 Sending Booking Confirmation SMS:');
            console.log('To:', data.phone);
            console.log('Message:', template.message);
            console.log('Length:', template.message.length, 'characters');

            // In production, call backend API:
            // const response = await fetch('/api/sms/send', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ to: data.phone, message: template.message })
            // });
            // return response.ok;

            // Mock success
            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Send payment confirmation SMS
     */
    async sendPaymentConfirmation(data: any): Promise<boolean> {
        try {
            const template = this.templates.paymentConfirmation(data);

            console.log('📱 Sending Payment Confirmation SMS:');
            console.log('To:', data.phone);
            console.log('Message:', template.message);

            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Send check-in reminder SMS
     */
    async sendCheckInReminder(data: any): Promise<boolean> {
        try {
            const template = this.templates.checkInReminder(data);

            console.log('📱 Sending Check-in Reminder SMS:');
            console.log('To:', data.phone);
            console.log('Message:', template.message);

            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Send check-out reminder SMS
     */
    async sendCheckOutReminder(data: any): Promise<boolean> {
        try {
            const template = this.templates.checkOutReminder(data);

            console.log('📱 Sending Check-out Reminder SMS:');
            console.log('To:', data.phone);
            console.log('Message:', template.message);

            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Send promotional offer SMS
     */
    async sendPromotionalOffer(data: any): Promise<boolean> {
        try {
            const template = this.templates.promotionalOffer(data);

            console.log('📱 Sending Promotional Offer SMS:');
            console.log('To:', data.phone);
            console.log('Message:', template.message);

            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Send custom SMS
     */
    async sendCustomSMS(smsData: SMSData): Promise<boolean> {
        try {
            console.log('📱 Sending Custom SMS:');
            console.log('To:', smsData.to);
            console.log('Message:', smsData.message);
            console.log('Length:', smsData.message.length, 'characters');

            // Validate message length
            if (smsData.message.length > 160) {
                console.warn('⚠️ Message exceeds 160 characters. Will be sent as multiple SMS.');
            }

            await this.delay(800);
            return true;
        } catch (error) {
            console.error('SMS send failed:', error);
            return false;
        }
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone: string): boolean {
        // Basic validation - adjust regex based on your requirements
        const phoneRegex = /^\+?[1-9]\d{1,14}$/;
        return phoneRegex.test(phone.replace(/[\s-]/g, ''));
    }

    /**
     * Format phone number to E.164 format
     */
    formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');

        // Add country code if not present
        if (!phone.startsWith('+')) {
            return `${countryCode}${cleaned}`;
        }

        return `+${cleaned}`;
    }

    // Helper method to simulate async operation
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const smsService = new SMSService();
export default smsService;
