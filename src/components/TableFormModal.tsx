import { X, Save, AlertCircle } from 'lucide-react';

interface TableFormModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TableFormModal = ({ isOpen, onClose }: TableFormModalProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Add New Table</h2>
                        <p className="text-sm text-gray-500">Configure table settings, location, and capacity</p>
                    </div>
                    <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full transition-colors text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <form className="space-y-6">

                        {/* Section 1: Location & Identity */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">1</span>
                                Location & Identity
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Outlet <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option>Main Restaurant</option>
                                        <option>Coffee Shop</option>
                                        <option>Bar</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Floor / Area <span className="text-red-500">*</span></label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option>Ground Floor</option>
                                        <option>Rooftop</option>
                                        <option>Patio</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Section / Zone</label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option>Select Zone...</option>
                                        <option>Window Side</option>
                                        <option>AC Room</option>
                                        <option>Smoking Zone</option>
                                        <option>Garden View</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Table Details */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">2</span>
                                Table Details
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Table Name <span className="text-red-500">*</span></label>
                                    <input type="text" placeholder="e.g. Family Table" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Short Code <span className="text-red-500">*</span></label>
                                    <input type="text" placeholder="e.g. T-101" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Shape</label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="square">Square</option>
                                        <option value="round">Round</option>
                                        <option value="rectangle">Rectangle</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Type</label>
                                    <select className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                                        <option value="regular">Regular</option>
                                        <option value="vip">VIP</option>
                                        <option value="cabin">Private Cabin</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Capacity & Features */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">3</span>
                                Seating Capacity & Features
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Min Capacity (Persons)</label>
                                    <input type="number" placeholder="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Max Capacity (Persons) <span className="text-red-500">*</span></label>
                                    <input type="number" placeholder="4" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div className="flex items-center h-full pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="checkbox" className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
                                        <div>
                                            <span className="text-sm font-medium text-gray-700 block">Is Mergeable?</span>
                                            <span className="text-xs text-gray-500">Can be joined with others</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Operations */}
                        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                            <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">4</span>
                                Operations & Additional
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">QR Code String</label>
                                        <div className="relative">
                                            <input type="text" placeholder="Scanning Code (Auto-generated usually)" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50" />
                                            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-blue-600 font-bold hover:underline">GENERATE</button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                            Service Charge Override (%)
                                            <AlertCircle size={14} className="text-gray-400" />
                                        </label>
                                        <input type="number" placeholder="Leave empty for default" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Remarks / Internal Note</label>
                                    <textarea rows={4} placeholder="Any specific notes about this table placement..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"></textarea>
                                </div>
                            </div>

                            {/* Active Status */}
                            <div className="mt-6 pt-4 border-t flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-medium text-gray-800">Operational Status</h4>
                                    <p className="text-xs text-gray-500">Is this table physically available for use?</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" defaultChecked />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                    <span className="ml-3 text-sm font-medium text-gray-700 peer-checked:text-green-600">Active</span>
                                </label>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Save size={18} />
                        Save Table
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableFormModal;
