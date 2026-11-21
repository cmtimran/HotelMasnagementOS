import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
    AlertTriangle,
    Trash2,
    Info,
    X,
    Check
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'primary';

export interface ConfirmModalOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: ConfirmVariant;
    icon?: React.ReactNode;
}

interface ConfirmState extends ConfirmModalOptions {
    isOpen: boolean;
    resolve: (value: boolean) => void;
}

interface ConfirmModalContextValue {
    confirm: (options: ConfirmModalOptions | string) => Promise<boolean>;
}

const ConfirmModalContext = createContext<ConfirmModalContextValue | null>(null);

// Global reference for standalone `confirmModal` usage anywhere
let globalShowConfirm: ((options: ConfirmModalOptions | string) => Promise<boolean>) | null = null;

/**
 * Universal async confirm modal function.
 * Replaces browser-native `window.confirm()` with a modern, compact, accessible dialog.
 * 
 * Usage:
 * ```ts
 * if (await confirmModal('Are you sure you want to delete this?')) { ... }
 * ```
 * or with options:
 * ```ts
 * const ok = await confirmModal({
 *     title: 'Delete Room Type?',
 *     message: 'Assigned rooms will need reallocation.',
 *     confirmText: 'Delete Room Type',
 *     variant: 'danger'
 * });
 * ```
 */
export const confirmModal = (options: ConfirmModalOptions | string): Promise<boolean> => {
    if (globalShowConfirm) {
        return globalShowConfirm(options);
    }
    // Fallback if called before provider mounts
    const msg = typeof options === 'string' ? options : options.message;
    return Promise.resolve(window.confirm(msg));
};

export const ConfirmModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, setState] = useState<ConfirmState | null>(null);

    const showConfirm = useCallback((options: ConfirmModalOptions | string): Promise<boolean> => {
        return new Promise<boolean>((resolve) => {
            const raw = typeof options === 'string' ? { message: options } : options;
            const msg = raw.message || '';
            const lowerMsg = msg.toLowerCase();

            // Auto-detect variant & smart title if not provided
            let variant: ConfirmVariant = raw.variant || 'info';
            let title = raw.title;
            let confirmText = raw.confirmText;

            if (!raw.variant) {
                if (lowerMsg.includes('delete') || lowerMsg.includes('remove') || lowerMsg.includes('void') || lowerMsg.includes('clear')) {
                    variant = 'danger';
                    if (!title) title = 'Confirm Deletion';
                    if (!confirmText) confirmText = 'Delete';
                } else if (lowerMsg.includes('warning') || lowerMsg.includes('reset') || lowerMsg.includes('dirty') || lowerMsg.includes('cancel') || lowerMsg.includes('unlock')) {
                    variant = 'warning';
                    if (!title) title = 'Please Confirm';
                    if (!confirmText) confirmText = 'Proceed';
                } else {
                    variant = 'info';
                    if (!title) title = 'Confirm Action';
                    if (!confirmText) confirmText = 'Confirm';
                }
            }

            if (!title) title = variant === 'danger' ? 'Confirm Deletion' : 'Confirm Action';
            if (!confirmText) confirmText = variant === 'danger' ? 'Delete' : 'Confirm';

            setState({
                isOpen: true,
                message: msg,
                title,
                confirmText,
                cancelText: raw.cancelText || 'Cancel',
                variant,
                icon: raw.icon,
                resolve
            });
        });
    }, []);

    useEffect(() => {
        globalShowConfirm = showConfirm;
        return () => {
            globalShowConfirm = null;
        };
    }, [showConfirm]);

    const handleConfirm = () => {
        if (state) {
            state.resolve(true);
            setState(null);
        }
    };

    const handleCancel = () => {
        if (state) {
            state.resolve(false);
            setState(null);
        }
    };

    // Keyboard support: Escape cancels, Enter confirms
    useEffect(() => {
        if (!state?.isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                handleCancel();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state]);

    const getVariantIcon = () => {
        if (state?.icon) return state.icon;
        switch (state?.variant) {
            case 'danger':
                return (
                    <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shadow-2xs flex-shrink-0">
                        <Trash2 size={20} className="stroke-[2.2]" />
                    </div>
                );
            case 'warning':
                return (
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-2xs flex-shrink-0">
                        <AlertTriangle size={20} className="stroke-[2.2]" />
                    </div>
                );
            case 'primary':
            case 'info':
            default:
                return (
                    <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs flex-shrink-0">
                        <Info size={20} className="stroke-[2.2]" />
                    </div>
                );
        }
    };

    const getConfirmButtonClasses = () => {
        switch (state?.variant) {
            case 'danger':
                return 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20';
            case 'warning':
                return 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20';
            case 'primary':
            case 'info':
            default:
                return 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20';
        }
    };

    return (
        <ConfirmModalContext.Provider value={{ confirm: showConfirm }}>
            {children}

            {state?.isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    className="fixed inset-0 z-[99999] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) handleCancel();
                    }}
                >
                    <div
                        className="bg-white w-full max-w-sm rounded-2xl border border-slate-200/90 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150 relative text-left"
                        role="alertdialog"
                        aria-modal="true"
                    >
                        {/* Close button */}
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            aria-label="Close dialog"
                        >
                            <X size={16} />
                        </button>

                        {/* Content */}
                        <div className="flex items-start gap-3.5">
                            {getVariantIcon()}
                            <div className="pr-3 flex-1 min-w-0">
                                <h3 className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                                    {state.title}
                                </h3>
                                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed break-words whitespace-pre-line">
                                    {state.message}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors cursor-pointer"
                            >
                                {state.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirm}
                                autoFocus
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${getConfirmButtonClasses()}`}
                            >
                                <Check size={12} className="stroke-[2.5]" />
                                <span>{state.confirmText}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </ConfirmModalContext.Provider>
    );
};

export const useConfirmModal = () => {
    const ctx = useContext(ConfirmModalContext);
    if (!ctx) {
        return { confirm: confirmModal };
    }
    return ctx;
};
