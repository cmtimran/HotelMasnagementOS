import React, { useState, useEffect, useMemo } from 'react';
import {
    Percent,
    Plus,
    Trash2,
    Edit2,
    Copy,
    Layers,
    Calculator,
    CheckCircle2,
    AlertCircle,
    ShieldCheck,
    Save,
    X,
    SlidersHorizontal,
    GripVertical,
    ArrowUp,
    ArrowDown,
    Calendar,
    Lock,
    Mail,
    Eye,
    EyeOff
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { calculateReservationTaxes } from '../utils/taxCalculationEngine';
import {
    getAllStoredReservations,
    saveStoredReservations,
    broadcastPMSEvent,
    getOperatingSystemDate
} from '../utils/roomInventoryEngine';
import { confirmModal } from '../context/ConfirmModalContext';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface TaxMaster {
    id: string;
    code: string;
    name: string;
    category: 'VAT' | 'TAX' | 'SERVICE_CHARGE';
    rate: number;
    section?: string;
    serviceCode?: string;
    status: 'Active' | 'Inactive';
    remarks?: string;
}

export interface TaxConfigLine {
    id?: string;
    taxMasterId: string;
    taxMaster?: TaxMaster;
    executionOrder: number;
    calculationBasis: 'ORIGINAL_GROSS' | 'RUNNING_SUBTOTAL';
    isInclusive?: boolean;
}

export interface TaxConfiguration {
    id: string;
    code: string;
    name: string;
    module: string;
    startDate?: string;
    endDate?: string;
    status: 'Active' | 'Inactive';
    remarks?: string;
    lines: TaxConfigLine[];
}

export interface ChannelMapping {
    dineInConfigId?: string;
    roomServiceConfigId?: string;
    banquetConfigId?: string;
    takeawayConfigId?: string;
    deliveryConfigId?: string;
    allowPosOverride: boolean;
}

export interface BranchTaxAllocation {
    id: string;
    name: string;
    code: string;
    branchBinNumber?: string;
    useCustomTax: boolean;
    dineInConfigId?: string;
    roomServiceConfigId?: string;
    banquetConfigId?: string;
    takeawayConfigId?: string;
    deliveryConfigId?: string;
}

const STORAGE_KEY = 'hotel_taxes_vat_v1';

// Seed initial data
const INITIAL_MASTERS: TaxMaster[] = [
    {
        id: 'tm-001',
        code: 'VAT-15',
        name: 'Standard VAT 15%',
        category: 'VAT',
        rate: 15.0,
        section: 'Section 15, VAT Act 2012',
        serviceCode: 'S001.10 - Hotel Accommodation',
        status: 'Active',
        remarks: 'Statutory national value-added tax on hospitality services.',
    },
    {
        id: 'tm-002',
        code: 'SC-10',
        name: 'Hotel Service Charge 10%',
        category: 'SERVICE_CHARGE',
        rate: 10.0,
        section: 'Staff Welfare & Hotel Operations Pool',
        serviceCode: 'SC-HOTEL',
        status: 'Active',
        remarks: 'Distributed 80% to front-line hotel staff and 20% to operational breakage fund.',
    },
    {
        id: 'tm-003',
        code: 'CITY-2',
        name: 'City Tourism Development Levy 2%',
        category: 'TAX',
        rate: 2.0,
        section: 'Municipal Tourism & City Maintenance Ordinance',
        serviceCode: 'TX-CITY',
        status: 'Active',
        remarks: 'Local municipal surcharge for tourism development.',
    },
    {
        id: 'tm-004',
        code: 'SD-5',
        name: 'Supplementary Duty (SD) 5%',
        category: 'TAX',
        rate: 5.0,
        section: 'SD Schedule 2 (Luxury Dining & Alcoholic Beverages)',
        serviceCode: 'SD-BEV',
        status: 'Active',
        remarks: 'Applied to premium beverage items and presidential suite reservations.',
    },
    {
        id: 'tm-005',
        code: 'ECO-1',
        name: 'Green Eco Sustainability Fund 1%',
        category: 'TAX',
        rate: 1.0,
        section: 'Hotel ESG Environmental Compliance Act',
        serviceCode: 'ECO-HOTEL',
        status: 'Active',
        remarks: 'Dedicated to green energy, solar panels, and water conservation.',
    },
];

const INITIAL_CONFIGURATIONS: TaxConfiguration[] = [
    {
        id: 'tc-001',
        code: 'HOSP-STD',
        name: 'Standard Hospitality 5-Star Rule (10% SC + 15% VAT + 2% City)',
        module: 'All Hotel Operations',
        status: 'Active',
        remarks: 'Standard room and dining billing with compound VAT on running subtotal.',
        lines: [
            {
                taxMasterId: 'tm-002',
                executionOrder: 1,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-001',
                executionOrder: 2,
                calculationBasis: 'RUNNING_SUBTOTAL',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-003',
                executionOrder: 3,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
        ],
    },
    {
        id: 'tc-002',
        code: 'ROOM-VAT-ONLY',
        name: 'Room Only Corporate Rate (15% VAT Single Tier)',
        module: 'Rooms & Lodging',
        status: 'Active',
        remarks: 'Corporate room rate billing with no service charge and 15% flat VAT.',
        lines: [
            {
                taxMasterId: 'tm-001',
                executionOrder: 1,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
        ],
    },
    {
        id: 'tc-003',
        code: 'BANQUET-GALA',
        name: 'Banquets & Ballrooms (10% SC + 15% VAT + 5% SD)',
        module: 'Banquets & Events',
        status: 'Active',
        remarks: 'Conferences and wedding ceremonies with supplementary duty.',
        lines: [
            {
                taxMasterId: 'tm-002',
                executionOrder: 1,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-004',
                executionOrder: 2,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-001',
                executionOrder: 3,
                calculationBasis: 'RUNNING_SUBTOTAL',
                isInclusive: false,
            },
        ],
    },
];

const INITIAL_BRANCHES: BranchTaxAllocation[] = [
    {
        id: 'br-01',
        name: 'Grand Palace Hotel & Resort (Dhaka HQ)',
        code: 'HQ-DHK',
        branchBinNumber: '002348912-0101',
        useCustomTax: false,
        dineInConfigId: 'tc-001',
        roomServiceConfigId: 'tc-001',
        banquetConfigId: 'tc-003',
        takeawayConfigId: 'tc-001',
        deliveryConfigId: 'tc-001',
    },
    {
        id: 'br-02',
        name: 'Oceanfront Beach Resort (Cox Bazar)',
        code: 'RES-CXB',
        branchBinNumber: '002348912-0202',
        useCustomTax: true,
        dineInConfigId: 'tc-001',
        roomServiceConfigId: 'tc-001',
        banquetConfigId: 'tc-003',
        takeawayConfigId: 'tc-002',
        deliveryConfigId: 'tc-002',
    },
    {
        id: 'br-03',
        name: 'Heritage Mountain & Tea Lodge (Sylhet)',
        code: 'LDG-SYL',
        branchBinNumber: '002348912-0303',
        useCustomTax: false,
        dineInConfigId: 'tc-001',
        roomServiceConfigId: 'tc-001',
        banquetConfigId: 'tc-003',
        takeawayConfigId: 'tc-001',
        deliveryConfigId: 'tc-001',
    },
];

const INITIAL_CHANNEL_MAPPING: ChannelMapping = {
    dineInConfigId: 'tc-001',
    roomServiceConfigId: 'tc-001',
    banquetConfigId: 'tc-003',
    takeawayConfigId: 'tc-002',
    deliveryConfigId: 'tc-002',
    allowPosOverride: true,
};

export default function TaxVatManagement() {
    const [activeTab, setActiveTab] = useState<'builder' | 'configurations' | 'masters' | 'allocations'>('builder');

    // Persistence State
    const [masters, setMasters] = useState<TaxMaster[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_masters`);
            return saved ? JSON.parse(saved) : INITIAL_MASTERS;
        } catch {
            return INITIAL_MASTERS;
        }
    });

    const [configurations, setConfigurations] = useState<TaxConfiguration[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_configs`);
            return saved ? JSON.parse(saved) : INITIAL_CONFIGURATIONS;
        } catch {
            return INITIAL_CONFIGURATIONS;
        }
    });

    const [channelMapping, setChannelMapping] = useState<ChannelMapping>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_channels`);
            return saved ? JSON.parse(saved) : INITIAL_CHANNEL_MAPPING;
        } catch {
            return INITIAL_CHANNEL_MAPPING;
        }
    });

    const [branchAllocations, setBranchAllocations] = useState<BranchTaxAllocation[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_branches`);
            return saved ? JSON.parse(saved) : INITIAL_BRANCHES;
        } catch {
            return INITIAL_BRANCHES;
        }
    });

    // Save to local storage on change
    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_masters`, JSON.stringify(masters));
    }, [masters]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_configs`, JSON.stringify(configurations));
    }, [configurations]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_channels`, JSON.stringify(channelMapping));
    }, [channelMapping]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_branches`, JSON.stringify(branchAllocations));
    }, [branchAllocations]);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Active Configuration in Rule Builder
    const [activeConfigId, setActiveConfigId] = useState<string>('tc-001');
    const [builderConfigName, setBuilderConfigName] = useState('');
    const [builderCode, setBuilderCode] = useState('');
    const [builderModule, setBuilderModule] = useState('All Hotel Operations');
    const [builderStartDate, setBuilderStartDate] = useState('');
    const [builderEndDate, setBuilderEndDate] = useState('');
    const [builderStatus, setBuilderStatus] = useState<'Active' | 'Inactive'>('Active');
    const [builderRemarks, setBuilderRemarks] = useState('');
    const [builderLines, setBuilderLines] = useState<TaxConfigLine[]>([]);

    // Drag-and-Drop Sorting State in Rule Builder
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    // Simulator Inputs
    const [simBaseAmount, setSimBaseAmount] = useState<number>(1000);
    const [simDiscount, setSimDiscount] = useState<number>(0);
    const [simQty, setSimQty] = useState<number>(1);

    // Tax Master Modal State
    const [showMasterModal, setShowMasterModal] = useState(false);
    const [editingMaster, setEditingMaster] = useState<TaxMaster | null>(null);
    const [masterName, setMasterName] = useState('');
    const [masterCode, setMasterCode] = useState('');
    const [masterCategory, setMasterCategory] = useState<'VAT' | 'TAX' | 'SERVICE_CHARGE'>('VAT');
    const [masterRate, setMasterRate] = useState<string>('15.00');
    const [masterSection, setMasterSection] = useState('');
    const [masterServiceCode, setMasterServiceCode] = useState('');
    const [masterStatus, setMasterStatus] = useState<'Active' | 'Inactive'>('Active');
    const [masterRemarks, setMasterRemarks] = useState('');
    const [masterCodeError, setMasterCodeError] = useState('');

    // Tax Propagation States
    const [isPropagationModalOpen, setIsPropagationModalOpen] = useState(false);
    const [pendingConfig, setPendingConfig] = useState<TaxConfiguration | null>(null);
    const [propagationMode, setPropagationMode] = useState<'UPCOMING_AND_INHOUSE' | 'UPCOMING_ONLY' | 'NEW_ONLY'>('UPCOMING_AND_INHOUSE');
    const [effectiveDate, setEffectiveDate] = useState<string>('2026-07-01');
    const [protectPrepaid, setProtectPrepaid] = useState<boolean>(true);
    const [notifyGuests, setNotifyGuests] = useState<boolean>(true);
    const [notificationChannel, setNotificationChannel] = useState<'EMAIL' | 'SILENT'>('EMAIL');
    const [showNoticePreview, setShowNoticePreview] = useState<boolean>(false);

    // Dynamic Live Impact Analysis for Tax Propagation
    const propagationImpact = useMemo(() => {
        if (!isPropagationModalOpen || !pendingConfig) {
            return { upcomingCount: 0, inHouseCount: 0, protectedCount: 0, auditLockedCount: 0, emailCount: 0 };
        }
        const stored = getAllStoredReservations();
        const effDate = effectiveDate || getOperatingSystemDate() || '2026-07-01';

        let upcomingCount = 0;
        let inHouseCount = 0;
        let protectedCount = 0;
        let auditLockedCount = 0;
        let emailCount = 0;

        stored.forEach(res => {
            const isPast = res.status === 'CHECKED_OUT' || res.status === 'CHECKED-OUT' || res.status === 'CANCELLED' || res.status === 'VOIDED' || res.isPast;
            if (isPast) {
                auditLockedCount++;
                return;
            }

            const checkInDate = res.checkInDate || res.checkIn || '';
            const checkOutDate = res.departureDate || res.checkOut || '';

            if (checkOutDate && checkOutDate <= effDate) {
                auditLockedCount++;
                return;
            }

            const isPrepaid = (Number(res.paidAmount || res.paid || 0) >= Number(res.totalAmount || res.total || 0) && Number(res.totalAmount || 0) > 0) ||
                (res.source && String(res.source).toUpperCase().includes('OTA')) ||
                (res.channel && String(res.channel).toUpperCase().includes('BOOKING'));

            if (protectPrepaid && isPrepaid) {
                protectedCount++;
                return;
            }

            if (propagationMode === 'NEW_ONLY') {
                protectedCount++;
                return;
            }

            const isInHouse = res.status === 'IN-HOUSE' || res.status === 'ARRIVED' || res.status === 'STAYOVER';

            if (isInHouse) {
                if (propagationMode === 'UPCOMING_AND_INHOUSE') {
                    inHouseCount++;
                    if (notifyGuests && notificationChannel === 'EMAIL' && (res.guestEmail || res.email)) {
                        emailCount++;
                    }
                } else {
                    protectedCount++;
                }
            } else if (checkInDate >= effDate || checkOutDate > effDate) {
                upcomingCount++;
                if (notifyGuests && notificationChannel === 'EMAIL' && (res.guestEmail || res.email)) {
                    emailCount++;
                }
            }
        });

        return { upcomingCount, inHouseCount, protectedCount, auditLockedCount, emailCount };
    }, [isPropagationModalOpen, pendingConfig, propagationMode, effectiveDate, protectPrepaid, notifyGuests, notificationChannel]);

    // Load initial config into builder
    useEffect(() => {
        const found = configurations.find(c => c.id === activeConfigId) || configurations[0];
        if (found) {
            selectConfigForBuilder(found);
        }
    }, []);

    const selectConfigForBuilder = (cfg: TaxConfiguration) => {
        setActiveConfigId(cfg.id);
        setBuilderConfigName(cfg.name);
        setBuilderCode(cfg.code);
        setBuilderModule(cfg.module || 'All Hotel Operations');
        setBuilderStartDate(cfg.startDate || '');
        setBuilderEndDate(cfg.endDate || '');
        setBuilderStatus(cfg.status);
        setBuilderRemarks(cfg.remarks || '');
        setBuilderLines(cfg.lines ? [...cfg.lines] : []);
    };

    const handleConfigDropdownChange = (id: string) => {
        const cfg = configurations.find(c => c.id === id);
        if (cfg) {
            selectConfigForBuilder(cfg);
        }
    };

    const handleNewConfigBuilder = () => {
        const newCode = generateUniqueShortCode('TAX', configurations.map(c => c.code));
        setActiveConfigId('NEW');
        setBuilderConfigName('Custom Tax Policy');
        setBuilderCode(newCode);
        setBuilderModule('Rooms & Dining');
        setBuilderStartDate('');
        setBuilderEndDate('');
        setBuilderStatus('Active');
        setBuilderRemarks('Custom hotel tax rule configuration');
        if (masters.length > 0) {
            setBuilderLines([
                {
                    taxMasterId: masters[0].id,
                    executionOrder: 1,
                    calculationBasis: 'ORIGINAL_GROSS',
                    isInclusive: false,
                },
            ]);
        } else {
            setBuilderLines([]);
        }
        showToast('Created new draft tax policy in builder', 'success');
    };

    // Save Rule Builder
    const handleSaveBuilder = () => {
        if (!builderConfigName.trim()) {
            showToast('Configuration name is required', 'error');
            return;
        }

        const linesWithOrder = builderLines.map((line, idx) => ({
            ...line,
            executionOrder: idx + 1,
        }));

        const targetId = (activeConfigId && activeConfigId !== 'NEW') ? activeConfigId : `tc-${Date.now()}`;
        const targetCode = builderCode.trim().toUpperCase() || generateUniqueShortCode('TAX', configurations.map(c => c.code));

        const targetCfg: TaxConfiguration = {
            id: targetId,
            code: targetCode,
            name: builderConfigName.trim(),
            module: builderModule,
            startDate: builderStartDate,
            endDate: builderEndDate,
            status: builderStatus,
            remarks: builderRemarks.trim(),
            lines: linesWithOrder,
        };

        // If this is an Active configuration, open the Propagation Policy Dialog
        if (builderStatus === 'Active') {
            setPendingConfig(targetCfg);
            setEffectiveDate(targetCfg.startDate || getOperatingSystemDate() || '2026-07-01');
            setIsPropagationModalOpen(true);
            return;
        }

        // Otherwise (Draft/Inactive), save directly
        if (activeConfigId && activeConfigId !== 'NEW') {
            setConfigurations(prev =>
                prev.map(c => c.id === activeConfigId ? targetCfg : c)
            );
            showToast('Tax configuration updated successfully!');
        } else {
            setConfigurations(prev => [targetCfg, ...prev]);
            setActiveConfigId(targetId);
            showToast('New draft tax configuration created successfully!');
        }
    };

    // Confirm Propagation Handler
    const handleConfirmPropagation = () => {
        if (!pendingConfig) return;

        // 1. Commit configuration to state
        if (activeConfigId && activeConfigId !== 'NEW') {
            setConfigurations(prev =>
                prev.map(c => (c.id === activeConfigId ? pendingConfig : c))
            );
        } else {
            setConfigurations(prev => [pendingConfig, ...prev]);
            setActiveConfigId(pendingConfig.id);
        }

        // 2. If propagation to existing reservations is enabled
        if (propagationMode !== 'NEW_ONLY') {
            const effDate = effectiveDate || getOperatingSystemDate() || '2026-07-01';
            const stored = getAllStoredReservations();
            let upcomingCount = 0;
            let inHouseCount = 0;
            let protectedCount = 0;
            let dispatchedEmailCount = 0;

            const updatedStored = stored.map(res => {
                const isPast = res.status === 'CHECKED_OUT' || res.status === 'CHECKED-OUT' || res.status === 'CANCELLED' || res.status === 'VOIDED' || res.isPast;
                if (isPast) return res;

                const checkOutDate = res.departureDate || res.checkOut || '';

                // If stay finished on or before effective date, leave locked
                if (checkOutDate && checkOutDate <= effDate) {
                    return res;
                }

                // Check prepaid / OTA protection
                const isPrepaid = (Number(res.paidAmount || res.paid || 0) >= Number(res.totalAmount || res.total || 0) && Number(res.totalAmount || 0) > 0) ||
                    (res.source && String(res.source).toUpperCase().includes('OTA')) ||
                    (res.channel && String(res.channel).toUpperCase().includes('BOOKING'));

                if (protectPrepaid && isPrepaid) {
                    protectedCount++;
                    return res;
                }

                const isInHouse = res.status === 'IN-HOUSE' || res.status === 'ARRIVED' || res.status === 'STAYOVER';

                if (isInHouse) {
                    if (propagationMode !== 'UPCOMING_AND_INHOUSE') {
                        return res;
                    }
                    inHouseCount++;
                } else {
                    upcomingCount++;
                }

                if (res.taxApplicable !== false) {
                    const baseAmt = Number(res.baseAmount) || Number(res.totalAmount) || 0;
                    if (baseAmt > 0) {
                        const newTaxCalc = calculateReservationTaxes(baseAmt, true, pendingConfig.id);
                        const guestEmail = res.guestEmail || res.email;
                        const isEmailDispatched = Boolean(notifyGuests && notificationChannel === 'EMAIL' && guestEmail);
                        if (isEmailDispatched) {
                            dispatchedEmailCount++;
                        }

                        return {
                            ...res,
                            taxConfigId: pendingConfig.id,
                            taxConfigCode: newTaxCalc.configCode,
                            taxConfigName: newTaxCalc.configName,
                            taxDetails: newTaxCalc,
                            totalTaxAmount: newTaxCalc.totalTaxAmount,
                            serviceChargeAmount: newTaxCalc.serviceChargeAmount,
                            vatAmount: newTaxCalc.vatAmount,
                            otherTaxesAmount: newTaxCalc.otherTaxesAmount,
                            totalAmount: newTaxCalc.grandTotal,
                            dueAmount: Math.max(0, newTaxCalc.grandTotal - Number(res.paidAmount || 0)),
                            lastAuditRemark: `Statutory Tax Policy ${pendingConfig.code} applied (Effective: ${effDate}). ${isEmailDispatched ? `Notice email dispatched to ${guestEmail}` : 'Updated in silent audit mode'}`
                        };
                    }
                }
                return res;
            });

            saveStoredReservations(updatedStored);
            if (updatedStored[0]) {
                broadcastPMSEvent({ type: 'RESERVATION_COMMITTED', reservation: updatedStored[0] });
            }

            if (notifyGuests && notificationChannel === 'EMAIL') {
                showToast(`Tax policy "${pendingConfig.name}" active! Updated ${upcomingCount} upcoming and ${inHouseCount} in-house reservations. Dispatched ${dispatchedEmailCount} revised tax notice emails to guests.`);
            } else {
                showToast(`Tax policy "${pendingConfig.name}" active! Updated ${upcomingCount} upcoming and ${inHouseCount} in-house reservations in silent audit mode (no guest emails sent).`);
            }
        } else {
            showToast(`Tax policy "${pendingConfig.name}" active! Applied to new bookings only (existing reservations grandfathered).`);
        }

        setIsPropagationModalOpen(false);
        setPendingConfig(null);
    };

    // Rule Builder Line management
    const addTaxLine = () => {
        if (masters.length === 0) {
            showToast('Please create at least one Tax Master first', 'error');
            return;
        }
        const defaultMaster = masters[0];
        const newLine: TaxConfigLine = {
            taxMasterId: defaultMaster.id,
            executionOrder: builderLines.length + 1,
            calculationBasis: builderLines.length === 0 ? 'ORIGINAL_GROSS' : 'RUNNING_SUBTOTAL',
            isInclusive: false,
        };
        setBuilderLines([...builderLines, newLine]);
    };

    const updateLineMaster = (idx: number, masterId: string) => {
        const updated = [...builderLines];
        updated[idx].taxMasterId = masterId;
        setBuilderLines(updated);
    };

    const updateLineBasis = (idx: number, basis: 'ORIGINAL_GROSS' | 'RUNNING_SUBTOTAL') => {
        const updated = [...builderLines];
        updated[idx].calculationBasis = basis;
        setBuilderLines(updated);
    };

    const removeTaxLine = (idx: number) => {
        const updated = builderLines.filter((_, i) => i !== idx).map((l, i) => ({ ...l, executionOrder: i + 1 }));
        setBuilderLines(updated);
    };

    const moveTaxLine = (idx: number, direction: 'UP' | 'DOWN') => {
        if ((direction === 'UP' && idx === 0) || (direction === 'DOWN' && idx === builderLines.length - 1)) return;
        const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
        const updated = [...builderLines];
        const temp = updated[idx];
        updated[idx] = updated[targetIdx];
        updated[targetIdx] = temp;
        setBuilderLines(updated.map((l, i) => ({ ...l, executionOrder: i + 1 })));
    };

    // Drag and Drop Sorting Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragOverIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex) {
            setDraggedIndex(null);
            setDragOverIndex(null);
            return;
        }

        const updated = [...builderLines];
        const [movedItem] = updated.splice(draggedIndex, 1);
        updated.splice(targetIndex, 0, movedItem);

        const reordered = updated.map((line, i) => ({
            ...line,
            executionOrder: i + 1,
        }));

        setBuilderLines(reordered);
        setDraggedIndex(null);
        setDragOverIndex(null);
        showToast(`Tax tier sorted to step #${targetIndex + 1}`);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    // Duplicate Configuration
    const handleDuplicateConfig = (cfg: TaxConfiguration) => {
        const newCode = generateUniqueShortCode(`${cfg.code}-CPY`, configurations.map(c => c.code));
        const newConfig: TaxConfiguration = {
            ...cfg,
            id: `tc-${Date.now()}`,
            code: newCode,
            name: `${cfg.name} (Copy)`,
            lines: cfg.lines.map(l => ({ ...l })),
        };
        setConfigurations(prev => [newConfig, ...prev]);
        selectConfigForBuilder(newConfig);
        setActiveTab('builder');
        showToast(`Duplicated into "${newConfig.name}"`);
    };

    // Delete Configuration
    const handleDeleteConfig = async (id: string, name: string) => {
        if (configurations.length <= 1) {
            showToast('You must keep at least one tax configuration', 'error');
            return;
        }
        const confirmed = await confirmModal({
            title: `Delete Tax Configuration?`,
            message: `Are you sure you want to delete tax configuration "${name}"?`,
            confirmText: 'Delete Configuration',
            variant: 'danger'
        });
        if (!confirmed) return;

        setConfigurations(prev => prev.filter(c => c.id !== id));
        showToast(`Tax configuration "${name}" deleted.`);
        if (activeConfigId === id) {
            const remaining = configurations.filter(c => c.id !== id);
            if (remaining.length > 0) selectConfigForBuilder(remaining[0]);
        }
    };

    // Tax Master CRUD
    const openCreateMaster = () => {
        setEditingMaster(null);
        setMasterName('');
        const newCode = generateUniqueShortCode('TAX', masters.map(m => m.code));
        setMasterCode(newCode);
        setMasterCategory('VAT');
        setMasterRate('15.00');
        setMasterSection('');
        setMasterServiceCode('S001 - Hospitality');
        setMasterStatus('Active');
        setMasterRemarks('');
        setMasterCodeError('');
        setShowMasterModal(true);
    };

    const openEditMaster = (m: TaxMaster) => {
        setEditingMaster(m);
        setMasterName(m.name);
        setMasterCode(m.code);
        setMasterCategory(m.category);
        setMasterRate(m.rate.toFixed(2));
        setMasterSection(m.section || '');
        setMasterServiceCode(m.serviceCode || '');
        setMasterStatus(m.status);
        setMasterRemarks(m.remarks || '');
        setMasterCodeError('');
        setShowMasterModal(true);
    };

    const handleSaveMaster = (e: React.FormEvent) => {
        e.preventDefault();
        const cleanCode = masterCode.trim().toUpperCase();
        if (!cleanCode) {
            setMasterCodeError('Short code is required');
            return;
        }

        const existingCodes = masters.filter(m => m.id !== editingMaster?.id).map(m => m.code);
        if (isShortCodeDuplicate(cleanCode, existingCodes)) {
            setMasterCodeError(`Code "${cleanCode}" is already in use.`);
            return;
        }

        if (editingMaster) {
            setMasters(prev =>
                prev.map(m =>
                    m.id === editingMaster.id
                        ? {
                              ...m,
                              code: cleanCode,
                              name: masterName.trim(),
                              category: masterCategory,
                              rate: parseFloat(masterRate) || 0,
                              section: masterSection.trim(),
                              serviceCode: masterServiceCode.trim(),
                              status: masterStatus,
                              remarks: masterRemarks.trim(),
                          }
                        : m
                )
            );
            showToast('Tax master updated successfully');
        } else {
            const newMaster: TaxMaster = {
                id: `tm-${Date.now()}`,
                code: cleanCode,
                name: masterName.trim(),
                category: masterCategory,
                rate: parseFloat(masterRate) || 0,
                section: masterSection.trim(),
                serviceCode: masterServiceCode.trim(),
                status: masterStatus,
                remarks: masterRemarks.trim(),
            };
            setMasters(prev => [newMaster, ...prev]);
            showToast('Tax master created successfully');
        }
        setShowMasterModal(false);
    };

    const handleDeleteMaster = async (id: string, name: string) => {
        const confirmed = await confirmModal({
            title: `Delete Tax Master "${name}"?`,
            message: `Are you sure you want to delete tax master "${name}"? It will be removed from all associated rules and calculation lines.`,
            confirmText: 'Delete Tax Master',
            variant: 'danger'
        });
        if (!confirmed) return;

        setMasters(prev => prev.filter(m => m.id !== id));
        setBuilderLines(prev => prev.filter(l => l.taxMasterId !== id));
        showToast(`Tax master "${name}" deleted.`);
    };

    // Save Channel Mapping
    const handleSaveChannelMapping = (e: React.FormEvent) => {
        e.preventDefault();
        localStorage.setItem(`${STORAGE_KEY}_channels`, JSON.stringify(channelMapping));
        showToast('Channel tax mappings saved successfully!');
    };

    // Update Branch Allocation
    const handleUpdateBranchTax = (branch: BranchTaxAllocation) => {
        setBranchAllocations(prev =>
            prev.map(b => (b.id === branch.id ? { ...branch } : b))
        );
        showToast(`Branch "${branch.name}" tax policy updated!`);
    };

    // LIVE SIMULATOR REAL-TIME CALCULATION
    const simulationResult = useMemo(() => {
        const gross = (simBaseAmount || 0) * (simQty || 1);
        const net = Math.max(0, gross - (simDiscount || 0));

        let running = net;
        let totalTax = 0;

        const breakdown = builderLines.map((line, idx) => {
            const m = masters.find(item => item.id === line.taxMasterId);
            const rate = m ? m.rate : 0;
            const basis = line.calculationBasis === 'RUNNING_SUBTOTAL' ? running : net;
            const amount = Math.round(((basis * rate) / 100) * 100) / 100;

            running += amount;
            totalTax += amount;

            const basisText = line.calculationBasis === 'RUNNING_SUBTOTAL' ? 'Running Subtotal' : 'Gross Base';
            const formula = `${m?.name || 'Tax'} = ${rate}% × ৳ ${basis.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${basisText}) = ৳ ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

            return {
                step: idx + 1,
                name: m?.name || 'Tax Item',
                code: m?.code || 'TAX',
                category: m?.category || 'VAT',
                rate,
                basisAmount: basis,
                basisText,
                amount,
                runningAfter: running,
                formula,
            };
        });

        const grand = net + totalTax;

        return {
            gross,
            net,
            breakdown,
            totalTax,
            grand,
        };
    }, [simBaseAmount, simQty, simDiscount, builderLines, masters]);

    return (
        <div className="p-2.5 sm:p-3.5 space-y-3 font-sans animate-in fade-in duration-200">
            {/* Toast Alert */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                        toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Standard Page Header */}
            <PageHeader
                title="Taxes, VAT & Service Charges"
                subtitle="Multi-tier tax masters, rule configurations, live compounding simulator, and channel mappings"
                icon={<Percent className="size-5 text-primary" />}
                actions={
                    activeTab === 'masters' ? (
                        <button
                            type="button"
                            onClick={() => openCreateMaster()}
                            className="btn-primary !h-8 !py-1 !px-3 text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="size-3.5" />
                            <span>Add Tax Master</span>
                        </button>
                    ) : null
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Tax Masters</span>
                        <div className="size-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <ShieldCheck className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{masters.length}</div>
                    <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{masters.filter(m => m.status === 'Active').length} Active Masters</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Configurations</span>
                        <div className="size-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Layers className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{configurations.length}</div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Bundled tax profiles</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Active Formula</span>
                        <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Calculator className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{builderLines.length} Lines</div>
                    <div className="mt-0.5 text-[10px] text-amber-600 font-medium">In builder workspace</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Simulated Tax</span>
                        <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-mono font-bold">
                            ৳
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight font-mono">
                        ৳ {simulationResult.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-500 font-medium">Grand: ৳ {simulationResult.grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Standardized Navigation Tabs */}
            <div className="bg-white p-1.5 rounded-xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-slate-100/80 rounded-lg">
                    <button
                        type="button"
                        onClick={() => setActiveTab('builder')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            activeTab === 'builder'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Calculator className="size-3.5" />
                        <span>Rule Builder & Simulator</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('configurations')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            activeTab === 'configurations'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="size-3.5" />
                        <span>Configurations</span>
                        <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                            {configurations.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('masters')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            activeTab === 'masters'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <ShieldCheck className="size-3.5" />
                        <span>Tax Masters</span>
                        <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                            {masters.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('allocations')}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            activeTab === 'allocations'
                                ? 'bg-white text-slate-900 shadow-2xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <SlidersHorizontal className="size-3.5" />
                        <span>Channel Allocations</span>
                    </button>
                </div>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: RULE BUILDER & LIVE SIMULATOR                          */}
            {/* ============================================================== */}
            {activeTab === 'builder' && (
                <div className="space-y-3">
                    {/* Builder Header Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 flex-1 min-w-0">
                            <span className="text-xs text-slate-700 font-bold whitespace-nowrap shrink-0">
                                Active Rule Configuration:
                            </span>
                            <select
                                value={activeConfigId}
                                onChange={e => handleConfigDropdownChange(e.target.value)}
                                className="flex-1 min-w-[200px] max-w-xl h-8.5 px-3 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400 truncate"
                            >
                                {configurations.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.code} - {c.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={handleNewConfigBuilder}
                                className="h-8.5 px-3 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 font-semibold transition shrink-0 whitespace-nowrap cursor-pointer"
                            >
                                <Plus className="size-3.5" />
                                <span>New Draft</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={handleSaveBuilder}
                                className="h-8.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition whitespace-nowrap shrink-0 cursor-pointer"
                            >
                                <Save className="size-3.5" />
                                <span>Save Tax Rule</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
                        {/* Left Column: Rule Pipeline Builder (7 Cols) */}
                        <div className="xl:col-span-7 space-y-3">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-3 shadow-2xs">
                                <div className="border-b border-slate-100 pb-2">
                                    <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                        <SlidersHorizontal className="size-3.5 text-rose-600" />
                                        <span>Tax Execution Pipeline & Order</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Drag or reorder steps. Choose whether each tax computes on original gross or running compound subtotal.
                                    </p>
                                </div>

                                {/* Config Meta Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                                    <div className="sm:col-span-8">
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Rule Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={builderConfigName}
                                            onChange={e => setBuilderConfigName(e.target.value)}
                                            placeholder="e.g. Standard 5-Star Rule (10% SC + 15% VAT + 2% City)"
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                        />
                                    </div>
                                    <div className="sm:col-span-4">
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Short Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={builderCode}
                                            onChange={e => setBuilderCode(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-1.5 text-xs font-mono uppercase font-bold bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                        />
                                    </div>
                                </div>

                                {/* Pipeline Steps with Drag & Drop */}
                                <div className="space-y-3 pt-1">
                                    {builderLines.length === 0 ? (
                                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                            No tax lines added yet. Click &quot;Add Tax Step to Pipeline&quot; below.
                                        </div>
                                    ) : (
                                        builderLines.map((line, idx) => {
                                            const master = masters.find(m => m.id === line.taxMasterId);
                                            const isBeingDragged = draggedIndex === idx;
                                            const isDragTarget = dragOverIndex === idx;
                                            return (
                                                <div
                                                    key={idx}
                                                    draggable
                                                    onDragStart={e => handleDragStart(e, idx)}
                                                    onDragOver={e => handleDragOver(e, idx)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={e => handleDrop(e, idx)}
                                                    onDragEnd={handleDragEnd}
                                                    className={`p-3 rounded-xl border transition-all duration-150 space-y-2.5 group select-none ${
                                                        isBeingDragged
                                                            ? 'opacity-40 scale-[0.98] border-dashed border-rose-400 bg-rose-50/40'
                                                            : isDragTarget
                                                            ? 'border-t-2 border-t-rose-500 bg-rose-50/20 shadow-xs'
                                                            : 'bg-slate-50/80 hover:bg-slate-100/70 border-slate-200/90 shadow-2xs hover:shadow-xs'
                                                    }`}
                                                >
                                                    {/* Card Header: Step #, Badges & Reorder/Delete Controls */}
                                                    <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div
                                                                className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition shrink-0"
                                                                title="Drag up or down to reorder calculation precedence"
                                                            >
                                                                <GripVertical className="size-4" />
                                                            </div>
                                                            <div className="size-6 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70 text-xs font-bold flex items-center justify-center shrink-0">
                                                                #{idx + 1}
                                                            </div>
                                                            <span className="font-bold text-xs text-slate-800 truncate">
                                                                {master?.name || 'Tax Head'}
                                                            </span>
                                                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100/80 text-rose-700 border border-rose-200 shrink-0">
                                                                {master?.rate}%
                                                            </span>
                                                            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-slate-200/60 text-slate-600 shrink-0">
                                                                {master?.category}
                                                            </span>
                                                        </div>

                                                        {/* Action Controls */}
                                                        <div className="flex items-center gap-1 shrink-0">
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => moveTaxLine(idx, 'UP')}
                                                                className="size-6 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
                                                                title="Move Up in Precedence"
                                                            >
                                                                <ArrowUp className="size-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === builderLines.length - 1}
                                                                onClick={() => moveTaxLine(idx, 'DOWN')}
                                                                className="size-6 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed transition-colors"
                                                                title="Move Down in Precedence"
                                                            >
                                                                <ArrowDown className="size-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeTaxLine(idx)}
                                                                className="size-6 rounded hover:bg-rose-100 text-rose-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                                                                title="Remove Tax Line"
                                                            >
                                                                <Trash2 className="size-3.5" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Card Body: Responsive 2-Field Selection */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                                                        <div className="sm:col-span-7 space-y-1">
                                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                                Tax Master / Statutory Head
                                                            </label>
                                                            <select
                                                                value={line.taxMasterId}
                                                                onChange={e => updateLineMaster(idx, e.target.value)}
                                                                className="w-full px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                                            >
                                                                {masters.map(m => (
                                                                    <option key={m.id} value={m.id}>
                                                                        {m.name} ({m.rate}%) — {m.category}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="text-[9.5px] text-slate-400 truncate">
                                                                {master?.section || master?.remarks || 'Statutory rate'}
                                                            </div>
                                                        </div>

                                                        <div className="sm:col-span-5 space-y-1">
                                                            <label className="block text-[10px] font-semibold text-slate-500">
                                                                Calculation Basis
                                                            </label>
                                                            <select
                                                                value={line.calculationBasis}
                                                                onChange={e =>
                                                                    updateLineBasis(
                                                                        idx,
                                                                        e.target.value as
                                                                            | 'ORIGINAL_GROSS'
                                                                            | 'RUNNING_SUBTOTAL'
                                                                    )
                                                                }
                                                                className="w-full px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-rose-400"
                                                            >
                                                                <option value="ORIGINAL_GROSS">Gross Basis (Flat Tariff)</option>
                                                                <option value="RUNNING_SUBTOTAL">
                                                                    Running Subtotal (Compound)
                                                                </option>
                                                            </select>
                                                            <div className="text-[9.5px] text-slate-400">
                                                                {line.calculationBasis === 'RUNNING_SUBTOTAL' ? 'Computes on prior steps total' : 'Computes on base tariff only'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                <button
                                    type="button"
                                    onClick={addTaxLine}
                                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                    <Plus className="size-3.5" />
                                    <span>Add Tax Step to Pipeline</span>
                                </button>
                            </div>
                        </div>

                        {/* Right Column: Interactive Live Simulator (5 Cols) - Light Theme */}
                        <div className="xl:col-span-5 space-y-3">
                            <div className="bg-white p-3 rounded-xl border border-slate-200/90 space-y-3 shadow-2xs hover:shadow-xs transition">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="size-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                            <Calculator className="size-3.5" />
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-semibold text-slate-800">Live Bill & Tax Simulator</h3>
                                            <p className="text-[10px] text-slate-400">Real-time statutory tax evaluation in BDT (৳)</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold flex items-center gap-1">
                                        <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                                        Live Reactive
                                    </span>
                                </div>

                                {/* Simulator Inputs */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <div>
                                        <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                            Base Tariff (৳)
                                        </label>
                                        <input
                                            type="number"
                                            value={simBaseAmount}
                                            onChange={e => setSimBaseAmount(parseFloat(e.target.value) || 0)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                            Qty / Nights
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={simQty}
                                            onChange={e => setSimQty(parseInt(e.target.value) || 1)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] text-slate-600 font-semibold mb-1">
                                            Discount (৳)
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            value={simDiscount}
                                            onChange={e => setSimDiscount(parseFloat(e.target.value) || 0)}
                                            className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 transition"
                                        />
                                    </div>
                                </div>

                                {/* Live Breakdown */}
                                <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                                    <div className="flex justify-between text-slate-600 font-medium">
                                        <span>Gross Room / Service Subtotal ({simQty}x)</span>
                                        <span className="font-mono text-slate-800">৳ {simulationResult.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                    {simDiscount > 0 && (
                                        <div className="flex justify-between text-emerald-600 font-medium">
                                            <span>Promotion / Corporate Discount</span>
                                            <span className="font-mono font-bold">-৳ {simDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-slate-800 font-semibold border-b border-slate-100 pb-2">
                                        <span>Net Taxable Base Tariff</span>
                                        <span className="font-mono text-slate-900">৳ {simulationResult.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>

                                    {/* Breakdown Steps with clean cards */}
                                    <div className="space-y-2 py-1">
                                        <div className="text-[10px] uppercase text-slate-400 tracking-wider">
                                            Itemized Tax Compounding Breakdown
                                        </div>
                                        {simulationResult.breakdown.length === 0 ? (
                                            <div className="p-3 text-center rounded-lg bg-slate-50 text-slate-400 text-xs">
                                                No tax steps in active rule
                                            </div>
                                        ) : (
                                            simulationResult.breakdown.map((b, idx) => (
                                                <div key={idx} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/70 space-y-1">
                                                    <div className="flex justify-between items-center text-slate-700">
                                                        <span className="flex items-center gap-1.5 font-semibold text-xs">
                                                            <span className="size-5 rounded-md bg-white border border-slate-200 text-[10px] flex items-center justify-center text-slate-600 shadow-2xs">
                                                                #{b.step}
                                                            </span>
                                                            <span className="text-slate-900">{b.name}</span>
                                                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-rose-50 text-rose-700 border border-rose-200/50 font-semibold">
                                                                {b.rate}%
                                                            </span>
                                                        </span>
                                                        <span className="font-mono text-rose-600 text-xs">
                                                            +৳ {b.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono bg-white/70 px-2 py-1 rounded border border-slate-200/40">
                                                        {b.formula}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Total Tax & Grand Total */}
                                    <div className="pt-2 border-t border-slate-100 space-y-2">
                                        <div className="flex justify-between text-slate-600 text-xs font-medium">
                                            <span>Total Statutory Taxes & Surcharges:</span>
                                            <span className="font-mono text-rose-600 font-bold">
                                                +৳ {simulationResult.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50/60 border border-emerald-200/80">
                                            <div>
                                                <span className="text-xs uppercase tracking-wider text-emerald-900">Grand Total (Net + Taxes)</span>
                                                <div className="text-[10px] text-emerald-700">Statutory Mushak-6.3 Compliant</div>
                                            </div>
                                            <span className="font-mono text-lg font-black text-emerald-700">
                                                ৳ {simulationResult.grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: CONFIGURATIONS LIST                                    */}
            {/* ============================================================== */}
            {activeTab === 'configurations' && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900">
                                Master Tax Configurations
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Defined rule pipelines available for property and channel assignment.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleNewConfigBuilder}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Plus className="size-3.5" />
                            <span>Create New Configuration</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                        {configurations.map(cfg => (
                            <div
                                key={cfg.id}
                                className="bg-white p-3.5 rounded-xl border border-slate-200/90 flex flex-col justify-between space-y-3 shadow-2xs hover:border-rose-300 transition"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="px-1.5 py-0.5 rounded font-mono text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                                            {cfg.code}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {cfg.status}
                                        </span>
                                    </div>
                                    <h3 className="text-slate-900 text-xs font-semibold mb-0.5">
                                        {cfg.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 line-clamp-2">{cfg.remarks}</p>

                                    {/* Lines Preview */}
                                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-1">
                                        <div className="text-[10px] text-slate-400 uppercase font-semibold">
                                            Pipeline Steps ({cfg.lines.length}):
                                        </div>
                                        {cfg.lines.map((l, i) => {
                                            const m = masters.find(item => item.id === l.taxMasterId);
                                            return (
                                                <div
                                                    key={i}
                                                    className="text-[11px] text-slate-600 flex items-center justify-between"
                                                >
                                                    <span>
                                                        {i + 1}. {m?.name || 'Tax'}
                                                    </span>
                                                    <span className="font-mono text-rose-600 font-semibold text-[11px]">
                                                        {m?.rate}% ({l.calculationBasis === 'RUNNING_SUBTOTAL' ? 'Compound' : 'Flat'})
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicateConfig(cfg)}
                                        className="size-7 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
                                        title="Duplicate Configuration"
                                    >
                                        <Copy className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            selectConfigForBuilder(cfg);
                                            setActiveTab('builder');
                                        }}
                                        className="size-7 rounded-lg hover:bg-slate-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                                        title="Open in Builder"
                                    >
                                        <Edit2 className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteConfig(cfg.id, cfg.name)}
                                        className="size-7 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center transition cursor-pointer"
                                        title="Delete Configuration"
                                    >
                                        <Trash2 className="size-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: TAX MASTERS                                            */}
            {/* ============================================================== */}
            {activeTab === 'masters' && (
                <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div>
                            <h2 className="text-xs font-semibold text-slate-900">
                                Master Tax & Surcharge Catalog
                            </h2>
                            <p className="text-[11px] text-slate-500">
                                Statutory tax components (VAT, Service Charges, Municipality Fees, Sustainability Levies).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreateMaster}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                            <Plus className="size-3.5" />
                            <span>Add Tax Master</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200/90 overflow-hidden shadow-2xs">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="py-2 px-3">Tax Name</th>
                                    <th className="py-2 px-3">Code</th>
                                    <th className="py-2 px-3">Category</th>
                                    <th className="py-2 px-3 text-right">Tax Rate (%)</th>
                                    <th className="py-2 px-3">Statutory Section</th>
                                    <th className="py-2 px-3 text-center">Status</th>
                                    <th className="py-2 px-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {masters.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                                        <td className="py-2 px-3 font-semibold text-slate-800">
                                            {m.name}
                                        </td>
                                        <td className="py-2 px-3 font-mono font-medium text-slate-700">
                                            <span className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px]">
                                                {m.code}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3">
                                            <span
                                                className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                                    m.category === 'VAT'
                                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                                        : m.category === 'SERVICE_CHARGE'
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                                }`}
                                            >
                                                {m.category.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-semibold text-rose-600 text-xs">
                                            {m.rate.toFixed(2)}%
                                        </td>
                                        <td className="py-2 px-3 text-slate-500 text-[11px]">{m.section || '—'}</td>
                                        <td className="py-2 px-3 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="py-2 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditMaster(m)}
                                                    className="size-6 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition cursor-pointer"
                                                >
                                                    <Edit2 className="size-3" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMaster(m.id, m.name)}
                                                    className="size-6 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center transition cursor-pointer"
                                                >
                                                    <Trash2 className="size-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: CHANNELS & BRANCHES                                     */}
            {/* ============================================================== */}
            {activeTab === 'allocations' && (
                <div className="space-y-3">
                    {/* Channel Mappings Form */}
                    <form
                        onSubmit={handleSaveChannelMapping}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-3 shadow-2xs"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div>
                                <h3 className="text-xs font-semibold text-slate-900">
                                    Global Channel Default Tax Policies
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                    Set which tax rule automatically applies when billing via specific hotel operating channels.
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-lg shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                            >
                                <Save className="size-3.5" />
                                <span>Save Channel Policies</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Front Desk & Rooms
                                </label>
                                <select
                                    value={channelMapping.dineInConfigId || ''}
                                    onChange={e =>
                                        setChannelMapping({ ...channelMapping, dineInConfigId: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                    {configurations.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Room Service & In-Room Dining
                                </label>
                                <select
                                    value={channelMapping.roomServiceConfigId || ''}
                                    onChange={e =>
                                        setChannelMapping({ ...channelMapping, roomServiceConfigId: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                    {configurations.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Banquets & Event Ballrooms
                                </label>
                                <select
                                    value={channelMapping.banquetConfigId || ''}
                                    onChange={e =>
                                        setChannelMapping({ ...channelMapping, banquetConfigId: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                    {configurations.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 pt-1 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={channelMapping.allowPosOverride}
                                onChange={e =>
                                    setChannelMapping({ ...channelMapping, allowPosOverride: e.target.checked })
                                }
                                className="rounded text-rose-600"
                            />
                            <span className="text-xs text-slate-700 font-medium">
                                Allow Front Desk Cashier / Manager POS manual tax exemption override with passkey
                            </span>
                        </label>
                    </form>

                    {/* Branch Tax Allocations & BIN Table */}
                    <div className="bg-white p-3.5 rounded-xl border border-slate-200/90 space-y-3 shadow-2xs">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-900">
                                Property / Branch Tax BIN Allocations
                            </h3>
                            <p className="text-[11px] text-slate-500">
                                Statutory Business Identification Numbers (BIN) and custom localized tax rules per property.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[650px] text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-200/90 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                                        <th className="py-2 px-3">Property Name</th>
                                        <th className="py-2 px-3">Property Code</th>
                                        <th className="py-2 px-3">Tax BIN Registration #</th>
                                        <th className="py-2 px-3">Assigned Tax Rule</th>
                                        <th className="py-2 px-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {branchAllocations.map(br => (
                                        <tr key={br.id} className="hover:bg-slate-50/70">
                                            <td className="py-2 px-3 font-semibold text-slate-800">
                                                {br.name}
                                            </td>
                                            <td className="py-2 px-3 font-mono text-slate-700 text-[11px]">
                                                {br.code}
                                            </td>
                                            <td className="py-2 px-3 font-mono font-semibold text-rose-600 text-[11px]">
                                                {br.branchBinNumber || '—'}
                                            </td>
                                            <td className="py-2 px-3 text-slate-600">
                                                {configurations.find(c => c.id === br.dineInConfigId)?.name ||
                                                    'Global Standard Rule'}
                                            </td>
                                            <td className="py-2 px-3 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateBranchTax(br)}
                                                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold transition cursor-pointer"
                                                >
                                                    Sync BIN
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

            {/* Tax Master Modal */}
            {showMasterModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Percent className="size-5 text-rose-600" />
                                <h2 className="text-base text-slate-900">
                                    {editingMaster ? 'Edit Tax Master' : 'Create Tax Master'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowMasterModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMaster} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Tax Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. VAT 15%, Service Charge 10%"
                                    value={masterName}
                                    onChange={e => {
                                        setMasterName(e.target.value);
                                        if (!editingMaster && e.target.value.length > 2) {
                                            setMasterCode(
                                                generateUniqueShortCode(e.target.value, masters.map(m => m.code))
                                            );
                                            setMasterCodeError('');
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Short Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={masterCode}
                                        onChange={e => {
                                            setMasterCode(e.target.value.toUpperCase());
                                            setMasterCodeError('');
                                        }}
                                        className="w-full px-3 py-2 text-xs font-mono uppercase bg-white border border-slate-200 rounded-lg"
                                    />
                                    {masterCodeError && (
                                        <p className="text-[10px] text-rose-500 mt-0.5">{masterCodeError}</p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Rate (%) *
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={masterRate}
                                        onChange={e => setMasterRate(e.target.value)}
                                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Category *
                                    </label>
                                    <select
                                        value={masterCategory}
                                        onChange={e =>
                                            setMasterCategory(
                                                e.target.value as 'VAT' | 'TAX' | 'SERVICE_CHARGE'
                                            )
                                        }
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                    >
                                        <option value="VAT">VAT (Value Added Tax)</option>
                                        <option value="SERVICE_CHARGE">Service Charge</option>
                                        <option value="TAX">Other Tax / Surcharge</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Status
                                    </label>
                                    <select
                                        value={masterStatus}
                                        onChange={e => setMasterStatus(e.target.value as 'Active' | 'Inactive')}
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                    >
                                        <option value="Active">Active</option>
                                        <option value="Inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Statutory Section / Ordinance Reference
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Section 15, VAT Act 2012"
                                    value={masterSection}
                                    onChange={e => setMasterSection(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowMasterModal(false)}
                                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                                >
                                    {editingMaster ? 'Save Changes' : 'Create Master'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Tax & VAT Policy Propagation Dialog */}
            {isPropagationModalOpen && pendingConfig && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 shadow-2xs">
                                    <ShieldCheck className="size-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            Tax & VAT Policy Propagation
                                        </h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                            {pendingConfig.code}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Configuring &ldquo;{pendingConfig.name}&rdquo;
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPropagationModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 space-y-3.5 max-h-[75vh] overflow-y-auto no-scrollbar">
                            {/* Effective Date Bar */}
                            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Calendar className="size-4 text-rose-600 shrink-0" />
                                    <div>
                                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                            <span>Statutory Effective Date</span>
                                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200/60 font-semibold">
                                                Legal Cutoff
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500">
                                            Recalculates stays and nights on or after this date
                                        </p>
                                    </div>
                                </div>
                                <input
                                    type="date"
                                    value={effectiveDate}
                                    onChange={e => setEffectiveDate(e.target.value)}
                                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-2xs shrink-0 cursor-pointer"
                                />
                            </div>

                            <p className="text-xs text-slate-700 font-semibold pt-1">
                                How should this updated statutory tax policy affect existing bookings in the system?
                            </p>

                            {/* Option 1: UPCOMING_AND_INHOUSE (Recommended) */}
                            <label
                                onClick={() => setPropagationMode('UPCOMING_AND_INHOUSE')}
                                className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    propagationMode === 'UPCOMING_AND_INHOUSE'
                                        ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-400 shadow-xs'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="tax_propagation"
                                        checked={propagationMode === 'UPCOMING_AND_INHOUSE'}
                                        onChange={() => setPropagationMode('UPCOMING_AND_INHOUSE')}
                                        className="mt-1 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900">
                                                Update Upcoming & In-House Stays (Remaining Nights)
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                Recommended • Full Statutory Compliance
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Recalculates statutory VAT & taxes for all future confirmed bookings, plus future unposted nights for In-House guests starting from the Effective Date ({effectiveDate}). Previously audited & posted nights remain <strong>100% IMMUTABLE and audit-locked</strong>.
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* Option 2: UPCOMING_ONLY */}
                            <label
                                onClick={() => setPropagationMode('UPCOMING_ONLY')}
                                className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    propagationMode === 'UPCOMING_ONLY'
                                        ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-400 shadow-xs'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="tax_propagation"
                                        checked={propagationMode === 'UPCOMING_ONLY'}
                                        onChange={() => setPropagationMode('UPCOMING_ONLY')}
                                        className="mt-1 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900">
                                                Update Upcoming Unchecked-in Reservations Only
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                Unchecked-in Only
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            Applies updated taxes only to future un-arrived reservations. Currently in-house guests stay locked on their check-in rates throughout their remaining stay.
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* Option 3: NEW_ONLY */}
                            <label
                                onClick={() => setPropagationMode('NEW_ONLY')}
                                className={`block p-3.5 rounded-xl border transition-all cursor-pointer ${
                                    propagationMode === 'NEW_ONLY'
                                        ? 'border-rose-500 bg-rose-50/30 ring-1 ring-rose-400 shadow-xs'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <input
                                        type="radio"
                                        name="tax_propagation"
                                        checked={propagationMode === 'NEW_ONLY'}
                                        onChange={() => setPropagationMode('NEW_ONLY')}
                                        className="mt-1 text-rose-600 focus:ring-rose-500"
                                    />
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-bold text-slate-900">
                                                Apply to New Bookings Only
                                            </span>
                                            <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                                Grandfather All Existing
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-600 leading-relaxed">
                                            All existing reservations keep their original contracted tax rates locked at booking time. Only reservations created in the future will inherit this updated policy.
                                        </p>
                                    </div>
                                </div>
                            </label>

                            {/* Extra Guardrail: Prepaid / OTA Protection */}
                            {propagationMode !== 'NEW_ONLY' && (
                                <label
                                    onClick={() => setProtectPrepaid(!protectPrepaid)}
                                    className={`block p-3 rounded-xl border transition-all cursor-pointer ${
                                        protectPrepaid
                                            ? 'border-blue-300 bg-blue-50/40'
                                            : 'border-slate-200 hover:border-slate-300 bg-white'
                                    }`}
                                >
                                    <div className="flex items-start gap-2.5">
                                        <input
                                            type="checkbox"
                                            checked={protectPrepaid}
                                            onChange={e => setProtectPrepaid(e.target.checked)}
                                            className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-bold text-slate-900">
                                                    Protect Fully-Prepaid & Contracted OTA Bookings
                                                </span>
                                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                    Guaranteed Rates
                                                </span>
                                            </div>
                                            <p className="text-[10.5px] text-slate-500 leading-normal">
                                                Exempts reservations where payment status is 100% advance deposited or guaranteed contracted OTA rate plans to prevent front-desk guest disputes and rate parity conflicts.
                                            </p>
                                        </div>
                                    </div>
                                </label>
                            )}

                            {/* Guest Communication & Notice Dispatch */}
                            {propagationMode !== 'NEW_ONLY' && (
                                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5 shadow-2xs">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mail className="size-4 text-rose-600" />
                                            <span className="text-xs font-bold text-slate-800">
                                                Guest Notification on Tax Policy Revision
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowNoticePreview(!showNoticePreview)}
                                            className="text-[10px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            {showNoticePreview ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
                                            <span>{showNoticePreview ? 'Hide Notice Template' : 'Preview Email Template'}</span>
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        <label
                                            onClick={() => { setNotifyGuests(true); setNotificationChannel('EMAIL'); }}
                                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                                                notifyGuests && notificationChannel === 'EMAIL'
                                                    ? 'border-rose-400 bg-rose-50/40 ring-1 ring-rose-400/40 shadow-xs'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="guest_notification_channel"
                                                checked={notifyGuests && notificationChannel === 'EMAIL'}
                                                onChange={() => { setNotifyGuests(true); setNotificationChannel('EMAIL'); }}
                                                className="mt-0.5 text-rose-600 focus:ring-rose-500"
                                            />
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[11px] font-bold text-slate-900">
                                                        Send Revised Notice Email
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                        Recommended
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-normal">
                                                    Sends professional email notice with revised billing voucher and statutory legal clause.
                                                </p>
                                            </div>
                                        </label>

                                        <label
                                            onClick={() => { setNotifyGuests(false); setNotificationChannel('SILENT'); }}
                                            className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-start gap-2.5 ${
                                                !notifyGuests || notificationChannel === 'SILENT'
                                                    ? 'border-slate-400 bg-slate-100/60 ring-1 ring-slate-400/40 shadow-xs'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="guest_notification_channel"
                                                checked={!notifyGuests || notificationChannel === 'SILENT'}
                                                onChange={() => { setNotifyGuests(false); setNotificationChannel('SILENT'); }}
                                                className="mt-0.5 text-slate-600 focus:ring-slate-500"
                                            />
                                            <div className="space-y-0.5 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[11px] font-bold text-slate-900">
                                                        Silent Internal Update
                                                    </span>
                                                    <span className="px-1.5 py-0.2 rounded text-[8.5px] font-semibold bg-slate-200 text-slate-700">
                                                        Audit Only
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 leading-normal">
                                                    Updates folios and ledgers silently without notifying guests. Ideal for internal fee absorptions.
                                                </p>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Collapsible Email Template Preview */}
                                    {showNoticePreview && (
                                        <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 text-[10.5px] animate-in fade-in duration-150">
                                            <div className="flex items-center justify-between text-slate-500 border-b border-slate-100 pb-1 font-mono text-[9.5px]">
                                                <span>Subject: Important Update: Statutory Tax Revision on Reservation [RES-XXXXXX]</span>
                                                <span className="text-emerald-600 font-bold">HTML Template Active</span>
                                            </div>
                                            <div className="text-slate-700 space-y-1 pt-1 leading-relaxed">
                                                <p>Dear <strong>[Guest Name]</strong>,</p>
                                                <p>
                                                    Please be advised that pursuant to the government statutory tax ordinance effective <strong>{effectiveDate}</strong>, the applicable VAT and statutory levies on your upcoming stay at <em>Grand Palace Hotel & Resort</em> have been revised in accordance with national tax authority compliance.
                                                </p>
                                                <p>
                                                    Your room tariff breakdown has been recalculated. An updated confirmation voucher with the itemized statutory breakdown is attached to this email.
                                                </p>
                                                <p className="text-slate-500 italic">
                                                    We look forward to welcoming you and ensuring an exceptional stay experience.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Live Impact Preview Banner */}
                            <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2 shadow-sm">
                                <div className="flex items-center justify-between text-xs font-bold">
                                    <span className="flex items-center gap-1.5 text-slate-200">
                                        <span>📊 Live Impact Analysis</span>
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                        Effective from {effectiveDate}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                                        <div className="text-[10px] text-slate-400">Upcoming to Update</div>
                                        <div className="text-base font-bold text-rose-400 mt-0.5">
                                            {propagationImpact.upcomingCount}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                                        <div className="text-[10px] text-slate-400">In-House Stays</div>
                                        <div className="text-base font-bold text-amber-400 mt-0.5">
                                            {propagationImpact.inHouseCount}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                                        <div className="text-[10px] text-slate-400">Notice Emails</div>
                                        <div className="text-base font-bold text-blue-400 mt-0.5 flex items-center justify-center gap-1">
                                            {notifyGuests && notificationChannel === 'EMAIL' ? (
                                                <>
                                                    <Mail className="size-3 text-blue-400" />
                                                    <span>{propagationImpact.emailCount}</span>
                                                </>
                                            ) : (
                                                <span className="text-xs text-slate-400 font-semibold">Silent (0)</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-center">
                                        <div className="text-[10px] text-slate-400">Audit-Locked Past</div>
                                        <div className="text-base font-bold text-emerald-400 mt-0.5 flex items-center justify-center gap-1">
                                            <Lock className="size-3" />
                                            <span>100%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Audit Compliance Disclaimer */}
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[10.5px] text-slate-500 flex items-start gap-2">
                                <span className="text-slate-400 font-bold shrink-0 mt-0.5">⚖️</span>
                                <div>
                                    <span className="font-semibold text-slate-700">Fiscal Audit Protection: </span>
                                    Past settled folios and checked-out invoices are legally immutable under VAT Act regulations and cannot be retroactively adjusted.
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center justify-end gap-2.5">
                            <button
                                type="button"
                                onClick={() => setIsPropagationModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmPropagation}
                                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                            >
                                <CheckCircle2 className="size-4" />
                                <span>Confirm & Apply Tax Policy</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
