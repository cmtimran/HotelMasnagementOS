import { useState } from 'react';
import { Wrench, AlertCircle, Clock, User, CheckCircle2 } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/20 to-gray-50 p-4 md:p-6 lg:p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-600 to-orange-700 rounded-xl flex items-center justify-center shadow-lg shadow-orange-600/30">
                        <Wrench size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">Maintenance Kanban</h1>
                        <p className="text-sm text-gray-500">Track and manage maintenance tasks</p>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Total Tasks</p>
                    <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-5 rounded-2xl shadow-lg shadow-blue-500/30">
                    <p className="text-xs font-semibold text-blue-100 uppercase mb-2">To Do</p>
                    <p className="text-3xl font-bold text-white">{todoTasks.length}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl shadow-lg shadow-amber-500/30">
                    <p className="text-xs font-semibold text-amber-100 uppercase mb-2">In Progress</p>
                    <p className="text-3xl font-bold text-white">{inProgressTasks.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl shadow-lg shadow-emerald-500/30">
                    <p className="text-xs font-semibold text-emerald-100 uppercase mb-2">Completed</p>
                    <p className="text-3xl font-bold text-white">{completedTasks.length}</p>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* To Do Column */}
                <div>
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <AlertCircle size={20} />
                            To Do ({todoTasks.length})
                        </h2>
                    </div>
                    <div className="space-y-4 bg-blue-50/50 p-4 rounded-b-2xl min-h-[600px]">
                        {todoTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border-l-4 border-blue-500">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-semibold text-blue-600">Room {task.room}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
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

                {/* In Progress Column */}
                <div>
                    <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Wrench size={20} />
                            In Progress ({inProgressTasks.length})
                        </h2>
                    </div>
                    <div className="space-y-4 bg-amber-50/50 p-4 rounded-b-2xl min-h-[600px]">
                        {inProgressTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border-l-4 border-amber-500">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-semibold text-amber-600">Room {task.room}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {task.createdAt}
                                    </div>
                                    {task.assignedTo && (
                                        <div className="flex items-center gap-1 text-amber-600 font-semibold">
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
                <div>
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-4 rounded-t-2xl">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle2 size={20} />
                            Completed ({completedTasks.length})
                        </h2>
                    </div>
                    <div className="space-y-4 bg-emerald-50/50 p-4 rounded-b-2xl min-h-[600px]">
                        {completedTasks.map(task => (
                            <div key={task.id} className="bg-white rounded-2xl p-5 shadow-md hover:shadow-xl transition-all border-l-4 border-emerald-500 opacity-75">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold text-gray-900 line-through">{task.title}</h3>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-sm font-semibold text-emerald-600">Room {task.room}</span>
                                </div>
                                <p className="text-sm text-gray-600 mb-3">{task.description}</p>
                                <div className="flex items-center justify-between text-xs text-gray-500">
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
