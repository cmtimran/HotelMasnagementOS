import { useState } from 'react';
import {
    Save,
    ArrowLeft,
    Image as ImageIcon,
    Plus,
    LayoutGrid,
    Tag,
    Box,
    Layers,
    Settings
} from 'lucide-react';

const AddProductMockup = () => {
    const [activeTab, setActiveTab] = useState('basic');
    const [manageStock, setManageStock] = useState(false);
    const [hasVariants, setHasVariants] = useState(false);
    const [isOfferActive, setIsOfferActive] = useState(false);

    // Tabs Configuration
    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: <LayoutGrid size={18} /> },
        { id: 'pricing', label: 'Pricing & Tax', icon: <Tag size={18} /> },
        { id: 'inventory', label: 'Inventory & Kitchen', icon: <Box size={18} /> },
        { id: 'variants', label: 'Variants & Add-ons', icon: <Layers size={18} /> },
        { id: 'settings', label: 'Offer & Settings', icon: <Settings size={18} /> },
    ];

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            {/* --- HEADER --- */}
            <header className="bg-white border-b sticky top-0 z-10 px-4 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-3">
                    <button className="p-2 hover:bg-gray-100 rounded-full text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-xl text-gray-800">Add New Product</h1>
                        <p className="text-xs text-gray-500">Create a new menu item for your restaurant</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm">
                        Save Draft
                    </button>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2">
                        <Save size={16} /> Save & Publish
                    </button>
                </div>
            </header>

            {/* --- MAIN CONTENT --- */}
            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
                <div className="flex flex-col gap-2">

                    {/* --- TOP TABS --- */}
                    <div className="w-full flex-shrink-0">
                        <nav className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto flex sticky top-24 z-10">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1 px-4 py-4 text-sm font-medium transition-colors whitespace-nowrap border-b-4 ${activeTab === tab.id
                                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                        }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* --- RIGHT FORM CONTENT --- */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6 min-h-[600px]">

                        {/* TAB 1: BASIC INFO */}
                        {activeTab === 'basic' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Basic Information</h2>

                                {/* Top Section: Image & Basic Details */}
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Left: Image Upload (Resized Smaller) */}
                                    <div className="flex-shrink-0">
                                        <label className="text-sm font-medium text-gray-700 block mb-2">Product Image</label>
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg w-32 h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition bg-gray-50">
                                            <ImageIcon size={24} className="mb-1 text-gray-400" />
                                            <span className="text-[10px] text-center px-2">Upload Image</span>
                                        </div>
                                    </div>

                                    {/* Right: Core Fields & Category Row */}
                                    <div className="flex-1 space-y-4">
                                        {/* Row 1: Name & SKU */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1 md:col-span-2">
                                                <label className="text-sm font-medium text-gray-700">Product Name <span className="text-red-500">*</span></label>
                                                <input type="text" placeholder="e.g. Beef Burger" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Barcode / SKU</label>
                                                <div className="relative">
                                                    <input type="text" placeholder="SCAN-001" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    <button className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600">
                                                        <Box size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Row 2: Category, Sub, Dietary */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
                                                <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                    <option>Select Category</option>
                                                    <option>Burger</option>
                                                    <option>Pizza</option>
                                                    <option>Drinks</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Sub Category</label>
                                                <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                    <option>Select Sub-Category</option>
                                                    <option>Chicken</option>
                                                    <option>Beef</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-sm font-medium text-gray-700">Dietary Type</label>
                                                <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                    <option>Non-Veg</option>
                                                    <option>Veg</option>
                                                    <option>Vegan</option>
                                                    <option>Gluten Free</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Fields Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Calories */}
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Energy (Kcal)</label>
                                        <input type="number" placeholder="e.g. 450" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>

                                    {/* Preparation Time */}
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Prep Time (mins)</label>
                                        <input type="number" placeholder="15" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>

                                {/* Allergens */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Allergens</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Dairy', 'Nuts', 'Gluten', 'Eggs', 'Soy', 'Shellfish'].map(allergen => (
                                            <label key={allergen} className="inline-flex items-center px-3 py-1.5 rounded-full border border-gray-200 bg-white cursor-pointer hover:bg-gray-50 hover:border-blue-300 transition select-none">
                                                <input type="checkbox" className="w-3 h-3 text-blue-600 rounded mr-2" />
                                                <span className="text-sm text-gray-700">{allergen}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Menu Type */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Menu Type</label>
                                    <div className="flex flex-wrap gap-4">
                                        {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Late Night'].map((type) => (
                                            <label key={type} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                />
                                                <span className="text-sm text-gray-600">{type}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Service Availability */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Service Availability</label>
                                    <div className="flex flex-wrap gap-4 p-3 bg-gray-50 border border-gray-100 rounded-lg">
                                        {['Dine In', 'Takeaway', 'Room Service', 'Delivery', 'Online Order'].map((service) => (
                                            <label key={service} className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    defaultChecked
                                                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500 border-gray-300"
                                                />
                                                <span className="text-sm text-gray-700 font-medium bg-white px-2 py-0.5 rounded border border-gray-200 shadow-sm">{service}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                    <textarea rows={3} placeholder="Write a short appealing description..." className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"></textarea>
                                </div>

                            </div>
                        )}

                        {/* TAB 2: PRICING & TAX */}
                        {activeTab === 'pricing' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Pricing & Tax Configuration</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Cost Price */}
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Cost Price <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500 font-bold">৳</span>
                                            <input type="number" placeholder="0.00" className="w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>

                                    {/* Selling Price */}
                                    <div className="space-y-1">
                                        <label className="text-sm font-medium text-gray-700">Selling Price <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2 text-gray-500 font-bold">৳</span>
                                            <input type="number" placeholder="0.00" className="w-full pl-8 pr-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-4">
                                    <h3 className="text-sm font-semibold text-gray-700">Tax Rules</h3>

                                    {/* Tax Type */}
                                    <div className="flex gap-6">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="taxType" defaultChecked className="text-blue-600 focus:ring-blue-500" />
                                            <div className="text-sm">
                                                <span className="font-medium text-gray-800">Exclusive</span>
                                            </div>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="taxType" className="text-blue-600 focus:ring-blue-500" />
                                            <div className="text-sm">
                                                <span className="font-medium text-gray-800">Inclusive</span>
                                            </div>
                                        </label>
                                    </div>

                                    {/* Tax Policy */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Tax Policy</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option>Standard VAT (15%)</option>
                                                <option>Reduced VAT (7.5%)</option>
                                                <option>Zero Rated (0%)</option>
                                                <option>No Tax Rule</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Service-Wise Pricing */}
                                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg mt-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-800">Different Prices for Services?</h3>
                                                <p className="text-xs text-gray-500">Set different prices for Dine In, Delivery, etc.</p>
                                            </div>
                                            <label className="relative inline-flex items-center cursor-pointer">
                                                <input type="checkbox" className="sr-only peer" />
                                                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                            </label>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-slideDown">
                                            {['Dine In', 'Takeaway', 'Delivery', 'Online', 'Room Service'].map((service) => (
                                                <div key={service} className="space-y-1">
                                                    <label className="text-xs font-medium text-gray-600">{service} Price</label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1.5 text-gray-400 text-xs font-bold">৳</span>
                                                        <input type="number" placeholder="0.00" className="w-full pl-6 pr-3 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 3: INVENTORY */}
                        {activeTab === 'inventory' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Inventory & Kitchen Management</h2>

                                {/* Manage Stock Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Manage Stock</h3>
                                        <p className="text-xs text-gray-500">Enable stock tracking for this item</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={manageStock} onChange={() => setManageStock(!manageStock)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {manageStock && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideDown">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Current Stock</label>
                                            <input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Low Stock Alert Level</label>
                                            <input type="number" placeholder="5" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Unit</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option>Piece</option>
                                                <option>Kg</option>
                                                <option>Portion</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {/* Kitchen Info */}
                                <div className="p-4 border rounded-lg space-y-4">
                                    <h3 className="text-sm font-medium text-gray-900 border-b pb-2">Preparation</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium text-gray-700">Kitchen Station</label>
                                            <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                <option>Main Kitchen</option>
                                                <option>Bar</option>
                                                <option>Grill Station</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 4: VARIANTS */}
                        {activeTab === 'variants' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Product Variants & Add-ons</h2>

                                {/* Variants Toggle */}
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-900">Has Variants?</h3>
                                        <p className="text-xs text-gray-500">Does this product have options like Size or Color?</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={hasVariants} onChange={() => setHasVariants(!hasVariants)} className="sr-only peer" />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </div>

                                {hasVariants && (
                                    <div className="space-y-4 animate-slideDown">
                                        <div className="border rounded-lg overflow-hidden">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-gray-700">
                                                    <tr>
                                                        <th className="px-4 py-2">Variant Name</th>
                                                        <th className="px-4 py-2">Adjustment Price</th>
                                                        <th className="px-4 py-2 text-right">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    <tr>
                                                        <td className="px-4 py-2">Small</td>
                                                        <td className="px-4 py-2">+ 0.00</td>
                                                        <td className="px-4 py-2 text-right text-red-500 cursor-pointer">Remove</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="px-4 py-2">Large</td>
                                                        <td className="px-4 py-2">+ 50.00</td>
                                                        <td className="px-4 py-2 text-right text-red-500 cursor-pointer">Remove</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div className="p-3 bg-gray-50 border-t">
                                                <button className="text-blue-600 text-xs flex items-center gap-1 hover:underline"><Plus size={14} /> ADD NEW ROW</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <hr className="border-gray-100" />

                                {/* Add-ons Section */}
                                <div className="mt-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <input type="checkbox" id="allowAddons" className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                        <label htmlFor="allowAddons" className="text-sm text-gray-800 cursor-pointer">Allow Add-ons / Toppings?</label>
                                    </div>

                                    <div className="pl-7">
                                        <label className="text-sm font-medium text-gray-700 block mb-1">Select Add-on Group</label>
                                        <select className="w-full md:w-1/2 px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                            <option>Select Group...</option>
                                            <option>Burger Toppings (Cheese, Patty)</option>
                                            <option>Drinks (Coke, Water)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB 5: OFFER & SETTINGS */}
                        {activeTab === 'settings' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className="text-lg font-semibold border-b pb-2 mb-4">Offer & Publish Settings</h2>

                                {/* Toggles */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-800">Is Special / Featured?</h3>
                                            <p className="text-xs text-gray-500">Product will be highlighted in Website/App.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                        <div>
                                            <h3 className="text-sm font-medium text-gray-800">Active Status</h3>
                                            <p className="text-xs text-gray-500">Turn off to hide from POS and Menu.</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" defaultChecked />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                                        </label>
                                    </div>
                                </div>

                                {/* Offer Section */}
                                <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 mt-6">
                                    <div className="flex items-center gap-3 mb-4 border-b border-orange-200 pb-3">
                                        <input
                                            type="checkbox"
                                            id="offerActive"
                                            checked={isOfferActive}
                                            onChange={() => setIsOfferActive(!isOfferActive)}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                        />
                                        <label htmlFor="offerActive" className="text-sm text-gray-800 cursor-pointer">Offer Available?</label>
                                    </div>

                                    {isOfferActive && (
                                        <div className="space-y-4 animate-slideDown bg-white pt-2">

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Offer Name */}
                                                <div className="space-y-1 col-span-2">
                                                    <label className="text-sm font-medium text-gray-700">Promotion Name / Title</label>
                                                    <input type="text" placeholder="e.g. Summer Special" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>

                                                {/* Discount Type */}
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Discount Type</label>
                                                    <select className="w-full px-3 py-2 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none">
                                                        <option>Percentage (%)</option>
                                                        <option>Fixed Amount (Flat)</option>
                                                    </select>
                                                </div>

                                                {/* Discount Value */}
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Discount Value</label>
                                                    <input type="number" placeholder="0" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>

                                                {/* Start Date */}
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Start Date</label>
                                                    <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>

                                                {/* End Date */}
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">End Date</label>
                                                    <input type="date" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </div>

                                            {/* Happy Hour Logic */}
                                            <div className="pt-3 border-t mt-2">
                                                <label className="flex items-center gap-2 mb-2 cursor-pointer">
                                                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                                                    <span className="text-sm font-medium text-gray-700">Enable Happy Hour (Time Based)</span>
                                                </label>
                                                <div className="grid grid-cols-2 gap-4 pl-6">
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500">Start Time</label>
                                                        <input type="time" className="w-full px-2 py-1 border rounded text-sm outline-none" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-gray-500">End Time</label>
                                                        <input type="time" className="w-full px-2 py-1 border rounded text-sm outline-none" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Limits */}
                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t mt-2">
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Min Order Qty</label>
                                                    <input type="number" placeholder="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-sm font-medium text-gray-700">Max Discount Limit</label>
                                                    <input type="number" placeholder="Optional" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                                </div>
                                            </div>

                                        </div>
                                    )}
                                </div>

                                {/* Sorting */}
                                <div className="w-full md:w-1/3 space-y-1">
                                    <label className="text-sm font-medium text-gray-700">Menu Position / Priority</label>
                                    <input type="number" placeholder="1" className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <p className="text-xs text-gray-500">Higher number shows lower in the list.</p>
                                </div>

                            </div>
                        )}

                    </div>
                </div >
            </main >

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
        </div >
    );
};

export default AddProductMockup;
