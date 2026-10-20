import React, { useState, useEffect } from 'react';
import {
    Landmark,
    Wallet,
    Plus,
    Edit2,
    Trash2,
    Check,
    CheckCircle2,
    X,
    Building2,
    ArrowUpRight,
    Search
} from 'lucide-react';

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

export const BankingManagement: React.FC = () => {
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState<'all' | 'banks' | 'mfs'>('all');

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    // Hydrate state from localStorage
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>(() => {
        const saved = localStorage.getItem('master_banks_v2');
        return saved ? JSON.parse(saved) : INITIAL_BANKS;
    });

    const [mfsWallets, setMfsWallets] = useState<MfsWallet[]>(() => {
        const saved = localStorage.getItem('master_mfs_v2');
        return saved ? JSON.parse(saved) : INITIAL_MFS_WALLETS;
    });

    useEffect(() => {
        localStorage.setItem('master_banks_v2', JSON.stringify(bankAccounts));
    }, [bankAccounts]);

    useEffect(() => {
        localStorage.setItem('master_mfs_v2', JSON.stringify(mfsWallets));
    }, [mfsWallets]);

    // Modals
    const [isBankModalOpen, setIsBankModalOpen] = useState(false);
    const [editingBank, setEditingBank] = useState<BankAccount | null>(null);
    const [bankForm, setBankForm] = useState({
        bankName: '',
        accountTitle: 'The Grand Palace Hotel & Suites Ltd',
        accountNumber: '',
        branchName: '',
        routingNumber: '',
        swiftCode: '',
        isDefaultSettlement: false,
        linkedGlCode: 'GL-1020',
        status: 'Active' as BankAccount['status']
    });

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

    // Bank Actions
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

    const handleOpenEditBank = (b: BankAccount) => {
        setEditingBank(b);
        setBankForm({
            bankName: b.bankName,
            accountTitle: b.accountTitle,
            accountNumber: b.accountNumber,
            branchName: b.branchName,
            routingNumber: b.routingNumber,
            swiftCode: b.swiftCode,
            isDefaultSettlement: b.isDefaultSettlement,
            linkedGlCode: b.linkedGlCode,
            status: b.status
        });
        setIsBankModalOpen(true);
    };

    const handleSaveBank = (e: React.FormEvent) => {
        e.preventDefault();
        if (!bankForm.bankName || !bankForm.accountNumber) return;

        if (bankForm.isDefaultSettlement) {
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

    // MFS Actions
    const handleOpenAddMfs = () => {
        setEditingMfs(null);
        setMfsForm({
            provider: 'bKash Merchant',
            merchantNumber: '',
            counterId: 'COUNTER-01 (Front Desk Primary)',
            commissionRatePercent: 1.2,
            linkedBankName: bankAccounts[0]?.bankName || 'City Bank PLC',
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

    // Filtered collections
    const filteredBanks = bankAccounts.filter(b =>
        b.bankName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.accountNumber.includes(searchQuery) ||
        b.branchName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredMfs = mfsWallets.filter(m =>
        m.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.merchantNumber.includes(searchQuery) ||
        m.counterId.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const defaultBank = bankAccounts.find(b => b.isDefaultSettlement) || bankAccounts[0];

    return (
        <div className="p-3 sm:p-5 max-w-7xl mx-auto space-y-4 font-sans text-gray-800">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed bottom-4 right-4 z-[120] bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200 border border-gray-700">
                    <CheckCircle2 size={16} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Top Informative Guide */}
            <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/60 to-white p-4 rounded-xl border border-blue-200/70 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-2xs">
                        <Landmark size={20} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="font-bold text-gray-900 text-sm">Institutional Banking & MFS Payment Gateways</h2>
                            <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Financial Architecture</span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                            Manage commercial operating bank accounts, wire transfer SWIFT codes, and mobile merchant wallets (bKash, Nagad, Rocket, Upay).
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleOpenAddBank}
                        className="h-8 px-3 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus size={13} className="text-blue-600" />
                        <span>+ Add Bank</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAddMfs}
                        className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                    >
                        <Plus size={13} />
                        <span>+ Add MFS Wallet</span>
                    </button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Commercial Banks</div>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{bankAccounts.length} Active</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Corporate & POS Clearing</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <Building2 size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">Default Folio Bank</div>
                        <div className="text-sm font-bold text-blue-700 mt-0.5 truncate max-w-[150px]">{defaultBank?.bankName}</div>
                        <div className="text-[10px] text-gray-500 font-mono mt-0.5">A/C: {defaultBank?.accountNumber}</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                        <Check size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">MFS Merchant Channels</div>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">{mfsWallets.length} Gateways</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">bKash, Nagad, Rocket, Upay</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                        <Wallet size={18} />
                    </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-gray-200/90 shadow-2xs flex items-center justify-between">
                    <div>
                        <div className="text-[10.5px] font-bold text-gray-400 uppercase tracking-wider">MFS Daily Sweep Cap</div>
                        <div className="text-xl font-bold text-gray-900 mt-0.5">৳ {mfsWallets.reduce((acc, m) => acc + m.dailyLimitBDT, 0).toLocaleString()}</div>
                        <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Auto-Bank Settlement</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                        <ArrowUpRight size={18} />
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => setActiveSection('all')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeSection === 'all' ? 'bg-blue-600 text-white font-bold' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
                    >
                        All Channels ({bankAccounts.length + mfsWallets.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('banks')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeSection === 'banks' ? 'bg-blue-600 text-white font-bold' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
                    >
                        Banks ({bankAccounts.length})
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveSection('mfs')}
                        className={`h-7 px-3 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${activeSection === 'mfs' ? 'bg-blue-600 text-white font-bold' : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'}`}
                    >
                        MFS Wallets ({mfsWallets.length})
                    </button>
                </div>

                <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search banks, accounts, merchant nos..."
                        className="w-full h-7 pl-8 pr-3 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-blue-400 transition-colors"
                    />
                </div>
            </div>

            {/* Section 1: Commercial Bank Accounts Table */}
            {(activeSection === 'all' || activeSection === 'banks') && (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                    <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Landmark size={14} className="text-blue-600" />
                                <span>Commercial Operating Bank Accounts</span>
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Used for guest wire transfers, OTA net bank deposits, corporate invoices, and EDC swipe terminal settlements.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddBank}
                            className="h-6 px-2 text-[10.5px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                        >
                            + Add Bank
                        </button>
                    </div>

                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left text-xs min-w-[760px]">
                            <thead>
                                <tr className="bg-gray-50/80 border-b border-gray-200 text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-3.5 py-2.5">Bank Name</th>
                                    <th className="px-3.5 py-2.5">Account Title</th>
                                    <th className="px-3.5 py-2.5">Account Number</th>
                                    <th className="px-3.5 py-2.5">Branch & Routing</th>
                                    <th className="px-3.5 py-2.5">SWIFT / BIC</th>
                                    <th className="px-3.5 py-2.5">General Ledger Code</th>
                                    <th className="px-3.5 py-2.5">Invoice Default</th>
                                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredBanks.map(b => (
                                    <tr key={b.id} className="hover:bg-blue-50/20">
                                        <td className="px-3.5 py-2.5 font-bold text-gray-900">{b.bankName}</td>
                                        <td className="px-3.5 py-2.5 text-gray-700">{b.accountTitle}</td>
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-blue-700">{b.accountNumber}</td>
                                        <td className="px-3.5 py-2.5 text-gray-600">
                                            <div>{b.branchName}</div>
                                            <div className="font-mono text-[10px] text-gray-400">Routing: {b.routingNumber}</div>
                                        </td>
                                        <td className="px-3.5 py-2.5 font-mono font-bold text-gray-700">{b.swiftCode}</td>
                                        <td className="px-3.5 py-2.5 font-mono text-[11px] text-gray-500">{b.linkedGlCode}</td>
                                        <td className="px-3.5 py-2.5">
                                            {b.isDefaultSettlement ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                    <Check size={11} /> Primary Folio Default
                                                </span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => handleSetDefaultBank(b.id)}
                                                    className="px-2 py-0.5 text-[10px] font-bold text-gray-500 hover:text-blue-700 bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded cursor-pointer transition-colors"
                                                >
                                                    Set as Default
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-3.5 py-2.5 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEditBank(b)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteBank(b.id)}
                                                    className="p-1 text-gray-400 hover:text-rose-600 rounded transition-colors"
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
            )}

            {/* Section 2: Mobile Financial Services (MFS Wallets) */}
            {(activeSection === 'all' || activeSection === 'mfs') && (
                <div className="bg-white rounded-xl border border-gray-200/90 shadow-2xs overflow-hidden">
                    <div className="p-3.5 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                                <Wallet size={14} className="text-indigo-600" />
                                <span>Mobile Financial Services (MFS Merchant Gateways)</span>
                            </h3>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                Real-time guest payments via bKash Merchant, Nagad Sheba, Rocket, and Upay QR counters.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddMfs}
                            className="h-6 px-2 text-[10.5px] font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded border border-indigo-200 cursor-pointer"
                        >
                            + Add MFS Wallet
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5">
                        {filteredMfs.map(mfs => (
                            <div
                                key={mfs.id}
                                className="p-3.5 rounded-xl border border-gray-200 hover:border-indigo-300 bg-gray-50/50 transition-all flex flex-col justify-between space-y-2.5 relative group shadow-2xs"
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${mfs.provider.includes('bKash') ? 'bg-pink-50 text-pink-700 border border-pink-200' : mfs.provider.includes('Nagad') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-purple-50 text-purple-700 border border-purple-200'}`}>
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
                                    <div className="font-mono text-sm font-bold text-gray-900 tracking-wide mt-1">
                                        {mfs.merchantNumber}
                                    </div>
                                    <div className="text-[10.5px] text-gray-600 font-semibold mt-0.5">{mfs.counterId}</div>
                                    <div className="text-[10px] font-mono text-gray-400 mt-0.5">{mfs.linkedGlCode}</div>
                                </div>
                                <div className="pt-2 border-t border-gray-100 space-y-1 text-[10.5px]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">MDR Fee Rate:</span>
                                        <span className="font-bold text-gray-900">{mfs.commissionRatePercent}%</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Linked Sweep Bank:</span>
                                        <span className="font-bold text-blue-700">{mfs.linkedBankName}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-gray-500">Daily Cap:</span>
                                        <span className="font-mono font-bold text-gray-700">৳ {mfs.dailyLimitBDT.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* MODALS */}
            {/* 1. BANK MODAL */}
            {isBankModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-lg w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <Landmark size={14} className="text-blue-600" />
                                <span>{editingBank ? 'Edit Commercial Bank Account' : 'Register Commercial Bank Account'}</span>
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-semibold outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold outline-none"
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
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Routing Number</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 060271829"
                                        value={bankForm.routingNumber}
                                        onChange={e => setBankForm({ ...bankForm, routingNumber: e.target.value })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">SWIFT / BIC Code</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. CIBLBDDH"
                                        value={bankForm.swiftCode}
                                        onChange={e => setBankForm({ ...bankForm, swiftCode: e.target.value.toUpperCase() })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono outline-none"
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

            {/* 2. MFS MODAL */}
            {isMfsModalOpen && (
                <div className="fixed inset-0 z-[130] bg-black/40 backdrop-blur-xs flex items-center justify-center p-3">
                    <div className="bg-white rounded-2xl max-w-md w-full border border-gray-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="p-3.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
                            <h3 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                                <Wallet size={14} className="text-indigo-600" />
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
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white font-bold outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold outline-none"
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
                                    className="w-full h-8 px-2.5 border border-gray-200 rounded-lg outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono font-bold outline-none"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Daily Limit (৳)</label>
                                    <input
                                        type="number"
                                        min={10000}
                                        value={mfsForm.dailyLimitBDT}
                                        onChange={e => setMfsForm({ ...mfsForm, dailyLimitBDT: Number(e.target.value) })}
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <div className="space-y-1">
                                    <label className="font-semibold text-gray-700">Settlement Bank</label>
                                    <select
                                        value={mfsForm.linkedBankName}
                                        onChange={e => setMfsForm({ ...mfsForm, linkedBankName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-200 rounded-lg bg-white outline-none"
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
                                        className="w-full h-8 px-2.5 border border-gray-200 rounded-lg font-mono outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                                <button type="button" onClick={() => setIsMfsModalOpen(false)} className="h-7 px-3 border border-gray-200 rounded-lg font-semibold hover:bg-gray-50">
                                    Cancel
                                </button>
                                <button type="submit" className="h-7 px-3.5 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                                    Save MFS Wallet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BankingManagement;
