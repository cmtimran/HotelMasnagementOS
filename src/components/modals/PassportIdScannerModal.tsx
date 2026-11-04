import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Camera,
    UploadCloud,
    FileText,
    CheckCircle2,
    AlertTriangle,
    ShieldCheck,
    X,
    RefreshCw,
    User,
    Lock,
    Sparkles
} from 'lucide-react';
import {
    runTesseractOcr,
    parseUniversalIdentityDocument,
    type ParsedIdentityDocument
} from '../../utils/universalIdParser';
import { parseTD3, parseTD1 } from '../../utils/mrzParser';
import { getApiBaseUrl } from '../../utils/apiUrl';
import { getCurrencySymbol } from '../../utils/currencyUtils';

interface PassportIdScannerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onProfileResolved?: (guest: any, isNew: boolean) => void;
    reservationId?: string | number;
    reservationNumber?: string;
}

export const PassportIdScannerModal: React.FC<PassportIdScannerModalProps> = ({
    isOpen,
    onClose,
    onProfileResolved,
    reservationId,
    reservationNumber
}) => {
    const currency = getCurrencySymbol();
    const [scanMode, setScanMode] = useState<'camera' | 'upload' | 'sample'>('upload');
    const [isScanning, setIsScanning] = useState(false);
    const [ocrProgress, setOcrProgress] = useState<string>('');
    const [parsedDoc, setParsedDoc] = useState<ParsedIdentityDocument | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [guestPhone, setGuestPhone] = useState<string>('');

    // Camera Stream States
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);

    // Matching & Deduplication States
    const [isLookingUp, setIsLookingUp] = useState(false);
    const [matchedGuest, setMatchedGuest] = useState<any | null>(null);
    const [matchType, setMatchType] = useState<'EXACT_ID' | 'PHONE' | 'DEMOGRAPHICS' | 'NONE'>('NONE');
    const [actionLoading, setActionLoading] = useState(false);
    const [statusToast, setStatusToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Stop camera stream cleanly
    const stopCamera = useCallback(() => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
    }, [cameraStream]);

    // Start camera stream when camera mode is active
    useEffect(() => {
        if (isOpen && scanMode === 'camera') {
            setCameraError(null);
            navigator.mediaDevices?.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            }).then(stream => {
                setCameraStream(stream);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }).catch(err => {
                setCameraError('Camera access denied or unavailable: ' + (err.message || 'Check browser permissions.'));
            });
        } else {
            stopCamera();
        }

        return () => {
            stopCamera();
        };
    }, [isOpen, scanMode, stopCamera]);

    // Reset when closed
    useEffect(() => {
        if (!isOpen) {
            stopCamera();
            setParsedDoc(null);
            setMatchedGuest(null);
            setCapturedImage(null);
            setStatusToast(null);
        }
    }, [isOpen, stopCamera]);

    // Query backend for existing profile match by document number & demographics
    const lookupExistingProfile = async (doc: ParsedIdentityDocument) => {
        setIsLookingUp(true);
        setMatchedGuest(null);
        setMatchType('NONE');

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/guests/lookup-by-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    documentNumber: doc.documentNumber,
                    documentType: doc.documentType,
                    fullName: doc.fullName,
                    dob: doc.dateOfBirth,
                    nationality: doc.nationalityName
                })
            });
            const data = await res.json();
            if (data?.success && data?.guest) {
                setMatchedGuest(data.guest);
                setMatchType(data.matchType);
                if (data.guest.phone) setGuestPhone(data.guest.phone);
            } else {
                setMatchedGuest(null);
                setMatchType('NONE');
            }
        } catch {
            setMatchedGuest(null);
            setMatchType('NONE');
        } finally {
            setIsLookingUp(false);
        }
    };

    // Camera Capture Handler
    const handleCaptureCamera = async () => {
        if (!videoRef.current) return;
        setIsScanning(true);
        setOcrProgress('Capturing camera frame...');

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth || 1280;
        canvas.height = videoRef.current.videoHeight || 720;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            setCapturedImage(dataUrl);

            try {
                setOcrProgress('Running Universal Document OCR engine...');
                const extractedText = await runTesseractOcr(dataUrl, (pct, status) => {
                    setOcrProgress(`${status} (${pct}%)`);
                });

                setOcrProgress('Dynamically parsing identity fields...');
                const doc = parseUniversalIdentityDocument(extractedText);
                setParsedDoc(doc);
                setIsScanning(false);
                setOcrProgress('');
                lookupExistingProfile(doc);
            } catch (err: any) {
                setIsScanning(false);
                setOcrProgress('');
                setStatusToast({
                    type: 'error',
                    text: 'OCR error: ' + (err?.message || 'Could not recognize document.')
                });
            }
        }
    };

    // Universal File Processor (handles both Browse and Drag & Drop)
    const processFile = (file: File) => {
        if (!file) return;

        setIsScanning(true);
        setOcrProgress('Reading uploaded document image...');

        const reader = new FileReader();
        reader.onload = async () => {
            const dataUrl = reader.result as string;
            setCapturedImage(dataUrl);

            try {
                setOcrProgress('Running Universal Document OCR engine...');
                const extractedText = await runTesseractOcr(file, (pct, status) => {
                    setOcrProgress(`${status} (${pct}%)`);
                });

                setOcrProgress('Dynamically parsing identity fields...');
                const doc = parseUniversalIdentityDocument(extractedText);
                setParsedDoc(doc);
                setIsScanning(false);
                setOcrProgress('');
                lookupExistingProfile(doc);
            } catch (err: any) {
                setIsScanning(false);
                setOcrProgress('');
                setStatusToast({
                    type: 'error',
                    text: 'OCR error: ' + (err?.message || 'Could not recognize document text.')
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleFileDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    // Fast Preset Samples
    const handleLoadSample = (type: 'robert' | 'anis' | 'nid_smart' | 'uk_passport') => {
        setIsScanning(true);
        setTimeout(() => {
            let doc: ParsedIdentityDocument | null = null;
            if (type === 'robert') {
                doc = parseTD3(
                    'P<BGDLANGDON<<ROBERT<<<<<<<<<<<<<<<<<<<<<<<',
                    'A049281721BGD8806154M3209205<<<<<<<<<<<<<<4'
                );
            } else if (type === 'anis') {
                doc = parseTD3(
                    'P<BGDRAHMAN<<ANISUR<<<<<<<<<<<<<<<<<<<<<<<<',
                    'B098412563BGD9011248M3012156<<<<<<<<<<<<<<2'
                );
            } else if (type === 'nid_smart') {
                doc = parseTD1(
                    'I<BGD5918239014<<<<<<<<<<<<<<',
                    '8504126M3012318BGD<<<<<<<<<<<',
                    'CHOWDHURY<<TANVIR<AHMED<<<<<<<'
                );
            } else {
                doc = parseTD3(
                    'P<GBRPRICE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<',
                    '9482103457GBR7903254M2803251<<<<<<<<<<<<<<6'
                );
            }

            setParsedDoc(doc);
            setIsScanning(false);
            lookupExistingProfile(doc);
        }, 300);
    };

    // Action: Attach Existing Profile to Stay
    const handleAttachExisting = async () => {
        if (!matchedGuest) return;
        setActionLoading(true);

        try {
            // Update reservation with existing guest ID
            if (reservationNumber || reservationId) {
                const res = await fetch(`${getApiBaseUrl()}/api/guests/scan-auto-create-or-update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'UPDATE_EXISTING',
                        guestId: matchedGuest.id,
                        reservationNumber: reservationNumber || reservationId,
                        documentData: {
                            idNumber: parsedDoc?.documentNumber,
                            idExpiryDate: parsedDoc?.expiryDate,
                            passportVisaNumber: parsedDoc?.documentNumber,
                            phone: guestPhone.trim() || undefined
                        }
                    })
                });
                const data = await res.json();
                if (!data?.success) {
                    throw new Error(data?.error || 'Failed to attach existing guest');
                }
            }

            setStatusToast({
                type: 'success',
                text: `Attached profile of ${matchedGuest.name} to this reservation!`
            });

            if (onProfileResolved) {
                onProfileResolved(matchedGuest, false);
            }
            setTimeout(() => onClose(), 800);
        } catch (e: any) {
            setStatusToast({ type: 'error', text: e?.message || 'Failed to attach guest profile' });
        } finally {
            setActionLoading(false);
        }
    };

    // Action: Create New Guest Profile from Scanned Document
    const handleCreateNewProfile = async () => {
        if (!parsedDoc) return;
        setActionLoading(true);

        try {
            const res = await fetch(`${getApiBaseUrl()}/api/guests/scan-auto-create-or-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'CREATE',
                    reservationNumber: reservationNumber || reservationId,
                    documentData: {
                        salutation: parsedDoc.gender === 'Female' ? 'Ms' : 'Mr',
                        firstName: parsedDoc.givenNames || parsedDoc.fullName.split(' ')[0],
                        lastName: parsedDoc.surname || parsedDoc.fullName.split(' ').slice(1).join(' '),
                        fullName: parsedDoc.fullName,
                        idType: parsedDoc.documentType,
                        idNumber: parsedDoc.documentNumber,
                        nationality: parsedDoc.nationalityName,
                        dob: parsedDoc.dateOfBirth,
                        gender: parsedDoc.gender,
                        idExpiryDate: parsedDoc.expiryDate,
                        idIssueCountry: parsedDoc.issuingCountryName,
                        phone: guestPhone.trim() || undefined
                    }
                })
            });

            const data = await res.json();
            if (data?.success) {
                const isExisting = Boolean(data.isExisting);
                setStatusToast({
                    type: 'success',
                    text: isExisting
                        ? `Linked existing verified profile #${data.guest?.id || ''} (${data.guest?.fullName || ''}) to stay!`
                        : `Created new guest profile #${data.guest?.id || ''} and linked to stay!`
                });

                if (onProfileResolved) {
                    onProfileResolved(data.guest, !isExisting);
                }
                setTimeout(() => onClose(), 800);
            } else {
                setStatusToast({ type: 'error', text: data?.error || 'Failed to process profile' });
            }
        } catch (e: any) {
            setStatusToast({ type: 'error', text: e?.message || 'Error processing profile' });
        } finally {
            setActionLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 select-none animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-gray-800">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white px-5 py-3 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-blue-200 border border-white/20">
                            <ShieldCheck size={18} />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold tracking-wide flex items-center gap-2">
                                <span>Passport &amp; ID Card Auto-Scanner</span>
                                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/30 font-medium">
                                    ICAO 9303 &bull; Auto-Deduplication
                                </span>
                            </h2>
                            <p className="text-[11px] text-blue-200/80">
                                Scan travel documents to auto-populate guest profiles and detect returning guests in real-time.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Sub-Header Mode Tabs */}
                <div className="bg-slate-100 border-b border-gray-200 px-5 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setScanMode('camera')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                scanMode === 'camera'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-gray-700 hover:bg-gray-200/70 border border-gray-300'
                            }`}
                        >
                            <Camera size={14} />
                            <span>Live Camera Viewfinder</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setScanMode('upload')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                scanMode === 'upload'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-gray-700 hover:bg-gray-200/70 border border-gray-300'
                            }`}
                        >
                            <UploadCloud size={14} />
                            <span>Upload Scan / Photo</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setScanMode('sample')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                scanMode === 'sample'
                                    ? 'bg-blue-600 text-white shadow-xs'
                                    : 'bg-white text-gray-700 hover:bg-gray-200/70 border border-gray-300'
                            }`}
                        >
                            <Sparkles size={14} />
                            <span>Fast Demo Presets</span>
                        </button>
                    </div>

                    {reservationNumber && (
                        <div className="text-xs text-gray-500 font-mono">
                            Target Stay: <strong className="text-gray-800">{reservationNumber}</strong>
                        </div>
                    )}
                </div>

                {/* Toast Notification */}
                {statusToast && (
                    <div className={`mx-5 mt-3 p-2.5 rounded-lg text-xs font-medium flex items-center justify-between shadow-xs ${
                        statusToast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                        <div className="flex items-center gap-2">
                            {statusToast.type === 'success' ? <CheckCircle2 size={15} className="text-emerald-600" /> : <AlertTriangle size={15} className="text-rose-600" />}
                            <span>{statusToast.text}</span>
                        </div>
                        <button type="button" onClick={() => setStatusToast(null)} className="text-gray-400 hover:text-gray-700 text-xs">✕</button>
                    </div>
                )}

                {/* Main Body */}
                <div className="flex-1 p-5 overflow-y-auto space-y-4">
                    {/* INPUT SECTION */}
                    {scanMode === 'camera' && (
                        <div className="bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center relative min-h-[260px] overflow-hidden">
                            {cameraError ? (
                                <div className="text-center text-rose-300 text-xs p-4 space-y-2">
                                    <AlertTriangle size={24} className="mx-auto text-rose-400" />
                                    <p>{cameraError}</p>
                                    <button
                                        type="button"
                                        onClick={() => setScanMode('sample')}
                                        className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs"
                                    >
                                        Use Demo Samples Instead
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="rounded-lg max-h-[240px] w-auto object-contain"
                                    />
                                    {/* MRZ Alignment Overlay Box */}
                                    <div className="absolute inset-x-12 bottom-6 h-20 border-2 border-emerald-400/80 rounded-lg pointer-events-none flex flex-col justify-between p-1 bg-emerald-500/5">
                                        <span className="text-[10px] text-emerald-300 font-mono text-center uppercase tracking-wider">
                                            Align Passport MRZ Lines Here
                                        </span>
                                        <div className="border-b border-dashed border-emerald-400/60" />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleCaptureCamera}
                                        disabled={isScanning}
                                        className="mt-3 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                                    >
                                        {isScanning ? <RefreshCw size={14} className="animate-spin" /> : <Camera size={14} />}
                                        <span>Capture &amp; Process Document</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {scanMode === 'upload' && parsedDoc && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            className={`border border-dashed rounded-lg px-3 py-1.5 flex items-center justify-between text-xs transition-all ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-400/30'
                                    : 'border-gray-300 hover:border-blue-400 bg-slate-50/70 hover:bg-blue-50/30'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <UploadCloud size={12} />
                                </div>
                                <span className="text-[11px] text-gray-600 truncate">
                                    Document parsed. Drag &amp; drop another photo or click to re-scan.
                                </span>
                            </div>
                            <label className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-400 rounded text-[11px] font-semibold cursor-pointer shadow-2xs transition-colors shrink-0">
                                <span>Change / Re-upload File</span>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    )}

                    {scanMode === 'upload' && !parsedDoc && (
                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleFileDrop}
                            className={`border-2 border-dashed rounded-xl px-4 py-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-3 text-left transition-all ${
                                isDragging
                                    ? 'border-blue-500 bg-blue-100/60 ring-2 ring-blue-400/40'
                                    : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50/60'
                            } shadow-2xs`}
                        >
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <UploadCloud size={18} />
                                </div>
                                <div>
                                    <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                                        <span>Drag &amp; drop Passport or ID Card image</span>
                                        <span className="text-[9.5px] text-blue-700 bg-blue-100/80 px-1.5 py-0.5 rounded font-semibold">
                                            All Countries
                                        </span>
                                    </h4>
                                    <p className="text-[10px] text-gray-500 mt-0.5">
                                        Supports NID, Smart Card, Passport, Driver's License &bull; JPG, PNG, WEBP, PDF (Max 10MB)
                                    </p>
                                </div>
                            </div>
                            <label className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs cursor-pointer shadow-xs transition-colors shrink-0 flex items-center gap-1.5">
                                <UploadCloud size={12} />
                                <span>Browse Files</span>
                                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                            </label>
                        </div>
                    )}

                    {scanMode === 'sample' && (
                        <div className="space-y-2">
                            <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Click a Pre-configured Document to Test Instant Scan &amp; Match:
                            </span>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleLoadSample('robert')}
                                    className="p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
                                >
                                    <div className="text-[10px] font-bold text-blue-600 uppercase">Existing In-House</div>
                                    <div className="text-xs font-bold text-gray-900 mt-0.5">Robert Langdon</div>
                                    <div className="text-[10px] text-gray-500 font-mono">Passport: A04928172 (BGD)</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleLoadSample('anis')}
                                    className="p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
                                >
                                    <div className="text-[10px] font-bold text-emerald-600 uppercase">New VIP Guest</div>
                                    <div className="text-xs font-bold text-gray-900 mt-0.5">Anisur Rahman</div>
                                    <div className="text-[10px] text-gray-500 font-mono">Passport: B09841256 (BGD)</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleLoadSample('nid_smart')}
                                    className="p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
                                >
                                    <div className="text-[10px] font-bold text-purple-600 uppercase">Smart National ID</div>
                                    <div className="text-xs font-bold text-gray-900 mt-0.5">Tanvir Chowdhury</div>
                                    <div className="text-[10px] text-gray-500 font-mono">NID: 5918239014 (TD1)</div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => handleLoadSample('uk_passport')}
                                    className="p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-400 rounded-xl text-left transition-all shadow-2xs group cursor-pointer"
                                >
                                    <div className="text-[10px] font-bold text-indigo-600 uppercase">International Guest</div>
                                    <div className="text-xs font-bold text-gray-900 mt-0.5">John Price</div>
                                    <div className="text-[10px] text-gray-500 font-mono">Passport: 948210345 (GBR)</div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SCANNING / OCR PROGRESS INDICATOR */}
                    {isScanning && (
                        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-center text-xs text-emerald-900 flex items-center justify-center gap-2.5 shadow-sm animate-pulse">
                            <RefreshCw size={16} className="animate-spin text-emerald-600 shrink-0" />
                            <div>
                                <p className="font-bold">{ocrProgress || 'Analyzing document image with Universal OCR engine...'}</p>
                                <p className="text-[10px] text-emerald-700">Extracting names, ID numbers, and dates dynamically with zero hardcoding...</p>
                            </div>
                        </div>
                    )}

                    {/* EXTRACTED IDENTITY DOCUMENT DETAILS */}
                    {parsedDoc && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <div className="flex items-center gap-2">
                                    {capturedImage && (
                                        <img src={capturedImage} alt="Doc Scan" className="h-9 w-14 object-cover rounded border border-gray-300 shadow-2xs" />
                                    )}
                                    <FileText size={16} className="text-blue-600" />
                                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">
                                        Parsed {parsedDoc.documentType} ({parsedDoc.format})
                                    </h3>
                                    {parsedDoc.isChecksumValid ? (
                                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <CheckCircle2 size={10} /> Verified
                                        </span>
                                    ) : (
                                        <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                            <AlertTriangle size={10} /> Visual OCR
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-mono font-bold text-gray-700">
                                    Doc #: <strong className="text-blue-700">{parsedDoc.documentNumber || 'Detected'}</strong>
                                </span>
                            </div>

                            {/* Editable Fields Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 text-xs">
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.fullName}
                                        onChange={e => setParsedDoc({ ...parsedDoc, fullName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded font-bold text-gray-800 bg-white outline-none focus:border-blue-500 text-xs"
                                        placeholder="Guest Full Name..."
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Document #</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.documentNumber}
                                        onChange={e => {
                                            const val = e.target.value;
                                            setParsedDoc({ ...parsedDoc, documentNumber: val });
                                            lookupExistingProfile({ ...parsedDoc, documentNumber: val });
                                        }}
                                        className="w-full h-8 px-2 border border-blue-300 rounded font-bold font-mono text-blue-700 bg-white outline-none focus:border-blue-500 text-xs"
                                        placeholder="Passport / NID No..."
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Date of Birth</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.dateOfBirth}
                                        onChange={e => setParsedDoc({ ...parsedDoc, dateOfBirth: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded font-mono text-gray-800 bg-white outline-none focus:border-blue-500 text-xs"
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Nationality</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.nationalityName}
                                        onChange={e => setParsedDoc({ ...parsedDoc, nationalityName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-gray-800 bg-white outline-none focus:border-blue-500 text-xs"
                                        placeholder="Nationality..."
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Gender</label>
                                    <select
                                        value={parsedDoc.gender}
                                        onChange={e => setParsedDoc({ ...parsedDoc, gender: e.target.value as any })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-gray-800 bg-white outline-none text-xs"
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Expiry Date</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.expiryDate}
                                        onChange={e => setParsedDoc({ ...parsedDoc, expiryDate: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded font-mono text-gray-800 bg-white outline-none text-xs"
                                        placeholder="YYYY-MM-DD"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Document Type</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.documentType}
                                        onChange={e => setParsedDoc({ ...parsedDoc, documentType: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-gray-800 bg-white outline-none text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Issuing Authority</label>
                                    <input
                                        type="text"
                                        value={parsedDoc.issuingCountryName}
                                        onChange={e => setParsedDoc({ ...parsedDoc, issuingCountryName: e.target.value })}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-gray-800 bg-white outline-none text-xs"
                                    />
                                </div>
                                <div>
                                    <label className="text-gray-500 text-[10px] uppercase font-bold block mb-1">Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={guestPhone}
                                        onChange={e => setGuestPhone(e.target.value)}
                                        className="w-full h-8 px-2 border border-gray-300 rounded text-gray-800 bg-white outline-none text-xs"
                                        placeholder="Optional phone"
                                    />
                                </div>
                            </div>

                            {/* Collapsible Raw Extracted Document Text */}
                            {parsedDoc.rawLines.length > 0 && (
                                <div className="pt-2 border-t border-gray-200">
                                    <details className="text-[11px] text-gray-500 cursor-pointer">
                                        <summary className="font-semibold text-gray-700 hover:text-blue-600">
                                            View Raw Extracted Text ({parsedDoc.rawLines.length} lines detected)
                                        </summary>
                                        <div className="mt-2 p-2.5 bg-white border border-gray-200 rounded font-mono text-[10.5px] text-gray-700 whitespace-pre-wrap max-h-36 overflow-y-auto">
                                            {parsedDoc.rawLines.join('\n')}
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    )}

                    {/* DEDUPLICATION & EXISTING PROFILE MATCH RESULT */}
                    {isLookingUp && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center text-xs text-blue-700 flex items-center justify-center gap-2">
                            <RefreshCw size={14} className="animate-spin text-blue-600" />
                            <span>Checking Central Database for Existing Identity Records...</span>
                        </div>
                    )}

                    {/* SCENARIO A: MATCH FOUND (Returning Guest Detected!) */}
                    {matchedGuest && !isLookingUp && (
                        <div className="bg-gradient-to-r from-amber-500/10 via-amber-50 to-orange-500/10 border-2 border-amber-400 rounded-2xl p-4 space-y-3 shadow-md animate-in fade-in duration-200">
                            <div className="flex items-center justify-between pb-2 border-b border-amber-300/60">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                        ⚡
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                                            Existing Guest Profile Detected in Database!
                                        </h4>
                                        <p className="text-[10px] text-amber-800">
                                            Matched via {matchType === 'EXACT_ID' ? 'Exact Document Number' : matchType === 'PHONE' ? 'Verified Phone Number' : 'Name & Date of Birth'}.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <span className="bg-amber-500 text-slate-900 font-bold text-[10px] px-2 py-0.5 rounded-full shadow-2xs">
                                        {matchedGuest.vipStatus || 'VIP'}
                                    </span>
                                    <span className="bg-slate-900 text-white font-mono text-[10px] px-2 py-0.5 rounded-full">
                                        Stay #{matchedGuest.totalStays + 1}
                                    </span>
                                </div>
                            </div>

                            {/* Blacklist Warning Guard */}
                            {matchedGuest.isBlacklisted && (
                                <div className="bg-rose-600 text-white p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs">
                                    <Lock size={16} className="text-rose-200 shrink-0" />
                                    <div>
                                        <div>SECURITY ALERT: GUEST IS ON PROPERTY BLACKLIST!</div>
                                        <div className="text-[10px] font-normal text-rose-100">
                                            Reason: {matchedGuest.blacklistReason || 'Security flag active'}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Guest 360 Summary */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/80 p-3 rounded-xl border border-amber-200/80 text-xs">
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase block">Guest Name</span>
                                    <strong className="text-gray-900">{matchedGuest.name}</strong>
                                    <div className="text-[10px] text-gray-500">ID: #{matchedGuest.id}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase block">Contact</span>
                                    <span className="font-mono text-gray-800">{matchedGuest.phone || 'No Phone'}</span>
                                    <div className="text-[10px] text-gray-500 truncate">{matchedGuest.email || 'No email'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase block">Stay History</span>
                                    <strong className="text-indigo-700">{matchedGuest.totalStays} Previous Stay(s)</strong>
                                    <div className="text-[10px] text-gray-500">Last Room: {matchedGuest.lastRoomNumber || 'N/A'}</div>
                                </div>
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase block">Lifetime Value</span>
                                    <strong className="text-emerald-700 font-mono">
                                        {currency} {Number(matchedGuest.totalSpend || 0).toLocaleString()}
                                    </strong>
                                    <div className="text-[10px] text-amber-600 font-bold">{matchedGuest.loyaltyPoints || 0} Loyalty Pts</div>
                                </div>
                            </div>

                            {/* Actions for Existing Guest */}
                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={handleCreateNewProfile}
                                    className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    Create Duplicate Profile Anyway
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={handleAttachExisting}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                                    <span>Attach Existing Profile to Stay</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SCENARIO B: NEW GUEST (No Existing Match Found) */}
                    {parsedDoc && !matchedGuest && !isLookingUp && (
                        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4 space-y-3 shadow-md animate-in fade-in duration-200">
                            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                                        ✓
                                    </span>
                                    <div>
                                        <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                                            New Guest — No Conflicting Record Found
                                        </h4>
                                        <p className="text-[10px] text-emerald-700">
                                            Clean passport scan ready to create a verified canonical guest profile.
                                        </p>
                                    </div>
                                </div>
                                <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-0.5 rounded-full">
                                    First-Time Visitor
                                </span>
                            </div>

                            <p className="text-xs text-gray-700">
                                Automatically create a comprehensive guest profile for <strong>{parsedDoc.fullName}</strong> ({parsedDoc.documentType} #{parsedDoc.documentNumber}) and attach it to this booking.
                            </p>

                            <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={actionLoading}
                                    onClick={handleCreateNewProfile}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                    {actionLoading ? <RefreshCw size={13} className="animate-spin" /> : <User size={13} />}
                                    <span>Create Verified Profile &amp; Link to Stay</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
