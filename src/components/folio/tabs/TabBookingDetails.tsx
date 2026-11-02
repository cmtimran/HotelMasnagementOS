import React, { useState, useEffect, useMemo } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface TabBookingDetailsProps {
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    onUpdateSuccess: () => void;
}

export const TabBookingDetails: React.FC<TabBookingDetailsProps> = ({
    folio,
    booking,
    onUpdateSuccess
}) => {
    const [billTo, setBillTo] = useState('');
    const [reservationNo, setReservationNo] = useState('');
    const [gstinNumber, setGstinNumber] = useState('');
    const [marketCode, setMarketCode] = useState('BAR');
    const [businessSource, setBusinessSource] = useState('Direct');
    const [businessAgent, setBusinessAgent] = useState('- Select -');
    const [voucherNo, setVoucherNo] = useState('');
    const [commissionPlan, setCommissionPlan] = useState('- Select -');
    const [planValue, setPlanValue] = useState('0.00');
    const [salesPerson, setSalesPerson] = useState('');

    // Checkboxes
    const [sendMail, setSendMail] = useState(false);
    const [checkoutMail, setCheckoutMail] = useState(false);
    const [suppressRateQr, setSuppressRateQr] = useState(false);
    const [displayInclusionSeparate, setDisplayInclusionSeparate] = useState(false);
    const [generateInvoiceOnCheckout, setGenerateInvoiceOnCheckout] = useState(true);
    const [applyToGroup, setApplyToGroup] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<string>('');

    // Dynamically calculate status counts and active badge from real booking/folio data
    const statusMetrics = useMemo(() => {
        const rawStatus = (booking?.status || folio?.status || 'CONFIRMED').toUpperCase().replace(/[\s-]/g, '_');
        const roomCount = folio?.rooms?.length || 1;

        const isReserved = rawStatus === 'CONFIRMED' || rawStatus === 'RESERVED' || rawStatus === 'HOLD';
        const isInHouse = rawStatus === 'IN_HOUSE' || rawStatus === 'CHECKED_IN' || rawStatus === 'OPEN';
        const isDueOut = rawStatus === 'DUE_OUT';
        const isDeparted = rawStatus === 'DEPARTED' || rawStatus === 'CHECKED_OUT' || rawStatus === 'SETTLED';
        const isVoid = rawStatus === 'VOID';
        const isNoShow = rawStatus === 'NO_SHOW';
        const isCancel = rawStatus === 'CANCEL' || rawStatus === 'CANCELLED';

        return [
            { label: 'All', count: roomCount, isActive: false, color: 'bg-blue-100 text-blue-800' },
            { label: 'Reserved', count: isReserved ? roomCount : 0, isActive: isReserved, color: 'bg-blue-100 text-blue-800' },
            { label: 'Due Out', count: isDueOut ? roomCount : 0, isActive: isDueOut, color: 'bg-amber-100 text-amber-800' },
            { label: 'Departed', count: isDeparted ? roomCount : 0, isActive: isDeparted, color: 'bg-slate-100 text-slate-800' },
            { label: 'Void', count: isVoid ? roomCount : 0, isActive: isVoid, color: 'bg-rose-100 text-rose-800' },
            { label: 'No Show', count: isNoShow ? roomCount : 0, isActive: isNoShow, color: 'bg-purple-100 text-purple-800' },
            { label: 'In house', count: isInHouse ? roomCount : 0, isActive: isInHouse, color: 'bg-emerald-100 text-emerald-800 font-bold' },
            { label: 'Cancel', count: isCancel ? roomCount : 0, isActive: isCancel, color: 'bg-rose-100 text-rose-800 font-bold' }
        ];
    }, [booking?.status, folio?.status, folio?.rooms?.length]);

    useEffect(() => {
        if (folio || booking) {
            setBillTo(folio?.bill_to || folio?.guest_name || booking?.guestName || '');
            setReservationNo(folio?.reservation_number || booking?.reservationNumber || '');
            setGstinNumber(folio?.gstin_number || '');
            setMarketCode(folio?.market_code || booking?.ratePlan || 'BAR');
            setBusinessSource(folio?.business_source || booking?.source || 'Direct');
            setBusinessAgent(folio?.business_agent || '- Select -');
            setVoucherNo(folio?.voucher_no || '');
            setCommissionPlan(folio?.commission_plan || '- Select -');
            setPlanValue(String(folio?.plan_value || '0.00'));
            setSalesPerson(folio?.sales_person || '');

            setSendMail(Boolean(folio?.send_mail));
            setCheckoutMail(Boolean(folio?.checkout_mail));
            setSuppressRateQr(Boolean(folio?.suppress_rate_qr));
            setDisplayInclusionSeparate(Boolean(folio?.display_inclusion_separate));
            setGenerateInvoiceOnCheckout(folio?.generate_invoice_on_checkout !== undefined ? Boolean(folio.generate_invoice_on_checkout) : true);
            setSaveFeedback('');
        }
    }, [folio, booking]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!folio?.id) return;

        setIsSaving(true);
        setSaveFeedback('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/accounting/folios/${folio.id}/booking-details`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    billTo,
                    gstinNumber,
                    marketCode: marketCode === '- Select -' ? null : marketCode,
                    businessSource,
                    businessAgent: businessAgent === '- Select -' ? null : businessAgent,
                    voucherNo,
                    commissionPlan: commissionPlan === '- Select -' ? null : commissionPlan,
                    planValue: parseFloat(planValue) || 0,
                    salesPerson,
                    sendMail,
                    checkoutMail,
                    suppressRateQr,
                    displayInclusionSeparate,
                    generateInvoiceOnCheckout,
                    applyToGroup,
                    userName: 'Front Desk'
                })
            });

            const data = await res.json();
            if (data?.success) {
                setSaveFeedback('Booking and billing information saved successfully!');
                onUpdateSuccess();
                setTimeout(() => setSaveFeedback(''), 4000);
            } else {
                setSaveFeedback(`Error: ${data?.error || 'Failed to save'}`);
            }
        } catch (err: any) {
            setSaveFeedback(`Error: ${err?.message || 'Network error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSave} className="w-full flex flex-col justify-between h-full select-none text-gray-800 text-xs py-1 space-y-2.5">
            {/* Dynamic Status Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 text-[11px] font-medium border-b border-gray-100 flex-shrink-0">
                {statusMetrics.map((chip) => {
                    const isSelected = chip.isActive || (chip.label === 'All' && !statusMetrics.some(c => c.label !== 'All' && c.isActive));
                    return (
                        <span
                            key={chip.label}
                            className={`px-2.5 py-0.5 rounded-full transition-colors flex-shrink-0 text-xs ${
                                isSelected
                                    ? chip.color + ' font-bold ring-1 ring-inset ring-current/20'
                                    : 'bg-gray-100 text-gray-600'
                            }`}
                        >
                            {chip.label} {chip.count}
                        </span>
                    );
                })}
            </div>

            {saveFeedback && (
                <div className={`px-3 py-1 rounded-md text-xs font-semibold ${
                    saveFeedback.startsWith('Error')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5'
                }`}>
                    {!saveFeedback.startsWith('Error') && <CheckCircle2 size={13} className="text-emerald-600" />}
                    <span>{saveFeedback}</span>
                </div>
            )}

            {/* 2-Column Section: Compact Billing Information vs Source Information */}
            <div className="grid grid-cols-12 gap-5 items-start flex-1 min-h-0 overflow-y-auto pr-1">
                {/* LEFT: Billing Information */}
                <div className="col-span-6 space-y-2">
                    <h4 className="text-[11.5px] font-bold text-gray-800 tracking-wide pb-1 border-b border-gray-100 uppercase">
                        Billing Information
                    </h4>

                    <div>
                        <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Bill To</label>
                        <input
                            type="text"
                            value={billTo}
                            onChange={(e) => setBillTo(e.target.value)}
                            placeholder="Enter Billing Entity or Guest Name"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Reservation No.</label>
                        <input
                            type="text"
                            value={reservationNo}
                            disabled
                            className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1 text-xs text-gray-600 font-mono font-bold cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">
                            Guest GSTIN / Corporate Tax ID
                        </label>
                        <input
                            type="text"
                            value={gstinNumber}
                            onChange={(e) => setGstinNumber(e.target.value)}
                            placeholder="e.g. 27AAAPL1234C1ZV"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                    </div>
                </div>

                {/* RIGHT: Source Information */}
                <div className="col-span-6 space-y-2">
                    <h4 className="text-[11.5px] font-bold text-gray-800 tracking-wide pb-1 border-b border-gray-100 uppercase">
                        Source Information
                    </h4>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Market Code</label>
                            <select
                                value={marketCode}
                                onChange={(e) => setMarketCode(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                                <option value="BAR">BAR (Best Available Rate)</option>
                                <option value="WRP">WRP (Winter Rate Plan)</option>
                                <option value="LEISURE">Leisure (FIT)</option>
                                <option value="CORP">Corporate Account</option>
                                <option value="OTA_EXP">OTA (Expedia / Booking)</option>
                                <option value="DIRECT_WALK">Direct Walk-In</option>
                                {marketCode && !['BAR', 'WRP', 'LEISURE', 'CORP', 'OTA_EXP', 'DIRECT_WALK', '- Select -'].includes(marketCode) && (
                                    <option value={marketCode}>{marketCode}</option>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Business Source</label>
                            <select
                                value={businessSource}
                                onChange={(e) => setBusinessSource(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                                <option value="Direct">Direct</option>
                                <option value="OTA">OTA Channel</option>
                                <option value="Travel Agent">Travel Agent</option>
                                <option value="Corporate Contract">Corporate Contract</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Business Agent</label>
                            <select
                                value={businessAgent}
                                onChange={(e) => setBusinessAgent(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option>- Select -</option>
                                <option value="Expedia Partner">Expedia Partner</option>
                                <option value="Agoda Direct">Agoda Direct</option>
                                <option value="Local TA Premier">Local TA Premier</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Voucher No.</label>
                            <input
                                type="text"
                                value={voucherNo}
                                onChange={(e) => setVoucherNo(e.target.value)}
                                placeholder="Voucher No."
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Commission Plan</label>
                            <select
                                value={commissionPlan}
                                onChange={(e) => setCommissionPlan(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option>- Select -</option>
                                <option value="COMM_10">Standard 10% Agency</option>
                                <option value="COMM_15">OTA 15% Net</option>
                                <option value="COMM_FLAT">Flat Fee Plan</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Plan Value</label>
                            <input
                                type="number"
                                step="any"
                                value={planValue}
                                onChange={(e) => setPlanValue(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10.5px] font-semibold text-gray-600 mb-0.5">Sales Person</label>
                        <input
                            type="text"
                            value={salesPerson}
                            onChange={(e) => setSalesPerson(e.target.value)}
                            placeholder="Sales Person Name"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Compliance Checkboxes & Save Button: Compact Clean Footer */}
            <div className="pt-2.5 border-t border-gray-200 flex items-center justify-between gap-4 bg-white flex-shrink-0">
                <div className="flex items-center gap-3.5 text-[11px] text-gray-700 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 select-none">
                        <input
                            type="checkbox"
                            checked={sendMail}
                            onChange={(e) => setSendMail(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Send Mail</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 select-none">
                        <input
                            type="checkbox"
                            checked={checkoutMail}
                            onChange={(e) => setCheckoutMail(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Check Out Mail</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 select-none">
                        <input
                            type="checkbox"
                            checked={suppressRateQr}
                            onChange={(e) => setSuppressRateQr(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Suppress Rate or QR Card</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 select-none">
                        <input
                            type="checkbox"
                            checked={displayInclusionSeparate}
                            onChange={(e) => setDisplayInclusionSeparate(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Display Inclusion Separately On Folio</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-gray-900 select-none" title="Prevent auto-generating invoice sequence on secondary rooms">
                        <input
                            type="checkbox"
                            checked={generateInvoiceOnCheckout}
                            onChange={(e) => setGenerateInvoiceOnCheckout(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Generate invoice no. on checkout</span>
                    </label>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 font-semibold hover:text-gray-900 select-none whitespace-nowrap">
                        <input
                            type="checkbox"
                            checked={applyToGroup}
                            onChange={(e) => setApplyToGroup(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Apply To Group</span>
                    </label>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                    >
                        <Save size={13} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};
