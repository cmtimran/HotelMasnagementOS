import { useState } from 'react';
import {
    X, Sparkles, Upload, FileText, AlertTriangle, Layers,
    Building2, Hash, Plus, Trash2, Loader2,
    Download, Eye, Check
} from 'lucide-react';
import { getApiBaseUrl, getActivePropertyId } from '../../utils/apiUrl';
import { syncRoomTypesAndRoomsFromDB, broadcastPMSEvent } from '../../utils/roomInventoryEngine';
import { toast } from '../../context/ToastContext';

interface BulkRoomGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: number;
    roomTypes: Array<{ id: number | string; name: string; code?: string; bedType?: string }>;
    buildings: Array<{ id: number | string; name: string; code?: string }>;
    existingRooms: Array<{ number: string }>;
    onSuccess?: () => void;
}

interface TypeDistributionRule {
    id: string;
    fromIndex: number;
    toIndex: number;
    roomTypeId: string;
    bedType: string;
    bedCount: number;
    viewType: string;
    smokingStatus: string;
    isAccessible: boolean;
}

interface PreviewRoomItem {
    roomNumber: string;
    floorNumber: number;
    floorName: string;
    buildingName: string;
    roomTypeId: string;
    roomTypeName: string;
    bedType: string;
    bedCount: number;
    viewType: string;
    smokingStatus: string;
    phoneExt: string;
    lockId: string;
    isAccessible: boolean;
}

export default function BulkRoomGeneratorModal({
    isOpen,
    onClose,
    propertyId,
    roomTypes,
    buildings,
    existingRooms,
    onSuccess
}: BulkRoomGeneratorModalProps) {
    const activePropId = propertyId || getActivePropertyId();
    const [activeTab, setActiveTab] = useState<'wizard' | 'csv'>('wizard');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Wizard Form State
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>(() => String(buildings[0]?.id || ''));
    const [newBuildingName, setNewBuildingName] = useState('Main Tower');
    const [floorStart, setFloorStart] = useState<number>(1);
    const [floorEnd, setFloorEnd] = useState<number>(5);
    const [skipFloorsStr, setSkipFloorsStr] = useState<string>('13');
    const [roomsPerFloor, setRoomsPerFloor] = useState<number>(12);
    const [numberingScheme, setNumberingScheme] = useState<'standard' | 'building_prefix' | 'floor_dash' | 'four_digit'>('standard');
    const [buildingPrefix, setBuildingPrefix] = useState('A');
    const [phoneExtPrefix, setPhoneExtPrefix] = useState('2');
    const [lockPrefix, setLockPrefix] = useState('LOCK-');

    // Room Distribution Rules
    const [rules, setRules] = useState<TypeDistributionRule[]>(() => [
        {
            id: '1',
            fromIndex: 1,
            toIndex: 6,
            roomTypeId: String(roomTypes[0]?.id || '1'),
            bedType: roomTypes[0]?.bedType || 'King',
            bedCount: 1,
            viewType: 'City View',
            smokingStatus: 'Non-Smoking',
            isAccessible: false
        },
        {
            id: '2',
            fromIndex: 7,
            toIndex: 12,
            roomTypeId: String(roomTypes[1]?.id || roomTypes[0]?.id || '1'),
            bedType: 'Twin',
            bedCount: 2,
            viewType: 'Garden View',
            smokingStatus: 'Non-Smoking',
            isAccessible: false
        }
    ]);

    // Live Preview State
    const [previewRooms, setPreviewRooms] = useState<PreviewRoomItem[]>([]);
    const [hasGeneratedPreview, setHasGeneratedPreview] = useState(false);

    // CSV Import State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvRows, setCsvRows] = useState<any[]>([]);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    if (!isOpen) return null;

    // Existing Room Numbers Set for instant duplicate detection
    const existingRoomNumbers = new Set(existingRooms.map(r => String(r.number).trim().toUpperCase()));

    // Total expected rooms calculation
    const skippedFloors = skipFloorsStr
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !isNaN(n));
    const effectiveFloorsCount = Math.max(0, Array.from({ length: Math.max(0, floorEnd - floorStart + 1) }, (_, i) => floorStart + i).filter(f => !skippedFloors.includes(f)).length);
    const totalExpectedRooms = effectiveFloorsCount * roomsPerFloor;

    // Helper to generate preview
    const handleGeneratePreview = () => {
        if (floorStart > floorEnd) {
            toast.error('Starting floor cannot be greater than ending floor.');
            return;
        }
        if (roomsPerFloor <= 0 || roomsPerFloor > 100) {
            toast.error('Rooms per floor must be between 1 and 100.');
            return;
        }

        const generated: PreviewRoomItem[] = [];
        const targetBuildingName = buildings.find(b => String(b.id) === selectedBuildingId)?.name || newBuildingName;

        for (let fl = floorStart; fl <= floorEnd; fl++) {
            if (skippedFloors.includes(fl)) continue;

            for (let rIdx = 1; rIdx <= roomsPerFloor; rIdx++) {
                const rPadded = String(rIdx).padStart(2, '0');
                let rNum = '';
                if (numberingScheme === 'four_digit') {
                    rNum = `${String(fl).padStart(2, '0')}${rPadded}`;
                } else if (numberingScheme === 'floor_dash') {
                    rNum = `${fl}-${rPadded}`;
                } else if (numberingScheme === 'building_prefix') {
                    rNum = `${buildingPrefix}-${fl}${rPadded}`;
                } else {
                    rNum = `${fl}${rPadded}`;
                }

                // Match rule
                const matchedRule = rules.find(rule => rIdx >= rule.fromIndex && rIdx <= rule.toIndex) || rules[0];
                const matchedRT = roomTypes.find(rt => String(rt.id) === matchedRule?.roomTypeId) || roomTypes[0];

                generated.push({
                    roomNumber: rNum,
                    floorNumber: fl,
                    floorName: `Floor ${fl}`,
                    buildingName: targetBuildingName,
                    roomTypeId: String(matchedRT?.id || '1'),
                    roomTypeName: matchedRT?.name || 'Standard Room',
                    bedType: matchedRule?.bedType || 'King',
                    bedCount: matchedRule?.bedCount || 1,
                    viewType: matchedRule?.viewType || 'City View',
                    smokingStatus: matchedRule?.smokingStatus || 'Non-Smoking',
                    phoneExt: `${phoneExtPrefix}${rNum}`,
                    lockId: `${lockPrefix}${rNum}`,
                    isAccessible: Boolean(matchedRule?.isAccessible)
                });
            }
        }

        setPreviewRooms(generated);
        setHasGeneratedPreview(true);
        toast.info(`Generated preview for ${generated.length} rooms across ${effectiveFloorsCount} floors.`);
    };

    // Submit Wizard Batch to Backend
    const handleCommitWizard = async () => {
        setIsSubmitting(true);
        try {
            const payload = {
                propertyId: activePropId,
                buildingId: selectedBuildingId ? Number(selectedBuildingId) : undefined,
                buildingName: newBuildingName,
                floorStart,
                floorEnd,
                skipFloors: skippedFloors,
                roomsPerFloor,
                numberingScheme,
                buildingPrefix,
                phoneExtPrefix,
                lockPrefix,
                roomTypeDistribution: rules
            };

            const res = await fetch(`${getApiBaseUrl()}/api/rooms/bulk-generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!data.success) {
                toast.error(data.error || 'Failed to bulk-generate rooms.');
                setIsSubmitting(false);
                return;
            }

            toast.success(data.message || 'Rooms generated successfully!');
            await syncRoomTypesAndRoomsFromDB(activePropId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(`Batch generation error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Add new distribution rule
    const handleAddRule = () => {
        const lastRule = rules[rules.length - 1];
        const nextFrom = lastRule ? lastRule.toIndex + 1 : 1;
        const nextTo = Math.min(roomsPerFloor, nextFrom + 3);

        const newRule: TypeDistributionRule = {
            id: String(Date.now()),
            fromIndex: nextFrom,
            toIndex: nextTo,
            roomTypeId: String(roomTypes[0]?.id || '1'),
            bedType: 'King',
            bedCount: 1,
            viewType: 'City View',
            smokingStatus: 'Non-Smoking',
            isAccessible: false
        };
        setRules([...rules, newRule]);
    };

    const handleRemoveRule = (ruleId: string) => {
        if (rules.length <= 1) {
            toast.error('You must keep at least one room distribution rule.');
            return;
        }
        setRules(rules.filter(r => r.id !== ruleId));
    };

    // Download Sample CSV
    const handleDownloadSampleCsv = () => {
        const headers = 'roomNumber,roomTypeCode,floorNumber,buildingName,bedType,bedCount,viewType,smokingStatus,phoneExt,lockId,isAccessible';
        const sampleRows = [
            '101,DELUXE,1,Main Tower,King,1,City View,Non-Smoking,2101,LOCK-101,false',
            '102,DELUXE,1,Main Tower,King,1,City View,Non-Smoking,2102,LOCK-102,false',
            '103,TWIN,1,Main Tower,Twin,2,Garden View,Non-Smoking,2103,LOCK-103,false',
            '104,SUITE,1,Main Tower,King,1,Sea View,Non-Smoking,2104,LOCK-104,true',
            '201,DELUXE,2,Main Tower,King,1,City View,Non-Smoking,2201,LOCK-201,false'
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...sampleRows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'HotelManagementOS_Rooms_Template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // Parse CSV File in Browser
    const handleCsvUpload = (file: File) => {
        setCsvFile(file);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            if (lines.length < 2) {
                setCsvErrors(['CSV file must have a header row and at least one data row.']);
                return;
            }

            const headerCols = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));
            const parsed: any[] = [];
            const errors: string[] = [];

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
                if (cols.length === 0 || (cols.length === 1 && !cols[0])) continue;

                const rowObj: any = {};
                headerCols.forEach((colName, idx) => {
                    rowObj[colName] = cols[idx] || '';
                });

                const rNum = rowObj.roomnumber || rowObj.roomno || rowObj.number;
                if (!rNum) {
                    errors.push(`Row ${i + 1}: Missing room number.`);
                } else if (existingRoomNumbers.has(rNum.toUpperCase())) {
                    errors.push(`Row ${i + 1}: Room "${rNum}" already exists in inventory.`);
                }

                parsed.push({
                    roomNumber: rNum,
                    roomTypeCode: rowObj.roomtypecode || rowObj.roomtype || '',
                    floorNumber: parseInt(rowObj.floornumber || rowObj.floor || '1', 10) || 1,
                    buildingName: rowObj.buildingname || rowObj.building || 'Main Tower',
                    bedType: rowObj.bedtype || 'King',
                    bedCount: parseInt(rowObj.bedcount || '1', 10) || 1,
                    viewType: rowObj.viewtype || 'City View',
                    smokingStatus: rowObj.smokingstatus || 'Non-Smoking',
                    phoneExt: rowObj.phoneext || `2${rNum}`,
                    lockId: rowObj.lockid || `LOCK-${rNum}`,
                    isAccessible: String(rowObj.isaccessible).toLowerCase() === 'true'
                });
            }

            setCsvRows(parsed);
            setCsvErrors(errors);
        };
        reader.readAsText(file);
    };

    // Commit CSV to Backend
    const handleCommitCsv = async () => {
        if (csvRows.length === 0) {
            toast.error('No valid room rows to import.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/rooms/bulk-import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: activePropId,
                    rows: csvRows
                })
            });

            const data = await res.json();
            if (!data.success) {
                toast.error(data.error || 'Failed to import CSV rooms.');
                setIsSubmitting(false);
                return;
            }

            toast.success(data.message || `Successfully imported ${data.data?.importedCount || csvRows.length} rooms!`);
            await syncRoomTypesAndRoomsFromDB(activePropId);
            broadcastPMSEvent({ type: 'INVENTORY_REFRESH' });
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(`Import error: ${err.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-5xl my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                            <Sparkles size={20} className="animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                                <span>Bulk Room & Floor Generator</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                                    Enterprise 500+ Rooms
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Instantly generate hundreds of rooms with multi-floor schemes or import directly from CSV/Excel
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-6 border-b border-slate-100 flex items-center gap-6 bg-white text-xs font-semibold">
                    <button
                        onClick={() => setActiveTab('wizard')}
                        className={`py-3 border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'wizard'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Sparkles size={14} />
                        <span>Smart Batch Generator (Wizard)</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('csv')}
                        className={`py-3 border-b-2 flex items-center gap-2 transition ${
                            activeTab === 'csv'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <Upload size={14} />
                        <span>CSV / Excel Bulk Importer</span>
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {activeTab === 'wizard' && (
                        <div className="space-y-6">
                            {/* Step 1: Building & Floors Config */}
                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    <Building2 size={14} className="text-blue-600" />
                                    <span>Step 1: Building & Floor Configuration</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Target Building</label>
                                        <select
                                            value={selectedBuildingId}
                                            onChange={(e) => setSelectedBuildingId(e.target.value)}
                                            className="input-standard !h-8.5 w-full !text-xs"
                                        >
                                            {buildings.map(b => (
                                                <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                            <option value="">+ Create New Building</option>
                                        </select>
                                    </div>

                                    {!selectedBuildingId && (
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">New Building Name</label>
                                            <input
                                                type="text"
                                                value={newBuildingName}
                                                onChange={(e) => setNewBuildingName(e.target.value)}
                                                className="input-standard !h-8.5 w-full !text-xs"
                                                placeholder="e.g. West Wing / Tower B"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Floor Range (From - To)</label>
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={floorStart}
                                                onChange={(e) => setFloorStart(parseInt(e.target.value, 10) || 1)}
                                                className="input-standard !h-8.5 w-full !text-xs text-center"
                                            />
                                            <span className="text-slate-400 font-bold">to</span>
                                            <input
                                                type="number"
                                                min={1}
                                                max={100}
                                                value={floorEnd}
                                                onChange={(e) => setFloorEnd(parseInt(e.target.value, 10) || 1)}
                                                className="input-standard !h-8.5 w-full !text-xs text-center"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Rooms per Floor</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={100}
                                            value={roomsPerFloor}
                                            onChange={(e) => setRoomsPerFloor(parseInt(e.target.value, 10) || 1)}
                                            className="input-standard !h-8.5 w-full !text-xs"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                            Omit / Skip Floors <span className="text-slate-400 font-normal">(comma-separated)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={skipFloorsStr}
                                            onChange={(e) => setSkipFloorsStr(e.target.value)}
                                            placeholder="e.g. 4, 13 (Superstition / Lobby)"
                                            className="input-standard !h-8.5 w-full !text-xs"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Numbering & Hardware Patterns */}
                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                    <Hash size={14} className="text-blue-600" />
                                    <span>Step 2: Numbering Schemes & Hardware Patterns</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Room Number Scheme</label>
                                        <select
                                            value={numberingScheme}
                                            onChange={(e) => setNumberingScheme(e.target.value as any)}
                                            className="input-standard !h-8.5 w-full !text-xs"
                                        >
                                            <option value="standard">Standard (101, 102, 201...)</option>
                                            <option value="four_digit">4-Digit Zero-Padded (0101, 0102...)</option>
                                            <option value="building_prefix">Building Prefix (A-101, A-102...)</option>
                                            <option value="floor_dash">Hyphenated (1-01, 1-02...)</option>
                                        </select>
                                    </div>

                                    {numberingScheme === 'building_prefix' && (
                                        <div>
                                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Building Prefix</label>
                                            <input
                                                type="text"
                                                value={buildingPrefix}
                                                onChange={(e) => setBuildingPrefix(e.target.value.toUpperCase())}
                                                className="input-standard !h-8.5 w-full !text-xs"
                                                placeholder="e.g. A, B, T1"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Phone Ext Formula</label>
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={phoneExtPrefix}
                                                onChange={(e) => setPhoneExtPrefix(e.target.value)}
                                                className="input-standard !h-8.5 w-20 !text-xs text-center rounded-r-none"
                                            />
                                            <span className="h-8.5 px-2 bg-slate-200 border border-l-0 border-slate-300 rounded-r-lg flex items-center text-[10px] text-slate-600 font-mono">
                                                + [Room#]
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Smart Keycard Lock Prefix</label>
                                        <div className="flex items-center">
                                            <input
                                                type="text"
                                                value={lockPrefix}
                                                onChange={(e) => setLockPrefix(e.target.value)}
                                                className="input-standard !h-8.5 w-24 !text-xs text-center rounded-r-none"
                                            />
                                            <span className="h-8.5 px-2 bg-slate-200 border border-l-0 border-slate-300 rounded-r-lg flex items-center text-[10px] text-slate-600 font-mono">
                                                + [Room#]
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Room Type & Bed Distribution Matrix */}
                            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                                        <Layers size={14} className="text-blue-600" />
                                        <span>Step 3: Floor Room Distribution Matrix</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleAddRule}
                                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 cursor-pointer"
                                    >
                                        <Plus size={13} />
                                        <span>Add Distribution Slice</span>
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    {rules.map((rule) => (
                                        <div key={rule.id} className="bg-white p-3 rounded-lg border border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-8 gap-2 items-center text-xs">
                                            <div className="col-span-2 flex items-center gap-1.5">
                                                <span className="text-[10px] font-bold text-slate-400">R:</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={roomsPerFloor}
                                                    value={rule.fromIndex}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10) || 1;
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, fromIndex: val } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-14 !text-xs text-center"
                                                />
                                                <span className="text-slate-400">to</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={roomsPerFloor}
                                                    value={rule.toIndex}
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value, 10) || 1;
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, toIndex: val } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-14 !text-xs text-center"
                                                />
                                            </div>

                                            <div className="col-span-2">
                                                <select
                                                    value={rule.roomTypeId}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const matched = roomTypes.find(rt => String(rt.id) === val);
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, roomTypeId: val, bedType: matched?.bedType || r.bedType } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-full !text-xs font-semibold text-slate-800"
                                                >
                                                    {roomTypes.map(rt => (
                                                        <option key={rt.id} value={rt.id}>{rt.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            <div>
                                                <select
                                                    value={rule.bedType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, bedType: val } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-full !text-xs"
                                                >
                                                    <option value="King">King Bed (1)</option>
                                                    <option value="Queen">Queen Bed (1)</option>
                                                    <option value="Twin">2 Twin Beds</option>
                                                    <option value="Single">Single Bed</option>
                                                    <option value="Double">Double Bed</option>
                                                    <option value="Hollywood Twin">Hollywood Twin</option>
                                                </select>
                                            </div>

                                            <div>
                                                <select
                                                    value={rule.viewType}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, viewType: val } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-full !text-xs"
                                                >
                                                    <option value="City View">City View</option>
                                                    <option value="Sea View">Sea View</option>
                                                    <option value="Garden View">Garden View</option>
                                                    <option value="Pool View">Pool View</option>
                                                    <option value="Mountain View">Mountain View</option>
                                                </select>
                                            </div>

                                            <div>
                                                <select
                                                    value={rule.smokingStatus}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setRules(rules.map(r => r.id === rule.id ? { ...r, smokingStatus: val } : r));
                                                    }}
                                                    className="input-standard !h-7.5 w-full !text-xs"
                                                >
                                                    <option value="Non-Smoking">Non-Smoking</option>
                                                    <option value="Smoking">Smoking</option>
                                                    <option value="Balcony Smoking Only">Balcony</option>
                                                </select>
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRule(rule.id)}
                                                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded transition"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Bar & Preview Generator */}
                            <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
                                <div>
                                    <div className="text-xs font-bold text-blue-900">
                                        Estimated Scope: {totalExpectedRooms} Rooms ({effectiveFloorsCount} Floors &times; {roomsPerFloor} rooms/floor)
                                    </div>
                                    <div className="text-[11px] text-blue-700 mt-0.5">
                                        Generates clean physical inventory records in Cloud PostgreSQL in one single atomic transaction.
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleGeneratePreview}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                                >
                                    <Eye size={14} />
                                    <span>Generate Live Preview ({totalExpectedRooms})</span>
                                </button>
                            </div>

                            {/* Preview Grid */}
                            {hasGeneratedPreview && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold text-slate-800">
                                            Previewing Generated Inventory ({previewRooms.length} Rooms Ready)
                                        </div>
                                        <span className="text-[11px] text-slate-500">
                                            Duplicates against existing DB are automatically prevented.
                                        </span>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase sticky top-0">
                                                <tr>
                                                    <th className="py-2 px-3">Room #</th>
                                                    <th className="py-2 px-3">Floor</th>
                                                    <th className="py-2 px-3">Room Type</th>
                                                    <th className="py-2 px-3">Bed Setup</th>
                                                    <th className="py-2 px-3">View</th>
                                                    <th className="py-2 px-3">Smoking</th>
                                                    <th className="py-2 px-3">Phone Ext</th>
                                                    <th className="py-2 px-3">Lock ID</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {previewRooms.slice(0, 100).map((rm, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/80">
                                                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{rm.roomNumber}</td>
                                                        <td className="py-1.5 px-3 text-slate-600">{rm.floorName}</td>
                                                        <td className="py-1.5 px-3 font-semibold text-blue-600">{rm.roomTypeName}</td>
                                                        <td className="py-1.5 px-3 text-slate-700">{rm.bedType} ({rm.bedCount})</td>
                                                        <td className="py-1.5 px-3 text-slate-600">{rm.viewType}</td>
                                                        <td className="py-1.5 px-3 text-slate-600">{rm.smokingStatus}</td>
                                                        <td className="py-1.5 px-3 font-mono text-slate-500">{rm.phoneExt}</td>
                                                        <td className="py-1.5 px-3 font-mono text-slate-500">{rm.lockId}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {previewRooms.length > 100 && (
                                        <div className="text-[11px] text-slate-400 text-center">
                                            Showing first 100 of {previewRooms.length} rooms...
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'csv' && (
                        <div className="space-y-6">
                            {/* Download Template Banner */}
                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="size-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold">
                                        <FileText size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-bold text-emerald-950">Standard Hospitality CSV Template</h3>
                                        <p className="text-[11px] text-emerald-700 mt-0.5">
                                            Download pre-formatted spreadsheet template with sample columns (Room#, Type, Bed, View, Phone, Lock).
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleDownloadSampleCsv}
                                    className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-100/60 text-emerald-800 font-semibold text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Download size={13} />
                                    <span>Download CSV Template</span>
                                </button>
                            </div>

                            {/* Drop Zone */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                                        handleCsvUpload(e.dataTransfer.files[0]);
                                    }
                                }}
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition cursor-pointer ${
                                    isDragging ? 'border-blue-500 bg-blue-50/50' : 'border-slate-300 hover:border-blue-400 bg-slate-50/50'
                                }`}
                                onClick={() => document.getElementById('csv-file-input')?.click()}
                            >
                                <input
                                    id="csv-file-input"
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleCsvUpload(e.target.files[0]);
                                        }
                                    }}
                                />
                                <Upload size={32} className="mx-auto text-slate-400 mb-2" />
                                <div className="text-sm font-semibold text-slate-700">
                                    {csvFile ? csvFile.name : 'Click to browse or drag & drop CSV file here'}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Supports up to 2,000 rooms per file. Comma-separated values (.csv)
                                </div>
                            </div>

                            {/* CSV Errors / Warnings */}
                            {csvErrors.length > 0 && (
                                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                                    <div className="font-bold flex items-center gap-1.5 text-amber-800">
                                        <AlertTriangle size={15} />
                                        <span>Validation Warnings ({csvErrors.length})</span>
                                    </div>
                                    <ul className="list-disc pl-5 space-y-0.5 max-h-32 overflow-y-auto text-[11px]">
                                        {csvErrors.map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Parsed Rows Preview */}
                            {csvRows.length > 0 && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-800">
                                            Parsed CSV Data ({csvRows.length} Valid Rooms Ready for Ingestion)
                                        </span>
                                    </div>

                                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase sticky top-0">
                                                <tr>
                                                    <th className="py-2 px-3">Room #</th>
                                                    <th className="py-2 px-3">Floor</th>
                                                    <th className="py-2 px-3">Type Code</th>
                                                    <th className="py-2 px-3">Bed</th>
                                                    <th className="py-2 px-3">View</th>
                                                    <th className="py-2 px-3">Ext</th>
                                                    <th className="py-2 px-3">Lock</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {csvRows.slice(0, 100).map((r, i) => (
                                                    <tr key={i} className="hover:bg-slate-50/80">
                                                        <td className="py-1.5 px-3 font-mono font-bold text-slate-900">{r.roomNumber}</td>
                                                        <td className="py-1.5 px-3 text-slate-600">Floor {r.floorNumber}</td>
                                                        <td className="py-1.5 px-3 font-semibold text-blue-600">{r.roomTypeCode}</td>
                                                        <td className="py-1.5 px-3 text-slate-700">{r.bedType} ({r.bedCount})</td>
                                                        <td className="py-1.5 px-3 text-slate-600">{r.viewType}</td>
                                                        <td className="py-1.5 px-3 font-mono text-slate-500">{r.phoneExt}</td>
                                                        <td className="py-1.5 px-3 font-mono text-slate-500">{r.lockId}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn-secondary text-xs"
                    >
                        Cancel
                    </button>

                    {activeTab === 'wizard' ? (
                        <button
                            type="button"
                            disabled={isSubmitting || !hasGeneratedPreview || previewRooms.length === 0}
                            onClick={handleCommitWizard}
                            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Ingesting Rooms to Cloud DB...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    <span>Commit {previewRooms.length} Rooms to Database</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            type="button"
                            disabled={isSubmitting || csvRows.length === 0}
                            onClick={handleCommitCsv}
                            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={14} className="animate-spin" />
                                    <span>Importing CSV Rows...</span>
                                </>
                            ) : (
                                <>
                                    <Check size={14} />
                                    <span>Import {csvRows.length} Rooms from CSV</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
