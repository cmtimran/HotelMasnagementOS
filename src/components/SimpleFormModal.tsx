import React from 'react';
import { X, Save, ChevronDown } from 'lucide-react';

export interface FormField {
    name: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'textarea' | 'checkbox' | 'password' | 'email';
    options?: string[]; // For select type
    placeholder?: string;
    defaultValue?: string | number | boolean;
    required?: boolean;
}

interface SimpleFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: FormField[];
    onSave?: (data: any) => void;
}

const SimpleFormModal: React.FC<SimpleFormModalProps> = ({
    isOpen,
    onClose,
    title,
    fields,
    onSave
}) => {
    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Collect form data logic here if needed, or just trigger onSave
        onSave?.({});
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col animate-scaleIn">
                {/* Header */}
                <div className="bg-white border-b px-6 py-4 flex justify-between items-center rounded-t-xl">
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                    <button onClick={onClose} className="hover:bg-gray-100 p-2 rounded-full transition-colors text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {fields.map((field) => (
                        <div key={field.name} className={field.type === 'checkbox' ? "flex items-center gap-3 pt-2" : "space-y-1"}>
                            {field.type !== 'checkbox' && (
                                <label className="text-sm font-medium text-gray-700">
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
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        name={field.name}
                                        defaultChecked={!!field.defaultValue}
                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="text-sm font-medium text-gray-700">{field.label}</span>
                                </label>
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
                    ))}

                    <div className="pt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm flex items-center gap-2"
                        >
                            <Save size={16} />
                            Save
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SimpleFormModal;
