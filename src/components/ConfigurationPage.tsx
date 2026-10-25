import React, { useState } from 'react';
import { Plus, Search, Filter, Edit2, Trash2, Building2 } from 'lucide-react';
import PageHeader from './common/PageHeader';

interface Column {
    key: string;
    header: string;
    render?: (row: any) => React.ReactNode;
    className?: string;
}

interface ConfigurationPageProps {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    columns: Column[];
    data: any[];
    onAdd?: () => void;
    onEdit?: (item: any) => void;
    onDelete?: (item: any) => void;
}

const ConfigurationPage: React.FC<ConfigurationPageProps> = ({
    title,
    description,
    icon,
    columns,
    data,
    onAdd,
    onEdit,
    onDelete
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const singularTitle = title === 'Properties'
        ? 'Property'
        : title.endsWith('ies')
            ? `${title.slice(0, -3)}y`
            : title.endsWith('s')
                ? title.slice(0, -1)
                : title;

    const filteredData = data.filter((row) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return Object.values(row).some((val) =>
            String(val ?? '').toLowerCase().includes(q)
        );
    });

    return (
        <div className="page-container">
            {/* Standardized Page Header */}
            <PageHeader
                title={title}
                subtitle={description}
                icon={icon || <Building2 size={20} />}
                actions={
                    onAdd ? (
                        <button
                            type="button"
                            onClick={onAdd}
                            className="btn-primary"
                        >
                            <Plus size={14} className="stroke-[2.5]" />
                            <span>Add {singularTitle}</span>
                        </button>
                    ) : undefined
                }
            />

            {/* Toolbar & Search Bar */}
            <div className="card-container !p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={`Search ${title.toLowerCase()}...`}
                        className="input-standard pl-9"
                    />
                </div>
                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    <button type="button" className="btn-secondary">
                        <Filter size={13} className="text-slate-400" />
                        <span>Filters</span>
                    </button>
                </div>
            </div>

            {/* Standardized Table Container */}
            <div className="table-container">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[10.5px] uppercase font-bold tracking-wider text-slate-500">
                            <tr>
                                {columns.map((col) => (
                                    <th key={col.key} className={`px-4 py-3 ${col.className || ''}`}>{col.header}</th>
                                ))}
                                {(onEdit || onDelete) && <th className="px-4 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredData.map((row, index) => (
                                <tr key={index} className="hover:bg-primary-subtle/30 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-4 py-3 ${col.className || ''}`}>
                                            {col.render ? col.render(row) : row[col.key]}
                                        </td>
                                    ))}
                                    {(onEdit || onDelete) && (
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {onEdit && (
                                                    <button type="button" onClick={() => onEdit(row)} className="btn-icon" title="Edit">
                                                        <Edit2 size={13} />
                                                    </button>
                                                )}
                                                {onDelete && (
                                                    <button type="button" onClick={() => onDelete(row)} className="btn-icon-danger" title="Delete">
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
                <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
                    <span>Showing {filteredData.length > 0 ? 1 : 0} to {filteredData.length} of {filteredData.length} results</span>
                    <div className="flex items-center gap-1.5">
                        <button type="button" className="btn-secondary py-1 px-3 text-xs">Previous</button>
                        <button type="button" className="btn-secondary py-1 px-3 text-xs">Next</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfigurationPage;
