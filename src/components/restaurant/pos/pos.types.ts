export interface Variation {
    id: string;
    name: string;
    price: number;
}

export interface MenuItemData {
    id: string;
    name: string;
    description?: string;
    price: number;
    productCode?: string;
    category: string;
    subCategory?: string;
    prepStation?: string;
    prepTimeEstimate?: number;
    imageUrl?: string;
    boxColor?: string;
    allergens?: string[];
    tags?: string[];
    variations?: Variation[];
    addons?: string[];
    isAvailable?: boolean;
    isFeatured?: boolean;
}

export interface AddonItem {
    id: string;
    name: string;
    description?: string;
    price: number;
    costPrice?: number;
    recipe?: any;
    imageUrl?: string;
}

export interface CartItem {
    cartItemId: string;
    menuItemId: string;
    name: string;
    basePrice: number;
    selectedVariation?: Variation;
    selectedAddons: AddonItem[];
    itemPrice: number; // (selectedVariation.price || basePrice) + sum(selectedAddons.price)
    quantity: number;
    notes?: string;
    prepStation?: string;
    course?: string;
}

export interface DiningTableOrder {
    id: string;
    orderNumber: number;
    splitCode?: string | null;
    guestCount?: number;
    customerName: string;
    status: string;
    totalAmount: number;
    createdAt: string;
    items: {
        id: string;
        quantity: number;
        customNotes?: string;
        course?: string;
        prepStation?: string;
        priceAtOrder?: number;
        menuItem: {
            id: string;
            name: string;
            price: number;
        };
    }[];
}

export interface DiningTableData {
    id: string;
    number: number;
    code: string | null;
    name: string | null;
    floor: string;
    capacity: number;
    occupiedSeats?: number;
    status: string; // Available, Occupied, Reserved, VACANT, ORDER_PENDING
    isVip?: boolean;
    orders?: DiningTableOrder[];
    reservations?: {
        id: string;
        guestName: string;
        guestPhone: string;
        partySize?: number;
        reservationTime: string;
        status: string;
    }[];
}

export interface CustomerData {
    id: string;
    name: string;
    phone: string;
    email?: string;
    loyaltyPoints?: number;
    totalOrders?: number;
}

export interface InHouseGuestOption {
    reservationId: string;
    roomNumber: string;
    guestName: string;
    folioId?: string;
    balance?: number;
}

export interface GeneralSettingsData {
    restaurantName: string;
    phone: string;
    address: string;
    currency: string;
    email?: string;
    logoUrl?: string;
    binNumber?: string;
    vatRegistrationNumber?: string;
    branchName?: string;
}

export interface OrderReceipt {
    orderNumber: number;
    tokenNumber: number;
    orderId?: string;
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' | 'Room-Service';
    table: string;
    roomNumber?: string;
    waiter: string;
    customerName: string;
    customerPhone?: string;
    branchName?: string;
    binNumber?: string;
    items: CartItem[];
    subtotal: number;
    discountAmount: number;
    discountLabel?: string;
    vatAmount: number;
    vatPercent: number;
    serviceChargeAmount: number;
    serviceChargePercent: number;
    cityTaxAmount?: number;
    cityTaxPercent?: number;
    grandTotal: number;
    paymentMethod: 'Cash' | 'Card' | 'bKash' | 'Nagad' | 'Multi-Tender' | 'Split' | 'Room-Charge' | string;
    amountTendered: number;
    changeAmount: number;
    trxId?: string;
    roomChargeFolioId?: string;
    paymentDetails?: Array<{ method: string; amount: number; trxId?: string }>;
    splits?: Array<{ customerName?: string; amount: number; paymentMethod?: string; items?: any[] }>;
    timestamp: string;
    restaurantSettings?: GeneralSettingsData;
}

export interface KotTicketData {
    orderNumber: number;
    tokenNumber: number;
    orderId?: string;
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' | 'Room-Service';
    table: string;
    roomNumber?: string;
    waiter: string;
    customerName?: string;
    items: {
        name: string;
        quantity: number;
        variationName?: string;
        addons: string[];
        notes?: string;
        prepStation?: string;
        course?: string;
    }[];
    timestamp: string;
    isAddonKOT?: boolean;
}

export interface GuestCheckData {
    orderNumber: number;
    orderId?: string;
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' | 'Room-Service';
    table: string;
    roomNumber?: string;
    waiter: string;
    customerName: string;
    items: {
        name: string;
        quantity: number;
        price: number;
        total: number;
        addons?: string[];
    }[];
    subtotal: number;
    discountAmount: number;
    discountReason?: string;
    vatAmount: number;
    vatPercent: number;
    serviceChargeAmount: number;
    serviceChargePercent: number;
    cityTaxAmount?: number;
    cityTaxPercent?: number;
    grandTotal: number;
    timestamp: string;
    restaurantSettings?: GeneralSettingsData;
}

export interface CashTransaction {
    id: string;
    type: 'IN' | 'OUT';
    amount: number;
    reason: string;
    time: string;
    cashierName: string;
}

export interface CashRegisterSession {
    isOpen: boolean;
    shiftId?: string;
    openedAt: string | null;
    openingFloat: number;
    cashierName: string;
    notes?: string;
    transactions: CashTransaction[];
}

export interface HeldOrder {
    id: string;
    timestamp: string;
    customerName: string;
    customerPhone?: string;
    table: string;
    roomNumber?: string;
    waiter: string;
    orderType: 'Dine-in' | 'Takeaway' | 'Delivery' | 'Room-Service';
    items: CartItem[];
    discountPercent: number;
    promoCode: string;
}
