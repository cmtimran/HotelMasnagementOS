import React, { useState, useEffect } from 'react';
import { 
    Landmark, 
    FileText, 
    Plus, 
    RefreshCw, 
    CheckCircle2, 
    AlertTriangle, 
    CreditCard, 
    BookOpen, 
    Layers, 
    Calendar 
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';


interface Account {
    id: number;
    account_code: string;
    account_name: string;
    account_type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
    usali_department: string;
    is_active: number;
}

interface TrialBalanceItem {
    account_id: number;
    account_code: string;
    account_name: string;
    account_type: string;
    total_debit: number;
    total_credit: number;
    netDebit: number;
    netCredit: number;
}

interface JournalEntry {
    id: number;
    entry_number: string;
    entry_date: string;
    description: string;
    reference_type: string;
    is_posted: number;
    total_amount: number;
    lines: Array<{
        id: number;
        account_code: string;
        account_name: string;
        account_type: string;
        debit: number;
        credit: number;
        memo: string;
    }>;
}

interface Folio {
    id: number;
    folio_number: string;
    folio_type: string;
    status: string;
    balance: number;
    guest_name: string;
    guest_phone: string;
    reservation_number: string;
    charges: any[];
    payments: any[];
}

export const AdvanceAccountingDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'trial_balance' | 'journal' | 'coa' | 'folios'>('trial_balance');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Data States
    const [trialBalance, setTrialBalance] = useState<{ items: TrialBalanceItem[]; summary: any } | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
    const [folios, setFolios] = useState<Folio[]>([]);

    // New Journal Entry Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [entryDescription, setEntryDescription] = useState('');
    const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
    const [entryLines, setEntryLines] = useState<Array<{ accountId: number; debit: number; credit: number; memo: string }>>([
        { accountId: 0, debit: 0, credit: 0, memo: '' },
        { accountId: 0, debit: 0, credit: 0, memo: '' }
    ]);
    const [postingLoading, setPostingLoading] = useState(false);

    // Fetch All Data
    const loadAllAccountingData = async () => {
        setLoading(true);
        setError(null);
        try {
            // 1. Fetch Trial Balance
            const tbRes = await fetch(`${getApiBaseUrl()}/api/accounting/trial-balance?propertyId=1`);
            const tbData = await tbRes.json();
            if (tbData.success) {
                setTrialBalance({ items: tbData.data, summary: tbData.summary });
            }

            // 2. Fetch Chart of Accounts
            const coaRes = await fetch(`${getApiBaseUrl()}/api/accounting/chart-of-accounts?propertyId=1`);
            const coaData = await coaRes.json();
            if (coaData.success) {
                setAccounts(coaData.data);
                if (coaData.data.length >= 2) {
                    setEntryLines([
                        { accountId: coaData.data[0].id, debit: 1000, credit: 0, memo: 'Debit line' },
                        { accountId: coaData.data[1].id, debit: 0, credit: 1000, memo: 'Credit line' }
                    ]);
                }
            }

            // 3. Fetch Journal Entries
            const jvRes = await fetch(`${getApiBaseUrl()}/api/accounting/journal-entries?propertyId=1`);
            const jvData = await jvRes.json();
            if (jvData.success) {
                setJournalEntries(jvData.data);
            }

            // 4. Fetch Folios
            const foliosRes = await fetch(`${getApiBaseUrl()}/api/accounting/folios?propertyId=1`);
            const foliosData = await foliosRes.json();
            if (foliosData.success) {
                setFolios(foliosData.data);
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching accounting data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllAccountingData();
    }, []);

    // Line math
    const totalNewDebit = entryLines.reduce((acc, curr) => acc + (Number(curr.debit) || 0), 0);
    const totalNewCredit = entryLines.reduce((acc, curr) => acc + (Number(curr.credit) || 0), 0);
    const isNewEntryBalanced = Math.abs(totalNewDebit - totalNewCredit) < 0.01 && totalNewDebit > 0;

    // Handle Line Change
    const handleLineChange = (index: number, field: string, value: any) => {
        const updated = [...entryLines];
        updated[index] = { ...updated[index], [field]: value };
        setEntryLines(updated);
    };

    const addLine = () => {
        if (accounts.length > 0) {
            setEntryLines([...entryLines, { accountId: accounts[0].id, debit: 0, credit: 0, memo: '' }]);
        }
    };

    const removeLine = (index: number) => {
        if (entryLines.length > 2) {
            setEntryLines(entryLines.filter((_, i) => i !== index));
        }
    };

    // Submit Journal Entry
    const handlePostJournalEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isNewEntryBalanced) {
            alert('Journal entry must be balanced: Total Debits must equal Total Credits.');
            return;
        }

        setPostingLoading(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/journal-entries`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: 1,
                    entryDate,
                    description: entryDescription || 'General Journal Adjustment Voucher',
                    lines: entryLines.map(l => ({
                        accountId: Number(l.accountId),
                        debit: Number(l.debit) || 0,
                        credit: Number(l.credit) || 0,
                        memo: l.memo
                    }))
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ Journal Entry #${data.entryNumber} posted successfully!`);
                setIsCreateModalOpen(false);
                setEntryDescription('');
                loadAllAccountingData();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err: any) {
            alert(`Failed to post: ${err.message}`);
        } finally {
            setPostingLoading(false);
        }
    };

    return (
        <div className="p-2 sm:p-3 bg-slate-50 min-h-screen text-slate-800 space-y-2.5">
            {/* Top Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <Landmark size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                USALI Enterprise Accounting & General Ledger
                            </h1>
                            <span className="px-1.5 py-0.2 text-[8.5px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none font-semibold">
                                Double-Entry Enforced
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            Uniform System of Accounts for the Lodging Industry (USALI 11th Edition) & Folio Ledger
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={loadAllAccountingData}
                        className="btn-secondary"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Accounts</span>
                    </button>
                    <button 
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary"
                    >
                        <Plus size={14} />
                        <span>Post Journal Voucher</span>
                    </button>
                </div>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                    <AlertTriangle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Trial Balance Health Banner */}
            {trialBalance && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Debits</div>
                        <div className="text-2xl text-slate-900 mt-1">
                            ৳ {trialBalance.summary.grandDebit?.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Credits</div>
                        <div className="text-2xl text-slate-900 mt-1">
                            ৳ {trialBalance.summary.grandCredit?.toLocaleString()}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ledger Balance Status</div>
                        <div className="text-base text-emerald-600 mt-1 flex items-center gap-1.5">
                            {trialBalance.summary.isBalanced ? (
                                <>
                                    <CheckCircle2 size={18} /> Perfectly Balanced (0.00 Diff)
                                </>
                            ) : (
                                <span className="text-rose-600 flex items-center gap-1.5">
                                    <AlertTriangle size={18} /> Discrepancy: ৳ {trialBalance.summary.difference}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active USALI Accounts</div>
                        <div className="text-2xl text-indigo-600 mt-1">
                            {accounts.length} Accounts
                        </div>
                    </div>
                </div>
            )}

            {/* Tab Controls */}
            <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-semibold mt-6 max-w-fit">
                <button
                    onClick={() => setActiveTab('trial_balance')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'trial_balance' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <BookOpen size={14} /> Trial Balance
                </button>
                <button
                    onClick={() => setActiveTab('journal')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'journal' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <FileText size={14} /> General Journal ({journalEntries.length})
                </button>
                <button
                    onClick={() => setActiveTab('coa')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'coa' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <Layers size={14} /> Chart of Accounts ({accounts.length})
                </button>
                <button
                    onClick={() => setActiveTab('folios')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${
                        activeTab === 'folios' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                    }`}
                >
                    <CreditCard size={14} /> Guest Folios & Invoicing ({folios.length})
                </button>
            </div>

            {/* Tab 1: Live Trial Balance */}
            {activeTab === 'trial_balance' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-base text-slate-900">General Ledger Trial Balance</h2>
                            <p className="text-xs text-slate-500">Live aggregated debit and credit positions across all USALI departments</p>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                    <th className="p-3">Code</th>
                                    <th className="p-3">Account Name</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3 text-right">Debit (৳)</th>
                                    <th className="p-3 text-right">Credit (৳)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {trialBalance?.items.map(acc => (
                                    <tr key={acc.account_id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-mono text-slate-800">{acc.account_code}</td>
                                        <td className="p-3 font-medium text-slate-800">{acc.account_name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                acc.account_type === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                                                acc.account_type === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                                                acc.account_type === 'REVENUE' ? 'bg-emerald-100 text-emerald-800' :
                                                acc.account_type === 'EXPENSE' ? 'bg-rose-100 text-rose-800' :
                                                'bg-purple-100 text-purple-800'
                                            }`}>
                                                {acc.account_type}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right font-mono font-semibold text-slate-700">
                                            {acc.netDebit > 0 ? acc.netDebit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                        <td className="p-3 text-right font-mono font-semibold text-slate-700">
                                            {acc.netCredit > 0 ? acc.netCredit.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-50 text-slate-900 border-t-2 border-slate-300">
                                    <td colSpan={3} className="p-3 uppercase tracking-wider text-xs">Grand Total Balanced Check</td>
                                    <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                                        ৳ {trialBalance?.summary.grandDebit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-3 text-right font-mono text-emerald-700 text-sm">
                                        ৳ {trialBalance?.summary.grandCredit?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 2: Journal Entries */}
            {activeTab === 'journal' && (
                <div className="space-y-4 mt-6">
                    {journalEntries.map(jv => (
                        <div key={jv.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden">
                            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                                        {jv.entry_number}
                                    </span>
                                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                                        <Calendar size={12} /> {jv.entry_date}
                                    </span>
                                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                                        REF: {jv.reference_type}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-800">
                                    Total: ৳ {jv.total_amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>

                            <p className="text-xs font-medium text-slate-700 mt-2.5 mb-3">{jv.description}</p>

                            <div className="border border-slate-100 rounded-lg overflow-hidden">
                                <table className="w-full text-left text-[11px]">
                                    <thead>
                                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                                            <th className="p-2">Account</th>
                                            <th className="p-2">Memo / Description</th>
                                            <th className="p-2 text-right">Debit (৳)</th>
                                            <th className="p-2 text-right">Credit (৳)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-mono">
                                        {jv.lines?.map(l => (
                                            <tr key={l.id} className="hover:bg-slate-50">
                                                <td className="p-2">
                                                    <span className="text-slate-800">{l.account_code}</span> - {l.account_name}
                                                </td>
                                                <td className="p-2 text-slate-500 font-sans">{l.memo || '-'}</td>
                                                <td className="p-2 text-right font-semibold text-slate-800">
                                                    {l.debit > 0 ? Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                                <td className="p-2 text-right font-semibold text-slate-800">
                                                    {l.credit > 0 ? Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Tab 3: Chart of Accounts */}
            {activeTab === 'coa' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-6">
                    <div className="p-4 border-b border-slate-100">
                        <h2 className="text-base text-slate-900">USALI 11th Edition Chart of Accounts</h2>
                        <p className="text-xs text-slate-500">Uniform standardized accounts mapped directly to hospitality operating departments</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                    <th className="p-3">GL Code</th>
                                    <th className="p-3">Account Title</th>
                                    <th className="p-3">Account Type</th>
                                    <th className="p-3">USALI Department</th>
                                    <th className="p-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {accounts.map(acc => (
                                    <tr key={acc.id} className="hover:bg-slate-50 transition">
                                        <td className="p-3 font-mono text-emerald-800">{acc.account_code}</td>
                                        <td className="p-3 font-semibold text-slate-800">{acc.account_name}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                acc.account_type === 'ASSET' ? 'bg-blue-100 text-blue-800' :
                                                acc.account_type === 'LIABILITY' ? 'bg-amber-100 text-amber-800' :
                                                acc.account_type === 'REVENUE' ? 'bg-emerald-100 text-emerald-800' :
                                                acc.account_type === 'EXPENSE' ? 'bg-rose-100 text-rose-800' :
                                                'bg-purple-100 text-purple-800'
                                            }`}>
                                                {acc.account_type}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono text-[11px] text-slate-600">{acc.usali_department}</td>
                                        <td className="p-3">
                                            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                                                <CheckCircle2 size={12} /> Active
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Tab 4: Folios & Invoicing */}
            {activeTab === 'folios' && (
                <div className="space-y-4 mt-6">
                    {folios.map(folio => (
                        <div key={folio.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
                                <div className="flex items-center gap-3">
                                    <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
                                        {folio.folio_number}
                                    </span>
                                    <span className="text-xs text-slate-800">
                                        {folio.guest_name}
                                    </span>
                                    <span className="text-xs text-slate-500 font-mono">
                                        Res #{folio.reservation_number}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">Balance Due:</span>
                                    <span className={`text-sm font-mono ${folio.balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                        ৳ {folio.balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                {/* Charges list */}
                                <div>
                                    <div className="text-xs text-slate-600 mb-1.5 flex items-center justify-between">
                                        <span>Itemized Charges ({folio.charges?.length || 0})</span>
                                    </div>
                                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
                                        {folio.charges?.map((c, i) => (
                                            <div key={i} className="p-2 flex items-center justify-between hover:bg-slate-50">
                                                <span className="text-slate-700">{c.description}</span>
                                                <span className="font-mono font-semibold text-slate-900">৳ {Number(c.total_amount).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Payments list */}
                                <div>
                                    <div className="text-xs text-slate-600 mb-1.5 flex items-center justify-between">
                                        <span>Recorded Payments ({folio.payments?.length || 0})</span>
                                    </div>
                                    <div className="border border-slate-100 rounded-lg overflow-hidden divide-y divide-slate-100 text-xs">
                                        {folio.payments?.map((p, i) => (
                                            <div key={i} className="p-2 flex items-center justify-between bg-emerald-50/40">
                                                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                                                    <CreditCard size={12} /> {p.payment_method} ({p.payment_number})
                                                </div>
                                                <span className="font-mono text-emerald-700">৳ {Number(p.amount).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal: Post Double-Entry Journal Entry */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
                        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h3 className="text-base text-slate-900">Post Double-Entry Journal Voucher</h3>
                                <p className="text-xs text-slate-500">Total Debits must strictly equal Total Credits</p>
                            </div>
                            <button 
                                onClick={() => setIsCreateModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-sm p-1"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handlePostJournalEntry} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Voucher Date</label>
                                    <input 
                                        type="date"
                                        value={entryDate}
                                        onChange={(e) => setEntryDate(e.target.value)}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Memo</label>
                                    <input 
                                        type="text"
                                        placeholder="e.g., Bank charges or petty cash replenishment"
                                        value={entryDescription}
                                        onChange={(e) => setEntryDescription(e.target.value)}
                                        className="w-full text-xs p-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Lines Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden">
                                <div className="p-2.5 bg-slate-100 text-slate-700 font-semibold text-xs grid grid-cols-12 gap-2">
                                    <div className="col-span-5">USALI Account</div>
                                    <div className="col-span-3 text-right">Debit (৳)</div>
                                    <div className="col-span-3 text-right">Credit (৳)</div>
                                    <div className="col-span-1 text-center">Action</div>
                                </div>

                                <div className="divide-y divide-slate-100 p-2 space-y-2">
                                    {entryLines.map((line, idx) => (
                                        <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs">
                                            <div className="col-span-5">
                                                <select
                                                    value={line.accountId}
                                                    onChange={(e) => handleLineChange(idx, 'accountId', Number(e.target.value))}
                                                    className="w-full text-xs p-1.5 border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 font-sans"
                                                >
                                                    {accounts.map(acc => (
                                                        <option key={acc.id} value={acc.id}>
                                                            {acc.account_code} - {acc.account_name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-3">
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={line.debit || ''}
                                                    onChange={(e) => handleLineChange(idx, 'debit', parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className="w-full text-xs p-1.5 border border-slate-200 rounded text-right font-mono"
                                                />
                                            </div>
                                            <div className="col-span-3">
                                                <input 
                                                    type="number"
                                                    step="0.01"
                                                    value={line.credit || ''}
                                                    onChange={(e) => handleLineChange(idx, 'credit', parseFloat(e.target.value) || 0)}
                                                    placeholder="0.00"
                                                    className="w-full text-xs p-1.5 border border-slate-200 rounded text-right font-mono"
                                                />
                                            </div>
                                            <div className="col-span-1 text-center">
                                                {entryLines.length > 2 && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => removeLine(idx)}
                                                        className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                                    >
                                                        ✕
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                type="button" 
                                onClick={addLine}
                                className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                            >
                                <Plus size={12} /> Add Entry Line
                            </button>

                            {/* Balance Checker Banner */}
                            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
                                isNewEntryBalanced ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
                            }`}>
                                <div className="flex items-center gap-2">
                                    {isNewEntryBalanced ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                                    <span className="font-semibold">
                                        {isNewEntryBalanced 
                                            ? 'Voucher is perfectly balanced' 
                                            : `Out of balance by ৳ ${Math.abs(totalNewDebit - totalNewCredit).toFixed(2)}`}
                                    </span>
                                </div>
                                <div className="font-mono text-xs space-x-3">
                                    <span>Dr: ৳ {totalNewDebit.toFixed(2)}</span>
                                    <span>Cr: ৳ {totalNewCredit.toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!isNewEntryBalanced || postingLoading}
                                    className={`px-5 py-2 text-xs font-semibold text-white rounded-lg shadow ${
                                        isNewEntryBalanced && !postingLoading 
                                            ? 'bg-emerald-600 hover:bg-emerald-700' 
                                            : 'bg-slate-300 cursor-not-allowed'
                                    }`}
                                >
                                    {postingLoading ? 'Posting...' : 'Post to General Ledger'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvanceAccountingDashboard;
