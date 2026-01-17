// PDF Invoice Generation Service
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface InvoiceData {
    // Hotel Info
    hotelName: string;
    hotelAddress: string;
    hotelPhone: string;
    hotelEmail: string;
    hotelLogo?: string;

    // Invoice Info
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;

    // Guest Info
    guestName: string;
    guestAddress?: string;
    guestPhone?: string;
    guestEmail?: string;

    // Booking Info
    bookingId: string;
    checkIn: string;
    checkOut: string;
    roomNumber: string;
    roomType: string;
    nights: number;

    // Charges
    items: InvoiceItem[];
    subtotal: number;
    tax: number;
    discount?: number;
    total: number;

    // Payment Info
    amountPaid?: number;
    balance?: number;
    paymentMethod?: string;

    // Notes
    notes?: string;
    terms?: string;
}

interface InvoiceItem {
    description: string;
    quantity: number;
    rate: number;
    amount: number;
}

class PDFService {
    /**
     * Generate invoice PDF
     */
    generateInvoice(data: InvoiceData): jsPDF {
        const doc = new jsPDF();
        let yPos = 20;

        // Header - Hotel Info
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(data.hotelName, 20, yPos);

        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(data.hotelAddress, 20, yPos);
        yPos += 5;
        doc.text(`Phone: ${data.hotelPhone} | Email: ${data.hotelEmail}`, 20, yPos);

        // Invoice Title
        yPos += 15;
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('INVOICE', 105, yPos, { align: 'center' });

        // Invoice Details (Right side)
        yPos = 20;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Invoice #:', 140, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.invoiceNumber, 170, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Date:', 140, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.invoiceDate, 170, yPos);

        yPos += 6;
        doc.setFont('helvetica', 'bold');
        doc.text('Booking ID:', 140, yPos);
        doc.setFont('helvetica', 'normal');
        doc.text(data.bookingId, 170, yPos);

        // Guest Info
        yPos += 15;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Bill To:', 20, yPos);

        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(data.guestName, 20, yPos);

        if (data.guestAddress) {
            yPos += 5;
            doc.text(data.guestAddress, 20, yPos);
        }

        if (data.guestPhone) {
            yPos += 5;
            doc.text(`Phone: ${data.guestPhone}`, 20, yPos);
        }

        if (data.guestEmail) {
            yPos += 5;
            doc.text(`Email: ${data.guestEmail}`, 20, yPos);
        }

        // Booking Details
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Booking Details:', 20, yPos);

        yPos += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Room: ${data.roomNumber} (${data.roomType})`, 20, yPos);
        yPos += 5;
        doc.text(`Check-in: ${data.checkIn} | Check-out: ${data.checkOut} (${data.nights} nights)`, 20, yPos);

        // Items Table
        yPos += 10;
        const tableData = data.items.map(item => [
            item.description,
            item.quantity.toString(),
            `$${item.rate.toFixed(2)}`,
            `$${item.amount.toFixed(2)}`
        ]);

        autoTable(doc, {
            startY: yPos,
            head: [['Description', 'Quantity', 'Rate', 'Amount']],
            body: tableData,
            theme: 'striped',
            headStyles: { fillColor: [41, 128, 185], textColor: 255 },
            styles: { fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 40, halign: 'right' },
                3: { cellWidth: 40, halign: 'right' }
            }
        });

        // Get final Y position after table
        yPos = (doc as any).lastAutoTable.finalY + 10;

        // Totals (Right aligned)
        const xRight = 150;
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', xRight, yPos);
        doc.text(`$${data.subtotal.toFixed(2)}`, 190, yPos, { align: 'right' });

        yPos += 6;
        doc.text(`Tax (${((data.tax / data.subtotal) * 100).toFixed(1)}%):`, xRight, yPos);
        doc.text(`$${data.tax.toFixed(2)}`, 190, yPos, { align: 'right' });

        if (data.discount && data.discount > 0) {
            yPos += 6;
            doc.text('Discount:', xRight, yPos);
            doc.text(`-$${data.discount.toFixed(2)}`, 190, yPos, { align: 'right' });
        }

        yPos += 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Total:', xRight, yPos);
        doc.text(`$${data.total.toFixed(2)}`, 190, yPos, { align: 'right' });

        if (data.amountPaid !== undefined) {
            yPos += 6;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text('Amount Paid:', xRight, yPos);
            doc.text(`$${data.amountPaid.toFixed(2)}`, 190, yPos, { align: 'right' });

            if (data.balance !== undefined) {
                yPos += 6;
                doc.setFont('helvetica', 'bold');
                doc.text('Balance Due:', xRight, yPos);
                doc.text(`$${data.balance.toFixed(2)}`, 190, yPos, { align: 'right' });
            }
        }

        // Payment Method
        if (data.paymentMethod) {
            yPos += 8;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`Payment Method: ${data.paymentMethod}`, xRight, yPos);
        }

        // Notes
        if (data.notes) {
            yPos += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Notes:', 20, yPos);
            yPos += 5;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            const splitNotes = doc.splitTextToSize(data.notes, 170);
            doc.text(splitNotes, 20, yPos);
        }

        // Terms & Conditions (Footer)
        if (data.terms) {
            const pageHeight = doc.internal.pageSize.height;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'italic');
            const splitTerms = doc.splitTextToSize(data.terms, 170);
            doc.text(splitTerms, 20, pageHeight - 20);
        }

        // Footer
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('Thank you for your business!', 105, pageHeight - 10, { align: 'center' });

        return doc;
    }

    /**
     * Generate and download invoice
     */
    downloadInvoice(data: InvoiceData, filename?: string): void {
        const doc = this.generateInvoice(data);
        const fileName = filename || `Invoice_${data.invoiceNumber}.pdf`;
        doc.save(fileName);
        console.log('📄 Invoice downloaded:', fileName);
    }

    /**
     * Generate booking confirmation PDF
     */
    generateBookingConfirmation(data: any): jsPDF {
        const doc = new jsPDF();
        let yPos = 20;

        // Header
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text(data.hotelName, 105, yPos, { align: 'center' });

        yPos += 10;
        doc.setFontSize(16);
        doc.text('Booking Confirmation', 105, yPos, { align: 'center' });

        // Booking ID
        yPos += 15;
        doc.setFontSize(12);
        doc.text(`Booking ID: ${data.bookingId}`, 20, yPos);

        // Guest Info
        yPos += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Guest Information:', 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Name: ${data.guestName}`, 20, yPos);
        yPos += 5;
        doc.text(`Email: ${data.guestEmail}`, 20, yPos);
        yPos += 5;
        doc.text(`Phone: ${data.guestPhone}`, 20, yPos);

        // Booking Details
        yPos += 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Booking Details:', 20, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Check-in: ${data.checkIn}`, 20, yPos);
        yPos += 5;
        doc.text(`Check-out: ${data.checkOut}`, 20, yPos);
        yPos += 5;
        doc.text(`Room Type: ${data.roomType}`, 20, yPos);
        yPos += 5;
        doc.text(`Number of Guests: ${data.guests}`, 20, yPos);
        yPos += 5;
        doc.text(`Total Amount: $${data.totalAmount}`, 20, yPos);

        return doc;
    }

    /**
     * Download booking confirmation
     */
    downloadBookingConfirmation(data: any, filename?: string): void {
        const doc = this.generateBookingConfirmation(data);
        const fileName = filename || `Booking_${data.bookingId}.pdf`;
        doc.save(fileName);
        console.log('📄 Booking confirmation downloaded:', fileName);
    }
}

// Export singleton instance
export const pdfService = new PDFService();
export default pdfService;
