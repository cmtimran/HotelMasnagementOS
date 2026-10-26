import React from 'react';
import { X, Save, ChevronDown, Image as ImageIcon } from 'lucide-react';

// Re-using the FormField interface but extending it if necessary later
export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'password' | 'email' | 'file';
    options?: string[];
    placeholder?: string;
    defaultValue?: string | number | boolean;
    required?: boolean;
    colSpan?: 1 | 2 | 3 | 4; // For grid layout control
}

export interface FormSection {
    title: string;
    description?: string;
    fields: FormField[];
}

interface GenericSectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    sections: FormSection[];
    onSave?: (data: any) => void;
}

const GenericSectionModal: React.FC<GenericSectionModalProps> = ({
    isOpen,
    onClose,
    title,
    subtitle,
    sections,
    onSave
}) => {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave?.({});
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] animate-scaleIn">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h2 className="text-xl text-gray-800">{title}</h2>
                        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
                    </div>
                    <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full transition-colors text-gray-500">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {sections.map((section, index) => (
                            <div key={index} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                                <h3 className="text-sm text-gray-800 mb-4 uppercase tracking-wide border-b pb-2 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">{index + 1}</span>
                                    {section.title}
                                </h3>
                                {/* Grid Layout - 4 Columns on Large Screens */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    {section.fields.map((field) => {
                                        // Calculate responsive spans
                                        const isFullWidth = field.type === 'textarea' || field.colSpan === 4 || field.colSpan === 3;

                                        // lg span (4 cols total)
                                        const lgSpan = isFullWidth ? 'lg:col-span-4' :
                                            field.colSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1';

                                        // md span (2 cols total)
                                        const mdSpan = isFullWidth || field.colSpan === 2 ? 'md:col-span-2' : 'md:col-span-1';

                                        return (
                                            <div
                                                key={field.name}
                                                className={`${lgSpan} ${mdSpan} space-y-1`}
                                            >
                                                {field.type !== 'checkbox' && (
                                                    <label className="text-sm font-medium text-gray-700 block">
                                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                                    </label>
                                                )}

                                                {field.type === 'select' ? (
                                                    <div className="relative">
                                                        <select
                                                            name={field.name}
                                                            defaultValue={field.defaultValue?.toString()}
                                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none pr-10"
                                                        >
                                                            {field.options?.map((opt) => (
                                                                <option key={opt} value={opt}>{opt}</option>
                                                            ))}
                                                        </select>
                                                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-gray-500">
                                                            <ChevronDown size={16} />
                                                        </div>
                                                    </div>

                                                ) : field.type === 'textarea' ? (
                                                    <textarea
                                                        name={field.name}
                                                        placeholder={field.placeholder}
                                                        defaultValue={field.defaultValue?.toString()}
                                                        rows={3}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                    />
                                                ) : field.type === 'checkbox' ? (
                                                    <div className="flex items-center h-full pt-1">
                                                        <label className="flex items-center gap-3 cursor-pointer select-none">
                                                            <input
                                                                type="checkbox"
                                                                name={field.name}
                                                                defaultChecked={!!field.defaultValue}
                                                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                            />
                                                            <div>
                                                                <span className="text-sm font-medium text-gray-700 block">{field.label}</span>
                                                                <span className="text-xs text-gray-500">Enable or disable this feature</span>
                                                            </div>
                                                        </label>
                                                    </div>
                                                ) : field.type === 'file' ? (
                                                    <div>
                                                        <label className="border-2 border-dashed border-gray-300 rounded-lg w-32 h-32 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 cursor-pointer transition bg-gray-50">
                                                            <ImageIcon size={24} className="mb-1 text-gray-400" />
                                                            <span className="text-[10px] text-center px-2">Upload Image</span>
                                                            <input type="file" className="hidden" />
                                                        </label>
                                                    </div>
                                                ) : (
                                                    <input
                                                        type={field.type}
                                                        name={field.name}
                                                        placeholder={field.placeholder}
                                                        defaultValue={field.defaultValue?.toString()}
                                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-white flex justify-end gap-3 rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        type="button"
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GenericSectionModal;
