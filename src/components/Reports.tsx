
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, FileText, Download, RotateCcw, ChevronDown, ChevronRight, Edit, Printer, Save, ZoomIn, ZoomOut, ChevronLeft, ChevronsLeft, ChevronsRight, FileSpreadsheet, FileImage, Settings, Maximize, Minimize, Grid, List, LayoutTemplate, Menu, Building2, Monitor, Shield, BarChart2, ListOrdered, User, LogOut, X, Plus, Trash2, GripVertical, Calendar, LayoutDashboard } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';


// --- Generic Report Engine ---

type ReportRow = Record<string, string | number | null | undefined>;

// 1. Report Configuration: Defines columns for each report
const REPORT_CONFIG: Record<string, { columns: string[] }> = {
    // Reservation Reports
    'Arrival List': { columns: ["Res. No", "Guest", "Room", "Rate ($)", "Arrival", "Departure", "Pax", "Pick Up", "Drop Off", "Res. Type", "Company", "User"] },
    'Cancelled Reservation': { columns: ["Res. No", "Booking Date", "Guest", "Rate Type", "Arr.", "Dpt", "Folio No", "ADR", "Can. Revenue", "Source", "Can. By", "Can Date", "Remarks"] },
    'Country Wise Reservation Statistics': { columns: ["Country", "Total Res.", "Total Nights", "Total Revenue", "Total Pax"] },
    'Departure List': { columns: ["Res. no", "Guest Name", "Room", "Rate", "Rate Type", "Arrival", "Departure", "Pax", "Business Source", "Res.Type", "User"] },
    'Forecast Report': { columns: ["Date", "Rooms", "Arrivals", "Stayovers", "Departure", "Available", "Occ/Reserved", "% Occupied", "Room Rental", "RevPAR", "ADR", "Guests"] },
    'No Show Reservation': { columns: ["Res. No", "Guest Name", "Arr.", "Dept", "Folio No", "No Show Revenue", "Charges", "Paid", "Balance", "Source", "No Show By/Dt", "Remark"] },
    'Release Reservation List': { columns: ["Res. No", "Guest Name", "Room Type", "Arrival", "Departure", "Release Date", "Status", "User"] },
    'Reservation Activity': { columns: ["Res#", "Res. Date", "Name", "Arr", "Dept", "Nights", "Room", "Source", "Agent", "Vou#", "Rate Type", "Ofrd. Rate", "Balance", "Revenue", "GTD", "User"] },
    'Void Reservation': { columns: ["Res. No", "Guest Name", "Arrival", "Dept", "Folio No", "Source", "Void By", "Void DateTime", "Remarks"] },

    // Front Office Reports
    'Guest Checked In': { columns: ["Room No", "Folio No", "Guest Name", "Arrival", "Departure", "Pax", "Rate", "Plan", "Source", "User"] },
    'Guest Checked Out': { columns: ["Room No", "Folio No", "Guest Name", "Arrival", "Departure", "Pax", "Total Charges", "Payment", "Balance", "User"] },
    'Guest List': { columns: ["Room No", "Guest Name", "Arrival", "Departure", "Pax", "Nationality", "Mobile", "Email", "ID Type", "ID No"] },
    'Guest Message': { columns: ["Date", "Room No", "Guest Name", "Message", "For Date", "Status", "Created By"] },
    'Inclusion Report': { columns: ["Date", "Room No", "Guest Name", "Inclusion", "Qty", "Amount", "Status", "User"] },
    'Inventory By Room Type': { columns: ["Date", "Room Type", "Total", "Occupied", "Vacant", "Maintenance", "Blocked"] },
    'Invoice Breakdown': { columns: ["Invoice No", "Date", "Guest Name", "Room", "Service", "Amount", "Tax", "Total", "User"] },
    'Night Audit': { columns: ["Date", "Process", "Status", "Run By", "Time", "Remarks"] },
    'Pickup Dropoff': { columns: ["Date", "Time", "Guest Name", "Room", "Type", "Location", "Vehicle", "Driver", "Status"] },
    'Room Availability': { columns: ["Room Type", "Total", "Occupied", "Vacant", "Dirty", "Clean", "Inspected", "Out of Order"] },
    'Room Status Report': { columns: ["Room No", "Type", "Status", "Guest Name", "Arrival", "Departure", "Pax", "Balance"] },
    'Task List Report': { columns: ["Task ID", "Room", "Task", "Assigned To", "Status", "Due Date", "Priority"] },

    // Back Office Reports
    'Advance Deposit Ledger': { columns: ["Date", "Res. No", "Guest", "Pay Method", "Amount", "Used Amount", "Balance", "User"] },
    'Ageing Debtors - Summary': { columns: ["Debtor Name", "Current", "30 Days", "60 Days", "90 Days", "120+ Days", "Total Due"] },
    'Ageing Debtors - Detail': { columns: ["Debtor Name", "Invoice No", "Date", "Amount", "Paid", "Balance", "Days Overdue"] },
    'Cashier Sales Report': { columns: ["Date", "Cashier", "Cash", "Credit Card", "Bank Transfer", "Total Collection"] },
    'City Ledger - Detail': { columns: ["Date", "Account Name", "Invoice No", "Guest", "Debit", "Credit", "Balance", "Remarks"] },
    'City Ledger - Summary': { columns: ["Account Name", "Opening Balance", "Debit", "Credit", "Closing Balance"] },
    'Complimentary Room Report': { columns: ["Date", "Room", "Guest", "Nights", "Reason", "Authorized By", "Value"] },
    'Credit Card Process - Detail': { columns: ["Date", "Transaction ID", "Guest", "Card Type", "Last 4 Digits", "Amount", "Status", "Auth Code"] },
    'Daily Extra Charge - Detail': { columns: ["Date", "Room", "Guest", "Charge Name", "Qty", "Amount", "Tax", "Total", "User"] },
    'Daily Receipt - Detail': { columns: ["Receipt No", "Date", "Guest", "Room", "Pay Method", "Amount", "User", "Remarks"] },
    'Daily Receipt - Summary': { columns: ["Pay Method", "Count", "Amount"] },
    'Daily Refund Report': { columns: ["Date", "Refund No", "Guest", "Room", "Pay Method", "Amount", "Reason", "User"] },
    'Daily Revenue': { columns: ["Date", "Room Charges", "Extra Charges", "F&B", "Laundry", "Others", "Total Revenue"] },
    'Detail Discount Report': { columns: ["Date", "Room", "Guest", "Discount Name", "Amount", "Reason", "User"] },
    'Detail Revenue Report': { columns: ["Date", "Room", "Guest", "Rate", "Extra", "Tax", "Total", "User"] },
    'Expense Voucher': { columns: ["Voucher No", "Date", "Payee", "Category", "Description", "Amount", "Pay Method", "User"] },
    'Financial Report': { columns: ["Category", "Today", "Month to Date", "Year to Date"] },
    'Folio List': { columns: ["Folio No", "Date", "Guest", "Room", "Total Charges", "Total Paid", "Balance", "Status"] },
    'Guest Ledger': { columns: ["Room", "Guest", "Arrival", "Departure", "Balance B/F", "Charges", "Credits", "Balance"] },
    'House Status': { columns: ["Room", "Type", "Status", "Guest", "Arrival", "Departure", "Pax", "Balance"] },
    'Housekeeping Summary': { columns: ["Date", "Arrivals", "Departures", "Stayovers", "Clean", "Dirty", "Total Rooms"] },
    'Maintenance Block': { columns: ["Room", "Block Type", "Start Date", "End Date", "Reason", "Blocked By"] },
    'Manager Report': { columns: ["Metric", "Today", "Month to Date", "Year to Date"] },
    'Meal Plan': { columns: ["Date", "Room", "Guest", "Meal Plan", "Pax", "Status"] },
    'Meal Planner': { columns: ["Date", "Breakfast", "Lunch", "Dinner", "Total Pax"] },
    'Owner Statement': { columns: ["Owner", "Unit", "Total Revenue", "Expenses", "Commission", "Net Payable"] },
    'PG - Authorize Capture': { columns: ["Date", "Guest", "Card", "Amount", "Auth Code", "Capture ID", "Status"] },
    'Rate Card': { columns: ["Rate Type", "Room Type", "1 Pax", "2 Pax", "3 Pax", "Extra Adult", "Extra Child"] },
    'Revenue By Rate Type': { columns: ["Rate Type", "Room Nights", "Revenue", "ADR", "% Occ"] },
    'Revenue By Room Type': { columns: ["Room Type", "Room Nights", "Revenue", "ADR", "% Occ"] },
    'Transaction Detail Report': { columns: ["Date", "Trans ID", "Type", "Description", "Amount", "User"] },
    'Travel Agent Commission - Detail': { columns: ["Agent", "Guest", "Res No", "Room Amt", "Comm %", "Comm Amt"] },
    'Travel Agent Commission - Summary': { columns: ["Agent", "Total Bookings", "Total Revenue", "Total Commission"] },
    'Weekly Manager Report': { columns: ["Date", "Occ %", "ADR", "RevPAR", "Room Rev", "F&B Rev", "Total Rev"] },
    'Weekly Meal Plan Report': { columns: ["Date", "Meal Plan", "Pax Count"] },
    'Work Order List': { columns: ["Work Order #", "Date", "Location", "Issue", "Assigned To", "Status", "Completed Date"] },

    // Audit Reports
    'Audit Trails': { columns: ["Date/Time", "User", "Module", "Action", "Description", "IP Address"] },
    'IP Report': { columns: ["IP Address", "User", "Login Time", "Logout Time", "Status"] },
    'Void Charge': { columns: ["Date", "Guest", "Room", "Charge", "Amount", "Void By", "Reason"] },
    'Void Payment': { columns: ["Date", "Guest", "Room", "Payment", "Amount", "Void By", "Reason"] },
    'Void Transaction': { columns: ["Date", "Trans ID", "Guest", "Room", "Amount", "Void By", "Reason"] },
};

// 2. Generic Data Generator
const generateGenericMockData = (reportName: string, count: number = 25): ReportRow[] => {
    const config = REPORT_CONFIG[reportName];
    if (!config) return [];

    return Array.from({ length: count }, (_, i) => {
        const row: ReportRow = {};
        config.columns.forEach(col => {
            const lowerCol = col.toLowerCase();
            let value = '';

            if (lowerCol.includes('date') || lowerCol.includes('arr') || lowerCol.includes('dept') || lowerCol === 'stay') {
                value = new Date(2024, 5, 10 + (i % 20)).toLocaleDateString();
            } else if (lowerCol.includes('no') || lowerCol.includes('#') || lowerCol.includes('id')) {
                value = `${1000 + i}`;
            } else if (lowerCol.includes('amount') || lowerCol.includes('rate') || lowerCol.includes('rev') || lowerCol.includes('balance') || lowerCol.includes('credit') || lowerCol.includes('debit') || lowerCol.includes('paid')) {
                value = (Math.random() * 500 + 50).toFixed(2);
            } else if (lowerCol.includes('guest') || lowerCol.includes('name')) {
                const names = ['John Doe', 'Jane Smith', 'Mike Ross', 'Rachel Green', 'Chandler Bing', 'Monica Geller'];
                value = names[i % names.length];
            } else if (lowerCol.includes('room')) {
                if (lowerCol.includes('type')) value = ['Deluxe', 'Standard', 'Suite'][i % 3];
                else value = `${100 + (i % 50)}`;
            } else if (lowerCol.includes('status')) {
                value = ['Confirmed', 'Checked In', 'Cancelled', 'Pending'][i % 4];
            } else if (lowerCol.includes('pax')) {
                value = `${Math.floor(Math.random() * 3) + 1}/0`;
            } else if (lowerCol.includes('user') || lowerCol.includes('by')) {
                value = ['admin', 'manager', 'reception'][i % 3];
            } else {
                value = '-';
            }
            row[col] = value;
        });
        return row;
    });
};

interface ReportsProps {
    user: any;
    onLogout: () => void;
    setActivePage?: (page: string) => void;
}

const Reports = ({ user, onLogout, setActivePage }: ReportsProps) => {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
        'Reservation Report': true,
        'Front Office Report': false,
        'Back Office Report': false,
        'Audit Report': false,
        'Analytics & BI': false,
    });
    const [flyoutCategory, setFlyoutCategory] = useState<string | null>(null);
    const [activeReport, setActiveReport] = useState('Cancelled Reservation'); // Default to the one user requested
    const [startDate, setStartDate] = useState('2024-06-11');
    const [endDate, setEndDate] = useState('2024-06-11');
    const [sidebarSearch, setSidebarSearch] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Template Modals State
    const [isTemplateListModalOpen, setIsTemplateListModalOpen] = useState(false);
    const [isAddTemplateModalOpen, setIsAddTemplateModalOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleCategory = (cat: string) => {
        setOpenCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const menuItems = [
        {
            title: 'Reservation Report',
            key: 'reservation',
            color: 'text-blue-600 bg-blue-50 border-blue-200',
            icon: <ListOrdered size={14} />,
            items: ['Arrival List', 'Cancelled Reservation', 'Country Wise Reservation Statistics', 'Departure List', 'Forecast Report', 'No Show Reservation', 'Release Reservation List', 'Reservation Activity', 'Void Reservation']
        },
        {
            title: 'Front Office Report',
            key: 'frontOffice',
            color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
            icon: <Monitor size={14} />,
            items: [
                'Guest Checked In',
                'Guest Checked Out',
                'Guest List',
                'Guest Message',
                'Inclusion Report',
                'Inventory By Room Type',
                'Invoice Breakdown',
                'Night Audit',
                'Pickup Dropoff',
                'Room Availability',
                'Room Status Report',
                'Task List Report'
            ]
        },
        {
            title: 'Back Office Report',
            key: 'backOffice',
            color: 'text-amber-600 bg-amber-50 border-amber-200',
            icon: <Building2 size={14} />,
            items: [
                'Advance Deposit Ledger',
                'Ageing Debtors - Summary',
                'Ageing Debtors - Detail',
                'Cashier Sales Report',
                'City Ledger - Detail',
                'City Ledger - Summary',
                'Complimentary Room Report',
                'Credit Card Process - Detail',
                'Daily Extra Charge - Detail',
                'Daily Receipt - Detail',
                'Daily Receipt - Summary',
                'Daily Refund Report',
                'Daily Revenue',
                'Detail Discount Report',
                'Detail Revenue Report',
                'Expense Voucher',
                'Financial Report',
                'Folio List',
                'Guest Ledger',
                'House Status',
                'Housekeeping Summary',
                'Maintenance Block',
                'Manager Report',
                'Meal Plan',
                'Meal Planner',
                'Owner Statement',
                'PG - Authorize Capture',
                'Rate Card',
                'Revenue By Rate Type',
                'Room Type Wise Daily Room Revenue',
                'Transaction Detail Report',
                'Travel Agent Commission - Detail',
                'Travel Agent Commission - Summary',
                'Weekly Manager Report',
                'Weekly Meal Plan Report',
                'Work Order List'
            ]
        },
        {
            title: 'Audit Report',
            key: 'audit',
            color: 'text-purple-600 bg-purple-50 border-purple-200',
            icon: <Shield size={14} />,
            items: ['Audit Trails', 'IP Report', 'Void Charge', 'Void Payment', 'Void Transaction']
        },
        {
            title: 'Analytics & BI',
            key: 'analytics',
            color: 'text-indigo-600 bg-indigo-50 border-indigo-200',
            icon: <BarChart2 size={14} />,
            items: ['Advanced Revenue Analytics', 'Room Type Wise Daily Room Revenue', 'Revenue By Rate Type', 'Revenue By Room Type']
        },
    ];

    const filteredMenuItems = useMemo(() => {
        if (!sidebarSearch.trim()) return menuItems;
        const q = sidebarSearch.toLowerCase();
        return menuItems.map(menu => ({
            ...menu,
            items: menu.items.filter(item => item.toLowerCase().includes(q))
        })).filter(menu => menu.items.length > 0 || menu.title.toLowerCase().includes(q));
    }, [sidebarSearch, menuItems]);

    // Template Creation State
    const [newTemplateName, setNewTemplateName] = useState('New Report');
    const [newTemplateOrientation, setNewTemplateOrientation] = useState('Landscape');
    const [templateColumns] = useState<any[]>([
        { id: '1', name: 'Res. No', header: 'Res. No', order: 1, align: 'Left' },
        { id: '2', name: 'Guest Name', header: 'Guest Name', order: 2, align: 'Left' },
        { id: '3', name: 'Arrival', header: 'Arrival', order: 1, align: 'Left' },
        { id: '4', name: 'Dept.', header: 'Dept.', order: 1, align: 'Left' },
        { id: '5', name: 'Folio No', header: 'Folio No', order: 1, align: 'Left' },
    ]);

    const renderTemplateListModal = () => {
        if (!isTemplateListModalOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-3 transition-all animate-in fade-in duration-200">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-white sticky top-0">
                        <h2 className="text-sm font-bold text-slate-800 tracking-tight">Custom Report Template(s)</h2>
                        <button onClick={() => setIsTemplateListModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                            <X size={15} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="p-3">
                        <div className="border border-slate-200 rounded-md overflow-hidden mb-3 overflow-x-auto no-scrollbar">
                            <table className="w-full text-xs min-w-[360px]">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-3 py-1.5 text-left font-semibold text-slate-700 text-[11px]">Custom Report List</th>
                                        <th className="px-3 py-1.5 text-right font-semibold text-slate-700 text-[11px] w-20">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-slate-50/60">
                                        <td className="px-3 py-2 text-slate-600">Custom Report List</td>
                                        <td className="px-3 py-2 text-right"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                onClick={() => setIsTemplateListModalOpen(false)}
                                className="h-7.5 px-3 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-medium text-xs shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsTemplateListModalOpen(false);
                                    setIsAddTemplateModalOpen(true);
                                }}
                                className="h-7.5 px-3.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-semibold shadow-2xs text-xs"
                            >
                                Add New
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderAddTemplateModal = () => {
        if (!isAddTemplateModalOpen) return null;
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-3 transition-all animate-in fade-in duration-200">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transform animate-in zoom-in-95 duration-200 border border-slate-200">
                    <div className="px-3.5 py-2 border-b border-slate-200 flex justify-between items-center bg-white">
                        <h2 className="text-sm font-bold text-slate-900 tracking-tight">Add Report Template</h2>
                        <button onClick={() => setIsAddTemplateModalOpen(false)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-colors">
                            <X size={15} strokeWidth={2.5} />
                        </button>
                    </div>

                    <div className="p-3.5 space-y-3 overflow-y-auto no-scrollbar">
                        <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-3 font-semibold text-slate-700 text-xs">Report Name</label>
                            <input
                                type="text"
                                value={newTemplateName}
                                onChange={(e) => setNewTemplateName(e.target.value)}
                                className="col-span-9 h-7 px-2.5 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-12 items-center gap-2">
                            <label className="col-span-3 font-semibold text-slate-700 text-xs">Page Orientation</label>
                            <select
                                value={newTemplateOrientation}
                                onChange={(e) => setNewTemplateOrientation(e.target.value)}
                                className="col-span-9 h-7 px-2 border border-slate-200 rounded-md focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 outline-none bg-white transition-all cursor-pointer text-xs"
                            >
                                <option>Landscape</option>
                                <option>Portrait</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700 text-xs">Columns</span>
                                <button className="h-6 px-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition-colors shadow-2xs flex items-center gap-1 text-[11px]">
                                    <Plus size={12} strokeWidth={2.5} /> Add Column
                                </button>
                            </div>

                            <div className="border border-slate-200 rounded-md overflow-hidden shadow-2xs overflow-x-auto no-scrollbar">
                                <table className="w-full text-xs border-collapse min-w-[500px]">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="w-7 py-1.5 border-r border-slate-200"></th>
                                            <th className="px-2.5 py-1.5 text-left font-semibold text-slate-600 border-r border-slate-200 text-[11px]">Column Name</th>
                                            <th className="px-2.5 py-1.5 text-left font-semibold text-slate-600 border-r border-slate-200 text-[11px]">Header Text</th>
                                            <th className="px-2.5 py-1.5 text-center font-semibold text-slate-600 border-r border-slate-200 text-[11px] w-12">Order</th>
                                            <th className="px-2.5 py-1.5 text-left font-semibold text-slate-600 border-r border-slate-200 text-[11px] w-16">Align</th>
                                            <th className="px-2.5 py-1.5 text-center font-semibold text-slate-600 text-[11px] w-20">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {templateColumns.map((col) => (
                                            <tr key={col.id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="w-7 text-center border-r border-slate-100 py-1.5 text-slate-400">
                                                    <GripVertical size={13} className="mx-auto cursor-pointer" />
                                                </td>
                                                <td className="px-2.5 py-1.5 border-r border-slate-100 text-slate-700">{col.name}</td>
                                                <td className="px-2.5 py-1.5 border-r border-slate-100 text-slate-700 font-medium">{col.header}</td>
                                                <td className="px-2.5 py-1.5 border-r border-slate-100 text-center text-slate-700">{col.order}</td>
                                                <td className="px-2.5 py-1.5 border-r border-slate-100 text-slate-700">{col.align}</td>
                                                <td className="px-2.5 py-1.5 text-center">
                                                    <div className="flex items-center justify-center gap-1.5 text-slate-400">
                                                        <button className="hover:text-blue-600 transition-colors"><Edit size={13} /></button>
                                                        <button className="hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                                                        <button className="hover:text-slate-600 transition-colors"><Menu size={13} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 sticky bottom-0 bg-white">
                            <button
                                onClick={() => setIsAddTemplateModalOpen(false)}
                                className="h-7.5 px-3 border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-all font-medium text-xs shadow-2xs"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setIsAddTemplateModalOpen(false)}
                                className="h-7.5 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all font-semibold shadow-2xs text-xs"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderFilters = () => {
        const handleEditTemplate = (e: any) => {
            e.preventDefault();
            setIsTemplateListModalOpen(true);
        };
        switch (activeReport) {
            case 'Arrival List':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Arrival</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                    <option>Deluxe</option>
                                    <option>Suite</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Show Amount</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Rent Per Night</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input type="text" className="flex-1 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    <span>To</span>
                                    <input type="text" className="flex-1 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Reservation Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-2">Remarks</label>
                                <div className="col-span-2 border rounded h-24 overflow-y-auto p-2 bg-white text-xs">
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" /> Select All</label>
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" defaultChecked /> Check In</label>
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" /> Check Out</label>
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" /> Guest Folio</label>
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" defaultChecked /> House Keeping</label>
                                    <label className="flex items-center gap-2 mb-1"><input type="checkbox" /> Important Info</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Internal Note</label>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Company</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Travel Agent</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Market</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3 flex items-center justify-end gap-2 pt-2">
                                    <span className="font-medium text-slate-700 text-xs">Tax Inclusive Rates (Disc./Adj. included, if applied)</span>
                                    <input type="checkbox" className="w-4 h-4 ml-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Cancelled Reservation':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Cancelled From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                    <option>Rack Rate</option>
                                    <option>Corporate Rate</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                    <option>Direct</option>
                                    <option>OTA</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                    <option>Deluxe</option>
                                    <option>Suite</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Cancelled By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                    <option>Admin</option>
                                    <option>Manager</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Travel Agent</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>ALL</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3">
                                    <div className="flex items-center justify-between gap-2 pt-2">
                                        <span className="font-medium text-slate-700 text-xs">Tax Inclusive Rates (Disc./Adj. included, if applied)</span>
                                        <input type="checkbox" className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Country Wise Reservation Statistics':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Date Type</label>
                                    <div className="col-span-2 flex gap-4">
                                        <label className="flex items-center gap-2"><input type="radio" name="dateType" defaultChecked /> Created</label>
                                        <label className="flex items-center gap-2"><input type="radio" name="dateType" /> Arrival</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button onClick={handleEditTemplate} className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            {/* Right Column Empty for this report as per screenshot */}
                            <div></div>
                        </div>
                    </div>
                );
            case 'Departure List':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Departure</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Market</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3 flex items-center gap-2 pt-2">
                                    <span className="font-medium text-slate-700 text-xs">Tax Inclusive Rates (Disc./Adj. included, if applied)</span>
                                    <input type="checkbox" className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Reservation Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <input type="text" className="flex-1 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    <span>To</span>
                                    <input type="text" className="flex-1 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Travel Agent</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Company</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Forecast Report':
                return (
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-8">
                            <div className="flex items-center gap-2">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="relative">
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                </div>
                                <span>To</span>
                                <div className="relative">
                                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-medium text-slate-700 text-xs">Report Type</label>
                                <select className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white min-w-[200px]">
                                    <option>Totals by Date</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'No Show Reservation':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">NoShow From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button onClick={handleEditTemplate} className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-end gap-2 pt-2">
                                    <span className="font-medium text-slate-700 text-xs">Tax Inclusive Rates (Disc./Adj. included, if applied)</span>
                                    <input type="checkbox" className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Release Reservation List':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Release Date</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Reservation Activity':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {/* Left Column */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Promotion Name</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Affiliate</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">User</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Select</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Travel Agent</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Package Name</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                    <div className="col-span-2 flex gap-4">
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Rate Type</label>
                                        <label className="flex items-center gap-2"><input type="checkbox" /> Special Package</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <div className="col-span-3 flex items-center justify-end gap-2 pt-2">
                                        <span className="font-medium text-slate-700 text-xs">Tax Inclusive Rates (Disc./Adj. included, if applied)</span>
                                        <input type="checkbox" className="w-4 h-4 ml-2" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Full Width Column Selection */}
                        <div className="grid grid-cols-12 items-start mt-4">
                            <label className="col-span-2 font-medium text-gray-700 pt-1">Select Column(Min. 5 / Max. 7)</label>
                            <div className="col-span-12 md:col-span-10 flex flex-wrap gap-4">
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Rate Type</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Ofrd. Rate</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Balance</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Revenue</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> GTD</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> User</label>
                                <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Affiliate</label>
                                <label className="flex items-center gap-2"><input type="checkbox" /> Extra Charge</label>
                                <label className="flex items-center gap-2"><input type="checkbox" /> Extra Charge Total</label>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 items-center w-full md:w-1/2">
                            <label className="font-medium text-slate-700 text-xs">Report Template</label>
                            <div className="col-span-2 flex gap-2">
                                <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Default</option>
                                </select>
                                <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                            </div>
                        </div>
                    </div>
                );
            case 'Void Reservation':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Void From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button onClick={handleEditTemplate} className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Advance Deposit Ledger':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3 flex items-center gap-2">
                                    <span className="font-medium text-gray-700 w-1/3">Show all Deposits/Advance collected</span>
                                    <input type="checkbox" className="w-4 h-4" />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Ageing Debtors - Detail':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">City Ledger</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>ALL</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Transaction Date From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            {/* Extra Buttons specific to this report */}
                            <div className="flex justify-end pt-4">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">Ageing Periods</button>
                            </div>
                        </div>
                    </div>
                );
            case 'Ageing Debtors - Summary':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>

                            <div className="col-span-3 pt-2">
                                <span className="font-medium text-gray-800">Below Settings Available only for send Email Functionality :</span>
                            </div>

                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Account Name</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>ALL</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3 flex items-center justify-end gap-2 pt-8">
                                    <input type="checkbox" checked className="w-4 h-4 ml-2" />
                                    <span className="font-medium text-slate-700 text-xs">Show Folios Detail</span>
                                </div>
                            </div>

                            {/* Extra Buttons specific to this report */}
                            <div className="flex justify-end pt-4 gap-2">
                                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">Ageing Periods</button>
                                <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm">Send Email</button>
                            </div>
                        </div>
                    </div>
                );
            case 'Cashier Sales Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From Posting Date</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Date</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'City Ledger - Detail':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">City Ledger</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>A to Z Pharma</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">City Ledger From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'City Ledger - Summary':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-gray-700 w-full text-right pr-4">Ignore zero balance account</label>
                                    <input type="checkbox" className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Complimentary Room Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Select Year</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>2024</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Nights By</label>
                                <div className="col-span-2 flex items-center gap-4">
                                    <label className="flex items-center gap-1"><input type="radio" name="nightsBy" defaultChecked /> Whole Stay</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="nightsBy" /> Nights in month</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Select Month</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>June</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Credit Card Process - Detail':
                return (
                    <div className="grid grid-cols-1 items-center gap-4">
                        <div className="flex flex-wrap items-center gap-4">
                            <label className="font-medium text-slate-700 text-xs">Process From</label>
                            <div className="flex items-center gap-2">
                                <input type="date" value="2026-01-14" className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                                <input type="time" value="00:00" className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <span>To</span>
                            <div className="flex items-center gap-2">
                                <input type="date" value="2026-01-15" className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                                <input type="time" value="00:00" className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>

                            <label className="font-medium text-gray-700 ml-4">Type</label>
                            <select className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white w-32">
                                <option>All</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-slate-700 text-xs">Exclude Void Entries</label>
                            <input type="checkbox" className="w-4 h-4 check-box connection" />
                        </div>
                    </div>
                );
            case 'Daily Extra Charge - Detail':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Date</label>
                                <div className="col-span-2 flex items-center gap-4">
                                    <label className="flex items-center gap-1"><input type="radio" name="dateType" defaultChecked /> Charge/Posting</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="dateType" /> Departure</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Received By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Date</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-1">Include</label>
                                <div className="col-span-2 grid grid-cols-2 gap-2 text-sm">
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> All</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Confirm Reserved</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Cancelled</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> No Show</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Inhouse</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> Checked Out</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Transaction Date From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Extra Charge</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Housekeeping Summary':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Maintenance Block':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Block From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Manager Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As on Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Meal Plan':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As On Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Room No.</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Meal Plan</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Meal Planner':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As on Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                );
            case 'Owner Statement':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Owner</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>All</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'PG - Authorize Capture':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Payment Gateway :</label>
                                <span className="col-span-2 text-gray-900">zeamster</span>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Transaction Date From :</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-1">Show :</label>
                                <div className="col-span-2 flex flex-col gap-1">
                                    <label className="flex items-center gap-2"><input type="checkbox" defaultChecked /> Only Authorize not Captured</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Authorized & Captured</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Authorized & Vold</label>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Rate Card':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Source</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Ignore Zero Rate</label>
                                <input type="checkbox" className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Inclusive Tax</label>
                                <input type="checkbox" className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </div>
                );
            case 'Revenue By Rate Type':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As On Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Rate Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Revenue By Room Type':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As On Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Receipt From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Payment Method</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Payment For</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Received By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Daily Receipt - Summary':
                return (
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                            <div className="flex items-center gap-2">
                                <label className="font-medium text-slate-700 text-xs">Payment From</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                                <span>To</span>
                                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white min-w-[150px]">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="font-medium text-gray-700 w-24">Payment For</label>
                            <select className="h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white min-w-[200px]">
                                <option>--Select--</option>
                            </select>
                        </div>
                    </div>
                );
            case 'Daily Refund Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Receipt From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Payment Method</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Received By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Daily Revenue':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As On Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Daily Revenue By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <p className="font-semibold text-gray-800 mb-2">Below Settings Available only for Export Functionality :</p>
                            <label className="font-medium text-gray-700 block mb-1">Taxes</label>
                            <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                <div className="flex flex-col gap-1">
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Select All</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> City 6%</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> FNB Tax 5%</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> IVA</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> State 8%</label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Detail Discount Report':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {/* Left Side */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Type</label>
                                    <div className="col-span-2 flex items-center gap-4">
                                        <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> Room Folio</label>
                                        <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> POS Folio</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">User</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Detail Revenue Report':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            {/* Left Column */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Date</label>
                                    <div className="col-span-2 flex items-center gap-4 text-sm">
                                        <label className="flex items-center gap-1"><input type="radio" name="revDate" defaultChecked /> Booking</label>
                                        <label className="flex items-center gap-1"><input type="radio" name="revDate" /> Stay</label>
                                        <label className="flex items-center gap-1"><input type="radio" name="revDate" /> Departure</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                                <div className="col-span-3 space-y-1 mt-2">
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Show Only Unassign Rooms</label>
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Show Unposted Inclusion</label>
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Room</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>--Select--</option>
                                    </select>
                                </div>
                                <div className="col-span-3 mt-2">
                                    <label className="flex items-center gap-2"><input type="checkbox" /> Discard Unconfirmed Bookings</label>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="font-semibold text-gray-800 mb-2">Below Settings Available only for Export Functionality :</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="font-medium text-gray-700 block mb-1">Extra Charges</label>
                                    <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Select All</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Room Posting</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Airport Pickup</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Ballon</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Breakfast with Lunch or Dinner</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> channel</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Damage</label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700 block mb-1">Payment Method</label>
                                    <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Select All</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Bitcoin</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Cash</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Credit Card</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Debit Card</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Rakbank</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Shift4</label>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="font-medium text-gray-700 block mb-1">Taxes</label>
                                    <div className="border rounded p-2 h-32 overflow-y-auto bg-white">
                                        <div className="flex flex-col gap-1 text-sm">
                                            <label className="flex items-center gap-2"><input type="checkbox" /> Select All</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> City 6%</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> FNB Tax 5%</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> IVA</label>
                                            <label className="flex items-center gap-2"><input type="checkbox" /> State 8%</label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-6 mt-4">
                                <label className="flex items-center gap-2"><input type="checkbox" /> Show Mobile No. field</label>
                                <label className="flex items-center gap-2"><input type="checkbox" /> Show Email field</label>
                            </div>
                            <p className="text-sm mt-4 text-gray-800">NOTE : Nights will calculate on Primary(Master) folio. In second folio, Nights will show as '-'</p>

                            <div className="grid grid-cols-3 items-center mt-4">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-1 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Expense Voucher':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Transaction Date From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Charges</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Financial Report':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Type</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Daily Financial Report</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Options</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Detailed - Room Order</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Folio List':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Date</label>
                                <div className="col-span-2 flex items-center gap-4 text-sm">
                                    <label className="flex items-center gap-1"><input type="radio" name="folioDate" defaultChecked /> Transaction</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="folioDate" /> Arrival</label>
                                    <label className="flex items-center gap-1"><input type="radio" name="folioDate" /> Departure</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Status</label>
                                <div className="col-span-2 flex items-center gap-4">
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> Paid</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> Unpaid</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Folio Mode</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Both</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-1">Include</label>
                                <div className="col-span-2 grid grid-cols-2 gap-1 text-sm">
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> All</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Reserved</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Cancelled</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> No Show</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Checked In</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Checked Out</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Void</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Unconfirmed Reservation</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Business Source</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Type</label>
                                <div className="col-span-2 flex items-center gap-4">
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> Room Folio</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" defaultChecked /> POS Folio</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Folio No</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Guest Ledger':
                return (
                    <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Guest Ledger Date</label>
                                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Currency</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>$</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                    <div className="col-span-2 flex gap-2">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                            <option>Default</option>
                                        </select>
                                        <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Show Charges</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Both</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'House Status':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        {/* Left Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As On Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">House Keeper</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-1">Status</label>
                                <div className="col-span-2 flex flex-wrap gap-2 text-sm">
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Occupied Clean</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Occupied Dirty</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Ready for Inspection</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Vacant Clean</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Vacant Dirty</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-start">
                                <label className="font-medium text-gray-700 pt-1">Room Status</label>
                                <div className="col-span-2 flex flex-wrap gap-2 text-sm">
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Arrival</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Checked Out</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Due Out</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Confirmed Reservation</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Maintenance Block</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Stayover</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> Dayuse</label>
                                    <label className="flex items-center gap-1"><input type="checkbox" /> To Be Checked Out</label>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Room Type</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <div className="col-span-3">
                                    <label className="flex items-center gap-2 font-medium text-gray-700 justify-end"><span className="text-right w-full pr-12">Show Only Active Rooms</span><input type="checkbox" defaultChecked className="mr-auto" /></label>
                                    <div className="col-span-2 relative">
                                        <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white h-24" multiple>
                                            <option value="All" selected>All</option>
                                            <option value="Chambre simple">Chambre simple</option>
                                            <option value="FAMILY ROOM">FAMILY ROOM</option>
                                            <option value="TWIN ROOM">TWIN ROOM</option>
                                            <option value="DELUXE ROOM">DELUXE ROOM</option>
                                            <option value="KING ROOM">KING ROOM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <input type="checkbox" defaultChecked />
                                    <label className="font-medium text-slate-700 text-xs">Show Including Inactive Rooms</label>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Transaction Detail Report':
                return (
                    <div className="grid grid-cols-1 gap-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">From</label>
                                    <div className="col-span-2 flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                        <span>To</span>
                                        <div className="relative flex-1">
                                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Type of Data</label>
                                    <div className="col-span-2 flex items-center gap-4">
                                        <label className="flex items-center gap-1"><input type="radio" name="type" defaultChecked /> Transaction Date</label>
                                        <label className="flex items-center gap-1"><input type="radio" name="type" /> Checkout/Cancel/No Show</label>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 items-center">
                                    <label className="font-medium text-slate-700 text-xs">Sort By</label>
                                    <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Reservation No</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                            <label className="font-medium text-gray-700 md:col-span-1">Columns</label>
                            <div className="md:col-span-5 h-48 overflow-y-auto border rounded p-2 bg-white">
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Select All Fields</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Transaction Type</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Reservation #</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Group Code</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Reservation Date</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Folio #</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Invoice #</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Invoice date</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Arrival</label>
                                <label className="flex items-center gap-2 hover:bg-gray-50 p-1"><input type="checkbox" defaultChecked /> Dept.</label>
                            </div>
                        </div>
                    </div>
                );
            case 'Travel Agent Commission - Detail':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Commission Plan</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Travel Agent</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Tax Inclusive Room Charges</label>
                                <input type="checkbox" className="w-4 h-4 ml-1" />
                            </div>
                        </div>
                    </div>
                );
            case 'Travel Agent Commission - Summary':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'Weekly Manager Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">As on Date</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Currency</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>$</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Weekly Meal Plan Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 focus:border-blue-500" />
                            </div>
                        </div>
                    </div>
                );
            case 'Work Order List':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Entered On</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Category</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Clean</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Status</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Assigned</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Unit</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>102</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Priority</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>High</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Assigned To</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>harry</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Audit Trails':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Operation</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>All</option>
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">User</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'IP Report':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Opened From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Opened By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Void Charge':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Charge</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Room Posting</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Abhishek</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Void Payment':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Payment Method</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>Select</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'Void Transaction':
                return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void From</label>
                                <div className="col-span-2 flex items-center gap-2">
                                    <div className="relative flex-1">
                                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                    <span>To</span>
                                    <div className="relative flex-1">
                                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Report Template</label>
                                <div className="col-span-2 flex gap-2">
                                    <select className="w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                        <option>Default</option>
                                    </select>
                                    <button className="px-2 border rounded hover:bg-gray-50"><Edit size={14} /></button>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="grid grid-cols-3 items-center">
                                <label className="font-medium text-slate-700 text-xs">Void By</label>
                                <select className="col-span-2 w-full h-7 px-2 py-0.5 text-xs border border-slate-200 rounded outline-none focus:border-blue-500 bg-white">
                                    <option>--Select--</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            default:
                return <p className="text-gray-500 py-10 text-center">Select a report from the sidebar.</p>;
        }
    };

    const renderHelpGuide = () => {
        if (activeReport === 'City Ledger - Detail') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        City Ledger also called the non-guest ledger is the collection of non-guest accounts. This report will give you detailed information of account receivables, which can contain credit card payment accounts, direct billing accounts, and accounts of past guest due for collection by the hotel.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <p className="text-gray-600 mb-6">
                        City Ledger - Detail out for specific date range - Opening Balance/Debit/Credit/Closing Balance can be matched with City Ledger - Summary pulled out for same date range - account wise/total for cross-checking data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Show posted date</p>
                        <p><span className="font-semibold">Guest Name:</span> Name of the guest</p>
                        <p><span className="font-semibold">Invoice No.:</span> Invoice number</p>
                        <p><span className="font-semibold">Arr.:</span> Arrival Date of booking property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dep.:</span> Departure date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Reference:</span> Displays Room No, Folio No and commments</p>
                        <p><span className="font-semibold">Credits:</span> Shows the Credit amount of the account receivable in the property's base currency</p>
                        <p><span className="font-semibold">Debits:</span> Shows the Debit amount of the account receivable in the property's base currency</p>
                        <p><span className="font-semibold">Balance:</span> Shows closing balance of specific date(report pull date) in property's base currency</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'City Ledger - Summary') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        City Ledger, also called the non-guest ledger is the collection of non guest accounts. This report will give you summarized data of account receivables, which can contain credit card payment accounts, direct billing accounts, and accounts of past guest due for collection by the hotel.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6">
                        <p>1) City Ledger - Summary pulled out for specific date range - Opening Balance/Debit/Credit/Closing Balance can be matched with City Ledger - Detail pulled out for same date range - account wise/total for cross checking data.</p>
                        <p>2) City Ledger - Summary pulled out for specific date range Debit/Credit/Closing Balance column total can be matched with the Manager Report, City Ledger section (PTD), for cross checking data.</p>
                        <p className="text-red-500 text-sm">Note : Manager Report should be pulled out by To date of CityLedger - Summary Report to fulfill this data match.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Account Name:</span> Name of the account receivable</p>
                        <p><span className="font-semibold">Contact Person:</span> Contact person name of the account receivable</p>
                        <p><span className="font-semibold">Phone:</span> Contact no of the account receivable</p>
                        <p><span className="font-semibold">Opening Balance:</span> Shows start up balance of the account receivable from particular date selected for pulling out report (From Date) in property's base currency</p>
                        <p><span className="font-semibold">Debit:</span> Shows Debit amount of the account receivable in property's base currency. The amount of accounts receivable is increased on the debit side</p>
                        <p><span className="font-semibold">Round Off:</span> Shows adjustments of bookings, applicable on room charges in property's base currency</p>
                        <p><span className="font-semibold">Credit:</span> Shows Credit amount of the account receivable in property's base currency. The amount of accounts receivable is decreased on the credit side</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Complimentary Room Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you a sell as complimentary room based reservation on the date selected in the property management system.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. No:</span> Reservation no of booking</p>
                        <p><span className="font-semibold">Folio No:</span> Folio No of a booking</p>
                        <p><span className="font-semibold">Room No:</span> Room Information of a booking</p>
                        <p><span className="font-semibold">Guest:</span> Name of the Guest</p>
                        <p><span className="font-semibold">Arrival Date:</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Departure Date:</span> Departure Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Source:</span> A business source of the booking</p>
                        <p><span className="font-semibold">No. of Nights:</span> If Nights By filter set to Whole Stay, then report will show Nights of whole booking and if Nights by filter set to Nights in month, then report will show nights of that booking for selected month</p>
                        <p><span className="font-semibold">Pax (A/C):</span> Shows adult/child of booking</p>
                        <p><span className="font-semibold">Remarks:</span> Show the booking remarks</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Daily Receipt - Detail') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you daily receipt information based on the date selected in the property management system. We do provide manual provision for data to be taken out as "Export to XLSX".
                    </p>
                    <p className="text-red-500 mb-6 text-sm">
                        Note : Currency option will be used to generate reports in particular currency.
                    </p>
                </>
            );
        }
        if (activeReport === 'Daily Receipt - Summary') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you daily receipt information based on the date selected in the property management system. We do provide manual provision for data to be taken out as "Export to XLSX".
                    </p>
                    <p className="text-red-500 mb-6 text-sm">
                        Note : Currency option will be used to generate reports in particular currency.
                    </p>
                </>
            );
        }
        if (activeReport === 'Daily Refund Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you daily refund information based on the date selected in the property management system. We do provide manual provision for data to be taken out as "Export to XLSX".
                    </p>
                    <p className="text-red-500 mb-6 text-sm">
                        Note : Currency option will be used to generate reports in particular currency.
                    </p>
                </>
            );
        }
        if (activeReport === 'Daily Revenue') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you revenue of specific posting date for selected revenue account.We do provide manual provision for data to be taken out as "Export To Excel".
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6">
                        <p>1) Daily Revenue pulled out for some specific date, its Room Charges column total can be matched with Manager or Weekly Manager Report for same date, Room Charges block - Room Charges for cross-checking data.</p>
                        <p>2) Daily Revenue pulled out for some specific date, its Room Charges, Discount and Round Off summation of column total can be matched with Monthly Revenue By Income Stream report for same date - Room Charges with Discount, Rate column total. Also Tax column total of Daily Revenue can be matched Monthly Revenue By Income Stream - Room Charges tax column total for cross-checking data.</p>
                        <p>3) Daily Revenue report when pulled out by Cancellation Revenue for a specific date can be matched with Cancelled Reservation report - Cancellation Revenue column total for cross-checking.</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Detail Discount Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you discounts data based on the date selected in the property management system. It includes discounts applicable on bookings as well as incidental invoices based on the options you select for report filtration.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <p className="text-gray-600 mb-6">
                        1) Detail Discount Report pulled out for specific date, its Amount column total can be matched with Manager or Weekly Manager Report for same date, by manually adding all discounts (Room Charge Level + Extra Charge Level + Folio Level) for cross-checking data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Posting date of discounts on bookings in property's full format set in the configuration panel</p>
                        <p><span className="font-semibold">Invoice No:</span> Shows invoice nos for bookings and incidental invoices</p>
                        <p><span className="font-semibold">Name:</span> Shows discount name of bookings</p>
                        <p><span className="font-semibold">Reference:</span> Shows brief description of booking/incidental invoices</p>
                        <p><span className="font-semibold">User:</span> User who has posted the discount</p>
                        <p><span className="font-semibold">Amount:</span> Shows discount amount in property's base currency</p>
                        <p><span className="font-semibold">Remark:</span> Shows discount definition</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Detail Revenue Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you detailed revenue data based on the date selected in the property management system. By the following filters, this report will give you detailed revenue data accordingly.
                    </p>
                </>
            );
        }
        if (activeReport === 'Expense Voucher') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you expense voucher data based on the date selected in the property management system.
                    </p>
                </>
            );
        }
        if (activeReport === 'Financial Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        The Daily Financial Report allows hoteliers to get an overview of financial transactions, including details on room orders, payments, and a summary of guest activities. This report helps in tracking income, guest status, and other essential financial data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">Report Options:</h3>

                    <h4 className="font-semibold text-gray-700 mb-1">Selecting the Report Type:</h4>
                    <p className="text-gray-600 mb-3">
                        By default, the "Daily Financial Report" will be chosen. When selected, an additional option will appear to let you filter the report further. Here are the choices:
                    </p>
                    <p className="text-gray-600 mb-1"><span className="font-semibold">Detailed - Room Order:</span> Displays detailed information on each room and related charges.</p>
                    <p className="text-gray-600 mb-3"><span className="font-semibold">Summary:</span> Provides a condensed overview of the day's financial data.</p>

                    <h4 className="font-semibold text-gray-700 mb-1">Choosing a Date Range:</h4>
                    <p className="text-gray-600 mb-4">
                        The date range must match the month you're working within. For example, if today's date is November 17, the available range will be from November 10 to November 17. Dates outside this period will not be selectable.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">Report Details:</h3>
                    <p className="text-gray-600 mb-1"><span className="font-semibold">Combined Report:</span> This report combines both detailed and summarized views to give a complete picture of the day's financial activity.</p>
                    <p className="text-gray-600 mb-1"><span className="font-semibold">Guest List:</span> Only shows information on guests who are currently staying at the hotel.</p>
                    <p className="text-gray-600 mb-4"><span className="font-semibold">Reservations and Payments:</span> If a reservation has been made for today or any future date, it will only appear if an advance payment has been made. In such cases, the room charges will be shown as zero. Only the payment made will be displayed.</p>

                    <h3 className="font-semibold text-gray-800 mb-2">Report Sources and Calculations:</h3>
                </>
            );
        }
        if (activeReport === 'Folio List') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you folio data based on the date selected in the property management system.
                    </p>
                </>
            );
        }
        if (activeReport === 'Guest Ledger') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-2">
                        Guest Ledger, is the account receivable of the registered guest who have not checked out and who are occupying rooms at the property including all revenues from the rental of guest rooms at the property, together with any sales or taxes. This report will give you data of the account receivables as well as data of on hold payments.
                    </p>
                    <p className="text-red-500 text-sm mb-6">Note :Hold payments are usually those payments where hoteliers void payments post checkout for bookings and thus bookings are left unsettled. Ideally it is considered as users mistake.</p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-4 text-gray-600 mb-6">
                        <p>1) Guest Ledger pulled out for some specific date, its Advance column total can be matched with Manager or Weekly Manager Report for same date, Advance Deposit Ledger block - Balance Transfer To Guest Ledger and Guest Ledger - Transfer from Advance Deposit for cross-checking data.</p>
                        <p>2) Guest Ledger pulled out for some specific date, its Balance B/F, Charges, Credits and Balance Column Total can be matched with Manager or Weekly Manager Report for same date, Guest Ledger Block - Opening Balance, Charges Posted To Guest Ledger, Settlement By Guest and Closing Balance.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Room No:</span> Room information of guest</p>
                        <p><span className="font-semibold">Rate Type:</span> Shows rate type of bookings</p>
                        <p><span className="font-semibold">Guest Name:</span> Name of the Guest</p>
                        <p><span className="font-semibold">Rate Type:</span> Rate Type of booking</p>
                        <p><span className="font-semibold">Arrival:</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dept.:</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Advance:</span> Shows advance collected for bookings in property's base currency</p>
                        <p><span className="font-semibold">Balance B/F:</span> Shows balance brought forward of past date of bookings in property's base currency</p>
                        <p><span className="font-semibold">Charges:</span> Shows charges raised for booking on specific date(report pull date) in property's base currency</p>
                        <p><span className="font-semibold">Credits:</span> Shows payments received on booking in property's base currency</p>
                        <p><span className="font-semibold">Balance:</span> Shows closing balance of specific date(report pull date) in property's base currency</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'House Status') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        The house status report provides details on room status, room remarks, and current guests. This report provides details on the reservations that the Housekeeping department might find useful in scheduling of service.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Unit/Room:</span> Shows Room numbers based on room type selection. If user does not select any room type then this will show all room numbers of all room types.</p>
                        <p><span className="font-semibold">Room Type:</span> Shows Room Type of room.</p>
                        <p><span className="font-semibold">Guest:</span> Shows Guest Name if there is any guest staying in the room.</p>
                        <p><span className="font-semibold">Pax (A/C) (Pet):</span> Display current Pax (Adult/Child) and Pet of a booking.</p>
                        <p><span className="font-semibold">Status:</span> Shows current status of the room. For example, Clean, Dirty, etc.</p>
                        <p><span className="font-semibold">Availability:</span> Shows Room Availability if room is vacant, Otherwise it will show current status of reservation.</p>
                        <p><span className="font-semibold">House Keeper:</span> Shows House Keeper name if assigned any.</p>
                        <p><span className="font-semibold">Check-In Date:</span> Shows arrival date of reservation.</p>
                        <p><span className="font-semibold">Check-Out Date:</span> Shows departure date of reservation.</p>
                        <p><span className="font-semibold">HK Remarks:</span> Shows House Keeping remarks.</p>
                        <p><span className="font-semibold">FD Remarks:</span> Shows frontoffice house keeping remarks.</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Housekeeping Summary') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you summarized data of arrivals, stayovers and departures with Occupancy% for a particular stay date so housekeeper can perform housekeeping of inhouse guest rooms properly. We do provide manual provision for data to be taken out as "Export to CSV".
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Housekeeping Summary report pulled out for specific date range, Occupancy% total can be matched with Room Sales Statistics report for the same date range, Occ% total for cross-checking statistical data.</p>
                        <p>2) Housekeeping Summary report pulled out for any one date, Occupancy% total can be matched with Manager Report and Weekly Manager Report for the same date in Statistics section, Occupancy Rate (%) for cross-checking statistical data.</p>
                        <p>3) Housekeeping Summary report pulled out for any one date, Occupancy% total can be matched with Monthly Statistics report for that same month, Occ % of that date for cross checking data.</p>
                        <p>4) Housekeeping Summary report pulled out for any one date, Occupancy% total can be matched with Monthly Summary report that same month, Occupancy % for cross-checking data.</p>
                        <p>5) Housekeeping Summary report pulled out for any one date, Occupancy% total can be matched with Monthly Occupancy for same date for cross-checking data.</p>
                        <p>6) Housekeeping Summary report pulled out for any one date, Occupancy% total can be matched with Statistics - By Room Type pulled out Occupancy % wise for same date for cross-checking data.</p>
                        <p>7) Housekeeping Summary report pulled out for any one date - Arrival + Stayover can be matched with Room Status Report of same date - Occupied Rooms + Reserve Rooms for cross-checking data.</p>
                        <p>8) Housekeeping Summary report pulled out for any one date - Arrival + Stayover can be matched with Room Availability Report for same date - Arrived + Dayuse + Dayuse Reservation + Stayover + Confirmed Reservation for cross-checking data.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Shows stay date of guest in property's full format set in the configuration panel</p>
                        <p><span className="font-semibold">Arrival:</span> Shows guest arrived count</p>
                        <p><span className="font-semibold">Stayover:</span> Shows guest stayover count</p>
                        <p><span className="font-semibold">Departure:</span> Shows guest about to departure count</p>
                        <p><span className="font-semibold">Occupancy %:</span> Shows inhouse Occupancy %</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Maintenance Block') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you blocks done based on the date selected in the property management system. We store the block date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Maintenance Block report pulled out for any one date (Total count of blocked rows) can be matched with Manager Report and weekly manager report for the same date in Today's column - Room Summary block, Block room for cross-checking statistical data.</p>
                        <p>2) Maintenance Block report pulled out for any one date (Total no of rooms by room name) can be matched with Room Status report for the same date in Blocked Rooms section for cross-checking statistical data.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Room:</span> Shows blocked room name</p>
                        <p><span className="font-semibold">Room Type:</span> Shows blocked room type of a room</p>
                        <p><span className="font-semibold">From Date:</span> Blocked from date of a room</p>
                        <p><span className="font-semibold">To Date:</span> Blocked till date of a room</p>
                        <p><span className="font-semibold">Blocked On:</span> Shows date on which blocked is performed</p>
                        <p><span className="font-semibold">Blocked By:</span> User has blocked the room</p>
                        <p><span className="font-semibold">Reason:</span> Shows blocked remarks (reason for blocking room)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Manager Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        The Manager Report provides a comprehensive daily overview of the property's performance. It includes key statistics, revenue breakdown, and operational metrics for the selected date.
                    </p>
                </>
            );
        }
        if (activeReport === 'Meal Plan') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report details the meal plans sold with room bookings for the selected date range, helping usage tracking and kitchen planning.
                    </p>
                </>
            );
        }
        if (activeReport === 'Meal Planner') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        The Meal Planner report helps in forecasting kitchen requirements based on upcoming bookings and their associated meal plans.
                    </p>
                </>
            );
        }
        if (activeReport === 'Owner Statement') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        In some hotels, room management is done by room owner's profile in which rooms are assigned to owners. Since these owners are considered as investors of the property, you need to pay them commission for the revenue generated by these rooms. This report will help you to gather detail level of commission data on the bookings raised for room owners in specific duration. We do provide manual provision for 'All' room owner data to be taken out as "Export to CSV".
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Guest Name:</span> Name of the Guest</p>
                        <p><span className="font-semibold">Room No:</span> Room information of guest</p>
                        <p><span className="font-semibold">Check In:</span> Arrival Date of booking in property's full format set In the configuration panel</p>
                        <p><span className="font-semibold">Check Out:</span> Departure Date of a booking in property's full format set in the configuration panel</p>
                        <p><span className="font-semibold">Plan Value:</span> Plan value of the room owner possibly in flats or percentage</p>
                        <p><span className="font-semibold">Plan Name:</span> Plan name of the room owner, can be Fixed amount per night, Fixed amount per stay, % on all nights (excl. tax), % on all nights (incl. tax)</p>
                        <p><span className="font-semibold">Rent:</span> Shows total room charges posted on booking (tax exclusive) in property's base currency</p>
                        <p><span className="font-semibold">Tax:</span> Shows taxes of booking in property's base currency</p>
                        <p><span className="font-semibold">Extra Charges:</span> Shows total extra charges posted on booking (tax exclusive) in property's base currency</p>
                        <p><span className="font-semibold">Commission:</span> Shows commission raised for the owner for that particular booking in property's base currency</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'PG - Authorize Capture') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report lists payment gateway authorization and capture transactions, useful for reconciling credit card processing.
                    </p>
                </>
            );
        }
        if (activeReport === 'Rate Card') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        The Rate Card report displays the active rates and rate definitions configured in the system for the selected period.
                    </p>
                </>
            );
        }
        if (activeReport === 'Revenue By Rate Type') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you revenue of selected date for selected rate type.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Revenue By Rate Type report pulled out for Selected date, its Room Revenue RM column can be matched with Manager Report for the same date, Room Charges Today Total block - Room Charges for cross-checking data.</p>
                        <p>2) Revenue By Rate Type report pulled out for Selected date, its PTD Room Revenue RM column can be matched with Manager Report / Revenue By Rate Type Summary Report for the same date, PTD Total block - PTD Room Charges for cross-checking data.</p>
                        <p>3) Revenue By Rate Type report pulled out for Selected date, its YTD Room Revenue RM column can be matched with Manager Report / Revenue By Rate Type Summary Report for the same date, YTD Total block - YTD Room Charges for cross-checking data.</p>
                    </div>

                    <p className="text-red-500 font-semibold text-xs mb-1">Note : 1) Room Revenue / PTD Room Revenue / YTD Room Revenue Calculated on the basis of Configuration - Total Room Revenue Setting.</p>
                    <p className="text-red-500 font-semibold text-xs mb-1">2) In Room Revenue Unconfirm Booking / Maintenance Block / Void reservation are not included.</p>
                    <p className="text-red-500 font-semibold text-xs mb-6">3) In Room Revenue Room charges/Cancellation Revenue/ No show Revenue/Discount/Roundoff charges are included.</p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Rate Type:</span> Shows rate type of bookings</p>
                        <p><span className="font-semibold">Room Nights:</span> Shows Total Nights for specific date</p>
                        <p><span className="font-semibold">Percentage (%):</span> Show Percentage for specific date</p>
                        <p><span className="font-semibold">Room Revenue:</span> Shows room revenue of bookings in property's base currency</p>
                        <p><span className="font-semibold">ADR:</span> Shows Average Daily Rate for specific date</p>
                        <p><span className="font-semibold">PTD Room Nights:</span> Shows Total Nights for selected Month</p>
                        <p><span className="font-semibold">PTD Room Revenue:</span> Shows Total Room Revenue for selected Month On the basis of Configuration setting</p>
                        <p><span className="font-semibold">PTD ADR:</span> Shows Average Daily Rate for selected Month</p>
                        <p><span className="font-semibold">YTD Room Nights:</span> Shows Total Nights for selected Year</p>
                        <p><span className="font-semibold">YTD Room Revenue:</span> Shows Total Room Revenue for selected Year On the basis of Configuration setting</p>
                        <p><span className="font-semibold">YTD ADR:</span> Shows Average Daily Rate for selected Year</p>
                    </div>
                    <p className="text-red-500 font-semibold text-xs mt-4">Note : Percentage(%) / ADR / PTD Room Revenue / PTD ADR/ YTD Room Revenue / YTD ADR will be calculated as per formula which is set in property..</p>
                </>
            );
        }
        if (activeReport === 'Room Type Wise Daily Room Revenue') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you data of room type wise daily room revenue. This report displays revenue without tax (tax exclusive). In this report revenue will consider room charges, extra charges, discount, adjustments.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Room Type Wise Daily Room Revenue Report pulled out for specific date, It's summation of Revenue Section + Extra Charge Section + Tax Section revenue will be matched with Manager or Weekly Manager Report for the same date for cross-checking data.</p>
                        <p>2) Room Type Wise Daily Room Revenue report pulled out for specific date. It can be matched with a Monthly Revenue By Income Stream report, It's Gross amount should be matched with Final SubTotal and Total of Room Charges Rate + Other Extra charges + Other Taxes it will match with particular Room revenue for the same date.</p>
                        <p>3) Room Type Wise Daily Room Revenue report can be matched with the Monthly Statistics Report, It's Room Charges + Extra Charges + Tax column total can be matched with Monthly statistics data for that date.</p>
                        <p>4) Room Type Wise Daily Room Revenue Report pulled out for specific date, It's Total Revenue can be matched with Statistics - By Room Type for the same date.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Charges posted between selected posting dates.</p>
                        <p><span className="font-semibold">Revenue exclusive of taxes:</span> Display all revenues applicable on all booking between stay dates</p>
                        <p><span className="font-semibold">Rate Type:</span> If user select all room type then Room type display as 'All', if user selects some specific room type then room type name will display comma separated and if user selects nothing then room type name will display 'NA'</p>
                        <p><span className="font-semibold">Row Room revenue for:</span> Display room type name</p>
                        <p className="pl-4">- Below will display rooms of particular room type and date wise revenue as it's total.</p>
                        <p><span className="font-semibold">Total Room Revenue:</span> Display the Total revenue exclusive of taxes of a particular room type.</p>
                        <p><span className="font-semibold">Total Service Charges & VAT:</span> Display the taxes applicable on bookings of a particular room type.</p>
                        <p><span className="font-semibold">Sub Total:</span> Display the sum of total revenue and total taxes.</p>
                        <br />
                        <p><span className="font-semibold">Red Color with background color:</span></p>
                        <p><span className="font-semibold">Total Room Revenue:</span> Display the all room types Total revenue exclusive of taxes.</p>
                        <p><span className="font-semibold">Total Service Charges & VAT:</span> Display all room types taxes applicable on bookings.</p>
                        <p><span className="font-semibold">Sub Total:</span> Display the sum of total revenue and total taxes of all room types.</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Transaction Detail Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you details of transactions done based on the date selected in the property management system. This report will help all Indian properties to compare the data with the GST - India report.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Transaction Type:</span> Type of transaction</p>
                        <p><span className="font-semibold">Reservation:</span> Reservation number of booking</p>
                        <p><span className="font-semibold">Group Code:</span> Group booking number</p>
                        <p><span className="font-semibold">Reservation Date:</span> Date of Reservation</p>
                        <p><span className="font-semibold">Folio:</span> Folio number of booking</p>
                        <p><span className="font-semibold">Invoice:</span> Invoice number</p>
                        <p><span className="font-semibold">Invoice date:</span> Invoice Date</p>
                        <p><span className="font-semibold">Arrival:</span> Arrival date of booking</p>
                        <p><span className="font-semibold">Dept:</span> Departure date of booking</p>
                        <p><span className="font-semibold">Room Type:</span> Room Type name</p>
                        <p><span className="font-semibold">Rate Type:</span> Rate Type name</p>
                        <p><span className="font-semibold">Room:</span> Room Number</p>
                        <p><span className="font-semibold">Owner Name:</span> Room owner name</p>
                        <p><span className="font-semibold">Is Paymaster:</span> Is Room paymaster or not if paymaster then 1 else 0</p>
                        <p><span className="font-semibold">Pax:</span> Number of pax</p>
                        <p><span className="font-semibold">Guest Name:</span> Name of Guest</p>
                        <p><span className="font-semibold">VIP Status:</span> VIP status of Guest</p>
                        <p><span className="font-semibold">Nationality:</span> Nationality of Guest</p>
                        <p><span className="font-semibold">Market Code:</span> Booking market code</p>
                        <p><span className="font-semibold">Travel Agent:</span> Travel Agent name of a booking</p>
                        <p><span className="font-semibold">Travel Agent Voucher:</span> Travel Agent voucher number</p>
                        <p><span className="font-semibold">Business Source:</span> Business Source name of a booking</p>
                        <p><span className="font-semibold">Company Name:</span> Name of Company</p>
                        <p><span className="font-semibold">Sales Person Name:</span> Name of SalesPerson</p>
                        <p><span className="font-semibold">Reservation Type:</span> Reservation type like confirm,unconfirm etc</p>
                        <p><span className="font-semibold">Booking Status:</span> Current Status of booking</p>
                        <p><span className="font-semibold">Bill To Name:</span> Bill To Name of a booking</p>
                        <p><span className="font-semibold">RegNo:</span> Tax Registration number of Bill To Contact</p>
                        <p><span className="font-semibold">Transaction:</span> Transaction type like b2b,b2c</p>
                        <p><span className="font-semibold">Transaction Date:</span> Date of Transaction</p>
                        <p><span className="font-semibold">Charge:</span> Charge Name of a booking</p>
                        <p><span className="font-semibold">Extra Charge Type:</span> Type of extra charge like package or normal</p>
                        <p><span className="font-semibold">HSN/SAC:</span> HSN or SAC code of charge</p>
                        <p><span className="font-semibold">Settlement/Particular:</span> Name of Settlement or Particular</p>
                        <p><span className="font-semibold">Reference #:</span> Reference number</p>
                        <p><span className="font-semibold">Username:</span> Name of user who created booking</p>
                        <p><span className="font-semibold">Comment:</span> comment</p>
                        <p><span className="font-semibold">Qty:</span> Number of quantity</p>
                        <p><span className="font-semibold">Actual Rate(Configured Rate):</span> Configured Room Rate</p>
                        <p><span className="font-semibold">Slab Information:</span> Tax slab information</p>
                        <p><span className="font-semibold">Net Amount:</span> Total net amount</p>
                        <p><span className="font-semibold">Discount Name:</span> Name of Discount</p>
                        <p><span className="font-semibold">Discount %:</span> Discount percentage</p>
                        <p><span className="font-semibold">Discount Amount:</span> Total amount of Discount</p>
                        <p><span className="font-semibold">Taxable Amount:</span> Taxable amount which is net amount - discount</p>
                        <p><span className="font-semibold">Tax Name:</span> Name of applied tax</p>
                        <p><span className="font-semibold">Tax %:</span> Tax percentage</p>
                        <p><span className="font-semibold">Tax Amount:</span> Tax amount</p>
                        <p><span className="font-semibold">Adjustment(Room Charge/Extra Charges):</span> Adjustment amount</p>
                        <p><span className="font-semibold">Folio Status:</span> Folio Status</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Travel Agent Commission - Detail') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you detailed information of Travel Agent commission raised for bookings when guest is checked out.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Travel Agent Commission - Detail pulled out for specific date range - Room Room Charges/Commission column total can be matched with Travel Agent Commission - Summary pulled out for same date range - Room Revenue/Commission column group total for cross-checking data.</p>
                        <p>2) Travel Agent Commission - Detail pulled out for specific date range for all Travel Agents - Commission column total can be matched with the Manager Report or Weekly Manager report, City Ledger section - PTD, Outstanding Commission for cross-checking data.</p>
                        <p className="text-red-500 font-semibold text-xs mb-1">Note : Manager Report or Weekly Manager Report should be pulled out by To date of Travel Agent Commission - Detail Report to fulfill this data match.</p>
                        <p>3) Travel Agent Commission - Detail pulled out for specific date range - Commission column total can be matched with the Detail Revenue Report pulled out by departure date for the same date range - Commission total for cross-checking data.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Travel Agent:</span> Name of the agent</p>
                        <p><span className="font-semibold">Stay:</span> Shows Arrival/Departure information of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Guest Name:</span> Name of the Guest</p>
                        <p><span className="font-semibold">Folio No:</span> Folio No of a booking</p>
                        <p><span className="font-semibold">Voucher No:</span> Voucher No of a booking</p>
                        <p><span className="font-semibold">Commission Plan:</span> Shows commission plan applied for booking</p>
                        <p><span className="font-semibold">Room Charges:</span> Shows total room charges as tax inclusive or exclusive collected of a booking in property's base currency (based on Tax Inclusive Room Charges filter option checked)</p>
                        <p><span className="font-semibold">Commission:</span> Shows commission raised for bookings Travel Agent wise in property's base currency</p>
                        <p><span className="font-semibold">Check In By:</span> User who has made the guest checked in</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Travel Agent Commission - Summary') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you summarized Travel Agent wise commission data raised for bookings when guest is checked out.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Travel Agent Commission - Summary pulled out for specific date range - Room Revenue/Commission column total can be matched with Travel Agent Commission - Detail pulled out for same date range - Room Charges/Commission column group total for cross-checking data.</p>
                        <p>2) Travel Agent Commission - Summary pulled out for specific date range - Commission column total can be matched with the Manager Report or Weekly Manager report, City Ledger section, Outstanding Commission for cross-checking data.</p>
                        <p className="text-red-500 font-semibold text-xs mb-1">Note : Manager Report or Weekly Manager Report should be pulled out by To date of Travel Agent Commission - Summary Report to fulfill this data match.</p>
                        <p>3) Travel Agent Commission - Summary pulled out for specific date range - Commission column total can be matched with the Detail Revenue Report pulled out by departure date for the same date range - Commission column total for cross-checking data.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Agent Name:</span> Name of the agent</p>
                        <p><span className="font-semibold">Phone:</span> Contact no of Agent</p>
                        <p><span className="font-semibold">Nights Sold:</span> No of nights sold of a booking Travel Agent wise</p>
                        <p><span className="font-semibold">Room Revenue:</span> Shows room revenue of a booking Travel Agent wise in properly's base currency</p>
                        <p><span className="font-semibold">Commission:</span> Shows commission raised for bookings Travel Agent wise</p>
                        <p><span className="font-semibold">Free Nights:</span> No of nights sold (as complementary) of a booking Travel Agent wise</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Audit Trails') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        Audit Trails provide a detailed log of sensitive system operations, including user actions, modifications, and access logs for security and compliance.
                    </p>
                </>
            );
        }
        if (activeReport === 'IP Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you IP data to whom hotelier has shared/restricted access of system based on the date selected in the property management system. You can even get data user wise.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">IP Address:</span> IP Address of the end user server for which hotelier wants to grant access to system</p>
                        <p><span className="font-semibold">IP Address From:</span> IP Address of the end user server from which we have received request</p>
                        <p><span className="font-semibold">Opened On:</span> Date on which this IP was given access</p>
                        <p><span className="font-semibold">Opened By:</span> User who has given this IP access</p>
                        <p><span className="font-semibold">Stopped On:</span> Date on which this IP was restricted</p>
                        <p><span className="font-semibold">Stopped By:</span> User who has restricted this IP</p>
                        <p><span className="font-semibold">Description:</span> Shows brief information or reason for giving this IP access</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Void Charge') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you void extra services done based on the date selected in the property management system. We store the void date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">How can you compare the report data with other reports?</h3>
                    <p className="text-red-500 font-semibold text-xs mb-1">Note : Extra Services can be voided with below operations, so its data cannot be matched exactly with any report</p>
                    <div className="space-y-2 text-gray-600 mb-6 text-sm">
                        <p>1) Cancel Reservation</p>
                        <p>2) No Show Reservation</p>
                        <p>3) Void Reservation</p>
                        <p>4) Void Extra Charge (manually)</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Date on which Guest will be using the extra service</p>
                        <p><span className="font-semibold">Voucher:</span> Voucher No of the extra service</p>
                        <p><span className="font-semibold">Charge:</span> Name of extra service</p>
                        <p><span className="font-semibold">Reference:</span> Brief booking information of guest</p>
                        <p><span className="font-semibold">Amount:</span> Shows extra service charged to guest in property's base currency</p>
                        <p><span className="font-semibold">Void By/DateTime:</span> User who has voided the extra service with the date on which void is performed</p>
                        <p><span className="font-semibold">Remarks:</span> Shows void remarks (reason of voiding extra services)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Void Payment') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you void payments done based on the date selected in the property management system. We store the void date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Date:</span> Date on which guest has made payment</p>
                        <p><span className="font-semibold">Receipt:</span> Receipt No of the payment</p>
                        <p><span className="font-semibold">Pay Method:</span> Mode of payment by which guest has done payments that is pay methods configured in your system including city ledger payments</p>
                        <p><span className="font-semibold">Reference:</span> Brief booking information of guest</p>
                        <p><span className="font-semibold">Amount:</span> Shows paid amount in property's base currency</p>
                        <p><span className="font-semibold">Void By/DateTime:</span> User who has voided the payment with the date on which void is performed</p>
                        <p><span className="font-semibold">Remarks:</span> Shows void remarks (reason of voiding payments)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Void Transaction') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        This report will give you voids (voids attempted on bookings after check in) done based on the date selected in the property management system. We store the void date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Folio No:</span> Folio No of a booking</p>
                        <p><span className="font-semibold">Guest Name:</span> Name of the Guest</p>
                        <p><span className="font-semibold">Arrival:</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dept:</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Rate:</span> Shows accommodation amount of booking in property's base currency (exclusive of Tax/Discount/Adjustment)</p>
                        <p><span className="font-semibold">Status:</span> Last status of booking before attempting Void Transaction</p>
                        <p><span className="font-semibold">Void By/DateTime:</span> User who has voided the booking with the date on which void is performed</p>
                        <p><span className="font-semibold">Remarks:</span> Shows void remarks (reason of voiding transaction)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Weekly Manager Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        Provides a weekly summary of key performance indicators, revenue, and occupancy statistics, allowing for trend analysis over a 7-day period.
                    </p>
                </>
            );
        }
        if (activeReport === 'Weekly Meal Plan Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        Summarizes meal plan requirements and consumption over a weekly period to assist in inventory and staffing management.
                    </p>
                </>
            );
        }
        if (activeReport === 'Work Order List') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-6">
                        Lists maintenance work orders, their status, and assigned personnel, helping to track property maintenance and repairs.
                    </p>
                </>
            );
        }
        if (activeReport === 'Arrival List') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        An Arrival List report is used to check the Expected guest arrivals of the property. It captures all the information about hotel guest arrivals. It can help the hotel staff have enough time to prepare the correct room and cater to any special requests as indicated on the arrival report.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <ul className="list-decimal list-inside space-y-2 text-gray-600 mb-6">
                        <li>Arrival List report for can be matched with Folio List report for the same date range with columns "arrival date, pax, guest name and reservation type" by arrival in folio list for cross-checking data.</li>
                        <li>Arrival List report for particular date can be matched with guest List report for the same date with list of data of confirm booking and hold confirm booking by enabling reservation and arrival in guest list report for cross-checking data.</li>
                        <li className="text-red-500"><span className="font-semibold">Note:</span> Other data cannot be compared with any other report as this report's behavior is different as its pulling out data based on all reservation types.</li>
                    </ul>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. no:</span> Reservation number and remark of booking</p>
                        <p><span className="font-semibold">Guest:</span> Name of the guest.</p>
                        <p><span className="font-semibold">Room:</span> Room number and room name of booking</p>
                        <p><span className="font-semibold">Rate:</span> Total rate of booking.</p>
                        <p><span className="font-semibold">Arrival:</span> Arrival date and arrival time of booking</p>
                        <p><span className="font-semibold">Departure:</span> Departure date of booking</p>
                        <p><span className="font-semibold">pax:</span> Pax information of booking</p>
                        {/* Add more as needed */}
                    </div>
                </>
            );
        }
        if (activeReport === 'Cancelled Reservation') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you cancellations based on the date selected in the properly management system. We store the cancellation date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6">
                        <p>1) Cancellation Revenue of this report can be matched with the manager report or weekly manager report, room charges - Cancellation Revenue when both reports are pulled for a specific date.</p>
                        <p className="text-red-500"><span className="font-semibold">Note:</span> It will not match only when some manual cancellation charge is posted on any active booking, then it will come in the calculation on Manager Report but Cancelled Reservation report will pull out only canceled bookings. This is usually considered as a user's mistake.</p>
                        <p>2) Cancellation Revenue of this report can be matched with the Daily Revenue Report when pulled out by Cancellation Revenue for a specific date.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. No :</span> Reservation no of booking</p>
                        <p><span className="font-semibold">Booking Date :</span> Booking date on which reservation has been taken in the system</p>
                        <p><span className="font-semibold">Guest Name :</span> Name of the Guest</p>
                        <p><span className="font-semibold">Rate Type :</span> Rate Type of booking</p>
                        <p><span className="font-semibold">Arr. :</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dpt :</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Folio No :</span> Folio No of a booking</p>
                        <p><span className="font-semibold">ADR :</span> Shows Average daily rate considering all stay nights.</p>
                        <p><span className="font-semibold">Can. Revenue :</span> Shows cancellation fee as tax inclusive or exclusive collected for the booking in property's base currency</p>
                        <p><span className="font-semibold">source :</span> A business source of the booking</p>
                        <p><span className="font-semibold">Can. By :</span> User who has canceled the booking</p>
                        <p><span className="font-semibold">Can Date :</span> Date on which reservation was canceled</p>
                        <p><span className="font-semibold">Remarks :</span> Shows cancellation remarks (reason of cancellation)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Departure List') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        The Departure list report displays guest data who were departing on a particular day or during a particular time period, which further helps hotels to process a smooth checkout for the guest.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <p className="text-gray-600 mb-6">
                        Departure List report for particular date can be matched with guest List report for the same date with list of data like guest arrival / departure dates, pax and room information for cross checking data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. no :</span> Reservation no of booking, In the case of direct check in reservation number will not generated and displayed as blank value.</p>
                        <p><span className="font-semibold">Guest Name :</span> Name of the guest.</p>
                        <p><span className="font-semibold">Room :</span> Room name with room type</p>
                        <p><span className="font-semibold">Rate :</span> Only Room Rate for the booking per night</p>
                        <p><span className="font-semibold">Rate Type :</span> Rate type of booking</p>
                        <p><span className="font-semibold">Arrival :</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Departure :</span> Departure Date and time of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">pax :</span> Display current Pax (Adult/Child) of a booking</p>
                        <p><span className="font-semibold">Business Source :</span> A business source of the booking</p>
                        <p><span className="font-semibold">Res.Type :</span> Reservation type of the booking</p>
                        <p><span className="font-semibold">User :</span> Username who handles the Booking</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Forecast Report') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report provides a calculative analysis of future occupancy, revenue and much more that helps in making decisions correctly. It's a helpful report for figuring out the best way to allocate resources and boost efficiency in the hospitality industry
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="space-y-4 text-xs text-gray-600">
                        <p className="font-semibold underline">Totals by date</p>
                        <div className="space-y-1">
                            <p><span className="font-semibold">Rooms:</span> Total number of rooms (based on the formula eA configuration &rarr; settings &rarr; formula &rarr; total rooms)</p>
                            <p><span className="font-semibold">N/A Rooms:</span> Maintenance block rooms count</p>
                            <p><span className="font-semibold">Arrivals:</span> Reservations arriving between the selected date ranges</p>
                            <p><span className="font-semibold">Stayovers:</span> Reservations staying at the hotel between the selected date ranges</p>
                            <p><span className="font-semibold">Departure:</span> Reservations checking out between the selected date ranges</p>
                            <p><span className="font-semibold">Available:</span> Rooms - arrivals - stayovers = available</p>
                            <p><span className="font-semibold">Occupied/Reserved:</span> Total room sold (calculated as per the formula in eA configuration)</p>
                            <p><span className="font-semibold">Percent Occupied:</span> (Total room sold * 100) / rooms</p>
                            <p><span className="font-semibold">Room Rental:</span> Total room rent charged for all guests and bookings this day (only room charges will be considered even for package booking)</p>
                            <p><span className="font-semibold">Revenue PAR:</span> Revenue per available room, room rental / rooms</p>
                            <p><span className="font-semibold">ADR:</span> Average daily rate, room rental / occupied/reserved</p>
                            <p><span className="font-semibold">Guests:</span> All guest (pax) count (adult/child)</p>
                        </div>

                        <p className="font-semibold underline">Summary</p>
                        <div className="space-y-1">
                            <p><span className="font-semibold">Total days:</span> Number of days in the selected date range</p>
                            <p><span className="font-semibold">Total room rental:</span> Sum of room rental in "room rental"</p>
                            <p><span className="font-semibold">Nights occupied:</span> Total number of nights of all inhouse guests</p>
                            <p><span className="font-semibold">Nights reserved:</span> Night count all the reservation (guarantee + unconfirm) even if the room is not total given a period of time</p>
                            <p><span className="font-semibold">Number of reservations:</span> Unique reservations count (all the reservation will count here, no-show/cancel reservation not included, in house bookings will be discarded Also, a note that for day use bookings it will set its value as per configured in formula screen for dayuse and paymaster dayuse)</p>
                            <p><span className="font-semibold">Percent occupied/reserved:</span> Total occupied/reserved * 100 / total rooms</p>
                            <p><span className="font-semibold">Average daily rate:</span> total room rental / total occupied/reserved</p>
                            <p><span className="font-semibold">Revenue per available room:</span> Total room rentals / total rooms</p>
                        </div>
                    </div>
                </>
            );
        }
        if (activeReport === 'No Show Reservation') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you no-show data based on the date selected in the property management system. We store no-show date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">Report Data Comparison</h3>
                    <div className="space-y-2 text-gray-600 mb-6">
                        <p>1) No show Revenue of this report can be matched with the manager report or weekly manager report, room charges - no show Revenue when both reports are pulled for a specific date.</p>
                        <p className="text-red-500"><span className="font-semibold">Note :</span> It will not match only when some manual no-show charge is posted on any active booking, then it will come in the calculation on Manager Report but No Show Reservation report will pull out only no-showed bookings. This is usually considered as a user's mistake.</p>
                        <p>2) No Show Revenue of this report can be matched with Daily Revenue Report when pulled out by No Show Revenue for a specific date.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. No :</span> Reservation no of booking</p>
                        <p><span className="font-semibold">Guest Name :</span> Name of the Guest</p>
                        <p><span className="font-semibold">Arr. :</span> Arrival Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dept :</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Folio No :</span> Folio No of booking</p>
                        <p><span className="font-semibold">No Show Revenue :</span> Shows no-show fee as tax inclusive or exclusive collected for the booking in property's base currency (based on Tax Inclusive Rates (Disc./Adj. included, if applied) filter option checked)</p>
                        <p><span className="font-semibold">Charges :</span> Shows total booking amount to be paid in property's base currency</p>
                        <p><span className="font-semibold">Paid :</span> Shows total payment paid for the booking in the property's base currency</p>
                        <p><span className="font-semibold">Balance :</span> Shows total due amount in property's base currency</p>
                        <p><span className="font-semibold">Source :</span> Business Source of the booking</p>
                        <p><span className="font-semibold">No Show By/Dt :</span> User who has no-showed the booking with the date on which no show is performed</p>
                        <p><span className="font-semibold">Remark :</span> Shows no show remarks (Reason of no show)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Reservation Activity') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you data of only confirmed bookings collected in system based on the date selected in the property management system. We store the booking date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data. You can pull out this report by room type, rate type, user, Travel Agent and Businesssource.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-2">How can you compare the report data with other reports?</h3>
                    <div className="space-y-2 text-gray-600 mb-6">
                        <p>1) Total Nights and Total Reservation of this report can be matched with Innalytics when both reports are pulled out by booking dates for some specific Travel Agent.</p>
                        <p>2) Booking date wise Detail Revenue should match with this report.</p>
                    </div>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res# :</span> Reservation no of a booking</p>
                        <p><span className="font-semibold">Res. Date :</span> Booking date on which reservation has been taken in the system</p>
                        <p><span className="font-semibold">Name :</span> Name of the Guest</p>
                        <p><span className="font-semibold">Arr :</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dept :</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Nights :</span> Nights of a booking</p>
                        <p><span className="font-semibold">Room :</span> Room/Roomtype of a booking</p>
                        <p><span className="font-semibold">Source :</span> A business source of the booking</p>
                        <p><span className="font-semibold">Agent :</span> Travel Agent associated with the booking</p>
                        <p><span className="font-semibold">Vou# :</span> Travel Agent Voucher No of bookings</p>
                        <p><span className="font-semibold">Rate Type :</span> Rate Type of booking</p>
                        <p><span className="font-semibold">Ofrd. Rate :</span> Shows rate of the arrival date as tax inclusive or exclusive in property's base currency (based on Tax Inclusive Rates (Disc./Adj. included, if applied) filter option checked)</p>
                        <p><span className="font-semibold">Balance :</span> Shows total due amount in property's base currency</p>
                        <p><span className="font-semibold">Revenue :</span> Shows total revenue generated for the booking inclusive of discount, adjustment and exclusive of tax. (based on Tax Inclusive Rates (Disc./Adj. included, if applied)</p>
                        <p><span className="font-semibold">GTD :</span> Guaranteed Pay Method of Booking</p>
                        <p><span className="font-semibold">User :</span> User who has made the booking</p>
                        <p><span className="font-semibold">Affiliate :</span> It will show the Affiliate code, so hotel can track booking.</p>
                        <p><span className="font-semibold">Extra Charge :</span> Name of extra services guest has used</p>
                        <p><span className="font-semibold">Extra Charge Total :</span> Shows total of extra charges in property's base currency (based on Tax Inclusive Rates (Disc./Adj. included, if applied)</p>
                    </div>
                </>
            );
        }
        if (activeReport === 'Void Reservation') {
            return (
                <>
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Help Guide</h2>
                    <p className="text-gray-600 mb-4">
                        This report will give you voids done (voids attempted on reservations before checkin) based on the date selected in the property management system. We store the void date according to the system date of a property. So if you are not performing night audit on a regular basis, there are chances that the report will not render proper data.
                    </p>

                    <h3 className="font-semibold text-gray-800 mb-3">Report Column Explanation</h3>
                    <div className="grid grid-cols-1 gap-y-2 text-xs text-gray-600">
                        <p><span className="font-semibold">Res. No :</span> Reservation no of booking</p>
                        <p><span className="font-semibold">Guest Name :</span> Name of the Guest</p>
                        <p><span className="font-semibold">Arrival :</span> Arrival Date of booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Dept :</span> Departure Date of a booking in property's short format set in the configuration panel</p>
                        <p><span className="font-semibold">Folio No :</span> Folio No of booking</p>
                        <p><span className="font-semibold">Source :</span> A business source of the booking</p>
                        <p><span className="font-semibold">Void By :</span> User who has voided the booking</p>
                        <p><span className="font-semibold">Void DateTime :</span> Date/Time on which reservation was voided</p>
                        <p><span className="font-semibold">Remarks :</span> Shows void remarks (reason of voiding reservation)</p>
                    </div>
                </>
            );
        }
        return null;
    };

    const [showReport, setShowReport] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(100);
    const [showExportMenu, setShowExportMenu] = useState(false);

    // Advanced Report Settings
    const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Ledger'>('A4');
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
    const [showWatermark, setShowWatermark] = useState(false);
    const [showSettingsMenu, setShowSettingsMenu] = useState(false);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [viewMode, setViewMode] = useState<'single' | 'continuous' | 'multi'>('continuous');
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const watermarkText = "CONFIDENTIAL";

    const handlePrint = () => {
        window.print();
    };

    const handleBackToFilters = () => setShowReport(false);

    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 200));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 50));

    const reportData = useMemo(() => {
        return generateGenericMockData(activeReport);
    }, [activeReport]);

    const handleExportPDF = () => {
        const config = REPORT_CONFIG[activeReport];
        if (!config) return;

        const doc = new jsPDF({
            orientation: orientation,
            format: pageSize.toLowerCase()
        });

        // Header
        doc.setFontSize(18);
        doc.text('House of Dream', 14, 22);
        doc.setFontSize(14);
        doc.setTextColor(220, 38, 38); // Red color
        doc.text(activeReport, 14, 30);

        // Metadata
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Date From: ${startDate}   To: ${endDate}`, 14, 38);

        // Watermark for PDF
        if (showWatermark) {
            doc.setTextColor(200, 200, 200);
            doc.setFontSize(50);
            doc.text(watermarkText, doc.internal.pageSize.width / 2, doc.internal.pageSize.height / 2, {
                align: 'center',
                angle: 45
            });
        }

        // Table
        const tableColumn = config.columns;
        const tableRows = reportData.map((row: ReportRow) => config.columns.map(col => String(row[col] ?? '')));

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [240, 240, 240], textColor: [20, 20, 20], fontStyle: 'bold' },
        });

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Printed On ' + new Date().toLocaleString(), 14, doc.internal.pageSize.height - 10);
            doc.text('Page ' + i + ' of ' + pageCount, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
        }

        doc.save(`${activeReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        setShowExportMenu(false);
    };

    const handleExportExcel = () => {
        const config = REPORT_CONFIG[activeReport];
        if (!config || !reportData.length) return;

        const ws = XLSX.utils.json_to_sheet(reportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeReport.substring(0, 30)); // Excel sheet name limit
        XLSX.writeFile(wb, `${activeReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
        setShowExportMenu(false);
    };

    const handleExportJPG = async () => {
        const element = document.getElementById('report-content');
        if (element) {
            const canvas = await html2canvas(element, { scale: 2 });
            const data = canvas.toDataURL('image/jpeg');
            const link = document.createElement('a');
            link.href = data;
            link.download = `${activeReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setShowExportMenu(false);
        }
    };

    // Helper to get Page Dimensions in mm
    const getPageDimensions = () => {
        // Definitions in mm
        const sizes = {
            'A4': { width: 210, height: 297 },
            'Letter': { width: 216, height: 279 },
            'Ledger': { width: 279, height: 432 }
        };

        const size = sizes[pageSize];
        return orientation === 'portrait'
            ? { width: `${size.width}mm`, height: `${size.height}mm` }
            : { width: `${size.height}mm`, height: `${size.width}mm` }; // Swap for landscape
    };





    const renderReportPreview = () => {
        if (!showReport) return null;

        const config = REPORT_CONFIG[activeReport];
        if (!config) {
            return (
                <div className="flex flex-col items-center justify-center p-8 bg-white border border-slate-200 rounded-lg shadow-2xs text-center m-4">
                    <p className="text-slate-700 font-bold text-sm">Report Configuration Not Found</p>
                    <p className="text-slate-400 text-xs mt-1">Please configure {activeReport} in REPORT_CONFIG</p>
                    <button onClick={() => setShowReport(false)} className="mt-3 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-semibold text-xs transition-colors">
                        Go Back to Filters
                    </button>
                </div>
            );
        }

        // Filter Data based on Search
        const filteredData = reportData.filter((item: ReportRow) =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(searchQuery.toLowerCase())
            )
        );

        // Pagination Logic
        const itemsPerPage = 20; // Rows per page
        const totalPages = Math.ceil(filteredData.length / itemsPerPage);

        // Chunk Data for Pages
        const pages = [];
        for (let i = 0; i < totalPages; i++) {
            pages.push(filteredData.slice(i * itemsPerPage, (i + 1) * itemsPerPage));
        }

        // If no data
        if (pages.length === 0) pages.push([]);

        const ReportHeader = () => (
            <div className="mb-3">
                <div className="flex justify-between items-end border-b-2 border-slate-800 pb-1.5 mb-1.5">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 leading-tight">House of Dream</h1>
                        <p className="text-[10px] text-slate-500 font-medium">Hotel Management System • Operational Report</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-sm font-bold text-red-600 uppercase tracking-wider">{activeReport}</h2>
                        <span className="text-[9px] text-slate-400 font-mono">Property Base Currency: USD ($)</span>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-medium text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200/60">
                    <div><span className="text-slate-400">Date From:</span> <span className="font-semibold text-slate-800">{startDate}</span></div>
                    <div><span className="text-slate-400">To:</span> <span className="font-semibold text-slate-800">{endDate}</span></div>
                    <div><span className="text-slate-400">Total Records:</span> <span className="font-semibold text-blue-700">{filteredData.length}</span></div>
                    <div className="ml-auto text-slate-400 font-mono text-[9px]">Generated: {new Date().toLocaleDateString()}</div>
                </div>
            </div>
        );

        const ReportPage = ({ pageData, pageNum }: { pageData: ReportRow[], pageNum: number }) => (
            <div
                id={`report-page-${pageNum}`}
                className="bg-white shadow-md print:shadow-none transition-transform origin-top duration-200 ease-out relative overflow-hidden mx-auto border border-slate-200/70"
                style={{
                    width: getPageDimensions().width,
                    minHeight: getPageDimensions().height,
                    padding: '12mm',
                    marginBottom: viewMode === 'continuous' ? '12px' : '0',
                    transform: viewMode === 'multi' ? `scale(0.38)` : `scale(${zoomLevel / 100})`,
                    transformOrigin: 'top center',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* Watermark Overlay */}
                {showWatermark && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
                        <div className="transform -rotate-45 text-slate-200/60 font-black whitespace-nowrap select-none" style={{ fontSize: '100px' }}>
                            {watermarkText}
                        </div>
                    </div>
                )}

                <div className="relative z-10 flex-1 flex flex-col">
                    <ReportHeader />

                    <div className="overflow-hidden flex-1">
                        <table className="w-full text-[9.5px] leading-tight text-left border-collapse">
                            <thead className="border-b-2 border-slate-800 bg-slate-100/90">
                                <tr>
                                    {config.columns.map((col, idx) => (
                                        <th key={idx} className="py-1 px-1.5 font-bold text-slate-900 border-b border-slate-300 uppercase tracking-wider text-[9px] whitespace-nowrap">{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pageData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                        {config.columns.map((col, cIdx) => (
                                            <td key={cIdx} className="py-1 px-1.5 align-middle text-slate-700 whitespace-nowrap font-normal">{row[col]}</td>
                                        ))}
                                    </tr>
                                ))}
                                {pageNum === totalPages && (
                                    <tr className="border-t-2 border-slate-900 font-bold bg-slate-100/80">
                                        <td className="py-1.5 px-1.5 text-slate-900" colSpan={Math.min(3, config.columns.length)}>Total Records: {filteredData.length}</td>
                                        <td className="py-1.5 px-1.5 text-right text-slate-900 font-mono text-[9px]" colSpan={Math.max(0, config.columns.length - 3)}>END OF REPORT</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-auto pt-3 border-t border-slate-200 flex justify-between text-[8px] text-slate-400 font-mono">
                        <div>Printed On {new Date().toLocaleString()}</div>
                        <div>Page {pageNum} of {totalPages}</div>
                    </div>
                </div>
            </div>
        );

        return (
            <div className={`flex flex-col h-full bg-slate-100 ${isFullScreen ? 'fixed inset-0 z-[100]' : ''}`}>
                {/* Compact Toolbar */}
                <div className="bg-slate-100 border-b border-slate-200 px-2 py-1 flex items-center gap-1.5 select-none sticky top-0 z-10 shadow-2xs print:hidden h-8.5 text-xs">
                    {/* Search Bar */}
                    <div className="relative w-36 sm:w-44">
                        <Search className="absolute left-2 top-1.5 text-slate-400" size={11} />
                        <input
                            type="text"
                            placeholder="Find in report..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-6 pr-2 py-0.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white h-6.5"
                        />
                    </div>

                    <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                    {/* Settings Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                            className={`h-6.5 px-1.5 rounded text-slate-700 hover:bg-slate-200 flex items-center gap-1 text-[11px] font-medium ${showSettingsMenu ? 'bg-slate-200' : ''}`}
                            title="Page Settings"
                        >
                            <Settings size={13} />
                            <span className="hidden md:inline">Layout</span>
                        </button>
                        {showSettingsMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 p-2.5 w-44 space-y-2 text-xs">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Page Size</label>
                                    <select
                                        value={pageSize}
                                        onChange={(e) => setPageSize(e.target.value as 'A4' | 'Letter' | 'Ledger')}
                                        className="w-full text-xs border border-slate-200 rounded p-1 h-7 bg-white"
                                    >
                                        <option value="A4">A4 (210 x 297 mm)</option>
                                        <option value="Letter">Letter (216 x 279 mm)</option>
                                        <option value="Ledger">Ledger (279 x 432 mm)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Orientation</label>
                                    <div className="flex bg-slate-100 rounded p-0.5">
                                        <button
                                            onClick={() => setOrientation('portrait')}
                                            className={`flex-1 text-center text-xs py-0.5 rounded ${orientation === 'portrait' ? 'bg-white shadow-2xs font-bold text-blue-600' : 'text-slate-600'}`}
                                        >
                                            Portrait
                                        </button>
                                        <button
                                            onClick={() => setOrientation('landscape')}
                                            className={`flex-1 text-center text-xs py-0.5 rounded ${orientation === 'landscape' ? 'bg-white shadow-2xs font-bold text-blue-600' : 'text-slate-600'}`}
                                        >
                                            Landscape
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer pt-1 border-t border-slate-100">
                                        <input
                                            type="checkbox"
                                            checked={showWatermark}
                                            onChange={(e) => setShowWatermark(e.target.checked)}
                                            className="rounded border-slate-300 text-blue-600"
                                        />
                                        <span>Watermark</span>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* View Mode */}
                    <div className="relative">
                        <button
                            onClick={() => setShowViewMenu(!showViewMenu)}
                            className={`h-6.5 px-1.5 rounded text-slate-700 hover:bg-slate-200 flex items-center gap-1 text-[11px] font-medium ${showViewMenu ? 'bg-slate-200' : ''}`}
                            title="View Mode"
                        >
                            <LayoutTemplate size={13} />
                            <span className="hidden md:inline">View</span>
                        </button>
                        {showViewMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-32 text-xs">
                                <button onClick={() => { setViewMode('single'); setShowViewMenu(false); }} className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 ${viewMode === 'single' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}>
                                    <FileText size={12} /> Single
                                </button>
                                <button onClick={() => { setViewMode('continuous'); setShowViewMenu(false); }} className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 ${viewMode === 'continuous' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}>
                                    <List size={12} /> Continuous
                                </button>
                                <button onClick={() => { setViewMode('multi'); setShowViewMenu(false); }} className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-1.5 ${viewMode === 'multi' ? 'bg-blue-50 text-blue-600 font-bold' : 'text-slate-700'}`}>
                                    <Grid size={12} /> Multi / Grid
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                    {/* Print */}
                    <button onClick={handlePrint} className="h-6.5 w-6.5 flex items-center justify-center hover:bg-slate-200 rounded text-slate-700" title="Print Document">
                        <Printer size={13} />
                    </button>

                    {/* Export Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className={`h-6.5 px-2 hover:bg-slate-200 rounded text-slate-700 flex items-center gap-1 text-[11px] font-medium ${showExportMenu ? 'bg-slate-200' : ''}`}
                            title="Export"
                        >
                            <Save size={13} />
                            <span>Export</span>
                            <ChevronDown size={10} />
                        </button>
                        {showExportMenu && (
                            <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 w-32 text-xs">
                                <button onClick={handleExportPDF} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                    <FileText size={13} className="text-red-500" /> PDF Document
                                </button>
                                <button onClick={handleExportExcel} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                    <FileSpreadsheet size={13} className="text-emerald-600" /> Excel Sheet
                                </button>
                                <button onClick={handleExportJPG} className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                    <FileImage size={13} className="text-purple-600" /> JPG Image
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                    {/* Pagination */}
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        className={`h-6.5 w-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-200 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="First Page"
                    >
                        <ChevronsLeft size={13} />
                    </button>
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`h-6.5 w-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-200 ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Previous Page"
                    >
                        <ChevronLeft size={13} />
                    </button>
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 h-6">
                        <span className="text-[11px] font-semibold text-slate-800">{currentPage}</span>
                        <span className="text-[10px] text-slate-400">/ {totalPages}</span>
                    </div>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`h-6.5 w-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-200 ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Next Page"
                    >
                        <ChevronRight size={13} />
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        className={`h-6.5 w-6 flex items-center justify-center rounded text-slate-700 hover:bg-slate-200 ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : ''}`}
                        title="Last Page"
                    >
                        <ChevronsRight size={13} />
                    </button>

                    <div className="w-px h-4 bg-slate-300 mx-0.5"></div>

                    {/* Zoom Controls */}
                    <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded px-1 h-6">
                        <button onClick={handleZoomOut} className="hover:text-blue-600 text-slate-600" title="Zoom Out">
                            <ZoomOut size={12} />
                        </button>
                        <span className="text-[10px] font-mono text-slate-600 min-w-[28px] text-center">{zoomLevel}%</span>
                        <button onClick={handleZoomIn} className="hover:text-blue-600 text-slate-600" title="Zoom In">
                            <ZoomIn size={12} />
                        </button>
                    </div>

                    <button onClick={() => setIsFullScreen(!isFullScreen)} className="h-6.5 w-6.5 flex items-center justify-center hover:bg-slate-200 rounded text-slate-700" title="Toggle Fullscreen">
                        {isFullScreen ? <Minimize size={13} /> : <Maximize size={13} />}
                    </button>

                    <div className="flex-1"></div>

                    <button onClick={handleBackToFilters} className="h-6.5 px-2.5 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-semibold rounded flex items-center gap-1 shadow-2xs">
                        <X size={12} /> Close Preview
                    </button>
                </div>

                {/* Content Area */}
                <div id="report-content" className={`flex-1 overflow-auto p-4 bg-slate-300/40 ${viewMode === 'multi' ? 'flex flex-wrap justify-center content-start gap-4' : 'flex flex-col items-center'}`}>
                    {viewMode === 'single' ? (
                        <ReportPage pageData={pages[currentPage - 1]} pageNum={currentPage} />
                    ) : (
                        pages.map((pageData, idx) => (
                            <ReportPage key={idx} pageData={pageData} pageNum={idx + 1} />
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="flex h-screen bg-slate-100 font-sans text-xs text-slate-700 antialiased overflow-hidden">
            {/* Expert Collapsible Sidebar */}
            <aside
                className={`${isSidebarCollapsed ? 'w-14' : 'w-60'} bg-white border-r border-gray-200/90 h-screen sticky top-0 flex flex-col transition-all duration-200 ease-in-out flex-shrink-0 z-40 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)]`}
            >
                {/* Header / Brand Area */}
                <div className={`h-11 px-2.5 flex items-center border-b border-gray-100 ${isSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                    {!isSidebarCollapsed && (
                        <div
                            className="cursor-pointer flex items-center gap-2 min-w-0"
                            onClick={() => setActivePage && setActivePage('dashboard')}
                            title="HotelManagementOS"
                        >
                            <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white shadow-xs flex-shrink-0">
                                <FileText size={13} />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none truncate">Reports OS</h1>
                                <p className="text-[8px] text-gray-400 font-semibold uppercase tracking-wider leading-none mt-0.5">Enterprise BI</p>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setIsSidebarCollapsed(!isSidebarCollapsed);
                            setFlyoutCategory(null);
                        }}
                        className="w-7 h-7 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                        title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                    >
                        {isSidebarCollapsed ? <Menu size={14} /> : <ChevronLeft size={13} />}
                    </button>
                </div>

                {/* Quick Search */}
                <div className="p-2 border-b border-gray-100 bg-gray-50/40">
                    <div className="relative">
                        <Search
                            className={`absolute ${isSidebarCollapsed ? 'left-1/2 -translate-x-1/2 cursor-pointer' : 'left-2.5'} top-2 text-gray-400`}
                            size={12}
                            onClick={() => {
                                if (isSidebarCollapsed) {
                                    setIsSidebarCollapsed(false);
                                }
                            }}
                        />
                        {!isSidebarCollapsed ? (
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    placeholder="Search 50+ reports..."
                                    value={sidebarSearch}
                                    onChange={(e) => setSidebarSearch(e.target.value)}
                                    className="w-full pl-7 pr-6 py-1 border border-gray-200 rounded-md text-[11px] outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white h-7 placeholder:text-gray-400"
                                />
                                {sidebarSearch && (
                                    <button
                                        onClick={() => setSidebarSearch('')}
                                        className="absolute right-1.5 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                                        title="Clear search"
                                    >
                                        <X size={11} />
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div
                                onClick={() => setIsSidebarCollapsed(false)}
                                className="h-6 flex items-center justify-center cursor-pointer text-gray-400 hover:text-blue-600"
                                title="Click to search"
                            />
                        )}
                    </div>
                </div>

                {/* Navigation Categories List */}
                <div className="flex-1 overflow-y-auto no-scrollbar py-1 px-1.5 space-y-1">
                    {filteredMenuItems.map((menu) => {
                        const isCatOpen = openCategories[menu.title] ?? false;
                        const hasActiveChild = menu.items.includes(activeReport);
                        const isFlyoutOpen = isSidebarCollapsed && flyoutCategory === menu.title;

                        return (
                            <div
                                key={menu.key || menu.title}
                                className="relative"
                                onMouseLeave={() => {
                                    if (isSidebarCollapsed) setFlyoutCategory(null);
                                }}
                            >
                                {/* Category Header Button */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (isSidebarCollapsed) {
                                            setFlyoutCategory(flyoutCategory === menu.title ? null : menu.title);
                                        } else {
                                            toggleCategory(menu.title);
                                        }
                                    }}
                                    onMouseEnter={() => {
                                        if (isSidebarCollapsed) setFlyoutCategory(menu.title);
                                    }}
                                    className={`
                                        w-full flex items-center justify-between text-left text-[11.5px] font-semibold rounded-md transition-colors select-none cursor-pointer group
                                        ${isSidebarCollapsed ? 'justify-center p-2' : 'px-2 py-1.5'}
                                        ${hasActiveChild ? 'bg-blue-50/60 text-blue-800' : 'text-gray-700 hover:bg-gray-100/70 hover:text-gray-900'}
                                    `}
                                    title={isSidebarCollapsed ? `${menu.title} (${menu.items.length})` : undefined}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={`p-1 rounded flex-shrink-0 transition-colors ${menu.color || 'text-gray-400'}`}>
                                            {menu.icon}
                                        </span>
                                        {!isSidebarCollapsed && (
                                            <span className="truncate">{menu.title}</span>
                                        )}
                                    </div>
                                    {!isSidebarCollapsed && (
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <span className="text-[9px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.2 rounded-full">
                                                {menu.items.length}
                                            </span>
                                            <span className="text-gray-400 group-hover:text-gray-600 transition-transform">
                                                {isCatOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
                                            </span>
                                        </div>
                                    )}
                                </button>

                                {/* Expanded Children in Non-Collapsed Sidebar */}
                                {!isSidebarCollapsed && isCatOpen && (
                                    <div className="mt-0.5 ml-3 pl-2 border-l border-gray-200/70 space-y-0.5 py-0.5 animate-in fade-in duration-150">
                                        {menu.items.map((item) => {
                                            const isSelected = activeReport === item;
                                            return (
                                                <button
                                                    key={item}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveReport(item);
                                                        setShowReport(false);
                                                    }}
                                                    className={`
                                                        w-full text-left flex items-center gap-1.5 px-2 py-1 rounded text-[11px] transition-all select-none cursor-pointer
                                                        ${isSelected
                                                            ? 'bg-blue-50 text-blue-700 font-semibold shadow-2xs border-r-2 border-blue-600'
                                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 font-normal'}
                                                    `}
                                                >
                                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-gray-300'}`} />
                                                    <span className="truncate">{item}</span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Floating Flyout Popover when Sidebar is Collapsed */}
                                {isSidebarCollapsed && isFlyoutOpen && (
                                    <div
                                        className="fixed left-14 ml-1 top-auto -mt-8 w-64 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
                                        onMouseEnter={() => setFlyoutCategory(menu.title)}
                                        onMouseLeave={() => setFlyoutCategory(null)}
                                    >
                                        <div className="px-3 pb-2 border-b border-gray-100 flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                                                <span className={`p-1 rounded ${menu.color}`}>
                                                    {menu.icon}
                                                </span>
                                                <span>{menu.title}</span>
                                            </div>
                                            <span className="text-[9.5px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                                                {menu.items.length}
                                            </span>
                                        </div>
                                        <div className="max-h-80 overflow-y-auto no-scrollbar p-1 space-y-0.5">
                                            {menu.items.map((item) => {
                                                const isSelected = activeReport === item;
                                                return (
                                                    <button
                                                        key={item}
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveReport(item);
                                                            setShowReport(false);
                                                            setFlyoutCategory(null);
                                                        }}
                                                        className={`
                                                            w-full text-left flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px] transition-all select-none cursor-pointer
                                                            ${isSelected
                                                                ? 'bg-blue-50 text-blue-700 font-semibold border-l-2 border-blue-600'
                                                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 font-normal'}
                                                        `}
                                                    >
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-gray-300'}`} />
                                                        <span className="truncate">{item}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer Section in Sidebar */}
                <div className="p-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    {!isSidebarCollapsed ? (
                        <div className="flex items-center justify-between w-full text-[10px] text-gray-500 font-medium px-1">
                            <span className="flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                BI Engine Active
                            </span>
                            <span className="text-gray-400 font-mono">v4.2</span>
                        </div>
                    ) : (
                        <div className="w-full flex justify-center" title="BI Engine Active v4.2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                {/* Modern Expert Topbar */}
                <header className="h-11 bg-white border-b border-gray-200/90 flex items-center justify-between px-3 flex-shrink-0 z-30 sticky top-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none">
                    {/* Left: Collapse Toggle + Breadcrumbs + Module Shortcuts */}
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        {/* Hamburger toggle button */}
                        <button
                            type="button"
                            onClick={() => {
                                setIsSidebarCollapsed(!isSidebarCollapsed);
                                setFlyoutCategory(null);
                            }}
                            className="w-7 h-7 rounded-md border border-gray-200/80 text-gray-600 flex items-center justify-center hover:bg-gray-100 hover:text-gray-900 transition-colors flex-shrink-0 cursor-pointer"
                            title={isSidebarCollapsed ? "Expand Sidebar (Ctrl+B)" : "Collapse Sidebar"}
                        >
                            <Menu size={13} />
                        </button>

                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-1.5 text-xs min-w-0">
                            <span className="text-gray-400 font-medium hidden sm:inline">Reports</span>
                            <span className="text-gray-300 hidden sm:inline">/</span>
                            <h1 className="font-bold text-gray-900 truncate tracking-tight text-xs sm:text-[13px] max-w-[150px] sm:max-w-[240px] md:max-w-[320px]">
                                {activeReport}
                            </h1>
                            <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live BI
                            </span>
                        </div>

                        {/* Module Shortcuts (Return to Overview / Front Desk / Analytics) */}
                        {setActivePage && (
                            <div className="hidden xl:flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                                <button
                                    onClick={() => setActivePage('dashboard')}
                                    className="h-6.5 px-2 rounded-md text-[10.5px] font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Return to Dashboard"
                                >
                                    <LayoutDashboard size={11} /> Overview
                                </button>
                                <button
                                    onClick={() => setActivePage('front-desk')}
                                    className="h-6.5 px-2 rounded-md text-[10.5px] font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Open Front Desk"
                                >
                                    <Monitor size={11} /> Front Desk
                                </button>
                                <button
                                    onClick={() => setActivePage('advanced-reports')}
                                    className="h-6.5 px-2 rounded-md text-[10.5px] font-medium text-gray-600 hover:text-blue-600 hover:bg-blue-50 flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Open Advanced Revenue BI"
                                >
                                    <BarChart2 size={11} /> Analytics
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Right: Date Range Indicator, Actions, Property Badge & User Profile */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Compact Date Indicator */}
                        <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200/70 rounded-md text-[10.5px] text-gray-600 font-medium">
                            <Calendar size={11} className="text-gray-400" />
                            <span>{startDate}</span>
                            <span className="text-gray-300">→</span>
                            <span>{endDate}</span>
                        </div>

                        {/* Contextual Actions */}
                        {showReport ? (
                            <button
                                onClick={handleBackToFilters}
                                className="h-7 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors text-xs font-medium flex items-center gap-1 border border-gray-200/80 shadow-2xs cursor-pointer"
                            >
                                <ChevronLeft size={13} /> Back to Filters
                            </button>
                        ) : (
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleExportExcel}
                                    className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Export current report to Excel"
                                >
                                    <FileSpreadsheet size={12} />
                                    <span className="hidden sm:inline">Export Excel</span>
                                </button>
                                <button
                                    onClick={() => setShowReport(true)}
                                    className="h-7 px-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1 transition-colors cursor-pointer"
                                    title="Generate Preview"
                                >
                                    <Download size={12} />
                                    <span className="hidden sm:inline">Generate</span>
                                </button>
                            </div>
                        )}

                        {/* Active Property Badge */}
                        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200/70 rounded-md text-[10.5px] text-gray-600 font-medium">
                            <Building2 size={12} className="text-gray-400" />
                            <span className="truncate max-w-[120px] font-semibold text-gray-700">{user?.property || 'Grand Palace'}</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        </div>

                        {/* User Profile Dropdown */}
                        <div className="relative" ref={dropdownRef}>
                            <button
                                type="button"
                                className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 px-1.5 py-1 rounded-md transition-colors border border-transparent hover:border-gray-200"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            >
                                <div className="text-right hidden sm:block">
                                    <p className="text-[11px] font-bold text-gray-800 leading-tight">{user?.name || 'Manager'}</p>
                                    <p className="text-[9.5px] text-gray-500 leading-tight">{user?.property || 'Grand Palace'}</p>
                                </div>
                                <div className="w-7 h-7 rounded-full bg-slate-200 overflow-hidden border border-gray-200 flex-shrink-0">
                                    <img
                                        src={user?.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"}
                                        alt="User"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute right-0 mt-1.5 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-1 z-50 text-xs">
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <User size={13} className="text-gray-400" />
                                        My Profile
                                    </button>
                                    <button
                                        type="button"
                                        className="w-full text-left px-3 py-1.5 text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                                        onClick={() => setIsDropdownOpen(false)}
                                    >
                                        <Building2 size={13} className="text-gray-400" />
                                        Switch Property
                                    </button>
                                    <div className="h-px bg-gray-100 my-1"></div>
                                    <div className="px-1.5 pb-0.5">
                                        <button
                                            type="button"
                                            className="w-full text-center px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                                            onClick={() => {
                                                setIsDropdownOpen(false);
                                                onLogout();
                                            }}
                                        >
                                            <LogOut size={13} />
                                            Logout
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-3 sm:p-3.5 bg-slate-50/60">
                    {showReport ? renderReportPreview() : (
                        <>
                            {/* Filter Card */}
                            <div className="bg-white rounded-lg shadow-2xs border border-slate-200/80 p-3.5 mb-2.5">
                                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <FileText size={14} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Report Parameters & Filter Criteria</span>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setIsTemplateListModalOpen(true);
                                        }}
                                        className="h-6 px-2 text-[11px] font-medium text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition-colors"
                                    >
                                        <Settings size={11} /> Custom Templates
                                    </button>
                                </div>

                                {renderFilters()}

                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-3">
                                        <label className="font-semibold text-slate-700 text-xs">Visible Columns:</label>
                                        <div className="flex flex-wrap gap-2.5 text-xs text-slate-600">
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" /> Res. No</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" /> Guest Name</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" defaultChecked className="rounded border-slate-300 text-blue-600" /> Rate</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded border-slate-300 text-blue-600" /> Room</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded border-slate-300 text-blue-600" /> Arrival</label>
                                            <label className="flex items-center gap-1 cursor-pointer"><input type="checkbox" className="rounded border-slate-300 text-blue-600" /> Departure</label>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-auto">
                                        <button
                                            onClick={handleExportExcel}
                                            className="h-7.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                                        >
                                            <FileSpreadsheet size={13} /> Export Excel
                                        </button>
                                        <button
                                            onClick={() => setShowReport(true)}
                                            className="h-7.5 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors"
                                        >
                                            <Download size={13} /> Generate Report
                                        </button>
                                        <button
                                            onClick={() => setShowReport(false)}
                                            className="h-7.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-md text-xs font-medium shadow-2xs flex items-center gap-1.5 transition-colors"
                                        >
                                            <RotateCcw size={13} /> Reset
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Help Guide */}
                            {renderHelpGuide() && (
                                <div className="bg-white rounded-lg shadow-2xs border border-slate-200/80 p-3.5 text-xs text-slate-600">
                                    {renderHelpGuide()}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            {renderTemplateListModal()}
            {renderAddTemplateModal()}
        </div>
    );
};

export default Reports;
