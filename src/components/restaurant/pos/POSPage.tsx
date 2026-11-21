import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react';
import {
    Search,
    ShoppingBag,
    Utensils,
    UtensilsCrossed,
    Trash2,
    Plus,
    Minus,
    RefreshCw,
    PauseCircle,
    Check,
    ChevronDown,
    ChevronUp,
    Store,
    ChefHat,
    FileText,
    LayoutGrid,
    Wallet,
    Percent,
    ArrowLeft,
    Maximize,
    Minimize,
    GitMerge
} from 'lucide-react';
import type {
    MenuItemData,
    AddonItem,
    CartItem,
    DiningTableData,
    OrderReceipt,
    HeldOrder,
    KotTicketData,
    GuestCheckData,
    CashRegisterSession,
    InHouseGuestOption
} from './pos.types';

import { ItemCustomizationModal } from './ItemCustomizationModal';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { HoldOrdersModal } from './HoldOrdersModal';
import { KotModal } from './KotModal';
import { GuestCheckModal } from './GuestCheckModal';
import { SplitBillModal } from './SplitBillModal';
import { MergeOrderModal } from './MergeOrderModal';
import { TableFloorModal } from './TableFloorModal';
import { CashRegisterModal } from './CashRegisterModal';
import { useNavigation } from '../../../context/NavigationContext';

export interface OutletOption {
    id: string;
    name: string;
    code: string;
    outlet_type: string;
    department_category?: string;
    vat_rate: number;
    service_charge_rate: number;
    city_tax_rate: number;
    allow_room_charge: boolean;
    auto_generate_kot: boolean;
    receipt_header?: string;
    receipt_footer?: string;
    bin_number?: string;
}

export interface POSPageProps {
    targetDepartment?: string;
    title?: string;
    initialOutletId?: string;
}

export const POSPage: React.FC<POSPageProps> = ({
    targetDepartment,
    title,
    initialOutletId
}) => {
    const { setActivePage } = useNavigation();

    // Toast alert state
    const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
            setIsFullscreen(true);
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
        document.addEventListener('fullscreenchange', handleFsChange);
        return () => document.removeEventListener('fullscreenchange', handleFsChange);
    }, []);

    // Outlets state
    const [outlets, setOutlets] = useState<OutletOption[]>([]);
    const [selectedOutletId, setSelectedOutletId] = useState<string>(() => {
        return localStorage.getItem('pos_active_outlet') || '';
    });
    const [outletDropdownOpen, setOutletDropdownOpen] = useState(false);
    const outletDropdownRef = useRef<HTMLDivElement>(null);

    // Database entity states
    const [menuItems, setMenuItems] = useState<MenuItemData[]>([]);
    const [categoriesList, setCategoriesList] = useState<string[]>(['All']);
    const [allAddons, setAllAddons] = useState<AddonItem[]>([]);
    const [tables, setTables] = useState<DiningTableData[]>([]);
    const [inHouseGuests, setInHouseGuests] = useState<InHouseGuestOption[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Filter states
    const [activeCategory, setActiveCategory] = useState('All');
    const [activeSubCategory, setActiveSubCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const deferredSearchQuery = useDeferredValue(searchQuery);

    // Order Header state
    const [orderType, setOrderType] = useState<'Dine-in' | 'Takeaway' | 'Delivery' | 'Room-Service'>('Dine-in');
    const [selectedTableId, setSelectedTableId] = useState<string>('');
    const [selectedWaiter, setSelectedWaiter] = useState('Staff Member');
    const [customerName, setCustomerName] = useState('Walk-in customer');
    const [customerPhone, setCustomerPhone] = useState('');
    const [roomNumber, setRoomNumber] = useState('');

    // Table picker dropdown
    const [tableDropdownOpen, setTableDropdownOpen] = useState(false);
    const [tableSearchQuery, setTableSearchQuery] = useState('');
    const tablePickerRef = useRef<HTMLDivElement>(null);

    // Waiter picker
    const waiterList = ['Staff Member', 'Abdul Halim', 'Jahangir Alam', 'Hossain Imran', 'Tanvir Ahmed', 'Mehedi Hasan'];

    // Discounts & Taxes
    const [discountPercent, setDiscountPercent] = useState(0);
    const [fixedDiscount, setFixedDiscount] = useState(0);
    const [discountReason, setDiscountReason] = useState('Manager Courtesy');
    const [isDiscountOpen, setIsDiscountOpen] = useState(false);
    const [isTaxesOpen, setIsTaxesOpen] = useState(false);

    // Cart & Modal states
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customizingItem, setCustomizingItem] = useState<MenuItemData | null>(null);
    const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(() => {
        try {
            const raw = localStorage.getItem('pos_held_orders');
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    });

    // Modals
    const [tableFloorModalOpen, setTableFloorModalOpen] = useState(false);
    const [cashRegisterModalOpen, setCashRegisterModalOpen] = useState(false);
    const [holdModalOpen, setHoldModalOpen] = useState(false);
    const [splitModalOpen, setSplitModalOpen] = useState(false);
    const [mergeModalOpen, setMergeModalOpen] = useState(false);
    const [kotModalOpen, setKotModalOpen] = useState(false);
    const [kotTicketData, setKotTicketData] = useState<KotTicketData | null>(null);
    const [guestCheckModalOpen, setGuestCheckModalOpen] = useState(false);
    const [guestCheckData, setGuestCheckData] = useState<GuestCheckData | null>(null);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptData, setReceiptData] = useState<OrderReceipt | null>(null);
    const [isPlacingOrder, setIsPlacingOrder] = useState(false);

    // Cash Register Shift state
    const [cashSession, setCashSession] = useState<CashRegisterSession>({
        isOpen: true,
        openedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        openingFloat: 5000,
        cashierName: 'Cashier Station 01',
        transactions: []
    });
    const [sessionStats, setSessionStats] = useState({
        cashSales: 0,
        cardSales: 0,
        digitalSales: 0,
        roomCharges: 0,
        totalOrders: 0
    });

    // Active Outlet object
    const activeOutlet = useMemo(() => {
        return outlets.find((o) => o.id === selectedOutletId) || outlets[0] || null;
    }, [outlets, selectedOutletId]);

    // Close popovers on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (outletDropdownRef.current && !outletDropdownRef.current.contains(event.target as Node)) {
                setOutletDropdownOpen(false);
            }
            if (tablePickerRef.current && !tablePickerRef.current.contains(event.target as Node)) {
                setTableDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 1. Fetch Outlets list on initial load
    useEffect(() => {
        const query = targetDepartment ? `?department=${encodeURIComponent(targetDepartment)}` : '';
        fetch(`/api/restaurant/outlets${query}`)
            .then((r) => r.json())
            .then((d) => {
                if (d.success && Array.isArray(d.data)) {
                    setOutlets(d.data);
                    if (initialOutletId && d.data.some((o: any) => o.id === initialOutletId)) {
                        setSelectedOutletId(initialOutletId);
                    } else if (
                        (!selectedOutletId || !d.data.some((o: any) => o.id === selectedOutletId)) &&
                        d.data.length > 0
                    ) {
                        const firstId = d.data[0].id;
                        setSelectedOutletId(firstId);
                        if (!targetDepartment) {
                            localStorage.setItem('pos_active_outlet', firstId);
                        }
                    }
                }
            })
            .catch((e) => console.error('Failed to load outlets:', e));
    }, [targetDepartment, initialOutletId]);

    // 2. Fetch all menu items, categories, addons, tables, cash session for active outlet
    const fetchOutletData = useCallback(async () => {
        if (!selectedOutletId) return;
        setIsLoadingData(true);
        try {
            const [catRes, itemRes, addRes, tblRes, regRes, resRes] = await Promise.all([
                fetch(`/api/restaurant/categories?outletId=${selectedOutletId}`).then((r) => r.json()).catch(() => null),
                fetch(`/api/restaurant/menu-items?outletId=${selectedOutletId}`).then((r) => r.json()).catch(() => null),
                fetch(`/api/restaurant/addons?outletId=${selectedOutletId}`).then((r) => r.json()).catch(() => null),
                fetch(`/api/restaurant/tables?outletId=${selectedOutletId}`).then((r) => r.json()).catch(() => null),
                fetch(`/api/pos/registers/current?outletId=${selectedOutletId}`).then((r) => r.json()).catch(() => null),
                fetch(`/api/reservations?status=CHECKED_IN`).then((r) => r.json()).catch(() => null)
            ]);

            // Categories
            const catMap = new Map<string, string>();
            const cats = new Set<string>(['All']);
            if (catRes?.success && Array.isArray(catRes.data)) {
                catRes.data.forEach((c: any) => {
                    catMap.set(c.id, c.name);
                    cats.add(c.name);
                });
                setCategoriesList(Array.from(cats));
            }

            // Menu Items
            if (itemRes?.success && Array.isArray(itemRes.data)) {
                const formatted: MenuItemData[] = itemRes.data.map((i: any) => ({
                    id: i.id,
                    name: i.name,
                    description: i.description,
                    price: Number(i.price),
                    productCode: i.product_code || undefined,
                    category: catMap.get(i.category_id) || 'General',
                    subCategory: i.sub_category_name || (i.sub_category_id ? catMap.get(i.sub_category_id) : undefined),
                    prepStation: i.prep_station,
                    prepTimeEstimate: i.prep_time_estimate,
                    imageUrl: i.image_url,
                    allergens: Array.isArray(i.allergens) ? i.allergens : [],
                    tags: Array.isArray(i.tags) ? i.tags : [],
                    variations: Array.isArray(i.variations) ? i.variations : [],
                    addons: Array.isArray(i.addons) ? i.addons : [],
                    isAvailable: i.is_available !== false,
                    isFeatured: Boolean(i.is_featured)
                }));
                setMenuItems(formatted);
            } else {
                setMenuItems([]);
            }

            // Addons
            if (addRes?.success && Array.isArray(addRes.data)) {
                setAllAddons(
                    addRes.data.map((a: any) => ({
                        id: a.id,
                        name: a.name,
                        description: a.description,
                        price: Number(a.price),
                        costPrice: Number(a.cost_price || 0),
                        imageUrl: a.image_url
                    }))
                );
            }

            // Tables
            if (tblRes?.success && Array.isArray(tblRes.data)) {
                const formattedTables: DiningTableData[] = tblRes.data.map((t: any) => ({
                    id: t.id,
                    number: t.table_number,
                    code: t.code,
                    name: t.name,
                    floor: t.floor_name || 'Ground Floor',
                    capacity: t.capacity || 4,
                    status: t.status || 'VACANT',
                    isVip: t.is_vip
                }));
                setTables(formattedTables);
                if (!selectedTableId || !formattedTables.some((t) => t.id === selectedTableId)) {
                    const firstVacant = formattedTables.find((t) => t.status === 'VACANT' || t.status === 'Available');
                    setSelectedTableId(firstVacant ? firstVacant.id : formattedTables[0]?.id || '');
                }
            } else {
                setTables([]);
                setSelectedTableId('');
            }

            // In-house checked-in guests
            if (resRes && Array.isArray(resRes.data)) {
                const guests: InHouseGuestOption[] = resRes.data
                    .filter((r: any) => r.room_number)
                    .map((r: any) => ({
                        reservationId: r.id,
                        roomNumber: String(r.room_number),
                        guestName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'In-House Guest'
                    }));
                setInHouseGuests(guests);
            }

            // Cash Register Session
            if (regRes?.success && regRes.data) {
                if (regRes.data.session) {
                    const s = regRes.data.session;
                    setCashSession({
                        isOpen: s.status === 'OPEN',
                        shiftId: s.id,
                        openedAt: s.opened_at ? new Date(s.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
                        openingFloat: Number(s.opening_balance || 0),
                        cashierName: s.cashier_name || 'Cashier',
                        notes: s.notes || '',
                        transactions: []
                    });
                }
                if (regRes.data.stats) {
                    setSessionStats(regRes.data.stats);
                }
            }
        } catch (err) {
            console.error('POS fetchOutletData error:', err);
        } finally {
            setIsLoadingData(false);
        }
    }, [selectedOutletId]);

    useEffect(() => {
        if (selectedOutletId) {
            fetchOutletData();
        }
    }, [selectedOutletId, fetchOutletData]);

    // Outlet switch handler
    const handleSwitchOutlet = (outletId: string) => {
        setSelectedOutletId(outletId);
        localStorage.setItem('pos_active_outlet', outletId);
        setOutletDropdownOpen(false);
        setCart([]);
        showToast('Switched outlet location', 'info');
    };

    // Subcategories list
    const availableSubcategories = useMemo(() => {
        if (activeCategory === 'All') return [];
        const subs = new Set<string>();
        menuItems.forEach((m) => {
            if (m.category === activeCategory && m.subCategory) {
                subs.add(m.subCategory);
            }
        });
        return subs.size > 0 ? ['All', ...Array.from(subs)] : [];
    }, [activeCategory, menuItems]);

    // Filtered dishes
    const filteredDishes = useMemo(() => {
        const q = (deferredSearchQuery || '').trim().toLowerCase();
        return menuItems.filter((item) => {
            const matchesCategory =
                activeCategory === 'All'
                    ? true
                    : activeCategory === 'Popular'
                    ? Boolean(item.isFeatured)
                    : item.category === activeCategory;
            const matchesSubCategory = activeSubCategory === 'All' || item.subCategory === activeSubCategory;
            const matchesSearch =
                !q ||
                (item.name || '').toLowerCase().includes(q) ||
                (item.productCode ? String(item.productCode).toLowerCase().includes(q) : false) ||
                (item.description ? String(item.description).toLowerCase().includes(q) : false) ||
                (item.category ? String(item.category).toLowerCase().includes(q) : false);

            return matchesCategory && matchesSubCategory && matchesSearch;
        });
    }, [menuItems, activeCategory, activeSubCategory, deferredSearchQuery]);

    // Dish Click: open customize or direct quick add
    const handleItemCardClick = (dish: MenuItemData) => {
        const hasVariations = dish.variations && dish.variations.length > 0;
        const hasAddons = dish.addons && dish.addons.length > 0 && allAddons.length > 0;

        if (hasVariations || hasAddons) {
            setCustomizingItem(dish);
        } else {
            handleAddToCart({
                cartItemId: `${dish.id}-${Date.now()}`,
                menuItemId: dish.id,
                name: dish.name,
                basePrice: dish.price,
                selectedAddons: [],
                itemPrice: dish.price,
                quantity: 1,
                prepStation: dish.prepStation
            });
        }
    };

    const handleAddToCart = (newItem: CartItem) => {
        setCart((prev) => {
            const existingIdx = prev.findIndex(
                (i) =>
                    i.menuItemId === newItem.menuItemId &&
                    i.selectedVariation?.id === newItem.selectedVariation?.id &&
                    i.notes === newItem.notes &&
                    JSON.stringify(i.selectedAddons.map((a) => a.id).sort()) ===
                        JSON.stringify(newItem.selectedAddons.map((a) => a.id).sort())
            );

            if (existingIdx > -1) {
                return prev.map((item, idx) =>
                    idx === existingIdx ? { ...item, quantity: item.quantity + newItem.quantity } : item
                );
            }
            return [...prev, newItem];
        });
    };

    const handleUpdateQty = (cartItemId: string, delta: number) => {
        setCart((prev) =>
            prev
                .map((item) => (item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item))
                .filter((item) => item.quantity > 0)
        );
    };

    const handleRemoveCartItem = (cartItemId: string) => {
        setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
    };

    const handleClearCart = () => {
        if (cart.length === 0) return;
        if (confirm('Clear all items from this current order ticket?')) {
            setCart([]);
            setDiscountPercent(0);
            setFixedDiscount(0);
        }
    };

    // Selected Table object
    const selectedTableObj = useMemo(() => {
        return tables.find((t) => t.id === selectedTableId) || null;
    }, [tables, selectedTableId]);

    // Financial calculations based on live statutory rates of active outlet
    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => sum + item.itemPrice * item.quantity, 0);
    }, [cart]);

    const discountAmount = useMemo(() => {
        if (fixedDiscount > 0) return Math.min(fixedDiscount, subtotal);
        if (discountPercent > 0) return Number(((subtotal * discountPercent) / 100).toFixed(2));
        return 0;
    }, [subtotal, fixedDiscount, discountPercent]);

    const discountedSubtotal = Math.max(0, subtotal - discountAmount);

    const serviceChargeRate = activeOutlet ? Number(activeOutlet.service_charge_rate || 0) : 0;
    const vatRate = activeOutlet ? Number(activeOutlet.vat_rate || 0) : 0;
    const cityTaxRate = activeOutlet ? Number(activeOutlet.city_tax_rate || 0) : 0;

    const serviceChargeAmount = useMemo(() => {
        if (orderType === 'Takeaway' || orderType === 'Delivery') return 0;
        return Number(((discountedSubtotal * serviceChargeRate) / 100).toFixed(2));
    }, [discountedSubtotal, serviceChargeRate, orderType]);

    const vatAmount = useMemo(() => {
        return Number((((discountedSubtotal + serviceChargeAmount) * vatRate) / 100).toFixed(2));
    }, [discountedSubtotal, serviceChargeAmount, vatRate]);

    const cityTaxAmount = useMemo(() => {
        if (cityTaxRate <= 0) return 0;
        return Number(((discountedSubtotal * cityTaxRate) / 100).toFixed(2));
    }, [discountedSubtotal, cityTaxRate]);

    const grandTotal = useMemo(() => {
        return Number((discountedSubtotal + serviceChargeAmount + vatAmount + cityTaxAmount).toFixed(2));
    }, [discountedSubtotal, serviceChargeAmount, vatAmount, cityTaxAmount]);

    // 1. Hold Current Order
    const handleHoldOrder = () => {
        if (cart.length === 0) return;
        const newHeld: HeldOrder = {
            id: `held-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            customerName: customerName.trim() || 'Guest',
            customerPhone: customerPhone.trim(),
            table: selectedTableObj?.code ? `${selectedTableObj.code} (T${selectedTableObj.number})` : 'Counter',
            roomNumber: orderType === 'Room-Service' ? roomNumber : undefined,
            waiter: selectedWaiter,
            orderType,
            items: cart,
            discountPercent,
            promoCode: discountReason
        };
        const updated = [newHeld, ...heldOrders];
        setHeldOrders(updated);
        localStorage.setItem('pos_held_orders', JSON.stringify(updated));
        setCart([]);
        setDiscountPercent(0);
        setFixedDiscount(0);
        showToast('Order held successfully in parked register', 'info');
    };

    const handleResumeHeldOrder = (order: HeldOrder) => {
        setCart(order.items);
        setCustomerName(order.customerName);
        if (order.customerPhone) setCustomerPhone(order.customerPhone);
        if (order.roomNumber) setRoomNumber(order.roomNumber);
        if (order.discountPercent) setDiscountPercent(order.discountPercent);
        setDiscountReason(order.promoCode || 'Resumed');
        setOrderType(order.orderType);

        // Remove from held
        const remaining = heldOrders.filter((h) => h.id !== order.id);
        setHeldOrders(remaining);
        localStorage.setItem('pos_held_orders', JSON.stringify(remaining));
        setHoldModalOpen(false);
        showToast('Held order restored to active cart', 'success');
    };

    const handleDeleteHeldOrder = (id: string) => {
        const remaining = heldOrders.filter((h) => h.id !== id);
        setHeldOrders(remaining);
        localStorage.setItem('pos_held_orders', JSON.stringify(remaining));
    };

    // 2. Kitchen Order Ticket (KOT) Dispatch
    const handleDispatchKOT = async () => {
        if (cart.length === 0) {
            showToast('Add dishes to cart before sending KOT', 'error');
            return;
        }

        const ticketData: KotTicketData = {
            orderNumber: Math.floor(1000 + Math.random() * 9000),
            tokenNumber: Math.floor(100 + Math.random() * 900),
            orderType,
            table: selectedTableObj?.code ? `${selectedTableObj.code} (T${selectedTableObj.number})` : 'Counter',
            roomNumber: orderType === 'Room-Service' ? roomNumber : undefined,
            waiter: selectedWaiter,
            customerName,
            items: cart.map((i) => ({
                name: i.name,
                quantity: i.quantity,
                variationName: i.selectedVariation?.name,
                addons: i.selectedAddons.map((a) => a.name),
                notes: i.notes,
                prepStation: i.prepStation
            })),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        setKotTicketData(ticketData);
        setKotModalOpen(true);

        // Optimistically update local table status to Occupied
        if (orderType === 'Dine-in' && selectedTableId) {
            setTables((prev) =>
                prev.map((t) => (t.id === selectedTableId ? { ...t, status: 'OCCUPIED' } : t))
            );
        }

        // Asynchronously post to backend
        try {
            await fetch('/api/pos/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outletId: selectedOutletId,
                    tableId: orderType === 'Dine-in' ? selectedTableId : null,
                    orderType: orderType === 'Takeaway' ? 'TAKEAWAY' : orderType === 'Delivery' ? 'DELIVERY' : orderType === 'Room-Service' ? 'ROOM_SERVICE' : 'DINE_IN',
                    customerName,
                    customerPhone,
                    roomNumber: orderType === 'Room-Service' ? roomNumber : undefined,
                    waiterName: selectedWaiter,
                    items: cart.map((i) => ({
                        menuItemId: i.menuItemId,
                        name: i.name,
                        quantity: i.quantity,
                        unitPrice: i.itemPrice,
                        variationName: i.selectedVariation?.name,
                        selectedAddons: i.selectedAddons,
                        prepStation: i.prepStation,
                        customNotes: i.notes
                    })),
                    paymentMethod: 'CASH',
                    discount: discountAmount
                })
            });
            showToast('KOT sent to kitchen display stations!', 'success');
        } catch (e) {
            console.error('KOT async post error:', e);
        }
    };

    // 3. Guest Check / Provisional Bill Preview
    const handleGenerateGuestCheck = () => {
        if (cart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }

        const data: GuestCheckData = {
            orderNumber: Math.floor(1000 + Math.random() * 9000),
            orderType,
            table: selectedTableObj?.code ? `${selectedTableObj.code} (T${selectedTableObj.number})` : 'Counter',
            roomNumber: orderType === 'Room-Service' ? roomNumber : undefined,
            waiter: selectedWaiter,
            customerName,
            items: cart.map((i) => ({
                name: i.name + (i.selectedVariation ? ` (${i.selectedVariation.name})` : ''),
                quantity: i.quantity,
                price: i.itemPrice,
                total: i.itemPrice * i.quantity,
                addons: i.selectedAddons.map((a) => a.name)
            })),
            subtotal,
            discountAmount,
            discountReason,
            vatAmount,
            vatPercent: vatRate,
            serviceChargeAmount,
            serviceChargePercent: serviceChargeRate,
            cityTaxAmount,
            cityTaxPercent: cityTaxRate,
            grandTotal,
            timestamp: new Date().toLocaleString(),
            restaurantSettings: {
                restaurantName: activeOutlet?.name || 'Hotel Restaurant',
                phone: '01700-000000',
                address: 'Hotel Premises, Level 2',
                currency: 'BDT ৳',
                binNumber: activeOutlet?.bin_number || '002910394-0101'
            }
        };

        setGuestCheckData(data);
        setGuestCheckModalOpen(true);
    };

    // 4. Settle Payment Confirmation (With Dynamic Tenders & Hotel Folio Bill to Room)
    const handleConfirmPayment = async (paymentDetails: any) => {
        setIsPlacingOrder(true);
        try {
            const mappedPaymentMethod =
                paymentDetails.category === 'ROOM_CREDIT'
                    ? 'ROOM_CHARGE'
                    : paymentDetails.category === 'CASH'
                    ? 'CASH'
                    : paymentDetails.category === 'CARD'
                    ? 'CARD'
                    : paymentDetails.category === 'MOBILE_BANKING'
                    ? paymentDetails.method.toUpperCase().includes('BKASH')
                        ? 'BKASH'
                        : 'NAGAD'
                    : paymentDetails.method.toUpperCase();

            const res = await fetch('/api/pos/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    outletId: selectedOutletId,
                    tableId: orderType === 'Dine-in' ? selectedTableId : null,
                    orderType:
                        orderType === 'Takeaway'
                            ? 'TAKEAWAY'
                            : orderType === 'Delivery'
                            ? 'DELIVERY'
                            : orderType === 'Room-Service'
                            ? 'ROOM_SERVICE'
                            : 'DINE_IN',
                    customerName: paymentDetails.customerName || customerName,
                    customerPhone: paymentDetails.customerPhone || customerPhone,
                    roomNumber: paymentDetails.roomNumber || (orderType === 'Room-Service' ? roomNumber : undefined),
                    waiterName: selectedWaiter,
                    items: cart.map((i) => ({
                        menuItemId: i.menuItemId,
                        name: i.name,
                        quantity: i.quantity,
                        unitPrice: i.itemPrice,
                        variationName: i.selectedVariation?.name,
                        selectedAddons: i.selectedAddons,
                        prepStation: i.prepStation,
                        customNotes: i.notes
                    })),
                    paymentMethod: mappedPaymentMethod,
                    paymentDetails: paymentDetails.payments || [
                        {
                            method: paymentDetails.method,
                            amount: grandTotal,
                            trxId: paymentDetails.trxId,
                            roomNumber: paymentDetails.roomNumber,
                            acquiringBank: paymentDetails.acquiringBank
                        }
                    ],
                    discount: discountAmount
                })
            });

            const data = await res.json();
            if (!data.success) {
                throw new Error(data.error || 'Server error saving order payment');
            }

            const createdOrder = data.data;

            // Prepare Receipt Data
            const receipt: OrderReceipt = {
                orderNumber: createdOrder.order_number,
                tokenNumber: Math.floor(100 + (createdOrder.order_number % 900)),
                orderId: createdOrder.id,
                orderType,
                table: selectedTableObj?.code ? `${selectedTableObj.code} (T${selectedTableObj.number})` : 'Counter',
                roomNumber: paymentDetails.roomNumber,
                waiter: selectedWaiter,
                customerName: paymentDetails.customerName || customerName,
                customerPhone: paymentDetails.customerPhone || customerPhone,
                branchName: activeOutlet?.name || 'Hotel Restaurant',
                binNumber: activeOutlet?.bin_number || '002910394-0101',
                items: cart,
                subtotal,
                discountAmount,
                discountLabel: discountReason,
                vatAmount,
                vatPercent: vatRate,
                serviceChargeAmount,
                serviceChargePercent: serviceChargeRate,
                cityTaxAmount,
                cityTaxPercent: cityTaxRate,
                grandTotal,
                paymentMethod: paymentDetails.method,
                amountTendered: paymentDetails.tendered,
                changeAmount: paymentDetails.change,
                trxId: paymentDetails.trxId,
                roomChargeFolioId: createdOrder.folio_id,
                paymentDetails: paymentDetails.payments,
                timestamp: new Date().toLocaleString(),
                restaurantSettings: {
                    restaurantName: activeOutlet?.name || 'Hotel Restaurant',
                    phone: '01700-000000',
                    address: 'Hotel Premises, Level 2',
                    currency: 'BDT ৳',
                    binNumber: activeOutlet?.bin_number || '002910394-0101'
                }
            };

            setReceiptData(receipt);
            setPaymentModalOpen(false);
            setReceiptModalOpen(true);
            setCart([]);
            setDiscountPercent(0);
            setFixedDiscount(0);

            // Re-fetch tables and stats
            fetchOutletData();

            showToast(
                paymentDetails.category === 'ROOM_CREDIT'
                    ? `Order billed to Room ${paymentDetails.roomNumber} (Folio #${createdOrder.folio_id})!`
                    : 'Order settled successfully!',
                'success'
            );
        } catch (err: any) {
            console.error('Payment error:', err);
            showToast(`Settlement Alert: ${err.message || 'Server error'}`, 'error');
        } finally {
            setIsPlacingOrder(false);
        }
    };

    return (
        <div className="h-screen min-h-screen max-h-screen flex flex-col bg-[#f8f9fc] dark:bg-[#0b0b0e] p-2 sm:p-2.5 overflow-hidden select-none relative w-full text-foreground terminal-viewport-lock">
            {/* Toast Notifications */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-2xl shadow-xl text-xs text-white transition-all animate-in fade-in slide-in-from-top-2 max-w-[90vw] ${
                        toast.type === 'error'
                            ? 'bg-rose-600'
                            : toast.type === 'success'
                            ? 'bg-emerald-600'
                            : 'bg-primary'
                    }`}
                >
                    {toast.message}
                </div>
            )}

            {/* TOP BAR (Hidden when in fullscreen if preferred) */}
            <div className="flex items-center justify-between gap-2 bg-white dark:bg-[#131317] border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3 py-2 shadow-2xs shrink-0 w-full animate-in fade-in">
                <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    {/* Back to FrontDesk */}
                    <button
                        type="button"
                        onClick={() => setActivePage('front-desk')}
                        className="size-8.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-600 dark:text-slate-400 hover:text-primary dark:hover:text-white flex items-center justify-center transition shadow-2xs shrink-0 cursor-pointer"
                        title="Back to Front Desk"
                    >
                        <ArrowLeft className="size-4" />
                    </button>

                    <div className="size-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-2xs shrink-0">
                        <Store className="size-4.5" />
                    </div>

                    <div className="min-w-0">
                        <h1 className="text-xs sm:text-sm md:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2 truncate">
                            <span className="truncate">{title || 'Hotel POS Terminal'}</span>
                            <span className="size-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        </h1>

                        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {/* Outlet Selector Dropdown */}
                            <div className="relative inline-block" ref={outletDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setOutletDropdownOpen(!outletDropdownOpen)}
                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 text-[10px] sm:text-xs font-bold text-primary transition cursor-pointer shadow-2xs"
                                >
                                    <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate max-w-[140px]">
                                        {activeOutlet ? activeOutlet.name : 'Select Outlet'}
                                    </span>
                                    <ChevronDown
                                        className={`size-3 transition-transform ${
                                            outletDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                    />
                                </button>

                                {outletDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1.5 w-60 z-50 bg-white dark:bg-[#181820] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-1.5 space-y-1 animate-in fade-in duration-100">
                                        <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                            Dining Outlets ({outlets.length})
                                        </div>
                                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                                            {outlets.map((o) => {
                                                const isSel = o.id === selectedOutletId;
                                                return (
                                                    <button
                                                        key={o.id}
                                                        type="button"
                                                        onClick={() => handleSwitchOutlet(o.id)}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition text-left cursor-pointer ${
                                                            isSel
                                                                ? 'bg-primary text-white shadow-xs'
                                                                : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2 truncate">
                                                            <Store
                                                                className={`size-3.5 shrink-0 ${
                                                                    isSel ? 'text-white' : 'text-slate-400'
                                                                }`}
                                                            />
                                                            <span className="truncate">{o.name}</span>
                                                        </div>
                                                        {isSel && <Check className="size-3.5 text-white shrink-0 ml-1" />}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <span className="hidden md:inline">·</span>
                            <span className="hidden md:inline font-mono">
                                VAT {vatRate}% · SC {serviceChargeRate}%
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Toolbar */}
                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                    {/* Visual Floor Plan / Tables */}
                    <button
                        type="button"
                        onClick={() => setTableFloorModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Visual Floor Plan & Table Layout"
                    >
                        <LayoutGrid className="size-3.5 text-primary" />
                        <span className="hidden sm:inline">Floor Plan</span>
                    </button>

                    {/* Cash Register Shift Button */}
                    <button
                        type="button"
                        onClick={() => setCashRegisterModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Cash Register Shift & Drawer"
                    >
                        <Wallet className="size-3.5 text-emerald-600" />
                        <span className="hidden md:inline">Till</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                            ৳{(cashSession.openingFloat + sessionStats.cashSales).toFixed(0)}
                        </span>
                    </button>

                    {/* Held Orders Button */}
                    <button
                        type="button"
                        onClick={() => setHoldModalOpen(true)}
                        className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                            heldOrders.length > 0
                                ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 animate-pulse'
                                : 'bg-slate-50 dark:bg-[#1a1a22] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                        }`}
                        title="Parked / Held Orders"
                    >
                        <PauseCircle className="size-3.5" />
                        <span className="hidden sm:inline">Held</span>
                        {heldOrders.length > 0 && (
                            <span className="size-4 rounded-full bg-amber-500 text-white text-[10px] font-extrabold flex items-center justify-center">
                                {heldOrders.length}
                            </span>
                        )}
                    </button>

                    {/* Merge Orders Button */}
                    <button
                        type="button"
                        onClick={() => setMergeModalOpen(true)}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold hidden md:flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Merge Table Orders"
                    >
                        <GitMerge className="size-3.5 text-purple-600" />
                        <span>Merge</span>
                    </button>

                    {/* Kitchen Display System (KDS) */}
                    <button
                        type="button"
                        onClick={() => setActivePage('kds')}
                        className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold hidden lg:flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Open Kitchen Display (KDS)"
                    >
                        <ChefHat className="size-3.5 text-orange-500" />
                        <span>KDS</span>
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                        className="size-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center justify-center transition shadow-2xs cursor-pointer"
                    >
                        {isFullscreen ? <Minimize className="size-4 text-primary" /> : <Maximize className="size-4" />}
                    </button>

                    {/* Refresh Live Data */}
                    <button
                        type="button"
                        onClick={fetchOutletData}
                        disabled={isLoadingData}
                        title="Refresh Menu & Live Tables"
                        className="size-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-600 dark:text-slate-400 hover:text-slate-900 flex items-center justify-center transition disabled:opacity-50 shadow-2xs cursor-pointer"
                    >
                        <RefreshCw className={`size-3.5 ${isLoadingData ? 'animate-spin text-primary' : ''}`} />
                    </button>
                </div>
            </div>

            {/* MAIN VIEWPORT: Left Menu Grid + Right Cart Ticket */}
            <div className="flex-1 flex flex-col xl:flex-row gap-2 sm:gap-2.5 min-h-0 overflow-hidden w-full mt-2">
                {/* ======================================================== */}
                {/* LEFT COLUMN: Search, Categories, Dishes Grid */}
                {/* ======================================================== */}
                <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden w-full space-y-2">
                    {isLoadingData ? (
                        <div className="p-16 text-center bg-white dark:bg-[#131317] border border-slate-200 dark:border-slate-800 rounded-3xl space-y-3">
                            <div className="size-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
                            <div className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Loading menu and tables for {activeOutlet?.name || 'Outlet'}...
                            </div>
                        </div>
                    ) : menuItems.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center bg-white dark:bg-[#131317] border-2 border-dashed border-amber-300 dark:border-amber-800/60 rounded-3xl space-y-4 shadow-2xs">
                            <div className="size-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center shadow-inner">
                                <UtensilsCrossed className="size-8 stroke-[1.5]" />
                            </div>
                            <div className="max-w-md mx-auto space-y-1.5">
                                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                                    No Menu Items Configured for this Outlet
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Please create menu items and categories for{' '}
                                    <span className="font-bold text-slate-700 dark:text-slate-200">{activeOutlet?.name}</span> before taking orders, or clone items from another outlet.
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActivePage('products')}
                                    className="px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer"
                                >
                                    <Plus className="size-4" />
                                    <span>Add Menu Items</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActivePage('restaurant-outlets')}
                                    className="px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition flex items-center gap-2 cursor-pointer"
                                >
                                    <Store className="size-4" />
                                    <span>Clone from Another Outlet</span>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Search bar */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search dishes by name, product code (e.g. #B101) or category..."
                                    className="w-full bg-white dark:bg-[#131317] border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary shadow-2xs"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 size-4.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>

                            {/* Category Selector Pills Carousel */}
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs shrink-0 [scrollbar-width:none]">
                                {categoriesList.map((cat) => {
                                    const isSel = activeCategory === cat;
                                    const count =
                                        cat === 'All'
                                            ? menuItems.length
                                            : cat === 'Popular'
                                            ? menuItems.filter((m) => m.isFeatured).length
                                            : menuItems.filter((m) => m.category === cat).length;
                                    return (
                                        <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                                setActiveCategory(cat);
                                                setActiveSubCategory('All');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                                                isSel
                                                    ? 'bg-primary text-white shadow-xs'
                                                    : 'bg-white dark:bg-[#16161d] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
                                            }`}
                                        >
                                            <span>{cat}</span>
                                            <span
                                                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                                    isSel
                                                        ? 'bg-white/20 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Subcategories Pills (if present) */}
                            {activeCategory !== 'All' && availableSubcategories.length > 1 && (
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs animate-in fade-in duration-100 [scrollbar-width:none]">
                                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px] pl-1">
                                        Sub:
                                    </span>
                                    {availableSubcategories.map((sub) => {
                                        const isSel = activeSubCategory === sub;
                                        return (
                                            <button
                                                key={sub}
                                                type="button"
                                                onClick={() => setActiveSubCategory(sub)}
                                                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition text-[11px] cursor-pointer ${
                                                    isSel
                                                        ? 'bg-primary/15 text-primary border border-primary/30 font-bold'
                                                        : 'bg-slate-100 dark:bg-[#1a1a22] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-200'
                                                }`}
                                            >
                                                {sub === 'All' ? `All ${activeCategory}` : sub}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Dishes Responsive Grid */}
                            {filteredDishes.length === 0 ? (
                                <div className="p-10 text-center bg-white dark:bg-[#131317] border border-slate-200 dark:border-slate-800 rounded-3xl">
                                    <div className="size-11 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-2.5">
                                        <Utensils className="size-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                        No Dishes Found
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">
                                        Try searching with different keywords or switch the category filter.
                                    </p>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-2.5 content-start pb-20 xl:pb-2">
                                    {filteredDishes.map((dish) => {
                                        const hasVariations = dish.variations && dish.variations.length > 0;
                                        const minPrice = hasVariations
                                            ? Math.min(...dish.variations!.map((v) => v.price))
                                            : dish.price;
                                        const inCartQty = cart
                                            .filter((c) => c.menuItemId === dish.id)
                                            .reduce((sum, c) => sum + c.quantity, 0);

                                        return (
                                            <div
                                                key={dish.id}
                                                onClick={() => handleItemCardClick(dish)}
                                                className="bg-white dark:bg-[#131317] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 shadow-2xs hover:border-primary/60 hover:shadow-sm transition duration-200 cursor-pointer flex flex-col justify-between group h-[165px] sm:h-[175px] relative overflow-hidden"
                                            >
                                                {/* Product Code Badge */}
                                                {dish.productCode && (
                                                    <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/80 z-10 shadow-2xs">
                                                        #{dish.productCode}
                                                    </span>
                                                )}

                                                {/* In-Cart Quantity Indicator Badge */}
                                                {inCartQty > 0 && (
                                                    <div className="absolute top-2 right-2 size-5.5 rounded-full bg-primary text-white text-[10px] font-black flex items-center justify-center shadow-md ring-2 ring-white dark:ring-[#131317] z-10 animate-in zoom-in-50 duration-150">
                                                        {inCartQty}
                                                    </div>
                                                )}

                                                {/* Visual Header (Photo or Colored Box) */}
                                                <div className="flex justify-center pt-0.5">
                                                    {dish.imageUrl ? (
                                                        <div className="size-12 sm:size-13 rounded-xl overflow-hidden shadow-2xs border border-slate-100 dark:border-slate-800">
                                                            <img
                                                                src={dish.imageUrl}
                                                                alt={dish.name}
                                                                className="size-full object-cover group-hover:scale-105 transition duration-200"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div className="size-12 sm:size-13 rounded-xl bg-primary/20 text-primary border border-primary/30 p-1 flex flex-col items-center justify-center text-center shadow-2xs">
                                                            <Utensils className="size-5" />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Title & Category */}
                                                <div className="mt-1 text-left">
                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 leading-snug group-hover:text-primary transition">
                                                        {dish.name}
                                                    </h4>
                                                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                                        {dish.subCategory ? (
                                                            <span className="text-[10px] text-primary dark:text-[#a074f7] font-semibold truncate max-w-full">
                                                                {dish.subCategory}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-400 truncate max-w-full">
                                                                {dish.category}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Price & Add Row */}
                                                <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                                                    <div className="text-xs font-extrabold text-primary font-mono">
                                                        {hasVariations && (
                                                            <span className="text-[9px] font-normal text-slate-400 mr-0.5">
                                                                From
                                                            </span>
                                                        )}
                                                        <span>৳{minPrice.toFixed(2)}</span>
                                                    </div>

                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg transition ${
                                                            hasVariations
                                                                ? 'bg-primary/10 text-primary border border-primary/20'
                                                                : 'bg-slate-100 dark:bg-[#1f1f28] text-slate-600 dark:text-slate-300 group-hover:bg-primary group-hover:text-white'
                                                        }`}
                                                    >
                                                        {hasVariations ? '+ Option' : '+ Add'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* ======================================================== */}
                {/* RIGHT COLUMN: Ticket Header, Cart Items, Pricing, Settle */}
                {/* ======================================================== */}
                <div
                    id="pos-active-ticket"
                    className="w-full xl:w-[380px] 2xl:w-[410px] bg-white dark:bg-[#131317] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-2.5 sm:p-3 shadow-2xs shrink-0 flex flex-col h-full overflow-hidden"
                >
                    {/* Order Mode Switcher */}
                    <div className="grid grid-cols-4 gap-1 bg-slate-100 dark:bg-[#1a1a22] p-0.5 rounded-xl text-xs font-semibold shrink-0 mb-2">
                        {(['Dine-in', 'Takeaway', 'Delivery', 'Room-Service'] as const).map((type) => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setOrderType(type)}
                                className={`py-1 px-1 rounded-lg flex items-center justify-center gap-1 transition text-[10px] sm:text-xs cursor-pointer ${
                                    orderType === type
                                        ? 'bg-white dark:bg-[#252530] text-primary font-bold shadow-2xs'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                                }`}
                            >
                                <span>{type === 'Room-Service' ? 'Room Svc' : type}</span>
                            </button>
                        ))}
                    </div>

                    {/* Table / Room & Waiter Row */}
                    <div className="grid grid-cols-2 gap-1.5 text-xs shrink-0 mb-2">
                        {/* Table Selector (if Dine-in) or Room Selector (if Room-Service) */}
                        {orderType === 'Dine-in' ? (
                            <div className="flex items-center gap-1 relative" ref={tablePickerRef}>
                                <button
                                    type="button"
                                    onClick={() => setTableDropdownOpen(!tableDropdownOpen)}
                                    className="flex-1 min-w-0 bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 hover:border-primary rounded-xl px-2 py-1 text-xs text-left flex items-center justify-between transition cursor-pointer"
                                    title="Search and select table"
                                >
                                    <div className="flex items-center gap-1.5 truncate mr-1">
                                        <span
                                            className={`size-2 rounded-full shrink-0 ${
                                                selectedTableObj?.status === 'OCCUPIED'
                                                    ? 'bg-rose-500'
                                                    : selectedTableObj?.status === 'CLEANING'
                                                    ? 'bg-amber-500'
                                                    : 'bg-emerald-500'
                                            }`}
                                        />
                                        <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">
                                            {selectedTableObj
                                                ? selectedTableObj.code
                                                    ? `${selectedTableObj.code} (T${selectedTableObj.number})`
                                                    : `Table ${selectedTableObj.number}`
                                                : 'Select Table'}
                                        </span>
                                    </div>
                                    <ChevronDown className="size-3 text-slate-400 shrink-0" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTableFloorModalOpen(true)}
                                    title="Floor Plan Modal"
                                    className="size-6.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-primary hover:bg-primary/10 flex items-center justify-center shrink-0 transition cursor-pointer"
                                >
                                    <LayoutGrid className="size-3.5" />
                                </button>

                                {/* Table Dropdown Popover */}
                                {tableDropdownOpen && (
                                    <div className="absolute top-full left-0 mt-1 w-64 z-50 bg-white dark:bg-[#181820] border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden p-2 space-y-1.5 animate-in fade-in duration-100">
                                        <input
                                            type="text"
                                            value={tableSearchQuery}
                                            onChange={(e) => setTableSearchQuery(e.target.value)}
                                            placeholder="Search table number..."
                                            className="w-full bg-slate-50 dark:bg-[#20202a] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-primary"
                                        />
                                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                                            {tables
                                                .filter((t) => {
                                                    if (!tableSearchQuery.trim()) return true;
                                                    const q = tableSearchQuery.toLowerCase();
                                                    return (
                                                        (t.code && t.code.toLowerCase().includes(q)) ||
                                                        String(t.number).includes(q) ||
                                                        (t.name && t.name.toLowerCase().includes(q))
                                                    );
                                                })
                                                .map((t) => (
                                                    <button
                                                        key={t.id}
                                                        type="button"
                                                        onClick={() => {
                                                            setSelectedTableId(t.id);
                                                            setTableDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-2 py-1.5 rounded-lg flex items-center justify-between text-left transition text-xs cursor-pointer ${
                                                            t.id === selectedTableId
                                                                ? 'bg-primary/10 text-primary font-bold'
                                                                : 'hover:bg-slate-50 dark:hover:bg-[#20202a] text-slate-800 dark:text-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 truncate">
                                                            <span
                                                                className={`size-2 rounded-full shrink-0 ${
                                                                    t.status === 'OCCUPIED'
                                                                        ? 'bg-rose-500'
                                                                        : t.status === 'CLEANING'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-emerald-500'
                                                                }`}
                                                            />
                                                            <span className="font-semibold">
                                                                {t.code || `T${t.number}`} ({t.capacity} seats)
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 capitalize">
                                                            {t.status.toLowerCase()}
                                                        </span>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            /* Room Service: Room Number Input */
                            <div className="relative">
                                <input
                                    type="text"
                                    list="in-house-room-options"
                                    value={roomNumber}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setRoomNumber(val);
                                        const match = inHouseGuests.find((g) => g.roomNumber === val);
                                        if (match) {
                                            setCustomerName(match.guestName);
                                        }
                                    }}
                                    placeholder="Room Number (e.g. 101)"
                                    className="w-full bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:border-primary"
                                />
                                <datalist id="in-house-room-options">
                                    {inHouseGuests.map((g) => (
                                        <option key={g.reservationId} value={g.roomNumber}>
                                            Room #{g.roomNumber} - {g.guestName}
                                        </option>
                                    ))}
                                </datalist>
                            </div>
                        )}

                        {/* Waiter Selector */}
                        <div>
                            <select
                                value={selectedWaiter}
                                onChange={(e) => setSelectedWaiter(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-800 dark:text-slate-200 cursor-pointer font-medium"
                            >
                                {waiterList.map((w) => (
                                    <option key={w} value={w}>
                                        {w}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Customer Info Row */}
                    <div className="grid grid-cols-2 gap-1.5 text-xs shrink-0 mb-2">
                        <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Guest Name"
                            className="w-full bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                        />
                        <input
                            type="tel"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            placeholder="Phone (optional)"
                            className="w-full bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-primary"
                        />
                    </div>

                    {/* Active Cart Items List */}
                    <div className="flex items-center justify-between px-1 mb-1 text-[11px] font-semibold text-slate-500">
                        <span>Ticket Items ({cart.reduce((sum, c) => sum + c.quantity, 0)})</span>
                        {cart.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearCart}
                                className="text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 text-[10px] font-bold cursor-pointer"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 border-t border-b border-slate-100 dark:border-slate-800/80 py-2">
                        {cart.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                                <ShoppingBag className="size-8 stroke-[1.5] mb-1.5 text-slate-300 dark:text-slate-600" />
                                <span className="text-xs font-semibold">Order ticket is empty</span>
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                    Click on menu items to add to order
                                </span>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div
                                    key={item.cartItemId}
                                    className="p-2 rounded-xl bg-slate-50/70 dark:bg-[#1a1a22]/70 border border-slate-200/80 dark:border-slate-800 text-xs flex flex-col gap-1"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1 truncate mr-2">
                                            <span className="font-bold text-slate-900 dark:text-white">
                                                {item.name}
                                            </span>
                                            {item.selectedVariation && (
                                                <span className="text-[10px] text-primary font-semibold ml-1">
                                                    ({item.selectedVariation.name})
                                                </span>
                                            )}
                                        </div>
                                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                                            ৳{(item.itemPrice * item.quantity).toFixed(2)}
                                        </span>
                                    </div>

                                    {/* Addons List */}
                                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                                        <div className="flex flex-wrap gap-1">
                                            {item.selectedAddons.map((a) => (
                                                <span
                                                    key={a.id}
                                                    className="px-1.5 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[9px] font-medium"
                                                >
                                                    +{a.name} (৳{a.price})
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Notes */}
                                    {item.notes && (
                                        <div className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                                            Note: {item.notes}
                                        </div>
                                    )}

                                    {/* Stepper & Delete */}
                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                                        <span className="text-[10px] text-slate-400 font-mono">
                                            @৳{item.itemPrice.toFixed(2)}
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQty(item.cartItemId, -1)}
                                                className="size-5 rounded-md bg-white dark:bg-[#252530] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                                            >
                                                <Minus className="size-3" />
                                            </button>
                                            <span className="w-5 text-center font-bold font-mono text-xs">
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleUpdateQty(item.cartItemId, 1)}
                                                className="size-5 rounded-md bg-white dark:bg-[#252530] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                                            >
                                                <Plus className="size-3" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveCartItem(item.cartItemId)}
                                                className="size-5 rounded-md text-rose-500 hover:text-rose-700 flex items-center justify-center ml-1 cursor-pointer"
                                            >
                                                <Trash2 className="size-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Pricing Summary & Discount / Tax Accordions */}
                    <div className="shrink-0 pt-2 space-y-1 text-xs">
                        {/* Subtotal */}
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <span>Subtotal</span>
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                                ৳{subtotal.toFixed(2)}
                            </span>
                        </div>

                        {/* Discount Row & Toggle */}
                        <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                            <button
                                type="button"
                                onClick={() => setIsDiscountOpen(!isDiscountOpen)}
                                className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                            >
                                <Percent className="size-3" />
                                <span>Discount {discountAmount > 0 ? `(-৳${discountAmount.toFixed(2)})` : ''}</span>
                                {isDiscountOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </button>
                            {discountAmount > 0 && (
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                                    -৳{discountAmount.toFixed(2)}
                                </span>
                            )}
                        </div>

                        {isDiscountOpen && (
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 space-y-1.5 animate-in fade-in text-xs">
                                <div className="grid grid-cols-2 gap-1.5">
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-0.5">Discount %</label>
                                        <input
                                            type="number"
                                            value={discountPercent || ''}
                                            onChange={(e) => {
                                                setDiscountPercent(Number(e.target.value));
                                                setFixedDiscount(0);
                                            }}
                                            placeholder="e.g. 10%"
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-mono text-xs"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-slate-400 block mb-0.5">Flat Amount (৳)</label>
                                        <input
                                            type="number"
                                            value={fixedDiscount || ''}
                                            onChange={(e) => {
                                                setFixedDiscount(Number(e.target.value));
                                                setDiscountPercent(0);
                                            }}
                                            placeholder="e.g. 50"
                                            className="w-full bg-white dark:bg-[#202028] border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-mono text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Statutory Tax breakdown */}
                        <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                            <button
                                type="button"
                                onClick={() => setIsTaxesOpen(!isTaxesOpen)}
                                className="hover:text-primary transition flex items-center gap-1 cursor-pointer"
                            >
                                <span>VAT ({vatRate}%) + Service ({serviceChargeRate}%)</span>
                                {isTaxesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                            </button>
                            <span className="font-mono font-medium">
                                ৳{(vatAmount + serviceChargeAmount + cityTaxAmount).toFixed(2)}
                            </span>
                        </div>
                        {isTaxesOpen && (
                            <div className="p-2 rounded-xl bg-slate-50 dark:bg-[#1a1a22] border border-slate-200 dark:border-slate-800 space-y-1 text-[11px] animate-in fade-in">
                                <div className="flex justify-between">
                                    <span>VAT ({vatRate}%):</span>
                                    <span className="font-mono font-bold">৳{vatAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Service Charge ({serviceChargeRate}%):</span>
                                    <span className="font-mono font-bold">৳{serviceChargeAmount.toFixed(2)}</span>
                                </div>
                                {cityTaxRate > 0 && (
                                    <div className="flex justify-between">
                                        <span>City Tax ({cityTaxRate}%):</span>
                                        <span className="font-mono font-bold">৳{cityTaxAmount.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Grand Total */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-200 dark:border-slate-800">
                            <span className="text-sm font-black text-slate-900 dark:text-white">Grand Total</span>
                            <span className="text-lg font-black text-primary font-mono">
                                ৳{grandTotal.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Bottom Action Toolbar */}
                    <div className="shrink-0 pt-2 space-y-1.5">
                        <div className="grid grid-cols-3 gap-1.5">
                            {/* Hold Cart */}
                            <button
                                type="button"
                                onClick={handleHoldOrder}
                                disabled={cart.length === 0}
                                className="p-2 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold text-xs hover:bg-amber-100 transition disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                                title="Hold Current Order Ticket"
                            >
                                <PauseCircle className="size-3.5" />
                                <span>Hold</span>
                            </button>

                            {/* Print KOT */}
                            <button
                                type="button"
                                onClick={handleDispatchKOT}
                                disabled={cart.length === 0}
                                className="p-2 rounded-xl border border-orange-300 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300 font-bold text-xs hover:bg-orange-100 transition disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                                title="Send Kitchen Order Ticket"
                            >
                                <ChefHat className="size-3.5" />
                                <span>KOT</span>
                            </button>

                            {/* Guest Check */}
                            <button
                                type="button"
                                onClick={handleGenerateGuestCheck}
                                disabled={cart.length === 0}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#1a1a22] text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 transition disabled:opacity-40 flex items-center justify-center gap-1 cursor-pointer"
                                title="Provisional Bill Slip"
                            >
                                <FileText className="size-3.5" />
                                <span>Check</span>
                            </button>
                        </div>

                        {/* Settle Payment Button */}
                        <button
                            type="button"
                            onClick={() => setPaymentModalOpen(true)}
                            disabled={cart.length === 0 || isPlacingOrder}
                            className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-extrabold text-sm shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <Wallet className="size-4" />
                            <span>Settle Payment ৳{grandTotal.toFixed(2)}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ALL 10 INTEGRATED POS MODALS */}
            {customizingItem && (
                <ItemCustomizationModal
                    isOpen={Boolean(customizingItem)}
                    onClose={() => setCustomizingItem(null)}
                    item={customizingItem}
                    availableAddons={allAddons}
                    onAddToCart={(configuredItem) => {
                        handleAddToCart(configuredItem);
                        setCustomizingItem(null);
                        showToast(`Added ${configuredItem.name} to cart`, 'success');
                    }}
                />
            )}

            {tableFloorModalOpen && (
                <TableFloorModal
                    isOpen={tableFloorModalOpen}
                    onClose={() => setTableFloorModalOpen(false)}
                    tables={tables}
                    selectedTableId={selectedTableId}
                    onSelectTable={(tableId) => {
                        setSelectedTableId(tableId);
                        setTableFloorModalOpen(false);
                    }}
                />
            )}

            {holdModalOpen && (
                <HoldOrdersModal
                    isOpen={holdModalOpen}
                    onClose={() => setHoldModalOpen(false)}
                    heldOrders={heldOrders}
                    onResumeOrder={handleResumeHeldOrder}
                    onDeleteOrder={handleDeleteHeldOrder}
                />
            )}

            {kotModalOpen && kotTicketData && (
                <KotModal
                    isOpen={kotModalOpen}
                    onClose={() => setKotModalOpen(false)}
                    ticket={kotTicketData}
                    onReprint={() => {
                        fetch(`/api/pos/kots/${kotTicketData.orderId}/reprint`, { method: 'POST' }).catch(() => {});
                    }}
                />
            )}

            {guestCheckModalOpen && guestCheckData && (
                <GuestCheckModal
                    isOpen={guestCheckModalOpen}
                    onClose={() => setGuestCheckModalOpen(false)}
                    data={guestCheckData}
                />
            )}

            {paymentModalOpen && (
                <PaymentModal
                    isOpen={paymentModalOpen}
                    onClose={() => setPaymentModalOpen(false)}
                    total={grandTotal}
                    subtotal={subtotal}
                    discountAmount={discountAmount}
                    vatAmount={vatAmount}
                    serviceChargeAmount={serviceChargeAmount}
                    cityTaxAmount={cityTaxAmount}
                    customerName={customerName}
                    customerPhone={customerPhone}
                    selectedTable={selectedTableObj?.code || `Table ${selectedTableObj?.number || 'Counter'}`}
                    orderType={orderType}
                    isSubmitting={isPlacingOrder}
                    outletId={selectedOutletId}
                    onOpenSplitBill={() => {
                        setPaymentModalOpen(false);
                        setSplitModalOpen(true);
                    }}
                    onConfirmPayment={handleConfirmPayment}
                />
            )}

            {splitModalOpen && (
                <SplitBillModal
                    isOpen={splitModalOpen}
                    onClose={() => setSplitModalOpen(false)}
                    total={grandTotal}
                    items={cart}
                    onConfirmSplit={(splits) => {
                        setSplitModalOpen(false);
                        handleConfirmPayment({
                            method: 'Split',
                            category: 'MULTI_TENDER',
                            tendered: grandTotal,
                            change: 0,
                            customerName,
                            customerPhone,
                            autoPrint: true,
                            payments: splits.map((s) => ({
                                method: s.paymentMethod,
                                amount: s.amount,
                                customerName: s.customerName
                            }))
                        });
                    }}
                />
            )}

            {mergeModalOpen && (
                <MergeOrderModal
                    isOpen={mergeModalOpen}
                    currentOrder={{
                        id: 'active-cart-ticket',
                        orderNumber: 1001,
                        customerName,
                        totalAmount: grandTotal,
                        tableCode: selectedTableObj?.code,
                        items: cart
                    }}
                    activeOrders={[]}
                    onClose={() => setMergeModalOpen(false)}
                    onMergeSuccess={(msg) => {
                        showToast(msg, 'success');
                        setMergeModalOpen(false);
                    }}
                />
            )}

            {receiptModalOpen && receiptData && (
                <ReceiptModal
                    isOpen={receiptModalOpen}
                    onClose={() => setReceiptModalOpen(false)}
                    receipt={receiptData}
                />
            )}

            {cashRegisterModalOpen && (
                <CashRegisterModal
                    isOpen={cashRegisterModalOpen}
                    onClose={() => setCashRegisterModalOpen(false)}
                    session={cashSession}
                    stats={sessionStats}
                    outletId={selectedOutletId}
                    onUpdateSession={() => fetchOutletData()}
                />
            )}
        </div>
    );
};
