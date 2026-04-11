import { useState } from 'react';
import { X } from 'lucide-react';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (payment: PaymentData) => void;
}

interface PaymentData {
    date: string;
    groupPayment: boolean;
    folio: string;
    recVoucher: string;
    type: string;
    method: string;
    currency: string;
    amount: number;
    comment: string;
}

const AddPaymentModal = ({ isOpen, onClose, onSave }: AddPaymentModalProps) => {
    const [payment, setPayment] = useState<PaymentData>({
        date: '2025-04-16',
        groupPayment: false,
        folio: '4041: Mr. test',
        recVoucher: '',
        type: 'Deposit',
        method: 'Cash',
        currency: 'USD',
        amount: 0,
        comment: ''
    });

    const handleSave = () => {
        onSave(payment);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
                {/* Header - Blue */}
                <div className="bg-blue-600 px-4 py-3 rounded-t-lg flex items-center justify-between">
                    <h2 className="text-white text-lg font-semibold">Add Payment</h2>
                    <button onClick={onClose} className="text-white hover:bg-blue-700 p-1 rounded">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <div className="p-6 space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                        <input
                            type="date"
                            value={payment.date}
                            onChange={(e) => setPayment({ ...payment, date: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        />
                    </div>

                    {/* Group Payment */}
                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={payment.groupPayment}
                            onChange={(e) => setPayment({ ...payment, groupPayment: e.target.checked })}
                            className="w-4 h-4"
                        />
                        <label className="text-sm font-medium text-gray-700">Group Payment</label>
                    </div>

                    {/* Folio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Folio</label>
                        <select
                            value={payment.folio}
                            onChange={(e) => setPayment({ ...payment, folio: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        >
                            <option value="4041: Mr. test">4041: Mr. test</option>
                            <option value="4042: Mrs. test">4042: Mrs. test</option>
                        </select>
                    </div>

                    {/* Rec/Vou # */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Rec/Vou #</label>
                        <input
                            type="text"
                            value={payment.recVoucher}
                            onChange={(e) => setPayment({ ...payment, recVoucher: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            placeholder="Receipt/Voucher Number"
                        />
                    </div>

                    <div className="h-px bg-gray-200"></div>

                    {/* Type and Method */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Type</label>
                            <select
                                value={payment.type}
                                onChange={(e) => setPayment({ ...payment, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="Deposit">Deposit</option>
                                <option value="Payment">Payment</option>
                                <option value="Refund">Refund</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Method</label>
                            <select
                                value={payment.method}
                                onChange={(e) => setPayment({ ...payment, method: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            >
                                <option value="Cash">Cash</option>
                                <option value="Card">Credit Card</option>
                                <option value="Bank">Bank Transfer</option>
                            </select>
                        </div>
                    </div>

                    {/* Currency */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">USD ($)</label>
                        <select
                            value={payment.currency}
                            onChange={(e) => setPayment({ ...payment, currency: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                        >
                            <option value="USD">USD ($)</option>
                            <option value="EUR">EUR (€)</option>
                            <option value="BDT">BDT (৳)</option>
                        </select>
                    </div>

                    {/* Comment */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment</label>
                        <textarea
                            value={payment.comment}
                            onChange={(e) => setPayment({ ...payment, comment: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            rows={3}
                            placeholder="Add payment notes..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 pb-6 flex items-center justify-center">
                    <button
                        onClick={handleSave}
                        className="px-8 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium"
                    >
                        Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPaymentModal;
