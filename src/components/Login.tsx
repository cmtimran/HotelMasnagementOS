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
    Star
} from 'lucide-react';

interface User {
    name: string;
    role: string;
    property: string;
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
    const [propertyId, setPropertyId] = useState('NICE-001');
    const [email, setEmail] = useState('admin@nice.com');
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

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setLoginStatus(null);

        setTimeout(() => {
            if (propertyId && email && password) {
                setLoginStatus('success');
                setTimeout(() => {
                    const mockUser = {
                        name: 'John Smith',
                        role: 'Administrator',
                        property: 'Grand Hotel',
                        email: email,
                        image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
                    };
                    onLogin(mockUser);
                }, 1000);
            } else {
                setLoginStatus('error');
                setIsLoading(false);
            }
        }, 1500);
    };

    const accentColor = '#2451d1'; // Updated Blue to match reference image

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

            {/* --- LEFT SIDE --- */}
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
                            <span className="text-2xl font-black tracking-[0.2em] text-white">NICE</span>
                            <span className="text-[10px] font-bold tracking-[0.4em] uppercase" style={{ color: accentColor }}>Property Management System</span>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 px-12 flex flex-col justify-center h-full max-w-3xl">
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-[-1rem]">
                            <Star size={12} fill={accentColor} color={accentColor} />
                            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/60">No #1 Hospitality Solutions</span>
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
                            <span className="text-white text-base font-bold">156+</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest">Properties</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white text-base font-bold">99.9%</span>
                            <span className="text-[9px] font-bold uppercase tracking-widest">System Uptime</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase">
                        <Globe size={14} style={{ color: accentColor }} />
                        Secured Gateway
                    </div>
                </div>
            </div>

            {/* --- RIGHT SIDE: LOGIN FORM (Match Image) --- */}
            <div className="w-full lg:w-5/12 flex items-center justify-center p-6 lg:p-8 bg-white relative">

                <div className="w-full max-w-[420px] transition-all duration-500">
                    <div className="mb-10 text-center lg:text-left space-y-3">
                        <h2 className="text-[28px] font-black text-[#1e4cd3] leading-tight">
                            Welcome Back
                        </h2>
                        <p className="text-[#94a3b8] text-[14px] tracking-tight">
                            Enter your workspace credentials to continue.
                        </p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-3">
                            {/* Property ID */}
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Hash size={16} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="text"
                                    value={propertyId}
                                    onChange={(e) => setPropertyId(e.target.value.toUpperCase())}
                                    className="w-full pl-14 pr-24 py-[13px] bg-white border border-slate-200 rounded-[12px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-[13px] placeholder:text-slate-400 shadow-sm"
                                    placeholder="Property ID"
                                    required
                                />
                                <span className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-300 border border-slate-100 bg-slate-50/50 px-2 py-1 rounded-lg uppercase tracking-wider pointer-events-none">
                                    Required
                                </span>
                            </div>

                            {/* Email */}
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Mail size={16} strokeWidth={2.5} />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-14 pr-6 py-[13px] bg-white border border-slate-200 rounded-[12px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-[13px] placeholder:text-slate-400 shadow-sm"
                                    placeholder="Work Email"
                                    required
                                />
                            </div>

                            {/* Password */}
                            <div className="relative group">
                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-colors group-focus-within:text-[#2451d1]">
                                    <Lock size={16} strokeWidth={2.5} />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-14 pr-16 py-[13px] bg-white border border-slate-200 rounded-[12px] focus:outline-none focus:border-[#2451d1] focus:ring-4 focus:ring-[#2451d1]/5 transition-all font-semibold text-slate-700 text-[13px] placeholder:text-slate-400 shadow-sm"
                                    placeholder="Password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-[#2451d1] transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input type="checkbox" className="peer hidden" id="keep-signed" />
                                    <div className="w-4 h-4 border-2 border-slate-200 rounded peer-checked:bg-[#2451d1] peer-checked:border-[#2451d1] transition-all group-hover:border-slate-300"></div>
                                    <ShieldCheck size={10} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-opacity" />
                                </div>
                                <span className="text-[12px] font-semibold text-slate-500 group-hover:text-slate-900 transition-colors">Keep me signed in</span>
                            </label>
                            <a href="#" className="text-[12px] font-bold text-[#2050d5] hover:underline underline-offset-4 transition-all">Forgot password?</a>
                        </div>

                        {loginStatus === 'error' && (
                            <div className="p-3 bg-red-50 rounded-xl flex items-center gap-3 text-red-600 animate-shake shadow-sm border border-red-100">
                                <AlertCircle size={18} />
                                <span className="text-[12px] font-bold italic">Verification failed. Check credentials.</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || loginStatus === 'success'}
                            className="w-full py-3.5 bg-[#2050d5] rounded-[12px] text-white flex items-center justify-center relative overflow-hidden group shadow-lg shadow-blue-400/10 active:scale-[0.98] transition-all disabled:opacity-70"
                        >
                            <div className="relative z-10 flex items-center gap-2 text-[16px] font-bold">
                                {isLoading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        <span>SIGNING IN...</span>
                                    </>
                                ) : loginStatus === 'success' ? (
                                    <span>SUCCESS</span>
                                ) : (
                                    <>
                                        <span>Sign In</span>
                                        <ArrowRight size={18} className="group-hover:translate-x-1.5 transition-transform" strokeWidth={3} />
                                    </>
                                )}
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                        </button>
                    </form>

                    <div className="pt-12 text-center">
                        <p className="text-[11px] font-semibold text-slate-400 tracking-tight uppercase">
                            © 2024 NICE PMS. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
