import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';
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
    const [taxExemptionId, setTaxExemptionId] = useState('');
    const [exemptScope, setExemptScope] = useState<'all' | 'selected'>('all');
    const [selectedChargeIds, setSelectedChargeIds] = useState<Array<number | string>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTaxExemptionId('');
            setExemptScope('all');
            setSelectedChargeIds([]);
            setErrorMsg('');
        }
    }, [isOpen]);

    const handleApplyExemption = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxExemptionId.trim()) {
            setErrorMsg('Tax Exemption ID is required');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${currentFolio?.id}/tax-exempt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    taxExemptionId: taxExemptionId.trim(),
                    scope: exemptScope,
                    chargeIds: exemptScope === 'selected' ? selectedChargeIds : undefined,
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
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[100004] bg-black/25 backdrop-blur-2xs transition-opacity animate-in fade-in duration-100"
                onClick={onClose}
            />

            {/* Slide-out Drawer Panel (Right Side) */}
            <div className="fixed inset-y-0 right-0 w-80 sm:w-[440px] bg-white shadow-2xl z-[100005] flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 text-gray-800 text-xs font-sans">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between flex-shrink-0 shadow-xs">
                    <div className="flex items-center gap-2">
                        <ShieldCheck size={16} className="text-teal-400" />
                        <h3 className="text-xs font-bold tracking-wide uppercase">Tax Operation / Exemption</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleApplyExemption} className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                        {errorMsg && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0 text-rose-600" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        <div className="bg-teal-50 border border-teal-200/80 rounded-lg p-2.5 text-[11px] text-teal-900 space-y-1">
                            <span className="font-bold">Official Exemption Policy (Yanolja Freshdesk 9000274726):</span>
                            <p className="text-teal-800">
                                Apply VAT, Service Charge & City Tax exemption for diplomatic missions, military personnel, UN agencies, or verified NGOs.
                            </p>
                        </div>

                        <div>
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">
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
                            <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wide mb-1">Scope</label>
                            <div className="flex items-center gap-4 text-xs pt-0.5">
                                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
                                    <input
                                        type="radio"
                                        name="exemptScope"
                                        checked={exemptScope === 'all'}
                                        onChange={() => setExemptScope('all')}
                                        className="text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Entire Folio ({activeCharges.length} items)</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer font-medium">
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
                            <div className="border border-gray-200 rounded-md p-2 max-h-48 overflow-y-auto space-y-1.5 bg-gray-50/50 shadow-2xs">
                                {activeCharges.map((c) => (
                                    <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none text-[11px] hover:text-blue-700">
                                        <input
                                            type="checkbox"
                                            checked={selectedChargeIds.includes(c.id)}
                                            onChange={() => {
                                                setSelectedChargeIds(prev =>
                                                    prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id]
                                                );
                                            }}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                                        />
                                        <span className="font-mono text-gray-500">{c.charge_date}</span>
                                        <span className="font-medium text-gray-800 truncate">{c.revenue_head}</span>
                                        <span className="text-gray-500 font-mono ml-auto">Tax: ৳{Number(c.total_tax || 0).toFixed(2)}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2 flex-shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-1.5 rounded-md border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs cursor-pointer shadow-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-5 py-1.5 rounded-md bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {isSubmitting ? <RefreshCw size={12} className="animate-spin" /> : null}
                            <span>Confirm Tax Exemption</span>
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
