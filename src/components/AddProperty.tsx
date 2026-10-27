import React, { useState, useEffect } from 'react';
import {
    ArrowLeft, Building2, Clock, CreditCard, Monitor, User,
    Briefcase, MapPin, Shield, Settings, Zap, CheckCircle2,
    LogIn, ShieldCheck, ShieldAlert, DollarSign, Calendar,
    AlertCircle, FileText, Image, Trash2, Plus,
    Globe, Receipt, Mail, Lock, Eye, RotateCcw, Send, Database
} from 'lucide-react';
import { useProperty } from '../context/PropertyContext';
import { useToast } from '../context/ToastContext';
import { getApiBaseUrl } from '../utils/apiUrl';

export interface AddPropertyProps {
    onBack?: () => void;
    initialData?: any;
    isCreateMode?: boolean;
    initialViewMode?: 'manage' | 'overview';
    initialTab?: string;
    currentUser?: any;
    onNavigate?: (page: string) => void;
}

export interface BankAccount {
    id: string;
    bankName: string;
    accountName: string;
    accountNum: string;
    swift: string;
    branch?: string;
    routingNo?: string;
}

export interface PosOutlet {
    id: string;
    name: string;
    type: string;
    hours: string;
    capacity: string;
    posStation: string;
    status: string;
}

export interface PocContact {
    id: string;
    role: string;
    name: string;
    phone: string;
    email: string;
}

export interface EmergencyLine {
    id: string;
    label: string;
    name: string;
    phone: string;
}

export interface SocialMediaLink {
    id: string;
    platform: string;
    url: string;
    handle?: string;
}

export const getDefaultUnifiedSettings = (targetProperty?: any) => ({
    // 1. General & Location
    legalEntity: 'Grand Hospitality Bangladesh PLC',
    establishedYear: '2018',
    website: 'www.grandhospitality.com',
    bookingEngineUrl: 'https://book.grandhospitality.com',
    defaultNationality: 'Bangladeshi',
    stateProvince: targetProperty?.city?.includes('Cox') ? 'Chattogram Division' : 'Dhaka Division',
    zipCode: targetProperty?.city?.includes('Cox') ? '4700' : '1212',
    latitude: targetProperty?.city?.includes('Cox') ? '21.4272' : '23.7937',
    longitude: targetProperty?.city?.includes('Cox') ? '91.9702' : '90.4066',
    airportProximity: targetProperty?.city?.includes('Cox')
        ? "Cox's Bazar Airport (4.2 km / 12 mins)"
        : 'Hazrat Shahjalal Intl Airport (8.5 km / 25 mins)',
    stationProximity: targetProperty?.city?.includes('Cox')
        ? "Cox's Bazar Iconic Rail Station (5.0 km / 15 mins)"
        : 'Kamalapur Railway Station (12.4 km / 35 mins)',
    diplomaticProximity: targetProperty?.city?.includes('Cox')
        ? 'Kolatoli Marine Drive Tourist Zone (0.5 km)'
        : 'Gulshan-2 Diplomatic Zone (1.2 km / 5 mins)',
    timezone: 'Asia/Dhaka (GMT+06:00)',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12-Hour (AM/PM)',
    fiscalYearStart: 'July - June',
    primaryLanguage: 'English',
    description:
        'Five-star luxury hospitality property offering premium guest rooms, fine dining outlets, banquet facilities, and 24/7 concierge service.',
    corporateAddress: 'Level 14, Gulshan Centre Point, Dhaka-1212, Bangladesh',
    corporatePhone: '+880 2 9876540',
    corporateEmail: 'corporate@grandhospitality.com',

    // 2. Operations & Policies
    checkInTime: targetProperty?.check_in_time || '14:00',
    checkOutTime: targetProperty?.check_out_time || '12:00',
    autoReleaseHour: '18:00',
    nightAuditTime: '02:00',
    autoPostRoomCharges: true,
    autoAdvanceBusinessDate: true,
    allowSameDayNoShowRelease: false,
    weekends: ['Friday', 'Saturday'],
    cancellationRule: 'Flexible (48 Hours Prior)',
    noShowPolicy: 'First Night Charge (100%)',
    cancellationText: 'Free cancellation up to 48 hours prior to standard check-in time.',
    allowGracePeriod: true,
    gracePeriodHours: 2,
    requireBookingGuarantee: true,
    autoChargeNoShow: true,
    cityLedgerLimitBDT: 500000,
    agencyCommissionPct: 10,
    allowBillToCompany: true,
    groupDefinitionRooms: 5,
    groupDepositTerms: '50% Advance Deposit Required',
    waitlistRetentionDays: 3,
    overbookingLimit: '0%',
    allowOverbooking: false,
    enableDynamicWaitlist: true,
    earlyCheckinBefore6: 'Full Night Charge',
    earlyCheckin6To10: '50% Half-Night Charge',
    earlyCheckin10To13: 'Complimentary (If Room Ready)',
    earlyDeparturePenalty: 'Next Night Charge',
    allowManagerFeeWaiver: true,
    minPrimaryGuestAge: 18,
    childAgeThreshold: 12,
    childStayPolicy: 'Up to 2 children under 5 years stay free using existing bedding',
    visitorIdentityRule: 'Photo ID (NID / Passport) Required at Front Desk',
    enforceVisitorCurfew: true,
    securityDepositLogic: 'Fixed Amount (BDT ৳)',
    securityDepositAmountBDT: 5000,
    staffAdjustmentLimitBDT: 2000,
    taxAdjustmentMode: 'Auto-Recalculate Tax with Tariff',
    enableDepositLedger: true,
    strictRefundApproval: true,
    mealPlanSyncMode: 'Sync with Restaurant POS & KOT',
    parkingSurchargeBDT: 0,
    minibarCheckinLogic: 'Daily Housekeeping Restock',
    smokingPolicyText: 'Non-Smoking Property (৳ 20,000 Deep Cleaning Penalty)',
    enforceSmokingPenalty: true,
    petPolicyText: 'Service Animals Only',
    enableWelfareChecks: true,
    gdprRetentionMonths: 24,
    forceMajeureOverride: false,

    // 3. Finance & Tax
    baseCurrency: targetProperty?.currency || 'BDT',
    decimalPlaces: 2,
    isTaxInclusive: false,
    taxIdNumber: 'BIN-002918374-0101',
    vatPercentage: 15,
    serviceChargePercentage: 10,
    taxExemptionCode: 'VAT-EX-DIPLOMAT',
    creditCardGateway: 'SSLCommerz / City Bank POS',
    roundingRule: 'Nearest Whole Unit',
    roundOffLimit: 1,
    addRoundOffToRate: true,
    fxUsdBuy: 121.5,
    fxUsdSell: 123.0,
    fxEurBuy: 131.2,
    fxEurSell: 133.5,
    fxGbpBuy: 154.0,
    fxGbpSell: 156.8,
    tradeLicenseNo: 'TL-DHK-2024-009419',
    tradeLicenseExpiry: '30 Jun 2027',
    tourismLicenseNo: 'DOT-CAT5-88219',
    policeCFormId: 'SB-REG-55209',
    fireSafetyCertNo: 'FSCD-CL-44109',

    // 4. Folio & Numbering
    reservationPrefix: 'RES-2026-',
    invoicePrefix: 'INV-2026-',
    folioPrefix: 'FOL-',
    kotPrefix: 'KOT-',
    receiptPrefix: 'RCT-',
    resetAnnually: true,
    invoiceNotes:
        'All bills are payable upon presentation at checkout. Government VAT (15%) and Service Charge (10%) apply as per regulations.',

    // 5. System & Channels
    webRateMode: 'Dynamic BAR',
    webInventoryMode: 'Live Pooled Inventory',
    posConfiguration: 'Integrated POS & KDS',
    keyCardSystem: 'VingCard / ASSA ABLOY RFID',
    channelManager: 'SiteMinder 2-Way Sync',
    gdsAmadeus: 'GH-DAC-01',
    gdsSabre: 'GH-39104',
    gdsGalileo: 'GH-A992',
    gdsWorldspan: 'GH-8472',
    moduleFrontOffice: true,
    modulePos: true,
    moduleHousekeeping: true,
    moduleHrPayroll: true,
    moduleBanquets: true,
    moduleAccounting: true,

    // 6. Email & SMS
    smtpHost: 'smtp.sendgrid.net',
    smtpPort: '587',
    smtpUser: 'apikey',
    senderEmail: 'reservations@grandhospitality.com',
    senderName: 'Grand Hospitality Reservations',
    smsGatewayProvider: 'BulkSMS BD',
    smsSenderId: 'GRANDHOTEL',
    smsApiKey: 'sk_sms_live_9024817a0b8f2c',
    enableGuestWelcomeSms: true,
    enableCheckoutFolioEmail: true,
    enableWhatsAppConcierge: true,

    // 7. Branding & Contacts
    logoUrl: targetProperty?.logo_url || targetProperty?.logoUrl || targetProperty?.settings?.logoUrl || '',
    facebookUrl: targetProperty?.facebook_url || targetProperty?.facebookUrl || targetProperty?.settings?.facebookUrl || '',
    instagramUrl: targetProperty?.instagram_url || targetProperty?.instagramUrl || targetProperty?.settings?.instagramUrl || '',
    tripAdvisorUrl: targetProperty?.tripadvisor_url || targetProperty?.tripAdvisorUrl || targetProperty?.settings?.tripAdvisorUrl || '',
    socialLinks: (targetProperty?.settings?.socialLinks && Array.isArray(targetProperty?.settings?.socialLinks))
        ? targetProperty.settings.socialLinks
        : [
            ...(targetProperty?.facebook_url || targetProperty?.settings?.facebookUrl ? [{ id: 'soc-fb', platform: 'Facebook', url: targetProperty?.facebook_url || targetProperty?.settings?.facebookUrl, handle: '' }] : []),
            ...(targetProperty?.instagram_url || targetProperty?.settings?.instagramUrl ? [{ id: 'soc-ig', platform: 'Instagram', url: targetProperty?.instagram_url || targetProperty?.settings?.instagramUrl, handle: '' }] : []),
            ...(targetProperty?.tripadvisor_url || targetProperty?.settings?.tripAdvisorUrl ? [{ id: 'soc-ta', platform: 'TripAdvisor', url: targetProperty?.tripadvisor_url || targetProperty?.settings?.tripAdvisorUrl, handle: '' }] : [])
        ],

    // 8. Backup & Security
    autoCloudBackup: true,
    backupFrequency: 'Daily at 04:00 AM',
    backupRetentionDays: 90,
    sessionTimeoutMinutes: 15,
    maintenanceMode: false
});

const AddProperty: React.FC<AddPropertyProps> = ({
    onBack,
    initialData,
    isCreateMode = false,
    initialTab = 'identity',
    onNavigate
}) => {
    const { activeProperty, refreshProperties, setActivePropertyId } = useProperty();
    const { showToast } = useToast();

    const targetProperty = isCreateMode ? null : (initialData?.raw || initialData || activeProperty);
    const propStorageKey = `hotel_unified_settings_prop_${targetProperty?.id || 1}`;

    const [activeTab, setActiveTab] = useState<string>(initialTab);
    const [activePolicyPillar, setActivePolicyPillar] = useState<string>('booking');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    // Core Property Fields
    const [propName, setPropName] = useState<string>(
        isCreateMode ? '' : (targetProperty?.name || 'Grand Palace Dhaka (Main Tower)')
    );
    const [propCode, setPropCode] = useState<string>(
        isCreateMode ? '' : (targetProperty?.code || 'GPD')
    );
    const [propType, setPropType] = useState<string>(
        targetProperty?.property_type || targetProperty?.type || 'Hotel'
    );
    const [propGrade, setPropGrade] = useState<string>(
        targetProperty?.star_rating ? `${targetProperty.star_rating} Star` : (targetProperty?.grade || '5 Star')
    );
    const [propRooms, setPropRooms] = useState<number>(
        Number(targetProperty?.total_rooms ?? targetProperty?.rooms ?? 34)
    );
    const [propCity, setPropCity] = useState<string>(
        isCreateMode ? 'Dhaka' : (targetProperty?.city || 'Dhaka')
    );
    const [propCountry, setPropCountry] = useState<string>(
        targetProperty?.country || 'Bangladesh'
    );
    const [propAddress, setPropAddress] = useState<string>(
        isCreateMode ? '' : (targetProperty?.address || 'Plot 12, Road 45, Gulshan-2, Dhaka')
    );
    const [propPhone, setPropPhone] = useState<string>(
        isCreateMode ? '+880 ' : (targetProperty?.phone || '+880 2 9882200')
    );
    const [propEmail, setPropEmail] = useState<string>(
        isCreateMode ? '' : (targetProperty?.email || 'dhaka@grandhospitality.com')
    );

    const [settings, setSettings] = useState(() => getDefaultUnifiedSettings(targetProperty));

    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([
        { id: '1', bankName: 'Standard Chartered Bank', accountName: 'Grand Hospitality Operations', accountNum: '01-8849201-01', swift: 'SCBLBDDX' },
        { id: '2', bankName: 'Eastern Bank PLC', accountName: 'Grand Hospitality Corporate', accountNum: '104-120-94819', swift: 'EBLBBDDH' }
    ]);

    const [posOutlets, setPosOutlets] = useState<PosOutlet[]>([
        { id: '1', name: 'The Palm Court', type: 'All-Day Dining Restaurant', hours: '06:30 AM - 11:00 PM', capacity: '140 Seats', posStation: 'Main Kitchen KOT-1', status: 'Active' },
        { id: '2', name: 'Horizon Lounge', type: 'Rooftop Lounge & Cafe', hours: '04:00 PM - 12:00 AM', capacity: '85 Seats', posStation: 'Bar & Grill KOT-2', status: 'Active' },
        { id: '3', name: 'Grand Royal Ballroom', type: 'Banquet & Convention Hall', hours: 'By Event Schedule', capacity: '450 Guests', posStation: 'Banquet POS', status: 'Active' },
        { id: '4', name: 'Azure Wellness Spa', type: 'Spa & Health Club', hours: '08:00 AM - 09:00 PM', capacity: '8 Suites', posStation: 'Spa Desk POS', status: 'Active' }
    ]);

    const [contacts, setContacts] = useState<PocContact[]>([
        { id: '1', role: 'General Manager', name: 'John Smith', phone: '+880 1711 000001', email: 'gm@grandhospitality.com' },
        { id: '2', role: 'Front Office Manager', name: 'Alice Walker', phone: '+880 1711 000002', email: 'fom@grandhospitality.com' },
        { id: '3', role: 'Executive Housekeeper', name: 'David Miller', phone: '+880 1711 000003', email: 'hk@grandhospitality.com' },
        { id: '4', role: 'Financial Controller', name: 'Sarah Jenkins', phone: '+880 1711 000004', email: 'fc@grandhospitality.com' }
    ]);

    const [emergencyLines, setEmergencyLines] = useState<EmergencyLine[]>([
        { id: '1', label: 'House Doctor (24/7)', name: 'Dr. S. K. Roy (Ext 991)', phone: '+880 1711 999111' },
        { id: '2', label: 'Hospital Emergency', name: 'United Hospital ER', phone: '+880 2 8836000' },
        { id: '3', label: 'Police Control Room', name: 'Duty Officer', phone: '+880 2 9885566' },
        { id: '4', label: 'Fire & Rescue', name: 'Fire Service Control / 999', phone: '+880 2 9898999' }
    ]);

    const [amenities, setAmenities] = useState<Record<string, boolean>>({
        'Free Wi-Fi': true,
        'Valet Parking': true,
        'Swimming Pool': true,
        'Fitness Center': true,
        'Luxury Spa': true,
        'Fine Dining': true,
        'Rooftop Lounge': true,
        '24/7 Room Service': true,
        'Banquet Hall': true,
        'Airport Shuttle': true,
        'EV Charging': true,
        'Wheelchair Access': true
    });

    const [socialLinks, setSocialLinks] = useState<SocialMediaLink[]>(() => {
        const existing = targetProperty?.settings?.socialLinks;
        if (Array.isArray(existing) && existing.length > 0) return existing;
        const initialList: SocialMediaLink[] = [];
        const fb = targetProperty?.facebook_url || targetProperty?.facebookUrl || targetProperty?.settings?.facebookUrl;
        const ig = targetProperty?.instagram_url || targetProperty?.instagramUrl || targetProperty?.settings?.instagramUrl;
        const ta = targetProperty?.tripadvisor_url || targetProperty?.tripAdvisorUrl || targetProperty?.settings?.tripAdvisorUrl;
        if (fb) initialList.push({ id: 'soc-1', platform: 'Facebook', url: fb, handle: '@facebook' });
        if (ig) initialList.push({ id: 'soc-2', platform: 'Instagram', url: ig, handle: '@instagram' });
        if (ta) initialList.push({ id: 'soc-3', platform: 'TripAdvisor', url: ta, handle: '@tripadvisor' });
        return initialList.length > 0 ? initialList : [
            { id: 'soc-1', platform: 'Facebook', url: '', handle: '' },
            { id: 'soc-2', platform: 'Instagram', url: '', handle: '' }
        ];
    });

    // Hydrate when active property changes
    useEffect(() => {
        if (isCreateMode) return;
        const p = initialData?.raw || initialData || activeProperty;
        if (p) {
            setPropName(p.name || 'Grand Palace Dhaka (Main Tower)');
            setPropCode(p.code || 'GPD');
            setPropType(p.property_type || p.type || 'Hotel');
            setPropGrade(p.star_rating ? `${p.star_rating} Star` : (p.grade || '5 Star'));
            setPropRooms(Number(p.total_rooms ?? p.rooms ?? 34));
            setPropCity(p.city || 'Dhaka');
            setPropCountry(p.country || 'Bangladesh');
            setPropAddress(p.address || 'Plot 12, Road 45, Gulshan-2, Dhaka');
            setPropPhone(p.phone || '+880 2 9882200');
            setPropEmail(p.email || 'dhaka@grandhospitality.com');
        }

        try {
            const savedRaw = localStorage.getItem(`hotel_unified_settings_prop_${p?.id || 1}`);
            if (savedRaw) {
                const parsed = JSON.parse(savedRaw);
                if (parsed.settings) {
                    setSettings({
                        ...getDefaultUnifiedSettings(p),
                        ...parsed.settings,
                        baseCurrency: p?.currency || parsed.settings.baseCurrency || 'BDT',
                        checkInTime: p?.check_in_time || parsed.settings.checkInTime || '14:00',
                        checkOutTime: p?.check_out_time || parsed.settings.checkOutTime || '12:00'
                    });
                }
                if (Array.isArray(parsed.bankAccounts)) setBankAccounts(parsed.bankAccounts);
                if (Array.isArray(parsed.posOutlets)) setPosOutlets(parsed.posOutlets);
                if (Array.isArray(parsed.contacts)) setContacts(parsed.contacts);
                if (Array.isArray(parsed.emergencyLines)) setEmergencyLines(parsed.emergencyLines);
                if (parsed.amenities) setAmenities(parsed.amenities);
                if (Array.isArray(parsed.socialLinks)) setSocialLinks(parsed.socialLinks);
                else if (Array.isArray(parsed.settings?.socialLinks)) setSocialLinks(parsed.settings.socialLinks);
            } else {
                setSettings(getDefaultUnifiedSettings(p));
            }
        } catch {
            // fallback
        }
    }, [activeProperty, initialData, isCreateMode]);

    const toggleAmenity = (key: string) => {
        setAmenities(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleWeekendDay = (day: string) => {
        setSettings(prev => {
            const exists = prev.weekends.includes(day);
            const next = exists ? prev.weekends.filter(d => d !== day) : [...prev.weekends, day];
            return { ...prev, weekends: next };
        });
    };

    const handleSave = async (saveType: 'draft' | 'publish') => {
        if (!propName.trim()) {
            showToast('Hotel Name is required!', { type: 'error' });
            return;
        }
        setIsSaving(true);
        try {
            const baseUrl = getApiBaseUrl();
            const starRatingNum = propGrade.includes('5') ? 5 : propGrade.includes('4') ? 4 : propGrade.includes('3') ? 3 : 5;
            const currencyCode = settings.baseCurrency.slice(0, 3).toUpperCase();
            const timeZoneClean = settings.timezone.split(' ')[0] || 'Asia/Dhaka';

            const fbUrl = socialLinks.find(s => s.platform.toLowerCase().includes('facebook'))?.url || settings.facebookUrl || '';
            const igUrl = socialLinks.find(s => s.platform.toLowerCase().includes('instagram'))?.url || settings.instagramUrl || '';
            const taUrl = socialLinks.find(s => s.platform.toLowerCase().includes('tripadvisor'))?.url || settings.tripAdvisorUrl || '';
            const mergedSettings = {
                ...settings,
                facebookUrl: fbUrl,
                instagramUrl: igUrl,
                tripAdvisorUrl: taUrl,
                socialLinks
            };

            if (isCreateMode) {
                const res = await fetch(`${baseUrl}/api/properties`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: propName.trim(),
                        code: propCode.trim() || propName.slice(0, 3).toUpperCase(),
                        propertyType: propType.toUpperCase(),
                        starRating: starRatingNum,
                        totalRooms: Number(propRooms) || 34,
                        city: propCity.trim(),
                        country: propCountry.trim(),
                        address: propAddress.trim(),
                        phone: propPhone.trim(),
                        email: propEmail.trim(),
                        currency: currencyCode,
                        timeZone: timeZoneClean,
                        checkInTime: settings.checkInTime,
                        checkOutTime: settings.checkOutTime,
                        status: saveType === 'publish' ? 'ACTIVE' : 'DRAFT'
                    })
                });
                const data = await res.json();
                if (data.success) {
                    const createdId = data.data?.id || 1;
                    localStorage.setItem(
                        `hotel_unified_settings_prop_${createdId}`,
                        JSON.stringify({ settings: mergedSettings, bankAccounts, posOutlets, contacts, emergencyLines, amenities, socialLinks })
                    );
                    showToast(`Property "${propName}" created successfully!`, { type: 'success' });
                    await refreshProperties();
                    if (data.data?.id) {
                        setActivePropertyId(data.data.id);
                    }
                    if (onBack) setTimeout(() => onBack(), 400);
                    setIsSaving(false);
                    return;
                }
            } else {
                const propId = targetProperty?.id || 1;
                const res = await fetch(`${baseUrl}/api/properties/${propId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: propName.trim(),
                        code: propCode.trim(),
                        propertyType: propType.toUpperCase(),
                        starRating: starRatingNum,
                        city: propCity.trim(),
                        country: propCountry.trim(),
                        address: propAddress.trim(),
                        phone: propPhone.trim(),
                        email: propEmail.trim(),
                        currency: currencyCode,
                        timeZone: timeZoneClean,
                        checkInTime: settings.checkInTime,
                        checkOutTime: settings.checkOutTime,
                        settings: {
                            ...mergedSettings,
                            bankAccounts,
                            posOutlets,
                            contacts,
                            emergencyLines,
                            amenities,
                            socialLinks,
                            updatedAt: new Date().toISOString()
                        }
                    })
                });

                localStorage.setItem(
                    propStorageKey,
                    JSON.stringify({
                        settings: mergedSettings,
                        bankAccounts,
                        posOutlets,
                        contacts,
                        emergencyLines,
                        amenities,
                        socialLinks,
                        updatedAt: new Date().toISOString()
                    })
                );
                localStorage.setItem('hotel_general_settings_v1', JSON.stringify(settings));

                await res.json().catch(() => null);
                await refreshProperties();

                showToast(
                    saveType === 'publish'
                        ? `Settings saved and published for "${propName}"!`
                        : `Draft saved for "${propName}".`,
                    { type: 'success' }
                );
            }
        } catch {
            localStorage.setItem(
                propStorageKey,
                JSON.stringify({ settings, bankAccounts, posOutlets, contacts, emergencyLines, amenities })
            );
            showToast(`Settings saved for "${propName}".`, { type: 'success' });
        } finally {
            setIsSaving(false);
        }
    };

    // Standard Hospitality Left Sidebar Navigation (Exact /edit-property Style)
    const tabs = [
        { id: 'identity', label: 'Property & Location', icon: <Building2 size={15} /> },
        { id: 'operations', label: 'Operations & Policies', icon: <Clock size={15} /> },
        { id: 'finance', label: 'Finance & Taxes', icon: <CreditCard size={15} /> },
        { id: 'numbering', label: 'Folio & Numbering', icon: <Receipt size={15} /> },
        { id: 'system', label: 'System & Channels', icon: <Monitor size={15} /> },
        { id: 'communication', label: 'Email & SMS', icon: <Mail size={15} /> },
        { id: 'branding', label: 'Branding & Contacts', icon: <User size={15} /> },
        { id: 'backup', label: 'Backup & Security', icon: <ShieldCheck size={15} /> }
    ];

    const pillars = [
        { id: 'booking', label: 'Booking & Cancellation', icon: <Calendar size={13} /> },
        { id: 'corporate', label: 'Corporate & Groups', icon: <Briefcase size={13} /> },
        { id: 'revenue', label: 'Inventory & Waitlist', icon: <Zap size={13} /> },
        { id: 'arrival', label: 'Check-In & Check-Out', icon: <LogIn size={13} /> },
        { id: 'occupancy', label: 'Guest & Visitor Rules', icon: <User size={13} /> },
        { id: 'finance_sec', label: 'Deposits & Cashier', icon: <DollarSign size={13} /> },
        { id: 'ops', label: 'House Rules & Meals', icon: <Settings size={13} /> },
        { id: 'legal', label: 'Privacy & Compliance', icon: <Shield size={13} /> }
    ];

    // Exact /edit-property Helper Components
    const SectionTitle = ({ icon: Icon, title }: { icon: any; title: string }) => (
        <div className="flex items-center gap-2 mb-3.5 pb-1.5 border-b border-gray-100">
            <Icon size={15} className="text-blue-600" />
            <h3 className="text-xs text-gray-800 uppercase tracking-tight">{title}</h3>
        </div>
    );

    const FormField = ({ label, required, hint, children }: any) => (
        <div className="space-y-1 flex flex-col">
            <label className="text-[11px] text-gray-600 ml-0.5">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {hint && <span className="text-[10px] text-gray-400 ml-0.5">{hint}</span>}
        </div>
    );

    const Input = (props: any) => (
        <input
            {...props}
            className={`w-full h-8 px-3 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-300 text-gray-800 ${props.className || ''}`}
        />
    );

    const Select = (props: any) => (
        <select
            {...props}
            className={`w-full h-8 px-2.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer text-gray-800 ${props.className || ''}`}
        >
            {props.children}
        </select>
    );

    const Checkbox = ({ label, checked, onChange, sub }: any) => (
        <label className="flex items-start gap-2.5 cursor-pointer group p-1.5 hover:bg-gray-50/80 rounded-lg transition-all select-none">
            <div
                className={`mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
                    checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300 group-hover:border-blue-400'
                }`}
            >
                {checked && <div className="w-1 h-2 border-r-2 border-b-2 border-white rotate-45 mb-0.5" />}
            </div>
            <input type="checkbox" className="hidden" checked={checked} onChange={onChange} />
            <div className="flex flex-col min-w-0">
                <span className={`text-[11.5px] ${checked ? 'text-blue-700' : 'text-gray-700'}`}>
                    {label}
                </span>
                {sub && <span className="text-[10px] text-gray-400 leading-tight font-medium mt-0.5">{sub}</span>}
            </div>
        </label>
    );

    const PillarButton = ({ pillar }: any) => (
        <button
            type="button"
            onClick={() => setActivePolicyPillar(pillar.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[10.5px] tracking-wide transition-all text-left cursor-pointer ${
                activePolicyPillar === pillar.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-white hover:text-gray-900'
            }`}
        >
            {pillar.icon} <span className="truncate">{pillar.label}</span>
        </button>
    );

    return (
        <div className="min-h-screen bg-[#f8f9fc] text-slate-700 font-sans">
            {/* ============================================================================
                SLIM STICKY HEADER (Exact /edit-property: Manage Property Style)
               ============================================================================ */}
            <header className="bg-white border-b border-gray-200/90 px-3 py-1.5 flex justify-between items-center gap-2.5 sticky top-0 z-30">
                <div className="flex items-center gap-2.5 min-w-0">
                    {onBack && (
                        <button
                            type="button"
                            onClick={onBack}
                            className="h-7 w-7 rounded-lg hover:bg-gray-100 border border-gray-200 flex items-center justify-center transition-all cursor-pointer shrink-0"
                            title="Back"
                        >
                            <ArrowLeft size={13} className="text-gray-500" />
                        </button>
                    )}
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                {isCreateMode ? 'Add New Property' : `Manage Property: ${propName}`}
                            </h1>
                            {propCode && (
                                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[8.5px] font-mono leading-none">
                                    {propCode}
                                </span>
                            )}
                            <span className="px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-200 rounded text-[8.5px] font-bold leading-none">
                                {propGrade}
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5">
                            Hotel Profile, Operational Policies &amp; General Settings
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {!isCreateMode && onNavigate && (
                        <button
                            type="button"
                            onClick={() => onNavigate('hotel-info')}
                            className="btn-secondary"
                            title="View Read-Only Hotel Profile"
                        >
                            <Eye size={13} className="text-slate-500" />
                            <span>View Profile</span>
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleSave('draft')}
                        disabled={isSaving}
                        className="btn-secondary"
                    >
                        Save Draft
                    </button>
                    <button
                        type="button"
                        onClick={() => handleSave('publish')}
                        disabled={isSaving}
                        className="btn-primary"
                    >
                        <CheckCircle2 size={14} />
                        <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
                    </button>
                </div>
            </header>

            {/* ============================================================================
                TWO-COLUMN MANAGE PROPERTY LAYOUT (Exact /edit-property Style)
               ============================================================================ */}
            <main className="max-w-[1500px] mx-auto p-3 sm:p-4 lg:p-5 flex flex-col lg:flex-row gap-4 items-start">
                {/* Left Sidebar Nav */}
                <aside className="w-full lg:w-60 flex-shrink-0">
                    <nav className="bg-white rounded-xl border border-gray-200 p-1.5 shadow-2xs sticky top-16 space-y-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs transition-all text-left cursor-pointer ${
                                    activeTab === tab.id
                                        ? 'bg-primary-subtle text-primary border-l-4 border-primary'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                            >
                                <span className={activeTab === tab.id ? 'text-primary' : 'text-gray-400'}>
                                    {tab.icon}
                                </span>
                                <span className="truncate">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </aside>

                {/* Right Content Card */}
                <div className="flex-1 w-full bg-white rounded-xl border border-gray-200 shadow-2xs min-h-[680px] overflow-hidden flex flex-col">
                    {/* ========================================================================
                        TAB 1: PROPERTY & LOCATION
                       ======================================================================== */}
                    {activeTab === 'identity' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <SectionTitle icon={Building2} title="General Information" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Hotel Name" required>
                                        <Input
                                            value={propName}
                                            onChange={(e: any) => setPropName(e.target.value)}
                                            placeholder="Official Hotel Name"
                                        />
                                    </FormField>
                                    <FormField label="Company / Legal Name">
                                        <Input
                                            value={settings.legalEntity}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, legalEntity: e.target.value })
                                            }
                                            placeholder="Registered Company Name"
                                        />
                                    </FormField>
                                    <FormField label="Property Code" required>
                                        <Input
                                            value={propCode}
                                            onChange={(e: any) => setPropCode(e.target.value.toUpperCase())}
                                            placeholder="e.g. GPD"
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <FormField label="Property Type">
                                        <Select value={propType} onChange={(e: any) => setPropType(e.target.value)}>
                                            <option value="Hotel">Hotel</option>
                                            <option value="Resort">Resort</option>
                                            <option value="Apartment">Serviced Apartment</option>
                                            <option value="Boutique">Boutique Hotel</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Star Rating">
                                        <Select value={propGrade} onChange={(e: any) => setPropGrade(e.target.value)}>
                                            <option value="5 Star">5 Star</option>
                                            <option value="4 Star">4 Star</option>
                                            <option value="3 Star">3 Star</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Total Rooms" required>
                                        <Input
                                            type="number"
                                            value={propRooms}
                                            onChange={(e: any) => setPropRooms(Number(e.target.value))}
                                        />
                                    </FormField>
                                    <FormField label="Established Year">
                                        <Input
                                            value={settings.establishedYear}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, establishedYear: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Default Nationality">
                                        <Select
                                            value={settings.defaultNationality}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, defaultNationality: e.target.value })
                                            }
                                        >
                                            <option value="Bangladeshi">Bangladeshi</option>
                                            <option value="American">American</option>
                                            <option value="British">British</option>
                                            <option value="Indian">Indian</option>
                                        </Select>
                                    </FormField>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Globe} title="Regional & Localization Settings" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Time Zone" required>
                                        <Select
                                            value={settings.timezone}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, timezone: e.target.value })
                                            }
                                        >
                                            <option value="Asia/Dhaka (GMT+06:00)">Asia/Dhaka (GMT+06:00)</option>
                                            <option value="Asia/Kolkata (GMT+05:30)">Asia/Kolkata (GMT+05:30)</option>
                                            <option value="Asia/Dubai (GMT+04:00)">Asia/Dubai (GMT+04:00)</option>
                                            <option value="Europe/London (GMT+00:00)">Europe/London (GMT+00:00)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Date Format">
                                        <Select
                                            value={settings.dateFormat}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, dateFormat: e.target.value })
                                            }
                                        >
                                            <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 25/10/2026)</option>
                                            <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601)</option>
                                            <option value="MM/DD/YYYY">MM/DD/YYYY (US Format)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Time Format">
                                        <Select
                                            value={settings.timeFormat}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, timeFormat: e.target.value })
                                            }
                                        >
                                            <option value="12-Hour (AM/PM)">12-Hour (AM/PM)</option>
                                            <option value="24-Hour">24-Hour (14:00)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Fiscal Year">
                                        <Select
                                            value={settings.fiscalYearStart}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, fiscalYearStart: e.target.value })
                                            }
                                        >
                                            <option value="July - June">July - June (Bangladesh)</option>
                                            <option value="January - December">January - December</option>
                                            <option value="April - March">April - March</option>
                                        </Select>
                                    </FormField>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={MapPin} title="Location & Contact Details" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <div className="md:col-span-2 lg:col-span-4">
                                        <FormField label="Street Address" required>
                                            <Input
                                                value={propAddress}
                                                onChange={(e: any) => setPropAddress(e.target.value)}
                                                placeholder="Plot, Road, Area..."
                                            />
                                        </FormField>
                                    </div>
                                    <FormField label="City" required>
                                        <Input value={propCity} onChange={(e: any) => setPropCity(e.target.value)} />
                                    </FormField>
                                    <FormField label="State / Division">
                                        <Input
                                            value={settings.stateProvince}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, stateProvince: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Postal / Zip Code">
                                        <Input
                                            value={settings.zipCode}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, zipCode: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Country" required>
                                        <Input
                                            value={propCountry}
                                            onChange={(e: any) => setPropCountry(e.target.value)}
                                        />
                                    </FormField>
                                    <FormField label="Phone Number" required>
                                        <Input value={propPhone} onChange={(e: any) => setPropPhone(e.target.value)} />
                                    </FormField>
                                    <FormField label="Reservations Email" required>
                                        <Input
                                            type="email"
                                            value={propEmail}
                                            onChange={(e: any) => setPropEmail(e.target.value)}
                                        />
                                    </FormField>
                                    <FormField label="Official Website">
                                        <Input
                                            value={settings.website}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, website: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Map Coordinates (Lat / Long)">
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <Input
                                                value={settings.latitude}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, latitude: e.target.value })
                                                }
                                                placeholder="Lat"
                                            />
                                            <Input
                                                value={settings.longitude}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, longitude: e.target.value })
                                                }
                                                placeholder="Long"
                                            />
                                        </div>
                                    </FormField>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Zap} title="Hotel Amenities & Facilities" />
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {Object.entries(amenities).map(([key, checked]) => (
                                        <Checkbox
                                            key={key}
                                            label={key}
                                            checked={checked}
                                            onChange={() => toggleAmenity(key)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Briefcase} title="Corporate Head Office & Property Description" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                    <FormField label="Head Office Address">
                                        <Input
                                            value={settings.corporateAddress}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, corporateAddress: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Corporate Phone">
                                        <Input
                                            value={settings.corporatePhone}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, corporatePhone: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Corporate Email">
                                        <Input
                                            type="email"
                                            value={settings.corporateEmail}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, corporateEmail: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <div className="md:col-span-3">
                                        <FormField label="Property Description">
                                            <textarea
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs min-h-[56px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                                                value={settings.description}
                                                onChange={e =>
                                                    setSettings({ ...settings, description: e.target.value })
                                                }
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 2: OPERATIONS & POLICIES (Exact /edit-property Inner Pillar Layout)
                       ======================================================================== */}
                    {activeTab === 'operations' && (
                        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                            {/* Inner Pillar Nav */}
                            <div className="w-full md:w-56 bg-gray-50/90 border-b md:border-b-0 md:border-r border-gray-100 p-2.5 space-y-1 flex-shrink-0">
                                <p className="px-2.5 py-1 text-[9.5px] font-black text-gray-400 uppercase tracking-widest">
                                    Operational Policies
                                </p>
                                {pillars.map(pillar => (
                                    <PillarButton key={pillar.id} pillar={pillar} />
                                ))}
                            </div>

                            {/* Inner Pillar Content */}
                            <div className="flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto space-y-6 animate-in fade-in duration-150">
                                {/* Standard Timings & Night Audit Schedule always accessible at top of Operations */}
                                <div className="bg-slate-50/70 p-4 rounded-xl border border-gray-200/80 space-y-3.5">
                                    <SectionTitle icon={Clock} title="Front Desk Timings & Night Audit Schedule" />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                        <FormField label="Check-In Time" hint="Standard arrival time">
                                            <Input
                                                type="time"
                                                value={settings.checkInTime}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, checkInTime: e.target.value })
                                                }
                                            />
                                        </FormField>
                                        <FormField label="Check-Out Time" hint="Standard departure time">
                                            <Input
                                                type="time"
                                                value={settings.checkOutTime}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, checkOutTime: e.target.value })
                                                }
                                            />
                                        </FormField>
                                        <FormField label="Hold Release Cutoff" hint="Unconfirmed reservation release">
                                            <Input
                                                type="time"
                                                value={settings.autoReleaseHour}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, autoReleaseHour: e.target.value })
                                                }
                                            />
                                        </FormField>
                                        <FormField label="Night Audit Time" hint="Scheduled daily rollover">
                                            <Input
                                                type="time"
                                                value={settings.nightAuditTime}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, nightAuditTime: e.target.value })
                                                }
                                            />
                                        </FormField>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                        <Checkbox
                                            label="Auto-Post Daily Room Charges & Taxes"
                                            sub="Automatically post room tariff & VAT to in-house folios during Night Audit"
                                            checked={settings.autoPostRoomCharges}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    autoPostRoomCharges: !settings.autoPostRoomCharges
                                                })
                                            }
                                        />
                                        <Checkbox
                                            label="Auto-Advance Business Date After Audit"
                                            sub="Automatically roll over system business date upon Night Audit completion"
                                            checked={settings.autoAdvanceBusinessDate}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    autoAdvanceBusinessDate: !settings.autoAdvanceBusinessDate
                                                })
                                            }
                                        />
                                    </div>
                                </div>

                                {activePolicyPillar === 'booking' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Calendar} title="1. Booking & Cancellation Policies" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Cancellation Policy">
                                                <Select
                                                    value={settings.cancellationRule}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, cancellationRule: e.target.value })
                                                    }
                                                >
                                                    <option value="Flexible (24 Hours Prior)">Flexible (24 Hours Prior)</option>
                                                    <option value="Flexible (48 Hours Prior)">Flexible (48 Hours Prior)</option>
                                                    <option value="Moderate (72 Hours Prior)">Moderate (72 Hours Prior)</option>
                                                    <option value="Non-Refundable">Non-Refundable</option>
                                                </Select>
                                            </FormField>
                                            <FormField label="No-Show Charge">
                                                <Select
                                                    value={settings.noShowPolicy}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, noShowPolicy: e.target.value })
                                                    }
                                                >
                                                    <option value="First Night Charge (100%)">First Night Charge (100%)</option>
                                                    <option value="Full Stay Charge (100%)">Full Stay Charge (100%)</option>
                                                    <option value="Flat Fee (৳ 3,500)">Flat Fee (৳ 3,500)</option>
                                                </Select>
                                            </FormField>
                                            <div className="md:col-span-2">
                                                <FormField label="Cancellation Terms (Printed on Confirmation Vouchers)">
                                                    <textarea
                                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs min-h-[60px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                                                        value={settings.cancellationText}
                                                        onChange={e =>
                                                            setSettings({
                                                                ...settings,
                                                                cancellationText: e.target.value
                                                            })
                                                        }
                                                    />
                                                </FormField>
                                            </div>
                                        </div>
                                        <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 space-y-2.5">
                                            <p className="text-[10px] text-blue-800 uppercase">
                                                Booking Guarantee & Grace Period
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                                <Checkbox
                                                    label="Allow Cancellation Grace Period"
                                                    sub="Waive fee for bookings cancelled immediately after creation"
                                                    checked={settings.allowGracePeriod}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            allowGracePeriod: !settings.allowGracePeriod
                                                        })
                                                    }
                                                />
                                                <FormField label="Grace Period (Hours)">
                                                    <Input
                                                        type="number"
                                                        value={settings.gracePeriodHours}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                gracePeriodHours: Number(e.target.value)
                                                            })
                                                        }
                                                    />
                                                </FormField>
                                                <Checkbox
                                                    label="Require Guarantee for All Bookings"
                                                    sub="Mandatory advance deposit or card guarantee"
                                                    checked={settings.requireBookingGuarantee}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            requireBookingGuarantee: !settings.requireBookingGuarantee
                                                        })
                                                    }
                                                />
                                                <Checkbox
                                                    label="Auto-Charge No-Show During Night Audit"
                                                    sub="Post penalty charge automatically on audit rollover"
                                                    checked={settings.autoChargeNoShow}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            autoChargeNoShow: !settings.autoChargeNoShow
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'corporate' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Briefcase} title="2. Corporate & Group Reservations" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Default City Ledger Credit Limit (BDT ৳)">
                                                <Input
                                                    type="number"
                                                    value={settings.cityLedgerLimitBDT}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            cityLedgerLimitBDT: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Travel Agency Commission (%)">
                                                <Input
                                                    type="number"
                                                    value={settings.agencyCommissionPct}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            agencyCommissionPct: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Group Booking Minimum Rooms">
                                                <Input
                                                    type="number"
                                                    value={settings.groupDefinitionRooms}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            groupDefinitionRooms: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Group Deposit Terms">
                                                <Input
                                                    value={settings.groupDepositTerms}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            groupDepositTerms: e.target.value
                                                        })
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                        <Checkbox
                                            label="Allow Direct Bill-to-Company (City Ledger)"
                                            sub="Enable credit settlement for approved corporate accounts"
                                            checked={settings.allowBillToCompany}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    allowBillToCompany: !settings.allowBillToCompany
                                                })
                                            }
                                        />
                                    </div>
                                )}

                                {activePolicyPillar === 'revenue' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Zap} title="3. Inventory, Weekend Tariff & Waitlist Rules" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Waitlist Expiry (Days)">
                                                <Input
                                                    type="number"
                                                    value={settings.waitlistRetentionDays}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            waitlistRetentionDays: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Overbooking Limit">
                                                <Input
                                                    value={settings.overbookingLimit}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            overbookingLimit: e.target.value
                                                        })
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                        <div>
                                            <label className="text-[11px] text-gray-600 block mb-1.5">
                                                Weekend Tariff Days
                                            </label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {['Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                                    const active = settings.weekends.includes(day);
                                                    return (
                                                        <button
                                                            key={day}
                                                            type="button"
                                                            onClick={() => toggleWeekendDay(day)}
                                                            className={`px-3 py-1 rounded-lg text-xs border transition cursor-pointer ${
                                                                active
                                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                                            }`}
                                                        >
                                                            {day}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <Checkbox
                                            label="Allow Overbooking"
                                            sub="Keep unchecked to enforce strict zero-overbooking protection"
                                            checked={settings.allowOverbooking}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    allowOverbooking: !settings.allowOverbooking
                                                })
                                            }
                                        />
                                        <div className="bg-[#fff9e6] p-3.5 rounded-xl border border-[#ffeeba] space-y-2">
                                            <div className="flex items-center gap-1.5 text-[#856404] uppercase text-[10px]">
                                                <AlertCircle size={13} /> Waitlist Automation
                                            </div>
                                            <Checkbox
                                                label="Enable Priority Waitlist"
                                                sub="Automatically notify waitlisted guests when a room cancellation occurs"
                                                checked={settings.enableDynamicWaitlist}
                                                onChange={() =>
                                                    setSettings({
                                                        ...settings,
                                                        enableDynamicWaitlist: !settings.enableDynamicWaitlist
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'arrival' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={LogIn} title="4. Early Check-In & Early Departure Rules" />
                                        <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-100 space-y-2.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                                Early Check-In Charges
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                <FormField label="Before 06:00 AM">
                                                    <Select
                                                        value={settings.earlyCheckinBefore6}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                earlyCheckinBefore6: e.target.value
                                                            })
                                                        }
                                                    >
                                                        <option value="Full Night Charge">Full Night Charge</option>
                                                        <option value="50% Half-Night Charge">50% Half-Night Charge</option>
                                                    </Select>
                                                </FormField>
                                                <FormField label="06:00 AM - 10:00 AM">
                                                    <Select
                                                        value={settings.earlyCheckin6To10}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                earlyCheckin6To10: e.target.value
                                                            })
                                                        }
                                                    >
                                                        <option value="50% Half-Night Charge">50% Half-Night Charge</option>
                                                        <option value="Flat Fee (৳ 1,500)">Flat Fee (৳ 1,500)</option>
                                                    </Select>
                                                </FormField>
                                                <FormField label="10:00 AM - 02:00 PM">
                                                    <Select
                                                        value={settings.earlyCheckin10To13}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                earlyCheckin10To13: e.target.value
                                                            })
                                                        }
                                                    >
                                                        <option value="Complimentary (If Room Ready)">
                                                            Complimentary (If Room Ready)
                                                        </option>
                                                        <option value="Flat Fee (৳ 1,000)">Flat Fee (৳ 1,000)</option>
                                                    </Select>
                                                </FormField>
                                            </div>
                                        </div>
                                        <div className="p-3.5 bg-red-50/40 rounded-xl border border-red-100 space-y-2.5">
                                            <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                                Early Departure Policy
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <FormField label="Early Checkout Penalty">
                                                    <Select
                                                        value={settings.earlyDeparturePenalty}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                earlyDeparturePenalty: e.target.value
                                                            })
                                                        }
                                                    >
                                                        <option value="Next Night Charge">Next Night Charge</option>
                                                        <option value="Full Stay Charge">Full Stay Charge</option>
                                                        <option value="No Penalty">No Penalty</option>
                                                    </Select>
                                                </FormField>
                                                <Checkbox
                                                    label="Allow Manager Override"
                                                    sub="Duty Manager can waive early checkout penalty with reason"
                                                    checked={settings.allowManagerFeeWaiver}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            allowManagerFeeWaiver: !settings.allowManagerFeeWaiver
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'occupancy' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={User} title="5. Guest Age, Child & Visitor Rules" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Minimum Check-In Age (Years)">
                                                <Input
                                                    type="number"
                                                    value={settings.minPrimaryGuestAge}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            minPrimaryGuestAge: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Child Age Limit (Years)">
                                                <Input
                                                    type="number"
                                                    value={settings.childAgeThreshold}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            childAgeThreshold: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Child Stay Policy">
                                                <Input
                                                    value={settings.childStayPolicy}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            childStayPolicy: e.target.value
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Visitor ID Requirement">
                                                <Select
                                                    value={settings.visitorIdentityRule}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            visitorIdentityRule: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="Photo ID (NID / Passport) Required at Front Desk">
                                                        Photo ID (NID / Passport) Required
                                                    </option>
                                                    <option value="Lobby Meetings Only">Lobby Meetings Only</option>
                                                </Select>
                                            </FormField>
                                        </div>
                                        <Checkbox
                                            label="Enforce 10:00 PM Visitor Curfew"
                                            sub="Visitors must leave guest rooms by 10:00 PM"
                                            checked={settings.enforceVisitorCurfew}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    enforceVisitorCurfew: !settings.enforceVisitorCurfew
                                                })
                                            }
                                        />
                                    </div>
                                )}

                                {activePolicyPillar === 'finance_sec' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={DollarSign} title="6. Security Deposits & Cashier Limits" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                            <FormField label="Security Deposit Mode">
                                                <Select
                                                    value={settings.securityDepositLogic}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            securityDepositLogic: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="Fixed Amount (BDT ৳)">Fixed Amount (BDT ৳)</option>
                                                    <option value="Percentage of Stay Total">% of Stay Total</option>
                                                </Select>
                                            </FormField>
                                            <FormField label="Default Deposit Amount (৳)">
                                                <Input
                                                    type="number"
                                                    value={settings.securityDepositAmountBDT}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            securityDepositAmountBDT: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Cashier Adjustment Limit (৳)">
                                                <Input
                                                    type="number"
                                                    value={settings.staffAdjustmentLimitBDT}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            staffAdjustmentLimitBDT: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Tax Adjustment on Discount">
                                                <Select
                                                    value={settings.taxAdjustmentMode}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            taxAdjustmentMode: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="Auto-Recalculate Tax with Tariff">
                                                        Auto-Recalculate Tax with Tariff
                                                    </option>
                                                    <option value="Manual Adjustment">Manual Adjustment</option>
                                                </Select>
                                            </FormField>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-xl text-white space-y-2.5">
                                            <div className="flex items-center gap-2">
                                                <ShieldAlert className="text-amber-400" size={15} />
                                                <span className="text-xs uppercase tracking-tight">
                                                    Cashier Audit Controls
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <Checkbox
                                                    label="Separate Deposit Ledger"
                                                    sub="Keep refundable deposits separate from room revenue"
                                                    checked={settings.enableDepositLedger}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            enableDepositLedger: !settings.enableDepositLedger
                                                        })
                                                    }
                                                />
                                                <Checkbox
                                                    label="Manager Approval for Refunds"
                                                    sub="Requires Manager/Accountant sign-off for cash refunds"
                                                    checked={settings.strictRefundApproval}
                                                    onChange={() =>
                                                        setSettings({
                                                            ...settings,
                                                            strictRefundApproval: !settings.strictRefundApproval
                                                        })
                                                    }
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'ops' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={Settings} title="7. House Rules, Smoking & Meal Plans" />
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                            <FormField label="Meal Plan Sync">
                                                <Select
                                                    value={settings.mealPlanSyncMode}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            mealPlanSyncMode: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="Sync with Restaurant POS & KOT">
                                                        Sync with Restaurant POS & KOT
                                                    </option>
                                                    <option value="Printed Meal Vouchers">Printed Meal Vouchers</option>
                                                </Select>
                                            </FormField>
                                            <FormField label="Extra Parking Charge (৳)">
                                                <Input
                                                    type="number"
                                                    value={settings.parkingSurchargeBDT}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            parkingSurchargeBDT: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Minibar Restock Mode">
                                                <Select
                                                    value={settings.minibarCheckinLogic}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            minibarCheckinLogic: e.target.value
                                                        })
                                                    }
                                                >
                                                    <option value="Daily Housekeeping Restock">
                                                        Daily Housekeeping Restock
                                                    </option>
                                                    <option value="Post-Departure Check">Post-Departure Check</option>
                                                </Select>
                                            </FormField>
                                            <div className="md:col-span-2">
                                                <FormField label="Smoking Policy">
                                                    <Input
                                                        value={settings.smokingPolicyText}
                                                        onChange={(e: any) =>
                                                            setSettings({
                                                                ...settings,
                                                                smokingPolicyText: e.target.value
                                                            })
                                                        }
                                                    />
                                                </FormField>
                                            </div>
                                            <FormField label="Pet Policy">
                                                <Input
                                                    value={settings.petPolicyText}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            petPolicyText: e.target.value
                                                        })
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                            <Checkbox
                                                label="Enforce Smoking Penalty"
                                                sub="Add cleaning fee and flag room for deep sanitization"
                                                checked={settings.enforceSmokingPenalty}
                                                onChange={() =>
                                                    setSettings({
                                                        ...settings,
                                                        enforceSmokingPenalty: !settings.enforceSmokingPenalty
                                                    })
                                                }
                                            />
                                            <Checkbox
                                                label="24-Hour DND Welfare Check"
                                                sub="Alert Housekeeping if room remains on DND for 24 hours"
                                                checked={settings.enableWelfareChecks}
                                                onChange={() =>
                                                    setSettings({
                                                        ...settings,
                                                        enableWelfareChecks: !settings.enableWelfareChecks
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                )}

                                {activePolicyPillar === 'legal' && (
                                    <div className="space-y-5">
                                        <SectionTitle icon={ShieldCheck} title="8. Legal, Licenses & Data Privacy" />
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                            <FormField label="Trade License No">
                                                <Input
                                                    value={settings.tradeLicenseNo}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, tradeLicenseNo: e.target.value })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Tourism License No">
                                                <Input
                                                    value={settings.tourismLicenseNo}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, tourismLicenseNo: e.target.value })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Police C-Form Reg ID">
                                                <Input
                                                    value={settings.policeCFormId}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, policeCFormId: e.target.value })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Fire Safety Certificate">
                                                <Input
                                                    value={settings.fireSafetyCertNo}
                                                    onChange={(e: any) =>
                                                        setSettings({ ...settings, fireSafetyCertNo: e.target.value })
                                                    }
                                                />
                                            </FormField>
                                            <FormField label="Guest Record Retention (Months)">
                                                <Input
                                                    type="number"
                                                    value={settings.gdprRetentionMonths}
                                                    onChange={(e: any) =>
                                                        setSettings({
                                                            ...settings,
                                                            gdprRetentionMonths: Number(e.target.value)
                                                        })
                                                    }
                                                />
                                            </FormField>
                                        </div>
                                        <div className="bg-red-50 p-3.5 rounded-xl border border-red-100 space-y-2">
                                            <div className="flex items-center gap-1.5 text-red-700 text-xs">
                                                <Zap size={13} /> Force Majeure Emergency Waiver
                                            </div>
                                            <Checkbox
                                                label="Enable Force Majeure Override"
                                                sub="Bypass standard cancellation fees during emergencies"
                                                checked={settings.forceMajeureOverride}
                                                onChange={() =>
                                                    setSettings({
                                                        ...settings,
                                                        forceMajeureOverride: !settings.forceMajeureOverride
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 3: FINANCE & TAXES
                       ======================================================================== */}
                    {activeTab === 'finance' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <SectionTitle icon={CreditCard} title="Currency, VAT & Tax Configuration" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Base Currency" required>
                                        <Select
                                            value={settings.baseCurrency}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, baseCurrency: e.target.value })
                                            }
                                        >
                                            <option value="BDT">BDT (৳ - Bangladeshi Taka)</option>
                                            <option value="USD">USD ($ - US Dollar)</option>
                                            <option value="EUR">EUR (€ - Euro)</option>
                                            <option value="GBP">GBP (£ - British Pound)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Decimal Places">
                                        <Select
                                            value={settings.decimalPlaces}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, decimalPlaces: Number(e.target.value) })
                                            }
                                        >
                                            <option value={2}>2 Decimals (৳ 1,500.00)</option>
                                            <option value={0}>0 Decimals (৳ 1,500)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="VAT / Tax Registration No (BIN)" required>
                                        <Input
                                            value={settings.taxIdNumber}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, taxIdNumber: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="Payment Gateway">
                                        <Select
                                            value={settings.creditCardGateway}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, creditCardGateway: e.target.value })
                                            }
                                        >
                                            <option value="SSLCommerz / City Bank POS">SSLCommerz / City Bank POS</option>
                                            <option value="Stripe">Stripe</option>
                                            <option value="PayPal">PayPal</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="VAT / GST (%)">
                                        <Input
                                            type="number"
                                            value={settings.vatPercentage}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, vatPercentage: Number(e.target.value) })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Service Charge (%)">
                                        <Input
                                            type="number"
                                            value={settings.serviceChargePercentage}
                                            onChange={(e: any) =>
                                                setSettings({
                                                    ...settings,
                                                    serviceChargePercentage: Number(e.target.value)
                                                })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Rounding Method">
                                        <Select
                                            value={settings.roundingRule}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, roundingRule: e.target.value })
                                            }
                                        >
                                            <option value="Nearest Whole Unit">Nearest Whole Unit</option>
                                            <option value="Round Up">Always Round Up</option>
                                            <option value="No Rounding">Exact Decimal (No Rounding)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Round Off Limit">
                                        <Input
                                            type="number"
                                            value={settings.roundOffLimit}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, roundOffLimit: Number(e.target.value) })
                                            }
                                        />
                                    </FormField>
                                </div>
                                <div className="flex flex-wrap gap-4 mt-3">
                                    <Checkbox
                                        label="Room Rates are Tax-Inclusive"
                                        sub="Calculate VAT and Service Charge inside the published room rate"
                                        checked={settings.isTaxInclusive}
                                        onChange={() =>
                                            setSettings({ ...settings, isTaxInclusive: !settings.isTaxInclusive })
                                        }
                                    />
                                    <Checkbox
                                        label="Add Round Off Adjustment to Bill"
                                        sub="Automatically adjust fractional rounding on final invoice"
                                        checked={settings.addRoundOffToRate}
                                        onChange={() =>
                                            setSettings({ ...settings, addRoundOffToRate: !settings.addRoundOffToRate })
                                        }
                                    />
                                </div>
                            </div>

                            {/* Foreign Currency Exchange Rates */}
                            <div>
                                <SectionTitle icon={DollarSign} title="Front Desk Foreign Exchange Rates (in BDT ৳)" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                                    <FormField label="USD ($) Buy / Sell Rate">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxUsdBuy}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxUsdBuy: Number(e.target.value) })
                                                }
                                            />
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxUsdSell}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxUsdSell: Number(e.target.value) })
                                                }
                                            />
                                        </div>
                                    </FormField>
                                    <FormField label="EUR (€) Buy / Sell Rate">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxEurBuy}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxEurBuy: Number(e.target.value) })
                                                }
                                            />
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxEurSell}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxEurSell: Number(e.target.value) })
                                                }
                                            />
                                        </div>
                                    </FormField>
                                    <FormField label="GBP (£) Buy / Sell Rate">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxGbpBuy}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxGbpBuy: Number(e.target.value) })
                                                }
                                            />
                                            <Input
                                                type="number"
                                                step="0.1"
                                                value={settings.fxGbpSell}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, fxGbpSell: Number(e.target.value) })
                                                }
                                            />
                                        </div>
                                    </FormField>
                                </div>
                            </div>

                            {/* Bank Accounts Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={15} className="text-blue-600" />
                                        <h3 className="text-xs text-gray-800 uppercase tracking-tight">
                                            Bank Accounts
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setBankAccounts(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now().toString(),
                                                    bankName: '',
                                                    accountName: propName,
                                                    accountNum: '',
                                                    swift: ''
                                                }
                                            ])
                                        }
                                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} /> Add Bank
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                    <table className="w-full border-spacing-x-2 border-separate text-xs">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Bank Name
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Account Name
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Account Number
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    SWIFT / Routing
                                                </th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bankAccounts.map((acc, idx) => (
                                                <tr key={acc.id}>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={acc.bankName}
                                                            onChange={(e: any) => {
                                                                const updated = [...bankAccounts];
                                                                updated[idx].bankName = e.target.value;
                                                                setBankAccounts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={acc.accountName}
                                                            onChange={(e: any) => {
                                                                const updated = [...bankAccounts];
                                                                updated[idx].accountName = e.target.value;
                                                                setBankAccounts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs font-mono"
                                                            value={acc.accountNum}
                                                            onChange={(e: any) => {
                                                                const updated = [...bankAccounts];
                                                                updated[idx].accountNum = e.target.value;
                                                                setBankAccounts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs font-mono"
                                                            value={acc.swift}
                                                            onChange={(e: any) => {
                                                                const updated = [...bankAccounts];
                                                                updated[idx].swift = e.target.value;
                                                                setBankAccounts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setBankAccounts(prev =>
                                                                    prev.filter(b => b.id !== acc.id)
                                                                )
                                                            }
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 4: FOLIO & NUMBERING
                       ======================================================================== */}
                    {activeTab === 'numbering' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <SectionTitle icon={Receipt} title="Document Numbering & Prefixes" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField
                                        label="Reservation Prefix"
                                        hint={`Sample: ${settings.reservationPrefix}00492`}
                                    >
                                        <Input
                                            value={settings.reservationPrefix}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, reservationPrefix: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <FormField label="Invoice Prefix" hint={`Sample: ${settings.invoicePrefix}01842`}>
                                        <Input
                                            value={settings.invoicePrefix}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, invoicePrefix: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <FormField label="Folio Prefix" hint={`Sample: ${settings.folioPrefix}8821`}>
                                        <Input
                                            value={settings.folioPrefix}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, folioPrefix: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <FormField label="KOT Prefix" hint={`Sample: ${settings.kotPrefix}3920`}>
                                        <Input
                                            value={settings.kotPrefix}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, kotPrefix: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <FormField label="Receipt Prefix" hint={`Sample: ${settings.receiptPrefix}1049`}>
                                        <Input
                                            value={settings.receiptPrefix}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, receiptPrefix: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <div className="flex items-center pt-4">
                                        <Checkbox
                                            label="Reset Sequences Annually"
                                            sub="Reset document counters to 00001 at the start of each fiscal year"
                                            checked={settings.resetAnnually}
                                            onChange={() =>
                                                setSettings({ ...settings, resetAnnually: !settings.resetAnnually })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={FileText} title="Invoice & Folio Terms" />
                                <FormField label="Invoice / Bill Footer Notes">
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs min-h-[70px] outline-none focus:ring-1 focus:ring-blue-500 text-gray-800"
                                        value={settings.invoiceNotes}
                                        onChange={e => setSettings({ ...settings, invoiceNotes: e.target.value })}
                                    />
                                </FormField>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 5: SYSTEM & CHANNELS
                       ======================================================================== */}
                    {activeTab === 'system' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <SectionTitle icon={Monitor} title="System & Hardware Interfaces" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Web Rate Mode">
                                        <Select
                                            value={settings.webRateMode}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, webRateMode: e.target.value })
                                            }
                                        >
                                            <option value="Dynamic BAR">Dynamic BAR</option>
                                            <option value="Fixed Seasonal">Fixed Seasonal</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Inventory Mode">
                                        <Select
                                            value={settings.webInventoryMode}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, webInventoryMode: e.target.value })
                                            }
                                        >
                                            <option value="Live Pooled Inventory">Live Pooled Inventory</option>
                                            <option value="Manual Override">Manual Override</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Key Card System">
                                        <Select
                                            value={settings.keyCardSystem}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, keyCardSystem: e.target.value })
                                            }
                                        >
                                            <option value="VingCard / ASSA ABLOY RFID">VingCard / ASSA ABLOY</option>
                                            <option value="Salto Space">Salto Space</option>
                                            <option value="Manual Keys">Manual Keys</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Channel Manager">
                                        <Select
                                            value={settings.channelManager}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, channelManager: e.target.value })
                                            }
                                        >
                                            <option value="SiteMinder 2-Way Sync">SiteMinder</option>
                                            <option value="Cloudbeds">Cloudbeds</option>
                                            <option value="STAAH">STAAH</option>
                                        </Select>
                                    </FormField>
                                </div>

                                <div className="mt-4">
                                    <p className="text-[11px] text-gray-600 mb-2 ml-0.5">Active PMS Modules</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                                        <Checkbox
                                            label="Front Office"
                                            checked={settings.moduleFrontOffice}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    moduleFrontOffice: !settings.moduleFrontOffice
                                                })
                                            }
                                        />
                                        <Checkbox
                                            label="POS & KDS"
                                            checked={settings.modulePos}
                                            onChange={() =>
                                                setSettings({ ...settings, modulePos: !settings.modulePos })
                                            }
                                        />
                                        <Checkbox
                                            label="Housekeeping"
                                            checked={settings.moduleHousekeeping}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    moduleHousekeeping: !settings.moduleHousekeeping
                                                })
                                            }
                                        />
                                        <Checkbox
                                            label="HR & Payroll"
                                            checked={settings.moduleHrPayroll}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    moduleHrPayroll: !settings.moduleHrPayroll
                                                })
                                            }
                                        />
                                        <Checkbox
                                            label="Banquets"
                                            checked={settings.moduleBanquets}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    moduleBanquets: !settings.moduleBanquets
                                                })
                                            }
                                        />
                                        <Checkbox
                                            label="Accounting"
                                            checked={settings.moduleAccounting}
                                            onChange={() =>
                                                setSettings({
                                                    ...settings,
                                                    moduleAccounting: !settings.moduleAccounting
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* GDS Codes */}
                            <div>
                                <SectionTitle icon={Globe} title="GDS Channel Identifiers" />
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
                                    <FormField label="Amadeus Code">
                                        <Input
                                            value={settings.gdsAmadeus}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, gdsAmadeus: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="Sabre Code">
                                        <Input
                                            value={settings.gdsSabre}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, gdsSabre: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="Galileo / Apollo Code">
                                        <Input
                                            value={settings.gdsGalileo}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, gdsGalileo: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="Worldspan Code">
                                        <Input
                                            value={settings.gdsWorldspan}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, gdsWorldspan: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                </div>
                            </div>

                            {/* POS Outlets Table */}
                            <div>
                                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Settings size={15} className="text-blue-600" />
                                        <h3 className="text-xs text-gray-800 uppercase tracking-tight">
                                            POS Outlets & Revenue Centers
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPosOutlets(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now().toString(),
                                                    name: 'New Outlet',
                                                    type: 'Restaurant',
                                                    hours: '07:00 AM - 11:00 PM',
                                                    capacity: '60 Seats',
                                                    posStation: 'KOT Station',
                                                    status: 'Active'
                                                }
                                            ])
                                        }
                                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} /> Add Outlet
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                    <table className="w-full border-spacing-x-2 border-separate text-xs">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Outlet Name
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Type
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Operating Hours
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Capacity
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    POS / KOT Station
                                                </th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posOutlets.map((outlet, idx) => (
                                                <tr key={outlet.id}>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={outlet.name}
                                                            onChange={(e: any) => {
                                                                const updated = [...posOutlets];
                                                                updated[idx].name = e.target.value;
                                                                setPosOutlets(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={outlet.type}
                                                            onChange={(e: any) => {
                                                                const updated = [...posOutlets];
                                                                updated[idx].type = e.target.value;
                                                                setPosOutlets(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={outlet.hours}
                                                            onChange={(e: any) => {
                                                                const updated = [...posOutlets];
                                                                updated[idx].hours = e.target.value;
                                                                setPosOutlets(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={outlet.capacity}
                                                            onChange={(e: any) => {
                                                                const updated = [...posOutlets];
                                                                updated[idx].capacity = e.target.value;
                                                                setPosOutlets(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs font-mono"
                                                            value={outlet.posStation}
                                                            onChange={(e: any) => {
                                                                const updated = [...posOutlets];
                                                                updated[idx].posStation = e.target.value;
                                                                setPosOutlets(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setPosOutlets(prev =>
                                                                    prev.filter(o => o.id !== outlet.id)
                                                                )
                                                            }
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 6: EMAIL & SMS
                       ======================================================================== */}
                    {activeTab === 'communication' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <div className="flex items-center justify-between mb-3.5 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Mail size={15} className="text-blue-600" />
                                        <h3 className="text-xs text-gray-800 uppercase tracking-tight">
                                            Email (SMTP) & SMS Gateway Configuration
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            showToast(
                                                `Test notification sent via ${settings.smsGatewayProvider} & ${settings.smtpHost}.`,
                                                { type: 'success' }
                                            )
                                        }
                                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Send size={12} /> Send Test SMS / Email
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                                    <FormField label="SMTP Host">
                                        <Input
                                            value={settings.smtpHost}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, smtpHost: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="SMTP Port">
                                        <Input
                                            value={settings.smtpPort}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, smtpPort: e.target.value })
                                            }
                                            className="font-mono"
                                        />
                                    </FormField>
                                    <FormField label="Sender Name">
                                        <Input
                                            value={settings.senderName}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, senderName: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="Sender Email">
                                        <Input
                                            type="email"
                                            value={settings.senderEmail}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, senderEmail: e.target.value })
                                            }
                                        />
                                    </FormField>
                                    <FormField label="SMS Gateway Provider">
                                        <Select
                                            value={settings.smsGatewayProvider}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, smsGatewayProvider: e.target.value })
                                            }
                                        >
                                            <option value="BulkSMS BD">BulkSMS BD</option>
                                            <option value="SSL Wireless">SSL Wireless</option>
                                            <option value="Twilio">Twilio</option>
                                            <option value="InfoBip">InfoBip</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="SMS Sender ID">
                                        <Input
                                            value={settings.smsSenderId}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, smsSenderId: e.target.value })
                                            }
                                            className="font-mono font-bold"
                                        />
                                    </FormField>
                                    <div className="sm:col-span-2 lg:col-span-3">
                                        <FormField label="SMS Gateway API Key">
                                            <Input
                                                value={settings.smsApiKey}
                                                onChange={(e: any) =>
                                                    setSettings({ ...settings, smsApiKey: e.target.value })
                                                }
                                                className="font-mono"
                                            />
                                        </FormField>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <SectionTitle icon={Zap} title="Automated Guest Notifications" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <Checkbox
                                        label="Check-In Welcome SMS"
                                        sub="Send welcome SMS with Wi-Fi details upon guest check-in"
                                        checked={settings.enableGuestWelcomeSms}
                                        onChange={() =>
                                            setSettings({
                                                ...settings,
                                                enableGuestWelcomeSms: !settings.enableGuestWelcomeSms
                                            })
                                        }
                                    />
                                    <Checkbox
                                        label="Auto-Email Folio on Checkout"
                                        sub="Email PDF invoice automatically when guest checks out"
                                        checked={settings.enableCheckoutFolioEmail}
                                        onChange={() =>
                                            setSettings({
                                                ...settings,
                                                enableCheckoutFolioEmail: !settings.enableCheckoutFolioEmail
                                            })
                                        }
                                    />
                                    <Checkbox
                                        label="WhatsApp Guest Concierge"
                                        sub="Enable WhatsApp alerts for booking confirmation and services"
                                        checked={settings.enableWhatsAppConcierge}
                                        onChange={() =>
                                            setSettings({
                                                ...settings,
                                                enableWhatsAppConcierge: !settings.enableWhatsAppConcierge
                                            })
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 7: BRANDING & CONTACTS
                       ======================================================================== */}
                    {activeTab === 'branding' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <SectionTitle icon={Image} title="Branding & Media Assets" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Primary Logo *', desc: 'Main Logo (Dashboard / Folio)' },
                                        { label: 'Report Header', desc: 'Invoice Header Banner' },
                                        { label: 'Report Footer', desc: 'Authorized Stamp Footer' },
                                        { label: 'Portal Cover', desc: 'Booking Engine Cover' }
                                    ].map(box => (
                                        <div key={box.label} className="space-y-1">
                                            <label className="text-[11px] text-gray-600 ml-0.5">
                                                {box.label}
                                            </label>
                                            <div className="border border-dashed border-gray-200 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 hover:border-blue-400 hover:bg-blue-50/20 transition-all cursor-pointer group">
                                                <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                                    <Image size={16} />
                                                </div>
                                                <p className="text-[9.5px] text-gray-400 uppercase tracking-wider text-center">
                                                    {box.desc}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Dynamic Official Social Media & Online Profiles */}
                                <div className="mt-5 pt-3.5 border-t border-gray-100">
                                    <div className="flex items-center justify-between mb-2.5 pb-1 border-b border-gray-100">
                                        <div>
                                            <h3 className="text-xs text-gray-800 uppercase tracking-tight font-bold flex items-center gap-1.5">
                                                <Globe size={14} className="text-blue-600" />
                                                <span>Official Social Media & Online Profiles</span>
                                            </h3>
                                            <p className="text-[10px] text-gray-400 mt-0.5">
                                                Add dynamic social channels, review platforms, and links for marketing and folio branding
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSocialLinks(prev => [
                                                    ...prev,
                                                    {
                                                        id: `soc-${Date.now()}`,
                                                        platform: 'Facebook',
                                                        url: '',
                                                        handle: ''
                                                    }
                                                ])
                                            }
                                            className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                                        >
                                            <Plus size={12} /> Add Social Link
                                        </button>
                                    </div>

                                    {socialLinks.length === 0 ? (
                                        <div className="py-4 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                            <p className="text-xs text-gray-400">No social media links configured yet.</p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSocialLinks([
                                                        { id: `soc-${Date.now()}-1`, platform: 'Facebook', url: '', handle: '@facebook' },
                                                        { id: `soc-${Date.now()}-2`, platform: 'Instagram', url: '', handle: '@instagram' },
                                                        { id: `soc-${Date.now()}-3`, platform: 'TripAdvisor', url: '', handle: '@tripadvisor' }
                                                    ]);
                                                }}
                                                className="mt-1.5 text-xs text-blue-600 hover:underline font-semibold cursor-pointer"
                                            >
                                                + Add Standard Channels (Facebook, Instagram, TripAdvisor)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                            <table className="w-full border-spacing-x-2 border-separate text-xs">
                                                <thead>
                                                    <tr className="text-left">
                                                        <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2 w-44">
                                                            Platform Channel
                                                        </th>
                                                        <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2 w-48">
                                                            Handle / Label
                                                        </th>
                                                        <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                            Direct URL
                                                        </th>
                                                        <th className="w-8"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {socialLinks.map((s, idx) => (
                                                        <tr key={s.id || idx}>
                                                            <td className="pb-1.5">
                                                                <select
                                                                    className="w-full h-7 py-0.5 px-2 text-xs bg-white border border-gray-200 rounded-md outline-none text-gray-800 font-semibold"
                                                                    value={s.platform}
                                                                    onChange={(e) => {
                                                                        const updated = [...socialLinks];
                                                                        updated[idx] = { ...updated[idx], platform: e.target.value };
                                                                        setSocialLinks(updated);
                                                                    }}
                                                                >
                                                                    <option value="Facebook">Facebook</option>
                                                                    <option value="Instagram">Instagram</option>
                                                                    <option value="TripAdvisor">TripAdvisor</option>
                                                                    <option value="YouTube">YouTube</option>
                                                                    <option value="LinkedIn">LinkedIn</option>
                                                                    <option value="X (Twitter)">X (Twitter)</option>
                                                                    <option value="TikTok">TikTok</option>
                                                                    <option value="Google Business">Google Maps / Business</option>
                                                                    <option value="WhatsApp">WhatsApp Concierge</option>
                                                                    <option value="Website">Official Website</option>
                                                                    <option value="Custom">Custom Channel</option>
                                                                </select>
                                                            </td>
                                                            <td className="pb-1.5">
                                                                <Input
                                                                    className="!h-7 !py-1 text-xs"
                                                                    placeholder="@hotelhandle"
                                                                    value={s.handle || ''}
                                                                    onChange={(e: any) => {
                                                                        const updated = [...socialLinks];
                                                                        updated[idx] = { ...updated[idx], handle: e.target.value };
                                                                        setSocialLinks(updated);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="pb-1.5">
                                                                <Input
                                                                    className="!h-7 !py-1 text-xs font-mono"
                                                                    placeholder="https://..."
                                                                    value={s.url}
                                                                    onChange={(e: any) => {
                                                                        const updated = [...socialLinks];
                                                                        updated[idx] = { ...updated[idx], url: e.target.value };
                                                                        setSocialLinks(updated);
                                                                    }}
                                                                />
                                                            </td>
                                                            <td className="pb-1.5 text-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setSocialLinks(prev =>
                                                                            prev.filter((_, i) => i !== idx)
                                                                        )
                                                                    }
                                                                    className="text-gray-300 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                                    title="Remove link"
                                                                >
                                                                    <Trash2 size={13} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Key Management Contacts (POC) */}
                            <div>
                                <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <User size={15} className="text-blue-600" />
                                        <h3 className="text-xs text-gray-800 uppercase tracking-tight">
                                            Key Management Contacts (POC)
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setContacts(prev => [
                                                ...prev,
                                                {
                                                    id: Date.now().toString(),
                                                    role: 'Manager',
                                                    name: '',
                                                    phone: '',
                                                    email: ''
                                                }
                                            ])
                                        }
                                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} /> Add Contact
                                    </button>
                                </div>
                                <div className="bg-gray-50/50 rounded-xl border border-gray-100 p-3 overflow-x-auto">
                                    <table className="w-full border-spacing-x-2 border-separate text-xs">
                                        <thead>
                                            <tr className="text-left">
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Department / Role
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Name
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Phone
                                                </th>
                                                <th className="text-[9.5px] font-black text-gray-400 uppercase tracking-wider pb-2">
                                                    Email
                                                </th>
                                                <th className="w-8"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {contacts.map((c, idx) => (
                                                <tr key={c.id}>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={c.role}
                                                            onChange={(e: any) => {
                                                                const updated = [...contacts];
                                                                updated[idx].role = e.target.value;
                                                                setContacts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={c.name}
                                                            onChange={(e: any) => {
                                                                const updated = [...contacts];
                                                                updated[idx].name = e.target.value;
                                                                setContacts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs font-mono"
                                                            value={c.phone}
                                                            onChange={(e: any) => {
                                                                const updated = [...contacts];
                                                                updated[idx].phone = e.target.value;
                                                                setContacts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5">
                                                        <Input
                                                            className="!h-7 !py-1 text-xs"
                                                            value={c.email}
                                                            onChange={(e: any) => {
                                                                const updated = [...contacts];
                                                                updated[idx].email = e.target.value;
                                                                setContacts(updated);
                                                            }}
                                                        />
                                                    </td>
                                                    <td className="pb-1.5 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setContacts(prev =>
                                                                    prev.filter(x => x.id !== c.id)
                                                                )
                                                            }
                                                            className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Emergency Hotlines */}
                            <div>
                                <SectionTitle icon={ShieldAlert} title="24/7 Emergency & Safety Contacts" />
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    {emergencyLines.map((line, idx) => (
                                        <div
                                            key={line.id}
                                            className="p-3 bg-gray-50/70 border border-gray-200/80 rounded-xl space-y-1.5"
                                        >
                                            <span className="text-[10px] text-gray-500 uppercase block">
                                                {line.label}
                                            </span>
                                            <Input
                                                className="!h-7 !px-2 text-xs"
                                                value={line.name}
                                                onChange={(e: any) => {
                                                    const updated = [...emergencyLines];
                                                    updated[idx].name = e.target.value;
                                                    setEmergencyLines(updated);
                                                }}
                                            />
                                            <Input
                                                className="!h-7 !px-2 text-xs font-mono"
                                                value={line.phone}
                                                onChange={(e: any) => {
                                                    const updated = [...emergencyLines];
                                                    updated[idx].phone = e.target.value;
                                                    setEmergencyLines(updated);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ========================================================================
                        TAB 8: BACKUP & SECURITY
                       ======================================================================== */}
                    {activeTab === 'backup' && (
                        <div className="p-4 sm:p-5 lg:p-6 space-y-6 animate-in fade-in duration-150">
                            <div>
                                <div className="flex items-center justify-between mb-3.5 pb-1.5 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Database size={15} className="text-blue-600" />
                                        <h3 className="text-xs text-gray-800 uppercase tracking-tight">
                                            Cloud Backup & Session Security
                                        </h3>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            showToast('Database backup snapshot completed successfully.', {
                                                type: 'success'
                                            })
                                        }
                                        className="text-blue-600 text-xs hover:underline flex items-center gap-1 cursor-pointer"
                                    >
                                        <Database size={12} /> Run Backup Now
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField label="Backup Schedule">
                                        <Select
                                            value={settings.backupFrequency}
                                            onChange={(e: any) =>
                                                setSettings({ ...settings, backupFrequency: e.target.value })
                                            }
                                        >
                                            <option value="Daily at 04:00 AM">Daily at 04:00 AM</option>
                                            <option value="Every 12 Hours">Every 12 Hours</option>
                                            <option value="Hourly">Hourly</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Retention Period">
                                        <Select
                                            value={settings.backupRetentionDays}
                                            onChange={(e: any) =>
                                                setSettings({
                                                    ...settings,
                                                    backupRetentionDays: Number(e.target.value)
                                                })
                                            }
                                        >
                                            <option value={90}>90 Days</option>
                                            <option value={180}>180 Days</option>
                                            <option value={365}>365 Days (1 Year)</option>
                                        </Select>
                                    </FormField>
                                    <FormField label="Inactivity Auto-Lock">
                                        <Select
                                            value={settings.sessionTimeoutMinutes}
                                            onChange={(e: any) =>
                                                setSettings({
                                                    ...settings,
                                                    sessionTimeoutMinutes: Number(e.target.value)
                                                })
                                            }
                                        >
                                            <option value={10}>10 Minutes</option>
                                            <option value={15}>15 Minutes (Standard)</option>
                                            <option value={30}>30 Minutes</option>
                                            <option value={60}>60 Minutes</option>
                                        </Select>
                                    </FormField>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
                                <span className="text-xs text-amber-900 block">
                                    System Maintenance Mode
                                </span>
                                <p className="text-xs text-amber-800">
                                    When enabled, only Super Administrators can sign in while Front Desk and POS terminals display a maintenance notice.
                                </p>
                                <Checkbox
                                    label="Enable Maintenance Mode"
                                    checked={settings.maintenanceMode}
                                    onChange={() =>
                                        setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })
                                    }
                                />
                            </div>
                        </div>
                    )}

                    {/* Clean Footer Bar */}
                    <div className="mt-auto px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setSettings(getDefaultUnifiedSettings(targetProperty));
                                showToast('Restored default property settings.', { type: 'info' });
                            }}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1 cursor-pointer"
                        >
                            <RotateCcw size={12} />
                            <span>Reset to Defaults</span>
                        </button>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => handleSave('draft')}
                                disabled={isSaving}
                                className="btn-secondary"
                            >
                                Save Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => handleSave('publish')}
                                disabled={isSaving}
                                className="btn-primary"
                            >
                                <Lock size={13} />
                                <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AddProperty;
