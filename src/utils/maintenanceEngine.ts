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
export const DEFAULT_TASKS: MaintenanceTask[] = [];

// Initial Seed PPM Programs
export const DEFAULT_PPM: PPMProgram[] = [];

/**
 * Retrieve all Maintenance Tasks
 */
export const getMaintenanceTasks = (): MaintenanceTask[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_TASKS);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
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
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PPM);
        if (!raw) {
            return [];
        }
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            return [];
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
        return [];
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
