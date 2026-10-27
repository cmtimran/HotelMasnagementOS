import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiUrl';
import {
    Coins,
    TrendingUp,
    Target,
    Percent,
    Plus,
    Trash2,
    Database,
    CheckCircle2,
    X,
    Receipt,
    RefreshCw,
    Edit2,
    Info,
    Building2,
    Clock,
    Landmark,
    Shield,
    Check,
    Wallet
} from 'lucide-react';

export type MasterDataTabType =
    | 'currency'
    | 'revenue'
    | 'charges'
    | 'discounts'
    | 'banking'
    | 'departments'
    | 'source';

// ============================================================================
// DATA INTERFACES & SCHEMAS (USALI & ENTERPRISE HOTEL COMPLIANT)
// ============================================================================

export interface Currency {
    id: number;
    name: string;
    code: string;
    symbol: string;
    isBase: boolean;
    acceptPayment: boolean;
    symbolPosition: 'prefix' | 'suffix';
    decimals: number;
    denominations: string;
}

export interface ExchangeRate {
    id: number;
    currencyCode: string;
    currencyName: string;
    buyingRate: string;
    sellingRate: string;
    effectiveDate: string;
    autoUpdate: boolean;
}

export interface RevenueGroup {
    id: number;
    code: string;
    name: string;
    usaliCategory: 'Operating Revenue' | 'Non-Operating Income';
    departmentHead: string;
    glPrefix: string;
}

export interface RevenueHead {
    id: number;
    groupId: number;
    code: string;
    name: string;
    defaultTaxRate: number; // e.g. 15 for 15% VAT
    serviceChargeApplicable: boolean; // 10%
    glAccountCode: string; // e.g. GL-4001
    costCenter: string; // e.g. CC-101 FO
    accountType: 'Revenue (Credit)' | 'Contra-Revenue (Debit)';
    active: boolean;
}

export interface ExtraCharge {
    id: number;
    code: string;
    name: string;
    category: 'Transport' | 'Housekeeping' | 'Food & Beverage' | 'Front Desk' | 'Spa & Wellness' | 'IT & Telecom';
    pricingRule: 'Flat Amount' | 'Per Night' | 'Per Person' | 'Room Rate %';
    basePrice: number;
    taxApplicable: boolean;
    serviceChargeApplicable: boolean;
    revenueLedgerCode: string;
    autoPostTrigger: 'On Reservation' | 'On Check-In' | 'On Demand / Manual';
    active: boolean;
}

export interface DiscountPolicy {
    id: number;
    code: string;
    name: string;
    category: 'Corporate Negotiated' | 'Promotional Campaign' | 'VIP / GM Discretionary' | 'Long Stay Allowance' | 'Staff Privilege';
    type: 'Percentage (%)' | 'Flat Amount (BDT)';
    value: number;
    maxCapBDT: number;
    minSpendBDT: number;
    applicableOn: ('Rooms' | 'F&B' | 'Spa' | 'All Folio')[];
    requiresManagerPin: boolean;
    reasonRequired: boolean;
    contraRevenueGlCode: string;
    active: boolean;
}

export interface BankAccount {
    id: number;
    bankName: string;
    accountTitle: string;
    accountNumber: string;
    branchName: string;
    routingNumber: string;
    swiftCode: string;
    isDefaultSettlement: boolean;
    linkedGlCode: string;
    status: 'Active' | 'Inactive';
}

export interface MfsWallet {
    id: number;
    provider: 'bKash Merchant' | 'Nagad Sheba' | 'Rocket DBBL' | 'Upay UCB';
    merchantNumber: string;
    counterId: string;
    commissionRatePercent: number;
    linkedBankName: string;
    linkedGlCode: string;
    dailyLimitBDT: number;
    status: 'Active' | 'Inactive';
}

export interface Department {
    id: number;
    code: string;
    name: string;
    hodName: string;
    costCenterCode: string;
    type: 'Operational (Revenue Generating)' | 'Support & Administration';
    staffCount: number;
    monthlyBudgetBDT: number;
    status: 'Active' | 'Inactive';
}

export interface WorkShift {
    id: number;
    code: string;
    name: string;
    startTime: string;
    endTime: string;
    gracePeriodMinutes: number;
    mandatoryCashHandover: boolean;
    canTriggerNightAudit: boolean;
    assignedStaffCount: number;
    color: string;
    status: 'Active' | 'Inactive';
}

export interface BusinessSource {
    id: number;
    name: string;
    type: string;
    commission: string;
    active: boolean;
    linkedRatePlan: string;
}

export interface MarketCode {
    id: number;
    code: string;
    description: string;
    reportGroup: string;
}

// ============================================================================
// INITIAL SEED DATA
// ============================================================================

const INITIAL_CURRENCIES: Currency[] = [
    { id: 1, name: 'Bangladeshi Taka', code: 'BDT', symbol: '৳', isBase: true, acceptPayment: true, symbolPosition: 'prefix', decimals: 2, denominations: '1000, 500, 100, 50, 20, 10' },
    { id: 2, name: 'US Dollar', code: 'USD', symbol: '$', isBase: false, acceptPayment: true, symbolPosition: 'prefix', decimals: 2, denominations: '100, 50, 20, 10, 5, 1' },
    { id: 3, name: 'Euro', code: 'EUR', symbol: '€', isBase: false, acceptPayment: true, symbolPosition: 'prefix', decimals: 2, denominations: '500, 200, 100, 50, 20, 10' },
    { id: 4, name: 'British Pound', code: 'GBP', symbol: '£', isBase: false, acceptPayment: true, symbolPosition: 'prefix', decimals: 2, denominations: '50, 20, 10, 5' },
    { id: 5, name: 'Saudi Riyal', code: 'SAR', symbol: '﷼', isBase: false, acceptPayment: true, symbolPosition: 'prefix', decimals: 2, denominations: '500, 100, 50, 10, 5, 1' }
];

const INITIAL_RATES: ExchangeRate[] = [
    { id: 1, currencyCode: 'USD', currencyName: 'US Dollar', buyingRate: '121.50', sellingRate: '123.00', effectiveDate: 'Today 09:00 AM', autoUpdate: true },
    { id: 2, currencyCode: 'EUR', currencyName: 'Euro', buyingRate: '131.20', sellingRate: '133.50', effectiveDate: 'Today 09:00 AM', autoUpdate: true },
    { id: 3, currencyCode: 'GBP', currencyName: 'British Pound', buyingRate: '154.10', sellingRate: '157.00', effectiveDate: 'Today 09:00 AM', autoUpdate: false },
    { id: 4, currencyCode: 'SAR', currencyName: 'Saudi Riyal', buyingRate: '32.40', sellingRate: '33.10', effectiveDate: 'Today 09:00 AM', autoUpdate: true }
];

const INITIAL_REVENUE_GROUPS: RevenueGroup[] = [
    { id: 1, code: 'REV-ROOMS', name: 'Rooms Division', usaliCategory: 'Operating Revenue', departmentHead: 'Front Office Director', glPrefix: '4000-4099' },
    { id: 2, code: 'REV-FNB', name: 'Food & Beverage Division', usaliCategory: 'Operating Revenue', departmentHead: 'F&B Director & Executive Chef', glPrefix: '4100-4199' },
    { id: 3, code: 'REV-OPERATED', name: 'Other Operated Departments', usaliCategory: 'Operating Revenue', departmentHead: 'Operations Director', glPrefix: '4200-4499' },
    { id: 4, code: 'REV-MISC', name: 'Miscellaneous Non-Operating Income', usaliCategory: 'Non-Operating Income', departmentHead: 'Financial Controller', glPrefix: '4500-4599' }
];

const INITIAL_REVENUE_HEADS: RevenueHead[] = [
    { id: 1, groupId: 1, code: 'REV-ROOM-STD', name: 'Deluxe Standard Room Tariffs', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4001', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 2, groupId: 1, code: 'REV-ROOM-SUT', name: 'Presidential & Executive Suites', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4002', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 3, groupId: 1, code: 'REV-ROOM-EXT', name: 'Extra Bed & Person Surcharges', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4050', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },
    { id: 4, groupId: 1, code: 'REV-ROOM-DAY', name: 'Day Use & Early/Late Room Tariffs', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4060', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    
    { id: 5, groupId: 2, code: 'REV-FNB-DINE', name: 'All-Day Dining Restaurant Sales', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4101', costCenter: 'CC-201 Restaurant', accountType: 'Revenue (Credit)', active: true },
    { id: 6, groupId: 2, code: 'REV-FNB-BANQ', name: 'Grand Ballroom & Banquet Hall Rental', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4102', costCenter: 'CC-203 Banquet', accountType: 'Revenue (Credit)', active: true },
    { id: 7, groupId: 2, code: 'REV-FNB-BAR', name: 'Skyline Lounge & Bar Sales', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4103', costCenter: 'CC-202 Lounge', accountType: 'Revenue (Credit)', active: true },
    { id: 8, groupId: 2, code: 'REV-FNB-MINI', name: 'In-Room Minibar Revenue', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4104', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },

    { id: 9, groupId: 3, code: 'REV-OPS-LND', name: 'Guest Valet Laundry & Dry Cleaning', defaultTaxRate: 15, serviceChargeApplicable: false, glAccountCode: 'GL-4201', costCenter: 'CC-102 Housekeeping', accountType: 'Revenue (Credit)', active: true },
    { id: 10, groupId: 3, code: 'REV-OPS-TRN', name: 'Airport VIP Limousine Fleet Service', defaultTaxRate: 15, serviceChargeApplicable: false, glAccountCode: 'GL-4301', costCenter: 'CC-101 Concierge', accountType: 'Revenue (Credit)', active: true },
    { id: 11, groupId: 3, code: 'REV-OPS-SPA', name: 'Lotus Luxury Spa & Wellness Treatments', defaultTaxRate: 15, serviceChargeApplicable: true, glAccountCode: 'GL-4401', costCenter: 'CC-401 Spa', accountType: 'Revenue (Credit)', active: true },

    { id: 12, groupId: 4, code: 'REV-MSC-CANC', name: 'Late Cancellation Forfeiture Penalties', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4501', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 13, groupId: 4, code: 'REV-MSC-NOSH', name: 'Guaranteed No-Show Charge Revenue', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4502', costCenter: 'CC-101 Front Office', accountType: 'Revenue (Credit)', active: true },
    { id: 14, groupId: 4, code: 'REV-MSC-FXGN', name: 'Foreign Exchange Gain & Conversion Margin', defaultTaxRate: 0, serviceChargeApplicable: false, glAccountCode: 'GL-4503', costCenter: 'CC-301 Finance', accountType: 'Revenue (Credit)', active: true }
];

const INITIAL_EXTRA_CHARGES: ExtraCharge[] = [
    { id: 1, code: 'TRN-LIMO', name: 'VIP Airport Limousine Transfer', category: 'Transport', pricingRule: 'Flat Amount', basePrice: 3500, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4301 - Airport VIP Fleet', autoPostTrigger: 'On Reservation', active: true },
    { id: 2, code: 'HSK-EXBED', name: 'Rollaway Extra Bed & Bedding', category: 'Housekeeping', pricingRule: 'Per Night', basePrice: 2500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4050 - Extra Bed Surcharges', autoPostTrigger: 'On Check-In', active: true },
    { id: 3, code: 'FO-EARLY', name: 'Early Morning Check-In (06:00-10:00)', category: 'Front Desk', pricingRule: 'Room Rate %', basePrice: 50, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Day Use & Hourly Room', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 4, code: 'FO-LATEOUT', name: 'Late Checkout Surcharge (Until 18:00)', category: 'Front Desk', pricingRule: 'Room Rate %', basePrice: 50, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Day Use & Hourly Room', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 5, code: 'LND-EXPRESS', name: 'Express Laundry Service (4h Turnaround)', category: 'Housekeeping', pricingRule: 'Flat Amount', basePrice: 800, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4201 - Guest Valet Laundry', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 6, code: 'FNB-BBUFFET', name: 'Executive International Breakfast Buffet', category: 'Food & Beverage', pricingRule: 'Per Person', basePrice: 1500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4101 - Dining Restaurant', autoPostTrigger: 'On Check-In', active: true },
    { id: 7, code: 'SPA-SWEDISH', name: 'Swedish Aromatherapy Spa Massage (60m)', category: 'Spa & Wellness', pricingRule: 'Flat Amount', basePrice: 4500, taxApplicable: true, serviceChargeApplicable: true, revenueLedgerCode: 'GL-4401 - Luxury Spa & Wellness', autoPostTrigger: 'On Demand / Manual', active: true },
    { id: 8, code: 'IT-FIBER', name: 'High-Speed Dedicated 100Mbps Internet', category: 'IT & Telecom', pricingRule: 'Per Night', basePrice: 600, taxApplicable: true, serviceChargeApplicable: false, revenueLedgerCode: 'GL-4060 - Guest Telecom & IT', autoPostTrigger: 'On Demand / Manual', active: true }
];

const INITIAL_DISCOUNTS: DiscountPolicy[] = [
    { id: 1, code: 'CORP-UN', name: 'UN Agency & Diplomatic Negotiated Rate', category: 'Corporate Negotiated', type: 'Percentage (%)', value: 20, maxCapBDT: 15000, minSpendBDT: 5000, applicableOn: ['Rooms', 'F&B'], requiresManagerPin: false, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 2, code: 'PROMO-SUMMER', name: 'Summer Weekend Getaway Promo Voucher', category: 'Promotional Campaign', type: 'Flat Amount (BDT)', value: 2000, maxCapBDT: 2000, minSpendBDT: 8000, applicableOn: ['Rooms'], requiresManagerPin: false, reasonRequired: false, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 3, code: 'GM-COURTESY', name: 'General Manager Goodwill Courtesy Rebate', category: 'VIP / GM Discretionary', type: 'Percentage (%)', value: 25, maxCapBDT: 25000, minSpendBDT: 1000, applicableOn: ['All Folio'], requiresManagerPin: true, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 4, code: 'LONGSTAY-14', name: 'Extended Stay Concession (14+ Nights)', category: 'Long Stay Allowance', type: 'Percentage (%)', value: 15, maxCapBDT: 30000, minSpendBDT: 40000, applicableOn: ['Rooms'], requiresManagerPin: true, reasonRequired: true, contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances', active: true },
    { id: 5, code: 'STAFF-MEAL', name: 'Staff Duty & Family Dining Allowance', category: 'Staff Privilege', type: 'Percentage (%)', value: 50, maxCapBDT: 3000, minSpendBDT: 500, applicableOn: ['F&B'], requiresManagerPin: false, reasonRequired: false, contraRevenueGlCode: 'GL-4991 - F&B Allowances & Rebates', active: true }
];

const INITIAL_BANKS: BankAccount[] = [
    { id: 1, bankName: 'City Bank PLC', accountTitle: 'The Grand Palace Hotel & Suites Ltd - Operations', accountNumber: '1102938472001', branchName: 'Gulshan Corporate Branch, Dhaka', routingNumber: '060271829', swiftCode: 'CIBLBDDH', isDefaultSettlement: true, linkedGlCode: 'GL-1020 - Cash at Bank (City Bank)', status: 'Active' },
    { id: 2, bankName: 'BRAC Bank PLC', accountTitle: 'The Grand Palace Hotel & Suites Ltd - Escrow & Collections', accountNumber: '1501204839201', branchName: 'Banani Branch, Dhaka', routingNumber: '060261948', swiftCode: 'BRAKBDDH', isDefaultSettlement: false, linkedGlCode: 'GL-1021 - Cash at Bank (BRAC Bank)', status: 'Active' },
    { id: 3, bankName: 'Standard Chartered Bangladesh', accountTitle: 'The Grand Palace Hotel & Suites Ltd - Foreign Currency Clearing', accountNumber: '0102938481902', branchName: 'Uttara North Tower Branch', routingNumber: '060281934', swiftCode: 'SCBLBDDX', isDefaultSettlement: false, linkedGlCode: 'GL-1022 - Cash at Bank (SCB USD/EUR)', status: 'Active' },
    { id: 4, bankName: 'Eastern Bank PLC (EBL)', accountTitle: 'The Grand Palace Hotel & Suites Ltd - Merchant POS Settlement', accountNumber: '1041060293847', branchName: 'Principal Branch, Motijheel', routingNumber: '060251928', swiftCode: 'EBLBDDH', isDefaultSettlement: false, linkedGlCode: 'GL-1023 - Cash at Bank (EBL POS)', status: 'Active' },
    { id: 5, bankName: 'Islami Bank Bangladesh PLC', accountTitle: 'The Grand Palace Hotel & Suites Ltd - Corporate Accounts', accountNumber: '2050183920192', branchName: 'Dhanmondi Branch, Dhaka', routingNumber: '060241920', swiftCode: 'IBBLBDDH', isDefaultSettlement: false, linkedGlCode: 'GL-1024 - Cash at Bank (IBBL)', status: 'Active' }
];

const INITIAL_MFS_WALLETS: MfsWallet[] = [
    { id: 1, provider: 'bKash Merchant', merchantNumber: '01711-928374', counterId: 'COUNTER-01 (Front Desk Primary)', commissionRatePercent: 1.2, linkedBankName: 'City Bank PLC', linkedGlCode: 'GL-1030 - MFS Clearing (bKash)', dailyLimitBDT: 500000, status: 'Active' },
    { id: 2, provider: 'Nagad Sheba', merchantNumber: '01819-837261', counterId: 'COUNTER-01 (Front Desk Primary)', commissionRatePercent: 1.0, linkedBankName: 'BRAC Bank PLC', linkedGlCode: 'GL-1031 - MFS Clearing (Nagad)', dailyLimitBDT: 500000, status: 'Active' },
    { id: 3, provider: 'Rocket DBBL', merchantNumber: '01912-3847291', counterId: 'COUNTER-02 (F&B Restaurant / Banquets)', commissionRatePercent: 1.2, linkedBankName: 'City Bank PLC', linkedGlCode: 'GL-1032 - MFS Clearing (Rocket)', dailyLimitBDT: 300000, status: 'Active' },
    { id: 4, provider: 'Upay UCB', merchantNumber: '01611-293847', counterId: 'COUNTER-01 (Front Desk Primary)', commissionRatePercent: 0.9, linkedBankName: 'Eastern Bank PLC (EBL)', linkedGlCode: 'GL-1033 - MFS Clearing (Upay)', dailyLimitBDT: 200000, status: 'Active' }
];

const INITIAL_MARKET_CODES: MarketCode[] = [
    { id: 1, code: 'CORP', description: 'Corporate Multinational Accounts', reportGroup: 'Commercial Transient' },
    { id: 2, code: 'OTA', description: 'Online Travel Agencies (Expedia, Booking.com)', reportGroup: 'Wholesale / OTA' },
    { id: 3, code: 'GRP', description: 'MICE & Group Conventions', reportGroup: 'Group / Banquet' },
    { id: 4, code: 'DIR', description: 'Direct Hotel Walk-in & Web Booking', reportGroup: 'Retail Direct' }
];

const INITIAL_BUSINESS_SOURCES: BusinessSource[] = [
    { id: 1, name: 'Booking.com Direct XML', type: 'OTA', commission: '15%', active: true, linkedRatePlan: 'OTA Standard' },
    { id: 2, name: 'Official Hotel Web Engine', type: 'Direct Web', commission: '0%', active: true, linkedRatePlan: 'Best Available Rate (BAR)' },
    { id: 3, name: 'Standard Chartered Corporate', type: 'Corporate', commission: '0%', active: true, linkedRatePlan: 'Negotiated Corp-A' },
    { id: 4, name: 'Agoda YCS v4', type: 'OTA', commission: '18%', active: true, linkedRatePlan: 'OTA Standard' }
];

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface MasterDataConfigProps {
    initialTab?: MasterDataTabType;
    onNavigate?: (page: string) => void;
}

export const MasterDataConfig: React.FC<MasterDataConfigProps> = ({
    initialTab = 'currency',
}) => {
    const [activeTab, setActiveTab] = useState<MasterDataTabType>(initialTab);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    // Local Storage Hydration & State
    const [currencies, setCurrencies] = useState<Currency[]>(() => {
        const saved = localStorage.getItem('master_currencies_v2');
        return saved ? JSON.parse(saved) : INITIAL_CURRENCIES;
    });

    const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>(() => {
        const saved = localStorage.getItem('master_rates_v2');
        return saved ? JSON.parse(saved) : INITIAL_RATES;
    });

    const [revenueGroups, setRevenueGroups] = useState<RevenueGroup[]>(() => {
        const saved = localStorage.getItem('master_rev_groups_v2');
        return saved ? JSON.parse(saved) : INITIAL_REVENUE_GROUPS;
    });

    const [revenueHeads, setRevenueHeads] = useState<RevenueHead[]>(() => {
        const saved = localStorage.getItem('master_rev_heads_v2');
        return saved ? JSON.parse(saved) : INITIAL_REVENUE_HEADS;
    });

    const [extraCharges, setExtraCharges] = useState<ExtraCharge[]>(() => {
        const saved = localStorage.getItem('master_charges_v2');
        return saved ? JSON.parse(saved) : INITIAL_EXTRA_CHARGES;
    });

    const [discounts, setDiscounts] = useState<DiscountPolicy[]>(() => {
        const saved = localStorage.getItem('master_discounts_v2');
        return saved ? JSON.parse(saved) : INITIAL_DISCOUNTS;
    });

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
        const saved = localStorage.getItem('master_banks_v2');
        return saved ? JSON.parse(saved) : INITIAL_BANKS;
    });

    const [mfsWallets, setMfsWallets] = useState<MfsWallet[]>(() => {
        const saved = localStorage.getItem('master_mfs_v2');
        return saved ? JSON.parse(saved) : INITIAL_MFS_WALLETS;
    });

    const [departments, setDepartments] = useState<Department[]>(() => {
        const saved = localStorage.getItem('master_departments_v2');
        return saved ? JSON.parse(saved) : [];
    });

    const [workShifts, setWorkShifts] = useState<WorkShift[]>(() => {
        const saved = localStorage.getItem('master_shifts_v2');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        const base = getApiBaseUrl();
        fetch(`${base}/api/hrm/departments`)
            .then(r => r.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setDepartments(json.data.map((d: any) => ({
                        id: Number(d.id),
                        code: d.code || 'DEPT',
                        name: d.name,
                        hodName: d.hod_name || 'Department Head',
                        costCenterCode: d.cost_center_code || `CC-${d.code}`,
                        type: d.department_type === 'SUPPORT' ? 'Support & Administration' : 'Operational (Revenue Generating)',
                        staffCount: Number(d.active_employees) || 0,
                        monthlyBudgetBDT: Number(d.monthly_budget) || 500000,
                        status: d.status === 'INACTIVE' ? 'Inactive' : 'Active'
                    })));
                }
            })
            .catch(() => {});

        fetch(`${base}/api/hrm/shifts`)
            .then(r => r.json())
            .then(json => {
                if (json.success && Array.isArray(json.data)) {
                    setWorkShifts(json.data.map((s: any) => ({
                        id: Number(s.id),
                        code: 'SHT-' + String(s.name || 'SHT').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3),
                        name: s.name,
                        startTime: s.start_time || '08:00',
                        endTime: s.end_time || '16:00',
                        gracePeriodMinutes: Number(s.grace_period_minutes) || 15,
                        mandatoryCashHandover: true,
                        canTriggerNightAudit: String(s.name || '').toLowerCase().includes('night'),
                        assignedStaffCount: Number(s.assigned_today) || 0,
                        color: String(s.name || '').toLowerCase().includes('night')
                            ? 'border-purple-400 bg-purple-50 text-purple-800'
                            : String(s.name || '').toLowerCase().includes('evening')
                                ? 'border-blue-400 bg-blue-50 text-blue-800'
                                : 'border-amber-400 bg-amber-50 text-amber-800',
                        status: 'Active'
                    })));
                }
            })
            .catch(() => {});
    }, []);

    const [marketCodes] = useState<MarketCode[]>(INITIAL_MARKET_CODES);
    const [businessSources] = useState<BusinessSource[]>(INITIAL_BUSINESS_SOURCES);

    // Save changes to localStorage
    useEffect(() => {
        localStorage.setItem('master_currencies_v2', JSON.stringify(currencies));
        localStorage.setItem('master_rates_v2', JSON.stringify(exchangeRates));
        localStorage.setItem('master_rev_groups_v2', JSON.stringify(revenueGroups));
        localStorage.setItem('master_rev_heads_v2', JSON.stringify(revenueHeads));
        localStorage.setItem('master_charges_v2', JSON.stringify(extraCharges));
        localStorage.setItem('master_discounts_v2', JSON.stringify(discounts));
        localStorage.setItem('master_banks_v2', JSON.stringify(bankAccounts));
        localStorage.setItem('master_mfs_v2', JSON.stringify(mfsWallets));
        localStorage.setItem('master_departments_v2', JSON.stringify(departments));
        localStorage.setItem('master_shifts_v2', JSON.stringify(workShifts));
    }, [currencies, exchangeRates, revenueGroups, revenueHeads, extraCharges, discounts, bankAccounts, mfsWallets, departments, workShifts]);

    // Active Base Currency Helper
    const baseCurrency = currencies.find(c => c.isBase) || currencies[0];

    // ========================================================================
    // MODAL & FORM STATES
    // ========================================================================
    
    // Currency Modal
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
    const [currencyFormData, setCurrencyFormData] = useState({
        name: '',
        code: '',
        symbol: '',
        isBase: false,
        acceptPayment: true,
        symbolPosition: 'prefix' as 'prefix' | 'suffix',
        decimals: 2,
        denominations: ''
    });

    // Rate Modal
    const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);

    // Revenue Group Modal
    const [isRevGroupModalOpen, setIsRevGroupModalOpen] = useState(false);
    const [editingRevGroup, setEditingRevGroup] = useState<RevenueGroup | null>(null);
    const [revGroupForm, setRevGroupForm] = useState({
        code: '',
        name: '',
        usaliCategory: 'Operating Revenue' as 'Operating Revenue' | 'Non-Operating Income',
        departmentHead: '',
        glPrefix: ''
    });

    // Revenue Head Modal
    const [isRevHeadModalOpen, setIsRevHeadModalOpen] = useState(false);
    const [editingRevHead, setEditingRevHead] = useState<RevenueHead | null>(null);
    const [revHeadForm, setRevHeadForm] = useState({
        groupId: 1,
        code: '',
        name: '',
        defaultTaxRate: 15,
        serviceChargeApplicable: true,
        glAccountCode: '',
        costCenter: '',
        accountType: 'Revenue (Credit)' as 'Revenue (Credit)' | 'Contra-Revenue (Debit)',
        active: true
    });
    const [selectedGroupFilter, setSelectedGroupFilter] = useState<number | 'ALL'>('ALL');

    // Extra Charge Modal
    const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);
    const [editingCharge, setEditingCharge] = useState<ExtraCharge | null>(null);
    const [chargeForm, setChargeForm] = useState({
        code: '',
        name: '',
        category: 'Transport' as ExtraCharge['category'],
        pricingRule: 'Flat Amount' as ExtraCharge['pricingRule'],
        basePrice: 1000,
        taxApplicable: true,
        serviceChargeApplicable: false,
        revenueLedgerCode: 'GL-4301 - Airport VIP Fleet',
        autoPostTrigger: 'On Reservation' as ExtraCharge['autoPostTrigger'],
        active: true
    });

    // Discount Modal
    const [isDiscountModalOpen, setIsDiscountModalOpen] = useState(false);
    const [editingDiscount, setEditingDiscount] = useState<DiscountPolicy | null>(null);
    const [discountForm, setDiscountForm] = useState({
        code: '',
        name: '',
        category: 'Corporate Negotiated' as DiscountPolicy['category'],
        type: 'Percentage (%)' as DiscountPolicy['type'],
        value: 10,
        maxCapBDT: 5000,
        minSpendBDT: 2000,
        applicableOn: ['Rooms'] as ('Rooms' | 'F&B' | 'Spa' | 'All Folio')[],
        requiresManagerPin: false,
        reasonRequired: true,
        contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances',
        active: true
    });

    // Bank Account Modal
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
    const [bankForm, setBankForm] = useState({
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        branchName: '',
        routingNumber: '',
        swiftCode: '',
        isDefaultSettlement: false,
        linkedGlCode: 'GL-1020',
        status: 'Active' as BankAccount['status']
    });

    // MFS Wallet Modal
    const [isMfsModalOpen, setIsMfsModalOpen] = useState(false);
    const [editingMfs, setEditingMfs] = useState<MfsWallet | null>(null);
    const [mfsForm, setMfsForm] = useState({
        provider: 'bKash Merchant' as MfsWallet['provider'],
        merchantNumber: '',
        counterId: 'COUNTER-01 (Front Desk Primary)',
        commissionRatePercent: 1.2,
        linkedBankName: 'City Bank PLC',
        linkedGlCode: 'GL-1030',
        dailyLimitBDT: 500000,
        status: 'Active' as MfsWallet['status']
    });

    // Department Modal
    const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [deptForm, setDeptForm] = useState({
        code: '',
        name: '',
        hodName: '',
        costCenterCode: '',
        type: 'Operational (Revenue Generating)' as Department['type'],
        staffCount: 10,
        monthlyBudgetBDT: 500000,
        status: 'Active' as Department['status']
    });

    // Work Shift Modal
    const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
    const [editingShift, setEditingShift] = useState<WorkShift | null>(null);
    const [shiftForm, setShiftForm] = useState({
        code: '',
        name: '',
        startTime: '07:00',
        endTime: '15:30',
        gracePeriodMinutes: 15,
        mandatoryCashHandover: true,
        canTriggerNightAudit: false,
        assignedStaffCount: 20,
        color: 'border-blue-400 bg-blue-50 text-blue-800',
        status: 'Active' as WorkShift['status']
    });

    // ========================================================================
    // ACTION HANDLERS
    // ========================================================================

    // 1. Currency Actions (Set Default Base Currency, Add, Edit, Delete)
    const handleSetDefaultCurrency = (targetCode: string) => {
        setCurrencies(prev =>
            prev.map(c => ({
                ...c,
                isBase: c.code === targetCode
            }))
        );
        const selected = currencies.find(c => c.code === targetCode);
        showToast(`${selected ? selected.name : targetCode} is now the Hotel Default Base Currency.`);
    };

    const handleOpenAddCurrency = () => {
        setEditingCurrency(null);
        setCurrencyFormData({
            name: '',
            code: '',
            symbol: '',
            isBase: false,
            acceptPayment: true,
            symbolPosition: 'prefix',
            decimals: 2,
            denominations: '100, 50, 20, 10'
        });
        setIsCurrencyModalOpen(true);
    };

    const handleOpenEditCurrency = (curr: Currency) => {
        setEditingCurrency(curr);
        setCurrencyFormData({
            name: curr.name,
            code: curr.code,
            symbol: curr.symbol,
            isBase: curr.isBase,
            acceptPayment: curr.acceptPayment,
            symbolPosition: curr.symbolPosition,
            decimals: curr.decimals,
            denominations: curr.denominations
        });
        setIsCurrencyModalOpen(true);
    };

    const handleSaveCurrency = (e: React.FormEvent) => {
        e.preventDefault();
        if (!currencyFormData.name || !currencyFormData.code) return;

        if (editingCurrency) {
            setCurrencies(prev =>
                prev.map(c => c.id === editingCurrency.id ? { ...c, ...currencyFormData } : c)
            );
            showToast(`Currency ${currencyFormData.code} updated.`);
        } else {
            const newCurr: Currency = {
                id: Date.now(),
                ...currencyFormData
            };
            setCurrencies(prev => [...prev, newCurr]);
            showToast(`Currency ${newCurr.code} registered successfully.`);
        }
        setIsCurrencyModalOpen(false);
    };

    const handleDeleteCurrency = (id: number) => {
        const curr = currencies.find(c => c.id === id);
        if (curr?.isBase) {
            showToast('Cannot delete the Base Operational Currency.');
            return;
        }
        setCurrencies(prev => prev.filter(c => c.id !== id));
        showToast('Currency removed from settlement board.');
    };

    // 2. Extra Charges Actions (Full Add, Edit, Delete)
    const handleOpenAddCharge = () => {
        setEditingCharge(null);
        setChargeForm({
            code: '',
            name: '',
            category: 'Transport',
            pricingRule: 'Flat Amount',
            basePrice: 1500,
            taxApplicable: true,
            serviceChargeApplicable: false,
            revenueLedgerCode: 'GL-4301 - Airport VIP Fleet',
            autoPostTrigger: 'On Demand / Manual',
            active: true
        });
        setIsChargeModalOpen(true);
    };

    const handleOpenEditCharge = (charge: ExtraCharge) => {
        setEditingCharge(charge);
        setChargeForm({
            code: charge.code,
            name: charge.name,
            category: charge.category,
            pricingRule: charge.pricingRule,
            basePrice: charge.basePrice,
            taxApplicable: charge.taxApplicable,
            serviceChargeApplicable: charge.serviceChargeApplicable,
            revenueLedgerCode: charge.revenueLedgerCode,
            autoPostTrigger: charge.autoPostTrigger,
            active: charge.active
        });
        setIsChargeModalOpen(true);
    };

    const handleSaveCharge = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chargeForm.code || !chargeForm.name) return;

        if (editingCharge) {
            setExtraCharges(prev =>
                prev.map(c => c.id === editingCharge.id ? { ...c, ...chargeForm } : c)
            );
            showToast(`Extra Charge ${chargeForm.name} updated.`);
        } else {
            const newCharge: ExtraCharge = {
                id: Date.now(),
                ...chargeForm
            };
            setExtraCharges(prev => [...prev, newCharge]);
            showToast(`Extra Charge ${newCharge.name} registered with GL mapping.`);
        }
        setIsChargeModalOpen(false);
    };

    const handleDeleteCharge = (id: number) => {
        setExtraCharges(prev => prev.filter(c => c.id !== id));
        showToast('Extra Charge deleted.');
    };

    // 3. Discount Management Actions (Full Add, Edit, Delete)
    const handleOpenAddDiscount = () => {
        setEditingDiscount(null);
        setDiscountForm({
            code: '',
            name: '',
            category: 'Corporate Negotiated',
            type: 'Percentage (%)',
            value: 15,
            maxCapBDT: 5000,
            minSpendBDT: 3000,
            applicableOn: ['Rooms'],
            requiresManagerPin: false,
            reasonRequired: true,
            contraRevenueGlCode: 'GL-4990 - Room Revenue Allowances',
            active: true
        });
        setIsDiscountModalOpen(true);
    };

    const handleOpenEditDiscount = (d: DiscountPolicy) => {
        setEditingDiscount(d);
        setDiscountForm({
            code: d.code,
            name: d.name,
            category: d.category,
            type: d.type,
            value: d.value,
            maxCapBDT: d.maxCapBDT,
            minSpendBDT: d.minSpendBDT,
            applicableOn: d.applicableOn,
            requiresManagerPin: d.requiresManagerPin,
            reasonRequired: d.reasonRequired,
            contraRevenueGlCode: d.contraRevenueGlCode,
            active: d.active
        });
        setIsDiscountModalOpen(true);
    };

    const handleSaveDiscount = (e: React.FormEvent) => {
        e.preventDefault();
        if (!discountForm.code || !discountForm.name) return;

        if (editingDiscount) {
            setDiscounts(prev =>
                prev.map(d => d.id === editingDiscount.id ? { ...d, ...discountForm } : d)
            );
            showToast(`Discount policy ${discountForm.name} updated.`);
        } else {
            const newDisc: DiscountPolicy = {
                id: Date.now(),
                ...discountForm
            };
            setDiscounts(prev => [...prev, newDisc]);
            showToast(`Discount policy ${newDisc.name} added to USALI Contra-Ledger.`);
        }
        setIsDiscountModalOpen(false);
    };

    const handleDeleteDiscount = (id: number) => {
        setDiscounts(prev => prev.filter(d => d.id !== id));
        showToast('Discount policy deleted.');
    };

    // 4. Bank Accounts Actions
    const handleOpenAddBank = () => {
        setEditingBank(null);
        setBankForm({
            bankName: '',
            accountTitle: 'The Grand Palace Hotel & Suites Ltd',
            accountNumber: '',
            branchName: '',
            routingNumber: '',
            swiftCode: '',
            isDefaultSettlement: false,
            linkedGlCode: 'GL-1020',
            status: 'Active'
        });
        setIsBankModalOpen(true);
    };

    const handleOpenEditBank = (bank: BankAccount) => {
        setEditingBank(bank);
        setBankForm({
            bankName: bank.bankName,
            accountTitle: bank.accountTitle,
            accountNumber: bank.accountNumber,
            branchName: bank.branchName,
            routingNumber: bank.routingNumber,
            swiftCode: bank.swiftCode,
            isDefaultSettlement: bank.isDefaultSettlement,
            linkedGlCode: bank.linkedGlCode,
            status: bank.status
        });
        setIsBankModalOpen(true);
    };

    const handleSaveBank = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankForm.bankName || !bankForm.accountNumber) return;

        if (bankForm.isDefaultSettlement) {
            // Unset others
            setBankAccounts(prev => prev.map(b => ({ ...b, isDefaultSettlement: false })));
        }

        if (editingBank) {
            setBankAccounts(prev =>
                prev.map(b => b.id === editingBank.id ? { ...b, ...bankForm } : b)
            );
            showToast(`Bank account ${bankForm.bankName} updated.`);
        } else {
            const newBank: BankAccount = {
                id: Date.now(),
                ...bankForm
            };
            setBankAccounts(prev => [...prev, newBank]);
            showToast(`Bank account ${newBank.bankName} registered.`);
        }
        setIsBankModalOpen(false);
    };

    const handleSetDefaultBank = (id: number) => {
        setBankAccounts(prev =>
            prev.map(b => ({
                ...b,
                isDefaultSettlement: b.id === id
            }))
        );
        const b = bankAccounts.find(x => x.id === id);
        showToast(`${b?.bankName} set as Default Folio Settlement Bank.`);
    };

    const handleDeleteBank = (id: number) => {
        setBankAccounts(prev => prev.filter(b => b.id !== id));
        showToast('Bank account removed.');
    };

    // 5. MFS Wallets Actions
    const handleOpenAddMfs = () => {
        setEditingMfs(null);
        setMfsForm({
            provider: 'bKash Merchant',
            merchantNumber: '',
            counterId: 'COUNTER-01 (Front Desk Primary)',
            commissionRatePercent: 1.2,
            linkedBankName: 'City Bank PLC',
            linkedGlCode: 'GL-1030',
            dailyLimitBDT: 500000,
            status: 'Active'
        });
        setIsMfsModalOpen(true);
    };

    const handleOpenEditMfs = (mfs: MfsWallet) => {
        setEditingMfs(mfs);
        setMfsForm({
            provider: mfs.provider,
            merchantNumber: mfs.merchantNumber,
            counterId: mfs.counterId,
            commissionRatePercent: mfs.commissionRatePercent,
            linkedBankName: mfs.linkedBankName,
            linkedGlCode: mfs.linkedGlCode,
            dailyLimitBDT: mfs.dailyLimitBDT,
            status: mfs.status
        });
        setIsMfsModalOpen(true);
    };

    const handleSaveMfs = (e: React.FormEvent) => {
        e.preventDefault();
        if (!mfsForm.merchantNumber) return;

        if (editingMfs) {
            setMfsWallets(prev =>
                prev.map(m => m.id === editingMfs.id ? { ...m, ...mfsForm } : m)
            );
            showToast(`${mfsForm.provider} configuration updated.`);
        } else {
            const newMfs: MfsWallet = {
                id: Date.now(),
                ...mfsForm
            };
            setMfsWallets(prev => [...prev, newMfs]);
            showToast(`${newMfs.provider} wallet registered.`);
        }
        setIsMfsModalOpen(false);
    };

    const handleDeleteMfs = (id: number) => {
        setMfsWallets(prev => prev.filter(m => m.id !== id));
        showToast('MFS gateway removed.');
    };

    // 6. USALI Revenue Groups & Heads Actions
    const handleOpenAddRevGroup = () => {
        setEditingRevGroup(null);
        setRevGroupForm({
            code: '',
            name: '',
            usaliCategory: 'Operating Revenue',
            departmentHead: '',
            glPrefix: '4000s'
        });
        setIsRevGroupModalOpen(true);
    };

    const handleSaveRevGroup = (e: React.FormEvent) => {
        e.preventDefault();
        if (!revGroupForm.code || !revGroupForm.name) return;

        if (editingRevGroup) {
            setRevenueGroups(prev =>
                prev.map(g => g.id === editingRevGroup.id ? { ...g, ...revGroupForm } : g)
            );
            showToast(`Revenue group ${revGroupForm.name} updated.`);
        } else {
            const newGroup: RevenueGroup = {
                id: Date.now(),
                ...revGroupForm
            };
            setRevenueGroups(prev => [...prev, newGroup]);
            showToast(`Revenue group ${newGroup.name} registered.`);
        }
        setIsRevGroupModalOpen(false);
    };

    const handleDeleteRevGroup = (id: number) => {
        const hasHeads = revenueHeads.some(h => h.groupId === id);
        if (hasHeads) {
            showToast('Cannot delete group with active linked Revenue Heads. Reassign or delete heads first.');
            return;
        }
        setRevenueGroups(prev => prev.filter(g => g.id !== id));
        showToast('Revenue group removed.');
    };

    const handleOpenAddRevHead = () => {
        setEditingRevHead(null);
        setRevHeadForm({
            groupId: revenueGroups[0]?.id || 1,
            code: '',
            name: '',
            defaultTaxRate: 15,
            serviceChargeApplicable: true,
            glAccountCode: 'GL-4001',
            costCenter: 'CC-101 Front Office',
            accountType: 'Revenue (Credit)',
            active: true
        });
        setIsRevHeadModalOpen(true);
    };

    const handleOpenEditRevHead = (head: RevenueHead) => {
        setEditingRevHead(head);
        setRevHeadForm({
            groupId: head.groupId,
            code: head.code,
            name: head.name,
            defaultTaxRate: head.defaultTaxRate,
            serviceChargeApplicable: head.serviceChargeApplicable,
            glAccountCode: head.glAccountCode,
            costCenter: head.costCenter,
            accountType: head.accountType,
            active: head.active
        });
        setIsRevHeadModalOpen(true);
    };

    const handleSaveRevHead = (e: React.FormEvent) => {
        e.preventDefault();
        if (!revHeadForm.code || !revHeadForm.name) return;

        if (editingRevHead) {
            setRevenueHeads(prev =>
                prev.map(h => h.id === editingRevHead.id ? { ...h, ...revHeadForm } : h)
            );
            showToast(`Revenue head ${revHeadForm.name} updated.`);
        } else {
            const newHead: RevenueHead = {
                id: Date.now(),
                ...revHeadForm
            };
            setRevenueHeads(prev => [...prev, newHead]);
            showToast(`Revenue head ${newHead.name} mapped to ${newHead.glAccountCode}.`);
        }
        setIsRevHeadModalOpen(false);
    };

    const handleDeleteRevHead = (id: number) => {
        setRevenueHeads(prev => prev.filter(h => h.id !== id));
        showToast('Revenue head deleted.');
    };

    // Filtered Revenue Heads
    const filteredRevenueHeads = selectedGroupFilter === 'ALL'
        ? revenueHeads
        : revenueHeads.filter(h => h.groupId === selectedGroupFilter);

    // 7. Departments Actions
    const handleOpenAddDept = () => {
        setEditingDept(null);
        setDeptForm({
            code: '',
            name: '',
            hodName: '',
            costCenterCode: 'CC-101',
            type: 'Operational (Revenue Generating)',
            staffCount: 10,
            monthlyBudgetBDT: 500000,
            status: 'Active'
        });
        setIsDeptModalOpen(true);
    };

    const handleOpenEditDept = (dept: Department) => {
        setEditingDept(dept);
        setDeptForm({
            code: dept.code,
            name: dept.name,
            hodName: dept.hodName,
            costCenterCode: dept.costCenterCode,
            type: dept.type,
            staffCount: dept.staffCount,
            monthlyBudgetBDT: dept.monthlyBudgetBDT,
            status: dept.status
        });
        setIsDeptModalOpen(true);
    };

    const handleSaveDept = (e: React.FormEvent) => {
        e.preventDefault();
        if (!deptForm.code || !deptForm.name) return;

        if (editingDept) {
            setDepartments(prev =>
                prev.map(d => d.id === editingDept.id ? { ...d, ...deptForm } : d)
            );
            showToast(`Department ${deptForm.name} updated.`);
        } else {
            const newDept: Department = {
                id: Date.now(),
                ...deptForm
            };
            setDepartments(prev => [...prev, newDept]);
            showToast(`Department ${newDept.name} created.`);
        }
        setIsDeptModalOpen(false);
    };

    const handleDeleteDept = (id: number) => {
        setDepartments(prev => prev.filter(d => d.id !== id));
        showToast('Department removed.');
    };

    // 8. Work Shift Actions
    const handleOpenAddShift = () => {
        setEditingShift(null);
        setShiftForm({
            code: '',
            name: '',
            startTime: '07:00',
            endTime: '15:30',
            gracePeriodMinutes: 15,
            mandatoryCashHandover: true,
            canTriggerNightAudit: false,
            assignedStaffCount: 15,
            color: 'border-blue-400 bg-blue-50 text-blue-800',
            status: 'Active'
        });
        setIsShiftModalOpen(true);
    };

    const handleOpenEditShift = (shift: WorkShift) => {
        setEditingShift(shift);
        setShiftForm({
            code: shift.code,
            name: shift.name,
            startTime: shift.startTime,
            endTime: shift.endTime,
            gracePeriodMinutes: shift.gracePeriodMinutes,
            mandatoryCashHandover: shift.mandatoryCashHandover,
            canTriggerNightAudit: shift.canTriggerNightAudit,
            assignedStaffCount: shift.assignedStaffCount,
            color: shift.color,
            status: shift.status
        });
        setIsShiftModalOpen(true);
    };

    const handleSaveShift = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shiftForm.code || !shiftForm.name) return;

        if (editingShift) {
            setWorkShifts(prev =>
                prev.map(s => s.id === editingShift.id ? { ...s, ...shiftForm } : s)
            );
            showToast(`Work Shift ${shiftForm.name} updated.`);
        } else {
            const newShift: WorkShift = {
                id: Date.now(),
                ...shiftForm
            };
            setWorkShifts(prev => [...prev, newShift]);
            showToast(`Work Shift ${newShift.name} created.`);
        }
        setIsShiftModalOpen(false);
    };

    const handleDeleteShift = (id: number) => {
        setWorkShifts(prev => prev.filter(s => s.id !== id));
        showToast('Work shift removed.');
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
                            <Coins size={14} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                    Master Data & Financial Configuration
                                </h1>
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[8.5px] bg-blue-50 text-blue-700 border border-blue-200 flex-shrink-0 leading-none">
                                    Base: {baseCurrency.name} ({baseCurrency.symbol} {baseCurrency.code})
                                </span>
                                <span className="badge-status-active">
                                    USALI 11th Edition
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-gray-500 mt-0.5 leading-tight">
                                <span className="flex items-center gap-1">
                                    <TrendingUp size={11} className="text-slate-400" />
                                    <span>{revenueHeads.length} USALI Heads</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Receipt size={11} className="text-slate-400" />
                                    <span>{extraCharges.length} Extra Add-ons</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Landmark size={11} className="text-slate-400" />
                                    <span>{bankAccounts.length} Banks & {mfsWallets.length} MFS</span>
                                </span>
                                <span className="hidden sm:flex items-center gap-1">
                                    <Building2 size={11} className="text-slate-400" />
                                    <span>{departments.length} Depts / {workShifts.length} Shifts</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {activeTab === 'currency' && (
                            <button
                                type="button"
                                onClick={handleOpenAddCurrency}
                                className="btn-primary"
                            >
                                <Plus size={14} />
                                <span>Add Currency</span>
                            </button>
                        )}
                        {activeTab === 'revenue' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenAddRevGroup}
                                    className="btn-secondary"
                                >
                                    <Plus size={13} className="text-primary" />
                                    <span>Add Rev Group</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddRevHead}
                                    className="btn-primary"
                                >
                                    <Plus size={14} />
                                    <span>Add Rev Head (GL)</span>
                                </button>
                            </div>
                        )}
                        {activeTab === 'charges' && (
                            <button
                                type="button"
                                onClick={handleOpenAddCharge}
                                className="btn-primary"
                            >
                                <Plus size={14} />
                                <span>Add Extra Charge</span>
                            </button>
                        )}
                        {activeTab === 'discounts' && (
                            <button
                                type="button"
                                onClick={handleOpenAddDiscount}
                                className="btn-primary"
                            >
                                <Plus size={14} />
                                <span>Add Discount Policy</span>
                            </button>
                        )}
                        {activeTab === 'banking' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenAddBank}
                                    className="btn-secondary"
                                >
                                    <Plus size={13} className="text-primary" />
                                    <span>Add Bank Account</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddMfs}
                                    className="btn-primary"
                                >
                                    <Plus size={14} />
                                    <span>Add MFS Wallet</span>
                                </button>
                            </div>
                        )}
                        {activeTab === 'departments' && (
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleOpenAddDept}
                                    className="btn-secondary"
                                >
                                    <Plus size={13} className="text-primary" />
                                    <span>Add Department</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleOpenAddShift}
                                    className="btn-primary"
                                >
                                    <Plus size={14} />
                                    <span>Add Work Shift</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Segmented Navigation Tabs */}
                <div className="px-3 sm:px-4 py-2 bg-slate-50/70 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { id: 'currency', label: 'Currencies & Base Switcher', icon: Coins, count: currencies.length },
                            { id: 'revenue', label: 'USALI Revenue Groups & Heads', icon: TrendingUp, count: revenueHeads.length },
                            { id: 'charges', label: 'Extra Charges & Add-ons', icon: Receipt, count: extraCharges.length },
                            { id: 'discounts', label: 'Discounts & Rebates (GL-4990)', icon: Percent, count: discounts.length },
                            { id: 'banking', label: 'Banks & MFS Wallets', icon: Landmark, count: bankAccounts.length + mfsWallets.length },
                            { id: 'departments', label: 'Departments & Work Shifts', icon: Building2, count: departments.length + workShifts.length },
                            { id: 'source', label: 'Market Codes & Sources', icon: Target, count: businessSources.length },
                        ].map(t => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setActiveTab(t.id as MasterDataTabType)}
                                className={`h-8 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${activeTab === t.id
                                    ? 'bg-white text-primary shadow-2xs border border-slate-200 font-bold'
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                                    }`}
                            >
                                <t.icon size={13} />
                                <span>{t.label}</span>
                                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-50 text-primary border border-blue-100">
                                    {t.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* ================================================================ */}
            {/* TAB 1: CURRENCY & BASE CURRENCY SELECTOR                         */}
            {/* ================================================================ */}
            {activeTab === 'currency' && (
                <div className="space-y-3">
                    {/* Currency Architecture Callout */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Base Currency Default Engine:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                The <strong>Primary Base Currency</strong> controls how the night audit balances books, how General Ledger reports calculate room revenue, and what symbol appears on printed invoices. You can switch the Default Base Currency at any time with 1 click.
                            </p>
                        </div>
                    </div>

                    {/* Currencies Master Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider">
                                    Hotel Settlement Currencies & Base Configuration
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Active Base: <strong>{baseCurrency.name} ({baseCurrency.code})</strong> • Symbol: <strong>{baseCurrency.symbol}</strong>
                                </p>
                            </div>
                            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Real-Time FX Conversion Enabled
                            </span>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Currency Name</th>
                                        <th className="px-3 py-2">ISO Code</th>
                                        <th className="px-3 py-2">Symbol</th>
                                        <th className="px-3 py-2">Decimals</th>
                                        <th className="px-3 py-2">Ledger Base Role</th>
                                        <th className="px-3 py-2">Desk Settlement</th>
                                        <th className="px-3 py-2 text-right">Actions / Set Default</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {currencies.map(c => (
                                        <tr key={c.id} className="hover:bg-blue-50/20">
                                            <td className="px-3 py-2 font-semibold text-gray-900">{c.name}</td>
                                            <td className="px-3 py-2 font-mono text-gray-900">{c.code}</td>
                                            <td className="px-3 py-2 text-blue-600 text-sm">{c.symbol}</td>
                                            <td className="px-3 py-2 font-mono text-gray-600">{c.decimals} digits</td>
                                            <td className="px-3 py-2">
                                                {c.isBase ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <Check size={12} className="text-emerald-600" />
                                                        Primary Base Currency (Default)
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-500 text-[11px]">Secondary FX Settlement</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="px-2 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 border border-blue-200">
                                                    Accepted at Desk
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    {!c.isBase ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetDefaultCurrency(c.code)}
                                                            className="h-6 px-2 text-[10px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded cursor-pointer transition-colors"
                                                            title="Make this the Default Operational Base Currency across the Hotel PMS"
                                                        >
                                                            Set as Default Base
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-emerald-600 px-1.5 py-0.5 bg-emerald-50 rounded">
                                                            Active Default
                                                        </span>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditCurrency(c)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    {!c.isBase && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteCurrency(c.id)}
                                                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Exchange Rates Live Board */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <TrendingUp size={14} className="text-emerald-600" />
                                    <span>FX Exchange Rates Board (Relative to Base {baseCurrency.code})</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Buying Rate: Guest folio conversion to {baseCurrency.code}. Selling Rate: Foreign currency checkout invoice.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => showToast('Exchange rates synced with Bangladesh Bank / Central Bank FX feed.')}
                                className="h-6 px-2 text-[11px] bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <RefreshCw size={11} /> Sync Central Bank Rates
                            </button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Currency Pair</th>
                                        <th className="px-3 py-2">Buying Rate (1 FX = {baseCurrency.code})</th>
                                        <th className="px-3 py-2">Selling Rate (1 FX = {baseCurrency.code})</th>
                                        <th className="px-3 py-2">Spread (%)</th>
                                        <th className="px-3 py-2">Effective Timestamp</th>
                                        <th className="px-3 py-2">Feed Mode</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {exchangeRates.map(r => {
                                        const buy = parseFloat(r.buyingRate);
                                        const sell = parseFloat(r.sellingRate);
                                        const spread = ((sell - buy) / buy * 100).toFixed(2);
                                        return (
                                            <tr key={r.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2">
                                                    <div className="text-gray-900 font-mono">
                                                        {r.currencyCode}/{baseCurrency.code}
                                                    </div>
                                                    <div className="text-[10px] text-gray-400">{r.currencyName}</div>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-emerald-700">{r.buyingRate}</td>
                                                <td className="px-3 py-2 font-mono text-blue-700">{r.sellingRate}</td>
                                                <td className="px-3 py-2 font-mono text-[11px] text-gray-600">{spread}%</td>
                                                <td className="px-3 py-2 text-gray-500">{r.effectiveDate}</td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-1.5 py-0.2 rounded text-[10px] ${r.autoUpdate ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                        {r.autoUpdate ? 'Auto API' : 'Manual Lock'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditingRate(r)}
                                                        className="px-2 py-0.5 text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                                                    >
                                                        Adjust Rate
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 2: USALI REVENUE GROUPS & REVENUE HEADS (GL 4000s)           */}
            {/* ================================================================ */}
            {activeTab === 'revenue' && (
                <div className="space-y-3">
                    {/* USALI Concept Explainer */}
                    <div className="bg-gradient-to-r from-emerald-50/70 via-blue-50/50 to-white p-3 rounded-xl border border-emerald-200/60 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
                                <TrendingUp size={16} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-900">USALI 2-Tier Chart of Accounts Hierarchy</span>
                                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">Global Hospitality Standard</span>
                                </div>
                                <p className="text-[11px] text-gray-600 mt-0.5">
                                    <strong>Tier 1: Revenue Groups</strong> (Rooms, F&B, Minor Operated, Misc Income). <strong>Tier 2: Revenue Heads</strong> (Sub-ledgers mapped to external GL codes with VAT % and Service Charge rules).
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleOpenAddRevHead}
                                className="h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shadow-2xs transition-colors cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>+ New Revenue Head</span>
                            </button>
                        </div>
                    </div>

                    {/* Revenue Groups (Tier 1) Overview */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Database size={13} className="text-blue-600" />
                                <span>Tier 1: USALI Operating & Non-Operating Revenue Groups</span>
                            </h3>
                            <button
                                type="button"
                                onClick={handleOpenAddRevGroup}
                                className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                            >
                                + Add Group
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 p-3">
                            {revenueGroups.map(group => {
                                const headCount = revenueHeads.filter(h => h.groupId === group.id).length;
                                return (
                                    <div
                                        key={group.id}
                                        className="p-3 rounded-xl border border-gray-200 hover:border-blue-300 bg-gray-50/40 transition-all flex flex-col justify-between space-y-2 relative group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                                {group.code}
                                            </span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingRevGroup(group);
                                                        setRevGroupForm({
                                                            code: group.code,
                                                            name: group.name,
                                                            usaliCategory: group.usaliCategory,
                                                            departmentHead: group.departmentHead,
                                                            glPrefix: group.glPrefix
                                                        });
                                                        setIsRevGroupModalOpen(true);
                                                    }}
                                                    className="p-1 text-gray-400 hover:text-blue-600"
                                                >
                                                    <Edit2 size={12} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteRevGroup(group.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600"
                                                >
                                                    <Trash2 size={12} />
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-gray-900 text-xs">{group.name}</h4>
                                            <div className="text-[10px] text-gray-500 mt-0.5">{group.departmentHead}</div>
                                        </div>
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10.5px]">
                                            <span className="font-mono text-gray-600">{group.glPrefix}</span>
                                            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                                                {headCount} Sub-Heads
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Revenue Heads (Tier 2) Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Receipt size={14} className="text-emerald-600" />
                                    <span>Tier 2: Detailed Chart of Revenue Heads (Sub-Ledgers & Folio Mappings)</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Transactions at Front Desk, Point of Sale (POS), and Banquet folios credit these exact General Ledger accounts.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-semibold text-gray-500">Filter Group:</span>
                                <select
                                    value={selectedGroupFilter}
                                    onChange={e => setSelectedGroupFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
                                    className="h-7 px-2 border border-gray-200 rounded-lg text-xs font-semibold bg-gray-50 outline-none cursor-pointer"
                                >
                                    <option value="ALL">All Revenue Groups ({revenueHeads.length})</option>
                                    {revenueGroups.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[760px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Head Code</th>
                                        <th className="px-3 py-2">Revenue Head Name</th>
                                        <th className="px-3 py-2">USALI Group</th>
                                        <th className="px-3 py-2">GL Account Code</th>
                                        <th className="px-3 py-2">Cost Center</th>
                                        <th className="px-3 py-2">Tax (VAT)</th>
                                        <th className="px-3 py-2">Service Charge</th>
                                        <th className="px-3 py-2">Ledger Type</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredRevenueHeads.map(head => {
                                        const parentGroup = revenueGroups.find(g => g.id === head.groupId);
                                        return (
                                            <tr key={head.id} className="hover:bg-blue-50/20">
                                                <td className="px-3 py-2 font-mono text-blue-700">{head.code}</td>
                                                <td className="px-3 py-2 font-semibold text-gray-900">{head.name}</td>
                                                <td className="px-3 py-2">
                                                    <span className="text-[10.5px] font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {parentGroup?.name || 'Operating'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 font-mono text-gray-900">
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200 font-bold">
                                                        {head.glAccountCode}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-gray-600 text-[11px]">{head.costCenter}</td>
                                                <td className="px-3 py-2">
                                                    <span className="text-gray-900">{head.defaultTaxRate}%</span>
                                                </td>
                                                <td className="px-3 py-2">
                                                    {head.serviceChargeApplicable ? (
                                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            10% Applicable
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-[10px]">Exempt (0%)</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] ${head.accountType.includes('Contra') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                                                        {head.accountType}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditRevHead(head)}
                                                            className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                        >
                                                            <Edit2 size={13} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteRevHead(head.id)}
                                                            className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 3: EXTRA CHARGES & ADD-ONS (WITH PROPER ACCOUNTING)          */}
            {/* ================================================================ */}
            {activeTab === 'charges' && (
                <div className="space-y-3">
                    {/* Add-on Guide */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Info size={15} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Supplemental Folio Charges & Proper Accounting Rules:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                Every ancillary charge (Airport limos, extra beds, laundry, breakfast walk-ins) is mapped to its parent Revenue Head and GL ledger. When front desk associates add an extra charge to a guest folio, tax (15% VAT) and service charge (10%) are automatically computed and posted to the audit journal.
                            </p>
                        </div>
                    </div>

                    {/* Extra Charges Cards Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        {extraCharges.map(charge => (
                            <div
                                key={charge.id}
                                className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between space-y-2.5 relative group"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-[10px] text-blue-600 uppercase bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                        {charge.code}
                                    </span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditCharge(charge)}
                                            className="p-1 text-gray-400 hover:text-blue-600 cursor-pointer"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCharge(charge.id)}
                                            className="p-1 text-gray-400 hover:text-rose-600 cursor-pointer"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-indigo-600 uppercase">{charge.category}</div>
                                    <h4 className="text-gray-900 mt-0.5 text-sm leading-tight">{charge.name}</h4>
                                    <div className="text-[10px] text-gray-500 font-mono mt-1">{charge.revenueLedgerCode}</div>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-gray-100">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-900 text-sm">
                                            {charge.pricingRule === 'Room Rate %' ? `${charge.basePrice}% of Daily Rate` : `${baseCurrency.symbol} ${charge.basePrice.toLocaleString()}`}
                                        </span>
                                        <span className="px-1.5 py-0.2 rounded text-[10px] bg-gray-100 text-gray-700">
                                            {charge.pricingRule}
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-gray-500 pt-1">
                                        {charge.taxApplicable && (
                                            <span className="px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-100">
                                                15% VAT
                                            </span>
                                        )}
                                        {charge.serviceChargeApplicable && (
                                            <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                10% SC
                                            </span>
                                        )}
                                        <span className="px-1.5 py-0.2 rounded bg-gray-50 text-gray-600 border border-gray-200">
                                            {charge.autoPostTrigger}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 4: DISCOUNTS & REBATES (USALI CONTRA-REVENUE GL-4990)       */}
            {/* ================================================================ */}
            {activeTab === 'discounts' && (
                <div className="space-y-3">
                    {/* USALI Discount Warning & Guidance */}
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-amber-900">
                        <Shield size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Proper USALI Accounting for Discounts & Rebates:</span>
                            <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                                In professional hotel accounting, discounts are never deleted from room rates. Instead, they are posted as a <strong>Contra-Revenue Entry (Debit GL-4990 - Room Revenue Discounts & Allowances)</strong>. This guarantees that gross revenue, rebates, and net operating income (NOI) reconcile cleanly for auditors and tax authorities.
                            </p>
                        </div>
                    </div>

                    {/* Discounts Table */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden text-xs">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Percent size={14} className="text-blue-600" />
                                    <span>Authorized Discount & Concession Policies</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Enforces maximum cap limits and supervisor PIN override requirements.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddDiscount}
                                className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center gap-1 cursor-pointer"
                            >
                                <Plus size={13} />
                                <span>+ New Discount Policy</span>
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {discounts.map(disc => (
                                <div key={disc.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start sm:items-center gap-3">
                                        <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center text-sm flex-shrink-0">
                                            {disc.type === 'Percentage (%)' ? '%' : '৳'}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-900 text-sm">{disc.name}</span>
                                                <span className="font-mono text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                                    {disc.code}
                                                </span>
                                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.2 rounded">
                                                    {disc.category}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 mt-1">
                                                <span>Value: <strong className="text-blue-700 font-bold">{disc.type === 'Percentage (%)' ? `${disc.value}%` : `${baseCurrency.symbol} ${disc.value.toLocaleString()}`}</strong></span>
                                                <span>•</span>
                                                <span>Max Cap: <strong>{baseCurrency.symbol} {disc.maxCapBDT.toLocaleString()}</strong></span>
                                                <span>•</span>
                                                <span>Min Spend: <strong>{baseCurrency.symbol} {disc.minSpendBDT.toLocaleString()}</strong></span>
                                                <span>•</span>
                                                <span>Applicable: <strong>{disc.applicableOn.join(', ')}</strong></span>
                                                <span>•</span>
                                                <span className="font-mono text-[10px] text-gray-400">{disc.contraRevenueGlCode}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                                        {disc.requiresManagerPin && (
                                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200">
                                                Supervisor PIN Required
                                            </span>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDiscounts(prev =>
                                                    prev.map(d => d.id === disc.id ? { ...d, active: !d.active } : d)
                                                );
                                                showToast(`Discount ${disc.code} is now ${!disc.active ? 'Active' : 'Inactive'}.`);
                                            }}
                                            className={`px-2 py-0.5 rounded-full text-[10px] cursor-pointer transition-colors ${disc.active ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'}`}
                                        >
                                            {disc.active ? 'Active' : 'Inactive'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditDiscount(disc)}
                                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                        >
                                            <Edit2 size={13} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteDiscount(disc.id)}
                                            className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                        >
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 5: BANKING & MFS SETTLEMENT CHANNELS                         */}
            {/* ================================================================ */}
            {activeTab === 'banking' && (
                <div className="space-y-4">
                    {/* Bank Guidance */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Landmark size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Institutional Banking & Mobile Financial Services (MFS) Architecture:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                Commercial Bank Accounts are used for direct corporate billings, wire transfers, and POS swipe terminal batch settlements. MFS Wallets (bKash, Nagad, Rocket, Upay) allow instant guest deposit collections at the desk and online banquet confirmations.
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Commercial Bank Accounts */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Landmark size={14} className="text-blue-600" />
                                    <span>Hotel Operating Commercial Bank Accounts</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Default bank details automatically populate on printed guest folios and corporate direct-billing invoices.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddBank}
                                className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                            >
                                + Add Bank Account
                            </button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[760px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Bank Name</th>
                                        <th className="px-3 py-2">Account Title</th>
                                        <th className="px-3 py-2">Account Number</th>
                                        <th className="px-3 py-2">Branch & Routing</th>
                                        <th className="px-3 py-2">SWIFT Code</th>
                                        <th className="px-3 py-2">Linked GL Ledger</th>
                                        <th className="px-3 py-2">Settlement Default</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {bankAccounts.map(b => (
                                        <tr key={b.id} className="hover:bg-blue-50/20">
                                            <td className="px-3 py-2 text-gray-900">{b.bankName}</td>
                                            <td className="px-3 py-2 text-gray-700">{b.accountTitle}</td>
                                            <td className="px-3 py-2 font-mono text-blue-700">{b.accountNumber}</td>
                                            <td className="px-3 py-2 text-gray-600">
                                                <div>{b.branchName}</div>
                                                <div className="font-mono text-[10px] text-gray-400">Routing: {b.routingNumber}</div>
                                            </td>
                                            <td className="px-3 py-2 font-mono text-gray-700">{b.swiftCode}</td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-gray-500">{b.linkedGlCode}</td>
                                            <td className="px-3 py-2">
                                                {b.isDefaultSettlement ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        <Check size={11} /> Default Folio Bank
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetDefaultBank(b.id)}
                                                        className="px-2 py-0.5 text-[10px] text-gray-500 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded cursor-pointer transition-colors"
                                                    >
                                                        Make Default
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditBank(b)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteBank(b.id)}
                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Mobile Financial Services (MFS Wallets) */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Wallet size={14} className="text-emerald-600" />
                                    <span>Mobile Financial Services (MFS) Merchant Wallets</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    bKash Merchant, Nagad Sheba, Rocket, and Upay merchant channels for guest front desk settlement.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddMfs}
                                className="h-6 px-2 text-[10.5px] bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 cursor-pointer"
                            >
                                + Add MFS Wallet
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
                            {mfsWallets.map(mfs => (
                                <div
                                    key={mfs.id}
                                    className="p-3.5 rounded-xl border border-gray-200 hover:border-emerald-300 bg-gray-50/50 transition-all flex flex-col justify-between space-y-2 relative group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className={`px-2 py-0.5 rounded text-[10px] ${mfs.provider.includes('bKash') ? 'bg-pink-50 text-pink-700 border border-pink-200' : mfs.provider.includes('Nagad') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
                                            {mfs.provider}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditMfs(mfs)}
                                                className="p-1 text-gray-400 hover:text-blue-600"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteMfs(mfs.id)}
                                                className="p-1 text-gray-400 hover:text-rose-600"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-sm text-gray-900 tracking-wide mt-1">
                                            {mfs.merchantNumber}
                                        </div>
                                        <div className="text-[10.5px] text-gray-500 mt-0.5">{mfs.counterId}</div>
                                        <div className="text-[10px] font-mono text-gray-400 mt-0.5">Clearing: {mfs.linkedGlCode}</div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100 space-y-1 text-[10.5px]">
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">MDR Fee:</span>
                                            <span className="text-gray-900">{mfs.commissionRatePercent}%</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-gray-500">Daily Cap:</span>
                                            <span className="font-mono text-gray-700">{baseCurrency.symbol} {mfs.dailyLimitBDT.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 6: DEPARTMENTS & WORK SHIFTS MASTER                          */}
            {/* ================================================================ */}
            {activeTab === 'departments' && (
                <div className="space-y-4">
                    {/* Guidance */}
                    <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-blue-900">
                        <Building2 size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Hotel Operational Organization & 24/7 Shift Architecture:</span>
                            <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                                Departments structure cost centers and payroll allocation. Work Shifts drive 24/7 staff rostering, cash drawer blind handovers, and night audit EOD triggering privileges.
                            </p>
                        </div>
                    </div>

                    {/* Section 1: Departments */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Building2 size={14} className="text-blue-600" />
                                    <span>Hotel Operating Departments & Cost Centers</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Used across employee profiles, purchase orders, and USALI departmental payroll statements.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddDept}
                                className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                            >
                                + Add Department
                            </button>
                        </div>
                        <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] text-gray-500 uppercase tracking-wider">
                                        <th className="px-3 py-2">Code</th>
                                        <th className="px-3 py-2">Department Name</th>
                                        <th className="px-3 py-2">Head of Department (HOD)</th>
                                        <th className="px-3 py-2">Cost Center</th>
                                        <th className="px-3 py-2">Type</th>
                                        <th className="px-3 py-2">Staff Count</th>
                                        <th className="px-3 py-2">Monthly Budget</th>
                                        <th className="px-3 py-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {departments.map(d => (
                                        <tr key={d.id} className="hover:bg-blue-50/20">
                                            <td className="px-3 py-2 font-mono text-blue-700">{d.code}</td>
                                            <td className="px-3 py-2 text-gray-900">{d.name}</td>
                                            <td className="px-3 py-2 text-gray-700">{d.hodName}</td>
                                            <td className="px-3 py-2 font-mono text-[11px] text-gray-600 font-bold">{d.costCenterCode}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.2 rounded text-[10px] ${d.type.includes('Operational') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-600'}`}>
                                                    {d.type.includes('Operational') ? 'Operational' : 'Support / Overhead'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-gray-900">{d.staffCount} Staff</td>
                                            <td className="px-3 py-2 font-mono text-gray-700">{baseCurrency.symbol} {d.monthlyBudgetBDT.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenEditDept(d)}
                                                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                                    >
                                                        <Edit2 size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteDept(d.id)}
                                                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Work Shifts */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-xs text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock size={14} className="text-purple-600" />
                                    <span>24/7 Hotel Work Shifts & Handover Protocols</span>
                                </h3>
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                    Configures shift hours, grace period, and night audit automation permissions.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddShift}
                                className="h-6 px-2 text-[10.5px] bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 cursor-pointer"
                            >
                                + Add Work Shift
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3">
                            {workShifts.map(s => (
                                <div
                                    key={s.id}
                                    className={`p-3.5 rounded-xl border ${s.color} transition-all flex flex-col justify-between space-y-2 relative group shadow-2xs`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-[10px] uppercase bg-white/80 px-1.5 py-0.2 rounded border border-current">
                                            {s.code}
                                        </span>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEditShift(s)}
                                                className="p-1 hover:text-black"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteShift(s.id)}
                                                className="p-1 hover:text-rose-700"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-sm">{s.name}</h4>
                                        <div className="font-mono text-xs mt-1">
                                            {s.startTime} - {s.endTime}
                                        </div>
                                        <div className="text-[10.5px] opacity-80 mt-0.5">Grace: {s.gracePeriodMinutes} mins</div>
                                    </div>
                                    <div className="pt-2 border-t border-black/10 text-[10.5px] space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span>Cash Drawer Handover:</span>
                                            <span className="font-bold">{s.mandatoryCashHandover ? 'Mandatory' : 'Optional'}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span>Night Audit Trigger:</span>
                                            <span className="font-bold">{s.canTriggerNightAudit ? 'Authorized' : 'Restricted'}</span>
                                        </div>
                                        <div className="flex items-center justify-between pt-1">
                                            <span className="opacity-75">Staff Assigned:</span>
                                            <span className="font-bold">{s.assignedStaffCount} Personnel</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* TAB 7: MARKET CODES & BUSINESS SOURCES                           */}
            {/* ================================================================ */}
            {activeTab === 'source' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Market Codes */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Target size={14} className="text-blue-600" />
                                <span>Hotel Market Codes</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => showToast('Market segment editor')}
                                className="h-6 px-2 text-[10.5px] bg-blue-50 text-blue-700 rounded font-semibold cursor-pointer"
                            >
                                + Add Market Code
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {marketCodes.map(mc => (
                                <div key={mc.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                                {mc.code}
                                            </span>
                                            <span className="text-gray-900">{mc.description}</span>
                                        </div>
                                        <div className="text-[10.5px] text-gray-400 mt-0.5">{mc.reportGroup}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Business Sources */}
                    <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                        <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-600" />
                                <span>Business Channels & OTA Comms</span>
                            </h3>
                            <button
                                type="button"
                                onClick={() => showToast('Business source editor')}
                                className="h-6 px-2 text-[10.5px] bg-emerald-50 text-emerald-700 rounded font-semibold cursor-pointer"
                            >
                                + Add Source
                            </button>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {businessSources.map(bs => (
                                <div key={bs.id} className="p-3 flex items-center justify-between hover:bg-gray-50">
                                    <div>
                                        <div className="text-gray-900">{bs.name}</div>
                                        <div className="text-[10.5px] text-gray-400 mt-0.5">
                                            Type: {bs.type} • Linked Rate: {bs.linkedRatePlan}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded font-mono text-xs bg-amber-50 text-amber-800 border border-amber-200">
                                            Comm: {bs.commission}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ================================================================ */}
            {/* MODALS                                                           */}
            {/* ================================================================ */}

            {/* 1. CURRENCY MODAL */}
            {isCurrencyModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Coins size={14} className="text-blue-600" />
                                <span>{editingCurrency ? 'Edit Currency Parameters' : 'Register New Settlement Currency'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsCurrencyModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCurrency} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Currency Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Canadian Dollar"
                                        value={currencyFormData.name}
                                        onChange={e => setCurrencyFormData({ ...currencyFormData, name: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">ISO Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CAD"
                                        value={currencyFormData.code}
                                        onChange={e => setCurrencyFormData({ ...currencyFormData, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Symbol *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. C$"
                                        value={currencyFormData.symbol}
                                        onChange={e => setCurrencyFormData({ ...currencyFormData, symbol: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Position</label>
                                    <select
                                        value={currencyFormData.symbolPosition}
                                        onChange={e => setCurrencyFormData({ ...currencyFormData, symbolPosition: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="prefix">Prefix (৳ 100)</option>
                                        <option value="suffix">Suffix (100 ৳)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Decimals</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={4}
                                        value={currencyFormData.decimals}
                                        onChange={e => setCurrencyFormData({ ...currencyFormData, decimals: Number(e.target.value) })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Accepted Banknotes / Denominations</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 100, 50, 20, 10"
                                    value={currencyFormData.denominations}
                                    onChange={e => setCurrencyFormData({ ...currencyFormData, denominations: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsCurrencyModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Currency
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2. REVENUE GROUP MODAL */}
            {isRevGroupModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-600" />
                                <span>{editingRevGroup ? 'Edit Revenue Group' : 'Register USALI Revenue Group'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsRevGroupModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveRevGroup} className="p-3.5 space-y-3 text-xs">
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Group Code *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. REV-BANQ"
                                    value={revGroupForm.code}
                                    onChange={e => setRevGroupForm({ ...revGroupForm, code: e.target.value.toUpperCase() })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Group Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Banquet & Conventions"
                                    value={revGroupForm.name}
                                    onChange={e => setRevGroupForm({ ...revGroupForm, name: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">USALI Category</label>
                                    <select
                                        value={revGroupForm.usaliCategory}
                                        onChange={e => setRevGroupForm({ ...revGroupForm, usaliCategory: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Operating Revenue">Operating Revenue</option>
                                        <option value="Non-Operating Income">Non-Operating Income</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">GL Prefix Range</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 4100-4199"
                                        value={revGroupForm.glPrefix}
                                        onChange={e => setRevGroupForm({ ...revGroupForm, glPrefix: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Department Head Responsible</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Banquet Director"
                                    value={revGroupForm.departmentHead}
                                    onChange={e => setRevGroupForm({ ...revGroupForm, departmentHead: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsRevGroupModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Group
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 3. REVENUE HEAD MODAL */}
            {isRevHeadModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Receipt size={14} className="text-emerald-600" />
                                <span>{editingRevHead ? 'Edit Revenue Head & GL Link' : 'Register New USALI Revenue Head'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsRevHeadModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveRevHead} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Parent Revenue Group *</label>
                                    <select
                                        value={revHeadForm.groupId}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, groupId: Number(e.target.value) })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        {revenueGroups.map(g => (
                                            <option key={g.id} value={g.id}>{g.name} ({g.code})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Head Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. REV-BANQ-HALL"
                                        value={revHeadForm.code}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Revenue Head Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Grand Ballroom Hall Rental Revenue"
                                    value={revHeadForm.name}
                                    onChange={e => setRevHeadForm({ ...revHeadForm, name: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">GL Account Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. GL-4102"
                                        value={revHeadForm.glAccountCode}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, glAccountCode: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Default VAT Rate (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={30}
                                        value={revHeadForm.defaultTaxRate}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, defaultTaxRate: Number(e.target.value) })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Cost Center</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CC-203 Banquet"
                                        value={revHeadForm.costCenter}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, costCenter: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Ledger Account Type</label>
                                    <select
                                        value={revHeadForm.accountType}
                                        onChange={e => setRevHeadForm({ ...revHeadForm, accountType: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Revenue (Credit)">Revenue (Credit Entry)</option>
                                        <option value="Contra-Revenue (Debit)">Contra-Revenue (Debit Entry)</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-5">
                                    <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={revHeadForm.serviceChargeApplicable}
                                            onChange={e => setRevHeadForm({ ...revHeadForm, serviceChargeApplicable: e.target.checked })}
                                            className="w-4 h-4 rounded text-blue-600"
                                        />
                                        <span>10% Service Charge Applicable</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsRevHeadModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
                                    Save Revenue Head
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 4. EXTRA CHARGE MODAL */}
            {isChargeModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Receipt size={14} className="text-blue-600" />
                                <span>{editingCharge ? 'Edit Extra Charge Item' : 'Register New Folio Add-on Charge'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsChargeModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCharge} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Item Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. TRN-AIRPORT"
                                        value={chargeForm.code}
                                        onChange={e => setChargeForm({ ...chargeForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Category *</label>
                                    <select
                                        value={chargeForm.category}
                                        onChange={e => setChargeForm({ ...chargeForm, category: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Transport">Transport & Chauffeur</option>
                                        <option value="Housekeeping">Housekeeping & Extra Bed</option>
                                        <option value="Food & Beverage">Food & Beverage Walk-in</option>
                                        <option value="Front Desk">Front Desk Surcharge</option>
                                        <option value="Spa & Wellness">Spa & Wellness</option>
                                        <option value="IT & Telecom">IT & High-Speed Internet</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Charge Name / Description *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Airport VIP Sedan Transfer"
                                    value={chargeForm.name}
                                    onChange={e => setChargeForm({ ...chargeForm, name: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Calculation Rule *</label>
                                    <select
                                        value={chargeForm.pricingRule}
                                        onChange={e => setChargeForm({ ...chargeForm, pricingRule: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Flat Amount">Flat Amount (Fixed Fee)</option>
                                        <option value="Per Night">Per Night (Multiplied by Stay Nights)</option>
                                        <option value="Per Person">Per Person (Multiplied by Occupants)</option>
                                        <option value="Room Rate %">Room Rate % (Percentage of Room Tariff)</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Price / Amount ({baseCurrency.symbol} or %) *</label>
                                    <input
                                        type="number"
                                        required
                                        min={0}
                                        value={chargeForm.basePrice}
                                        onChange={e => setChargeForm({ ...chargeForm, basePrice: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Linked Revenue Ledger Code *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. GL-4301 - Airport VIP Fleet"
                                    value={chargeForm.revenueLedgerCode}
                                    onChange={e => setChargeForm({ ...chargeForm, revenueLedgerCode: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Auto-Post Folio Trigger</label>
                                    <select
                                        value={chargeForm.autoPostTrigger}
                                        onChange={e => setChargeForm({ ...chargeForm, autoPostTrigger: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="On Reservation">On Reservation Creation</option>
                                        <option value="On Check-In">On Guest Check-In</option>
                                        <option value="On Demand / Manual">On Demand / Manual Desk Posting</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5 pt-2">
                                    <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={chargeForm.taxApplicable}
                                            onChange={e => setChargeForm({ ...chargeForm, taxApplicable: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded text-blue-600"
                                        />
                                        <span>15% VAT Applicable</span>
                                    </label>
                                    <label className="flex items-center gap-1.5 font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={chargeForm.serviceChargeApplicable}
                                            onChange={e => setChargeForm({ ...chargeForm, serviceChargeApplicable: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded text-blue-600"
                                        />
                                        <span>10% Service Charge Applicable</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsChargeModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Extra Charge
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 5. DISCOUNT POLICY MODAL */}
            {isDiscountModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Percent size={14} className="text-blue-600" />
                                <span>{editingDiscount ? 'Edit Discount Policy' : 'Create New Discount & Rebate Policy'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDiscount} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Discount Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CORP-TELCO"
                                        value={discountForm.code}
                                        onChange={e => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Category *</label>
                                    <select
                                        value={discountForm.category}
                                        onChange={e => setDiscountForm({ ...discountForm, category: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Corporate Negotiated">Corporate Negotiated</option>
                                        <option value="Promotional Campaign">Promotional Campaign</option>
                                        <option value="VIP / GM Discretionary">VIP / GM Discretionary</option>
                                        <option value="Long Stay Allowance">Long Stay Allowance</option>
                                        <option value="Staff Privilege">Staff Privilege</option>
                                    </select>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Policy Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Telecom Corporate Partner Discount"
                                    value={discountForm.name}
                                    onChange={e => setDiscountForm({ ...discountForm, name: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Type *</label>
                                    <select
                                        value={discountForm.type}
                                        onChange={e => setDiscountForm({ ...discountForm, type: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Percentage (%)">Percentage (%)</option>
                                        <option value="Flat Amount (BDT)">Flat Amount ({baseCurrency.symbol})</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Value *</label>
                                    <input
                                        type="number"
                                        required
                                        min={1}
                                        value={discountForm.value}
                                        onChange={e => setDiscountForm({ ...discountForm, value: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Max Cap ({baseCurrency.symbol})</label>
                                    <input
                                        type="number"
                                        required
                                        min={100}
                                        value={discountForm.maxCapBDT}
                                        onChange={e => setDiscountForm({ ...discountForm, maxCapBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Min Folio Spend ({baseCurrency.symbol})</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={discountForm.minSpendBDT}
                                        onChange={e => setDiscountForm({ ...discountForm, minSpendBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">USALI Contra-Revenue GL Code</label>
                                    <input
                                        type="text"
                                        required
                                        value={discountForm.contraRevenueGlCode}
                                        onChange={e => setDiscountForm({ ...discountForm, contraRevenueGlCode: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 pt-1">
                                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={discountForm.requiresManagerPin}
                                        onChange={e => setDiscountForm({ ...discountForm, requiresManagerPin: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>Requires Supervisor / GM PIN Authorization</span>
                                </label>
                                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={discountForm.reasonRequired}
                                        onChange={e => setDiscountForm({ ...discountForm, reasonRequired: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>Mandatory Reason Code Selection at Checkout</span>
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsDiscountModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Discount Policy
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 6. BANK ACCOUNT MODAL */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Landmark size={14} className="text-blue-600" />
                                <span>{editingBank ? 'Edit Bank Account' : 'Register Commercial Bank Account'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsBankModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveBank} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Bank Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. City Bank PLC"
                                        value={bankForm.bankName}
                                        onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Account Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 1102938472001"
                                        value={bankForm.accountNumber}
                                        onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Account Title / Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. The Grand Palace Hotel Ltd - Operations"
                                    value={bankForm.accountTitle}
                                    onChange={e => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Branch Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Gulshan Corporate"
                                        value={bankForm.branchName}
                                        onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Routing Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 060271829"
                                        value={bankForm.routingNumber}
                                        onChange={e => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">SWIFT / BIC Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CIBLBDDH"
                                        value={bankForm.swiftCode}
                                        onChange={e => setBankForm({ ...bankForm, swiftCode: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Linked GL Ledger</label>
                                    <input
                                        type="text"
                                        value={bankForm.linkedGlCode}
                                        onChange={e => setBankForm({ ...bankForm, linkedGlCode: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                                <div className="flex items-center pt-5">
                                    <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={bankForm.isDefaultSettlement}
                                            onChange={e => setBankForm({ ...bankForm, isDefaultSettlement: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded text-blue-600"
                                        />
                                        <span>Set as Default Settlement Bank</span>
                                    </label>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsBankModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Bank Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 7. MFS WALLET MODAL */}
            {isMfsModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Wallet size={14} className="text-emerald-600" />
                                <span>{editingMfs ? 'Edit MFS Wallet' : 'Register MFS Merchant Wallet'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsMfsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveMfs} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">MFS Provider *</label>
                                    <select
                                        value={mfsForm.provider}
                                        onChange={e => setMfsForm({ ...mfsForm, provider: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white font-bold"
                                    >
                                        <option value="bKash Merchant">bKash Merchant</option>
                                        <option value="Nagad Sheba">Nagad Sheba</option>
                                        <option value="Rocket DBBL">Rocket DBBL</option>
                                        <option value="Upay UCB">Upay UCB</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Merchant Number *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. 01711-928374"
                                        value={mfsForm.merchantNumber}
                                        onChange={e => setMfsForm({ ...mfsForm, merchantNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Counter / Terminal ID</label>
                                <input
                                    type="text"
                                    placeholder="e.g. COUNTER-01 (Front Desk Primary)"
                                    value={mfsForm.counterId}
                                    onChange={e => setMfsForm({ ...mfsForm, counterId: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">MDR Fee Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={5}
                                        value={mfsForm.commissionRatePercent}
                                        onChange={e => setMfsForm({ ...mfsForm, commissionRatePercent: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Daily Limit ({baseCurrency.symbol})</label>
                                    <input
                                        type="number"
                                        min={10000}
                                        value={mfsForm.dailyLimitBDT}
                                        onChange={e => setMfsForm({ ...mfsForm, dailyLimitBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Settlement Bank</label>
                                    <select
                                        value={mfsForm.linkedBankName}
                                        onChange={e => setMfsForm({ ...mfsForm, linkedBankName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        {bankAccounts.map(b => (
                                            <option key={b.id} value={b.bankName}>{b.bankName}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Clearing GL Code</label>
                                    <input
                                        type="text"
                                        value={mfsForm.linkedGlCode}
                                        onChange={e => setMfsForm({ ...mfsForm, linkedGlCode: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsMfsModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700">
                                    Save MFS Wallet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 8. DEPARTMENT MODAL */}
            {isDeptModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Building2 size={14} className="text-blue-600" />
                                <span>{editingDept ? 'Edit Department' : 'Create Hotel Department'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsDeptModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveDept} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. FO"
                                        value={deptForm.code}
                                        onChange={e => setDeptForm({ ...deptForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Cost Center *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. CC-101"
                                        value={deptForm.costCenterCode}
                                        onChange={e => setDeptForm({ ...deptForm, costCenterCode: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Department Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Front Office & Guest Services"
                                    value={deptForm.name}
                                    onChange={e => setDeptForm({ ...deptForm, name: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Head of Department (HOD)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Md. Rafiqul Islam (FOM)"
                                    value={deptForm.hodName}
                                    onChange={e => setDeptForm({ ...deptForm, hodName: e.target.value })}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Operating Type</label>
                                    <select
                                        value={deptForm.type}
                                        onChange={e => setDeptForm({ ...deptForm, type: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white"
                                    >
                                        <option value="Operational (Revenue Generating)">Operational</option>
                                        <option value="Support & Administration">Support / Overhead</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Monthly Budget ({baseCurrency.symbol})</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={deptForm.monthlyBudgetBDT}
                                        onChange={e => setDeptForm({ ...deptForm, monthlyBudgetBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsDeptModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Save Department
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 9. WORK SHIFT MODAL */}
            {isShiftModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <Clock size={14} className="text-purple-600" />
                                <span>{editingShift ? 'Edit Work Shift' : 'Configure Hotel Work Shift'}</span>
                            </h3>
                            <button type="button" onClick={() => setIsShiftModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveShift} className="p-3.5 space-y-3 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Shift Code *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. SHT-MOR"
                                        value={shiftForm.code}
                                        onChange={e => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Shift Name *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Morning Shift"
                                        value={shiftForm.name}
                                        onChange={e => setShiftForm({ ...shiftForm, name: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Start Time *</label>
                                    <input
                                        type="time"
                                        required
                                        value={shiftForm.startTime}
                                        onChange={e => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">End Time *</label>
                                    <input
                                        type="time"
                                        required
                                        value={shiftForm.endTime}
                                        onChange={e => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Grace (mins)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={60}
                                        value={shiftForm.gracePeriodMinutes}
                                        onChange={e => setShiftForm({ ...shiftForm, gracePeriodMinutes: Number(e.target.value) })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 pt-1">
                                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={shiftForm.mandatoryCashHandover}
                                        onChange={e => setShiftForm({ ...shiftForm, mandatoryCashHandover: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded text-blue-600"
                                    />
                                    <span>Mandatory Cash Drawer Blind Count Handover</span>
                                </label>
                                <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={shiftForm.canTriggerNightAudit}
                                        onChange={e => setShiftForm({ ...shiftForm, canTriggerNightAudit: e.target.checked })}
                                        className="w-3.5 h-3.5 rounded text-purple-600"
                                    />
                                    <span>Privilege: Can Trigger Night Audit EOD Automation</span>
                                </label>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsShiftModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
                                    Save Work Shift
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 10. EDIT EXCHANGE RATE MODAL */}
            {editingRate && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-sm w-full border border-gray-200 shadow-xl overflow-hidden">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs text-gray-900 flex items-center gap-1.5">
                                <TrendingUp size={14} className="text-emerald-600" />
                                <span>Adjust FX Rate: {editingRate.currencyCode}/{baseCurrency.code}</span>
                            </h3>
                            <button type="button" onClick={() => setEditingRate(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={15} />
                            </button>
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                const form = new FormData(e.currentTarget);
                                const buyingRate = form.get('buyingRate') as string;
                                const sellingRate = form.get('sellingRate') as string;
                                const autoUpdate = form.get('autoUpdate') === 'on';

                                setExchangeRates(prev =>
                                    prev.map(r => r.id === editingRate.id ? { ...r, buyingRate, sellingRate, autoUpdate, effectiveDate: 'Just updated' } : r)
                                );
                                showToast(`Exchange rate for ${editingRate.currencyCode} updated.`);
                                setEditingRate(null);
                            }}
                            className="p-3.5 space-y-3 text-xs"
                        >
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Buying Rate (1 {editingRate.currencyCode} in {baseCurrency.code})</label>
                                <input
                                    type="text"
                                    name="buyingRate"
                                    defaultValue={editingRate.buyingRate}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono text-emerald-700"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="font-semibold text-gray-700">Selling Rate (1 {editingRate.currencyCode} in {baseCurrency.code})</label>
                                <input
                                    type="text"
                                    name="sellingRate"
                                    defaultValue={editingRate.sellingRate}
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono text-blue-700"
                                />
                            </div>
                            <label className="flex items-center gap-2 font-semibold text-gray-700 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    name="autoUpdate"
                                    defaultChecked={editingRate.autoUpdate}
                                    className="w-3.5 h-3.5 rounded text-blue-600"
                                />
                                <span>Enable Central Bank Auto-Sync Feed</span>
                            </label>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setEditingRate(null)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                                    Apply FX Rate
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterDataConfig;
