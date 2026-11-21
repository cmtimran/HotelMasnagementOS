import React, { useState, useEffect, useMemo } from 'react';
import {
    Wallet,
    CreditCard,
    Smartphone,
    Building2,
    Landmark,
    Plus,
    Trash2,
    Edit2,
    RotateCcw,
    Search,
    Layers,
    X,
    Utensils,
    BedDouble,
    Sparkles,
    ArrowUpRight,
    RefreshCw,
    Settings2,
    SlidersHorizontal,
    ShieldCheck
} from 'lucide-react';
import {
    type PaymentOutletId,
    type TenderCategory,
    type PosTerminalConfig,
    type PaymentMethodItem,
    type AcquiringBankOption,
    type PropertyBank,
    type CorporateLedgerItem,
    type HouseLedgerItem,
    type PropertyPaymentConfig,
    PROPERTY_OUTLETS_LIST,
    getDynamicTaxVatRate,
    getDynamicExpenseGlCode,
    getDynamicDefaultOutletIds,
    MFS_PROVIDER_SPECS,
    CARD_SCHEME_SPECS,
    resolveDynamicPropertyId,
    getPropertyPaymentConfig,
    savePropertyPaymentConfig,
    resetPropertyPaymentConfig,
    syncPropertyWithMasterData
} from '../utils/propertyPaymentMethodEngine';
import { toast } from '../context/ToastContext';
import { confirmModal } from '../context/ConfirmModalContext';

interface PaymentMethodSettingsTabProps {
    propertyId?: number;
    propertyName?: string;
    onSaveSuccess?: () => void;
}

export const PaymentMethodSettingsTab: React.FC<PaymentMethodSettingsTabProps> = ({
    propertyId: propIdProp,
    propertyName = 'Grand Palace Hotel & Resort',
    onSaveSuccess
}) => {
    // Dynamically resolve active property ID with zero static fallback
    const activePropertyId = useMemo(() => resolveDynamicPropertyId(propIdProp), [propIdProp]);

    // 5 Executive Navigation Tabs
    const [activeTab, setActiveTab] = useState<'matrix' | 'cards_pos' | 'mfs' | 'banks_pos' | 'ledgers'>('matrix');
    const [selectedOutletFilter, setSelectedOutletFilter] = useState<PaymentOutletId | 'ALL'>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Core Property Payment State
    const [config, setConfig] = useState<PropertyPaymentConfig>(() => getPropertyPaymentConfig(activePropertyId));

    // Rehydrate if propertyId changes
    useEffect(() => {
        setConfig(getPropertyPaymentConfig(activePropertyId));
    }, [activePropertyId]);

    // =========================================================================
    // PERSISTENCE HELPER: GUARANTEED ZERO DATA LOSS (NEVER REVERTS ON REFRESH)
    // =========================================================================
    const updateAndPersist = (newConfig: PropertyPaymentConfig, successMsg?: string) => {
        setConfig(newConfig);
        savePropertyPaymentConfig(activePropertyId, newConfig);
        if (successMsg) toast.success(successMsg);
        if (onSaveSuccess) onSaveSuccess();
    };

    // =========================================================================
    // MODALS STATE
    // =========================================================================

    // 1. Bank Modal
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<PropertyBank | null>(null);
    const [bankForm, setBankForm] = useState<Partial<PropertyBank>>({
        bankName: '',
        accountTitle: '',
        accountNumber: '',
        branchName: '',
        routingNumber: '',
        swiftCode: '',
        linkedGlCode: 'GL-1020 Cash at Bank',
        isDefaultSettlement: false,
        status: 'Active'
    });

    // 2. POS Terminal Modal
    const [isTerminalModalOpen, setIsTerminalModalOpen] = useState(false);
    const [editingTerminal, setEditingTerminal] = useState<PosTerminalConfig | null>(null);
    const [terminalForm, setTerminalForm] = useState<Partial<PosTerminalConfig>>({
        terminalName: '',
        bankName: '',
        tid: '',
        mid: '',
        deviceModel: 'Ingenico Move/5000',
        location: 'Front Desk Counter 1',
        assignedOutlets: ['FRONT_OFFICE'],
        settlementAccountTitle: '',
        settlementAccountNumber: '',
        status: 'Active'
    });

    // 3. Corporate Ledger Modal
    const [isCorporateModalOpen, setIsCorporateModalOpen] = useState(false);
    const [editingCorporate, setEditingCorporate] = useState<CorporateLedgerItem | null>(null);
    const [corporateForm, setCorporateForm] = useState<Partial<CorporateLedgerItem>>({
        companyName: '',
        ledgerCode: '',
        creditLimitBdt: 500000,
        billingContact: '',
        phone: '',
        status: 'Active'
    });

    // 4. House Ledger Modal (Complimentary / Entertainment)
    const [isHouseModalOpen, setIsHouseModalOpen] = useState(false);
    const [houseModalType, setHouseModalType] = useState<'COMPLIMENTARY' | 'ENTERTAINMENT'>('COMPLIMENTARY');
    const [editingHouse, setEditingHouse] = useState<HouseLedgerItem | null>(null);
    const [houseForm, setHouseForm] = useState<Partial<HouseLedgerItem>>({
        name: '',
        glCode: '',
        type: 'COMPLIMENTARY',
        approvalAuthority: 'General Manager',
        monthlyLimitBdt: 50000,
        status: 'Active'
    });

    // 5. Dynamic MFS Modal State
    const [isMfsModalOpen, setIsMfsModalOpen] = useState(false);
    const [editingMfs, setEditingMfs] = useState<PaymentMethodItem | null>(null);
    const [mfsForm, setMfsForm] = useState(() => ({
        providerName: 'bKash',
        customName: '',
        walletNumber: '',
        accountType: (MFS_PROVIDER_SPECS['bKash']?.defaultAccountType || 'MERCHANT') as 'MERCHANT' | 'PERSONAL' | 'AGENT' | 'AGGREGATOR',
        commissionRatePercent: MFS_PROVIDER_SPECS['bKash']?.defaultCommission ?? 1.50,
        vatOnCommissionPercent: getDynamicTaxVatRate(),
        feeAbsorbedBy: 'HOTEL' as 'HOTEL' | 'GUEST_SURCHARGE',
        settlementBankId: '',
        allowedOutlets: getDynamicDefaultOutletIds(),
        enabled: true
    }));

    // 6. Dynamic Card Scheme Modal State
    const [isCardSchemeModalOpen, setIsCardSchemeModalOpen] = useState(false);
    const [editingCardScheme, setEditingCardScheme] = useState<PaymentMethodItem | null>(null);
    const [cardSchemeForm, setCardSchemeForm] = useState(() => ({
        schemeName: 'Visa',
        customName: '',
        defaultCommissionRatePercent: CARD_SCHEME_SPECS['Visa'] ?? 1.50,
        vatOnCommissionPercent: getDynamicTaxVatRate(),
        feeAbsorbedBy: 'HOTEL' as 'HOTEL' | 'GUEST_SURCHARGE',
        allowedOutlets: getDynamicDefaultOutletIds(),
        enabled: true
    }));

    // 7. Terminal MDR Override Modal State
    const [isTerminalMdrModalOpen, setIsTerminalMdrModalOpen] = useState(false);
    const [targetTerminalForMdr, setTargetTerminalForMdr] = useState<PosTerminalConfig | null>(null);
    const [terminalMdrForm, setTerminalMdrForm] = useState<Record<string, number>>({});

    // 8. Card Scheme -> Attached Bank inline attach state
    const [attachingBankForCardId, setAttachingBankForCardId] = useState<string | null>(null);
    const [selectedBankOption, setSelectedBankOption] = useState<string>('');
    const [customBankNameInput, setCustomBankNameInput] = useState<string>('');
    const [newBankCommissionRate, setNewBankCommissionRate] = useState<number>(1.50);

    // =========================================================================
    // HANDLERS: OUTLET TENDERS TOGGLE
    // =========================================================================

    const handleToggleOutletForMethod = (methodId: string, outlet: PaymentOutletId) => {
        const updatedMethods = config.methods.map(m => {
            if (m.id !== methodId) return m;
            const active = m.allowedOutlets.includes(outlet);
            const updatedOutlets = active
                ? m.allowedOutlets.filter(o => o !== outlet)
                : [...m.allowedOutlets, outlet];
            return { ...m, allowedOutlets: updatedOutlets };
        });
        updateAndPersist({ ...config, methods: updatedMethods });
    };

    const handleToggleGlobalMethod = (methodId: string) => {
        const updatedMethods = config.methods.map(m => {
            if (m.id !== methodId) return m;
            return { ...m, enabled: !m.enabled };
        });
        updateAndPersist({ ...config, methods: updatedMethods });
    };

    // =========================================================================
    // HANDLERS: DYNAMIC MFS (MOBILE BANKING) CRUD
    // =========================================================================

    const handleOpenAddMfs = () => {
        setEditingMfs(null);
        const defaultSpec = MFS_PROVIDER_SPECS['bKash'];
        setMfsForm({
            providerName: 'bKash',
            customName: '',
            walletNumber: '',
            accountType: defaultSpec?.defaultAccountType || 'MERCHANT',
            commissionRatePercent: defaultSpec?.defaultCommission ?? 1.50,
            vatOnCommissionPercent: getDynamicTaxVatRate(),
            feeAbsorbedBy: 'HOTEL',
            settlementBankId: config.registeredBanks[0]?.bankName || '',
            allowedOutlets: getDynamicDefaultOutletIds(),
            enabled: true
        });
        setIsMfsModalOpen(true);
    };

    const handleOpenEditMfs = (mfs: PaymentMethodItem) => {
        setEditingMfs(mfs);
        const isPredefined = ['bKash', 'Rocket', 'Nagad', 'Upay', 'CellFin'].includes(mfs.subType);
        const fallbackSpec = MFS_PROVIDER_SPECS[mfs.subType];
        const comm = mfs.defaultCommissionRate ?? mfs.acquiringBanks?.[0]?.commissionRule.commissionRatePercent ?? fallbackSpec?.defaultCommission ?? 1.50;
        setMfsForm({
            providerName: isPredefined ? mfs.subType : 'Custom',
            customName: isPredefined ? '' : mfs.displayName,
            walletNumber: mfs.walletNumber || '',
            accountType: mfs.accountType || fallbackSpec?.defaultAccountType || 'MERCHANT',
            commissionRatePercent: comm,
            vatOnCommissionPercent: mfs.acquiringBanks?.[0]?.commissionRule.vatOnCommissionPercent ?? getDynamicTaxVatRate(),
            feeAbsorbedBy: mfs.acquiringBanks?.[0]?.commissionRule.feeAbsorbedBy ?? 'HOTEL',
            settlementBankId: mfs.acquiringBanks?.[0]?.bankName || config.registeredBanks[0]?.bankName || '',
            allowedOutlets: mfs.allowedOutlets && mfs.allowedOutlets.length > 0 ? mfs.allowedOutlets : getDynamicDefaultOutletIds(),
            enabled: mfs.enabled
        });
        setIsMfsModalOpen(true);
    };

    const handleSaveMfs = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = mfsForm.providerName === 'Custom' ? mfsForm.customName.trim() : mfsForm.providerName;
        if (!finalName) {
            toast.error('Provider name is required.');
            return;
        }
        const finalSubType = mfsForm.providerName === 'Custom' ? finalName : mfsForm.providerName;
        const rate = Number(mfsForm.commissionRatePercent) || 0;

        let updatedMethods: PaymentMethodItem[];
        if (editingMfs) {
            updatedMethods = config.methods.map(m => {
                if (m.id !== editingMfs.id) return m;
                const updatedAcq = (m.acquiringBanks && m.acquiringBanks.length > 0)
                    ? m.acquiringBanks.map(a => ({
                        ...a,
                        bankName: mfsForm.settlementBankId || a.bankName,
                        commissionRule: {
                            ...a.commissionRule,
                            commissionRatePercent: rate,
                            vatOnCommissionPercent: mfsForm.vatOnCommissionPercent,
                            feeAbsorbedBy: mfsForm.feeAbsorbedBy
                        }
                    }))
                    : [{
                        id: `acq-${m.id}`,
                        bankName: mfsForm.settlementBankId || config.registeredBanks[0]?.bankName || 'Settlement Bank',
                        settlementAccount: 'Operations A/C',
                        enabled: true,
                        commissionRule: {
                            commissionRatePercent: rate,
                            flatFeeBdt: 0,
                            vatOnCommissionPercent: mfsForm.vatOnCommissionPercent,
                            feeAbsorbedBy: mfsForm.feeAbsorbedBy,
                            expenseGlCode: getDynamicExpenseGlCode('BANK_CHARGES')
                        }
                    }];
                return {
                    ...m,
                    subType: finalSubType,
                    displayName: finalName,
                    walletNumber: mfsForm.walletNumber,
                    accountType: mfsForm.accountType,
                    defaultCommissionRate: rate,
                    allowedOutlets: mfsForm.allowedOutlets,
                    enabled: mfsForm.enabled,
                    acquiringBanks: updatedAcq
                };
            });
            updateAndPersist({ ...config, methods: updatedMethods }, `${finalName} updated successfully.`);
        } else {
            const newId = `meth-mfs-${Date.now()}`;
            const newMethod: PaymentMethodItem = {
                id: newId,
                category: 'MOBILE_BANKING',
                subType: finalSubType,
                displayName: finalName,
                walletNumber: mfsForm.walletNumber,
                accountType: mfsForm.accountType,
                defaultCommissionRate: rate,
                allowedOutlets: mfsForm.allowedOutlets,
                requiresReference: true,
                referencePlaceholder: `${finalName} TrxID / Ref`,
                enabled: mfsForm.enabled,
                description: `Mobile Financial Services payment collected via ${finalName} (${mfsForm.accountType}).`,
                acquiringBanks: [{
                    id: `acq-${newId}`,
                    bankName: mfsForm.settlementBankId || config.registeredBanks[0]?.bankName || 'Settlement Bank',
                    settlementAccount: 'Operations A/C',
                    enabled: true,
                    commissionRule: {
                        commissionRatePercent: rate,
                        flatFeeBdt: 0,
                        vatOnCommissionPercent: mfsForm.vatOnCommissionPercent,
                        feeAbsorbedBy: mfsForm.feeAbsorbedBy,
                        expenseGlCode: 'GL-5040 Bank Charges'
                    }
                }]
            };
            updatedMethods = [...config.methods, newMethod];
            updateAndPersist({ ...config, methods: updatedMethods }, `${finalName} added to Mobile Banking.`);
        }
        setIsMfsModalOpen(false);
    };

    const handleDeleteMfs = async (methodId: string) => {
        const target = config.methods.find(m => m.id === methodId);
        if (!target) return;
        const confirmed = await confirmModal({
            title: `Delete ${target.displayName}?`,
            message: `Are you sure you want to remove ${target.displayName} from Mobile Banking payment tenders?`,
            confirmText: 'Delete Provider',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updatedMethods = config.methods.filter(m => m.id !== methodId);
        updateAndPersist({ ...config, methods: updatedMethods }, `${target.displayName} deleted.`);
    };

    // =========================================================================
    // HANDLERS: DYNAMIC CARD SCHEMES CRUD & ATTACHED BANKS (CARD > VISA > BANK)
    // =========================================================================

    const handleOpenAddCardScheme = () => {
        setEditingCardScheme(null);
        setCardSchemeForm({
            schemeName: 'Visa',
            customName: '',
            defaultCommissionRatePercent: CARD_SCHEME_SPECS['Visa'] ?? 1.50,
            vatOnCommissionPercent: getDynamicTaxVatRate(),
            feeAbsorbedBy: 'HOTEL',
            allowedOutlets: getDynamicDefaultOutletIds(),
            enabled: true
        });
        setIsCardSchemeModalOpen(true);
    };

    const handleOpenEditCardScheme = (scheme: PaymentMethodItem) => {
        setEditingCardScheme(scheme);
        const isPredefined = ['Visa', 'MasterCard', 'American Express', 'UnionPay', 'JCB'].includes(scheme.subType);
        const fallbackRate = CARD_SCHEME_SPECS[scheme.subType] ?? 1.50;
        const comm = scheme.defaultCommissionRate ?? scheme.acquiringBanks?.[0]?.commissionRule.commissionRatePercent ?? fallbackRate;
        setCardSchemeForm({
            schemeName: isPredefined ? scheme.subType : 'Custom',
            customName: isPredefined ? '' : scheme.subType,
            defaultCommissionRatePercent: comm,
            vatOnCommissionPercent: scheme.acquiringBanks?.[0]?.commissionRule.vatOnCommissionPercent ?? getDynamicTaxVatRate(),
            feeAbsorbedBy: scheme.acquiringBanks?.[0]?.commissionRule.feeAbsorbedBy ?? 'HOTEL',
            allowedOutlets: scheme.allowedOutlets && scheme.allowedOutlets.length > 0 ? scheme.allowedOutlets : getDynamicDefaultOutletIds(),
            enabled: scheme.enabled
        });
        setIsCardSchemeModalOpen(true);
    };

    const handleSaveCardScheme = (e: React.FormEvent) => {
        e.preventDefault();
        const finalName = cardSchemeForm.schemeName === 'Custom' ? cardSchemeForm.customName.trim() : cardSchemeForm.schemeName;
        if (!finalName) {
            toast.error('Card Scheme name is required.');
            return;
        }
        const rate = Number(cardSchemeForm.defaultCommissionRatePercent) || 0;
        const displayName = finalName.trim(); // Pure exact user name without forced suffix

        let updatedMethods: PaymentMethodItem[];
        if (editingCardScheme) {
            const oldRate = editingCardScheme.defaultCommissionRate;
            updatedMethods = config.methods.map(m => {
                if (m.id !== editingCardScheme.id) return m;
                const updatedAcq = (m.acquiringBanks || []).map(a => ({
                    ...a,
                    commissionRule: {
                        ...a.commissionRule,
                        commissionRatePercent: a.commissionRule.commissionRatePercent === oldRate ? rate : a.commissionRule.commissionRatePercent,
                        vatOnCommissionPercent: cardSchemeForm.vatOnCommissionPercent,
                        feeAbsorbedBy: cardSchemeForm.feeAbsorbedBy
                    }
                }));
                return {
                    ...m,
                    subType: finalName,
                    displayName,
                    defaultCommissionRate: rate,
                    allowedOutlets: cardSchemeForm.allowedOutlets,
                    enabled: cardSchemeForm.enabled,
                    acquiringBanks: updatedAcq
                };
            });
            updateAndPersist({ ...config, methods: updatedMethods }, `${displayName} card scheme updated.`);
        } else {
            const newId = `meth-card-${Date.now()}`;
            const newMethod: PaymentMethodItem = {
                id: newId,
                category: 'CARD',
                subType: finalName,
                displayName,
                defaultCommissionRate: rate,
                allowedOutlets: cardSchemeForm.allowedOutlets,
                requiresReference: true,
                referencePlaceholder: 'Card Last 4 / Auth Code',
                enabled: cardSchemeForm.enabled,
                description: `Electronic payment collected via ${finalName}.`,
                acquiringBanks: []
            };
            updatedMethods = [...config.methods, newMethod];
            updateAndPersist({ ...config, methods: updatedMethods }, `${displayName} card scheme added.`);
        }
        setIsCardSchemeModalOpen(false);
    };

    const handleDeleteCardScheme = async (schemeId: string) => {
        const target = config.methods.find(m => m.id === schemeId);
        if (!target) return;
        const confirmed = await confirmModal({
            title: `Delete ${target.displayName}?`,
            message: `Are you sure you want to remove ${target.displayName} from Card Schemes? Any acquiring bank links for this scheme will also be removed.`,
            confirmText: 'Delete Scheme',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updatedMethods = config.methods.filter(m => m.id !== schemeId);
        updateAndPersist({ ...config, methods: updatedMethods }, `${target.displayName} deleted.`);
    };

    // Card > Scheme > Attached Bank Management (Hierarchy: Card > Visa > Asia Bank Plc.)
    const handleStartAttachBank = (cardId: string, defaultComm: number) => {
        setAttachingBankForCardId(cardId);
        setNewBankCommissionRate(defaultComm);
        setSelectedBankOption(config.registeredBanks[0]?.bankName || '__NEW__');
        setCustomBankNameInput('');
    };

    const handleConfirmAttachBank = (cardId: string) => {
        const targetCard = config.methods.find(m => m.id === cardId);
        if (!targetCard) return;

        const bankName = (selectedBankOption === '__NEW__' || !selectedBankOption)
            ? customBankNameInput.trim()
            : selectedBankOption.trim();

        if (!bankName) {
            toast.error('Bank name is required.');
            return;
        }

        const existingBanks = targetCard.acquiringBanks || [];
        if (existingBanks.some(a => a.bankName.toLowerCase() === bankName.toLowerCase())) {
            toast.error(`${bankName} is already attached to ${targetCard.displayName}.`);
            return;
        }

        const rate = Number(newBankCommissionRate) || 0;
        const newAcq: AcquiringBankOption = {
            id: `acq-${cardId}-${Date.now()}`,
            bankName,
            commissionRule: {
                commissionRatePercent: rate,
                flatFeeBdt: 0,
                vatOnCommissionPercent: getDynamicTaxVatRate(),
                feeAbsorbedBy: 'HOTEL',
                expenseGlCode: getDynamicExpenseGlCode('BANK_CHARGES')
            },
            settlementAccount: 'Operations A/C',
            enabled: true
        };

        // If the bank is not yet in registeredBanks, register it dynamically
        let updatedRegisteredBanks = config.registeredBanks || [];
        if (!updatedRegisteredBanks.some(b => b.bankName.toLowerCase() === bankName.toLowerCase())) {
            const newRegBank: PropertyBank = {
                id: `bank-${Date.now()}`,
                bankName,
                accountTitle: `${propertyName} Operations A/C`,
                accountNumber: '',
                branchName: '',
                routingNumber: '',
                swiftCode: '',
                linkedGlCode: 'GL-1020 Cash at Bank',
                isDefaultSettlement: updatedRegisteredBanks.length === 0,
                status: 'Active'
            };
            updatedRegisteredBanks = [...updatedRegisteredBanks, newRegBank];
        }

        const updatedMethods = config.methods.map(m => {
            if (m.id !== cardId) return m;
            return {
                ...m,
                acquiringBanks: [...(m.acquiringBanks || []), newAcq]
            };
        });

        const updatedConfig: PropertyPaymentConfig = {
            ...config,
            registeredBanks: updatedRegisteredBanks,
            methods: updatedMethods
        };

        updateAndPersist(updatedConfig, `${bankName} attached to ${targetCard.displayName}.`);
        setAttachingBankForCardId(null);
        setCustomBankNameInput('');
    };

    const handleUpdateBankCommission = (cardId: string, acqId: string, newRate: number) => {
        const rate = Number(newRate) || 0;
        const updatedMethods = config.methods.map(m => {
            if (m.id !== cardId) return m;
            return {
                ...m,
                acquiringBanks: (m.acquiringBanks || []).map(a => {
                    if (a.id !== acqId) return a;
                    return {
                        ...a,
                        commissionRule: {
                            ...a.commissionRule,
                            commissionRatePercent: rate
                        }
                    };
                })
            };
        });

        updateAndPersist({ ...config, methods: updatedMethods });
    };

    const handleDetachBankFromCard = (cardId: string, acqId: string, bankName: string) => {
        const targetCard = config.methods.find(m => m.id === cardId);
        if (!targetCard) return;

        const updatedMethods = config.methods.map(m => {
            if (m.id !== cardId) return m;
            return {
                ...m,
                acquiringBanks: (m.acquiringBanks || []).filter(a => a.id !== acqId)
            };
        });

        updateAndPersist({ ...config, methods: updatedMethods }, `${bankName} detached from ${targetCard.displayName}.`);
    };

    const handleUpdateSchemeBaseCommission = (cardId: string, newRate: number) => {
        const rate = Number(newRate) || 0;
        const targetCard = config.methods.find(m => m.id === cardId);
        if (!targetCard) return;
        const oldRate = targetCard.defaultCommissionRate;

        const updatedMethods = config.methods.map(m => {
            if (m.id !== cardId) return m;
            return {
                ...m,
                defaultCommissionRate: rate,
                acquiringBanks: (m.acquiringBanks || []).map(a => {
                    if (a.commissionRule.commissionRatePercent === oldRate) {
                        return {
                            ...a,
                            commissionRule: {
                                ...a.commissionRule,
                                commissionRatePercent: rate
                            }
                        };
                    }
                    return a;
                })
            };
        });

        updateAndPersist({ ...config, methods: updatedMethods }, `${targetCard.displayName} base commission updated to ${rate}%.`);
    };

    // =========================================================================
    // HANDLERS: POS TERMINALS CRUD & MDR OVERRIDES
    // =========================================================================

    const handleOpenTerminalMdrModal = (terminal: PosTerminalConfig) => {
        setTargetTerminalForMdr(terminal);
        const cardMethods = config.methods.filter(m => m.category === 'CARD');
        const initialRates: Record<string, number> = {};
        cardMethods.forEach(card => {
            const matchedAcq = card.acquiringBanks?.find(a => 
                a.posTerminalId === terminal.id || 
                (a.bankName && a.bankName.toLowerCase() === terminal.bankName.toLowerCase())
            );
            initialRates[card.id] = matchedAcq?.commissionRule.commissionRatePercent ?? card.defaultCommissionRate ?? 1.50;
        });
        setTerminalMdrForm(initialRates);
        setIsTerminalMdrModalOpen(true);
    };

    const handleSaveTerminalMdr = (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetTerminalForMdr) return;
        const term = targetTerminalForMdr;

        const updatedMethods = config.methods.map(card => {
            if (card.category !== 'CARD') return card;
            const rateForThisTerminal = terminalMdrForm[card.id];
            if (rateForThisTerminal === undefined) return card;

            const existingAcqs = card.acquiringBanks || [];
            const hasMatching = existingAcqs.some(a => 
                a.posTerminalId === term.id || 
                (a.bankName && a.bankName.toLowerCase() === term.bankName.toLowerCase())
            );

            let updatedAcqs: AcquiringBankOption[];
            if (hasMatching) {
                updatedAcqs = existingAcqs.map(a => {
                    if (a.posTerminalId === term.id || (a.bankName && a.bankName.toLowerCase() === term.bankName.toLowerCase())) {
                        return {
                            ...a,
                            posTerminalId: term.id,
                            posTerminalName: term.terminalName,
                            commissionRule: {
                                ...a.commissionRule,
                                commissionRatePercent: Number(rateForThisTerminal) || 0
                            }
                        };
                    }
                    return a;
                });
            } else {
                updatedAcqs = [
                    ...existingAcqs,
                    {
                        id: `acq-${card.id}-${term.id}`,
                        bankName: term.bankName,
                        posTerminalId: term.id,
                        posTerminalName: term.terminalName,
                        settlementAccount: term.settlementAccountNumber,
                        enabled: true,
                        commissionRule: {
                            commissionRatePercent: Number(rateForThisTerminal) || 0,
                            flatFeeBdt: 0,
                            vatOnCommissionPercent: getDynamicTaxVatRate(),
                            feeAbsorbedBy: 'HOTEL',
                            expenseGlCode: getDynamicExpenseGlCode('BANK_CHARGES')
                        }
                    }
                ];
            }

            return {
                ...card,
                acquiringBanks: updatedAcqs
            };
        });

        updateAndPersist({ ...config, methods: updatedMethods }, `MDR Commission rates updated for ${term.terminalName}.`);
        setIsTerminalMdrModalOpen(false);
    };

    const handleOpenAddBank = () => {
        setEditingBank(null);
        setBankForm({
            bankName: '',
            accountTitle: `${propertyName} Operations A/C`,
            accountNumber: '',
            branchName: '',
            routingNumber: '',
            swiftCode: '',
            linkedGlCode: 'GL-1020 Cash at Bank',
            isDefaultSettlement: (config.registeredBanks || []).length === 0,
            status: 'Active'
        });
        setIsBankModalOpen(true);
    };

    const handleOpenEditBank = (bank: PropertyBank) => {
        setEditingBank(bank);
        setBankForm({ ...bank });
        setIsBankModalOpen(true);
    };

    const handleSaveBank = () => {
        if (!bankForm.bankName || !bankForm.accountNumber) {
            toast.error('Bank Name and Account Number are required.');
            return;
        }

        const newBank: PropertyBank = {
            id: editingBank ? editingBank.id : `bank-${Date.now()}`,
            bankName: bankForm.bankName.trim(),
            accountTitle: bankForm.accountTitle?.trim() || `${propertyName} Operations A/C`,
            accountNumber: bankForm.accountNumber.trim(),
            branchName: bankForm.branchName?.trim() || '',
            routingNumber: bankForm.routingNumber?.trim() || '',
            swiftCode: bankForm.swiftCode?.trim() || '',
            linkedGlCode: bankForm.linkedGlCode || 'GL-1020 Cash at Bank',
            isDefaultSettlement: Boolean(bankForm.isDefaultSettlement),
            status: bankForm.status || 'Active'
        };

        const list = config.registeredBanks || [];
        let updatedList: PropertyBank[];
        if (newBank.isDefaultSettlement) {
            updatedList = list.map(b => ({ ...b, isDefaultSettlement: false }));
        } else {
            updatedList = [...list];
        }

        const exists = updatedList.some(b => b.id === newBank.id);
        if (exists) {
            updatedList = updatedList.map(b => b.id === newBank.id ? newBank : b);
        } else {
            updatedList.push(newBank);
        }

        updateAndPersist({ ...config, registeredBanks: updatedList }, `Bank ${newBank.bankName} saved.`);
        setIsBankModalOpen(false);
        setEditingBank(null);
    };

    const handleDeleteBank = async (bankId: string) => {
        const target = config.registeredBanks.find(b => b.id === bankId);
        if (!target) return;
        const confirmed = await confirmModal({
            title: `Delete Bank "${target.bankName}"?`,
            message: `Are you sure you want to delete ${target.bankName}? Any POS machines or schemes linked to this bank will be unlinked.`,
            confirmText: 'Delete Bank',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updatedConfig: PropertyPaymentConfig = {
            ...config,
            registeredBanks: config.registeredBanks.filter(b => b.id !== bankId),
            posTerminals: config.posTerminals.filter(t => t.bankName !== target.bankName),
            methods: config.methods.map(m => {
                if (!m.acquiringBanks) return m;
                return {
                    ...m,
                    acquiringBanks: m.acquiringBanks.filter(b => b.bankName !== target.bankName)
                };
            })
        };
        updateAndPersist(updatedConfig, 'Bank deleted.');
    };

    const handleOpenAddTerminal = () => {
        if (!config.registeredBanks || config.registeredBanks.length === 0) {
            toast.error('Please add at least one Bank first before registering a POS machine.');
            return;
        }
        const defaultBank = config.registeredBanks[0];
        setEditingTerminal(null);
        setTerminalForm({
            terminalName: '',
            bankName: defaultBank.bankName,
            tid: '',
            mid: '',
            deviceModel: 'Ingenico Move/5000',
            location: 'Front Desk Counter 1',
            assignedOutlets: ['FRONT_OFFICE'],
            settlementAccountTitle: defaultBank.accountTitle,
            settlementAccountNumber: defaultBank.accountNumber,
            status: 'Active'
        });
        setIsTerminalModalOpen(true);
    };

    const handleOpenEditTerminal = (terminal: PosTerminalConfig) => {
        setEditingTerminal(terminal);
        setTerminalForm({ ...terminal });
        setIsTerminalModalOpen(true);
    };

    const handleSaveTerminal = () => {
        if (!terminalForm.terminalName || !terminalForm.tid || !terminalForm.mid) {
            toast.error('Terminal Name, TID, and MID are mandatory.');
            return;
        }

        const matchedBank = config.registeredBanks.find(b => b.bankName === terminalForm.bankName) || config.registeredBanks[0];
        const newTerminal: PosTerminalConfig = {
            id: editingTerminal ? editingTerminal.id : `term-${Date.now()}`,
            terminalName: terminalForm.terminalName.trim(),
            bankName: terminalForm.bankName || matchedBank?.bankName || 'General POS',
            tid: terminalForm.tid.trim(),
            mid: terminalForm.mid.trim(),
            deviceModel: terminalForm.deviceModel || 'Ingenico Move/5000',
            location: terminalForm.location || 'Front Desk Counter 1',
            assignedOutlets: terminalForm.assignedOutlets || ['FRONT_OFFICE'],
            settlementAccountTitle: terminalForm.settlementAccountTitle || matchedBank?.accountTitle || `${propertyName} Operations A/C`,
            settlementAccountNumber: terminalForm.settlementAccountNumber || matchedBank?.accountNumber || '',
            status: terminalForm.status || 'Active'
        };

        const list = config.posTerminals || [];
        const exists = list.some(t => t.id === newTerminal.id);
        const updated = exists ? list.map(t => t.id === newTerminal.id ? newTerminal : t) : [...list, newTerminal];

        updateAndPersist({ ...config, posTerminals: updated }, `POS Terminal ${newTerminal.terminalName} saved.`);
        setIsTerminalModalOpen(false);
        setEditingTerminal(null);
    };

    const handleDeleteTerminal = async (terminalId: string) => {
        const target = config.posTerminals.find(t => t.id === terminalId);
        const name = target?.terminalName || 'this POS terminal';
        const confirmed = await confirmModal({
            title: `Delete POS Terminal?`,
            message: `Are you sure you want to delete "${name}"? Physical transactions will no longer route to this device.`,
            confirmText: 'Delete Terminal',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updated = config.posTerminals.filter(t => t.id !== terminalId);
        updateAndPersist({ ...config, posTerminals: updated }, 'POS Terminal deleted.');
    };

    // =========================================================================
    // HANDLERS: CORPORATE & HOUSE LEDGERS
    // =========================================================================

    const handleOpenAddCorporate = () => {
        setEditingCorporate(null);
        setCorporateForm({
            companyName: '',
            ledgerCode: '',
            creditLimitBdt: 500000,
            billingContact: '',
            phone: '',
            status: 'Active'
        });
        setIsCorporateModalOpen(true);
    };

    const handleSaveCorporate = () => {
        if (!corporateForm.companyName || !corporateForm.ledgerCode) {
            toast.error('Company Name and Ledger Code are required.');
            return;
        }

        const newCorp: CorporateLedgerItem = {
            id: editingCorporate ? editingCorporate.id : `corp-${Date.now()}`,
            companyName: corporateForm.companyName.trim(),
            ledgerCode: corporateForm.ledgerCode.trim(),
            creditLimitBdt: Number(corporateForm.creditLimitBdt) || 0,
            billingContact: corporateForm.billingContact?.trim() || '',
            phone: corporateForm.phone?.trim() || '',
            status: corporateForm.status || 'Active'
        };

        const list = config.corporateLedgers || [];
        const exists = list.some(c => c.id === newCorp.id);
        const updatedCorpList = exists ? list.map(c => c.id === newCorp.id ? newCorp : c) : [...list, newCorp];

        const updatedMethods = config.methods.map(m => {
            if (m.category === 'COMPANY_ACCOUNT') {
                return {
                    ...m,
                    ledgerNames: updatedCorpList.filter(c => c.status === 'Active').map(c => `${c.companyName} (${c.ledgerCode})`)
                };
            }
            return m;
        });

        updateAndPersist({ ...config, corporateLedgers: updatedCorpList, methods: updatedMethods }, `Corporate account ${newCorp.companyName} saved.`);
        setIsCorporateModalOpen(false);
        setEditingCorporate(null);
    };

    const handleDeleteCorporate = async (corpId: string) => {
        const target = config.corporateLedgers.filter(c => c.id === corpId)[0];
        const name = target?.companyName || 'this corporate billing client';
        const confirmed = await confirmModal({
            title: `Delete Corporate Client?`,
            message: `Are you sure you want to delete corporate billing client "${name}"? Open ledger folios must be settled separately.`,
            confirmText: 'Delete Client',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updatedCorpList = config.corporateLedgers.filter(c => c.id !== corpId);
        const updatedMethods = config.methods.map(m => {
            if (m.category === 'COMPANY_ACCOUNT') {
                return {
                    ...m,
                    ledgerNames: updatedCorpList.filter(c => c.status === 'Active').map(c => `${c.companyName} (${c.ledgerCode})`)
                };
            }
            return m;
        });
        updateAndPersist({ ...config, corporateLedgers: updatedCorpList, methods: updatedMethods }, 'Corporate client deleted.');
    };

    const handleOpenAddHouse = (type: 'COMPLIMENTARY' | 'ENTERTAINMENT') => {
        setHouseModalType(type);
        setEditingHouse(null);
        setHouseForm({
            name: '',
            glCode: type === 'COMPLIMENTARY' ? 'GL-4910' : 'GL-5100',
            type,
            approvalAuthority: 'General Manager',
            monthlyLimitBdt: type === 'COMPLIMENTARY' ? 50000 : 30000,
            status: 'Active'
        });
        setIsHouseModalOpen(true);
    };

    const handleSaveHouse = () => {
        if (!houseForm.name || !houseForm.glCode) {
            toast.error('Ledger Name and GL Code are required.');
            return;
        }

        const newHouse: HouseLedgerItem = {
            id: editingHouse ? editingHouse.id : `house-${Date.now()}`,
            name: houseForm.name.trim(),
            glCode: houseForm.glCode.trim(),
            type: houseModalType,
            approvalAuthority: houseForm.approvalAuthority || 'General Manager',
            monthlyLimitBdt: Number(houseForm.monthlyLimitBdt) || 0,
            status: houseForm.status || 'Active'
        };

        const list = config.houseLedgers || [];
        const exists = list.some(h => h.id === newHouse.id);
        const updatedHouseList = exists ? list.map(h => h.id === newHouse.id ? newHouse : h) : [...list, newHouse];

        const compLedgers = updatedHouseList.filter(h => h.status === 'Active' && h.type === 'COMPLIMENTARY').map(h => `${h.name} (${h.glCode})`);
        const entLedgers = updatedHouseList.filter(h => h.status === 'Active' && h.type === 'ENTERTAINMENT').map(h => `${h.name} (${h.glCode})`);

        const updatedMethods = config.methods.map(m => {
            if (m.category === 'COMPLIMENTARY') return { ...m, ledgerNames: compLedgers };
            if (m.category === 'ENTERTAINMENT') return { ...m, ledgerNames: entLedgers };
            return m;
        });

        updateAndPersist({ ...config, houseLedgers: updatedHouseList, methods: updatedMethods }, `Ledger ${newHouse.name} saved.`);
        setIsHouseModalOpen(false);
        setEditingHouse(null);
    };

    const handleDeleteHouse = async (houseId: string) => {
        const target = config.houseLedgers.find(h => h.id === houseId);
        const name = target?.name || 'this house ledger quota';
        const confirmed = await confirmModal({
            title: `Delete House Ledger?`,
            message: `Are you sure you want to delete house ledger quota "${name}"?`,
            confirmText: 'Delete Quota',
            variant: 'danger'
        });
        if (!confirmed) return;

        const updatedHouseList = config.houseLedgers.filter(h => h.id !== houseId);
        const compLedgers = updatedHouseList.filter(h => h.status === 'Active' && h.type === 'COMPLIMENTARY').map(h => `${h.name} (${h.glCode})`);
        const entLedgers = updatedHouseList.filter(h => h.status === 'Active' && h.type === 'ENTERTAINMENT').map(h => `${h.name} (${h.glCode})`);

        const updatedMethods = config.methods.map(m => {
            if (m.category === 'COMPLIMENTARY') return { ...m, ledgerNames: compLedgers };
            if (m.category === 'ENTERTAINMENT') return { ...m, ledgerNames: entLedgers };
            return m;
        });

        updateAndPersist({ ...config, houseLedgers: updatedHouseList, methods: updatedMethods }, 'House ledger deleted.');
    };

    // =========================================================================
    // SYSTEM ACTIONS: SYNC MASTER & FACTORY RESET
    // =========================================================================

    const handleSyncMaster = () => {
        try {
            const synced = syncPropertyWithMasterData(activePropertyId);
            setConfig(synced);
            savePropertyPaymentConfig(activePropertyId, synced);
            toast.success(`Synchronized with Central Master Data.`);
        } catch {
            toast.error('Failed to synchronize with master data.');
        }
    };

    const handleResetDefaults = async () => {
        const confirmed = await confirmModal({
            title: 'Reset Payment Tenders to Defaults?',
            message: 'Are you sure you want to reset all payment methods, acquiring bank routing, and tender rules back to statutory system defaults?',
            confirmText: 'Reset Defaults',
            variant: 'warning'
        });
        if (!confirmed) return;

        const restored = resetPropertyPaymentConfig(activePropertyId);
        setConfig(restored);
        savePropertyPaymentConfig(activePropertyId, restored);
        toast.success('Payment methods reset to defaults.');
    };

    // Category Icon Helper
    const getCategoryIcon = (category: TenderCategory, size = 15) => {
        switch (category) {
            case 'CASH': return <Landmark size={size} className="text-emerald-600" />;
            case 'CARD': return <CreditCard size={size} className="text-blue-600" />;
            case 'MOBILE_BANKING': return <Smartphone size={size} className="text-pink-600" />;
            case 'BANK_TRANSFER': return <Building2 size={size} className="text-indigo-600" />;
            case 'COMPANY_ACCOUNT': return <Layers size={size} className="text-amber-600" />;
            case 'ONLINE_GATEWAY': return <ArrowUpRight size={size} className="text-purple-600" />;
            case 'ROOM_CREDIT': return <BedDouble size={size} className="text-cyan-600" />;
            case 'COMPLIMENTARY': return <Sparkles size={size} className="text-rose-600" />;
            case 'ENTERTAINMENT': return <Utensils size={size} className="text-orange-600" />;
            default: return <Wallet size={size} className="text-slate-600" />;
        }
    };

    // Filtered methods for the matrix view
    const filteredMethods = useMemo(() => {
        return config.methods.filter(m => {
            const matchesSearch = searchQuery === '' ||
                m.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.subType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                m.category.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesOutlet = selectedOutletFilter === 'ALL' || m.allowedOutlets.includes(selectedOutletFilter);
            return matchesSearch && matchesOutlet;
        });
    }, [config.methods, searchQuery, selectedOutletFilter]);

    // KPI Metrics
    const kpiMetrics = useMemo(() => {
        const totalTenders = config.methods.length;
        const activeTenders = config.methods.filter(m => m.enabled).length;
        const totalCards = config.methods.filter(m => m.category === 'CARD').length;
        const totalMfs = config.methods.filter(m => m.category === 'MOBILE_BANKING').length;
        const totalBanks = config.registeredBanks.length;
        const totalTerminals = config.posTerminals.length;
        const totalLedgers = config.corporateLedgers.length + config.houseLedgers.length;

        return {
            totalTenders,
            activeTenders,
            totalCards,
            totalMfs,
            totalBanks,
            totalTerminals,
            totalLedgers
        };
    }, [config]);

    return (
        <div className="space-y-4 animate-in fade-in duration-150 text-slate-800 max-w-full">
            {/* =========================================================================
                1. LUXURY EXECUTIVE HERO BANNER
               ========================================================================= */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-lg border border-slate-800 relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 flex items-center justify-center font-bold">
                                <Wallet size={18} />
                            </div>
                            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">
                                Payment &amp; Acquiring Gateway Hub
                            </h1>
                            <span className="text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck size={12} />
                                <span>Property #{activePropertyId}</span>
                            </span>
                            <span className="text-[11px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                <span>Zero-Loss Auto-Synced</span>
                            </span>
                        </div>
                        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
                            Manage hotel payment tenders, merchant acquiring banks, card scheme MDR commissions, POS terminals, and multi-outlet permissions for {propertyName}.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0 self-start md:self-auto">
                        <button
                            type="button"
                            onClick={handleSyncMaster}
                            className="h-8 px-3 bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-xs shadow-xs"
                            title="Synchronize banks and corporate clients from system Master Data"
                        >
                            <RefreshCw size={12} />
                            <span>Sync Master</span>
                        </button>
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            className="h-8 px-2.5 bg-white/10 hover:bg-white/20 text-slate-300 border border-white/15 rounded-lg text-xs transition-all cursor-pointer backdrop-blur-xs"
                            title="Reset to factory payment defaults"
                        >
                            <RotateCcw size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (activeTab === 'cards_pos') handleOpenAddCardScheme();
                                else if (activeTab === 'mfs') handleOpenAddMfs();
                                else if (activeTab === 'banks_pos') handleOpenAddBank();
                                else if (activeTab === 'ledgers') handleOpenAddCorporate();
                                else handleOpenAddCardScheme();
                            }}
                            className="h-8 px-3.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
                        >
                            <Plus size={14} />
                            <span>
                                {activeTab === 'cards_pos' ? 'Add Card Scheme' :
                                 activeTab === 'mfs' ? 'Add MFS Provider' :
                                 activeTab === 'banks_pos' ? 'Add Bank Account' :
                                 activeTab === 'ledgers' ? 'Add Corporate Client' :
                                 'Add Payment Tender'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* KPI Metrics Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3.5 border-t border-white/10 text-xs">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Accepted Tenders</span>
                        <div className="text-base sm:text-lg font-bold text-white flex items-center gap-1.5 mt-0.5">
                            <span>{kpiMetrics.activeTenders}</span>
                            <span className="text-[11px] font-normal text-slate-400">/ {kpiMetrics.totalTenders} Active</span>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Card Networks &amp; Schemes</span>
                        <div className="text-base sm:text-lg font-bold text-indigo-300 flex items-center gap-1.5 mt-0.5">
                            <CreditCard size={15} />
                            <span>{kpiMetrics.totalCards} Schemes</span>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Mobile Wallets (MFS)</span>
                        <div className="text-base sm:text-lg font-bold text-pink-300 flex items-center gap-1.5 mt-0.5">
                            <Smartphone size={15} />
                            <span>{kpiMetrics.totalMfs} Providers</span>
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl p-2.5">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">Acquiring Banks &amp; POS</span>
                        <div className="text-base sm:text-lg font-bold text-emerald-300 flex items-center gap-1.5 mt-0.5">
                            <Building2 size={15} />
                            <span>{kpiMetrics.totalBanks} Banks &bull; {kpiMetrics.totalTerminals} POS</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* =========================================================================
                2. SEGMENTED NAVIGATION BAR (STRIPE/APPLE STYLE)
               ========================================================================= */}
            <div className="bg-white border border-slate-200 rounded-xl p-1.5 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-1">
                    <button
                        type="button"
                        onClick={() => setActiveTab('matrix')}
                        className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'matrix'
                                ? 'bg-slate-900 text-white shadow-xs'
                                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                        }`}
                    >
                        <SlidersHorizontal size={13} />
                        <span>Tenders &amp; Outlets Matrix</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            activeTab === 'matrix' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                        }`}>
                            {config.methods.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('cards_pos')}
                        className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'cards_pos'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-indigo-900 hover:bg-indigo-50/60'
                        }`}
                    >
                        <CreditCard size={13} />
                        <span>Card Schemes &amp; Acquirers</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            activeTab === 'cards_pos' ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}>
                            {config.methods.filter(m => m.category === 'CARD').length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('mfs')}
                        className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'mfs'
                                ? 'bg-pink-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-pink-900 hover:bg-pink-50/60'
                        }`}
                    >
                        <Smartphone size={13} />
                        <span>Mobile Banking (MFS)</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            activeTab === 'mfs' ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'
                        }`}>
                            {config.methods.filter(m => m.category === 'MOBILE_BANKING').length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('banks_pos')}
                        className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'banks_pos'
                                ? 'bg-blue-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-blue-900 hover:bg-blue-50/60'
                        }`}
                    >
                        <Building2 size={13} />
                        <span>Banks &amp; POS Terminals</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            activeTab === 'banks_pos' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                        }`}>
                            {config.registeredBanks.length}B &bull; {config.posTerminals.length}T
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('ledgers')}
                        className={`h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === 'ledgers'
                                ? 'bg-amber-600 text-white shadow-xs'
                                : 'text-slate-600 hover:text-amber-900 hover:bg-amber-50/60'
                        }`}
                    >
                        <Layers size={13} />
                        <span>City &amp; House Ledgers</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                            activeTab === 'ledgers' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                        }`}>
                            {config.corporateLedgers.length + config.houseLedgers.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* =========================================================================
                TAB 1: TENDERS & OUTLETS MATRIX (ALL TENDERS OVERVIEW)
               ========================================================================= */}
            {activeTab === 'matrix' && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        {/* Outlet Filter Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex-shrink-0">
                                Outlet Filter:
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedOutletFilter('ALL')}
                                className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                                    selectedOutletFilter === 'ALL'
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                }`}
                            >
                                All Outlets ({config.methods.length})
                            </button>
                            {PROPERTY_OUTLETS_LIST.map(o => {
                                const count = config.methods.filter(m => m.enabled && m.allowedOutlets.includes(o.id)).length;
                                return (
                                    <button
                                        key={o.id}
                                        type="button"
                                        onClick={() => setSelectedOutletFilter(o.id)}
                                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap border ${
                                            selectedOutletFilter === o.id
                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                                        }`}
                                    >
                                        {o.name} ({count})
                                    </button>
                                );
                            })}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-64 flex-shrink-0">
                            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search tenders, banks, schemes..."
                                className="w-full h-8 pl-8 pr-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:bg-white transition-colors"
                            />
                        </div>
                    </div>

                    {/* Unified Tenders Table */}
                    <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin">
                        <table className="w-full text-left text-xs min-w-[850px]">
                            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                <tr>
                                    <th className="py-2.5 px-3.5">Payment Method &amp; Category</th>
                                    <th className="py-2.5 px-3">Connected Banks / Acquirers</th>
                                    <th className="py-2.5 px-3">Commission / MDR</th>
                                    <th className="py-2.5 px-3">Active In Outlets (Click to Toggle)</th>
                                    <th className="py-2.5 px-3.5 text-right">Global Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 font-normal">
                                {filteredMethods.map(method => {
                                    const commRate = method.defaultCommissionRate ?? method.acquiringBanks?.[0]?.commissionRule?.commissionRatePercent;
                                    return (
                                        <tr key={method.id} className="hover:bg-slate-50/70 transition-colors">
                                            <td className="py-3 px-3.5">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                                        {getCategoryIcon(method.category, 16)}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                                            <span>{method.displayName}</span>
                                                            <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded uppercase">
                                                                {method.category.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-[10.5px] text-slate-500 max-w-sm truncate mt-0.5">
                                                            {method.description || `Electronic settlement via ${method.subType}.`}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>

                                            <td className="py-3 px-3">
                                                {method.acquiringBanks && method.acquiringBanks.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 max-w-xs">
                                                        {method.acquiringBanks.map(a => (
                                                            <span key={a.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                                                {a.bankName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : method.ledgerNames && method.ledgerNames.length > 0 ? (
                                                    <span className="text-[10.5px] text-amber-800 font-medium">
                                                        {method.ledgerNames.length} Linked Ledger(s)
                                                    </span>
                                                ) : (
                                                    <span className="text-[10.5px] text-slate-400 italic">
                                                        Direct Desk Settlement
                                                    </span>
                                                )}
                                            </td>

                                            <td className="py-3 px-3 font-mono">
                                                {commRate !== undefined ? (
                                                    <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                                                        {commRate}% MDR
                                                    </span>
                                                ) : (
                                                    <span className="text-[10.5px] text-slate-400">0.00% (Direct)</span>
                                                )}
                                            </td>

                                            <td className="py-3 px-3">
                                                <div className="flex items-center gap-1 flex-wrap">
                                                    {PROPERTY_OUTLETS_LIST.map(outlet => {
                                                        const isAllowed = method.allowedOutlets.includes(outlet.id);
                                                        return (
                                                            <button
                                                                key={outlet.id}
                                                                type="button"
                                                                onClick={() => handleToggleOutletForMethod(method.id, outlet.id)}
                                                                className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer border ${
                                                                    isAllowed
                                                                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shadow-2xs'
                                                                        : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 line-through decoration-slate-300'
                                                                }`}
                                                                title={`Click to ${isAllowed ? 'remove from' : 'enable in'} ${outlet.name}`}
                                                            >
                                                                {outlet.code} &bull; {outlet.name.split(' ')[0]}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </td>

                                            <td className="py-3 px-3.5 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleGlobalMethod(method.id)}
                                                    className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                                                        method.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                                                    }`}
                                                    title={method.enabled ? 'Active across property' : 'Inactive'}
                                                >
                                                    <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                                        method.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                                    }`} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =========================================================================
                TAB 2: CARD SCHEMES & ACQUIRING BANKS (CARD > VISA > ASIA BANK PLC.)
               ========================================================================= */}
            {activeTab === 'cards_pos' && (
                <div className="space-y-4">
                    {/* Card Networks Header Banner */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <CreditCard size={17} className="text-indigo-600" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Card Acquiring Hierarchy: Card Scheme ➔ Attached Acquiring Banks
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Commission can be configured on the Card Scheme (Scheme Default Rate) <strong>OR</strong> customized per Attached Acquiring Bank (e.g. Visa ➔ Asia Bank Plc.).
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddCardScheme}
                            className="h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                        >
                            <Plus size={13} />
                            <span>Add Card Scheme</span>
                        </button>
                    </div>

                    {/* Card Schemes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {config.methods.filter(m => m.category === 'CARD').map(card => {
                            const comm = card.defaultCommissionRate ?? card.acquiringBanks?.[0]?.commissionRule?.commissionRatePercent ?? 1.50;
                            return (
                                <div
                                    key={card.id}
                                    className={`border rounded-2xl p-4 space-y-3.5 transition-all relative ${
                                        card.enabled
                                            ? 'border-indigo-100 bg-white shadow-md hover:border-indigo-300'
                                            : 'border-slate-200 bg-slate-50/60 opacity-60'
                                    }`}
                                >
                                    {/* Card Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-bold text-indigo-700 text-xs shadow-2xs">
                                                <CreditCard size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm text-slate-900">{card.displayName}</h4>
                                                <span className="text-[10px] text-slate-400 font-mono">Brand: {card.subType}</span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleGlobalMethod(card.id)}
                                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                                                card.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                                            }`}
                                            title={card.enabled ? 'Active across property' : 'Inactive'}
                                        >
                                            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                                card.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Scheme Base Commission Box */}
                                    <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 font-semibold">Scheme Base Commission:</span>
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={comm}
                                                    onChange={e => handleUpdateSchemeBaseCommission(card.id, parseFloat(e.target.value) || 0)}
                                                    className="w-16 h-6 px-1.5 text-xs font-mono font-bold text-indigo-800 bg-white border border-indigo-200 rounded-md text-right outline-none focus:border-indigo-500 shadow-2xs"
                                                    title="Set base commission on Visa / Scheme level"
                                                />
                                                <span className="text-[11px] font-mono font-bold text-indigo-700">% MDR</span>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-slate-400">
                                            Inherited by attached banks unless overridden below.
                                        </p>
                                    </div>

                                    {/* Hierarchical Attached Banks (Card > Scheme > Bank) */}
                                    <div className="space-y-2 pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                                <Building2 size={12} className="text-indigo-600" />
                                                <span>Attached Banks ({(card.acquiringBanks || []).length})</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleStartAttachBank(card.id, comm)}
                                                className="text-[10.5px] font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                                            >
                                                <Plus size={11} />
                                                <span>Attach Bank</span>
                                            </button>
                                        </div>

                                        {/* Inline Attach Bank Drawer */}
                                        {attachingBankForCardId === card.id && (
                                            <div className="p-3 rounded-xl border border-indigo-300 bg-indigo-50/80 space-y-2.5 animate-in fade-in duration-150 shadow-sm">
                                                <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                                                    <span>Attach Bank to {card.displayName}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setAttachingBankForCardId(null)}
                                                        className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                                    >
                                                        <X size={13} />
                                                    </button>
                                                </div>

                                                <div className="space-y-2 text-xs">
                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                                            Select or Type Bank Name *
                                                        </label>
                                                        <div className="space-y-1">
                                                            {config.registeredBanks.length > 0 && (
                                                                <select
                                                                    value={selectedBankOption}
                                                                    onChange={e => setSelectedBankOption(e.target.value)}
                                                                    className="w-full h-7 px-2 border border-slate-200 rounded-md bg-white text-xs outline-none focus:border-indigo-500"
                                                                >
                                                                    {config.registeredBanks.map(b => (
                                                                        <option key={b.id} value={b.bankName}>{b.bankName}</option>
                                                                    ))}
                                                                    <option value="__NEW__">+ Type New Bank Name...</option>
                                                                </select>
                                                            )}
                                                            {(selectedBankOption === '__NEW__' || config.registeredBanks.length === 0) && (
                                                                <input
                                                                    type="text"
                                                                    value={customBankNameInput}
                                                                    onChange={e => setCustomBankNameInput(e.target.value)}
                                                                    placeholder="e.g. Asia Bank Plc."
                                                                    className="w-full h-7 px-2 border border-indigo-300 rounded-md bg-white text-xs outline-none font-bold text-slate-800"
                                                                    autoFocus
                                                                />
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
                                                            Commission % for this Bank
                                                        </label>
                                                        <div className="flex items-center gap-1.5">
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                min="0"
                                                                max="100"
                                                                value={newBankCommissionRate}
                                                                onChange={e => setNewBankCommissionRate(parseFloat(e.target.value) || 0)}
                                                                className="w-20 h-7 px-2 border border-slate-200 rounded-md bg-white font-mono font-bold text-xs"
                                                            />
                                                            <span className="text-[10px] text-slate-500">
                                                                (Base: {comm}% from {card.displayName})
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-1.5 pt-1">
                                                        <button
                                                            type="button"
                                                            onClick={() => setAttachingBankForCardId(null)}
                                                            className="h-6 px-2.5 text-[10px] font-medium text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleConfirmAttachBank(card.id)}
                                                            className="h-6 px-3 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-2xs cursor-pointer"
                                                        >
                                                            Attach Bank
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Attached Banks List */}
                                        {(!card.acquiringBanks || card.acquiringBanks.length === 0) ? (
                                            <div className="text-[10.5px] text-slate-400 p-2.5 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 text-center">
                                                No bank attached yet. Click "+ Attach Bank" to link e.g. Asia Bank Plc.
                                            </div>
                                        ) : (
                                            <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin pr-0.5">
                                                {card.acquiringBanks.map(acq => {
                                                    const isCustom = acq.commissionRule.commissionRatePercent !== comm;
                                                    return (
                                                        <div
                                                            key={acq.id}
                                                            className="p-2 rounded-xl border border-slate-200 bg-slate-50/90 flex items-center justify-between gap-1.5 text-xs hover:border-slate-300 transition-colors"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                                    <span className="font-bold text-xs text-slate-900 truncate" title={acq.bankName}>
                                                                        {acq.bankName}
                                                                    </span>
                                                                    {isCustom ? (
                                                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded flex-shrink-0" title="Custom commission override on this bank">
                                                                            Bank Override
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded flex-shrink-0" title="Using Scheme base rate">
                                                                            Scheme Rate
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                                <div className="flex items-center gap-0.5">
                                                                    <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        max="100"
                                                                        value={acq.commissionRule.commissionRatePercent}
                                                                        onChange={e => handleUpdateBankCommission(card.id, acq.id, parseFloat(e.target.value) || 0)}
                                                                        className="w-16 h-6 px-1.5 text-[11px] font-mono font-bold text-indigo-700 bg-white border border-slate-200 rounded-md text-right outline-none focus:border-indigo-500 shadow-2xs"
                                                                        title="Edit commission % for this specific bank"
                                                                    />
                                                                    <span className="text-[10px] font-mono font-bold text-slate-500">%</span>
                                                                </div>

                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDetachBankFromCard(card.id, acq.id, acq.bankName)}
                                                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                                                                    title={`Detach ${acq.bankName} from ${card.displayName}`}
                                                                >
                                                                    <X size={13} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    {/* Outlet Permission Pills */}
                                    <div className="space-y-1 pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span>Active Outlets</span>
                                            <span>{card.allowedOutlets.length}/{PROPERTY_OUTLETS_LIST.length}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {PROPERTY_OUTLETS_LIST.map(outlet => {
                                                const isAllowed = card.allowedOutlets.includes(outlet.id);
                                                return (
                                                    <button
                                                        key={outlet.id}
                                                        type="button"
                                                        onClick={() => handleToggleOutletForMethod(card.id, outlet.id)}
                                                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer border ${
                                                            isAllowed
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 line-through decoration-slate-300'
                                                        }`}
                                                        title={`Click to toggle in ${outlet.name}`}
                                                    >
                                                        {outlet.code} &bull; {outlet.name.split(' ')[0]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Footer Actions */}
                                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditCardScheme(card)}
                                            className="h-6.5 px-2.5 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Edit2 size={11} />
                                            <span>Edit Scheme</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteCardScheme(card.id)}
                                            className="h-6.5 px-2.5 text-[10.5px] font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Trash2 size={11} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* =========================================================================
                TAB 3: MOBILE BANKING (MFS) SUITE
               ========================================================================= */}
            {activeTab === 'mfs' && (
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <Smartphone size={17} className="text-pink-600" />
                                <h3 className="text-sm font-bold text-slate-900">
                                    Mobile Financial Services (MFS) Management
                                </h3>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Configure bKash, Rocket, Nagad, Upay, CellFin, and custom mobile wallets with independent merchant commissions and outlet access.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddMfs}
                            className="h-8 px-3.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start sm:self-auto flex-shrink-0"
                        >
                            <Plus size={13} />
                            <span>Add MFS Provider</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {config.methods.filter(m => m.category === 'MOBILE_BANKING').map(mfs => {
                            const comm = mfs.defaultCommissionRate ?? mfs.acquiringBanks?.[0]?.commissionRule.commissionRatePercent ?? 1.50;
                            const brandColor = 
                                mfs.subType.toLowerCase().includes('bkash') ? 'bg-[#D12053]' :
                                mfs.subType.toLowerCase().includes('rocket') ? 'bg-[#8C3494]' :
                                mfs.subType.toLowerCase().includes('nagad') ? 'bg-[#F7941D]' :
                                mfs.subType.toLowerCase().includes('upay') ? 'bg-[#002D72]' :
                                'bg-blue-600';

                            return (
                                <div
                                    key={mfs.id}
                                    className={`border rounded-2xl p-4 space-y-3.5 transition-all relative ${
                                        mfs.enabled ? 'border-pink-100 bg-white shadow-md hover:border-pink-300' : 'border-slate-200 bg-slate-50/60 opacity-60'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-2xs ${brandColor}`}>
                                                {mfs.subType.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-bold text-sm text-slate-900">{mfs.displayName}</span>
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 uppercase">
                                                        {mfs.accountType || 'MERCHANT'}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] font-mono text-slate-500 font-medium">
                                                    {mfs.walletNumber || '017xx-xxxxxx'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleToggleGlobalMethod(mfs.id)}
                                            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer inline-flex items-center ${
                                                mfs.enabled ? 'bg-emerald-600' : 'bg-slate-300'
                                            }`}
                                            title={mfs.enabled ? 'Active across property' : 'Inactive'}
                                        >
                                            <span className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                                                mfs.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </div>

                                    {/* Commission Box */}
                                    <div className="p-2.5 rounded-xl bg-pink-50/50 border border-pink-100 space-y-1">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-slate-600 font-semibold">Provider Commission:</span>
                                            <span className="font-bold text-pink-700 font-mono bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200">
                                                {comm}% MDR
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                                            <span>Settlement: {mfs.acquiringBanks?.[0]?.bankName || 'General Account'}</span>
                                            <span>VAT: {mfs.acquiringBanks?.[0]?.commissionRule?.vatOnCommissionPercent ?? getDynamicTaxVatRate()}%</span>
                                        </div>
                                    </div>

                                    {/* Outlet Permissions */}
                                    <div className="space-y-1 pt-2 border-t border-slate-100">
                                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                            <span>Outlet Permissions</span>
                                            <span>{mfs.allowedOutlets.length}/{PROPERTY_OUTLETS_LIST.length} Active</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {PROPERTY_OUTLETS_LIST.map(outlet => {
                                                const isAllowed = mfs.allowedOutlets.includes(outlet.id);
                                                return (
                                                    <button
                                                        key={outlet.id}
                                                        type="button"
                                                        onClick={() => handleToggleOutletForMethod(mfs.id, outlet.id)}
                                                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md transition-all cursor-pointer border ${
                                                            isAllowed
                                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                                : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100 line-through decoration-slate-300'
                                                        }`}
                                                        title={`Click to ${isAllowed ? 'disable' : 'enable'} in ${outlet.name}`}
                                                    >
                                                        {outlet.code} &bull; {outlet.name.split(' ')[0]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditMfs(mfs)}
                                            className="h-6.5 px-2.5 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Edit2 size={11} />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteMfs(mfs.id)}
                                            className="h-6.5 px-2.5 text-[10.5px] font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                        >
                                            <Trash2 size={11} />
                                            <span>Delete</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* =========================================================================
                TAB 4: SETTLEMENT BANKS & POS TERMINALS
               ========================================================================= */}
            {activeTab === 'banks_pos' && (
                <div className="space-y-4">
                    {/* Bank Accounts Section */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Building2 size={16} className="text-indigo-600" />
                                    <span>Settlement Bank Accounts ({config.registeredBanks.length})</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Hotel merchant bank accounts used for acquiring settlements, card payouts, and wire deposits.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddBank}
                                className="h-8 px-3.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto flex-shrink-0"
                            >
                                <Plus size={13} />
                                <span>Add Bank Account</span>
                            </button>
                        </div>

                        {config.registeredBanks.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                No bank accounts registered yet. Click "Add Bank Account" or "Sync Master" to add Bank Asia, City Bank, etc.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {config.registeredBanks.map(bank => {
                                    const linkedTerminals = config.posTerminals.filter(t => t.bankName === bank.bankName);
                                    return (
                                        <div key={bank.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between gap-2.5">
                                            <div className="space-y-1">
                                                <div className="flex items-center justify-between gap-1.5">
                                                    <span className="text-sm font-bold text-slate-900 truncate">{bank.bankName}</span>
                                                    {bank.isDefaultSettlement && (
                                                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            Primary Settlement
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 font-mono">
                                                    {bank.accountTitle} &bull; A/C: {bank.accountNumber}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10.5px] text-slate-400">
                                                    <span>Branch: {bank.branchName || 'Main'}</span>
                                                    <span>&bull;</span>
                                                    <span>{linkedTerminals.length} POS Machine(s)</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditBank(bank)}
                                                    className="h-6 px-2 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Edit2 size={11} />
                                                    <span>Edit</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBank(bank.id)}
                                                    className="h-6 px-2 text-[10.5px] font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                                >
                                                    <Trash2 size={11} />
                                                    <span>Delete</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* POS Terminals Section */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <CreditCard size={16} className="text-blue-600" />
                                    <span>POS Machine MDR Matrix &amp; EDC Hardware ({config.posTerminals.length})</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Physical card swipe machines assigned to front desk and outlet counters with terminal-specific MDR rates.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddTerminal}
                                className="h-8 px-3.5 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto flex-shrink-0"
                            >
                                <Plus size={13} />
                                <span>Add POS Terminal</span>
                            </button>
                        </div>

                        {config.posTerminals.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                No POS machines registered. Click "Add POS Terminal" to link an EDC device to an acquiring bank.
                            </div>
                        ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 scrollbar-thin">
                                <table className="w-full text-left text-xs min-w-[700px]">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-[11px] uppercase tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-3.5">Terminal &amp; Bank</th>
                                            <th className="py-2.5 px-3">TID / MID</th>
                                            <th className="py-2.5 px-3">Location &amp; Outlets</th>
                                            <th className="py-2.5 px-3">Configured Rates</th>
                                            <th className="py-2.5 px-3.5 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-normal">
                                        {config.posTerminals.map(term => {
                                            const cardMethods = config.methods.filter(m => m.category === 'CARD');
                                            return (
                                                <tr key={term.id} className="hover:bg-slate-50/70 transition-colors">
                                                    <td className="py-3 px-3.5">
                                                        <div className="font-bold text-slate-900 text-xs">{term.terminalName}</div>
                                                        <span className="text-[10.5px] text-slate-500 font-medium">{term.bankName}</span>
                                                    </td>
                                                    <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                                                        <div>TID: {term.tid}</div>
                                                        <div className="text-slate-400">MID: {term.mid}</div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="text-xs text-slate-800">{term.location}</div>
                                                        <div className="flex flex-wrap gap-1 mt-0.5">
                                                            {term.assignedOutlets.map(o => (
                                                                <span key={o} className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                                                                    {o.replace('_', ' ')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            {cardMethods.map(card => {
                                                                const matchedAcq = card.acquiringBanks?.find(a => 
                                                                    a.posTerminalId === term.id || 
                                                                    (a.bankName && a.bankName.toLowerCase() === term.bankName.toLowerCase())
                                                                );
                                                                const currentRate = matchedAcq?.commissionRule.commissionRatePercent ?? card.defaultCommissionRate ?? 1.50;
                                                                return (
                                                                    <span key={card.id} className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                                                                        {card.subType}: <strong>{currentRate}%</strong>
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-3.5 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenTerminalMdrModal(term)}
                                                                className="h-6.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md text-[10.5px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                                                            >
                                                                <Settings2 size={11} />
                                                                <span>Set MDR</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenEditTerminal(term)}
                                                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer"
                                                            >
                                                                <Edit2 size={12} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteTerminal(term.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-md cursor-pointer"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================================================
                TAB 5: CITY & HOUSE LEDGERS
               ========================================================================= */}
            {activeTab === 'ledgers' && (
                <div className="space-y-4">
                    {/* Corporate Accounts */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Building2 size={16} className="text-amber-600" />
                                    <span>Corporate Direct Billing Accounts (City Ledger) ({config.corporateLedgers.length})</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Pre-approved corporate client accounts for direct invoicing and credit settlements.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleOpenAddCorporate}
                                className="h-8 px-3.5 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs self-start sm:self-auto flex-shrink-0"
                            >
                                <Plus size={13} />
                                <span>Add Corporate Client</span>
                            </button>
                        </div>

                        {config.corporateLedgers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                No corporate billing clients registered yet. Click "Add Corporate Client" or "Sync Master".
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {config.corporateLedgers.map(corp => (
                                    <div key={corp.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between gap-2.5">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className="text-sm font-bold text-slate-900 truncate">{corp.companyName}</span>
                                                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold">
                                                    {corp.ledgerCode}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600">
                                                Credit Limit: <strong className="text-slate-800">৳{corp.creditLimitBdt.toLocaleString()}</strong>
                                            </p>
                                            <p className="text-[10.5px] text-slate-400">
                                                Contact: {corp.billingContact || 'Accounts Desk'} ({corp.phone || 'N/A'})
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEditingCorporate(corp);
                                                    setCorporateForm({ ...corp });
                                                    setIsCorporateModalOpen(true);
                                                }}
                                                className="h-6 px-2 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <Edit2 size={11} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteCorporate(corp.id)}
                                                className="h-6 px-2 text-[10.5px] font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <Trash2 size={11} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* House Ledgers */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3.5 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                                    <Sparkles size={16} className="text-rose-600" />
                                    <span>House Ledgers: Complimentary &amp; Entertainment Allowances ({config.houseLedgers.length})</span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Internal executive allowances for complimentary stays and official hotel entertainment.
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleOpenAddHouse('COMPLIMENTARY')}
                                    className="h-8 px-3 bg-rose-600 text-white hover:bg-rose-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Plus size={12} />
                                    <span>Add Complimentary</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleOpenAddHouse('ENTERTAINMENT')}
                                    className="h-8 px-3 bg-orange-600 text-white hover:bg-orange-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                                >
                                    <Plus size={12} />
                                    <span>Add Entertainment</span>
                                </button>
                            </div>
                        </div>

                        {config.houseLedgers.length === 0 ? (
                            <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50 text-slate-500 text-xs">
                                No house ledgers registered yet. Click "Add Complimentary" or "Add Entertainment" to set allowances.
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {config.houseLedgers.map(house => (
                                    <div key={house.id} className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors shadow-2xs flex flex-col justify-between gap-2.5">
                                        <div className="space-y-1">
                                            <div className="flex items-center justify-between gap-1.5">
                                                <span className="text-sm font-bold text-slate-900 truncate">{house.name}</span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                                                    house.type === 'COMPLIMENTARY' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-orange-50 text-orange-700 border border-orange-200'
                                                }`}>
                                                    {house.glCode}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600">
                                                Monthly Cap: <strong className="text-slate-800">৳{house.monthlyLimitBdt?.toLocaleString()}</strong>
                                            </p>
                                            <p className="text-[10.5px] text-slate-400">
                                                Authorizer: {house.approvalAuthority}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setHouseModalType(house.type);
                                                    setEditingHouse(house);
                                                    setHouseForm({ ...house });
                                                    setIsHouseModalOpen(true);
                                                }}
                                                className="h-6 px-2 text-[10.5px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <Edit2 size={11} />
                                                <span>Edit</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteHouse(house.id)}
                                                className="h-6 px-2 text-[10.5px] font-semibold text-red-600 hover:bg-red-50 rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                                            >
                                                <Trash2 size={11} />
                                                <span>Delete</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* =========================================================================
                ALL MODALS: ULTRA-CLEAN GLASS-BLURRED DIALOGS
               ========================================================================= */}

            {/* MODAL 1: ADD / EDIT BANK */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 size={16} className="text-indigo-600" />
                                <span>{editingBank ? 'Edit Bank Account' : 'Register Bank Account'}</span>
                            </h3>
                            <button onClick={() => setIsBankModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name *</label>
                                <input
                                    type="text"
                                    value={bankForm.bankName || ''}
                                    onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                                    placeholder="e.g. Asia Bank Plc. / City Bank Ltd"
                                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Title</label>
                                    <input
                                        type="text"
                                        value={bankForm.accountTitle || ''}
                                        onChange={e => setBankForm({ ...bankForm, accountTitle: e.target.value })}
                                        placeholder="Operations A/C"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Number *</label>
                                    <input
                                        type="text"
                                        value={bankForm.accountNumber || ''}
                                        onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                        placeholder="028110029384"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Name</label>
                                    <input
                                        type="text"
                                        value={bankForm.branchName || ''}
                                        onChange={e => setBankForm({ ...bankForm, branchName: e.target.value })}
                                        placeholder="Corporate Branch"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Routing Number</label>
                                    <input
                                        type="text"
                                        value={bankForm.routingNumber || ''}
                                        onChange={e => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                                        placeholder="035271890"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="defaultSettlementCheck"
                                    checked={Boolean(bankForm.isDefaultSettlement)}
                                    onChange={e => setBankForm({ ...bankForm, isDefaultSettlement: e.target.checked })}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-0 cursor-pointer"
                                />
                                <label htmlFor="defaultSettlementCheck" className="text-xs text-slate-700 cursor-pointer select-none">
                                    Set as primary merchant settlement bank
                                </label>
                            </div>
                        </div>
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsBankModalOpen(false)}
                                className="h-8 px-3.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBank}
                                className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                                Save Bank
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 2: ADD / EDIT POS TERMINAL */}
            {isTerminalModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard size={16} className="text-blue-600" />
                                <span>{editingTerminal ? 'Edit POS Terminal' : 'Register POS Machine'}</span>
                            </h3>
                            <button onClick={() => setIsTerminalModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Terminal Machine Name *</label>
                                <input
                                    type="text"
                                    value={terminalForm.terminalName || ''}
                                    onChange={e => setTerminalForm({ ...terminalForm, terminalName: e.target.value })}
                                    placeholder="e.g. Front Desk EDC #1"
                                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Acquiring Bank *</label>
                                <select
                                    value={terminalForm.bankName || ''}
                                    onChange={e => {
                                        const b = config.registeredBanks.find(x => x.bankName === e.target.value);
                                        setTerminalForm({
                                            ...terminalForm,
                                            bankName: e.target.value,
                                            settlementAccountTitle: b?.accountTitle || terminalForm.settlementAccountTitle,
                                            settlementAccountNumber: b?.accountNumber || terminalForm.settlementAccountNumber
                                        });
                                    }}
                                    className="w-full h-8 px-2 border border-slate-200 rounded-lg outline-none bg-white text-xs"
                                >
                                    {config.registeredBanks.map(b => (
                                        <option key={b.id} value={b.bankName}>{b.bankName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Terminal ID (TID) *</label>
                                    <input
                                        type="text"
                                        value={terminalForm.tid || ''}
                                        onChange={e => setTerminalForm({ ...terminalForm, tid: e.target.value })}
                                        placeholder="88291042"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Merchant ID (MID) *</label>
                                    <input
                                        type="text"
                                        value={terminalForm.mid || ''}
                                        onChange={e => setTerminalForm({ ...terminalForm, mid: e.target.value })}
                                        placeholder="009128374"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={terminalForm.location || ''}
                                        onChange={e => setTerminalForm({ ...terminalForm, location: e.target.value })}
                                        placeholder="Front Desk Counter 1"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Device Model</label>
                                    <input
                                        type="text"
                                        value={terminalForm.deviceModel || ''}
                                        onChange={e => setTerminalForm({ ...terminalForm, deviceModel: e.target.value })}
                                        placeholder="Ingenico Move/5000"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsTerminalModalOpen(false)}
                                className="h-8 px-3.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveTerminal}
                                className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                                Save Terminal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 3: ADD / EDIT CARD SCHEME */}
            {isCardSchemeModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <CreditCard size={16} className="text-indigo-600" />
                                <span>{editingCardScheme ? 'Edit Card Scheme' : 'Add Card Scheme'}</span>
                            </h3>
                            <button onClick={() => setIsCardSchemeModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveCardScheme} className="p-5 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Card Scheme *</label>
                                    <select
                                        value={cardSchemeForm.schemeName}
                                        onChange={e => {
                                            const sName = e.target.value;
                                            const rate = CARD_SCHEME_SPECS[sName] ?? 1.50;
                                            setCardSchemeForm(prev => ({
                                                ...prev,
                                                schemeName: sName,
                                                defaultCommissionRatePercent: rate
                                            }));
                                        }}
                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-500 font-semibold"
                                    >
                                        <option value="Visa">Visa</option>
                                        <option value="MasterCard">MasterCard</option>
                                        <option value="American Express">American Express</option>
                                        <option value="UnionPay">UnionPay</option>
                                        <option value="JCB">JCB</option>
                                        <option value="Diners Club">Diners Club</option>
                                        <option value="RuPay">RuPay</option>
                                        <option value="Custom">Custom Scheme...</option>
                                    </select>
                                </div>

                                {cardSchemeForm.schemeName === 'Custom' ? (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Custom Brand Name *</label>
                                        <input
                                            type="text"
                                            value={cardSchemeForm.customName}
                                            onChange={e => setCardSchemeForm({ ...cardSchemeForm, customName: e.target.value })}
                                            placeholder="e.g. Discover"
                                            className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 font-bold"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Base Commission %</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            value={cardSchemeForm.defaultCommissionRatePercent}
                                            onChange={e => setCardSchemeForm({ ...cardSchemeForm, defaultCommissionRatePercent: parseFloat(e.target.value) || 0 })}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-lg font-mono font-bold bg-white text-indigo-700"
                                            required
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Outlet Checkboxes */}
                            <div className="space-y-1.5 pt-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Allowed Outlets
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PROPERTY_OUTLETS_LIST.map(outlet => {
                                        const isChecked = cardSchemeForm.allowedOutlets.includes(outlet.id);
                                        return (
                                            <label
                                                key={outlet.id}
                                                className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                                                    isChecked ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        const updated = e.target.checked
                                                            ? [...cardSchemeForm.allowedOutlets, outlet.id]
                                                            : cardSchemeForm.allowedOutlets.filter(o => o !== outlet.id);
                                                        setCardSchemeForm({ ...cardSchemeForm, allowedOutlets: updated });
                                                    }}
                                                    className="rounded border-slate-300 text-indigo-600 cursor-pointer"
                                                />
                                                <span>{outlet.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCardSchemeModalOpen(false)}
                                    className="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                                >
                                    {editingCardScheme ? 'Update Scheme' : 'Create Scheme'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 4: ADD / EDIT MFS PROVIDER */}
            {isMfsModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Smartphone size={16} className="text-pink-600" />
                                <span>{editingMfs ? 'Edit MFS Provider' : 'Add Mobile Banking Provider'}</span>
                            </h3>
                            <button onClick={() => setIsMfsModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveMfs} className="p-5 space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">MFS Provider *</label>
                                    <select
                                        value={mfsForm.providerName}
                                        onChange={e => {
                                            const pName = e.target.value;
                                            const spec = MFS_PROVIDER_SPECS[pName];
                                            setMfsForm(prev => ({
                                                ...prev,
                                                providerName: pName,
                                                commissionRatePercent: spec ? spec.defaultCommission : prev.commissionRatePercent,
                                                accountType: spec ? spec.defaultAccountType : prev.accountType
                                            }));
                                        }}
                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-pink-500 font-semibold"
                                    >
                                        <option value="bKash">bKash</option>
                                        <option value="Rocket">Rocket</option>
                                        <option value="Nagad">Nagad</option>
                                        <option value="Upay">Upay</option>
                                        <option value="CellFin">CellFin</option>
                                        <option value="Custom">Custom Provider...</option>
                                    </select>
                                </div>

                                {mfsForm.providerName === 'Custom' ? (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Custom Name *</label>
                                        <input
                                            type="text"
                                            value={mfsForm.customName}
                                            onChange={e => setMfsForm({ ...mfsForm, customName: e.target.value })}
                                            placeholder="e.g. SureCash"
                                            className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-pink-500 font-bold"
                                            required
                                        />
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Type</label>
                                        <select
                                            value={mfsForm.accountType}
                                            onChange={e => setMfsForm({ ...mfsForm, accountType: e.target.value as any })}
                                            className="w-full h-8 px-2 border border-slate-200 rounded-lg bg-white outline-none"
                                        >
                                            <option value="MERCHANT">Merchant Account</option>
                                            <option value="PERSONAL">Personal Wallet</option>
                                            <option value="AGENT">Agent Till</option>
                                            <option value="AGGREGATOR">Payment Gateway</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Wallet Number</label>
                                    <input
                                        type="text"
                                        value={mfsForm.walletNumber}
                                        onChange={e => setMfsForm({ ...mfsForm, walletNumber: e.target.value })}
                                        placeholder="01712-000000"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none font-mono focus:border-pink-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Commission % (MDR)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={mfsForm.commissionRatePercent}
                                        onChange={e => setMfsForm({ ...mfsForm, commissionRatePercent: parseFloat(e.target.value) || 0 })}
                                        className="w-full h-8 px-2 border border-slate-200 rounded-lg bg-white font-mono font-bold text-pink-700"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Outlet Checkboxes */}
                            <div className="space-y-1.5 pt-1">
                                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                                    Allowed Outlets
                                </label>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {PROPERTY_OUTLETS_LIST.map(outlet => {
                                        const isChecked = mfsForm.allowedOutlets.includes(outlet.id);
                                        return (
                                            <label
                                                key={outlet.id}
                                                className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-colors text-xs ${
                                                    isChecked ? 'bg-pink-50 border-pink-200 text-pink-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600'
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={e => {
                                                        const updated = e.target.checked
                                                            ? [...mfsForm.allowedOutlets, outlet.id]
                                                            : mfsForm.allowedOutlets.filter(o => o !== outlet.id);
                                                        setMfsForm({ ...mfsForm, allowedOutlets: updated });
                                                    }}
                                                    className="rounded border-slate-300 text-pink-600 cursor-pointer"
                                                />
                                                <span>{outlet.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMfsModalOpen(false)}
                                    className="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                                >
                                    {editingMfs ? 'Update Provider' : 'Create Provider'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 5: POS TERMINAL MACHINE MDR MATRIX */}
            {isTerminalMdrModalOpen && targetTerminalForMdr && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Settings2 size={16} className="text-blue-600" />
                                <span>Configure MDR Commission for {targetTerminalForMdr.terminalName}</span>
                            </h3>
                            <button onClick={() => setIsTerminalMdrModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTerminalMdr} className="p-5 space-y-3.5 text-xs">
                            <p className="text-xs text-slate-600">
                                Set the specific commission rate (%) charged by <strong>{targetTerminalForMdr.bankName}</strong> for each card scheme on this physical machine.
                            </p>

                            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                                {config.methods.filter(m => m.category === 'CARD').map(card => {
                                    const defaultRate = card.defaultCommissionRate ?? 1.50;
                                    const val = terminalMdrForm[card.id] ?? defaultRate;
                                    return (
                                        <div key={card.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <CreditCard size={15} className="text-indigo-600" />
                                                <div>
                                                    <span className="font-bold text-xs text-slate-900">{card.displayName}</span>
                                                    <span className="text-[10px] text-slate-400 block font-mono">
                                                        Scheme Default: {defaultRate}%
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1.5">
                                                <label className="text-xs font-semibold text-slate-600">Rate %:</label>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="100"
                                                    value={val}
                                                    onChange={e => {
                                                        const num = parseFloat(e.target.value) || 0;
                                                        setTerminalMdrForm(prev => ({ ...prev, [card.id]: num }));
                                                    }}
                                                    className="w-20 h-7 px-2 border border-slate-200 rounded-md bg-white text-xs font-mono font-bold text-blue-700 text-right"
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsTerminalMdrModalOpen(false)}
                                    className="h-8 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold cursor-pointer shadow-2xs"
                                >
                                    Save Machine Rates
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL 6: ADD / EDIT CORPORATE CLIENT */}
            {isCorporateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 size={16} className="text-amber-600" />
                                <span>{editingCorporate ? 'Edit Corporate Client' : 'Add Corporate Client'}</span>
                            </h3>
                            <button onClick={() => setIsCorporateModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Company / Organization Name *</label>
                                <input
                                    type="text"
                                    value={corporateForm.companyName || ''}
                                    onChange={e => setCorporateForm({ ...corporateForm, companyName: e.target.value })}
                                    placeholder="e.g. Chevron Bangladesh Ltd"
                                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Ledger Code *</label>
                                    <input
                                        type="text"
                                        value={corporateForm.ledgerCode || ''}
                                        onChange={e => setCorporateForm({ ...corporateForm, ledgerCode: e.target.value })}
                                        placeholder="CL-101"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Credit Limit (BDT)</label>
                                    <input
                                        type="number"
                                        value={corporateForm.creditLimitBdt || 0}
                                        onChange={e => setCorporateForm({ ...corporateForm, creditLimitBdt: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Billing Contact</label>
                                    <input
                                        type="text"
                                        value={corporateForm.billingContact || ''}
                                        onChange={e => setCorporateForm({ ...corporateForm, billingContact: e.target.value })}
                                        placeholder="Finance Desk"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                                    <input
                                        type="text"
                                        value={corporateForm.phone || ''}
                                        onChange={e => setCorporateForm({ ...corporateForm, phone: e.target.value })}
                                        placeholder="+880 1711 000000"
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-amber-500 font-mono"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsCorporateModalOpen(false)}
                                className="h-8 px-3.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveCorporate}
                                className="h-8 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                            >
                                Save Client
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL 7: ADD / EDIT HOUSE LEDGER */}
            {isHouseModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Sparkles size={16} className={houseModalType === 'COMPLIMENTARY' ? 'text-rose-600' : 'text-orange-600'} />
                                <span>{editingHouse ? `Edit ${houseModalType}` : `Add ${houseModalType} Ledger`}</span>
                            </h3>
                            <button onClick={() => setIsHouseModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X size={16} />
                            </button>
                        </div>
                        <div className="p-5 space-y-3.5 text-xs">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Ledger / Allowance Name *</label>
                                <input
                                    type="text"
                                    value={houseForm.name || ''}
                                    onChange={e => setHouseForm({ ...houseForm, name: e.target.value })}
                                    placeholder={houseModalType === 'COMPLIMENTARY' ? 'e.g. Managing Director Quota' : 'e.g. Executive Chef Food Tasting'}
                                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-rose-500 font-semibold"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">GL Code *</label>
                                    <input
                                        type="text"
                                        value={houseForm.glCode || ''}
                                        onChange={e => setHouseForm({ ...houseForm, glCode: e.target.value })}
                                        placeholder={houseModalType === 'COMPLIMENTARY' ? 'GL-4910' : 'GL-5100'}
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-rose-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Monthly Limit (BDT)</label>
                                    <input
                                        type="number"
                                        value={houseForm.monthlyLimitBdt || 0}
                                        onChange={e => setHouseForm({ ...houseForm, monthlyLimitBdt: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-rose-500 font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">Approval Authority</label>
                                <input
                                    type="text"
                                    value={houseForm.approvalAuthority || ''}
                                    onChange={e => setHouseForm({ ...houseForm, approvalAuthority: e.target.value })}
                                    placeholder="General Manager"
                                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg outline-none focus:border-rose-500"
                                />
                            </div>
                        </div>
                        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setIsHouseModalOpen(false)}
                                className="h-8 px-3.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveHouse}
                                className={`h-8 px-4 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer ${
                                    houseModalType === 'COMPLIMENTARY' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-orange-600 hover:bg-orange-700'
                                }`}
                            >
                                Save Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentMethodSettingsTab;
