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
    ArrowDown
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';

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

        if (activeConfigId && activeConfigId !== 'NEW') {
            setConfigurations(prev =>
                prev.map(c =>
                    c.id === activeConfigId
                        ? {
                              ...c,
                              name: builderConfigName.trim(),
                              code: builderCode.trim().toUpperCase(),
                              module: builderModule,
                              startDate: builderStartDate,
                              endDate: builderEndDate,
                              status: builderStatus,
                              remarks: builderRemarks.trim(),
                              lines: linesWithOrder,
                          }
                        : c
                )
            );
            showToast('Tax configuration updated successfully!');
        } else {
            const newId = `tc-${Date.now()}`;
            const newCfg: TaxConfiguration = {
                id: newId,
                code: builderCode.trim().toUpperCase() || generateUniqueShortCode('TAX', configurations.map(c => c.code)),
                name: builderConfigName.trim(),
                module: builderModule,
                startDate: builderStartDate,
                endDate: builderEndDate,
                status: builderStatus,
                remarks: builderRemarks.trim(),
                lines: linesWithOrder,
            };
            setConfigurations(prev => [newCfg, ...prev]);
            setActiveConfigId(newId);
            showToast('New tax configuration created successfully!');
        }
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
    const handleDeleteConfig = (id: string, name: string) => {
        if (configurations.length <= 1) {
            showToast('You must keep at least one tax configuration', 'error');
            return;
        }
        if (confirm(`Are you sure you want to delete "${name}"?`)) {
            setConfigurations(prev => prev.filter(c => c.id !== id));
            showToast('Tax configuration deleted');
            if (activeConfigId === id) {
                const remaining = configurations.filter(c => c.id !== id);
                if (remaining.length > 0) selectConfigForBuilder(remaining[0]);
            }
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

    const handleDeleteMaster = (id: string, name: string) => {
        if (confirm(`Delete tax master "${name}"? It will be removed from all associated rules.`)) {
            setMasters(prev => prev.filter(m => m.id !== id));
            setBuilderLines(prev => prev.filter(l => l.taxMasterId !== id));
            showToast('Tax master deleted');
        }
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
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-16">
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
                icon={<Percent className="size-6 text-primary" />}
                actions={
                    activeTab === 'masters' ? (
                        <button
                            type="button"
                            onClick={() => openCreateMaster()}
                            className="btn-primary flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="size-4" />
                            <span>Add Tax Master</span>
                        </button>
                    ) : null
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Masters</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <ShieldCheck className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl text-slate-800 tracking-tight">{masters.length}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{masters.filter(m => m.status === 'Active').length} Active Masters</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Configurations</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                            <Layers className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl text-slate-800 tracking-tight">{configurations.length}</div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Bundled tax profiles</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Formula</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Calculator className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-xl text-slate-800 tracking-tight">{builderLines.length} Lines</div>
                    <div className="mt-1 text-[11px] text-amber-600 font-medium">In builder workspace</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Simulated Tax</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-mono">
                            ৳
                        </div>
                    </div>
                    <div className="mt-2 text-xl text-slate-800 tracking-tight font-mono">
                        ৳ {simulationResult.totalTax.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500 font-medium">Grand: ৳ {simulationResult.grand.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
            </div>

            {/* Standardized Navigation Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab('builder')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'builder'
                                ? 'bg-white text-slate-900 shadow-xs'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Calculator className="size-3.5" />
                        <span>Rule Builder & Simulator</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('configurations')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'configurations'
                                ? 'bg-white text-slate-900 shadow-xs'
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'masters'
                                ? 'bg-white text-slate-900 shadow-xs'
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
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'allocations'
                                ? 'bg-white text-slate-900 shadow-xs'
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
                <div className="space-y-6">
                    {/* Builder Header Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-700">
                                Active Rule Configuration:
                            </span>
                            <select
                                value={activeConfigId}
                                onChange={e => handleConfigDropdownChange(e.target.value)}
                                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
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
                                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 font-semibold transition"
                            >
                                <Plus className="size-3" />
                                <span>New Draft</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleSaveBuilder}
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                            >
                                <Save className="size-4" />
                                <span>Save Tax Rule</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Rule Pipeline Builder (7 Cols) */}
                        <div className="lg:col-span-7 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                                <div className="border-b border-slate-100 pb-3">
                                    <div className="text-sm text-slate-900 flex items-center gap-2">
                                        <SlidersHorizontal className="size-4 text-rose-600" />
                                        <span>Tax Execution Pipeline & Order</span>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        Drag or reorder steps. Choose whether each tax computes on original gross or running compound subtotal.
                                    </p>
                                </div>

                                {/* Config Meta Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Rule Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={builderConfigName}
                                            onChange={e => setBuilderConfigName(e.target.value)}
                                            placeholder="e.g. Standard 5-Star Rule"
                                            className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                            Short Code *
                                        </label>
                                        <input
                                            type="text"
                                            value={builderCode}
                                            onChange={e => setBuilderCode(e.target.value.toUpperCase())}
                                            className="w-full px-3 py-1.5 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                                        />
                                    </div>
                                </div>

                                {/* Pipeline Steps with Drag & Drop */}
                                <div className="space-y-2.5 pt-2">
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
                                                    className={`p-3 rounded-xl border transition-all duration-150 flex items-center justify-between gap-3 group select-none ${
                                                        isBeingDragged
                                                            ? 'opacity-40 scale-[0.98] border-dashed border-rose-400 bg-rose-50/40'
                                                            : isDragTarget
                                                            ? 'border-t-2 border-t-rose-500 bg-rose-50/20 shadow-xs'
                                                            : 'bg-slate-50/80 hover:bg-slate-100/70 border-slate-200/90 shadow-2xs hover:shadow-xs'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {/* Drag Handle */}
                                                        <div
                                                            className="cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded transition shrink-0"
                                                            title="Drag up or down to reorder calculation precedence"
                                                        >
                                                            <GripVertical className="size-4" />
                                                        </div>

                                                        {/* Execution Order Badge */}
                                                        <div className="size-6 rounded-md bg-rose-50 text-rose-700 border border-rose-200/70 text-xs flex items-center justify-center shrink-0">
                                                            {idx + 1}
                                                        </div>

                                                        {/* Tax Master Selector */}
                                                        <div className="min-w-0">
                                                            <select
                                                                value={line.taxMasterId}
                                                                onChange={e => updateLineMaster(idx, e.target.value)}
                                                                className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-400 truncate max-w-[200px] sm:max-w-none"
                                                            >
                                                                {masters.map(m => (
                                                                    <option key={m.id} value={m.id}>
                                                                        {m.name} ({m.rate}%) - {m.category}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                                                {master?.section || master?.remarks || 'Statutory rate'}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Calculation Basis & Controls */}
                                                    <div className="flex items-center gap-2 shrink-0">
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
                                                            className="px-2 py-1 text-[11px] font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none"
                                                        >
                                                            <option value="ORIGINAL_GROSS">Gross Basis (Flat)</option>
                                                            <option value="RUNNING_SUBTOTAL">
                                                                Running Subtotal (Compound)
                                                            </option>
                                                        </select>

                                                        {/* Accessible Up / Down Buttons */}
                                                        <div className="flex items-center gap-0.5">
                                                            <button
                                                                type="button"
                                                                disabled={idx === 0}
                                                                onClick={() => moveTaxLine(idx, 'UP')}
                                                                className="size-6 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                                title="Move Up"
                                                            >
                                                                <ArrowUp className="size-3" />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                disabled={idx === builderLines.length - 1}
                                                                onClick={() => moveTaxLine(idx, 'DOWN')}
                                                                className="size-6 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 text-xs flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
                                                                title="Move Down"
                                                            >
                                                                <ArrowDown className="size-3" />
                                                            </button>
                                                        </div>

                                                        {/* Remove Step */}
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTaxLine(idx)}
                                                            className="size-6 rounded hover:bg-rose-100 text-rose-600 flex items-center justify-center transition cursor-pointer"
                                                            title="Remove Tax Line"
                                                        >
                                                            <Trash2 className="size-3.5" />
                                                        </button>
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
                        <div className="lg:col-span-5 space-y-4">
                            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 space-y-4 shadow-2xs hover:shadow-xs transition">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="size-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                                            <Calculator className="size-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm text-slate-800">Live Bill & Tax Simulator</h3>
                                            <p className="text-[11px] text-slate-400">Real-time statutory tax evaluation in BDT (৳)</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 font-semibold flex items-center gap-1.5">
                                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div>
                            <h2 className="text-sm text-slate-900">
                                Master Tax Configurations
                            </h2>
                            <p className="text-xs text-slate-500">
                                Defined rule pipelines available for property and channel assignment.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleNewConfigBuilder}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                        >
                            <Plus className="size-4" />
                            <span>Create New Configuration</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {configurations.map(cfg => (
                            <div
                                key={cfg.id}
                                className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4 shadow-xs hover:border-rose-300 transition"
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="px-2 py-0.5 rounded font-mono text-xs bg-slate-100 text-slate-700 border border-slate-200">
                                            {cfg.code}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                            {cfg.status}
                                        </span>
                                    </div>
                                    <h3 className="text-slate-900 text-sm mb-1">
                                        {cfg.name}
                                    </h3>
                                    <p className="text-xs text-slate-400 line-clamp-2">{cfg.remarks}</p>

                                    {/* Lines Preview */}
                                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                                        <div className="text-[10px] text-slate-400 uppercase">
                                            Pipeline Steps ({cfg.lines.length}):
                                        </div>
                                        {cfg.lines.map((l, i) => {
                                            const m = masters.find(item => item.id === l.taxMasterId);
                                            return (
                                                <div
                                                    key={i}
                                                    className="text-xs text-slate-600 flex items-center justify-between"
                                                >
                                                    <span>
                                                        {i + 1}. {m?.name || 'Tax'}
                                                    </span>
                                                    <span className="font-mono text-rose-600 font-semibold">
                                                        {m?.rate}% ({l.calculationBasis === 'RUNNING_SUBTOTAL' ? 'Compound' : 'Flat'})
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        type="button"
                                        onClick={() => handleDuplicateConfig(cfg)}
                                        className="size-8 rounded-lg hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                        title="Duplicate Configuration"
                                    >
                                        <Copy className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            selectConfigForBuilder(cfg);
                                            setActiveTab('builder');
                                        }}
                                        className="size-8 rounded-lg hover:bg-slate-100 text-rose-600 flex items-center justify-center transition"
                                        title="Open in Builder"
                                    >
                                        <Edit2 className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleDeleteConfig(cfg.id, cfg.name)}
                                        className="size-8 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center justify-center transition"
                                        title="Delete Configuration"
                                    >
                                        <Trash2 className="size-4" />
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
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div>
                            <h2 className="text-sm text-slate-900">
                                Master Tax & Surcharge Catalog
                            </h2>
                            <p className="text-xs text-slate-500">
                                Statutory tax components (VAT, Service Charges, Municipality Fees, Sustainability Levies).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreateMaster}
                            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                        >
                            <Plus className="size-4" />
                            <span>Add Tax Master</span>
                        </button>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                                    <th className="py-3 px-4">Tax Name</th>
                                    <th className="py-3 px-4">Code</th>
                                    <th className="py-3 px-4">Category</th>
                                    <th className="py-3 px-4 text-right">Tax Rate (%)</th>
                                    <th className="py-3 px-4">Statutory Section</th>
                                    <th className="py-3 px-4 text-center">Status</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {masters.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50/70 transition">
                                        <td className="py-3 px-4 font-semibold text-slate-800">
                                            {m.name}
                                        </td>
                                        <td className="py-3 px-4 font-mono font-medium text-slate-700">
                                            <span className="px-2 py-0.5 bg-slate-100 rounded border border-slate-200 text-xs">
                                                {m.code}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
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
                                        <td className="py-3 px-4 text-right font-mono font-semibold text-rose-600 text-xs">
                                            {m.rate.toFixed(2)}%
                                        </td>
                                        <td className="py-3 px-4 text-slate-500">{m.section || '—'}</td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditMaster(m)}
                                                    className="size-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                                >
                                                    <Edit2 className="size-3.5" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteMaster(m.id, m.name)}
                                                    className="size-7 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center transition"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 4: CHANNELS & BRANCHES                                     */}
            {/* ============================================================== */}
            {activeTab === 'allocations' && (
                <div className="space-y-6">
                    {/* Channel Mappings Form */}
                    <form
                        onSubmit={handleSaveChannelMapping}
                        className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-sm text-slate-900">
                                    Global Channel Default Tax Policies
                                </h3>
                                <p className="text-xs text-slate-500">
                                    Set which tax rule automatically applies when billing via specific hotel operating channels.
                                </p>
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                            >
                                <Save className="size-4" />
                                <span>Save Channel Policies</span>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Front Desk & Rooms
                                </label>
                                <select
                                    value={channelMapping.dineInConfigId || ''}
                                    onChange={e =>
                                        setChannelMapping({ ...channelMapping, dineInConfigId: e.target.value })
                                    }
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
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
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
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
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                >
                                    {configurations.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <label className="flex items-center gap-2 pt-2 cursor-pointer">
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
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                        <div>
                            <h3 className="text-sm text-slate-900">
                                Property / Branch Tax BIN Allocations
                            </h3>
                            <p className="text-xs text-slate-500">
                                Statutory Business Identification Numbers (BIN) and custom localized tax rules per property.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                                        <th className="py-3 px-4">Property Name</th>
                                        <th className="py-3 px-4">Property Code</th>
                                        <th className="py-3 px-4">Tax BIN Registration #</th>
                                        <th className="py-3 px-4">Assigned Tax Rule</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {branchAllocations.map(br => (
                                        <tr key={br.id} className="hover:bg-slate-50/70">
                                            <td className="py-3 px-4 font-semibold text-slate-800">
                                                {br.name}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-slate-700">
                                                {br.code}
                                            </td>
                                            <td className="py-3 px-4 font-mono font-semibold text-rose-600">
                                                {br.branchBinNumber || '—'}
                                            </td>
                                            <td className="py-3 px-4 text-slate-600">
                                                {configurations.find(c => c.id === br.dineInConfigId)?.name ||
                                                    'Global Standard Rule'}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleUpdateBranchTax(br)}
                                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold transition"
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
        </div>
    );
}
