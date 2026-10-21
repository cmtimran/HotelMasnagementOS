import React, { useState, useEffect } from 'react';
import {
    Printer,
    CheckCircle2,
    AlertCircle,
    Save,
    RefreshCw,
    Plus,
    Trash2,
    Edit2,
    Wifi,
    Usb,
    Bluetooth,
    Layers,
    Utensils,
    Receipt,
    X
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { generateUniqueShortCode } from '../utils/codeGenerator';

// ==========================================
// TYPES & INTERFACES
// ==========================================

export interface HardwarePrinter {
    id: string;
    code: string;
    name: string;
    model: string;
    type: 'Network' | 'USB' | 'Bluetooth';
    ipAddress?: string;
    port?: string;
    station: 'Front Desk Cashier' | 'Main Kitchen KOT' | 'Bar Counter' | 'Room Service Kitchen' | 'Banquets Desk';
    paperSize: '80mm' | '58mm';
    status: 'online' | 'offline' | 'busy';
    isDefault: boolean;
}

export interface HotelPrinterConfig {
    // Receipt Layout
    headerText: string;
    footerText: string;
    paperSize: '80mm' | '58mm';
    fontSize: '11px' | '12px' | '13px' | '14px';
    showHotelName: boolean;
    showAddress: boolean;
    showBinNumber: boolean;
    showOrderTime: boolean;
    showRoomNumber: boolean;
    showServerName: boolean;
    showTaxBreakdown: boolean;
    printQrCode: boolean;
    qrType: 'INVOICE_VERIFY' | 'GUEST_FEEDBACK' | 'WIFI_CONNECT';
    customQrText: string;
    printCopies: number;

    // KOT (Kitchen & Room Service Ticket)
    kotFontSize: '12px' | '14px' | '16px';
    kotShowNotes: boolean;
    kotLargeRoomBadge: boolean;
    kotShowServer: boolean;
    kotPrintCopies: number;
    kotAutoPrint: boolean;

    // Hardware ESC/POS Commands
    cashDrawerKick: boolean;
    drawerPulsePin: 'Pin 2' | 'Pin 5';
    cutMode: 'full' | 'partial' | 'none';
}

const STORAGE_KEY = 'hotel_printer_settings_v1';

const DEFAULT_CONFIG: HotelPrinterConfig = {
    headerText: 'Grand Palace Hotel & Luxury Suites',
    footerText: 'Thank you for choosing Grand Palace! We look forward to welcoming you again.',
    paperSize: '80mm',
    fontSize: '12px',
    showHotelName: true,
    showAddress: true,
    showBinNumber: true,
    showOrderTime: true,
    showRoomNumber: true,
    showServerName: true,
    showTaxBreakdown: true,
    printQrCode: true,
    qrType: 'INVOICE_VERIFY',
    customQrText: 'https://grandpalace.hotel/verify/inv-8892',
    printCopies: 1,

    kotFontSize: '14px',
    kotShowNotes: true,
    kotLargeRoomBadge: true,
    kotShowServer: true,
    kotPrintCopies: 1,
    kotAutoPrint: true,

    cashDrawerKick: true,
    drawerPulsePin: 'Pin 2',
    cutMode: 'partial',
};

const INITIAL_PRINTERS: HardwarePrinter[] = [
    {
        id: 'prn-01',
        code: 'PRN-FD-01',
        name: 'Front Desk Thermal Master #1',
        model: 'Epson TM-T88VI Thermal',
        type: 'Network',
        ipAddress: '192.168.1.101',
        port: '9100',
        station: 'Front Desk Cashier',
        paperSize: '80mm',
        status: 'online',
        isDefault: true,
    },
    {
        id: 'prn-02',
        code: 'PRN-KT-02',
        name: 'Main Kitchen High-Heat KOT',
        model: 'Star Micronics SP700 Impact',
        type: 'Network',
        ipAddress: '192.168.1.102',
        port: '9100',
        station: 'Main Kitchen KOT',
        paperSize: '80mm',
        status: 'online',
        isDefault: false,
    },
    {
        id: 'prn-03',
        code: 'PRN-BAR-03',
        name: 'Executive Lounge & Bar Printer',
        model: 'Bixolon SRP-350III',
        type: 'USB',
        station: 'Bar Counter',
        paperSize: '80mm',
        status: 'online',
        isDefault: false,
    },
    {
        id: 'prn-04',
        code: 'PRN-RS-04',
        name: 'Room Service Kitchen Dispatch',
        model: 'Epson TM-m30II Bluetooth',
        type: 'Bluetooth',
        station: 'Room Service Kitchen',
        paperSize: '58mm',
        status: 'online',
        isDefault: false,
    },
];

export default function PrinterSettingsManagement() {
    const [activeTab, setActiveTab] = useState<'layout' | 'kot' | 'printers'>('layout');

    // Persistence State
    const [config, setConfig] = useState<HotelPrinterConfig>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_config`);
            return saved ? JSON.parse(saved) : DEFAULT_CONFIG;
        } catch {
            return DEFAULT_CONFIG;
        }
    });

    const [printers, setPrinters] = useState<HardwarePrinter[]>(() => {
        try {
            const saved = localStorage.getItem(`${STORAGE_KEY}_hardware`);
            return saved ? JSON.parse(saved) : INITIAL_PRINTERS;
        } catch {
            return INITIAL_PRINTERS;
        }
    });

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
    }, [config]);

    useEffect(() => {
        localStorage.setItem(`${STORAGE_KEY}_hardware`, JSON.stringify(printers));
    }, [printers]);

    // Toast
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Hardware Printer Modal
    const [showPrinterModal, setShowPrinterModal] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<HardwarePrinter | null>(null);
    const [formPrnName, setFormPrnName] = useState('');
    const [formPrnCode, setFormPrnCode] = useState('');
    const [formPrnModel, setFormPrnModel] = useState('');
    const [formPrnType, setFormPrnType] = useState<'Network' | 'USB' | 'Bluetooth'>('Network');
    const [formPrnIp, setFormPrnIp] = useState('');
    const [formPrnPort, setFormPrnPort] = useState('9100');
    const [formPrnStation, setFormPrnStation] = useState<HardwarePrinter['station']>('Front Desk Cashier');
    const [formPrnPaper, setFormPrnPaper] = useState<'80mm' | '58mm'>('80mm');
    const [testingPrinterId, setTestingPrinterId] = useState<string | null>(null);

    // Save Config
    const handleSaveConfig = () => {
        localStorage.setItem(`${STORAGE_KEY}_config`, JSON.stringify(config));
        showToast('Receipt & KOT layout preferences saved!');
    };

    // Open Printer Modal
    const openCreatePrinter = () => {
        setEditingPrinter(null);
        setFormPrnName('');
        const code = generateUniqueShortCode('PRN', printers.map(p => p.code));
        setFormPrnCode(code);
        setFormPrnModel('Epson TM-T88 Thermal');
        setFormPrnType('Network');
        setFormPrnIp('192.168.1.105');
        setFormPrnPort('9100');
        setFormPrnStation('Front Desk Cashier');
        setFormPrnPaper('80mm');
        setShowPrinterModal(true);
    };

    const openEditPrinter = (p: HardwarePrinter) => {
        setEditingPrinter(p);
        setFormPrnName(p.name);
        setFormPrnCode(p.code);
        setFormPrnModel(p.model);
        setFormPrnType(p.type);
        setFormPrnIp(p.ipAddress || '');
        setFormPrnPort(p.port || '9100');
        setFormPrnStation(p.station);
        setFormPrnPaper(p.paperSize);
        setShowPrinterModal(true);
    };

    const handleSavePrinter = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingPrinter) {
            setPrinters(prev =>
                prev.map(p =>
                    p.id === editingPrinter.id
                        ? {
                              ...p,
                              code: formPrnCode.toUpperCase(),
                              name: formPrnName.trim(),
                              model: formPrnModel.trim(),
                              type: formPrnType,
                              ipAddress: formPrnType === 'Network' ? formPrnIp.trim() : undefined,
                              port: formPrnType === 'Network' ? formPrnPort.trim() : undefined,
                              station: formPrnStation,
                              paperSize: formPrnPaper,
                          }
                        : p
                )
            );
            showToast('Printer hardware updated successfully');
        } else {
            const newPrn: HardwarePrinter = {
                id: `prn-${Date.now()}`,
                code: formPrnCode.toUpperCase() || generateUniqueShortCode('PRN', printers.map(p => p.code)),
                name: formPrnName.trim(),
                model: formPrnModel.trim(),
                type: formPrnType,
                ipAddress: formPrnType === 'Network' ? formPrnIp.trim() : undefined,
                port: formPrnType === 'Network' ? formPrnPort.trim() : undefined,
                station: formPrnStation,
                paperSize: formPrnPaper,
                status: 'online',
                isDefault: printers.length === 0,
            };
            setPrinters(prev => [...prev, newPrn]);
            showToast('New hardware printer registered');
        }
        setShowPrinterModal(false);
    };

    const handleDeletePrinter = (id: string, name: string) => {
        if (confirm(`Remove printer "${name}"?`)) {
            setPrinters(prev => prev.filter(p => p.id !== id));
            showToast('Printer removed from active registry');
        }
    };

    // Simulated Test Print
    const handleTestPrint = (target: 'receipt' | 'kot') => {
        const title = target === 'receipt' ? 'Thermal Guest Folio' : 'Kitchen KOT Order Slip';
        showToast(`Spooling 80mm test print to default hardware: ${title}...`);
        setTimeout(() => {
            window.print();
        }, 300);
    };

    // Ping test simulation
    const handlePingPrinter = (id: string) => {
        setTestingPrinterId(id);
        setTimeout(() => {
            setTestingPrinterId(null);
            showToast('Ping reply: 0% packet loss (latency 4ms). Printer is online & ready!');
        }, 800);
    };

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 font-sans pb-16">
            {/* Toast Alert */}
            {toast && (
                <div
                    className={`fixed top-5 right-5 z-50 px-4 py-2.5 rounded-xl shadow-xl text-white text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
                        toast.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'
                    }`}
                >
                    {toast.type === 'error' ? <AlertCircle className="size-4" /> : <CheckCircle2 className="size-4" />}
                    <span>{toast.message}</span>
                </div>
            )}

            {/* Standard Page Header */}
            <PageHeader
                title="Hardware & Printer Settings"
                subtitle="ESC/POS thermal printers, 80mm/58mm roll styling, KOT kitchen slips, cash drawer kick & verification QR codes"
                icon={<Printer className="size-6 text-primary" />}
                actions={
                    activeTab === 'printers' ? (
                        <button
                            type="button"
                            onClick={() => openCreatePrinter()}
                            className="btn-primary flex items-center gap-1.5 cursor-pointer"
                        >
                            <Plus className="size-4" />
                            <span>Add Thermal Printer</span>
                        </button>
                    ) : null
                }
            />

            {/* 4 Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Connected Devices</span>
                        <div className="size-8 rounded-xl bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Printer className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">{printers.length}</div>
                    <div className="mt-1 text-[11px] text-emerald-600 font-semibold">{printers.filter(p => p.status === 'online').length} Online Terminals</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Default Roll Width</span>
                        <div className="size-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold font-mono text-xs">
                            {config.paperSize}
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight font-mono">{config.paperSize}</div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Standard thermal roll</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">QR Verification</span>
                        <div className="size-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-emerald-600 tracking-tight">
                        {config.printQrCode ? 'Active' : 'Disabled'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">Digital folio authenticity</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">KOT Automation</span>
                        <div className="size-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <Utensils className="size-4" />
                        </div>
                    </div>
                    <div className="mt-2 text-2xl font-black text-slate-900 tracking-tight">
                        {config.kotAutoPrint ? 'Auto Print' : 'Manual Dispatch'}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400 font-medium">{config.kotLargeRoomBadge ? 'Large Table Badge ON' : 'Standard'}</div>
                </div>
            </div>

            {/* Standardized Navigation Tabs */}
            <div className="bg-white p-2 rounded-2xl border border-slate-200/90 shadow-2xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl">
                    <button
                        type="button"
                        onClick={() => setActiveTab('layout')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'layout'
                                ? 'bg-white text-primary shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Receipt className="size-3.5" />
                        <span>Guest Receipt Layout</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('kot')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'kot'
                                ? 'bg-white text-primary shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Utensils className="size-3.5" />
                        <span>KOT Kitchen Ticket</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveTab('printers')}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                            activeTab === 'printers'
                                ? 'bg-white text-primary shadow-xs font-bold'
                                : 'text-slate-600 hover:text-slate-900'
                        }`}
                    >
                        <Layers className="size-3.5" />
                        <span>Hardware Printers</span>
                        <span className="badge-code !py-0 !px-1.5 !text-[10px]">
                            {printers.length}
                        </span>
                    </button>
                </div>
            </div>

            {/* ============================================================== */}
            {/* TAB 1: GUEST RECEIPT LAYOUT & PHOTOREALISTIC PREVIEW          */}
            {/* ============================================================== */}
            {activeTab === 'layout' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls Form (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Thermal Receipt Layout Options
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Configure header, paper roll width, font sizing, and digital verification QR.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSaveConfig}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                                >
                                    <Save className="size-4" />
                                    <span>Save Layout</span>
                                </button>
                            </div>

                            {/* Paper Size & Font Sizing */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Paper Roll Width
                                    </label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setConfig({ ...config, paperSize: '80mm' })}
                                            className={`py-2 text-xs font-bold rounded-lg border transition ${
                                                config.paperSize === '80mm'
                                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            80mm (Standard POS)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setConfig({ ...config, paperSize: '58mm' })}
                                            className={`py-2 text-xs font-bold rounded-lg border transition ${
                                                config.paperSize === '58mm'
                                                    ? 'bg-indigo-50 border-indigo-400 text-indigo-700'
                                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                            }`}
                                        >
                                            58mm (Mobile POS)
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Typography Base Size
                                    </label>
                                    <select
                                        value={config.fontSize}
                                        onChange={e =>
                                            setConfig({
                                                ...config,
                                                fontSize: e.target.value as HotelPrinterConfig['fontSize'],
                                            })
                                        }
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                    >
                                        <option value="11px">11px Compact Dense</option>
                                        <option value="12px">12px Standard Receipt</option>
                                        <option value="13px">13px Medium Legible</option>
                                        <option value="14px">14px Large High-Visibility</option>
                                    </select>
                                </div>
                            </div>

                            {/* Header & Footer Custom Text */}
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Receipt Top Header Banner
                                    </label>
                                    <input
                                        type="text"
                                        value={config.headerText}
                                        onChange={e => setConfig({ ...config, headerText: e.target.value })}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Receipt Bottom Footer Greeting
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={config.footerText}
                                        onChange={e => setConfig({ ...config, footerText: e.target.value })}
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            {/* Toggles */}
                            <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.showHotelName}
                                        onChange={e => setConfig({ ...config, showHotelName: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Print Hotel Name & Logo</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.showBinNumber}
                                        onChange={e => setConfig({ ...config, showBinNumber: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Print Tax BIN & VAT Registration</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.showTaxBreakdown}
                                        onChange={e => setConfig({ ...config, showTaxBreakdown: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Itemized Tax Breakdown Table</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.showRoomNumber}
                                        onChange={e => setConfig({ ...config, showRoomNumber: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Print Room # / Table #</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.printQrCode}
                                        onChange={e => setConfig({ ...config, printQrCode: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Print Verification QR Code</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.cashDrawerKick}
                                        onChange={e => setConfig({ ...config, cashDrawerKick: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Auto Cash Drawer Kick Pulse</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Photorealistic Thermal Receipt Preview (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Receipt className="size-3.5 text-indigo-600" />
                                <span>Thermal Print Preview ({config.paperSize})</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handleTestPrint('receipt')}
                                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition"
                            >
                                <Printer className="size-3" />
                                <span>Test Print</span>
                            </button>
                        </div>

                        {/* Thermal Receipt Paper Roll Simulator */}
                        <div
                            style={{
                                width: config.paperSize === '58mm' ? '280px' : '360px',
                                fontSize: config.fontSize,
                            }}
                            className="bg-white text-black font-mono shadow-2xl p-6 rounded-t-sm border-t-8 border-indigo-600 space-y-3 select-none relative transition-all duration-300"
                        >
                            {/* Paper tear top edge effect */}
                            <div className="text-center space-y-1 border-b border-dashed border-gray-400 pb-3">
                                {config.showHotelName && (
                                    <>
                                        <div className="font-extrabold text-sm uppercase tracking-wide">
                                            {config.headerText}
                                        </div>
                                        <div className="text-[10px] text-gray-700">
                                            Plot 12, Diplomatic Zone, Gulshan-2, Dhaka
                                        </div>
                                    </>
                                )}
                                {config.showBinNumber && (
                                    <div className="text-[10px] text-gray-800 font-bold">
                                        TAX BIN: 002348912-0101 • TEL: +880 2 988-2233
                                    </div>
                                )}
                                <div className="text-[10px] text-gray-600">
                                    GUEST FOLIO / OFFICIAL RECEIPT
                                </div>
                            </div>

                            {/* Metadata */}
                            <div className="text-[11px] space-y-0.5 border-b border-dashed border-gray-400 pb-2">
                                <div className="flex justify-between">
                                    <span>INVOICE: #GP-2026-8892</span>
                                    <span>{new Date().toLocaleDateString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>GUEST: Amb. Alexander Wright</span>
                                    <span>ROOM: #402 (Deluxe)</span>
                                </div>
                                <div className="flex justify-between text-gray-600 text-[10px]">
                                    <span>CASHIER: Sarah (Front Desk)</span>
                                    <span>14:32 PM</span>
                                </div>
                            </div>

                            {/* Itemized Table */}
                            <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
                                <div className="flex justify-between font-bold border-b border-gray-300 pb-1">
                                    <span>ITEM DESCRIPTION</span>
                                    <span>AMOUNT</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>2x Deluxe Ocean View (2N)</span>
                                    <span>$560.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>1x Executive Club Dinner</span>
                                    <span>$95.00</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>1x Airport Chauffeur Transfer</span>
                                    <span>$45.00</span>
                                </div>
                            </div>

                            {/* Subtotals & Taxes */}
                            <div className="space-y-1 text-[11px] border-b border-dashed border-gray-400 pb-2">
                                <div className="flex justify-between">
                                    <span>SUBTOTAL:</span>
                                    <span>$700.00</span>
                                </div>
                                {config.showTaxBreakdown && (
                                    <>
                                        <div className="flex justify-between text-gray-700">
                                            <span>SERVICE CHARGE (10%):</span>
                                            <span>+$70.00</span>
                                        </div>
                                        <div className="flex justify-between text-gray-700">
                                            <span>VAT (15% on $770):</span>
                                            <span>+$115.50</span>
                                        </div>
                                        <div className="flex justify-between text-gray-700">
                                            <span>CITY TOURISM LEVY (2%):</span>
                                            <span>+$14.00</span>
                                        </div>
                                    </>
                                )}
                                <div className="flex justify-between font-extrabold text-sm pt-1 border-t border-gray-400">
                                    <span>TOTAL BILL:</span>
                                    <span>$899.50</span>
                                </div>
                                <div className="flex justify-between text-[10px] text-gray-600">
                                    <span>PAID BY VISA (**** 4412):</span>
                                    <span>$899.50</span>
                                </div>
                            </div>

                            {/* QR Code Container */}
                            {config.printQrCode && (
                                <div className="flex flex-col items-center justify-center pt-2">
                                    <div className="size-24 border-2 border-black flex items-center justify-center p-1 bg-white">
                                        {/* Procedural QR Code Grid Preview */}
                                        <div className="grid grid-cols-6 gap-0.5 w-full h-full p-1 bg-gray-100">
                                            <div className="bg-black col-span-2 row-span-2"></div>
                                            <div className="bg-white"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-black col-span-2 row-span-2"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-white"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-white"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-black col-span-2 row-span-2"></div>
                                            <div className="bg-black"></div>
                                            <div className="bg-white"></div>
                                            <div className="bg-black"></div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] text-gray-600 font-bold mt-1 uppercase">
                                        Scan for Digital Folio & Tax Verification
                                    </div>
                                </div>
                            )}

                            {/* Footer Greeting */}
                            <div className="text-center text-[10px] text-gray-700 pt-1 border-t border-dashed border-gray-400">
                                {config.footerText}
                            </div>

                            {/* Jagged paper cut effect at bottom */}
                            <div className="w-full flex justify-between overflow-hidden opacity-30 pt-2">
                                {Array.from({ length: 18 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className="size-2 bg-gray-400 rotate-45 -mb-2 shrink-0"
                                    ></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 2: KOT KITCHEN TICKET LAYOUT & PREVIEW                     */}
            {/* ============================================================== */}
            {activeTab === 'kot' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Controls (7 Cols) */}
                    <div className="lg:col-span-7 space-y-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-4 shadow-xs">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900">
                                        Kitchen & Room Service Order Ticket (KOT)
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Real-time slip styling sent to hot kitchen, cold pantry, and banquet prep stations.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleSaveConfig}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                                >
                                    <Save className="size-4" />
                                    <span>Save KOT Layout</span>
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        KOT Typography Size
                                    </label>
                                    <select
                                        value={config.kotFontSize}
                                        onChange={e =>
                                            setConfig({
                                                ...config,
                                                kotFontSize: e.target.value as HotelPrinterConfig['kotFontSize'],
                                            })
                                        }
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                    >
                                        <option value="12px">12px Standard</option>
                                        <option value="14px">14px Large High Visibility</option>
                                        <option value="16px">16px Extra Large (Chef Station)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Print Copies per KOT Order
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        max={3}
                                        value={config.kotPrintCopies}
                                        onChange={e =>
                                            setConfig({ ...config, kotPrintCopies: parseInt(e.target.value) || 1 })
                                        }
                                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.kotLargeRoomBadge}
                                        onChange={e => setConfig({ ...config, kotLargeRoomBadge: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Highlight Room # / Table # with Extra Large Badge</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.kotShowNotes}
                                        onChange={e => setConfig({ ...config, kotShowNotes: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Print Guest Special Dietary & Cooking Notes (e.g. No Shellfish)</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.kotShowServer}
                                        onChange={e => setConfig({ ...config, kotShowServer: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Show Room Service Captain / Server Name</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.kotAutoPrint}
                                        onChange={e => setConfig({ ...config, kotAutoPrint: e.target.checked })}
                                        className="rounded text-indigo-600"
                                    />
                                    <span>Auto-Spool KOT instantly on POS Order Confirmation</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* KOT Visual Kitchen Slip (5 Cols) */}
                    <div className="lg:col-span-5 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between mb-2 px-1">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Utensils className="size-3.5 text-rose-600" />
                                <span>Kitchen KOT Slip Preview</span>
                            </span>
                            <button
                                type="button"
                                onClick={() => handleTestPrint('kot')}
                                className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition"
                            >
                                <Printer className="size-3" />
                                <span>Test KOT Print</span>
                            </button>
                        </div>

                        {/* Kitchen Slip Simulation */}
                        <div
                            style={{
                                width: '320px',
                                fontSize: config.kotFontSize,
                            }}
                            className="bg-white text-black font-mono shadow-2xl p-5 rounded-t-sm border-t-8 border-rose-600 space-y-3 select-none"
                        >
                            {/* KOT Header */}
                            <div className="text-center border-b-2 border-black pb-2">
                                <div className="font-black text-lg tracking-wider text-rose-700">
                                    *** KITCHEN ORDER TICKET ***
                                </div>
                                <div className="text-xs font-bold">STATION: MAIN HOT KITCHEN</div>
                            </div>

                            {/* Destination Badge */}
                            <div className="bg-black text-white p-2 rounded text-center">
                                <div className="text-xs uppercase">Destination:</div>
                                <div className="text-xl font-black tracking-wide">
                                    ROOM #402 (IN-ROOM DINING)
                                </div>
                            </div>

                            {/* Slip Meta */}
                            <div className="text-xs flex justify-between border-b border-dashed border-gray-400 pb-1">
                                <span>KOT: #KT-9912</span>
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>

                            {/* Items with Large typography */}
                            <div className="space-y-2 py-1 border-b-2 border-black">
                                <div className="flex justify-between font-black text-sm">
                                    <span>2x GRILLED ATLANTIC SALMON</span>
                                    <span>[HOT]</span>
                                </div>
                                {config.kotShowNotes && (
                                    <div className="text-xs text-rose-700 font-bold pl-4">
                                        &gt;&gt; Special Note: Medium well, sauce on side!
                                    </div>
                                )}

                                <div className="flex justify-between font-black text-sm pt-1">
                                    <span>1x WILD MUSHROOM RISOTTO</span>
                                    <span>[PAN]</span>
                                </div>
                                {config.kotShowNotes && (
                                    <div className="text-xs text-rose-700 font-bold pl-4">
                                        &gt;&gt; Special Note: Gluten-free, no cheese on top!
                                    </div>
                                )}
                            </div>

                            {/* Server & Timestamp */}
                            <div className="text-[11px] flex justify-between text-gray-700 pt-1">
                                <span>Captain: Tariq (Service)</span>
                                <span>Prep Time: 20 min</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================== */}
            {/* TAB 3: HARDWARE PRINTERS CATALOG                               */}
            {/* ============================================================== */}
            {activeTab === 'printers' && (
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                        <div>
                            <h2 className="text-sm font-bold text-slate-900">
                                Registered Physical Hardware Printers
                            </h2>
                            <p className="text-xs text-slate-500">
                                ESC/POS thermal and impact printers bound to hotel dispatch stations.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreatePrinter}
                            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs flex items-center gap-1.5 transition"
                        >
                            <Plus className="size-4" />
                            <span>Register Hardware Printer</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {printers.map(p => (
                            <div
                                key={p.id}
                                className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 shadow-xs hover:border-indigo-300 transition"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="size-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                                            {p.type === 'Network' ? (
                                                <Wifi className="size-4" />
                                            ) : p.type === 'USB' ? (
                                                <Usb className="size-4" />
                                            ) : (
                                                <Bluetooth className="size-4" />
                                            )}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-slate-900 text-sm">
                                                    {p.name}
                                                </h4>
                                                {p.isDefault && (
                                                    <span className="px-2 py-0.2 text-[10px] rounded bg-indigo-100 text-indigo-700 font-bold">
                                                        Default
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-400">{p.model}</div>
                                        </div>
                                    </div>

                                    <span
                                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                            p.status === 'online'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}
                                    >
                                        {p.status}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100 font-mono">
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">STATION:</span>
                                        <span className="font-semibold text-slate-800">
                                            {p.station}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">CONNECTION:</span>
                                        <span className="font-semibold text-slate-800">
                                            {p.type === 'Network' ? `${p.ipAddress}:${p.port}` : p.type}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">ROLL SIZE:</span>
                                        <span className="font-semibold text-slate-800">
                                            {p.paperSize} Thermal Roll
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 text-[10px] block">CODE:</span>
                                        <span className="font-semibold text-indigo-600">
                                            {p.code}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <button
                                        type="button"
                                        disabled={testingPrinterId === p.id}
                                        onClick={() => handlePingPrinter(p.id)}
                                        className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        <RefreshCw
                                            className={`size-3 ${testingPrinterId === p.id ? 'animate-spin' : ''}`}
                                        />
                                        <span>Ping Device</span>
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => openEditPrinter(p)}
                                            className="size-7 rounded hover:bg-slate-100 text-slate-600 flex items-center justify-center transition"
                                        >
                                            <Edit2 className="size-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeletePrinter(p.id, p.name)}
                                            className="size-7 rounded hover:bg-rose-50 text-rose-600 flex items-center justify-center transition"
                                        >
                                            <Trash2 className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Hardware Printer Modal */}
            {showPrinterModal && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
                            <div className="flex items-center gap-2">
                                <Printer className="size-5 text-indigo-600" />
                                <h2 className="text-base font-bold text-slate-900">
                                    {editingPrinter ? 'Edit Hardware Printer' : 'Register Hardware Printer'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowPrinterModal(false)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSavePrinter} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Printer Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Front Desk Master #1"
                                    value={formPrnName}
                                    onChange={e => {
                                        setFormPrnName(e.target.value);
                                        if (!editingPrinter && e.target.value.length > 2) {
                                            setFormPrnCode(
                                                generateUniqueShortCode(e.target.value, printers.map(p => p.code))
                                            );
                                        }
                                    }}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Short Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formPrnCode}
                                        onChange={e => setFormPrnCode(e.target.value.toUpperCase())}
                                        className="w-full px-3 py-2 text-xs font-mono font-bold uppercase bg-white border border-slate-200 rounded-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                                        Connection Interface *
                                    </label>
                                    <select
                                        value={formPrnType}
                                        onChange={e =>
                                            setFormPrnType(e.target.value as 'Network' | 'USB' | 'Bluetooth')
                                        }
                                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                    >
                                        <option value="Network">Network Ethernet / IP</option>
                                        <option value="USB">Direct USB Plug</option>
                                        <option value="Bluetooth">Bluetooth Wireless</option>
                                    </select>
                                </div>
                            </div>

                            {formPrnType === 'Network' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            IP Address *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formPrnIp}
                                            onChange={e => setFormPrnIp(e.target.value)}
                                            placeholder="192.168.1.101"
                                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                                            Port
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formPrnPort}
                                            onChange={e => setFormPrnPort(e.target.value)}
                                            placeholder="9100"
                                            className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                                        />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">
                                    Assigned Hotel Dispatch Station
                                </label>
                                <select
                                    value={formPrnStation}
                                    onChange={e =>
                                        setFormPrnStation(e.target.value as HardwarePrinter['station'])
                                    }
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                                >
                                    <option value="Front Desk Cashier">Front Desk Cashier</option>
                                    <option value="Main Kitchen KOT">Main Kitchen KOT</option>
                                    <option value="Bar Counter">Bar Counter</option>
                                    <option value="Room Service Kitchen">Room Service Kitchen</option>
                                    <option value="Banquets Desk">Banquets Desk</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setShowPrinterModal(false)}
                                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                                >
                                    {editingPrinter ? 'Save Printer' : 'Register Printer'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
