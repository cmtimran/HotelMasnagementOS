import type { Response } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { bookingService } from '../services/booking.service.js';

export const bookingController = {
  getAllBookings: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const status = req.query.status as string;
      const data = await bookingService.getAllBookings(propertyId, status);
      
      const response: ApiResponse = {
        success: true,
        data,
        metadata: {
          totalRecords: data.length,
          timestamp: new Date().toISOString(),
        },
      };
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  getBookingById: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const booking = await bookingService.getBookingById(id, propertyId);
      if (!booking) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }
      res.json({ success: true, data: booking });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  createBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const newBooking = await bookingService.createBooking({
        ...req.body,
        propertyId,
      });
      res.status(201).json({ success: true, data: newBooking, message: 'Reservation created successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  updateStatus: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.updateBookingStatus(
        id,
        propertyId,
        req.body.status
      );
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }
      res.json({ success: true, data: updated, message: `Status updated to ${req.body.status}` });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
