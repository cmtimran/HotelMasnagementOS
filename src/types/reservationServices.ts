export interface ExtraBedConfig {
    enabled: boolean;
    bedType: 'Rollaway Adult Bed' | 'Baby Cot / Crib' | 'Extra Mattress' | 'Sofa Bed Setup';
    quantity: number;
    chargePerNight: number;
    isComplimentary: boolean;
    includesBreakfast: boolean;
    remarks?: string;
}

export interface PickupConfig {
    // Inbound / Arrival Pickup
    enabled: boolean;
    transferType: 'Airport Pickup' | 'Airport Drop' | 'Round Trip Transfer' | 'Railway Station Pickup' | 'City Transfer';
    flightNumber?: string;
    airline?: string;
    pickupDateTime?: string;
    pickupLocation?: string;
    vehicleType: 'Executive Sedan (Premio/Allion)' | 'Luxury SUV (Prado/Harrier)' | 'VIP Microbus (HiAce 7-10 pax)' | 'VIP Limousine';
    paxCount: number;
    luggageCount: number;
    chargeAmount: number;
    isComplimentary: boolean;
    driverInstructions?: string;

    // Outbound / Departure Drop
    dropEnabled?: boolean;
    dropFlightNumber?: string;
    dropAirline?: string;
    dropDateTime?: string;
    dropLocation?: string;
    dropVehicleType?: 'Executive Sedan (Premio/Allion)' | 'Luxury SUV (Prado/Harrier)' | 'VIP Microbus (HiAce 7-10 pax)' | 'VIP Limousine';
    dropPaxCount?: number;
    dropLuggageCount?: number;
    dropChargeAmount?: number;
    dropIsComplimentary?: boolean;
    dropDriverInstructions?: string;
}

export interface MealPlanConfig {
    enabled: boolean;
    planType: 'Buffet Breakfast (CP)' | 'Half Board (Breakfast + Dinner - MAP)' | 'Full Board (All Meals - AP)' | 'Romantic Candlelight Dinner Setup';
    guestsCount: number;
    ratePerGuestPerNight: number;
    isComplimentary: boolean;
    dietaryNotes?: string;
}

export interface CelebrationDecorConfig {
    enabled: boolean;
    packageType: 'Honeymoon Romantic Floral & Swan Decor' | 'Birthday Celebration (Cake, Balloons & Card)' | 'Anniversary Special Setup' | 'VIP Welcome Fruit & Artisan Chocolates Platter';
    cakeFlavor?: string;
    customMessage?: string;
    chargeAmount: number;
    isComplimentary: boolean;
    executionTime?: string;
}

export interface SpaWellnessConfig {
    enabled: boolean;
    serviceType: 'Couples Rejuvenation Spa (90 min)' | 'Signature Swedish Aromatherapy (60 min)' | 'Deep Tissue Therapeutic Massage (60 min)' | 'Steam, Sauna & Jacuzzi Day Pass';
    personsCount: number;
    chargeAmount: number;
    isComplimentary: boolean;
    preferredDateTime?: string;
}

export interface TimingFlexConfig {
    earlyCheckIn: boolean;
    earlyCheckInTime?: string;
    earlyCheckInCharge: number;
    lateCheckOut: boolean;
    lateCheckOutTime?: string;
    lateCheckOutCharge: number;
    isComplimentary: boolean;
}

export interface CustomAddonItem {
    id: string;
    title: string;
    chargeType: 'once' | 'per_night';
    amount: number;
    quantity: number;
    isComplimentary: boolean;
}

export interface RoomServicesBundle {
    allocationScope?: 'all' | 'specific';
    targetRoomNumber?: string;
    extraBed?: ExtraBedConfig;
    pickup?: PickupConfig;
    mealPlan?: MealPlanConfig;
    celebration?: CelebrationDecorConfig;
    spaWellness?: SpaWellnessConfig;
    timingFlex?: TimingFlexConfig;
    customAddons?: CustomAddonItem[];
}

export const DEFAULT_EXTRA_BED: ExtraBedConfig = {
    enabled: false,
    bedType: 'Rollaway Adult Bed',
    quantity: 1,
    chargePerNight: 1500,
    isComplimentary: false,
    includesBreakfast: true,
    remarks: ''
};

export const DEFAULT_PICKUP: PickupConfig = {
    enabled: false,
    transferType: 'Airport Pickup',
    flightNumber: '',
    airline: 'Biman Bangladesh Airlines',
    pickupDateTime: '',
    pickupLocation: 'Hazrat Shahjalal Intl Airport (DAC) - Terminal 1',
    vehicleType: 'Executive Sedan (Premio/Allion)',
    paxCount: 2,
    luggageCount: 2,
    chargeAmount: 2500,
    isComplimentary: false,
    driverInstructions: '',

    dropEnabled: false,
    dropFlightNumber: '',
    dropAirline: 'Biman Bangladesh Airlines',
    dropDateTime: '',
    dropLocation: 'Hazrat Shahjalal Intl Airport (DAC) - Terminal 1',
    dropVehicleType: 'Executive Sedan (Premio/Allion)',
    dropPaxCount: 2,
    dropLuggageCount: 2,
    dropChargeAmount: 2500,
    dropIsComplimentary: false,
    dropDriverInstructions: ''
};

export const DEFAULT_MEAL_PLAN: MealPlanConfig = {
    enabled: false,
    planType: 'Buffet Breakfast (CP)',
    guestsCount: 2,
    ratePerGuestPerNight: 750,
    isComplimentary: false,
    dietaryNotes: ''
};

export const DEFAULT_CELEBRATION: CelebrationDecorConfig = {
    enabled: false,
    packageType: 'Honeymoon Romantic Floral & Swan Decor',
    cakeFlavor: 'Rich Chocolate Truffle',
    customMessage: 'Happy Honeymoon!',
    chargeAmount: 2500,
    isComplimentary: false,
    executionTime: 'Prior to Check-in'
};

export const DEFAULT_SPA_WELLNESS: SpaWellnessConfig = {
    enabled: false,
    serviceType: 'Signature Swedish Aromatherapy (60 min)',
    personsCount: 1,
    chargeAmount: 3500,
    isComplimentary: false,
    preferredDateTime: ''
};

export const DEFAULT_TIMING_FLEX: TimingFlexConfig = {
    earlyCheckIn: false,
    earlyCheckInTime: '09:00 AM',
    earlyCheckInCharge: 1500,
    lateCheckOut: false,
    lateCheckOutTime: '04:00 PM',
    lateCheckOutCharge: 1500,
    isComplimentary: false
};

// Calculations
export const getExtraBedTotal = (config?: ExtraBedConfig, nights = 1): number => {
    if (!config || !config.enabled || config.isComplimentary) return 0;
    return (Number(config.chargePerNight) || 0) * (Number(config.quantity) || 1) * Math.max(1, nights);
};

export const getPickupTotal = (config?: PickupConfig): number => {
    if (!config) return 0;
    let total = 0;
    if (config.enabled && !config.isComplimentary) {
        total += Number(config.chargeAmount) || 0;
    }
    if (config.dropEnabled && !config.dropIsComplimentary) {
        total += Number(config.dropChargeAmount) || 0;
    }
    return total;
};

export const getMealPlanTotal = (config?: MealPlanConfig, nights = 1): number => {
    if (!config || !config.enabled || config.isComplimentary) return 0;
    const isOneOff = config.planType === 'Romantic Candlelight Dinner Setup';
    const duration = isOneOff ? 1 : Math.max(1, nights);
    return (Number(config.ratePerGuestPerNight) || 0) * (Number(config.guestsCount) || 1) * duration;
};

export const getCelebrationTotal = (config?: CelebrationDecorConfig): number => {
    if (!config || !config.enabled || config.isComplimentary) return 0;
    return Number(config.chargeAmount) || 0;
};

export const getSpaWellnessTotal = (config?: SpaWellnessConfig): number => {
    if (!config || !config.enabled || config.isComplimentary) return 0;
    return Number(config.chargeAmount) || 0;
};

export const getTimingFlexTotal = (config?: TimingFlexConfig): number => {
    if (!config || config.isComplimentary) return 0;
    let total = 0;
    if (config.earlyCheckIn) total += Number(config.earlyCheckInCharge) || 0;
    if (config.lateCheckOut) total += Number(config.lateCheckOutCharge) || 0;
    return total;
};

export const getCustomAddonsTotal = (items?: CustomAddonItem[], nights = 1): number => {
    if (!items || items.length === 0) return 0;
    return items.reduce((acc, item) => {
        if (item.isComplimentary) return acc;
        const qty = Number(item.quantity) || 1;
        const amt = Number(item.amount) || 0;
        const dur = item.chargeType === 'per_night' ? Math.max(1, nights) : 1;
        return acc + (amt * qty * dur);
    }, 0);
};

export const getRoomBundleTotal = (bundle?: RoomServicesBundle, nights = 1): number => {
    if (!bundle) return 0;
    return (
        getExtraBedTotal(bundle.extraBed, nights) +
        getPickupTotal(bundle.pickup) +
        getMealPlanTotal(bundle.mealPlan, nights) +
        getCelebrationTotal(bundle.celebration) +
        getSpaWellnessTotal(bundle.spaWellness) +
        getTimingFlexTotal(bundle.timingFlex) +
        getCustomAddonsTotal(bundle.customAddons, nights)
    );
};
