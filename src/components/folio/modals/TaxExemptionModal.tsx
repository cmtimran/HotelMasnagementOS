import React, { useState, useEffect } from 'react';
import { X, ShieldCheck } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';

interface TaxExemptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFolio: FolioData | null;
    onSuccess: () => void;
}

export const TaxExemptionModal: React.FC<TaxExemptionModalProps> = ({
    isOpen,
    onClose,
    currentFolio,
    onSuccess
}) => {
    const [taxExemptionId, setTaxExemptionId] = useState('MILITARY_GOV_EXEMPT_2026');
    const [selectedChargeIds, setSelectedChargeIds] = useState<Array<number | string>>([]);
    const [exemptScope, setExemptScope] = useState<'all' | 'selected'>('all');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTaxExemptionId('MILITARY_GOV_EXEMPT_2026');
            setSelectedChargeIds([]);
            setExemptScope('all');
            setErrorMsg('');
        }
    }, [isOpen]);

    const handleApplyExemption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxExemptionId.trim()) {
            setErrorMsg('Tax Exemption ID is required by revenue compliance authorities');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${currentFolio?.id}/tax-exempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taxExemptionId,
                    chargeIds: exemptScope === 'selected' ? selectedChargeIds : [],
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                onSuccess();
                onClose();
            } else {
                setErrorMsg(data?.error || 'Failed to apply tax exemption');
            }
        } catch (err: any) {
            setErrorMsg(err?.message || 'Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const activeCharges = currentFolio?.charges?.filter(c => !c.is_voided && c.is_tax_applicable) || [];

    return (
        <div className="fixed inset-0 z-[100005] bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-100">
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-md overflow-hidden flex flex-col text-gray-800">
                <div className="bg-[#1e3a8a] text-white px-4 py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-teal-400" />
                        <h3 className="text-xs font-bold tracking-wide">Tax Operation / Tax Exemption</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={15} />
                    </button>
                </div>

                <form onSubmit={handleApplyExemption} className="p-4 space-y-3 text-xs">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded text-[11px]">
                            {errorMsg}
                        </div>
                    )}

                    <div className="bg-teal-50 border border-teal-200/80 rounded-lg p-2.5 text-[11px] text-teal-900 space-y-1">
                        <span className="font-bold">Official Exemption Policy (Yanolja Freshdesk 9000274726):</span>
                        <p className="text-teal-800">
                            Apply VAT, Service Charge & City Tax exemption for diplomatic missions, military personnel, UN agencies, or verified NGOs.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                            <span className="text-rose-500 mr-0.5">*</span> Tax Exemption ID / Certificate #
                        </label>
                        <input
                            type="text"
                            value={taxExemptionId}
                            onChange={(e) => setTaxExemptionId(e.target.value)}
                            placeholder="e.g. UN-DIPLOMAT-2026-X9"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-700 mb-1">Scope</label>
                        <div className="flex items-center gap-4 text-xs">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="exemptScope"
                                    checked={exemptScope === 'all'}
                                    onChange={() => setExemptScope('all')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>Entire Folio ({activeCharges.length} taxable items)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                    type="radio"
                                    name="exemptScope"
                                    checked={exemptScope === 'selected'}
                                    onChange={() => setExemptScope('selected')}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span>Selective Charges</span>
                            </label>
                        </div>
                    </div>

                    {exemptScope === 'selected' && (
                        <div className="border border-gray-200 rounded-md p-2 max-h-36 overflow-y-auto space-y-1.5 bg-gray-50/50">
                            {activeCharges.map((c) => (
                                <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px]">
                                    <input
                                        type="checkbox"
                                        checked={selectedChargeIds.includes(c.id)}
                                        onChange={() => {
                                            setSelectedChargeIds(prev =>
                                                prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                            );
                                        }}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3 h-3"
                                    />
                                    <span className="font-mono text-gray-500">{c.charge_date}</span>
                                    <span className="font-medium text-gray-800 truncate">{c.revenue_head}</span>
                                    <span className="text-gray-500 font-mono ml-auto">Tax: ৳{Number(c.total_tax || 0).toFixed(2)}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3.5 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-xs cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                        >
                            {isSubmitting ? 'Relieving Tax...' : 'Confirm Tax Exemption'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
