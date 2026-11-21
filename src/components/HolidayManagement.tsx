import React, { useState, useEffect, useMemo } from 'react';
import {
    CalendarDays,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertCircle,
    Calendar,
    Sparkles,
    DollarSign,
    Users,
    Clock,
    X,
    Save,
    TrendingUp,
    Repeat,
    Download,
    Upload,
    FileSpreadsheet,
    Globe,
    CheckCircle2,
    RefreshCw,
    ShieldCheck,
    BedDouble
} from 'lucide-react';
import PageHeader from './common/PageHeader';
import { SearchableSelect, type SearchableOption } from './common/SearchableSelect';
import { confirmModal } from '../context/ConfirmModalContext';
import { toast } from '../context/ToastContext';
import { generateUniqueShortCode, isShortCodeDuplicate } from '../utils/codeGenerator';
import { useProperty } from '../context/PropertyContext';
import { useActiveCurrency } from '../utils/currencyUtils';
import {
    getStoredHolidays,
    STORAGE_KEY_HOLIDAYS,
    fetchHolidaysFromDB,
    saveHolidayToDB,
    deleteHolidayFromDB,
    fetchExternalHolidayCatalog,
    fetchSupportedHolidayCountries,
    bulkImportHolidaysToDB,
    checkIsHolidayDuplicate,
    resolveCountryCodeFromNationalityOrName,
    type ExternalCatalogItem,
    type SupportedCountryItem,
    type HolidayItem,
    type HolidayCategory
} from '../utils/holidayHelper';

export interface HolidayManagementProps {
    propertyId?: number;
    defaultCountryCode?: string;
}

export default function HolidayManagement({ propertyId, defaultCountryCode }: HolidayManagementProps = {}) {
    const { activeProperty, activePropertyId } = useProperty();
    const { currencySymbol } = useActiveCurrency();
    const currentPropertyId = propertyId || activePropertyId || activeProperty?.id || (typeof window !== 'undefined' ? Number(localStorage.getItem('hotel_active_property_id') || localStorage.getItem('active_property_id')) : undefined) || 1;

    const [holidays, setHolidays] = useState<HolidayItem[]>(() => {
        return getStoredHolidays();
    });

    // Load active property's holidays from Cloud PostgreSQL database
    useEffect(() => {
        if (!currentPropertyId) return;
        fetchHolidaysFromDB(currentPropertyId).then(data => {
            if (Array.isArray(data)) {
                setHolidays(data);
            }
        });
    }, [currentPropertyId]);

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY_HOLIDAYS, JSON.stringify(holidays));
        } catch (e) {
            console.error('Failed to save holidays:', e);
        }
    }, [holidays]);

    // Dynamic Rolling Year Windows (Continuous rolling window without hardcoded limits)
    const currentYear = new Date().getFullYear();
    const rollingYears = useMemo(() => {
        return Array.from({ length: 20 }, (_, i) => currentYear - 2 + i);
    }, [currentYear]);

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [yearFilter, setYearFilter] = useState<string>('2026');
    const [surgeOnly, setSurgeOnly] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<HolidayItem | null>(null);

    // Import Modal State (Year-based Live Government & Festival Holiday Integration)
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importTab, setImportTab] = useState<'api' | 'csv'>('api');
    const [importYear, setImportYear] = useState<string>('2026');

    // Dynamic Initial Country resolution from Property Settings / Demonym
    const initialCountry = useMemo(() => {
        if (defaultCountryCode) return defaultCountryCode;
        if (currentPropertyId) {
            try {
                const saved = localStorage.getItem(`hotel_unified_settings_prop_${currentPropertyId}`);
                if (saved) {
                    const parsed = JSON.parse(saved);
                    const nat = parsed?.settings?.defaultNationality || parsed?.settings?.country || parsed?.country;
                    if (nat) return resolveCountryCodeFromNationalityOrName(nat);
                }
            } catch {}
        }
        if (activeProperty?.country) return resolveCountryCodeFromNationalityOrName(activeProperty.country);
        return 'BD';
    }, [defaultCountryCode, activeProperty?.country, currentPropertyId, isImportModalOpen]);

    const [importCountry, setImportCountry] = useState<string>(initialCountry);

    // Synchronize country whenever property nationality/country changes or modal opens
    useEffect(() => {
        setImportCountry(initialCountry);
    }, [initialCountry, isImportModalOpen]);

    const [availableCountries, setAvailableCountries] = useState<SupportedCountryItem[]>([]);
    const [externalCatalog, setExternalCatalog] = useState<ExternalCatalogItem[]>([]);
    const [isCatalogLoading, setIsCatalogLoading] = useState(false);
    const [selectedCatalogCodes, setSelectedCatalogCodes] = useState<Set<string>>(new Set());

    // Load complete global countries registry (215+ countries)
    useEffect(() => {
        fetchSupportedHolidayCountries(currentPropertyId).then(list => {
            if (Array.isArray(list) && list.length > 0) {
                setAvailableCountries(list);
            }
        });
    }, [currentPropertyId]);

    // Country options for SearchableSelect
    const countryOptions = useMemo<SearchableOption[]>(() => {
        if (availableCountries.length === 0) {
            return [
                { value: 'BD', label: '🇧🇩 Bangladesh (BD)', group: 'Popular Hotel Destinations' },
                { value: 'US', label: '🇺🇸 United States (US)', group: 'Popular Hotel Destinations' },
                { value: 'GB', label: '🇬🇧 United Kingdom (GB)', group: 'Popular Hotel Destinations' },
                { value: 'IN', label: '🇮🇳 India (IN)', group: 'Popular Hotel Destinations' },
                { value: 'SA', label: '🇸🇦 Saudi Arabia (SA)', group: 'Popular Hotel Destinations' },
                { value: 'AE', label: '🇦🇪 United Arab Emirates (AE)', group: 'Popular Hotel Destinations' },
                { value: 'CA', label: '🇨🇦 Canada (CA)', group: 'Popular Hotel Destinations' },
                { value: 'AU', label: '🇦🇺 Australia (AU)', group: 'Popular Hotel Destinations' },
                { value: 'SG', label: '🇸🇬 Singapore (SG)', group: 'Popular Hotel Destinations' },
                { value: 'MY', label: '🇲🇾 Malaysia (MY)', group: 'Popular Hotel Destinations' }
            ];
        }
        return availableCountries.map(c => ({
            value: c.code,
            label: `${c.flag} ${c.name} (${c.code})`,
            subLabel: c.code,
            group: c.isPopular ? 'Popular Hotel Destinations' : 'All Countries (A - Z)'
        }));
    }, [availableCountries]);

    // CSV File State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvParsedRows, setCsvParsedRows] = useState<any[]>([]);
    const [csvError, setCsvError] = useState('');

    // Form State
    const [formName, setFormName] = useState('');
    const [formCode, setFormCode] = useState('');
    const [formCategory, setFormCategory] = useState<HolidayCategory>('PUBLIC');
    const [formStartDate, setFormStartDate] = useState('');
    const [formEndDate, setFormEndDate] = useState('');
    const [formHasSurgeRate, setFormHasSurgeRate] = useState(false);
    const [formRateMultiplier, setFormRateMultiplier] = useState(1.25);
    const [formMinStayNights, setFormMinStayNights] = useState(1);
    const [formMandatoryGala, setFormMandatoryGala] = useState(false);
    const [formGalaFee, setFormGalaFee] = useState(0);
    const [formExtraBedAllowed, setFormExtraBedAllowed] = useState(true);
    const [formExtraBedHolidayFee, setFormExtraBedHolidayFee] = useState(1500);
    const [formExtraAdultHolidayFee, setFormExtraAdultHolidayFee] = useState(1200);
    const [formExtraChildHolidayFee, setFormExtraChildHolidayFee] = useState(600);
    const [formMaxOccupancyLimit, setFormMaxOccupancyLimit] = useState(0);
    const [formWageMultiplier, setFormWageMultiplier] = useState(2.0);
    const [formCompOff, setFormCompOff] = useState(true);
    const [formStaffingAlert, setFormStaffingAlert] = useState<'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE'>('STANDARD');
    const [formIsRecurring, setFormIsRecurring] = useState(false);
    const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
    const [formDescription, setFormDescription] = useState('');
    const [codeError, setCodeError] = useState('');

    // Quick Stats calculation
    const stats = useMemo(() => {
        const total = holidays.length;
        const activeCount = holidays.filter(h => h.status === 'ACTIVE').length;
        const surgeDays = holidays.filter(h => h.hasSurgeRate && h.status === 'ACTIVE').length;
        const doubleWageDays = holidays.filter(h => h.staffWageMultiplier >= 2.0 && h.status === 'ACTIVE').length;
        return { total, activeCount, surgeDays, doubleWageDays };
    }, [holidays]);

    // Filtered holidays list
    const filteredHolidays = useMemo(() => {
        return holidays.filter(item => {
            const matchesSearch =
                item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

            const matchesYear =
                yearFilter === 'ALL' ||
                item.startDate.startsWith(yearFilter) ||
                item.endDate.startsWith(yearFilter);

            const matchesSurge = !surgeOnly || item.hasSurgeRate;

            return matchesSearch && matchesCategory && matchesYear && matchesSurge;
        }).sort((a, b) => a.startDate.localeCompare(b.startDate));
    }, [holidays, searchTerm, categoryFilter, yearFilter, surgeOnly]);

    // Calculate days between two ISO date strings inclusive
    const calculateDays = (start: string, end: string): number => {
        if (!start || !end) return 1;
        const s = new Date(start);
        const e = new Date(end);
        const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        return diff > 0 ? diff : 1;
    };

    // Open Create Modal
    const handleOpenCreate = () => {
        setEditingItem(null);
        setFormName('');
        const newCode = generateUniqueShortCode('HOL', holidays.map(h => h.code));
        setFormCode(newCode);
        setFormCategory('PUBLIC');
        const defaultDate = `${yearFilter !== 'ALL' ? yearFilter : '2026'}-01-01`;
        setFormStartDate(defaultDate);
        setFormEndDate(defaultDate);
        setFormHasSurgeRate(false);
        setFormRateMultiplier(1.25);
        setFormMinStayNights(1);
        setFormMandatoryGala(false);
        setFormGalaFee(0);
        setFormExtraBedAllowed(true);
        setFormExtraBedHolidayFee(1500);
        setFormExtraAdultHolidayFee(1200);
        setFormExtraChildHolidayFee(600);
        setFormMaxOccupancyLimit(0);
        setFormWageMultiplier(2.0);
        setFormCompOff(true);
        setFormStaffingAlert('STANDARD');
        setFormIsRecurring(false);
        setFormStatus('ACTIVE');
        setFormDescription('');
        setCodeError('');
        setIsModalOpen(true);
    };

    // Open Edit Modal
    const handleOpenEdit = (item: HolidayItem) => {
        setEditingItem(item);
        setFormName(item.name);
        setFormCode(item.code);
        setFormCategory(item.category);
        setFormStartDate(item.startDate);
        setFormEndDate(item.endDate);
        setFormHasSurgeRate(item.hasSurgeRate);
        setFormRateMultiplier(item.rateMultiplier);
        setFormMinStayNights(item.minStayNights);
        setFormMandatoryGala(item.mandatoryGala);
        setFormGalaFee(item.galaDinnerFee);
        setFormExtraBedAllowed(item.extraBedAllowed !== false);
        setFormExtraBedHolidayFee(item.extraBedHolidayFee ?? 1500);
        setFormExtraAdultHolidayFee(item.extraAdultHolidayFee ?? 1200);
        setFormExtraChildHolidayFee(item.extraChildHolidayFee ?? 600);
        setFormMaxOccupancyLimit(item.maxOccupancyLimit ?? 0);
        setFormWageMultiplier(item.staffWageMultiplier);
        setFormCompOff(item.compOffCredit);
        setFormStaffingAlert(item.minimumStaffingAlert);
        setFormIsRecurring(Boolean(item.isRecurring));
        setFormStatus(item.status);
        setFormDescription(item.description || '');
        setCodeError('');
        setIsModalOpen(true);
    };

    // Handle Name Change with Auto-Code Generation
    const handleNameChange = (val: string) => {
        setFormName(val);
        if (!editingItem && val.trim().length > 2) {
            const autoCode = generateUniqueShortCode(val, holidays.map(h => h.code));
            setFormCode(autoCode);
            setCodeError('');
        }
    };

    // Regenerate Code
    const handleRegenerateCode = () => {
        const base = formName.trim() || 'HOL';
        const existingCodes = holidays.filter(h => h.id !== editingItem?.id).map(h => h.code);
        const code = generateUniqueShortCode(base, existingCodes);
        setFormCode(code);
        setCodeError('');
    };

    // Save Holiday
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();

        const cleanCode = formCode.trim().toUpperCase();
        if (!cleanCode) {
            setCodeError('Short code is required');
            return;
        }

        const existingCodes = holidays.filter(h => h.id !== editingItem?.id).map(h => h.code);
        if (isShortCodeDuplicate(cleanCode, existingCodes)) {
            setCodeError(`Code "${cleanCode}" is already in use by another holiday.`);
            return;
        }

        const days = calculateDays(formStartDate, formEndDate);

        const itemToSave: HolidayItem = editingItem
            ? {
                  ...editingItem,
                  code: cleanCode,
                  name: formName.trim(),
                  category: formCategory,
                  startDate: formStartDate,
                  endDate: formEndDate,
                  daysCount: days,
                  hasSurgeRate: formHasSurgeRate,
                  rateMultiplier: formHasSurgeRate ? Number(formRateMultiplier) : 1.0,
                  minStayNights: Number(formMinStayNights) || 1,
                  mandatoryGala: formMandatoryGala,
                  galaDinnerFee: formMandatoryGala ? Number(formGalaFee) : 0,
                  staffWageMultiplier: Number(formWageMultiplier) || 1.0,
                  compOffCredit: formCompOff,
                  minimumStaffingAlert: formStaffingAlert,
                  isRecurring: formIsRecurring,
                  status: formStatus,
                  description: formDescription.trim(),
                  extraBedAllowed: formExtraBedAllowed,
                  extraBedHolidayFee: Number(formExtraBedHolidayFee) || 0,
                  extraAdultHolidayFee: Number(formExtraAdultHolidayFee) || 0,
                  extraChildHolidayFee: Number(formExtraChildHolidayFee) || 0,
                  maxOccupancyLimit: Number(formMaxOccupancyLimit) || 0,
              }
            : {
                  id: `hol-${Date.now()}`,
                  code: cleanCode,
                  name: formName.trim(),
                  category: formCategory,
                  startDate: formStartDate,
                  endDate: formEndDate,
                  daysCount: days,
                  hasSurgeRate: formHasSurgeRate,
                  rateMultiplier: formHasSurgeRate ? Number(formRateMultiplier) : 1.0,
                  minStayNights: Number(formMinStayNights) || 1,
                  mandatoryGala: formMandatoryGala,
                  galaDinnerFee: formMandatoryGala ? Number(formGalaFee) : 0,
                  staffWageMultiplier: Number(formWageMultiplier) || 1.0,
                  compOffCredit: formCompOff,
                  minimumStaffingAlert: formStaffingAlert,
                  isRecurring: formIsRecurring,
                  status: formStatus,
                  description: formDescription.trim(),
                  createdAt: new Date().toISOString(),
                  extraBedAllowed: formExtraBedAllowed,
                  extraBedHolidayFee: Number(formExtraBedHolidayFee) || 0,
                  extraAdultHolidayFee: Number(formExtraAdultHolidayFee) || 0,
                  extraChildHolidayFee: Number(formExtraChildHolidayFee) || 0,
                  maxOccupancyLimit: Number(formMaxOccupancyLimit) || 0,
              };

        // Cloud PostgreSQL Persistence
        const propId = currentPropertyId;
        saveHolidayToDB(propId, itemToSave).catch(err => console.warn('Save holiday to DB notice:', err));

        setHolidays(prev => {
            if (editingItem) {
                return prev.map(h => (h.id === editingItem.id ? itemToSave : h));
            }
            return [itemToSave, ...prev];
        });

        setIsModalOpen(false);
        toast.success(editingItem ? `Holiday "${formName}" updated.` : `Holiday "${formName}" scheduled.`);
    };

    // Delete Holiday
    const handleDelete = async (id: string, name: string) => {
        const confirmed = await confirmModal({
            title: `Remove Holiday?`,
            message: `Are you sure you want to remove "${name}" from the holiday and peak calendar?`,
            confirmText: 'Remove Holiday',
            variant: 'danger'
        });
        if (!confirmed) return;

        const propId = currentPropertyId;
        deleteHolidayFromDB(propId, id).catch(err => console.warn('Delete holiday from DB notice:', err));

        setHolidays(prev => prev.filter(h => h.id !== id));
        toast.success(`Holiday "${name}" removed from calendar.`);
    };

    // Toggle Status
    const handleToggleStatus = (id: string) => {
        const propId = currentPropertyId;
        setHolidays(prev =>
            prev.map(h => {
                if (h.id === id) {
                    const updated: HolidayItem = { ...h, status: h.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' };
                    saveHolidayToDB(propId, updated).catch(err => console.warn('Toggle status DB notice:', err));
                    return updated;
                }
                return h;
            })
        );
    };

    // Export Holiday Schedule to CSV
    const handleExportCSV = () => {
        if (filteredHolidays.length === 0) {
            toast.error('No holidays available to export.');
            return;
        }
        const headers = ['Code', 'Name', 'Category', 'Start Date', 'End Date', 'Days', 'Surge Rate', 'Multiplier', 'MLOS', 'Recurring', 'Status', 'Notes'];
        const rows = filteredHolidays.map(h => [
            `"${h.code}"`,
            `"${h.name.replace(/"/g, '""')}"`,
            `"${h.category}"`,
            `"${h.startDate}"`,
            `"${h.endDate}"`,
            h.daysCount,
            h.hasSurgeRate ? 'YES' : 'NO',
            h.hasSurgeRate ? `${h.rateMultiplier}x` : '1.0x',
            `${h.minStayNights}N`,
            h.isRecurring ? 'YES' : 'NO',
            `"${h.status}"`,
            `"${(h.description || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `hotel_holidays_schedule_${yearFilter !== 'ALL' ? yearFilter : 'all'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Holiday schedule exported as CSV.');
    };

    // Helper: Parse CSV Line with RFC 4180 quotes support
    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const c = line[i];
            if (c === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    cur += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (c === ',' && !inQuotes) {
                result.push(cur.trim());
                cur = '';
            } else {
                cur += c;
            }
        }
        result.push(cur.trim());
        return result;
    };

    // Download CSV Sample Template
    const handleDownloadTemplate = () => {
        const headers = ['Name', 'Code', 'Category', 'StartDate', 'EndDate', 'HasSurgeRate', 'RateMultiplier', 'MinStayNights', 'Recurring', 'Notes'];
        const sampleRows = [
            ['Independence & National Day', 'INDEP-26', 'PUBLIC', '2026-03-26', '2026-03-26', 'FALSE', '1.0', '1', 'TRUE', 'National statutory holiday'],
            ['New Year Eve & Grand Gala', 'NY-26', 'PEAK_GALA', '2026-12-31', '2027-01-02', 'TRUE', '1.50', '2', 'TRUE', 'Rooftop countdown gala'],
            ['Eid-ul-Fitr Festival', 'EID-26', 'RELIGIOUS', '2026-03-20', '2026-03-23', 'TRUE', '1.35', '2', 'FALSE', 'Family vacation peak']
        ];
        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...sampleRows.map(r => r.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'holiday_import_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Holiday CSV template downloaded.');
    };

    // Load Live External Catalog for chosen year and country
    const loadExternalCatalog = async (year: string, country: string) => {
        setIsCatalogLoading(true);
        const propId = currentPropertyId;
        try {
            const res = await fetchExternalHolidayCatalog(propId, year, country);
            if (res && Array.isArray(res.data)) {
                // Re-verify duplicate status against local holidays state as well
                const annotated = res.data.map(item => {
                    const localDup = checkIsHolidayDuplicate(item, holidays);
                    if (localDup.isDuplicate || item.isDuplicate) {
                        return {
                            ...item,
                            isDuplicate: true,
                            duplicateReason: localDup.reason || item.duplicateReason || 'Already in calendar'
                        };
                    }
                    return {
                        ...item,
                        isDuplicate: false
                    };
                });
                setExternalCatalog(annotated);
                // Pre-select all available (non-duplicate) items by default
                const available = annotated.filter(i => !i.isDuplicate).map(i => i.code);
                setSelectedCatalogCodes(new Set(available));
            }
        } catch (err) {
            console.warn('Failed to load external holiday catalog:', err);
        } finally {
            setIsCatalogLoading(false);
        }
    };

    // Auto-fetch when modal opens or when Year/Country changes
    useEffect(() => {
        if (isImportModalOpen && importTab === 'api') {
            loadExternalCatalog(importYear, importCountry);
        }
    }, [isImportModalOpen, importTab, importYear, importCountry]);

    // Handle CSV File Upload & Parsing with real-time duplicate detection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setCsvFile(file);
        setCsvError('');
        setCsvParsedRows([]);

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                if (!text || !text.trim()) {
                    setCsvError('Uploaded CSV file is empty.');
                    return;
                }

                const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
                if (lines.length < 2) {
                    setCsvError('CSV file must have a header row and at least 1 data row.');
                    return;
                }

                const rawHeaders = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
                const rows: any[] = [];

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCSVLine(lines[i]);
                    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

                    const rowObj: Record<string, string> = {};
                    rawHeaders.forEach((header, colIdx) => {
                        rowObj[header] = values[colIdx] || '';
                    });

                    const name = rowObj['name'] || rowObj['holidayname'] || rowObj['holidayevent'] || `Holiday ${i}`;
                    const code = (rowObj['code'] || rowObj['shortcode'] || generateUniqueShortCode(name, [])).toUpperCase();
                    const rawCat = (rowObj['category'] || 'PUBLIC').toUpperCase();
                    const category: HolidayCategory = ['PUBLIC', 'RELIGIOUS', 'PEAK_GALA', 'CORPORATE'].includes(rawCat)
                        ? (rawCat as HolidayCategory)
                        : 'PUBLIC';
                    const startDate = rowObj['startdate'] || rowObj['start'] || '';
                    const endDate = rowObj['enddate'] || rowObj['end'] || startDate;

                    if (!startDate) continue; // skip row if no start date

                    const hasSurgeRate = rowObj['hassurgerate']?.toLowerCase() === 'true' || Number(rowObj['ratemultiplier']) > 1.0;
                    const rateMultiplier = Number(rowObj['ratemultiplier']) > 0 ? Number(rowObj['ratemultiplier']) : 1.0;
                    const minStayNights = Number(rowObj['minstaynights']) > 0 ? Number(rowObj['minstaynights']) : 1;
                    const isRecurring = rowObj['recurring']?.toLowerCase() === 'true' || rowObj['isrecurring']?.toLowerCase() === 'true';
                    const description = rowObj['notes'] || rowObj['description'] || '';

                    // Check duplicate status
                    const dupCheck = checkIsHolidayDuplicate({ code, name, startDate, endDate }, holidays);

                    rows.push({
                        name,
                        code,
                        category,
                        startDate,
                        endDate,
                        daysCount: calculateDays(startDate, endDate),
                        hasSurgeRate,
                        rateMultiplier,
                        minStayNights,
                        mandatoryGala: false,
                        galaDinnerFee: 0,
                        staffWageMultiplier: 2.0,
                        compOffCredit: true,
                        minimumStaffingAlert: 'STANDARD',
                        isRecurring,
                        status: 'ACTIVE',
                        description,
                        isDuplicate: dupCheck.isDuplicate,
                        duplicateReason: dupCheck.reason
                    });
                }

                if (rows.length === 0) {
                    setCsvError('No valid holiday rows with valid dates could be parsed from the CSV.');
                } else {
                    setCsvParsedRows(rows);
                }
            } catch (err: any) {
                setCsvError(`Failed to parse CSV file: ${err?.message || 'Invalid format'}`);
            }
        };
        reader.readAsText(file);
    };

    // Confirm Import from CSV with duplicate filtering
    const handleConfirmImportCSV = async () => {
        if (csvParsedRows.length === 0) return;

        const propId = currentPropertyId;
        const validRows = csvParsedRows.filter(r => !r.isDuplicate);
        const skippedCount = csvParsedRows.length - validRows.length;

        if (validRows.length === 0) {
            toast.info('All rows in the CSV already exist in your calendar. No duplicates were added.');
            return;
        }

        const res = await bulkImportHolidaysToDB(propId, validRows, true);
        if (res.success) {
            const refreshed = await fetchHolidaysFromDB(propId);
            if (Array.isArray(refreshed)) {
                setHolidays(refreshed);
            }
            setIsImportModalOpen(false);
            const skipNote = skippedCount > 0 ? ` (${skippedCount} duplicate rows were automatically skipped)` : '';
            toast.success(`Successfully imported ${res.importedCount} holidays from CSV${skipNote}.`);
        } else {
            toast.error(res.message || 'Failed to import CSV holidays.');
        }
    };

    // Toggle Live Catalog Selection
    const toggleCatalogItem = (item: ExternalCatalogItem) => {
        if (item.isDuplicate) {
            toast.info(`"${item.name}" is already in your calendar (${item.duplicateReason}).`);
            return;
        }
        setSelectedCatalogCodes(prev => {
            const next = new Set(prev);
            if (next.has(item.code)) next.delete(item.code);
            else next.add(item.code);
            return next;
        });
    };

    const handleSelectAllAvailable = () => {
        const availableCodes = externalCatalog.filter(i => !i.isDuplicate).map(i => i.code);
        setSelectedCatalogCodes(new Set(availableCodes));
    };

    const handleDeselectAllCatalog = () => {
        setSelectedCatalogCodes(new Set());
    };

    const handleSelectStatutoryOnly = () => {
        const statutoryCodes = externalCatalog.filter(i => !i.isDuplicate && i.category === 'PUBLIC').map(i => i.code);
        setSelectedCatalogCodes(new Set(statutoryCodes));
    };

    const handleSelectSurgeOnly = () => {
        const surgeCodes = externalCatalog.filter(i => !i.isDuplicate && i.hasSurgeRate).map(i => i.code);
        setSelectedCatalogCodes(new Set(surgeCodes));
    };

    // Confirm Import from Live Catalog with duplicate filtering
    const handleConfirmImportCatalog = async () => {
        if (selectedCatalogCodes.size === 0) return;

        const propId = currentPropertyId;
        const candidates = externalCatalog.filter(
            item => selectedCatalogCodes.has(item.code) && !item.isDuplicate
        );

        if (candidates.length === 0) {
            toast.info('All selected holidays already exist in the calendar. No duplicates were added.');
            return;
        }

        const res = await bulkImportHolidaysToDB(propId, candidates, true);
        if (res.success) {
            const refreshed = await fetchHolidaysFromDB(propId);
            if (Array.isArray(refreshed)) {
                setHolidays(refreshed);
            }
            if (importYear && yearFilter !== importYear && yearFilter !== 'ALL') {
                setYearFilter(importYear);
            }
            setIsImportModalOpen(false);
            toast.success(res.message || `Successfully imported ${res.importedCount} holidays for Year ${importYear}!`);
        } else {
            toast.error(res.message || 'Failed to import holidays.');
        }
    };

    // Category styling helpers
    const getCategoryBadge = (cat: HolidayCategory) => {
        switch (cat) {
            case 'PEAK_GALA':
                return {
                    label: 'Peak Gala / Surge',
                    bg: 'bg-amber-50 text-amber-800 border border-amber-200/90',
                };
            case 'RELIGIOUS':
                return {
                    label: 'Religious Festival',
                    bg: 'bg-purple-50 text-purple-800 border border-purple-200/90',
                };
            case 'PUBLIC':
                return {
                    label: 'Public Statutory',
                    bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200/90',
                };
            case 'CORPORATE':
                return {
                    label: 'Hotel Observance',
                    bg: 'bg-blue-50 text-blue-800 border border-blue-200/90',
                };
        }
    };

    return (
        <div className="p-2 sm:p-3 space-y-3 font-sans animate-in fade-in duration-200">
            {/* Standard Page Header */}
            <PageHeader
                title="Holiday & Peak Governance"
                subtitle="Statutory public holidays, high-demand peak gala dates, room rate surge multipliers & staff overtime wage rules"
                icon={<CalendarDays className="size-5 text-white" />}
                actions={
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setIsImportModalOpen(true);
                                setImportTab('api');
                                setCsvFile(null);
                                setCsvParsedRows([]);
                                setCsvError('');
                                setSelectedCatalogCodes(new Set());
                            }}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="Import holidays from live government API or CSV spreadsheet"
                        >
                            <Upload className="size-3.5 text-primary" />
                            <span>Import Holidays</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExportCSV}
                            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                            title="Export schedule to CSV file"
                        >
                            <Download className="size-3.5 text-slate-600" />
                            <span>Export CSV</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleOpenCreate}
                            className="btn-primary flex items-center gap-1.5 cursor-pointer !py-1.5 !text-xs"
                        >
                            <Plus className="size-3.5" />
                            <span>Add Holiday / Peak Day</span>
                        </button>
                    </div>
                }
            />

            {/* 4 Compact Standardized Thesis KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Calendar Holidays</span>
                        <div className="size-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold">
                            <Calendar className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{stats.total}</div>
                    <div className="mt-0.5 text-[10px] text-emerald-600 font-semibold">{stats.activeCount} Active Observances</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Surge Rate Peaks</span>
                        <div className="size-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                            <TrendingUp className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{stats.surgeDays} Days</div>
                    <div className="mt-0.5 text-[10px] text-amber-600 font-medium">Yield surge dates</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Double Wage (2x)</span>
                        <div className="size-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                            <DollarSign className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-lg font-bold text-slate-900 tracking-tight">{stats.doubleWageDays} Days</div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-medium">Overtime wage pay</div>
                </div>

                <div className="bg-white border border-slate-200/90 rounded-xl p-2.5 shadow-2xs hover:shadow-xs transition">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Next Observance</span>
                        <div className="size-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                            <Clock className="size-3.5" />
                        </div>
                    </div>
                    <div className="mt-1 text-sm font-bold text-slate-900 tracking-tight truncate max-w-[160px]">
                        {filteredHolidays[0]?.name || 'None Scheduled'}
                    </div>
                    <div className="mt-0.5 text-[10px] text-slate-400 font-medium">
                        {filteredHolidays[0]?.startDate || 'N/A'}
                    </div>
                </div>
            </div>

            {/* Standardized Compact Search & Filter Toolbar */}
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-wrap gap-2 items-center justify-between">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="size-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search holidays, codes, notes..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="input-standard pl-8.5 !h-8 !text-xs"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Year Filter */}
                    <select
                        value={yearFilter}
                        onChange={e => setYearFilter(e.target.value)}
                        className="select-standard !py-1 !h-8 !text-xs !w-auto"
                    >
                        <option value="ALL">All Years</option>
                        {rollingYears.map(yr => (
                            <option key={yr} value={String(yr)}>Year {yr}</option>
                        ))}
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={e => setCategoryFilter(e.target.value)}
                        className="select-standard !py-1 !h-8 !text-xs !w-auto"
                    >
                        <option value="ALL">All Categories</option>
                        <option value="PUBLIC">Public Statutory</option>
                        <option value="RELIGIOUS">Religious Festival</option>
                        <option value="PEAK_GALA">Peak Gala / Surcharge</option>
                        <option value="CORPORATE">Hotel Observance</option>
                    </select>

                    {/* Surge Only toggle */}
                    <button
                        type="button"
                        onClick={() => setSurgeOnly(!surgeOnly)}
                        className={`px-2.5 py-1 text-xs rounded-lg border font-semibold flex items-center gap-1.5 transition cursor-pointer h-8 ${
                            surgeOnly
                                ? 'bg-amber-50 border-amber-300 text-amber-800 shadow-2xs'
                                : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <TrendingUp className="size-3.5 text-amber-600" />
                        <span>Surge Rate Only</span>
                    </button>
                </div>
            </div>

            {/* Holidays Table Container */}
            <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse min-w-[880px]">
                        <thead>
                            <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-600 uppercase tracking-wider text-[10.5px] font-bold">
                                <th className="py-2.5 px-3 min-w-[180px]">Holiday / Event</th>
                                <th className="py-2.5 px-2.5 w-24">Code</th>
                                <th className="py-2.5 px-3 min-w-[140px]">Date Range &amp; Duration</th>
                                <th className="py-2.5 px-3 min-w-[130px]">Category</th>
                                <th className="py-2.5 px-3 min-w-[130px]">Rate &amp; MLOS</th>
                                <th className="py-2.5 px-3 min-w-[150px]">Staff Wage &amp; Duty</th>
                                <th className="py-2.5 px-2.5 text-center w-24">Status</th>
                                <th className="py-2.5 px-3 text-right w-24 whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredHolidays.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center space-y-2">
                                        <div className="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                            <Calendar className="size-5" />
                                        </div>
                                        <div className="text-xs font-semibold text-slate-700">
                                            {searchTerm || categoryFilter !== 'ALL' || surgeOnly
                                                ? 'No holidays match your filter criteria'
                                                : 'No holidays or peak days configured yet'}
                                        </div>
                                        <div className="text-[11px] text-slate-400 max-w-sm">
                                            {searchTerm || categoryFilter !== 'ALL' || surgeOnly
                                                ? 'Try adjusting your search terms or filters.'
                                                : 'Click "Add Holiday / Peak Day" to schedule holiday dates, room rate surge multipliers, and minimum stay rules.'}
                                        </div>
                                        {!searchTerm && categoryFilter === 'ALL' && !surgeOnly && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <button
                                                    type="button"
                                                    onClick={handleOpenCreate}
                                                    className="btn-primary flex items-center gap-1.5 !py-1 !px-2.5 !text-xs cursor-pointer"
                                                >
                                                    <Plus className="size-3.5" />
                                                    <span>Add First Holiday</span>
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsImportModalOpen(true);
                                                        setImportTab('api');
                                                        setCsvFile(null);
                                                        setCsvParsedRows([]);
                                                        setCsvError('');
                                                        setSelectedCatalogCodes(new Set());
                                                    }}
                                                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                                                >
                                                    <Upload className="size-3.5 text-primary" />
                                                    <span>Import Holidays</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredHolidays.map(item => {
                                const catBadge = getCategoryBadge(item.category);
                                return (
                                    <tr
                                        key={item.id}
                                        className="hover:bg-slate-50/70 transition group"
                                    >
                                        <td className="py-2 px-3">
                                            <div className="text-slate-900 font-medium">
                                                {item.name}
                                            </div>
                                            {item.description && (
                                                <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[260px]">
                                                    {item.description}
                                                </div>
                                            )}
                                        </td>

                                        <td className="py-2 px-3">
                                            <span className="badge-code text-[10px] py-0.5 px-1.5">
                                                {item.code}
                                            </span>
                                        </td>

                                        <td className="py-2 px-3">
                                            <div className="flex items-center gap-1.5 text-slate-900 font-semibold font-mono text-[11px]">
                                                <span>
                                                    {item.startDate === item.endDate
                                                        ? item.startDate
                                                        : `${item.startDate} → ${item.endDate}`}
                                                </span>
                                                {item.isRecurring && (
                                                    <span
                                                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
                                                        title="Recurs annually across all calendar years"
                                                    >
                                                        <Repeat className="size-2.5" />
                                                        <span>Annual</span>
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-medium">
                                                {item.daysCount} {item.daysCount === 1 ? 'day' : 'days duration'}
                                            </div>
                                        </td>

                                        <td className="py-2 px-3">
                                            <span
                                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${catBadge.bg}`}
                                            >
                                                {catBadge.label}
                                            </span>
                                        </td>

                                        <td className="py-2 px-3">
                                            {item.hasSurgeRate ? (
                                                <div>
                                                    <span className="text-amber-600 font-bold text-xs">
                                                        {item.rateMultiplier}x Rate (+{Math.round((item.rateMultiplier - 1) * 100)}% Surge)
                                                    </span>
                                                    <div className="text-[10px] text-slate-400 font-medium">
                                                        Min Stay: {item.minStayNights}N
                                                        {item.mandatoryGala && ` • Gala: +$${item.galaDinnerFee}`}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 font-normal text-xs">
                                                    Standard Rate (1.0x)
                                                </span>
                                            )}
                                        </td>

                                        <td className="py-2 px-3">
                                            <div className="font-semibold text-slate-800 text-xs">
                                                {item.staffWageMultiplier}x Overtime Pay
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                                                {item.compOffCredit && <span>+ Comp Off •</span>}
                                                <span className="capitalize">{item.minimumStaffingAlert.toLowerCase().replace('_', ' ')}</span>
                                            </div>
                                        </td>

                                        <td className="py-2 px-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleStatus(item.id)}
                                                className={`${item.status === 'ACTIVE' ? 'badge-status-active' : 'badge-status-inactive'} cursor-pointer text-[10px] py-0.5 px-2`}
                                            >
                                                {item.status}
                                            </button>
                                        </td>

                                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(item)}
                                                    className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition cursor-pointer"
                                                    title="Edit Holiday"
                                                >
                                                    <Edit2 size={13} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(item.id, item.name)}
                                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                                    title="Delete Holiday"
                                                >
                                                    <Trash2 size={13} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
                </div>
            </div>

            {/* Create / Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/90 bg-slate-50/70">
                            <div className="flex items-center gap-2">
                                <CalendarDays className="size-5 text-primary" />
                                <h2 className="text-base text-slate-900">
                                    {editingItem ? 'Edit Holiday / Peak Rule' : 'Add New Holiday / Peak Season'}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                            >
                                <X className="size-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {/* Holiday Name */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Holiday / Event Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. New Year Gala, Eid-ul-Fitr, Independence Day"
                                    value={formName}
                                    onChange={e => handleNameChange(e.target.value)}
                                    className="input-standard"
                                />
                            </div>

                            {/* Short Code with Auto-Generator */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-slate-700">
                                        Short Code * (Auto-Generated)
                                    </label>
                                    <button
                                        type="button"
                                        onClick={handleRegenerateCode}
                                        className="text-[11px] text-primary hover:underline flex items-center gap-1 font-semibold"
                                    >
                                        <Sparkles className="size-3" />
                                        <span>Auto-Generate</span>
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="text"
                                        required
                                        value={formCode}
                                        onChange={e => {
                                            setFormCode(e.target.value.toUpperCase());
                                            setCodeError('');
                                        }}
                                        className={`input-standard font-mono uppercase ${
                                            codeError ? 'border-rose-500 ring-1 ring-rose-500' : ''
                                        }`}
                                    />
                                </div>
                                {codeError && (
                                    <p className="text-[11px] text-rose-500 mt-1 flex items-center gap-1 font-medium">
                                        <AlertCircle className="size-3" />
                                        {codeError}
                                    </p>
                                )}
                            </div>

                            {/* Category & Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Category *
                                    </label>
                                    <select
                                        value={formCategory}
                                        onChange={e => setFormCategory(e.target.value as HolidayCategory)}
                                        className="select-standard"
                                    >
                                        <option value="PUBLIC">Public Statutory Holiday</option>
                                        <option value="RELIGIOUS">Religious Festival</option>
                                        <option value="PEAK_GALA">Peak Gala / High Season</option>
                                        <option value="CORPORATE">Hotel Corporate Observance</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Status
                                    </label>
                                    <select
                                        value={formStatus}
                                        onChange={e => setFormStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                                        className="select-standard"
                                    >
                                        <option value="ACTIVE">Active</option>
                                        <option value="INACTIVE">Inactive / Archived</option>
                                    </select>
                                </div>
                            </div>

                            {/* Dates: Start and End */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formStartDate}
                                        onChange={e => {
                                            setFormStartDate(e.target.value);
                                            if (!formEndDate || formEndDate < e.target.value) {
                                                setFormEndDate(e.target.value);
                                            }
                                        }}
                                        className="input-standard font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-xs font-semibold text-slate-700">
                                        End Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={formEndDate}
                                        min={formStartDate}
                                        onChange={e => setFormEndDate(e.target.value)}
                                        className="input-standard font-mono"
                                    />
                                </div>
                            </div>

                            {/* Annual Recurrence Toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/90 rounded-xl">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                                        <Repeat className="size-4" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold text-slate-800">Recurs Annually</div>
                                        <div className="text-[11px] text-slate-500">Automatically applies to this date across all years (2026, 2027, 2028+) in StayView and bookings</div>
                                    </div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formIsRecurring}
                                        onChange={e => setFormIsRecurring(e.target.checked)}
                                        className="size-4 text-primary focus:ring-primary rounded cursor-pointer"
                                    />
                                </label>
                            </div>

                            {/* 3-Pillar Unified Holiday Commercial Governance */}
                            <div className="p-4 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-4">
                                <div className="flex items-center justify-between border-b border-amber-200/60 pb-2.5">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-4 text-amber-700" />
                                        <div>
                                            <span className="text-xs font-bold text-amber-900 block">
                                                3-Pillar Holiday Commercial & Yield Rules
                                            </span>
                                            <span className="text-[11px] text-amber-700">
                                                Occupancy restrictions, extra bed policies, and surge pricing
                                            </span>
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                                        <input
                                            type="checkbox"
                                            checked={formHasSurgeRate}
                                            onChange={e => setFormHasSurgeRate(e.target.checked)}
                                            className="rounded text-amber-600 focus:ring-amber-500 size-3.5"
                                        />
                                        <span className="text-xs font-bold text-amber-900">
                                            Enable Holiday Surge
                                        </span>
                                    </label>
                                </div>

                                {formHasSurgeRate && (
                                    <div className="space-y-4 pt-1">
                                        {/* Pillar 1: Occupancy & Min-Stay Restrictions */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-slate-800">
                                                <Users className="size-3.5 text-amber-700" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                                                    Pillar 1: Occupancy & Restrictions
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-amber-200/80">
                                                <div className="space-y-1">
                                                    <label className="block text-[11px] font-semibold text-slate-700">
                                                        Min Stay (MLOS Nights)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        max="7"
                                                        value={formMinStayNights}
                                                        onChange={e => setFormMinStayNights(parseInt(e.target.value) || 1)}
                                                        className="input-standard !py-1.5 bg-slate-50"
                                                    />
                                                    <p className="text-[10px] text-slate-400">Minimum consecutive nights required</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <label className="text-[11px] font-semibold text-slate-700">
                                                            Mandatory Gala Dinner
                                                        </label>
                                                        <input 
                                                            type="checkbox"
                                                            checked={formMandatoryGala}
                                                            onChange={e => setFormMandatoryGala(e.target.checked)}
                                                            className="rounded text-amber-600 size-3.5"
                                                        />
                                                    </div>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                                                        <input
                                                            type="number"
                                                            disabled={!formMandatoryGala}
                                                            value={formGalaFee}
                                                            onChange={e => setFormGalaFee(parseFloat(e.target.value) || 0)}
                                                            placeholder="0"
                                                            className={`input-standard pl-7 !py-1.5 font-mono ${!formMandatoryGala ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400">Mandatory per-occupant festival meal fee</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pillar 2: Extra Bedding Holiday Policy */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-slate-800">
                                                <BedDouble className="size-3.5 text-amber-700" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                                                    Pillar 2: Extra Bedding Holiday Policy
                                                </span>
                                            </div>
                                            <div className="p-3 bg-white rounded-xl border border-amber-200/80 grid grid-cols-2 gap-3 items-center">
                                                <div className="space-y-0.5">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formExtraBedAllowed}
                                                            onChange={e => setFormExtraBedAllowed(e.target.checked)}
                                                            className="rounded text-amber-600 size-3.5"
                                                        />
                                                        <span className="text-xs font-semibold text-slate-800">
                                                            Allow Extra Beds in Holiday?
                                                        </span>
                                                    </label>
                                                    <p className="text-[10px] text-slate-500 pl-5">
                                                        {formExtraBedAllowed ? 'Extra rollaway beds can be booked' : 'Prohibited during holiday peak'}
                                                    </p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[11px] font-semibold text-slate-700">
                                                        Holiday Extra Bed Tariff ({currencySymbol})
                                                    </label>
                                                    <div className="relative">
                                                        <span className="absolute left-2.5 top-1.5 text-slate-400 font-bold text-xs">{currencySymbol}</span>
                                                        <input
                                                            type="number"
                                                            disabled={!formExtraBedAllowed}
                                                            value={formExtraBedHolidayFee}
                                                            onChange={e => setFormExtraBedHolidayFee(parseFloat(e.target.value) || 0)}
                                                            className={`input-standard pl-7 !py-1.5 font-mono ${!formExtraBedAllowed ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white'}`}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pillar 3: Base Pricing & Holiday Surcharges */}
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-1.5 text-slate-800">
                                                <DollarSign className="size-3.5 text-amber-700" />
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                                                    Pillar 3: Base Pricing & Holiday Surcharges
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2.5 bg-white p-3 rounded-xl border border-amber-200/80">
                                                <div className="space-y-1">
                                                    <label className="block text-[10.5px] font-semibold text-slate-700">
                                                        Base Multiplier
                                                    </label>
                                                    <input
                                                        type="number"
                                                        step="0.05"
                                                        min="1.0"
                                                        max="3.0"
                                                        value={formRateMultiplier}
                                                        onChange={e => setFormRateMultiplier(parseFloat(e.target.value) || 1.0)}
                                                        className="input-standard !py-1.5 font-mono font-bold"
                                                    />
                                                    <p className="text-[10px] text-slate-400">e.g. 1.30 = +30%</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10.5px] font-semibold text-slate-700">
                                                        Extra Adult ({currencySymbol})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formExtraAdultHolidayFee}
                                                        onChange={e => setFormExtraAdultHolidayFee(parseFloat(e.target.value) || 0)}
                                                        className="input-standard !py-1.5 font-mono"
                                                    />
                                                    <p className="text-[10px] text-slate-400">Holiday adult fee</p>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="block text-[10.5px] font-semibold text-slate-700">
                                                        Extra Child ({currencySymbol})
                                                    </label>
                                                    <input
                                                        type="number"
                                                        value={formExtraChildHolidayFee}
                                                        onChange={e => setFormExtraChildHolidayFee(parseFloat(e.target.value) || 0)}
                                                        className="input-standard !py-1.5 font-mono"
                                                    />
                                                    <p className="text-[10px] text-slate-400">Holiday child fee</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Staffing & HR Compensation Section */}
                            <div className="p-3.5 bg-blue-50/70 border border-blue-200/90 rounded-xl space-y-3">
                                <div className="flex items-center gap-2">
                                    <Users className="size-4 text-primary" />
                                    <span className="text-xs text-slate-900">
                                        Staff Overtime & Statutory Rules
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-slate-700">
                                            Overtime Wage Multiplier
                                        </label>
                                        <select
                                            value={formWageMultiplier}
                                            onChange={e => setFormWageMultiplier(parseFloat(e.target.value))}
                                            className="select-standard !py-1.5"
                                        >
                                            <option value="1.0">1.0x (Standard Wage)</option>
                                            <option value="1.5">1.5x (Time and a Half)</option>
                                            <option value="2.0">2.0x (Double Time / Statutory)</option>
                                            <option value="2.5">2.5x (Premium Holiday Rate)</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="block text-[11px] font-semibold text-slate-700">
                                            Staffing Alert Level
                                        </label>
                                        <select
                                            value={formStaffingAlert}
                                            onChange={e =>
                                                setFormStaffingAlert(
                                                    e.target.value as 'STANDARD' | 'HIGH_ALERT' | 'MAX_PRESENCE'
                                                )
                                            }
                                            className="select-standard !py-1.5"
                                        >
                                            <option value="STANDARD">Standard Shift</option>
                                            <option value="HIGH_ALERT">High Alert (No Leaves)</option>
                                            <option value="MAX_PRESENCE">Maximum Presence Required</option>
                                        </select>
                                    </div>
                                </div>

                                <label className="flex items-center gap-2 cursor-pointer pt-1">
                                    <input
                                        type="checkbox"
                                        checked={formCompOff}
                                        onChange={e => setFormCompOff(e.target.checked)}
                                        className="rounded text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs text-slate-700 font-medium">
                                        Grant 1-Day Compensatory Off (Comp-off) Credit to working roster staff
                                    </span>
                                </label>
                            </div>

                            {/* Description / Notes */}
                            <div className="space-y-1.5">
                                <label className="block text-xs font-semibold text-slate-700">
                                    Operational Notes / Guidelines
                                </label>
                                <textarea
                                    rows={2}
                                    placeholder="Enter guidelines, protocol requirements, or banqueting arrangements..."
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    className="input-standard"
                                />
                            </div>

                            {/* Modal Footer Buttons */}
                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200/90">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary flex items-center gap-1.5"
                                >
                                    <Save className="size-4" />
                                    <span>{editingItem ? 'Save Changes' : 'Create Holiday'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Holidays Modal (Live Government & Festival API + CSV) */}
            {isImportModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-5 py-3.5 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Globe className="size-5" />
                                </div>
                                <div>
                                    <h2 className="text-base font-bold text-slate-900">Import Holiday Calendar</h2>
                                    <p className="text-xs text-slate-500">
                                        Import official statutory holidays and peak festival seasons by year from live official API
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsImportModalOpen(false)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div className="flex items-center border-b border-slate-200 px-5 pt-2 bg-slate-50/50 gap-4">
                            <button
                                type="button"
                                onClick={() => setImportTab('api')}
                                className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    importTab === 'api'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <Globe className="size-3.5" />
                                <span>Live Govt & Festival API</span>
                                <span className="px-1.5 py-0.2 rounded text-[9.5px] bg-emerald-100 text-emerald-800 font-semibold">Live</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setImportTab('csv')}
                                className={`pb-2 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition cursor-pointer ${
                                    importTab === 'csv'
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <FileSpreadsheet className="size-3.5" />
                                <span>Upload CSV Spreadsheet</span>
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-5 flex-1 overflow-y-auto space-y-4">
                            {importTab === 'api' ? (
                                <div className="space-y-3.5">
                                    {/* Top Control Bar: Target Year & Country Selectors */}
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            {/* Target Year Selector */}
                                            <div className="flex items-center gap-1.5">
                                                <label className="text-[11px] font-semibold text-slate-600">Target Year:</label>
                                                <select
                                                    value={importYear}
                                                    onChange={e => setImportYear(e.target.value)}
                                                    className="select-standard !py-1 !h-8 !text-xs !w-24 font-bold bg-white"
                                                >
                                                    {rollingYears.map(yr => (
                                                        <option key={yr} value={String(yr)}>{yr}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Searchable Country Selector (All 215+ Sovereign Countries & Territories) */}
                                            <div className="flex items-center gap-1.5 flex-1 min-w-[240px]">
                                                <label className="text-[11px] font-semibold text-slate-600 shrink-0">Country:</label>
                                                <div className="flex-1 min-w-[200px]">
                                                    <SearchableSelect
                                                        value={importCountry}
                                                        onChange={val => setImportCountry(val)}
                                                        options={countryOptions}
                                                        placeholder="Search country..."
                                                        searchPlaceholder="Search 215+ countries..."
                                                        compact
                                                        className="!h-8 !text-xs font-semibold"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>Live Govt API</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => loadExternalCatalog(importYear, importCountry)}
                                                disabled={isCatalogLoading}
                                                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition cursor-pointer"
                                                title="Reload live catalog"
                                            >
                                                <RefreshCw className={`size-3.5 ${isCatalogLoading ? 'animate-spin text-primary' : ''}`} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sub-header Filter & Deduplication Notice Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-slate-700">
                                                {externalCatalog.length} observances found for {importYear}
                                            </span>
                                            {externalCatalog.some(i => i.isDuplicate) && (
                                                <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                                                    <ShieldCheck className="size-3 text-emerald-600" />
                                                    <span>{externalCatalog.filter(i => i.isDuplicate).length} already configured (prevented)</span>
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-[11px]">
                                            <button
                                                type="button"
                                                onClick={handleSelectAllAvailable}
                                                className="text-primary hover:underline font-semibold cursor-pointer"
                                            >
                                                Select Available
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={handleDeselectAllCatalog}
                                                className="text-slate-500 hover:underline font-semibold cursor-pointer"
                                            >
                                                Deselect All
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={handleSelectStatutoryOnly}
                                                className="text-slate-500 hover:underline font-semibold cursor-pointer"
                                            >
                                                Statutory Only
                                            </button>
                                            <span className="text-slate-300">|</span>
                                            <button
                                                type="button"
                                                onClick={handleSelectSurgeOnly}
                                                className="text-slate-500 hover:underline font-semibold cursor-pointer"
                                            >
                                                Surge Only
                                            </button>
                                        </div>
                                    </div>

                                    {/* Catalog Items List with Strict Duplicate Prevention */}
                                    {isCatalogLoading ? (
                                        <div className="py-12 text-center text-slate-500">
                                            <RefreshCw className="size-6 text-primary animate-spin mx-auto mb-2" />
                                            <div className="text-xs font-semibold text-slate-700">Fetching official public holidays for {importCountry} ({importYear})...</div>
                                            <div className="text-[11px] text-slate-400 mt-0.5">Connecting to official live government registry</div>
                                        </div>
                                    ) : externalCatalog.length === 0 ? (
                                        <div className="py-10 text-center text-slate-400 text-xs">
                                            No holiday records found for {importCountry} in {importYear}.
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                                            {externalCatalog.map((item) => {
                                                const isDuplicate = item.isDuplicate;
                                                const isChecked = selectedCatalogCodes.has(item.code);

                                                return (
                                                    <div
                                                        key={item.code}
                                                        onClick={() => toggleCatalogItem(item)}
                                                        className={`p-2.5 flex items-center justify-between gap-3 transition ${
                                                            isDuplicate
                                                                ? 'bg-slate-50/80 cursor-not-allowed opacity-80'
                                                                : isChecked
                                                                ? 'bg-primary/5 cursor-pointer hover:bg-primary/10'
                                                                : 'hover:bg-slate-50 cursor-pointer'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-2.5 min-w-0">
                                                            <input
                                                                type="checkbox"
                                                                checked={isDuplicate ? false : isChecked}
                                                                disabled={isDuplicate}
                                                                onChange={() => {}}
                                                                className={`size-4 rounded ${
                                                                    isDuplicate
                                                                        ? 'text-slate-300 bg-slate-100 border-slate-300 cursor-not-allowed'
                                                                        : 'text-primary focus:ring-primary cursor-pointer'
                                                                }`}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 flex-wrap">
                                                                    <span>{item.name}</span>
                                                                    {item.localName && item.localName !== item.name && (
                                                                        <span className="text-[10px] text-slate-400 font-normal">
                                                                            ({item.localName})
                                                                        </span>
                                                                    )}
                                                                    {item.isRecurring && (
                                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 font-normal">
                                                                            Annual
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                                    {item.startDate} {item.startDate !== item.endDate ? `→ ${item.endDate}` : ''} ({item.daysCount}d)
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="text-right text-[11px] shrink-0">
                                                            {isDuplicate ? (
                                                                <div>
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-700 border border-slate-300/80">
                                                                        <CheckCircle2 className="size-3 text-slate-500" />
                                                                        <span>Already Added</span>
                                                                    </span>
                                                                    <div className="text-[9.5px] text-slate-400 mt-0.5 max-w-[150px] truncate" title={item.duplicateReason}>
                                                                        {item.duplicateReason || 'Already in calendar'}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div>
                                                                    {item.hasSurgeRate ? (
                                                                        <span className="font-semibold text-amber-600">
                                                                            {item.rateMultiplier}x Surge
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-slate-400">Standard</span>
                                                                    )}
                                                                    <div className="text-slate-400 text-[10px]">
                                                                        Min Stay: {item.minStayNights}N
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Download Template Box */}
                                    <div className="flex items-center justify-between p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl">
                                        <div>
                                            <div className="text-xs font-semibold text-blue-900">Need the standard spreadsheet format?</div>
                                            <div className="text-[11px] text-blue-700">Download the formatted CSV template with required columns and example data.</div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleDownloadTemplate}
                                            className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Download className="size-3.5" />
                                            <span>Download Template</span>
                                        </button>
                                    </div>

                                    {/* File Upload Drop Area */}
                                    <div className="border-2 border-dashed border-slate-200 hover:border-primary/50 rounded-xl p-6 text-center transition bg-slate-50/50">
                                        <Upload className="size-8 text-slate-400 mx-auto mb-2" />
                                        <div className="text-xs font-semibold text-slate-800">
                                            {csvFile ? csvFile.name : 'Choose a CSV file to upload'}
                                        </div>
                                        <div className="text-[11px] text-slate-500 mt-0.5">
                                            Supports .csv files up to 5 MB
                                        </div>
                                        <label className="mt-3 inline-block">
                                            <span className="btn-secondary !text-xs !py-1.5 !px-3 cursor-pointer">
                                                Browse File
                                            </span>
                                            <input
                                                type="file"
                                                accept=".csv,text/csv"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    {csvError && (
                                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                                            <AlertCircle className="size-4 shrink-0" />
                                            <span>{csvError}</span>
                                        </div>
                                    )}

                                    {/* Parsed Rows Preview with Duplicate Badges */}
                                    {csvParsedRows.length > 0 && (
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-semibold text-slate-700">
                                                    Parsed Preview ({csvParsedRows.length} Holidays found)
                                                </span>
                                                <span className="text-[11px] text-slate-500">
                                                    {csvParsedRows.filter(r => !r.isDuplicate).length} new • {csvParsedRows.filter(r => r.isDuplicate).length} duplicates skipped
                                                </span>
                                            </div>
                                            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg">
                                                <table className="w-full text-left text-xs border-collapse">
                                                    <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
                                                        <tr>
                                                            <th className="py-1.5 px-2.5">Name</th>
                                                            <th className="py-1.5 px-2.5">Code</th>
                                                            <th className="py-1.5 px-2.5">Dates</th>
                                                            <th className="py-1.5 px-2.5">Surge</th>
                                                            <th className="py-1.5 px-2.5">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100 text-[11px]">
                                                        {csvParsedRows.map((row, idx) => (
                                                            <tr key={idx} className={row.isDuplicate ? 'bg-amber-50/40 text-slate-500' : 'hover:bg-slate-50'}>
                                                                <td className="py-1.5 px-2.5 font-medium text-slate-800">{row.name}</td>
                                                                <td className="py-1.5 px-2.5 font-mono text-slate-600">{row.code}</td>
                                                                <td className="py-1.5 px-2.5 text-slate-600">{row.startDate} {row.startDate !== row.endDate ? `→ ${row.endDate}` : ''}</td>
                                                                <td className="py-1.5 px-2.5">
                                                                    {row.hasSurgeRate ? (
                                                                        <span className="text-amber-600 font-semibold">{row.rateMultiplier}x</span>
                                                                    ) : (
                                                                        <span className="text-slate-400">1.0x</span>
                                                                    )}
                                                                </td>
                                                                <td className="py-1.5 px-2.5">
                                                                    {row.isDuplicate ? (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                                                            Duplicate (Skip)
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            New (Ready)
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between bg-slate-50/50">
                            <span className="text-xs text-slate-500">
                                {importTab === 'csv'
                                    ? `${csvParsedRows.filter(r => !r.isDuplicate).length} new entries ready (${csvParsedRows.filter(r => r.isDuplicate).length} duplicates skipped)`
                                    : `${selectedCatalogCodes.size} holidays selected for Year ${importYear}`}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsImportModalOpen(false)}
                                    className="btn-secondary !text-xs !py-1.5"
                                >
                                    Cancel
                                </button>
                                {importTab === 'csv' ? (
                                    <button
                                        type="button"
                                        disabled={csvParsedRows.filter(r => !r.isDuplicate).length === 0}
                                        onClick={handleConfirmImportCSV}
                                        className="btn-primary !text-xs !py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Import {csvParsedRows.filter(r => !r.isDuplicate).length} Holidays
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        disabled={selectedCatalogCodes.size === 0 || isCatalogLoading}
                                        onClick={handleConfirmImportCatalog}
                                        className="btn-primary !text-xs !py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Import Selected ({selectedCatalogCodes.size})
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
