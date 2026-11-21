import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Send, AlertCircle, FileText } from 'lucide-react';
import { useActiveCurrency } from '../../../utils/currencyUtils';
import type { FolioData } from '../folioTypes';
import type { AmendBookingData } from '../../modals/AmendStayModal';

interface EmailFolioModalProps {
    isOpen: boolean;
    onClose: () => void;
    folio: FolioData | null;
    booking?: AmendBookingData | null;
    onSuccess?: (msg: string) => void;
}

export const EmailFolioModal: React.FC<EmailFolioModalProps> = ({
    isOpen,
    onClose,
    folio,
    booking,
    onSuccess
}) => {
    const { currencySymbol } = useActiveCurrency();
    const guestEmail = folio?.guest_email || booking?.email || '';
    const guestName = folio?.guest_name || booking?.guestName || 'Valued Guest';
    const folioNo = folio?.folio_number || 'FOL-DEFAULT';

    const [recipientEmail, setRecipientEmail] = useState(guestEmail);
    const [ccEmail, setCcEmail] = useState('');
    const [subject, setSubject] = useState(`Official Folio Invoice #${folioNo} - Grand Palace Hotel & Resort`);
    const [includePdfAttachment, setIncludePdfAttachment] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    if (!isOpen || !folio) return null;

    const totalCharges = folio.charges.reduce((s, c) => s + (Number(c.total_amount) || Number(c.amount) || 0), 0);
    const totalPayments = folio.payments ? folio.payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) : 0;
    const balanceDue = Math.max(0, totalCharges - totalPayments);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientEmail || !recipientEmail.includes('@')) {
            setErrorMsg('Please enter a valid guest email address');
            return;
        }

        setIsSending(true);
        setErrorMsg('');

        try {
            // Simulate / dispatch email delivery via notification gateway
            await new Promise(r => setTimeout(r, 650));

            if (onSuccess) {
                onSuccess(`Folio invoice #${folioNo} successfully emailed to ${recipientEmail}!`);
            }
            onClose();
        } catch (err: any) {
            setErrorMsg(err?.message || 'Failed to dispatch email');
        } finally {
            setIsSending(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100012] bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden text-slate-800 font-sans animate-in zoom-in-95 duration-150">
                {/* Header */}
                <div className="bg-[#1e3a8a] text-white px-5 py-3.5 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200 border border-white/15">
                            <Mail size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wide">
                                Email Folio Tax Invoice
                            </h3>
                            <p className="text-[10px] text-blue-200 font-mono">
                                Folio: <span className="text-amber-300 font-bold">{folioNo}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-7 h-7 rounded-lg hover:bg-white/10 text-white/80 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSend} className="p-5 space-y-4 text-xs">
                    {errorMsg && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3 py-2 rounded-lg flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0 text-rose-600" />
                            <span>{errorMsg}</span>
                        </div>
                    )}

                    {/* Financial Badge Preview */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-[11px] font-mono">
                        <div>
                            <span className="text-slate-400 text-[9px] block uppercase font-bold font-sans">Guest</span>
                            <span className="font-bold text-slate-900">{guestName}</span>
                        </div>
                        <div className="text-right">
                            <span className="text-slate-400 text-[9px] block uppercase font-bold font-sans">Folio Balance</span>
                            <span className={`font-bold ${balanceDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {currencySymbol} {balanceDue.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Recipient Email Address *
                        </label>
                        <input
                            type="email"
                            required
                            value={recipientEmail}
                            onChange={(e) => setRecipientEmail(e.target.value)}
                            placeholder="guest@example.com"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                            CC (Corporate Booker / Travel Agent) <span className="text-slate-400 font-normal lowercase">(optional)</span>
                        </label>
                        <input
                            type="email"
                            value={ccEmail}
                            onChange={(e) => setCcEmail(e.target.value)}
                            placeholder="accounts@company.com"
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                    </div>

                    <div>
                        <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1">
                            Subject
                        </label>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                        />
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium pt-1">
                        <input
                            type="checkbox"
                            checked={includePdfAttachment}
                            onChange={(e) => setIncludePdfAttachment(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                        />
                        <span className="flex items-center gap-1.5">
                            <FileText size={13} className="text-blue-600" />
                            <span>Attach printable PDF Tax Invoice & Ledger</span>
                        </span>
                    </label>

                    {/* Action Footer */}
                    <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending}
                            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 shadow-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-50"
                        >
                            <Send size={13} />
                            <span>{isSending ? 'Sending Folio...' : 'Send Folio Invoice'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
