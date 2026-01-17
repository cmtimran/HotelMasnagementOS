// i18n Configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Translation resources
const resources = {
    en: {
        translation: {
            // Common
            common: {
                save: 'Save',
                cancel: 'Cancel',
                delete: 'Delete',
                edit: 'Edit',
                add: 'Add',
                search: 'Search',
                filter: 'Filter',
                export: 'Export',
                import: 'Import',
                loading: 'Loading...',
                error: 'Error',
                success: 'Success',
                confirm: 'Confirm',
                yes: 'Yes',
                no: 'No'
            },

            // Navigation
            nav: {
                dashboard: 'Dashboard',
                quickReservation: 'Quick Reservation',
                folioOperations: 'Folio Operations',
                guestProfile: 'Guest Profile',
                roomRack: 'Room Rack',
                reservations: 'Reservations',
                stayView: 'Stay View',
                floorPlan: 'Floor Plan',
                housekeeping: 'Housekeeping',
                maintenance: 'Maintenance',
                pos: 'POS',
                reports: 'Reports'
            },

            // Quick Reservation
            reservation: {
                title: 'Quick Reservation',
                checkIn: 'Check-in',
                checkOut: 'Check-out',
                nights: 'Nights',
                roomType: 'Room Type',
                guests: 'Guests',
                adults: 'Adults',
                children: 'Children',
                totalAmount: 'Total Amount',
                reserve: 'Reserve',
                checkInNow: 'Check In'
            },

            // Folio Operations
            folio: {
                title: 'Folio Operations',
                addPayment: 'Add Payment',
                addCharges: 'Add Charges',
                balance: 'Balance',
                totalAmount: 'Total Amount',
                transactions: 'Transactions',
                date: 'Date',
                description: 'Description',
                amount: 'Amount'
            },

            // Guest Profile
            guest: {
                title: 'Guest Profile',
                name: 'Name',
                email: 'Email',
                phone: 'Phone',
                address: 'Address',
                nationality: 'Nationality',
                idType: 'ID Type',
                idNumber: 'ID Number',
                preferences: 'Preferences'
            },

            // Notifications
            notifications: {
                bookingConfirmed: 'Booking confirmed successfully',
                paymentReceived: 'Payment received',
                emailSent: 'Email sent successfully',
                smsSent: 'SMS sent successfully',
                pdfGenerated: 'PDF generated successfully',
                error: 'An error occurred'
            }
        }
    },

    bn: {
        translation: {
            // Common
            common: {
                save: 'সংরক্ষণ',
                cancel: 'বাতিল',
                delete: 'মুছুন',
                edit: 'সম্পাদনা',
                add: 'যোগ করুন',
                search: 'অনুসন্ধান',
                filter: 'ফিল্টার',
                export: 'রপ্তানি',
                import: 'আমদানি',
                loading: 'লোড হচ্ছে...',
                error: 'ত্রুটি',
                success: 'সফল',
                confirm: 'নিশ্চিত করুন',
                yes: 'হ্যাঁ',
                no: 'না'
            },

            // Navigation
            nav: {
                dashboard: 'ড্যাশবোর্ড',
                quickReservation: 'দ্রুত রিজার্ভেশন',
                folioOperations: 'ফোলিও অপারেশন',
                guestProfile: 'অতিথি প্রোফাইল',
                roomRack: 'রুম র্যাক',
                reservations: 'রিজার্ভেশন',
                stayView: 'স্টে ভিউ',
                floorPlan: 'ফ্লোর প্ল্যান',
                housekeeping: 'হাউসকিপিং',
                maintenance: 'রক্ষণাবেক্ষণ',
                pos: 'পিওএস',
                reports: 'রিপোর্ট'
            },

            // Quick Reservation
            reservation: {
                title: 'দ্রুত রিজার্ভেশন',
                checkIn: 'চেক-ইন',
                checkOut: 'চেক-আউট',
                nights: 'রাত',
                roomType: 'রুমের ধরন',
                guests: 'অতিথি',
                adults: 'প্রাপ্তবয়স্ক',
                children: 'শিশু',
                totalAmount: 'মোট পরিমাণ',
                reserve: 'রিজার্ভ করুন',
                checkInNow: 'চেক ইন করুন'
            },

            // Folio Operations
            folio: {
                title: 'ফোলিও অপারেশন',
                addPayment: 'পেমেন্ট যোগ করুন',
                addCharges: 'চার্জ যোগ করুন',
                balance: 'ব্যালেন্স',
                totalAmount: 'মোট পরিমাণ',
                transactions: 'লেনদেন',
                date: 'তারিখ',
                description: 'বিবরণ',
                amount: 'পরিমাণ'
            },

            // Guest Profile
            guest: {
                title: 'অতিথি প্রোফাইল',
                name: 'নাম',
                email: 'ইমেইল',
                phone: 'ফোন',
                address: 'ঠিকানা',
                nationality: 'জাতীয়তা',
                idType: 'আইডি টাইপ',
                idNumber: 'আইডি নম্বর',
                preferences: 'পছন্দ'
            },

            // Notifications
            notifications: {
                bookingConfirmed: 'বুকিং সফলভাবে নিশ্চিত হয়েছে',
                paymentReceived: 'পেমেন্ট গৃহীত হয়েছে',
                emailSent: 'ইমেইল সফলভাবে পাঠানো হয়েছে',
                smsSent: 'এসএমএস সফলভাবে পাঠানো হয়েছে',
                pdfGenerated: 'পিডিএফ সফলভাবে তৈরি হয়েছে',
                error: 'একটি ত্রুটি ঘটেছে'
            }
        }
    },

    es: {
        translation: {
            // Common
            common: {
                save: 'Guardar',
                cancel: 'Cancelar',
                delete: 'Eliminar',
                edit: 'Editar',
                add: 'Agregar',
                search: 'Buscar',
                filter: 'Filtrar',
                export: 'Exportar',
                import: 'Importar',
                loading: 'Cargando...',
                error: 'Error',
                success: 'Éxito',
                confirm: 'Confirmar',
                yes: 'Sí',
                no: 'No'
            },

            // Navigation
            nav: {
                dashboard: 'Panel',
                quickReservation: 'Reserva Rápida',
                folioOperations: 'Operaciones de Folio',
                guestProfile: 'Perfil de Huésped',
                roomRack: 'Rack de Habitaciones',
                reservations: 'Reservas',
                stayView: 'Vista de Estancia',
                floorPlan: 'Plano de Planta',
                housekeeping: 'Limpieza',
                maintenance: 'Mantenimiento',
                pos: 'POS',
                reports: 'Informes'
            },

            // Quick Reservation
            reservation: {
                title: 'Reserva Rápida',
                checkIn: 'Entrada',
                checkOut: 'Salida',
                nights: 'Noches',
                roomType: 'Tipo de Habitación',
                guests: 'Huéspedes',
                adults: 'Adultos',
                children: 'Niños',
                totalAmount: 'Monto Total',
                reserve: 'Reservar',
                checkInNow: 'Registrarse'
            },

            // Folio Operations
            folio: {
                title: 'Operaciones de Folio',
                addPayment: 'Agregar Pago',
                addCharges: 'Agregar Cargos',
                balance: 'Saldo',
                totalAmount: 'Monto Total',
                transactions: 'Transacciones',
                date: 'Fecha',
                description: 'Descripción',
                amount: 'Monto'
            },

            // Guest Profile
            guest: {
                title: 'Perfil de Huésped',
                name: 'Nombre',
                email: 'Correo',
                phone: 'Teléfono',
                address: 'Dirección',
                nationality: 'Nacionalidad',
                idType: 'Tipo de ID',
                idNumber: 'Número de ID',
                preferences: 'Preferencias'
            },

            // Notifications
            notifications: {
                bookingConfirmed: 'Reserva confirmada exitosamente',
                paymentReceived: 'Pago recibido',
                emailSent: 'Correo enviado exitosamente',
                smsSent: 'SMS enviado exitosamente',
                pdfGenerated: 'PDF generado exitosamente',
                error: 'Ocurrió un error'
            }
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('language') || 'en', // Default language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // React already escapes
        }
    });

export default i18n;
