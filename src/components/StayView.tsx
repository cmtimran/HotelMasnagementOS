import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar as CalendarIcon,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Building2,
    BedDouble,
    X,
    CheckCircle2
} from 'lucide-react';
import QuickReservationModal from './modals/QuickReservationModal';
import AddReservationModal from './modals/AddReservationModal';
import AmendStayModal, { type AmendBookingData } from './modals/AmendStayModal';
import ReservationDetailsDrawer from './modals/ReservationDetailsDrawer';
import RoomMoveModal, { type RoomMoveData } from './modals/RoomMoveModal';

interface TimelineBooking {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomNumber: string;
    startIndex: number;
    endIndex: number;
    status: 'arrived' | 'stayover' | 'confirmed' | 'hold' | 'due-out' | 'checked-out' | 'day-use' | 'out-of-order';
    // 4 Key Indicators requested by User:
    isGroupOwner?: boolean;      // 1. Group Owner (👑)
    isGroupBooking?: boolean;    // 2. Group Booking (👥)
    isPaymentDue?: boolean;      // 3. Payment Due ($)
    isVipOrSingleLady?: boolean; // 4. VIP or Single Lady (⭐)
    indicator?: string;
}

export interface UnassignedBooking {
    id: string;
    reservationNumber: string;
    guestName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    nights: number;
    totalRooms: number;
    source: string;
    totalAmount: number;
    status: 'unassigned';
}

const INITIAL_UNASSIGNED_STAYVIEW: UnassignedBooking[] = [
    {
        id: 'un-1',
        reservationNumber: 'RES-1181-2026',
        guestName: 'Imran',
        roomType: 'Winter Rate Plan (Deluxe Double)',
        checkIn: '2026-07-01',
        checkOut: '2026-07-04',
        nights: 3,
        totalRooms: 1,
        source: 'Direct Website',
        totalAmount: 10500,
        status: 'unassigned'
    },
    {
        id: 'un-2',
        reservationNumber: 'RES-1092-2026',
        guestName: 'Tanvir Hasan',
        roomType: 'Superior King',
        checkIn: '2026-07-02',
        checkOut: '2026-07-05',
        nights: 3,
        totalRooms: 1,
        source: 'Booking.com',
        totalAmount: 13500,
        status: 'unassigned'
    },
    {
        id: 'un-3',
        reservationNumber: 'RES-1145-2026',
        guestName: 'Sadia Rahman',
        roomType: 'Executive Suite',
        checkIn: '2026-07-01',
        checkOut: '2026-07-03',
        nights: 2,
        totalRooms: 1,
        source: 'Agoda YCS',
        totalAmount: 16000,
        status: 'unassigned'
    },
    {
        id: 'un-4',
        reservationNumber: 'RES-1204-2026',
        guestName: 'Apex Tech Solutions',
        roomType: 'Deluxe Double',
        checkIn: '2026-07-03',
        checkOut: '2026-07-06',
        nights: 3,
        totalRooms: 1,
        source: 'Corporate Account',
        totalAmount: 12000,
        status: 'unassigned'
    }
];

export const StayView: React.FC = () => {
    // Current date state - aligned with PMS system operating date
    const [startDate, setStartDate] = useState<string>(() => {
        const sys = localStorage.getItem('hotel_system_date');
        if (sys) {
            const d = new Date(sys);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        }
        return '2026-07-01';
    });
    const [daysWindow, setDaysWindow] = useState<number>(15);

    // Tree Expansion State
    const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
        'b-1': true,
        'f-1': true,
        'f-2': true,
        'b-2': true,
        'f-3': true
    });

    const toggleNode = (nodeId: string) => {
        setExpandedNodes(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
    };

    // Information Popover (Legend) State
    const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

    // Modals & Selection
    const [isAddReservationOpen, setIsAddReservationOpen] = useState(false);
    const [isQuickReservationOpen, setIsQuickReservationOpen] = useState(false);
    const [selectedRange, setSelectedRange] = useState<{
        room: string;
        startIndex: number;
        endIndex: number;
        rect?: DOMRect;
    } | null>(null);

    // Drag-to-select range state
    const [dragState, setDragState] = useState<{
        room: string;
        startIndex: number;
        endIndex: number;
        startRect?: DOMRect;
        endRect?: DOMRect;
    } | null>(null);

    // =========================================================================
    // RESERVATION / STAY DETAILS DRAWER (NORMAL CLICK) & AMEND STAY MODAL & ROOM MOVE
    // =========================================================================
    const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
    const [detailsBookingData, setDetailsBookingData] = useState<AmendBookingData | null>(null);

    // Extend / Shorten Drag State
    const [extendDrag, setExtendDrag] = useState<{
        booking: TimelineBooking;
        originalEndIndex: number;
        currentEndIndex: number;
        hasMoved?: boolean;
    } | null>(null);

    const [isAmendStayOpen, setIsAmendStayOpen] = useState(false);
    const [amendBookingData, setAmendBookingData] = useState<{
        booking: AmendBookingData;
        targetDeparture: string;
        targetNights: number;
    } | null>(null);

    // Room Move Drawer State (Drag-and-Drop to move reservation)
    const [isRoomMoveOpen, setIsRoomMoveOpen] = useState(false);
    const [roomMoveData, setRoomMoveData] = useState<RoomMoveData | null>(null);

    // Move Reservation Drag State
    const [moveDrag, setMoveDrag] = useState<{
        booking: TimelineBooking;
        startX: number;
        startY: number;
        currentX: number;
        currentY: number;
        isDragging: boolean;
        targetRoomNumber: string;
        targetStartIndex: number;
        targetEndIndex: number;
    } | null>(null);

    // =========================================================================
    // ASSIGN ROOMS DRAWER STATE (SLIM & COMPACT)
    // =========================================================================
    const [isAssignRoomsOpen, setIsAssignRoomsOpen] = useState(false);
    const [modalDateStartIndex, setModalDateStartIndex] = useState(0);
    const [selectedModalDateIndex, setSelectedModalDateIndex] = useState(0);
    const [expandedAccordions, setExpandedAccordions] = useState<Record<string, boolean>>({
        'un-1': true,
        'un-2': true,
        'un-3': true,
        'un-4': true
    });
    const [activeAssigningId, setActiveAssigningId] = useState<string | null>(null);
    const [selectedRoomNumber, setSelectedRoomNumber] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const toggleAccordion = (id: string) => {
        setExpandedAccordions(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Hydrate Unassigned Bookings
    const [unassignedList, setUnassignedList] = useState<UnassignedBooking[]>(() => {
        const saved = localStorage.getItem('hotel_unassigned_v2');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch (e) {
                // fall through
            }
        }
        return INITIAL_UNASSIGNED_STAYVIEW;
    });

    useEffect(() => {
        localStorage.setItem('hotel_unassigned_v2', JSON.stringify(unassignedList));
    }, [unassignedList]);

    // Generate days array based on startDate and daysWindow
    const days = useMemo(() => {
        const list = [];
        const base = new Date(startDate);
        const todayStr = new Date().toISOString().split('T')[0];

        for (let i = 0; i < daysWindow; i++) {
            const current = new Date(base);
            current.setDate(base.getDate() + i);
            const iso = current.toISOString().split('T')[0];
            const dayOfWeek = current.toLocaleDateString('en-US', { weekday: 'short' });
            const dayNum = current.getDate();
            const isWeekend = current.getDay() === 5 || current.getDay() === 6; // Friday or Saturday
            const isToday = iso === todayStr || (base.getFullYear() === 2026 && current.getDate() === 1 && current.getMonth() === 6);

            list.push({
                index: i,
                date: iso,
                dayName: dayOfWeek,
                num: dayNum,
                isWeekend,
                isToday,
                monthShort: current.toLocaleDateString('en-US', { month: 'short' })
            });
        }
        return list;
    }, [startDate, daysWindow]);

    // Initial Rooms Structure
    const roomTree = useMemo(() => [
        {
            id: 'b-1',
            name: 'Building 1 (Main Tower)',
            floors: [
                {
                    id: 'f-1',
                    name: 'Floor 1 (Executive)',
                    rooms: [
                        { id: 'r-101', roomNumber: '101', type: 'Deluxe Double', floor: '1', building: 'Building 1', status: 'clean' },
                        { id: 'r-102', roomNumber: '102', type: 'Deluxe Double', floor: '1', building: 'Building 1', status: 'clean' },
                        { id: 'r-103', roomNumber: '103', type: 'Superior King', floor: '1', building: 'Building 1', status: 'inspected' },
                        { id: 'r-104', roomNumber: '104', type: 'Executive Suite', floor: '1', building: 'Building 1', status: 'clean' }
                    ]
                },
                {
                    id: 'f-2',
                    name: 'Floor 2 (Standard & Deluxe)',
                    rooms: [
                        { id: 'r-201', roomNumber: '201', type: 'Deluxe Double', floor: '2', building: 'Building 1', status: 'clean' },
                        { id: 'r-202', roomNumber: '202', type: 'Superior King', floor: '2', building: 'Building 1', status: 'dirty' },
                        { id: 'r-203', roomNumber: '203', type: 'Executive Suite', floor: '2', building: 'Building 1', status: 'clean' }
                    ]
                }
            ]
        },
        {
            id: 'b-2',
            name: 'Building 2 (Annex & Suites)',
            floors: [
                {
                    id: 'f-3',
                    name: 'Floor 5 (Presidential & Deluxe)',
                    rooms: [
                        { id: 'r-501', roomNumber: '501', type: 'Presidential Suite', floor: '5', building: 'Building 2', status: 'clean' },
                        { id: 'r-505', roomNumber: '505', type: 'Winter Rate Plan (Deluxe)', floor: '5', building: 'Building 2', status: 'clean' },
                        { id: 'r-507', roomNumber: '507', type: 'Superior King', floor: '5', building: 'Building 2', status: 'clean' },
                        { id: 'r-508', roomNumber: '508', type: 'Superior King', floor: '5', building: 'Building 2', status: 'clean' },
                        { id: 'r-509', roomNumber: '509', type: 'Deluxe Suite', floor: '5', building: 'Building 2', status: 'clean' }
                    ]
                }
            ]
        }
    ], []);

    // Total rooms count across entire hotel
    const totalRoomsCount = useMemo(() => {
        return roomTree.reduce((acc, b) => acc + b.floors.reduce((facc, f) => facc + f.rooms.length, 0), 0);
    }, [roomTree]);

    // Flattened room list for assignment dropdowns
    const allRooms = useMemo(() => {
        const list: { roomNumber: string; type: string; floor: string; building: string; status: string }[] = [];
        roomTree.forEach(b => {
            b.floors.forEach(f => {
                f.rooms.forEach(r => {
                    list.push({ ...r, floor: f.name, building: b.name });
                });
            });
        });
        return list;
    }, [roomTree]);

    // Seed bookings on the timeline with 4 key indicators matching screenshot media_1792539010302_6a232440.png
    const [bookings, setBookings] = useState<TimelineBooking[]>([
        {
            id: 'b1',
            reservationNumber: 'RES-109281',
            guestName: 'Tonmoy',
            roomNumber: '101',
            startIndex: 1,
            endIndex: 3,
            status: 'arrived',
            isGroupBooking: true,
            isPaymentDue: true
        },
        {
            id: 'b2',
            reservationNumber: 'RES-109282',
            guestName: 'S. Chowdhury',
            roomNumber: '103',
            startIndex: 0,
            endIndex: 2,
            status: 'arrived',
            isGroupOwner: true
        },
        {
            id: 'b3',
            reservationNumber: 'RES-109283',
            guestName: 'T. Hasan (Hold)',
            roomNumber: '104',
            startIndex: 3,
            endIndex: 6,
            status: 'hold',
            isPaymentDue: true
        },
        {
            id: 'b4',
            reservationNumber: 'RES-109284',
            guestName: 'Karim',
            roomNumber: '201',
            startIndex: 1,
            endIndex: 3,
            status: 'arrived',
            isGroupBooking: true,
            isPaymentDue: true,
            isVipOrSingleLady: true
        },
        {
            id: 'b5',
            reservationNumber: 'RES-109285',
            guestName: 'BNNN',
            roomNumber: '202',
            startIndex: 1,
            endIndex: 4,
            status: 'arrived',
            isGroupOwner: true,
            isPaymentDue: true
        },
        {
            id: 'b6',
            reservationNumber: 'RES-109286',
            guestName: 'Mokter',
            roomNumber: '203',
            startIndex: 2,
            endIndex: 5,
            status: 'confirmed',
            isGroupOwner: true,
            isGroupBooking: true,
            isPaymentDue: true
        },
        {
            id: 'b7',
            reservationNumber: 'RES-109287',
            guestName: 'Imran (VIP Leader)',
            roomNumber: '501',
            startIndex: 1,
            endIndex: 7,
            status: 'confirmed',
            isGroupOwner: true,
            isGroupBooking: true,
            isPaymentDue: true,
            isVipOrSingleLady: true
        },
        {
            id: 'b-rokib',
            reservationNumber: 'RES-1171-2026-01',
            guestName: 'Rokib vai',
            roomNumber: '505',
            startIndex: 3, // 2026-07-04
            endIndex: 5,   // 2026-07-06 (2 nights)
            status: 'confirmed',
            isPaymentDue: true
        }
    ]);

    // Check available rooms for an unassigned reservation during its stay dates
    const getAvailableRoomsForBooking = (booking: UnassignedBooking) => {
        const bStart = days.findIndex(d => d.date === booking.checkIn);
        const bEnd = days.findIndex(d => d.date === booking.checkOut);
        const startIdx = bStart >= 0 ? bStart : 0;
        const endIdx = bEnd >= 0 ? bEnd : startIdx + booking.nights;

        return allRooms.filter(room => {
            const isOccupied = bookings.some(b => {
                if (b.roomNumber !== room.roomNumber) return false;
                return b.startIndex < endIdx && b.endIndex > startIdx;
            });
            return !isOccupied;
        });
    };

    // Perform room allocation
    const handleConfirmAssign = (booking: UnassignedBooking) => {
        const available = getAvailableRoomsForBooking(booking);
        const targetRoom = selectedRoomNumber || available[0]?.roomNumber || '102';

        const bStart = days.findIndex(d => d.date === booking.checkIn);
        const bEnd = days.findIndex(d => d.date === booking.checkOut);
        const startIdx = bStart >= 0 ? bStart : 0;
        const endIdx = bEnd >= 0 ? bEnd : Math.min(days.length - 1, startIdx + booking.nights);

        const newBooking: TimelineBooking = {
            id: `b-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            reservationNumber: booking.reservationNumber,
            guestName: booking.guestName,
            roomNumber: targetRoom,
            startIndex: startIdx,
            endIndex: endIdx,
            status: 'confirmed',
            isPaymentDue: false
        };

        setBookings(prev => [...prev, newBooking]);
        setUnassignedList(prev => prev.filter(u => u.id !== booking.id));
        setActiveAssigningId(null);
        showToast(`Room ${targetRoom} successfully assigned to ${booking.guestName} (${booking.reservationNumber})!`);
    };

    // Date carousel days for the drawer
    const modalDays = days;
    const selectedDateObj = modalDays[selectedModalDateIndex] || modalDays[0];

    // Filter unassigned reservations for selected date in carousel
    const unassignedForSelectedDate = useMemo(() => {
        if (!selectedDateObj) return [];
        return unassignedList.filter(u => u.checkIn === selectedDateObj.date);
    }, [unassignedList, selectedDateObj]);

    // Date formatting helpers
    const formatDayNum = (dateStr: string) => {
        if (!dateStr) return '01';
        const parts = dateStr.split('-');
        if (parts.length >= 3) return parts[2];
        const d = new Date(dateStr);
        return String(d.getDate()).padStart(2, '0');
    };

    const formatMonth = (dateStr: string) => {
        if (!dateStr) return 'Jul';
        const parts = dateStr.split('-');
        if (parts.length >= 2) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mIdx = parseInt(parts[1], 10) - 1;
            if (mIdx >= 0 && mIdx < 12) return months[mIdx];
        }
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-US', { month: 'short' });
    };

    // Today counts
    const todayAssignedCount = useMemo(() => {
        const todayIndex = days.findIndex(d => d.isToday);
        const targetIdx = todayIndex >= 0 ? todayIndex : 0;
        return bookings.filter(b => targetIdx >= b.startIndex && targetIdx <= b.endIndex).length;
    }, [bookings, days]);

    const todayAvailableCount = Math.max(0, totalRoomsCount - todayAssignedCount);

    // Open Single-Column Reservation Details Drawer on Normal Click (matching media_1792541210487_8b5ecb8d.png)
    const handleOpenDetailsDrawer = (booking: TimelineBooking) => {
        const arrivalDateStr = days[booking.startIndex]?.date || '2026-07-04';
        const currentDepDateStr = days[booking.endIndex]?.date || '2026-07-06';
        const start = new Date(arrivalDateStr);
        const end = new Date(currentDepDateStr);
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const currentNights = Math.max(1, diffDays > 0 ? diffDays : booking.endIndex - booking.startIndex);

        setDetailsBookingData({
            id: booking.id,
            reservationNumber: booking.reservationNumber,
            guestName: booking.guestName,
            roomNumber: booking.roomNumber,
            roomType: 'Winter Rate Plan',
            ratePlan: 'Summer Vacation',
            arrivalDate: arrivalDateStr,
            departureDate: currentDepDateStr,
            nights: currentNights,
            avgDailyRate: 3000,
            status: booking.status.toUpperCase()
        });
        setIsDetailsDrawerOpen(true);
    };

    // Open Amend Stay Modal on Drag-to-Extend or Resize Handle Click (matching media_1792541010797_b7d6f151.png)
    const handleOpenAmendModal = (booking: TimelineBooking, customTargetDep?: string, customTargetNights?: number) => {
        const arrivalDateStr = days[booking.startIndex]?.date || '2026-07-04';
        const currentDepDateStr = days[booking.endIndex]?.date || '2026-07-06';
        const start = new Date(arrivalDateStr);
        const end = new Date(currentDepDateStr);
        const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const currentNights = Math.max(1, diffDays > 0 ? diffDays : booking.endIndex - booking.startIndex);

        let targetDeparture = customTargetDep;
        let targetNights = customTargetNights;

        if (!targetDeparture) {
            const d = new Date(currentDepDateStr);
            d.setDate(d.getDate() + 1);
            targetDeparture = d.toISOString().split('T')[0];
            targetNights = currentNights + 1;
        }

        setAmendBookingData({
            booking: {
                id: booking.id,
                reservationNumber: booking.reservationNumber,
                guestName: booking.guestName,
                roomNumber: booking.roomNumber,
                roomType: 'Winter Rate Plan',
                ratePlan: 'Summer Vacation',
                arrivalDate: arrivalDateStr,
                departureDate: currentDepDateStr,
                nights: currentNights,
                avgDailyRate: 3000,
                status: booking.status.toUpperCase()
            },
            targetDeparture,
            targetNights: targetNights || currentNights + 1
        });
        setIsAmendStayOpen(true);
    };

    const handleSaveAmendStay = (bookingId: string, newDeparture: string, newNights: number) => {
        setBookings(prev => prev.map(b => {
            if (b.id !== bookingId) return b;
            const depIndex = days.findIndex(d => d.date === newDeparture);
            const calculatedEnd = depIndex >= 0 ? depIndex : b.startIndex + newNights - 1;
            return {
                ...b,
                endIndex: calculatedEnd
            };
        }));
        const targetB = bookings.find(b => b.id === bookingId);
        showToast(`Reservation ${targetB?.reservationNumber || ''} (${targetB?.guestName || ''}) updated to ${newDeparture} (${newNights} Nights)!`);
    };

    // Save Room Move
    const handleSaveRoomMove = (bookingId: string, newRoomNumber: string, newFromDate: string, newToDate: string) => {
        const startIdx = days.findIndex(d => d.date === newFromDate);
        const endIdx = days.findIndex(d => d.date === newToDate);
        setBookings(prev => prev.map(b => {
            if (b.id !== bookingId) return b;
            const s = startIdx >= 0 ? startIdx : b.startIndex;
            const e = endIdx >= 0 ? endIdx : s + (b.endIndex - b.startIndex);
            return {
                ...b,
                roomNumber: newRoomNumber,
                startIndex: s,
                endIndex: e
            };
        }));
        const targetB = bookings.find(b => b.id === bookingId);
        showToast(`Reservation ${targetB?.reservationNumber || ''} (${targetB?.guestName || ''}) moved to Room A-(${newRoomNumber}) (${newFromDate} to ${newToDate})!`);
    };

    // Global mousemove and mouseup listeners for drag-to-select, extend/shorten drag, and move drag
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (moveDrag) {
                const dist = Math.hypot(e.clientX - moveDrag.startX, e.clientY - moveDrag.startY);
                if (dist > 4 && !moveDrag.isDragging) {
                    setMoveDrag(prev => prev ? ({ ...prev, isDragging: true }) : null);
                }
                if (moveDrag.isDragging) {
                    setMoveDrag(prev => prev ? ({ ...prev, currentX: e.clientX, currentY: e.clientY }) : null);
                }
            }
        };

        const handleMouseUp = () => {
            if (dragState) {
                const start = Math.min(dragState.startIndex, dragState.endIndex);
                const end = Math.max(dragState.startIndex, dragState.endIndex);

                let mergedRect = dragState.startRect;
                if (dragState.startRect && dragState.endRect) {
                    const left = Math.min(dragState.startRect.left, dragState.endRect.left);
                    const right = Math.max(dragState.startRect.right, dragState.endRect.right);
                    mergedRect = {
                        ...dragState.startRect,
                        left,
                        right,
                        width: right - left,
                        x: left
                    } as DOMRect;
                }

                setSelectedRange({
                    room: dragState.room,
                    startIndex: start,
                    endIndex: end,
                    rect: mergedRect || dragState.startRect
                });
                setDragState(null);
                // Launch Quick Reservation Modal upon drag selection release
                setIsQuickReservationOpen(true);
            }

            // Handle Extend OR Shorten Stay Drag Release
            if (extendDrag) {
                const b = extendDrag.booking;
                const minCol = b.startIndex + 1;
                const targetCol = Math.max(minCol, extendDrag.currentEndIndex);
                const arrivalDateStr = days[b.startIndex]?.date || '2026-07-04';
                const targetDepDateStr = days[targetCol]?.date || days[b.endIndex]?.date || '2026-07-06';
                const start = new Date(arrivalDateStr);
                const end = new Date(targetDepDateStr);
                const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                const targetNights = Math.max(1, diffDays > 0 ? diffDays : targetCol - b.startIndex);

                setAmendBookingData({
                    booking: {
                        id: b.id,
                        reservationNumber: b.reservationNumber,
                        guestName: b.guestName,
                        roomNumber: b.roomNumber,
                        roomType: 'Winter Rate Plan',
                        ratePlan: 'Summer Vacation',
                        arrivalDate: arrivalDateStr,
                        departureDate: days[b.endIndex]?.date || '2026-07-06',
                        nights: Math.max(1, b.endIndex - b.startIndex),
                        avgDailyRate: 3000,
                        status: b.status.toUpperCase()
                    },
                    targetDeparture: targetDepDateStr,
                    targetNights
                });
                setIsAmendStayOpen(true);
                setExtendDrag(null);
            }

            // Handle Move Reservation Drag Release
            if (moveDrag) {
                if (moveDrag.isDragging) {
                    // User dragged and dropped to move -> Open Room Move Modal (matching media_1792541566827_b05dc667.png)!
                    const b = moveDrag.booking;
                    const targetFromDate = days[moveDrag.targetStartIndex]?.date || days[b.startIndex]?.date || '2026-07-04';
                    const targetToDate = days[moveDrag.targetEndIndex]?.date || days[b.endIndex]?.date || '2026-07-06';

                    setRoomMoveData({
                        booking: {
                            id: b.id,
                            reservationNumber: b.reservationNumber,
                            guestName: b.guestName,
                            roomNumber: b.roomNumber,
                            roomType: 'Winter Rate Plan',
                            ratePlan: 'Summer Vacation',
                            arrivalDate: days[b.startIndex]?.date || '2026-07-04',
                            departureDate: days[b.endIndex]?.date || '2026-07-06',
                            nights: Math.max(1, b.endIndex - b.startIndex),
                            avgDailyRate: 3000,
                            status: b.status.toUpperCase()
                        },
                        targetRoomNumber: moveDrag.targetRoomNumber,
                        targetFromDate,
                        targetToDate,
                        targetRoomType: 'Winter Rate Plan',
                        targetRateType: 'Summer Vacation'
                    });
                    setIsRoomMoveOpen(true);
                } else {
                    // Simple normal click without drag -> Open Reservation Details Drawer (matching media_1792541210487_8b5ecb8d.png)!
                    handleOpenDetailsDrawer(moveDrag.booking);
                }
                setMoveDrag(null);
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragState, extendDrag, moveDrag, days]);

    const handleDateJump = (direction: 'prev' | 'next' | 'today') => {
        if (direction === 'today') {
            setStartDate('2026-07-01');
            return;
        }
        const cur = new Date(startDate);
        const shift = direction === 'next' ? 7 : -7;
        cur.setDate(cur.getDate() + shift);
        setStartDate(cur.toISOString().split('T')[0]);
    };

    // Exact status colors matching hotel-management Legend
    const getStatusBadgeColor = (status: TimelineBooking['status']) => {
        switch (status) {
            case 'arrived': return 'bg-[#4d79ff] text-white';
            case 'stayover': return 'bg-[#668cff] text-white';
            case 'checked-out': return 'bg-[#2d8659] text-white';
            case 'due-out': return 'bg-[#ffb31a] text-white';
            case 'confirmed': return 'bg-[#00cc00] text-white';
            case 'hold': return 'bg-[#b366ff] text-white';
            case 'day-use': return 'bg-[#d9b326] text-white';
            case 'out-of-order': return 'bg-[#cc0000] text-white';
            default: return 'bg-[#4d79ff] text-white';
        }
    };

    return (
        <div className="p-2 space-y-1.5 max-w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-150 select-none relative">
            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 z-[9999] bg-gray-900 text-white px-3.5 py-2 rounded-lg shadow-xl border border-gray-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
                    <span>{toastMessage}</span>
                </div>
            )}

            {/* Header Controls Bar */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs px-2.5 py-1.5 flex items-center justify-between gap-2 flex-shrink-0">
                {/* Left Title - Clean without extra badges as requested */}
                <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded bg-[#1e3a8a] text-white flex items-center justify-center shadow-2xs flex-shrink-0">
                        <CalendarIcon size={13} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                        <h1 className="text-xs font-bold text-gray-900 tracking-tight whitespace-nowrap">
                            Stay View
                        </h1>
                    </div>
                </div>

                {/* Date Controls & Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Navigation */}
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded p-0.5 text-xs h-7">
                        <button
                            type="button"
                            onClick={() => handleDateJump('prev')}
                            className="px-1.5 py-0.5 hover:bg-white hover:shadow-2xs rounded text-gray-600 transition-colors cursor-pointer"
                            title="Previous 7 Days"
                        >
                            <ChevronLeft size={13} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('today')}
                            className="px-2 py-0.5 font-bold text-[11px] text-[#1e3a8a] hover:bg-white hover:shadow-2xs rounded transition-colors cursor-pointer"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDateJump('next')}
                            className="px-1.5 py-0.5 hover:bg-white hover:shadow-2xs rounded text-gray-600 transition-colors cursor-pointer"
                            title="Next 7 Days"
                        >
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    {/* From Date Picker */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-2 text-[11px] h-7">
                        <span className="text-gray-400 font-medium">From:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="border-none p-0 text-[11px] font-semibold text-gray-800 outline-none cursor-pointer bg-transparent"
                        />
                    </div>

                    {/* Window Selector */}
                    <select
                        value={daysWindow}
                        onChange={(e) => setDaysWindow(Number(e.target.value))}
                        className="h-7 px-2 border border-gray-200 rounded text-[11px] font-semibold text-gray-700 bg-white hover:border-gray-300 outline-none cursor-pointer"
                    >
                        <option value={7}>7 Days</option>
                        <option value={15}>15 Days</option>
                        <option value={30}>30 Days</option>
                    </select>

                    {/* Status Legend & Counts */}
                    <div className="flex items-center gap-1">
                        {/* Legend Info Popover Button */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsInfoPopoverOpen(!isInfoPopoverOpen)}
                                className={`h-7 px-2 rounded border text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    isInfoPopoverOpen ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                }`}
                                title="Click to view Status & Indicator Legend"
                            >
                                <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black">i</span>
                                <span className="hidden sm:inline">Info</span>
                            </button>

                            {/* Legend Popover Box */}
                            {isInfoPopoverOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsInfoPopoverOpen(false)}></div>
                                    <div className="absolute right-0 top-8 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-3 text-xs animate-in fade-in zoom-in-95">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 font-bold text-gray-800 text-[11.5px]">
                                            <span>Legend &amp; Color Coding</span>
                                            <button onClick={() => setIsInfoPopoverOpen(false)} className="text-gray-400 hover:text-gray-600">
                                                <X size={13} />
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {/* Floor Counters Info */}
                                            <div>
                                                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">Floor Daily Counters [1][3][1]</div>
                                                <div className="grid grid-cols-3 gap-1 text-[10px]">
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#00cc00] text-white flex items-center justify-center font-bold text-[8.5px]">A</span>
                                                        <span className="text-gray-700">Available</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#1e3a8a] text-white flex items-center justify-center font-bold text-[8.5px]">B</span>
                                                        <span className="text-gray-700">Assigned</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="w-3.5 h-3.5 rounded-xs bg-[#ff3333] text-white flex items-center justify-center font-bold text-[8.5px]">U</span>
                                                        <span className="text-gray-700">Unassigned</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Booking Status Colors */}
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">Reservation Status</div>
                                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#4d79ff] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Arrived</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#668cff] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Stayover</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#2d8659] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Checked Out</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#ffb31a] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Due Out</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#00cc00] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Confirmed</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#b366ff] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Hold</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#d9b326] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Day Use</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-3 h-3 rounded-xs bg-[#cc0000] inline-block shadow-2xs"></span>
                                                        <span className="text-gray-700">Out of Order</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Booking Floating Indicators */}
                                            <div className="pt-2 border-t border-gray-100">
                                                <div className="text-[10px] font-bold uppercase text-gray-400 mb-1.5">4 Booking Floating Icons</div>
                                                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-amber-400 text-gray-900 border border-white flex items-center justify-center text-[8.5px]">👑</span>
                                                        <span className="text-gray-700">Group Owner</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-rose-500 text-white border border-white flex items-center justify-center text-[8px]">👥</span>
                                                        <span className="text-gray-700">Group Booking</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-red-600 text-white border border-white flex items-center justify-center text-[9px] font-black">$</span>
                                                        <span className="text-gray-700">Payment Due</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-4 h-4 rounded-full bg-amber-500 text-white border border-white flex items-center justify-center text-[8.5px]">⭐</span>
                                                        <span className="text-gray-700">VIP / Single Lady</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Available Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold h-7" title="Today Available Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{todayAvailableCount}</span>
                            <span className="hidden md:inline font-medium text-emerald-600">Avail</span>
                        </div>

                        {/* Assigned Badge */}
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold h-7" title="Today Assigned Rooms">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>{todayAssignedCount}</span>
                            <span className="hidden md:inline font-medium text-amber-600">Assigned</span>
                        </div>

                        {/* Unassigned Badge (Clickable to open Assign Rooms drawer) */}
                        <button
                            type="button"
                            onClick={() => setIsAssignRoomsOpen(true)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 text-cyan-800 text-[10px] font-bold h-7 cursor-pointer transition-colors"
                            title="Click to view Unassigned Reservations"
                        >
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                            <span>{unassignedList.length}</span>
                            <span className="hidden lg:inline font-medium text-cyan-600">Unassigned</span>
                        </button>
                    </div>

                    {/* ASSIGN ROOMS BUTTON */}
                    <button
                        type="button"
                        onClick={() => setIsAssignRoomsOpen(true)}
                        className="h-7 px-2.5 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[11px] font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ml-1 active:scale-[0.98]"
                        title="Open Unassigned Reservations Drawer"
                    >
                        <BedDouble size={13} />
                        <span>Assign Rooms</span>
                        {unassignedList.length > 0 && (
                            <span className="px-1.5 py-0.2 bg-amber-400 text-gray-900 font-extrabold text-[9.5px] rounded-full shadow-2xs">
                                {unassignedList.length}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Stay View Interactive Timeline Board */}
            <div className="bg-white rounded-lg border border-gray-200/80 shadow-2xs overflow-hidden text-xs flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1 min-h-0 relative select-none">
                    <div className="w-full min-w-full">
                        {/* Header Row: Room Info Column + Date Columns */}
                        <div className="flex border-b border-gray-200 bg-gray-50/95 font-bold sticky top-0 z-30 shadow-xs">
                            {/* Room Info Header */}
                            <div className="w-44 px-2 py-1 border-r border-gray-200 flex items-center justify-between text-gray-700 text-[11px] sticky left-0 z-40 bg-gray-100 flex-shrink-0">
                                <span>Rooms &amp; Types</span>
                                <span className="text-[9px] text-gray-400 font-mono">Tree</span>
                            </div>

                            {/* Date Columns with exact Legend Colors */}
                            <div className="flex flex-1 min-w-max">
                                {days.map((d) => (
                                    <div
                                        key={d.index}
                                        className={`w-16 px-1 py-0.5 border-r border-gray-200 text-center flex-shrink-0 transition-colors ${
                                            d.isToday
                                                ? 'bg-blue-100/90 text-blue-900 font-black border-b-2 border-b-blue-600'
                                                : d.isWeekend
                                                    ? 'bg-red-100/80 text-red-900 font-semibold'
                                                    : 'bg-gray-50/90 text-gray-700 font-medium'
                                        }`}
                                    >
                                        <div className="text-[8.5px] uppercase tracking-wider font-semibold opacity-80 leading-none">
                                            {d.dayName}
                                        </div>
                                        <div className="text-[12px] font-bold leading-tight mt-0.5">
                                            {d.num}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Room Hierarchy Tree & Timeline Grid */}
                        <div className="divide-y divide-gray-100 min-w-max">
                            {roomTree.map(building => (
                                <React.Fragment key={building.id}>
                                    {/* Building Header Row */}
                                    <div className="flex bg-slate-50/90 border-b border-gray-200/90 font-bold text-gray-800 sticky left-0 z-20">
                                        <div
                                            onClick={() => toggleNode(building.id)}
                                            className="w-44 px-2 py-1 border-r border-gray-200 flex items-center gap-1.5 cursor-pointer hover:bg-slate-100 transition-colors sticky left-0 z-20 bg-slate-50 flex-shrink-0"
                                        >
                                            {expandedNodes[building.id] ? <ChevronDown size={13} className="text-gray-500" /> : <ChevronRight size={13} className="text-gray-500" />}
                                            <Building2 size={13} className="text-blue-700 flex-shrink-0" />
                                            <span className="text-[11px] truncate tracking-tight">{building.name}</span>
                                        </div>
                                        <div className="flex flex-1">
                                            {days.map(d => (
                                                <div key={d.index} className="w-16 border-r border-gray-100/80 bg-slate-50/40 flex-shrink-0"></div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Floors and Rooms */}
                                    {expandedNodes[building.id] && building.floors.map(floor => (
                                        <React.Fragment key={floor.id}>
                                            {/* Floor Header Row with Daily Breakdown Counters [Available][Assigned][Unassigned] */}
                                            <div className="flex bg-gray-50/80 border-b border-gray-100 text-gray-700 font-semibold">
                                                <div
                                                    onClick={() => toggleNode(floor.id)}
                                                    className="w-44 px-2 py-0.5 pl-4 border-r border-gray-200 flex items-center gap-1 cursor-pointer hover:bg-gray-100 transition-colors sticky left-0 z-20 bg-gray-50/90 flex-shrink-0"
                                                >
                                                    {expandedNodes[floor.id] ? <ChevronDown size={11} className="text-gray-400" /> : <ChevronRight size={11} className="text-gray-400" />}
                                                    <span className="text-[10.5px] font-bold text-gray-700 tracking-tight">{floor.name}</span>
                                                </div>

                                                {/* Floor Daily Breakdown Badges: [Available] [Assigned] [Unassigned] */}
                                                <div className="flex flex-1">
                                                    {days.map(d => {
                                                        const floorRooms = floor.rooms;
                                                        const assignedCount = floorRooms.filter(r =>
                                                            bookings.some(b => b.roomNumber === r.roomNumber && d.index >= b.startIndex && d.index <= b.endIndex)
                                                        ).length;
                                                        const availableCount = Math.max(0, floorRooms.length - assignedCount);

                                                        // Unassigned on this day matching floor's room types
                                                        const floorRoomTypes = new Set(floorRooms.map(r => r.type));
                                                        const unassignedCount = unassignedList.filter(u => {
                                                            const matchesType = floorRoomTypes.has(u.roomType) || u.roomType.includes(floor.name) || floorRooms.some(r => u.roomType.includes(r.type));
                                                            if (!matchesType) return false;
                                                            const startIdx = days.findIndex(x => x.date === u.checkIn);
                                                            const s = startIdx >= 0 ? startIdx : 0;
                                                            const e = s + u.nights;
                                                            return d.index >= s && d.index < e;
                                                        }).length;

                                                        return (
                                                            <div
                                                                key={d.index}
                                                                className="w-16 px-0.5 border-r border-gray-100 flex items-center justify-center flex-shrink-0 min-h-[22px] bg-gray-50/30"
                                                            >
                                                                <div className="flex items-center gap-0.5">
                                                                    {/* 1. Available Badge (Green) */}
                                                                    {availableCount > 0 && (
                                                                        <span
                                                                            className="min-w-[14px] h-3.5 px-0.5 rounded-xs bg-[#00cc00] text-white font-black text-[8.5px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${availableCount} Available`}
                                                                        >
                                                                            {availableCount}
                                                                        </span>
                                                                    )}
                                                                    {/* 2. Assigned Badge (Blue) */}
                                                                    {assignedCount > 0 && (
                                                                        <span
                                                                            className="min-w-[14px] h-3.5 px-0.5 rounded-xs bg-[#1e3a8a] text-white font-black text-[8.5px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${assignedCount} Assigned`}
                                                                        >
                                                                            {assignedCount}
                                                                        </span>
                                                                    )}
                                                                    {/* 3. Unassigned Badge (Red) */}
                                                                    {unassignedCount > 0 && (
                                                                        <span
                                                                            className="min-w-[14px] h-3.5 px-0.5 rounded-xs bg-[#ff3333] text-white font-black text-[8.5px] flex items-center justify-center leading-none shadow-2xs"
                                                                            title={`${floor.name}: ${unassignedCount} Unassigned`}
                                                                        >
                                                                            {unassignedCount}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Rooms */}
                                            {expandedNodes[floor.id] && floor.rooms.map(room => (
                                                <div key={room.id} className="flex border-b border-gray-100/90 hover:bg-blue-50/20 transition-colors group relative">
                                                    {/* Room Info Cell */}
                                                    <div className={`w-44 px-2 py-1 pl-6 border-r border-gray-200 flex items-center justify-between sticky left-0 z-20 bg-white group-hover:bg-blue-50/30 flex-shrink-0 transition-colors ${
                                                        moveDrag && moveDrag.isDragging && moveDrag.targetRoomNumber === room.roomNumber ? 'bg-blue-100 ring-2 ring-blue-500' : ''
                                                    }`}>
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <BedDouble size={12} className="text-gray-400 flex-shrink-0" />
                                                            <div className="truncate">
                                                                <span className="font-bold text-[11px] text-gray-900 mr-1.5">
                                                                    {room.roomNumber}
                                                                </span>
                                                                <span className="text-[9.5px] text-gray-500 truncate">
                                                                    {room.type}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                                            room.status === 'clean' ? 'bg-emerald-500' :
                                                            room.status === 'inspected' ? 'bg-blue-500' : 'bg-amber-500'
                                                        }`} title={`Room is ${room.status}`}></span>
                                                    </div>

                                                    {/* Day Cells & Bookings Overlay */}
                                                    <div className="flex flex-1 relative min-h-[30px]">
                                                        {days.map(d => (
                                                            <div
                                                                key={d.index}
                                                                onMouseDown={(e) => {
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setDragState({
                                                                        room: room.roomNumber,
                                                                        startIndex: d.index,
                                                                        endIndex: d.index,
                                                                        startRect: rect,
                                                                        endRect: rect
                                                                    });
                                                                }}
                                                                onMouseEnter={(e) => {
                                                                    if (dragState && dragState.room === room.roomNumber) {
                                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                                        setDragState(prev => prev ? ({
                                                                            ...prev,
                                                                            endIndex: d.index,
                                                                            endRect: rect
                                                                        }) : null);
                                                                    }
                                                                    // Extend OR Shorten Stay Drag (Allows shortening to 1 night or extending)
                                                                    if (extendDrag && extendDrag.booking.roomNumber === room.roomNumber) {
                                                                        const minCol = extendDrag.booking.startIndex + 1;
                                                                        const clampedCol = Math.max(minCol, d.index);
                                                                        setExtendDrag(prev => prev ? ({
                                                                            ...prev,
                                                                            currentEndIndex: clampedCol,
                                                                            hasMoved: true
                                                                        }) : null);
                                                                    }
                                                                    // Move Reservation Drag (Drag-and-Drop to any room or date)
                                                                    if (moveDrag) {
                                                                        const stayDuration = moveDrag.booking.endIndex - moveDrag.booking.startIndex;
                                                                        setMoveDrag(prev => prev ? ({
                                                                            ...prev,
                                                                            isDragging: true,
                                                                            targetRoomNumber: room.roomNumber,
                                                                            targetStartIndex: d.index,
                                                                            targetEndIndex: d.index + stayDuration
                                                                        }) : null);
                                                                    }
                                                                }}
                                                                className={`w-16 border-r border-gray-100 flex-shrink-0 cursor-pointer transition-colors relative ${
                                                                    d.isToday ? 'bg-blue-50/30' : d.isWeekend ? 'bg-gray-50/40' : ''
                                                                } hover:bg-blue-100/40`}
                                                            ></div>
                                                        ))}

                                                        {/* Live Move Reservation Target Ghost Preview */}
                                                        {moveDrag && moveDrag.isDragging && moveDrag.targetRoomNumber === room.roomNumber && (
                                                            <div
                                                                style={{
                                                                    left: `${moveDrag.targetStartIndex * 64 + 2}px`,
                                                                    width: `${Math.max(24, (moveDrag.targetEndIndex - moveDrag.targetStartIndex + 1) * 64 - 4)}px`
                                                                }}
                                                                className="absolute top-1 bottom-1 bg-blue-600/70 border-2 border-dashed border-white text-white rounded px-2 py-0.5 text-[10px] font-bold flex items-center gap-1 shadow-lg z-20 pointer-events-none animate-pulse"
                                                            >
                                                                <span className="truncate">Move: {moveDrag.booking.guestName} → Room A-({room.roomNumber})</span>
                                                            </div>
                                                        )}

                                                        {/* Render Booking Bars with Exact Floating Indicators, Extend/Shorten Handle & Move Drag */}
                                                        {bookings
                                                            .filter(b => b.roomNumber === room.roomNumber)
                                                            .map(booking => {
                                                                const colWidth = 64; // w-16 is 64px
                                                                const isBeingExtended = extendDrag && extendDrag.booking.id === booking.id;
                                                                const isBeingMoved = moveDrag && moveDrag.booking.id === booking.id && moveDrag.isDragging;
                                                                const isAnyDragActive = Boolean(extendDrag || (moveDrag && moveDrag.isDragging));

                                                                const effectiveEnd = isBeingExtended
                                                                    ? extendDrag.currentEndIndex
                                                                    : booking.endIndex;
                                                                const start = Math.max(0, booking.startIndex);
                                                                const end = Math.min(daysWindow - 1, effectiveEnd);
                                                                if (start > daysWindow - 1 || end < 0) return null;

                                                                const left = start * colWidth + 2;
                                                                const width = Math.max(24, (end - start + 1) * colWidth - 4);
                                                                const colorClass = getStatusBadgeColor(booking.status);

                                                                return (
                                                                    <div
                                                                        key={booking.id}
                                                                        style={{ left: `${left}px`, width: `${width}px` }}
                                                                        onMouseDown={(e) => {
                                                                            if (e.button !== 0) return;
                                                                            setMoveDrag({
                                                                                booking,
                                                                                startX: e.clientX,
                                                                                startY: e.clientY,
                                                                                currentX: e.clientX,
                                                                                currentY: e.clientY,
                                                                                isDragging: false,
                                                                                targetRoomNumber: booking.roomNumber,
                                                                                targetStartIndex: booking.startIndex,
                                                                                targetEndIndex: booking.endIndex
                                                                            });
                                                                        }}
                                                                        className={`absolute top-1 bottom-1 ${colorClass} rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center justify-between shadow-2xs z-10 truncate transition-all select-none ${
                                                                            isAnyDragActive ? 'pointer-events-none' : 'pointer-events-auto cursor-grab hover:brightness-105'
                                                                        } ${isBeingExtended ? 'ring-2 ring-white shadow-lg z-30' : ''} ${
                                                                            isBeingMoved ? 'opacity-40 ring-2 ring-dashed ring-amber-300' : ''
                                                                        }`}
                                                                        title={`${booking.guestName} (${booking.reservationNumber}) • Click to view details • Drag right edge to extend/shorten • Drag to move`}
                                                                    >
                                                                        {/* Floating Indicators Cluster: [👑 Group Owner] [👥 Group] [$ Due] [⭐ VIP/Single Lady] */}
                                                                        <div className="flex items-center -space-x-0.5 absolute -top-2 left-2 z-20 pointer-events-auto">
                                                                            {booking.isGroupOwner && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-amber-400 text-gray-900 border border-white flex items-center justify-center text-[8.5px] font-bold shadow-xs"
                                                                                    title="Group Owner / Leader"
                                                                                >
                                                                                    👑
                                                                                </span>
                                                                            )}
                                                                            {booking.isGroupBooking && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-rose-500 text-white border border-white flex items-center justify-center text-[8px] font-bold shadow-xs"
                                                                                    title="Group Booking"
                                                                                >
                                                                                    👥
                                                                                </span>
                                                                            )}
                                                                            {booking.isPaymentDue && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-red-600 text-white border border-white flex items-center justify-center text-[9px] font-black shadow-xs"
                                                                                    title="Payment Due / Pending"
                                                                                >
                                                                                    $
                                                                                </span>
                                                                            )}
                                                                            {booking.isVipOrSingleLady && (
                                                                                <span
                                                                                    className="w-4 h-4 rounded-full bg-amber-500 text-white border border-white flex items-center justify-center text-[8.5px] font-bold shadow-xs"
                                                                                    title="VIP / Single Lady"
                                                                                >
                                                                                    ⭐
                                                                                </span>
                                                                            )}
                                                                        </div>

                                                                        <div className="flex items-center gap-1 min-w-0 truncate">
                                                                            <span className="truncate">{booking.guestName}</span>
                                                                        </div>
                                                                        {booking.indicator && (
                                                                            <span className="text-[9px] bg-black/20 px-1 rounded flex-shrink-0 ml-1">
                                                                                {booking.indicator}
                                                                            </span>
                                                                        )}

                                                                        {/* Extend Stay Drag Handle & Tooltip (media_1792539649051_3f618fc1.png) */}
                                                                        <div
                                                                            onMouseDown={(e) => {
                                                                                e.stopPropagation();
                                                                                e.preventDefault();
                                                                                setExtendDrag({
                                                                                    booking,
                                                                                    originalEndIndex: booking.endIndex,
                                                                                    currentEndIndex: booking.endIndex,
                                                                                    hasMoved: false
                                                                                });
                                                                            }}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                handleOpenAmendModal(booking);
                                                                            }}
                                                                            className="absolute right-0 top-0 bottom-0 w-3.5 cursor-ew-resize flex items-center justify-center hover:bg-black/25 group/resize z-30 transition-colors pointer-events-auto"
                                                                            title="Drag to extend or shorten stay"
                                                                        >
                                                                            {/* Vertical line handle indicator */}
                                                                            <div className="w-[3px] h-3.5 bg-white/70 rounded-full group-hover/resize:bg-white group-hover/resize:h-4.5 transition-all shadow-xs" />

                                                                            {/* Floating Tooltip Box matching media_1792539649051_3f618fc1.png */}
                                                                            <div className="hidden group-hover/resize:block absolute top-full right-0 mt-1.5 bg-white text-gray-900 border border-black shadow-lg rounded-xs px-2 py-0.5 text-[11px] font-sans font-medium whitespace-nowrap z-50 pointer-events-none select-none">
                                                                                Extend / Shorten stay
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}

                                                        {/* Drag Selection Visual Overlay */}
                                                        {dragState && dragState.room === room.roomNumber && (
                                                            <div
                                                                style={{
                                                                    left: `${Math.min(dragState.startIndex, dragState.endIndex) * 64}px`,
                                                                    width: `${(Math.abs(dragState.endIndex - dragState.startIndex) + 1) * 64}px`
                                                                }}
                                                                className="absolute top-0.5 bottom-0.5 bg-blue-500/30 border-2 border-blue-600 rounded z-20 pointer-events-none animate-pulse"
                                                            ></div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Occupancy Summary Strip (Fixed at Bottom of Timeline) */}
                <div className="bg-[#1e3a8a] text-white flex border-t border-blue-900 sticky bottom-0 z-30 font-bold select-none shadow-md">
                    <div className="w-44 px-2 py-1 border-r border-blue-800 text-[10.5px] sticky left-0 z-40 bg-[#1e3a8a] flex-shrink-0 flex flex-col justify-center">
                        <div className="leading-tight">Occupancy (%)</div>
                        <div className="text-[9px] font-normal text-blue-200">Available</div>
                    </div>
                    <div className="flex flex-1 overflow-hidden min-w-max">
                        {days.map(d => {
                            const occupiedOnDay = bookings.filter(b => d.index >= b.startIndex && d.index <= b.endIndex).length;
                            const pct = Math.round((occupiedOnDay / totalRoomsCount) * 100);
                            const avail = Math.max(0, totalRoomsCount - occupiedOnDay);

                            return (
                                <div key={d.index} className="w-16 px-1 py-1 border-r border-blue-800/80 text-center flex-shrink-0 flex flex-col justify-center">
                                    <div className="text-[10px] font-bold leading-tight">{pct}%</div>
                                    <div className="text-[8.5px] font-mono text-blue-200 leading-tight">[{avail}]</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* COMPACT & SLIM ASSIGN ROOMS DRAWER (PORTAL TO DOCUMENT.BODY WITH 0px TOP GAP) */}
            {/* ========================================================================= */}
            {isAssignRoomsOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[99999] overflow-hidden select-none">
                    {/* Backdrop Overlay covering entire viewport */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity animate-in fade-in"
                        onClick={() => setIsAssignRoomsOpen(false)}
                    />

                    {/* Right-Side Slim Drawer - Exact Full Viewport Height top-0 bottom-0 with 0px gap */}
                    <div className="fixed top-0 bottom-0 right-0 w-full sm:w-[370px] bg-white shadow-2xl flex flex-col border-l border-gray-200 animate-in slide-in-from-right duration-200 z-[100000]">
                        {/* Drawer Header - Compact & Slim */}
                        <div className="px-3.5 py-2.5 flex items-center justify-between border-b border-gray-100 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <h2 className="text-[13.5px] font-bold text-gray-900 tracking-tight">Assign Rooms</h2>
                                <button
                                    type="button"
                                    className="w-6 h-6 rounded border border-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-50 transition-colors shadow-2xs"
                                    title="System Calendar Date"
                                >
                                    <CalendarIcon size={12} />
                                </button>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAssignRoomsOpen(false)}
                                className="text-gray-400 hover:text-gray-700 p-0.5 rounded-md transition-colors cursor-pointer"
                                title="Close"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Date Carousel Bar - Slim Height 52px */}
                        <div className="flex items-stretch border-b border-gray-200/90 h-[52px] bg-white flex-shrink-0">
                            {/* Left Carousel Arrow */}
                            <button
                                type="button"
                                onClick={() => setModalDateStartIndex(prev => Math.max(0, prev - 1))}
                                disabled={modalDateStartIndex === 0}
                                className="w-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer border-r border-gray-100 transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>

                            {/* 7 Visible Date Items */}
                            <div className="flex-1 flex overflow-hidden divide-x divide-gray-100">
                                {modalDays.slice(modalDateStartIndex, modalDateStartIndex + 7).map((d, index) => {
                                    const actualIndex = modalDateStartIndex + index;
                                    const isActive = selectedModalDateIndex === actualIndex;
                                    const hasUnassignedOnDate = unassignedList.some(u => u.checkIn === d.date);

                                    return (
                                        <div
                                            key={actualIndex}
                                            onClick={() => setSelectedModalDateIndex(actualIndex)}
                                            className={`flex-1 flex flex-col items-center justify-center cursor-pointer transition-all relative ${
                                                isActive
                                                    ? 'bg-[#f0f7ff] text-[#3b82f6] border-b-2 border-b-[#3b82f6] font-bold'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {/* Blue dot indicator for unassigned items */}
                                            {hasUnassignedOnDate && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] absolute top-1"></span>
                                            )}
                                            <span className={`text-[9.5px] font-semibold leading-none ${isActive ? 'text-[#3b82f6]' : 'text-gray-500'}`}>
                                                {d.dayName}
                                            </span>
                                            <span className={`text-xs font-black leading-none my-0.5 ${isActive ? 'text-[#3b82f6]' : 'text-gray-900'}`}>
                                                {d.num}
                                            </span>
                                            <span className={`text-[8.5px] leading-none ${isActive ? 'text-[#3b82f6]' : 'text-gray-400'}`}>
                                                {d.monthShort}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right Carousel Arrow */}
                            <button
                                type="button"
                                onClick={() => setModalDateStartIndex(prev => Math.min(modalDays.length - 7, prev + 1))}
                                disabled={modalDateStartIndex >= modalDays.length - 7}
                                className="w-7 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer border-l border-gray-100 transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>

                        {/* Drawer Body: Unassigned Reservations for Selected Date */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#fafafa]">
                            {unassignedForSelectedDate.length > 0 ? (
                                unassignedForSelectedDate.map(item => {
                                    const isExpanded = expandedAccordions[item.id] !== false;
                                    const availableRooms = getAvailableRoomsForBooking(item);
                                    const isAssigning = activeAssigningId === item.id;

                                    return (
                                        <div key={item.id} className="bg-white border border-gray-200/90 rounded-lg overflow-hidden shadow-2xs">
                                            {/* Accordion Header */}
                                            <div
                                                onClick={() => toggleAccordion(item.id)}
                                                className="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
                                            >
                                                <div className="flex items-center gap-1.5">
                                                    {isExpanded ? (
                                                        <ChevronDown size={13} className="text-gray-500" />
                                                    ) : (
                                                        <ChevronRight size={13} className="text-gray-500" />
                                                    )}
                                                    <span className="font-bold text-[11px] text-gray-900 tracking-tight">
                                                        Reservation Number : {item.reservationNumber}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Reservation Card Details */}
                                            {isExpanded && (
                                                <div className="p-2.5">
                                                    <div className="flex items-start justify-between gap-2.5">
                                                        {/* Dates Left Column */}
                                                        <div className="flex flex-col items-center justify-between text-center min-w-[34px] pr-2 border-r border-gray-100">
                                                            <div>
                                                                <span className="text-xs font-black text-gray-800 leading-tight block">
                                                                    {formatDayNum(item.checkIn)}
                                                                </span>
                                                                <span className="text-[8.5px] font-semibold text-gray-400 uppercase block">
                                                                    {formatMonth(item.checkIn)}
                                                                </span>
                                                            </div>
                                                            <div className="w-px h-2.5 bg-gray-200 my-1"></div>
                                                            <div>
                                                                <span className="text-xs font-black text-gray-800 leading-tight block">
                                                                    {formatDayNum(item.checkOut)}
                                                                </span>
                                                                <span className="text-[8.5px] font-semibold text-gray-400 uppercase block">
                                                                    {formatMonth(item.checkOut)}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Center Information */}
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="text-xs font-bold text-gray-900 leading-tight truncate">
                                                                {item.guestName}
                                                            </h4>
                                                            <p className="text-[9.5px] text-gray-400 font-medium mt-0.5">
                                                                Total Rooms: {item.totalRooms || 1}
                                                            </p>

                                                            <div className="mt-1.5">
                                                                <span className="text-[9px] text-gray-400 font-medium block">Room Type</span>
                                                                <span className="text-[10.5px] font-bold text-gray-800 block truncate">
                                                                    {item.roomType}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Right Action Column */}
                                                        <div className="flex flex-col items-end flex-shrink-0">
                                                            <span className="text-[9.5px] text-gray-400 font-medium mb-1">Room</span>

                                                            {isAssigning ? (
                                                                <div className="flex flex-col items-end gap-1 animate-in fade-in">
                                                                    <select
                                                                        value={selectedRoomNumber || availableRooms[0]?.roomNumber || ''}
                                                                        onChange={(e) => setSelectedRoomNumber(e.target.value)}
                                                                        className="h-6 px-1.5 border border-blue-500 rounded text-[10.5px] font-semibold text-gray-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-[120px]"
                                                                    >
                                                                        {availableRooms.map(r => (
                                                                            <option key={r.roomNumber} value={r.roomNumber}>
                                                                                Room {r.roomNumber} ({r.type.split(' ')[0]})
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleConfirmAssign(item)}
                                                                            className="h-5 px-2 bg-[#1e3a8a] hover:bg-blue-900 text-white rounded text-[9.5px] font-bold cursor-pointer transition-colors"
                                                                        >
                                                                            Confirm
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveAssigningId(null)}
                                                                            className="h-5 px-1 text-gray-500 hover:text-gray-700 text-[9.5px] font-semibold cursor-pointer"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setActiveAssigningId(item.id);
                                                                        setSelectedRoomNumber(availableRooms[0]?.roomNumber || '102');
                                                                    }}
                                                                    className="h-6 px-2.5 border border-gray-300 hover:border-gray-400 rounded bg-white hover:bg-gray-50 text-gray-700 text-[10.5px] font-semibold shadow-2xs transition-colors cursor-pointer select-none active:scale-[0.98]"
                                                                >
                                                                    Assign Room
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                /* Empty state matching reference */
                                <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="w-12 h-12 opacity-30 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <span className="text-xs font-semibold text-gray-500">No Unassigned Bookings</span>
                                    <p className="text-[10px] text-gray-400 mt-0.5">
                                        No unassigned rooms for {selectedDateObj?.dayName} {selectedDateObj?.num} {selectedDateObj?.monthShort}.
                                    </p>
                                    {unassignedList.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const firstUnassigned = unassignedList[0];
                                                const targetIdx = modalDays.findIndex(d => d.date === firstUnassigned.checkIn);
                                                if (targetIdx >= 0) {
                                                    setSelectedModalDateIndex(targetIdx);
                                                    setModalDateStartIndex(Math.max(0, Math.min(modalDays.length - 7, targetIdx)));
                                                }
                                            }}
                                            className="mt-2.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[10px] rounded transition-colors border border-blue-200 cursor-pointer"
                                        >
                                            Jump to next ({unassignedList[0]?.reservationNumber})
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Quick Reservation Modal */}
            <QuickReservationModal
                isOpen={isQuickReservationOpen}
                onClose={() => {
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                }}
                roomInfo={(() => {
                    const startIso = selectedRange ? days[selectedRange.startIndex]?.date : startDate;
                    const endIso = selectedRange ? days[selectedRange.endIndex]?.date : startDate;
                    const stayNights = selectedRange ? selectedRange.endIndex - selectedRange.startIndex + 1 : 1;
                    return {
                        room: selectedRange?.room || '101',
                        startDate: startIso,
                        endDate: endIso,
                        nights: stayNights,
                        startIndex: selectedRange?.startIndex,
                        endIndex: selectedRange?.endIndex
                    };
                })()}
                onReserve={(newBooking) => {
                    setBookings(prev => [
                        ...prev,
                        {
                            id: `b-${Date.now()}`,
                            reservationNumber: `RES-${Date.now().toString().slice(-6)}`,
                            guestName: newBooking.guestName,
                            roomNumber: newBooking.room,
                            startIndex: newBooking.startIndex,
                            endIndex: newBooking.endIndex,
                            status: newBooking.status as any
                        }
                    ]);
                    setIsQuickReservationOpen(false);
                    setSelectedRange(null);
                }}
            />

            {/* Add Full Reservation Modal */}
            <AddReservationModal
                isOpen={isAddReservationOpen}
                onClose={() => {
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                }}
                initialRoom={selectedRange?.room || '101'}
                initialStartDate={selectedRange ? days[selectedRange.startIndex]?.date : startDate}
                initialEndDate={selectedRange ? days[selectedRange.endIndex]?.date : undefined}
                onReservationCreated={(res) => {
                    const startIdx = selectedRange?.startIndex || 0;
                    const endIdx = selectedRange?.endIndex || Math.min(days.length - 1, startIdx + (res.nights || 2) - 1);
                    setBookings(prev => [
                        ...prev,
                        {
                            id: `b-${Date.now()}`,
                            reservationNumber: res.reservationNumber,
                            guestName: res.guestName,
                            roomNumber: res.roomNumber,
                            startIndex: startIdx,
                            endIndex: endIdx,
                            status: res.status === 'in-house' ? 'arrived' : res.status === 'hold' ? 'hold' : 'confirmed',
                            vip: res.vip && res.vip !== 'None'
                        }
                    ]);
                    setIsAddReservationOpen(false);
                    setSelectedRange(null);
                }}
            />

            {/* Single-Column Reservation Details Drawer on Normal Click (matching media_1792541210487_8b5ecb8d.png) */}
            <ReservationDetailsDrawer
                isOpen={isDetailsDrawerOpen}
                onClose={() => {
                    setIsDetailsDrawerOpen(false);
                    setDetailsBookingData(null);
                }}
                booking={detailsBookingData}
                onAmendStay={(b) => {
                    setIsDetailsDrawerOpen(false);
                    const targetBooking = bookings.find(item => item.id === b.id);
                    if (targetBooking) {
                        handleOpenAmendModal(targetBooking);
                    }
                }}
                onRoomMove={(b) => {
                    setIsDetailsDrawerOpen(false);
                    setRoomMoveData({
                        booking: b,
                        targetRoomNumber: b.roomNumber,
                        targetFromDate: b.arrivalDate,
                        targetToDate: b.departureDate,
                        targetRoomType: b.roomType || 'Winter Rate Plan',
                        targetRateType: b.ratePlan || 'Summer Vacation'
                    });
                    setIsRoomMoveOpen(true);
                }}
            />

            {/* Amend Stay Modal on Drag-to-Extend/Shorten matching media_1792541010797_b7d6f151.png */}
            <AmendStayModal
                isOpen={isAmendStayOpen}
                onClose={() => {
                    setIsAmendStayOpen(false);
                    setAmendBookingData(null);
                }}
                booking={amendBookingData?.booking || null}
                initialTargetDeparture={amendBookingData?.targetDeparture}
                initialTargetNights={amendBookingData?.targetNights}
                onSave={handleSaveAmendStay}
                onRoomMove={(b) => {
                    setIsAmendStayOpen(false);
                    setRoomMoveData({
                        booking: b,
                        targetRoomNumber: b.roomNumber,
                        targetFromDate: b.arrivalDate,
                        targetToDate: b.departureDate,
                        targetRoomType: b.roomType || 'Winter Rate Plan',
                        targetRateType: b.ratePlan || 'Summer Vacation'
                    });
                    setIsRoomMoveOpen(true);
                }}
            />

            {/* Room Move Modal on Drag-and-Drop or Menu Action (matching media_1792541566827_b05dc667.png) */}
            <RoomMoveModal
                isOpen={isRoomMoveOpen}
                onClose={() => {
                    setIsRoomMoveOpen(false);
                    setRoomMoveData(null);
                }}
                data={roomMoveData}
                allRooms={allRooms}
                onSaveRoomMove={handleSaveRoomMove}
                onAmendStay={(b) => {
                    setIsRoomMoveOpen(false);
                    const targetBooking = bookings.find(item => item.id === b.id);
                    if (targetBooking) {
                        handleOpenAmendModal(targetBooking);
                    }
                }}
            />

            {/* Floating Mouse Cursor Badge during Room Move Drag */}
            {moveDrag && moveDrag.isDragging && (
                <div
                    style={{ left: `${moveDrag.currentX + 16}px`, top: `${moveDrag.currentY + 16}px` }}
                    className="fixed z-[100001] pointer-events-none bg-gray-900/95 text-white border border-blue-400/80 rounded-md px-3 py-1.5 text-xs shadow-2xl flex items-center gap-2 font-bold backdrop-blur-xs"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    <span>Move to Room A-({moveDrag.targetRoomNumber})</span>
                    <span className="text-blue-300">({days[moveDrag.targetStartIndex]?.date || ''})</span>
                </div>
            )}
        </div>
    );
};

export default StayView;