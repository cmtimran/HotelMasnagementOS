import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getApiBaseUrl } from '../../utils/apiUrl';
import {
    MessageSquare,
    Search,
    Send,
    Bot,
    Sparkles,
    CheckCircle2,
    Luggage,
    UserCheck,
    RefreshCw,
    QrCode,
    Check,
    Edit3,
    Settings,
    X,
    ExternalLink,
    Zap,
    Lock,
    FileText,
    ChevronDown,
    Wrench,
    BarChart3,
    Clock,
    ArrowUpRight,
    Plus,
    Crown,
    Copy,
    CheckCheck
} from 'lucide-react';
import MultiChannelSettingsPanel from './MultiChannelSettingsPanel';

interface CopilotData {
    relationshipTier: 'IN_HOUSE' | 'UPCOMING_BOOKING' | 'REPEAT_VIP' | 'PREVIOUS_INQUIRER' | 'FIRST_TIME';
    summaryBadge: string;
    isReturningGuest: boolean;
    guestId?: number;
    guestFullName: string;
    stayCount: number;
    lifetimeSpend: number;
    activeReservation?: {
        id: number;
        resNo: string;
        status: string;
        roomType: string;
        arrivalDate: string;
        departureDate: string;
        balanceDue: number;
    };
    lastStay?: {
        resNo: string;
        dates: string;
        roomType: string;
        roomNumber: string;
    };
    favoriteRoomType?: string;
    preferences?: string;
    pastNotes?: string;
    previousChatSummary?: string;
    copilotOneParagraphSummary: string;
}

interface CxConversation {
    id: number;
    property_id: number;
    channel_account_id?: number | null;
    guest_id?: number | null;
    reservation_id?: number | null;
    channel: string; // 'WHATSAPP', 'MESSENGER', 'FACEBOOK_COMMENT', 'INSTAGRAM_DM', 'INSTAGRAM_COMMENT', etc.
    source_type?: 'DIRECT_MESSAGE' | 'POST_COMMENT';
    external_user_id: string;
    guest_name: string;
    status: 'OPEN' | 'PENDING_APPROVAL' | 'RESOLVED' | 'BOT_ACTIVE';
    ai_mode: 'OFF' | 'SUGGEST' | 'AUTOPILOT';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'ANGRY';
    last_message_text: string;
    last_message_at: string;
    unread_count: number;
    post_id?: string;
    comment_id?: string;
    post_url?: string;
    account_name?: string;
    channel_type?: string;
    reservation_number?: string;
    reservation_status?: string;
    check_in_date?: string;
    check_out_date?: string;
    total_amount?: number;
    balance_due?: number;
    is_pre_checked_in?: boolean;
    kyc_verified?: boolean;
    pre_checkin_eta?: string;
    luggage_tag_number?: string;
    arrived_early_at?: string;
    room_number?: string;
    room_type_name?: string;
    takeover_until?: string | null;
    handoff_reason?: string | null;
}

interface CxMessage {
    id: number;
    conversation_id: number;
    sender_type: 'GUEST' | 'STAFF' | 'AI_BOT';
    sender_name: string;
    message_text: string;
    media_url?: string;
    media_type?: string;
    status: string;
    suggested_reply?: string;
    is_approved?: boolean;
    source_type?: 'DIRECT_MESSAGE' | 'POST_COMMENT';
    post_id?: string;
    comment_id?: string;
    is_internal?: boolean;
    created_at: string;
}

const CANNED_SNIPPETS = [
    {
        id: 'wifi',
        label: '📶 Wi-Fi Access',
        text: "Grand Palace Hotel Wi-Fi: Network: 'GrandPalace_Guest', Password: 'GrandGuest2026'. Unlimited high-speed access is complimentary hotel-wide."
    },
    {
        id: 'breakfast',
        label: '🍳 Breakfast Hours',
        text: "Buffet Breakfast is served daily from 6:30 AM to 10:30 AM at Grand Dining Hall on the 2nd Floor. Complimentary for registered in-house guests."
    },
    {
        id: 'directions',
        label: '📍 Location & Maps',
        text: "Grand Palace Hotel & Resort is located at Road 45, Gulshan-2, Dhaka-1212. Google Maps: https://maps.google.com/?q=Grand+Palace+Gulshan"
    },
    {
        id: 'checkout',
        label: '🕛 Check-out Policy',
        text: "Our standard check-out time is 12:00 PM. For late check-out requests or complimentary luggage storage, our front desk team is delighted to assist you."
    },
    {
        id: 'amenities',
        label: '🛎️ Pool & Fitness',
        text: "Our rooftop infinity swimming pool is open 6:00 AM - 10:00 PM, and the wellness fitness center is open 24/7 on the 14th floor."
    },
    {
        id: 'bkash',
        label: '📱 bKash Merchant',
        text: "Official Hotel bKash Merchant: +8801700000000 (Payment option). Please include your Reservation Number as the payment reference."
    },
    {
        id: 'bank',
        label: '💳 Bank Details',
        text: "Bank Transfer: Standard Chartered Bank, Account Name: Grand Palace Hotel Ltd, Acc No: 01-1234567-01, Branch: Gulshan-2, Dhaka."
    }
];

export const GuestFlowInbox: React.FC = () => {
    const [conversations, setConversations] = useState<CxConversation[]>([]);
    const [selectedConv, setSelectedConv] = useState<CxConversation | null>(null);
    const [messages, setMessages] = useState<CxMessage[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [messagesLoading, setMessagesLoading] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [channelFilter, setChannelFilter] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'INBOX' | 'KYC_QUEUE' | 'LUGGAGE'>('OVERVIEW');
    const [showTakeoverMenu, setShowTakeoverMenu] = useState<boolean>(false);
    const [showAiMenu, setShowAiMenu] = useState<boolean>(false);
    const [showActionsMenu, setShowActionsMenu] = useState<boolean>(false);

    // Message Input State
    const [outboundText, setOutboundText] = useState<string>('');
    const [isSending, setIsSending] = useState<boolean>(false);
    const [isInternalMode, setIsInternalMode] = useState<boolean>(false);
    const [showQuickSnippets, setShowQuickSnippets] = useState<boolean>(false);
    const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
    const [editedDraftText, setEditedDraftText] = useState<string>('');
    const [replyAsComment, setReplyAsComment] = useState<boolean>(false);

    // In-Chat Service Ticket Dispatch Modal
    const [showServiceModal, setShowServiceModal] = useState<boolean>(false);
    const [serviceType, setServiceType] = useState<'HOUSEKEEPING' | 'MAINTENANCE'>('HOUSEKEEPING');
    const [serviceItem, setServiceItem] = useState<string>('Extra Towels (2 pcs)');
    const [serviceRoomInput, setServiceRoomInput] = useState<string>('');
    const [serviceNotes, setServiceNotes] = useState<string>('');

    // Modal States
    const [showLuggageModal, setShowLuggageModal] = useState<boolean>(false);
    const [luggageTagInput, setLuggageTagInput] = useState<string>('');
    const [showChannelsModal, setShowChannelsModal] = useState<boolean>(false);
    const [actionLoading, setActionLoading] = useState<boolean>(false);
    const [showRightPanel, setShowRightPanel] = useState<boolean>(true);

    // AI Copilot & Guest 360 State (AiPraktor-inspired front desk companion)
    const [copilotData, setCopilotData] = useState<CopilotData | null>(null);
    const [copilotLoading, setCopilotLoading] = useState<boolean>(false);
    const [copilotTab, setCopilotTab] = useState<'SUMMARY' | 'ASK' | 'PMS'>('SUMMARY');
    const [copilotQuestion, setCopilotQuestion] = useState<string>('');
    const [copilotAnswer, setCopilotAnswer] = useState<string>('');
    const [isAskingCopilot, setIsAskingCopilot] = useState<boolean>(false);
    const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);

    // AI Simulation State for Zero-Hosting Testing
    const [showSimulatorModal, setShowSimulatorModal] = useState<boolean>(false);
    const [simChannel, setSimChannel] = useState<'WHATSAPP' | 'MESSENGER' | 'FACEBOOK_COMMENT' | 'INSTAGRAM_DM' | 'INSTAGRAM_COMMENT'>('WHATSAPP');
    const [simGuestName, setSimGuestName] = useState<string>('Imran Hossain');
    const [simUserId, setSimUserId] = useState<string>('+8801700000000');
    const [simText, setSimText] = useState<string>('bhai kalke kon type e faka ache?');
    const [simAiMode, setSimAiMode] = useState<'AUTOPILOT' | 'SUGGEST'>('AUTOPILOT');
    const [simLoading, setSimLoading] = useState<boolean>(false);
    const [simResult, setSimResult] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };



    // 1. Fetch Conversations from API with multi-channel filters
    const fetchConversations = useCallback(async () => {
        try {
            const params = new URLSearchParams();
            if (statusFilter !== 'ALL') params.append('status', statusFilter);
            if (channelFilter !== 'ALL') params.append('channel', channelFilter);
            if (searchQuery.trim()) params.append('search', searchQuery.trim());

            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations?${params.toString()}`);
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
                setConversations(data.data);
                if (selectedConv) {
                    const updated = data.data.find((c: CxConversation) => c.id === selectedConv.id);
                    if (updated) setSelectedConv(updated);
                } else if (data.data.length > 0) {
                    setSelectedConv(data.data[0]);
                }
            }
        } catch (err) {
            console.error('Failed to load guest conversations:', err);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, channelFilter, searchQuery, selectedConv]);

    useEffect(() => {
        fetchConversations();
    }, [statusFilter, channelFilter, searchQuery]);

    // 2. Fetch Message Thread
    useEffect(() => {
        if (!selectedConv) {
            setMessages([]);
            return;
        }

        let isMounted = true;
        setMessagesLoading(true);
        setReplyAsComment(selectedConv.source_type === 'POST_COMMENT');

        fetch(`${getApiBaseUrl()}/api/cx/conversations/${selectedConv.id}/messages`)
            .then(res => res.json())
            .then(data => {
                if (isMounted && data.success && Array.isArray(data.data)) {
                    setMessages(data.data);
                    setTimeout(scrollToBottom, 100);
                }
            })
            .catch(err => console.error('Failed to load messages:', err))
            .finally(() => {
                if (isMounted) setMessagesLoading(false);
            });

        return () => { isMounted = false; };
    }, [selectedConv?.id]);

    // 2.1 Fetch AI Copilot & Guest 360 Memory Profile whenever selected conversation changes
    useEffect(() => {
        if (!selectedConv?.id) {
            setCopilotData(null);
            setCopilotAnswer('');
            return;
        }

        let isMounted = true;
        setCopilotLoading(true);
        setCopilotAnswer('');

        fetch(`${getApiBaseUrl()}/api/cx/copilot/${selectedConv.id}`)
            .then(res => res.json())
            .then(data => {
                if (isMounted && data.success && data.copilot) {
                    setCopilotData(data.copilot);
                }
            })
            .catch(err => console.error('Failed to load copilot memory:', err))
            .finally(() => {
                if (isMounted) setCopilotLoading(false);
            });

        return () => { isMounted = false; };
    }, [selectedConv?.id]);

    const handleAskCopilot = async (questionText?: string) => {
        const q = (questionText || copilotQuestion).trim();
        if (!selectedConv || !q || isAskingCopilot) return;
        setIsAskingCopilot(true);
        setCopilotAnswer('');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/copilot/ask`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConv.id,
                    question: q
                })
            });
            const data = await res.json();
            if (data.success && data.answer) {
                setCopilotAnswer(data.answer);
                if (!questionText) setCopilotQuestion('');
            } else {
                setCopilotAnswer(data.error || 'No relevant information found.');
            }
        } catch (err: any) {
            console.error('Ask Copilot failed:', err);
            setCopilotAnswer('Failed to connect to AI Copilot service.');
        } finally {
            setIsAskingCopilot(false);
        }
    };

    const handleCopyAnswerToReply = (text: string) => {
        setOutboundText(text);
        setCopiedAnswer(true);
        setTimeout(() => setCopiedAnswer(false), 2000);
    };

    // 3. Send Manual Message from Front Desk (or Internal Staff Note)
    const handleSendMessage = async () => {
        if (!selectedConv || !outboundText.trim() || isSending) return;
        setIsSending(true);

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConv.id,
                    text: outboundText.trim(),
                    isInternal: isInternalMode,
                    replyAsComment: selectedConv.source_type === 'POST_COMMENT' ? replyAsComment : false
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessages(prev => [...prev, data.data]);
                setOutboundText('');
                fetchConversations();
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Failed to send message:', err);
        } finally {
            setIsSending(false);
        }
    };

    // 4. 1-Click Approve AI Suggestion
    const handleApproveDraft = async (messageId: number, textToSend?: string) => {
        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations/approve-reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId,
                    editedText: textToSend
                })
            });
            const data = await res.json();
            if (data.success) {
                const updatedRes = await fetch(`${getApiBaseUrl()}/api/cx/conversations/${selectedConv?.id}/messages`);
                const updatedData = await updatedRes.json();
                if (updatedData.success) {
                    setMessages(updatedData.data);
                }
                setEditingDraftId(null);
                setEditedDraftText('');
                fetchConversations();
                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Failed to approve draft:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 5. Update AI Mode Toggle
    const handleUpdateAiMode = async (mode: 'OFF' | 'SUGGEST' | 'AUTOPILOT') => {
        if (!selectedConv) return;
        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations/ai-mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConv.id,
                    aiMode: mode
                })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedConv(prev => prev ? { ...prev, ai_mode: mode } : null);
                setConversations(prev => prev.map(c => c.id === selectedConv.id ? { ...c, ai_mode: mode } : c));
            }
        } catch (err) {
            console.error('Failed to update AI mode:', err);
        }
    };

    // 6. Generate Pre-Checkin Link
    const handleSendPreCheckinLink = async () => {
        if (!selectedConv?.reservation_id) {
            alert('This conversation is not linked to an active reservation.');
            return;
        }

        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/pre-checkin/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reservationId: selectedConv.reservation_id })
            });
            const data = await res.json();
            if (data.success && data.data?.link) {
                const fullLink = `${window.location.origin}${data.data.link}`;
                const preCheckinMsg = `Dear ${selectedConv.guest_name}, we invite you to complete your 1-minute Express Digital Pre-Check-in prior to arrival to skip the reception desk queue and activate your 15-second Fast-Pass:\n\n${fullLink}`;
                setOutboundText(preCheckinMsg);
            }
        } catch (err) {
            console.error('Failed to generate pre-checkin link:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 7. Store Luggage for Early Arrival
    const handleStoreLuggage = async () => {
        if (!selectedConv?.reservation_id || !luggageTagInput.trim()) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/luggage-stored`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reservationId: selectedConv.reservation_id,
                    luggageTagNumber: luggageTagInput.trim()
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowLuggageModal(false);
                setLuggageTagInput('');
                fetchConversations();
            }
        } catch (err) {
            console.error('Failed to record luggage:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 8. Trigger "Room Ready" Alert
    const handleTriggerRoomReady = async () => {
        if (!selectedConv?.reservation_id) return;
        if (!confirm(`Send instant "Room Ready" alert to ${selectedConv.guest_name}?`)) return;

        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/room-ready-alert`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reservationId: selectedConv.reservation_id,
                    roomNumber: selectedConv.room_number || ''
                })
            });
            const data = await res.json();
            if (data.success) {
                alert(`✓ Notification successfully dispatched to ${selectedConv.external_user_id}`);
                const updatedRes = await fetch(`${getApiBaseUrl()}/api/cx/conversations/${selectedConv.id}/messages`);
                const updatedData = await updatedRes.json();
                if (updatedData.success) setMessages(updatedData.data);
            }
        } catch (err) {
            console.error('Failed to trigger room ready alert:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 8a. Send Folio & Digital Bill Statement Link
    const handleSendFolioLink = () => {
        if (!selectedConv?.reservation_number) {
            alert('This conversation is not linked to an active PMS reservation.');
            return;
        }
        const resNo = selectedConv.reservation_number;
        const guestName = selectedConv.guest_name ? `Dear ${selectedConv.guest_name}` : 'Valued Guest';
        const folioUrl = `${window.location.origin}/guestflow?folio=${resNo}`;
        const folioMsg = `Assalamu Alaikum ${guestName}, here is your official live digital folio for Reservation *#${resNo}*:\n\n📄 View Itemized Guest Folio: ${folioUrl}\n\nPlease review your bill statement. If you need any assistance or express checkout, our front desk team is ready to serve you! 🏨✨`;
        setOutboundText(folioMsg);
    };

    // 8a-2. Send Official Booking Confirmation Voucher
    const handleSendConfirmationVoucher = async () => {
        if (!selectedConv?.reservation_id && !selectedConv?.reservation_number) {
            alert('This conversation is not linked to an active PMS reservation.');
            return;
        }

        const targetId = selectedConv.reservation_id || selectedConv.reservation_number;
        try {
            setActionLoading(true);
            const token = localStorage.getItem('token');
            const propertyId = localStorage.getItem('selectedPropertyId') || 1;
            const res = await fetch(`${getApiBaseUrl()}/api/bookings/${targetId}/send-confirmation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                    'x-property-id': String(propertyId)
                },
                body: JSON.stringify({
                    phone: (selectedConv as any)?.guest_phone || selectedConv.external_user_id,
                    channels: { whatsapp: true, email: true, sms: false }
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Official Booking Confirmation Voucher successfully dispatched to ${selectedConv.guest_name}!`);
                if (selectedConv?.id) {
                    const msgRes = await fetch(`${getApiBaseUrl()}/api/cx/conversations/${selectedConv.id}/messages`);
                    const msgData = await msgRes.json();
                    if (msgData.success) {
                        setMessages(msgData.data);
                    }
                }
            } else {
                alert(data.message || 'Failed to dispatch confirmation voucher');
            }
        } catch (err: any) {
            console.error('Failed to dispatch confirmation voucher:', err);
            alert(err.message || 'Error dispatching confirmation voucher');
        } finally {
            setActionLoading(false);
        }
    };

    // 8b. Dispatch In-Room Service Request (Housekeeping or Maintenance)
    const handleDispatchServiceTask = async () => {
        if (!serviceRoomInput.trim()) {
            alert('Please specify the room number.');
            return;
        }
        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/dispatch-service-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConv?.id,
                    roomNumber: serviceRoomInput.trim(),
                    taskType: serviceType,
                    item: serviceItem,
                    notes: serviceNotes.trim(),
                    guestName: selectedConv?.guest_name
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowServiceModal(false);
                setServiceNotes('');
                if (selectedConv?.id) {
                    const updatedRes = await fetch(`${getApiBaseUrl()}/api/cx/conversations/${selectedConv.id}/messages`);
                    const updatedData = await updatedRes.json();
                    if (updatedData.success) {
                        setMessages(updatedData.data);
                        setTimeout(scrollToBottom, 100);
                    }
                }
            } else {
                alert(data.error || 'Failed to dispatch service task');
            }
        } catch (err: any) {
            console.error('Failed to dispatch service task:', err);
            alert(err.message || 'Error dispatching service task');
        } finally {
            setActionLoading(false);
        }
    };

    // 8c. Staff Takeover with Timer (+30m, +1h, +6h, Permanent) - AiPraktor Standard
    const handleTakeover = async (durationMinutes: number, reason?: string) => {
        if (!selectedConv) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations/takeover`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    conversationId: selectedConv.id,
                    durationMinutes,
                    reason: reason || 'Front desk staff manual intervention'
                })
            });
            const data = await res.json();
            if (data.success) {
                setShowTakeoverMenu(false);
                setSelectedConv(prev => prev ? { ...prev, ai_mode: 'OFF', takeover_until: data.takeoverUntil } : null);
                fetchConversations();
            }
        } catch (err) {
            console.error('Failed to take over conversation:', err);
        } finally {
            setActionLoading(false);
        }
    };

    // 8d. Resume StayPulse AI Autopilot
    const handleResumeAi = async () => {
        if (!selectedConv) return;
        try {
            setActionLoading(true);
            const res = await fetch(`${getApiBaseUrl()}/api/cx/conversations/resume-ai`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversationId: selectedConv.id })
            });
            const data = await res.json();
            if (data.success) {
                setSelectedConv(prev => prev ? { ...prev, ai_mode: 'AUTOPILOT', takeover_until: null } : null);
                fetchConversations();
            }
        } catch (err) {
            console.error('Failed to resume AI:', err);
        } finally {
            setActionLoading(false);
        }
    };
    const handleRunSimulation = async () => {
        if (!simText.trim() || simLoading) return;
        setSimLoading(true);
        setSimResult(null);

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/cx/simulate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    propertyId: 1,
                    channel: simChannel,
                    senderId: simUserId.trim() || `user_${Date.now()}`,
                    senderIdentifier: simUserId.trim() || `user_${Date.now()}`,
                    senderName: simGuestName.trim() || 'Guest Tester',
                    guestName: simGuestName.trim() || 'Guest Tester',
                    text: simText.trim(),
                    messageText: simText.trim(),
                    aiMode: simAiMode
                })
            });
            const data = await res.json();
            setSimResult(data);
            if (data.success) {
                await fetchConversations();
                if (data.data?.conversation) {
                    setSelectedConv(data.data.conversation);
                }
            }
        } catch (err: any) {
            console.error('Simulation failed:', err);
            setSimResult({ success: false, error: err.message || 'Simulation network error' });
        } finally {
            setSimLoading(false);
        }
    };

    const renderChannelIcon = (channel: string, sourceType?: string, className = "w-3.5 h-3.5") => {
        const isComment = sourceType === 'POST_COMMENT';
        if (channel === 'WHATSAPP') {
            return (
                <span title="WhatsApp" className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200/80 shrink-0 shadow-2xs">
                    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                </span>
            );
        }
        if (channel === 'MESSENGER' || (!isComment && channel === 'FACEBOOK_PAGE')) {
            return (
                <span title="Facebook Messenger" className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-blue-50 text-blue-600 border border-blue-200/80 shrink-0 shadow-2xs">
                    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.303 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963l-3.056-3.26-5.963 3.26L10.742 7.5l3.13 3.26 5.89-3.26-6.571 7.463z"/>
                    </svg>
                </span>
            );
        }
        if (channel === 'FACEBOOK_COMMENT' || isComment) {
            return (
                <span title="Facebook Public Comment" className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200/80 shrink-0 shadow-2xs">
                    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                </span>
            );
        }
        if (channel === 'INSTAGRAM_DM' || channel === 'INSTAGRAM_COMMENT') {
            return (
                <span title={channel === 'INSTAGRAM_COMMENT' ? 'Instagram Comment' : 'Instagram Direct'} className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-pink-50 text-pink-600 border border-pink-200/80 shrink-0 shadow-2xs">
                    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                </span>
            );
        }
        return (
            <span title={channel} className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-600 border border-slate-200/80 shrink-0 shadow-2xs">
                <MessageSquare className={className} />
            </span>
        );
    };

    const getChannelBadge = (conv: CxConversation, showText: boolean = false) => {
        if (!showText) {
            return renderChannelIcon(conv.channel, conv.source_type);
        }
        const isComment = conv.source_type === 'POST_COMMENT';
        return (
            <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                {renderChannelIcon(conv.channel, conv.source_type, "w-3 h-3")}
                <span>
                    {conv.channel === 'WHATSAPP' ? 'WhatsApp' : 
                     conv.channel === 'MESSENGER' || (!isComment && conv.channel === 'FACEBOOK_PAGE') ? 'Messenger' :
                     conv.channel === 'FACEBOOK_COMMENT' || isComment ? 'FB Comment' :
                     conv.channel === 'INSTAGRAM_DM' ? 'IG Direct' :
                     conv.channel === 'INSTAGRAM_COMMENT' ? 'IG Comment' : conv.channel}
                </span>
            </span>
        );
    };

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-50 text-slate-800 overflow-hidden">
            {/* Top Workspace Header - Compact & Single-Line */}
            <div className="bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-3 shrink-0">
                {/* Left: Brand & Nav Tabs */}
                <div className="flex items-center space-x-3 min-w-0">
                    <div className="flex items-center space-x-2 shrink-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-2xs">
                            <MessageSquare className="w-4 h-4" />
                        </div>
                        <div className="leading-none hidden sm:block">
                            <div className="flex items-center space-x-1.5">
                                <span className="text-sm font-bold text-slate-900 tracking-tight">GuestFlow</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    StayPulse AI
                                </span>
                            </div>
                            <span className="text-[10px] text-slate-400">Omnichannel Guest Messaging</span>
                        </div>
                    </div>

                    {/* View Switcher Tabs (HotelManagementOS Luxury Theme) */}
                    <div className="inline-flex items-center bg-slate-100/90 p-1 rounded-lg border border-slate-200/80 gap-1 h-8">
                        <button
                            onClick={() => setActiveTab('OVERVIEW')}
                            className={`h-6.5 flex items-center space-x-1.5 px-2.5 text-xs rounded-md transition-all cursor-pointer ${
                                activeTab === 'OVERVIEW'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900 font-medium'
                            }`}
                        >
                            <BarChart3 className={`w-3.5 h-3.5 ${activeTab === 'OVERVIEW' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>Control Room</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('INBOX')}
                            className={`h-6.5 flex items-center space-x-1.5 px-2.5 text-xs rounded-md transition-all cursor-pointer ${
                                activeTab === 'INBOX'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900 font-medium'
                            }`}
                        >
                            <MessageSquare className={`w-3.5 h-3.5 ${activeTab === 'INBOX' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>Inbox</span>
                            {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0) > 0 && (
                                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-emerald-600 text-white font-bold">
                                    {conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0)}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('KYC_QUEUE')}
                            className={`h-6.5 flex items-center space-x-1.5 px-2.5 text-xs rounded-md transition-all cursor-pointer ${
                                activeTab === 'KYC_QUEUE'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900 font-medium'
                            }`}
                        >
                            <UserCheck className={`w-3.5 h-3.5 ${activeTab === 'KYC_QUEUE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>KYC Queue</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 text-slate-600 font-semibold">
                                {conversations.filter(c => c.is_pre_checked_in).length}
                            </span>
                        </button>
                        <button
                            onClick={() => setActiveTab('LUGGAGE')}
                            className={`h-6.5 flex items-center space-x-1.5 px-2.5 text-xs rounded-md transition-all cursor-pointer ${
                                activeTab === 'LUGGAGE'
                                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                                    : 'text-slate-600 hover:text-slate-900 font-medium'
                            }`}
                        >
                            <Luggage className={`w-3.5 h-3.5 ${activeTab === 'LUGGAGE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                            <span>Luggage</span>
                            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] bg-slate-200 text-slate-600 font-semibold">
                                {conversations.filter(c => c.luggage_tag_number).length}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center space-x-2 shrink-0">
                    <button
                        onClick={() => setShowSimulatorModal(true)}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-lg border border-purple-200 transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                        title="Simulate Inbound Guest Messages (Zero-hosting AI Testing)"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                        <span>AI Simulator</span>
                    </button>
                    <button
                        onClick={() => setShowChannelsModal(true)}
                        className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200 transition-colors flex items-center space-x-1.5 cursor-pointer"
                        title="Manage Connected Numbers & Accounts"
                    >
                        <Settings className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline">Channels</span>
                    </button>
                    <button
                        onClick={fetchConversations}
                        disabled={loading}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Refresh Conversations"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
                    </button>
                    {activeTab === 'INBOX' && selectedConv && (
                        <button
                            onClick={() => setShowRightPanel(prev => !prev)}
                            className={`px-2.5 py-1 rounded-lg border text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                                showRightPanel
                                    ? 'bg-purple-50 text-purple-800 border-purple-200 shadow-2xs'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:opacity-95 shadow-xs'
                            }`}
                            title={showRightPanel ? 'Hide Guest 360 & Copilot' : 'Open Guest 360 & AI Copilot'}
                        >
                            <Sparkles className={`w-3.5 h-3.5 ${showRightPanel ? 'text-purple-600' : 'text-white'}`} />
                            <span className="hidden sm:inline">Guest 360 & Copilot</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content Area: OVERVIEW / CONTROL ROOM (HotelManagementOS Luxury Theme) */}
            {activeTab === 'OVERVIEW' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/70 text-slate-900 space-y-6">
                    {/* Top Control Room Title Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
                        <div>
                            <span className="text-[10.5px] font-mono tracking-widest text-emerald-700 uppercase font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span>GOOD {new Date().getHours() < 12 ? 'MORNING' : new Date().getHours() < 17 ? 'AFTERNOON' : 'EVENING'} • SIGNED IN AS FRONT DESK ADMIN</span>
                            </span>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-0.5 flex items-center gap-2.5">
                                <span>StayPulse AI Control Room</span>
                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-mono font-bold">
                                    93% AUTONOMOUS
                                </span>
                            </h1>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Grand Palace Hotel & Resort • {conversations.length} Active Conversations • StayPulse AI handling guest inquiries 24/7 with zero lag
                            </p>
                        </div>
                        
                        {/* Quick Time Range Pill Selector */}
                        <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200 shadow-2xs text-xs font-mono">
                            <button className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">7d</button>
                            <button className="px-3 py-1 rounded-lg bg-slate-900 text-white font-bold shadow-xs cursor-pointer">14d</button>
                            <button className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">30d</button>
                        </div>
                    </div>

                    {/* 5 Real-Time KPI Cards (HotelManagementOS Luxury White Architecture) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
                            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Conversations</span>
                                <MessageSquare className="w-4 h-4 text-slate-400" />
                            </div>
                            <div className="text-2xl font-black text-slate-900 font-mono mt-2">{conversations.length}</div>
                            <div className="text-xs text-slate-500 mt-1">
                                <span className="text-emerald-600 font-bold">{conversations.filter(c => c.ai_mode !== 'OFF').length}</span> on AI Autopilot
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
                            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Handled By AI</span>
                                <Bot className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="text-2xl font-black text-emerald-600 font-mono mt-2">93%</div>
                            <div className="text-xs text-slate-500 mt-1">
                                Zero human wait time
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
                            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Waiting On Staff</span>
                                <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="text-2xl font-black text-amber-600 font-mono mt-2">
                                {conversations.filter(c => c.status === 'PENDING_APPROVAL' || c.ai_mode === 'OFF').length}
                            </div>
                            <div className="text-xs text-emerald-600 font-medium mt-1">
                                ✓ All within 5m SLA
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
                            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Follow-ups Due</span>
                                <Zap className="w-4 h-4 text-purple-500" />
                            </div>
                            <div className="text-2xl font-black text-purple-600 font-mono mt-2">
                                {conversations.filter(c => c.reservation_status === 'HOLD').length || 2}
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Courtesy holds expiring
                            </div>
                        </div>

                        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-all">
                            <div className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                                <span>Pipeline Value</span>
                                <span className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-[10px] font-bold">৳</span>
                            </div>
                            <div className="text-2xl font-black text-slate-900 font-mono mt-2">৳136k</div>
                            <div className="text-xs text-emerald-600 font-semibold mt-1">
                                +৳65k confirmed this week
                            </div>
                        </div>
                    </div>

                    {/* 2-Column Operational Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        {/* Left 2 Cols: Live Inbound Queue */}
                        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-3">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <h3 className="font-bold text-sm text-slate-900">Live Inbound Queue</h3>
                                    <span className="text-xs text-slate-400 font-medium">Longest waiting first</span>
                                </div>
                                <button
                                    onClick={() => setActiveTab('INBOX')}
                                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1 cursor-pointer"
                                >
                                    <span>View all inbox</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            <div className="divide-y divide-slate-100 space-y-1">
                                {conversations.slice(0, 5).map((conv) => (
                                    <div
                                        key={conv.id}
                                        onClick={() => {
                                            setSelectedConv(conv);
                                            setActiveTab('INBOX');
                                        }}
                                        className="p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200/80 flex items-center justify-between cursor-pointer group"
                                    >
                                        <div className="flex items-center space-x-3 min-w-0">
                                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200 group-hover:bg-emerald-50 group-hover:text-emerald-700 group-hover:border-emerald-200 transition-colors">
                                                {conv.guest_name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-bold text-xs text-slate-900 truncate">{conv.guest_name}</span>
                                                    {getChannelBadge(conv)}
                                                    {conv.reservation_status === 'HOLD' && (
                                                        <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold font-mono">
                                                            Hold: {conv.reservation_number}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-500 truncate mt-0.5">
                                                    {conv.last_message_text || 'Inbound guest inquiry'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2.5 shrink-0">
                                            <span className="text-[11px] font-mono text-slate-400">
                                                {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-700 text-[11px] font-bold transition-all">
                                                Open →
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right Col: Channel Routing & Traffic */}
                        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
                            <div>
                                <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100 flex items-center justify-between">
                                    <span>Traffic & Channel Routing</span>
                                    <span className="text-xs text-slate-400 font-medium">14d Analytics</span>
                                </h3>

                                <div className="mt-4 space-y-3.5 text-xs">
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-700 font-semibold">🟢 WhatsApp Business</span>
                                            <span className="text-slate-900 font-mono font-bold">68%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: '68%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-700 font-semibold">⚡ Facebook Messenger</span>
                                            <span className="text-slate-900 font-mono font-bold">20%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full" style={{ width: '20%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-700 font-semibold">📷 Instagram DMs</span>
                                            <span className="text-slate-900 font-mono font-bold">9%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-purple-500 rounded-full" style={{ width: '9%' }}></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1.5">
                                            <span className="text-slate-700 font-semibold">💬 Public Comments</span>
                                            <span className="text-slate-900 font-mono font-bold">3%</span>
                                        </div>
                                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: '3%' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between">
                                <div>
                                    <span className="font-bold text-slate-800 block">Automated Night Audit</span>
                                    <span className="text-slate-500 text-[11px]">Night Audit syncs at 02:00 AM</span>
                                </div>
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* INBOX VIEW */}
            {activeTab === 'INBOX' && (
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANEL: Conversation List & Filters (Compact & Light) */}
                    <div className="w-72 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-hidden">
                        {/* Search and Filters (Clean, Integrated & Compact) */}
                        <div className="p-2 border-b border-slate-100 space-y-1.5 shrink-0">
                            {/* Row 1: Search Input + Channel Selector */}
                            <div className="flex items-center space-x-1.5">
                                <div className="relative flex-1">
                                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search guest, phone, res..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-8 pr-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white"
                                    />
                                </div>
                                <select
                                    value={channelFilter}
                                    onChange={(e) => setChannelFilter(e.target.value)}
                                    className="text-[11px] font-semibold bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shrink-0"
                                    title="Filter by Messaging Channel"
                                >
                                    <option value="ALL">All Channels</option>
                                    <option value="WHATSAPP">WhatsApp</option>
                                    <option value="MESSENGER">Messenger</option>
                                    <option value="FACEBOOK_COMMENT">Comments</option>
                                    <option value="INSTAGRAM_DM">Instagram</option>
                                </select>
                            </div>

                            {/* Row 2: Status Chips with Real-time Count Badges */}
                            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10.5px]">
                                {[
                                    { key: 'ALL', label: 'All', count: conversations.length },
                                    { key: 'OPEN', label: 'Open', count: conversations.filter(c => c.status === 'OPEN').length },
                                    { key: 'PENDING_APPROVAL', label: 'Review', count: conversations.filter(c => c.status === 'PENDING_APPROVAL').length },
                                    { key: 'RESOLVED', label: 'Done', count: conversations.filter(c => c.status === 'RESOLVED').length }
                                ].map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setStatusFilter(tab.key)}
                                        className={`flex-1 py-1 rounded-md font-semibold transition-all text-center flex items-center justify-center space-x-1 cursor-pointer ${
                                            statusFilter === tab.key
                                                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <span>{tab.label}</span>
                                        {tab.count > 0 && (
                                            <span className={`px-1 py-0.2 rounded-full text-[9px] ${
                                                statusFilter === tab.key ? 'bg-emerald-100 text-emerald-800 font-bold' : 'bg-slate-200 text-slate-600'
                                            }`}>
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Conversation List */}
                        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
                            {loading ? (
                                <div className="p-8 text-center text-slate-400 text-xs">
                                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
                                    Loading conversations...
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                                    <p className="font-semibold text-slate-600">No conversations in this filter</p>
                                    <p className="text-[11px]">Inbound WhatsApp, Messenger, or Post Comments will appear here.</p>
                                </div>
                            ) : (
                                conversations.map((conv) => {
                                    const isSelected = selectedConv?.id === conv.id;
                                    return (
                                        <div
                                            key={conv.id}
                                            onClick={() => {
                                                setSelectedConv(conv);
                                                setShowRightPanel(true);
                                            }}
                                            className={`p-3 cursor-pointer transition-colors hover:bg-slate-50/80 ${
                                                isSelected ? 'bg-emerald-50/70 border-l-[3px] border-emerald-600' : ''
                                            }`}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center space-x-1.5 min-w-0">
                                                    {getChannelBadge(conv)}
                                                    <span className="font-semibold text-slate-900 text-xs truncate">
                                                        {conv.guest_name}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 ml-1">
                                                    {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-500 mt-1 line-clamp-1 leading-normal">
                                                {conv.last_message_text || 'No messages yet'}
                                            </p>

                                            <div className="flex items-center justify-between mt-1.5 pt-0.5">
                                                <div className="flex items-center space-x-1 text-[10px]">
                                                    {conv.reservation_number && (
                                                        <span className="px-1.5 py-0.2 rounded font-mono font-medium bg-slate-100 text-slate-700">
                                                            {conv.room_number ? `Rm ${conv.room_number}` : conv.reservation_number}
                                                        </span>
                                                    )}
                                                    {conv.is_pre_checked_in && (
                                                        <span className="px-1.5 py-0.2 rounded font-semibold bg-emerald-100 text-emerald-800 flex items-center space-x-0.5">
                                                            <Check className="w-2.5 h-2.5" />
                                                            <span>KYC</span>
                                                        </span>
                                                    )}
                                                </div>

                                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center space-x-1 shrink-0 ${
                                                    conv.ai_mode === 'AUTOPILOT'
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200/80'
                                                        : conv.ai_mode === 'SUGGEST'
                                                        ? 'bg-amber-50 text-amber-700 border border-amber-200/80'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${
                                                        conv.ai_mode === 'AUTOPILOT' ? 'bg-purple-600' : conv.ai_mode === 'SUGGEST' ? 'bg-amber-500' : 'bg-slate-400'
                                                    }`} />
                                                    <span>{conv.ai_mode === 'AUTOPILOT' ? 'Auto' : conv.ai_mode === 'SUGGEST' ? 'Suggest' : 'Manual'}</span>
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* CENTER PANEL: Live Chat Stream (Clean, Airy & Light) */}
                    {selectedConv ? (
                        <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc] overflow-hidden">
                            {/* Chat Header (Spacious, Clean & High-Density) */}
                            <div className="bg-white border-b border-slate-200 px-3.5 py-2 flex items-center justify-between shrink-0 gap-2">
                                <div className="flex items-center space-x-2.5 min-w-0 flex-1">
                                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200/80 shadow-2xs">
                                        {selectedConv.guest_name.slice(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1 leading-snug">
                                        <div className="flex items-center space-x-1.5 min-w-0">
                                            <h2 className="text-sm font-bold text-slate-900 truncate" title={selectedConv.guest_name}>
                                                {selectedConv.guest_name}
                                            </h2>
                                            {renderChannelIcon(selectedConv.channel, selectedConv.source_type, "w-3.5 h-3.5")}
                                            <span className="text-[11px] text-slate-400 font-mono truncate hidden sm:inline">
                                                ({selectedConv.external_user_id})
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                                            <span className="truncate">{selectedConv.account_name || 'Direct Channel'}</span>
                                            {selectedConv.reservation_number && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold text-[10px] shrink-0">
                                                        {selectedConv.reservation_number}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: AI Mode Dropdown, Takeover Timer & Sidebar Toggle */}
                                <div className="flex items-center space-x-1.5 shrink-0">
                                    {/* Human Takeover Timer with Auto-Return */}
                                    <div className="relative">
                                        {selectedConv.takeover_until && new Date(selectedConv.takeover_until) > new Date() ? (
                                            <button
                                                onClick={handleResumeAi}
                                                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] flex items-center space-x-1 shadow-xs cursor-pointer animate-pulse"
                                                title="Click to resume StayPulse AI Autopilot"
                                            >
                                                <Clock className="w-3.5 h-3.5" />
                                                <span className="hidden md:inline">Takeover Active</span>
                                                <span className="text-[9.5px] bg-black/20 px-1 py-0.2 rounded font-mono ml-0.5">Resume ↩</span>
                                            </button>
                                        ) : (
                                            <div className="relative">
                                                <button
                                                    onClick={() => setShowTakeoverMenu(prev => !prev)}
                                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center space-x-1 border border-slate-200 cursor-pointer"
                                                    title="Pause AI and take over chat with auto-return timer"
                                                >
                                                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                                                    <span>Timer</span>
                                                    <ChevronDown className="w-3 h-3 text-slate-400" />
                                                </button>
                                                {showTakeoverMenu && (
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">
                                                            Takeover Duration
                                                        </span>
                                                        <button
                                                            onClick={() => {
                                                                handleTakeover(30, 'Front desk 30m manual intervention');
                                                                setShowTakeoverMenu(false);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span>+30 Minutes</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">30m</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleTakeover(60, 'Front desk 1h manual intervention');
                                                                setShowTakeoverMenu(false);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span>+1 Hour</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">1h</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleTakeover(360, 'Front desk 6h manual intervention');
                                                                setShowTakeoverMenu(false);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 hover:bg-slate-50 rounded-lg text-slate-700 font-medium flex items-center justify-between cursor-pointer"
                                                        >
                                                            <span>+6 Hours</span>
                                                            <span className="text-[10px] text-slate-400 font-mono">6h</span>
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                handleTakeover(0, 'Permanent manual takeover');
                                                                setShowTakeoverMenu(false);
                                                            }}
                                                            className="w-full text-left px-2 py-1.5 hover:bg-rose-50 text-rose-700 rounded-lg font-medium border-t border-slate-100 mt-1 cursor-pointer"
                                                        >
                                                            <span>Permanent</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* AI Automation Mode Single Dropdown Pill */}
                                    <div className="relative">
                                        <button
                                            type="button"
                                            onClick={() => setShowAiMenu(prev => !prev)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer border ${
                                                selectedConv.ai_mode === 'AUTOPILOT'
                                                    ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                    : selectedConv.ai_mode === 'SUGGEST'
                                                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                                    : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                                            }`}
                                            title="Toggle AI Autopilot / Suggestion / Manual Mode"
                                        >
                                            <Sparkles className={`w-3.5 h-3.5 ${
                                                selectedConv.ai_mode === 'AUTOPILOT' ? 'text-purple-600' : selectedConv.ai_mode === 'SUGGEST' ? 'text-amber-500' : 'text-slate-400'
                                            }`} />
                                            <span>{selectedConv.ai_mode === 'AUTOPILOT' ? 'Autopilot' : selectedConv.ai_mode === 'SUGGEST' ? 'Suggest' : 'Manual'}</span>
                                            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showAiMenu ? 'rotate-180' : ''}`} />
                                        </button>

                                        {showAiMenu && (
                                            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">
                                                    AI Automation Mode
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        handleUpdateAiMode('AUTOPILOT');
                                                        setShowAiMenu(false);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                                        selectedConv.ai_mode === 'AUTOPILOT' ? 'bg-purple-50 text-purple-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full bg-purple-600" />
                                                        <div>
                                                            <div className="text-xs font-bold text-purple-950">Autopilot</div>
                                                            <div className="text-[10px] text-slate-400">AI replies autonomously 24/7</div>
                                                        </div>
                                                    </div>
                                                    {selectedConv.ai_mode === 'AUTOPILOT' && <Check className="w-3.5 h-3.5 text-purple-600" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleUpdateAiMode('SUGGEST');
                                                        setShowAiMenu(false);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                                        selectedConv.ai_mode === 'SUGGEST' ? 'bg-amber-50 text-amber-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                                        <div>
                                                            <div className="text-xs font-bold text-amber-950">Suggest Mode</div>
                                                            <div className="text-[10px] text-slate-400">AI drafts; staff approves</div>
                                                        </div>
                                                    </div>
                                                    {selectedConv.ai_mode === 'SUGGEST' && <Check className="w-3.5 h-3.5 text-amber-600" />}
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        handleUpdateAiMode('OFF');
                                                        setShowAiMenu(false);
                                                    }}
                                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                                                        selectedConv.ai_mode === 'OFF' ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                                                    }`}
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                                                        <div>
                                                            <div className="text-xs font-bold text-slate-900">Manual Only</div>
                                                            <div className="text-[10px] text-slate-400">Staff replies; AI paused</div>
                                                        </div>
                                                    </div>
                                                    {selectedConv.ai_mode === 'OFF' && <Check className="w-3.5 h-3.5 text-slate-600" />}
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Guest 360 & AI Copilot Drawer Toggle */}
                                    <button
                                        type="button"
                                        onClick={() => setShowRightPanel(prev => !prev)}
                                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center space-x-1.5 transition-all cursor-pointer shadow-2xs ${
                                            showRightPanel
                                                ? 'bg-purple-50 text-purple-900 border-purple-200/80 hover:bg-purple-100'
                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-transparent hover:opacity-95 shadow-xs'
                                        }`}
                                        title={showRightPanel ? 'Hide AI Copilot & Guest 360' : 'Open AI Copilot & Guest 360'}
                                    >
                                        <Sparkles className={`w-3.5 h-3.5 ${showRightPanel ? 'text-purple-600' : 'text-white'}`} />
                                        <span>{showRightPanel ? 'Copilot 360' : '✨ AI Copilot'}</span>
                                    </button>
                                </div>
                            </div>

                            {/* Comment Thread Notice Bar (If this conversation originated from a post comment) */}
                            {selectedConv.source_type === 'POST_COMMENT' && (
                                <div className="bg-indigo-50/90 border-b border-indigo-200 px-4 py-1.5 flex items-center justify-between text-xs text-indigo-950 shrink-0">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-[11px]">Public Post Comment Lead:</span>
                                        <span className="text-slate-600 text-[11px] hidden sm:inline">Guest commented under a post.</span>
                                        {selectedConv.post_url && (
                                            <a
                                                href={selectedConv.post_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="underline text-indigo-700 font-semibold flex items-center space-x-0.5 text-[11px]"
                                            >
                                                <span>View Post</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>

                                    <div className="flex items-center space-x-1.5">
                                        <button
                                            type="button"
                                            onClick={() => setReplyAsComment(false)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                !replyAsComment ? 'bg-indigo-700 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            Private DM
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setReplyAsComment(true)}
                                            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                                                replyAsComment ? 'bg-indigo-700 text-white shadow-2xs' : 'bg-white text-slate-700 border border-slate-200'
                                            }`}
                                        >
                                            Public Comment
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Message Stream */}
                            <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-3">
                                {messagesLoading ? (
                                    <div className="flex justify-center items-center h-full text-slate-400 text-xs">
                                        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
                                        Loading message history...
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs space-y-2">
                                        <MessageSquare className="w-8 h-8 text-slate-300" />
                                        <p>No messages in this conversation yet.</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => {
                                        const isGuest = msg.sender_type === 'GUEST';
                                        const isBot = msg.sender_type === 'AI_BOT';
                                        const isInternal = Boolean(msg.is_internal);

                                        // Render Internal Staff Note (Sleek, Compact Message Bubble Style)
                                        if (isInternal) {
                                            return (
                                                <div key={msg.id} className="flex justify-end my-1.5">
                                                    <div className="max-w-md bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3 shadow-2xs space-y-1">
                                                        <div className="flex items-center justify-between text-amber-900 border-b border-amber-200/70 pb-1 gap-2">
                                                            <div className="flex items-center space-x-1.5 text-[10.5px] font-bold">
                                                                <Lock className="w-3 h-3 text-amber-700" />
                                                                <span>Staff Note</span>
                                                                <span className="text-[8.5px] bg-amber-200/80 text-amber-900 px-1 py-0.2 rounded font-semibold uppercase tracking-wider">
                                                                    Staff Only
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center space-x-1 text-[10px] text-amber-700/80">
                                                                <span>{msg.sender_name || 'Front Desk'}</span>
                                                                <span>•</span>
                                                                <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[13px] text-amber-950 font-medium leading-relaxed whitespace-pre-wrap">
                                                            {msg.message_text}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        return (
                                            <div key={msg.id} className="space-y-1.5">
                                                <div className={`flex flex-col ${isGuest ? 'items-start' : 'items-end'}`}>
                                                    <div className="flex items-center space-x-1.5 mb-1 px-1">
                                                        <span className="text-[10px] font-semibold text-slate-500">
                                                            {isGuest ? selectedConv.guest_name : isBot ? 'StayPulse AI Concierge' : 'Front Desk Staff'}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>

                                                    {/* Light-Themed, Beautiful, Readable Chat Bubbles */}
                                                    <div className={`max-w-lg rounded-2xl px-4 py-2.5 text-[13px] sm:text-[13.5px] shadow-2xs leading-relaxed whitespace-pre-wrap ${
                                                        isGuest
                                                            ? 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-xs'
                                                            : isBot
                                                            ? 'bg-gradient-to-br from-purple-50/90 via-indigo-50/40 to-white text-slate-800 border border-purple-200/80 rounded-tr-xs'
                                                            : 'bg-emerald-600 text-white rounded-tr-xs'
                                                    }`}>
                                                        {isBot && (
                                                            <div className="flex items-center space-x-1.5 text-[10.5px] font-bold text-purple-700 mb-1.5 pb-1 border-b border-purple-100">
                                                                <Sparkles className="w-3 h-3 text-purple-600" />
                                                                <span>StayPulse AI Assistant (Google Gemini)</span>
                                                                <span className="text-[9.5px] font-normal text-purple-500">• Auto-Sent</span>
                                                            </div>
                                                        )}
                                                        <span className={isBot ? 'text-slate-800 font-normal leading-relaxed' : ''}>
                                                            {msg.message_text}
                                                        </span>

                                                        {/* High-Resolution Room Photo or Video Tour Card if attached */}
                                                        {msg.media_url && (
                                                            <div className="mt-2.5 rounded-xl overflow-hidden border border-purple-200/90 shadow-sm max-w-sm bg-slate-900 group">
                                                                {msg.media_type === 'VIDEO' || msg.media_url.endsWith('.mp4') || msg.media_url.endsWith('.webm') ? (
                                                                    <video
                                                                        controls
                                                                        playsInline
                                                                        src={msg.media_url}
                                                                        className="w-full h-48 object-cover bg-black"
                                                                    />
                                                                ) : (
                                                                    <img
                                                                        src={msg.media_url}
                                                                        alt="Room Preview"
                                                                        className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                                                                        loading="lazy"
                                                                    />
                                                                )}
                                                                <div className="px-2.5 py-1.5 bg-slate-900/90 text-white flex items-center justify-between text-[11px]">
                                                                    <span className="font-semibold flex items-center space-x-1">
                                                                        <Sparkles className="w-3 h-3 text-amber-400 mr-1" />
                                                                        {msg.media_type === 'VIDEO' ? 'Official Room Tour Video' : 'Verified Room Photo'}
                                                                    </span>
                                                                    <a
                                                                        href={msg.media_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="text-purple-300 hover:text-white underline text-[10px]"
                                                                    >
                                                                        {msg.media_type === 'VIDEO' ? 'Open Video ↗' : 'Full View ↗'}
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* AI Suggestion Box */}
                                                {msg.suggested_reply && !msg.is_approved && (
                                                    <div className="ml-2 max-w-lg p-3 rounded-xl border border-amber-300 bg-amber-50/80 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs">
                                                                <Bot className="w-4 h-4 text-amber-600" />
                                                                <span>StayPulse AI Draft Suggestion</span>
                                                            </div>
                                                            <span className="text-[9.5px] font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                                Pending Approval
                                                            </span>
                                                        </div>

                                                        {editingDraftId === msg.id ? (
                                                            <div className="space-y-2">
                                                                <textarea
                                                                    value={editedDraftText}
                                                                    onChange={(e) => setEditedDraftText(e.target.value)}
                                                                    className="w-full text-xs p-2.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                                                                    rows={3}
                                                                />
                                                                <div className="flex items-center justify-end space-x-2">
                                                                    <button
                                                                        onClick={() => setEditingDraftId(null)}
                                                                        className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApproveDraft(msg.id, editedDraftText)}
                                                                        disabled={actionLoading}
                                                                        className="px-3 py-1 bg-emerald-600 text-white text-xs font-semibold rounded-lg shadow-2xs hover:bg-emerald-700"
                                                                    >
                                                                        Save & Dispatch
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <p className="text-xs text-slate-800 bg-white/80 p-2.5 rounded-lg border border-amber-200/80 whitespace-pre-wrap leading-relaxed">
                                                                    {msg.suggested_reply}
                                                                </p>
                                                                <div className="flex items-center justify-end space-x-2 pt-1">
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingDraftId(msg.id);
                                                                            setEditedDraftText(msg.suggested_reply || '');
                                                                        }}
                                                                        className="flex items-center space-x-1 px-2.5 py-1 bg-white text-slate-700 border border-slate-200 text-xs font-medium rounded-lg hover:bg-slate-50"
                                                                    >
                                                                        <Edit3 className="w-3 h-3 text-slate-500" />
                                                                        <span>Customize</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleApproveDraft(msg.id)}
                                                                        disabled={actionLoading}
                                                                        className="flex items-center space-x-1 px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-2xs hover:bg-emerald-700"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>1-Click Approve & Send</span>
                                                                    </button>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Composer (Enterprise High-Contrast & Legible Unified Card Design) */}
                            <div className="bg-slate-100/70 border-t border-slate-200 p-2 sm:p-2.5 shrink-0">
                                <div className={`rounded-xl border shadow-2xs transition-all overflow-hidden ${
                                    isInternalMode
                                        ? 'bg-amber-50/50 border-amber-300 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-400/20'
                                        : 'bg-white border-slate-300 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20'
                                }`}>
                                    {/* Top Card Header: Mode Selector & Clear Button */}
                                    <div className={`flex items-center justify-between px-3 py-1.5 border-b text-xs ${
                                        isInternalMode ? 'bg-amber-100/70 border-amber-200/80 text-amber-900' : 'bg-slate-50/90 border-slate-100 text-slate-700'
                                    }`}>
                                        <div className="flex items-center space-x-2 min-w-0">
                                            {/* Mode Selector */}
                                            <div className="flex items-center bg-slate-200/90 p-0.5 rounded-lg border border-slate-300/80 text-[11px] shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsInternalMode(false)}
                                                    className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                                        !isInternalMode
                                                            ? 'bg-emerald-600 text-white shadow-2xs'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                    title="Send message directly to the guest"
                                                >
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span>Guest Reply</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsInternalMode(true)}
                                                    className={`px-2.5 py-0.5 rounded-md font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                                                        isInternalMode
                                                            ? 'bg-amber-600 text-white shadow-2xs'
                                                            : 'text-slate-600 hover:text-slate-900'
                                                    }`}
                                                    title="Internal note visible only to hotel team"
                                                >
                                                    <Lock className="w-3 h-3" />
                                                    <span>Staff Note</span>
                                                </button>
                                            </div>

                                            {/* Recipient Context */}
                                            <span className="hidden sm:inline-flex items-center text-[11px] font-medium truncate">
                                                {isInternalMode ? (
                                                    <span className="text-amber-900 font-semibold flex items-center gap-1">
                                                        <span>🔒 Private team log (invisible to guest)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-600">
                                                        To: <strong className="text-slate-900 font-bold">{selectedConv.guest_name}</strong> via <span className="uppercase text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">{selectedConv.channel}</span>
                                                    </span>
                                                )}
                                            </span>
                                        </div>

                                        {/* Clear Draft Button */}
                                        {outboundText.trim() && (
                                            <button
                                                type="button"
                                                onClick={() => setOutboundText('')}
                                                className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-0.5 rounded transition-colors cursor-pointer flex items-center space-x-1"
                                                title="Clear pre-filled message"
                                            >
                                                <X className="w-3 h-3" />
                                                <span>Clear Draft</span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Quick Snippets Tray (When opened) */}
                                    {showQuickSnippets && (
                                        <div className="bg-amber-50/70 border-b border-amber-200/80 p-2 flex flex-wrap gap-1.5 max-h-32 overflow-y-auto animate-in fade-in duration-150">
                                            <span className="w-full text-[10.5px] font-bold uppercase tracking-wider text-amber-900 mb-0.5 flex items-center gap-1">
                                                <Zap className="w-3 h-3 text-amber-600" />
                                                <span>Insert Quick Reply:</span>
                                            </span>
                                            {CANNED_SNIPPETS.map((snippet) => (
                                                <button
                                                    key={snippet.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setOutboundText(prev => prev ? `${prev}\n\n${snippet.text}` : snippet.text);
                                                        setShowQuickSnippets(false);
                                                    }}
                                                    className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-400 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 hover:text-emerald-800 transition-colors cursor-pointer shadow-2xs"
                                                >
                                                    {snippet.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Crisp, Bold, High-Contrast Textarea */}
                                    <div className={`p-2.5 ${isInternalMode ? 'bg-amber-50/30' : 'bg-white'}`}>
                                        <textarea
                                            value={outboundText}
                                            onChange={(e) => setOutboundText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                            placeholder={
                                                isInternalMode
                                                    ? "Add a confidential staff note (visible only to hotel staff)..."
                                                    : `Type your message to ${selectedConv.guest_name}... (Press Enter to send)`
                                            }
                                            className={`w-full min-h-[64px] max-h-40 resize-none text-[13.5px] font-medium leading-relaxed focus:outline-none transition-colors ${
                                                isInternalMode
                                                    ? 'text-amber-950 placeholder:text-amber-700/50 bg-transparent'
                                                    : 'text-slate-900 placeholder:text-slate-400 bg-transparent'
                                            }`}
                                            rows={3}
                                        />
                                    </div>

                                    {/* Bottom Action Ribbon */}
                                    <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50/90 border-t border-slate-200/80 rounded-b-xl gap-2">
                                        <div className="flex items-center space-x-1.5 relative">
                                            {/* Quick Replies Toggle */}
                                            <button
                                                type="button"
                                                onClick={() => setShowQuickSnippets(prev => !prev)}
                                                className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1 text-xs font-bold transition-all cursor-pointer ${
                                                    showQuickSnippets
                                                        ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                                                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                                }`}
                                                title="Canned Quick Replies"
                                            >
                                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Quick Replies</span>
                                                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showQuickSnippets ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* ➕ Front Desk Operations Dropdown */}
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowActionsMenu(prev => !prev)}
                                                    className={`px-2.5 py-1 rounded-lg border flex items-center space-x-1 text-xs font-bold transition-all cursor-pointer ${
                                                        showActionsMenu
                                                            ? 'bg-indigo-100 text-indigo-900 border-indigo-300 shadow-2xs'
                                                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                                    }`}
                                                    title="Front Desk Operations"
                                                >
                                                    <Plus className="w-3.5 h-3.5 text-slate-600" />
                                                    <span>Actions</span>
                                                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showActionsMenu ? 'rotate-180' : ''}`} />
                                                </button>

                                                {showActionsMenu && (
                                                    <div className="absolute left-0 bottom-full mb-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-50 text-xs animate-in fade-in zoom-in-95 space-y-0.5">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-2 py-1">
                                                            Front Desk Operations
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setServiceRoomInput(selectedConv.room_number || '');
                                                                setShowServiceModal(true);
                                                                setShowActionsMenu(false);
                                                            }}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-indigo-50 text-indigo-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors"
                                                        >
                                                            <Wrench className="w-3.5 h-3.5 text-indigo-600" />
                                                            <span>Dispatch Service Task</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleSendConfirmationVoucher();
                                                                setShowActionsMenu(false);
                                                            }}
                                                            disabled={actionLoading || (!selectedConv.reservation_number && !selectedConv.reservation_id)}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors disabled:opacity-40"
                                                        >
                                                            <Send className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Send Confirmation Voucher</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleSendFolioLink();
                                                                setShowActionsMenu(false);
                                                            }}
                                                            disabled={!selectedConv.reservation_number}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-sky-50 text-sky-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors disabled:opacity-40"
                                                        >
                                                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                                                            <span>Send Digital Folio Link</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleSendPreCheckinLink();
                                                                setShowActionsMenu(false);
                                                            }}
                                                            disabled={actionLoading}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-emerald-50 text-emerald-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors disabled:opacity-40"
                                                        >
                                                            <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                                                            <span>Send Fast-Pass Pre-Checkin</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setShowLuggageModal(true);
                                                                setShowActionsMenu(false);
                                                            }}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-blue-50 text-blue-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors"
                                                        >
                                                            <Luggage className="w-3.5 h-3.5 text-blue-600" />
                                                            <span>Store Early Arrival Luggage</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleTriggerRoomReady();
                                                                setShowActionsMenu(false);
                                                            }}
                                                            disabled={actionLoading || !selectedConv.reservation_number}
                                                            className="w-full text-left px-2.5 py-1.5 hover:bg-purple-50 text-purple-900 rounded-lg font-medium flex items-center space-x-2 cursor-pointer transition-colors disabled:opacity-40"
                                                        >
                                                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                                                            <span>Send "Room Ready" Alert</span>
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Helper text */}
                                            <span className="hidden md:inline-block text-[11px] text-slate-400 pl-1.5">
                                                Enter ↵ to send • Shift+Enter for newline
                                            </span>
                                        </div>

                                        {/* High-Contrast Send Button */}
                                        <button
                                            type="button"
                                            onClick={handleSendMessage}
                                            disabled={!outboundText.trim() || isSending}
                                            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all shadow-xs cursor-pointer shrink-0 ${
                                                !outboundText.trim() || isSending
                                                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300/80 shadow-none'
                                                    : isInternalMode
                                                    ? 'bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-amber-600/20'
                                                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-emerald-600/20'
                                            }`}
                                            title={isInternalMode ? "Save Internal Staff Note" : "Send Guest Reply"}
                                        >
                                            {isInternalMode ? (
                                                <>
                                                    <Lock className="w-3.5 h-3.5" />
                                                    <span>Save Note</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Send</span>
                                                    <Send className="w-3.5 h-3.5" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                            <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
                            <p className="text-sm font-semibold text-slate-600">Select a conversation to start chatting</p>
                            <p className="text-xs text-slate-400">WhatsApp, Facebook Messenger, and Instagram comments appear in real-time</p>
                        </div>
                    )}

                    {/* RIGHT PANEL: Guest 360 & AI Copilot Drawer (AiPraktor-inspired Hotel Companion) */}
                    {selectedConv && showRightPanel && (
                        <div className="w-80 lg:w-84 xl:w-88 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden shadow-xs">
                            {/* Panel Header */}
                            <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="text-[11px] font-bold text-slate-800 tracking-wider uppercase truncate">
                                        Guest 360 & AI Copilot
                                    </span>
                                </div>
                                <button
                                    onClick={() => setShowRightPanel(false)}
                                    className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/80 cursor-pointer transition-colors"
                                    title="Collapse sidebar"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* 3 Navigation Tabs */}
                            <div className="flex items-center p-1.5 bg-slate-100/90 border-b border-slate-200 gap-1 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => setCopilotTab('SUMMARY')}
                                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                                        copilotTab === 'SUMMARY'
                                            ? 'bg-white text-purple-950 shadow-2xs border border-purple-200/60'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    <Sparkles className={`w-3 h-3 ${copilotTab === 'SUMMARY' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    <span>Summary</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCopilotTab('ASK')}
                                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                                        copilotTab === 'ASK'
                                            ? 'bg-white text-purple-950 shadow-2xs border border-purple-200/60'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    <Bot className={`w-3 h-3 ${copilotTab === 'ASK' ? 'text-purple-600' : 'text-slate-400'}`} />
                                    <span>Ask Copilot</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setCopilotTab('PMS')}
                                    className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                                        copilotTab === 'PMS'
                                            ? 'bg-white text-emerald-950 shadow-2xs border border-emerald-200/60'
                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                >
                                    <Luggage className={`w-3 h-3 ${copilotTab === 'PMS' ? 'text-emerald-600' : 'text-slate-400'}`} />
                                    <span>PMS 360</span>
                                </button>
                            </div>

                            {/* Tab Body Scrollable Area */}
                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {/* TAB 1: SUMMARY */}
                                {copilotTab === 'SUMMARY' && (
                                    <>
                                        {/* Guest Profile Monogram Card */}
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                                            <div className="flex items-center space-x-2.5">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-900 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                                                    {selectedConv.guest_name.slice(0, 2).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center space-x-1.5">
                                                        <h4 className="font-bold text-slate-900 text-xs truncate">
                                                            {selectedConv.guest_name}
                                                        </h4>
                                                    </div>
                                                    <p className="text-[10.5px] text-slate-500 font-mono truncate">
                                                        {selectedConv.external_user_id}
                                                    </p>
                                                    <div className="flex items-center space-x-1.5 mt-1">
                                                        {getChannelBadge(selectedConv, true)}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dynamic Loyalty / Relationship Tier Badge */}
                                            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Relationship</span>
                                                {copilotData ? (
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center space-x-1 shadow-2xs ${
                                                        copilotData.relationshipTier === 'IN_HOUSE'
                                                            ? 'bg-emerald-500 text-white'
                                                            : copilotData.relationshipTier === 'UPCOMING_BOOKING'
                                                            ? 'bg-blue-600 text-white'
                                                            : copilotData.relationshipTier === 'REPEAT_VIP'
                                                            ? 'bg-purple-600 text-white'
                                                            : copilotData.relationshipTier === 'PREVIOUS_INQUIRER'
                                                            ? 'bg-amber-600 text-white'
                                                            : 'bg-slate-700 text-white'
                                                    }`}>
                                                        {copilotData.relationshipTier === 'REPEAT_VIP' && <Crown className="w-2.5 h-2.5" />}
                                                        <span>{copilotData.summaryBadge}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400">Loading...</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* AI One-Paragraph Intelligence Brief Card */}
                                        <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50/80 via-indigo-50/60 to-purple-50/40 border border-purple-200/80 space-y-1.5 shadow-2xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10.5px] font-bold text-purple-900 flex items-center space-x-1">
                                                    <Sparkles className="w-3 h-3 text-purple-600" />
                                                    <span>STAYPULSE AI MEMORY BRIEF</span>
                                                </span>
                                                <span className="text-[9.5px] font-semibold text-purple-600 bg-white/80 px-1.5 py-0.2 rounded border border-purple-200/80">
                                                    Cross-Stay AI
                                                </span>
                                            </div>
                                            {copilotLoading ? (
                                                <div className="space-y-1.5 py-1 animate-pulse">
                                                    <div className="h-2.5 bg-purple-200/70 rounded w-full" />
                                                    <div className="h-2.5 bg-purple-200/70 rounded w-5/6" />
                                                </div>
                                            ) : (
                                                <p className="text-[11.5px] text-purple-950 font-normal leading-relaxed">
                                                    {copilotData?.copilotOneParagraphSummary ||
                                                        `${selectedConv.guest_name} is an active contact on ${selectedConv.channel}. No prior completed reservations recorded.`}
                                                </p>
                                            )}
                                        </div>

                                        {/* Key Stay Metrics Grid */}
                                        <div className="space-y-1.5">
                                            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                                                Guest Lifetime Stats
                                            </span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                                                    <span className="text-[10px] text-slate-400 block font-medium">Completed Stays</span>
                                                    <span className="text-xs font-bold text-slate-900">
                                                        {copilotData?.stayCount ?? (selectedConv.reservation_number ? 1 : 0)} Stays
                                                    </span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                                                    <span className="text-[10px] text-slate-400 block font-medium">Lifetime Value</span>
                                                    <span className="text-xs font-bold text-emerald-700 font-mono">
                                                        ৳{(copilotData?.lifetimeSpend ?? (selectedConv.total_amount || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                                                    <span className="text-[10px] text-slate-400 block font-medium">Favorite Room</span>
                                                    <span className="text-[11px] font-bold text-slate-900 truncate block">
                                                        {copilotData?.favoriteRoomType || selectedConv.room_type_name || 'Standard'}
                                                    </span>
                                                </div>
                                                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                                                    <span className="text-[10px] text-slate-400 block font-medium">Last Stay Dates</span>
                                                    <span className="text-[10px] font-mono font-medium text-slate-700 truncate block">
                                                        {copilotData?.lastStay ? copilotData.lastStay.dates : 'First Visit'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Quick Prompt Button to Jump to Ask Tab */}
                                        <button
                                            type="button"
                                            onClick={() => setCopilotTab('ASK')}
                                            className="w-full py-2 px-2.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/90 text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-2xs"
                                        >
                                            <Bot className="w-3.5 h-3.5 text-purple-700" />
                                            <span>Ask Copilot about {selectedConv.guest_name.split(' ')[0]}</span>
                                        </button>
                                    </>
                                )}

                                {/* TAB 2: ASK COPILOT */}
                                {copilotTab === 'ASK' && (
                                    <div className="space-y-3">
                                        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200/70">
                                            <div className="flex items-center space-x-1.5 mb-1">
                                                <Bot className="w-3.5 h-3.5 text-purple-700" />
                                                <span className="text-xs font-bold text-purple-950">StayPulse Copilot</span>
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            </div>
                                            <p className="text-[11px] text-purple-900/80 leading-snug">
                                                Ask Gemini anything about {selectedConv.guest_name}'s history, previous bookings, complaints, or balance due.
                                            </p>
                                        </div>

                                        {/* Suggested Questions Chips */}
                                        <div className="space-y-1">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                                Suggested Questions
                                            </span>
                                            <div className="flex flex-col gap-1">
                                                {[
                                                    'What did this guest book before?',
                                                    'Does he have any upcoming booking?',
                                                    'What is his favorite room type & preference?',
                                                    'Is there any balance due on his account?'
                                                ].map((prompt, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleAskCopilot(prompt)}
                                                        disabled={isAskingCopilot}
                                                        className="text-left px-2 py-1.5 bg-slate-50 hover:bg-purple-50 text-slate-700 hover:text-purple-900 rounded-lg border border-slate-200/80 hover:border-purple-200 text-[11px] font-medium transition-colors cursor-pointer truncate"
                                                    >
                                                        💬 {prompt}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Custom Question Input */}
                                        <div className="space-y-1.5 pt-1">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={copilotQuestion}
                                                    onChange={e => setCopilotQuestion(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAskCopilot();
                                                    }}
                                                    placeholder="Ask anything about this guest..."
                                                    disabled={isAskingCopilot}
                                                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-8 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 text-slate-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleAskCopilot()}
                                                    disabled={isAskingCopilot || !copilotQuestion.trim()}
                                                    className="absolute right-1 top-1 bottom-1 px-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white rounded-md text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center"
                                                    title="Ask Copilot"
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Answer Card */}
                                        {isAskingCopilot && (
                                            <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200 text-xs text-purple-900 flex items-center space-x-2 animate-pulse">
                                                <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-spin" />
                                                <span>Analyzing guest records & reservations...</span>
                                            </div>
                                        )}

                                        {copilotAnswer && !isAskingCopilot && (
                                            <div className="p-3 rounded-xl bg-white border border-purple-200/90 shadow-xs space-y-2">
                                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                                    <span className="text-[10.5px] font-bold text-purple-950 flex items-center space-x-1">
                                                        <Bot className="w-3 h-3 text-purple-600" />
                                                        <span>Copilot Answer</span>
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleCopyAnswerToReply(copilotAnswer)}
                                                        className="text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200 flex items-center space-x-1 cursor-pointer transition-colors"
                                                        title="Copy this answer into chat reply box"
                                                    >
                                                        {copiedAnswer ? (
                                                            <>
                                                                <CheckCheck className="w-2.5 h-2.5 text-emerald-600" />
                                                                <span className="text-emerald-700">Copied!</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-2.5 h-2.5" />
                                                                <span>Use in Reply</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-slate-800 leading-relaxed font-normal">
                                                    {copilotAnswer}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 3: PMS 360 */}
                                {copilotTab === 'PMS' && (
                                    <>
                                        {/* Reservation Details if linked */}
                                        {selectedConv.reservation_number ? (
                                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-600 text-[10.5px]">Reservation</span>
                                                    <span className="font-mono font-bold text-emerald-700 text-[11px] bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200/80">
                                                        {selectedConv.reservation_number}
                                                    </span>
                                                </div>

                                                {selectedConv.room_number && (
                                                    <div className="flex items-center justify-between text-slate-600 text-[10.5px]">
                                                        <span>Room:</span>
                                                        <span className="font-bold text-slate-900">Room {selectedConv.room_number}</span>
                                                    </div>
                                                )}

                                                {selectedConv.check_in_date && (
                                                    <div className="flex items-center justify-between text-slate-500 text-[10.5px]">
                                                        <span>Dates:</span>
                                                        <span className="text-slate-700 font-medium font-mono text-[10px]">
                                                            {String(selectedConv.check_in_date).slice(0, 10)} → {String(selectedConv.check_out_date || '').slice(0, 10)}
                                                        </span>
                                                    </div>
                                                )}

                                                {selectedConv.balance_due !== undefined && (
                                                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/80 text-[10.5px] font-semibold">
                                                        <span>Balance Due:</span>
                                                        <span className={selectedConv.balance_due > 0 ? 'text-amber-600 font-bold font-mono' : 'text-emerald-600 font-bold font-mono'}>
                                                            ৳{Number(selectedConv.balance_due).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center py-2.5">
                                                <p className="text-[10.5px] font-semibold text-slate-600">Inbound Lead</p>
                                                <span className="text-[9.5px] text-slate-400">No PMS reservation attached</span>
                                            </div>
                                        )}

                                        {/* Digital Fast-Pass & KYC Status */}
                                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-xs">
                                            <span className="font-bold text-slate-600 text-[10.5px] block">Fast-Pass Check-In</span>
                                            <div className="flex items-center justify-between text-[10.5px]">
                                                <span className="text-slate-500">Pre-Arrival KYC:</span>
                                                {selectedConv.is_pre_checked_in ? (
                                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-0.5">
                                                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                                        <span>VERIFIED</span>
                                                    </span>
                                                ) : (
                                                    <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-100 text-amber-800">
                                                        PENDING
                                                    </span>
                                                )}
                                            </div>

                                            {selectedConv.luggage_tag_number && (
                                                <div className="flex items-center justify-between text-[10.5px]">
                                                    <span className="text-slate-500">Luggage Tag:</span>
                                                    <span className="font-mono font-bold text-blue-700">#{selectedConv.luggage_tag_number}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Front Desk Operations Grid */}
                                        <div className="space-y-1.5 pt-0.5">
                                            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                                                PMS Actions
                                            </span>
                                            <div className="grid grid-cols-2 gap-1.5">
                                                <button
                                                    onClick={handleTriggerRoomReady}
                                                    disabled={actionLoading || !selectedConv.reservation_number}
                                                    className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-40"
                                                    title="Send WhatsApp alert that room is inspected & ready"
                                                >
                                                    <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                                                    <span className="truncate">Room Ready</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowLuggageModal(true)}
                                                    className="py-1.5 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10.5px] font-semibold transition-all flex items-center justify-center space-x-1 shadow-2xs cursor-pointer"
                                                    title="Store early arrival luggage"
                                                >
                                                    <Luggage className="w-3 h-3 text-slate-500 shrink-0" />
                                                    <span className="truncate">Luggage Tag</span>
                                                </button>
                                                <button
                                                    onClick={handleSendPreCheckinLink}
                                                    disabled={actionLoading}
                                                    className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200/80 rounded-lg text-[10.5px] font-semibold transition-all flex items-center justify-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-40"
                                                    title="Send Fast-Pass KYC Link"
                                                >
                                                    <QrCode className="w-3 h-3 text-blue-600 shrink-0" />
                                                    <span className="truncate">Fast-Pass Link</span>
                                                </button>
                                                <button
                                                    onClick={handleSendFolioLink}
                                                    disabled={!selectedConv.reservation_number}
                                                    className="py-1.5 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80 rounded-lg text-[10.5px] font-semibold transition-all flex items-center justify-center space-x-1 shadow-2xs cursor-pointer disabled:opacity-40"
                                                    title="Send Digital Folio"
                                                >
                                                    <FileText className="w-3 h-3 text-indigo-600 shrink-0" />
                                                    <span className="truncate">Digital Folio</span>
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleSendConfirmationVoucher}
                                                disabled={actionLoading || (!selectedConv.reservation_number && !selectedConv.reservation_id)}
                                                className="w-full mt-2 py-1.5 px-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-[10.5px] font-bold transition-all flex items-center justify-center space-x-1.5 shadow-2xs cursor-pointer disabled:opacity-40"
                                                title="Send Official 5-Star Booking Confirmation Voucher via WhatsApp & Email"
                                            >
                                                <Send className="w-3 h-3 text-white shrink-0" />
                                                <span>Send Confirmation Voucher</span>
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* PRE-ARRIVAL KYC QUEUE */}
            {activeTab === 'KYC_QUEUE' && (
                /* PRE-ARRIVAL KYC QUEUE */
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Pre-Arrival Digital KYC Queue</h2>
                        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                        <th className="py-3 px-4">Guest Name</th>
                                        <th className="py-3 px-4">Channel</th>
                                        <th className="py-3 px-4">Booking #</th>
                                        <th className="py-3 px-4">Room & Type</th>
                                        <th className="py-3 px-4">ETA</th>
                                        <th className="py-3 px-4">KYC Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {conversations.filter(c => c.is_pre_checked_in || c.pre_checkin_eta).map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="py-3 px-4 font-bold text-slate-900">{c.guest_name}</td>
                                            <td className="py-3 px-4">{getChannelBadge(c)}</td>
                                            <td className="py-3 px-4 font-mono text-slate-600">{c.reservation_number || 'N/A'}</td>
                                            <td className="py-3 px-4 text-slate-700">Room {c.room_number || 'TBD'}</td>
                                            <td className="py-3 px-4 font-semibold text-emerald-700">{c.pre_checkin_eta || 'Standard Check-in'}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                    Verified & Signed
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setSelectedConv(c);
                                                        setActiveTab('INBOX');
                                                    }}
                                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"
                                                >
                                                    Open Chat
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* LUGGAGE STORAGE VIEW */}
            {activeTab === 'LUGGAGE' && (
                <div className="flex-1 p-6 overflow-y-auto">
                    <div className="max-w-6xl mx-auto space-y-4">
                        <h2 className="text-base font-bold text-slate-900">Stored Luggage (Early Arrivals)</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {conversations.filter(c => c.luggage_tag_number).map(c => (
                                <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="font-mono text-sm font-bold text-blue-700">Tag #{c.luggage_tag_number}</span>
                                        <span className="text-[10px] text-slate-400">
                                            {c.arrived_early_at ? new Date(c.arrived_early_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-900 text-xs">{c.guest_name}</h4>
                                    <p className="text-xs text-slate-500">Target Room: Room {c.room_number || 'Unassigned'}</p>
                                    <button
                                        onClick={() => {
                                            setSelectedConv(c);
                                            handleTriggerRoomReady();
                                        }}
                                        className="w-full mt-2 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                                    >
                                        Send Room Ready Alert
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Channels & Accounts Drawer / Modal */}
            {showChannelsModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="font-bold text-slate-900 text-base">Connected Social & Messaging Accounts</h3>
                                <p className="text-xs text-slate-500">Add, configure, or disconnect WhatsApp numbers, Facebook Pages, and Instagram accounts</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowChannelsModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <MultiChannelSettingsPanel />
                    </div>
                </div>
            )}

            {/* In-Chat Service Ticket Dispatch Modal (Housekeeping / Maintenance) */}
            {showServiceModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-4 text-white flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                                    <Wrench className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-sm">Dispatch In-Room Service</h3>
                                    <p className="text-[11px] text-slate-300">Creates instant High-Priority Ticket with SLA</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowServiceModal(false)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 space-y-3.5 text-xs">
                            {/* Department Toggle */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Target Department</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setServiceType('HOUSEKEEPING');
                                            setServiceItem('Extra Towels (2 pcs)');
                                        }}
                                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                                            serviceType === 'HOUSEKEEPING'
                                                ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="text-sm">🛎️</span>
                                        <span>Housekeeping</span>
                                        <span className="text-[10px] font-normal text-slate-500">Towels, Clean, Water (15m SLA)</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setServiceType('MAINTENANCE');
                                            setServiceItem('AC Temperature / Cooling Issue');
                                        }}
                                        className={`p-2.5 rounded-xl border text-center font-bold flex flex-col items-center space-y-1 transition-all cursor-pointer ${
                                            serviceType === 'MAINTENANCE'
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-800 shadow-2xs'
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <span className="text-sm">🛠️</span>
                                        <span>Engineering / Maint.</span>
                                        <span className="text-[10px] font-normal text-slate-500">AC, TV, Geyser, Leaks (30m SLA)</span>
                                    </button>
                                </div>
                            </div>

                            {/* Room Number */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Room Number *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 101, 204"
                                    value={serviceRoomInput}
                                    onChange={(e) => setServiceRoomInput(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                />
                            </div>

                            {/* Common Service Item */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Standard Item / Issue</label>
                                <select
                                    value={serviceItem}
                                    onChange={(e) => setServiceItem(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                >
                                    {serviceType === 'HOUSEKEEPING' ? (
                                        <>
                                            <option value="Extra Towels (2 pcs)">Extra Towels (2 pcs)</option>
                                            <option value="Mineral Water Bottles (2 pcs)">Mineral Water Bottles (2 pcs)</option>
                                            <option value="Extra Pillows & Blanket">Extra Pillows & Blanket</option>
                                            <option value="Dental Kit & Toiletries">Dental Kit & Toiletries</option>
                                            <option value="Full Daily Room Cleaning">Full Daily Room Cleaning</option>
                                            <option value="Iron & Ironing Board">Iron & Ironing Board</option>
                                            <option value="Linen & Bed Sheet Change">Linen & Bed Sheet Change</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="AC Temperature / Cooling Issue">AC Temperature / Cooling Issue</option>
                                            <option value="Bathroom Geyser / Hot Water">Bathroom Geyser / Hot Water</option>
                                            <option value="Smart TV / Cable Connection">Smart TV / Cable Connection</option>
                                            <option value="Electronic Safe Reset">Electronic Safe Reset</option>
                                            <option value="Door Lock / RFID Keycard Malfunction">Door Lock / RFID Keycard Malfunction</option>
                                            <option value="Plumbing / Water Tap Leakage">Plumbing / Water Tap Leakage</option>
                                            <option value="Electrical Socket / Lighting">Electrical Socket / Lighting</option>
                                        </>
                                    )}
                                </select>
                            </div>

                            {/* Additional Special Notes */}
                            <div>
                                <label className="font-bold text-slate-700 block mb-1">Special Instructions (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Guest requested urgently before 6 PM"
                                    value={serviceNotes}
                                    onChange={(e) => setServiceNotes(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                                />
                            </div>
                        </div>

                        <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                            <button
                                onClick={() => setShowServiceModal(false)}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDispatchServiceTask}
                                disabled={actionLoading || !serviceRoomInput.trim()}
                                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-2xs disabled:opacity-50 cursor-pointer"
                            >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Create & Notify Room</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Luggage Storage Modal */}
            {showLuggageModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                                <Luggage className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-900 text-sm">Store Luggage (Arrived Early)</h3>
                                <p className="text-xs text-slate-500">Register bags & notify guest</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Luggage Tag Number</label>
                            <input
                                type="text"
                                placeholder="e.g. LUG-1082"
                                value={luggageTagInput}
                                onChange={(e) => setLuggageTagInput(e.target.value)}
                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex items-center justify-end space-x-2 pt-2">
                            <button
                                onClick={() => setShowLuggageModal(false)}
                                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStoreLuggage}
                                disabled={!luggageTagInput.trim() || actionLoading}
                                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                Save & Notify Guest
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Test Simulator Modal */}
            {showSimulatorModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-base">StayPulse AI Live Simulator</h3>
                                    <p className="text-xs text-slate-500">Test Gemini AI & RAG locally without webhooks or public hosting</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSimulatorModal(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Channel & AI Mode Selector */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Simulated Channel</label>
                                <select
                                    value={simChannel}
                                    onChange={(e) => setSimChannel(e.target.value as any)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="WHATSAPP">WhatsApp Message</option>
                                    <option value="MESSENGER">Facebook Messenger</option>
                                    <option value="FACEBOOK_COMMENT">Facebook Post Comment</option>
                                    <option value="INSTAGRAM_DM">Instagram Direct</option>
                                    <option value="INSTAGRAM_COMMENT">Instagram Comment</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">AI Mode for This Test</label>
                                <select
                                    value={simAiMode}
                                    onChange={(e) => setSimAiMode(e.target.value as any)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                >
                                    <option value="AUTOPILOT">AUTOPILOT (Instant Live Reply)</option>
                                    <option value="SUGGEST">SUGGEST (Draft for Approval)</option>
                                </select>
                            </div>
                        </div>

                        {/* Guest Info */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Sender Name</label>
                                <input
                                    type="text"
                                    value={simGuestName}
                                    onChange={(e) => setSimGuestName(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-slate-700 block mb-1">Sender ID / Phone</label>
                                <input
                                    type="text"
                                    value={simUserId}
                                    onChange={(e) => setSimUserId(e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        {/* 1-Click Test Prompts */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1.5">Quick 1-Click Test Questions:</label>
                            <div className="flex flex-wrap gap-1.5">
                                {[
                                    { label: '🇧🇩 Banglish Room Availability', text: 'bhai kalke kon type e faka ache?' },
                                    { label: '🇧🇩 Banglish Room Rate', text: 'bhai room er vara koto? check-in time kokhon?' },
                                    { label: '🇧🇩 Pure Bangla Availability', text: 'আপনাদের কোন কোন রুম খালি আছে এবং ভাড়া কত?' },
                                    { label: '🇬🇧 English Availability', text: 'Hello! What room categories are available for tomorrow and what are the rates?' }
                                ].map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setSimText(preset.text)}
                                        className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-purple-100 hover:text-purple-700 text-slate-700 rounded-md border border-slate-200 transition-colors text-left"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Inbound Message */}
                        <div>
                            <label className="text-xs font-semibold text-slate-700 block mb-1">Inbound Guest Message</label>
                            <textarea
                                rows={3}
                                value={simText}
                                onChange={(e) => setSimText(e.target.value)}
                                placeholder="Write any message in Bangla, Banglish, or English..."
                                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none font-mono"
                            />
                        </div>

                        {/* Action Button */}
                        <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                                <Zap className="w-3.5 h-3.5 text-amber-500" />
                                <span>Powered by Google Gemini 3.1 Flash + PostgreSQL RAG</span>
                            </span>
                            <button
                                onClick={handleRunSimulation}
                                disabled={simLoading || !simText.trim()}
                                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                            >
                                {simLoading ? (
                                    <>
                                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                        <span>AI Thinking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Simulate Inbound Message</span>
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Simulation Output Display */}
                        {simResult && (
                            <div className={`mt-3 p-3.5 rounded-xl border text-xs space-y-2 ${
                                simResult.success ? 'bg-purple-50/70 border-purple-200 text-purple-950' : 'bg-red-50 border-red-200 text-red-900'
                            }`}>
                                <div className="flex items-center justify-between font-bold">
                                    <span>{simResult.success ? '✨ Gemini AI Response Generated:' : '❌ Simulation Error:'}</span>
                                    {simResult.data?.detectedLanguage && (
                                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-200 text-purple-800">
                                            Language: {simResult.data.detectedLanguage}
                                        </span>
                                    )}
                                </div>
                                {simResult.success ? (
                                    <>
                                        <p className="whitespace-pre-wrap leading-relaxed font-sans bg-white p-3 rounded-lg border border-purple-100 text-slate-800">
                                            {simResult.data?.aiReply || simResult.data?.aiResponse || simResult.data?.replyText}
                                        </p>
                                        {simResult.data?.mediaUrl && (
                                            <div className="rounded-xl overflow-hidden border border-purple-200 max-w-xs shadow-xs">
                                                {simResult.data?.mediaType === 'VIDEO' || simResult.data.mediaUrl.endsWith('.mp4') ? (
                                                    <video controls playsInline src={simResult.data.mediaUrl} className="w-full h-36 object-cover bg-black" />
                                                ) : (
                                                    <img src={simResult.data.mediaUrl} alt="Room Preview" className="w-full h-36 object-cover" />
                                                )}
                                                <div className="p-1.5 bg-slate-900 text-white text-[10px] flex items-center justify-between">
                                                    <span>{simResult.data?.mediaType === 'VIDEO' ? '🎥 Attached Room Tour Video' : '📷 Attached Room Photo'}</span>
                                                    <a href={simResult.data.mediaUrl} target="_blank" rel="noreferrer" className="underline text-purple-300">View Full ↗</a>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between text-[11px] text-purple-700">
                                            <span>Action: <b>{simResult.data?.executionResult}</b></span>
                                            <span>Conversation #{simResult.data?.conversation?.id} updated in Inbox</span>
                                        </div>
                                    </>
                                ) : (
                                    <p>{simResult.error || 'Failed to execute simulation'}</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default GuestFlowInbox;
