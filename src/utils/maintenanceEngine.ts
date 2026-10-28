/**
 * HotelManagementOS - Enterprise Maintenance & Preventive Asset Maintenance (PPM) Engine
 * 
 * Implements:
 * 1. Reactive Work Orders & Defect Tracking (Kanban Integration)
 * 2. Cross-module Work Order Dispatch from Housekeeping inspection
 * 3. Planned Preventive Maintenance (PPM) Schedules (HVAC, Plumbing, Electrical, Safety)
 * 4. Room Asset Service History & Equipment Lifecycle
 */

export interface MaintenanceTask {
    id: number | string;
    title: string;
    room: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    description: string;
    createdAt: string;
    status: 'todo' | 'in-progress' | 'completed';
    source?: 'housekeeping' | 'frontdesk' | 'guest' | 'inspection' | 'ppm';
    reportedBy?: string;
    completedAt?: string;
    resolutionNotes?: string;
}

export type PPMCategory = 'HVAC & Climate' | 'Plumbing & Water' | 'Electrical & Lighting' | 'Carpentry & Furniture' | 'Safety & Fire' | 'Deep Clean & Pest';

export interface PPMProgram {
    id: string;
    title: string;
    category: PPMCategory;
    cycleDays: number; // e.g. 30, 45, 60, 90, 180, 365
    targetRooms: string; // e.g. "All Rooms", "Floor 2 & 3", or "101-110"
    description: string;
    lastCompletedDate?: string;
    nextDueDate: string;
    status: 'scheduled' | 'due' | 'overdue' | 'in_progress';
    assignedTechnician?: string;
    checklist: string[];
}

const STORAGE_KEY_TASKS = 'hotel_maintenance_tasks_v2';
const STORAGE_KEY_PPM = 'hotel_ppm_programs_v1';

// Initial Seed Tasks
const DEFAULT_TASKS: MaintenanceTask[] = [
    { id: 1, title: 'AC Not Working', room: '203', priority: 'urgent', assignedTo: 'Ahmed (HVAC Tech)', description: 'Guest complaint - AC blowing warm air, thermostat error E4', createdAt: '2 hours ago', status: 'in-progress', source: 'housekeeping', reportedBy: 'Fatima Begum (Housekeeper)' },
    { id: 2, title: 'Leaking Faucet', room: '105', priority: 'medium', description: 'Bathroom sink faucet continuous drip', createdAt: '4 hours ago', status: 'todo', source: 'inspection', reportedBy: 'Supervisor Karim' },
    { id: 3, title: 'Light Bulb Replacement', room: '301', priority: 'low', assignedTo: 'Karim (Electrician)', description: 'Bedroom left bedside reading lamp burnt out', createdAt: '1 day ago', status: 'todo', source: 'housekeeping' },
    { id: 4, title: 'Electronic Door Lock Low Battery', room: '208', priority: 'high', assignedTo: 'Ahmed (HVAC Tech)', description: 'Card reader beeping 3 times on badge scan', createdAt: '1 day ago', status: 'completed', completedAt: 'Yesterday 17:30', resolutionNotes: 'Replaced 4x AA lithium batteries. Keycard reader tested OK.' },
    { id: 5, title: 'TV Remote Not Responding', room: '102', priority: 'low', description: 'Samsung smart TV remote batteries dead', createdAt: '2 days ago', status: 'completed', completedAt: '2 days ago', resolutionNotes: 'Replaced batteries and paired with TV' }
];

// Initial Seed PPM Programs (Enterprise 5-Star Hotel Standard)
const DEFAULT_PPM: PPMProgram[] = [
    {
        id: 'PPM-001',
        title: 'HVAC Air Filter Cleaning & Gas Pressure Test',
        category: 'HVAC & Climate',
        cycleDays: 30,
        targetRooms: 'All Guest Rooms (Floors 1-5)',
        description: 'Remove split AC nylon filters, wash with disinfectant, check freon pressure and drain pan flow.',
        lastCompletedDate: new Date(Date.now() - 25 * 86400000).toISOString().slice(0, 10),
        nextDueDate: new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10),
        status: 'scheduled',
        assignedTechnician: 'Ahmed (HVAC Tech)',
        checklist: [
            'Clean primary washable filters with antibacterial solution',
            'Measure refrigerant suction and discharge pressures',
            'Inspect condensate drain pipe for water stagnation',
            'Test wireless remote control receiver and digital display'
        ]
    },
    {
        id: 'PPM-002',
        title: 'Geyser & Hot Water Tank Descaling',
        category: 'Plumbing & Water',
        cycleDays: 90,
        targetRooms: 'Floors 1 & 2 Suites',
        description: 'Flush electric water heaters to remove calcium and mineral sediment, test safety pressure relief valve.',
        lastCompletedDate: new Date(Date.now() - 95 * 86400000).toISOString().slice(0, 10),
        nextDueDate: new Date(Date.now() - 5 * 86400000).toISOString().slice(0, 10),
        status: 'overdue',
        assignedTechnician: 'Rashid (Plumber)',
        checklist: [
            'Isolate electrical breaker switch and test zero voltage',
            'Drain heater tank completely through bottom sediment valve',
            'Inspect sacrificial anode rod for corrosion erosion',
            'Test Temperature & Pressure (T&P) safety relief valve'
        ]
    },
    {
        id: 'PPM-003',
        title: 'Mattress Flip & 180° Rotation',
        category: 'Carpentry & Furniture',
        cycleDays: 90,
        targetRooms: 'All King & Twin Bed Rooms',
        description: 'Rotate and flip inner-spring mattresses head-to-toe to maintain even spring tension and prevent sagging.',
        lastCompletedDate: new Date(Date.now() - 40 * 86400000).toISOString().slice(0, 10),
        nextDueDate: new Date(Date.now() + 50 * 86400000).toISOString().slice(0, 10),
        status: 'scheduled',
        assignedTechnician: 'Housekeeping Engineering Team',
        checklist: [
            'Inspect mattress protector for stains or structural wear',
            'Rotate mattress 180 degrees horizontally',
            'Flip mattress upside down if dual-sided specification',
            'Inspect bed base wooden slats and headboard fasteners'
        ]
    },
    {
        id: 'PPM-004',
        title: 'Fire Smoke Detectors & Emergency Torch Audit',
        category: 'Safety & Fire',
        cycleDays: 180,
        targetRooms: 'All Guest Rooms & Corridors',
        description: 'Canister aerosol smoke test on optical smoke sensors, verify battery backup and central annunciator panel trip.',
        lastCompletedDate: new Date(Date.now() - 170 * 86400000).toISOString().slice(0, 10),
        nextDueDate: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
        status: 'due',
        assignedTechnician: 'Safety Officer Kabir',
        checklist: [
            'Spray aerosol test smoke into optical sensing chamber',
            'Verify strobe flasher and 85dB audible sounder trigger',
            'Confirm corresponding room zone activates on Fire Command Center panel',
            'Inspect wall-mounted emergency LED torch battery charge'
        ]
    },
    {
        id: 'PPM-005',
        title: 'Comprehensive Pest Control & Drain Sanitization',
        category: 'Deep Clean & Pest',
        cycleDays: 45,
        targetRooms: 'Ground Floor & Restaurant Adjacent Rooms',
        description: 'Gel bait application for crevices, drain enzyme treatment, and exterior window sealant check.',
        lastCompletedDate: new Date(Date.now() - 44 * 86400000).toISOString().slice(0, 10),
        nextDueDate: new Date(Date.now() + 1 * 86400000).toISOString().slice(0, 10),
        status: 'due',
        assignedTechnician: 'CleanGuard Pest Services (Vendor)',
        checklist: [
            'Apply non-toxic pest gel behind wardrobe and luggage racks',
            'Pour bio-enzymatic cleaner down bathroom floor drains',
            'Inspect balcony sliding door bottom weatherstrip seal'
        ]
    }
];

/**
 * Retrieve all Maintenance Tasks
 */
export const getMaintenanceTasks = (): MaintenanceTask[] => {
    if (typeof window === 'undefined') return DEFAULT_TASKS;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TASKS);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(DEFAULT_TASKS));
            return DEFAULT_TASKS;
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_TASKS;
    } catch {
        return DEFAULT_TASKS;
    }
};

/**
 * Save all Maintenance Tasks
 */
export const saveMaintenanceTasks = (tasks: MaintenanceTask[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
        window.dispatchEvent(new CustomEvent('pms_maintenance_tasks_updated', { detail: { tasks } }));
    } catch (e) {
        console.warn('Error saving maintenance tasks:', e);
    }
};

/**
 * Create a new Maintenance Task (used by Housekeeping or Front Desk)
 */
export const createMaintenanceTask = (
    data: {
        title: string;
        room: string;
        priority: 'low' | 'medium' | 'high' | 'urgent';
        description?: string;
        assignedTo?: string;
        source?: 'housekeeping' | 'frontdesk' | 'guest' | 'inspection' | 'ppm';
        reportedBy?: string;
    }
): MaintenanceTask => {
    const existing = getMaintenanceTasks();
    const newTask: MaintenanceTask = {
        id: Date.now(),
        title: data.title.trim(),
        room: data.room.trim(),
        priority: data.priority,
        description: data.description?.trim() || 'Reported during room turnover/inspection',
        assignedTo: data.assignedTo || 'Engineering Team',
        source: data.source || 'housekeeping',
        reportedBy: data.reportedBy || 'Duty Staff',
        status: 'todo',
        createdAt: 'Just now'
    };

    const updated = [newTask, ...existing];
    saveMaintenanceTasks(updated);
    return newTask;
};

/**
 * Update task status
 */
export const updateMaintenanceTaskStatus = (
    taskId: number | string,
    newStatus: MaintenanceTask['status'],
    resolutionNotes?: string
): void => {
    const existing = getMaintenanceTasks();
    const updated = existing.map(t => {
        if (String(t.id) === String(taskId)) {
            return {
                ...t,
                status: newStatus,
                completedAt: newStatus === 'completed' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : t.completedAt,
                resolutionNotes: resolutionNotes || t.resolutionNotes
            };
        }
        return t;
    });
    saveMaintenanceTasks(updated);
};

/**
 * Retrieve all PPM Programs
 */
export const getPPMPrograms = (): PPMProgram[] => {
    if (typeof window === 'undefined') return DEFAULT_PPM;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PPM);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY_PPM, JSON.stringify(DEFAULT_PPM));
            return DEFAULT_PPM;
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            localStorage.setItem(STORAGE_KEY_PPM, JSON.stringify(DEFAULT_PPM));
            return DEFAULT_PPM;
        }

        // Recalculate dynamic status based on current date
        const todayStr = new Date().toISOString().slice(0, 10);
        return parsed.map((p: PPMProgram) => {
            const nextDue = p.nextDueDate;
            let status: PPMProgram['status'] = p.status;
            if (status !== 'in_progress') {
                if (nextDue < todayStr) {
                    status = 'overdue';
                } else {
                    const daysRemaining = Math.ceil((new Date(nextDue).getTime() - new Date().getTime()) / 86400000);
                    if (daysRemaining <= 7) {
                        status = 'due';
                    } else {
                        status = 'scheduled';
                    }
                }
            }
            return { ...p, status };
        });
    } catch {
        return DEFAULT_PPM;
    }
};

/**
 * Save PPM Programs
 */
export const savePPMPrograms = (programs: PPMProgram[]): void => {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(STORAGE_KEY_PPM, JSON.stringify(programs));
        window.dispatchEvent(new CustomEvent('pms_ppm_programs_updated', { detail: { programs } }));
    } catch (e) {
        console.warn('Error saving PPM programs:', e);
    }
};

/**
 * Complete a PPM Cycle and roll over to the next scheduled date
 */
export const completePPMCycle = (
    programId: string,
    completedBy: string = 'Duty Engineer',
    notes: string = 'Routine preventive service completed successfully.'
): PPMProgram | null => {
    const programs = getPPMPrograms();
    const idx = programs.findIndex(p => p.id === programId);
    if (idx === -1) return null;

    const current = programs[idx];
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const nextDate = new Date(today.getTime() + current.cycleDays * 86400000).toISOString().slice(0, 10);

    const updated: PPMProgram = {
        ...current,
        lastCompletedDate: todayStr,
        nextDueDate: nextDate,
        status: 'scheduled',
        description: `${current.description} [Last serviced ${todayStr} by ${completedBy}: ${notes}]`
    };

    programs[idx] = updated;
    savePPMPrograms(programs);
    return updated;
};
