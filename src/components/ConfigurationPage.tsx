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
        <div className="p-6 max-w-7xl mx-auto font-sans text-gray-800">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                    {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
                </div>
                <button
                    onClick={onAdd}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    <span>Add New {title}</span>
                </button>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-t-xl border border-gray-200 border-b-0 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="relative w-full sm:w-72">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder={`Search ${title}...`}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <button className="px-3 py-2 border rounded-lg hover:bg-gray-50 text-gray-600 flex items-center gap-2 text-sm font-medium">
                        <Filter size={16} /> Filters
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-b-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b">
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key} className="px-6 py-4">{col.header}</th>
                            ))}
                            {(onEdit || onDelete) && <th className="px-6 py-4 text-right">Actions</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((row, index) => (
                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col) => (
                                    <td key={col.key} className={`px-6 py-4 ${col.className || ''}`}>
                                        {col.render ? col.render(row) : row[col.key]}
                                    </td>
                                ))}
                                {(onEdit || onDelete) && (
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {onEdit && (
                                                <button onClick={() => onEdit(row)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                            {onDelete && (
                                                <button onClick={() => onDelete(row)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Pagination Placeholder */}
                <div className="px-6 py-4 border-t flex items-center justify-between text-xs text-gray-500">
                    <span>Showing 1 to {data.length} of {data.length} results</span>
                    <div className="flex gap-1">
                        <button className="px-3 py-1 border rounded hover:bg-gray-50">Previous</button>
                        <button className="px-3 py-1 border rounded hover:bg-gray-50">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationPage;
