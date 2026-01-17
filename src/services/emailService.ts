// Email Service - Frontend Mock Implementation
// In production, this should call backend API endpoints

interface EmailTemplate {
    subject: string;
    body: string;
}

interface EmailData {
    to: string;
    subject: string;
    body: string;
    html?: string;
}

class EmailService {
    // Email templates
    private templates = {
        bookingConfirmation: (data: any): EmailTemplate => ({
            subject: `Booking Confirmation - ${data.bookingId}`,
            body: `
Dear ${data.guestName},

Thank you for your reservation at ${data.hotelName}.

Booking Details:
- Booking ID: ${data.bookingId}
- Check-in: ${data.checkIn}
- Check-out: ${data.checkOut}
- Room Type: ${data.roomType}
- Number of Guests: ${data.guests}
- Total Amount: $${data.totalAmount}

We look forward to welcoming you!

Best regards,
${data.hotelName} Team
            `
        }),

        paymentReceipt: (data: any): EmailTemplate => ({
            subject: `Payment Receipt - ${data.receiptNumber}`,
            body: `
Dear ${data.guestName},

Thank you for your payment.

Payment Details:
- Receipt Number: ${data.receiptNumber}
- Date: ${data.date}
- Amount Paid: $${data.amount}
- Payment Method: ${data.method}
- Balance: $${data.balance}

Best regards,
${data.hotelName} Team
            `
        }),

        checkInConfirmation: (data: any): EmailTemplate => ({
            subject: `Check-in Confirmation - Room ${data.roomNumber}`,
            body: `
Dear ${data.guestName},

Welcome to ${data.hotelName}!

Check-in Details:
- Room Number: ${data.roomNumber}
- Check-in Date: ${data.checkInDate}
- Check-out Date: ${data.checkOutDate}
- WiFi Password: ${data.wifiPassword}

Enjoy your stay!

Best regards,
${data.hotelName} Team
            `
        }),

        checkOutReceipt: (data: any): EmailTemplate => ({
            subject: `Check-out Receipt - Thank You`,
            body: `
Dear ${data.guestName},

Thank you for staying with us at ${data.hotelName}.

Final Bill:
- Room Charges: $${data.roomCharges}
- Additional Charges: $${data.additionalCharges}
- Total Paid: $${data.totalPaid}
- Balance: $${data.balance}

We hope to see you again soon!

Best regards,
${data.hotelName} Team
            `
        })
    };

    /**
     * Send booking confirmation email
     * In production: POST /api/email/booking-confirmation
     */
    async sendBookingConfirmation(data: any): Promise<boolean> {
        try {
            const template = this.templates.bookingConfirmation(data);

            // Mock implementation - log to console
            console.log('📧 Sending Booking Confirmation Email:');
            console.log('To:', data.email);
            console.log('Subject:', template.subject);
            console.log('Body:', template.body);

            // In production, call backend API:
            // const response = await fetch('/api/email/send', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ to: data.email, ...template })
            // });
            // return response.ok;

            // Mock success
            await this.delay(1000);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    /**
     * Send payment receipt email
     */
    async sendPaymentReceipt(data: any): Promise<boolean> {
        try {
            const template = this.templates.paymentReceipt(data);

            console.log('📧 Sending Payment Receipt Email:');
            console.log('To:', data.email);
            console.log('Subject:', template.subject);

            await this.delay(1000);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    /**
     * Send check-in confirmation email
     */
    async sendCheckInConfirmation(data: any): Promise<boolean> {
        try {
            const template = this.templates.checkInConfirmation(data);

            console.log('📧 Sending Check-in Confirmation Email:');
            console.log('To:', data.email);
            console.log('Subject:', template.subject);

            await this.delay(1000);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    /**
     * Send check-out receipt email
     */
    async sendCheckOutReceipt(data: any): Promise<boolean> {
        try {
            const template = this.templates.checkOutReceipt(data);

            console.log('📧 Sending Check-out Receipt Email:');
            console.log('To:', data.email);
            console.log('Subject:', template.subject);

            await this.delay(1000);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    /**
     * Send custom email
     */
    async sendCustomEmail(emailData: EmailData): Promise<boolean> {
        try {
            console.log('📧 Sending Custom Email:');
            console.log('To:', emailData.to);
            console.log('Subject:', emailData.subject);
            console.log('Body:', emailData.body);

            await this.delay(1000);
            return true;
        } catch (error) {
            console.error('Email send failed:', error);
            return false;
        }
    }

    // Helper method to simulate async operation
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export singleton instance
export const emailService = new EmailService();
export default emailService;
