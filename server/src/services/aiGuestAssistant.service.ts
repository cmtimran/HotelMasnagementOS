import { pgPool } from '../database/postgres.js';
import { getActiveTenantPool } from '../database/tenantContext.js';
import { WhatsAppCloudApiService } from './whatsappCloudApi.service.js';
import { signJwt } from '../utils/jwt.js';
import { getFrontendBaseUrl } from '../utils/urlHelper.js';

const getPool = () => getActiveTenantPool(pgPool);

export interface GuestMemoryProfile {
    relationshipTier: 'IN_HOUSE' | 'UPCOMING_BOOKING' | 'REPEAT_VIP' | 'PREVIOUS_INQUIRER' | 'FIRST_TIME';
    summaryBadge: string;
    isReturningGuest: boolean;
    guestId?: number;
    guestFullName: string;
    stayCount: number;
    lifetimeSpend: number;
    currentRoom?: string;
    activeReservation?: {
        id: number;
        resNo: string;
        status: string;
        roomType: string;
        roomNumber?: string;
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

export interface AiInquiryAnalysis {
    intent: 'AVAILABILITY_QUERY' | 'EARLY_CHECKIN' | 'POLICY_QUESTION' | 'BOOKING_INTENT' | 'PHOTO_REQUEST' | 'VIDEO_REQUEST' | 'HOUSEKEEPING_REQUEST' | 'MAINTENANCE_REQUEST' | 'COMPLAINT' | 'GENERAL';
    sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'ANGRY';
    detectedLanguage: 'BANGLA' | 'ENGLISH';
    proposedReply: string;
    publicCommentReply?: string;
    shouldEscalate: boolean;
    mediaUrl?: string;
    mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'TEXT';
    bookingReference?: string;
    guestMemory?: GuestMemoryProfile;
}

export const ROOM_PHOTOS_MAP: Record<string, { title: string; url: string; highlightsBangla: string; highlightsEnglish: string }> = {
    'deluxe suite': {
        title: 'Deluxe Suite',
        url: 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80',
        highlightsBangla: 'রুমটিতে রয়েছে এক্সিকিউটিভ কিং বেড, প্যানোরামিক সিটি ভিউ, ক্লাইমেট কন্ট্রোল এবং মার্বেল বাথরুম।',
        highlightsEnglish: 'Features an executive King Bed, panoramic city view, smart climate control, and a marble bath.'
    },
    'superior king room': {
        title: 'Superior King Room',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=80',
        highlightsBangla: 'রুমটিতে রয়েছে বিলাসবহুল আর্কিটেকচার, কিং সাইজ প্লাশ বেড, ফ্রি হাই-স্পিড ওয়াই-ফাই এবং ব্যালকনি।',
        highlightsEnglish: 'Features plush king bedding, private balcony access, smart workspace, and premium amenities.'
    },
    'executive suite': {
        title: 'Executive Suite',
        url: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=80',
        highlightsBangla: 'রুমটিতে রয়েছে সেপারেট লিভিং লাউঞ্জ, ডাইনিং এরিয়া, জ্যাকুজি বাথটাব এবং প্রেসিডেন্সিয়াল আরাম।',
        highlightsEnglish: 'Includes a separate living lounge, dining nook, deep soaking jacuzzi, and lounge access.'
    },
    'presidential penthouse suite': {
        title: 'Presidential Penthouse Suite',
        url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80',
        highlightsBangla: 'টপ-ফ্লোর পেন্টহাউস, প্রাইভেট টেরেস, ২৪/৭ বাটলার সার্ভিস এবং ঢাকা শহরের পুরো স্কাইলাইন ভিউ।',
        highlightsEnglish: 'Top-floor penthouse with private terrace, 24/7 dedicated butler, and 360-degree skyline views.'
    }
};

export class AiGuestAssistantService {
    /**
     * Language Classification Engine
     * 1. Bangla Script (বাংলা লিপি) -> Reply in Bangla
     * 2. Banglish (Bangla phonetics in Latin letters: "room er vara koto", "kalke khali ache", "ok book koro") -> Reply in Bangla
     * 3. English -> Reply in English
     * 4. Any other language -> Reply in English
     */
    static detectLanguage(text: string): 'BANGLA' | 'ENGLISH' {
        if (!text) return 'ENGLISH';

        // 1. Direct Bangla Unicode script detection (\u0980 - \u09FF)
        if (/[\u0980-\u09FF]/.test(text)) {
            return 'BANGLA';
        }

        // 2. Comprehensive Banglish vocabulary
        const banglishPatterns = [
            /\b(koto|koto\?|vara|bhara|vada|ache|ase|ase\?|ache\?|pabo|kobe|kalke|ajke|thakbe|lagbe|apnader|amader)\b/i,
            /\b(vai|bhai|apnar|hotel e|room e|khali|faka|jonno|shathe|sathe|pari|hobe|hobe\?|dorkar|chobi|pic|photo)\b/i,
            /\b(valo|bhalo|dhonnobad|thik|kothay|kemon|shokal|raat|rate|din|boro|choto|shundor|child|baccha)\b/i,
            /\b(dekhte|chai|chan|janiye|den|bolen|bolun|booking|korte|kore|korchi|korlam|koro|korben)\b/i,
            /\b(kono|discount|pawa|jabe|jabe\?|room lagbe|room chai|koi|khobor|ashbo|jon|r|ar|aar|amra|ami|tumi|apni)\b/i,
            /\b(tar|taar|je|eta|ota|ei|oi|tai|kintu|kichu|onek|ekta|duto|daw|dao|debo|deben|pathan|dekhbo|dekhaben)\b/i
        ];

        for (const pattern of banglishPatterns) {
            if (pattern.test(text)) {
                return 'BANGLA'; // Banglish user gets reply in pure Bangla
            }
        }

        return 'ENGLISH';
    }

    /**
     * Intelligent Cultural, Religious & Time-of-Day Greeting Detection
     * - Detects Muslim vs Hindu vs Neutral names
     * - Respects turn context: ONLY Turn 1 gets full welcome banner; subsequent turns greet naturally without repetitive slogans!
     * - STRICT 5-Star Hotel Rule: ALWAYS "স্যার" OR "ম্যাডাম" (NEVER "ভাই" OR "দাদা")
     */
    static getPersonalizedGreeting(
        rawGuestName: string,
        targetLang: 'BANGLA' | 'ENGLISH',
        guestMessage?: string,
        isFirstTurn: boolean = true,
        guestMemory?: GuestMemoryProfile
    ): {
        fullGreeting: string;
        culturalGreeting: string;
        timeGreeting: string;
        cleanGuestName: string;
        honorific: string;
        detectedFaith: 'MUSLIM' | 'HINDU' | 'NEUTRAL';
        isFirstTurn: boolean;
    } {
        // 1. Clean guest name (remove test prefixes / numbers / suffixes)
        let cleanName = (rawGuestName || '').trim();
        cleanName = cleanName.replace(/^(guest|user|test|tester)[\s_-]*/i, '').trim();
        cleanName = cleanName.replace(/[\s_-]*(guest|user|test|tester)$/i, '').trim();
        if (/^(guest|user|tester|test|customer)$/i.test(cleanName)) {
            cleanName = '';
        }

        const lowerName = (rawGuestName + ' ' + cleanName).toLowerCase();
        const lowerMsg = (guestMessage || '').toLowerCase();

        // 2. 5-Star Hotel Honorific: STRICTLY "স্যার" OR "ম্যাডাম" (NEVER "ভাই" OR "দাদা")
        const femaleTokens = [
            'fatema', 'ayesha', 'khadija', 'nusrat', 'jannat', 'farhana', 'tania', 'sadia', 'sharmin',
            'afroza', 'nargis', 'sabina', 'salma', 'nasrin', 'roksana', 'tahmina', 'tasnim', 'mim',
            'begum', 'khatun', 'sultana', 'jahan', 'akter', 'aktar', 'nahar', 'parvin', 'shirin',
            'ruma', 'sumi', 'reshma', 'shila', 'shanta', 'mita', 'rita', 'gita', 'priya', 'puja',
            'pooja', 'shampa', 'mou', 'trisha', 'mousumi', 'soma', 'anita', 'poly', 'keya', 'dipa',
            'rupa', 'tumpa', 'mona', 'marufa', 'hasina', 'khaleda', 'shirley', 'mary', 'sarah',
            'emma', 'lisa', 'jennifer', 'madam', 'ms', 'mrs', 'lady', 'woman'
        ];
        const nameTokens = lowerName.split(/[\s,._-]+/);
        const isFemale = nameTokens.some(w => femaleTokens.includes(w));
        const honorificBangla = isFemale ? 'ম্যাডাম' : 'স্যার';
        const honorificEnglish = isFemale ? 'Ms.' : 'Mr.';

        // 3. Religious & Cultural Detection from name tokens and message clues
        const muslimTokens = [
            'md', 'mohammad', 'muhammad', 'mohammed', 'imran', 'tanvir', 'hasan', 'hossain', 'hussain',
            'rahman', 'ali', 'ahmed', 'khan', 'chowdhury', 'choudhury', 'kabir', 'karim', 'farhan', 'shakil',
            'rakib', 'arif', 'sohel', 'tareq', 'tariq', 'faisal', 'mahmud', 'islam', 'uddin', 'akhtar',
            'siddique', 'siddiqui', 'alam', 'mustafa', 'kazi', 'syed', 'sayed', 'sheikh', 'miah',
            'bhuiyan', 'sarker', 'sarkar', 'jahid', 'mehedi', 'salman', 'nasir', 'habib', 'reza',
            'kamal', 'rubel', 'shamim', 'sumon', 'rasel', 'rashed', 'billah', 'monir', 'sayem',
            'anwar', 'iqbal', 'sadik', 'sadiq', 'nayem', 'shahin', 'momin', 'ashik', 'noman',
            'tariqul', 'shabbir', 'ibrahim', 'ismail', 'yusuf', 'yunus', 'osman', 'omar',
            'fatema', 'ayesha', 'khadija', 'nusrat', 'jannat', 'farhana', 'tania', 'sadia', 'sharmin',
            'afroza', 'nargis', 'sabina', 'salma', 'nasrin', 'roksana', 'tahmina', 'tasnim', 'mim'
        ];

        const hinduTokens = [
            'deb', 'roy', 'saha', 'das', 'bishwas', 'biswas', 'banerjee', 'mukherjee', 'adhikary',
            'adhikari', 'sharma', 'bhattacharya', 'bhattacharjee', 'chakraborty', 'chakrabarty', 'sen',
            'paul', 'pal', 'ghosh', 'joy', 'proloy', 'subrata', 'bikash', 'sujit', 'uttam', 'pranab',
            'tapas', 'animesh', 'sourav', 'goutam', 'kartik', 'shib', 'krishna', 'chandan', 'barman',
            'mandal', 'mondal', 'majumder', 'bhowmik', 'shil', 'karmakar', 'sutradhar', 'chandra',
            'kumar', 'narayan', 'chatterjee', 'ganguly', 'dhar', 'nag', 'guha', 'rudra', 'nath',
            'debnath', 'mitra', 'kundu', 'dey', 'sarkar', 'samaddar', 'sanyal', 'ghoshal',
            'priya', 'puja', 'pooja', 'shampa', 'mou', 'trisha', 'mousumi', 'soma', 'anita'
        ];

        let detectedFaith: 'MUSLIM' | 'HINDU' | 'NEUTRAL' = 'NEUTRAL';

        // Check explicit message greeting first
        if (/\b(salam|assalam|সালাম|আসসালামু)\b/i.test(lowerMsg)) {
            detectedFaith = 'MUSLIM';
        } else if (/\b(nomoshkar|namaskar|নমস্কার|প্রণাম)\b/i.test(lowerMsg)) {
            detectedFaith = 'HINDU';
        } else {
            const isMuslim = nameTokens.some(w => muslimTokens.includes(w));
            const isHindu = nameTokens.some(w => hinduTokens.includes(w));

            if (isMuslim && !isHindu) {
                detectedFaith = 'MUSLIM';
            } else if (isHindu && !isMuslim) {
                detectedFaith = 'HINDU';
            }
        }

        // 4. Time-of-day greeting (Bangladesh Time UTC+6)
        const now = new Date();
        const utcHours = now.getUTCHours();
        const bdHours = (utcHours + 6) % 24;

        let timeGreetingBangla = 'শুভ অপরাহ্ন';
        let timeGreetingEnglish = 'Good afternoon';

        if (bdHours >= 5 && bdHours < 12) {
            timeGreetingBangla = 'শুভ সকাল';
            timeGreetingEnglish = 'Good morning';
        } else if (bdHours >= 12 && bdHours < 17) {
            timeGreetingBangla = 'শুভ দুপুর';
            timeGreetingEnglish = 'Good afternoon';
        } else if (bdHours >= 17 && bdHours < 22) {
            timeGreetingBangla = 'শুভ সন্ধ্যা';
            timeGreetingEnglish = 'Good evening';
        } else {
            timeGreetingBangla = 'শুভ রাত্রি';
            timeGreetingEnglish = 'Good evening';
        }

        // 5. Cultural Greeting Word
        let culturalBangla = 'আসসালামু আলাইকুম';
        let culturalEnglish = 'Greetings';

        if (detectedFaith === 'MUSLIM') {
            culturalBangla = 'আসসালামু আলাইকুম';
            culturalEnglish = 'Assalamu Alaikum';
        } else if (detectedFaith === 'HINDU') {
            culturalBangla = 'নমস্কার';
            culturalEnglish = 'Namaskar';
        }

        // 6. Construct greeting:
        // - Turn 1 (Initial Welcome): Full formal salutation & time greeting
        // - Turn 2+ (Ongoing Chat): Natural, conversational acknowledge (NO repeating robotic welcome slogans!)
        const firstGuestWord = (cleanName || rawGuestName || '').split(/[\s,._-]+/)[0] || '';
        const displayGuest = firstGuestWord && !firstGuestWord.toLowerCase().includes('guest') && !firstGuestWord.toLowerCase().includes('user')
            ? firstGuestWord
            : '';

        let fullGreeting: string;
        if (targetLang === 'BANGLA') {
            if (isFirstTurn) {
                // Adaptive Greeting based on PMS Stay & Conversation Memory
                if (guestMemory?.relationshipTier === 'IN_HOUSE') {
                    fullGreeting = `${culturalBangla} ${displayGuest ? displayGuest + ' ' : ''}${honorificBangla}, ${timeGreetingBangla}! গ্র্যান্ড প্যালেসে আপনার অবস্থান আরামদায়ক হচ্ছে আশা করি। আপনার রুম ${guestMemory.currentRoom || 'Suite'}-এর জন্য কি কোনো হাউসকিংপিং বা সার্ভিস প্রয়োজন?`;
                } else if (guestMemory?.relationshipTier === 'UPCOMING_BOOKING') {
                    const arrival = guestMemory.activeReservation?.arrivalDate || 'শীঘ্রই';
                    const resNo = guestMemory.activeReservation?.resNo ? ` (${guestMemory.activeReservation.resNo})` : '';
                    fullGreeting = `${culturalBangla} ${displayGuest ? displayGuest + ' ' : ''}${honorificBangla}! আগামী ${arrival} তারিখে গ্র্যান্ড প্যালেসে আপনার বুকিংয়ের${resNo} জন্য আমরা অপেক্ষায় আছি। আপনার চেক-ইন সময় বা ট্রান্সপোর্ট নিয়ে কোনো তথ্য জানাতে পারি কি?`;
                } else if (guestMemory?.relationshipTier === 'REPEAT_VIP') {
                    fullGreeting = `${culturalBangla} ${displayGuest ? displayGuest + ' ' : ''}${honorificBangla}, গ্র্যান্ড প্যালেসে আপনাকে পুনরায় স্বাগত! আপনি এর আগেও আমাদের সম্মানিত অতিথি ছিলেন—এবারও কি কোনো ট্রিপ বা স্টে-এর পরিকল্পনা করছেন?`;
                } else if (guestMemory?.relationshipTier === 'PREVIOUS_INQUIRER') {
                    fullGreeting = `স্বাগতম ${displayGuest ? displayGuest + ' ' : ''}${honorificBangla}! আবার আমাদের সাথে যোগাযোগ করার জন্য আন্তরিক ধন্যবাদ। পূর্বের বিষয়ে বা নতুন বুকিং নিয়ে কীভাবে সহায়তা করতে পারি?`;
                } else {
                    if (detectedFaith === 'MUSLIM') {
                        fullGreeting = displayGuest 
                            ? `আসসালামু আলাইকুম ${displayGuest} ${honorificBangla}, ${timeGreetingBangla}!`
                            : `আসসালামু আলাইকুম ${honorificBangla}, ${timeGreetingBangla}!`;
                    } else if (detectedFaith === 'HINDU') {
                        fullGreeting = displayGuest
                            ? `নমস্কার ${displayGuest} ${honorificBangla}, ${timeGreetingBangla}!`
                            : `নমস্কার ${honorificBangla}, ${timeGreetingBangla}!`;
                    } else {
                        fullGreeting = displayGuest
                            ? `${timeGreetingBangla} ${displayGuest} ${honorificBangla}!`
                            : `${timeGreetingBangla} ${honorificBangla}!`;
                    }
                }
            } else {
                // Subsequent ongoing messages: polite conversational prefix
                fullGreeting = displayGuest
                    ? `জি ${displayGuest} ${honorificBangla},`
                    : `জি ${honorificBangla},`;
            }
        } else {
            if (isFirstTurn) {
                // Adaptive Greeting based on PMS Stay & Conversation Memory (English)
                if (guestMemory?.relationshipTier === 'IN_HOUSE') {
                    fullGreeting = `${culturalEnglish} ${honorificEnglish} ${displayGuest || 'Guest'}, ${timeGreetingEnglish}! We hope you are having a pleasant stay in Room ${guestMemory.currentRoom || 'Suite'}. How may our team assist your room today?`;
                } else if (guestMemory?.relationshipTier === 'UPCOMING_BOOKING') {
                    const arrival = guestMemory.activeReservation?.arrivalDate || 'soon';
                    const resNo = guestMemory.activeReservation?.resNo ? ` (${guestMemory.activeReservation.resNo})` : '';
                    fullGreeting = `${culturalEnglish} ${honorificEnglish} ${displayGuest || 'Guest'}! We look forward to welcoming you on ${arrival} for your upcoming stay${resNo}. How may we assist with your arrival preparations?`;
                } else if (guestMemory?.relationshipTier === 'REPEAT_VIP') {
                    fullGreeting = `${culturalEnglish} ${honorificEnglish} ${displayGuest || 'Guest'}, welcome back to Grand Palace! It is always our distinct pleasure to assist our valued repeat guests. Are you planning your next stay with us?`;
                } else if (guestMemory?.relationshipTier === 'PREVIOUS_INQUIRER') {
                    fullGreeting = `Welcome back ${honorificEnglish} ${displayGuest || 'Guest'}! Thank you for getting in touch with us again. How may we assist your booking plans today?`;
                } else {
                    if (detectedFaith === 'MUSLIM') {
                        fullGreeting = displayGuest
                            ? `Assalamu Alaikum ${honorificEnglish} ${displayGuest}, ${timeGreetingEnglish}!`
                            : `Assalamu Alaikum, ${timeGreetingEnglish}!`;
                    } else if (detectedFaith === 'HINDU') {
                        fullGreeting = displayGuest
                            ? `Namaskar ${honorificEnglish} ${displayGuest}, ${timeGreetingEnglish}!`
                            : `Namaskar, ${timeGreetingEnglish}!`;
                    } else {
                        fullGreeting = displayGuest
                            ? `${timeGreetingEnglish} ${honorificEnglish} ${displayGuest}!`
                            : `${timeGreetingEnglish} Sir / Madam!`;
                    }
                }
            } else {
                // Subsequent ongoing messages
                fullGreeting = displayGuest
                    ? `Certainly ${honorificEnglish} ${displayGuest},`
                    : `Certainly,`;
            }
        }

        return {
            fullGreeting,
            culturalGreeting: targetLang === 'BANGLA' ? culturalBangla : culturalEnglish,
            timeGreeting: targetLang === 'BANGLA' ? timeGreetingBangla : timeGreetingEnglish,
            cleanGuestName: displayGuest,
            honorific: targetLang === 'BANGLA' ? honorificBangla : honorificEnglish,
            detectedFaith,
            isFirstTurn
        };
    }

    /**
     * Dynamically fetches property details and settings to prevent any hardcoded hotel names or policies
     */
    private static async getPropertyInfo(propertyId: number): Promise<{
        name: string;
        address?: string;
        phone?: string;
        checkInTime: string;
        checkOutTime: string;
        vatPercentage: number;
        serviceChargePercentage: number;
        childStayPolicy: string;
        cancellationRule: string;
        cancellationText: string;
        confirmationMinPercentage: number;
        corporatePhone: string;
        settings: any;
    }> {
        const pool = getPool();
        try {
            const res = await pool.query(`SELECT name, address, phone, settings FROM properties WHERE id = $1 LIMIT 1;`, [propertyId]);
            if (res.rows.length > 0) {
                let s: any = {};
                if (res.rows[0].settings) {
                    if (typeof res.rows[0].settings === 'string') {
                        try { s = JSON.parse(res.rows[0].settings); } catch {}
                    } else {
                        s = res.rows[0].settings;
                    }
                }
                return {
                    name: res.rows[0].name || 'Grand Palace Hotel & Resort',
                    address: res.rows[0].address || s.corporateAddress || 'Gulshan-2, Dhaka, Bangladesh',
                    phone: res.rows[0].phone || s.corporatePhone || '+880 2 9882200',
                    checkInTime: s.checkInTime || '14:00',
                    checkOutTime: s.checkOutTime || '12:00',
                    vatPercentage: Number(s.vatPercentage) || 15,
                    serviceChargePercentage: Number(s.serviceChargePercentage) || 10,
                    childStayPolicy: s.childStayPolicy || 'Up to 2 children under 5 years stay free using existing bedding',
                    cancellationRule: s.cancellationRule || 'Flexible (48 Hours Prior)',
                    cancellationText: s.cancellationText || 'Free cancellation up to 48 hours prior to standard check-in time.',
                    confirmationMinPercentage: Number(s.confirmationMinPercentage) || 20,
                    corporatePhone: s.corporatePhone || res.rows[0].phone || '+880 2 9876540',
                    settings: s
                };
            }
        } catch {
            // fallback if table query fails
        }
        return {
            name: 'Grand Palace Hotel & Resort',
            address: 'Gulshan-2, Dhaka, Bangladesh',
            phone: '+880 2 9882200',
            checkInTime: '14:00',
            checkOutTime: '12:00',
            vatPercentage: 15,
            serviceChargePercentage: 10,
            childStayPolicy: 'Up to 2 children under 5 years stay free using existing bedding',
            cancellationRule: 'Flexible (48 Hours Prior)',
            cancellationText: 'Free cancellation up to 48 hours prior to standard check-in time.',
            confirmationMinPercentage: 20,
            corporatePhone: '+880 2 9876540',
            settings: {}
        };
    }

    /**
     * Omnichannel Guest Memory & Historical Stay Intelligence Aggregator
     * Matches guest by phone, name, or external_user_id across:
     * 1. guests table (salutation, VIP tier, preferences, notes)
     * 2. reservations & reservation_rooms (in-house active room, upcoming holds, completed stays, lifetime spend)
     * 3. cx_conversations (cross-channel prior chat topics)
     */
    public static async getGuestMemoryProfile(
        propertyId: number,
        phoneOrUser: string,
        guestName?: string,
        currentConversationId?: string | number
    ): Promise<GuestMemoryProfile> {
        const pool = getPool();
        const cleanPhone = (phoneOrUser || '').replace(/[^0-9]/g, '');
        const last10 = cleanPhone.length >= 8 ? cleanPhone.slice(-10) : '';

        let guestId: number | undefined;
        let guestFullName = (guestName || '').replace(/^(guest|user|test)[\s_-]*/i, '').trim() || 'Guest';
        let vipStatus = 'Regular';
        let preferences = '';
        let pastNotes = '';
        let stayCount = 0;
        let lifetimeSpend = 0;
        let currentRoom: string | undefined;
        let activeReservation: any = undefined;
        let lastStay: any = undefined;
        let favoriteRoomType = 'Deluxe Suite';

        // 1. Match in guests table
        try {
            let gRes: any = { rows: [] };
            if (last10) {
                gRes = await pool.query(`
                    SELECT id, salutation, first_name, last_name, phone, email, vip_status, notes
                    FROM guests
                    WHERE (phone LIKE $1 OR RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9]', '', 'g'), 10) = $2)
                    LIMIT 1;
                `, [`%${last10}%`, last10]);
            }
            if ((!gRes.rows || gRes.rows.length === 0) && guestName && guestName.trim().length >= 4 && !guestName.toLowerCase().startsWith('guest')) {
                const parts = guestName.trim().split(/\s+/);
                gRes = await pool.query(`
                    SELECT id, salutation, first_name, last_name, phone, email, vip_status, notes
                    FROM guests
                    WHERE LOWER(first_name) = LOWER($1) OR LOWER(first_name || ' ' || last_name) = LOWER($2)
                    LIMIT 1;
                `, [parts[0], guestName.trim()]);
            }

            if (gRes.rows && gRes.rows.length > 0) {
                const g = gRes.rows[0];
                guestId = Number(g.id);
                guestFullName = `${g.salutation ? g.salutation + ' ' : ''}${g.first_name} ${g.last_name || ''}`.trim() || guestFullName;
                vipStatus = g.vip_status || 'Regular';
                preferences = g.notes || '';
                pastNotes = g.notes || '';
            }
        } catch (err) {
            console.warn('[AiGuestAssistant] Error matching guest:', err);
        }

        // 2. Query reservations & stay history
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            let resList: any[] = [];

            let convResId: number | null = null;
            let convGuestId: number | null = null;
            if (currentConversationId) {
                const cRes = await pool.query(`SELECT reservation_id, guest_id FROM cx_conversations WHERE id = $1;`, [currentConversationId]).catch(() => ({ rows: [] }));
                if (cRes.rows && cRes.rows.length > 0) {
                    convResId = cRes.rows[0].reservation_id ? Number(cRes.rows[0].reservation_id) : null;
                    convGuestId = cRes.rows[0].guest_id ? Number(cRes.rows[0].guest_id) : null;
                }
            }

            if (guestId || convGuestId || convResId || last10) {
                const resQ = await pool.query(`
                    SELECT 
                        r.id,
                        r.reservation_number,
                        r.status,
                        r.total_amount,
                        r.paid_amount,
                        r.due_amount,
                        r.special_requests,
                        r.created_at,
                        MIN(rr.check_in_date) as check_in_date,
                        MAX(rr.check_out_date) as check_out_date,
                        STRING_AGG(DISTINCT COALESCE(rm.room_number, 'Unassigned'), ', ') as room_numbers,
                        STRING_AGG(DISTINCT COALESCE(rt.name, 'Deluxe Suite'), ', ') as room_types
                    FROM reservations r
                    LEFT JOIN reservation_rooms rr ON rr.reservation_id = r.id
                    LEFT JOIN rooms rm ON rm.id = rr.room_id
                    LEFT JOIN room_types rt ON rt.id = COALESCE(rr.room_type_id, rm.room_type_id)
                    WHERE r.property_id = $1 
                      AND (
                          ($2::BIGINT IS NOT NULL AND r.booker_guest_id = $2)
                          OR ($3::BIGINT IS NOT NULL AND r.booker_guest_id = $3)
                          OR ($4::BIGINT IS NOT NULL AND r.id = $4)
                          OR ($5 != '' AND r.booker_guest_id IN (
                              SELECT gst.id FROM guests gst 
                              WHERE RIGHT(REGEXP_REPLACE(COALESCE(gst.phone, ''), '[^0-9]', '', 'g'), 10) = $5
                          ))
                      )
                    GROUP BY r.id, r.reservation_number, r.status, r.total_amount, r.paid_amount, r.due_amount, r.special_requests, r.created_at
                    ORDER BY r.id DESC
                    LIMIT 8;
                `, [propertyId, guestId || null, convGuestId || null, convResId || null, last10]);

                resList = resQ.rows || [];
            }

            // Room type frequency count for favorite room
            const roomTypeCounts: Record<string, number> = {};
            for (const r of resList) {
                if (r.room_types) {
                    for (const rt of r.room_types.split(',')) {
                        const trimmed = rt.trim();
                        if (trimmed && trimmed !== 'Unassigned') {
                            roomTypeCounts[trimmed] = (roomTypeCounts[trimmed] || 0) + 1;
                        }
                    }
                }
            }
            const sortedRt = Object.entries(roomTypeCounts).sort((a, b) => b[1] - a[1]);
            if (sortedRt.length > 0) favoriteRoomType = sortedRt[0][0];

            // Detect In-House or Upcoming
            for (const r of resList) {
                const st = (r.status || '').toUpperCase();
                const inDate = r.check_in_date ? String(r.check_in_date).slice(0, 10) : '';
                const outDate = r.check_out_date ? String(r.check_out_date).slice(0, 10) : '';

                if (st === 'CHECKED_IN' || st === 'IN_HOUSE' || (st === 'CONFIRMED' && inDate <= todayStr && outDate >= todayStr && r.room_numbers !== 'Unassigned')) {
                    if (!currentRoom) {
                        currentRoom = r.room_numbers;
                        activeReservation = {
                            id: Number(r.id),
                            resNo: r.reservation_number,
                            status: 'IN_HOUSE',
                            roomType: r.room_types || 'Deluxe Suite',
                            roomNumber: r.room_numbers,
                            arrivalDate: inDate,
                            departureDate: outDate,
                            balanceDue: Number(r.due_amount) || 0
                        };
                    }
                } else if ((st === 'HOLD' || st === 'CONFIRMED' || st === 'GUARANTEED' || st === 'RESERVED') && (outDate >= todayStr || !outDate)) {
                    if (!activeReservation) {
                        activeReservation = {
                            id: Number(r.id),
                            resNo: r.reservation_number,
                            status: st,
                            roomType: r.room_types || 'Deluxe Suite',
                            roomNumber: r.room_numbers !== 'Unassigned' ? r.room_numbers : undefined,
                            arrivalDate: inDate,
                            departureDate: outDate,
                            balanceDue: Number(r.due_amount) || 0
                        };
                    }
                }
            }

            // Completed Stays
            const completed = resList.filter(r => {
                const st = (r.status || '').toUpperCase();
                const outDate = r.check_out_date ? String(r.check_out_date).slice(0, 10) : '';
                return st === 'CHECKED_OUT' || st === 'COMPLETED' || ((st === 'CONFIRMED' || st === 'RESERVED') && outDate < todayStr);
            });

            stayCount = completed.length;
            lifetimeSpend = resList.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0);

            if (completed.length > 0) {
                const latest = completed[0];
                lastStay = {
                    resNo: latest.reservation_number,
                    dates: `${latest.check_in_date ? String(latest.check_in_date).slice(0, 10) : ''} - ${latest.check_out_date ? String(latest.check_out_date).slice(0, 10) : ''}`,
                    roomType: latest.room_types || 'Deluxe Suite',
                    roomNumber: latest.room_numbers || 'Room'
                };
            }
        } catch (err) {
            console.warn('[AiGuestAssistant] Error querying reservations:', err);
        }

        // 3. Past conversations
        let previousChatSummary = '';
        let previousChatsCount = 0;
        try {
            const convRes = await pool.query(`
                SELECT id, channel, last_message_text, last_message_at, sentiment
                FROM cx_conversations
                WHERE property_id = $1
                  AND (
                      external_user_id = $2
                      OR ($3::BIGINT IS NOT NULL AND guest_id = $3)
                      OR ($4 != '' AND external_user_id LIKE $5)
                  )
                  AND ($6::BIGINT IS NULL OR id != $6)
                ORDER BY last_message_at DESC
                LIMIT 3;
            `, [propertyId, phoneOrUser, guestId || null, last10, `%${last10}%`, currentConversationId || null]);

            if (convRes.rows && convRes.rows.length > 0) {
                previousChatsCount = convRes.rows.length;
                previousChatSummary = convRes.rows.map((c: any) => `[${c.channel} on ${new Date(c.last_message_at).toLocaleDateString()}]: ${c.last_message_text}`).join(' | ');
            }
        } catch (err) {
            console.warn('[AiGuestAssistant] Error querying past conversations:', err);
        }

        // 4. Classify Relationship Tier
        let relationshipTier: GuestMemoryProfile['relationshipTier'] = 'FIRST_TIME';
        let summaryBadge = '🌟 New Guest';

        if (currentRoom) {
            relationshipTier = 'IN_HOUSE';
            summaryBadge = `🛎️ In-House: Room ${currentRoom}`;
        } else if (activeReservation) {
            relationshipTier = 'UPCOMING_BOOKING';
            summaryBadge = `📅 Hold: ${activeReservation.resNo}`;
        } else if (stayCount > 0) {
            relationshipTier = 'REPEAT_VIP';
            summaryBadge = `👑 VIP Repeat • ${stayCount} Stay${stayCount > 1 ? 's' : ''}`;
        } else if (previousChatsCount > 0) {
            relationshipTier = 'PREVIOUS_INQUIRER';
            summaryBadge = `💬 Returning Inquirer (${previousChatsCount} Chats)`;
        }

        // 5. Construct 1-paragraph summary for Copilot
        let copilotSummary = '';
        if (relationshipTier === 'IN_HOUSE') {
            copilotSummary = `${guestFullName} is currently an in-house resident in Room ${currentRoom} (Check-out: ${activeReservation?.departureDate || 'today'}). Total past stays: ${stayCount}. Preferences: ${preferences || 'Standard'}.`;
        } else if (relationshipTier === 'UPCOMING_BOOKING') {
            copilotSummary = `${guestFullName} has an upcoming reservation (${activeReservation?.resNo} - ${activeReservation?.roomType}) arriving ${activeReservation?.arrivalDate} (${activeReservation?.status}). Balance due: ৳${(activeReservation?.balanceDue || 0).toLocaleString()}.`;
        } else if (relationshipTier === 'REPEAT_VIP') {
            copilotSummary = `${guestFullName} is a valued repeat guest with ${stayCount} completed stays. Lifetime spend: ৳${lifetimeSpend.toLocaleString()}. Favorite category: ${favoriteRoomType}. Last stayed in ${lastStay?.roomNumber || 'Deluxe'} (${lastStay?.dates || ''}).`;
        } else if (relationshipTier === 'PREVIOUS_INQUIRER') {
            copilotSummary = `${guestFullName} previously inquired with our team (${previousChatsCount} past conversations). No confirmed room reservations on record yet.`;
        } else {
            copilotSummary = `${guestFullName} is contacting Grand Palace Hotel for the first time. No prior stays or conversation logs found.`;
        }

        return {
            relationshipTier,
            summaryBadge,
            isReturningGuest: relationshipTier !== 'FIRST_TIME',
            guestId,
            guestFullName,
            stayCount,
            lifetimeSpend,
            currentRoom,
            activeReservation,
            lastStay,
            favoriteRoomType,
            preferences,
            pastNotes,
            previousChatSummary,
            copilotOneParagraphSummary: copilotSummary
        };
    }

    /**
     * Answers Front Desk staff questions about a guest's history using Google Gemini LLM
     */
    public static async askCopilotQuestion(
        propertyId: number,
        memory: GuestMemoryProfile,
        question: string
    ): Promise<string> {
        const geminiKey = process.env.GEMINI_API_KEY;
        const fallback = `${memory.copilotOneParagraphSummary} (Question: "${question}")`;

        if (!geminiKey) {
            return fallback;
        }

        const prompt = `You are the Front Desk AI Copilot for Grand Palace Hotel & Resort.
A front desk staff member is asking a question about this guest: "${question}".

GUEST PMS PROFILE & STAY HISTORY:
- Full Name: ${memory.guestFullName}
- Status: ${memory.relationshipTier} (${memory.summaryBadge})
- Total Completed Stays: ${memory.stayCount}
- Lifetime Revenue: ৳${memory.lifetimeSpend.toLocaleString()}
- Active In-House Room: ${memory.currentRoom || 'None'}
- Upcoming Booking: ${memory.activeReservation ? `${memory.activeReservation.resNo} (${memory.activeReservation.arrivalDate} to ${memory.activeReservation.departureDate})` : 'None'}
- Favorite / Most Booked Room Type: ${memory.favoriteRoomType}
- Guest Preferences / Notes: ${memory.preferences || 'No special preferences noted'}
- Last Stay: ${memory.lastStay ? `${memory.lastStay.roomType} (${memory.lastStay.dates}) in ${memory.lastStay.roomNumber}` : 'No prior stays'}
- Recent Chat Inquiries: ${memory.previousChatSummary || 'None'}

INSTRUCTIONS:
Answer the staff member's question directly, accurately, and concisely in 1 to 2 sentences based ONLY on the provided guest data. If the information is not in the data, state that clearly.`;

        const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
        for (const model of candidateModels) {
            try {
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2, maxOutputTokens: 200 }
                    })
                });
                if (res.ok) {
                    const data: any = await res.json();
                    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (text && text.trim()) return text.trim();
                }
            } catch (err) {
                // Try next model
            }
        }
        return fallback;
    }

    /**
     * Analyzes guest message with full conversation history context,
     * accurate PostgreSQL room catalog, automated booking hold creation,
     * and high-resolution visual room media delivery.
     */
    static async analyzeAndDraftReply(
        propertyId: number,
        guestMessage: string,
        guestName: string,
        phoneOrUser: string,
        conversationId?: string | number
    ): Promise<AiInquiryAnalysis> {
        const pool = getPool();
        const lower = guestMessage.toLowerCase().trim();
        const property = await this.getPropertyInfo(propertyId);
        const hotelName = property.name;

        // 1. Fetch recent conversation history to maintain context & avoid amnesia
        let recentHistory: Array<{ role: 'guest' | 'assistant'; text: string }> = [];
        let isFirstTurn = true;
        let previousLanguage: 'BANGLA' | 'ENGLISH' | null = null;
        let lastDiscussedRoomType: string | null = null;

        if (conversationId) {
            try {
                const histRes = await pool.query(`
                    SELECT sender_type, message_text 
                    FROM cx_messages 
                    WHERE conversation_id = $1 AND message_text IS NOT NULL AND TRIM(message_text) != ''
                    ORDER BY created_at DESC 
                    LIMIT 8;
                `, [conversationId]);

                if (histRes.rows.length > 0) {
                    isFirstTurn = histRes.rows.length <= 1;
                    const chronological = histRes.rows.reverse();
                    for (const row of chronological) {
                        recentHistory.push({
                            role: row.sender_type === 'GUEST' ? 'guest' : 'assistant',
                            text: row.message_text
                        });
                        if (row.sender_type === 'GUEST') {
                            if (/[\u0980-\u09FF]/.test(row.message_text) || this.detectLanguage(row.message_text) === 'BANGLA') {
                                previousLanguage = 'BANGLA';
                            }
                        }
                        const lh = row.message_text.toLowerCase();
                        if (lh.includes('deluxe') || lh.includes('ডিলাক্স')) lastDiscussedRoomType = 'Deluxe Suite';
                        else if (lh.includes('superior') || lh.includes('সুপিরিয়র')) lastDiscussedRoomType = 'Superior King Room';
                        else if (lh.includes('executive') || lh.includes('এক্সিকিউটিভ')) lastDiscussedRoomType = 'Executive Suite';
                        else if (lh.includes('penthouse') || lh.includes('presidential') || lh.includes('পেন্টহাউস')) lastDiscussedRoomType = 'Presidential Penthouse Suite';
                    }
                }
            } catch (err) {
                console.warn('[AiGuestAssistant] Failed to query conversation history:', err);
            }
        }

        // 2. Language Continuity: If conversation was already in Bangla, never flip-flop to English!
        let targetLang = this.detectLanguage(guestMessage);
        if (previousLanguage === 'BANGLA') {
            targetLang = 'BANGLA';
        }

        // 3. Omnichannel PMS Guest History & Memory Profile Lookup
        const guestMemory = await this.getGuestMemoryProfile(propertyId, phoneOrUser, guestName, conversationId);

        // 4. Personalized greeting respecting turn context and PMS memory
        const greeting = this.getPersonalizedGreeting(guestName, targetLang, guestMessage, isFirstTurn, guestMemory);
        const guestSalutation = greeting.cleanGuestName
            ? `${greeting.cleanGuestName} ${greeting.honorific}`
            : greeting.honorific;

        // 5. Sentiment Analysis & Complaints Escalation
        let sentiment: 'POSITIVE' | 'NEUTRAL' | 'FRUSTRATED' | 'ANGRY' = 'NEUTRAL';
        let shouldEscalate = false;

        const angryKeywords = [
            'terrible', 'worst', 'horrible', 'cheat', 'scam', 'police', 'sue', 'disgusting', 'rude', 'unacceptable', 'bad service',
            'faltu', 'kharap', 'baje', 'thokano', 'fraud', 'খারাপ', 'ফালতু', 'প্রতারণা', 'মামলা'
        ];
        const frustratedKeywords = [
            'waiting', 'delay', 'dirty', 'cold water', 'ac not working', 'noise', 'slow', 'broken', 'disappointed',
            'deri', 'not working', 'thanda', 'ময়লা', 'দেরি', 'শব্দ', 'নষ্ট'
        ];
        const positiveKeywords = [
            'thank', 'great', 'awesome', 'wonderful', 'excellent', 'love', 'perfect',
            'dhonnobad', 'onek valo', 'khub shundor', 'ধন্যবাদ', 'অসাধারণ', 'সুন্দর'
        ];

        if (angryKeywords.some(w => lower.includes(w))) {
            sentiment = 'ANGRY';
            shouldEscalate = true;
        } else if (frustratedKeywords.some(w => lower.includes(w))) {
            sentiment = 'FRUSTRATED';
            shouldEscalate = true;
        } else if (positiveKeywords.some(w => lower.includes(w))) {
            sentiment = 'POSITIVE';
        }

        if (shouldEscalate) {
            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.culturalGreeting} ${guestSalutation}, আপনার অসুবিধার জন্য আমরা আন্তরিকভাবে দুঃখিত। আপনার বিষয়টি সর্বোচ্চ গুরুত্ব সহকারে আমাদের ডিউটি ম্যানেজারকে জানানো হয়েছে এবং তিনি সরাসরি বিষয়টি সমাধান করছেন।`
                : `${greeting.culturalGreeting} ${guestSalutation}, we sincerely apologize for the inconvenience. Our Duty Manager at ${hotelName} has been alerted immediately and is personally looking into this matter for you.`;

            const publicCommentReply = targetLang === 'BANGLA'
                ? `${greeting.culturalGreeting} ${guestSalutation}, আপনার সাময়িক অসুবিধার জন্য আন্তরিকভাবে দুঃখিত। আমাদের ম্যানেজার দ্রুত বিষয়টি খতিয়ে দেখছেন এবং ইনবক্সে আপনার সাথে যোগাযোগ করছেন।`
                : `${greeting.culturalGreeting} ${guestSalutation}, we sincerely apologize for the inconvenience. Our manager is looking into this immediately and has contacted you via DM.`;

            return {
                intent: 'COMPLAINT',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: true,
                proposedReply,
                publicCommentReply
            };
        }

        // 5. Query active room categories & real base rates from PostgreSQL (including photos, videos & amenities)
        let roomTypes: Array<{
            id?: number | string;
            name: string;
            code: string;
            base_rate: number | string;
            max_occupancy: number;
            bed_type?: string;
            view_type?: string;
            description?: string;
            photos: string[];
            videos: string[];
        }> = [];

        const parseMediaArray = (raw: any): string[] => {
            if (!raw) return [];
            if (Array.isArray(raw)) return raw.filter(Boolean);
            if (typeof raw === 'string') {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) return parsed.filter(Boolean);
                } catch {
                    if (raw.startsWith('http') || raw.startsWith('data:')) return [raw];
                }
            }
            return [];
        };

        try {
            const roomTypesRes = await pool.query(`
                SELECT id, name, code, base_rate, base_occupancy, max_adults, bed_type, view_type, description, photos, videos 
                FROM room_types 
                WHERE property_id = $1 AND (status = 'Active' OR status = 'ACTIVE' OR status IS NULL)
                ORDER BY base_rate ASC;
            `, [propertyId]);
            if (roomTypesRes.rows.length > 0) {
                roomTypes = roomTypesRes.rows.map(r => ({
                    id: r.id,
                    name: r.name,
                    code: r.code || '',
                    base_rate: r.base_rate,
                    max_occupancy: r.max_adults || r.base_occupancy || 2,
                    bed_type: r.bed_type || 'King',
                    view_type: r.view_type || 'City View',
                    description: r.description || '',
                    photos: parseMediaArray(r.photos),
                    videos: parseMediaArray(r.videos)
                }));
            }
        } catch (err) {
            console.warn('[AiGuestAssistant] Room types query error:', err);
        }

        if (roomTypes.length === 0) {
            try {
                const fallbackRes = await pool.query(`
                    SELECT id, name, code, base_rate, base_occupancy, max_adults, bed_type, view_type, description, photos, videos 
                    FROM room_types 
                    WHERE (status = 'Active' OR status = 'ACTIVE' OR status IS NULL)
                    ORDER BY base_rate ASC;
                `);
                roomTypes = fallbackRes.rows.map(r => ({
                    id: r.id,
                    name: r.name,
                    code: r.code || '',
                    base_rate: r.base_rate,
                    max_occupancy: r.max_adults || r.base_occupancy || 2,
                    bed_type: r.bed_type || 'King',
                    view_type: r.view_type || 'City View',
                    description: r.description || '',
                    photos: parseMediaArray(r.photos),
                    videos: parseMediaArray(r.videos)
                }));
            } catch (err) {
                console.error('[AiGuestAssistant] Failed to query fallback room types:', err);
            }
        }

        const roomListBangla = roomTypes.length > 0
            ? roomTypes.map(r => `• *${r.name}*: ৳${Number(r.base_rate).toLocaleString('en-IN')}/রাত (${r.bed_type ? r.bed_type + ' Bed, ' : ''}সর্বোচ্চ ${r.max_occupancy} জন অতিথি)`).join('\n')
            : '• *Deluxe Suite*: ৳25,000/রাত\n• *Superior King Room*: ৳32,000/রাত\n• *Executive Suite*: ৳45,000/রাত\n• *Presidential Penthouse Suite*: ৳85,000/রাত';

        const roomListEnglish = roomTypes.length > 0
            ? roomTypes.map(r => `• *${r.name}*: ৳${Number(r.base_rate).toLocaleString('en-US')}/night (${r.bed_type ? r.bed_type + ' Bed, ' : ''}Max ${r.max_occupancy} Guests)`).join('\n')
            : '• *Deluxe Suite*: ৳25,000/night\n• *Superior King Room*: ৳32,000/night\n• *Executive Suite*: ৳45,000/night\n• *Presidential Penthouse Suite*: ৳85,000/night';

        // Helper to match room type dynamically
        const resolveMatchedRoom = () => {
            let matchedRoom = roomTypes[0];
            if (lower.includes('superior') || lower.includes('সুপিরিয়র')) {
                matchedRoom = roomTypes.find(r => r.name.toLowerCase().includes('superior') || r.code.toLowerCase().includes('supk')) || matchedRoom;
            } else if (lower.includes('executive') || lower.includes('এক্সিকিউটিভ')) {
                matchedRoom = roomTypes.find(r => r.name.toLowerCase().includes('executive') || r.code.toLowerCase().includes('exec')) || matchedRoom;
            } else if (lower.includes('penthouse') || lower.includes('presidential') || lower.includes('পেন্টহাউস')) {
                matchedRoom = roomTypes.find(r => r.name.toLowerCase().includes('penthouse') || r.name.toLowerCase().includes('presidential') || r.code.toLowerCase().includes('pres')) || matchedRoom;
            } else if (lower.includes('deluxe') || lower.includes('ডিলাক্স')) {
                matchedRoom = roomTypes.find(r => r.name.toLowerCase().includes('deluxe') || r.code.toLowerCase().includes('delu')) || matchedRoom;
            } else if (lastDiscussedRoomType) {
                matchedRoom = roomTypes.find(r => r.name.toLowerCase() === lastDiscussedRoomType.toLowerCase() || r.name.toLowerCase().includes(lastDiscussedRoomType.toLowerCase())) || matchedRoom;
            }
            return matchedRoom;
        };

        // 6A. VIDEO REQUEST INTENT ("room er video ache?", "video dekhte chai", "video pathan", "room tour video daw", "360 tour")
        const isVideoIntent = (
            lower.includes('video') || lower.includes('ভিডিও') ||
            lower.includes('clip') || lower.includes('room tour') ||
            lower.includes('360 tour') || lower.includes('virtual tour') ||
            lower.includes('tour video')
        );

        if (isVideoIntent) {
            const matchedRoom = resolveMatchedRoom();
            let videoUrl = (matchedRoom?.videos && matchedRoom.videos.length > 0) ? matchedRoom.videos[0] : '';
            if (!videoUrl) {
                // Fallback luxury room tour video
                videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
            }

            const roomTitle = matchedRoom ? matchedRoom.name : 'Deluxe Suite';
            const roomRate = matchedRoom ? Number(matchedRoom.base_rate).toLocaleString('en-IN') : '25,000';
            const roomDescription = matchedRoom?.description
                ? matchedRoom.description
                : (targetLang === 'BANGLA'
                    ? `রুমটিতে রয়েছে এক্সিকিউটিভ ${matchedRoom?.bed_type || 'King'} বেড, ${matchedRoom?.view_type || 'প্যানোরামিক ভিউ'}, প্রাইভেট ব্যালকনি ও মার্বেল বাথরুম।`
                    : `Features an executive ${matchedRoom?.bed_type || 'King'} bed, ${matchedRoom?.view_type || 'panoramic view'}, private balcony, and marble bath.`);

            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} আপনার কাঙ্ক্ষিত *${roomTitle}*-এর অফিসিয়াল রুম ট্যুর ভিডিও নিচে সংযুক্ত করা হলো।\n\n📌 বিবরণ: ${roomDescription}\n💰 রুম রেট: ৳${roomRate}/রাত (${matchedRoom?.bed_type || 'King'} Bed, সর্বোচ্চ ${matchedRoom?.max_occupancy || 2} জন অতিথি)\n\nভিডিওটি দেখে আপনার পছন্দ হলে আমাকে জানাবেন, ${guestSalutation}!`
                : `${greeting.fullGreeting} Here is the virtual room tour video of our *${roomTitle}* directly from our room catalog.\n\n📌 Room Details: ${roomDescription}\n💰 Rate: ৳${roomRate}/night (${matchedRoom?.bed_type || 'King'} Bed, Max ${matchedRoom?.max_occupancy || 2} Guests)\n\nPlease let me know if you would like me to assist with your booking, ${guestSalutation}!`;

            return {
                intent: 'VIDEO_REQUEST',
                sentiment: 'POSITIVE',
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                mediaUrl: videoUrl,
                mediaType: 'VIDEO'
            };
        }

        // 6B. PHOTO REQUEST INTENT ("je room book korchi tar pic daw", "room er pic dekhte chai")
        const isPhotoIntent = (
            lower.includes('pic') || lower.includes('photo') || lower.includes('picture') ||
            lower.includes('chobi') || lower.includes('ছবি') || lower.includes('পিক') ||
            lower.includes('image') || lower.includes('dekhte chai') || lower.includes('dekhao') ||
            lower.includes('দেখান') || lower.includes('দেখাও')
        );

        if (isPhotoIntent) {
            // Match room type dynamically from database roomTypes
            const matchedRoom = resolveMatchedRoom();

            // Extract photo URL dynamically from PostgreSQL room_types.photos
            let photoUrl = (matchedRoom?.photos && matchedRoom.photos.length > 0) ? matchedRoom.photos[0] : '';
            if (!photoUrl) {
                const fallbackKey = matchedRoom ? matchedRoom.name.toLowerCase() : 'deluxe suite';
                const foundFallback = Object.entries(ROOM_PHOTOS_MAP).find(([k]) => fallbackKey.includes(k) || k.includes(fallbackKey));
                photoUrl = foundFallback ? foundFallback[1].url : ROOM_PHOTOS_MAP['deluxe suite'].url;
            }

            const roomTitle = matchedRoom ? matchedRoom.name : 'Deluxe Suite';
            const roomRate = matchedRoom ? Number(matchedRoom.base_rate).toLocaleString('en-IN') : '25,000';
            const roomDescription = matchedRoom?.description
                ? matchedRoom.description
                : (targetLang === 'BANGLA'
                    ? `রুমটিতে রয়েছে এক্সিকিউটিভ ${matchedRoom?.bed_type || 'King'} বেড, ${matchedRoom?.view_type || 'প্যানোরামিক ভিউ'}, প্রাইভেট ব্যালকনি ও মার্বেল বাথরুম।`
                    : `Features an executive ${matchedRoom?.bed_type || 'King'} bed, ${matchedRoom?.view_type || 'panoramic view'}, private balcony, and marble bath.`);

            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} আপনার কাঙ্ক্ষিত *${roomTitle}*-এর আসল ছবি নিচে সংযুক্ত করা হলো।\n\n📌 বিবরণ: ${roomDescription}\n💰 রুম রেট: ৳${roomRate}/রাত (${matchedRoom?.bed_type || 'King'} Bed, সর্বোচ্চ ${matchedRoom?.max_occupancy || 2} জন)\n\nরুমটি কেমন লাগলো জানাবেন, ${guestSalutation}!`
                : `${greeting.fullGreeting} Here is a high-resolution photograph of our *${roomTitle}* directly from our room catalog.\n\n📌 Room Details: ${roomDescription}\n💰 Rate: ৳${roomRate}/night (${matchedRoom?.bed_type || 'King'} Bed, Max ${matchedRoom?.max_occupancy || 2} Guests)\n\nPlease let me know if you would like me to finalize your reservation, ${guestSalutation}!`;

            return {
                intent: 'PHOTO_REQUEST',
                sentiment: 'POSITIVE',
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                mediaUrl: photoUrl,
                mediaType: 'IMAGE'
            };
        }

        // 7. BOOKING INTENT ("ok book koro", "book koro deluxe, imran hos, +36704290038", "booking confirm")
        const isBookingIntent = (
            lower.includes('book koro') || lower.includes('booking confirm') ||
            lower.includes('book korte chai') || lower.includes('confirm booking') ||
            lower.includes('book please') || lower.includes('reserve') ||
            lower.includes('বুক') || lower.includes('বুকিং') || lower.includes('কনফার্ম') ||
            (lower.includes('book') && (lower.includes('ok') || lower.includes('deluxe') || lower.includes('suite') || lower.includes('koro')))
        );

        if (isBookingIntent) {
            // Aggregate entire conversation text to preserve cross-turn memory
            const historyText = recentHistory.map(h => h.text).join(' \n ');
            const fullConversationText = (historyText + ' \n ' + guestMessage).toLowerCase();

            // 1. Phone extraction
            const phoneMatch = guestMessage.match(/(\+?[0-9]{9,16})/);
            const extractedPhone = phoneMatch ? phoneMatch[0] : (phoneOrUser && !phoneOrUser.startsWith('client_') ? phoneOrUser : '');

            // 2. Identify room type
            let matchedRoom = lastDiscussedRoomType || 'Deluxe Suite';
            if (lower.includes('superior') || lower.includes('সুপিরিয়র')) matchedRoom = 'Superior King Room';
            else if (lower.includes('executive') || lower.includes('এক্সিকিউটিভ')) matchedRoom = 'Executive Suite';
            else if (lower.includes('penthouse') || lower.includes('presidential') || lower.includes('পেন্টহাউস')) matchedRoom = 'Presidential Penthouse Suite';
            else if (lower.includes('deluxe') || lower.includes('ডিলাক্স')) matchedRoom = 'Deluxe Suite';

            const roomObj = roomTypes.find(r => r.name.toLowerCase() === matchedRoom.toLowerCase()) || roomTypes[0] || { name: 'Deluxe Suite', base_rate: 25000, id: 1 };

            // 3. Pax extraction (adults & children)
            let adults = 2;
            let children = 0;
            const adultMatch = fullConversationText.match(/(\d+)\s*(?:jon\b|adult|adults|প্রাপ্তবয়স্ক|জন)/i);
            if (adultMatch) adults = Math.max(1, parseInt(adultMatch[1], 10));
            const childMatch = fullConversationText.match(/(\d+)\s*(?:jon child|child|children|বাচ্চা|শিশু)/i);
            if (childMatch) children = parseInt(childMatch[1], 10);

            // 4. Stay duration & Dates extraction
            const today = new Date();
            const toYMD = (d: Date) => d.toISOString().slice(0, 10);

            let checkInDate: string | null = null;
            let checkOutDate: string | null = null;
            let nights: number | null = null;

            // Check for explicit nights (e.g., "1 night", "2 nights", "১ রাত", "২ রাত", "1 nt")
            const nightsMatch = fullConversationText.match(/(\d+)\s*(?:night|nights|nt|রাত|দিনের)/i);
            if (nightsMatch) {
                nights = Math.max(1, parseInt(nightsMatch[1], 10));
            }

            // Check for relative dates in conversation
            if (fullConversationText.includes('kalke') || fullConversationText.includes('কালকে') || fullConversationText.includes('আগামীকাল') || fullConversationText.includes('tomorrow')) {
                const tom = new Date(today);
                tom.setDate(tom.getDate() + 1);
                checkInDate = toYMD(tom);
            } else if (fullConversationText.includes('porso') || fullConversationText.includes('পরশু') || fullConversationText.includes('day after tomorrow')) {
                const dat = new Date(today);
                dat.setDate(dat.getDate() + 2);
                checkInDate = toYMD(dat);
            } else if (fullConversationText.includes('ajke') || fullConversationText.includes('আজকে') || fullConversationText.includes('today')) {
                checkInDate = toYMD(today);
            }

            // Check for explicit date ranges (e.g., "15 to 17 nov", "12 theke 15", "11/11/2026 to 12/11/2026")
            const rangeMatch = fullConversationText.match(/(\d{1,2})\s*(?:theke|to|-)\s*(\d{1,2})\s*(?:tarikh|nov|dec|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|তারিখ)?/i);
            if (rangeMatch) {
                const startDay = parseInt(rangeMatch[1], 10);
                const endDay = parseInt(rangeMatch[2], 10);
                if (startDay > 0 && endDay > startDay) {
                    const yr = today.getFullYear();
                    const mo = today.getMonth() + 1;
                    checkInDate = `${yr}-${String(mo).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
                    checkOutDate = `${yr}-${String(mo).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`;
                    nights = endDay - startDay;
                }
            }

            // If checkInDate and nights are known, compute checkOutDate
            if (checkInDate && nights && !checkOutDate) {
                const d = new Date(checkInDate);
                d.setDate(d.getDate() + nights);
                checkOutDate = toYMD(d);
            }

            // 5. Validation Gate: Check whether required details (Phone + Dates/Nights) are confirmed
            const hasDatesConfirmed = Boolean(checkInDate && (checkOutDate || nights));

            if (!extractedPhone || extractedPhone.length < 9) {
                // Phone is missing -> Politely prompt for phone and dates
                const proposedReply = targetLang === 'BANGLA'
                    ? `${greeting.fullGreeting} অবশ্যই ${guestSalutation}! আপনার কাঙ্ক্ষিত *${matchedRoom}* (${adults} জন প্রাপ্তবয়স্ক${children > 0 ? ` ও ${children} জন শিশু` : ''}) বুকিং হোল্ড ও লক করতে আমাদের নিচের তথ্যগুলো প্রয়োজন:\n\n১. 🗓️ আপনার সম্ভাব্য **চেক-ইন ও চেক-আউট তারিখ** (বা মোট কত রাত থাকবেন)\n২. 📞 আপনার সচল **মোবাইল বা হোয়াটসঅ্যাপ নম্বর**\n\nতথ্যগুলো জানালেই আমরা সাথে সাথে আপনার নামে একটি সরকারি বুকিং রেফারেন্স আইডি ও ডিজিটাল প্রি-চেক-ইন লিঙ্ক ইস্যু করে দেব, স্যার!`
                    : `${greeting.fullGreeting} Certainly ${guestSalutation}! To immediately reserve and lock your *${matchedRoom}* (${adults} Adults${children > 0 ? ` & ${children} Child` : ''}), could you kindly provide:\n\n1. 🗓️ Preferred **check-in & check-out dates** (or how many nights you plan to stay)\n2. 📞 Your active **mobile / WhatsApp number**\n\nUpon receiving these details, we will instantly issue your official booking reference code and digital Fast-Pass key link!`;

                return {
                    intent: 'BOOKING_INTENT',
                    sentiment: 'POSITIVE',
                    detectedLanguage: targetLang,
                    shouldEscalate: false,
                    proposedReply
                };
            }

            // Phone is present, but Stay Dates / Duration are NOT confirmed
            if (!hasDatesConfirmed) {
                const isTomorrowCheckIn = checkInDate === toYMD(new Date(Date.now() + 86400000));
                const relativePrompt = isTomorrowCheckIn
                    ? (targetLang === 'BANGLA'
                        ? 'আপনি কি আগামীকাল চেক-ইন করে মোট কত রাত থাকতে চাচ্ছেন (বা চেক-আউট তারিখ কবে)'
                        : 'are you planning to check in tomorrow, and for how many nights')
                    : (targetLang === 'BANGLA'
                        ? 'আপনার কাঙ্ক্ষিত চেক-ইন ও চেক-আউট তারিখ (বা মোট কত রাত থাকবেন)'
                        : 'your preferred check-in and check-out dates (or number of nights)');

                const proposedReply = targetLang === 'BANGLA'
                    ? `${greeting.fullGreeting} ধন্যবাদ ${guestSalutation}! আপনার পছন্দের *${roomObj.name}* (${adults} জন প্রাপ্তবয়স্ক${children > 0 ? ` ও ${children} জন শিশু` : ''})-এর বুকিং নিশ্চিত করার জন্য অনুগ্রহ করে:\n\n🗓️ **${relativePrompt}** জানিয়ে দিন?\n\nথাকার মেয়াদ ও তারিখ কনফার্ম করলেই আমরা তাৎক্ষণিকভাবে আপনার নামে একটি অফিশিয়াল বুকিং রেফারেন্স আইডি ইস্যু করে রুমটি ২৪ ঘণ্টার জন্য প্রি-বুকিং হোল্ড (Courtesy Hold) করে দেব, স্যার!`
                    : `${greeting.fullGreeting} Thank you ${guestSalutation}! To finalize your reservation for our *${roomObj.name}* (${adults} Adults${children > 0 ? ` & ${children} Child` : ''}), could you please confirm:\n\n🗓️ **${relativePrompt}**?\n\nAs soon as your stay duration is confirmed, we will instantly lock this room with an official 24-hour Courtesy Hold and issue your booking reference code!`;

                return {
                    intent: 'BOOKING_INTENT',
                    sentiment: 'POSITIVE',
                    detectedLanguage: targetLang,
                    shouldEscalate: false,
                    proposedReply
                };
            }

            // All Information Confirmed (Phone + Dates + Room + Pax) -> Execute Database Hold Reservation
            const finalNights = nights || 1;
            const finalCheckIn = checkInDate || toYMD(new Date(Date.now() + 86400000));
            const finalCheckOut = checkOutDate || toYMD(new Date(new Date(finalCheckIn).getTime() + finalNights * 86400000));
            const totalAmount = finalNights * Number(roomObj.base_rate);
            const holdHours = Number(property.settings?.courtesyHoldDurationHours || property.settings?.aiChatHoldDurationHours) || 24;
            const depositAmount = Math.round(totalAmount * (property.confirmationMinPercentage / 100));

            const resCode = `RES-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
            let createdResId: number | null = null;

            try {
                // 1. Resolve or create guest in guests table
                let guestId: number | null = null;
                const existingGuest = await pool.query(`SELECT id FROM guests WHERE phone = $1 LIMIT 1;`, [extractedPhone]);
                if (existingGuest.rows.length > 0) {
                    guestId = existingGuest.rows[0].id;
                } else {
                    const nameParts = (guestName || 'Valued Guest').trim().split(/\s+/);
                    const firstName = nameParts[0] || 'Valued';
                    const lastName = nameParts.slice(1).join(' ') || 'Guest';
                    const orgRes = await pool.query(`SELECT organization_id FROM properties WHERE id = $1 LIMIT 1;`, [propertyId]);
                    const orgId = orgRes.rows[0]?.organization_id || 1;
                    const newGuest = await pool.query(`
                        INSERT INTO guests (organization_id, salutation, first_name, last_name, phone, created_at, updated_at)
                        VALUES ($1, 'Mr', $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                        RETURNING id;
                    `, [orgId, firstName, lastName, extractedPhone]);
                    if (newGuest.rows.length > 0) guestId = newGuest.rows[0].id;
                }

                if (!guestId) {
                    const anyGuest = await pool.query(`SELECT id FROM guests LIMIT 1;`);
                    guestId = anyGuest.rows[0]?.id || 1;
                }

                // 2. Insert into reservations with hold duration from property settings
                const resInsert = await pool.query(`
                    INSERT INTO reservations (
                        property_id, reservation_number, booker_guest_id, status, hold_type, hold_until,
                        hold_reason, deposit_required, is_guaranteed, source, channel, total_amount,
                        special_requests, created_at, updated_at
                    ) VALUES (
                        $1, $2, $3, 'HOLD', 'COURTESY_HOLD', CURRENT_TIMESTAMP + ($4 || ' hours')::INTERVAL,
                        'AI WhatsApp Courtesy Hold (' || $4 || 'h)', $5, false, 'WHATSAPP', 'StayPulse AI',
                        $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                    ) RETURNING id;
                `, [
                    propertyId,
                    resCode,
                    guestId,
                    String(holdHours),
                    depositAmount,
                    totalAmount,
                    `AI Inbound Booking Hold | Guest: ${guestName} | Contact: ${extractedPhone} | Category: ${roomObj.name} | Dates: ${finalCheckIn} to ${finalCheckOut} (${finalNights} nt) | Pax: ${adults} Adults, ${children} Children | Rate Plan: Best Available Rate (BAR)`
                ]);

                if (resInsert.rows.length > 0) {
                    createdResId = resInsert.rows[0].id;
                    if (conversationId) {
                        await pool.query(`UPDATE cx_conversations SET reservation_id = $1 WHERE id = $2;`, [createdResId, conversationId]);
                    }
                    if (roomObj.id) {
                        try {
                            await pool.query(`
                                INSERT INTO reservation_rooms (
                                    reservation_id, room_id, room_type_id, check_in_date, check_out_date,
                                    nights, room_rate, rate_amount, adults, children, status
                                ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, $8, $9, 'HOLD');
                            `, [
                                createdResId,
                                roomObj.id,
                                finalCheckIn,
                                finalCheckOut,
                                finalNights,
                                Number(roomObj.base_rate),
                                totalAmount,
                                adults,
                                children
                            ]);
                        } catch (errRoom) {
                            console.warn('[AiGuestAssistant] Failed to insert reservation_rooms record:', errRoom);
                        }
                    }
                }
            } catch (e) {
                console.warn('[AiGuestAssistant] Failed to insert hold reservation:', e);
            }

            const secureToken = signJwt({ reservationId: resCode, purpose: 'express_pre_checkin' }, 86400 * 3);
            const frontendBase = getFrontendBaseUrl({ propertySettings: property.settings });
            const precheckinUrl = `${frontendBase}/guestflow?token=${encodeURIComponent(secureToken)}`;

            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} আপনার কাঙ্ক্ষিত *${roomObj.name}*-এর জন্য একটি ${holdHours} ঘণ্টার প্রি-বুকিং হোল্ড (Courtesy Hold) সফলভাবে তৈরি করা হয়েছে! 🏨✨\n\n📋 বুকিং বিবরণ (Booking Summary):\n• বুকিং রেফারেন্স: *${resCode}*\n• রুম ক্যাটাগরি: ${roomObj.name} (${roomObj.bed_type || 'King'} Bed)\n• অতিথি বিবরণ: ${guestName} (${adults} জন প্রাপ্তবয়স্ক${children > 0 ? `, ${children} জন শিশু` : ''})\n• যোগাযোগ নম্বর: ${extractedPhone}\n• তারিখ: ${finalCheckIn} থেকে ${finalCheckOut} (মোট ${finalNights} রাত)\n• রুম রেট: ৳${Number(roomObj.base_rate).toLocaleString('en-IN')}/রাত × ${finalNights} রাত = ৳${totalAmount.toLocaleString('en-IN')} (+${property.vatPercentage}% ভ্যাট ও ${property.serviceChargePercentage}% সার্ভিস চার্জ)\n• অন্তর্ভুক্ত সুবিধাসমূহ: দৈনিক বুফে ব্রেকফাস্ট, ওয়াই-ফাই, সুইমিং পুল ও জিম অ্যাক্সেস\n• হোল্ডের মেয়াদ: আগামী ${holdHours} ঘণ্টা পর্যন্ত এই রুমটি আপনার নামে লক থাকবে\n\n🚀 দ্রুততম চেক-ইনের জন্য ফাস্ট-পাস (Fast-Pass Digital KYC):\nহোটেল লবিতে লাইনে না দাঁড়িয়ে সরাসরি ডিজিটাল কী সংগ্রহের জন্য নিচের লিংকে ক্লিক করে প্রি-চেক-ইন ও NID আপলোড করতে পারেন:\n👉 ${precheckinUrl}\n\n💳 বুকিং গ্যারান্টি (Advance Deposit):\nরুমটি ১০০% নিশ্চিত (Guaranteed) করতে ২০% অগ্রিম ডিপোজিট (৳${depositAmount.toLocaleString('en-IN')}) আমাদের অফিশিয়াল bKash মার্চেন্টে (+8801700000000) প্রদান করতে পারেন, অথবা চেক-ইনের সময় পরিশোধ করতে পারবেন।\n\nআমাদের ফ্রন্ট ডেস্ক টিম আপনার সেবায় সর্বদা প্রস্তুত রয়েছে, ${guestSalutation}!`
                : `${greeting.fullGreeting} A ${holdHours}-hour provisional booking hold (Courtesy Hold) for *${roomObj.name}* has been successfully created! 🏨✨\n\n📋 Booking Summary:\n• Reservation Reference: *${resCode}*\n• Room Category: ${roomObj.name} (${roomObj.bed_type || 'King'} Bed)\n• Guests: ${guestName} (${adults} Adults${children > 0 ? `, ${children} Child` : ''})\n• Contact: ${extractedPhone}\n• Dates: ${finalCheckIn} to ${finalCheckOut} (${finalNights} night${finalNights > 1 ? 's' : ''})\n• Rate Breakdown: ৳${Number(roomObj.base_rate).toLocaleString('en-US')}/night × ${finalNights} nt = ৳${totalAmount.toLocaleString('en-US')} (+${property.vatPercentage}% VAT & ${property.serviceChargePercentage}% Service Charge)\n• Inclusions: Complimentary Buffet Breakfast, High-Speed Wi-Fi, Pool & Fitness Access\n• Hold Validity: ${holdHours} Hours Courtesy Hold\n\n🚀 Fast-Pass Digital Pre-Check-in & KYC:\nSkip the front desk queue upon arrival by uploading your ID document online:\n👉 ${precheckinUrl}\n\n💳 Booking Guarantee Option:\nTo guarantee your reservation 100%, a 20% advance deposit of ৳${depositAmount.toLocaleString('en-US')} may be placed via bKash / Card, or settled during check-in.\n\nOur reservation team is at your complete disposal, ${guestSalutation}!`;

            return {
                intent: 'BOOKING_INTENT',
                sentiment: 'POSITIVE',
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                bookingReference: resCode
            };
        }

        // 8. ROOM AVAILABILITY / PRICING / OCCUPANCY INTENT
        const isAvailabilityIntent = (
            lower.includes('room') || lower.includes('rate') || lower.includes('price') ||
            lower.includes('available') || lower.includes('cost') || lower.includes('book') ||
            lower.includes('vara') || lower.includes('bhara') || lower.includes('vada') ||
            lower.includes('koto') || lower.includes('khali') || lower.includes('faka') ||
            lower.includes('type') || lower.includes('seat') || lower.includes('sit') ||
            lower.includes('kalke') || lower.includes('ajke') || lower.includes('category') ||
            lower.includes('child') || lower.includes('jon') || lower.includes('বাচ্চা') ||
            lower.includes('ভাড়া') || lower.includes('রুম') || lower.includes('খালি') ||
            lower.includes('ফাঁকা') || lower.includes('বুক') || lower.includes('সিট') ||
            lower.includes('কালকে') || lower.includes('আজকে') || lower.includes('ক্যাটাগরি') ||
            lower.includes('সুইট') || lower.includes('suite') || lower.includes('deluxe')
        );

        if (isAvailabilityIntent) {
            // Check for specific occupancy question like "Deluxe Suite 2 jon r 1 jon child"
            const hasOccupancyQuery = (lower.includes('child') || lower.includes('jon') || lower.includes('adult') || lower.includes('বাচ্চা'));
            let defaultReply = '';

            const policyBlockBangla = `\n\n🎁 ভাড়ার সাথে যা যা অন্তর্ভুক্ত (Complimentary Inclusions):\n• Grand Bistro-তে আন্তর্জাতিক বুফে ব্রেকফাস্ট (Complimentary Buffet Breakfast)\n• আগমনী ওয়েলকাম ড্রিঙ্কস ও রিফ্রেশিং ওশিবরি কোল্ড টাওয়েল\n• রূফটপ ইনফিনিটি সুইমিং পুল ও ২৪/৭ ফিটনেস সেন্টারে আনলিমিটেড অ্যাক্সেস\n• আনলিমিটেড হাই-স্পিড ওয়াই-ফাই ও রুমের দৈনিক ২ বোতল মিনারেল ওয়াটার\n\n⚖️ ট্যাক্স ও সরকারি নীতি (Tax & Charges):\n• সরকারি নিয়ম অনুযায়ী রুম ভাড়ার সাথে ${property.vatPercentage}% ভ্যাট (VAT) এবং ${property.serviceChargePercentage}% সার্ভিস চার্জ (Service Charge) প্রযোজ্য।\n\n🏨 হোটেল সময়সূচি (Hotel Timings):\n• চেক-ইন: দুপুর ২:০০ টা | চেক-আউট: দুপুর ১২:০০ টা\n• আর্লি চেক-ইন: রুম প্রস্তুত থাকা সাপেক্ষে সকাল ১০টার পর থেকে কমপ্লিমেন্টারি।\n\n👶 শিশু ও বাচ্চা পলিসি (Child & Infant Policy):\n• ০-৫ বছর (Infant): সম্পূর্ণ বিনামূল্যে (প্যারেন্টস বেড শেয়ার করে), অনুরোধে বেবি কট ফ্রি।\n• ৬-১১ বছর (Child): রুম চার্জ ফ্রি (বেড শেয়ার করে); বুফে ব্রেকফাস্টে ৫০% ছাড়।\n• ১২+ বছর: প্রাপ্তবয়স্ক হিসেবে গণ্য (অতিরিক্ত রোলাওয়ে বেড চার্জ ৳১,০০০/রাত ব্রেকফাস্টসহ)।\n\n🔄 ক্যানসেলেশন ও গ্যারান্টি (Cancellation & Guarantee):\n• ${property.cancellationText}\n• মাত্র ২০% অগ্রিম জমা দিয়ে (bKash/কার্ড) রুমটি শতভাগ নিশ্চিত হিসেবে বুক করতে পারেন।\n\n🪪 পরিচয়পত্র পলিসি: চেক-ইনের সময় প্রতিটি প্রাপ্তবয়স্ক অতিথির মূল জাতীয় পরিচয়পত্র (NID) বা পাসপোর্ট প্রদর্শন বাধ্যতামূলক।`;

            const policyBlockEnglish = `\n\n🎁 Complimentary Inclusions:\n• Daily International Buffet Breakfast at Grand Bistro\n• Welcome drinks & oshibori cold towel on arrival\n• Unlimited access to Rooftop Infinity Pool & 24/7 Fitness Center\n• High-speed Wi-Fi & 2 complimentary mineral water bottles daily\n\n⚖️ Tax & Service Charge Policy:\n• Rates are subject to ${property.vatPercentage}% Government VAT and ${property.serviceChargePercentage}% Service Charge.\n\n🏨 Hotel Timings:\n• Standard Check-in: 2:00 PM | Standard Check-out: 12:00 PM\n• Early check-in after 10:00 AM is complimentary subject to room availability.\n\n👶 Child & Infant Policy:\n• 0-5 Years (Infant): Stay free on existing bedding; complimentary baby cot upon request.\n• 6-11 Years (Child): Stay free on existing bedding; 50% discount on buffet breakfast.\n• 12+ Years: Counted as adult; extra rollaway bed ৳1,000/night (includes breakfast).\n\n🔄 Cancellation & Guarantee Terms:\n• ${property.cancellationText}\n• Secure your reservation with a 20% advance deposit via bKash / Card.\n\n🪪 Identity Verification: Valid Government Photo ID (NID or Passport) is mandatory for all adult guests at check-in.`;

            if (hasOccupancyQuery && (lower.includes('deluxe') || lastDiscussedRoomType === 'Deluxe Suite')) {
                defaultReply = targetLang === 'BANGLA'
                    ? `${greeting.fullGreeting} আমাদের *Deluxe Suite*-এ ২ জন প্রাপ্তবয়স্ক এবং ১ জন শিশুর জন্য আরামদায়ক থাকার চমৎকার ব্যবস্থা রয়েছে।\n\nরুমের ভাড়া ৳২৫,০০০/রাত। বিদ্যমান কিং সাইজ বেডে ৫ বছর বয়স পর্যন্ত শিশু সম্পূর্ণ বিনামূল্যে থাকতে পারবে (প্রয়োজনে অতিরিক্ত রোলাওয়ে বেড মাত্র ৳১,০০০ টাকায় যোগ করা যায়)।${policyBlockBangla}\n\n${guestSalutation}, আপনার কি চেক-ইন তারিখ নির্দিষ্ট করা আছে? আমরা আনন্দের সাথে আপনার বুকিংটি চূড়ান্ত করে দিতে পারি!`
                    : `${greeting.fullGreeting} For your stay with 2 adults and 1 child, our *Deluxe Suite* is exceptionally comfortable.\n\nRate is ৳25,000/night. A child under 5 stays complimentary on the existing King Bed (or a rollaway bed is available for ৳1,000).${policyBlockEnglish}\n\nWould you like me to reserve this suite for your dates, ${guestSalutation}?`;
            } else {
                defaultReply = targetLang === 'BANGLA'
                    ? (isFirstTurn
                        ? `${greeting.fullGreeting} ${hotelName}-এ আপনাকে স্বাগতম!\n\nআগামীকালের জন্য আমাদের রিসোর্টের রুম ক্যাটাগরি ও নিয়মিত ভাড়া তালিকা:\n${roomListBangla}${policyBlockBangla}\n\n${guestSalutation}, আপনার পছন্দের রুম ক্যাটাগরি এবং চেক-ইন/আউট তারিখ জানালে আমরা বুকিং প্রক্রিয়াটি সম্পন্ন করতে পারি!`
                        : `${greeting.fullGreeting} আগামীকালের জন্য আমাদের নিচের রুম ক্যাটাগরিগুলো উপলব্ধ রয়েছে:\n${roomListBangla}${policyBlockBangla}\n\n${guestSalutation}, আপনার কোন রুমটি পছন্দ?`)
                    : (isFirstTurn
                        ? `${greeting.fullGreeting} Welcome to ${hotelName}!\n\nHere are our available room categories & daily rates:\n${roomListEnglish}${policyBlockEnglish}\n\n${guestSalutation}, which category would you prefer to reserve?`
                        : `${greeting.fullGreeting} Here are our available room categories:\n${roomListEnglish}${policyBlockEnglish}\n\n${guestSalutation}, which category would you prefer?`);
            }

            const ragContext = `MANDATORY DATABASE ROOM CATEGORIES & RATES:\n${roomListBangla}\n\nHOTEL POLICIES (MANDATORY TO MENTION WHEN ASKED ABOUT RATES/PRICING):\n- VAT: ${property.vatPercentage}%, Service Charge: ${property.serviceChargePercentage}%\n- Check-in: 2:00 PM, Check-out: 12:00 PM (Early check-in complimentary after 10 AM if room is ready)\n- Inclusions: Complimentary Buffet Breakfast at Grand Bistro, Swimming Pool, 24/7 Gym, High-Speed Wi-Fi, 2 Mineral Water bottles daily\n- Child Policy: Under 5 stays free (baby cot on request), 6-11 free on existing bedding (50% breakfast charge), 12+ adult rollaway bed (৳1,000/night)\n- Cancellation Policy: ${property.cancellationText}\n- Deposit Guarantee: 20% advance deposit via bKash / Card\n- ID Requirement: Valid NID or Passport mandatory for all adult guests at check-in`;

            const proposedReply = await this.generateLlmReply(
                hotelName,
                property,
                guestMessage,
                targetLang,
                greeting,
                defaultReply,
                ragContext,
                recentHistory,
                guestMemory
            );

            const publicCommentReply = targetLang === 'BANGLA'
                ? `${greeting.culturalGreeting} ${guestSalutation}, আপনার আগ্রহের জন্য আন্তরিক ধন্যবাদ! বর্তমান রুমের ভাড়া, পলিসি ও বুকিং সংক্রান্ত বিস্তারিত তথ্য আমরা আপনার ইনবক্সে (DM) পাঠিয়ে দিয়েছি।`
                : `${greeting.culturalGreeting} ${guestSalutation}, thank you for your inquiry! We have sent a direct message (DM) with our latest room rates and policies to your inbox.`;

            return {
                intent: 'AVAILABILITY_QUERY',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                publicCommentReply,
                guestMemory
            };
        }

        // 9. Early Check-In Query
        const isEarlyCheckInIntent = (
            lower.includes('early') || lower.includes('check in early') || lower.includes('morning arrival') ||
            lower.includes('taratari') || lower.includes('shokal') || lower.includes('আর্লি') || lower.includes('সকালে')
        );

        if (isEarlyCheckInIntent) {
            const defaultReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} ${hotelName}-এ যোগাযোগের জন্য ধন্যবাদ। আমাদের নিয়মিত চেক-ইন সময় দুপুর ২:০০ টা। রুমে খালি থাকা সাপেক্ষে আর্লি চেক-ইনের সুবিধা প্রদান করা হয়। এছাড়া কাউন্টারে পৌঁছানোর আগে আমাদের ডিজিটাল প্রি-চেকইন সম্পন্ন করে আপনি ১৫-সেকেন্ডের ফাস্ট-পাস নিশ্চিত করতে পারেন।`
                : `${greeting.fullGreeting} Thank you for contacting ${hotelName}. Standard check-in time is 2:00 PM. Early check-in is subject to availability upon arrival. You can also complete our quick digital pre-check-in to fast-track your key pickup upon arrival.`;

            const proposedReply = await this.generateLlmReply(
                hotelName,
                property,
                guestMessage,
                targetLang,
                greeting,
                defaultReply,
                `Standard Check-in Time: 2:00 PM. Early check-in available subject to room readiness. Fast-Pass digital pre-checkin is offered.`,
                recentHistory,
                guestMemory
            );

            return {
                intent: 'EARLY_CHECKIN',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                publicCommentReply: targetLang === 'BANGLA'
                    ? `${greeting.culturalGreeting} ${guestSalutation}, চেক-ইন সময় ও ফাস্ট-পাসের বিস্তারিত তথ্য আমরা আপনার ইনবক্সে (DM) পাঠিয়েছি।`
                    : `${greeting.culturalGreeting} ${guestSalutation}, we have sent early check-in and Fast-Pass details to your DM.`,
                guestMemory
            };
        }

        // 10. Wi-Fi Inquiry
        if (lower.includes('wifi') || lower.includes('wi-fi') || lower.includes('internet') || lower.includes('নেট')) {
            const defaultReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} ${hotelName}-এ সকল অতিথির জন্য সার্বক্ষণিক উচ্চগতির ওয়াই-ফাই সম্পূর্ণ বিনামূল্যে উপলব্ধ। ফ্রন্ট ডেস্কে যোগাযোগ করে অনায়াসেই কানেক্ট করতে পারবেন।`
                : `${greeting.fullGreeting} Complimentary high-speed Wi-Fi is available hotel-wide at ${hotelName}. Please feel free to check with the Front Desk upon arrival for seamless access.`;

            const proposedReply = await this.generateLlmReply(
                hotelName,
                property,
                guestMessage,
                targetLang,
                greeting,
                defaultReply,
                `Complimentary high-speed Wi-Fi available across all rooms and common areas.`,
                recentHistory,
                guestMemory
            );

            return {
                intent: 'POLICY_QUESTION',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                publicCommentReply: targetLang === 'BANGLA'
                    ? `${greeting.culturalGreeting} ${guestSalutation}, ওয়াই-ফাই ও ইন্টারনেট সুবিধার বিস্তারিত আপনার ইনবক্সে পাঠানো হয়েছে।`
                    : `${greeting.culturalGreeting} ${guestSalutation}, Wi-Fi details have been sent to your DM.`,
                guestMemory
            };
        }

        // 11. Food / Dining Inquiry
        if (lower.includes('breakfast') || lower.includes('buffet') || lower.includes('food') || lower.includes('dining') || lower.includes('khabar') || lower.includes('খাবার')) {
            const defaultReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} ${hotelName}-এ সুস্বাদু বুফে ব্রেকফাস্ট এবং অন-সাইট ডাইনিং সুবিধা চালু রয়েছে। বিস্তারিত মেনু এবং সময়ের জন্য আমাদের ফ্রন্ট ডেস্কে যোগাযোগ করুন।`
                : `${greeting.fullGreeting} Breakfast and dining facilities are available on-site at ${hotelName}. Please check with our Front Desk for operating hours and daily menu options.`;

            const proposedReply = await this.generateLlmReply(
                hotelName,
                property,
                guestMessage,
                targetLang,
                greeting,
                defaultReply,
                `Buffet breakfast served 7:00 AM - 10:30 AM. In-room dining and on-site restaurant open 24/7.`,
                recentHistory,
                guestMemory
            );

            return {
                intent: 'POLICY_QUESTION',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply,
                publicCommentReply: targetLang === 'BANGLA'
                    ? `${greeting.culturalGreeting} ${guestSalutation}, আমাদের ডাইনিং ও ব্রেকফাস্টের বিস্তারিত তথ্য আপনার ইনবক্সে পাঠিয়ে দেওয়া হয়েছে।`
                    : `${greeting.culturalGreeting} ${guestSalutation}, dining details have been sent to your direct message inbox.`,
                guestMemory
            };
        }

        // 11B. In-House Guest Service Request: Housekeeping & Amenities Auto-Dispatch
        let targetRoomNum: string | null = null;
        let targetRoomId: number | null = null;
        const roomRegex = /(?:room|rm|রুম)\s*#?\s*([0-9a-zA-Z]+)/i;
        const roomMatch = guestMessage.match(roomRegex);
        if (roomMatch && roomMatch[1]) {
            targetRoomNum = roomMatch[1].trim();
        } else if (guestMemory.currentRoom && guestMemory.currentRoom !== 'Unassigned') {
            targetRoomNum = guestMemory.currentRoom;
        } else if (conversationId) {
            try {
                const convRes = await pool.query(`
                    SELECT c.reservation_id, rr.room_id, r.room_number 
                    FROM cx_conversations c
                    LEFT JOIN reservation_rooms rr ON rr.reservation_id = c.reservation_id
                    LEFT JOIN rooms r ON r.id = rr.room_id
                    WHERE c.id = $1 AND rr.room_id IS NOT NULL
                    LIMIT 1;
                `, [conversationId]);
                if (convRes.rows.length > 0 && convRes.rows[0].room_number) {
                    targetRoomNum = convRes.rows[0].room_number;
                    targetRoomId = convRes.rows[0].room_id;
                }
            } catch {}
        }

        if (targetRoomNum && !targetRoomId) {
            try {
                const rRes = await pool.query(`
                    SELECT id FROM rooms WHERE (property_id = $1 OR property_id = 1) AND LOWER(room_number) = LOWER($2) LIMIT 1;
                `, [propertyId, targetRoomNum]);
                if (rRes.rows.length > 0) targetRoomId = rRes.rows[0].id;
            } catch {}
        }

        const isHkIntent = (
            lower.includes('towel') || lower.includes('তোয়ালে') || lower.includes('water') || lower.includes('pani') || lower.includes('পানি') ||
            lower.includes('pillow') || lower.includes('বালিশ') || lower.includes('blanket') || lower.includes('কম্বল') ||
            lower.includes('clean') || lower.includes('cleaning') || lower.includes('পরিষ্কার') || lower.includes('shampoo') ||
            lower.includes('soap') || lower.includes('সাবান') || lower.includes('dental') || lower.includes('iron') || lower.includes('ইস্ত্রি')
        );

        if (isHkIntent) {
            let taskId: number | null = null;
            if (targetRoomId) {
                try {
                    const hkRes = await pool.query(`
                        INSERT INTO housekeeping_tasks (
                            room_id, task_type, priority, status, inspection_notes, created_at
                        ) VALUES ($1, 'DAILY_CLEAN', 'HIGH', 'PENDING', $2, CURRENT_TIMESTAMP)
                        RETURNING id;
                    `, [targetRoomId, `Guest WhatsApp Request: "${guestMessage}" | Guest: ${guestName}`]);
                    if (hkRes.rows.length > 0) taskId = hkRes.rows[0].id;
                } catch (hkErr) {
                    console.warn('[AiAssistant] Failed to insert housekeeping task:', hkErr);
                }
            }

            const roomRefText = targetRoomNum ? (targetLang === 'BANGLA' ? `রুম ${targetRoomNum}-এর জন্য ` : `for Room ${targetRoomNum} `) : '';
            const taskRefText = taskId ? ` (Task #${taskId})` : '';

            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} ${roomRefText}আপনার হাউসকিপিং সেবার অনুরোধটি${taskRefText} তাৎক্ষণিকভাবে গ্রহণ করা হয়েছে। আমাদের হাউসকিপিং টিম আগামী ১০-১৫ মিনিটের মধ্যে আপনার প্রয়োজনীয় সামগ্রী পৌঁছে দেবে, ${guestSalutation}!`
                : `${greeting.fullGreeting} Your housekeeping request ${roomRefText}${taskRefText}has been received and dispatched with high priority. Our staff will arrive in approximately 10-15 minutes, ${guestSalutation}!`;

            return {
                intent: 'HOUSEKEEPING_REQUEST',
                sentiment: 'POSITIVE',
                detectedLanguage: targetLang,
                shouldEscalate: false,
                proposedReply
            };
        }

        // 11C. In-House Guest Maintenance / Engineering Auto-Dispatch
        const isMaintIntent = (
            lower.includes('ac ') || lower.includes('a/c') || lower.includes('এসি') || lower.includes('air conditioner') ||
            lower.includes('tv') || lower.includes('টিভি') || lower.includes('television') || lower.includes('remote') ||
            lower.includes('geyser') || lower.includes('hot water') || lower.includes('গরম পানি') ||
            lower.includes('light') || lower.includes('বাতি') || lower.includes('lamp') || lower.includes('leak') || lower.includes('লিক')
        );

        if (isMaintIntent) {
            let orderId: number | null = null;
            if (targetRoomId) {
                try {
                    const mRes = await pool.query(`
                        INSERT INTO maintenance_orders (
                            room_id, property_id, issue_type, priority, status, created_at
                        ) VALUES ($1, $2, $3, 'HIGH', 'OPEN', CURRENT_TIMESTAMP)
                        RETURNING id;
                    `, [targetRoomId, propertyId, `Guest WhatsApp Reported: "${guestMessage}"`]);
                    if (mRes.rows.length > 0) orderId = mRes.rows[0].id;
                } catch (mErr) {
                    console.warn('[AiAssistant] Failed to insert maintenance order:', mErr);
                }
            }

            const roomRefText = targetRoomNum ? (targetLang === 'BANGLA' ? `রুম ${targetRoomNum}-এর ` : `for Room ${targetRoomNum} `) : '';
            const orderRefText = orderId ? ` (Order #${orderId})` : '';

            const proposedReply = targetLang === 'BANGLA'
                ? `${greeting.fullGreeting} ${roomRefText}আপনার মেইনটেন্যান্স রিকোয়েস্টটি${orderRefText} আমাদের ইঞ্জিনিয়ারিং ও টেকনিক্যাল টিমের কাছে পাঠানো হয়েছে। আমাদের টেকনিশিয়ান কিছুক্ষণের মধ্যে রুম পরিদর্শন করে সমস্যা সমাধান করবেন, ${guestSalutation}!`
                : `${greeting.fullGreeting} Your maintenance service request ${roomRefText}${orderRefText}has been registered with our Engineering team. A technician has been dispatched to inspect and resolve it shortly, ${guestSalutation}!`;

            return {
                intent: 'MAINTENANCE_REQUEST',
                sentiment,
                detectedLanguage: targetLang,
                shouldEscalate: true,
                proposedReply
            };
        }

        // 12. General Inquiries
        const defaultReply = targetLang === 'BANGLA'
            ? (isFirstTurn
                ? `${greeting.fullGreeting} ${hotelName}-এ যোগাযোগের জন্য ধন্যবাদ! আমাদের বর্তমান রুম ক্যাটাগরি ও সেবাসমূহ:\n${roomListBangla}\n\nআমাদের ২৪/৭ ফ্রন্ট ডেস্ক টিম আপনাকে কীভাবে সাহায্য করতে পারে?`
                : `${greeting.fullGreeting} আমি কীভাবে আপনাকে সহায়তা করতে পারি, ${guestSalutation}?`)
            : (isFirstTurn
                ? `${greeting.fullGreeting} Thank you for reaching out to ${hotelName}!\n\nOur available room categories:\n${roomListEnglish}\n\nHow may our 24/7 Front Desk team assist you today?`
                : `${greeting.fullGreeting} How may I assist you today, ${guestSalutation}?`);

        const proposedReply = await this.generateLlmReply(
            hotelName,
            property,
            guestMessage,
            targetLang,
            greeting,
            defaultReply,
            `MANDATORY DATABASE ROOM CATEGORIES & RATES:\n${roomListBangla}\nCheck-in Time: 2:00 PM, Check-out Time: 12:00 PM.`,
            recentHistory,
            guestMemory
        );

        const publicCommentReply = targetLang === 'BANGLA'
            ? `${greeting.culturalGreeting} ${guestSalutation}, আপনাকে ধন্যবাদ! বিস্তারিত সহায়তার জন্য আমরা আপনার ইনবক্সে (DM) মেসেজ পাঠিয়েছি।`
            : `${greeting.culturalGreeting} ${guestSalutation}, thank you! We have sent a direct message to your inbox to assist you further.`;

        return {
            intent: 'GENERAL',
            sentiment,
            detectedLanguage: targetLang,
            shouldEscalate: false,
            proposedReply,
            publicCommentReply,
            guestMemory
        };
    }

    /**
     * Optional External LLM invocation (Google Gemini 3.5 Flash / OpenAI GPT-4o-mini)
     * If GEMINI_API_KEY or OPENAI_API_KEY is configured in server/.env, calls the cloud model.
     * If not configured, gracefully falls back to deterministic local RAG reply.
     */
    private static async generateLlmReply(
        hotelName: string,
        property: any,
        userMessage: string,
        targetLanguage: 'BANGLA' | 'ENGLISH',
        greeting: { fullGreeting: string; culturalGreeting: string; timeGreeting: string; cleanGuestName: string; honorific: string; detectedFaith: 'MUSLIM' | 'HINDU' | 'NEUTRAL'; isFirstTurn?: boolean },
        fallbackReply: string,
        extraRAGContext?: string,
        recentHistory?: Array<{ role: 'guest' | 'assistant'; text: string }>,
        guestMemory?: GuestMemoryProfile
    ): Promise<string> {
        const geminiKey = process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!geminiKey && !openaiKey) {
            return fallbackReply;
        }

        const langInstruction = targetLanguage === 'BANGLA'
            ? 'Guest communicated in Bengali or Banglish. YOU MUST REPLY IN PURE, ELEGANT BENGALI SCRIPT (বাংলা লিপি). Do not use English words unless proper hotel/room names.'
            : 'Guest communicated in English or a third foreign language. YOU MUST REPLY IN PROFESSIONAL ENGLISH.';

        let openingInstruction = '';
        if (greeting.isFirstTurn) {
            if (guestMemory?.isReturningGuest) {
                openingInstruction = `MANDATORY OPENING SALUTATION: Your response MUST begin directly with: "${greeting.fullGreeting}"`;
            } else {
                openingInstruction = `MANDATORY OPENING SALUTATION: Your response MUST begin directly with: "${greeting.fullGreeting} ${hotelName}-এ আপনাকে স্বাগতম।"`;
            }
        } else {
            openingInstruction = `ONGOING CHAT (DO NOT REPEAT WELCOME): This is an ONGOING conversation. DO NOT say "Grand Palace Hotel-এ আপনাকে স্বাগতম" again. Greet naturally with "${greeting.fullGreeting}" and directly address the guest's message.`;
        }

        const memoryContext = guestMemory ? `
=========================================
GUEST RELATIONSHIP & PMS HISTORY CONTEXT:
- Relationship Tier: ${guestMemory.relationshipTier} (${guestMemory.summaryBadge})
- Is Returning Guest: ${guestMemory.isReturningGuest}
- Total Stays Completed: ${guestMemory.stayCount}
- Lifetime Revenue Spend: ৳${guestMemory.lifetimeSpend.toLocaleString()}
- Active In-House Room: ${guestMemory.currentRoom || 'N/A'}
- Active / Upcoming Booking: ${guestMemory.activeReservation ? `${guestMemory.activeReservation.resNo} (${guestMemory.activeReservation.arrivalDate} to ${guestMemory.activeReservation.departureDate})` : 'N/A'}
- Preferred Room Type: ${guestMemory.favoriteRoomType}
- Guest Preferences / Notes: ${guestMemory.preferences || 'Standard preferences'}
- Past Inquiries / Chat Summary: ${guestMemory.previousChatSummary || 'None'}

CRITICAL PERSONA RULES:
1. NEVER greet returning guests like a stranger. Do not say "Welcome to Grand Palace, allow me to introduce our hotel" to someone who has already stayed or booked with us.
2. If in-house (Room ${guestMemory.currentRoom}), address as resident guest and handle room requests with zero friction.
3. If upcoming reservation (${guestMemory.activeReservation?.resNo}), reference their arrival and offer check-in or transport assistance.
4. If repeat guest (${guestMemory.stayCount} stays), warmly acknowledge their loyalty.
=========================================
` : '';

        const historyContext = recentHistory && recentHistory.length > 0
            ? `RECENT CONVERSATION HISTORY (PAST TURNS):\n${recentHistory.map(h => `${h.role === 'guest' ? 'Guest' : 'Assistant'}: ${h.text}`).join('\n')}\nCRITICAL: Maintain continuous conversational context with past messages. Do NOT re-ask for room types or dates already specified by the guest.\n`
            : '';

        const fullSystemPrompt = `You are StayPulse AI Concierge, the 5-star digital front desk assistant for ${hotelName}.
Address: ${property.address || 'Gulshan-2, Dhaka, Bangladesh'}, Phone: ${property.phone || '+880 2 9882200'}.

STRICT SALUTATION & RESPECT RULES (MANDATORY):
- Guest Name: "${greeting.cleanGuestName || 'Guest'}"
- Honorific: "${greeting.honorific}" (Bengali: "${greeting.honorific}", English: "${greeting.honorific === 'ম্যাডাম' ? 'Ms.' : 'Mr.'}")
- Inferred Cultural / Faith Background: ${greeting.detectedFaith}
- Local Time Greeting: "${greeting.timeGreeting}"
- ${openingInstruction}
- CRITICAL 5-STAR RULE: NEVER call the guest "ভাই" (Bhai) or "দাদা" (Dada). This is strictly prohibited in luxury hospitality. ALWAYS address the guest respectfully as "${greeting.honorific}" (Sir / Madam).
${greeting.detectedFaith === 'MUSLIM' ? '- Guest is Muslim: ALWAYS keep "আসসালামু আলাইকুম". NEVER use "নমস্কার".' : ''}
${greeting.detectedFaith === 'HINDU' ? '- Guest is Hindu: ALWAYS keep "নমস্কার".' : ''}

${memoryContext}

${historyContext}

${extraRAGContext ? `DATABASE ROOM DATA (MANDATORY - DO NOT HALLUCINATE):\n${extraRAGContext}\nWhen the guest asks about available rooms, categories, or rates, YOU MUST EXPLICITLY LIST THESE EXACT ROOM NAMES from our database. NEVER invent fake room names like "ডিলাক্স এবং প্রিমিয়াম সুইট".` : ''}

Language Rules:
${langInstruction}

Tone:
5-star luxury hotel concierge, polite, respectful, warm, and thorough. When the guest asks about rates, pricing, or room booking, YOU MUST INCLUDE THE EXACT DETAILS FROM DATABASE & POLICIES:
- Exact room names and prices
- Complimentary Inclusions (Buffet breakfast, Welcome drinks, Pool/Gym access, High-speed Wi-Fi, Mineral water)
- Tax & Service charge policy (15% VAT + 10% Service Charge)
- Check-in (2:00 PM) and Check-out (12:00 PM) times with early check-in policy
- Child & Infant Policy (Under 5 free with baby cot on request, 6-11 free sharing bed with 50% breakfast, 12+ adult extra bed)
- Cancellation & Guarantee Terms (Free cancellation up to 48 hours prior, 20% advance deposit option)
- Mandatory NID / Passport requirement at check-in`;

        // 1. Google Gemini (Active Fast Hospitality Models: gemini-3.5-flash-lite / gemini-3.5-flash / gemini-flash-latest)
        if (geminiKey) {
            const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-flash-latest'];
            for (const model of candidateModels) {
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 6500);

                    const res = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [
                                { role: 'user', parts: [{ text: `${fullSystemPrompt}\n\nGuest Message: "${userMessage}"\n\nGenerate AI Concierge Response:` }] }
                            ],
                            generationConfig: { maxOutputTokens: 900, temperature: 0.2 }
                        }),
                        signal: controller.signal
                    });
                    clearTimeout(timeoutId);

                    if (res.ok) {
                        const data: any = await res.json();
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text && text.trim()) return text.trim();
                    }
                } catch (err: any) {
                    console.warn(`[AiGuestAssistant] Gemini (${model}) skipped, trying next fallback:`, err?.message || err);
                }
            }
        }

        // 2. OpenAI GPT-4o-mini
        if (openaiKey) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [
                            { role: 'system', content: fullSystemPrompt },
                            { role: 'user', content: userMessage }
                        ],
                        max_tokens: 900,
                        temperature: 0.2
                    })
                });
                if (res.ok) {
                    const data: any = await res.json();
                    const text = data?.choices?.[0]?.message?.content;
                    if (text && text.trim()) return text.trim();
                }
            } catch (err) {
                console.warn('[AiGuestAssistant] OpenAI API call skipped/failed, using local RAG fallback:', err);
            }
        }

        return fallbackReply;
    }

    /**
     * Processes inbound message based on property's active AI mode (OFF / SUGGEST / AUTOPILOT)
     */
    static async processInboundMessage(
        propertyId: number,
        conversationId: string | number,
        aiMode: string,
        guestMessage: string,
        guestName: string,
        guestPhone: string
    ): Promise<void> {
        const pool = getPool();
        const analysis = await this.analyzeAndDraftReply(propertyId, guestMessage, guestName, guestPhone, conversationId);

        // Update conversation sentiment and escalation status
        await pool.query(`
            UPDATE cx_conversations 
            SET sentiment = $1, 
                status = CASE WHEN $2 = TRUE THEN 'PENDING_APPROVAL' ELSE status END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3;
        `, [analysis.sentiment, analysis.shouldEscalate, conversationId]);

        if (aiMode === 'AUTOPILOT' && !analysis.shouldEscalate) {
            // Autopilot Mode: Directly send message to guest
            const dispatchRes = await WhatsAppCloudApiService.sendTextMessage(guestPhone, analysis.proposedReply);

            // Record bot message in history
            await pool.query(`
                INSERT INTO cx_messages (
                    conversation_id, sender_type, sender_name, message_text, media_url, media_type, status, is_approved
                ) VALUES ($1, 'AI_BOT', 'StayPulse AI Concierge', $2, $3, $4, $5, TRUE);
            `, [
                conversationId,
                analysis.proposedReply,
                analysis.mediaUrl || null,
                analysis.mediaType || 'TEXT',
                dispatchRes.success ? 'DELIVERED' : 'FAILED'
            ]);

            await pool.query(`
                UPDATE cx_conversations 
                SET last_message_text = $1, last_message_at = CURRENT_TIMESTAMP 
                WHERE id = $2;
            `, [analysis.proposedReply, conversationId]);
        } else {
            // Suggest Mode or Escalated: Store as draft waiting for front desk approval
            await pool.query(`
                UPDATE cx_messages 
                SET suggested_reply = $1, is_approved = FALSE 
                WHERE id = (SELECT id FROM cx_messages WHERE conversation_id = $2 ORDER BY created_at DESC LIMIT 1);
            `, [analysis.proposedReply, conversationId]);
        }
    }
}
