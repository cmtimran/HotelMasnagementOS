import React, { useState, useEffect } from 'react';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Building2,
    Hash,
    Globe,
    Loader2,
    AlertCircle,
    Star,
    Shield
} from 'lucide-react';
import { getApiBaseUrl } from '../utils/apiUrl';

interface User {
    id?: number;
    name: string;
    role: string;
    property: string;
    property_id?: number;
    email: string;
    image: string;
}

interface LoginProps {
    onLogin: (user: User) => void;
}

const quotes = [
    { text: "Redefining Luxury Hospitality.", author: "HOTEL OS ENTERPRISE" },
    { text: "Empowering World-Class Service.", author: "Operations Elite" },
    { text: "Your Vision, Our Technology.", author: "Guest Excellence" }
];

const Login = ({ onLogin }: LoginProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [propertyId, setPropertyId] = useState('');
    const [showPropertyCode, setShowPropertyCode] = useState(false);
    const [email, setEmail] = useState('superadmin@hotelmanagement.os');
    const [password, setPassword] = useState('admin');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const [activeQuote, setActiveQuote] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveQuote((prev) => (prev + 1) % quotes.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Clean up any stale or corrupted tenant keys on login screen
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const stale = localStorage.getItem('hotel_active_tenant_slug');
            if (stale === 'gpd' || stale === 'default' || stale === 'hq-corp') {
                localStorage.removeItem('hotel_active_tenant_slug');
            }
        }
    }, []);

    // Quick helper to fill Super Admin credentials
    const fillSuperAdmin = () => {
        setPropertyId('');
        setShowPropertyCode(false);
        setEmail('superadmin@hotelmanagement.os');
        setPassword('admin');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMessage('');

        try {
            const baseUrl = getApiBaseUrl();
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email.trim(), password })
            });

            const data = await res.json();
            if (data.success && data.user) {
                const user = data.user;
                const isSuper = user.role === 'super_admin' || user.role === 'admin';
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
                const userName = fullName || (user.email ? user.email.split('@')[0] : 'Super Administrator');

                const userData: User = {
                    id: user.id,
                    name: userName,
                    role: user.role,
                    property: isSuper ? 'Global Enterprise HQ' : 'Hotel Property',
                    property_id: user.propertyId || 0,
                    email: user.email,
                    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
                };

                if (isSuper) {
                    localStorage.setItem('hotel_portal_mode', 'super_admin');
                    localStorage.removeItem('hotel_active_tenant_slug');
                    localStorage.removeItem('hotel_active_property_id');
                } else {
                    localStorage.setItem('hotel_portal_mode', 'property_pms');
                    if (user.propertyId) {
                        localStorage.setItem('hotel_active_property_id', String(user.propertyId));
                    }
                    if (propertyId.trim()) {
                        localStorage.setItem('hotel_active_tenant_slug', propertyId.trim().toLowerCase());
                    }
                }
                localStorage.setItem('user_data', JSON.stringify(userData));
                if (data.token) {
                    localStorage.setItem('auth_token', data.token);
                }

                setTimeout(() => {
                    onLogin(userData);
                }, 400);
            } else {
                setErrorMessage(data.error || 'Authentication failed. Please verify credentials.');
                setIsLoading(false);
            }
        } catch (err: any) {
            setErrorMessage(err?.message || 'Network error connecting to authentication server.');
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex bg-white font-sans overflow-hidden login-font-outfit">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
                .login-font-outfit { font-family: 'Outfit', sans-serif; }
                
                @keyframes slow-parallax {
                    0% { transform: scale(1.05) translate(0, 0); }
                    50% { transform: scale(1.1) translate(-1%, -1%); }
                    100% { transform: scale(1.05) translate(0, 0); }
                }
                .animate-slow-parallax {
                    animation: slow-parallax 20s ease-in-out infinite;
                }
            `}</style>

            {/* Left Panel: High Fashion Hospitality Visual */}
            <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden bg-slate-900 border-r border-slate-200/50">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
                        alt="Luxury Hotel"
                        className="w-full h-full object-cover opacity-60 mix-blend-luminosity animate-slow-parallax"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-blue-950/20 mix-blend-color"></div>
                </div>

                {/* Top Logo */}
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-white/10">
                            <Building2 className="text-[#2050d5]" size={22} strokeWidth={2.5} />
                        </div>
                        <div>
                            <span className="text-xl font-bold tracking-tight text-white block">HotelManagement<span className="text-blue-400">OS</span></span>
                            <span className="text-[10px] tracking-widest text-slate-300 font-medium uppercase block">Cloud Hospitality Platform</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-xs">
                        <Globe size={14} className="animate-pulse text-blue-400" />
                        <span>Cloud Architecture</span>
                    </div>
                </div>

                {/* Bottom Quote / Social Proof */}
                <div className="relative z-10 space-y-6">
                    <div className="space-y-2">
                        <div className="flex gap-1 text-amber-400">
                            {[...Array(5)].map((_, i) => (
                                <Star key={i} size={14} fill="currentColor" />
                            ))}
                        </div>
                        <h3 className="text-2xl font-light text-white italic tracking-tight">
                            "{quotes[activeQuote].text}"
                        </h3>
                        <p className="text-sm font-semibold tracking-wider text-blue-400 uppercase">
                            — {quotes[activeQuote].author}
                        </p>
                    </div>

                    <div className="pt-6 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                        <span>Multi-Tenant Relational PMS</span>
                        <span>PostgreSQL Relational DB</span>
                    </div>
                </div>
            </div>

            {/* Right Panel: Clean Professional Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-between p-8 sm:p-12 md:p-16 lg:p-20 overflow-y-auto">
                {/* Mobile Header */}
                <div className="flex lg:hidden items-center justify-between pb-8">
                    <div className="flex items-center gap-2">
                        <Building2 className="text-[#2050d5]" size={24} strokeWidth={2.5} />
                        <span className="text-lg font-bold tracking-tight text-slate-900">HotelManagement<span className="text-[#2050d5]">OS</span></span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">v2.5 Enterprise</span>
                </div>

                <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sign In</h1>
                        <p className="text-sm text-slate-500 mt-1">Access your hotel management console</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {errorMessage && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2.5 text-xs text-red-700">
                                <AlertCircle size={16} className="shrink-0 text-red-500" />
                                <span>{errorMessage}</span>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="superadmin@hotelmanagement.os"
                                    required
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2050d5] focus:ring-2 focus:ring-[#2050d5]/10 transition-all"
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-xs font-semibold text-slate-700">Password</label>
                                <button
                                    type="button"
                                    onClick={() => setShowPropertyCode(!showPropertyCode)}
                                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                                >
                                    {showPropertyCode ? "− Hide Property Code" : "+ Staff Property Code (Optional)"}
                                </button>
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 font-medium placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-[#2050d5] focus:ring-2 focus:ring-[#2050d5]/10 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        {showPropertyCode && (
                            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                                <label className="block text-[11px] font-semibold text-slate-600">Property / Workspace Code (Optional)</label>
                                <div className="relative">
                                    <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        value={propertyId}
                                        onChange={(e) => setPropertyId(e.target.value.toUpperCase())}
                                        placeholder="Leave empty for Super Admin"
                                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded text-xs text-slate-800 font-medium placeholder:text-slate-400 focus:outline-none focus:border-blue-500"
                                    />
                                </div>
                                <span className="text-[10px] text-slate-400 block">Super Administrators do not require a property code.</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 px-4 bg-[#2050d5] hover:bg-[#1a44b8] text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-70 cursor-pointer mt-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Verifying...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Quick Access Card for Super Admin */}
                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                    <Shield size={16} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-900">Super Admin Master Key</p>
                                    <p className="text-[11px] text-slate-500 font-mono">superadmin@hotelmanagement.os</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={fillSuperAdmin}
                                className="px-2.5 py-1 text-xs font-semibold text-[#2050d5] hover:bg-blue-100/60 rounded-md transition cursor-pointer"
                            >
                                Auto-Fill
                            </button>
                        </div>
                    </div>
                </div>

                <div className="pt-8 text-center text-xs text-slate-400">
                    HotelManagementOS Enterprise Edition &bull; PostgreSQL Direct Cloud Connection
                </div>
            </div>
        </div>
    );
};

export default Login;
