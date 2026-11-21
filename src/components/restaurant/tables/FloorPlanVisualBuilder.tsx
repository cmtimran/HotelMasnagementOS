import React, { useState, useEffect, useRef } from 'react';
import {
    Save,
    ZoomIn,
    ZoomOut,
    QrCode,
    Users,
    Star,
    Layers,
    Lock,
    Unlock
} from 'lucide-react';

export interface TableItem {
    id: string;
    outlet_id: string;
    floor_id?: string;
    floor_name?: string;
    table_number: number;
    code: string;
    name: string;
    capacity: number;
    status: 'VACANT' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | string;
    is_vip: boolean;
    pos_x: number;
    pos_y: number;
}

interface FloorPlanVisualBuilderProps {
    tables: TableItem[];
    floors: { id: string; name: string }[];
    activeFloorId: string;
    onFloorChange: (floorId: string) => void;
    onTableUpdated: () => void;
    onEditTable: (table: TableItem) => void;
    onOpenQr: (table: TableItem) => void;
}

export const FloorPlanVisualBuilder: React.FC<FloorPlanVisualBuilderProps> = ({
    tables,
    floors,
    activeFloorId,
    onFloorChange,
    onTableUpdated,
    onEditTable,
    onOpenQr
}) => {
    const [isEditMode, setIsEditMode] = useState(false);
    const [zoom, setZoom] = useState(100);
    const [snapGrid, setSnapGrid] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Positions map: tableId -> { x, y }
    const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});
    const [draggingTableId, setDraggingTableId] = useState<string | null>(null);
    const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const canvasRef = useRef<HTMLDivElement>(null);

    // Selected table for quick status changing
    const [statusMenuTableId, setStatusMenuTableId] = useState<string | null>(null);

    useEffect(() => {
        const initialMap: Record<string, { x: number; y: number }> = {};
        tables.forEach((t) => {
            initialMap[t.id] = {
                x: Number(t.pos_x) || 50,
                y: Number(t.pos_y) || 50
            };
        });
        setPositions(initialMap);
        setHasUnsavedChanges(false);
    }, [tables]);

    const activeFloorTables = tables.filter((t) => !activeFloorId || t.floor_id === activeFloorId);

    // Mouse handlers for dragging
    const handleMouseDown = (e: React.MouseEvent, tableId: string) => {
        if (!isEditMode) return;
        e.stopPropagation();
        setDraggingTableId(tableId);

        const currentPos = positions[tableId] || { x: 50, y: 50 };
        dragOffset.current = {
            x: e.clientX - currentPos.x * (zoom / 100),
            y: e.clientY - currentPos.y * (zoom / 100)
        };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!draggingTableId || !isEditMode) return;
        const scale = zoom / 100;
        let newX = Math.round((e.clientX - dragOffset.current.x) / scale);
        let newY = Math.round((e.clientY - dragOffset.current.y) / scale);

        if (snapGrid) {
            newX = Math.round(newX / 20) * 20;
            newY = Math.round(newY / 20) * 20;
        }

        newX = Math.max(10, Math.min(newX, 900));
        newY = Math.max(10, Math.min(newY, 650));

        setPositions((prev) => ({
            ...prev,
            [draggingTableId]: { x: newX, y: newY }
        }));
        setHasUnsavedChanges(true);
    };

    const handleMouseUp = () => {
        setDraggingTableId(null);
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        try {
            const bulkPayload = Object.entries(positions).map(([id, pos]) => ({
                id,
                posX: pos.x,
                posY: pos.y
            }));

            const res = await fetch('/api/restaurant/tables/bulk/positions', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ positions: bulkPayload })
            });
            const data = await res.json();
            if (data.success) {
                setHasUnsavedChanges(false);
                setIsEditMode(false);
                onTableUpdated();
            } else {
                alert(data.error || 'Failed to save layout');
            }
        } catch (err: any) {
            alert(err?.message || 'Error saving layout');
        } finally {
            setSaving(false);
        }
    };

    const handleQuickStatusChange = async (tableId: string, newStatus: string) => {
        try {
            const res = await fetch(`/api/restaurant/tables/${tableId}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                setStatusMenuTableId(null);
                onTableUpdated();
            }
        } catch {
            alert('Failed to update table status');
        }
    };

    const getStatusTheme = (status: string) => {
        switch (status.toUpperCase()) {
            case 'VACANT':
            case 'AVAILABLE':
                return {
                    border: 'border-emerald-500',
                    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
                    text: 'text-emerald-700 dark:text-emerald-300',
                    badge: 'bg-emerald-500 text-white',
                    label: 'Available'
                };
            case 'OCCUPIED':
                return {
                    border: 'border-rose-500',
                    bg: 'bg-rose-50 dark:bg-rose-950/40',
                    text: 'text-rose-700 dark:text-rose-300',
                    badge: 'bg-rose-500 text-white',
                    label: 'Occupied'
                };
            case 'RESERVED':
                return {
                    border: 'border-blue-500',
                    bg: 'bg-blue-50 dark:bg-blue-950/40',
                    text: 'text-blue-700 dark:text-blue-300',
                    badge: 'bg-blue-500 text-white',
                    label: 'Reserved'
                };
            default:
                return {
                    border: 'border-amber-500',
                    bg: 'bg-amber-50 dark:bg-amber-950/40',
                    text: 'text-amber-700 dark:text-amber-300',
                    badge: 'bg-amber-500 text-white',
                    label: 'Cleaning'
                };
        }
    };

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-[#18181f] border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                {/* Floor Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto">
                    <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
                        <Layers className="size-3.5" /> Floor:
                    </span>
                    {floors.map((fl) => (
                        <button
                            key={fl.id}
                            onClick={() => onFloorChange(fl.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer shrink-0 ${
                                activeFloorId === fl.id
                                    ? 'bg-primary text-white shadow-xs'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                            }`}
                        >
                            {fl.name}
                        </button>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-2">
                    {/* Zoom */}
                    <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <button
                            onClick={() => setZoom(Math.max(60, zoom - 15))}
                            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                            title="Zoom Out"
                        >
                            <ZoomOut className="size-3.5" />
                        </button>
                        <span className="text-[11px] font-mono px-1 font-semibold">{zoom}%</span>
                        <button
                            onClick={() => setZoom(Math.min(140, zoom + 15))}
                            className="p-1 rounded-lg hover:bg-white dark:hover:bg-slate-700 cursor-pointer"
                            title="Zoom In"
                        >
                            <ZoomIn className="size-3.5" />
                        </button>
                        <button
                            onClick={() => setSnapGrid(!snapGrid)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer transition ${
                                snapGrid ? 'bg-primary/20 text-primary' : 'text-slate-400'
                            }`}
                            title="Toggle Snap to 20px Grid"
                        >
                            Grid: {snapGrid ? 'ON' : 'OFF'}
                        </button>
                    </div>

                    {/* Mode Toggle */}
                    <button
                        onClick={() => setIsEditMode(!isEditMode)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            isEditMode
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                    >
                        {isEditMode ? <Unlock className="size-3.5" /> : <Lock className="size-3.5" />}
                        <span>{isEditMode ? 'Design Mode (Drag)' : 'Live Service Mode'}</span>
                    </button>

                    {/* Save Layout Button */}
                    {isEditMode && hasUnsavedChanges && (
                        <button
                            onClick={handleSaveLayout}
                            disabled={saving}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700 transition cursor-pointer shadow-sm animate-pulse"
                        >
                            <Save className="size-3.5" />
                            <span>{saving ? 'Saving…' : 'Save 2D Layout'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 2D Canvas Container */}
            <div
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="relative w-full h-[640px] bg-slate-100/70 dark:bg-[#121217] rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 overflow-auto select-none shadow-inner"
                style={{
                    backgroundImage: isEditMode
                        ? 'radial-gradient(circle, rgba(148, 163, 184, 0.25) 1px, transparent 1px)'
                        : 'none',
                    backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`
                }}
            >
                {/* Tables rendering */}
                <div
                    style={{
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left',
                        width: '1000px',
                        height: '700px',
                        position: 'relative'
                    }}
                >
                    {activeFloorTables.map((table) => {
                        const pos = positions[table.id] || { x: 50, y: 50 };
                        const theme = getStatusTheme(table.status);
                        const isDragging = draggingTableId === table.id;

                        return (
                            <div
                                key={table.id}
                                style={{
                                    left: `${pos.x}px`,
                                    top: `${pos.y}px`,
                                    position: 'absolute',
                                    zIndex: isDragging ? 40 : 10
                                }}
                                onMouseDown={(e) => handleMouseDown(e, table.id)}
                                onClick={() => {
                                    if (!isEditMode) {
                                        setStatusMenuTableId(statusMenuTableId === table.id ? null : table.id);
                                    }
                                }}
                                className={`w-36 h-28 rounded-2xl border-2 ${theme.border} ${theme.bg} shadow-md transition-shadow p-2.5 flex flex-col justify-between ${
                                    isEditMode
                                        ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-primary/40'
                                        : 'cursor-pointer hover:shadow-lg'
                                }`}
                            >
                                {/* Table Card Header */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">
                                            {table.code || `T-${table.table_number}`}
                                        </span>
                                        {table.is_vip && (
                                            <Star className="size-3.5 fill-amber-500 text-amber-500" />
                                        )}
                                    </div>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${theme.badge}`}
                                    >
                                        {theme.label}
                                    </span>
                                </div>

                                {/* Table Name / Capacity */}
                                <div>
                                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block truncate">
                                        {table.name}
                                    </span>
                                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                                        <Users className="size-3" />
                                        <span>Max {table.capacity} Persons</span>
                                    </div>
                                </div>

                                {/* Card Actions */}
                                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onOpenQr(table);
                                        }}
                                        className="text-slate-400 hover:text-primary transition cursor-pointer p-0.5"
                                        title="View Table QR Code"
                                    >
                                        <QrCode className="size-3.5" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onEditTable(table);
                                        }}
                                        className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                                    >
                                        Edit
                                    </button>
                                </div>

                                {/* Quick Status Popup (in Live Mode) */}
                                {statusMenuTableId === table.id && !isEditMode && (
                                    <div
                                        onClick={(e) => e.stopPropagation()}
                                        className="absolute -top-16 left-0 bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-1.5 flex items-center gap-1 z-50 animate-in fade-in zoom-in-95"
                                    >
                                        <button
                                            onClick={() => handleQuickStatusChange(table.id, 'VACANT')}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 hover:bg-emerald-200 transition cursor-pointer"
                                        >
                                            Vacant
                                        </button>
                                        <button
                                            onClick={() => handleQuickStatusChange(table.id, 'OCCUPIED')}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 hover:bg-rose-200 transition cursor-pointer"
                                        >
                                            Occupied
                                        </button>
                                        <button
                                            onClick={() => handleQuickStatusChange(table.id, 'RESERVED')}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-blue-100 text-blue-800 hover:bg-blue-200 transition cursor-pointer"
                                        >
                                            Reserved
                                        </button>
                                        <button
                                            onClick={() => handleQuickStatusChange(table.id, 'CLEANING')}
                                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 transition cursor-pointer"
                                        >
                                            Cleaning
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {activeFloorTables.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-xs">
                            No tables mapped to this floor yet. Click "+ Add Table" above to place tables on this floor.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
