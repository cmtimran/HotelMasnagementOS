import { useState, useMemo, useCallback } from 'react';
import { calculateReservationTaxes, type TaxCalculationResult } from '../utils/taxCalculationEngine';

export interface PaymentRow {
    id: number;
    method: 'Cash' | 'Card' | 'bKash' | 'Nagad' | 'Bank Transfer' | 'Direct Billing' | string;
    amount: number;
    reference?: string;
}

export interface UseReservationBillingOptions {
    roomBaseTotal: number;
    totalAllAddonsCharges?: number;
    taxApplicable?: boolean;
    selectedTaxConfigId?: number | string | null;
    pmsSyncVersion?: number;
    initialDiscountType?: 'Fixed' | 'Percentage';
    initialDiscountValue?: number;
    initialPaymentRows?: PaymentRow[];
}

export function useReservationBilling({
    roomBaseTotal,
    totalAllAddonsCharges = 0,
    taxApplicable = true,
    selectedTaxConfigId,
    pmsSyncVersion = 0,
    initialDiscountType = 'Fixed',
    initialDiscountValue = 0,
    initialPaymentRows
}: UseReservationBillingOptions) {
    // 1. Discount State
    const [discountType, setDiscountType] = useState<'Fixed' | 'Percentage'>(initialDiscountType);
    const [discountValue, setDiscountValue] = useState<number>(initialDiscountValue);

    // 2. Payment Rows State (default: empty [] => amount: 0, click "+ Add New Payment Method" to add tender)
    const [paymentRows, setPaymentRows] = useState<PaymentRow[]>(() => {
        if (initialPaymentRows && initialPaymentRows.length > 0) {
            return initialPaymentRows;
        }
        return [];
    });

    // 3. Gross & Discounted Base Calculations
    const grossTotal = useMemo(() => {
        return Math.max(0, (roomBaseTotal || 0) + (totalAllAddonsCharges || 0));
    }, [roomBaseTotal, totalAllAddonsCharges]);

    const discountedAmount = useMemo(() => {
        if (!discountValue || discountValue <= 0) return 0;
        if (discountType === 'Percentage') {
            return Math.max(0, grossTotal * (discountValue / 100));
        }
        return Math.min(discountValue, grossTotal);
    }, [grossTotal, discountType, discountValue]);

    const netBaseAmount = useMemo(() => {
        return Math.max(0, grossTotal - discountedAmount);
    }, [grossTotal, discountedAmount]);

    // 4. Taxes & Final Payable
    const taxCalculation: TaxCalculationResult = useMemo(() => {
        return calculateReservationTaxes(
            netBaseAmount,
            taxApplicable,
            selectedTaxConfigId ? String(selectedTaxConfigId) : undefined
        );
    }, [netBaseAmount, taxApplicable, selectedTaxConfigId, pmsSyncVersion]);

    const finalPayable = taxCalculation.grandTotal;

    const totalPaid = useMemo(() => {
        return paymentRows.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    }, [paymentRows]);

    const totalDue = useMemo(() => {
        return Math.max(0, Number((finalPayable - totalPaid).toFixed(2)));
    }, [finalPayable, totalPaid]);

    // 5. Payment Row Handlers
    const handleAddPaymentRow = useCallback(() => {
        setPaymentRows(prev => {
            const nextId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
            return [...prev, { id: nextId, method: 'Cash', amount: 0 }];
        });
    }, []);

    const handleRemovePaymentRow = useCallback((id: number) => {
        setPaymentRows(prev => prev.filter(p => p.id !== id));
    }, []);

    const updatePaymentRow = useCallback((id: number, field: keyof PaymentRow, value: any) => {
        setPaymentRows(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    }, []);

    const fillDue = useCallback((rowId: number) => {
        setPaymentRows(prev => {
            const currentTotalPaid = prev.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
            const remaining = Math.max(0, finalPayable - currentTotalPaid);
            return prev.map(p => {
                if (p.id === rowId) {
                    return { ...p, amount: Number(((p.amount || 0) + remaining).toFixed(2)) };
                }
                return p;
            });
        });
    }, [finalPayable]);

    const fill50Percent = useCallback((rowId: number) => {
        setPaymentRows(prev => prev.map(p => {
            if (p.id === rowId) {
                return { ...p, amount: Number((finalPayable * 0.5).toFixed(2)) };
            }
            return p;
        }));
    }, [finalPayable]);

    const applyPresetDiscount = useCallback((pct: number) => {
        setDiscountType('Percentage');
        setDiscountValue(pct);
    }, []);

    const clearDiscount = useCallback(() => {
        setDiscountValue(0);
    }, []);

    const resetBilling = useCallback(() => {
        setDiscountType('Fixed');
        setDiscountValue(0);
        setPaymentRows([]);
    }, []);

    return {
        // States
        discountType,
        setDiscountType,
        discountValue,
        setDiscountValue,
        paymentRows,
        setPaymentRows,

        // Financial figures
        grossTotal,
        discountedAmount,
        netBaseAmount,
        taxCalculation,
        finalPayable,
        totalPaid,
        totalDue,

        // Handlers
        handleAddPaymentRow,
        handleRemovePaymentRow,
        updatePaymentRow,
        fillDue,
        fill50Percent,
        applyPresetDiscount,
        clearDiscount,
        resetBilling
    };
}
