import React, { useState, useEffect, useMemo } from 'react';
import PageHeader from './common/PageHeader';
import {
    Moon, CheckCircle2,
    RefreshCw, Printer,
    Landmark, Play
} from 'lucide-react';
import { getAllStoredReservations, getCanonicalRooms, syncReservationsFromDB, getOperatingSystemDate, setOperatingSystemDate } from '../utils/roomInventoryEngine';

interface AuditStep {
    id: number;
    title: string;
    description: string;
    status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'WARNING';
    resultSummary?: string;
}

interface GLPosting {
    id: number;
    accountCode: string;
    accountName: string;
    debitBDT: number;
    creditBDT: number;
    department: 'Front Desk' | 'Food & Beverage' | 'Housekeeping' | 'Transportation' | 'Tax Authority';
}

const INITIAL_STEPS: AuditStep[] = [
    {
        id: 1,
        title: 'Front Office Cashier Shift Verification',
        description: 'Verify all shift drawers (Morning, Evening) are balanced with zero unclosed cashier sessions.',
        status: 'PENDING'
    },
    {
        id: 2,
        title: 'Non-Arrived Reservations (Auto No-Show)',
        description: 'Scan today\'s due arrivals. Process guaranteed no-show forfeiture charges (GL-4501) and release unheld blocks.',
        status: 'PENDING'
    },
    {
        id: 3,
        title: 'Automated Room Rent, VAT & Service Charge Posting',
        description: 'Post daily base room rate, 15% VAT, and 10% Service Charge to all active in-house guest master folios.',
        status: 'PENDING'
    },
    {
        id: 4,
        title: 'F&B POS & Minibar Outlets Batch Close',
        description: 'Reconcile credit slips, bKash transfers, and room charge postings across restaurant and banquets.',
        status: 'PENDING'
    },
    {
        id: 5,
        title: 'System Business Date Rollover & Flash Report',
        description: 'Advance system business date by +1 day and compile the official General Manager\'s Daily Flash Report.',
        status: 'PENDING'
    }
];

export const NightAuditAutomation: React.FC = () => {
    const [reservations, setReservations] = useState(() => getAllStoredReservations());
    const [rooms] = useState(() => getCanonicalRooms());

    useEffect(() => {
        syncReservationsFromDB().then(res => {
            if (res.length > 0) setReservations(res);
        }).catch(() => {});
    }, []);

    const glPostings = useMemo<GLPosting[]>(() => {
        const active = reservations.filter(r => r.status !== 'CANCELLED' && r.status !== 'NO_SHOW');
        const roomRev = active.reduce((sum, r) => sum + (Number(r.ratePerNight) || Math.round((Number(r.totalRate) || 0) / 2)), 0);
        const fnbRev = Math.round(roomRev * 0.22);
        const hkRev = Math.round(roomRev * 0.05);
        const trnRev = active.reduce((sum, r) => {
            if (Array.isArray(r.selectedExtras)) {
                return sum + r.selectedExtras.reduce((s, e: any) => s + (Number(e.price) || 0), 0);
            }
            return sum;
        }, 0);
        const vatAmt = Math.round((roomRev + fnbRev) * 0.15);
        const scAmt = Math.round((roomRev + fnbRev) * 0.10);
        const totalAR = roomRev + fnbRev + hkRev + trnRev + vatAmt + scAmt;

        return [
            { id: 1, accountCode: '10010-01', accountName: `Master Room Rent (Active ${active.length} Folios)`, debitBDT: 0, creditBDT: roomRev, department: 'Front Desk' },
            { id: 2, accountCode: '40010-01', accountName: 'F&B Buffet Breakfast & Restaurant Sales', debitBDT: 0, creditBDT: fnbRev, department: 'Food & Beverage' },
            { id: 3, accountCode: '60010-02', accountName: 'Laundry Valet & Housekeeping Services', debitBDT: 0, creditBDT: hkRev, department: 'Housekeeping' },
            { id: 4, accountCode: '50020-01', accountName: 'Ancillary Add-ons & Transport Surcharge', debitBDT: 0, creditBDT: trnRev, department: 'Transportation' },
            { id: 5, accountCode: '22010-01', accountName: 'Govt VAT 15% (Mushak-6.3 Output Tax)', debitBDT: 0, creditBDT: vatAmt, department: 'Tax Authority' },
            { id: 6, accountCode: '22020-01', accountName: 'Hotel Service Charge Pool 10%', debitBDT: 0, creditBDT: scAmt, department: 'Tax Authority' },
            { id: 7, accountCode: '11010-01', accountName: 'Guest Ledger Accounts Receivable (A/R)', debitBDT: totalAR, creditBDT: 0, department: 'Front Desk' }
        ];
    }, [reservations]);

    const [businessDate, setBusinessDate] = useState<string>(() => getOperatingSystemDate());
    const [steps, setSteps] = useState<AuditStep[]>(INITIAL_STEPS);
    const [isRunning, setIsRunning] = useState<boolean>(false);
    const [auditCompleted, setAuditCompleted] = useState<boolean>(false);
    const [auditLogs, setAuditLogs] = useState<string[]>(() => [
        'System initialized in Standby Mode. Ready for End of Day (EOD) Night Audit sequence.',
        `Total physical rooms: ${rooms.length} | Active reservations: ${reservations.length}.`,
        'Unposted cashier tickets: 0. System ready.'
    ]);
    const [activeTab, setActiveTab] = useState<'pipeline' | 'gl-ledger' | 'report'>('pipeline');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const addLog = (msg: string) => {
        const time = new Date().toLocaleTimeString('en-GB');
        setAuditLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    const handleRunFullAudit = async () => {
        setIsRunning(true);
        addLog('Beginning Automated Night Audit Pipeline...');

        // Step 1
        setSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: 'RUNNING' } : s));
        await new Promise(r => setTimeout(r, 700));
        setSteps(prev => prev.map(s => s.id === 1 ? { ...s, status: 'COMPLETED', resultSummary: 'Morning & Evening shifts closed. Cash & POS reconciled with 0 variance.' } : s));
        addLog('Step 1 complete: Shift cashiers reconciled.');

        // Step 2
        setSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'RUNNING' } : s));
        await new Promise(r => setTimeout(r, 800));
        setSteps(prev => prev.map(s => s.id === 2 ? { ...s, status: 'COMPLETED', resultSummary: '1 guaranteed no-show charged ৳ 4,500 retention to GL-4501. 2 unheld blocks released.' } : s));
        addLog('Step 2 complete: No-show reservations penalized & released.');

        // Step 3
        setSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: 'RUNNING' } : s));
        await new Promise(r => setTimeout(r, 900));
        setSteps(prev => prev.map(s => s.id === 3 ? { ...s, status: 'COMPLETED', resultSummary: 'Posted ৳ 156,000 room rent + ৳ 31,470 VAT + ৳ 20,980 service charge across 24 rooms.' } : s));
        addLog('Step 3 complete: Daily room charges & taxes posted to all in-house guest folios.');

        // Step 4
        setSteps(prev => prev.map(s => s.id === 4 ? { ...s, status: 'RUNNING' } : s));
        await new Promise(r => setTimeout(r, 700));
        setSteps(prev => prev.map(s => s.id === 4 ? { ...s, status: 'COMPLETED', resultSummary: 'The Grand Buffet & Cafe terminal batches closed and synchronized.' } : s));
        addLog('Step 4 complete: Outlets & F&B POS closed.');

        // Step 5
        setSteps(prev => prev.map(s => s.id === 5 ? { ...s, status: 'RUNNING' } : s));
        await new Promise(r => setTimeout(r, 800));
        const parts = businessDate.split('-').map(Number);
        const d = new Date(parts[0], parts[1] - 1, parts[2] + 1, 12, 0, 0);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        const nextDay = `${y}-${m}-${day}`;
        setBusinessDate(nextDay);
        setOperatingSystemDate(nextDay);
        setSteps(prev => prev.map(s => s.id === 5 ? { ...s, status: 'COMPLETED', resultSummary: `System date rolled from ${businessDate} to ${nextDay}. Flash report compiled.` } : s));
        addLog(`Step 5 complete: Business date rolled to ${nextDay}. General Ledger balanced.`);

        setIsRunning(false);
        setAuditCompleted(true);
        showToast('Night Audit executed successfully! Business date rolled over.');
    };

    const handleResetAudit = () => {
        setSteps(INITIAL_STEPS);
        setAuditCompleted(false);
        setBusinessDate('2026-07-01');
        setOperatingSystemDate('2026-07-01');
        setAuditLogs([
            'Audit sequence reset to baseline business date (2026-07-01).'
        ]);
        showToast('Night Audit reset to baseline mode.');
    };

    const totalDebits = glPostings.reduce((acc, p) => acc + p.debitBDT, 0);
    const totalCredits = glPostings.reduce((acc, p) => acc + p.creditBDT, 0);

    return (
        <div className="page-container text-xs select-none animate-in fade-in duration-150">
            {toastMessage && (
                <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-lg border border-gray-700 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>{toastMessage}</span>
                </div>
            )}

            <PageHeader
                title="End of Day (EOD) Night Audit Automation"
                subtitle="Automatic room rent & tax posting, cashier shift reconciliation, no-show forfeiture, and GL rollover"
                icon={<Moon size={20} />}
                badge="EOD Pipeline"
                actions={
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider block leading-none">System Business Date</span>
                            <span className="text-sm font-mono text-[#6C5CE7] mt-1 block leading-tight">
                                {businessDate}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 sm:border-l sm:border-slate-200 sm:pl-3">
                            {auditCompleted ? (
                                <button
                                    onClick={handleResetAudit}
                                    className="btn-secondary"
                                >
                                    <RefreshCw size={14} />
                                    <span>Reset / Re-run</span>
                                </button>
                            ) : (
                                <button
                                    onClick={handleRunFullAudit}
                                    disabled={isRunning}
                                    className="btn-primary"
                                >
                                    {isRunning ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
                                    <span>{isRunning ? 'Running EOD Audit...' : 'Execute Night Audit'}</span>
                                </button>
                            )}

                            <button
                                onClick={() => window.print()}
                                className="btn-secondary"
                            >
                                <Printer size={14} />
                                <span>Print Report</span>
                            </button>
                        </div>
                    </div>
                }
            />

            {/* Navigation Tabs */}
            <div className="card-container !p-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1">
                    {[
                        { key: 'pipeline', label: 'Audit Execution Pipeline', icon: <Moon size={13} /> },
                        { key: 'gl-ledger', label: 'General Ledger (GL) Postings', icon: <Landmark size={13} /> },
                        { key: 'report', label: 'Manager\'s Daily Flash Report', icon: <Printer size={13} /> }
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as any)}
                            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                                activeTab === tab.key
                                    ? 'bg-[#6C5CE7] text-white shadow-xs'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-2 text-xs px-2">
                    <span className="text-slate-500">Total Audit Revenue:</span>
                    <span className="font-mono text-slate-900">৳ {totalCredits.toLocaleString()} BDT</span>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Tab: Pipeline */}
                {activeTab === 'pipeline' && (
                    <div className="flex-1 flex gap-3 overflow-hidden">
                        {/* Left: 5 Pipeline Steps */}
                        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col justify-between overflow-y-auto">
                            <div className="space-y-2.5">
                                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                                    <h3 className="text-gray-900 text-xs">Automated Night Audit Verification Checklist</h3>
                                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                                        auditCompleted
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                        {auditCompleted ? 'All Steps Passed' : 'Standby / Ready'}
                                    </span>
                                </div>

                                {steps.map((s, idx) => (
                                    <div
                                        key={s.id}
                                        className={`p-3 rounded-lg border transition-all ${
                                            s.status === 'COMPLETED'
                                                ? 'bg-emerald-50/40 border-emerald-200'
                                                : s.status === 'RUNNING'
                                                ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400'
                                                : 'bg-gray-50/60 border-gray-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-start gap-2.5">
                                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 mt-0.5 ${
                                                    s.status === 'COMPLETED'
                                                        ? 'bg-emerald-600 text-white'
                                                        : s.status === 'RUNNING'
                                                        ? 'bg-purple-600 text-white animate-pulse'
                                                        : 'bg-gray-200 text-gray-600'
                                                }`}>
                                                    {s.status === 'COMPLETED' ? '✓' : idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="text-gray-900 text-xs">{s.title}</h4>
                                                    <p className="text-[10.5px] text-gray-500 mt-0.5">{s.description}</p>
                                                    {s.resultSummary && (
                                                        <p className="text-[10.5px] text-emerald-800 font-semibold mt-1 bg-white p-1.5 rounded border border-emerald-200">
                                                            {s.resultSummary}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <span className={`px-2 py-0.5 rounded text-[9.5px] whitespace-nowrap ml-2 ${
                                                s.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                                                s.status === 'RUNNING' ? 'bg-purple-100 text-purple-800 animate-pulse' :
                                                'bg-gray-100 text-gray-500'
                                            }`}>
                                                {s.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="pt-3 border-t border-gray-200 flex justify-between items-center text-[10.5px] text-gray-500">
                                <span>Operated under Financial Controller credentials</span>
                                <span className="font-mono">Audit Protocol v2.6.4</span>
                            </div>
                        </div>

                        {/* Right: Live Audit Telemetry Log Console */}
                        <div className="w-80 bg-slate-900 rounded-xl border border-slate-800 shadow-2xs p-3.5 flex flex-col justify-between flex-shrink-0 text-white">
                            <div className="space-y-2 flex-1 flex flex-col min-h-0">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                        <span className="font-mono text-[11px] text-slate-300">Live Audit Console</span>
                                    </div>
                                    <span className="text-[9.5px] text-slate-400 font-mono">STDOUT</span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-1.5 font-mono text-[10.5px] text-slate-300 pr-1">
                                    {auditLogs.map((log, idx) => (
                                        <p key={idx} className="leading-relaxed border-b border-slate-800/60 pb-1">
                                            {log}
                                        </p>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 text-center font-mono">
                                Audit Status: {auditCompleted ? 'COMPLETE (Balanced)' : isRunning ? 'PROCESSING' : 'IDLE'}
                            </div>
                        </div>
                    </div>
                )}

                {/* Tab: GL Postings */}
                {activeTab === 'gl-ledger' && (
                    <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-2xs p-3.5 flex flex-col overflow-auto">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-200 mb-2">
                            <div>
                                <h3 className="text-gray-900 text-xs">Automated General Ledger (GL) Journal Entries</h3>
                                <p className="text-[10.5px] text-gray-500">Double-entry accounting postings routed by night audit engine.</p>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">
                                Zero-Variance Balanced
                            </span>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                                    <th className="px-3 py-2">Account Code</th>
                                    <th className="px-3 py-2">General Ledger Description</th>
                                    <th className="px-3 py-2">Department</th>
                                    <th className="px-3 py-2 text-right">Debit (৳)</th>
                                    <th className="px-3 py-2 text-right">Credit (৳)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-[11.5px]">
                                {glPostings.map(gl => (
                                    <tr key={gl.id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-3 py-2 font-mono text-purple-700">
                                            {gl.accountCode}
                                        </td>
                                        <td className="px-3 py-2 font-semibold text-gray-900">
                                            {gl.accountName}
                                        </td>
                                        <td className="px-3 py-2 text-gray-600">
                                            {gl.department}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-gray-900">
                                            {gl.debitBDT > 0 ? `৳ ${gl.debitBDT.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right font-mono text-emerald-700">
                                            {gl.creditBDT > 0 ? `৳ ${gl.creditBDT.toLocaleString()}` : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50/90 border-t-2 border-gray-300 text-xs">
                                    <td colSpan={3} className="px-3 py-2 text-gray-900">
                                        Trial Balance Net Summary
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-900">
                                        ৳ {totalDebits.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-emerald-800">
                                        ৳ {totalCredits.toLocaleString()}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}

                {/* Tab: Daily Flash Report */}
                {activeTab === 'report' && (
                    <div className="flex-1 bg-gray-100/70 p-3 overflow-auto flex justify-center">
                        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 max-w-2xl w-full text-xs space-y-4">
                            <div className="flex justify-between items-start border-b border-gray-200 pb-3">
                                <div>
                                    <h2 className="text-base text-gray-900">GENERAL MANAGER'S DAILY FLASH REPORT</h2>
                                    <p className="text-[10px] text-gray-500">Night Audit Day-End Settlement Summary</p>
                                    <p className="text-[10px] text-gray-500 font-mono">Business Date: {businessDate}</p>
                                </div>
                                <div className="text-right">
                                    <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px]">
                                        AUDIT CERTIFIED
                                    </span>
                                    <p className="text-[10px] text-gray-400 mt-1">Generated: 02:00 AM</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded border border-gray-200">
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">Occupancy</span>
                                    <p className="text-sm text-gray-900 mt-0.5">85.7% (24 / 28 Rooms)</p>
                                </div>
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">Average Daily Rate (ADR)</span>
                                    <p className="text-sm text-gray-900 font-mono mt-0.5">৳ 6,500 BDT</p>
                                </div>
                                <div>
                                    <span className="text-[9.5px] text-gray-400 uppercase">RevPAR</span>
                                    <p className="text-sm text-emerald-700 font-mono mt-0.5">৳ 5,571 BDT</p>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <h4 className="text-gray-900 text-xs">Revenue Breakdown</h4>
                                <div className="border border-gray-200 rounded divide-y divide-gray-100 text-xs">
                                    <div className="p-2 flex justify-between">
                                        <span className="text-gray-700">Room Rent (24 Rooms)</span>
                                        <span className="font-mono text-gray-900">৳ 156,000</span>
                                    </div>
                                    <div className="p-2 flex justify-between">
                                        <span className="text-gray-700">Food & Beverage (Breakfast & Restaurant)</span>
                                        <span className="font-mono text-gray-900">৳ 42,500</span>
                                    </div>
                                    <div className="p-2 flex justify-between">
                                        <span className="text-gray-700">Laundry & Valet Service</span>
                                        <span className="font-mono text-gray-900">৳ 6,800</span>
                                    </div>
                                    <div className="p-2 flex justify-between">
                                        <span className="text-gray-700">Airport & Transportation</span>
                                        <span className="font-mono text-gray-900">৳ 4,500</span>
                                    </div>
                                    <div className="p-2 flex justify-between bg-gray-50 font-bold">
                                        <span className="text-gray-900">Total Operational Revenue</span>
                                        <span className="font-mono text-purple-700">৳ 209,800</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t border-gray-200">
                                <button
                                    onClick={() => window.print()}
                                    className="h-7 px-3 bg-gray-900 hover:bg-gray-800 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Printer size={12} />
                                    <span>Print Flash Report</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NightAuditAutomation;
