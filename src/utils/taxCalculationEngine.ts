/**
 * HotelManagementOS - Central Tax & VAT Calculation Engine
 * 
 * Synchronized with: http://localhost:5173/taxes-vat (TaxVatManagement)
 * Evaluates multi-tier tax masters, compound execution orders, 
 * running subtotal vs original gross bases, and inclusive/exclusive rules.
 */

export interface TaxMaster {
    id: string;
    code: string;
    name: string;
    category: 'VAT' | 'TAX' | 'SERVICE_CHARGE';
    rate: number;
    section?: string;
    serviceCode?: string;
    status: 'Active' | 'Inactive';
    remarks?: string;
}

export interface TaxConfigLine {
    id?: string;
    taxMasterId: string;
    taxMaster?: TaxMaster;
    executionOrder: number;
    calculationBasis: 'ORIGINAL_GROSS' | 'RUNNING_SUBTOTAL';
    isInclusive?: boolean;
}

export interface TaxConfiguration {
    id: string;
    code: string;
    name: string;
    module: string;
    startDate?: string;
    endDate?: string;
    status: 'Active' | 'Inactive';
    remarks?: string;
    lines: TaxConfigLine[];
}

export interface TaxItemBreakdown {
    step: number;
    name: string;
    code: string;
    category: 'VAT' | 'TAX' | 'SERVICE_CHARGE';
    rate: number;
    basis: number;
    amount: number;
    basisText: string;
    formula: string;
}

export interface TaxCalculationResult {
    baseAmount: number;
    isTaxApplicable: boolean;
    configId: string;
    configName: string;
    configCode: string;
    breakdown: TaxItemBreakdown[];
    serviceChargeAmount: number;
    vatAmount: number;
    otherTaxesAmount: number;
    totalTaxAmount: number;
    grandTotal: number;
}

const STORAGE_KEY = 'hotel_taxes_vat_v1';

// Default Fallback Masters (0% Fallback - Clean Multi-Tenant Standard)
export const DEFAULT_TAX_MASTERS: TaxMaster[] = [
    {
        id: 'tm-001',
        code: 'VAT-0',
        name: 'Standard VAT 0%',
        category: 'VAT',
        rate: 0.0,
        section: 'Statutory VAT (Configurable in Settings)',
        serviceCode: 'S001.10 - Hotel Accommodation',
        status: 'Active',
        remarks: 'Zero default tax until configured in Hotel Settings.',
    },
    {
        id: 'tm-002',
        code: 'SC-0',
        name: 'Hotel Service Charge 0%',
        category: 'SERVICE_CHARGE',
        rate: 0.0,
        section: 'Staff Welfare Pool',
        serviceCode: 'SC-HOTEL',
        status: 'Active',
        remarks: 'Zero default service charge until configured in Hotel Settings.',
    },
    {
        id: 'tm-003',
        code: 'CITY-0',
        name: 'City Tourism Development Levy 0%',
        category: 'TAX',
        rate: 0.0,
        section: 'Municipal Ordinance',
        serviceCode: 'TX-CITY',
        status: 'Active',
        remarks: 'Zero default city tax until configured in Hotel Settings.',
    }
];

// Default Fallback Configurations
export const DEFAULT_TAX_CONFIGURATIONS: TaxConfiguration[] = [
    {
        id: 'tc-000',
        code: 'TAX-ZERO',
        name: 'Standard Baseline (0% SC + 0% VAT + 0% City = 0%)',
        module: 'All Hotel Operations',
        status: 'Active',
        remarks: 'Default tax-free configuration until property configures live rates in Tax & VAT settings.',
        lines: [
            {
                taxMasterId: 'tm-002',
                executionOrder: 1,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-001',
                executionOrder: 2,
                calculationBasis: 'RUNNING_SUBTOTAL',
                isInclusive: false,
            },
            {
                taxMasterId: 'tm-003',
                executionOrder: 3,
                calculationBasis: 'ORIGINAL_GROSS',
                isInclusive: false,
            },
        ],
    }
];

/**
 * Retrieve all registered Tax Masters from TaxVatManagement storage
 */
export function getTaxMasters(): TaxMaster[] {
    if (typeof window === 'undefined') return DEFAULT_TAX_MASTERS;
    try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_masters`);
        return saved ? JSON.parse(saved) : DEFAULT_TAX_MASTERS;
    } catch {
        return DEFAULT_TAX_MASTERS;
    }
}

/**
 * Retrieve all registered Tax Configurations from TaxVatManagement storage
 */
export function getTaxConfigurations(): TaxConfiguration[] {
    if (typeof window === 'undefined') return DEFAULT_TAX_CONFIGURATIONS;
    try {
        const saved = localStorage.getItem(`${STORAGE_KEY}_configs`);
        return saved ? JSON.parse(saved) : DEFAULT_TAX_CONFIGURATIONS;
    } catch {
        return DEFAULT_TAX_CONFIGURATIONS;
    }
}

/**
 * Retrieve the active Tax Policy (e.g. HOSP-STD)
 */
export function getActiveTaxConfiguration(targetConfigId?: string): TaxConfiguration {
    const configs = getTaxConfigurations();
    if (targetConfigId) {
        const found = configs.find(c => c.id === targetConfigId && c.status === 'Active');
        if (found) return found;
    }
    // Default to active policy matching 'All Hotel Operations' or 'Rooms' or first active
    const active = configs.find(c => c.status === 'Active' && (c.module?.includes('All') || c.module?.includes('Room')))
        || configs.find(c => c.status === 'Active')
        || DEFAULT_TAX_CONFIGURATIONS[0];
    return active;
}

/**
 * Main Calculation Engine:
 * Computes multi-tier compound or gross taxes line-by-line according to official Bangladesh VAT Act and Hotel Policy
 * 
 * @param baseAmount Net room tariff + Add-on charges (after discount)
 * @param isTaxApplicable Whether taxes apply (e.g. tax-exempt guest)
 * @param configId Specific tax policy ID (optional, defaults to active)
 */
export function calculateReservationTaxes(
    baseAmount: number,
    isTaxApplicable: boolean = true,
    configId?: string
): TaxCalculationResult {
    const safeBase = Math.max(0, Number(baseAmount) || 0);

    if (!isTaxApplicable || safeBase <= 0) {
        return {
            baseAmount: safeBase,
            isTaxApplicable: false,
            configId: 'EXEMPT',
            configName: 'Tax Exempt / Non-Taxable',
            configCode: 'TAX-EXEMPT',
            breakdown: [],
            serviceChargeAmount: 0,
            vatAmount: 0,
            otherTaxesAmount: 0,
            totalTaxAmount: 0,
            grandTotal: safeBase,
        };
    }

    const config = getActiveTaxConfiguration(configId);
    const masters = getTaxMasters();

    const sortedLines = [...(config.lines || [])].sort((a, b) => a.executionOrder - b.executionOrder);

    let runningSubtotal = safeBase;
    let serviceChargeAmount = 0;
    let vatAmount = 0;
    let otherTaxesAmount = 0;

    const breakdown: TaxItemBreakdown[] = sortedLines.map((line, idx) => {
        const master = masters.find(m => m.id === line.taxMasterId);
        const rate = master ? Number(master.rate) || 0 : 0;
        const basis = line.calculationBasis === 'RUNNING_SUBTOTAL' ? runningSubtotal : safeBase;
        const amount = Math.round(((basis * rate) / 100) * 100) / 100;

        runningSubtotal += amount;

        if (master?.category === 'SERVICE_CHARGE' || master?.code?.startsWith('SC')) {
            serviceChargeAmount += amount;
        } else if (master?.category === 'VAT' || master?.code?.startsWith('VAT')) {
            vatAmount += amount;
        } else {
            otherTaxesAmount += amount;
        }

        const basisText = line.calculationBasis === 'RUNNING_SUBTOTAL' ? 'Running Subtotal' : 'Base Tariff';
        const formula = `${master?.name || 'Tax'} = ${rate}% × ৳${basis.toFixed(2)} (${basisText}) = ৳${amount.toFixed(2)}`;

        return {
            step: idx + 1,
            name: master?.name || `Tax Step ${idx + 1}`,
            code: master?.code || 'TAX',
            category: master?.category || 'TAX',
            rate,
            basis,
            amount,
            basisText,
            formula,
        };
    });

    const totalTaxAmount = Math.round((serviceChargeAmount + vatAmount + otherTaxesAmount) * 100) / 100;
    const grandTotal = Math.round((safeBase + totalTaxAmount) * 100) / 100;

    return {
        baseAmount: safeBase,
        isTaxApplicable: true,
        configId: config.id,
        configName: config.name,
        configCode: config.code,
        breakdown,
        serviceChargeAmount,
        vatAmount,
        otherTaxesAmount,
        totalTaxAmount,
        grandTotal,
    };
}

/**
 * Retrieve resolved statutory/configured tax rates for a specific module or configuration ID.
 * Accurately extracts VAT %, Service Charge %, and City Tax % directly from Tax & VAT Settings.
 */
export function getTaxRatesForModule(targetConfigId?: string): {
    vatRate: number;
    serviceChargeRate: number;
    cityTaxRate: number;
    configId: string;
    configName: string;
    configCode: string;
} {
    const masters = getTaxMasters();
    const configs = getTaxConfigurations();

    let config = targetConfigId ? configs.find(c => c.id === targetConfigId && c.status === 'Active') : null;
    if (!config) {
        config = configs.find(c => c.status === 'Active' && (c.module?.toLowerCase().includes('dining') || c.module?.toLowerCase().includes('restaurant') || c.module?.toLowerCase().includes('f&b') || c.module?.toLowerCase().includes('pos')))
            || configs.find(c => c.status === 'Active' && c.module?.toLowerCase().includes('all'))
            || configs.find(c => c.status === 'Active')
            || configs[0]
            || DEFAULT_TAX_CONFIGURATIONS[0];
    }

    let vatRate = 0;
    let serviceChargeRate = 0;
    let cityTaxRate = 0;

    if (config && config.lines && config.lines.length > 0) {
        for (const line of config.lines) {
            const master = masters.find(m => m.id === line.taxMasterId);
            if (master && master.status === 'Active') {
                const rate = Number(master.rate || 0);
                if (master.category === 'VAT') {
                    vatRate += rate;
                } else if (master.category === 'SERVICE_CHARGE') {
                    serviceChargeRate += rate;
                } else if (master.category === 'TAX') {
                    cityTaxRate += rate;
                }
            }
        }
    } else {
        const vatMaster = masters.find(m => m.category === 'VAT' && m.status === 'Active');
        if (vatMaster) vatRate = Number(vatMaster.rate || 0);
        const scMaster = masters.find(m => m.category === 'SERVICE_CHARGE' && m.status === 'Active');
        if (scMaster) serviceChargeRate = Number(scMaster.rate || 0);
        const cityMaster = masters.find(m => m.category === 'TAX' && m.status === 'Active');
        if (cityMaster) cityTaxRate = Number(cityMaster.rate || 0);
    }

    return {
        vatRate: Math.round(vatRate * 100) / 100,
        serviceChargeRate: Math.round(serviceChargeRate * 100) / 100,
        cityTaxRate: Math.round(cityTaxRate * 100) / 100,
        configId: config?.id || 'DEFAULT',
        configName: config?.name || 'Default Tax Policy',
        configCode: config?.code || 'DEFAULT'
    };
}
