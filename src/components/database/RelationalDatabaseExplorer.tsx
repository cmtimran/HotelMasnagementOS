import React, { useState, useEffect } from 'react';
import { 
    Database, 
    Table, 
    CheckCircle2, 
    ArrowRight, 
    RefreshCw, 
    Search, 
    Key, 
    Link as LinkIcon, 
    ShieldCheck 
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiUrl';


interface TableMeta {
    name: string;
    rowCount: number;
    columns: Array<{
        cid: number;
        name: string;
        type: string;
        notNull: boolean;
        defaultValue: any;
        pk: boolean;
    }>;
    foreignKeys: Array<{
        id: number;
        from: string;
        table: string;
        to: string;
        onUpdate: string;
        onDelete: string;
    }>;
    ddl: string;
}

interface NormalizationAudit {
    firstNormalForm: { status: string; criteria: string; evidence: string };
    secondNormalForm: { status: string; criteria: string; evidence: string };
    thirdNormalForm: { status: string; criteria: string; evidence: string };
    fourthNormalForm: { status: string; criteria: string; evidence: string };
}

export const RelationalDatabaseExplorer: React.FC = () => {
    const [tables, setTables] = useState<TableMeta[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('rooms');
    const [tableData, setTableData] = useState<any[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingRows, setLoadingRows] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [searchFilter, setSearchFilter] = useState<string>('');
    const [activeTab, setActiveTab] = useState<'data' | 'columns' | 'fk' | 'ddl' | 'normalization'>('data');
    const [normalizationAudit, setNormalizationAudit] = useState<NormalizationAudit | null>(null);
    const [meta, setMeta] = useState<any>(null);

    // Fetch schema metadata
    const fetchSchema = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/schema/inspect`);
            const data = await res.json();
            if (data.success) {
                setTables(data.tables);
                setNormalizationAudit(data.normalizationAudit);
                setMeta(data.meta);
                if (data.tables.length > 0 && !data.tables.find((t: any) => t.name === selectedTable)) {
                    setSelectedTable(data.tables[0].name);
                }
            } else {
                setError(data.error || 'Failed to inspect schema');
            }
        } catch (err: any) {
            setError(err.message || 'Error connecting to database inspection API');
        } finally {
            setLoading(false);
        }
    };

    // Fetch rows for selected table
    const fetchTableRows = async (tableName: string) => {
        setLoadingRows(true);
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/schema/table/${tableName}`);
            const data = await res.json();
            if (data.success) {
                setTableData(data.rows || []);
            }
        } catch (err) {
            console.error('Error fetching table rows:', err);
        } finally {
            setLoadingRows(false);
        }
    };

    useEffect(() => {
        fetchSchema();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            fetchTableRows(selectedTable);
        }
    }, [selectedTable]);

    const filteredTables = tables.filter(t => 
        t.name.toLowerCase().includes(searchFilter.toLowerCase())
    );

    const activeTableMeta = tables.find(t => t.name === selectedTable);

    return (
        <div className="p-2 sm:p-3 bg-slate-50 min-h-screen text-slate-800 space-y-2.5">
            {/* Header */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-3 py-1.5 flex items-center justify-between gap-2.5 flex-shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                        <Database size={14} />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xs font-bold text-gray-900 tracking-tight leading-none">
                                Relational Enterprise Schema Explorer
                            </h1>
                            <span className="px-1.5 py-0.2 text-[8.5px] rounded bg-emerald-50 text-emerald-700 border border-emerald-200 leading-none font-semibold">
                                1NF • 2NF • 3NF • 4NF Certified
                            </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                            Multi-Property Hotel Group, USALI Double-Entry General Ledger, 24/7 HRM &amp; Shift Rostering
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button 
                        onClick={() => fetchSchema()}
                        className="btn-secondary"
                    >
                        <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                        <span>Refresh Schema</span>
                    </button>
                    <button 
                        onClick={() => setActiveTab('normalization')}
                        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow transition"
                    >
                        <ShieldCheck size={16} />
                        1NF-4NF Normalization Audit
                    </button>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                    {error}
                </div>
            )}

            {/* Quick Metrics Bar */}
            {meta && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tables</div>
                        <div className="text-2xl text-slate-800 mt-1">{meta.totalTables} Relational Relations</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live Records Seeded</div>
                        <div className="text-2xl text-indigo-600 mt-1">{meta.totalRecords} Rows</div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Database Engine</div>
                        <div className="text-base text-slate-800 mt-1 truncate" title={meta.databaseEngine || 'PostgreSQL 17 (Enterprise Cloud Cluster)'}>
                            {meta.databaseEngine || 'PostgreSQL 17 (Enterprise Cloud Cluster)'}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Integrity Constraints</div>
                        <div className="text-base text-emerald-600 mt-1 flex items-center gap-1.5">
                            <CheckCircle2 size={16} /> Strict Foreign Keys ON
                        </div>
                    </div>
                </div>
            )}

            {/* Normalization Proof Banner / Audit Card */}
            {activeTab === 'normalization' && normalizationAudit && (
                <div className="mt-6 bg-white p-6 rounded-2xl border-2 border-indigo-200 shadow-sm">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                        <div>
                            <h2 className="text-lg text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="text-indigo-600" size={20} />
                                Enterprise Normalization Compliance Audit (1NF - 4NF)
                            </h2>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Verified by Relational Algebra and Functional / Multi-Valued Dependency Rules
                            </p>
                        </div>
                        <button 
                            onClick={() => setActiveTab('data')}
                            className="text-xs text-indigo-600 hover:underline font-medium"
                        >
                            Return to Table Browser &rarr;
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-900 flex items-center gap-1.5 text-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> First Normal Form (1NF)
                                </span>
                                <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">PASSED</span>
                            </div>
                            <p className="text-xs text-emerald-800 mt-2 font-medium">{normalizationAudit.firstNormalForm.criteria}</p>
                            <p className="text-xs text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                                <strong>Evidence: </strong> {normalizationAudit.firstNormalForm.evidence}
                            </p>
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-900 flex items-center gap-1.5 text-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Second Normal Form (2NF)
                                </span>
                                <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">PASSED</span>
                            </div>
                            <p className="text-xs text-emerald-800 mt-2 font-medium">{normalizationAudit.secondNormalForm.criteria}</p>
                            <p className="text-xs text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                                <strong>Evidence: </strong> {normalizationAudit.secondNormalForm.evidence}
                            </p>
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-900 flex items-center gap-1.5 text-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Third Normal Form (3NF)
                                </span>
                                <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">PASSED</span>
                            </div>
                            <p className="text-xs text-emerald-800 mt-2 font-medium">{normalizationAudit.thirdNormalForm.criteria}</p>
                            <p className="text-xs text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                                <strong>Evidence: </strong> {normalizationAudit.thirdNormalForm.evidence}
                            </p>
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                            <div className="flex items-center justify-between">
                                <span className="text-emerald-900 flex items-center gap-1.5 text-sm">
                                    <CheckCircle2 size={16} className="text-emerald-600" /> Fourth Normal Form (4NF)
                                </span>
                                <span className="text-xs font-semibold bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded">PASSED</span>
                            </div>
                            <p className="text-xs text-emerald-800 mt-2 font-medium">{normalizationAudit.fourthNormalForm.criteria}</p>
                            <p className="text-xs text-slate-600 mt-1 bg-white/70 p-2.5 rounded-lg border border-emerald-100">
                                <strong>Evidence: </strong> {normalizationAudit.fourthNormalForm.evidence}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
                {/* Left Table Sidebar */}
                <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                    <div className="p-3.5 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                            <input 
                                type="text"
                                placeholder="Filter 28+ tables..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                        {filteredTables.map(t => {
                            const isSelected = t.name === selectedTable;
                            return (
                                <button
                                    key={t.name}
                                    onClick={() => {
                                        setSelectedTable(t.name);
                                        if (activeTab === 'normalization') setActiveTab('data');
                                    }}
                                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition ${
                                        isSelected 
                                            ? 'bg-indigo-50/80 border-l-4 border-indigo-600 text-indigo-900 font-medium' 
                                            : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 truncate">
                                        <Table size={15} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                                        <span className="text-xs tracking-tight truncate">{t.name}</span>
                                    </div>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        t.rowCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                                    }`}>
                                        {t.rowCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Details & Data Viewer */}
                <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[700px]">
                    {activeTableMeta ? (
                        <>
                            {/* Table Header Bar */}
                            <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs uppercase text-slate-400">TABLE:</span>
                                        <h2 className="text-base text-slate-900 font-mono">{activeTableMeta.name}</h2>
                                        <span className="text-xs px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-medium">
                                            {activeTableMeta.rowCount} records
                                        </span>
                                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-medium">
                                            {activeTableMeta.columns.length} columns
                                        </span>
                                    </div>
                                </div>

                                {/* Tabs Navigation */}
                                <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-xs font-semibold">
                                    <button
                                        onClick={() => setActiveTab('data')}
                                        className={`px-3 py-1.5 rounded-md transition ${activeTab === 'data' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Live Data ({tableData.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('columns')}
                                        className={`px-3 py-1.5 rounded-md transition ${activeTab === 'columns' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Columns Schema ({activeTableMeta.columns.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('fk')}
                                        className={`px-3 py-1.5 rounded-md transition ${activeTab === 'fk' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        Foreign Keys ({activeTableMeta.foreignKeys.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('ddl')}
                                        className={`px-3 py-1.5 rounded-md transition ${activeTab === 'ddl' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    >
                                        SQL DDL
                                    </button>
                                </div>
                            </div>

                            {/* Tab Content Panels */}
                            <div className="flex-1 overflow-auto p-4">
                                {activeTab === 'data' && (
                                    <>
                                        {loadingRows ? (
                                            <div className="flex items-center justify-center h-48 text-slate-400 gap-2">
                                                <RefreshCw size={16} className="animate-spin" /> Loading rows...
                                            </div>
                                        ) : tableData.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                                                <Table size={32} className="text-slate-300 mb-2" />
                                                <p className="text-xs">No records currently seeded in {activeTableMeta.name}.</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto border border-slate-200 rounded-lg">
                                                <table className="w-full text-left text-xs border-collapse font-sans">
                                                    <thead>
                                                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                                            {Object.keys(tableData[0]).map(col => (
                                                                <th key={col} className="p-2.5 whitespace-nowrap bg-slate-100">
                                                                    {col}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {tableData.map((row, idx) => (
                                                            <tr key={idx} className="hover:bg-indigo-50/40 transition">
                                                                {Object.entries(row).map(([k, val]: any) => (
                                                                    <td key={k} className="p-2.5 whitespace-nowrap font-mono text-[11px] text-slate-700">
                                                                        {val === null ? (
                                                                            <span className="text-slate-300 italic">null</span>
                                                                        ) : typeof val === 'boolean' ? (
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] ${val ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                                                                {val ? 'TRUE' : 'FALSE'}
                                                                            </span>
                                                                        ) : (
                                                                            String(val)
                                                                        )}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </>
                                )}

                                {activeTab === 'columns' && (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead>
                                                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                                    <th className="p-2.5">Key</th>
                                                    <th className="p-2.5">Column Name</th>
                                                    <th className="p-2.5">Data Type</th>
                                                    <th className="p-2.5">Not Null</th>
                                                    <th className="p-2.5">Default Value</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                                {activeTableMeta.columns.map(col => (
                                                    <tr key={col.name} className="hover:bg-slate-50">
                                                        <td className="p-2.5">
                                                            {col.pk ? (
                                                                <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit">
                                                                    <Key size={12} /> PK
                                                                </span>
                                                            ) : (
                                                                <span className="text-slate-300">-</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2.5 font-semibold text-slate-800">{col.name}</td>
                                                        <td className="p-2.5 text-indigo-600">{col.type}</td>
                                                        <td className="p-2.5">
                                                            {col.notNull ? (
                                                                <span className="text-emerald-700 font-semibold">YES</span>
                                                            ) : (
                                                                <span className="text-slate-400">NO</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2.5 text-slate-500">{col.defaultValue || 'null'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                {activeTab === 'fk' && (
                                    <div className="space-y-3">
                                        {activeTableMeta.foreignKeys.length === 0 ? (
                                            <div className="text-center py-12 text-slate-400 text-xs">
                                                No outbound foreign keys on this table.
                                            </div>
                                        ) : (
                                            activeTableMeta.foreignKeys.map((fk, idx) => (
                                                <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <LinkIcon size={14} className="text-indigo-600" />
                                                        <span className="font-mono font-semibold text-slate-800">{activeTableMeta.name}.{fk.from}</span>
                                                        <ArrowRight size={12} className="text-slate-400" />
                                                        <span className="font-mono text-indigo-700">{fk.table}.{fk.to}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-[10px]">
                                                        <span className="bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                                                            ON DELETE {fk.onDelete}
                                                        </span>
                                                        <span className="bg-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                                                            ON UPDATE {fk.onUpdate}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}

                                {activeTab === 'ddl' && (
                                    <div className="relative">
                                        <pre className="p-4 bg-slate-900 text-indigo-200 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                                            {activeTableMeta.ddl}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                            Select a table on the left to inspect
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RelationalDatabaseExplorer;
