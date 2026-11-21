import React, { useState, useMemo } from 'react';
import { 
    X, Calendar, Users, 
    Printer, Save, CheckCircle2, 
    Tv, Flame, Award
} from 'lucide-react';
import type { ExtendedOutletItem } from '../restaurant/outlets/OutletSelector';

export interface BanquetEventOrder {
    id?: string;
    beo_number?: string;
    outlet_id: string;
    outlet_name?: string;
    event_name: string;
    event_type: string;
    host_name: string;
    host_phone: string;
    host_email: string;
    company_name: string;
    event_date: string;
    setup_time: string;
    start_time: string;
    end_time: string;
    guaranteed_pax: number;
    expected_pax: number;
    seating_style: string;
    hall_layout_notes: string;
    av_checklist: {
        cordlessMics: number;
        projector: boolean;
        stageLighting: boolean;
        soundConsole: boolean;
        podium: boolean;
    };
    food_service_schedule: {
        welcomeDrinks: string;
        starters: string;
        buffet: string;
        desserts: string;
    };
    menu_selected: string[];
    rental_tariff: number;
    per_pax_menu_rate: number;
    total_food_amount?: number;
    total_av_amount?: number;
    subtotal?: number;
    discount_amount: number;
    service_charge?: number;
    vat?: number;
    total_amount?: number;
    advance_paid: number;
    balance_due?: number;
    special_instructions: string;
    status?: string;
}

interface BanquetEventOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    venues: ExtendedOutletItem[];
    defaultVenueId?: string;
    onSaved?: (beo: any) => void;
}

export const BanquetEventOrderModal: React.FC<BanquetEventOrderModalProps> = ({
    isOpen,
    onClose,
    venues,
    defaultVenueId,
    onSaved
}) => {
    const [selectedOutletId, setSelectedOutletId] = useState<string>(
        defaultVenueId || (venues[0]?.id || '')
    );

    const [eventName, setEventName] = useState('Grand Wedding Reception & Dinner');
    const [eventType, setEventType] = useState('WEDDING');
    const [hostName, setHostName] = useState('Mr. Salman Rahman');
    const [hostPhone, setHostPhone] = useState('+880 1711-234567');
    const [hostEmail, setHostEmail] = useState('salman.rahman@gmail.com');
    const [companyName, setCompanyName] = useState('Beximco Group');
    const [eventDate, setEventDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
    });

    const [setupTime, setSetupTime] = useState('16:00');
    const [startTime, setStartTime] = useState('18:30');
    const [endTime, setEndTime] = useState('23:00');
    const [guaranteedPax, setGuaranteedPax] = useState(250);
    const [expectedPax, setExpectedPax] = useState(300);
    const [seatingStyle, setSeatingStyle] = useState('BANQUET_ROUND');
    const [hallLayoutNotes, setHallLayoutNotes] = useState('Round tables of 8 with ivory silk linen and floral centerpieces. Head table on elevated stage.');

    // AV Checklist
    const [avChecklist, setAvChecklist] = useState({
        cordlessMics: 4,
        projector: true,
        stageLighting: true,
        soundConsole: true,
        podium: true
    });

    // Food Schedule
    const [foodSchedule, setFoodSchedule] = useState({
        welcomeDrinks: '18:30',
        starters: '19:15',
        buffet: '20:30',
        desserts: '21:30'
    });

    const [menuDishes, setMenuDishes] = useState<string>(
        'Mutton Kacchi Biryani, Chicken Roast with Golden Gravy, Grilled Jumbo Prawns, Fresh Naan, Borhani, Firni & Gulab Jamun'
    );

    // Financials
    const activeVenue = useMemo(() => {
        return venues.find(v => v.id === selectedOutletId) || venues[0];
    }, [venues, selectedOutletId]);

    const defaultFullDayTariff = Number(activeVenue?.rental_tariffs?.fullDayRate || 100000);
    const [rentalTariff, setRentalTariff] = useState(defaultFullDayTariff);
    const [perPaxMenuRate, setPerPaxMenuRate] = useState(2400);
    const [totalAvAmount, setTotalAvAmount] = useState(15000);
    const [discountAmount, setDiscountAmount] = useState(0);
    const [advancePaid, setAdvancePaid] = useState(250000);
    const [specialInstructions, setSpecialInstructions] = useState('VIP bridal suite access required 2 hours prior to event. Sound limit 65dB after 11:00 PM.');

    const [saving, setSaving] = useState(false);
    const [savedBeo, setSavedBeo] = useState<any>(null);

    // Dynamic Calculations
    const calculations = useMemo(() => {
        const totalFood = guaranteedPax * perPaxMenuRate;
        const subtotal = rentalTariff + totalFood + totalAvAmount;
        const netBase = Math.max(0, subtotal - discountAmount);
        const scRate = Number(activeVenue?.service_charge_rate || 10.00);
        const vatRate = Number(activeVenue?.vat_rate || 15.00);

        const serviceCharge = Number((netBase * (scRate / 100)).toFixed(2));
        const vat = Number(((netBase + serviceCharge) * (vatRate / 100)).toFixed(2));
        const totalAmount = Number((netBase + serviceCharge + vat).toFixed(2));
        const balanceDue = Number(Math.max(0, totalAmount - advancePaid).toFixed(2));

        return { totalFood, subtotal, netBase, serviceCharge, vat, totalAmount, balanceDue, scRate, vatRate };
    }, [guaranteedPax, perPaxMenuRate, rentalTariff, totalAvAmount, discountAmount, advancePaid, activeVenue]);

    if (!isOpen) return null;

    const handleSaveBEO = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch('/api/restaurant/beo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    outletId: selectedOutletId,
                    eventName,
                    eventType,
                    hostName,
                    hostPhone,
                    hostEmail,
                    companyName,
                    eventDate,
                    setupTime,
                    startTime,
                    endTime,
                    guaranteedPax,
                    expectedPax,
                    seatingStyle,
                    hallLayoutNotes,
                    avChecklist,
                    foodServiceSchedule: foodSchedule,
                    menuSelected: menuDishes.split(',').map(s => s.trim()).filter(Boolean),
                    rentalTariff,
                    perPaxMenuRate,
                    totalAvAmount,
                    discountAmount,
                    advancePaid,
                    specialInstructions
                })
            });

            const data = await res.json();
            if (data.success) {
                setSavedBeo(data.data);
                if (onSaved) onSaved(data.data);
            } else {
                alert(`Failed to save BEO: ${data.error}`);
            }
        } catch (e: any) {
            alert(`Error saving BEO: ${e.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handlePrintBEO = () => {
        const printWindow = window.open('', '_blank', 'width=900,height=1000');
        if (!printWindow) return;

        const beoNo = savedBeo?.beo_number || `BEO-${eventDate.replace(/-/g, '').slice(0, 6)}-DRAFT`;

        printWindow.document.write(`
            <html>
                <head>
                    <title>Banquet Event Order - ${beoNo}</title>
                    <style>
                        @page { size: A4; margin: 15mm; }
                        body { font-family: "Segoe UI", Arial, sans-serif; color: #1e293b; line-height: 1.4; padding: 10px; font-size: 12px; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
                        .hotel-title { font-size: 22px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; }
                        .beo-title { font-size: 16px; font-weight: 800; color: #0f172a; }
                        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; background: #e0e7ff; color: #3730a3; }
                        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 14px; }
                        .section-card { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
                        .section-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #475569; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
                        .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
                        .row-label { color: #64748b; font-weight: 600; }
                        .row-value { font-weight: 700; color: #0f172a; }
                        table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
                        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                        th { background: #f8fafc; font-weight: 800; }
                        .total-row { font-weight: 900; background: #f1f5f9; }
                        .footer { margin-top: 30px; display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
                        .sign-box { width: 220px; text-align: center; border-top: 1px solid #0f172a; padding-top: 6px; font-weight: 700; font-size: 11px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div>
                            <div class="hotel-title">Grand Palace Hotel & Resort</div>
                            <div style="font-size: 11px; color: #64748b;">Plot 12, Gulshan Avenue, Dhaka-1212 • Banquet Operations Division</div>
                        </div>
                        <div style="text-align: right;">
                            <div class="beo-title">BANQUET EVENT ORDER (BEO)</div>
                            <div style="font-family: monospace; font-size: 13px; font-weight: 800; color: #4338ca;">${beoNo}</div>
                            <span class="badge">${eventType}</span>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="section-card">
                            <div class="section-title">Event Information</div>
                            <div class="row"><span class="row-label">Function Name:</span><span class="row-value">${eventName}</span></div>
                            <div class="row"><span class="row-label">Date of Event:</span><span class="row-value">${new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                            <div class="row"><span class="row-label">Venue / Hall:</span><span class="row-value">${activeVenue?.name || 'Grand Ballroom'}</span></div>
                            <div class="row"><span class="row-label">Timeline:</span><span class="row-value">Setup ${setupTime} • Event ${startTime} - ${endTime}</span></div>
                            <div class="row"><span class="row-label">Attendance:</span><span class="row-value">Guaranteed: ${guaranteedPax} | Expected: ${expectedPax}</span></div>
                            <div class="row"><span class="row-label">Seating Style:</span><span class="row-value">${seatingStyle.replace(/_/g, ' ')}</span></div>
                        </div>

                        <div class="section-card">
                            <div class="section-title">Organizer & Billing Contact</div>
                            <div class="row"><span class="row-label">Host / Client:</span><span class="row-value">${hostName}</span></div>
                            <div class="row"><span class="row-label">Company:</span><span class="row-value">${companyName || 'Private Event'}</span></div>
                            <div class="row"><span class="row-label">Contact Phone:</span><span class="row-value">${hostPhone}</span></div>
                            <div class="row"><span class="row-label">Email Address:</span><span class="row-value">${hostEmail}</span></div>
                            <div class="row"><span class="row-label">Hall Layout:</span><span class="row-value" style="font-size:10px;">${hallLayoutNotes}</span></div>
                        </div>
                    </div>

                    <div class="grid">
                        <div class="section-card">
                            <div class="section-title">F&B Service Schedule & Menu</div>
                            <div class="row"><span class="row-label">Welcome Drinks:</span><span class="row-value">${foodSchedule.welcomeDrinks}</span></div>
                            <div class="row"><span class="row-label">Starters Passed:</span><span class="row-value">${foodSchedule.starters}</span></div>
                            <div class="row"><span class="row-label">Main Buffet:</span><span class="row-value">${foodSchedule.buffet}</span></div>
                            <div class="row"><span class="row-label">Dessert Counter:</span><span class="row-value">${foodSchedule.desserts}</span></div>
                            <div style="margin-top: 8px; font-size: 11px; background:#f8fafc; padding:6px; border-radius:4px;">
                                <strong>Selected Dishes:</strong><br/>
                                ${menuDishes}
                            </div>
                        </div>

                        <div class="section-card">
                            <div class="section-title">Technical & AV Equipment</div>
                            <div class="row"><span class="row-label">Cordless Mics:</span><span class="row-value">${avChecklist.cordlessMics} Mics</span></div>
                            <div class="row"><span class="row-label">Projector / LED:</span><span class="row-value">${avChecklist.projector ? 'Included & Tested' : 'Not Requested'}</span></div>
                            <div class="row"><span class="row-label">Stage Lighting:</span><span class="row-value">${avChecklist.stageLighting ? 'Stage Spotlights Active' : 'Standard'}</span></div>
                            <div class="row"><span class="row-label">Sound & PA:</span><span class="row-value">${avChecklist.soundConsole ? 'DJ Sound Console Setup' : 'House Audio'}</span></div>
                            <div class="row"><span class="row-label">Podium:</span><span class="row-value">${avChecklist.podium ? 'Executive Podium with Mic' : 'No'}</span></div>
                        </div>
                    </div>

                    <div class="section-card" style="margin-bottom: 16px;">
                        <div class="section-title">Financial Summary & Payment Schedule</div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Description</th>
                                    <th>Unit / Quantity</th>
                                    <th>Rate (BDT)</th>
                                    <th style="text-align: right;">Amount (BDT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><strong>Venue Rental Tariff</strong> (${activeVenue?.name})</td>
                                    <td>1 Function</td>
                                    <td>৳${rentalTariff.toLocaleString()}</td>
                                    <td style="text-align: right;">৳${rentalTariff.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Food & Beverage Menu</strong> (${guaranteedPax} Guaranteed Pax)</td>
                                    <td>${guaranteedPax} Pax</td>
                                    <td>৳${perPaxMenuRate.toLocaleString()} / Pax</td>
                                    <td style="text-align: right;">৳${calculations.totalFood.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td><strong>Audio-Visual & Event Setup Production</strong></td>
                                    <td>Lump Sum</td>
                                    <td>৳${totalAvAmount.toLocaleString()}</td>
                                    <td style="text-align: right;">৳${totalAvAmount.toLocaleString()}</td>
                                </tr>
                                <tr class="total-row">
                                    <td colspan="3">Subtotal Base Amount:</td>
                                    <td style="text-align: right;">৳${calculations.subtotal.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td colspan="3">Statutory Service Charge (${calculations.scRate}%):</td>
                                    <td style="text-align: right;">৳${calculations.serviceCharge.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td colspan="3">Government VAT (${calculations.vatRate}%):</td>
                                    <td style="text-align: right;">৳${calculations.vat.toLocaleString()}</td>
                                </tr>
                                <tr class="total-row" style="background:#e0e7ff; color:#1e1b4b; font-size: 13px;">
                                    <td colspan="3">GRAND TOTAL (Inclusive of Taxes):</td>
                                    <td style="text-align: right;">৳${calculations.totalAmount.toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td colspan="3">Advance Deposit Received:</td>
                                    <td style="text-align: right; color:#059669;">- ৳${advancePaid.toLocaleString()}</td>
                                </tr>
                                <tr class="total-row" style="font-size: 13px; color:#b91c1c;">
                                    <td colspan="3">BALANCE DUE UPON EVENT CONCLUSION:</td>
                                    <td style="text-align: right;">৳${calculations.balanceDue.toLocaleString()}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    ${specialInstructions ? `
                    <div style="font-size: 11px; margin-bottom: 16px; padding: 6px; border: 1px solid #fed7aa; background: #fff7ed; border-radius: 4px;">
                        <strong>Special Operating Instructions:</strong> ${specialInstructions}
                    </div>
                    ` : ''}

                    <div class="footer">
                        <div class="sign-box">
                            Authorized Host / Client Signature
                        </div>
                        <div class="sign-box">
                            Banquet & Sales Director Signature
                        </div>
                        <div class="sign-box">
                            Executive Chef Signature
                        </div>
                    </div>

                    <script>
                        window.onload = function() { window.print(); }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-300">
                            <Award size={22} className="animate-pulse" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-base font-bold text-white tracking-wide">Banquet Event Order (BEO) Generator</h2>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30">
                                    5-Star Event Sheet
                                </span>
                            </div>
                            <p className="text-xs text-purple-200/80">Configure function timeline, hall layout, AV checklist, menu & milestone billing</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-purple-200 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto space-y-6 text-slate-700 text-xs">

                    {/* Venue & Function Overview Card */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Select Banquet Venue</label>
                            <select
                                value={selectedOutletId}
                                onChange={(e) => setSelectedOutletId(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white font-semibold text-slate-800"
                            >
                                {venues.map(v => (
                                    <option key={v.id} value={v.id}>
                                        {v.name} ({v.outlet_type})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Function Name</label>
                            <input
                                type="text"
                                value={eventName}
                                onChange={(e) => setEventName(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                                placeholder="e.g. Annual Gala Dinner"
                            />
                        </div>

                        <div>
                            <label className="font-bold text-slate-700 block mb-1">Event Category</label>
                            <select
                                value={eventType}
                                onChange={(e) => setEventType(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                            >
                                <option value="WEDDING">Wedding Reception & Dinner</option>
                                <option value="CORPORATE_GALA">Corporate Gala / Annual AGM</option>
                                <option value="CONFERENCE">International Conference</option>
                                <option value="SEMINAR">Workshop / Executive Seminar</option>
                                <option value="BIRTHDAY">Private Birthday & Anniversary</option>
                                <option value="EXHIBITION">Exhibition / Product Launch</option>
                            </select>
                        </div>
                    </div>

                    {/* Client Information */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <Users size={15} className="text-purple-600" />
                            Organizer & Client Information
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Host Name *</label>
                                <input
                                    type="text"
                                    value={hostName}
                                    onChange={(e) => setHostName(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Contact Phone *</label>
                                <input
                                    type="text"
                                    value={hostPhone}
                                    onChange={(e) => setHostPhone(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Email Address</label>
                                <input
                                    type="email"
                                    value={hostEmail}
                                    onChange={(e) => setHostEmail(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Company / Agency</label>
                                <input
                                    type="text"
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Schedule, Attendance & Hall Layout */}
                    <div className="space-y-2">
                        <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5 border-b border-slate-200 pb-1">
                            <Calendar size={15} className="text-purple-600" />
                            Event Schedule, Pax & Seating Style
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Event Date *</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Setup Starts</label>
                                <input
                                    type="time"
                                    value={setupTime}
                                    onChange={(e) => setSetupTime(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Function Time</label>
                                <div className="flex items-center gap-1">
                                    <input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                    <span>-</span>
                                    <input
                                        type="time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Guaranteed Pax *</label>
                                    <input
                                        type="number"
                                        value={guaranteedPax}
                                        onChange={(e) => setGuaranteedPax(Number(e.target.value))}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white font-bold text-purple-700"
                                    />
                                </div>
                                <div>
                                    <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Expected Pax</label>
                                    <input
                                        type="number"
                                        value={expectedPax}
                                        onChange={(e) => setExpectedPax(Number(e.target.value))}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium text-slate-700"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Seating Style</label>
                                <select
                                    value={seatingStyle}
                                    onChange={(e) => setSeatingStyle(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg bg-white font-medium"
                                >
                                    <option value="BANQUET_ROUND">Round Table Banquet (8-10 Pax)</option>
                                    <option value="THEATRE">Theatre Seating (Rows)</option>
                                    <option value="CLASSROOM">Classroom with Desks</option>
                                    <option value="U_SHAPE">U-Shape VIP Executive</option>
                                    <option value="COCKTAIL">Cocktail High Tables</option>
                                    <option value="BOARDROOM">Executive Boardroom</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-semibold text-slate-500 block mb-0.5">Hall Layout & Stage Placement Instructions</label>
                            <input
                                type="text"
                                value={hallLayoutNotes}
                                onChange={(e) => setHallLayoutNotes(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                                placeholder="Head table dais, dance floor size, backdrop location..."
                            />
                        </div>
                    </div>

                    {/* AV Checklist & F&B Schedule */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* AV Checklist */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                            <div className="font-bold text-slate-800 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><Tv size={14} className="text-purple-600" /> Audio-Visual Production</span>
                                <span className="text-[10px] text-slate-500">Equipment Checklist</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={avChecklist.projector}
                                        onChange={(e) => setAvChecklist({ ...avChecklist, projector: e.target.checked })}
                                    />
                                    <span>LED Wall / Projector</span>
                                </label>
                                <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={avChecklist.stageLighting}
                                        onChange={(e) => setAvChecklist({ ...avChecklist, stageLighting: e.target.checked })}
                                    />
                                    <span>Stage Spotlights</span>
                                </label>
                                <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={avChecklist.soundConsole}
                                        onChange={(e) => setAvChecklist({ ...avChecklist, soundConsole: e.target.checked })}
                                    />
                                    <span>DJ Sound Console</span>
                                </label>
                                <label className="flex items-center gap-2 p-1.5 bg-white border border-slate-200 rounded-md">
                                    <input
                                        type="checkbox"
                                        checked={avChecklist.podium}
                                        onChange={(e) => setAvChecklist({ ...avChecklist, podium: e.target.checked })}
                                    />
                                    <span>Executive Podium</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-3">
                                <label className="font-semibold text-slate-600">Cordless Mics:</label>
                                <input
                                    type="number"
                                    value={avChecklist.cordlessMics}
                                    onChange={(e) => setAvChecklist({ ...avChecklist, cordlessMics: Number(e.target.value) })}
                                    className="w-16 p-1 border border-slate-200 rounded bg-white font-bold text-center"
                                />
                                <span className="text-slate-400">Production Fee:</span>
                                <input
                                    type="number"
                                    value={totalAvAmount}
                                    onChange={(e) => setTotalAvAmount(Number(e.target.value))}
                                    className="w-24 p-1 border border-slate-200 rounded bg-white font-bold text-right"
                                />
                                <span>৳</span>
                            </div>
                        </div>

                        {/* F&B Schedule */}
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                            <div className="font-bold text-slate-800 flex items-center justify-between">
                                <span className="flex items-center gap-1.5"><Flame size={14} className="text-orange-500" /> Food & Beverage Schedule</span>
                                <span className="text-[10px] text-slate-500">Service Timeline</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                    <label className="text-[10px] text-slate-500 block">Welcome Drinks</label>
                                    <input
                                        type="time"
                                        value={foodSchedule.welcomeDrinks}
                                        onChange={(e) => setFoodSchedule({ ...foodSchedule, welcomeDrinks: e.target.value })}
                                        className="w-full p-1.5 border border-slate-200 rounded bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block">Starters Passing</label>
                                    <input
                                        type="time"
                                        value={foodSchedule.starters}
                                        onChange={(e) => setFoodSchedule({ ...foodSchedule, starters: e.target.value })}
                                        className="w-full p-1.5 border border-slate-200 rounded bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block">Dinner Buffet Open</label>
                                    <input
                                        type="time"
                                        value={foodSchedule.buffet}
                                        onChange={(e) => setFoodSchedule({ ...foodSchedule, buffet: e.target.value })}
                                        className="w-full p-1.5 border border-slate-200 rounded bg-white font-bold text-orange-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-slate-500 block">Desserts Counter</label>
                                    <input
                                        type="time"
                                        value={foodSchedule.desserts}
                                        onChange={(e) => setFoodSchedule({ ...foodSchedule, desserts: e.target.value })}
                                        className="w-full p-1.5 border border-slate-200 rounded bg-white"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Menu Items TextArea */}
                    <div>
                        <label className="font-bold text-slate-700 block mb-1">Catering Menu Items (Comma Separated)</label>
                        <textarea
                            rows={2}
                            value={menuDishes}
                            onChange={(e) => setMenuDishes(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg bg-white font-medium"
                            placeholder="Mutton Kacchi, Chicken Roast, Borhani..."
                        />
                    </div>

                    {/* Financial Summary & Tariff Ledger */}
                    <div className="p-4 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-xl space-y-3">
                        <div className="font-bold text-sm text-purple-200 flex items-center justify-between border-b border-white/10 pb-2">
                            <span>Financial Tariff & Milestone Ledger</span>
                            <span className="text-xs text-purple-300/80">Auto-calculated with {calculations.scRate}% SC + {calculations.vatRate}% VAT</span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                            <div>
                                <span className="text-slate-400 block mb-0.5">Hall Rental Tariff:</span>
                                <input
                                    type="number"
                                    value={rentalTariff}
                                    onChange={(e) => setRentalTariff(Number(e.target.value))}
                                    className="w-full p-1.5 bg-white/10 border border-white/20 rounded font-bold text-white text-right"
                                />
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Per Pax Menu Rate:</span>
                                <input
                                    type="number"
                                    value={perPaxMenuRate}
                                    onChange={(e) => setPerPaxMenuRate(Number(e.target.value))}
                                    className="w-full p-1.5 bg-white/10 border border-white/20 rounded font-bold text-white text-right"
                                />
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Special Discount:</span>
                                <input
                                    type="number"
                                    value={discountAmount}
                                    onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                    className="w-full p-1.5 bg-white/10 border border-white/20 rounded font-bold text-white text-right"
                                />
                            </div>
                            <div>
                                <span className="text-slate-400 block mb-0.5">Advance Paid Deposit:</span>
                                <input
                                    type="number"
                                    value={advancePaid}
                                    onChange={(e) => setAdvancePaid(Number(e.target.value))}
                                    className="w-full p-1.5 bg-emerald-500/20 border border-emerald-400/40 rounded font-bold text-emerald-300 text-right"
                                />
                            </div>
                        </div>

                        {/* Breakdown Totals Bar */}
                        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/10 text-xs">
                            <div>
                                <span className="text-slate-400">Food Subtotal:</span>{' '}
                                <strong className="text-white">৳{calculations.totalFood.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Total Bill (Inc. Tax):</span>{' '}
                                <strong className="text-indigo-300 text-sm">৳{calculations.totalAmount.toLocaleString()}</strong>
                            </div>
                            <div>
                                <span className="text-slate-400">Balance Due:</span>{' '}
                                <strong className="text-amber-400 text-sm">৳{calculations.balanceDue.toLocaleString()}</strong>
                            </div>
                        </div>
                    </div>

                    {/* Special Instructions */}
                    <div>
                        <label className="font-bold text-slate-700 block mb-1">Special Operating & Dietary Instructions</label>
                        <input
                            type="text"
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
                            className="w-full p-2 border border-slate-200 rounded-lg bg-white"
                            placeholder="VIP security clearance, halal certification requirements..."
                        />
                    </div>

                    {savedBeo && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
                            <div className="flex items-center gap-2 font-bold">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                BEO Registered Successfully! Document #{savedBeo.beo_number}
                            </div>
                            <button
                                type="button"
                                onClick={handlePrintBEO}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-bold flex items-center gap-1.5 shadow-xs"
                            >
                                <Printer size={13} />
                                Print Official BEO PDF
                            </button>
                        </div>
                    )}

                </div>

                {/* Footer Controls */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={handlePrintBEO}
                        className="px-4 py-2 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-300 rounded-lg transition-colors flex items-center gap-2"
                    >
                        <Printer size={14} />
                        Preview & Print BEO
                    </button>

                    <div className="flex items-center gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-lg"
                        >
                            Close
                        </button>

                        <button
                            type="button"
                            onClick={handleSaveBEO}
                            disabled={saving}
                            className="px-5 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer"
                        >
                            {saving ? (
                                <>Saving BEO...</>
                            ) : (
                                <>
                                    <Save size={14} />
                                    Save Banquet Order
                                </>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
