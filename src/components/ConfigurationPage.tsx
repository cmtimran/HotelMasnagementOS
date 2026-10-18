import React from 'react';
import { Plus, Search, Filter, Edit2, Trash2 } from 'lucide-react';

interface Column {
    key: string;
    header: string;
    render?: (row: any) => React.ReactNode;
    className?: string;
}

interface ConfigurationPageProps {
    title: string;
    description?: string;
    columns: Column[];
    data: any[];
    onAdd?: () => void;
    onEdit?: (item: any) => void;
    onDelete?: (item: any) => void;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
    title,
    description,
    columns,
    data,
    onAdd,
    onEdit,
    onDelete
}) => {
    return (
        <div className="p-3 sm:p-4 max-w-7xl mx-auto font-sans text-gray-800">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
                <div>
                    <h1 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-tight">{title}</h1>
                    {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
                </div>
                {onAdd && (
                    <button
                        type="button"
                        onClick={onAdd}
                        className="h-8 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-semibold text-xs transition-all shadow-xs hover:shadow-md hover:shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                    >
                        <Plus size={14} strokeWidth={2.2} />
                        <span>Add New {title}</span>
                    </button>
                )}
            </div>

            {/* Toolbar */}
            <div className="bg-white px-3.5 py-2.5 rounded-t-xl border border-gray-200/90 border-b-0 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <div className="relative w-full sm:w-64">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${title}...`}
                        className="w-full h-7.5 pl-8 pr-3 text-xs bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-gray-200/90 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button type="button" className="h-7.5 px-2.5 border border-gray-200/90 hover:bg-gray-50 text-gray-600 hover:text-gray-900 rounded-lg flex items-center gap-1.5 text-xs font-medium transition-colors shadow-2xs cursor-pointer">
                        <Filter size={12} className="text-gray-400" />
                        <span>Filters</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200/90 rounded-b-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-600">
                        <thead className="bg-slate-50/90 text-[10.5px] uppercase font-bold tracking-wider text-slate-500 border-b border-gray-200/80">
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key} className={`px-3.5 py-2.5 ${col.className || ''}`}>{col.header}</th>
                                ))}
                                {(onEdit || onDelete) && <th className="px-3.5 py-2.5 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((row, index) => (
                                <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-3.5 py-2 ${col.className || ''}`}>
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && (
                                        <td className="px-3.5 py-2 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {onEdit && (
                                                    <button type="button" onClick={() => onEdit(row)} className="w-6.5 h-6.5 flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer" title="Edit">
                                                        <Edit2 size={13} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button type="button" onClick={() => onDelete(row)} className="w-6.5 h-6.5 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer" title="Delete">
                                                        <Trash2 size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-3.5 py-2 border-t border-gray-200/80 flex items-center justify-between text-[11px] text-gray-500 bg-slate-50/40">
                    <span>Showing 1 to {data.length} of {data.length} results</span>
                    <div className="flex items-center gap-1">
                        <button type="button" className="h-6.5 px-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-md text-[11px] font-medium text-gray-600 transition-colors cursor-pointer shadow-2xs">Previous</button>
                        <button type="button" className="h-6.5 px-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-md text-[11px] font-medium text-gray-600 transition-colors cursor-pointer shadow-2xs">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationPage;
