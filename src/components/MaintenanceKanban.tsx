import { useState } from 'react';
import { Wrench, AlertCircle, Clock, User, CheckCircle2 } from 'lucide-react';
import PageHeader from './common/PageHeader';

interface MaintenanceTask {
    id: number;
    title: string;
    room: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    assignedTo?: string;
    description: string;
    createdAt: string;
    status: 'todo' | 'in-progress' | 'completed';
}

const MaintenanceKanban = () => {
    const [tasks] = useState<MaintenanceTask[]>([
        { id: 1, title: 'AC Not Working', room: '203', priority: 'urgent', assignedTo: 'Ahmed', description: 'Guest complaint - AC not cooling', createdAt: '2h ago', status: 'in-progress' },
        { id: 2, title: 'Leaking Faucet', room: '105', priority: 'medium', description: 'Bathroom sink faucet dripping', createdAt: '4h ago', status: 'todo' },
        { id: 3, title: 'Light Bulb Replacement', room: '301', priority: 'low', assignedTo: 'Karim', description: 'Bedroom light not working', createdAt: '1d ago', status: 'todo' },
        { id: 4, title: 'Door Lock Issue', room: '208', priority: 'high', assignedTo: 'Ahmed', description: 'Electronic lock malfunction', createdAt: '30min ago', status: 'in-progress' },
        { id: 5, title: 'TV Remote', room: '102', priority: 'low', description: 'Remote batteries dead', createdAt: '3h ago', status: 'completed' },
        { id: 6, title: 'Window Blind Broken', room: '405', priority: 'medium', description: 'Curtain rod needs fixing', createdAt: '5h ago', status: 'completed' },
    ]);

    const getPriorityColor = (priority: MaintenanceTask['priority']) => {
        switch (priority) {
            case 'urgent': return 'bg-red-100 text-red-700 border-red-300';
            case 'high': return 'bg-orange-100 text-orange-700 border-orange-300';
            case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
            case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
        }
    };

    const todoTasks = tasks.filter(t => t.status === 'todo');
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress');
    const completedTasks = tasks.filter(t => t.status === 'completed');

    return (
        <div className="page-container">
            <PageHeader
                title="Maintenance & Engineering Board"
                subtitle="Track room engineering work orders, preventive maintenance & technician assignments"
                icon={<Wrench size={20} />}
                badge={<span className="badge-status-active">{tasks.length} Work Orders</span>}
            />

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Total Tasks</p>
                        <p className="text-xl sm:text-2xl text-slate-900 mt-1">{tasks.length}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Logged tickets</p>
                    </div>
                    <div className="size-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        <Wrench size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">To Do</p>
                        <p className="text-xl sm:text-2xl text-primary mt-1">{todoTasks.length}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Awaiting dispatch</p>
                    </div>
                    <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                        <AlertCircle size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">In Progress</p>
                        <p className="text-xl sm:text-2xl text-amber-600 mt-1">{inProgressTasks.length}</p>
                        <p className="text-[11px] text-amber-600 font-medium mt-0.5">Active repairs</p>
                    </div>
                    <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Wrench size={17} />
                    </div>
                </div>
                <div className="kpi-card">
                    <div>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wider">Completed</p>
                        <p className="text-xl sm:text-2xl text-emerald-600 mt-1">{completedTasks.length}</p>
                        <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Resolved & verified</p>
                    </div>
                    <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 size={17} />
                    </div>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* To Do Column */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <AlertCircle size={14} className="text-primary" />
                            To Do
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-primary border border-blue-200">{todoTasks.length}</span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                        {todoTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-primary">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm text-slate-900">{task.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-primary">Room {task.room}</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {task.createdAt}
                                    </div>
                                    {task.assignedTo && (
                                        <div className="flex items-center gap-1 font-medium text-slate-700">
                                            <User size={12} />
                                            {task.assignedTo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* In Progress Column */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <Wrench size={14} className="text-amber-600" />
                            In Progress
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200">{inProgressTasks.length}</span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                        {inProgressTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-amber-500">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm text-slate-900">{task.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-amber-600">Room {task.room}</span>
                                </div>
                                <p className="text-xs text-slate-600 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {task.createdAt}
                                    </div>
                                    {task.assignedTo && (
                                        <div className="flex items-center gap-1 text-amber-700 font-semibold">
                                            <User size={12} />
                                            {task.assignedTo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Completed Column */}
                <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs flex flex-col">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <h2 className="text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-600" />
                            Completed
                        </h2>
                        <span className="px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">{completedTasks.length}</span>
                    </div>
                    <div className="space-y-3 bg-slate-50/40 p-3.5 flex-1 min-h-[420px]">
                        {completedTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-xl p-4 shadow-2xs border border-slate-200/90 border-l-4 border-l-emerald-500 opacity-80">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="text-sm text-slate-700 line-through">{task.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-semibold text-emerald-600">Room {task.room}</span>
                                </div>
                                <p className="text-xs text-slate-500 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {task.createdAt}
                                    </div>
                                    {task.assignedTo && (
                                        <div className="flex items-center gap-1">
                                            <User size={12} />
                                            {task.assignedTo}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MaintenanceKanban;
