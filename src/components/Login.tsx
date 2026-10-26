import React, { useState, useEffect } from 'react';
import {
    Mail,
    Lock,
    Eye,
    EyeOff,
    ArrowRight,
    Building2,
    Hash,
    ShieldCheck,
    Globe,
    Loader2,
    AlertCircle,
    Star,
    Shield
} from 'lucide-react';

interface User {
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
    { text: "Redefining Luxury Hospitality.", author: "NICE PREMIUM" },
    { text: "Empowering World-Class Service.", author: "Operations Elite" },
    { text: "Your Vision, Our Technology.", author: "Guest Excellence" }
];

const Login = ({ onLogin }: LoginProps) => {
    const [showPassword, setShowPassword] = useState(false);
    const [propertyId, setPropertyId] = useState('HQ-CORP');
    const [email, setEmail] = useState('superadmin@hotelmanagement.os');
    const [password, setPassword] = useState('admin123');
    const [isLoading, setIsLoading] = useState(false);
    const [loginStatus, setLoginStatus] = useState<'success' | 'error' | null>(null);

    const [activeQuote, setActiveQuote] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setActiveQuote((prev) => (prev + 1) % quotes.length);
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    // Quick helpers to pre-fill demo credentials
    const fillSuperAdmin = () => {
        setPropertyId('HQ-CORP');
        setEmail('superadmin@hotelmanagement.os');
        setPassword('admin123');
    };

    const fillDhakaFrontDesk = () => {
        setPropertyId('GPD-001');
        setEmail('frontdesk.dhaka@grandhospitality.com');
        setPassword('staff123');
    };

    const fillCoxsBazarGM = () => {
        setPropertyId('GOR-002');
        setEmail('operations.cox@grandhospitality.com');
        setPassword('staff123');
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginStatus(null);

        setTimeout(() => {
            if (propertyId && email && password) {
                setLoginStatus('success');
                setTimeout(() => {
                    const isSuper = propertyId === 'HQ-CORP' || email.includes('superadmin');
                    const isCox = propertyId === 'GOR-002' || email.includes('cox');

                    const role = isSuper ? 'super_admin' : isCox ? 'general_manager' : 'front_desk';
                    const propertyIdNum = isSuper ? 0 : isCox ? 2 : 1;
                    const propertyName = isSuper 
                        ? 'HotelOS Corporate HQ' 
                        : isCox 
                            ? "Grand Ocean Resort (Cox's Bazar)" 
                            : 'Grand Palace Dhaka';

                    const mockUser: User = {
                        name: isSuper 
                            ? 'Alexander Vance (Group MD)' 
                            : isCox 
                                ? 'Rahim Chowdhury (Resort GM)' 
                                : 'Sarah Jenkins (Front Desk Officer)',
                        role: role,
                        property: propertyName,
                        property_id: propertyIdNum,
                        email: email,
                        image: isSuper 
                            ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80'
                            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80'
                    };

                    if (isSuper) {
                        localStorage.setItem('hotel_portal_mode', 'super_admin');
                    } else {
                        localStorage.setItem('hotel_portal_mode', 'property_pms');
                        localStorage.setItem('hotel_active_property_id', String(propertyIdNum));
                    }

                    onLogin(mockUser);
                }, 800);
            } else {
                setLoginStatus('error');
                setIsLoading(false);
            }
        }, 1000);
    };

    const accentColor = '#2451d1';

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
                .animate-slow-parallax { animation: slow-parallax 30s ease-in-out infinite; }

                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }

                input::placeholder {
                    color: #94a3b8;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                }
            `}</style>

            {/* --- LEFT SIDE: HERO BRANDING --- */}
            <div className="hidden lg:flex w-7/12 relative overflow-hidden bg-slate-900 border-r border-white/5">
                <div className="absolute inset-0 z-0">
                    <img
                        src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop"
                        alt="Luxury Hospitality"
                        className="w-full h-full object-cover animate-slow-parallax opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-slate-900/40 to-transparent"></div>
                </div>

                <div className="absolute z-10 top-10 left-12">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center transition-all group-hover:bg-white/20 duration-500">
                            <Building2 size={24} style={{ color: accentColor }} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-2xl font-black tracking-[0.2em] text-white">HOTELOS</span>
                            <span className="text-[10px] tracking-[0.4em] uppercase" style={{ color: accentColor }}>Enterprise Multi-Property ERP</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 px-12 flex flex-col justify-center h-full max-w-3xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-[-1rem]">
                            <Star size={12} fill={accentColor} color={accentColor} />
                            <span className="text-[10px] tracking-[0.4em] uppercase text-white/60">Enterprise Architecture</span>
                        </div>

                        <div className="h-48 relative">
                            {quotes.map((quote, idx) => (
                                <div key={idx} className={`absolute inset-0 transition-all duration-1000 ${idx === activeQuote ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`}>
                                    <h1 className="text-[3rem] font-extrabold leading-[1.1] text-white tracking-tighter">
                                        {quote.text.split(' ').map((word, i) => (
                                            <span key={i} style={{ color: (word === 'Luxury' || word === 'World-Class' || word === 'Vision' ? accentColor : 'white') }} className="block">
                                                {word}
                                            </span>
                                        ))}
                                    </h1>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-10 left-12 right-12 flex items-center justify-between text-white/30 border-t border-white/5 pt-8 scale-90 origin-left">
                    <div className="flex gap-8">
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold">Multi-Property Core</span>
                            <span className="text-[9px] uppercase tracking-widest">Dhaka & Cox's Bazar</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold">54 Rooms</span>
                            <span className="text-[9px] uppercase tracking-widest">Cloud PostgreSQL 17</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase">
                        <Globe size={14} style={{ color: accentColor }} />
                        Secured TiDB Cluster
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDE: AUTHENTICATION FORM --- */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-6 lg:p-8 bg-white relative overflow-y-auto">
                <div className="w-full max-w-[420px] transition-all duration-500 py-4">
                    <div className="mb-8 text-center lg:text-left space-y-1">
                        <h2 className="text-[26px] font-black text-[#1e4cd3] leading-tight">
                            Welcome Back
                        </h2>
                        <p className="text-[#94a3b8] text-[13px] tracking-tight">
                            Enter your workspace credentials to access your terminal.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3.5">
                        <div className="space-y-3">
                            {/* Property / Workspace ID */}
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Hash size={15} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value.toUpperCase())}
                                    className="w-full pl-11 pr-20 py-2.5 bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-xs placeholder:text-slate-400 shadow-2xs"
                                    placeholder="Property / Workspace ID"
                                    required
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-slate-400 border border-slate-100 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-wider pointer-events-none">
                                    Required
                                </span>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Mail size={15} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-xs placeholder:text-slate-400 shadow-2xs"
                                    placeholder="Work Email"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Lock size={15} strokeWidth={2.5} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-2.5 bg-white border border-slate-200 rounded-[10px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-xs placeholder:text-slate-400 shadow-2xs"
                                    placeholder="Password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#2451d1] transition-colors cursor-pointer"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <div className="relative">
                                    <input type="checkbox" defaultChecked className="peer hidden" id="keep-signed" />
                                    <div className="w-3.5 h-3.5 border border-slate-300 rounded peer-checked:bg-[#2451d1] peer-checked:border-[#2451d1] transition-all"></div>
                                    <ShieldCheck size={10} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 group-hover:text-slate-900 transition-colors">Remember device</span>
                            </label>
                            <span className="text-[11px] text-[#2050d5] hover:underline cursor-pointer">Security Protocol</span>
                        </div>

                        {loginStatus === 'error' && (
                            <div className="p-2.5 bg-red-50 rounded-xl flex items-center gap-2.5 text-red-600 animate-shake shadow-xs border border-red-100">
                                <AlertCircle size={16} />
                                <span className="text-[11px] italic">Verification failed. Check credentials.</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || loginStatus === 'success'}
                            className="w-full py-3 bg-[#2050d5] hover:bg-[#1a44b8] rounded-[10px] text-white flex items-center justify-center relative overflow-hidden group shadow-md shadow-blue-400/10 active:scale-[0.99] transition-all disabled:opacity-70 cursor-pointer mt-2"
                        >
                            <div className="relative z-10 flex items-center gap-2 text-sm font-bold">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        <span>AUTHENTICATING CREDENTIALS...</span>
                                    </>
                                ) : loginStatus === 'success' ? (
                                    <span>SESSION INITIALIZED</span>
                                ) : (
                                    <>
                                        <span>Sign In to Terminal</span>
                                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                                    </>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        </button>
                    </form>

                    {/* DISCRETE 1-CLICK DEMO ACCOUNT SELECTOR */}
                    <div className="mt-8 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                                Demo Fast-Fill Profiles:
                            </span>
                            <span className="text-[9.5px] text-slate-400">Click to load</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={fillSuperAdmin}
                                className={`p-2 rounded-lg border text-left text-[11px] transition cursor-pointer ${
                                    propertyId === 'HQ-CORP' 
                                        ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-2xs' 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                                title="Load Super Admin (HQ Master Console)"
                            >
                                <div className="flex items-center gap-1">
                                    <Shield size={11} className="text-indigo-600 flex-shrink-0" />
                                    <span className="truncate font-semibold">Super Admin</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-normal truncate mt-0.5">Corporate HQ</p>
                            </button>

                            <button
                                type="button"
                                onClick={fillDhakaFrontDesk}
                                className={`p-2 rounded-lg border text-left text-[11px] transition cursor-pointer ${
                                    propertyId === 'GPD-001' 
                                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 shadow-2xs' 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                                title="Load Front Desk Staff (Grand Palace Dhaka PMS)"
                            >
                                <div className="flex items-center gap-1">
                                    <Building2 size={11} className="text-emerald-600 flex-shrink-0" />
                                    <span className="truncate font-semibold">Front Desk</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-normal truncate mt-0.5">Dhaka PMS</p>
                            </button>

                            <button
                                type="button"
                                onClick={fillCoxsBazarGM}
                                className={`p-2 rounded-lg border text-left text-[11px] transition cursor-pointer ${
                                    propertyId === 'GOR-002' 
                                        ? 'border-blue-500 bg-blue-50/70 text-blue-950 shadow-2xs' 
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                }`}
                                title="Load Resort Operations (Grand Ocean Cox's Bazar PMS)"
                            >
                                <div className="flex items-center gap-1">
                                    <Building2 size={11} className="text-blue-600 flex-shrink-0" />
                                    <span className="truncate font-semibold">Resort GM</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-normal truncate mt-0.5">Cox's Bazar</p>
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 text-center">
                        <p className="text-[10px] font-semibold text-slate-400 tracking-tight uppercase">
                            © 2026 HotelOS Enterprise • Multi-Property Hospitality System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
