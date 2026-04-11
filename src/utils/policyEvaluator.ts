/**
 * NICE-HMS Policy Evaluator Service
 * Centralizes the logic for evaluating stay, booking, and financial rules.
 */

export interface PolicyContext {
    bookingTime?: Date;
    checkInTime?: Date;
    arrivalTime?: string; // HH:mm
    departureTime?: string; // HH:mm
    amount?: number;
    staffRole?: 'staff' | 'manager' | 'admin';
}

export const evaluateCancellationPolicy = (context: PolicyContext) => {
    const now = new Date();
    const bookingDate = context.bookingTime || new Date();
    
    // Check Grace Period (e.g., 2 hours)
    const hoursSinceBooking = (now.getTime() - bookingDate.getTime()) / (1000 * 60 * 60);
    if (hoursSinceBooking <= 2) {
        return { action: 'REFUND', value: 100, reason: 'Grace Period (2h) Active' };
    }

    // Evaluate dynamic rules (mock implementation)
    // In real app, this would iterate through sorted rules
    return { action: 'PENALTY', value: 50, reason: 'Standard Cancellation Policy' };
};

export const evaluateEarlyCheckIn = (arrivalTime: string) => {
    const [hours] = arrivalTime.split(':').map(Number);
    
    if (hours < 6) return { type: 'FULL_NIGHT', charge: 100, label: 'Early Arrival (Before 06:00 AM)' };
    if (hours < 10) return { type: 'HALF_NIGHT', charge: 50, label: 'Early Arrival (06:00 AM - 10:00 AM)' };
    if (hours < 13) return { type: 'FLAT_FEE', charge: 20, label: 'Early Arrival (High Occupancy Surcharge)' };
    
    return { type: 'COMPLIMENTARY', charge: 0, label: 'Standard Check-in' };
};

export const requiresApproval = (amount: number, role: string) => {
    const THRESHOLD = 10;
    if (role === 'staff' && amount > THRESHOLD) {
        return true;
    }
    return false;
};
