import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus,
    LayoutGrid,
    Map,
    QrCode,
    RefreshCw,
    Users,
    Star,
    CheckCircle2,
    Clock,
    X,
    Printer,
    Edit3,
    Trash2
} from 'lucide-react';
import PageHeader from '../../common/PageHeader';
import { OutletSelector, type Outlet } from '../outlets/OutletSelector';
import { FloorPlanVisualBuilder, type TableItem } from './FloorPlanVisualBuilder';
import { TableModal } from './TableModal';

export const TablesPage: React.FC = () => {
    const [tables, setTables] = useState<TableItem[]>([]);
    const [floors, setFloors] = useState<{ id: string; name: string }[]>([]);
    const [activeFloorId, setActiveFloorId] = useState<string>('');
    const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
    const [loading, setLoading] = useState(true);

    // View: 'canvas' (2D Visual Floor Plan) vs 'list' (Table Cards Grid)
    const [viewMode, setViewMode] = useState<'canvas' | 'list'>('canvas');
    const [search, setSearch] = useState('');

    // Modals
    const [showTableModal, setShowTableModal] = useState(false);
    const [editingTable, setEditingTable] = useState<TableItem | null>(null);
    const [qrModalTable, setQrModalTable] = useState<TableItem | null>(null);

    const loadData = async () => {
        try {
            setLoading(true);
            const outletParam = selectedOutlet ? `?outletId=${selectedOutlet.id}` : '';
            const [tablesRes, floorsRes] = await Promise.all([
                fetch(`/api/restaurant/tables${outletParam}`),
                fetch(`/api/restaurant/floors${outletParam}`)
            ]);

            const tablesData = await tablesRes.json();
            const floorsData = await floorsRes.json();

            if (tablesData.success && Array.isArray(tablesData.data)) {
                setTables(tablesData.data);
            } else {
                setTables([]);
            }

            if (floorsData.success && Array.isArray(floorsData.data)) {
                setFloors(floorsData.data);
                if (floorsData.data.length > 0 && !activeFloorId) {
                    setActiveFloorId(floorsData.data[0].id);
                }
            }
        } catch {
            setTables([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [selectedOutlet]);

    const filteredTables = useMemo(() => {
        return tables.filter((t) => {
            const matchesSearch =
                t.code.toLowerCase().includes(search.toLowerCase()) ||
                t.name.toLowerCase().includes(search.toLowerCase());
            if (!matchesSearch) return false;
            if (activeFloorId && t.floor_id !== activeFloorId) return false;
            return true;
        });
    }, [tables, search, activeFloorId]);

    const handleDelete = async (table: TableItem) => {
        if (!confirm(`Are you sure you want to delete table "${table.name}" (${table.code})?`)) return;
        try {
            const res = await fetch(`/api/restaurant/tables/${table.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                loadData();
            } else {
                alert(data.error || 'Failed to delete table');
            }
        } catch (err: any) {
            alert(err?.message || 'Error deleting table');
        }
    };

    const totalSeats = tables.reduce((acc, t) => acc + Number(t.capacity || 0), 0);
    const occupiedSeats = tables
        .filter((t) => t.status.toUpperCase() === 'OCCUPIED')
        .reduce((acc, t) => acc + Number(t.capacity || 0), 0);

    return (
        <div className="space-y-6">
            {/* Top Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <PageHeader
                    title="Tables & 2D Floor Plan"
                    subtitle="Interactive 2D floor designer, table seating capacity, live status, and QR codes"
                />
                <div className="flex items-center gap-3">
                    <OutletSelector
                        selectedOutletId={selectedOutlet?.id}
                        onOutletChange={(outlet: Outlet) => setSelectedOutlet(outlet)}
                    />
                    <button
                        onClick={() => {
                            setEditingTable(null);
                            setShowTableModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-xs flex items-center gap-2 hover:opacity-95 shadow-md shadow-primary/20 transition cursor-pointer"
                    >
                        <Plus className="size-4" />
                        <span>Add Table</span>
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Total Tables</span>
                        <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                            <Map className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {tables.length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{totalSeats} Total Guest Seats</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">Available / Vacant</span>
                        <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                        {tables.filter((t) => t.status.toUpperCase() === 'VACANT' || t.status.toUpperCase() === 'AVAILABLE').length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Ready for seating</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">In-Service (Occupied)</span>
                        <div className="size-8 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <Clock className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                        {tables.filter((t) => t.status.toUpperCase() === 'OCCUPIED').length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{occupiedSeats} Guests Dining Now</div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-500">VIP Suites & Booths</span>
                        <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Star className="size-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-white">
                        {tables.filter((t) => t.is_vip).length}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Priority private tables</div>
                </div>
            </div>

            {/* View Switcher Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center gap-1 text-xs font-semibold">
                        <button
                            onClick={() => setViewMode('canvas')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                                viewMode === 'canvas'
                                    ? 'bg-white dark:bg-[#18181f] text-primary shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <Map className="size-3.5" />
                            <span>2D Floor Visual Canvas</span>
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer ${
                                viewMode === 'list'
                                    ? 'bg-white dark:bg-[#18181f] text-primary shadow-2xs'
                                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                            }`}
                        >
                            <LayoutGrid className="size-3.5" />
                            <span>Table Grid & List View</span>
                        </button>
                    </div>

                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search tables..."
                        className="px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#18181f] text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary w-40 sm:w-48"
                    />
                </div>

                <button
                    onClick={loadData}
                    className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-slate-500 cursor-pointer self-end sm:self-auto"
                    title="Refresh"
                >
                    <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* Main View Render */}
            {viewMode === 'canvas' ? (
                <FloorPlanVisualBuilder
                    tables={tables}
                    floors={floors}
                    activeFloorId={activeFloorId}
                    onFloorChange={(fId) => setActiveFloorId(fId)}
                    onTableUpdated={loadData}
                    onEditTable={(t) => {
                        setEditingTable(t);
                        setShowTableModal(true);
                    }}
                    onOpenQr={(t) => setQrModalTable(t)}
                />
            ) : (
                /* List & Cards Mode */
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredTables.map((t: TableItem) => (
                            <div
                                key={t.id}
                                className="p-4 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-md transition flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <span className="font-extrabold text-base text-slate-900 dark:text-white font-mono">
                                                {t.code || `T-${t.table_number}`}
                                            </span>
                                            {t.is_vip && (
                                                <Star className="size-4 fill-amber-500 text-amber-500" />
                                            )}
                                        </div>
                                        <span
                                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                t.status.toUpperCase() === 'VACANT' || t.status.toUpperCase() === 'AVAILABLE'
                                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                                    : t.status.toUpperCase() === 'OCCUPIED'
                                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                                            }`}
                                        >
                                            {t.status}
                                        </span>
                                    </div>

                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-1 group-hover:text-primary transition">
                                        {t.name}
                                    </h4>

                                    <div className="flex items-center gap-1 text-xs text-slate-400 mb-3">
                                        <Users className="size-3.5" />
                                        <span>Capacity: {t.capacity} Guests</span>
                                    </div>
                                </div>

                                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                    <button
                                        onClick={() => setQrModalTable(t)}
                                        className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline cursor-pointer"
                                    >
                                        <QrCode className="size-3.5" />
                                        <span>QR Menu</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => {
                                                setEditingTable(t);
                                                setShowTableModal(true);
                                            }}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                                            title="Edit"
                                        >
                                            <Edit3 className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(t)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                                            title="Delete"
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

            {/* Table Add / Edit Modal */}
            <TableModal
                isOpen={showTableModal}
                onClose={() => setShowTableModal(false)}
                table={editingTable}
                floors={floors}
                activeOutletId={selectedOutlet?.id || 'outlet-main'}
                activeFloorId={activeFloorId}
                onSaved={loadData}
            />

            {/* QR Code Printable Modal */}
            {qrModalTable && (
                <div
                    onClick={(e) => {
                        if (e.target === e.currentTarget) setQrModalTable(null);
                    }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-sm bg-white dark:bg-[#18181f] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-4 my-auto"
                    >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                            <span className="font-bold text-slate-900 dark:text-white text-sm">
                                Contactless Dining QR
                            </span>
                            <button
                                onClick={() => setQrModalTable(null)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white font-mono">
                                {qrModalTable.code}
                            </h3>
                            <p className="text-xs text-slate-400">{qrModalTable.name}</p>
                        </div>

                        {/* QR Code Display */}
                        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-inner inline-block">
                            <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                                    `http://${window.location.host}/menu?table=${qrModalTable.code}&outlet=${selectedOutlet?.code || 'MAIN'}`
                                )}`}
                                alt="Table QR"
                                className="size-48 object-contain"
                            />
                        </div>

                        <p className="text-[11px] text-slate-400">
                            Scan with any smartphone camera to view digital menu, allergens, and place direct food orders.
                        </p>

                        <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                                onClick={() => window.print()}
                                className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm hover:opacity-90 transition cursor-pointer"
                            >
                                <Printer className="size-3.5" />
                                <span>Print Table Standee</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
