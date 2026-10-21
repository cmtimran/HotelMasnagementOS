import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    useRef,
    useEffect
} from 'react';
import {
    CheckCircle2,
    AlertTriangle,
    AlertCircle,
    Info,
    X,
    Lock
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'bottom-right' | 'top-right' | 'bottom-center' | 'top-center';

export interface ToastOptions {
    id?: string;
    type?: ToastType;
    title?: string;
    duration?: number; // milliseconds, default: 4000
    icon?: React.ReactNode;
}

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
    duration: number;
    icon?: React.ReactNode;
    createdAt: number;
}

interface ToastContextValue {
    toasts: ToastItem[];
    showToast: (message: string, options?: ToastOptions) => string;
    dismissToast: (id: string) => void;
    dismissAll: () => void;
    position: ToastPosition;
    setPosition: (pos: ToastPosition) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global Dispatcher references for standalone `toast` usage anywhere (inside or outside React)
let globalAddToast: ((item: ToastItem) => void) | null = null;
let globalDismissToast: ((id: string) => void) | null = null;
let globalDismissAll: (() => void) | null = null;

export const toast = Object.assign(
    (message: string, options?: ToastOptions) => {
        const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const item: ToastItem = {
            id,
            message,
            type: options?.type || 'info',
            title: options?.title,
            duration: options?.duration ?? 4000,
            icon: options?.icon,
            createdAt: Date.now()
        };
        if (globalAddToast) {
            globalAddToast(item);
        } else {
            // Fallback before context mounts
            console.log(`[Toast ${item.type.toUpperCase()}]: ${item.message}`);
        }
        return id;
    },
    {
        success: (message: string, options?: Omit<ToastOptions, 'type'>) =>
            toast(message, { ...options, type: 'success' }),
        error: (message: string, options?: Omit<ToastOptions, 'type'>) =>
            toast(message, { ...options, type: 'error' }),
        warning: (message: string, options?: Omit<ToastOptions, 'type'>) =>
            toast(message, { ...options, type: 'warning' }),
        info: (message: string, options?: Omit<ToastOptions, 'type'>) =>
            toast(message, { ...options, type: 'info' }),
        dismiss: (id: string) => {
            if (globalDismissToast) globalDismissToast(id);
        },
        dismissAll: () => {
            if (globalDismissAll) globalDismissAll();
        }
    }
);

// Individual Toast Card with Pause-on-Hover and Smooth Countdown Bar
const ToastCard: React.FC<{
    toast: ToastItem;
    onDismiss: (id: string) => void;
}> = ({ toast: item, onDismiss }) => {
    const [isPaused, setIsPaused] = useState(false);
    const remainingTimeRef = useRef(item.duration);
    const startTimeRef = useRef(Date.now());
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [progress, setProgress] = useState(100);

    const startTimer = useCallback(() => {
        if (remainingTimeRef.current <= 0) return;
        startTimeRef.current = Date.now();
        timerRef.current = setTimeout(() => {
            onDismiss(item.id);
        }, remainingTimeRef.current);
    }, [item.id, onDismiss]);

    const pauseTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        const elapsed = Date.now() - startTimeRef.current;
        remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
        setIsPaused(true);
    }, []);

    const resumeTimer = useCallback(() => {
        setIsPaused(false);
        if (remainingTimeRef.current > 0) {
            startTimer();
        } else {
            onDismiss(item.id);
        }
    }, [startTimer, onDismiss, item.id]);

    useEffect(() => {
        startTimer();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [startTimer]);

    // Update progress bar
    useEffect(() => {
        if (isPaused || item.duration <= 0) return;
        const interval = setInterval(() => {
            const elapsed = Date.now() - startTimeRef.current;
            const currentRemaining = Math.max(0, remainingTimeRef.current - elapsed);
            const pct = Math.max(0, Math.min(100, (currentRemaining / item.duration) * 100));
            setProgress(pct);
        }, 30);

        return () => clearInterval(interval);
    }, [isPaused, item.duration]);

    // Choose visual accent based on toast type
    const isLock = item.message.includes('🔒') || item.message.toLowerCase().includes('audit') || item.message.toLowerCase().includes('historical');

    const typeConfig = {
        success: {
            icon: <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />,
            border: 'border-emerald-500/30',
            bar: 'bg-emerald-400',
            badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
            label: 'Success'
        },
        error: {
            icon: <AlertCircle size={16} className="text-rose-400 flex-shrink-0" />,
            border: 'border-rose-500/30',
            bar: 'bg-rose-400',
            badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
            label: 'Error'
        },
        warning: {
            icon: isLock
                ? <Lock size={15} className="text-amber-400 flex-shrink-0" />
                : <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />,
            border: 'border-amber-500/30',
            bar: 'bg-amber-400',
            badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
            label: isLock ? 'Audit Protected' : 'Notice'
        },
        info: {
            icon: <Info size={16} className="text-blue-400 flex-shrink-0" />,
            border: 'border-blue-500/30',
            bar: 'bg-blue-400',
            badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
            label: 'Info'
        }
    }[item.type];

    // Clean leading lock emoji if we render standard lock icon
    const displayMessage = isLock ? item.message.replace(/^🔒\s*/, '') : item.message;

    return (
        <div
            onMouseEnter={pauseTimer}
            onMouseLeave={resumeTimer}
            className={`group pointer-events-auto relative overflow-hidden rounded-xl bg-slate-900/95 text-white border ${typeConfig.border} shadow-2xl backdrop-blur-md transition-all duration-200 select-none animate-in fade-in slide-in-from-bottom-2 hover:scale-[1.01] hover:border-slate-500/60`}
            style={{ width: '340px', maxWidth: 'calc(100vw - 32px)' }}
            role="status"
            aria-live="polite"
        >
            <div className="p-3 pl-3.5 pr-8 flex items-start gap-2.5">
                {/* Type Icon */}
                <div className="mt-0.5">{item.icon || typeConfig.icon}</div>

                {/* Message & Title */}
                <div className="flex-1 min-w-0 pr-1">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${typeConfig.badgeBg}`}>
                            {item.title || typeConfig.label}
                        </span>
                        {isPaused && (
                            <span className="text-[9px] text-slate-400 italic">
                                (Paused on hover)
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-100 font-medium leading-relaxed m-0 break-words">
                        {displayMessage}
                    </p>
                </div>

                {/* Instant Dismiss Button */}
                <button
                    type="button"
                    onClick={() => onDismiss(item.id)}
                    className="absolute top-2.5 right-2 text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-md transition-colors cursor-pointer"
                    title="Dismiss"
                >
                    <X size={13} />
                </button>
            </div>

            {/* Auto-Dismiss Progress Bar (Pauses when hovered) */}
            <div className="h-0.5 w-full bg-slate-800 overflow-hidden">
                <div
                    className={`h-full ${typeConfig.bar} transition-all duration-75`}
                    style={{
                        width: `${progress}%`
                    }}
                />
            </div>
        </div>
    );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    // Default to 'bottom-right' (recommended by PMS UX standards for drawers & top-nav balance)
    const [position, setPosition] = useState<ToastPosition>('bottom-right');

    const showToast = useCallback((message: string, options?: ToastOptions): string => {
        const id = options?.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const newItem: ToastItem = {
            id,
            message,
            type: options?.type || 'info',
            title: options?.title,
            duration: options?.duration ?? 4000,
            icon: options?.icon,
            createdAt: Date.now()
        };

        setToasts(prev => {
            // Keep maximum 5 concurrent toasts
            const filtered = prev.filter(t => t.id !== id);
            return [newItem, ...filtered].slice(0, 5);
        });

        return id;
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const dismissAll = useCallback(() => {
        setToasts([]);
    }, []);

    // Bind global dispatcher
    useEffect(() => {
        globalAddToast = (item: ToastItem) => {
            setToasts(prev => {
                const filtered = prev.filter(t => t.id !== item.id);
                return [item, ...filtered].slice(0, 5);
            });
        };
        globalDismissToast = (id: string) => {
            setToasts(prev => prev.filter(t => t.id !== id));
        };
        globalDismissAll = () => {
            setToasts([]);
        };

        return () => {
            globalAddToast = null;
            globalDismissToast = null;
            globalDismissAll = null;
        };
    }, []);

    // Positioning classes
    const positionClasses = {
        'bottom-right': 'bottom-5 right-5 flex-col-reverse',
        'top-right': 'top-5 right-5 flex-col',
        'bottom-center': 'bottom-5 left-1/2 -translate-x-1/2 flex-col-reverse items-center',
        'top-center': 'top-5 left-1/2 -translate-x-1/2 flex-col items-center'
    }[position];

    return (
        <ToastContext.Provider
            value={{
                toasts,
                showToast,
                dismissToast,
                dismissAll,
                position,
                setPosition
            }}
        >
            {children}

            {/* Toaster Viewport Container */}
            <div
                className={`fixed ${positionClasses} z-[100050] flex gap-2 pointer-events-none`}
                aria-label="Notifications"
            >
                {toasts.map(item => (
                    <ToastCard key={item.id} toast={item} onDismiss={dismissToast} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};
