import { useState } from 'react';
import {
    Search,
    ChevronLeft,
    ChevronRight,
    Info,
    Plus,
    User,
    Trash2,
    X,
    Utensils,
    CreditCard,
    LayoutGrid,
    Building2
} from 'lucide-react';

const TableIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" height="59" width="59" viewBox="0 0 59 59" fill="none" className="text-gray-400 w-12 h-12">
        <path d="M51.625 9.83594L50.386 12.1984C48.7045 15.409 46.4207 17.2109 44.0435 17.2109H17.4148C15.0352 17.2109 12.7514 15.409 11.0699 12.1984L9.83332 9.83594M4.91666 9.83594H54.0833M12.2917 49.1693H14.4279C15.1581 49.1693 15.5244 49.1693 15.8759 49.1201C16.6874 49.0018 17.4565 48.6823 18.113 48.1909C18.3982 47.9794 18.6563 47.7213 19.175 47.2026C19.9518 46.4258 20.3402 46.0374 20.7655 45.7202C21.7489 44.9827 22.9043 44.5034 24.1236 44.3288C24.6497 44.2526 25.1979 44.2526 26.2968 44.2526H32.7032C33.8021 44.2526 34.3503 44.2526 34.8764 44.3264C36.0945 44.5035 37.249 44.9826 38.2345 45.7202C38.6597 46.0398 39.0482 46.4258 39.825 47.2026C40.3412 47.7189 40.6018 47.9794 40.8845 48.1909C41.542 48.6818 42.3119 49.0004 43.1241 49.1176C43.4756 49.1693 43.8395 49.1693 44.5745 49.1693H46.7083M24.5833 44.2526L25.0897 41.7205C25.402 40.1595 25.5568 39.3777 26.0583 38.859C26.1927 38.7214 26.3402 38.6001 26.5008 38.4952C27.108 38.1068 27.9045 38.1068 29.5 38.1068M29.5 38.1068C31.0954 38.1068 31.892 38.1068 32.4992 38.4952C32.6598 38.5984 32.8073 38.7197 32.9417 38.859C33.4407 39.3753 33.598 40.1595 33.9102 41.723L34.4167 44.2526M29.5 38.1068V23.3568M24.5833 17.2109L25.0897 19.743C25.402 21.3041 25.5568 22.0858 26.0583 22.6045C26.1927 22.7422 26.3402 22.8635 26.5008 22.9684C27.108 23.3568 27.9045 23.3568 29.5 23.3568M29.5 23.3568C31.0954 23.3568 31.892 23.3568 32.4992 22.9684C32.6598 22.8635 32.8073 22.7422 32.9417 22.6045C33.4407 22.0883 33.598 21.3041 33.9102 19.7406L34.4167 17.2109" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"></path>
    </svg>
);

const POSPage = () => {
    const [selectedCategory, setSelectedCategory] = useState('Fast Food');
    const [selectedTable, setSelectedTable] = useState<number | null>(null);
    const [cart, setCart] = useState<any[]>([]);

    const categories = ['All', 'Fast Food', 'Beverage', 'Desert', 'Platter'];

    const tables = [
        { id: 190, name: 'Table 190', status: 'available' },
        { id: 109, name: 'Table 109', status: 'available' },
        { id: 101, name: 'Table 101', status: 'occupied' },
        { id: 102, name: 'Table 102', status: 'reserved' },
        { id: 103, name: 'Table 103', status: 'available' },
    ];

    const products = [
        { id: 1, name: 'Chicken BBQ', price: 100.00, time: '05:00:00', image: null },
        { id: 2, name: 'Fried Rice', price: 250.00, time: '00:05:00', image: null },
        { id: 3, name: 'Burger', price: 285.00, time: '03:02:02', image: null },
        { id: 4, name: 'French Fries', price: 150.00, time: '00:10:00', image: null },
        { id: 5, name: 'Pizza', price: 450.00, time: '00:15:00', image: null },
        { id: 6, name: 'Coke', price: 40.00, time: '00:00:00', image: null },
    ];

    const addToCart = (product: any) => {
        setCart([...cart, { ...product, qty: 1 }]);
    };

    // ... inside POSPage component
    const [isAddTableOpen, setIsAddTableOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

    // Mock Floors & Tables for Modal
    const floors = ['Ground Floor', 'First Floor', 'Rooftop', 'Patio'];
    const availableTables = [
        { id: 'T101', name: 'Table T101', seats: 4, type: 'Standard' },
        { id: 'T102', name: 'Table T102', seats: 4, type: 'Standard' },
        { id: 'T109', name: 'Table T109', seats: 3, type: 'Round' },
        { id: 'T110', name: 'Table T110', seats: 6, type: 'Booth' },
    ];

    // ... inside POSPage component
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null);
    const [modalQuantity, setModalQuantity] = useState(1);

    const openProductModal = (product: any) => {
        setSelectedProductForModal(product);
        setModalQuantity(1);
        setIsProductModalOpen(true);
    };

    const handleAddToCartFromModal = () => {
        if (selectedProductForModal) {
            setCart([...cart, { ...selectedProductForModal, qty: modalQuantity }]);
            setIsProductModalOpen(false);
        }
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
            {/* Product Details Modal Overlay */}
            {isProductModalOpen && selectedProductForModal && (
                <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl overflow-hidden shadow-2xl flex flex-col animate-scaleIn">
                        {/* Header */}
                        <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                            <h2 className="text-lg font-bold">{selectedProductForModal.name}</h2>
                            <button onClick={() => setIsProductModalOpen(false)} className="hover:bg-blue-800 p-1 rounded transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Image */}
                        <div className="h-48 bg-gray-100 flex items-center justify-center">
                            {selectedProductForModal.image ? (
                                <img src={selectedProductForModal.image} className="w-full h-full object-cover" />
                            ) : (
                                <div className="flex flex-col items-center text-gray-500">
                                    <span className="text-lg">No Image</span>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <div className="mb-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedProductForModal.name}</h3>
                                <p className="text-gray-500 text-sm mb-2">with Spicy Special Sauce</p>
                                <p className="text-xl font-bold text-gray-900">৳ {selectedProductForModal.price}</p>
                            </div>

                            {/* Variants (Mock Data for demo) */}
                            <div className="mb-6 border-t border-b border-gray-100 py-4">
                                <h4 className="font-medium text-gray-800 mb-3">Variants</h4>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-5 h-5 rounded-full border border-gray-300 group-hover:border-blue-500 flex items-center justify-center">
                                            {/* Simulated selected state */}
                                            <div className="w-3 h-3 rounded-full bg-blue-500 opacity-0 group-hover:opacity-20"></div>
                                        </div>
                                        <span className="text-gray-700">Juicy</span>
                                    </div>
                                    <span className="text-gray-500 text-sm">৳ {selectedProductForModal.price.toFixed(2)}</span>
                                </label>
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex items-center border border-gray-300 rounded-lg">
                                    <button
                                        onClick={() => setModalQuantity(Math.max(1, modalQuantity - 1))}
                                        className="px-3 py-2 text-gray-600 hover:bg-gray-50 font-bold"
                                    >
                                        −
                                    </button>
                                    <span className="w-8 text-center font-medium">{modalQuantity}</span>
                                    <button
                                        onClick={() => setModalQuantity(modalQuantity + 1)}
                                        className="px-3 py-2 text-gray-600 hover:bg-gray-50 font-bold"
                                    >
                                        +
                                    </button>
                                </div>

                                <button
                                    onClick={handleAddToCartFromModal}
                                    className="bg-blue-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-blue-800 transition-colors"
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal Overlay */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-6xl rounded-none shadow-2xl h-[90vh] flex flex-col animate-slideUp">
                        {/* Modal Header */}
                        <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Payment</h2>
                            <button onClick={() => setIsPaymentModalOpen(false)} className="hover:bg-blue-800 p-1 rounded transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Side: Payment Details */}
                            <div className="flex-[1.5] p-6 overflow-y-auto bg-gray-50 border-r border-gray-200">

                                {/* Discount Section */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Discount</h3>
                                    <div className="flex gap-4 mb-4">
                                        <div className="w-1/3 space-y-1">
                                            <label className="text-xs font-medium text-gray-600">Type</label>
                                            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm">
                                                <option>Percentage</option>
                                                <option>Flat Amount</option>
                                            </select>
                                        </div>
                                        <div className="flex-1 space-y-1 relative">
                                            <label className="text-xs font-medium text-gray-600">Value</label>
                                            <input type="number" defaultValue={0} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                        <div className="pt-6">
                                            <button className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600">Remarks</label>
                                        <input type="text" placeholder="Write remarks for this payment..." className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                                    </div>
                                </div>

                                {/* Payment Method Section */}
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wide">Payment Methods</h3>
                                    <div className="space-y-3">

                                        {/* Card Method */}
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3">
                                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <CreditCard size={16} /> Card Payment
                                                </span>
                                                <button className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Card Type</label>
                                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option>Visa/Master</option></select>
                                                </div>
                                                <div className="flex-[1.5] space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">POS Terminal</label>
                                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option>POS - BRAC Bank</option></select>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Amount</label>
                                                    <input type="number" defaultValue="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Cash Method */}
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3">
                                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <span className="font-serif font-bold text-green-600">৳</span> Cash Payment
                                                </span>
                                                <button className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex-1"></div>
                                                <div className="w-1/3 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Received Amount</label>
                                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Mobile Bank Method */}
                                        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex flex-col gap-3">
                                            <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                                                <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                                    <span className="text-pink-600">📱</span> Mobile Banking
                                                </span>
                                                <button className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                                            </div>
                                            <div className="grid grid-cols-4 gap-3">
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Provider</label>
                                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"><option>bKash</option></select>
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Txn ID</label>
                                                    <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Phone</label>
                                                    <input type="text" placeholder="01XXX" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Amount</label>
                                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hotel Room Folio Charge (OrderlyRMS Hotel Integration) */}
                                        <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200 flex flex-col gap-3">
                                            <div className="flex justify-between items-center border-b border-blue-200 pb-2">
                                                <span className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                                                    <Building2 size={16} className="text-blue-600" /> Charge to Hotel Room Folio
                                                </span>
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">In-House Guest Bill Posting</span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Guest Room</label>
                                                    <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                                                        <option value="101">Room 101 - Dr. Tariqul Islam</option>
                                                        <option value="102">Room 102 - Michael Scott</option>
                                                        <option value="201">Room 201 - Sarah Jenkins</option>
                                                        <option value="205">Room 205 - Alexander Vance</option>
                                                        <option value="302">Room 302 - Fahim Ahmed</option>
                                                    </select>
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Folio Account</label>
                                                    <input type="text" readOnly value="GL-4200 (F&B Dining Revenue)" className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-xs font-semibold text-gray-700" />
                                                </div>
                                                <div className="col-span-1 space-y-1">
                                                    <label className="text-[10px] font-medium text-gray-500 uppercase">Amount to Folio</label>
                                                    <input type="number" defaultValue="0.00" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end mt-4">
                                            <button className="bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm">
                                                <Plus size={16} /> Add Payment Method
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Side: Summary & Numpad */}
                            <div className="flex-1 bg-gray-50 p-6 flex flex-col">
                                <div className="bg-white rounded-lg p-4 shadow-sm space-y-3 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Total Amount</span>
                                        <span className="font-bold">0.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Discounted Amount</span>
                                        <span className="font-bold">0.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-t pt-2">
                                        <span className="text-gray-800 font-semibold">Total Due</span>
                                        <span className="font-bold text-lg">0.00</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Paid</span>
                                        <span className="font-bold text-green-600">0.00</span>
                                    </div>
                                </div>

                                <div className="mb-4">
                                    <p className="text-xs text-gray-500 mb-2">Select an input to start</p>
                                    <div className="grid grid-cols-4 gap-3">
                                        {[1, 2, 3].map(n => <button key={n} className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">{n}</button>)}
                                        <button className="bg-white p-4 rounded-lg shadow-sm font-medium hover:bg-gray-50 border text-gray-600">Clear</button>

                                        {[4, 5, 6].map(n => <button key={n} className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">{n}</button>)}
                                        <button className="bg-white p-4 rounded-lg shadow-sm font-medium hover:bg-gray-50 border text-gray-600"><Trash2 size={20} className="mx-auto" /></button>

                                        {[7, 8, 9].map(n => <button key={n} className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">{n}</button>)}
                                        <button className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">00</button>

                                        <button className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">+/-</button>
                                        <button className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">0</button>
                                        <button className="bg-white p-4 rounded-lg shadow-sm text-xl font-medium hover:bg-gray-50 border">.</button>
                                        <button className="bg-white p-4 rounded-lg shadow-sm font-medium hover:bg-gray-50 border text-gray-600"><Trash2 size={20} className="mx-auto" /></button>
                                    </div>
                                </div>

                                <div className="mt-auto grid grid-cols-2 gap-4">
                                    <button className="bg-blue-900 text-white py-3 rounded-lg font-bold hover:bg-blue-800">
                                        Make Payment
                                    </button>
                                    <button className="bg-blue-900/10 text-blue-900 py-3 rounded-lg font-bold hover:bg-blue-900/20">
                                        Print & Save Invoice
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Table Modal Overlay */}
            {isAddTableOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-100 w-full max-w-5xl rounded-xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-fadeIn">
                        {/* Modal Header */}
                        <div className="bg-blue-900 text-white p-4 flex justify-between items-center">
                            <h2 className="text-xl font-bold">Add Table</h2>
                            <button onClick={() => setIsAddTableOpen(false)} className="hover:bg-blue-800 p-1 rounded transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Floor Filter */}
                            <div className="mb-6">
                                <div className="relative inline-block w-64">
                                    <select className="w-full appearance-none bg-white border border-gray-300 px-4 py-2 pr-8 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700">
                                        <option>Select Floor</option>
                                        {floors.map(f => <option key={f}>{f}</option>)}
                                    </select>
                                    <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={16} />
                                </div>
                            </div>

                            {/* Tables Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableTables.map(table => (
                                    <div key={table.id} className="bg-white rounded-lg p-5 shadow-sm border border-gray-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-800">{table.name}</h3>
                                                <p className="text-gray-500">Seat {table.seats}</p>
                                            </div>
                                            <div className="text-gray-400">
                                                <TableIcon />
                                            </div>
                                        </div>

                                        <div className="flex gap-3 mb-6">
                                            <input
                                                type="number"
                                                defaultValue={table.seats}
                                                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                            <button className="flex-1 bg-blue-900 text-white font-medium py-2 rounded-lg hover:bg-blue-800 transition-colors flex items-center justify-center gap-2">
                                                <Plus size={18} /> Add
                                            </button>
                                        </div>

                                        {/* Current Orders Table (Empty State) */}
                                        <div className="bg-white rounded border border-gray-100 p-2">
                                            <div className="grid grid-cols-4 text-xs font-semibold text-gray-700 mb-2 border-b pb-1">
                                                <span>Order Number</span>
                                                <span>Time</span>
                                                <span>Person</span>
                                                <span>Action</span>
                                            </div>
                                            <div className="text-xs text-gray-400 py-2 text-center">
                                                No Customer
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Side: Product Selection */}
            <div className="flex-1 flex flex-col p-4 pr-2">

                {/* Header Section */}
                <div className="bg-white p-2 rounded-xl shadow-sm mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search in menu"
                                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronLeft size={20} /></button>
                            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    {/* Categories */}
                    <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                                    ? 'bg-green-500 text-white shadow-md'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table Selection */}
                <div className="mb-3 overflow-x-auto">
                    <div className="flex gap-2 pb-1">
                        {tables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => setSelectedTable(table.id)}
                                className={`px-1.5 py-1 rounded-lg text-[10px] font-medium min-w-[60px] transition-all shadow-sm ${table.id === 190 ? 'bg-green-100 text-green-800 border border-green-200' :
                                    table.id === 109 ? 'bg-green-100 text-green-800 border border-green-200' :
                                        table.id === 102 ? 'bg-red-100 text-red-800 border border-red-200' :
                                            'bg-white text-gray-600 border border-gray-200 hover:border-blue-400'
                                    }`}
                            >
                                {table.name}
                            </button>
                        ))}
                        <div className="flex gap-1 ml-1">
                            <button className="p-2 bg-white border rounded-full hover:bg-gray-50 shadow-sm"><ChevronLeft size={14} /></button>
                            <button className="p-2 bg-white border rounded-full hover:bg-gray-50 shadow-sm"><ChevronRight size={14} /></button>
                        </div>
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto">
                    <h2 className="text-base font-bold text-gray-800 mb-3">{selectedCategory}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pb-20">
                        {products.map(product => (
                            <div
                                key={product.id}
                                onClick={() => openProductModal(product)}
                                className="bg-white p-2 rounded-xl shadow-sm hover:shadow-md transition-all border border-transparent hover:border-blue-500 group relative cursor-pointer"
                            >
                                <div className="aspect-[4/3] bg-gray-100 rounded-lg mb-2 flex items-center justify-center relative overflow-hidden">
                                    {product.image ? (
                                        <img src={product.image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center text-gray-400">
                                            <span className="text-[10px] font-semibold">No Image</span>
                                        </div>
                                    )}
                                    <button className="absolute top-1 right-1 p-0.5 bg-white/80 rounded-full text-gray-500 hover:text-blue-600 backdrop-blur-sm">
                                        <Info size={12} />
                                    </button>
                                </div>

                                <h3 className="font-semibold text-gray-800 text-xs mb-0.5 truncate">{product.name}</h3>
                                <p className="text-[10px] text-gray-400 mb-1">{product.time}</p>

                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-gray-800 text-sm">৳ {product.price.toFixed(2)}</span>
                                    <button
                                        onClick={() => addToCart(product)}
                                        className="p-0.5 bg-green-500 text-white rounded-full hover:bg-green-600 shadow-sm transition-transform active:scale-95"
                                    >
                                        <Plus size={12} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Side: Order Panel */}
            <div className="w-[330px] bg-white border-l border-gray-200 flex flex-col h-full shadow-lg z-10">
                {/* Top Action Bar */}
                <div className="p-2.5 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="relative">
                        <select className="appearance-none bg-white border border-gray-300 text-gray-700 py-1 pl-2 pr-6 rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer">
                            <option>Dine In</option>
                            <option>Takeaway</option>
                            <option>Delivery</option>
                        </select>
                        <ChevronRight className="absolute right-1.5 top-1/2 -translate-y-1/2 rotate-90 text-gray-400" size={12} />
                    </div>

                    <button
                        onClick={() => setIsAddTableOpen(true)}
                        className="bg-blue-900 text-white px-2 py-1 rounded text-[10px] font-medium hover:bg-blue-800 transition-colors shadow-2xs"
                    >
                        Add Table
                    </button>
                </div>

                {/* Selected Info */}
                <div className="p-2.5 bg-gray-50 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-1.5">
                        <div>
                            <span className="text-sm font-semibold text-gray-800 block">Selected Tables</span>
                            {selectedTable ? (
                                <span className="text-xs text-blue-600 font-medium">Table {selectedTable}</span>
                            ) : (
                                <span className="text-xs text-gray-500">No table selected. Use &quot;Add table&quot; to Add.</span>
                            )}
                        </div>
                        <div className="flex items-center text-gray-500">
                            <User size={14} className="mr-1" />
                            <span className="text-xs">Total Guests: 0</span>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                        <div className="relative flex-1">
                            <select className="w-full appearance-none bg-white border border-gray-300 text-gray-400 py-1 pl-7 pr-4 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option>Select Waiter</option>
                            </select>
                            <Utensils className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                            <ChevronRight className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-gray-400" size={12} />
                        </div>
                        <div className="relative flex-1">
                            <input type="text" placeholder="Walk In" className="w-full pl-2 pr-7 py-1 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            <User className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={12} />
                        </div>
                    </div>
                </div>

                {/* Cart Items Area (Hidden/Empty in Screenshot but necessary for functionality) */}
                <div className="flex-1 bg-white p-4 overflow-y-auto">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-2">
                            <LayoutGrid size={48} strokeWidth={1} />
                            <p className="text-sm">No items added yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-sm border-b pb-2">
                                    <span>{item.name}</span>
                                    <span className="font-semibold">৳ {item.price}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Total Section */}
                <div className="p-3 bg-white border-t border-gray-100">
                    <div className="text-right mb-3">
                        <h2 className="text-2xl font-bold text-gray-900">Total: ৳ {cart.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</h2>
                        <div className="flex justify-end gap-3 text-[10px] text-gray-500 mt-1">
                            <span>Tax: ৳ 0.00</span>
                            <span>Service: ৳ 0.00</span>
                        </div>
                    </div>

                    {/* Numpad & Actions */}
                    <div className="grid grid-cols-[1fr_2.5fr] gap-2 h-40">
                        {/* Left Column: Actions */}
                        <div className="flex flex-col gap-2 h-full">
                            <button className="flex-1 bg-blue-800 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 hover:bg-blue-900 transition-all shadow-md active:scale-95 py-1">
                                <span className="text-[10px] font-bold">Order</span>
                            </button>
                            <button
                                onClick={() => setIsPaymentModalOpen(true)}
                                className="flex-1 bg-blue-900 text-white rounded-lg flex flex-col items-center justify-center gap-0.5 hover:bg-blue-800 transition-colors shadow-md active:scale-95 py-1"
                            >
                                <span className="text-[10px] font-bold">Payment</span>
                            </button>
                        </div>

                        {/* Right Column: Numpad */}
                        <div className="grid grid-cols-4 gap-1 h-full">
                            {[1, 2, 3].map(n => <button key={n} className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">{n}</button>)}
                            <button className="bg-gray-50 border border-gray-100 rounded hover:bg-gray-100 text-[10px] text-gray-600 font-medium p-0">Qty</button>

                            {[4, 5, 6].map(n => <button key={n} className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">{n}</button>)}
                            <button className="bg-gray-50 border border-gray-100 rounded hover:bg-gray-100 text-[10px] text-gray-600 font-medium p-0">%</button>

                            {[7, 8, 9].map(n => <button key={n} className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">{n}</button>)}
                            <button className="bg-gray-50 border border-gray-100 rounded hover:bg-gray-100 text-[10px] text-gray-600 font-medium p-0">Price</button>

                            <button className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">+/-</button>
                            <button className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">0</button>
                            <button className="bg-white border border-gray-100 rounded hover:bg-gray-50 font-bold text-xs shadow-sm text-gray-700 p-0">.</button>
                            <button className="bg-white border border-gray-100 rounded hover:bg-red-50 text-red-500 shadow-sm flex items-center justify-center p-0"><Trash2 size={12} /></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POSPage;
