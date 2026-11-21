import React, { useState, useEffect } from 'react';
import {
    X, Store, Clock, Percent, ShieldCheck,
    Building2, Sparkles, Dumbbell, ShoppingBag, Calendar,
    Sliders, CreditCard, Tag, Maximize2, Users
} from 'lucide-react';
import type { Outlet } from './OutletSelector';
import { getTaxConfigurations, getTaxRatesForModule, type TaxConfiguration } from '../../../utils/taxCalculationEngine';

export type DepartmentCategory =
    | 'FOOD_BEVERAGE'
    | 'BANQUET_EVENTS'
    | 'FRONT_OFFICE'
    | 'SPA_WELLNESS'
    | 'FITNESS_RECREATION'
    | 'RETAIL_SHOP'
    | 'ENTERTAINMENT'
    | 'OTHER_SERVICES';

export type CatalogType =
    | 'RESTAURANT_MENU'
    | 'BANQUET_PACKAGES'
    | 'SPA_SERVICES'
    | 'RETAIL_PRODUCTS'
    | 'MEMBERSHIP_PASS';

interface OutletModalProps {
    isOpen: boolean;
    onClose: () => void;
    outlet?: Outlet | null;
    propertyId?: string | number;
    onSaved: () => void;
}

export const OutletModal: React.FC<OutletModalProps> = ({
    isOpen,
    onClose,
    outlet,
    propertyId,
    onSaved
}) => {
    const [activeTab, setActiveTab] = useState<'profile' | 'venue' | 'operations' | 'hours' | 'financials' | 'payments'>('profile');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Profile & Department fields
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [departmentCategory, setDepartmentCategory] = useState<DepartmentCategory>('FOOD_BEVERAGE');
    const [outletType, setOutletType] = useState('DINE_IN_RESTAURANT');
    const [catalogType, setCatalogType] = useState<CatalogType>('RESTAURANT_MENU');
    const [physicalLocation, setPhysicalLocation] = useState('');
    const [description, setDescription] = useState('');

    // Banquet & Venue Capacity fields
    const [lengthFeet, setLengthFeet] = useState<number>(0);
    const [widthFeet, setWidthFeet] = useState<number>(0);
    const [heightFeet, setHeightFeet] = useState<number>(0);
    const [totalSqFt, setTotalSqFt] = useState<number>(0);
    const [carpetAreaSqFt, setCarpetAreaSqFt] = useState<number>(0);

    const [capacityTheatre, setCapacityTheatre] = useState<number>(0);
    const [capacityClassroom, setCapacityClassroom] = useState<number>(0);
    const [capacityBanquet, setCapacityBanquet] = useState<number>(0);
    const [capacityUShape, setCapacityUShape] = useState<number>(0);
    const [capacityCocktail, setCapacityCocktail] = useState<number>(0);
    const [capacityBoardroom, setCapacityBoardroom] = useState<number>(0);

    const [hourlyRate, setHourlyRate] = useState<number>(0);
    const [halfDayRate, setHalfDayRate] = useState<number>(0);
    const [fullDayRate, setFullDayRate] = useState<number>(0);
    const [eveningRate, setEveningRate] = useState<number>(0);
    const [cleaningFee, setCleaningFee] = useState<number>(0);

    // Operational Rules
    const [requiresTable, setRequiresTable] = useState(true);
    const [allowRoomCharge, setAllowRoomCharge] = useState(true);
    const [autoGenerateKot, setAutoGenerateKot] = useState(true);
    const [allowsBarcodeScan, setAllowsBarcodeScan] = useState(false);
    const [requiresAppointment, setRequiresAppointment] = useState(false);

    // Operating Hours
    const [openTime, setOpenTime] = useState('07:00');
    const [closeTime, setCloseTime] = useState('23:30');
    const [is24Hours, setIs24Hours] = useState(false);

    // Financials & Tax
    const [taxConfigurations, setTaxConfigurations] = useState<TaxConfiguration[]>([]);
    const [selectedTaxConfigId, setSelectedTaxConfigId] = useState<string>('');
    const [isCustomTaxOverride, setIsCustomTaxOverride] = useState<boolean>(false);
    const [vatRate, setVatRate] = useState(0.00);
    const [serviceChargeRate, setServiceChargeRate] = useState(0.00);
    const [cityTaxRate, setCityTaxRate] = useState(0.00);
    const [revenueHeadCode, setRevenueHeadCode] = useState('10020-01');

    // Payment Tenders & Receipt Slip
    const [acceptedPaymentMethods, setAcceptedPaymentMethods] = useState<string[]>([
        'Cash', 'Card', 'Room-Charge'
    ]);
    const [receiptHeader, setReceiptHeader] = useState('');
    const [receiptFooter, setReceiptFooter] = useState('Thank you for your business!');
    const [binNumber, setBinNumber] = useState('');

    useEffect(() => {
        const availableConfigs = getTaxConfigurations();
        setTaxConfigurations(availableConfigs);

        if (outlet) {
            const raw = outlet as any;
            setName(raw.name || '');
            setCode(raw.code || '');
            setDepartmentCategory(raw.department_category || 'FOOD_BEVERAGE');
            setOutletType(raw.outlet_type || 'DINE_IN_RESTAURANT');
            setCatalogType(raw.catalog_type || 'RESTAURANT_MENU');
            setPhysicalLocation(raw.physical_location || '');
            setDescription(raw.description || '');

            // Venue
            const dims = raw.venue_dimensions || {};
            setLengthFeet(Number(dims.lengthFeet || 0));
            setWidthFeet(Number(dims.widthFeet || 0));
            setHeightFeet(Number(dims.heightFeet || 0));
            setTotalSqFt(Number(dims.totalSqFt || 0));
            setCarpetAreaSqFt(Number(dims.carpetAreaSqFt || 0));

            const caps = raw.seating_capacities || {};
            setCapacityTheatre(Number(caps.theatre || 0));
            setCapacityClassroom(Number(caps.classroom || 0));
            setCapacityBanquet(Number(caps.banquet || 0));
            setCapacityUShape(Number(caps.ushape || 0));
            setCapacityCocktail(Number(caps.cocktail || 0));
            setCapacityBoardroom(Number(caps.boardroom || 0));

            const tariffs = raw.rental_tariffs || {};
            setHourlyRate(Number(tariffs.hourlyRate || 0));
            setHalfDayRate(Number(tariffs.halfDayRate || 0));
            setFullDayRate(Number(tariffs.fullDayRate || 0));
            setEveningRate(Number(tariffs.eveningRate || 0));
            setCleaningFee(Number(tariffs.cleaningFee || 0));

            // Operations
            setRequiresTable(raw.requires_table ?? true);
            setAllowRoomCharge(raw.allow_room_charge ?? true);
            setAutoGenerateKot(raw.auto_generate_kot ?? true);
            setAllowsBarcodeScan(Boolean(raw.allows_barcode_scan));
            setRequiresAppointment(Boolean(raw.requires_appointment));

            // Hours
            const hours = raw.operating_hours || {};
            setOpenTime(hours.open || '07:00');
            setCloseTime(hours.close || '23:30');
            setIs24Hours(hours.is24Hours || false);

            // Taxes
            const savedConfigId = raw.tax_configuration_id || '';
            setSelectedTaxConfigId(savedConfigId);
            setIsCustomTaxOverride(!savedConfigId);
            setVatRate(Number(raw.vat_rate ?? 0));
            setServiceChargeRate(Number(raw.service_charge_rate ?? 0));
            setCityTaxRate(Number(raw.city_tax_rate ?? 0));
            setRevenueHeadCode(raw.revenue_head_code || '10020-01');

            // Payments & Slip
            const methods = Array.isArray(raw.accepted_payment_methods)
                ? raw.accepted_payment_methods
                : ['Cash', 'Card', 'Room-Charge'];
            setAcceptedPaymentMethods(methods);
            setReceiptHeader(raw.receipt_header || '');
            setReceiptFooter(raw.receipt_footer || 'Thank you for your business!');
            setBinNumber(raw.bin_number || '');
        } else {
            setName('');
            setCode('');
            setDepartmentCategory('FOOD_BEVERAGE');
            setOutletType('DINE_IN_RESTAURANT');
            setCatalogType('RESTAURANT_MENU');
            setPhysicalLocation('');
            setDescription('');

            setLengthFeet(0);
            setWidthFeet(0);
            setHeightFeet(0);
            setTotalSqFt(0);
            setCarpetAreaSqFt(0);

            setCapacityTheatre(0);
            setCapacityClassroom(0);
            setCapacityBanquet(0);
            setCapacityUShape(0);
            setCapacityCocktail(0);
            setCapacityBoardroom(0);

            setHourlyRate(0);
            setHalfDayRate(0);
            setFullDayRate(0);
            setEveningRate(0);
            setCleaningFee(0);

            setRequiresTable(true);
            setAllowRoomCharge(true);
            setAutoGenerateKot(true);
            setAllowsBarcodeScan(false);
            setRequiresAppointment(false);

            setOpenTime('07:00');
            setCloseTime('23:30');
            setIs24Hours(false);

            const defaultTax = getTaxRatesForModule();
            setSelectedTaxConfigId(defaultTax.configId);
            setIsCustomTaxOverride(false);
            setVatRate(defaultTax.vatRate);
            setServiceChargeRate(defaultTax.serviceChargeRate);
            setCityTaxRate(defaultTax.cityTaxRate);

            setRevenueHeadCode('10020-01');
            setAcceptedPaymentMethods(['Cash', 'Card', 'Room-Charge', 'bKash', 'Nagad']);
            setReceiptHeader('');
            setReceiptFooter('Thank you for your business! Please come again.');
            setBinNumber('');
        }
        setError(null);
        setActiveTab('profile');
    }, [outlet, isOpen]);

    // Handle Department Smart Default Switching
    const handleDepartmentChange = (dept: DepartmentCategory) => {
        setDepartmentCategory(dept);
        switch (dept) {
            case 'BANQUET_EVENTS':
                setOutletType('BANQUET_HALL');
                setCatalogType('BANQUET_PACKAGES');
                setRevenueHeadCode('10050-01');
                setRequiresTable(true);
                setAutoGenerateKot(true);
                setAllowsBarcodeScan(false);
                setRequiresAppointment(false);
                break;
            case 'SPA_WELLNESS':
                setOutletType('SPA_AYURVEDA');
                setCatalogType('SPA_SERVICES');
                setRevenueHeadCode('10030-01');
                setRequiresTable(false);
                setAutoGenerateKot(false);
                setAllowsBarcodeScan(false);
                setRequiresAppointment(true);
                break;
            case 'RETAIL_SHOP':
                setOutletType('GIFT_SHOP');
                setCatalogType('RETAIL_PRODUCTS');
                setRevenueHeadCode('10040-01');
                setRequiresTable(false);
                setAutoGenerateKot(false);
                setAllowsBarcodeScan(true);
                setRequiresAppointment(false);
                break;
            case 'FITNESS_RECREATION':
                setOutletType('FITNESS_GYM');
                setCatalogType('MEMBERSHIP_PASS');
                setRevenueHeadCode('10030-02');
                setRequiresTable(false);
                setAutoGenerateKot(false);
                setAllowsBarcodeScan(true);
                setRequiresAppointment(false);
                break;
            case 'FRONT_OFFICE':
                setOutletType('FRONT_DESK_MINI_POS');
                setCatalogType('RETAIL_PRODUCTS');
                setRevenueHeadCode('10010-02');
                setRequiresTable(false);
                setAutoGenerateKot(false);
                setAllowsBarcodeScan(true);
                setRequiresAppointment(false);
                break;
            case 'ENTERTAINMENT':
                setOutletType('KARAOKE_LOUNGE');
                setCatalogType('RESTAURANT_MENU');
                setRevenueHeadCode('10060-01');
                setRequiresTable(true);
                setAutoGenerateKot(true);
                setAllowsBarcodeScan(false);
                setRequiresAppointment(false);
                break;
            case 'FOOD_BEVERAGE':
            default:
                setOutletType('DINE_IN_RESTAURANT');
                setCatalogType('RESTAURANT_MENU');
                setRevenueHeadCode('10020-01');
                setRequiresTable(true);
                setAutoGenerateKot(true);
                setAllowsBarcodeScan(false);
                setRequiresAppointment(false);
                break;
        }
    };

    const handleTaxConfigChange = (configId: string) => {
        setSelectedTaxConfigId(configId);
        if (configId === 'MANUAL_OVERRIDE') {
            setIsCustomTaxOverride(true);
        } else {
            setIsCustomTaxOverride(false);
            const resolved = getTaxRatesForModule(configId);
            setVatRate(resolved.vatRate);
            setServiceChargeRate(resolved.serviceChargeRate);
            setCityTaxRate(resolved.cityTaxRate);
        }
    };

    const togglePaymentMethod = (method: string) => {
        setAcceptedPaymentMethods(prev =>
            prev.includes(method) ? prev.filter(m => m !== method) : [...prev, method]
        );
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        const calculatedSqFt = totalSqFt > 0 ? totalSqFt : (lengthFeet > 0 && widthFeet > 0 ? lengthFeet * widthFeet : 0);

        const payload = {
            propertyId: propertyId ? String(propertyId) : (outlet ? (outlet as any).property_id : 'prop-001'),
            name,
            code: code.toUpperCase().trim(),
            description,
            departmentCategory,
            outletType,
            catalogType,
            physicalLocation,
            allowsBarcodeScan,
            requiresAppointment,
            acceptedPaymentMethods,
            assignedTerminalIds: [],
            hardwareSettings: {},
            venueDimensions: {
                lengthFeet,
                widthFeet,
                heightFeet,
                totalSqFt: calculatedSqFt,
                carpetAreaSqFt
            },
            seatingCapacities: {
                theatre: capacityTheatre,
                classroom: capacityClassroom,
                banquet: capacityBanquet,
                ushape: capacityUShape,
                cocktail: capacityCocktail,
                boardroom: capacityBoardroom
            },
            rentalTariffs: {
                hourlyRate,
                halfDayRate,
                fullDayRate,
                eveningRate,
                cleaningFee
            },
            requiresTable,
            allowRoomCharge,
            autoGenerateKot,
            operatingHours: {
                open: openTime,
                close: closeTime,
                is24Hours,
                days: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
            },
            taxConfigurationId: selectedTaxConfigId === 'MANUAL_OVERRIDE' ? null : selectedTaxConfigId,
            vatRate,
            serviceChargeRate,
            cityTaxRate,
            revenueHeadCode,
            receiptHeader,
            receiptFooter,
            binNumber
        };

        try {
            const url = outlet ? `/api/restaurant/outlets/${outlet.id}` : '/api/restaurant/outlets';
            const method = outlet ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save outlet');
            }

            // Fire reactive event for Sidebar and other screens
            window.dispatchEvent(new CustomEvent('hotel_outlets_updated'));

            onSaved();
            onClose();
        } catch (err: any) {
            setError(err?.message || 'Error saving outlet');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#16161e] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                            <Store size={20} />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-white">
                                {outlet ? `Configure ${outlet.name}` : 'Create Commercial Hotel Outlet'}
                            </h2>
                            <p className="text-xs text-slate-400">
                                Multi-Department POS, Banquet Venue, USALI Ledger, Taxes & Hardware
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="size-8 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 px-6 pt-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-xs overflow-x-auto scrollbar-none">
                    <button
                        type="button"
                        onClick={() => setActiveTab('profile')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'profile'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Store size={14} /> Profile & Dept
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('venue')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'venue'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Maximize2 size={14} />
                        Banquet & Capacity
                        {departmentCategory === 'BANQUET_EVENTS' && (
                            <span className="size-2 rounded-full bg-primary animate-pulse" />
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('operations')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'operations'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Sliders size={14} /> Operational Rules
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('hours')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'hours'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Clock size={14} /> Operating Hours
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('financials')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'financials'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <Percent size={14} /> USALI & Tax
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('payments')}
                        className={`pb-2.5 px-3 font-semibold border-b-2 transition cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                            activeTab === 'payments'
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <CreditCard size={14} /> Tenders & Slip
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
                    {error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
                            {error}
                        </div>
                    )}

                    {/* TAB 1: PROFILE & DEPARTMENT */}
                    {activeTab === 'profile' && (
                        <div className="space-y-4">
                            {/* Department Category Selection */}
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                    Hotel Commercial Department <span className="text-rose-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {[
                                        { id: 'FOOD_BEVERAGE', label: 'Food & Beverage', icon: <Store size={14} /> },
                                        { id: 'BANQUET_EVENTS', label: 'Banquets & Events', icon: <Building2 size={14} /> },
                                        { id: 'SPA_WELLNESS', label: 'Spa & Wellness', icon: <Sparkles size={14} /> },
                                        { id: 'FITNESS_RECREATION', label: 'Fitness & Pool', icon: <Dumbbell size={14} /> },
                                        { id: 'RETAIL_SHOP', label: 'Gift Shop & Retail', icon: <ShoppingBag size={14} /> },
                                        { id: 'FRONT_OFFICE', label: 'Front Office Mini POS', icon: <Tag size={14} /> },
                                        { id: 'ENTERTAINMENT', label: 'Entertainment / Club', icon: <Calendar size={14} /> },
                                        { id: 'OTHER_SERVICES', label: 'Other Services', icon: <Store size={14} /> },
                                    ].map(dept => {
                                        const isSelected = departmentCategory === dept.id;
                                        return (
                                            <button
                                                key={dept.id}
                                                type="button"
                                                onClick={() => handleDepartmentChange(dept.id as DepartmentCategory)}
                                                className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 cursor-pointer ${
                                                    isSelected
                                                        ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                                                        : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                <span className={isSelected ? 'text-primary' : 'text-slate-400'}>{dept.icon}</span>
                                                <span className="text-[11px] truncate">{dept.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Commercial Outlet Name <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            if (!outlet && (!code || code === name.toUpperCase().replace(/[^A-Z0-9]+/g, '-'))) {
                                                setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]+/g, '-'));
                                            }
                                        }}
                                        placeholder="e.g. Grand Ballroom & Event Hall"
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                    />
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Outlet Code / POS Identifier <span className="text-rose-500">*</span>
                                    </label>
                                    <input
                                        required
                                        type="text"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                                        placeholder="OUTLET-BALLROOM"
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs uppercase"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Outlet Sub-Type
                                    </label>
                                    <select
                                        value={outletType}
                                        onChange={(e) => setOutletType(e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs cursor-pointer"
                                    >
                                        {departmentCategory === 'BANQUET_EVENTS' && (
                                            <>
                                                <option value="GRAND_BALLROOM">Grand Ballroom</option>
                                                <option value="BANQUET_HALL">Banquet Hall</option>
                                                <option value="CONFERENCE_ROOM">Conference / Seminar Room</option>
                                                <option value="BOARDROOM">Executive Boardroom</option>
                                                <option value="OPEN_LAWN">Open Garden / Lawn Venue</option>
                                                <option value="POOLSIDE_DECK">Poolside Event Deck</option>
                                            </>
                                        )}
                                        {departmentCategory === 'FOOD_BEVERAGE' && (
                                            <>
                                                <option value="DINE_IN_RESTAURANT">Fine Dining / Buffet Restaurant</option>
                                                <option value="BAR_LOUNGE">Cocktail Bar & Lounge</option>
                                                <option value="CAFE_BAKERY">Café, Bakery & Pastry Shop</option>
                                                <option value="ROOM_SERVICE">24/7 In-Room Dining (Room Service)</option>
                                                <option value="POOL_BAR">Poolside Bar & Outdoor Cabana</option>
                                                <option value="EXECUTIVE_LOUNGE">Executive Club Lounge</option>
                                            </>
                                        )}
                                        {departmentCategory === 'SPA_WELLNESS' && (
                                            <>
                                                <option value="SPA_AYURVEDA">Luxury Spa & Ayurveda</option>
                                                <option value="SALON_BEAUTY">Salon & Beauty Parlour</option>
                                                <option value="MASSAGE_WELLNESS">Therapy & Massage Suites</option>
                                                <option value="SAUNA_STEAM">Steam & Sauna Wellness</option>
                                            </>
                                        )}
                                        {departmentCategory === 'FITNESS_RECREATION' && (
                                            <>
                                                <option value="FITNESS_GYM">Gym & Fitness Center</option>
                                                <option value="SWIMMING_POOL">Swimming Pool Deck</option>
                                                <option value="POOL_JUICE_BAR">Swimming Pool with Juice Bar</option>
                                                <option value="SPORTS_CLUB">Tennis / Squash Sports Club</option>
                                            </>
                                        )}
                                        {departmentCategory === 'RETAIL_SHOP' && (
                                            <>
                                                <option value="GIFT_SHOP">Hotel Gift Shop & Souvenirs</option>
                                                <option value="BOUTIQUE">Fashion Boutique & Essentials</option>
                                                <option value="HANDICRAFTS">Jewellery & Handicrafts Store</option>
                                            </>
                                        )}
                                        {departmentCategory === 'FRONT_OFFICE' && (
                                            <>
                                                <option value="FRONT_DESK_MINI_POS">Front Desk Quick POS</option>
                                                <option value="LOBBY_GRAB_N_GO">Lobby Grab & Go Kiosk</option>
                                                <option value="LOBBY_SUNDRIES">Lobby Essentials & Sundries</option>
                                            </>
                                        )}
                                        {departmentCategory === 'ENTERTAINMENT' && (
                                            <>
                                                <option value="KARAOKE_LOUNGE">Karaoke VIP Lounge</option>
                                                <option value="GAMING_ARCADE">Gaming & VR Zone</option>
                                                <option value="ROOFTOP_CINEMA">Rooftop Cinema Lounge</option>
                                            </>
                                        )}
                                        {departmentCategory === 'OTHER_SERVICES' && (
                                            <>
                                                <option value="BUSINESS_CENTER">Business Center Services</option>
                                                <option value="CAR_RENTAL">Valet & Car Rental Desk</option>
                                                <option value="TOUR_DESK">Tour & Excursion Desk</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Catalog / Inventory Type
                                    </label>
                                    <select
                                        value={catalogType}
                                        onChange={(e) => setCatalogType(e.target.value as CatalogType)}
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs cursor-pointer font-medium"
                                    >
                                        <option value="RESTAURANT_MENU">Food & Beverage Menu with Addons</option>
                                        <option value="BANQUET_PACKAGES">Banquet Venue & Catering Packages</option>
                                        <option value="SPA_SERVICES">Spa Treatments & Therapist Services</option>
                                        <option value="RETAIL_PRODUCTS">Barcode Inventory & Retail Goods</option>
                                        <option value="MEMBERSHIP_PASS">Gym / Pool Day Pass & Memberships</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Physical Location
                                    </label>
                                    <input
                                        type="text"
                                        value={physicalLocation}
                                        onChange={(e) => setPhysicalLocation(e.target.value)}
                                        placeholder="e.g. Ground Floor, Convention Wing"
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Description & Service Highlights
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. State-of-the-art ballroom with crystal chandeliers, ideal for weddings and gala dinners."
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* TAB 2: BANQUET & VENUE CAPACITY */}
                    {activeTab === 'venue' && (
                        <div className="space-y-5">
                            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800 space-y-1">
                                <h4 className="font-bold text-purple-900 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-2">
                                    <Building2 size={16} /> Banquet Hall Dimensions & Capacities
                                </h4>
                                <p className="text-purple-700 dark:text-purple-400 text-xs">
                                    Configure dimensions, event seating arrangements, and rental tariffs for banquet booking agreements.
                                </p>
                            </div>

                            {/* Dimensions */}
                            <div>
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Venue Physical Dimensions</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Length (ft)</label>
                                        <input
                                            type="number"
                                            value={lengthFeet}
                                            onChange={(e) => setLengthFeet(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Width (ft)</label>
                                        <input
                                            type="number"
                                            value={widthFeet}
                                            onChange={(e) => setWidthFeet(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Ceiling Height (ft)</label>
                                        <input
                                            type="number"
                                            value={heightFeet}
                                            onChange={(e) => setHeightFeet(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Total Area (sq ft)</label>
                                        <input
                                            type="number"
                                            value={totalSqFt > 0 ? totalSqFt : (lengthFeet * widthFeet)}
                                            onChange={(e) => setTotalSqFt(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-semibold"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Carpet Area (sq ft)</label>
                                        <input
                                            type="number"
                                            value={carpetAreaSqFt}
                                            onChange={(e) => setCarpetAreaSqFt(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Seating Capacities */}
                            <div>
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                                    <Users size={14} /> Seating Layout Capacities (Guests)
                                </h5>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Theatre Style</label>
                                        <input
                                            type="number"
                                            value={capacityTheatre}
                                            onChange={(e) => setCapacityTheatre(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Classroom Style</label>
                                        <input
                                            type="number"
                                            value={capacityClassroom}
                                            onChange={(e) => setCapacityClassroom(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Banquet / Round Table</label>
                                        <input
                                            type="number"
                                            value={capacityBanquet}
                                            onChange={(e) => setCapacityBanquet(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">U-Shape Style</label>
                                        <input
                                            type="number"
                                            value={capacityUShape}
                                            onChange={(e) => setCapacityUShape(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cocktail / Standing</label>
                                        <input
                                            type="number"
                                            value={capacityCocktail}
                                            onChange={(e) => setCapacityCocktail(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Boardroom Style</label>
                                        <input
                                            type="number"
                                            value={capacityBoardroom}
                                            onChange={(e) => setCapacityBoardroom(Number(e.target.value))}
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-900 dark:text-white font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Rental Tariffs */}
                            <div>
                                <h5 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Standard Rental Tariffs (৳)</h5>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hourly Rate (৳)</label>
                                        <input
                                            type="number"
                                            value={hourlyRate}
                                            onChange={(e) => setHourlyRate(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Half-Day (4 hrs)</label>
                                        <input
                                            type="number"
                                            value={halfDayRate}
                                            onChange={(e) => setHalfDayRate(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Full-Day (8 hrs)</label>
                                        <input
                                            type="number"
                                            value={fullDayRate}
                                            onChange={(e) => setFullDayRate(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Evening Gala Rate</label>
                                        <input
                                            type="number"
                                            value={eveningRate}
                                            onChange={(e) => setEveningRate(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Cleaning / Setup Fee</label>
                                        <input
                                            type="number"
                                            value={cleaningFee}
                                            onChange={(e) => setCleaningFee(Number(e.target.value))}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: OPERATIONAL RULES */}
                    {activeTab === 'operations' && (
                        <div className="space-y-4">
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                                <h4 className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider">
                                    Operational Workflow Rules
                                </h4>
                                <div className="space-y-3">
                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={requiresTable}
                                            onChange={(e) => setRequiresTable(e.target.checked)}
                                            className="mt-0.5 size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <div>
                                            <span className="text-slate-900 dark:text-white font-semibold block">
                                                Requires Dining Table / Seating Plan
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                Orders must select a physical table/booth. Disable for Retail Counter, Grab & Go, or In-Room Service.
                                            </span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allowRoomCharge}
                                            onChange={(e) => setAllowRoomCharge(e.target.checked)}
                                            className="mt-0.5 size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <div>
                                            <span className="text-slate-900 dark:text-white font-semibold block">
                                                Allow "Bill to Room" Folio Settlement
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                Guest can post their meal, spa, event, or shop invoice directly to their checked-in hotel room folio.
                                            </span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoGenerateKot}
                                            onChange={(e) => setAutoGenerateKot(e.target.checked)}
                                            className="mt-0.5 size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <div>
                                            <span className="text-slate-900 dark:text-white font-semibold block">
                                                Automatically Generate Preparation Tickets (KOT / BEO)
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                Routes food and drink items directly to Kitchen Displays (KDS) or Banquet Event Order (BEO) printers.
                                            </span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={allowsBarcodeScan}
                                            onChange={(e) => setAllowsBarcodeScan(e.target.checked)}
                                            className="mt-0.5 size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <div>
                                            <span className="text-slate-900 dark:text-white font-semibold block">
                                                Enable Barcode Scanner Integration (EAN-13 / UPC / SKU)
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                Enables ultra-fast handheld or desktop laser barcode scanning in POS for Gift Shops and Mini POS.
                                            </span>
                                        </div>
                                    </label>

                                    <label className="flex items-start gap-2.5 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={requiresAppointment}
                                            onChange={(e) => setRequiresAppointment(e.target.checked)}
                                            className="mt-0.5 size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                        />
                                        <div>
                                            <span className="text-slate-900 dark:text-white font-semibold block">
                                                Requires Appointment & Therapist Allocation
                                            </span>
                                            <span className="text-slate-400 text-[11px]">
                                                Specifically for Spa & Salon treatments where room, slot, and certified therapist must be reserved.
                                            </span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: OPERATING HOURS */}
                    {activeTab === 'hours' && (
                        <div className="space-y-4">
                            <label className="flex items-center gap-2.5 cursor-pointer p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
                                <input
                                    type="checkbox"
                                    checked={is24Hours}
                                    onChange={(e) => setIs24Hours(e.target.checked)}
                                    className="size-4 rounded-md text-primary focus:ring-primary border-slate-300"
                                />
                                <div>
                                    <span className="text-slate-900 dark:text-white font-bold block">24/7 Continuous Operations</span>
                                    <span className="text-[11px] text-slate-400">Ideal for Front Office Mini POS, In-Room Dining, or All-Night Coffee Counters</span>
                                </div>
                            </label>

                            {!is24Hours && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Opening Time
                                        </label>
                                        <input
                                            type="time"
                                            value={openTime}
                                            onChange={(e) => setOpenTime(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                            Closing Time
                                        </label>
                                        <input
                                            type="time"
                                            value={closeTime}
                                            onChange={(e) => setCloseTime(e.target.value)}
                                            className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* TAB 5: FINANCIALS & TAXES */}
                    {activeTab === 'financials' && (
                        <div className="space-y-5">
                            {/* Central Tax Policy Selector */}
                            <div className="p-4 bg-primary/5 dark:bg-primary/10 rounded-2xl border border-primary/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="size-5 text-primary" />
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                                            Hotel Central Tax Policy
                                        </h4>
                                    </div>
                                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-primary/15 text-primary border border-primary/30">
                                        Total Tax: {(vatRate + serviceChargeRate + cityTaxRate).toFixed(2)}%
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tax rates for this outlet sync with Central Tax Settings. Manual overrides can be customized per outlet.
                                </p>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                        Linked Tax Configuration
                                    </label>
                                    <select
                                        value={isCustomTaxOverride ? 'MANUAL_OVERRIDE' : selectedTaxConfigId}
                                        onChange={(e) => handleTaxConfigChange(e.target.value)}
                                        className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs font-medium cursor-pointer"
                                    >
                                        {taxConfigurations.map((cfg) => (
                                            <option key={cfg.id} value={cfg.id}>
                                                [{cfg.code}] {cfg.name} ({cfg.module})
                                            </option>
                                        ))}
                                        <option value="MANUAL_OVERRIDE">⚙️ Manual / Custom Outlet Tax Override</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        VAT Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={vatRate}
                                        onChange={(e) => {
                                            setVatRate(Number(e.target.value));
                                            setIsCustomTaxOverride(true);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                    />
                                    <span className="text-[10px] text-slate-400">
                                        {isCustomTaxOverride ? 'Custom Override' : 'From Tax Settings'}
                                    </span>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        Service Charge (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={serviceChargeRate}
                                        onChange={(e) => {
                                            setServiceChargeRate(Number(e.target.value));
                                            setIsCustomTaxOverride(true);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                    />
                                    <span className="text-[10px] text-slate-400">
                                        {isCustomTaxOverride ? 'Custom Override' : 'From Tax Settings'}
                                    </span>
                                </div>
                                <div>
                                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                        City Tourism Tax (%)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={cityTaxRate}
                                        onChange={(e) => {
                                            setCityTaxRate(Number(e.target.value));
                                            setIsCustomTaxOverride(true);
                                        }}
                                        className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                    />
                                    <span className="text-[10px] text-slate-400">
                                        {isCustomTaxOverride ? 'Custom Override' : 'From Tax Settings'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    USALI General Ledger Revenue Head Code
                                </label>
                                <select
                                    value={revenueHeadCode}
                                    onChange={(e) => setRevenueHeadCode(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs cursor-pointer font-mono"
                                >
                                    <option value="10020-01">10020-01: F&B Revenue - Main Restaurant & Buffet</option>
                                    <option value="10020-02">10020-02: F&B Revenue - Cocktail Bar & Lounge</option>
                                    <option value="10020-03">10020-03: F&B Revenue - In-Room Dining Delivery</option>
                                    <option value="10050-01">10050-01: Banquets & Events Catering & Venue Rental</option>
                                    <option value="10030-01">10030-01: Spa, Wellness & Salon Revenue</option>
                                    <option value="10030-02">10030-02: Fitness Center & Swimming Pool Access</option>
                                    <option value="10040-01">10040-01: Gift Shop, Souvenirs & Retail Sales</option>
                                    <option value="10010-02">10010-02: Front Desk Sundries & Guest Essentials</option>
                                    <option value="10060-01">10060-01: Entertainment, Recreation & Other Income</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* TAB 6: PAYMENT TENDERS & RECEIPT SLIP */}
                    {activeTab === 'payments' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-2">
                                    Accepted Payment Tenders in this Outlet
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {[
                                        { id: 'Cash', label: 'Cash (BDT / USD)' },
                                        { id: 'Card', label: 'Card / EDC Terminal' },
                                        { id: 'Room-Charge', label: 'Bill to Room Folio' },
                                        { id: 'bKash', label: 'bKash Merchant' },
                                        { id: 'Nagad', label: 'Nagad Merchant' },
                                        { id: 'Bank-Transfer', label: 'Direct Bank Transfer' },
                                        { id: 'Company-Credit', label: 'Corporate Credit Bill' }
                                    ].map(method => {
                                        const isChecked = acceptedPaymentMethods.includes(method.id);
                                        return (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => togglePaymentMethod(method.id)}
                                                className={`p-2.5 rounded-xl border text-left transition flex items-center justify-between cursor-pointer ${
                                                    isChecked
                                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 font-semibold'
                                                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                                }`}
                                            >
                                                <span>{method.label}</span>
                                                <span className={`size-3.5 rounded-full border flex items-center justify-center text-[10px] ${
                                                    isChecked ? 'bg-emerald-500 text-white border-emerald-500' : 'border-slate-300'
                                                }`}>
                                                    {isChecked ? '✓' : ''}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    NBR Business Identification Number (BIN)
                                </label>
                                <input
                                    type="text"
                                    value={binNumber}
                                    onChange={(e) => setBinNumber(e.target.value)}
                                    placeholder="e.g. BIN-003847291-01"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs font-mono"
                                />
                                <span className="text-[11px] text-slate-400">Printed on NBR Mushak 6.3 statutory tax receipts</span>
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Thermal Slip Header
                                </label>
                                <textarea
                                    rows={2}
                                    value={receiptHeader}
                                    onChange={(e) => setReceiptHeader(e.target.value)}
                                    placeholder="The Grand Palace Hotel & Suites&#10;Commercial Outlet Receipt"
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs font-mono text-xs"
                                />
                            </div>

                            <div>
                                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                                    Thermal Slip Footer
                                </label>
                                <input
                                    type="text"
                                    value={receiptFooter}
                                    onChange={(e) => setReceiptFooter(e.target.value)}
                                    placeholder="Thank you for your visit! Please come again."
                                    className="w-full bg-slate-50 dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-primary shadow-2xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-md shadow-primary/20 cursor-pointer transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? 'Saving...' : (outlet ? 'Update Outlet' : 'Create Outlet')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default OutletModal;
