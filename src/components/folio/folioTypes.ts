export type FolioSubTab = 'operations' | 'booking' | 'guest' | 'charges' | 'credit_card' | 'audit';

export interface FolioChargeItem {
    id: number | string;
    folio_id?: number | string;
    charge_code: string;
    revenue_head: string;
    ref_no: string;
    description: string;
    amount: number;
    discount_amount: number;
    service_charge: number;
    vat: number;
    city_tax: number;
    total_tax: number;
    total_amount: number;
    charge_date: string;
    is_tax_applicable: boolean;
    tax_exemption_id?: string | null;
    user_name: string;
    is_voided: boolean;
    void_reason?: string | null;
    status: 'Posted' | 'Voided' | string;
}

export interface FolioPaymentItem {
    id: number | string;
    payment_number: string;
    payment_method: string;
    amount: number;
    reference_code?: string;
    transaction_date: string;
    status: string;
}

export interface FolioRoomItem {
    id: number | string;
    sub_booking_number?: string;
    folio_number?: string;
    room_number: string;
    room_type: string;
    check_in_date: string;
    check_out_date: string;
    room_rate: number;
    rate_amount?: number;
    adults: number;
    children: number;
    nights: number;
}

export interface FolioSummary {
    totalCharges: number;
    totalPaid: number;
    totalDiscount: number;
    serviceCharge: number;
    vat: number;
    cityTax: number;
    totalTax: number;
    dueAmount: number;
}

export interface FolioData {
    id: number | string;
    reservation_id: number | string;
    folio_number: string;
    folio_type?: string;
    status: string;
    balance: number;
    reservation_number: string;
    reservation_source?: string;
    reservation_agent?: string;
    guest_name: string;
    guest_phone?: string;
    guest_email?: string;
    room_number?: string;
    room_type?: string;
    check_in?: string;
    check_out?: string;
    bill_to?: string | null;
    market_code?: string | null;
    business_source?: string | null;
    business_agent?: string | null;
    voucher_no?: string | null;
    commission_plan?: string | null;
    plan_value?: number;
    sales_person?: string | null;
    send_mail?: boolean;
    checkout_mail?: boolean;
    suppress_rate_qr?: boolean;
    display_inclusion_separate?: boolean;
    generate_invoice_on_checkout?: boolean;
    gstin?: string | null;
    gstin_number?: string | null;
    rooms: FolioRoomItem[];
    charges: FolioChargeItem[];
    payments: FolioPaymentItem[];
    summary: FolioSummary;
    calculatedBalance?: number;
}

export interface RevenueHead {
    id: number | string;
    code: string;
    name: string;
    category?: string;
}

export interface AuditTrailItem {
    id: number | string;
    folio_id?: number | string;
    reservation_id?: number | string;
    action_type: string;
    before_state?: string | null;
    after_state?: string | null;
    description: string;
    user_name: string;
    created_at: string;
}
