import React, { useState, useEffect, useMemo } from 'react';
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
    Lock,
    Sliders,
    ArrowRight,
    RotateCcw,
    SlidersHorizontal
} from 'lucide-react';

// ============================================================================
// DYNAMIC POLICY TYPES (Computational REST / GraphQL Schema)
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
export type PolicyStrategyPreset = 'standard_flexible' | 'strict_peak_season' | 'corporate_priority';

export interface DynamicPolicyParams {
    hoursThreshold?: number;         // e.g., 48, 24, 72 hours
    feePercentage?: number;          // e.g., 0, 25, 50, 100%
    flatAmountBDT?: number;          // e.g., 1500, 2500, 5000, 25000, 35000
    timeWindowStart?: string;        // e.g., "06:00", "12:00", "15:00"
    timeWindowEnd?: string;          // e.g., "10:00", "15:00", "18:00"
    ageThreshold?: number;           // e.g., 6, 12 years
}

export interface HotelPolicyRule {
    id: string;
    code: string;
    title: string;
    category: PolicyCategory;
    scope: PolicyScope;
    conditionSummary: string;
    actionSummary: string;
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
    // COMPUTATIONAL DYNAMIC PARAMETERS
    params: DynamicPolicyParams;
}

interface PolicyManagementProps {
    onNavigate?: (page: string) => void;
}

// ============================================================================
// BASELINE DYNAMIC PRESETS
// ============================================================================

const BASELINE_POLICIES: HotelPolicyRule[] = [
    // 1. CANCELLATION
    {
        id: 'pol-101',
        code: 'POL-CANC-FLEX48',
        title: 'Flexible Transient Free Cancellation',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Cancellation registered prior to cutoff window before 14:00 check-in',
        actionSummary: 'Full 100% refund of advance deposit; zero penalty fee debited',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Reservations may be cancelled prior to the cutoff threshold with zero penalty. Deposit is refunded in full.',
        isActive: true,
        priorityOrder: 1,
        lastAuditDate: '2026-01-15',
        updatedBy: 'GM-Admin',
        params: {
            hoursThreshold: 48,
            feePercentage: 0
        }
    },
    {
        id: 'pol-102',
        code: 'POL-CANC-MID24',
        title: 'Mid-Notice Window Cancellation Fee',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Cancellation registered within late notice window prior to arrival',
        actionSummary: 'Charge penalty fee percentage on first night room tariff plus statutory taxes',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Cancellations within the late notice threshold incur a first-night tariff deduction penalty.',
        isActive: true,
        priorityOrder: 2,
        lastAuditDate: '2026-01-15',
        updatedBy: 'FOM-Farhana',
        params: {
            hoursThreshold: 24,
            feePercentage: 50
        }
    },
    {
        id: 'pol-103',
        code: 'POL-CANC-NOSHOW',
        title: 'Same-Day Late Cancel & Guest No-Show Forfeiture',
        category: 'cancellation',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Cancellation < 24 Hours or guest fails to register by 23:59 on arrival date',
        actionSummary: 'Forfeit 100% of first night room tariff; release room inventory to rack',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'No-show reservations or same-day cancellations incur a 100% first-night room charge forfeiture. Room is released after 23:59.',
        isActive: true,
        priorityOrder: 3,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin',
        params: {
            hoursThreshold: 24,
            feePercentage: 100
        }
    },
    {
        id: 'pol-104',
        code: 'POL-CANC-NRF',
        title: 'Non-Refundable Promotional Rate Lock',
        category: 'cancellation',
        scope: 'NON_REF_RATES',
        conditionSummary: 'Bookings tagged with "PROMO-NRF", "FLASH-SALE", or "EARLYBIRD"',
        actionSummary: '100% non-refundable under all normal circumstances; date modifications restricted',
        chargeType: 'PERCENT_TOTAL_STAY',
        glAccountCode: 'GL-4015-NRF',
        requiresApproval: true,
        supervisorTier: 'L1 Executive',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Non-refundable rate. Full prepayment charged upon booking. Cancellations forfeit 100% of total stay.',
        isActive: true,
        priorityOrder: 4,
        lastAuditDate: '2026-01-08',
        updatedBy: 'Revenue-Lead',
        params: {
            hoursThreshold: 0,
            feePercentage: 100
        }
    },

    // 2. TIMINGS (CHECK-IN & CHECK-OUT)
    {
        id: 'pol-201',
        code: 'POL-TIME-EARLY06',
        title: 'Morning Early Arrival Surcharge',
        category: 'timings',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guest arrives between early morning time window prior to standard 14:00 check-in',
        actionSummary: 'Apply early arrival surcharge percentage; subject to inspected room turnaround',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4020-EARLYCHECKIN',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Early check-in is subject to inspected room availability and incurs an early arrival surcharge.',
        isActive: true,
        priorityOrder: 5,
        lastAuditDate: '2026-01-12',
        updatedBy: 'FOM-Farhana',
        params: {
            timeWindowStart: '06:00',
            timeWindowEnd: '10:00',
            feePercentage: 50
        }
    },
    {
        id: 'pol-202',
        code: 'POL-TIME-COURTESY',
        title: 'Mid-Day Courtesy Early Check-In Window',
        category: 'timings',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guest arrives between mid-day window before standard 14:00 check-in',
        actionSummary: 'Complimentary early check-in granted if inspected clean vacant room is ready',
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
        updatedBy: 'FOM-Farhana',
        params: {
            timeWindowStart: '10:00',
            timeWindowEnd: '14:00',
            feePercentage: 0
        }
    },
    {
        id: 'pol-203',
        code: 'POL-TIME-LATE15',
        title: 'Afternoon Late Departure Surcharge',
        category: 'timings',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guest requests departure extension between afternoon threshold hours',
        actionSummary: 'Charge surcharge percentage on standard room tariff; Housekeeping rescheduled',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4025-LATECHECKOUT',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Late departure is subject to room availability and billed at a percentage of the daily room rate.',
        isActive: true,
        priorityOrder: 7,
        lastAuditDate: '2026-01-10',
        updatedBy: 'FOM-Farhana',
        params: {
            timeWindowStart: '12:00',
            timeWindowEnd: '15:00',
            feePercentage: 25
        }
    },
    {
        id: 'pol-204',
        code: 'POL-TIME-LATE18',
        title: 'Evening Extended Departure Surcharge',
        category: 'timings',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guest requests room occupancy extension during evening window',
        actionSummary: 'Charge extended rate; blocks room turnaround from same-day reselling',
        chargeType: 'PERCENT_FIRST_NIGHT',
        glAccountCode: 'GL-4025-LATECHECKOUT',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Extended departure requires Duty Manager authorization and incurs an extended half-day room surcharge.',
        isActive: true,
        priorityOrder: 8,
        lastAuditDate: '2026-01-10',
        updatedBy: 'FOM-Farhana',
        params: {
            timeWindowStart: '15:00',
            timeWindowEnd: '18:00',
            feePercentage: 50
        }
    },
    {
        id: 'pol-205',
        code: 'POL-TIME-PAST18',
        title: 'Late Night Departure (> 18:00 PM)',
        category: 'timings',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guest departs hotel after 18:00 PM without prior approved day-use booking',
        actionSummary: 'Full 100% additional 1-night room tariff automatically posted to guest folio',
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
        updatedBy: 'GM-Admin',
        params: {
            timeWindowStart: '18:00',
            timeWindowEnd: '23:59',
            feePercentage: 100
        }
    },

    // 3. FINANCIAL (DEPOSITS & CREDIT LIMITS)
    {
        id: 'pol-301',
        code: 'POL-FIN-INCIDENTAL',
        title: 'Incidental Security Deposit Requirement',
        category: 'financial',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Mandatory upon check-in registration for transient guests',
        actionSummary: 'Collect incidental security deposit per room per night via Card Pre-Auth or Cash Float',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-2050-INCIDENTAL-ESCROW',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'An incidental security deposit is held upon check-in and released upon room inspection at check-out.',
        isActive: true,
        priorityOrder: 10,
        lastAuditDate: '2026-01-14',
        updatedBy: 'Finance-Controller',
        params: {
            flatAmountBDT: 5000
        }
    },
    {
        id: 'pol-302',
        code: 'POL-FIN-HOUSELIMIT',
        title: 'House Credit Floor Limit & Auto-Folio Freeze',
        category: 'financial',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Unpaid room guest charges reach or exceed ceiling threshold without interim settlement',
        actionSummary: 'Automatically suspends POS restaurant charging and room service charging until top-up',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-1200-GUEST-LEDGER',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Guest room credit is capped at the designated floor limit. Balance settlements are required when the threshold is reached.',
        isActive: true,
        priorityOrder: 11,
        lastAuditDate: '2026-01-14',
        updatedBy: 'Finance-Controller',
        params: {
            flatAmountBDT: 35000
        }
    },

    // 4. OCCUPANCY & EXTRA BEDDING
    {
        id: 'pol-401',
        code: 'POL-OCC-INFANT',
        title: 'Infant Policy & Complimentary Baby Cot',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Children under age threshold sharing existing adult bedding (Max 2 per room)',
        actionSummary: 'Complimentary stay and complimentary buffet breakfast; baby cot provided on request',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Children under age limit stay free in existing bedding with complimentary buffet breakfast.',
        isActive: true,
        priorityOrder: 12,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana',
        params: {
            ageThreshold: 6,
            flatAmountBDT: 0
        }
    },
    {
        id: 'pol-402',
        code: 'POL-OCC-CHILD',
        title: 'Junior Child Extra Bed & Breakfast Surcharge',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Children aged between junior bracket requiring rollaway bed setup',
        actionSummary: 'Charge nightly surcharge inclusive of daily restaurant breakfast buffet',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4030-EXTRABED',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Junior children requiring rollaway bed are charged nightly surcharge, inclusive of breakfast.',
        isActive: true,
        priorityOrder: 13,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana',
        params: {
            ageThreshold: 11,
            flatAmountBDT: 1500
        }
    },
    {
        id: 'pol-403',
        code: 'POL-OCC-ADULT',
        title: 'Adult Third Person Surcharge (> 12 Years)',
        category: 'occupancy',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Third adult occupying King Deluxe or Executive Suite',
        actionSummary: 'Supply luxury rollaway bed, luxury bathroom amenities, and full international buffet breakfast',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4030-EXTRABED',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Third adult in room is charged nightly surcharge, inclusive of rollaway bedding and buffet breakfast package.',
        isActive: true,
        priorityOrder: 14,
        lastAuditDate: '2026-01-05',
        updatedBy: 'FOM-Farhana',
        params: {
            ageThreshold: 12,
            flatAmountBDT: 2500
        }
    },

    // 5. CONDUCT, SMOKING, PETS & DAMAGES
    {
        id: 'pol-501',
        code: 'POL-COND-SMOKE',
        title: 'Strict Non-Smoking Room Violation Penalty',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Evidence of smoking, e-cigarette/vaping or incense in non-smoking rooms',
        actionSummary: 'Automated deep cleaning, ozone air sanitization, and fabric treatment fee',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-4990-FINES-CLEANING',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'This is a 100% non-smoking hotel. Smoking or vaping in non-designated rooms incurs an automatic deep-cleaning fee.',
        isActive: true,
        priorityOrder: 15,
        lastAuditDate: '2026-01-16',
        updatedBy: 'GM-Admin',
        params: {
            flatAmountBDT: 25000
        }
    },
    {
        id: 'pol-502',
        code: 'POL-COND-DAMAGE',
        title: 'Property Asset Damage & Irreparable Stain Surcharge',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Irreparable damage, burns, or missing furniture, electronic equipment, or linen',
        actionSummary: 'Debited at official master replacement price schedule plus administrative handling percentage',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-4991-DAMAGE-RECOVERY',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Guests are liable for any damages to room furniture, electronics, or fittings, charged at replacement cost plus administrative fee.',
        isActive: true,
        priorityOrder: 16,
        lastAuditDate: '2026-01-16',
        updatedBy: 'GM-Admin',
        params: {
            feePercentage: 20
        }
    },
    {
        id: 'pol-503',
        code: 'POL-COND-PETS',
        title: 'Pet Accommodation & Damage Escrow Deposit',
        category: 'conduct',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Guests traveling with registered domestic pets (Under 15 kg weight limit)',
        actionSummary: 'Allowed in designated Garden Rooms; requires refundable damage escrow deposit',
        chargeType: 'FLAT_BDT',
        glAccountCode: 'GL-2050-INCIDENTAL-ESCROW',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'Pets under 15kg are welcomed in designated pet-friendly rooms with a refundable deposit and signed pet agreement.',
        isActive: true,
        priorityOrder: 17,
        lastAuditDate: '2026-01-16',
        updatedBy: 'FOM-Farhana',
        params: {
            flatAmountBDT: 10000
        }
    },

    // 6. BILLING & PAYMENT GOVERNANCE
    {
        id: 'pol-601',
        code: 'POL-BILL-CASHCEIL',
        title: 'Anti-Money Laundering (AML) Cash Ceiling Limit',
        category: 'billing',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Single cash payment transaction reaching statutory ceiling threshold',
        actionSummary: 'Mandatory verified photo ID/Passport and NID/TIN verification copy archived in audit docket',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-1001-CASH-DRAWER',
        requiresApproval: true,
        supervisorTier: 'L2 Operations',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'Per central banking regulations, cash payments exceeding statutory ceiling require mandatory ID verification.',
        isActive: true,
        priorityOrder: 18,
        lastAuditDate: '2026-01-12',
        updatedBy: 'Finance-Controller',
        params: {
            flatAmountBDT: 100000
        }
    },

    // 7. GROUPS & EVENTS
    {
        id: 'pol-701',
        code: 'POL-GRP-ATTRITION',
        title: 'Group Room Block Attrition Allowance',
        category: 'groups',
        scope: 'ALL_ROOMS',
        conditionSummary: 'Group organizer reduces total reserved room nights up to 21 days before arrival',
        actionSummary: 'Allows percentage reduction in contracted room count with zero penalty; excess billed at 100%',
        chargeType: 'CUSTOM',
        glAccountCode: 'GL-4010-CANC',
        requiresApproval: true,
        supervisorTier: 'L1 Executive',
        displayOnGuestReceipt: false,
        displayOnBookingEngine: false,
        guestFacingLegalClause: 'A designated room attrition allowance is permitted up to 21 days before event commencement without penalty.',
        isActive: true,
        priorityOrder: 19,
        lastAuditDate: '2026-01-10',
        updatedBy: 'GM-Admin',
        params: {
            feePercentage: 10
        }
    },

    // 8. LOYALTY & VIP PRIVILEGES
    {
        id: 'pol-802',
        code: 'POL-LOY-LATE16',
        title: 'Guaranteed Late Departure for VIP Loyalty Guests',
        category: 'loyalty',
        scope: 'VIP_TIER',
        conditionSummary: 'Departure of VIP Tier-1 or Suite guests requesting late checkout',
        actionSummary: 'Guaranteed complimentary late checkout granted up to designated afternoon hour with zero fee',
        chargeType: 'COMPLIMENTARY',
        glAccountCode: 'GL-4001-ROOMREV',
        requiresApproval: false,
        supervisorTier: 'None',
        displayOnGuestReceipt: true,
        displayOnBookingEngine: true,
        guestFacingLegalClause: 'VIP guests and Platinum members are entitled to guaranteed late checkout up to designated hour complimentary.',
        isActive: true,
        priorityOrder: 20,
        lastAuditDate: '2026-01-15',
        updatedBy: 'GM-Admin',
        params: {
            timeWindowEnd: '16:00',
            feePercentage: 0
        }
    }
];

export const PolicyManagement: React.FC<PolicyManagementProps> = () => {
    // 1. Initial State with LocalStorage Persistence
    const [policies, setPolicies] = useState<HotelPolicyRule[]>(() => {
        try {
            const saved = localStorage.getItem('hotel_policies_v2');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('Failed to parse saved policies', e);
        }
        return BASELINE_POLICIES;
    });

    const [activeTab, setActiveTab] = useState<PolicyCategory>('cancellation');
    const [activePreset, setActivePreset] = useState<PolicyStrategyPreset>('standard_flexible');
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

    // Sync to LocalStorage whenever policies change
    useEffect(() => {
        try {
            localStorage.setItem('hotel_policies_v2', JSON.stringify(policies));
        } catch (e) {
            console.error('Failed to save policies to localStorage', e);
        }
    }, [policies]);

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
        { id: 'billing', label: 'Billing & AML Limits', icon: DollarSign },
        { id: 'groups', label: 'Groups & Attrition', icon: Building2 },
        { id: 'loyalty', label: 'Loyalty & VIP Privileges', icon: Sparkles },
    ];

    // Filtered Policies
    const filteredPolicies = useMemo(() => {
        return policies.filter(p => {
            const matchesCategory = p.category === activeTab;
            const matchesSearch =
                p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.conditionSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.actionSummary.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

    // Active counts by category
    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        categories.forEach(c => {
            counts[c.id] = policies.filter(p => p.category === c.id && p.isActive).length;
        });
        return counts;
    }, [policies]);

    // Apply Strategy Presets dynamically
    const handleApplyPreset = (preset: PolicyStrategyPreset) => {
        setActivePreset(preset);
        if (preset === 'standard_flexible') {
            setPolicies(prev =>
                prev.map(p => {
                    if (p.code === 'POL-CANC-FLEX48') return { ...p, params: { ...p.params, hoursThreshold: 48, feePercentage: 0 } };
                    if (p.code === 'POL-CANC-MID24') return { ...p, params: { ...p.params, hoursThreshold: 24, feePercentage: 50 } };
                    if (p.code === 'POL-TIME-LATE15') return { ...p, params: { ...p.params, feePercentage: 25 } };
                    if (p.code === 'POL-FIN-INCIDENTAL') return { ...p, params: { ...p.params, flatAmountBDT: 5000 } };
                    return p;
                })
            );
            showToast('Loaded: "Flexible Standard (Year-Round)" preset applied to all active policies.');
        } else if (preset === 'strict_peak_season') {
            setPolicies(prev =>
                prev.map(p => {
                    if (p.code === 'POL-CANC-FLEX48') return { ...p, params: { ...p.params, hoursThreshold: 168, feePercentage: 0 } }; // 7 days!
                    if (p.code === 'POL-CANC-MID24') return { ...p, params: { ...p.params, hoursThreshold: 72, feePercentage: 100 } }; // Full forfeiture!
                    if (p.code === 'POL-TIME-LATE15') return { ...p, params: { ...p.params, feePercentage: 50 } };
                    if (p.code === 'POL-FIN-INCIDENTAL') return { ...p, params: { ...p.params, flatAmountBDT: 10000 } };
                    return p;
                })
            );
            showToast('Loaded: "Strict Peak Season (100% Deposit Lockdown)" preset applied to all rules.');
        } else if (preset === 'corporate_priority') {
            setPolicies(prev =>
                prev.map(p => {
                    if (p.code === 'POL-CANC-FLEX48') return { ...p, params: { ...p.params, hoursThreshold: 24, feePercentage: 0 } }; // 24h free!
                    if (p.code === 'POL-TIME-LATE15') return { ...p, params: { ...p.params, feePercentage: 0 } }; // Complimentary till 15:00!
                    if (p.code === 'POL-FIN-HOUSELIMIT') return { ...p, params: { ...p.params, flatAmountBDT: 50000 } };
                    return p;
                })
            );
            showToast('Loaded: "Corporate Negotiated Priority" preset applied dynamically.');
        }
    };

    // Inline Parameter Updates
    const handleUpdateParam = (ruleId: string, paramKey: keyof DynamicPolicyParams, value: any) => {
        setPolicies(prev =>
            prev.map(p => {
                if (p.id === ruleId) {
                    return {
                        ...p,
                        params: {
                            ...p.params,
                            [paramKey]: value
                        },
                        lastAuditDate: new Date().toISOString().slice(0, 10),
                        updatedBy: 'Admin (Inline Calibration)'
                    };
                }
                return p;
            })
        );
        showToast('Rule parameter dynamically updated & saved.');
    };

    const handleToggleRuleStatus = (ruleId: string) => {
        setPolicies(prev =>
            prev.map(p => {
                if (p.id === ruleId) {
                    const next = !p.isActive;
                    showToast(`Policy "${p.code}" ${next ? 'activated' : 'deactivated'}.`);
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
        const conditionSummary = (formData.get('conditionSummary') as string) || '';
        const actionSummary = (formData.get('actionSummary') as string) || '';
        const chargeType = (formData.get('chargeType') as ChargeType) || 'FLAT_BDT';
        const glAccountCode = (formData.get('glAccountCode') as string) || 'GL-4001-ROOMREV';
        const requiresApproval = formData.get('requiresApproval') === 'on';
        const supervisorTier = (formData.get('supervisorTier') as SupervisorTier) || (requiresApproval ? 'L2 Operations' : 'None');
        const displayOnGuestReceipt = formData.get('displayOnGuestReceipt') === 'on';
        const displayOnBookingEngine = formData.get('displayOnBookingEngine') === 'on';
        const guestFacingLegalClause = (formData.get('guestFacingLegalClause') as string) || '';

        // Dynamic parameters from form
        const hoursThreshold = Number(formData.get('paramHoursThreshold')) || undefined;
        const feePercentage = Number(formData.get('paramFeePercentage')) || undefined;
        const flatAmountBDT = Number(formData.get('paramFlatAmountBDT')) || undefined;
        const timeWindowStart = (formData.get('paramTimeWindowStart') as string) || undefined;
        const timeWindowEnd = (formData.get('paramTimeWindowEnd') as string) || undefined;
        const ageThreshold = Number(formData.get('paramAgeThreshold')) || undefined;

        const dynamicParams: DynamicPolicyParams = {
            hoursThreshold,
            feePercentage,
            flatAmountBDT,
            timeWindowStart,
            timeWindowEnd,
            ageThreshold,
        };

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
                            conditionSummary,
                            actionSummary,
                            chargeType,
                            glAccountCode,
                            requiresApproval,
                            supervisorTier,
                            displayOnGuestReceipt,
                            displayOnBookingEngine,
                            guestFacingLegalClause,
                            params: dynamicParams,
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
                conditionSummary,
                actionSummary,
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
                params: dynamicParams
            };
            setPolicies(prev => [newRule, ...prev]);
            showToast(`New policy "${code}" registered and live.`);
        }

        setIsRuleModalOpen(false);
        setEditingRule(null);
    };

    // Dynamic Simulator Evaluation: Reads current dynamic params of active policies
    const evaluatedSimulation = useMemo(() => {
        if (simScenario === 'cancel-36h') {
            const cancelMidRule = policies.find(p => p.code === 'POL-CANC-MID24') || policies[1];
            const cancelFlexRule = policies.find(p => p.code === 'POL-CANC-FLEX48') || policies[0];
            const flexCutoff = cancelFlexRule?.params.hoursThreshold ?? 48;
            const penaltyPercent = cancelMidRule?.params.feePercentage ?? 50;

            if (36 >= flexCutoff) {
                return {
                    ruleCode: cancelFlexRule?.code ?? 'POL-CANC-FLEX48',
                    ruleTitle: cancelFlexRule?.title ?? 'Flexible Free Cancellation',
                    calculatedFee: '0% (Free Refund Granted)',
                    glCode: 'GL-4010-CANC',
                    requiresApproval: false,
                    tier: 'Automated Zero Fee',
                    explanation: `Cancellation registered 36h prior to arrival, which is greater than the current active threshold of ${flexCutoff}h. 100% advance deposit refunded with zero deduction.`
                };
            } else {
                return {
                    ruleCode: cancelMidRule?.code ?? 'POL-CANC-MID24',
                    ruleTitle: cancelMidRule?.title ?? 'Mid-Notice Window Cancellation Fee',
                    calculatedFee: `${penaltyPercent}% First Night Room Tariff + VAT`,
                    glCode: cancelMidRule?.glAccountCode ?? 'GL-4010-CANC',
                    requiresApproval: cancelMidRule?.requiresApproval ?? false,
                    tier: cancelMidRule?.requiresApproval ? `${cancelMidRule.supervisorTier} Approval` : 'Automated System Execution',
                    explanation: `Cancellation registered at 36h falls inside the active late notice threshold (< ${flexCutoff}h). System dynamically computes a ${penaltyPercent}% tariff penalty.`
                };
            }
        } else if (simScenario === 'checkout-1630') {
            const eveningRule = policies.find(p => p.code === 'POL-TIME-LATE18');
            const fee = eveningRule?.params.feePercentage ?? 50;
            return {
                ruleCode: eveningRule?.code ?? 'POL-TIME-LATE18',
                ruleTitle: eveningRule?.title ?? 'Evening Extended Departure Surcharge',
                calculatedFee: `${fee}% Daily Room Tariff`,
                glCode: eveningRule?.glAccountCode ?? 'GL-4025-LATECHECKOUT',
                requiresApproval: eveningRule?.requiresApproval ?? true,
                tier: 'L2 Operations (Front Office Manager Sign-off)',
                explanation: `Departure requested at 16:30 PM (window 15:00 - 18:00 PM). System automatically posts ${fee}% of daily room rate to folio upon manager verification.`
            };
        } else if (simScenario === 'smoking-detected') {
            const smokeRule = policies.find(p => p.code === 'POL-COND-SMOKE');
            const fineBDT = smokeRule?.params.flatAmountBDT ?? 25000;
            return {
                ruleCode: smokeRule?.code ?? 'POL-COND-SMOKE',
                ruleTitle: smokeRule?.title ?? 'Strict Non-Smoking Room Violation Penalty',
                calculatedFee: `৳ ${fineBDT.toLocaleString()} Flat Sanitization Fine`,
                glCode: smokeRule?.glAccountCode ?? 'GL-4990-FINES-CLEANING',
                requiresApproval: true,
                tier: 'L2 Operations Approval Required',
                explanation: `Physical smoking detected in guest suite. Policy dynamically charges ৳ ${fineBDT.toLocaleString()} to guest folio. Requires supervisor sign-off with ozone treatment log.`
            };
        } else if (simScenario === 'credit-limit') {
            const limitRule = policies.find(p => p.code === 'POL-FIN-HOUSELIMIT');
            const limitBDT = limitRule?.params.flatAmountBDT ?? 35000;
            return {
                ruleCode: limitRule?.code ?? 'POL-FIN-HOUSELIMIT',
                ruleTitle: limitRule?.title ?? 'House Credit Floor Limit & Auto-Folio Freeze',
                calculatedFee: `৳ 0 (Active Credit Threshold: ৳ ${limitBDT.toLocaleString()})`,
                glCode: limitRule?.glAccountCode ?? 'GL-1200-GUEST-LEDGER',
                requiresApproval: false,
                tier: 'Automated Folio Lock',
                explanation: `Unpaid room folio balance reached ৳ 38,200, exceeding current floor limit of ৳ ${limitBDT.toLocaleString()}. Automated lock placed on all POS restaurant and room service charging.`
            };
        }
        return null;
    }, [simScenario, policies]);

    // Export Handbook as JSON
    const handleExportHandbook = () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(policies, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', dataStr);
        downloadAnchor.setAttribute('download', `hotel_policy_handbook_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Dynamic Master Hotel Policy Handbook exported as JSON.');
    };

    // Reset to Baseline
    const handleResetBaseline = () => {
        if (window.confirm('Reset all hotel policies to 5-star baseline defaults? Any custom parameters will be restored.')) {
            setPolicies(BASELINE_POLICIES);
            localStorage.removeItem('hotel_policies_v2');
            showToast('All policies restored to enterprise baseline.');
        }
    };

    return (
        <div className="page-container">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Elevated Header Card */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden">
                <div className="px-3 py-1.5 flex items-center justify-between gap-2.5 border-b border-slate-100 flex-shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs shrink-0">
                            <ShieldCheck size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                    Dynamic Hotel Policy & Rules Engine
                                </h1>
                                <span className="badge-status-active">
                                    Computational Engine
                                </span>
                                <span className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] bg-blue-50 text-primary border border-blue-200">
                                    GL Ledger Mapped
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-gray-500 mt-0.5 leading-tight">
                                <span className="flex items-center gap-1">
                                    <ShieldCheck size={11} className="text-slate-400" />
                                    <span>{policies.filter(p => p.isActive).length} Active Enforced Policies</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock size={11} className="text-slate-400" />
                                    <span>Check-in: 14:00 • Check-out: 12:00</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Calendar size={11} className="text-slate-400" />
                                    <span>Cancellation Cutoff: {policies.find(p => p.code === 'POL-CANC-FLEX48')?.params.hoursThreshold ?? 48}h Window</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Header Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setIsSimulatorOpen(!isSimulatorOpen)}
                            className={isSimulatorOpen ? 'btn-primary' : 'btn-secondary'}
                            title="Interactive Policy Rule Evaluation Simulator"
                        >
                            <Play size={13} className={isSimulatorOpen ? 'text-white' : 'text-primary'} />
                            <span>Rule Simulator</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleExportHandbook}
                            className="btn-secondary"
                            title="Export Master Policy Handbook JSON"
                        >
                            <Download size={13} className="text-slate-400" />
                            <span>Export Rules</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenCreateRule}
                            className="btn-primary"
                        >
                            <Plus size={14} />
                            <span>Create Policy</span>
                        </button>
                    </div>
                </div>

                {/* DYNAMIC SEASONAL STRATEGY PRESET SWITCHER */}
                <div className="px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-white border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                        <SlidersHorizontal size={13} className="text-blue-600 flex-shrink-0" />
                        <span className="text-gray-700 text-[11px] uppercase tracking-wider">
                            Seasonal Strategy Preset:
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                                { id: 'standard_flexible', label: 'Standard Flexible (48h Free)' },
                                { id: 'strict_peak_season', label: 'Strict Peak Season (7-Day Lock)' },
                                { id: 'corporate_priority', label: 'Corporate MICE Priority (24h Free)' },
                            ].map(preset => (
                                <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleApplyPreset(preset.id as PolicyStrategyPreset)}
                                    className={`h-6 px-2.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${activePreset === preset.id
                                        ? 'bg-primary text-white shadow-2xs'
                                        : 'bg-white hover:bg-gray-100 border border-gray-200 text-gray-600'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            type="button"
                            onClick={handleResetBaseline}
                            className="text-[11px] text-gray-500 hover:text-gray-700 flex items-center gap-1 cursor-pointer font-medium"
                            title="Reset all customized parameters to system baseline"
                        >
                            <RotateCcw size={11} />
                            <span>Reset Baseline</span>
                        </button>
                    </div>
                </div>

                {/* 8 Pillar Horizontal Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-slate-50/70 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {categories.map(cat => {
                            const IconComponent = cat.icon;
                            const isActive = activeTab === cat.id;
                            const count = categoryCounts[cat.id] || 0;

                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setActiveTab(cat.id)}
                                    className={`h-8 px-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${isActive
                                        ? 'bg-white text-primary shadow-2xs border border-slate-200 font-bold'
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                        }`}
                                >
                                    <IconComponent size={12} className={isActive ? 'text-primary' : 'text-slate-400'} />
                                    <span>{cat.label}</span>
                                    <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? 'bg-blue-50 text-primary border border-blue-100' : 'bg-slate-100 text-slate-500'}`}>
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
                                <h3 className="text-xs text-white tracking-wide uppercase">
                                    Real-Time Dynamic Policy Evaluation Simulator
                                </h3>
                                <p className="text-[11px] text-indigo-200/80">
                                    Simulate operational front-desk scenarios against your dynamically calibrated policy parameters.
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
                            <span className="text-[11px] text-indigo-300 uppercase tracking-wider block">
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
                                        onClick={() => setSimScenario(sc.id)}
                                        className={`w-full text-left p-2 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${simScenario === sc.id
                                            ? 'bg-indigo-600 border-indigo-400 text-white shadow-md'
                                            : 'bg-white/5 border-white/10 text-indigo-200 hover:bg-white/10'
                                            }`}
                                    >
                                        {sc.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Simulation Result */}
                        {evaluatedSimulation && (
                            <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-xl p-3 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-700">
                                        Dynamically Evaluated Rule: {evaluatedSimulation.ruleCode}
                                    </span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${evaluatedSimulation.requiresApproval
                                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                                        }`}>
                                        {evaluatedSimulation.tier}
                                    </span>
                                </div>

                                <div className="text-sm text-white">
                                    {evaluatedSimulation.ruleTitle}
                                </div>

                                <div className="grid grid-cols-2 gap-2 p-2 bg-black/20 rounded-lg border border-white/5 text-[11px]">
                                    <div>
                                        <span className="text-indigo-300 block text-[10px] uppercase">Calculated Dynamic Charge</span>
                                        <span className="text-emerald-400">{evaluatedSimulation.calculatedFee}</span>
                                    </div>
                                    <div>
                                        <span className="text-indigo-300 block text-[10px] uppercase">General Ledger Credit Code</span>
                                        <span className="font-mono text-indigo-200">{evaluatedSimulation.glCode}</span>
                                    </div>
                                </div>

                                <p className="text-[11px] text-indigo-100 leading-relaxed">
                                    {evaluatedSimulation.explanation}
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
                        placeholder={`Search ${activeTab} rules by keyword, code (POL-), parameters, or GL code...`}
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

            {/* DYNAMIC POLICY RULES LIST */}
            <div className="space-y-3">
                {filteredPolicies.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200/90 p-12 text-center shadow-2xs">
                        <ShieldCheck size={32} className="mx-auto text-gray-300 mb-2" />
                        <h3 className="text-sm text-gray-700">No policy rules match your search or filter.</h3>
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
                                    <span className="font-mono text-[10.5px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                                        {rule.code}
                                    </span>
                                    <h3 className="text-sm text-gray-900 tracking-tight">
                                        {rule.title}
                                    </h3>
                                    <span className="text-[10px] font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                                        Scope: {rule.scope.replace('_', ' ')}
                                    </span>
                                    {rule.requiresApproval ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                            <Lock size={10} />
                                            <span>Requires {rule.supervisorTier} Approval</span>
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                            <CheckCircle2 size={10} />
                                            <span>Automated Engine Execution</span>
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                    {/* Active Status Pill */}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleRuleStatus(rule.id)}
                                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] transition-all cursor-pointer ${rule.isActive
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
                                        title="Configure Full Rule Schema"
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

                            {/* DYNAMIC COMPUTATIONAL PARAMETERS BAR (Inline Interactive Controls) */}
                            <div className="p-2.5 bg-gradient-to-r from-slate-50 via-gray-50 to-blue-50/30 rounded-lg border border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-2">
                                    <Sliders size={13} className="text-blue-600" />
                                    <span className="text-gray-700 text-[11px] uppercase tracking-wider">
                                        Dynamic Rule Variables:
                                    </span>
                                </div>

                                <div className="flex items-center gap-3 flex-wrap">
                                    {/* Hours Threshold Stepper */}
                                    {rule.params.hoursThreshold !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs">
                                            <span className="text-[10.5px] font-medium text-gray-500">Cutoff Window:</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'hoursThreshold', Math.max(0, (rule.params.hoursThreshold ?? 48) - 12))}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    -
                                                </button>
                                                <span className="font-mono text-blue-700 text-xs px-1">
                                                    {rule.params.hoursThreshold}h
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'hoursThreshold', (rule.params.hoursThreshold ?? 48) + 12)}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fee Percentage Stepper */}
                                    {rule.params.feePercentage !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs">
                                            <span className="text-[10.5px] font-medium text-gray-500">Charge Rate:</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'feePercentage', Math.max(0, (rule.params.feePercentage ?? 50) - 10))}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    -
                                                </button>
                                                <span className="font-mono text-emerald-700 text-xs px-1">
                                                    {rule.params.feePercentage}%
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'feePercentage', Math.min(100, (rule.params.feePercentage ?? 50) + 10))}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Flat Amount Input */}
                                    {rule.params.flatAmountBDT !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs">
                                            <span className="text-[10.5px] font-medium text-gray-500">Tariff BDT:</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'flatAmountBDT', Math.max(0, (rule.params.flatAmountBDT ?? 5000) - 1000))}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    -
                                                </button>
                                                <span className="font-mono text-gray-900 text-xs px-1">
                                                    ৳ {rule.params.flatAmountBDT.toLocaleString()}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateParam(rule.id, 'flatAmountBDT', (rule.params.flatAmountBDT ?? 5000) + 1000)}
                                                    className="w-5 h-5 bg-gray-100 hover:bg-gray-200 rounded text-gray-700 flex items-center justify-center cursor-pointer text-xs"
                                                >
                                                    +
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Time Window */}
                                    {rule.params.timeWindowStart && rule.params.timeWindowEnd && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs text-[11px]">
                                            <span className="text-[10.5px] font-medium text-gray-500">Active Window:</span>
                                            <span className="font-mono text-indigo-700">
                                                {rule.params.timeWindowStart} – {rule.params.timeWindowEnd}
                                            </span>
                                        </div>
                                    )}

                                    {/* Age Limit */}
                                    {rule.params.ageThreshold !== undefined && (
                                        <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs text-[11px]">
                                            <span className="text-[10.5px] font-medium text-gray-500">Age Limit:</span>
                                            <span className="text-gray-800">
                                                {rule.params.ageThreshold} Years
                                            </span>
                                        </div>
                                    )}

                                    {/* GL Account Badge */}
                                    <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-2xs text-[10.5px] font-mono text-gray-500">
                                        <span>GL:</span>
                                        <strong className="text-gray-800">{rule.glAccountCode}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* VISUAL PROGRAMMATIC IF-THEN COMPUTATIONAL NODES */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 text-xs items-stretch">
                                {/* IF NODE (Trigger) */}
                                <div className="md:col-span-5 p-2.5 rounded-lg bg-gray-50 border border-gray-200/80 space-y-1">
                                    <span className="text-[10px] text-blue-700 uppercase tracking-wider flex items-center gap-1">
                                        <Clock size={11} className="text-blue-600" />
                                        <span>IF (Operational Trigger Condition)</span>
                                    </span>
                                    <p className="text-gray-800 font-medium leading-snug">
                                        {rule.conditionSummary}
                                        {rule.params.hoursThreshold !== undefined && (
                                            <span className="text-blue-700 ml-1">
                                                (Currently set to {rule.params.hoursThreshold} hours)
                                            </span>
                                        )}
                                        {rule.params.timeWindowStart && (
                                            <span className="text-indigo-700 ml-1">
                                                ({rule.params.timeWindowStart} to {rule.params.timeWindowEnd})
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {/* CONNECTOR ARROW */}
                                <div className="hidden md:flex md:col-span-1 items-center justify-center text-gray-400">
                                    <ArrowRight size={16} />
                                </div>

                                {/* THEN NODE (Folio Action) */}
                                <div className="md:col-span-6 p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200/80 space-y-1 flex flex-col justify-between">
                                    <div>
                                        <span className="text-[10px] text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                                            <Check size={11} className="text-emerald-600" />
                                            <span>THEN (Automated Folio Action & Fee)</span>
                                        </span>
                                        <p className="text-gray-900 font-medium leading-snug">
                                            {rule.actionSummary}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200/50 text-[11px]">
                                        <span className="text-[10px] uppercase text-emerald-800">Computed Charge Rate:</span>
                                        <strong className="text-emerald-800 font-bold">
                                            {rule.params.feePercentage !== undefined ? `${rule.params.feePercentage}%` : ''}
                                            {rule.params.flatAmountBDT !== undefined ? `৳ ${rule.params.flatAmountBDT.toLocaleString()}` : ''}
                                            {rule.params.feePercentage === undefined && rule.params.flatAmountBDT === undefined ? rule.chargeType.replace('_', ' ') : ''}
                                        </strong>
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

            {/* CREATE / EDIT DYNAMIC POLICY RULE MODAL */}
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
                                    <h2 className="text-sm text-gray-900">
                                        {editingRule ? `Configure Dynamic Policy: ${editingRule.code}` : 'Register Dynamic Hotel Policy Rule'}
                                    </h2>
                                    <p className="text-[11px] text-gray-500">
                                        Configure computational parameters, trigger thresholds, fee formulas, and GL accounts.
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
                                <span className="text-gray-700 text-[11px] uppercase tracking-wider block">
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
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
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

                            {/* Section 2: Computational Parameters */}
                            <div className="space-y-1">
                                <span className="text-gray-700 text-[11px] uppercase tracking-wider block flex items-center gap-1 text-blue-700">
                                    <Sliders size={12} />
                                    <span>2. Dynamic Computational Parameters (Live Input)</span>
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 bg-blue-50/40 border border-blue-100 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Cutoff Window (Hours)</label>
                                        <input
                                            type="number"
                                            name="paramHoursThreshold"
                                            defaultValue={editingRule?.params.hoursThreshold ?? ''}
                                            placeholder="e.g. 48"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Fee Rate (%)</label>
                                        <input
                                            type="number"
                                            name="paramFeePercentage"
                                            min={0}
                                            max={100}
                                            defaultValue={editingRule?.params.feePercentage ?? ''}
                                            placeholder="e.g. 50"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Flat Fee / Deposit (BDT)</label>
                                        <input
                                            type="number"
                                            name="paramFlatAmountBDT"
                                            defaultValue={editingRule?.params.flatAmountBDT ?? ''}
                                            placeholder="e.g. 5000"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Time Window Start</label>
                                        <input
                                            type="text"
                                            name="paramTimeWindowStart"
                                            defaultValue={editingRule?.params.timeWindowStart ?? ''}
                                            placeholder="e.g. 06:00"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Time Window End</label>
                                        <input
                                            type="text"
                                            name="paramTimeWindowEnd"
                                            defaultValue={editingRule?.params.timeWindowEnd ?? ''}
                                            placeholder="e.g. 10:00"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Age Bracket Limit</label>
                                        <input
                                            type="number"
                                            name="paramAgeThreshold"
                                            defaultValue={editingRule?.params.ageThreshold ?? ''}
                                            placeholder="e.g. 6 or 12"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Natural Language Summaries & GL */}
                            <div className="space-y-1">
                                <span className="text-gray-700 text-[11px] uppercase tracking-wider block">
                                    3. Rule Statements & GL Ledger
                                </span>
                                <div className="space-y-2.5 p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl">
                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Trigger Condition Summary</label>
                                        <input
                                            type="text"
                                            name="conditionSummary"
                                            required
                                            defaultValue={editingRule?.conditionSummary || ''}
                                            placeholder="e.g. Cancellation received > 48 Hours before 14:00 check-in"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="font-semibold text-gray-700">Folio Action / Resolution Statement</label>
                                        <input
                                            type="text"
                                            name="actionSummary"
                                            required
                                            defaultValue={editingRule?.actionSummary || ''}
                                            placeholder="e.g. Charge 50% of first night room tariff + taxes"
                                            className="w-full h-8 px-2.5 border border-gray-200 rounded-lg bg-white outline-none text-xs"
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

                            {/* Section 4: Governance & Legal */}
                            <div className="space-y-1">
                                <span className="text-gray-700 text-[11px] uppercase tracking-wider block">
                                    4. Supervisor Override & Legal Disclosures
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
                                        <label className="font-semibold text-gray-700">Guest-Facing Legal Clause</label>
                                        <textarea
                                            name="guestFacingLegalClause"
                                            rows={2}
                                            defaultValue={editingRule?.guestFacingLegalClause || ''}
                                            placeholder="The exact legal sentence disclosed to guests during booking..."
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
                                    {editingRule ? 'Save Dynamic Rule' : 'Register Dynamic Rule'}
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
