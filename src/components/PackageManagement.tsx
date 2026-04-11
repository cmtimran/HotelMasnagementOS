import { useState } from 'react';
import {
    Plus, Search, Package, Edit, Copy, Trash2,
    Utensils, Waves, Car, Shirt, Wine, Dumbbell, Star,
    Check, X, Info, DollarSign, Calendar,
    BedDouble, Users, ArrowLeft, Save, Eye, ToggleLeft,
    ToggleRight, AlertCircle, Zap, Shield, Gift, TrendingUp
} from 'lucide-react';

// ============================================================
// DATA TYPES
// ============================================================

interface LaundryItem {
    name: string;
    includedQty: number;
    extraRate: number;
}

interface MinibarItem {
    name: string;
    category: 'Beverage' | 'Snack' | 'Spirit' | 'Non-Alcoholic';
    qty: number;
    unitPrice: number;
}

interface RecreationActivity {
    name: string;
    includedSessions: number;
    adultRate: number;
    childRate: number;
    minAge?: number;
}

interface OutletCredit {
    outletName: string;
    creditType: 'Per Stay' | 'Per Day';
    creditAmount: number;
    revenueCode: string;
}

interface HotelPackage {
    id: number;
    name: string;
    shortCode: string;
    packageType: 'Standard' | 'Honeymoon' | 'Family' | 'Corporate' | 'Seasonal' | 'Group';
    status: 'Active' | 'Inactive' | 'Draft';
    description: string;
    color: string;

    roomConfig: {
        applicableRoomTypes: string[];
        extraBedAllowed: boolean;
        extraBedRate: number;
        extraAdultRate: number;
        extraChildRate: number;
        childAgeFrom: number;
        childAgeTo: number;
        infantFree: boolean;
        infantMaxAge: number;
        maxExtraBeds: number;
        extraBedMealIncluded: boolean;
        welcomeAmenity: string;
        lateCheckoutAllowed: boolean;
        lateCheckoutTime: string;
        wifiIncluded: boolean;
        priorityCheckin: boolean;
    };

    mealInclusions: {
        hasBreakfast: boolean; breakfastVenue: string; breakfastStyle: string; breakfastMenu: string; breakfastCuisine: string;
        breakfastAdultRate: number; breakfastChildRate: number; breakfastInfantFree: boolean;
        
        hasLunch: boolean; lunchVenue: string; lunchStyle: string; lunchAdultRate: number; lunchChildRate: number; lunchMenu: string; lunchCuisine: string;
        
        hasDinner: boolean; dinnerVenue: string; dinnerStyle: string; dinnerMenu: string; dinnerCuisine: string;
        dinnerCredit: number; dinnerAdultRate: number; dinnerChildRate: number;
        
        hasBrunch: boolean; brunchVenue: string; brunchStyle: string; brunchAdultRate: number; brunchMenu: string; brunchCuisine: string;
        
        hasCupole: boolean; cupoleVenue: string; cupoleStyle: string; cupoleCredit: number; cupoleMenu: string; cupoleCuisine: string;
    };

    poolConfig: {
        included: boolean;
        complimentaryAdults: number;
        complimentaryChildren: number;
        extraAdultRate: number;
        extraChildRate: number;
    };

    transportConfig: {
        type: 'None' | 'Pickup' | 'Drop' | 'Both';
        vehicleType: string;
        pickupRate: number;
        dropRate: number;
    };

    laundryConfig: {
        included: boolean;
        allowanceType: 'Per Stay' | 'Per Day' | 'Every 3 Days';
        itemsAllowance: number;
        extraItemRate: number;
        items: LaundryItem[];
    };

    minibarConfig: {
        included: boolean;
        dailyCredit: number;
        replenishment: 'Daily' | 'Every 2 Days' | 'On Request';
        items: MinibarItem[];
    };

    recreationConfig: {
        included: boolean;
        activities: RecreationActivity[];
    };

    outletCredits: OutletCredit[];

    validity: {
        startDate: string;
        endDate: string;
        minNights: number;
        maxNights: number;
        blackoutDates: string;
    };

    finance: {
        baseSurcharge: number;
        dateBasedSurcharges: {
            dateRange: string;
            surchargeAmount: number;
            reason: string;
        }[];
        autoPost: boolean;
        revenueAllocations: {
            department: string;
            amount: number;
            type: 'Fixed' | 'Percentage';
        }[];
    };
}

// ============================================================
// SAMPLE DATA
// ============================================================

const ROOM_TYPES = ['Deluxe Room', 'Deluxe King', 'Premium Suite', 'Junior Suite', 'Presidential Suite', 'Garden View', 'Sea View'];

const defaultPackage = (): Omit<HotelPackage, 'id'> => ({
    name: '',
    shortCode: '',
    packageType: 'Standard',
    status: 'Draft',
    description: '',
    color: '#3B82F6',
    roomConfig: {
        applicableRoomTypes: [],
        extraBedAllowed: true,
        extraBedRate: 2500,
        extraAdultRate: 2000,
        extraChildRate: 1000,
        childAgeFrom: 5,
        childAgeTo: 12,
        infantFree: true,
        infantMaxAge: 4,
        maxExtraBeds: 1,
        extraBedMealIncluded: false,
        welcomeAmenity: '',
        lateCheckoutAllowed: false,
        lateCheckoutTime: '12:00',
        wifiIncluded: true,
        priorityCheckin: false
    },
    mealInclusions: {
        hasBreakfast: false, breakfastVenue: '', breakfastStyle: 'Buffet', breakfastMenu: '', breakfastCuisine: '',
        breakfastAdultRate: 0, breakfastChildRate: 0, breakfastInfantFree: true,
        hasLunch: false, lunchVenue: '', lunchStyle: 'Buffet', lunchAdultRate: 0, lunchChildRate: 0, lunchMenu: '', lunchCuisine: '',
        hasDinner: false, dinnerVenue: '', dinnerStyle: 'Buffet', dinnerMenu: '', dinnerCuisine: '',
        dinnerCredit: 0, dinnerAdultRate: 0, dinnerChildRate: 0,
        hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
        hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
    },
    poolConfig: { included: false, complimentaryAdults: 2, complimentaryChildren: 1, extraAdultRate: 500, extraChildRate: 300 },
    transportConfig: { type: 'None', vehicleType: 'Sedan', pickupRate: 1500, dropRate: 1500 },
    laundryConfig: {
        included: false,
        allowanceType: 'Per Stay',
        itemsAllowance: 10,
        extraItemRate: 150,
        items: [
            { name: 'Shirt', includedQty: 3, extraRate: 120 },
            { name: 'Trouser', includedQty: 2, extraRate: 150 },
            { name: 'Dress', includedQty: 2, extraRate: 200 },
            { name: 'Underwear', includedQty: 3, extraRate: 80 },
        ]
    },
    minibarConfig: {
        included: false,
        dailyCredit: 500,
        replenishment: 'Daily',
        items: [
            { name: 'Water 500ml', category: 'Beverage', qty: 4, unitPrice: 80 },
            { name: 'Soft Drink', category: 'Beverage', qty: 2, unitPrice: 120 },
            { name: 'Juice', category: 'Beverage', qty: 2, unitPrice: 150 },
            { name: 'Nuts', category: 'Snack', qty: 2, unitPrice: 200 },
            { name: 'Chocolate', category: 'Snack', qty: 2, unitPrice: 180 },
        ]
    },
    recreationConfig: {
        included: false,
        activities: [
            { name: 'Horse Riding', includedSessions: 1, adultRate: 1200, childRate: 800, minAge: 8 },
            { name: 'Rock Climbing', includedSessions: 1, adultRate: 900, childRate: 600, minAge: 12 },
            { name: 'Cycling', includedSessions: 2, adultRate: 400, childRate: 300, minAge: 6 },
        ]
    },
    outletCredits: [],
    validity: { startDate: '', endDate: '', minNights: 1, maxNights: 30, blackoutDates: '' },
    finance: { baseSurcharge: 0, dateBasedSurcharges: [], autoPost: true, revenueAllocations: [] }
});

const SAMPLE_PACKAGES: HotelPackage[] = [
    {
        id: 1, name: 'Honeymoon Delight', shortCode: 'HONEY', packageType: 'Honeymoon',
        status: 'Active', color: '#EC4899',
        description: 'Complete romantic package with breakfast, candlelight dinner, pool access, airport transfer and spa credit.',
        roomConfig: {
            applicableRoomTypes: ['Premium Suite', 'Deluxe King'],
            extraBedAllowed: false, extraBedRate: 0, extraAdultRate: 2000,
            extraChildRate: 1000, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 0, extraBedMealIncluded: true,
            welcomeAmenity: 'Fruit Basket & Signature Juice',
            lateCheckoutAllowed: true,
            lateCheckoutTime: '14:00',
            wifiIncluded: true,
            priorityCheckin: true,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Sky Cafe', breakfastStyle: 'Buffet', breakfastMenu: 'Signature International', breakfastCuisine: 'Continental',
            breakfastAdultRate: 1500, breakfastChildRate: 750, breakfastInfantFree: true,
            hasLunch: false, lunchVenue: '', lunchStyle: 'Buffet', lunchAdultRate: 0, lunchChildRate: 0, lunchMenu: '', lunchCuisine: '',
            hasDinner: true, dinnerVenue: 'Garden Grill', dinnerStyle: 'Set Menu', dinnerMenu: 'Traditional Bengali Thali', dinnerCuisine: 'Local',
            dinnerCredit: 0, dinnerAdultRate: 2500, dinnerChildRate: 1250,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: true, cupoleVenue: 'Cupole Rooftop', cupoleStyle: 'Set Menu', cupoleCredit: 3500, cupoleMenu: 'Sky Dinner', cupoleCuisine: 'Mediterranean',
        },
        poolConfig: { included: true, complimentaryAdults: 2, complimentaryChildren: 0, extraAdultRate: 500, extraChildRate: 300 },
        transportConfig: { type: 'Both', vehicleType: 'Luxury Sedan', pickupRate: 1800, dropRate: 1800 },
        laundryConfig: {
            included: true, allowanceType: 'Per Stay', itemsAllowance: 12, extraItemRate: 150,
            items: [
                { name: 'Shirt/Blouse', includedQty: 4, extraRate: 120 },
                { name: 'Trouser/Skirt', includedQty: 4, extraRate: 150 },
                { name: 'Evening Dress', includedQty: 2, extraRate: 300 },
            ]
        },
        minibarConfig: {
            included: true, dailyCredit: 1000, replenishment: 'Daily',
            items: [
                { name: 'Sparkling Juice', category: 'Beverage', qty: 1, unitPrice: 850 },
                { name: 'Premium Water', category: 'Beverage', qty: 2, unitPrice: 150 },
                { name: 'Gourmet Chocolates', category: 'Snack', qty: 1, unitPrice: 450 },
            ]
        },
        recreationConfig: { 
            included: true, 
            activities: [
                { name: 'Couple Massage', includedSessions: 1, adultRate: 4500, childRate: 0, minAge: 18 },
            ] 
        },
        outletCredits: [
            { outletName: 'Sky Spa', creditType: 'Per Stay', creditAmount: 5000, revenueCode: 'REV-SPA-TREAT' },
            { outletName: 'Pool Bar', creditType: 'Per Day', creditAmount: 1000, revenueCode: 'REV-FB-BAR' }
        ],
        validity: { startDate: '2025-01-01', endDate: '2025-12-31', minNights: 2, maxNights: 30, blackoutDates: '2025-12-24, 2025-12-25, 2025-12-31' },
        finance: {
            baseSurcharge: 4500,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 70, type: 'Percentage' }, { department: 'F&B', amount: 30, type: 'Percentage' }]
        }
    },
    {
        id: 2, name: 'Family Adventure', shortCode: 'FAMADV', packageType: 'Family',
        status: 'Active', color: '#10B981',
        description: 'Fun-filled family package with all meals, pool, recreation and airport transfer.',
        roomConfig: {
            applicableRoomTypes: ['Deluxe Room', 'Junior Suite', 'Garden View'],
            extraBedAllowed: true, extraBedRate: 2500, extraAdultRate: 1800,
            extraChildRate: 1000, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 2, extraBedMealIncluded: true,
            welcomeAmenity: 'Kids Activity Pack',
            lateCheckoutAllowed: false,
            lateCheckoutTime: '12:00',
            wifiIncluded: true,
            priorityCheckin: false,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Garden Terrace', breakfastStyle: 'Buffet', breakfastMenu: 'Family Buffet', breakfastCuisine: 'Multi-cuisine',
            breakfastAdultRate: 750, breakfastChildRate: 400, breakfastInfantFree: true,
            hasLunch: true, lunchVenue: 'Waves Poolside', lunchStyle: 'A La Carte', lunchAdultRate: 900, lunchChildRate: 500, lunchMenu: 'Aqua Lunch', lunchCuisine: 'Seafood',
            hasDinner: true, dinnerVenue: 'Garden Terrace', dinnerStyle: 'Buffet', dinnerMenu: 'Grand Buffet', dinnerCuisine: 'Global',
            dinnerCredit: 0, dinnerAdultRate: 1200, dinnerChildRate: 600,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 2, complimentaryChildren: 3, extraAdultRate: 500, extraChildRate: 0 },
        transportConfig: { type: 'Both', vehicleType: 'Executive Van', pickupRate: 2500, dropRate: 2500 },
        laundryConfig: {
            included: true, allowanceType: 'Every 3 Days', itemsAllowance: 20, extraItemRate: 100,
            items: [
                { name: 'Kids Wear', includedQty: 10, extraRate: 80 },
                { name: 'Adult Casual', includedQty: 10, extraRate: 120 },
            ]
        },
        minibarConfig: {
            included: true, dailyCredit: 500, replenishment: 'Daily',
            items: [
                { name: 'Mixed Fruit Juice', category: 'Non-Alcoholic', qty: 4, unitPrice: 120 },
                { name: 'Potato Chips', category: 'Snack', qty: 2, unitPrice: 90 },
                { name: 'Milk Carton', category: 'Beverage', qty: 2, unitPrice: 80 },
            ]
        },
        recreationConfig: {
            included: true, activities: [
                { name: 'Kids Adventure Club', includedSessions: 10, adultRate: 0, childRate: 1500, minAge: 3 },
                { name: 'Family Cycling', includedSessions: 2, adultRate: 500, childRate: 250, minAge: 6 },
                { name: 'Movie Night', includedSessions: 1, adultRate: 200, childRate: 100, minAge: 0 },
            ]
        },
        outletCredits: [
            { outletName: 'Game Zone', creditType: 'Per Stay', creditAmount: 2000, revenueCode: 'REV-REC-GAME' }
        ],
        validity: { startDate: '2025-01-01', endDate: '2025-12-31', minNights: 3, maxNights: 14, blackoutDates: '' },
        finance: {
            baseSurcharge: 6500,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 50, type: 'Percentage' }, { department: 'F&B', amount: 50, type: 'Percentage' }]
        }
    },
    {
        id: 3, name: 'Corporate Executive', shortCode: 'BIZEXEC', packageType: 'Standard',
        status: 'Active', color: '#3B82F6',
        description: 'Designed for the modern professional. Includes airport transfers, express laundry and business breakfast.',
        roomConfig: {
            applicableRoomTypes: ['Deluxe King', 'Junior Suite'],
            extraBedAllowed: false, extraBedRate: 0, extraAdultRate: 2500,
            extraChildRate: 1200, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 0, extraBedMealIncluded: false,
            welcomeAmenity: 'Business Kit',
            lateCheckoutAllowed: true,
            lateCheckoutTime: '16:00',
            wifiIncluded: true,
            priorityCheckin: true,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Executive Lounge', breakfastStyle: 'A La Carte', breakfastMenu: 'Business Breakfast', breakfastCuisine: 'Continental',
            breakfastAdultRate: 1200, breakfastChildRate: 0, breakfastInfantFree: true,
            hasLunch: false, lunchVenue: '', lunchStyle: 'Set Menu', lunchAdultRate: 0, lunchChildRate: 0, lunchMenu: '', lunchCuisine: '',
            hasDinner: false, dinnerVenue: '', dinnerStyle: 'Buffet', dinnerMenu: '', dinnerCuisine: '',
            dinnerCredit: 0, dinnerAdultRate: 0, dinnerChildRate: 0,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 1, complimentaryChildren: 0, extraAdultRate: 500, extraChildRate: 500 },
        transportConfig: { type: 'Both', vehicleType: 'Tesla Model 3', pickupRate: 2000, dropRate: 2000 },
        laundryConfig: {
            included: true, allowanceType: 'Per Day', itemsAllowance: 3, extraItemRate: 200,
            items: [
                { name: 'Business Shirt', includedQty: 2, extraRate: 150 },
                { name: 'Suit Trouser', includedQty: 1, extraRate: 250 },
            ]
        },
        minibarConfig: {
            included: true, dailyCredit: 800, replenishment: 'Daily',
            items: [
                { name: 'Espresso Pods', category: 'Beverage', qty: 4, unitPrice: 100 },
                { name: 'Energy Drink', category: 'Beverage', qty: 2, unitPrice: 250 },
            ]
        },
        recreationConfig: {
            included: true, activities: [
                { name: 'Gym Personal Trainer', includedSessions: 1, adultRate: 2000, childRate: 0, minAge: 18 },
            ]
        },
        outletCredits: [
            { outletName: 'Business Center', creditType: 'Per Stay', creditAmount: 1000, revenueCode: 'REV-GEN-BIZ' }
        ],
        validity: { startDate: '2025-01-01', endDate: '2025-12-31', minNights: 1, maxNights: 7, blackoutDates: '' },
        finance: {
            baseSurcharge: 4500,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 80, type: 'Percentage' }, { department: 'F&B', amount: 20, type: 'Percentage' }]
        }
    },
    {
        id: 4, name: 'Standard Bed & Breakfast', shortCode: 'STDBB', packageType: 'Standard',
        status: 'Active', color: '#6366F1',
        description: 'Simple and comfortable. Includes daily buffet breakfast for two.',
        roomConfig: {
            applicableRoomTypes: ['Family Suite', 'Interconnecting'],
            extraBedAllowed: true, extraBedRate: 2500, extraAdultRate: 2000,
            extraChildRate: 1000, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 2, extraBedMealIncluded: true,
            welcomeAmenity: '',
            lateCheckoutAllowed: false,
            lateCheckoutTime: '12:00',
            wifiIncluded: true,
            priorityCheckin: false,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Main Restaurant', breakfastStyle: 'Buffet', breakfastMenu: 'Standard Buffet', breakfastCuisine: 'Continental',
            breakfastAdultRate: 850, breakfastChildRate: 450, breakfastInfantFree: true,
            hasLunch: true, lunchVenue: 'Waves Poolside', lunchStyle: 'Buffet', lunchAdultRate: 1500, lunchChildRate: 800, lunchMenu: 'Aqua Menu', lunchCuisine: 'Multi-cuisine',
            hasDinner: true, dinnerVenue: 'Main Restaurant', dinnerStyle: 'Buffet', dinnerMenu: 'Global Feast', dinnerCuisine: 'Continental',
            dinnerCredit: 0, dinnerAdultRate: 2200, dinnerChildRate: 1100,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 2, complimentaryChildren: 2, extraAdultRate: 800, extraChildRate: 400 },
        transportConfig: { type: 'None', vehicleType: 'SUV', pickupRate: 0, dropRate: 0 },
        laundryConfig: { included: false, allowanceType: 'Per Day', itemsAllowance: 0, extraItemRate: 0, items: [] },
        minibarConfig: { included: false, dailyCredit: 0, replenishment: 'On Request', items: [] },
        recreationConfig: { included: true, activities: [{ name: 'Trampoline Park', includedSessions: 2, adultRate: 1200, childRate: 1200, minAge: 5 }] },
        outletCredits: [{ outletName: 'Arcade Zone', creditType: 'Per Day', creditAmount: 1000, revenueCode: 'REV-RECR-GAME' }],
        validity: { startDate: '2024-01-01', endDate: '2025-12-31', minNights: 1, maxNights: 14, blackoutDates: '' },
        finance: {
            baseSurcharge: 2500,
            dateBasedSurcharges: [
                { dateRange: '2024-12-24 to 2024-12-26', surchargeAmount: 5000, reason: 'Christmas Peak' }
            ],
            autoPost: true,
            revenueAllocations: [
                { department: 'Rooms', amount: 60, type: 'Percentage' },
                { department: 'F&B', amount: 30, type: 'Percentage' },
                { department: 'Others', amount: 10, type: 'Percentage' }
            ]
        }
    },
    {
        id: 5, name: 'Wellness & Spa Retreat', shortCode: 'SPA-REL', packageType: 'Standard',
        status: 'Active', color: '#8B5CF6',
        description: 'Focus on health and tranquility. Detox and rejuvenate.',
        roomConfig: {
            applicableRoomTypes: ['Garden Villa', 'Zen Suite'],
            extraBedAllowed: false, extraBedRate: 0, extraAdultRate: 0,
            extraChildRate: 0, childAgeFrom: 0, childAgeTo: 0,
            infantFree: false, infantMaxAge: 0, maxExtraBeds: 0, extraBedMealIncluded: false,
            welcomeAmenity: 'Herbal Tea Set',
            lateCheckoutAllowed: true,
            lateCheckoutTime: '15:00',
            wifiIncluded: true,
            priorityCheckin: true,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Organic Garden', breakfastStyle: 'A La Carte', breakfastMenu: 'Detox Morning', breakfastCuisine: 'Healthy/Organic',
            breakfastAdultRate: 1500, breakfastChildRate: 0, breakfastInfantFree: false,
            hasLunch: true, lunchVenue: 'Zen Terrace', lunchStyle: 'A La Carte', lunchAdultRate: 2500, lunchChildRate: 0, lunchMenu: 'Light & Green', lunchCuisine: 'Healthy/Organic',
            hasDinner: true, dinnerVenue: 'Zen Terrace', dinnerStyle: 'Set Menu', dinnerMenu: 'Evening Rejuvenation', dinnerCuisine: 'Healthy/Organic',
            dinnerCredit: 0, dinnerAdultRate: 3500, dinnerChildRate: 0,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 1, complimentaryChildren: 0, extraAdultRate: 500, extraChildRate: 0 },
        transportConfig: { type: 'Pickup', vehicleType: 'Tesla Model S', pickupRate: 3500, dropRate: 0 },
        laundryConfig: { included: true, allowanceType: 'Per Stay', itemsAllowance: 2, extraItemRate: 100, items: [] },
        minibarConfig: { included: true, dailyCredit: 0, replenishment: 'Daily', items: [{ name: 'Cold Press Juice', category: 'Non-Alcoholic', qty: 2, unitPrice: 850 }] },
        recreationConfig: {
            included: true, activities: [
                { name: 'Yoga Session', includedSessions: 2, adultRate: 1500, childRate: 0, minAge: 12 },
                { name: 'Full Body Massage', includedSessions: 1, adultRate: 6500, childRate: 0, minAge: 18 }
            ]
        },
        outletCredits: [],
        validity: { startDate: '2024-01-01', endDate: '2025-12-31', minNights: 2, maxNights: 10, blackoutDates: '' },
        finance: {
            baseSurcharge: 18000,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Spa', amount: 100, type: 'Percentage' }]
        }
    },
    {
        id: 6, name: 'Business Executive Bundle', shortCode: 'BIZ-EXE', packageType: 'Corporate',
        status: 'Active', color: '#1F2937',
        description: 'Optimized for business travelers. High-speed WiFi and airport transfers.',
        roomConfig: {
            applicableRoomTypes: ['Executive Room', 'Business Suite'],
            extraBedAllowed: false, extraBedRate: 0, extraAdultRate: 0,
            extraChildRate: 0, childAgeFrom: 0, childAgeTo: 0,
            infantFree: false, infantMaxAge: 0, maxExtraBeds: 0, extraBedMealIncluded: false,
            welcomeAmenity: 'Welcome Drink',
            lateCheckoutAllowed: true,
            lateCheckoutTime: '16:00',
            wifiIncluded: true,
            priorityCheckin: true,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Executive Lounge', breakfastStyle: 'Buffet', breakfastMenu: 'Express Business', breakfastCuisine: 'Continental',
            breakfastAdultRate: 950, breakfastChildRate: 0, breakfastInfantFree: false,
            hasLunch: true, lunchVenue: 'Atrium Cafe', lunchStyle: 'Set Menu', lunchAdultRate: 1800, lunchChildRate: 0, lunchMenu: '3-Course Power Lunch', lunchCuisine: 'Multi-cuisine',
            hasDinner: false, dinnerVenue: '', dinnerStyle: 'Buffet', dinnerMenu: '', dinnerCuisine: '',
            dinnerCredit: 5000, dinnerAdultRate: 0, dinnerChildRate: 0,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 1, complimentaryChildren: 0, extraAdultRate: 600, extraChildRate: 0 },
        transportConfig: { type: 'Both', vehicleType: 'Luxury Sedan', pickupRate: 2000, dropRate: 2000 },
        laundryConfig: { included: true, allowanceType: 'Per Day', itemsAllowance: 2, extraItemRate: 250, items: [] },
        minibarConfig: { included: false, dailyCredit: 0, replenishment: 'Daily', items: [] },
        recreationConfig: { included: false, activities: [] },
        outletCredits: [
            { outletName: 'Business Center', creditType: 'Per Stay', creditAmount: 5000, revenueCode: 'REV-MISC-BIZ' }
        ],
        validity: { startDate: '2025-01-01', endDate: '2025-12-31', minNights: 3, maxNights: 10, blackoutDates: '' },
        finance: {
            baseSurcharge: 12000,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 70, type: 'Percentage' }, { department: 'Transport', amount: 30, type: 'Percentage' }]
        }
    },
    {
        id: 7, name: 'Standard Bed & Breakfast', shortCode: 'STDBB', packageType: 'Standard',
        status: 'Active', color: '#6366F1',
        description: 'Simple and comfortable. Includes daily buffet breakfast for two.',
        roomConfig: {
            applicableRoomTypes: ['Deluxe Room', 'Deluxe King', 'Garden View'],
            extraBedAllowed: true, extraBedRate: 2000, extraAdultRate: 1500,
            extraChildRate: 800, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 1, extraBedMealIncluded: true,
            welcomeAmenity: '',
            lateCheckoutAllowed: false,
            lateCheckoutTime: '12:00',
            wifiIncluded: true,
            priorityCheckin: false,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Main Restaurant', breakfastStyle: 'Buffet', breakfastMenu: 'Standard Buffet', breakfastCuisine: 'Continental',
            breakfastAdultRate: 850, breakfastChildRate: 450, breakfastInfantFree: true,
            hasLunch: false, lunchVenue: '', lunchStyle: 'Buffet', lunchAdultRate: 0, lunchChildRate: 0, lunchMenu: '', lunchCuisine: '',
            hasDinner: false, dinnerVenue: '', dinnerStyle: 'Buffet', dinnerMenu: '', dinnerCuisine: '',
            dinnerCredit: 0, dinnerAdultRate: 0, dinnerChildRate: 0,
            hasBrunch: false, brunchVenue: '', brunchStyle: 'Buffet', brunchAdultRate: 0, brunchMenu: '', brunchCuisine: '',
            hasCupole: false, cupoleVenue: '', cupoleStyle: 'Set Menu', cupoleCredit: 0, cupoleMenu: '', cupoleCuisine: '',
        },
        poolConfig: { included: true, complimentaryAdults: 2, complimentaryChildren: 1, extraAdultRate: 500, extraChildRate: 300 },
        transportConfig: { type: 'None', vehicleType: 'Sedan', pickupRate: 0, dropRate: 0 },
        laundryConfig: { included: false, allowanceType: 'Per Stay', itemsAllowance: 0, extraItemRate: 0, items: [] },
        minibarConfig: { included: false, dailyCredit: 0, replenishment: 'Daily', items: [] },
        recreationConfig: { included: false, activities: [] },
        outletCredits: [],
        validity: { startDate: '2024-01-01', endDate: '2025-12-31', minNights: 1, maxNights: 30, blackoutDates: '' },
        finance: {
            baseSurcharge: 1000,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 100, type: 'Percentage' }]
        }
    },
    {
        id: 8, name: 'Royal Full Board Experience', shortCode: 'ROYALAP', packageType: 'Seasonal',
        status: 'Active', color: '#F59E0B',
        description: 'The ultimate stay. Includes Breakfast, Lunch, and Dinner with premium amenities.',
        roomConfig: {
            applicableRoomTypes: ['Presidential Suite', 'Premium Suite'],
            extraBedAllowed: true, extraBedRate: 5000, extraAdultRate: 4000,
            extraChildRate: 2500, childAgeFrom: 5, childAgeTo: 12,
            infantFree: true, infantMaxAge: 4, maxExtraBeds: 2, extraBedMealIncluded: true,
            welcomeAmenity: 'Champagne & Chocolates',
            lateCheckoutAllowed: true,
            lateCheckoutTime: '18:00',
            wifiIncluded: true,
            priorityCheckin: true,
        },
        mealInclusions: {
            hasBreakfast: true, breakfastVenue: 'Executive Lounge', breakfastStyle: 'A La Carte', breakfastMenu: 'Royal Feast A', breakfastCuisine: 'Continental',
            breakfastAdultRate: 1500, breakfastChildRate: 800, breakfastInfantFree: true,
            hasLunch: true, lunchVenue: 'Waves Poolside', lunchStyle: 'Buffet', lunchAdultRate: 2000, lunchChildRate: 1200, lunchMenu: 'Aqua Gourmet', lunchCuisine: 'Pan-Asian',
            hasDinner: true, dinnerVenue: 'Main Restaurant', dinnerStyle: 'Gourmet Buffet', dinnerMenu: 'Global Gala Night', dinnerCuisine: 'Multi-cuisine',
            dinnerCredit: 0, dinnerAdultRate: 3500, dinnerChildRate: 1800,
            hasBrunch: true, brunchVenue: 'Garden Terrace', brunchStyle: 'Buffet', brunchAdultRate: 2500, brunchMenu: 'Morning Bliss', brunchCuisine: 'Continental',
            hasCupole: true, cupoleVenue: 'Private Beach', cupoleStyle: 'Set Menu', cupoleCredit: 8000, cupoleMenu: 'Starlight Dinner', cupoleCuisine: 'Italian',
        },
        poolConfig: { included: true, complimentaryAdults: 4, complimentaryChildren: 2, extraAdultRate: 0, extraChildRate: 0 },
        transportConfig: { type: 'Both', vehicleType: 'Limousine', pickupRate: 5000, dropRate: 5000 },
        laundryConfig: {
            included: true, allowanceType: 'Per Day', itemsAllowance: 5, extraItemRate: 250,
            items: [
                { name: 'Suit', includedQty: 2, extraRate: 500 },
                { name: 'Evening Gown', includedQty: 1, extraRate: 800 },
            ]
        },
        minibarConfig: {
            included: true, dailyCredit: 2500, replenishment: 'Daily',
            items: [
                { name: 'Champagne Mini', category: 'Spirit', qty: 1, unitPrice: 4500 },
                { name: 'Imported Snacks', category: 'Snack', qty: 4, unitPrice: 350 },
            ]
        },
        recreationConfig: {
            included: true, activities: [
                { name: 'Private Yacht Cruise', includedSessions: 1, adultRate: 15000, childRate: 5000, minAge: 0 },
                { name: 'Spa Day Pass', includedSessions: 1, adultRate: 8000, childRate: 0, minAge: 16 },
            ]
        },
        outletCredits: [
            { outletName: 'Jewel Bar', creditType: 'Per Stay', creditAmount: 10000, revenueCode: 'REV-FB-BAR' }
        ],
        validity: { startDate: '2024-01-01', endDate: '2025-12-31', minNights: 2, maxNights: 7, blackoutDates: '' },
        finance: {
            baseSurcharge: 25000,
            dateBasedSurcharges: [],
            autoPost: true,
            revenueAllocations: [{ department: 'Rooms', amount: 40, type: 'Percentage' }, { department: 'F&B', amount: 60, type: 'Percentage' }]
        }
    }
];
// ============================================================
// ALLOWANCE ENGINE PREVIEW
// ============================================================

const AllowanceEngineViewer = ({ pkg }: { pkg: HotelPackage }) => {
    const rules: { icon: React.ReactNode; label: string; detail: string; code: string; dept: string }[] = [];

    if (pkg.mealInclusions.hasBreakfast) rules.push({
        icon: <Utensils size={14} />,
        label: `Breakfast (${pkg.mealInclusions.breakfastStyle})`,
        detail: `${pkg.mealInclusions.breakfastMenu} · ${pkg.mealInclusions.breakfastCuisine} · ${pkg.mealInclusions.breakfastVenue}`,
        code: 'REV-FB-BRKFST', dept: 'DEPT-02 F&B'
    });
    if (pkg.mealInclusions.hasLunch) rules.push({
        icon: <Utensils size={14} />,
        label: `Lunch (${pkg.mealInclusions.lunchStyle})`,
        detail: `${pkg.mealInclusions.lunchMenu} · ${pkg.mealInclusions.lunchCuisine} · ${pkg.mealInclusions.lunchVenue}`,
        code: 'REV-FB-LUNCH', dept: 'DEPT-02 F&B'
    });
    if (pkg.mealInclusions.hasDinner) rules.push({
        icon: <Utensils size={14} />,
        label: `Dinner (${pkg.mealInclusions.dinnerStyle})`,
        detail: pkg.mealInclusions.dinnerStyle === 'Credit' ? `৳${pkg.mealInclusions.dinnerCredit} limit · ${pkg.mealInclusions.dinnerMenu} · ${pkg.mealInclusions.dinnerVenue}` : `${pkg.mealInclusions.dinnerMenu} · ${pkg.mealInclusions.dinnerCuisine} · ${pkg.mealInclusions.dinnerVenue}`,
        code: 'REV-FB-DINNER', dept: 'DEPT-02 F&B'
    });
    if (pkg.mealInclusions.hasCupole) rules.push({
        icon: <Star size={14} />,
        label: 'Cupole Rooftop Dinner',
        detail: `৳${pkg.mealInclusions.cupoleCredit} limit · ${pkg.mealInclusions.cupoleMenu} · ${pkg.mealInclusions.cupoleVenue}`,
        code: 'REV-FB-CUPOLE', dept: 'DEPT-02 F&B'
    });
    if (pkg.roomConfig.welcomeAmenity) rules.push({
        icon: <Gift size={14} />,
        label: 'Welcome Experience',
        detail: `${pkg.roomConfig.welcomeAmenity}${pkg.roomConfig.priorityCheckin ? ' · Priority Check-in' : ''}${pkg.roomConfig.lateCheckoutAllowed ? ' · Late Checkout (2PM)' : ''}`,
        code: 'REV-RM-AMENITY', dept: 'DEPT-01 Rooms'
    });
    if (pkg.roomConfig.wifiIncluded) rules.push({
        icon: <Zap size={14} />,
        label: 'Connectivity',
        detail: 'High-speed Fiber WiFi included for all devices',
        code: 'REV-RM-WIFI', dept: 'DEPT-01 Rooms'
    });
    if (pkg.poolConfig.included) rules.push({
        icon: <Waves size={14} />,
        label: 'Swimming Pool',
        detail: `${pkg.poolConfig.complimentaryAdults} Adults + ${pkg.poolConfig.complimentaryChildren} Children complimentary · Extra Adult ৳${pkg.poolConfig.extraAdultRate}`,
        code: 'REV-REC-POOL', dept: 'DEPT-04 Recreation'
    });
    if (pkg.transportConfig.type !== 'None') rules.push({
        icon: <Car size={14} />,
        label: `Airport Transfer (${pkg.transportConfig.type})`,
        detail: `${pkg.transportConfig.vehicleType} · Pickup ৳${pkg.transportConfig.pickupRate} · Drop ৳${pkg.transportConfig.dropRate}`,
        code: 'REV-TRN-PCKU', dept: 'DEPT-05 Transport'
    });
    if (pkg.laundryConfig.included) rules.push({
        icon: <Shirt size={14} />,
        label: 'Laundry Allowance',
        detail: `${pkg.laundryConfig.itemsAllowance} items ${pkg.laundryConfig.allowanceType} · Extra ৳${pkg.laundryConfig.extraItemRate}/item`,
        code: 'REV-LAUN-STD', dept: 'DEPT-06 Minor'
    });
    if (pkg.minibarConfig.included) rules.push({
        icon: <Wine size={14} />,
        label: 'Minibar Credit',
        detail: `৳${pkg.minibarConfig.dailyCredit}/day credit · ${pkg.minibarConfig.replenishment} replenishment · Extra charged to folio`,
        code: 'REV-MINI-BAR', dept: 'DEPT-02 Minibar'
    });
    if (pkg.recreationConfig.included) pkg.recreationConfig.activities.forEach((act: RecreationActivity) => rules.push({
        icon: <Dumbbell size={14} />,
        label: act.name,
        detail: `${act.includedSessions} session(s) included · Extra Adult ৳${act.adultRate} · Child ৳${act.childRate}`,
        code: 'REV-REC-SPORT', dept: 'DEPT-04 Recreation'
    }));
    pkg.outletCredits.forEach((oc: OutletCredit) => rules.push({
        icon: <Gift size={14} />,
        label: `${oc.outletName} Credit`,
        detail: `৳${oc.creditAmount} ${oc.creditType} · Extra usage charged to folio`,
        code: oc.revenueCode, dept: 'DEPT-03 Spa/Other'
    }));

    return (
        <div className="space-y-4">
            <div className="bg-blue-900/40 p-5 rounded-2xl border border-blue-400/30 backdrop-blur-md">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-blue-200 uppercase tracking-widest flex items-center gap-2">
                        <TrendingUp size={16} /> Revenue Allocation Engine
                    </h4>
                    <div className="text-[10px] bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full border border-blue-400/20 font-black">FINANCE V1.2</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {pkg.finance.revenueAllocations.map((alloc, i) => (
                        <div key={i} className="flex flex-col gap-1 p-3 bg-blue-950/30 rounded-xl border border-white/5">
                            <span className="text-[10px] text-blue-400 font-black uppercase tracking-tighter">{alloc.department}</span>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white">
                                    {alloc.type === 'Fixed' ? `৳${alloc.amount.toLocaleString()}` : `${alloc.amount}%`}
                                </span>
                                <div className="h-1 flex-1 bg-white/5 mx-3 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-400 rounded-full" style={{ width: alloc.type === 'Percentage' ? `${alloc.amount}%` : '40%' }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {pkg.finance.dateBasedSurcharges.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                        <div className="text-[10px] text-yellow-400 font-black uppercase tracking-widest text-center">Seasonal Peak Rules Appllied</div>
                        {pkg.finance.dateBasedSurcharges.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-yellow-400/5 p-2 rounded-lg border border-yellow-400/10">
                                <span className="text-xs text-yellow-100/70 font-medium">{s.reason}</span>
                                <span className="text-xs font-black text-yellow-400">+৳{s.surchargeAmount.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div className="bg-gray-900 rounded-xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 mb-3">
                    <Zap size={14} className="text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">Allowance Engine — Auto-Routing Rules</span>
                </div>
                {rules.length === 0 && (
                    <div className="text-gray-500 text-center py-4">No inclusions configured yet</div>
                )}
                {rules.map((r, i) => (
                    <div key={i} className="flex items-start gap-3 bg-gray-800 rounded-lg p-2.5">
                        <div className="text-blue-400 mt-0.5 flex-shrink-0">{r.icon}</div>
                        <div className="flex-1 min-w-0">
                            <div className="text-white font-medium">{r.label}</div>
                            <div className="text-gray-400 truncate">{r.detail}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                            <div className="text-emerald-400 font-mono text-[10px]">{r.code}</div>
                            <div className="text-gray-500 text-[10px]">{r.dept}</div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ============================================================
// PACKAGE FORM TABS
// ============================================================

type FormTab = 'basic' | 'room' | 'meals' | 'recreation' | 'transport' | 'laundry' | 'outlets' | 'validity' | 'finance';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
    <button onClick={() => onChange(!checked)} className="flex-shrink-0">
        {checked
            ? <ToggleRight size={28} className="text-blue-500" />
            : <ToggleLeft size={28} className="text-gray-400" />}
    </button>
);

const FormSection = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <div className="text-blue-600">{icon}</div>
            <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        </div>
        <div className="p-5">{children}</div>
    </div>
);

const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <div className="space-y-1">
        <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
            {label}
            {hint && <span className="text-gray-400 font-normal">({hint})</span>}
        </label>
        {children}
    </div>
);

const inp = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";
const sel = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500";

// ============================================================
// MAIN COMPONENT
// ============================================================

const PackageManagement = () => {
    const [packages, setPackages] = useState<HotelPackage[]>(SAMPLE_PACKAGES);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingPackage, setEditingPackage] = useState<HotelPackage | null>(null);
    const [formData, setFormData] = useState<Omit<HotelPackage, 'id'>>(defaultPackage());
    const [activeTab, setActiveTab] = useState<FormTab>('basic');
    const [searchQuery, setSearchQuery] = useState('');
    const [previewMode, setPreviewMode] = useState(false);

    const filtered = packages.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const openCreate = () => {
        setFormData(defaultPackage());
        setEditingPackage(null);
        setActiveTab('basic');
        setView('form');
    };

    const openEdit = (pkg: HotelPackage) => {
        setFormData({ ...pkg });
        setEditingPackage(pkg);
        setActiveTab('basic');
        setView('form');
    };

    const handleDuplicate = (pkg: HotelPackage) => {
        const newPkg: HotelPackage = { ...pkg, id: Date.now(), name: `${pkg.name} (Copy)`, shortCode: `${pkg.shortCode}2`, status: 'Draft' };
        setPackages([...packages, newPkg]);
    };

    const handleDelete = (id: number) => {
        setPackages(packages.filter(p => p.id !== id));
    };

    const handleSave = () => {
        if (editingPackage) {
            setPackages(packages.map(p => p.id === editingPackage.id ? { ...formData, id: editingPackage.id } : p));
        } else {
            setPackages([...packages, { ...formData, id: Date.now() }]);
        }
        setView('list');
    };

    const upd = (path: string, value: unknown) => {
        setFormData(prev => {
            const keys = path.split('.');
            const copy = { ...prev } as Record<string, unknown>;
            let cur = copy;
            for (let i = 0; i < keys.length - 1; i++) {
                cur[keys[i]] = { ...(cur[keys[i]] as Record<string, unknown>) };
                cur = cur[keys[i]] as Record<string, unknown>;
            }
            cur[keys[keys.length - 1]] = value;
            return copy as Omit<HotelPackage, 'id'>;
        });
    };

    const typeColors: Record<string, string> = {
        Honeymoon: 'bg-pink-100 text-pink-700 border-pink-200',
        Family: 'bg-green-100 text-green-700 border-green-200',
        Corporate: 'bg-blue-100 text-blue-700 border-blue-200',
        Standard: 'bg-gray-100 text-gray-700 border-gray-200',
        Seasonal: 'bg-orange-100 text-orange-700 border-orange-200',
        Group: 'bg-purple-100 text-purple-700 border-purple-200',
    };

    const statusBadge: Record<string, string> = {
        Active: 'bg-emerald-100 text-emerald-700',
        Inactive: 'bg-gray-100 text-gray-600',
        Draft: 'bg-yellow-100 text-yellow-700',
    };

    const tabs: { id: FormTab; label: string; icon: React.ReactNode }[] = [
        { id: 'basic', label: 'Basic Info', icon: <Info size={14} /> },
        { id: 'room', label: 'Room Config', icon: <BedDouble size={14} /> },
        { id: 'meals', label: 'Meal Plans', icon: <Utensils size={14} /> },
        { id: 'recreation', label: 'Pool & Recreation', icon: <Waves size={14} /> },
        { id: 'transport', label: 'Transport', icon: <Car size={14} /> },
        { id: 'laundry', label: 'Laundry & Minibar', icon: <Shirt size={14} /> },
        { id: 'outlets', label: 'Outlets & Spa', icon: <Dumbbell size={14} /> },
        { id: 'validity', label: 'Validity', icon: <Calendar size={14} /> },
        { id: 'finance', label: 'Finance', icon: <DollarSign size={14} /> },
    ];

    // ── LIST VIEW ──
    if (view === 'list') return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package size={24} className="text-blue-600" /> Package Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Build complex packages with Allowance Engine — auto-route inclusions to correct revenue departments</p>
                </div>
                <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm">
                    <Plus size={16} /> Create Package
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Total Packages', value: packages.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Active', value: packages.filter(p => p.status === 'Active').length, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Draft', value: packages.filter(p => p.status === 'Draft').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                    { label: 'Inactive', value: packages.filter(p => p.status === 'Inactive').length, color: 'text-gray-500', bg: 'bg-gray-100' },
                ].map(s => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white`}>
                        <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search packages by name or code..."
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* Package Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {filtered.map(pkg => {
                    const inclusions = [
                        pkg.mealInclusions.hasBreakfast && '🍳 Breakfast',
                        pkg.mealInclusions.hasLunch && '🥗 Lunch',
                        pkg.mealInclusions.hasDinner && '🍽️ Dinner',
                        pkg.mealInclusions.hasCupole && '⭐ Cupole Dinner',
                        pkg.poolConfig.included && '🏊 Pool',
                        pkg.transportConfig.type !== 'None' && `✈️ Transfer (${pkg.transportConfig.type})`,
                        pkg.laundryConfig.included && `👕 Laundry (${pkg.laundryConfig.itemsAllowance} items)`,
                        pkg.minibarConfig.included && `🍾 Minibar (৳${pkg.minibarConfig.dailyCredit}/day)`,
                        pkg.recreationConfig.included && '🎯 Recreation',
                        pkg.outletCredits.length > 0 && `💆 ${pkg.outletCredits.map(o => o.outletName).join(', ')}`,
                    ].filter(Boolean);

                    return (
                        <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all group">
                            {/* Color bar */}
                            <div className="h-1.5" style={{ backgroundColor: pkg.color }} />
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-gray-900 text-base">{pkg.name}</h3>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeColors[pkg.packageType] || typeColors.Standard}`}>
                                                {pkg.packageType}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{pkg.shortCode}</span>
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusBadge[pkg.status]}`}>{pkg.status}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => openEdit(pkg)} className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Edit"><Edit size={14} /></button>
                                        <button onClick={() => handleDuplicate(pkg)} className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Duplicate"><Copy size={14} /></button>
                                        <button onClick={() => handleDelete(pkg.id)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={14} /></button>
                                    </div>
                                </div>

                                <p className="text-xs text-gray-500 mb-3 line-clamp-1">{pkg.description}</p>

                                {/* Inclusions */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                    {inclusions.slice(0, 6).map((inc, i) => (
                                        <span key={i} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{inc as string}</span>
                                    ))}
                                    {inclusions.length > 6 && (
                                        <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">+{inclusions.length - 6} more</span>
                                    )}
                                </div>

                                {/* Footer info */}
                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        <span className="flex items-center gap-1"><BedDouble size={12} />{pkg.roomConfig.applicableRoomTypes.length || 'All'} room types</span>
                                        <span className="flex items-center gap-1"><Calendar size={12} />Min {pkg.validity.minNights} nights</span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-400">Surcharge</div>
                                        <div className="text-sm font-bold text-gray-900">৳{pkg.finance.baseSurcharge.toLocaleString()}<span className="text-xs font-normal text-gray-400">/night</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Create new card */}
                <button onClick={openCreate}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/30 transition-all group">
                    <Plus size={32} className="mb-2" />
                    <span className="text-sm font-medium">Create New Package</span>
                    <span className="text-xs mt-1">Build complex inclusive packages</span>
                </button>
            </div>
        </div>
    );

    // ── FORM VIEW ──
    const fm = formData;

    return (
        <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
            {/* Form Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setView('list')} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all text-gray-500"><ArrowLeft size={18} /></button>
                    <div>
                        <h2 className="font-bold text-gray-900 text-sm">{editingPackage ? `Editing: ${editingPackage.name}` : 'Create New Package'}</h2>
                        <p className="text-xs text-gray-400">Configure inclusions, allowances, and revenue routing</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => setPreviewMode(!previewMode)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${previewMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <Eye size={13} />{previewMode ? 'Hide Engine' : 'Preview Engine'}
                    </button>
                    <select value={fm.status} onChange={e => upd('status', e.target.value)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white">
                        <option value="Draft">Draft</option>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                    <button onClick={handleSave}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all">
                        <Save size={13} /> Save Package
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar Tabs */}
                <div className="w-44 bg-white border-r border-gray-200 py-3 flex-shrink-0 overflow-y-auto">
                    {tabs.map(t => (
                        <button key={t.id} onClick={() => setActiveTab(t.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs font-medium transition-all ${activeTab === t.id ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}>
                            <span className={activeTab === t.id ? 'text-blue-600' : 'text-gray-400'}>{t.icon}</span>
                            {t.label}
                        </button>
                    ))}
                    {/* Allowance Engine status */}
                    <div className="mx-3 mt-4 p-2.5 bg-gray-900 rounded-lg">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Zap size={10} className="text-yellow-400" />
                            <span className="text-[10px] text-yellow-400 font-semibold">Allowance Engine</span>
                        </div>
                        <div className="space-y-1">
                            {fm.mealInclusions.hasBreakfast && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Breakfast routed</div>}
                            {fm.poolConfig.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Pool routed</div>}
                            {fm.laundryConfig.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Laundry limit set</div>}
                            {fm.minibarConfig.included && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Minibar credit set</div>}
                            {fm.transportConfig.type !== 'None' && <div className="text-[9px] text-emerald-400 flex items-center gap-1"><Check size={8} /> Transport routed</div>}
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-5">
                    <div className={`grid gap-5 ${previewMode ? 'grid-cols-2' : 'grid-cols-1 max-w-3xl mx-auto'}`}>
                        <div className="space-y-5">

                            {/* ── TAB: BASIC INFO ── */}
                            {activeTab === 'basic' && (
                                <div className="space-y-5">
                                <FormSection title="Package Identity" icon={<Package size={16} />}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <Field label="Package Name *">
                                                <input className={inp} placeholder="e.g. Ultimate Honeymoon Experience"
                                                    value={fm.name} onChange={e => upd('name', e.target.value)} />
                                            </Field>
                                        </div>
                                        <Field label="Short Code *" hint="max 8 chars">
                                            <input className={inp} placeholder="e.g. HONEY" maxLength={8}
                                                value={fm.shortCode} onChange={e => upd('shortCode', e.target.value.toUpperCase())} />
                                        </Field>
                                        <Field label="Package Type">
                                            <select className={sel} value={fm.packageType} onChange={e => upd('packageType', e.target.value)}>
                                                <option>Standard</option><option>Honeymoon</option><option>Family</option>
                                                <option>Corporate</option><option>Seasonal</option><option>Group</option>
                                            </select>
                                        </Field>
                                        <div className="col-span-2">
                                            <Field label="Description">
                                                <textarea className={inp + ' resize-none'} rows={3} placeholder="Describe what this package includes..."
                                                    value={fm.description} onChange={e => upd('description', e.target.value)} />
                                            </Field>
                                        </div>
                                        <Field label="Package Color">
                                            <div className="flex items-center gap-2">
                                                <input type="color" value={fm.color} onChange={e => upd('color', e.target.value)}
                                                    className="w-10 h-9 rounded-lg border border-gray-300 cursor-pointer p-0.5" />
                                                <span className="text-sm text-gray-600">{fm.color}</span>
                                            </div>
                                        </Field>
                                    </div>
                                </FormSection>
                                </div>
                            )}

                            {/* ── TAB: ROOM CONFIG ── */}
                            {activeTab === 'room' && (
                                <div className="space-y-5">
                                <FormSection title="Applicable Room Types" icon={<BedDouble size={16} />}>
                                    <div className="grid grid-cols-2 gap-2">
                                        {ROOM_TYPES.map(rt => (
                                            <label key={rt} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-sm ${fm.roomConfig.applicableRoomTypes.includes(rt) ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300 text-gray-700'}`}>
                                                <input type="checkbox" className="accent-blue-600"
                                                    checked={fm.roomConfig.applicableRoomTypes.includes(rt)}
                                                    onChange={e => {
                                                        const list = fm.roomConfig.applicableRoomTypes;
                                                        upd('roomConfig.applicableRoomTypes', e.target.checked ? [...list, rt] : list.filter(r => r !== rt));
                                                    }} />
                                                {rt}
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">Leave all unchecked to apply to all room types</p>
                                </FormSection>

                                <FormSection title="Extra Occupancy Rules" icon={<Users size={16} />}>
                                    <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div>
                                            <div className="text-sm font-medium text-gray-800">Extra Bed Allowed</div>
                                            <div className="text-xs text-gray-500">Allow extra bed in room with this package</div>
                                        </div>
                                        <Toggle checked={fm.roomConfig.extraBedAllowed} onChange={v => upd('roomConfig.extraBedAllowed', v)} />
                                    </div>

                                    <div className="grid grid-cols-3 gap-4">
                                        <Field label="Extra Bed Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraBedRate} onChange={e => upd('roomConfig.extraBedRate', +e.target.value)} disabled={!fm.roomConfig.extraBedAllowed} /></div>
                                        </Field>
                                        <Field label="Extra Adult Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraAdultRate} onChange={e => upd('roomConfig.extraAdultRate', +e.target.value)} /></div>
                                        </Field>
                                        <Field label="Extra Child Rate" hint="/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.roomConfig.extraChildRate} onChange={e => upd('roomConfig.extraChildRate', +e.target.value)} /></div>
                                        </Field>
                                        <Field label="Child Age From">
                                            <input type="number" className={inp} value={fm.roomConfig.childAgeFrom} onChange={e => upd('roomConfig.childAgeFrom', +e.target.value)} />
                                        </Field>
                                        <Field label="Child Age To">
                                            <input type="number" className={inp} value={fm.roomConfig.childAgeTo} onChange={e => upd('roomConfig.childAgeTo', +e.target.value)} />
                                        </Field>
                                        <Field label="Max Extra Beds">
                                            <input type="number" className={inp} value={fm.roomConfig.maxExtraBeds} min={0} max={3} onChange={e => upd('roomConfig.maxExtraBeds', +e.target.value)} disabled={!fm.roomConfig.extraBedAllowed} />
                                        </Field>
                                    </div>

                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-blue-800">Infant Free Policy</div>
                                            <div className="text-xs text-blue-600">Children aged 0 to {fm.roomConfig.infantMaxAge} years — complimentary</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <input type="number" className="w-16 px-2 py-1 border border-blue-300 rounded text-sm text-center" value={fm.roomConfig.infantMaxAge} onChange={e => upd('roomConfig.infantMaxAge', +e.target.value)} />
                                            <span className="text-xs text-blue-600">yrs</span>
                                            <Toggle checked={fm.roomConfig.infantFree} onChange={v => upd('roomConfig.infantFree', v)} />
                                        </div>
                                    </div>

                                    <div className="mt-3 p-4 bg-blue-50/50 rounded-xl border border-blue-100 grid grid-cols-2 gap-4">
                                        <div className="col-span-2 text-xs font-bold text-blue-700 uppercase tracking-widest flex items-center gap-2 mb-1">
                                            <Gift size={14} /> Room Experience (ETC Info)
                                        </div>
                                        <Field label="Welcome Amenity">
                                            <input className={inp} value={fm.roomConfig.welcomeAmenity} onChange={e => upd('roomConfig.welcomeAmenity', e.target.value)} placeholder="e.g. Fruit Basket" />
                                        </Field>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Late Checkout (2PM)</span>
                                            <Toggle checked={fm.roomConfig.lateCheckoutAllowed} onChange={v => upd('roomConfig.lateCheckoutAllowed', v)} />
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Priority Check-in</span>
                                            <Toggle checked={fm.roomConfig.priorityCheckin} onChange={v => upd('roomConfig.priorityCheckin', v)} />
                                        </div>
                                        <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-100">
                                            <span className="text-xs font-medium">Complimentary WiFi</span>
                                            <Toggle checked={fm.roomConfig.wifiIncluded} onChange={v => upd('roomConfig.wifiIncluded', v)} />
                                        </div>
                                    </div>
                                </FormSection>
                                </div>
                            )}

                            {/* ── TAB: MEALS ── */}
                            {activeTab === 'meals' && (
                                <div className="space-y-5">
                                {[
                                    { key: 'hasBreakfast', label: 'Breakfast', venueKey: 'breakfastVenue', styleKey: 'breakfastStyle', menuKey: 'breakfastMenu', cuisineKey: 'breakfastCuisine', adultKey: 'breakfastAdultRate', childKey: 'breakfastChildRate', code: 'REV-FB-BRKFST', showCredit: false },
                                    { key: 'hasLunch', label: 'Lunch', venueKey: 'lunchVenue', styleKey: null, menuKey: 'lunchMenu', cuisineKey: 'lunchCuisine', adultKey: 'lunchAdultRate', childKey: 'lunchChildRate', code: 'REV-FB-LUNCH', showCredit: false },
                                    { key: 'hasDinner', label: 'Dinner', venueKey: 'dinnerVenue', styleKey: 'dinnerStyle', menuKey: 'dinnerMenu', cuisineKey: 'dinnerCuisine', adultKey: 'dinnerAdultRate', childKey: 'dinnerChildRate', code: 'REV-FB-DINNER', showCredit: true, creditKey: 'dinnerCredit' },
                                    { key: 'hasCupole', label: 'Cupole Special Dinner', venueKey: 'cupoleVenue', styleKey: null, menuKey: 'cupoleMenu', cuisineKey: 'cupoleCuisine', adultKey: 'cupoleAdultRate', childKey: null, code: 'REV-FB-CUPOLE', showCredit: true, creditKey: 'cupoleCredit' },
                                    { key: 'hasBrunch', label: 'Brunch', venueKey: 'brunchVenue', styleKey: null, menuKey: 'brunchMenu', cuisineKey: 'brunchCuisine', adultKey: 'brunchAdultRate', childKey: null, code: 'REV-FB-BRUNCH', showCredit: false },
                                ].map(meal => (
                                    <FormSection key={meal.key} title={meal.label} icon={<Utensils size={16} />}>
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <span className="text-sm font-medium text-gray-800">Include {meal.label}</span>
                                                <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{meal.code}</span>
                                            </div>
                                            <Toggle
                                                checked={fm.mealInclusions[meal.key as keyof typeof fm.mealInclusions] as boolean}
                                                onChange={v => upd(`mealInclusions.${meal.key}`, v)} />
                                        </div>
                                        {(fm.mealInclusions[meal.key as keyof typeof fm.mealInclusions] as boolean) && (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                                                    <Field label="Venue">
                                                        <input className={inp} placeholder="Venue"
                                                            value={fm.mealInclusions[meal.venueKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.venueKey}`, e.target.value)} />
                                                    </Field>
                                                    {meal.styleKey && (
                                                        <Field label="Serving Style">
                                                            <select className={sel}
                                                                value={fm.mealInclusions[meal.styleKey as keyof typeof fm.mealInclusions] as string}
                                                                onChange={e => upd(`mealInclusions.${meal.styleKey}`, e.target.value)}>
                                                                <option>Buffet</option><option>Set Menu</option>
                                                                <option>À la carte</option><option>Credit</option>
                                                            </select>
                                                        </Field>
                                                    )}
                                                    <Field label="Menu Name">
                                                        <input className={inp} placeholder="e.g. Chef Special"
                                                            value={fm.mealInclusions[meal.menuKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.menuKey}`, e.target.value)} />
                                                    </Field>
                                                    <Field label="Cuisine">
                                                        <input className={inp} placeholder="e.g. Continental"
                                                            value={fm.mealInclusions[meal.cuisineKey as keyof typeof fm.mealInclusions] as string}
                                                            onChange={e => upd(`mealInclusions.${meal.cuisineKey}`, e.target.value)} />
                                                    </Field>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                {meal.showCredit && meal.creditKey && (
                                                    <Field label={`${meal.label} Credit (৳)`} hint="Guest uses up to this amount free">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'}
                                                                value={fm.mealInclusions[meal.creditKey as keyof typeof fm.mealInclusions] as number}
                                                                onChange={e => upd(`mealInclusions.${meal.creditKey}`, +e.target.value)} /></div>
                                                    </Field>
                                                )}
                                                <Field label="Adult Rate" hint="/person/night">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'}
                                                            value={fm.mealInclusions[meal.adultKey as keyof typeof fm.mealInclusions] as number}
                                                            onChange={e => upd(`mealInclusions.${meal.adultKey}`, +e.target.value)} /></div>
                                                </Field>
                                                {meal.childKey && (
                                                    <Field label="Child Rate" hint="/person/night">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'}
                                                                value={fm.mealInclusions[meal.childKey as keyof typeof fm.mealInclusions] as number}
                                                                onChange={e => upd(`mealInclusions.${meal.childKey}`, +e.target.value)} /></div>
                                                    </Field>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            ))}
                        </div>
                    )}

                    {/* ── TAB: RECREATION ── */}
                    {activeTab === 'recreation' && (
                        <div className="space-y-5">
                            <FormSection title="Swimming Pool" icon={<Waves size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Pool Access</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-REC-POOL</span>
                                        </div>
                                        <Toggle checked={fm.poolConfig.included} onChange={v => upd('poolConfig.included', v)} />
                                    </div>
                                    {fm.poolConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1"><Shield size={12} /> Complimentary Allowance</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Complimentary Adults">
                                                        <input type="number" className={inp} min={0} max={10}
                                                            value={fm.poolConfig.complimentaryAdults}
                                                            onChange={e => upd('poolConfig.complimentaryAdults', +e.target.value)} />
                                                    </Field>
                                                    <Field label="Complimentary Children">
                                                        <input type="number" className={inp} min={0} max={10}
                                                            value={fm.poolConfig.complimentaryChildren}
                                                            onChange={e => upd('poolConfig.complimentaryChildren', +e.target.value)} />
                                                    </Field>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <Field label="Extra Adult Pool Rate" hint="/person">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.poolConfig.extraAdultRate} onChange={e => upd('poolConfig.extraAdultRate', +e.target.value)} /></div>
                                                </Field>
                                                <Field label="Extra Child Pool Rate" hint="/person">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.poolConfig.extraChildRate} onChange={e => upd('poolConfig.extraChildRate', +e.target.value)} /></div>
                                                </Field>
                                            </div>
                                            <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                                <AlertCircle size={12} className="inline mr-1" />
                                                Engine: If guest brings extra {fm.poolConfig.complimentaryAdults + 1}+ adults, system auto-charges ৳{fm.poolConfig.extraAdultRate} each → DEPT-04 Recreation
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                <FormSection title="Recreation Activities" icon={<Dumbbell size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-sm font-medium text-gray-800">Include Recreation</span>
                                        <Toggle checked={fm.recreationConfig.included} onChange={v => upd('recreationConfig.included', v)} />
                                    </div>
                                    {fm.recreationConfig.included && (
                                        <div className="space-y-3">
                                            {fm.recreationConfig.activities.map((act, i) => (
                                                <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                    <div className="font-medium text-sm text-gray-800 mb-2">{act.name}</div>
                                                    <div className="grid grid-cols-3 gap-2 text-xs">
                                                        <Field label="Included Sessions">
                                                            <input type="number" className={inp} value={act.includedSessions} min={0}
                                                                onChange={e => {
                                                                    const acts = [...fm.recreationConfig.activities];
                                                                    acts[i] = { ...acts[i], includedSessions: +e.target.value };
                                                                    upd('recreationConfig.activities', acts);
                                                                }} />
                                                        </Field>
                                                        <Field label="Extra Adult Rate">
                                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">৳</span>
                                                                <input type="number" className={inp + ' pl-6'} value={act.adultRate}
                                                                    onChange={e => {
                                                                        const acts = [...fm.recreationConfig.activities];
                                                                        acts[i] = { ...acts[i], adultRate: +e.target.value };
                                                                        upd('recreationConfig.activities', acts);
                                                                    }} /></div>
                                                        </Field>
                                                        <Field label="Extra Child Rate">
                                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">৳</span>
                                                                <input type="number" className={inp + ' pl-6'} value={act.childRate}
                                                                    onChange={e => {
                                                                        const acts = [...fm.recreationConfig.activities];
                                                                        acts[i] = { ...acts[i], childRate: +e.target.value };
                                                                        upd('recreationConfig.activities', acts);
                                                                    }} /></div>
                                                        </Field>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </FormSection>
                            </div>
                        )}

                            {/* ── TAB: TRANSPORT ── */}
                            {activeTab === 'transport' && (
                                <FormSection title="Airport Transfer" icon={<Car size={16} />}>
                                    <div className="mb-4">
                                        <Field label="Transfer Inclusion">
                                            <div className="grid grid-cols-4 gap-2">
                                                {(['None', 'Pickup', 'Drop', 'Both'] as const).map(t => (
                                                    <button key={t} onClick={() => upd('transportConfig.type', t)}
                                                        className={`py-2 rounded-lg text-sm font-medium border transition-all ${fm.transportConfig.type === t ? 'border-blue-500 bg-blue-600 text-white' : 'border-gray-200 text-gray-700 hover:border-blue-300'}`}>
                                                        {t === 'None' ? '✗ None' : t === 'Pickup' ? '✈→ Pickup' : t === 'Drop' ? '→✈ Drop' : '↔ Both'}
                                                    </button>
                                                ))}
                                            </div>
                                        </Field>
                                    </div>
                                    {fm.transportConfig.type !== 'None' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <Field label="Vehicle Type">
                                                <select className={sel} value={fm.transportConfig.vehicleType} onChange={e => upd('transportConfig.vehicleType', e.target.value)}>
                                                    <option>Sedan</option><option>SUV</option><option>Van</option>
                                                    <option>Luxury</option><option>Microbus</option>
                                                </select>
                                            </Field>
                                            <div />
                                            {(fm.transportConfig.type === 'Pickup' || fm.transportConfig.type === 'Both') && (
                                                <Field label="Airport Pickup Rate">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.transportConfig.pickupRate} onChange={e => upd('transportConfig.pickupRate', +e.target.value)} /></div>
                                                </Field>
                                            )}
                                            {(fm.transportConfig.type === 'Drop' || fm.transportConfig.type === 'Both') && (
                                                <Field label="Airport Drop Rate">
                                                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                        <input type="number" className={inp + ' pl-7'} value={fm.transportConfig.dropRate} onChange={e => upd('transportConfig.dropRate', +e.target.value)} /></div>
                                                </Field>
                                            )}
                                            <div className="col-span-2 p-2.5 bg-green-50 rounded-lg border border-green-100 text-xs text-green-700">
                                                <Check size={12} className="inline mr-1" />
                                                Engine: Transfer(s) auto-posted as one-time charge → REV-TRN-PCKU/DROP → DEPT-05 Transport
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            )}

                            {/* ── TAB: LAUNDRY & MINIBAR ── */}
                            {activeTab === 'laundry' && (
                                <div className="space-y-5">
                                {/* LAUNDRY */}
                                <FormSection title="Laundry Allowance" icon={<Shirt size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Laundry</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-LAUN-STD</span>
                                        </div>
                                        <Toggle checked={fm.laundryConfig.included} onChange={v => upd('laundryConfig.included', v)} />
                                    </div>
                                    {fm.laundryConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                                <div className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1"><Zap size={12} /> Allowance Engine — Item Limit</div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <Field label="Allowance Type">
                                                        <select className={sel} value={fm.laundryConfig.allowanceType} onChange={e => upd('laundryConfig.allowanceType', e.target.value as 'Per Stay' | 'Per Day' | 'Every 3 Days')}>
                                                            <option value="Per Stay">Per Stay</option>
                                                            <option value="Per Day">Per Day</option>
                                                            <option value="Every 3 Days">Every 3 Days</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Items Allowed" hint="max pieces">
                                                        <input type="number" className={inp} value={fm.laundryConfig.itemsAllowance} min={0}
                                                            onChange={e => upd('laundryConfig.itemsAllowance', +e.target.value)} />
                                                    </Field>
                                                    <Field label="Extra Item Rate" hint="/piece">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={fm.laundryConfig.extraItemRate}
                                                                onChange={e => upd('laundryConfig.extraItemRate', +e.target.value)} /></div>
                                                    </Field>
                                                </div>
                                            </div>

                                            <div className="text-xs font-semibold text-gray-700 mb-2">Item Breakdown</div>
                                            <div className="space-y-2">
                                                {fm.laundryConfig.items.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                        <span className="text-sm text-gray-700 flex-1">{item.name}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs text-gray-400">Incl:</span>
                                                            <input type="number" className="w-14 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.includedQty} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.laundryConfig.items];
                                                                    items[i] = { ...items[i], includedQty: +e.target.value };
                                                                    upd('laundryConfig.items', items);
                                                                }} />
                                                            <span className="text-xs text-gray-400">Extra ৳</span>
                                                            <input type="number" className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.extraRate} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.laundryConfig.items];
                                                                    items[i] = { ...items[i], extraRate: +e.target.value };
                                                                    upd('laundryConfig.items', items);
                                                                }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                                <AlertCircle size={12} className="inline mr-1" />
                                                Engine: Guest sends {fm.laundryConfig.itemsAllowance} pieces → Free. Piece {fm.laundryConfig.itemsAllowance + 1}+ → ৳{fm.laundryConfig.extraItemRate} each, auto-charged to folio
                                            </div>
                                        </div>
                                    )}
                                </FormSection>

                                {/* MINIBAR */}
                                <FormSection title="Minibar Daily Credit" icon={<Wine size={16} />}>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">Include Minibar</span>
                                            <span className="ml-2 font-mono text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">REV-MINI-BAR</span>
                                        </div>
                                        <Toggle checked={fm.minibarConfig.included} onChange={v => upd('minibarConfig.included', v)} />
                                    </div>
                                    {fm.minibarConfig.included && (
                                        <div className="space-y-4">
                                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 mb-4">
                                                <div className="text-xs font-semibold text-blue-700 mb-3 flex items-center gap-1"><Zap size={12} /> Allowance Engine — Credit Limit</div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Field label="Daily Credit" hint="free amount per day">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={fm.minibarConfig.dailyCredit}
                                                                onChange={e => upd('minibarConfig.dailyCredit', +e.target.value)} /></div>
                                                    </Field>
                                                    <Field label="Replenishment">
                                                        <select className={sel} value={fm.minibarConfig.replenishment} onChange={e => upd('minibarConfig.replenishment', e.target.value as 'Daily' | 'Every 2 Days' | 'On Request')}>
                                                            <option value="Daily">Daily</option>
                                                            <option value="Every 2 Days">Every 2 Days</option>
                                                            <option value="On Request">On Request</option>
                                                        </select>
                                                    </Field>
                                                </div>
                                            </div>

                                            <div className="text-xs font-semibold text-gray-700 mb-2">Minibar Items</div>
                                            <div className="space-y-2">
                                                {fm.minibarConfig.items.map((item, i) => (
                                                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
                                                        <div className="flex-1">
                                                            <div className="text-sm text-gray-700">{item.name}</div>
                                                            <div className="text-[10px] text-gray-400">{item.category}</div>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-400">Qty:</span>
                                                            <input type="number" className="w-12 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.qty} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.minibarConfig.items];
                                                                    items[i] = { ...items[i], qty: +e.target.value };
                                                                    upd('minibarConfig.items', items);
                                                                }} />
                                                            <span className="text-gray-400">৳</span>
                                                            <input type="number" className="w-16 px-2 py-1 border border-gray-300 rounded text-xs text-center" value={item.unitPrice} min={0}
                                                                onChange={e => {
                                                                    const items = [...fm.minibarConfig.items];
                                                                    items[i] = { ...items[i], unitPrice: +e.target.value };
                                                                    upd('minibarConfig.items', items);
                                                                }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-3 p-2.5 bg-emerald-50 rounded-lg border border-emerald-100 text-xs text-emerald-700">
                                                <Check size={12} className="inline mr-1" />
                                                Engine: Guest consumes ৳{fm.minibarConfig.dailyCredit} or less → Free. Above ৳{fm.minibarConfig.dailyCredit} → Extra auto-charged to folio
                                            </div>
                                        </div>
                                    )}
                                </FormSection>
                            </div>
                        )}

                            {/* ── TAB: OUTLETS ── */}
                            {activeTab === 'outlets' && (
                                <FormSection title="Outlet & Spa Credits" icon={<Gift size={16} />}>
                                    <div className="space-y-3 mb-4">
                                        {fm.outletCredits.map((oc, i) => (
                                            <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                <div className="grid grid-cols-4 gap-3 items-end">
                                                    <Field label="Outlet Name">
                                                        <input className={inp} value={oc.outletName} placeholder="e.g. Sky Spa"
                                                            onChange={e => {
                                                                const list = [...fm.outletCredits];
                                                                list[i] = { ...list[i], outletName: e.target.value };
                                                                upd('outletCredits', list);
                                                            }} />
                                                    </Field>
                                                    <Field label="Credit Type">
                                                        <select className={sel} value={oc.creditType} onChange={e => {
                                                            const list = [...fm.outletCredits];
                                                            list[i] = { ...list[i], creditType: e.target.value as 'Per Stay' | 'Per Day' };
                                                            upd('outletCredits', list);
                                                        }}>
                                                            <option value="Per Stay">Per Stay</option>
                                                            <option value="Per Day">Per Day</option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Credit Amount (৳)">
                                                        <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                            <input type="number" className={inp + ' pl-7'} value={oc.creditAmount}
                                                                onChange={e => {
                                                                    const list = [...fm.outletCredits];
                                                                    list[i] = { ...list[i], creditAmount: +e.target.value };
                                                                    upd('outletCredits', list);
                                                                }} /></div>
                                                    </Field>
                                                    <button onClick={() => upd('outletCredits', fm.outletCredits.filter((_, j) => j !== i))}
                                                        className="flex items-center gap-1 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs transition-all mb-0.5">
                                                        <X size={12} /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => upd('outletCredits', [...fm.outletCredits, { outletName: '', creditType: 'Per Stay', creditAmount: 1000, revenueCode: 'REV-SPA-TREAT' }])}
                                        className="flex items-center gap-2 px-4 py-2 border border-dashed border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 text-sm transition-all">
                                        <Plus size={14} /> Add Outlet Credit
                                    </button>
                                    <div className="mt-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100 text-xs text-amber-700">
                                        <AlertCircle size={12} className="inline mr-1" />
                                        Engine: Outlet deducts from credit first. If guest spends above credit → remainder auto-charged to room folio
                                    </div>
                                </FormSection>
                            )}

                            {/* ── TAB: VALIDITY ── */}
                            {activeTab === 'validity' && (
                                <FormSection title="Package Validity" icon={<Calendar size={16} />}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Field label="Valid From">
                                            <input type="date" className={inp} value={fm.validity.startDate} onChange={e => upd('validity.startDate', e.target.value)} />
                                        </Field>
                                        <Field label="Valid To">
                                            <input type="date" className={inp} value={fm.validity.endDate} onChange={e => upd('validity.endDate', e.target.value)} />
                                        </Field>
                                        <Field label="Minimum Nights">
                                            <input type="number" className={inp} min={1} value={fm.validity.minNights} onChange={e => upd('validity.minNights', +e.target.value)} />
                                        </Field>
                                        <Field label="Maximum Nights">
                                            <input type="number" className={inp} min={1} value={fm.validity.maxNights} onChange={e => upd('validity.maxNights', +e.target.value)} />
                                        </Field>
                                        <div className="col-span-2">
                                            <Field label="Blackout Dates" hint="comma-separated dates">
                                                <input className={inp} placeholder="e.g. 2025-12-25, 2025-12-31, 2026-01-01"
                                                    value={fm.validity.blackoutDates} onChange={e => upd('validity.blackoutDates', e.target.value)} />
                                            </Field>
                                        </div>
                                    </div>
                                </FormSection>
                            )}

                            {/* ── TAB: FINANCE ── */}
                            {activeTab === 'finance' && (
                                <FormSection title="Finance & Revenue Routing" icon={<DollarSign size={16} />}>
                                    <div className="grid grid-cols-2 gap-4 mb-5">
                                        <Field label="Base Surcharge" hint="added to room rate/night">
                                            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">৳</span>
                                                <input type="number" className={inp + ' pl-7'} value={fm.finance.baseSurcharge}
                                                    onChange={e => upd('finance.baseSurcharge', +e.target.value)} /></div>
                                        </Field>
                                        <div />
                                        <div className="col-span-2 p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                                            <div>
                                                <div className="text-sm font-medium text-gray-800">Night Audit Auto-Posting</div>
                                                <div className="text-xs text-gray-500">Automatically post all package charges at 02:00 AM daily</div>
                                            </div>
                                            <Toggle checked={fm.finance.autoPost} onChange={v => upd('finance.autoPost', v)} />
                                        </div>
                                    </div>
                                    {/* Revenue Allocation Preview */}
                                    <div className="bg-gray-900 rounded-xl p-4 mt-4">
                                        <div className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-widest border-b border-gray-800 pb-2">Revenue Routing Forecast</div>
                                        <div className="space-y-1.5 min-h-[100px]">
                                            {fm.poolConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Pool Access (Complimentary)</span><span className="text-blue-400 font-mono text-[9px]">DEPT-04 Recreation → REV-REC-POOL</span></div>}
                                            {fm.transportConfig.type !== 'None' && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Airport Transfer (In/Out)</span><span className="text-purple-400 font-mono text-[9px]">DEPT-05 Transport → REV-TRN</span></div>}
                                            {fm.laundryConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Laundry ({fm.laundryConfig.itemsAllowance} items)</span><span className="text-yellow-400 font-mono text-[9px]">DEPT-06 Minor → REV-LAUN-STD</span></div>}
                                            {fm.minibarConfig.included && <div className="flex justify-between text-[10px]"><span className="text-gray-500">Minibar Credit ৳{fm.minibarConfig.dailyCredit}</span><span className="text-pink-400 font-mono text-[9px]">DEPT-02 Minibar → REV-MINI-BAR</span></div>}
                                            {fm.outletCredits.map((oc, i) => <div key={i} className="flex justify-between text-[10px]"><span className="text-gray-500">{oc.outletName} Credit ({oc.creditType})</span><span className="text-orange-400 font-mono text-[9px]">DEPT-03 Outlets → {oc.revenueCode}</span></div>)}
                                            <div className="flex justify-between text-[10px] border-t border-gray-800 pt-2 mt-2">
                                                <span className="text-gray-300 font-bold uppercase tracking-widest">Base Pkg Surcharge</span>
                                                <span className="text-white font-black">৳{fm.finance.baseSurcharge}/night → DEPT-01 Rooms</span>
                                            </div>
                                        </div>
                                    </div>
                                </FormSection>
                            )}
                        </div>

                        {/* Preview Panel */}
                        {previewMode && (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: fm.color }} />
                                        <h3 className="font-bold text-gray-900">{fm.name || 'Package Preview'}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${typeColors[fm.packageType] || typeColors.Standard}`}>{fm.packageType}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{fm.description || 'No description yet'}</p>
                                    <div className="flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                                        <span>Min {fm.validity.minNights} nights</span>
                                        <span className="font-bold text-gray-900">+৳{fm.finance.baseSurcharge}<span className="font-normal">/night</span></span>
                                    </div>
                                </div>
                                <AllowanceEngineViewer pkg={{ ...fm, id: 0 }} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PackageManagement;
