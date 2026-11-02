import React, { useState, useEffect } from 'react';
import { Save, CheckCircle2 } from 'lucide-react';
import { getApiBaseUrl } from '../../../utils/apiUrl';
import type { FolioData } from '../folioTypes';

interface TabBookingDetailsProps {
    folio: FolioData | null;
    onUpdateSuccess: () => void;
}

export const TabBookingDetails: React.FC<TabBookingDetailsProps> = ({
    folio,
    onUpdateSuccess
}) => {
    const [billTo, setBillTo] = useState('');
    const [reservationNo, setReservationNo] = useState('');
    const [gstinNumber, setGstinNumber] = useState('');
    const [marketCode, setMarketCode] = useState('- Select -');
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

    useEffect(() => {
        if (folio) {
            setBillTo(folio.bill_to || folio.guest_name || '');
            setReservationNo(folio.reservation_number || '');
            setGstinNumber(folio.gstin_number || '');
            setMarketCode(folio.market_code || '- Select -');
            setBusinessSource(folio.business_source || 'Direct');
            setBusinessAgent(folio.business_agent || '- Select -');
            setVoucherNo(folio.voucher_no || '');
            setCommissionPlan(folio.commission_plan || '- Select -');
            setPlanValue(String(folio.plan_value || '0.00'));
            setSalesPerson(folio.sales_person || '');

            setSendMail(Boolean(folio.send_mail));
            setCheckoutMail(Boolean(folio.checkout_mail));
            setSuppressRateQr(Boolean(folio.suppress_rate_qr));
            setDisplayInclusionSeparate(Boolean(folio.display_inclusion_separate));
            setGenerateInvoiceOnCheckout(folio.generate_invoice_on_checkout !== undefined ? Boolean(folio.generate_invoice_on_checkout) : true);
            setSaveFeedback('');
        }
    }, [folio]);

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
        <form onSubmit={handleSave} className="w-full space-y-4 select-none text-gray-800 text-xs py-1">
            {/* Status Filter Chips matching Screenshot 6876f3d9.png */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] font-medium border-b border-gray-100">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">All 1</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Reserved 0</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Due Out 0</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Departed 0</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Void 0</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">No Show 0</span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">In house 1</span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">Cancel 0</span>
            </div>

            {saveFeedback && (
                <div className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
                    saveFeedback.startsWith('Error')
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5'
                }`}>
                    {!saveFeedback.startsWith('Error') && <CheckCircle2 size={14} className="text-emerald-600" />}
                    <span>{saveFeedback}</span>
                </div>
            )}

            {/* 2-Column Section: Billing Information vs Source Information */}
            <div className="grid grid-cols-12 gap-8 items-start">
                {/* LEFT: Billing Information matching 6876f3d9.png */}
                <div className="col-span-6 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 tracking-wide pb-1 border-b border-gray-100">
                        Billing Information
                    </h4>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Bill To</label>
                        <input
                            type="text"
                            value={billTo}
                            onChange={(e) => setBillTo(e.target.value)}
                            placeholder="Enter Billing Entity or Guest Name"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-medium"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Reservation No.</label>
                        <input
                            type="text"
                            value={reservationNo}
                            disabled
                            className="w-full bg-gray-50 border border-gray-200 rounded px-2.5 py-1.5 text-xs text-gray-600 font-mono font-bold cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                            GSTIN / Corporate Tax ID (Yanolja Freshdesk 9000275192)
                        </label>
                        <input
                            type="text"
                            value={gstinNumber}
                            onChange={(e) => setGstinNumber(e.target.value)}
                            placeholder="e.g. 27AAAPL1234C1ZV"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                        />
                    </div>
                </div>

                {/* RIGHT: Source Information matching 6876f3d9.png */}
                <div className="col-span-6 space-y-3">
                    <h4 className="text-xs font-bold text-gray-800 tracking-wide pb-1 border-b border-gray-100">
                        Source Information
                    </h4>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Market Code</label>
                            <select
                                value={marketCode}
                                onChange={(e) => setMarketCode(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option>- Select -</option>
                                <option value="LEISURE">Leisure (FIT)</option>
                                <option value="CORP">Corporate Account</option>
                                <option value="OTA_EXP">OTA (Expedia / Booking)</option>
                                <option value="DIRECT_WALK">Direct Walk-In</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Business Source</label>
                            <select
                                value={businessSource}
                                onChange={(e) => setBusinessSource(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-medium"
                            >
                                <option value="Direct">Direct</option>
                                <option value="OTA">OTA Channel</option>
                                <option value="Travel Agent">Travel Agent</option>
                                <option value="Corporate Contract">Corporate Contract</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Business Agent</label>
                            <select
                                value={businessAgent}
                                onChange={(e) => setBusinessAgent(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option>- Select -</option>
                                <option value="Expedia Partner">Expedia Partner</option>
                                <option value="Agoda Direct">Agoda Direct</option>
                                <option value="Local TA Premier">Local TA Premier</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Voucher No.</label>
                            <input
                                type="text"
                                value={voucherNo}
                                onChange={(e) => setVoucherNo(e.target.value)}
                                placeholder="Voucher No."
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Commission Plan</label>
                            <select
                                value={commissionPlan}
                                onChange={(e) => setCommissionPlan(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                            >
                                <option>- Select -</option>
                                <option value="COMM_10">Standard 10% Agency</option>
                                <option value="COMM_15">OTA 15% Net</option>
                                <option value="COMM_FLAT">Flat Fee Plan</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Plan Value</label>
                            <input
                                type="number"
                                step="any"
                                value={planValue}
                                onChange={(e) => setPlanValue(e.target.value)}
                                className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500 font-mono"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-1">Sales Person</label>
                        <input
                            type="text"
                            value={salesPerson}
                            onChange={(e) => setSalesPerson(e.target.value)}
                            placeholder="Sales Person Name"
                            className="w-full bg-white border border-gray-300 rounded px-2.5 py-1.5 text-xs text-gray-800 focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>
            </div>

            {/* Bottom Compliance Checkboxes & Save Button matching 6876f3d9.png */}
            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-700 flex-wrap">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={sendMail}
                            onChange={(e) => setSendMail(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Send Mail</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={checkoutMail}
                            onChange={(e) => setCheckoutMail(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Check Out Mail</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={suppressRateQr}
                            onChange={(e) => setSuppressRateQr(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Suppress Rate or QR Card</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={displayInclusionSeparate}
                            onChange={(e) => setDisplayInclusionSeparate(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Display Inclusion Separately On Folio</span>
                    </label>

                    <label className="flex items-center gap-1.5 cursor-pointer" title="Freshdesk 9000275392: Prevent auto-generating invoice sequence on secondary rooms">
                        <input
                            type="checkbox"
                            checked={generateInvoiceOnCheckout}
                            onChange={(e) => setGenerateInvoiceOnCheckout(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Generate invoice no. on checkout</span>
                    </label>
                </div>

                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-700 font-medium">
                        <input
                            type="checkbox"
                            checked={applyToGroup}
                            onChange={(e) => setApplyToGroup(e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span>Apply To Group</span>
                    </label>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                        <Save size={13} />
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                    </button>
                </div>
            </div>
        </form>
    );
};
