import React from 'react';
import { Trash2 } from 'lucide-react';

export interface DiscountConsoleProps {
    discountType: 'Fixed' | 'Percentage';
    discountValue: number;
    discountedAmount: number;
    currencySymbol?: string;
    onTypeChange: (type: 'Fixed' | 'Percentage') => void;
    onValueChange: (val: number) => void;
    onClear: () => void;
    onApplyPreset?: (pct: number) => void;
}

export const DiscountConsole: React.FC<DiscountConsoleProps> = ({
    discountType,
    discountValue,
    discountedAmount,
    currencySymbol = '৳',
    onTypeChange,
    onValueChange,
    onClear,
    onApplyPreset
}) => {
    return (
        <div className="border border-slate-200 rounded-lg p-2.5 bg-white shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="text-gray-900 text-[10.5px] font-bold uppercase tracking-wider">Promotional Discount</span>
                    {discountedAmount > 0 && (
                        <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                            ✓ Saved {currencySymbol}{discountedAmount.toFixed(2)}
                        </span>
                    )}
                </div>
                <div className="inline-flex rounded-md border border-slate-200 p-0.5 bg-slate-100">
                    <button
                        type="button"
                        onClick={() => onTypeChange('Fixed')}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                            discountType === 'Fixed' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        {currencySymbol} Fixed
                    </button>
                    <button
                        type="button"
                        onClick={() => onTypeChange('Percentage')}
                        className={`px-2 py-0.5 text-[10px] font-semibold rounded cursor-pointer transition-colors ${
                            discountType === 'Percentage' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        % Percent
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="number"
                        min={0}
                        value={discountValue === 0 ? '' : discountValue}
                        placeholder="0"
                        onChange={e => onValueChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="w-full h-7 px-2 border border-gray-200 rounded text-[11px] outline-none font-bold"
                    />
                    <span className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-400">
                        {discountType === 'Fixed' ? currencySymbol : '%'}
                    </span>
                </div>

                {/* Quick Preset Chips */}
                <div className="flex items-center gap-1">
                    {[5, 10, 15, 20].map(pct => (
                        <button
                            key={pct}
                            type="button"
                            onClick={() => {
                                if (onApplyPreset) {
                                    onApplyPreset(pct);
                                } else {
                                    onTypeChange('Percentage');
                                    onValueChange(pct);
                                }
                            }}
                            className={`px-1.5 py-1 text-[10px] font-semibold rounded border cursor-pointer transition-colors ${
                                discountType === 'Percentage' && discountValue === pct
                                    ? 'bg-blue-50 border-blue-400 text-blue-900'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {pct}%
                        </button>
                    ))}
                    {discountValue > 0 && (
                        <button
                            type="button"
                            onClick={onClear}
                            className="p-1 text-slate-400 hover:text-red-500 rounded cursor-pointer"
                            title="Reset Discount"
                        >
                            <Trash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
