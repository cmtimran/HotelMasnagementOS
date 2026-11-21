import React, { useState, useEffect, useCallback } from 'react';
import {
    Globe, RefreshCw, Send, ShieldCheck,
    Clock, Zap, Settings, Plus, Trash2,
    Calendar, Layers,
    TrendingUp, DollarSign,
    Sliders, DownloadCloud,
    BookOpen, CheckCircle2, ArrowRight, ExternalLink,
    AlertTriangle, ShieldAlert, X,
    Crown, Building2
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { getApiBaseUrl, getActivePropertyId } from '../utils/apiUrl';
import { toast } from '../context/ToastContext';
import { syncReservationsFromDB } from '../utils/roomInventoryEngine';

interface OtaChannel {
    id: string;
    property_id: number;
    name: string;
    code: string;
    logo_key: string;
    hotel_id: string;
    status: 'ACTIVE' | 'PAUSED' | 'SYNC_ERROR' | 'DISCONNECTED';
    sync_type: '2-Way Realtime' | '1-Way Push' | 'iCal Sync';
    commission_rate: number;
    rate_multiplier: number;
    currency: string;
    auto_sync_inventory: boolean;
    auto_ingest_bookings: boolean;
    last_sync_at: string | null;
    last_sync_status: string;
    last_error_message: string;
    total_bookings_received: number;
    total_revenue_generated: number;
    active_listings_count: number;
}

interface ChannelKPIs {
    totalChannels: number;
    activeChannels: number;
    avgCommission: number;
    syncHealth: number;
    totalBookings: number;
    totalRevenue: number;
}

interface AriDayEntry {
    date: string;
    availableRooms: number;
    rate: number;
    stopSell: boolean;
    minStay: number;
    cta: boolean;
    ctd: boolean;
}

interface AriRoomTypeGroup {
    roomTypeId: number;
    roomTypeName: string;
    totalCapacity: number;
    baseRate: number;
    days: AriDayEntry[];
}

interface ChannelMapping {
    id: number;
    property_id: number;
    channel_id: string;
    room_type_id: number;
    rate_plan_id: number | null;
    ota_room_code: string;
    ota_room_name: string;
    ota_rate_code: string;
    max_allotment: number;
    rate_multiplier: number;
    stop_sell: boolean;
    is_active: boolean;
    pms_room_type_name: string;
    pms_base_rate: number;
    pms_rate_plan_name?: string;
    channel_name: string;
}

interface ChannelBooking {
    id: string;
    property_id: number;
    reservation_id: number | null;
    channel_id: string;
    channel_booking_ref: string;
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    room_type_name: string;
    assigned_room_number: string;
    check_in_date: string;
    check_out_date: string;
    nights: number;
    adults: number;
    children: number;
    total_amount: number;
    commission_amount: number;
    net_payout: number;
    currency: string;
    status: string;
    created_at: string;
    channel_name: string;
    logo_key: string;
}

interface ChannelSyncLog {
    id: number;
    channel_name: string;
    event_type: string;
    status: string;
    payload_json: string;
    created_at: string;
}

// Extranet Onboarding Guides (100% Brand-Safe, ZERO Third-Party Vendor Names)
const ONBOARDING_GUIDES: Record<string, {
    extranetName: string;
    extranetUrl: string;
    instructions: string[];
    providerName: string;
    requiredFields: string[];
}> = {
    BOOKING_COM: {
        extranetName: 'Booking.com Extranet',
        extranetUrl: 'https://admin.booking.com',
        providerName: 'HotelManagementOS Channel Driver',
        instructions: [
            'Log into your Booking.com Extranet portal using your property credentials.',
            'Navigate to Account (top-right menu) -> Connectivity Provider.',
            'Click "Search for Provider" and select "HotelManagementOS".',
            'Select 2-Way Connection (XML / ARI push + reservations retrieval) and confirm.',
            'Copy your Property ID (e.g. 77491) and paste it into Hotel ID below.',
            'Click Save and run "Instant ARI Push" to upload your room rates and calendar.'
        ],
        requiredFields: ['Booking.com Property ID', 'Room Mapping']
    },
    AGODA: {
        extranetName: 'Agoda YCS Extranet',
        extranetUrl: 'https://ycs.agoda.com',
        providerName: 'HotelManagementOS Gateway',
        instructions: [
            'Log into Agoda YCS (Yield Control System).',
            'Navigate to Settings -> Property Settings -> Optional Settings.',
            'Under "Channel Manager Mode", check the box to enable channel manager.',
            'Select "HotelManagementOS" from the dropdown provider list.',
            'Save changes and copy your Agoda Hotel ID.',
            'Paste your Hotel ID below, set your commission rate (e.g. 18%), and save.'
        ],
        requiredFields: ['Agoda Hotel ID', 'Rate Multiplier']
    },
    EXPEDIA: {
        extranetName: 'Expedia Partner Central',
        extranetUrl: 'https://www.expediapartnercentral.com',
        providerName: 'HotelManagementOS Connectivity Gateway',
        instructions: [
            'Log into Expedia Partner Central (EPC).',
            'Click on "Rooms and Rates" in the top bar -> "Connectivity Settings".',
            'Choose "HotelManagementOS" as your system connectivity provider.',
            'Confirm 2-Way connection and authorization.',
            'Enter your Expedia Property ID below and activate sync.'
        ],
        requiredFields: ['Expedia Property ID', 'Room Mappings']
    },
    AIRBNB: {
        extranetName: 'Airbnb Host Dashboard',
        extranetUrl: 'https://www.airbnb.com/hosting',
        providerName: 'HotelManagementOS Software Partner',
        instructions: [
            'Log into Airbnb with your professional host account.',
            'Go to Account Settings -> Privacy & Sharing -> Connected Services / Software Partner.',
            'Authorize HotelManagementOS for real-time calendar and rate sync.',
            'Paste your Airbnb Host ID or Listing Code below and configure markup.'
        ],
        requiredFields: ['Airbnb Host ID', 'Listing Token']
    },
    TRIP_COM: {
        extranetName: 'Trip.com / Ctrip e-Booking',
        extranetUrl: 'https://ebooking.ctrip.com',
        providerName: 'HotelManagementOS Global Driver',
        instructions: [
            'Log into Trip.com e-Booking platform.',
            'Go to System Settings -> Channel Manager Interface.',
            'Request connection to HotelManagementOS Channel Driver.',
            'Enter your Ctrip Hotel Code and authorize API push.'
        ],
        requiredFields: ['Ctrip Hotel Code']
    },
    MAKEMYTRIP: {
        extranetName: 'MakeMyTrip IngoMMT',
        extranetUrl: 'https://ingommt.com',
        providerName: 'HotelManagementOS Driver',
        instructions: [
            'Log into IngoMMT Partner Portal.',
            'Go to Channel Manager Settings -> Select Connectivity Partner.',
            'Choose HotelManagementOS and copy your IngoMMT Hotel ID.'
        ],
        requiredFields: ['IngoMMT Property Code']
    }
};

export interface ChannelManagerViewProps {
    activeView?: 'channels' | 'ari-matrix' | 'bulk-update' | 'mappings' | 'bookings' | 'webhook-test' | 'logs';
    onNavigate?: (page: string) => void;
}

export const ChannelManagerView: React.FC<ChannelManagerViewProps> = ({
    activeView = 'channels',
    onNavigate
}) => {
    const getInitialView = (): 'channels' | 'ari-matrix' | 'bulk-update' | 'mappings' | 'bookings' | 'webhook-test' | 'logs' => {
        try {
            const params = new URLSearchParams(window.location.search);
            const qView = params.get('view') || params.get('tab');
            if (qView && ['channels', 'ari-matrix', 'bulk-update', 'mappings', 'bookings', 'webhook-test', 'logs'].includes(qView)) {
                return qView as any;
            }
        } catch {}
        return activeView;
    };

    // Current active sub-view
    const [currentView, setCurrentView] = useState<'channels' | 'ari-matrix' | 'bulk-update' | 'mappings' | 'bookings' | 'webhook-test' | 'logs'>(() => getInitialView());

    useEffect(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (!params.get('view') && !params.get('tab') && activeView) {
                setCurrentView(activeView);
            }
        } catch {}
    }, [activeView]);

    const navigateTo = (view: 'channels' | 'ari-matrix' | 'bulk-update' | 'mappings' | 'bookings' | 'webhook-test' | 'logs') => {
        setCurrentView(view);
        if (onNavigate) {
            const pageMap: Record<string, string> = {
                'channels': 'channel-manager',
                'ari-matrix': 'channel-manager-ari',
                'bulk-update': 'channel-manager-wizard',
                'mappings': 'channel-manager-mappings',
                'bookings': 'channel-manager-bookings',
                'logs': 'channel-manager-logs',
                'webhook-test': 'channel-manager-logs'
            };
            onNavigate(pageMap[view] || 'channel-manager');
        }
    };

    // Data States loaded from PostgreSQL
    const [channels, setChannels] = useState<OtaChannel[]>([]);
    const [kpis, setKpis] = useState<ChannelKPIs>({
        totalChannels: 0,
        activeChannels: 0,
        avgCommission: 15.0,
        syncHealth: 100,
        totalBookings: 0,
        totalRevenue: 0
    });
    const [ariDates, setAriDates] = useState<string[]>([]);
    const [ariMatrix, setAriMatrix] = useState<AriRoomTypeGroup[]>([]);
    const [mappings, setMappings] = useState<ChannelMapping[]>([]);
    const [bookings, setBookings] = useState<ChannelBooking[]>([]);
    const [syncLogs, setSyncLogs] = useState<ChannelSyncLog[]>([]);

    // Loading & action states
    const [isLoading, setIsLoading] = useState(false);
    const [isPushingAri, setIsPushingAri] = useState(false);
    const [isFetchingBookings, setIsFetchingBookings] = useState(false);

    // Selected Channel for Configuration Modal
    const [selectedChannelForConfig, setSelectedChannelForConfig] = useState<OtaChannel | null>(null);
    const [configFormData, setConfigFormData] = useState({
        hotel_id: '',
        commission_rate: 15.0,
        rate_multiplier: 1.0,
        sync_type: '2-Way Realtime' as '2-Way Realtime' | '1-Way Push' | 'iCal Sync',
        auto_sync_inventory: true,
        auto_ingest_bookings: true
    });

    // Channel Onboarding Modal States
    const [onboardingChannel, setOnboardingChannel] = useState<OtaChannel | null>(null);
    const [isOnboardingNewCustomChannel, setIsOnboardingNewCustomChannel] = useState(false);
    const [newCustomChannelForm, setNewCustomChannelForm] = useState({
        name: '',
        code: '',
        hotel_id: '',
        commission_rate: 15.0,
        rate_multiplier: 1.15,
        sync_type: '2-Way Realtime' as '2-Way Realtime' | '1-Way Push' | 'iCal Sync'
    });

    // Anti-Overbooking Resolution Modal State
    const [resolutionModalBooking, setResolutionModalBooking] = useState<ChannelBooking | null>(null);
    const [resolutionMode, setResolutionMode] = useState<'UPGRADE' | 'RELOCATE' | 'OTA_REQUEST'>('UPGRADE');
    const [selectedUpgradeType, setSelectedUpgradeType] = useState<string>('');
    const [sisterHotelInput, setSisterHotelInput] = useState<string>('');
    const [resolutionNotes, setResolutionNotes] = useState<string>('');
    const [isResolving, setIsResolving] = useState<boolean>(false);
    const [sisterProperties, setSisterProperties] = useState<{ id: string; name: string; city: string; code: string }[]>([]);

    // Mapping Modal
    const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
    const [mappingForm, setMappingForm] = useState({
        channel_id: 'BOOKING_COM',
        room_type_id: 1,
        ota_room_code: '',
        ota_room_name: '',
        ota_rate_code: 'BAR_STD',
        rate_multiplier: 1.15,
        max_allotment: 0
    });

    // Distribution Wizard / Bulk Update State
    const [bulkForm, setBulkForm] = useState({
        roomTypeIds: [] as number[],
        startDate: new Date().toISOString().slice(0, 10),
        endDate: new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        rateAction: 'NONE' as 'SET' | 'INCREASE_FLAT' | 'DECREASE_FLAT' | 'INCREASE_PERCENT' | 'NONE',
        rateValue: 0,
        stopSellAction: 'NO_CHANGE' as 'OPEN' | 'CLOSE' | 'NO_CHANGE',
        minStay: 1,
        ctaAction: 'NO_CHANGE' as 'OPEN' | 'CLOSE' | 'NO_CHANGE',
        ctdAction: 'NO_CHANGE' as 'OPEN' | 'CLOSE' | 'NO_CHANGE'
    });
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    // Test Webhook Ingestion State
    const [webhookForm, setWebhookForm] = useState({
        channelName: 'BOOKING_COM',
        guestFirstName: 'Alex',
        guestLastName: 'Turner',
        guestEmail: 'alex.turner@example.com',
        roomTypeName: 'Deluxe Suite',
        checkInDate: new Date().toISOString().slice(0, 10),
        checkOutDate: new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString().slice(0, 10),
        totalAmount: 50000,
        commissionAmount: 7500,
        specialRequests: 'High floor, quiet room requested.'
    });

    const getAuthHeaders = (): Record<string, string> => {
        const token = localStorage.getItem('token') || localStorage.getItem('hotel_token') || '';
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Fetch sister properties dynamically
    useEffect(() => {
        const propId = getActivePropertyId() || 1;
        fetch(`${getApiBaseUrl()}/api/properties`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(res => {
                if (res.success && Array.isArray(res.data)) {
                    const sisters = res.data.filter((p: any) => Number(p.id) !== Number(propId));
                    setSisterProperties(sisters);
                }
            })
            .catch(() => {});
    }, []);

    // Open Overbooking Resolution Modal with fully dynamic defaults
    const handleOpenResolutionModal = (bk: ChannelBooking) => {
        setResolutionModalBooking(bk);
        setResolutionMode('UPGRADE');
        
        // Find other room types from ariMatrix
        const otherTypes = ariMatrix.filter(m => m.roomTypeName.toLowerCase() !== bk.room_type_name.toLowerCase());
        if (otherTypes.length > 0) {
            setSelectedUpgradeType(otherTypes[0].roomTypeName);
        } else {
            setSelectedUpgradeType('Superior King Room');
        }
        
        if (sisterProperties.length > 0) {
            setSisterHotelInput(`${sisterProperties[0].name} (${sisterProperties[0].city})`);
        } else {
            setSisterHotelInput('Grand Palace Luxury Airport Annex (Dhaka)');
        }
        
        setResolutionNotes(`Approved complimentary upgrade by Duty Manager due to online channel capacity exhaustion for stay dates ${bk.check_in_date} to ${bk.check_out_date}.`);
    };

    // 1. Fetch Channels
    const fetchChannels = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/channels?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setChannels(json.data);
            }
        } catch (e) {
            console.warn('Failed to load channels:', e);
        }
    }, []);

    // 2. Fetch KPIs
    const fetchKPIs = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/kpi?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success && json.kpis) {
                setKpis(json.kpis);
            }
        } catch (e) {
            console.warn('Failed to load channel KPIs:', e);
        }
    }, []);

    // 3. Fetch Multi-Day ARI Matrix
    const fetchAriMatrix = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/ari?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                setAriDates(json.dates || []);
                setAriMatrix(json.matrix || []);
                if (Array.isArray(json.matrix) && json.matrix.length > 0) {
                    setBulkForm(prev => ({
                        ...prev,
                        roomTypeIds: prev.roomTypeIds.length > 0 ? prev.roomTypeIds : json.matrix.map((m: any) => m.roomTypeId)
                    }));
                }
            }
        } catch (e) {
            console.warn('Failed to load ARI matrix:', e);
        }
    }, []);

    // 4. Fetch Mappings
    const fetchMappings = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/mappings?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setMappings(json.data);
            }
        } catch (e) {
            console.warn('Failed to load mappings:', e);
        }
    }, []);

    // 5. Fetch Bookings Queue
    const fetchBookings = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/bookings?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setBookings(json.data);
            }
        } catch (e) {
            console.warn('Failed to load channel bookings:', e);
        }
    }, []);

    // 6. Fetch Logs
    const fetchSyncLogs = useCallback(async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/logs?propertyId=${propId}`, {
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                setSyncLogs(json.data);
            }
        } catch (e) {
            console.warn('Failed to load logs:', e);
        }
    }, []);

    const refreshAll = useCallback(() => {
        fetchChannels();
        fetchKPIs();
        fetchAriMatrix();
        fetchMappings();
        fetchBookings();
        fetchSyncLogs();
    }, [fetchChannels, fetchKPIs, fetchAriMatrix, fetchMappings, fetchBookings, fetchSyncLogs]);

    useEffect(() => {
        refreshAll();
    }, [refreshAll]);

    // Push ARI to All OTAs
    const handleBroadcastPushAri = async () => {
        setIsPushingAri(true);
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/push-ari`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ propertyId: propId })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Instant ARI Push completed: Rates & availability broadcasted to all active OTAs!');
                fetchSyncLogs();
                fetchKPIs();
            } else {
                toast.error(json.error || 'Push failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Network error pushing ARI');
        } finally {
            setIsPushingAri(false);
        }
    };

    // Fetch Live Bookings from OTAs
    const handleFetchLiveBookings = async () => {
        setIsFetchingBookings(true);
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/bookings/fetch-live`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ propertyId: propId })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || 'Fetched new inbound OTA reservations!');
                fetchBookings();
                fetchKPIs();
                fetchSyncLogs();
                fetchAriMatrix();
                window.dispatchEvent(new CustomEvent('pms_network_sync', { detail: { type: 'RESERVATION_CREATED' } }));
            } else {
                toast.error(json.message || 'No new bookings found on OTA extranets');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch live OTA bookings');
        } finally {
            setIsFetchingBookings(false);
        }
    };

    // Toggle Channel Status (Active <-> Paused)
    const handleToggleChannel = async (channelId: string) => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/channels/${channelId}/toggle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ propertyId: propId })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`Channel status updated to ${json.status}`);
                fetchChannels();
                fetchKPIs();
            } else {
                toast.error(json.error || 'Failed to toggle channel');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error toggling channel');
        }
    };

    // Emergency Overbooking Stop-Sell Kill Switch
    const handleEmergencyStopSell = async () => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/emergency-stop-sell`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ propertyId: propId })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('🛡️ Anti-Overbooking Shield Active: Emergency Stop-Sell broadcasted to all OTAs!');
                fetchAriMatrix();
                fetchBookings();
            } else {
                toast.error(json.error || 'Failed to trigger emergency stop-sell');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Emergency Stop-Sell network error');
        }
    };

    // Resolve Overbooking Deficit
    const handleResolveOverbooking = async (booking: ChannelBooking, resolutionType: 'UPGRADE' | 'RELOCATE' | 'OTA_REQUEST') => {
        setIsResolving(true);
        try {
            const propId = getActivePropertyId() || 1;
            const targetRoomType = ariMatrix.find(m => m.roomTypeName.toLowerCase() === selectedUpgradeType.toLowerCase());
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/bookings/${booking.channel_booking_ref}/resolve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    resolutionType,
                    upgradeRoomTypeId: targetRoomType?.roomTypeId,
                    upgradeRoomTypeName: selectedUpgradeType,
                    sisterHotelName: sisterHotelInput,
                    notes: resolutionNotes
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`Deficit resolved for ${booking.guest_name} (${resolutionType})!`);
                setResolutionModalBooking(null);
                fetchBookings();
                fetchAriMatrix();
                syncReservationsFromDB(propId).catch(() => {});
            } else {
                toast.error(json.error || 'Failed to resolve overbooking');
            }
        } catch (e: any) {
            toast.error(e?.message || 'Failed to resolve overbooking');
        } finally {
            setIsResolving(false);
        }
    };

    // Unassign Room for Channel Booking
    const handleUnassignRoom = async (bookingRef: string) => {
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/bookings/${bookingRef}/unassign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({ propertyId: propId })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`Booking ${bookingRef} unassigned successfully!`);
                fetchBookings();
                fetchAriMatrix();
                syncReservationsFromDB(propId).catch(() => {});
            } else {
                toast.error(json.error || 'Failed to unassign room');
            }
        } catch {
            toast.error('Network error unassigning room');
        }
    };

    // Open Config Modal
    const handleOpenChannelConfig = (channel: OtaChannel) => {
        setSelectedChannelForConfig(channel);
        setConfigFormData({
            hotel_id: channel.hotel_id,
            commission_rate: Number(channel.commission_rate),
            rate_multiplier: Number(channel.rate_multiplier),
            sync_type: channel.sync_type,
            auto_sync_inventory: channel.auto_sync_inventory,
            auto_ingest_bookings: channel.auto_ingest_bookings
        });
    };

    // Save Channel Config
    const handleSaveChannelConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChannelForConfig) return;
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/channels/${selectedChannelForConfig.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    ...configFormData
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`${selectedChannelForConfig.name} configuration saved!`);
                setSelectedChannelForConfig(null);
                fetchChannels();
                fetchKPIs();
            } else {
                toast.error(json.error || 'Failed to save configuration');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error updating channel');
        }
    };

    // Create / Onboard Custom Channel
    const handleCreateCustomChannel = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/channels`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    ...newCustomChannelForm
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`Channel ${newCustomChannelForm.name} onboarded successfully!`);
                setIsOnboardingNewCustomChannel(false);
                setNewCustomChannelForm({
                    name: '',
                    code: '',
                    hotel_id: '',
                    commission_rate: 15.0,
                    rate_multiplier: 1.15,
                    sync_type: '2-Way Realtime'
                });
                fetchChannels();
                fetchKPIs();
            } else {
                toast.error(json.error || 'Failed to onboard channel');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error onboarding channel');
        }
    };

    // Save Mapping
    const handleSaveMapping = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/mappings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    ...mappingForm
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Channel Room Mapping saved!');
                setIsMappingModalOpen(false);
                fetchMappings();
            } else {
                toast.error(json.error || 'Failed to save mapping');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error saving mapping');
        }
    };

    // Delete Mapping
    const handleDeleteMapping = async (id: number) => {
        if (!confirm('Are you sure you want to remove this channel mapping?')) return;
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/mappings/${id}?propertyId=${propId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            const json = await res.json();
            if (json.success) {
                toast.success('Mapping removed');
                fetchMappings();
            } else {
                toast.error(json.error || 'Failed to delete');
            }
        } catch (e: any) {
            toast.error(e.message || 'Error deleting mapping');
        }
    };

    // Execute Bulk Update (Distribution Wizard)
    const handleExecuteBulkUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (bulkForm.roomTypeIds.length === 0) {
            toast.error('Please select at least one Room Type to update.');
            return;
        }
        setIsBulkUpdating(true);
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/bulk-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    ...bulkForm
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(json.message || 'Bulk update pushed to all channels successfully!');
                fetchAriMatrix();
                fetchSyncLogs();
                navigateTo('ari-matrix');
            } else {
                toast.error(json.error || 'Bulk update failed');
            }
        } catch (err: any) {
            toast.error(err.message || 'Network error executing bulk update');
        } finally {
            setIsBulkUpdating(false);
        }
    };

    // Inbound Webhook Test
    const handleSendTestWebhook = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const propId = getActivePropertyId() || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/channel-manager/webhook/ota-booking`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body: JSON.stringify({
                    propertyId: propId,
                    channelName: webhookForm.channelName,
                    otaBookingReference: `OTA-${webhookForm.channelName.slice(0, 3)}-${Date.now().toString().slice(-6)}`,
                    guest: {
                        firstName: webhookForm.guestFirstName,
                        lastName: webhookForm.guestLastName,
                        email: webhookForm.guestEmail
                    },
                    roomTypeName: webhookForm.roomTypeName,
                    checkInDate: webhookForm.checkInDate,
                    checkOutDate: webhookForm.checkOutDate,
                    totalAmount: Number(webhookForm.totalAmount),
                    commissionAmount: Number(webhookForm.commissionAmount),
                    specialRequests: webhookForm.specialRequests
                })
            });
            const json = await res.json();
            if (json.success) {
                toast.success(`Inbound OTA booking created! Res #: ${json.reservationNumber || 'Confirmed'}`);
                fetchSyncLogs();
                fetchBookings();
                fetchKPIs();
                fetchAriMatrix();
                window.dispatchEvent(new CustomEvent('pms_network_sync', { detail: { type: 'RESERVATION_CREATED' } }));
            } else {
                toast.error(json.error || 'Failed to ingest webhook');
            }
        } catch (err: any) {
            toast.error(err.message || 'Webhook network error');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper to format date header
    const formatDateHeader = (dStr: string) => {
        const d = new Date(dStr);
        const day = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dateNum = d.getDate();
        const month = d.toLocaleDateString('en-US', { month: 'short' });
        return { day, label: `${dateNum} ${month}` };
    };

    // Channel brand colors
    const getChannelBadge = (id: string, name: string) => {
        let bg = 'bg-slate-100 text-slate-800 border-slate-200';
        if (id.includes('BOOKING')) bg = 'bg-blue-50 text-blue-800 border-blue-200';
        else if (id.includes('AGODA')) bg = 'bg-rose-50 text-rose-800 border-rose-200';
        else if (id.includes('EXPEDIA')) bg = 'bg-amber-50 text-amber-800 border-amber-200';
        else if (id.includes('AIRBNB')) bg = 'bg-red-50 text-red-800 border-red-200';
        else if (id.includes('TRIP')) bg = 'bg-cyan-50 text-cyan-800 border-cyan-200';
        else if (id.includes('MMT')) bg = 'bg-orange-50 text-orange-800 border-orange-200';

        return (
            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${bg}`}>
                {name}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* VIEW 1: CONNECTED CHANNELS */}
            {currentView === 'channels' && (
                <>
                    <PageHeader
                        title="Connected Distribution Channels (OTAs)"
                        subtitle="Manage 2-Way Realtime Connections with Booking.com, Agoda, Expedia, Airbnb and global OTAs."
                        icon={<Globe className="text-primary size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { refreshAll(); toast.info('Refreshed channels.'); }}
                                    className="btn-secondary"
                                    title="Refresh"
                                >
                                    <RefreshCw size={15} />
                                    <span>Refresh</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardingNewCustomChannel(true)}
                                    className="btn-secondary bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                                >
                                    <Plus size={15} />
                                    <span>+ Onboard Custom Channel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleBroadcastPushAri}
                                    disabled={isPushingAri}
                                    className="btn-primary"
                                >
                                    <Send size={15} className={isPushingAri ? 'animate-spin' : ''} />
                                    <span>{isPushingAri ? 'Pushing ARI...' : 'Instant ARI Push'}</span>
                                </button>
                            </div>
                        }
                    />

                    {/* Quick Metric Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Connected OTAs</p>
                                <p className="text-2xl text-slate-900 mt-1 font-bold">{channels.filter(c => c.status === 'ACTIVE').length} / {channels.length}</p>
                                <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Live 2-Way Sync Active</p>
                            </div>
                            <div className="size-9 rounded-xl bg-primary-subtle text-primary flex items-center justify-center shrink-0">
                                <Globe size={18} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">ARI Sync Health</p>
                                <p className="text-2xl text-emerald-600 mt-1 font-bold">{kpis.syncHealth}%</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Parity & Availability Verified</p>
                            </div>
                            <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                                <ShieldCheck size={18} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">Avg OTA Commission</p>
                                <p className="text-2xl text-slate-900 mt-1 font-bold">{kpis.avgCommission}%</p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Weighted Distribution Cost</p>
                            </div>
                            <div className="size-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                                <TrendingUp size={18} />
                            </div>
                        </div>

                        <div className="kpi-card">
                            <div>
                                <p className="text-[11px] text-slate-400 uppercase tracking-wider">OTA Gross Revenue</p>
                                <p className="text-xl font-bold text-slate-900 mt-1 font-mono">৳{kpis.totalRevenue.toLocaleString()}</p>
                                <p className="text-[11px] text-emerald-600 mt-0.5">{kpis.totalBookings} Total Bookings Received</p>
                            </div>
                            <div className="size-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                                <DollarSign size={18} />
                            </div>
                        </div>
                    </div>

                    {/* MASTER ANTI-OVERBOOKING SHIELD STATUS */}
                    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-5 border border-slate-800 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                            <div className="size-11 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                                <ShieldAlert size={24} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h3 className="font-bold text-sm tracking-tight text-white">Dynamic Anti-Overbooking Shield & Capacity Guard</h3>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                                        Live Protection Active
                                    </span>
                                </div>
                                <p className="text-xs text-slate-300 mt-1 leading-relaxed max-w-2xl">
                                    Physical capacity guard actively prevents overselling across all 6 OTA channels simultaneously. 
                                    When physical capacity drops to 0 or below, real-time Stop-Sell is instantly pushed to extranets to prevent duplicate bookings.
                                </p>
                                <div className="flex items-center gap-4 mt-3 text-xs flex-wrap">
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="size-2 rounded-full bg-emerald-400"></span>
                                        <span>Capacity Guard: <strong>Strict Physical Count</strong></span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-300">
                                        <span className="size-2 rounded-full bg-emerald-400"></span>
                                        <span>Zero-Inventory Hard Stop: <strong>Enforced</strong></span>
                                    </div>
                                    {bookings.filter(b => b.status === 'OVERBOOKED').length > 0 && (
                                        <div className="flex items-center gap-1.5 text-rose-300 font-bold bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 rounded-full">
                                            <span className="size-2 rounded-full bg-rose-400 animate-pulse"></span>
                                            <span>Active Deficits: <strong>{bookings.filter(b => b.status === 'OVERBOOKED').length} Detected</strong></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                            <button
                                onClick={handleEmergencyStopSell}
                                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <ShieldAlert size={15} />
                                <span>Emergency Stop-Sell (Kill Switch)</span>
                            </button>
                            <button
                                onClick={() => navigateTo('ari-matrix')}
                                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
                            >
                                <Calendar size={15} />
                                <span>Inspect ARI Deficits</span>
                            </button>
                        </div>
                    </div>

                    {/* How Channel Onboarding Works Info Banner */}
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="size-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                                <BookOpen size={16} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-xs">How Channel Onboarding Works</h4>
                                <p className="text-[11px] text-slate-600 mt-0.5">
                                    The 6 channels below are pre-built integration drivers. To connect your hotel: 
                                    <strong> 1. Connect on OTA Extranet</strong> → <strong> 2. Enter Property ID</strong> → <strong> 3. Map Room Types</strong> → <strong> 4. Initial ARI Push</strong>.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setOnboardingChannel(channels[0] || null)}
                            className="btn-secondary text-xs bg-white text-blue-700 border-blue-300 hover:bg-blue-50 shrink-0"
                        >
                            <BookOpen size={13} />
                            <span>View Step-by-Step Guide</span>
                        </button>
                    </div>

                    {/* Channel Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {channels.map((ch) => (
                            <div key={ch.id} className="surface-card p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="size-9 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner">
                                                {ch.code}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900">{ch.name}</h4>
                                                <p className="text-[11px] text-slate-400">{ch.sync_type} • ID: {ch.hotel_id || 'Not Set'}</p>
                                            </div>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ch.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            {ch.status}
                                        </span>
                                    </div>

                                    <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Commission Rate:</span>
                                            <span className="font-semibold text-slate-800">{ch.commission_rate}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Rate Markup Multiplier:</span>
                                            <span className="font-semibold text-emerald-700 font-mono">+{Math.round((Number(ch.rate_multiplier) - 1) * 100)}% ({ch.rate_multiplier}x)</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Mapped Room Types:</span>
                                            <span className="font-semibold text-slate-800">{ch.active_listings_count} Listed</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Bookings Received:</span>
                                            <span className="font-semibold text-slate-800 font-mono">{ch.total_bookings_received} Bookings (৳{Number(ch.total_revenue_generated || 0).toLocaleString()})</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Last Sync:</span>
                                            <span className="font-mono text-slate-700 text-[11px]">
                                                {ch.last_sync_at ? new Date(ch.last_sync_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                                    <button
                                        onClick={() => setOnboardingChannel(ch)}
                                        className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                                        title="View Onboarding Steps & Setup Extranet"
                                    >
                                        <BookOpen size={13} />
                                        <span>Onboard Guide</span>
                                    </button>
                                    <button
                                        onClick={() => handleToggleChannel(ch.id)}
                                        className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border transition-colors ${ch.status === 'ACTIVE' ? 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'}`}
                                    >
                                        {ch.status === 'ACTIVE' ? 'Pause' : 'Activate'}
                                    </button>
                                    <button
                                        onClick={() => handleOpenChannelConfig(ch)}
                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-600 hover:text-slate-900"
                                        title="Edit Extranet Credentials & Multipliers"
                                    >
                                        <Settings size={14} />
                                    </button>
                                    <button
                                        onClick={handleBroadcastPushAri}
                                        className="p-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg"
                                        title="Push Live ARI to this channel"
                                    >
                                        <Send size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* VIEW 2: RATES & INVENTORY MATRIX (Horizontal Calendar Grid) */}
            {currentView === 'ari-matrix' && (
                <>
                    <PageHeader
                        title="Rates, Restrictions & Inventory Grid (ARI)"
                        subtitle="Live 14-day multi-channel calendar matrix displaying real-time sellable inventory, rates, and restrictions."
                        icon={<Calendar className="text-primary size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigateTo('bulk-update')}
                                    className="btn-secondary bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                >
                                    <Sliders size={14} />
                                    <span>Distribution Wizard (Bulk Update)</span>
                                </button>
                                <button onClick={fetchAriMatrix} className="btn-secondary">
                                    <RefreshCw size={14} />
                                    <span>Refresh Grid</span>
                                </button>
                                <button
                                    onClick={handleBroadcastPushAri}
                                    disabled={isPushingAri}
                                    className="btn-primary"
                                >
                                    <Send size={14} className={isPushingAri ? 'animate-spin' : ''} />
                                    <span>{isPushingAri ? 'Pushing ARI...' : 'Instant ARI Push'}</span>
                                </button>
                            </div>
                        }
                    />

                    {/* CRITICAL OVERBOOKING SHIELD ALERT BANNER */}
                    {(() => {
                        const overbookedList = bookings.filter(b => b.status === 'OVERBOOKED' || (b as any).is_overbooked);
                        if (overbookedList.length === 0) return null;
                        return (
                            <div className="bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border-2 border-rose-500/40 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm animate-in fade-in">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 shrink-0 mt-0.5">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-rose-900 tracking-tight">
                                                CRITICAL OVERBOOKING DETECTED: {overbookedList.length} RESERVATIONS EXCEED PHYSICAL CAPACITY
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                Deficit Alert
                                            </span>
                                        </div>
                                        <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                                            External online channels have booked <strong>{overbookedList.length}</strong> reservations beyond your physical inventory limits for <strong>Deluxe Suite</strong>. Emergency Stop-Sell has been triggered to prevent further bookings.
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                                            <button
                                                onClick={handleEmergencyStopSell}
                                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ShieldAlert size={13} />
                                                <span>Emergency Stop-Sell All Channels</span>
                                            </button>
                                            <button
                                                onClick={() => navigateTo('bookings')}
                                                className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <DownloadCloud size={13} />
                                                <span>View & Resolve Inbound Bookings</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="surface-card p-4 space-y-4">
                        <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-sm">
                            <table className="w-full text-xs text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="p-3 sticky left-0 bg-slate-50 z-10 w-48 shadow-sm">Room Category / Parameters</th>
                                        {ariDates.map((dateStr) => {
                                            const { day, label } = formatDateHeader(dateStr);
                                            const isWeekend = day === 'Fri' || day === 'Sat';
                                            return (
                                                <th key={dateStr} className={`p-2.5 text-center min-w-[75px] border-l border-slate-200 ${isWeekend ? 'bg-amber-50/50' : ''}`}>
                                                    <div className="text-[10px] text-slate-400 font-medium uppercase">{day}</div>
                                                    <div className="font-bold text-slate-800">{label}</div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {ariMatrix.length === 0 ? (
                                        <tr>
                                            <td colSpan={ariDates.length + 1} className="p-8 text-center text-slate-400">
                                                Generating live multi-day ARI matrix from PostgreSQL database...
                                            </td>
                                        </tr>
                                    ) : (
                                        ariMatrix.map((roomGroup) => (
                                            <React.Fragment key={roomGroup.roomTypeId}>
                                                {/* Header Category Name */}
                                                <tr className="bg-slate-50/80 font-bold text-slate-900 border-t-2 border-slate-200">
                                                    <td className="p-2.5 sticky left-0 bg-slate-50/80 z-10 flex items-center justify-between">
                                                        <span>{roomGroup.roomTypeName}</span>
                                                        <span className="text-[10px] font-normal text-slate-500">Cap: {roomGroup.totalCapacity} Rms</span>
                                                    </td>
                                                    {roomGroup.days.map((day) => (
                                                        <td key={day.date} className="p-1 border-l border-slate-200 text-center text-[10px] text-slate-400">
                                                            -
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Available Allotment */}
                                                <tr className="hover:bg-slate-50/30">
                                                    <td className="p-2 sticky left-0 bg-white z-10 text-slate-600 font-semibold pl-4">
                                                        Available Allotment
                                                    </td>
                                                    {roomGroup.days.map((day) => (
                                                        <td key={day.date} className="p-2 border-l border-slate-100 text-center">
                                                            {day.availableRooms < 0 ? (
                                                                <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-rose-600 text-white shadow-xs animate-pulse inline-block" title={`Overbooked deficit: ${Math.abs(day.availableRooms)} rooms`}>
                                                                    DEFICIT ({day.availableRooms})
                                                                </span>
                                                            ) : (
                                                                <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${day.availableRooms > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                                                    {day.availableRooms}
                                                                </span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Active Bookings vs Capacity */}
                                                <tr className="hover:bg-slate-50/30 bg-slate-50/40">
                                                    <td className="p-2 sticky left-0 bg-slate-50/90 z-10 text-slate-600 text-[11px] font-medium pl-4">
                                                        Active Bookings (Booked / Cap)
                                                    </td>
                                                    {roomGroup.days.map((day) => {
                                                        const booked = (day as any).bookedRooms != null ? (day as any).bookedRooms : Math.max(0, roomGroup.totalCapacity - day.availableRooms);
                                                        const isDeficit = booked > roomGroup.totalCapacity;
                                                        return (
                                                            <td key={day.date} className="p-2 border-l border-slate-100 text-center font-mono text-[11px]">
                                                                <span className={`font-bold ${isDeficit ? 'text-rose-700' : 'text-slate-700'}`}>
                                                                    {booked} / {roomGroup.totalCapacity}
                                                                </span>
                                                            </td>
                                                        );
                                                    })}
                                                </tr>

                                                {/* Rates */}
                                                <tr className="hover:bg-slate-50/30">
                                                    <td className="p-2 sticky left-0 bg-white z-10 text-slate-600 font-semibold pl-4">
                                                        Daily Rate (BDT)
                                                    </td>
                                                    {roomGroup.days.map((day) => (
                                                        <td key={day.date} className="p-2 border-l border-slate-100 text-center font-mono font-bold text-slate-800">
                                                            ৳{day.rate.toLocaleString()}
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Stop Sell Restrictions */}
                                                <tr className="hover:bg-slate-50/30">
                                                    <td className="p-2 sticky left-0 bg-white z-10 text-slate-600 font-semibold pl-4">
                                                        Stop Sell Status
                                                    </td>
                                                    {roomGroup.days.map((day) => (
                                                        <td key={day.date} className="p-2 border-l border-slate-100 text-center">
                                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${day.stopSell ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                                                {day.stopSell ? 'STOP' : 'OPEN'}
                                                            </span>
                                                        </td>
                                                    ))}
                                                </tr>

                                                {/* Min Stay */}
                                                <tr className="hover:bg-slate-50/30 text-slate-500">
                                                    <td className="p-2 sticky left-0 bg-white z-10 text-slate-500 font-medium pl-4 text-[11px]">
                                                        Min Stay (Nights)
                                                    </td>
                                                    {roomGroup.days.map((day) => (
                                                        <td key={day.date} className="p-2 border-l border-slate-100 text-center text-[11px] font-mono">
                                                            {day.minStay}N
                                                        </td>
                                                    ))}
                                                </tr>
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* VIEW 3: DISTRIBUTION WIZARD (BULK UPDATE) */}
            {currentView === 'bulk-update' && (
                <>
                    <PageHeader
                        title="Distribution Wizard — Multi-Channel Bulk Update"
                        subtitle="Modify room tariffs, minimum stays, closed-to-arrival, and stop-sells across multiple dates and channels."
                        icon={<Sliders className="text-amber-500 size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigateTo('ari-matrix')}
                                    className="btn-secondary"
                                >
                                    <Calendar size={14} />
                                    <span>View Rates Grid</span>
                                </button>
                            </div>
                        }
                    />

                    {/* Emergency Kill Switch Banner in Wizard */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 via-rose-100/60 to-amber-50 border border-rose-300 flex items-center justify-between gap-4 max-w-4xl">
                        <div className="flex items-center gap-3">
                            <div className="size-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                                <ShieldAlert size={18} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-rose-950">Immediate Emergency Stop-Sell (All Channels)</h4>
                                <p className="text-[11px] text-rose-800 mt-0.5">
                                    Experiencing an overbooking crisis or urgent maintenance? Instantly close all sales on Booking.com, Agoda, Expedia, and Airbnb.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleEmergencyStopSell}
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                            <ShieldAlert size={13} />
                            <span>Trigger Stop-Sell</span>
                        </button>
                    </div>

                    <div className="surface-card p-6 max-w-4xl space-y-6">
                        <form onSubmit={handleExecuteBulkUpdate} className="space-y-5 text-xs">
                            {/* Step 1: Date Range & Days of Week */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Step 1: Date Range & Weekday Filter</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={bulkForm.startDate}
                                            onChange={e => setBulkForm({ ...bulkForm, startDate: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">End Date</label>
                                        <input
                                            type="date"
                                            value={bulkForm.endDate}
                                            onChange={e => setBulkForm({ ...bulkForm, endDate: e.target.value })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <label className="font-semibold text-slate-700">Days of Week</label>
                                        <div className="space-x-2 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={() => setBulkForm({ ...bulkForm, daysOfWeek: [0, 1, 2, 3, 4, 5, 6] })}
                                                className="text-primary hover:underline font-semibold"
                                            >
                                                Select All
                                            </button>
                                            <span>•</span>
                                            <button
                                                type="button"
                                                onClick={() => setBulkForm({ ...bulkForm, daysOfWeek: [5, 6] })}
                                                className="text-amber-700 hover:underline font-semibold"
                                            >
                                                Weekends Only (Fri/Sat)
                                            </button>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { day: 0, label: 'Sun' },
                                            { day: 1, label: 'Mon' },
                                            { day: 2, label: 'Tue' },
                                            { day: 3, label: 'Wed' },
                                            { day: 4, label: 'Thu' },
                                            { day: 5, label: 'Fri' },
                                            { day: 6, label: 'Sat' }
                                        ].map(item => {
                                            const isSelected = bulkForm.daysOfWeek.includes(item.day);
                                            return (
                                                <button
                                                    key={item.day}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = isSelected
                                                            ? bulkForm.daysOfWeek.filter(d => d !== item.day)
                                                            : [...bulkForm.daysOfWeek, item.day];
                                                        setBulkForm({ ...bulkForm, daysOfWeek: updated });
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg border font-semibold text-xs transition-colors ${isSelected ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'}`}
                                                >
                                                    {item.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Room Types Selection */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Step 2: Target Room Categories</h4>
                                <div className="flex flex-wrap gap-3">
                                    {ariMatrix.map(m => {
                                        const isSelected = bulkForm.roomTypeIds.includes(m.roomTypeId);
                                        return (
                                            <label key={m.roomTypeId} className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200 cursor-pointer hover:bg-slate-50">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        const updated = isSelected
                                                            ? bulkForm.roomTypeIds.filter(id => id !== m.roomTypeId)
                                                            : [...bulkForm.roomTypeIds, m.roomTypeId];
                                                        setBulkForm({ ...bulkForm, roomTypeIds: updated });
                                                    }}
                                                    className="rounded border-slate-300 text-primary"
                                                />
                                                <span className="font-semibold text-slate-800">{m.roomTypeName}</span>
                                                <span className="text-[11px] text-slate-400 font-mono">(Base ৳{m.baseRate.toLocaleString()})</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Step 3: Rate Adjustment & Restrictions */}
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Step 3: Rates, Restrictions & Inventory Actions</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Rate Modification Action</label>
                                        <select
                                            value={bulkForm.rateAction}
                                            onChange={e => setBulkForm({ ...bulkForm, rateAction: e.target.value as any })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium"
                                        >
                                            <option value="NONE">No Rate Change (Keep Current)</option>
                                            <option value="SET">Set Fixed Rate (BDT)</option>
                                            <option value="INCREASE_PERCENT">Increase by Percentage (%)</option>
                                            <option value="INCREASE_FLAT">Increase by Flat Amount (৳)</option>
                                            <option value="DECREASE_FLAT">Discount / Decrease by Flat Amount (৳)</option>
                                        </select>
                                    </div>
                                    {bulkForm.rateAction !== 'NONE' && (
                                        <div>
                                            <label className="font-semibold text-slate-700 block mb-1">
                                                {bulkForm.rateAction === 'SET' ? 'New Rate Value (BDT)' : bulkForm.rateAction === 'INCREASE_PERCENT' ? 'Percentage % to add' : 'Flat BDT Amount'}
                                            </label>
                                            <input
                                                type="number"
                                                value={bulkForm.rateValue}
                                                onChange={e => setBulkForm({ ...bulkForm, rateValue: Number(e.target.value) })}
                                                className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono font-bold"
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Stop Sell Restriction</label>
                                        <select
                                            value={bulkForm.stopSellAction}
                                            onChange={e => setBulkForm({ ...bulkForm, stopSellAction: e.target.value as any })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium"
                                        >
                                            <option value="NO_CHANGE">No Change</option>
                                            <option value="OPEN">Open Sales (Sellable)</option>
                                            <option value="CLOSE">Stop Sell (Close Online Sales)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Min Length of Stay (Nights)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="30"
                                            value={bulkForm.minStay}
                                            onChange={e => setBulkForm({ ...bulkForm, minStay: Number(e.target.value) })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="font-semibold text-slate-700 block mb-1">Closed to Arrival (CTA)</label>
                                        <select
                                            value={bulkForm.ctaAction}
                                            onChange={e => setBulkForm({ ...bulkForm, ctaAction: e.target.value as any })}
                                            className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-medium"
                                        >
                                            <option value="NO_CHANGE">No Change</option>
                                            <option value="OPEN">Allow Arrival (Open)</option>
                                            <option value="CLOSE">Block Arrival (Closed to Arrival)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isBulkUpdating}
                                className="btn-primary w-full justify-center py-2.5 text-sm font-bold shadow-md"
                            >
                                <Send size={16} className={isBulkUpdating ? 'animate-spin' : ''} />
                                <span>{isBulkUpdating ? 'Broadcasting Bulk Updates to OTAs...' : 'Execute Bulk Distribution Push'}</span>
                            </button>
                        </form>
                    </div>
                </>
            )}

            {/* VIEW 4: CHANNEL ROOM MAPPINGS */}
            {currentView === 'mappings' && (
                <>
                    <PageHeader
                        title="Channel Room & Rate Plan Mappings"
                        subtitle="Maps internal PMS room categories and rate plans to specific OTA extranet inventory codes."
                        icon={<Layers className="text-primary size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsMappingModalOpen(true)}
                                    className="btn-primary"
                                >
                                    <Plus size={15} />
                                    <span>Add Channel Mapping</span>
                                </button>
                                <button onClick={fetchMappings} className="btn-secondary">
                                    <RefreshCw size={14} />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        }
                    />

                    <div className="surface-card p-4 space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="p-2.5">Channel</th>
                                        <th className="p-2.5">PMS Room Type</th>
                                        <th className="p-2.5">OTA Room Name & Code</th>
                                        <th className="p-2.5">OTA Rate Code</th>
                                        <th className="p-2.5 text-center">Multiplier</th>
                                        <th className="p-2.5 text-center">Status</th>
                                        <th className="p-2.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {mappings.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-6 text-center text-slate-400">
                                                No channel room mappings configured yet. Click "Add Channel Mapping" to map room categories.
                                            </td>
                                        </tr>
                                    ) : (
                                        mappings.map((m) => (
                                            <tr key={m.id} className="hover:bg-slate-50/50">
                                                <td className="p-2.5">
                                                    {getChannelBadge(m.channel_id, m.channel_name)}
                                                </td>
                                                <td className="p-2.5 font-bold text-slate-900">
                                                    {m.pms_room_type_name}
                                                    <span className="block text-[11px] font-normal text-slate-400">Base: ৳{Number(m.pms_base_rate || 0).toLocaleString()}</span>
                                                </td>
                                                <td className="p-2.5">
                                                    <div className="font-semibold text-slate-800">{m.ota_room_name}</div>
                                                    <code className="text-[10px] text-slate-500">{m.ota_room_code}</code>
                                                </td>
                                                <td className="p-2.5 font-mono text-slate-700">{m.ota_rate_code}</td>
                                                <td className="p-2.5 text-center font-mono font-bold text-emerald-700">
                                                    {m.rate_multiplier}x
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${m.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                        {m.is_active ? 'MAPPED' : 'INACTIVE'}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-right">
                                                    <button
                                                        onClick={() => handleDeleteMapping(m.id)}
                                                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded"
                                                        title="Delete mapping"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* VIEW 5: INBOUND OTA BOOKINGS QUEUE */}
            {currentView === 'bookings' && (
                <>
                    <PageHeader
                        title="Inbound OTA Channel Bookings Queue"
                        subtitle="Centralized queue of all reservations received from external online channels with revenue and commission analytics."
                        icon={<DownloadCloud className="text-primary size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleFetchLiveBookings}
                                    disabled={isFetchingBookings}
                                    className="btn-primary"
                                >
                                    <DownloadCloud size={14} className={isFetchingBookings ? 'animate-bounce' : ''} />
                                    <span>Fetch Pending Extranet Bookings</span>
                                </button>
                                <button onClick={fetchBookings} className="btn-secondary">
                                    <RefreshCw size={14} />
                                    <span>Refresh</span>
                                </button>
                            </div>
                        }
                    />

                    {/* CRITICAL OVERBOOKING SHIELD ALERT BANNER */}
                    {(() => {
                        const overbookedList = bookings.filter(b => b.status === 'OVERBOOKED' || (b as any).is_overbooked);
                        if (overbookedList.length === 0) return null;
                        return (
                            <div className="bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border-2 border-rose-500/40 rounded-xl p-4 flex items-start justify-between gap-4 shadow-sm animate-in fade-in">
                                <div className="flex items-start gap-3">
                                    <div className="p-2 rounded-lg bg-rose-500/20 text-rose-600 shrink-0 mt-0.5">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-bold text-rose-900 tracking-tight">
                                                CRITICAL OVERBOOKING DETECTED: {overbookedList.length} RESERVATIONS EXCEED PHYSICAL CAPACITY
                                            </h4>
                                            <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider animate-pulse">
                                                Deficit Alert
                                            </span>
                                        </div>
                                        <p className="text-xs text-rose-800/90 mt-1 leading-relaxed">
                                            External online channels have booked <strong>{overbookedList.length}</strong> reservations beyond your physical inventory limits for <strong>Deluxe Suite</strong>. Emergency Stop-Sell has been triggered to prevent further bookings.
                                        </p>
                                        <div className="flex items-center gap-2.5 mt-3 flex-wrap">
                                            <button
                                                onClick={handleEmergencyStopSell}
                                                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <ShieldAlert size={13} />
                                                <span>Emergency Stop-Sell All Channels</span>
                                            </button>
                                            <button
                                                onClick={() => navigateTo('ari-matrix')}
                                                className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                                            >
                                                <Calendar size={13} />
                                                <span>Inspect Negative Deficits in ARI Grid</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    <div className="surface-card p-4 space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="p-2.5">OTA Channel</th>
                                        <th className="p-2.5">Booking Ref</th>
                                        <th className="p-2.5">Guest Information</th>
                                        <th className="p-2.5">Room & Stay</th>
                                        <th className="p-2.5 text-right">Gross Total</th>
                                        <th className="p-2.5 text-right">Commission</th>
                                        <th className="p-2.5 text-right">Net Receivable</th>
                                        <th className="p-2.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bookings.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="p-8 text-center text-slate-400">
                                                No inbound OTA bookings recorded yet. Click "Fetch Pending Extranet Bookings" or simulate via Webhook.
                                            </td>
                                        </tr>
                                    ) : (
                                        bookings.map((bk) => (
                                            <tr key={bk.id} className="hover:bg-slate-50/50">
                                                <td className="p-2.5">
                                                    {getChannelBadge(bk.channel_id, bk.channel_name)}
                                                </td>
                                                <td className="p-2.5 font-mono">
                                                    <div className="font-bold text-slate-900">{bk.channel_booking_ref}</div>
                                                    <span className="text-[10px] text-slate-400">Rec: {bk.created_at?.slice(0, 10)}</span>
                                                </td>
                                                <td className="p-2.5">
                                                    <div className="font-bold text-slate-900">{bk.guest_name}</div>
                                                    <div className="text-[11px] text-slate-500">{bk.guest_email || bk.guest_phone || 'No direct contact'}</div>
                                                </td>
                                                <td className="p-2.5">
                                                    <div className="font-semibold text-slate-800">{bk.room_type_name}</div>
                                                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                                                        <span>{bk.check_in_date} → {bk.check_out_date} ({bk.nights}N)</span>
                                                        <span>•</span>
                                                        <span>Rm:</span>
                                                        {(!bk.assigned_room_number || bk.assigned_room_number.toUpperCase() === 'UNASSIGNED') ? (
                                                            <span className="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded text-[10px]">
                                                                UNASSIGNED
                                                            </span>
                                                        ) : (
                                                            <div className="inline-flex items-center gap-1">
                                                                <span className="font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded text-[10px]">
                                                                    Room {bk.assigned_room_number}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleUnassignRoom(bk.channel_booking_ref)}
                                                                    className="text-[9.5px] text-slate-400 hover:text-rose-600 underline cursor-pointer ml-1"
                                                                    title="Unassign room back to Unassigned Pool"
                                                                >
                                                                    Unassign
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                                                    ৳{Number(bk.total_amount).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-rose-600">
                                                    ৳{Number(bk.commission_amount).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-right font-mono font-bold text-emerald-700">
                                                    ৳{Number(bk.net_payout).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 text-center">
                                                    {bk.status === 'OVERBOOKED' ? (
                                                        <div className="inline-flex flex-col items-center gap-1">
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                                                                OVERBOOKED
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleOpenResolutionModal(bk)}
                                                                className="text-[9.5px] font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer"
                                                            >
                                                                Resolve Deficit
                                                            </button>
                                                        </div>
                                                    ) : bk.status?.startsWith('RESOLVED_') ? (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                                            ✓ {bk.status.replace('RESOLVED_', '')}
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            {bk.status}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* VIEW 6: AUDIT TRAIL LOGS & WEBHOOK SIMULATOR */}
            {currentView === 'logs' && (
                <>
                    <PageHeader
                        title="Channel Sync & Network Audit Logs"
                        subtitle="Detailed audit trail of ARI pushes, inbound webhooks, and rate modifications across global channels."
                        icon={<Clock className="text-primary size-5" />}
                        actions={
                            <div className="flex items-center gap-2">
                                <button onClick={fetchSyncLogs} className="btn-secondary">
                                    <RefreshCw size={14} />
                                    <span>Refresh Logs</span>
                                </button>
                            </div>
                        }
                    />

                    {/* Collapsible Inbound Webhook Simulator */}
                    <div className="surface-card p-5">
                        <div className="mb-4">
                            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Zap size={16} className="text-amber-500" />
                                Simulate Inbound OTA Reservation Webhook
                            </h3>
                            <p className="text-xs text-slate-500">
                                Tests the endpoint <code>POST /api/channel-manager/webhook/ota-booking</code> that external OTAs invoke when a guest makes an online reservation.
                            </p>
                        </div>

                        <form onSubmit={handleSendTestWebhook} className="space-y-3.5 text-xs">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Source OTA Channel</label>
                                    <select
                                        value={webhookForm.channelName}
                                        onChange={e => setWebhookForm({ ...webhookForm, channelName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                    >
                                        {channels.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Target Room Category</label>
                                    <select
                                        value={webhookForm.roomTypeName}
                                        onChange={e => setWebhookForm({ ...webhookForm, roomTypeName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                    >
                                        {ariMatrix.map(m => (
                                            <option key={m.roomTypeId} value={m.roomTypeName}>{m.roomTypeName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Guest First Name</label>
                                    <input
                                        type="text"
                                        value={webhookForm.guestFirstName}
                                        onChange={e => setWebhookForm({ ...webhookForm, guestFirstName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Guest Last Name</label>
                                    <input
                                        type="text"
                                        value={webhookForm.guestLastName}
                                        onChange={e => setWebhookForm({ ...webhookForm, guestLastName: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={webhookForm.guestEmail}
                                        onChange={e => setWebhookForm({ ...webhookForm, guestEmail: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Check-in Date</label>
                                    <input
                                        type="date"
                                        value={webhookForm.checkInDate}
                                        onChange={e => setWebhookForm({ ...webhookForm, checkInDate: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Check-out Date</label>
                                    <input
                                        type="date"
                                        value={webhookForm.checkOutDate}
                                        onChange={e => setWebhookForm({ ...webhookForm, checkOutDate: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Total Booking Value (BDT)</label>
                                    <input
                                        type="number"
                                        value={webhookForm.totalAmount}
                                        onChange={e => setWebhookForm({ ...webhookForm, totalAmount: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">OTA Commission Fee (BDT)</label>
                                    <input
                                        type="number"
                                        value={webhookForm.commissionAmount}
                                        onChange={e => setWebhookForm({ ...webhookForm, commissionAmount: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="btn-primary w-full justify-center py-2"
                            >
                                {isLoading ? 'Ingesting Webhook...' : 'Dispatch Live Inbound Webhook'}
                            </button>
                        </form>
                    </div>

                    <div className="surface-card p-4 space-y-4">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                                        <th className="p-2.5">Timestamp</th>
                                        <th className="p-2.5">Channel</th>
                                        <th className="p-2.5">Event Type</th>
                                        <th className="p-2.5">Payload / Summary</th>
                                        <th className="p-2.5 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {syncLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-6 text-center text-slate-400">
                                                No sync logs recorded yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        syncLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-slate-50/50">
                                                <td className="p-2.5 font-mono text-slate-500 whitespace-nowrap">{log.created_at?.slice(0, 19).replace('T', ' ')}</td>
                                                <td className="p-2.5 font-bold text-slate-800">{log.channel_name}</td>
                                                <td className="p-2.5">
                                                    <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-[11px] text-slate-700">
                                                        {log.event_type}
                                                    </span>
                                                </td>
                                                <td className="p-2.5 text-slate-600 font-mono text-[11px] max-w-md truncate">{log.payload_json || '-'}</td>
                                                <td className="p-2.5 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                                                        {log.status || 'SUCCESS'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* ========================================================= */}
            {/* MODAL 1: CHANNEL CONFIGURATION MODAL */}
            {/* ========================================================= */}
            {selectedChannelForConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Settings size={16} className="text-primary" />
                                {selectedChannelForConfig.name} Configuration
                            </h3>
                            <button
                                onClick={() => setSelectedChannelForConfig(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveChannelConfig} className="space-y-3.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Extranet Hotel / Property ID</label>
                                <input
                                    type="text"
                                    value={configFormData.hotel_id}
                                    onChange={e => setConfigFormData({ ...configFormData, hotel_id: e.target.value })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                    placeholder="e.g. BDC-77491"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={configFormData.commission_rate}
                                        onChange={e => setConfigFormData({ ...configFormData, commission_rate: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Price Markup Multiplier</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={configFormData.rate_multiplier}
                                        onChange={e => setConfigFormData({ ...configFormData, rate_multiplier: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        placeholder="1.15 = +15%"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Synchronization Mode</label>
                                <select
                                    value={configFormData.sync_type}
                                    onChange={e => setConfigFormData({ ...configFormData, sync_type: e.target.value as any })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                >
                                    <option value="2-Way Realtime">2-Way Realtime (ARI Push + Reservation Pull)</option>
                                    <option value="1-Way Push">1-Way Push (ARI Inventory Only)</option>
                                    <option value="iCal Sync">iCal Sync (Calendar Sync)</option>
                                </select>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-slate-100">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={configFormData.auto_sync_inventory}
                                        onChange={e => setConfigFormData({ ...configFormData, auto_sync_inventory: e.target.checked })}
                                        className="rounded border-slate-300 text-primary"
                                    />
                                    <span className="font-semibold text-slate-700">Auto-push inventory on Front Desk booking events</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={configFormData.auto_ingest_bookings}
                                        onChange={e => setConfigFormData({ ...configFormData, auto_ingest_bookings: e.target.checked })}
                                        className="rounded border-slate-300 text-primary"
                                    />
                                    <span className="font-semibold text-slate-700">Auto-ingest inbound OTA reservations into StayView</span>
                                </label>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedChannelForConfig(null)}
                                    className="btn-secondary flex-1 justify-center py-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 justify-center py-2 font-bold"
                                >
                                    Save Configuration
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 2: ADD / EDIT CHANNEL ROOM MAPPING */}
            {/* ========================================================= */}
            {isMappingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Layers size={16} className="text-primary" />
                                Add Channel Room Category Mapping
                            </h3>
                            <button
                                onClick={() => setIsMappingModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSaveMapping} className="space-y-3.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Target OTA Channel</label>
                                <select
                                    value={mappingForm.channel_id}
                                    onChange={e => setMappingForm({ ...mappingForm, channel_id: e.target.value })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                >
                                    {channels.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">PMS Room Type</label>
                                <select
                                    value={mappingForm.room_type_id}
                                    onChange={e => setMappingForm({ ...mappingForm, room_type_id: Number(e.target.value) })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                >
                                    {ariMatrix.map(m => (
                                        <option key={m.roomTypeId} value={m.roomTypeId}>{m.roomTypeName}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">OTA Room Code</label>
                                    <input
                                        type="text"
                                        value={mappingForm.ota_room_code}
                                        onChange={e => setMappingForm({ ...mappingForm, ota_room_code: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        placeholder="e.g. BDC_DLX_01"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">OTA Rate Plan Code</label>
                                    <input
                                        type="text"
                                        value={mappingForm.ota_rate_code}
                                        onChange={e => setMappingForm({ ...mappingForm, ota_rate_code: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        placeholder="e.g. BAR_STD"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">OTA Room Name (as shown on extranet)</label>
                                <input
                                    type="text"
                                    value={mappingForm.ota_room_name}
                                    onChange={e => setMappingForm({ ...mappingForm, ota_room_name: e.target.value })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                    placeholder="e.g. Deluxe Double Room with Sea View"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Rate Multiplier</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={mappingForm.rate_multiplier}
                                        onChange={e => setMappingForm({ ...mappingForm, rate_multiplier: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Allotment Cap (0 = All)</label>
                                    <input
                                        type="number"
                                        value={mappingForm.max_allotment}
                                        onChange={e => setMappingForm({ ...mappingForm, max_allotment: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsMappingModalOpen(false)}
                                    className="btn-secondary flex-1 justify-center py-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 justify-center py-2 font-bold"
                                >
                                    Save Mapping
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 3: STEP-BY-STEP ONBOARDING GUIDE MODAL */}
            {/* ========================================================= */}
            {onboardingChannel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="size-8 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs">
                                    {onboardingChannel.code}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">
                                        Onboarding Guide: {onboardingChannel.name}
                                    </h3>
                                    <p className="text-[11px] text-slate-500">
                                        {ONBOARDING_GUIDES[onboardingChannel.id]?.providerName || 'HotelManagementOS Connectivity'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setOnboardingChannel(null)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Step 1: Extranet Activation */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                    <span className="size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">1</span>
                                    Connect on {ONBOARDING_GUIDES[onboardingChannel.id]?.extranetName || `${onboardingChannel.name} Portal`}
                                </span>
                                {ONBOARDING_GUIDES[onboardingChannel.id]?.extranetUrl && (
                                    <a
                                        href={ONBOARDING_GUIDES[onboardingChannel.id].extranetUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                                    >
                                        Open Extranet <ExternalLink size={11} />
                                    </a>
                                )}
                            </div>
                            <ol className="list-decimal list-inside space-y-1 text-xs text-slate-600 pl-1">
                                {(ONBOARDING_GUIDES[onboardingChannel.id]?.instructions || [
                                    `Log into your ${onboardingChannel.name} extranet dashboard.`,
                                    'Go to Account Settings -> Channel Manager / Connectivity Provider.',
                                    'Search for "HotelManagementOS" and authorize connection.',
                                    'Copy your Extranet Property ID and save it below.'
                                ]).map((step, idx) => (
                                    <li key={idx} className="leading-relaxed">{step}</li>
                                ))}
                            </ol>
                        </div>

                        {/* Step 2: Hotel ID Configuration */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                <span className="size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">2</span>
                                Set Property ID & Price Markup
                            </span>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Extranet Hotel / Property ID</label>
                                    <input
                                        type="text"
                                        value={onboardingChannel.hotel_id}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setOnboardingChannel({ ...onboardingChannel, hotel_id: val });
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                                        placeholder="e.g. BDC-77491"
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Rate Markup (Offset Commission)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={onboardingChannel.rate_multiplier}
                                        onChange={(e) => {
                                            const val = Number(e.target.value);
                                            setOnboardingChannel({ ...onboardingChannel, rate_multiplier: val });
                                        }}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                                        placeholder="1.15 = +15%"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={async () => {
                                    try {
                                        const propId = getActivePropertyId() || 1;
                                        await fetch(`${getApiBaseUrl()}/api/channel-manager/channels/${onboardingChannel.id}`, {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                                            body: JSON.stringify({
                                                propertyId: propId,
                                                hotel_id: onboardingChannel.hotel_id,
                                                rate_multiplier: onboardingChannel.rate_multiplier
                                            })
                                        });
                                        toast.success('Property ID & markup saved!');
                                        fetchChannels();
                                    } catch (e: any) {
                                        toast.error(e.message);
                                    }
                                }}
                                className="btn-secondary text-xs w-full justify-center bg-white"
                            >
                                <CheckCircle2 size={13} className="text-emerald-600" /> Save Property ID
                            </button>
                        </div>

                        {/* Step 3: Room Mapping */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                            <div>
                                <span className="font-bold text-xs text-slate-900 flex items-center gap-2">
                                    <span className="size-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">3</span>
                                    Room & Rate Plan Mapping
                                </span>
                                <p className="text-[11px] text-slate-500 mt-0.5">Map PMS room categories to this OTA's extranet categories</p>
                            </div>
                            <button
                                onClick={() => {
                                    setOnboardingChannel(null);
                                    navigateTo('mappings');
                                }}
                                className="btn-secondary text-xs bg-white text-primary border-primary/30 hover:bg-primary/5 flex items-center gap-1"
                            >
                                <span>Open Mappings</span> <ArrowRight size={13} />
                            </button>
                        </div>

                        {/* Step 4: Verification & Live Push */}
                        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
                            <div>
                                <span className="font-bold text-xs text-emerald-900 flex items-center gap-2">
                                    <span className="size-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">4</span>
                                    Initial ARI Push & Live Verification
                                </span>
                                <p className="text-[11px] text-emerald-700 mt-0.5">Upload current 30-day rates and availability to go live</p>
                            </div>
                            <button
                                onClick={async () => {
                                    await handleBroadcastPushAri();
                                    setOnboardingChannel(null);
                                }}
                                className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700 border-none flex items-center gap-1.5"
                            >
                                <Send size={13} />
                                <span>Push Live ARI</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================= */}
            {/* MODAL 4: ONBOARD NEW CUSTOM CHANNEL MODAL */}
            {/* ========================================================= */}
            {isOnboardingNewCustomChannel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md p-6 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Plus size={16} className="text-primary" />
                                Onboard New Custom Distribution Channel
                            </h3>
                            <button
                                onClick={() => setIsOnboardingNewCustomChannel(false)}
                                className="text-slate-400 hover:text-slate-600 font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleCreateCustomChannel} className="space-y-3.5 text-xs">
                            <div>
                                <label className="font-semibold text-slate-700 block mb-1">Channel Name</label>
                                <input
                                    type="text"
                                    value={newCustomChannelForm.name}
                                    onChange={e => setNewCustomChannelForm({ ...newCustomChannelForm, name: e.target.value })}
                                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg"
                                    placeholder="e.g. Google Hotel Ads, Hostelworld, Web Direct"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Channel Code (3-4 Letters)</label>
                                    <input
                                        type="text"
                                        value={newCustomChannelForm.code}
                                        onChange={e => setNewCustomChannelForm({ ...newCustomChannelForm, code: e.target.value.toUpperCase() })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        placeholder="e.g. GHA"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Extranet Hotel / ID</label>
                                    <input
                                        type="text"
                                        value={newCustomChannelForm.hotel_id}
                                        onChange={e => setNewCustomChannelForm({ ...newCustomChannelForm, hotel_id: e.target.value })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        placeholder="e.g. GHA-90812"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Commission Rate (%)</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={newCustomChannelForm.commission_rate}
                                        onChange={e => setNewCustomChannelForm({ ...newCustomChannelForm, commission_rate: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="font-semibold text-slate-700 block mb-1">Rate Markup Multiplier</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newCustomChannelForm.rate_multiplier}
                                        onChange={e => setNewCustomChannelForm({ ...newCustomChannelForm, rate_multiplier: Number(e.target.value) })}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg font-mono"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setIsOnboardingNewCustomChannel(false)}
                                    className="btn-secondary flex-1 justify-center py-2"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex-1 justify-center py-2 font-bold"
                                >
                                    Onboard Channel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

                        {/* ========================================================= */}
            {/* MODAL 5: ANTI-OVERBOOKING RESOLUTION MODAL (COMPACT & USER-FRIENDLY) */}
            {/* ========================================================= */}
            {resolutionModalBooking && (() => {
                const bk = resolutionModalBooking;
                const currentGroup = ariMatrix.find(m => m.roomTypeName.toLowerCase() === bk.room_type_name.toLowerCase()) || {
                    roomTypeId: 1,
                    roomTypeName: bk.room_type_name,
                    totalCapacity: 2,
                    baseRate: 25000,
                    days: []
                };

                const stayDays = currentGroup.days.filter(d => d.date >= bk.check_in_date && d.date < bk.check_out_date);

                let worstAvailability = 0;
                let peakBooked = 0;

                if (stayDays.length > 0) {
                    worstAvailability = Math.min(...stayDays.map(d => d.availableRooms));
                    peakBooked = Math.max(...stayDays.map(d => (d as any).bookedCount ?? Math.max(0, currentGroup.totalCapacity - d.availableRooms)));
                } else {
                    const overlapping = bookings.filter(b => 
                        b.room_type_name.toLowerCase() === bk.room_type_name.toLowerCase() &&
                        b.status !== 'CANCELLED' &&
                        b.check_in_date < bk.check_out_date &&
                        b.check_out_date > bk.check_in_date
                    );
                    peakBooked = overlapping.length;
                    worstAvailability = currentGroup.totalCapacity - peakBooked;
                }

                const deficitCount = worstAvailability < 0 ? Math.abs(worstAvailability) : 0;

                // Dynamic upgrade options from real database room types in ariMatrix
                const upgradeOptions = ariMatrix
                    .filter(m => m.roomTypeName.toLowerCase() !== bk.room_type_name.toLowerCase())
                    .map(m => {
                        const candStayDays = m.days.filter(d => d.date >= bk.check_in_date && d.date < bk.check_out_date);
                        const minAvail = candStayDays.length > 0 ? Math.min(...candStayDays.map(d => d.availableRooms)) : m.totalCapacity;
                        const tariffDiffPerNight = Math.max(0, m.baseRate - currentGroup.baseRate);
                        const totalUpgradeValue = tariffDiffPerNight * (bk.nights || 1);

                        return {
                            id: m.roomTypeId,
                            name: m.roomTypeName,
                            capacity: m.totalCapacity,
                            minAvailable: minAvail,
                            baseRate: m.baseRate,
                            tariffDiffPerNight,
                            totalUpgradeValue,
                            isRecommended: minAvail > 0
                        };
                    });

                const activeUpgrade = upgradeOptions.find(o => o.name === selectedUpgradeType) || upgradeOptions[0];

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
                        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl my-auto flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-150">
                            
                            {/* 1. Header (Pinned & Compact) */}
                            <div className="px-5 py-3 border-b border-slate-200/80 bg-white flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2.5">
                                    <div className="size-8 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                                        <ShieldAlert size={16} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-900 text-sm tracking-tight">
                                                Overbooking Resolution Desk
                                            </h3>
                                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 animate-pulse">
                                                <span className="size-1.5 rounded-full bg-rose-600"></span>
                                                Deficit: -{deficitCount} Rms
                                            </span>
                                        </div>
                                        <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                            <span>Ref: <strong className="font-mono text-slate-800">{bk.channel_booking_ref}</strong></span>
                                            <span>•</span>
                                            <span>Channel: <strong className="text-slate-800">{bk.channel_name || bk.channel_id}</strong></span>
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setResolutionModalBooking(null)}
                                    className="size-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer text-xs"
                                    title="Close Modal"
                                >
                                    <X size={15} />
                                </button>
                            </div>

                            {/* 2. Scrollable Body (flex-1 min-h-0 overflow-y-auto) */}
                            <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
                                
                                {/* A. Compact Guest & Reservation Card */}
                                <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Guest</span>
                                        <span className="font-bold text-slate-900 truncate block mt-0.5">{bk.guest_name}</span>
                                        <span className="text-[10.5px] text-slate-500 truncate block">
                                            {bk.guest_phone || bk.guest_email || 'OTA Direct'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Booked Room</span>
                                        <span className="font-bold text-slate-900 truncate block mt-0.5">{bk.room_type_name}</span>
                                        <span className="text-[10.5px] text-slate-500 block">
                                            Cap: {currentGroup.totalCapacity} Physical Rm(s)
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Dates & Nights</span>
                                        <span className="font-bold text-slate-900 block mt-0.5">
                                            {bk.check_in_date} ({bk.nights}N)
                                        </span>
                                        <span className="text-[10.5px] text-primary font-medium block">
                                            Dep: {bk.check_out_date}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Financial</span>
                                        <span className="font-mono font-bold text-emerald-700 block mt-0.5">
                                            Net: ৳{Number(bk.net_payout).toLocaleString()}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono block">
                                            Gross: ৳{Number(bk.total_amount).toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                {/* B. Compact Shortfall Notification Strip */}
                                <div className="px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 text-rose-900 min-w-0">
                                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                                        <span className="truncate">
                                            <strong>Capacity Exhaustion:</strong> {currentGroup.totalCapacity} rooms exist, but <strong>{peakBooked}</strong> reservations active for these dates.
                                        </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-mono font-bold text-[10.5px] shrink-0">
                                        -{deficitCount} Deficit
                                    </span>
                                </div>

                                {/* C. Compact Strategy Switcher (Tab Buttons) */}
                                <div>
                                    <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                                        Select Dynamic Resolution Strategy
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setResolutionMode('UPGRADE')}
                                            className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                                resolutionMode === 'UPGRADE'
                                                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <Crown size={15} className={resolutionMode === 'UPGRADE' ? 'text-emerald-600' : 'text-slate-400'} />
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs truncate">Free Upgrade</div>
                                                <div className="text-[9.5px] opacity-75 truncate">Recommended</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setResolutionMode('RELOCATE')}
                                            className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                                resolutionMode === 'RELOCATE'
                                                    ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-500 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <Building2 size={15} className={resolutionMode === 'RELOCATE' ? 'text-blue-600' : 'text-slate-400'} />
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs truncate">Sister Hotel</div>
                                                <div className="text-[9.5px] opacity-75 truncate">Partner Chain</div>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setResolutionMode('OTA_REQUEST')}
                                            className={`px-3 py-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                                resolutionMode === 'OTA_REQUEST'
                                                    ? 'border-purple-600 bg-purple-50 text-purple-900 ring-1 ring-purple-500 shadow-xs'
                                                    : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                                            }`}
                                        >
                                            <Globe size={15} className={resolutionMode === 'OTA_REQUEST' ? 'text-purple-600' : 'text-slate-400'} />
                                            <div className="min-w-0">
                                                <div className="font-bold text-xs truncate">OTA Extranet</div>
                                                <div className="text-[9.5px] opacity-75 truncate">Relocate Notice</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {/* D. Dynamic Strategy Configuration Area */}
                                {resolutionMode === 'UPGRADE' && (
                                    <div className="space-y-2 p-3 bg-slate-50/70 border border-slate-200 rounded-xl">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-bold text-slate-800">
                                                Select Upgrade Category (Live Database Vacancy):
                                            </span>
                                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full">
                                                Tariff Delta: ৳0.00 (Complimentary)
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            {upgradeOptions.map((opt) => (
                                                <div
                                                    key={opt.id}
                                                    onClick={() => setSelectedUpgradeType(opt.name)}
                                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                                                        selectedUpgradeType === opt.name
                                                            ? 'border-emerald-600 bg-white ring-1 ring-emerald-500 shadow-xs'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <span className="font-bold text-xs text-slate-900 truncate">{opt.name}</span>
                                                        {opt.minAvailable > 0 ? (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                                                {opt.minAvailable} Vacant
                                                            </span>
                                                        ) : (
                                                            <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 shrink-0">
                                                                0 Vacant
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[10px] text-slate-500 font-mono">
                                                        Std: ৳{Number(opt.baseRate).toLocaleString()}/nt
                                                    </div>
                                                    <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                                        Absorbed: ৳{Number(opt.totalUpgradeValue).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {resolutionMode === 'RELOCATE' && (
                                    <div className="space-y-2 p-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs">
                                        <label className="font-bold text-slate-800 block">
                                            Select Sister Property / Partner Hotel:
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {sisterProperties.map((sp) => (
                                                <div
                                                    key={sp.id}
                                                    onClick={() => setSisterHotelInput(`${sp.name} (${sp.city})`)}
                                                    className={`p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                                                        sisterHotelInput.includes(sp.name)
                                                            ? 'border-blue-600 bg-white ring-1 ring-blue-500 shadow-xs'
                                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="font-bold text-xs text-slate-900">{sp.name}</span>
                                                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-100 text-blue-800">
                                                            {sp.city}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500">
                                                        {sp.code} • Pre-arranged group partner agreement
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 pt-0.5">
                                            <input type="checkbox" id="shuttle" defaultChecked className="rounded text-primary" />
                                            <label htmlFor="shuttle" className="cursor-pointer">
                                                Include complimentary luxury airport/city shuttle voucher for the guest
                                            </label>
                                        </div>
                                    </div>
                                )}

                                {resolutionMode === 'OTA_REQUEST' && (
                                    <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-950 space-y-1">
                                        <div className="font-bold flex items-center gap-1.5 text-purple-900 text-xs">
                                            <Globe size={14} />
                                            <span>OTA Extranet Protocol: Overbooking Relocation Assistance</span>
                                        </div>
                                        <p className="text-[11px] text-purple-900/90 leading-relaxed">
                                            An automated XML/JSON partner dispatch will be transmitted to <strong>{bk.channel_id} Extranet Partner Support</strong> for Booking Ref: <strong>{bk.channel_booking_ref}</strong>. The OTA partner team will re-accommodate the guest in an equivalent 5-star property without penalty fees.
                                        </p>
                                    </div>
                                )}

                                {/* E. Manager Audit Note */}
                                <div>
                                    <label className="text-[10.5px] font-bold text-slate-700 block mb-1">
                                        Duty Manager Memo / Approval Reference
                                    </label>
                                    <textarea
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        placeholder="Add resolution reason or duty manager approval code..."
                                        rows={2}
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:ring-1 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                            </div>

                            {/* 3. Action Footer (Always Fixed & Visible) */}
                            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setResolutionModalBooking(null)}
                                    className="btn-secondary text-xs px-3.5 py-2 text-slate-700 hover:bg-slate-200/60"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="button"
                                    disabled={isResolving}
                                    onClick={() => handleResolveOverbooking(bk, resolutionMode)}
                                    className="btn-primary text-xs px-5 py-2 font-bold bg-emerald-600 hover:bg-emerald-700 border-none flex items-center gap-2 shadow-xs cursor-pointer"
                                >
                                    {isResolving ? (
                                        <>
                                            <RefreshCw size={13} className="animate-spin" />
                                            <span>Applying...</span>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={14} />
                                            <span>
                                                {resolutionMode === 'UPGRADE'
                                                    ? `Confirm Upgrade to ${selectedUpgradeType || activeUpgrade?.name || 'Selected Category'}`
                                                    : resolutionMode === 'RELOCATE'
                                                    ? `Confirm Sister Hotel Relocation`
                                                    : `Dispatch OTA Extranet Notice`}
                                            </span>
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </div>
                );
            })()}
        </div>
    );
};


export default ChannelManagerView;