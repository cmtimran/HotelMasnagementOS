import React, { useState, useMemo } from 'react';
import {
    ShieldCheck,
    Calendar,
    Clock,
    CreditCard,
    Users,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Edit2,
    Trash2,
    X,
    Check,
    Search,
    Download,
    Play,
    Building2,
    Sparkles,
    FileText,
    DollarSign,
    Lock
} from 'lucide-react';

// ============================================================================
// ENTERPRISE HOTEL POLICY TYPES (Full REST / GraphQL Schema)
// ============================================================================

export type PolicyCategory =
    | 'cancellation'
    | 'timings'
    | 'financial'
    | 'occupancy'
    | 'conduct'
    | 'billing'
    | 'groups'
    | 'loyalty';

export type PolicyScope = 'ALL_ROOMS' | 'SUITES_ONLY' | 'NON_REF_RATES' | 'CORPORATE_ONLY' | 'VIP_TIER';
export type ChargeType = 'PERCENT_FIRST_NIGHT' | 'PERCENT_TOTAL_STAY' | 'FLAT_BDT' | 'FULL_NIGHT' | 'COMPLIMENTARY' | 'CUSTOM';
export type SupervisorTier = 'None' | 'L1 Executive' | 'L2 Operations';

export interface HotelPolicyRule {
    id: string;
    code: string;
    title: string;
    category: PolicyCategory;
    scope: PolicyScope;
    applicableRoomTypes?: string[];
    condition: string;
    action: string;
    chargeAmount: string;
    chargeType: ChargeType;
    glAccountCode: string;
    requiresApproval: boolean;
    supervisorTier: SupervisorTier;
    displayOnGuestReceipt: boolean;
    displayOnBookingEngine: boolean;
    guestFacingLegalClause: string;
    isActive: boolean;
    priorityOrder: number;
    lastAuditDate: string;
    updatedBy: string;
}

interface PolicyManagementProps {
    onNavigate?: (page: string) => void;
}

// ============================================================================
// PRE-CONFIGURED 5-STAR HOTEL POLICIES (All 8 Domains)
// ============================================================================

const INITIAL_POLICIES: HotelPolicyRule[] = [
    // 1. CANCELLATION & NO-SHOW
    {
        id: 'pol-101',
        code: 'POL-CANC-FLEX48',
        title: 'Standard Transient Flexible Cancellation',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        condition: 'Cancellation received > 48 Hours prior to 14:00 check-in time',
        action: 'Full 100% refund of advance deposit; zero cancellation penalty debited',
        chargeAmount: '0% (Free)',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Reservations may be cancelled up to 48 hours prior to arrival with zero penalty. Deposit is refunded in full.',
        isActive: true,
        priorityOrder: 1,
        lastAuditDate: '2026-01-15',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-102',
        code: 'POL-CANC-MID24',
        title: 'Late Notice Window Cancellation (24h - 48h)',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        condition: 'Cancellation request received between 24 and 48 hours prior to scheduled arrival',
        action: 'Charge 50% of the first night standard room tariff plus statutory taxes',
        chargeAmount: '50% 1st Night',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Cancellations within 24 to 48 hours of check-in incur a 50% first-night room charge penalty.',
        isActive: true,
        priorityOrder: 2,
        lastAuditDate: '2026-01-15',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-103',
        code: 'POL-CANC-NOSHOW',
        title: 'Same-Day Cancellation & Guest No-Show Forfeiture',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        condition: 'Cancellation < 24 Hours or guest fails to register by 23:59 on arrival date',
        action: 'Forfeit 100% of the first night room tariff; release room inventory to rack',
        chargeAmount: '100% 1st Night',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'No-show reservations or same-day cancellations incur a 100% first-night forfeiture penalty. Room is released after 23:59.',
        isActive: true,
        priorityOrder: 3,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-104',
        code: 'POL-CANC-NRF',
        title: 'Non-Refundable Promotional Rate Lock',
        category: 'cancellation',
        scope: 'NON_REF_RATES',
        condition: 'Reservations booked under promo codes "PROMO-NRF", "FLASH-SALE", or "EARLYBIRD"',
        action: '100% non-refundable under all normal circumstances; date modifications restricted',
        chargeAmount: '100% Full Stay',
        chargeType: 'PERCENT_TOTAL_STAY',
        glAccountCode: 'GL-4015-NRF',
        requiresApproval: true,
        supervisorTier: 'L1 Executive',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Non-refundable rate. Full prepayment charged upon booking. Cancellations or modifications forfeit 100% of total stay.',
        isActive: true,
        priorityOrder: 4,
        lastAuditDate: '2026-01-08',
        updatedBy: 'Revenue-Lead'
    },

    // 2. TIMINGS (CHECK-IN & CHECK-OUT)
    {
        id: 'pol-201',
        code: 'POL-TIME-EARLY06',
        title: 'Early Arrival Morning Slot (06:00 - 10:00 AM)',
        category: 'timings',
        scope: 'ALL_ROOMS',
        condition: 'Guest arrives between 06:00 AM and 10:00 AM prior to standard 14:00 check-in',
        action: 'Apply 50% early arrival surcharge; room must be inspected and released by Housekeeping',
        chargeAmount: '50% Room Rate',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4020-EARLYCHECKIN',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Early check-in between 06:00 and 10:00 AM is subject to inspected room availability and incurs a 50% room tariff charge.',
        isActive: true,
        priorityOrder: 5,
        lastAuditDate: '2026-01-12',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-202',
        code: 'POL-TIME-COURTESY',
        title: 'Mid-Day Courtesy Early Check-In (10:00 AM - 14:00 PM)',
        category: 'timings',
        scope: 'ALL_ROOMS',
        condition: 'Guest arrives between 10:00 AM and 14:00 PM',
        action: 'Complimentary early check-in granted if inspected clean vacant room is available',
        chargeAmount: '0% (Courtesy)',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Check-in between 10:00 AM and 14:00 PM is provided on a complimentary courtesy basis subject to vacant room readiness.',
        isActive: true,
        priorityOrder: 6,
        lastAuditDate: '2026-01-12',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-203',
        code: 'POL-TIME-LATE15',
        title: 'Afternoon Late Check-Out (12:00 - 15:00 PM)',
        category: 'timings',
        scope: 'ALL_ROOMS',
        condition: 'Guest requests departure extension between 12:00 PM and 15:00 PM',
        action: 'Charge 25% of standard room tariff; Housekeeping turnaround scheduled for 15:00',
        chargeAmount: '25% Room Rate',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4025-LATECHECKOUT',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Late departure up to 15:00 PM is subject to room availability and billed at 25% of daily room rate.',
        isActive: true,
        priorityOrder: 7,
        lastAuditDate: '2026-01-10',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-204',
        code: 'POL-TIME-LATE18',
        title: 'Evening Extended Departure (15:00 - 18:00 PM)',
        category: 'timings',
        scope: 'ALL_ROOMS',
        condition: 'Guest requests room occupancy extension up to 18:00 PM',
        action: 'Charge 50% of prevailing daily tariff; locks room from same-day reselling',
        chargeAmount: '50% Room Rate',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4025-LATECHECKOUT',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Late departure between 15:00 and 18:00 PM incurs a 50% room rate charge and requires Duty Manager authorization.',
        isActive: true,
        priorityOrder: 8,
        lastAuditDate: '2026-01-10',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-205',
        code: 'POL-TIME-PAST18',
        title: 'Night Departure Past 18:00 PM',
        category: 'timings',
        scope: 'ALL_ROOMS',
        condition: 'Guest vacates room after 18:00 PM without prior approved day-use booking',
        action: 'Full 100% additional 1-night room tariff automatically posted to guest folio',
        chargeAmount: '100% Full Night',
        chargeType: 'FULL_NIGHT',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Departures after 18:00 PM are automatically billed as a full additional overnight stay.',
        isActive: true,
        priorityOrder: 9,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin'
    },

    // 3. FINANCIAL (DEPOSITS & CREDIT LIMITS)
    {
        id: 'pol-301',
        code: 'POL-FIN-INCIDENTAL',
        title: 'Mandatory Incidental Security Deposit',
        category: 'financial',
        scope: 'ALL_ROOMS',
        condition: 'Mandatory registration requirement for all transient check-ins',
        action: 'Collect ৳ 5,000 / $50 per room per night via Card Pre-Authorization or Cash Float',
        chargeAmount: '৳ 5,000 / night',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-2050-INCIDENTAL-ESCROW',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'An incidental security deposit of BDT 5,000 per night is held upon check-in and released upon room inspection at check-out.',
        isActive: true,
        priorityOrder: 10,
        lastAuditDate: '2026-01-14',
        updatedBy: 'Finance-Controller'
    },
    {
        id: 'pol-302',
        code: 'POL-FIN-HOUSELIMIT',
        title: 'House Credit Floor Limit & Auto-Folio Freeze',
        category: 'financial',
        scope: 'ALL_ROOMS',
        condition: 'Unpaid room guest charges exceed ৳ 35,000 / $300 without interim payment',
        action: 'Automatically suspends POS restaurant charging and room service charging until deposit top-up',
        chargeAmount: 'Floor Limit ৳ 35,000',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-1200-GUEST-LEDGER',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Guest room credit is capped at BDT 35,000. Balance settlements are required when the floor threshold is reached.',
        isActive: true,
        priorityOrder: 11,
        lastAuditDate: '2026-01-14',
        updatedBy: 'Finance-Controller'
    },
    {
        id: 'pol-303',
        code: 'POL-FIN-REFUND',
        title: 'Statutory Credit Card Pre-Auth Release Protocol',
        category: 'financial',
        scope: 'ALL_ROOMS',
        condition: 'Card pre-auth hold released by Front Desk upon check-out folio settlement',
        action: 'Electronic authorization released immediately; issuing bank turnaround 3-7 business days',
        chargeAmount: 'Zero Fee',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-2050-INCIDENTAL-ESCROW',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Pre-authorizations are released immediately upon departure. Depending on your bank, funds reflect within 3 to 7 working days.',
        isActive: true,
        priorityOrder: 12,
        lastAuditDate: '2026-01-14',
        updatedBy: 'Finance-Controller'
    },

    // 4. OCCUPANCY & EXTRA BEDDING
    {
        id: 'pol-401',
        code: 'POL-OCC-INFANT',
        title: 'Infant Policy & Complimentary Baby Cot (< 6 Years)',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        condition: 'Children under 6 years sharing existing adult bedding (Max 2 infants per room)',
        action: 'Complimentary stay and complimentary buffet breakfast; baby cot provided on request',
        chargeAmount: 'Free (0%)',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Children under 6 years stay free in existing bedding with complimentary buffet breakfast. Baby crib provided on request.',
        isActive: true,
        priorityOrder: 13,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-402',
        code: 'POL-OCC-CHILD',
        title: 'Junior Child Extra Bed & Breakfast (6 - 11 Years)',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        condition: 'Children aged 6 to 11 years requiring rollaway bed setup',
        action: 'Charge ৳ 1,500 + tax per night inclusive of daily restaurant breakfast buffet',
        chargeAmount: '৳ 1,500 / night',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4030-EXTRABED',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Children aged 6–11 requiring a rollaway bed are charged BDT 1,500 + tax per night, inclusive of breakfast.',
        isActive: true,
        priorityOrder: 14,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana'
    },
    {
        id: 'pol-403',
        code: 'POL-OCC-ADULT',
        title: 'Adult Third Person Surcharge (> 12 Years)',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        condition: 'Third adult occupying King Deluxe or Executive Suite',
        action: 'Supply luxury rollaway bed, luxury bathroom amenities, and full international buffet breakfast',
        chargeAmount: '৳ 2,500 / night',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4030-EXTRABED',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Third adult in room is charged BDT 2,500 + tax per night, inclusive of rollaway bedding and buffet breakfast package.',
        isActive: true,
        priorityOrder: 15,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana'
    },

    // 5. CONDUCT, SMOKING, PETS & DAMAGES
    {
        id: 'pol-501',
        code: 'POL-COND-SMOKE',
        title: 'Strict Non-Smoking Room Violation Penalty',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        condition: 'Evidence of cigarette smoking, e-cigarette/vaping or incense burned in non-smoking rooms',
        action: 'Automated ৳ 25,000 / $250 deep cleaning, ozone air sanitization, and curtain treatment fine',
        chargeAmount: '৳ 25,000',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4990-FINES-CLEANING',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'This is a 100% non-smoking hotel. Smoking or vaping in non-designated rooms incurs an automatic BDT 25,000 deep-cleaning fee.',
        isActive: true,
        priorityOrder: 16,
        lastAuditDate: '2026-01-16',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-502',
        code: 'POL-COND-DAMAGE',
        title: 'Property Asset Damage & Irreparable Stain Recovery',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        condition: 'Irreparable damage, burns, or missing furniture, electronic equipment, or linen',
        action: 'Debited at official master replacement price schedule + 20% administrative handling surcharge',
        chargeAmount: 'Cost + 20%',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-4991-DAMAGE-RECOVERY',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Guests are liable for any damages to room furniture, electronics, or fittings, charged at replacement cost plus a 20% service fee.',
        isActive: true,
        priorityOrder: 17,
        lastAuditDate: '2026-01-16',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-503',
        code: 'POL-COND-PETS',
        title: 'Pet Accommodation & Pet Sanitization Deposit',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        condition: 'Guests traveling with registered domestic pets (Under 15 kg weight limit)',
        action: 'Allowed exclusively in designated ground-floor Garden Rooms; requires ৳ 10,000 refundable damage deposit',
        chargeAmount: 'Deposit ৳ 10,000',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-2050-INCIDENTAL-ESCROW',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Pets under 15kg are welcomed in designated pet-friendly rooms with a refundable BDT 10,000 deposit and signed pet agreement.',
        isActive: true,
        priorityOrder: 18,
        lastAuditDate: '2026-01-16',
        updatedBy: 'FOM-Farhana'
    },

    // 6. BILLING & PAYMENT GOVERNANCE
    {
        id: 'pol-601',
        code: 'POL-BILL-CASHCEIL',
        title: 'Anti-Money Laundering (AML) Cash Ceiling Limit',
        category: 'billing',
        scope: 'ALL_ROOMS',
        condition: 'Single cash payment transaction exceeding ৳ 100,000 / $1,000',
        action: 'Mandatory verified photo ID/Passport and NID/TIN verification copy archived in audit docket',
        chargeAmount: 'Limit ৳ 100,000',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-1001-CASH-DRAWER',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Per central banking anti-money laundering regulations, cash payments exceeding BDT 100,000 require statutory ID verification.',
        isActive: true,
        priorityOrder: 19,
        lastAuditDate: '2026-01-12',
        updatedBy: 'Finance-Controller'
    },
    {
        id: 'pol-602',
        code: 'POL-BILL-FX',
        title: 'Foreign Currency Settlement & Change Policy',
        category: 'billing',
        scope: 'ALL_ROOMS',
        condition: 'Guest pays bill folio in foreign banknotes (USD, EUR, GBP, SAR)',
        action: 'Settled at daily official hotel buying rate; change returned in BDT local banknotes only',
        chargeAmount: 'Official FX Buying',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-1002-FX-VAULT',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Foreign currencies are accepted at the hotel front desk published daily rate. Change is rendered in BDT currency.',
        isActive: true,
        priorityOrder: 20,
        lastAuditDate: '2026-01-12',
        updatedBy: 'Finance-Controller'
    },

    // 7. GROUPS & EVENTS
    {
        id: 'pol-701',
        code: 'POL-GRP-DEPOSIT',
        title: 'Group Room Block Milestone Payment Schedule',
        category: 'groups',
        scope: 'ALL_ROOMS',
        condition: 'Group contracts with 5 or more rooms or banquet hall reservations',
        action: '25% deposit at contract signing; 50% milestone at T-30 days; 100% full balance at T-7 days',
        chargeAmount: '100% at T-7 Days',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-2010-ADVANCE-DEPOSITS',
        requiresApproval: true,
        supervisorTier: 'L1 Executive',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Group bookings require 25% at signing, 50% 30 days prior, and full settlement 7 days prior to arrival.',
        isActive: true,
        priorityOrder: 21,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-702',
        code: 'POL-GRP-ATTRITION',
        title: 'Group Room Block Attrition Allowance (10%)',
        category: 'groups',
        scope: 'ALL_ROOMS',
        condition: 'Group organizer reduces total reserved room nights up to 21 days before arrival',
        action: 'Allows up to 10% reduction in contracted room count with zero penalty; excess billed at 100%',
        chargeAmount: '10% Free Window',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: true,
        supervisorTier: 'L1 Executive',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'A 10% room attrition allowance is permitted up to 21 days before event commencement without penalty.',
        isActive: true,
        priorityOrder: 22,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin'
    },

    // 8. LOYALTY & VIP PRIVILEGES
    {
        id: 'pol-801',
        code: 'POL-LOY-UPGRADE',
        title: 'Tier-1 VIP & Loyalty Courtesy Room Upgrade',
        category: 'loyalty',
        scope: 'VIP_TIER',
        condition: 'Arrival of Platinum Tier Loyalty guest or General Manager VIP guest',
        action: 'Automatic 1-tier complimentary room upgrade upon arrival based on inspected rack availability',
        chargeAmount: 'Free Upgrade',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Platinum members receive one complimentary room tier upgrade subject to hotel inventory upon arrival.',
        isActive: true,
        priorityOrder: 23,
        lastAuditDate: '2026-01-15',
        updatedBy: 'GM-Admin'
    },
    {
        id: 'pol-802',
        code: 'POL-LOY-LATE16',
        title: 'Guaranteed 16:00 PM Late Departure for VIP Guests',
        category: 'loyalty',
        scope: 'VIP_TIER',
        condition: 'Departure of VIP Tier-1 or Suite guests requesting late checkout',
        action: 'Guaranteed late checkout granted up to 16:00 PM with zero surcharge',
        chargeAmount: '0% (VIP Perk)',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'VIP guests and Platinum members are entitled to guaranteed late checkout up to 16:00 PM complimentary.',
        isActive: true,
        priorityOrder: 24,
        lastAuditDate: '2026-01-15',
        updatedBy: 'GM-Admin'
    }
];

export const PolicyManagement: React.FC<PolicyManagementProps> = () => {
    const [policies, setPolicies] = useState<HotelPolicyRule[]>(INITIAL_POLICIES);
    const [activeTab, setActiveTab] = useState<PolicyCategory>('cancellation');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterScope, setFilterScope] = useState<string>('ALL');
    const [filterApproval, setFilterApproval] = useState<string>('ALL');
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Modal state for Add/Edit
    const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<HotelPolicyRule | null>(null);

    // Simulator State
    const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
    const [simScenario, setSimScenario] = useState<string>('cancel-36h');
    const [simResult, setSimResult] = useState<{
        ruleCode: string;
        ruleTitle: string;
        calculatedFee: string;
        glCode: string;
        requiresApproval: boolean;
        tier: string;
        explanation: string;
    } | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Category Tabs Configuration
    const categories: { id: PolicyCategory; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
        { id: 'cancellation', label: 'Cancellation & No-Show', icon: Calendar },
        { id: 'timings', label: 'Check-In & Check-Out', icon: Clock },
        { id: 'financial', label: 'Deposits & Credit Limits', icon: CreditCard },
        { id: 'occupancy', label: 'Occupancy & Bedding', icon: Users },
        { id: 'conduct', label: 'Conduct, Smoking & Damages', icon: AlertTriangle },
        { id: 'billing', label: 'Billing & FX Payments', icon: DollarSign },
        { id: 'groups', label: 'Groups & Banquets', icon: Building2 },
        { id: 'loyalty', label: 'Loyalty & VIP Perks', icon: Sparkles },
    ];

    // Filtered Policies
    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            const matchesCategory = p.category === activeTab;
            const matchesSearch =
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.condition.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.glAccountCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.guestFacingLegalClause.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesScope = filterScope === 'ALL' || p.scope === filterScope;
            const matchesApproval =
                filterApproval === 'ALL' ||
                (filterApproval === 'REQUIRED' && p.requiresApproval) ||
                (filterApproval === 'AUTO' && !p.requiresApproval);

            const matchesStatus =
                filterStatus === 'ALL' ||
                (filterStatus === 'ACTIVE' && p.isActive) ||
                (filterStatus === 'INACTIVE' && !p.isActive);

            return matchesCategory && matchesSearch && matchesScope && matchesApproval && matchesStatus;
        });
    }, [policies, activeTab, searchQuery, filterScope, filterApproval, filterStatus]);

    // Active Counts by category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        categories.forEach(c => {
            counts[c.id] = policies.filter(p => p.category === c.id && p.isActive).length;
        });
        return counts;
    }, [policies]);

    // Actions
    const handleToggleRuleStatus = (ruleId: string) => {
        setPolicies(prev =>
            prev.map(p => {
                if (p.id === ruleId) {
                    const next = !p.isActive;
                    showToast(`Policy "${p.code}" ${next ? 'enabled' : 'disabled'}.`);
                    return { ...p, isActive: next };
                }
                return p;
            })
        );
    };

    const handleDeleteRule = (ruleId: string) => {
        setPolicies(prev => prev.filter(p => p.id !== ruleId));
        showToast('Policy rule permanently deleted.');
    };

    const handleOpenCreateRule = () => {
        setEditingRule(null);
        setIsRuleModalOpen(true);
    };

    const handleOpenEditRule = (rule: HotelPolicyRule) => {
        setEditingRule(rule);
        setIsRuleModalOpen(true);
    };

    const handleSaveRuleModal = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const code = (formData.get('code') as string) || `POL-${Date.now().toString().slice(-4)}`;
        const title = (formData.get('title') as string) || 'New Policy';
        const category = (formData.get('category') as PolicyCategory) || activeTab;
        const scope = (formData.get('scope') as PolicyScope) || 'ALL_ROOMS';
        const condition = (formData.get('condition') as string) || '';
        const action = (formData.get('action') as string) || '';
        const chargeAmount = (formData.get('chargeAmount') as string) || '0%';
        const chargeType = (formData.get('chargeType') as ChargeType) || 'FLAT_BDT';
        const glAccountCode = (formData.get('glAccountCode') as string) || 'GL-4001-ROOMREV';
        const requiresApproval = formData.get('requiresApproval') === 'on';
        const supervisorTier = (formData.get('supervisorTier') as SupervisorTier) || (requiresApproval ? 'L2 Operations' : 'None');
        const displayOnGuestReceipt = formData.get('displayOnGuestReceipt') === 'on';
        const displayOnBookingEngine = formData.get('displayOnBookingEngine') === 'on';
        const guestFacingLegalClause = (formData.get('guestFacingLegalClause') as string) || '';

        if (editingRule) {
            setPolicies(prev =>
                prev.map(p =>
                    p.id === editingRule.id
                        ? {
                            ...p,
                            code,
                            title,
                            category,
                            scope,
                            condition,
                            action,
                            chargeAmount,
                            chargeType,
                            glAccountCode,
                            requiresApproval,
                            supervisorTier,
                            displayOnGuestReceipt,
                            displayOnBookingEngine,
                            guestFacingLegalClause,
                            updatedBy: 'Admin-Current',
                            lastAuditDate: new Date().toISOString().slice(0, 10),
                        }
                        : p
                )
            );
            showToast(`Policy "${code}" updated successfully.`);
        } else {
            const newRule: HotelPolicyRule = {
                id: `pol-${Date.now()}`,
                code,
                title,
                category,
                scope,
                condition,
                action,
                chargeAmount,
                chargeType,
                glAccountCode,
                requiresApproval,
                supervisorTier,
                displayOnGuestReceipt,
                displayOnBookingEngine,
                guestFacingLegalClause,
                isActive: true,
                priorityOrder: policies.length + 1,
                lastAuditDate: new Date().toISOString().slice(0, 10),
                updatedBy: 'Admin-Current',
            };
            setPolicies(prev => [newRule, ...prev]);
            showToast(`New policy "${code}" registered and live.`);
        }

        setIsRuleModalOpen(false);
        setEditingRule(null);
    };

    // Run Simulator
    const handleRunSimulation = (scenarioKey: string) => {
        setSimScenario(scenarioKey);
        if (scenarioKey === 'cancel-36h') {
            setSimResult({
                ruleCode: 'POL-CANC-MID24',
                ruleTitle: 'Late Notice Window Cancellation (24h - 48h)',
                calculatedFee: '50% First Night Room Tariff + VAT',
                glCode: 'GL-4010-CANC (Cancellation Revenue)',
                requiresApproval: false,
                tier: 'Automated System Execution',
                explanation: 'Cancellation was registered 36 hours prior to check-in. Falls inside the 24h-48h tier. System automatically charges 50% of room tariff and releases inventory back to booking engine.'
            });
        } else if (scenarioKey === 'checkout-1630') {
            setSimResult({
                ruleCode: 'POL-TIME-LATE18',
                ruleTitle: 'Evening Extended Departure (15:00 - 18:00 PM)',
                calculatedFee: '50% Daily Room Tariff',
                glCode: 'GL-4025-LATECHECKOUT',
                requiresApproval: true,
                tier: 'L2 Operations Approval Required',
                explanation: 'Departure requested at 16:30 PM. Extends past 15:00 PM threshold. Blocks evening room turnaround. Requires Front Office Manager (FOM) override approval.'
            });
        } else if (scenarioKey === 'smoking-detected') {
            setSimResult({
                ruleCode: 'POL-COND-SMOKE',
                ruleTitle: 'Strict Non-Smoking Room Violation Penalty',
                calculatedFee: '৳ 25,000 Flat Sanitization Fine',
                glCode: 'GL-4990-FINES-CLEANING',
                requiresApproval: true,
                tier: 'L2 Operations (Executive Housekeeper Sign-Off)',
                explanation: 'Housekeeping logged physical evidence of smoking in Suite 402. Fine of ৳ 25,000 posted directly to room folio. Requires L2 supervisor sign-off with photo evidence attached.'
            });
        } else if (scenarioKey === 'credit-limit') {
            setSimResult({
                ruleCode: 'POL-FIN-HOUSELIMIT',
                ruleTitle: 'House Credit Floor Limit & Auto-Folio Freeze',
                calculatedFee: '৳ 0 (Immediate POS Lock Triggered)',
                glCode: 'GL-1200-GUEST-LEDGER',
                requiresApproval: false,
                tier: 'Automated System Lock',
                explanation: 'Guest room charges reached ৳ 38,200 (exceeding ৳ 35,000 threshold). All further F&B and Spa room charging blocked until guest settles interim payment at Front Desk.'
            });
        }
    };

    // Export Handbook as JSON
    const handleExportHandbook = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(policies, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `hotel_policy_handbook_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Master Hotel Policy Handbook exported successfully.');
    };

    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto space-y-3 font-sans text-gray-800">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Elevated Header Card */}
            <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/80 flex items-center justify-center text-blue-700 font-bold text-sm shadow-2xs flex-shrink-0">
                            <ShieldCheck size={22} className="text-blue-600" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">
                                    Hotel Operations & Policy Governance Engine
                                </h1>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60 flex-shrink-0">
                                    Automated Rules
                                </span>
                                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                    GL Ledger Mapped
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-500 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                    <ShieldCheck size={11} className="text-gray-400" />
                                    <span>{policies.filter(p => p.isActive).length} Active Policies</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-gray-400" />
                                    <span>Check-in: 14:00 • Check-out: 12:00</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Calendar size={11} className="text-gray-400" />
                                    <span>Free Cancellation: 48h Window</span>
                                </span>
                                <span className="hidden lg:flex items-center gap-1">
                                    <CreditCard size={11} className="text-gray-400" />
                                    <span>Incidental Hold: ৳ 5,000 / Night</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSimulatorOpen(!isSimulatorOpen);
                                if (!simResult) handleRunSimulation('cancel-36h');
                            }}
                            className={`h-7 px-2.5 border rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${isSimulatorOpen
                                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                                : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'
                                }`}
                            title="Interactive Policy Rule Evaluation Simulator"
                        >
                            <Play size={11} className="text-indigo-600" />
                            <span>Rule Simulator</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportHandbook}
                            className="h-7 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                            title="Export Master Hotel Policy Handbook (JSON)"
                        >
                            <Download size={12} className="text-gray-400" />
                            <span>Export Rules</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenCreateRule}
                            className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                        >
                            <Plus size={13} />
                            <span>Create Policy</span>
                        </button>
                    </div>
                </div>

                {/* 8 Pillar Horizontal Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1 sm:gap-1.5">
                        {categories.map(cat => {
                            const IconComponent = cat.icon;
                            const isActive = activeTab === cat.id;
                            const count = categoryCounts[cat.id] || 0;

                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`h-7 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${isActive
                                        ? 'bg-white text-blue-700 shadow-2xs border border-gray-200 font-bold'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                                        }`}
                                >
                                    <IconComponent size={12} className={isActive ? 'text-blue-600' : 'text-gray-400'} />
                                    <span>{cat.label}</span>
                                    <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${isActive ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* INTERACTIVE POLICY SIMULATOR PANEL (Toggleable) */}
            {isSimulatorOpen && (
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-xl p-4 shadow-xl border border-indigo-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between border-b border-indigo-800/80 pb-2">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center">
                                <Play size={13} />
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-white tracking-wide uppercase">
                                    Real-Time Policy Automation & Surcharge Simulator
                                </h3>
                                <p className="text-[11px] text-indigo-200/80">
                                    Simulate operational front-desk scenarios to verify automated charge calculations and approval tiers.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsSimulatorOpen(false)}
                            className="p-1 hover:bg-white/10 rounded-lg text-indigo-300 hover:text-white cursor-pointer"
                        >
                            <X size={15} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        {/* Scenario Picker */}
                        <div className="space-y-2">
                            <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">
                                1. Select Operational Scenario:
                            </span>
                            <div className="space-y-1.5">
                                {[
                                    { id: 'cancel-36h', label: 'Guest cancels 36h before arrival (Transient)' },
                                    { id: 'checkout-1630', label: 'Guest requests late checkout at 16:30 PM' },
                                    { id: 'smoking-detected', label: 'Housekeeping reports cigarette smoke in Suite 402' },
                                    { id: 'credit-limit', label: 'Folio balance reaches ৳ 38,200 (House Limit)' },
                                ].map(sc => (
                                    <button
                                        key={sc.id}
                                        type="button"
                                        onClick={() => handleRunSimulation(sc.id)}
                                        className={`w-full text-left p-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${simScenario === sc.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white font-bold shadow-md'
                                            : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10'
                                            }`}
                                    >
                                        {sc.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Simulation Result */}
                        {simResult && (
                            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-indigo-300 font-bold bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700">
                                        Triggered Rule: {simResult.ruleCode}
                                    </span>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${simResult.requiresApproval
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                        }`}>
                                        {simResult.tier}
                                    </span>
                                </div>

                                <div className="text-sm font-bold text-white">
                                    {simResult.ruleTitle}
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-2 bg-black/20 rounded-lg border border-white/5 text-[11px]">
                                    <div>
                                        <span className="text-indigo-300 block text-[10px] uppercase">Automated Charge</span>
                                        <span className="font-bold text-emerald-400">{simResult.calculatedFee}</span>
                                    </div>
                                    <div>
                                        <span className="text-indigo-300 block text-[10px] uppercase">General Ledger Code</span>
                                        <span className="font-mono text-indigo-200">{simResult.glCode}</span>
                                    </div>
                                </div>

                                <p className="text-[11px] text-indigo-100 leading-relaxed">
                                    {simResult.explanation}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SEARCH & FILTERS BAR */}
            <div className="bg-white rounded-xl border border-gray-200/90 p-3 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                {/* Search */}
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={`Search ${activeTab} rules by keyword, code (POL-), condition, or GL code...`}
                        className="w-full h-8 pl-9 pr-7 text-xs bg-gray-50/70 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all font-normal"
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Scope:</span>
                        <select
                            value={filterScope}
                            onChange={e => setFilterScope(e.target.value)}
                            className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium cursor-pointer"
                        >
                            <option value="ALL">All Scopes</option>
                            <option value="ALL_ROOMS">All Room Types</option>
                            <option value="SUITES_ONLY">Suites Only</option>
                            <option value="NON_REF_RATES">Non-Refundable Rates</option>
                            <option value="CORPORATE_ONLY">Corporate Only</option>
                            <option value="VIP_TIER">VIP Tiers Only</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Approval:</span>
                        <select
                            value={filterApproval}
                            onChange={e => setFilterApproval(e.target.value)}
                            className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium cursor-pointer"
                        >
                            <option value="ALL">All Approvals</option>
                            <option value="AUTO">Automated (No Sup.)</option>
                            <option value="REQUIRED">Requires Supervisor</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium text-gray-500">Status:</span>
                        <select
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value as any)}
                            className="h-8 px-2 text-xs bg-gray-50/70 border border-gray-200 rounded-lg text-gray-700 outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white font-medium cursor-pointer"
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="INACTIVE">Inactive Only</option>
                        </select>
                    </div>

                    {(searchQuery || filterScope !== 'ALL' || filterApproval !== 'ALL' || filterStatus !== 'ALL') && (
                        <button
                            type="button"
                            onClick={() => {
                                setSearchQuery('');
                                setFilterScope('ALL');
                                setFilterApproval('ALL');
                                setFilterStatus('ALL');
                            }}
                            className="h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-medium transition-colors cursor-pointer"
                        >
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* POLICY RULES LIST */}
            <div className="space-y-2.5">
                {filteredPolicies.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-12 text-center shadow-2xs">
                        <ShieldCheck size={32} className="mx-auto text-gray-300 mb-2" />
                        <h3 className="text-sm font-bold text-gray-700">No policy rules match your search or filter.</h3>
                        <p className="text-xs text-gray-400 mt-1">Try modifying your keyword or reset filters to view all configured rules.</p>
                        <button
                            type="button"
                            onClick={handleOpenCreateRule}
                            className="mt-3 h-7 px-3 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 cursor-pointer"
                        >
                            + Create New Rule
                        </button>
                    </div>
                ) : (
                    filteredPolicies.map(rule => (
                        <div
                            key={rule.id}
                            className={`bg-white rounded-xl border transition-all shadow-2xs hover:shadow-xs p-3.5 space-y-3 ${rule.isActive ? 'border-gray-200/90' : 'border-gray-200/50 opacity-70 bg-gray-50/40'
                                }`}
                        >
                            {/* Card Top Row: Identity & Status Toggle */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-2.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-[10.5px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {rule.code}
                                    </span>
                                    <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                                        {rule.title}
                                    </h3>
                                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                        Scope: {rule.scope.replace('_', ' ')}
                                    </span>
                                    {rule.requiresApproval ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            <Lock size={10} />
                                            <span>Requires {rule.supervisorTier} Approval</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            <CheckCircle2 size={10} />
                                            <span>Fully Automated Execution</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                    {/* Active Status Pill */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleRuleStatus(rule.id)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold transition-all cursor-pointer ${rule.isActive
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                            : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200'
                                            }`}
                                        title="Click to toggle rule status"
                                    >
                                        <span className={`w-1.5 h-1.5 rounded-full ${rule.isActive ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                        <span>{rule.isActive ? 'Active' : 'Disabled'}</span>
                                    </button>

                                    {/* Edit & Delete Action Buttons */}
                                    <button
                                        type="button"
                                        onClick={() => handleOpenEditRule(rule)}
                                        className="p-1.5 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-100"
                                        title="Edit Policy Parameters"
                                    >
                                        <Edit2 size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteRule(rule.id)}
                                        className="p-1.5 hover:bg-rose-50 text-gray-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-100"
                                        title="Delete Rule"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>

                            {/* Card Middle Grid: Trigger & Action */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 text-xs">
                                {/* Trigger Condition */}
                                <div className="md:col-span-5 p-2.5 rounded-lg bg-gray-50/70 border border-gray-200/70 space-y-1">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block flex items-center gap-1">
                                        <Clock size={11} className="text-gray-400" />
                                        <span>Operational Trigger Condition</span>
                                    </span>
                                    <p className="text-gray-800 font-medium leading-snug">
                                        {rule.condition}
                                    </p>
                                </div>

                                {/* Automated Action */}
                                <div className="md:col-span-4 p-2.5 rounded-lg bg-blue-50/40 border border-blue-100 space-y-1">
                                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block flex items-center gap-1">
                                        <Check size={11} className="text-blue-600" />
                                        <span>Folio Action & Resolution</span>
                                    </span>
                                    <p className="text-gray-900 font-medium leading-snug">
                                        {rule.action}
                                    </p>
                                </div>

                                {/* Charge & GL Code */}
                                <div className="md:col-span-3 p-2.5 rounded-lg bg-emerald-50/40 border border-emerald-100 space-y-1 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
                                            Tariff / Penalty
                                        </span>
                                        <div className="text-sm font-bold text-emerald-800">
                                            {rule.chargeAmount}
                                        </div>
                                    </div>
                                    <div className="text-[10.5px] font-mono text-gray-500 pt-1 border-t border-emerald-100/60">
                                        GL: <strong className="text-gray-700">{rule.glAccountCode}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Card Bottom: Guest-facing Legal Clause & Disclosures */}
                            <div className="p-2 bg-gray-50/40 rounded-lg border border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11px] text-gray-500">
                                <div className="flex items-start gap-1.5 min-w-0">
                                    <FileText size={12} className="text-gray-400 flex-shrink-0 mt-0.5" />
                                    <span className="truncate italic text-gray-600" title={rule.guestFacingLegalClause}>
                                        Legal Disclosure: "{rule.guestFacingLegalClause}"
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 text-[10px] font-medium text-gray-400">
                                    {rule.displayOnBookingEngine && (
                                        <span className="bg-white px-1.5 py-0.2 rounded border border-gray-200 text-gray-600">Booking Engine</span>
                                    )}
                                    {rule.displayOnGuestReceipt && (
                                        <span className="bg-white px-1.5 py-0.2 rounded border border-gray-200 text-gray-600">Folio Receipt</span>
                                    )}
                                    <span className="font-mono">Audited: {rule.lastAuditDate}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* CREATE / EDIT POLICY RULE MODAL */}
            {isRuleModalOpen && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-3 sm:p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-200">
                        {/* Modal Header */}
                        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50/80">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <ShieldCheck size={16} />
                                </div>
                                <div>
                                    <h2 className="text-sm font-bold text-gray-900">
                                        {editingRule ? `Edit Policy Rule: ${editingRule.code}` : 'Register New Hotel Policy Rule'}
                                    </h2>
                                    <p className="text-[11px] text-gray-500">
                                        Configure automated operational triggers, penalty tariffs, and General Ledger mapping.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsRuleModalOpen(false)}
                                className="p-1 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-700"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Modal Body Form */}
                        <form onSubmit={handleSaveRuleModal} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3.5 text-xs">
                            {/* Section 1: Identification */}
                            <div className="space-y-1">
                                <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wider block">
                                    1. Rule Identification & Domain
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Policy Code</label>
                                        <input
                                            type="text"
                                            name="code"
                                            required
                                            defaultValue={editingRule?.code || `POL-${activeTab.slice(0, 4).toUpperCase()}-${Date.now().toString().slice(-3)}`}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono font-bold text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1 sm:col-span-2">
                                        <label className="font-semibold text-gray-700">Policy Rule Title</label>
                                        <input
                                            type="text"
                                            name="title"
                                            required
                                            defaultValue={editingRule?.title || ''}
                                            placeholder="e.g. Standard 48h Free Cancellation Window"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-semibold text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Policy Domain</label>
                                        <select
                                            name="category"
                                            defaultValue={editingRule?.category || activeTab}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-medium text-xs cursor-pointer"
                                        >
                                            {categories.map(c => (
                                                <option key={c.id} value={c.id}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Applicable Scope</label>
                                        <select
                                            name="scope"
                                            defaultValue={editingRule?.scope || 'ALL_ROOMS'}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-medium text-xs cursor-pointer"
                                        >
                                            <option value="ALL_ROOMS">All Room Types</option>
                                            <option value="SUITES_ONLY">Suites Only</option>
                                            <option value="NON_REF_RATES">Non-Refundable Rates Only</option>
                                            <option value="CORPORATE_ONLY">Corporate Negotiated Only</option>
                                            <option value="VIP_TIER">VIP Tiers Only</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Charge Model</label>
                                        <select
                                            name="chargeType"
                                            defaultValue={editingRule?.chargeType || 'FLAT_BDT'}
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-medium text-xs cursor-pointer"
                                        >
                                            <option value="COMPLIMENTARY">Complimentary (0% / Free)</option>
                                            <option value="PERCENT_FIRST_NIGHT">Percent of 1st Night</option>
                                            <option value="PERCENT_TOTAL_STAY">Percent of Total Stay</option>
                                            <option value="FLAT_BDT">Flat Currency Amount (BDT)</option>
                                            <option value="FULL_NIGHT">Full Additional Overnight Stay</option>
                                            <option value="CUSTOM">Custom Surcharge Matrix</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Trigger Condition & Action */}
                            <div className="space-y-1">
                                <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wider block">
                                    2. Operational Trigger & Folio Resolution
                                </span>
                                <div className="space-y-2.5 p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Trigger Condition Statement</label>
                                        <input
                                            type="text"
                                            name="condition"
                                            required
                                            defaultValue={editingRule?.condition || ''}
                                            placeholder="e.g. Cancellation received > 48 Hours before 14:00 check-in"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Folio Action / System Execution</label>
                                        <input
                                            type="text"
                                            name="action"
                                            required
                                            defaultValue={editingRule?.action || ''}
                                            placeholder="e.g. Charge 50% of first night room tariff + taxes"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Fee / Penalty Label</label>
                                            <input
                                                type="text"
                                                name="chargeAmount"
                                                required
                                                defaultValue={editingRule?.chargeAmount || '0%'}
                                                placeholder="e.g. 50% 1st Night or ৳ 25,000"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-bold text-xs"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">General Ledger (GL) Code</label>
                                            <input
                                                type="text"
                                                name="glAccountCode"
                                                required
                                                defaultValue={editingRule?.glAccountCode || 'GL-4010-CANC'}
                                                placeholder="e.g. GL-4010-CANC"
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Governance, Approvals & Legal Disclosures */}
                            <div className="space-y-1">
                                <span className="font-bold text-gray-700 text-[11px] uppercase tracking-wider block">
                                    3. Supervisor Override & Guest Legal Disclosures
                                </span>
                                <div className="space-y-2.5 p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        <label className="flex items-center gap-2 cursor-pointer p-2 bg-white rounded-lg border border-gray-200">
                                            <input
                                                type="checkbox"
                                                name="requiresApproval"
                                                defaultChecked={editingRule?.requiresApproval ?? false}
                                                className="w-4 h-4 accent-blue-600 rounded"
                                            />
                                            <div>
                                                <span className="font-semibold text-gray-800 block">Requires Supervisor Override</span>
                                                <span className="text-[10px] text-gray-400">Prompts for manager sign-off</span>
                                            </div>
                                        </label>

                                        <div className="space-y-1">
                                            <label className="font-semibold text-gray-700">Required Authorization Tier</label>
                                            <select
                                                name="supervisorTier"
                                                defaultValue={editingRule?.supervisorTier || 'L2 Operations'}
                                                className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-medium text-xs cursor-pointer"
                                            >
                                                <option value="None">None (Automated)</option>
                                                <option value="L2 Operations">L2 Operations (FOM / Controller)</option>
                                                <option value="L1 Executive">L1 Executive (General Manager Only)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Guest-Facing Legal Clause (Printed on terms / Registration Card)</label>
                                        <textarea
                                            name="guestFacingLegalClause"
                                            rows={2}
                                            defaultValue={editingRule?.guestFacingLegalClause || ''}
                                            placeholder="The exact legal sentence disclosed to guests during booking and check-in..."
                                            className="w-full p-2 border border-gray-200 rounded-lg bg-white outline-none text-xs font-normal"
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 pt-1">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="displayOnBookingEngine"
                                                defaultChecked={editingRule?.displayOnBookingEngine ?? true}
                                                className="w-3.5 h-3.5 accent-blue-600 rounded"
                                            />
                                            <span className="text-gray-700 font-medium text-[11px]">Show on Booking Engine</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                name="displayOnGuestReceipt"
                                                defaultChecked={editingRule?.displayOnGuestReceipt ?? true}
                                                className="w-3.5 h-3.5 accent-blue-600 rounded"
                                            />
                                            <span className="text-gray-700 font-medium text-[11px]">Print on Folio / Receipt</span>
                                        </label>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setIsRuleModalOpen(false)}
                                    className="h-8 px-3 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 text-gray-700 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                                >
                                    {editingRule ? 'Save Changes' : 'Register Policy Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PolicyManagement;
