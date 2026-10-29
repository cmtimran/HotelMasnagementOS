import React, { useState, useEffect } from 'react';
import {
    Sparkles,
    CheckCircle2,
    Clock,
    Users,
    AlertTriangle,
    Save,
    RotateCcw,
    UserCheck,
    Palette
} from 'lucide-react';
import {
    type HousekeepingSettings,
    DEFAULT_HOUSEKEEPING_SETTINGS,
    getHousekeepingSettings,
    saveHousekeepingSettings,
    getHousekeepersList,
    saveHousekeepersList,
    type Housekeeper
} from '../utils/housekeepingSettingsEngine';
import { toast } from '../context/ToastContext';
import { getActivePropertyId } from '../utils/apiUrl';

interface HousekeepingSettingsTabProps {
    propertyId?: number;
    onSaveSuccess?: () => void;
}

export const HousekeepingSettingsTab: React.FC<HousekeepingSettingsTabProps> = ({
    propertyId = getActivePropertyId(),
    onSaveSuccess
}) => {
    const [settings, setSettings] = useState<HousekeepingSettings>(() => getHousekeepingSettings(propertyId));
    const [housekeepers, setHousekeepers] = useState<Housekeeper[]>(() => getHousekeepersList(propertyId));
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingHousekeeper, setIsAddingHousekeeper] = useState(false);
    const [newHk, setNewHk] = useState({
        name: '',
        employeeId: '',
        phone: '',
        shift: 'Morning (07:00 - 15:30)' as Housekeeper['shift'],
        assignedZone: 'Floor 1',
        maxCredits: 14
    });

    useEffect(() => {
        setSettings(getHousekeepingSettings(propertyId));
        setHousekeepers(getHousekeepersList(propertyId));
    }, [propertyId]);

    const handleSave = () => {
        setIsSaving(true);
        try {
            saveHousekeepingSettings(settings, propertyId);
            saveHousekeepersList(housekeepers, propertyId);
            toast.success('Housekeeping settings and roster successfully saved.');
            onSaveSuccess?.();
        } catch (e: any) {
            toast.error(e?.message || 'Failed to save housekeeping settings.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleResetDefaults = () => {
        if (window.confirm('Reset all housekeeping settings to recommended industry standards?')) {
            setSettings(DEFAULT_HOUSEKEEPING_SETTINGS);
            toast.info('Housekeeping settings reset to defaults. Click Save to persist.');
        }
    };

    const handleAddHousekeeper = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newHk.name.trim()) {
            toast.error('Housekeeper name is required');
            return;
        }
        const created: Housekeeper = {
            id: `hk_${Date.now()}`,
            employeeId: newHk.employeeId.trim() || `HK-${100 + housekeepers.length + 1}`,
            name: newHk.name.trim(),
            phone: newHk.phone.trim() || '+880 1711 000000',
            shift: newHk.shift,
            assignedZone: newHk.assignedZone.trim() || 'All Floors',
            status: 'active',
            maxCredits: Number(newHk.maxCredits) || 14
        };
        const updated = [...housekeepers, created];
        setHousekeepers(updated);
        saveHousekeepersList(updated, propertyId);
        setIsAddingHousekeeper(false);
        setNewHk({
            name: '',
            employeeId: '',
            phone: '',
            shift: 'Morning (07:00 - 15:30)',
            assignedZone: 'Floor 1',
            maxCredits: 14
        });
        toast.success(`Housekeeper ${created.name} added to roster.`);
    };

    const handleRemoveHousekeeper = (id: string) => {
        const filtered = housekeepers.filter(h => h.id !== id);
        setHousekeepers(filtered);
        saveHousekeepersList(filtered, propertyId);
        toast.info('Housekeeper removed from roster.');
    };

    return (
        <div className="space-y-6">
            
            {/* Top Overview & Save Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-indigo-50/70 via-blue-50/50 to-white rounded-xl border border-indigo-100">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                        <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-900">Housekeeping Department & Standard Operating Policies</h3>
                        <p className="text-xs text-slate-500">
                            Configure automatic room turnover, long-stay cleaning schedules, maid credits, and supervisor inspection gates.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Defaults
                    </button>
                    <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSave}
                        className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                    >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>

            {/* 1. Automation & Turnover Rules */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        1. Automatic Turnover & Front Desk Enforcement Gates
                    </h4>
                </div>

                <div className="p-5 space-y-4">
                    {/* Auto Dirty on Checkout */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <label className="text-xs font-bold text-slate-900 block">
                                Auto-Set Room to 'Dirty' upon Guest Check-out
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Whenever a room is checked out at Front Desk, immediately flag its housekeeping status as 'Dirty' to trigger turnover cleaning.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.autoDirtyOnCheckout}
                                onChange={(e) => setSettings({ ...settings, autoDirtyOnCheckout: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {/* Auto Dirty on Night Audit */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <label className="text-xs font-bold text-slate-900 block">
                                Auto-Set Occupied Rooms to 'Dirty' during Night Audit
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Automatically queue daily stayover housekeeping for all in-house occupied rooms at business date rollover (02:00 AM).
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.autoDirtyOnNightAudit}
                                onChange={(e) => setSettings({ ...settings, autoDirtyOnNightAudit: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {/* Strict Check-in Gate */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <div className="flex items-center gap-1.5">
                                <label className="text-xs font-bold text-slate-900 block">
                                    Strict Check-In Guard (Block Check-in to Dirty Rooms)
                                </label>
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 font-bold text-[9.5px] rounded">
                                    Recommended
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                Front Desk executives cannot perform Check-In on a room that is currently in 'Dirty' or 'Out of Order' status.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.requireInspectionBeforeCheckIn}
                                onChange={(e) => setSettings({ ...settings, requireInspectionBeforeCheckIn: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    {/* Auto Mark Clean on Inspection */}
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-900 block">
                                Direct Promotion on Supervisor Inspection Approval
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                When a housekeeping supervisor signs off on the room QA checklist, immediately mark room as 'Inspected' & ready for guests.
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                                type="checkbox"
                                checked={settings.autoMarkCleanOnInspection}
                                onChange={(e) => setSettings({ ...settings, autoMarkCleanOnInspection: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* 2. Cleaning Schedules & Long-Stay Frequencies */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        2. Long-Stay Cleaning Schedules & Linen Change Frequencies
                    </h4>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Stayover Cleaning Frequency */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Default Stayover Cleaning Frequency
                        </label>
                        <select
                            value={settings.defaultStayoverFrequency}
                            onChange={(e) => setSettings({ ...settings, defaultStayoverFrequency: e.target.value as any })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="daily">Daily Stayover Refresh (Standard 5-Star)</option>
                            <option value="every-2-days">Every 2 Days (Eco-Green Program)</option>
                            <option value="every-3-days">Every 3 Days (Extended Stay Policy)</option>
                            <option value="on-request">On Guest Request Only</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Frequency of general room tidying, trash emptying and bed make-up for in-house guests.
                        </p>
                    </div>

                    {/* Linen & Bed Sheet Change Frequency */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Bed Linen & Duvet Change Cycle (Days)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={1}
                                max={7}
                                value={settings.linenChangeFrequencyDays}
                                onChange={(e) => setSettings({ ...settings, linenChangeFrequencyDays: Number(e.target.value) || 3 })}
                                className="w-24 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                            />
                            <span className="text-xs text-slate-600 font-medium">
                                Every {settings.linenChangeFrequencyDays} nights (Shows 'Linen Change Due' badge)
                            </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Full change of bed sheets, pillow slips, and duvet covers during multi-night stays.
                        </p>
                    </div>

                    {/* Towel Policy */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Towel Replacement Policy
                        </label>
                        <select
                            value={settings.towelPolicy}
                            onChange={(e) => setSettings({ ...settings, towelPolicy: e.target.value as any })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value="eco">Eco Policy (Replace only towels placed on bathroom floor)</option>
                            <option value="daily">Daily Replacement (Replace all bath & hand towels daily)</option>
                            <option value="on-floor">On-Floor Replacement</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Environmental hospitality policy printed on guest bathroom cards.
                        </p>
                    </div>

                    {/* Deep Clean Interval */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Preventive Deep Clean Cycle (Days)
                        </label>
                        <select
                            value={settings.deepCleanIntervalDays}
                            onChange={(e) => setSettings({ ...settings, deepCleanIntervalDays: Number(e.target.value) || 30 })}
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                        >
                            <option value={15}>Every 15 Days (High Turnover)</option>
                            <option value={30}>Every 30 Days (Recommended)</option>
                            <option value={60}>Every 60 Days</option>
                            <option value={90}>Quarterly (Every 90 Days)</option>
                        </select>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Deep shampoo, air duct sanitization, and grout scrubbing intervals.
                        </p>
                    </div>
                </div>
            </div>

            {/* 3. Housekeeper Workload & Credit System */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            3. Housekeeper Workload & Room Credit System
                        </h4>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                        1 Credit = approx. 30 mins standard cleaning
                    </span>
                </div>

                <div className="p-5 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Standard Room Credit */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Standard Room Credit
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="0.5"
                                    max="5"
                                    value={settings.creditPerStandardRoom}
                                    onChange={(e) => setSettings({ ...settings, creditPerStandardRoom: parseFloat(e.target.value) || 1.0 })}
                                    className="w-20 px-2 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-center bg-white"
                                />
                                <span className="text-xs text-slate-500">Credits / 30m</span>
                            </div>
                        </div>

                        {/* Suite Room Credit */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Junior / Executive Suite Credit
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="8"
                                    value={settings.creditPerSuite}
                                    onChange={(e) => setSettings({ ...settings, creditPerSuite: parseFloat(e.target.value) || 2.0 })}
                                    className="w-20 px-2 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-center bg-white"
                                />
                                <span className="text-xs text-slate-500">Credits / 60m</span>
                            </div>
                        </div>

                        {/* Connecting / Royal Suite Credit */}
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Presidential / Connecting Suite
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    step="0.5"
                                    min="1"
                                    max="10"
                                    value={settings.creditPerConnectingSuite}
                                    onChange={(e) => setSettings({ ...settings, creditPerConnectingSuite: parseFloat(e.target.value) || 3.0 })}
                                    className="w-20 px-2 py-1.5 text-xs font-mono font-bold border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 text-center bg-white"
                                />
                                <span className="text-xs text-slate-500">Credits / 90m</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        {/* Max credits per shift */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Maximum Target Credits per Maid per 8-Hour Shift
                            </label>
                            <input
                                type="number"
                                min={5}
                                max={25}
                                value={settings.maxCreditsPerHousekeeper}
                                onChange={(e) => setSettings({ ...settings, maxCreditsPerHousekeeper: parseFloat(e.target.value) || 14.0 })}
                                className="w-32 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                Standard international target is 14 credits (approx. 7–8 standard turnovers per maid).
                            </p>
                        </div>

                        {/* Auto-assignment strategy */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Auto-Assignment Algorithm Strategy
                            </label>
                            <select
                                value={settings.autoAssignStrategy}
                                onChange={(e) => setSettings({ ...settings, autoAssignStrategy: e.target.value as any })}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                            >
                                <option value="by-credits">Workload Credits Balancing (Fair effort distribution)</option>
                                <option value="by-floor">By Floor & Wing Zones (Minimize elevator transit)</option>
                                <option value="equal-count">Equal Room Count</option>
                            </select>
                            <p className="text-[11px] text-slate-500 mt-1">
                                Used when clicking 'Auto-Assign Rooms' in the Housekeeping module.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 4. Priority, Rush & QA Alerts */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        4. Rush Rooms, DND Escalation & QA Checklist
                    </h4>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Rush Room Threshold */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Rush Room Threshold (Minutes before Arrival)
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={30}
                                max={360}
                                step={15}
                                value={settings.rushRoomAlertMinutes}
                                onChange={(e) => setSettings({ ...settings, rushRoomAlertMinutes: parseInt(e.target.value, 10) || 120 })}
                                className="w-24 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                            />
                            <span className="text-xs text-slate-600 font-medium">Minutes</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Flags room as 'RUSH' with red priority if next check-in is expected within this window.
                        </p>
                    </div>

                    {/* DND Escalation */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Do Not Disturb (DND) Max Hours before Alert
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                min={6}
                                max={48}
                                value={settings.dndMaxHoursAlert}
                                onChange={(e) => setSettings({ ...settings, dndMaxHoursAlert: parseInt(e.target.value, 10) || 24 })}
                                className="w-24 px-3 py-2 text-xs font-mono font-bold border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-center"
                            />
                            <span className="text-xs text-slate-600 font-medium">Hours</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                            Hospitality wellness check: Alerts Duty Manager if guest has DND on for more than 24 hours.
                        </p>
                    </div>

                    {/* Guest Requests Sync */}
                    <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <label className="text-xs font-bold text-slate-900 block">
                                Surface Front Desk & Guest Special Requests
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Show guest preferences (e.g. extra pillows, hypoallergenic, quiet clean) directly on housekeeping room job sheets.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.showGuestRequestsInHousekeeping}
                            onChange={(e) => setSettings({ ...settings, showGuestRequestsInHousekeeping: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1"
                        />
                    </div>

                    {/* Enforce Inspection Checklist */}
                    <div className="flex items-start justify-between gap-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div>
                            <label className="text-xs font-bold text-slate-900 block">
                                Enforce 6-Point Inspection Checklist
                            </label>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                                Require supervisors to verify bedding, bathroom, minibar, and electronics before marking rooms 'Inspected'.
                            </p>
                        </div>
                        <input
                            type="checkbox"
                            checked={settings.enableInspectionChecklist}
                            onChange={(e) => setSettings({ ...settings, enableInspectionChecklist: e.target.checked })}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 mt-1"
                        />
                    </div>
                </div>
            </div>

            {/* 5. Housekeepers Roster Management */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            5. Active Housekeepers Roster & Shift Assignments ({housekeepers.length})
                        </h4>
                    </div>
                    <button
                        type="button"
                        onClick={() => setIsAddingHousekeeper(true)}
                        className="px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                    >
                        + Add Housekeeper
                    </button>
                </div>

                {isAddingHousekeeper && (
                    <form onSubmit={handleAddHousekeeper} className="p-4 bg-indigo-50/40 border-b border-indigo-100 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Fatima Begum"
                                    value={newHk.name}
                                    onChange={(e) => setNewHk({ ...newHk, name: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    placeholder="+880 1711..."
                                    value={newHk.phone}
                                    onChange={(e) => setNewHk({ ...newHk, phone: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Shift</label>
                                <select
                                    value={newHk.shift}
                                    onChange={(e) => setNewHk({ ...newHk, shift: e.target.value as any })}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                    <option value="Morning (07:00 - 15:30)">Morning (07:00 - 15:30)</option>
                                    <option value="Evening (15:00 - 23:30)">Evening (15:00 - 23:30)</option>
                                    <option value="Night (23:00 - 07:30)">Night (23:00 - 07:30)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Default Zone</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Floor 1 & 2"
                                    value={newHk.assignedZone}
                                    onChange={(e) => setNewHk({ ...newHk, assignedZone: e.target.value })}
                                    className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                            <button
                                type="button"
                                onClick={() => setIsAddingHousekeeper(false)}
                                className="px-3 py-1 text-xs text-slate-600 hover:bg-slate-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                            >
                                Add Housekeeper
                            </button>
                        </div>
                    </form>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[11px]">
                            <tr>
                                <th className="px-4 py-2.5">Staff Name</th>
                                <th className="px-4 py-2.5">Emp ID</th>
                                <th className="px-4 py-2.5">Phone</th>
                                <th className="px-4 py-2.5">Shift</th>
                                <th className="px-4 py-2.5">Assigned Zone</th>
                                <th className="px-4 py-2.5 text-center">Max Shift Credits</th>
                                <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {housekeepers.map(hk => (
                                <tr key={hk.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-black text-[10px] flex items-center justify-center">
                                            {hk.name.slice(0, 1)}
                                        </div>
                                        {hk.name}
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-slate-600">{hk.employeeId}</td>
                                    <td className="px-4 py-2.5 font-mono text-slate-600">{hk.phone}</td>
                                    <td className="px-4 py-2.5 text-slate-700">{hk.shift}</td>
                                    <td className="px-4 py-2.5">
                                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10.5px] font-medium">
                                            {hk.assignedZone}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-800">
                                        {hk.maxCredits}
                                    </td>
                                    <td className="px-4 py-2.5 text-right">
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveHousekeeper(hk.id)}
                                            className="text-slate-400 hover:text-rose-600 text-xs transition-colors"
                                            title="Remove housekeeper"
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 6. Room Status & Status Color Configuration (eZee / YCS Standard) */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Palette className="w-4 h-4 text-pink-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            6. Room Status Lifecycle & Color Configuration (eZee / YCS Standard)
                        </h4>
                    </div>
                </div>

                <div className="p-5 space-y-5">
                    {/* Status Workflow Selector */}
                    <div>
                        <label className="text-xs font-bold text-slate-900 block mb-2">
                            Housekeeping Room Lifecycle Mode
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                                (settings.statusWorkflow || 'standard') === 'standard'
                                    ? 'border-indigo-600 bg-indigo-50/50'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}>
                                <input
                                    type="radio"
                                    name="statusWorkflow"
                                    value="standard"
                                    checked={(settings.statusWorkflow || 'standard') === 'standard'}
                                    onChange={() => setSettings({ ...settings, statusWorkflow: 'standard' })}
                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 block">
                                        Standard Full Inspection Cycle (Recommended)
                                    </span>
                                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                                        Dirty → Clean → Inspected → Ready to Sell. Front Desk cannot check in to a room until a supervisor inspects it.
                                    </span>
                                </div>
                            </label>

                            <label className={`p-3.5 rounded-xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                                settings.statusWorkflow === 'simplified'
                                    ? 'border-indigo-600 bg-indigo-50/50'
                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                            }`}>
                                <input
                                    type="radio"
                                    name="statusWorkflow"
                                    value="simplified"
                                    checked={settings.statusWorkflow === 'simplified'}
                                    onChange={() => setSettings({ ...settings, statusWorkflow: 'simplified' })}
                                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                                />
                                <div>
                                    <span className="text-xs font-bold text-slate-900 block">
                                        Express Turnaround Cycle
                                    </span>
                                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                                        Dirty → Clean (Immediately Ready). Housekeeper marks room Clean and Front Desk can immediately assign and check in.
                                    </span>
                                </div>
                            </label>
                        </div>
                    </div>

                    {/* Status Visual Colors (eZee Configuration >> Miscellaneous >> Status Color) */}
                    <div>
                        <label className="text-xs font-bold text-slate-900 block mb-1">
                            Operational Room Status Palette (Stay View, Housekeeping Grid & Rack)
                        </label>
                        <p className="text-[11px] text-slate-500 mb-3">
                            Customize the brand status colors used throughout the PMS for quick visual recognition by housekeepers and front desk agents.
                        </p>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                            {[
                                { key: 'clean', label: 'Clean', defaultHex: '#10b981', desc: 'Ready for guest' },
                                { key: 'inspected', label: 'Inspected', defaultHex: '#3b82f6', desc: 'Supervisor QA approved' },
                                { key: 'dirty', label: 'Dirty', defaultHex: '#f43f5e', desc: 'Turnover / Stayover clean' },
                                { key: 'outOfOrder', label: 'Out of Order', defaultHex: '#475569', desc: 'Severe defect (blocked)' },
                                { key: 'outOfService', label: 'Out of Service', defaultHex: '#f59e0b', desc: 'Minor repair (warning)' }
                            ].map(item => {
                                const currentHex = settings.statusColors?.[item.key as keyof typeof settings.statusColors] || item.defaultHex;
                                return (
                                    <div key={item.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col justify-between gap-2">
                                        <div>
                                            <span className="text-xs font-bold text-slate-800 block">{item.label}</span>
                                            <span className="text-[10px] text-slate-400 block">{item.desc}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="color"
                                                value={currentHex}
                                                onChange={(e) => setSettings({
                                                    ...settings,
                                                    statusColors: {
                                                        ...(settings.statusColors || DEFAULT_HOUSEKEEPING_SETTINGS.statusColors),
                                                        [item.key]: e.target.value
                                                    }
                                                })}
                                                className="w-8 h-8 rounded border border-slate-300 cursor-pointer p-0.5 bg-white"
                                            />
                                            <span className="font-mono text-[11px] text-slate-600 font-semibold">{currentHex.toUpperCase()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Live Preview Bar */}
                    <div className="p-3 bg-slate-100/70 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Live PMS Badge Preview</span>
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                            <span className="px-3 py-1 rounded-full font-bold text-white shadow-2xs" style={{ backgroundColor: settings.statusColors?.clean || '#10b981' }}>
                                ✓ Clean & Ready
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold text-white shadow-2xs" style={{ backgroundColor: settings.statusColors?.inspected || '#3b82f6' }}>
                                ★ Inspected (QA)
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold text-white shadow-2xs" style={{ backgroundColor: settings.statusColors?.dirty || '#f43f5e' }}>
                                ⚠ Dirty (Turnover)
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold text-white shadow-2xs" style={{ backgroundColor: settings.statusColors?.outOfOrder || '#475569' }}>
                                ✕ Out of Order (OOO)
                            </span>
                            <span className="px-3 py-1 rounded-full font-bold text-white shadow-2xs" style={{ backgroundColor: settings.statusColors?.outOfService || '#f59e0b' }}>
                                ⚙ Out of Service (OOS)
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <button
                    type="button"
                    disabled={isSaving}
                    onClick={handleSave}
                    className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-98"
                >
                    <Save className="w-4 h-4" />
                    {isSaving ? 'Saving Configurations...' : 'Save Housekeeping Configurations'}
                </button>
            </div>
        </div>
    );
};

export default HousekeepingSettingsTab;
