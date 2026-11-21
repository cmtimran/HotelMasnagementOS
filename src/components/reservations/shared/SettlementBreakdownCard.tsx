import React from 'react';
import { Car, Plane, BedDouble, Utensils, Gift, Sparkles, Clock } from 'lucide-react';
import type { TaxCalculationResult } from '../../../utils/taxCalculationEngine';

export interface SettlementBreakdownCardProps {
    roomBaseTotal: number;
    nights?: number;
    grossTotal: number;
    discountedAmount: number;
    discountType: 'Fixed' | 'Percentage';
    discountValue: number;
    netBaseAmount: number;
    taxCalculation: TaxCalculationResult;
    finalPayable: number;
    totalPaid: number;
    totalDue: number;
    currencySymbol?: string;
    // Optional itemized add-ons breakdown
    addons?: {
        pickup?: number;
        drop?: number;
        extraBed?: number;
        mealPlan?: number;
        celebration?: number;
        spa?: number;
        timing?: number;
        custom?: number;
        galaDinner?: number;
        totalAll?: number;
    };
    holidaySurge?: {
        hasSurge: boolean;
        multiplier?: number;
        holidayName?: string;
    };
}

export const SettlementBreakdownCard: React.FC<SettlementBreakdownCardProps> = ({
    roomBaseTotal,
    nights = 1,
    grossTotal,
    discountedAmount,
    discountType,
    discountValue,
    netBaseAmount,
    taxCalculation,
    finalPayable,
    totalPaid,
    totalDue,
    currencySymbol = '৳',
    addons,
    holidaySurge
}) => {
    const totalAddons = addons?.totalAll || 0;

    return (
        <div className="border border-slate-200 rounded-lg p-3 bg-white shadow-2xs space-y-2">
            <h3 className="text-gray-900 text-[10.5px] font-bold uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Settlement Breakdown</span>
                {totalAddons > 0 && (
                    <span className="text-[9.5px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-bold">
                        Addons: +{currencySymbol}{totalAddons.toFixed(0)}
                    </span>
                )}
            </h3>

            {holidaySurge?.hasSurge && (
                <div className="flex items-center justify-between text-[10px] text-amber-900 bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-1 rounded border border-amber-200/80 shadow-2xs">
                    <span className="font-bold flex items-center gap-1">
                        <span>🎉</span>
                        <span>Festive Surge: {holidaySurge.holidayName || 'Holiday Season'}</span>
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-100/80 px-1 py-0.5 rounded text-[9.5px]">
                        {holidaySurge.multiplier ? `${holidaySurge.multiplier}x (+${Math.round((holidaySurge.multiplier - 1) * 100)}%)` : 'Active'}
                    </span>
                </div>
            )}

            <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between py-0.5 text-gray-600">
                    <span>Room Base Tariff ({nights}N):</span>
                    <span className="text-gray-900 font-mono font-semibold">{currencySymbol} {roomBaseTotal.toFixed(2)}</span>
                </div>

                {totalAddons > 0 && (
                    <div className="my-1 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-[10.5px] space-y-0.5">
                        {!!addons?.pickup && addons.pickup > 0 && (
                            <div className="flex justify-between text-blue-700">
                                <span className="flex items-center gap-1"><Car size={10} /> Airport Pickup</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.pickup.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.drop && addons.drop > 0 && (
                            <div className="flex justify-between text-sky-700">
                                <span className="flex items-center gap-1"><Plane size={10} /> Airport Drop</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.drop.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.extraBed && addons.extraBed > 0 && (
                            <div className="flex justify-between text-indigo-700">
                                <span className="flex items-center gap-1"><BedDouble size={10} /> Extra Bed</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.extraBed.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.mealPlan && addons.mealPlan > 0 && (
                            <div className="flex justify-between text-amber-700">
                                <span className="flex items-center gap-1"><Utensils size={10} /> Meal Plans</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.mealPlan.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.celebration && addons.celebration > 0 && (
                            <div className="flex justify-between text-rose-700">
                                <span className="flex items-center gap-1"><Gift size={10} /> Celebration</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.celebration.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.spa && addons.spa > 0 && (
                            <div className="flex justify-between text-teal-700">
                                <span className="flex items-center gap-1"><Sparkles size={10} /> Spa &amp; Wellness</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.spa.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.timing && addons.timing > 0 && (
                            <div className="flex justify-between text-sky-700">
                                <span className="flex items-center gap-1"><Clock size={10} /> Timing Flex</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.timing.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.custom && addons.custom > 0 && (
                            <div className="flex justify-between text-purple-700">
                                <span>Custom Addons</span>
                                <span className="font-mono font-medium">+{currencySymbol}{addons.custom.toFixed(2)}</span>
                            </div>
                        )}
                        {!!addons?.galaDinner && addons.galaDinner > 0 && (
                            <div className="flex justify-between text-fuchsia-800 bg-fuchsia-50/80 px-1 py-0.5 rounded border border-fuchsia-200 font-medium">
                                <span className="flex items-center gap-1"><Utensils size={10} className="text-fuchsia-600" /> Mandatory Gala Dinner</span>
                                <span className="font-mono font-bold">+{currencySymbol}{addons.galaDinner.toFixed(2)}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-between py-0.5 text-gray-700 border-t border-gray-100 pt-1 font-semibold">
                    <span>Gross Total:</span>
                    <span className="text-gray-900 font-mono">{currencySymbol} {grossTotal.toFixed(2)}</span>
                </div>

                {discountedAmount > 0 && (
                    <div className="flex items-center justify-between py-0.5 text-emerald-600 font-semibold">
                        <span>Promo Discount ({discountType === 'Percentage' ? `${discountValue}%` : 'Fixed'}):</span>
                        <span className="font-mono">-{currencySymbol} {discountedAmount.toFixed(2)}</span>
                    </div>
                )}

                <div className="flex items-center justify-between py-0.5 text-gray-600 text-[10.5px]">
                    <span>Net Base (Taxable):</span>
                    <span className="font-semibold font-mono text-gray-800">{currencySymbol} {netBaseAmount.toFixed(2)}</span>
                </div>

                {/* Statutory Taxes */}
                {taxCalculation.isTaxApplicable && taxCalculation.breakdown.length > 0 ? (
                    <div className="my-1 py-1 px-2 bg-slate-50 border border-slate-200 rounded text-xs space-y-0.5">
                        <div className="flex items-center justify-between text-[9.5px] text-slate-500 uppercase tracking-wider pb-0.5 border-b border-slate-200 font-bold">
                            <span>{taxCalculation.configCode || 'TAX'} Tax Rules</span>
                            <span className="text-blue-700 font-mono">+{currencySymbol} {taxCalculation.totalTaxAmount.toFixed(2)}</span>
                        </div>
                        {taxCalculation.breakdown.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-[10px] text-slate-600">
                                <span>{item.name} ({item.rate}%):</span>
                                <span className="font-mono text-slate-800 font-semibold">
                                    +{currencySymbol} {item.amount.toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="my-1 py-1 px-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 font-medium flex justify-between">
                        <span>Tax Exemption</span>
                        <span className="font-mono">{currencySymbol} 0.00 (Exempt)</span>
                    </div>
                )}

                {/* Pinned Bottom Totals */}
                <div className="pt-1 border-t border-slate-200 space-y-1">
                    <div className="flex items-center justify-between py-1 px-2 bg-slate-900 text-white rounded font-bold">
                        <span className="text-xs">Final Payable:</span>
                        <span className="font-mono text-sm">{currencySymbol} {finalPayable.toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between py-0.5 px-2 text-xs">
                        <span className="text-slate-600">Total Paid:</span>
                        <span className="font-mono font-bold text-emerald-600">{currencySymbol} {totalPaid.toFixed(2)}</span>
                    </div>
                    <div className={`flex items-center justify-between py-1 px-2 rounded font-bold text-xs ${
                        totalDue > 0 ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    }`}>
                        <span>{totalDue > 0 ? 'Balance Due:' : 'Status:'}</span>
                        <span className="font-mono">{totalDue > 0 ? `${currencySymbol} ${totalDue.toFixed(2)}` : '✓ All Cleared'}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
