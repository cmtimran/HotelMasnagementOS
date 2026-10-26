import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallbackTitle?: string;
    onReset?: () => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error inside component tree:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        if (this.props.onReset) {
            this.props.onReset();
        }
    };

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[450px] p-8 flex items-center justify-center animate-in fade-in duration-200">
                    <div className="max-w-xl w-full bg-white rounded-2xl border border-red-200 shadow-xl p-6 sm:p-8 space-y-6 text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shadow-xs">
                            <ShieldAlert size={32} />
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2.5 py-1 rounded-full border border-red-200">
                                Runtime Exception Intercepted
                            </span>
                            <h2 className="text-xl font-bold text-slate-900">
                                {this.props.fallbackTitle || 'Something went wrong in this module'}
                            </h2>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                The application encountered an unexpected runtime state. Your database and underlying session data remain secure.
                            </p>
                        </div>

                        {this.state.error && (
                            <div className="text-left bg-slate-900 rounded-xl p-3 text-red-300 font-mono text-[11px] overflow-x-auto max-h-36 border border-slate-800">
                                <div className="font-bold text-red-400 mb-1 flex items-center gap-1.5">
                                    <AlertTriangle size={12} />
                                    {this.state.error.name}: {this.state.error.message}
                                </div>
                                {this.state.errorInfo && (
                                    <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-relaxed">
                                        {this.state.errorInfo.componentStack?.slice(0, 400)}
                                    </pre>
                                )}
                            </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                            <button
                                type="button"
                                onClick={this.handleReset}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-sm cursor-pointer"
                            >
                                <RefreshCw size={14} />
                                Try Recovering Module
                            </button>
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                            >
                                <Home size={14} />
                                Reload Application
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
