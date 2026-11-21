import React from 'react';

export interface FinancialStatusStripProps {
    finalPayable: number;
    totalPaid: number;
    totalDue: number;
    currencySymbol?: string;
}

export const FinancialStatusStrip: React.FC<FinancialStatusStripProps> = ({
    finalPayable,
    totalPaid,
    totalDue,
    currencySymbol = '৳'
}) => {
    return (
        <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 border border-slate-200/90 rounded-lg shadow-2xs">
            {/* Grand Total */}
            <div className="bg-white border border-slate-200 rounded-md p-2 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Grand Total (Payable)</span>
                <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                    {currencySymbol} {finalPayable.toFixed(2)}
                </span>
            </div>

            {/* Collected / Paid */}
            <div className="bg-white border border-slate-200 rounded-md p-2 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Collected / Paid</span>
                    {totalPaid > 0 && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                            Active
                        </span>
                    )}
                </div>
                <span className="font-mono text-sm sm:text-base font-black text-emerald-600">
                    {currencySymbol} {totalPaid.toFixed(2)}
                </span>
            </div>

            {/* Balance Due */}
            <div className={`border rounded-md p-2 flex flex-col justify-between ${
                totalDue > 0 ? 'bg-rose-50/60 border-rose-200' : 'bg-emerald-50/60 border-emerald-200'
            }`}>
                <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${totalDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                        {totalDue > 0 ? 'Balance Due' : 'Settlement Status'}
                    </span>
                    {totalDue === 0 && (
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                            ✓ Settled
                        </span>
                    )}
                </div>
                <span className={`font-mono text-sm sm:text-base font-black ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {totalDue > 0 ? `${currencySymbol} ${totalDue.toFixed(2)}` : '✓ Full Paid'}
                </span>
            </div>
        </div>
    );
};
