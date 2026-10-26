import type { Response } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { bookingService } from '../services/booking.service.js';
import { broadcastServerEvent } from '../routes/realtime.routes.js';

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

      // Event-driven broadcast to all connected terminals
      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: newBooking,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast reservation commit', err);
      }

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

      // Event-driven broadcast to all connected terminals
      try {
        broadcastServerEvent({
          type: 'RESERVATION_UPDATED',
          reservationId: id,
          status: req.body.status,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast status update', err);
      }

      res.json({ success: true, data: updated, message: `Status updated to ${req.body.status}` });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  updateBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.updateBooking(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: updated,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast reservation update', err);
      }

      res.json({ success: true, data: updated, message: 'Reservation updated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  amendBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.amendStay(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: updated,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast amend stay', err);
      }

      res.json({ success: true, data: updated, message: 'Stay amended successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  moveRoom: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.moveRoom(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: updated,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast room move', err);
      }

      res.json({ success: true, data: updated, message: 'Room move executed successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  addPayment: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.recordPayment(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: updated,
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast payment', err);
      }

      res.json({ success: true, data: updated, message: 'Payment recorded successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  splitBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.splitStay(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_COMMITTED',
          reservation: updated,
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast room split', err);
      }

      res.json({ success: true, data: updated, message: 'Room split executed successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  holdBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.holdReservation(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'RESERVATION_UPDATED',
          reservationId: id,
          status: 'hold',
          propertyId
        });
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast hold', err);
      }

      res.json({ success: true, data: updated, message: 'Reservation placed on hold' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  voidBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.voidReservation(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast void', err);
      }

      res.json({ success: true, data: updated, message: 'Reservation voided successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  unassignRoom: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.unassignRoom(id, propertyId, req.body);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Booking not found' });
        return;
      }

      try {
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast unassign', err);
      }

      res.json({ success: true, data: updated, message: 'Room unassigned successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  ungroupBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.ungroupReservation(id, propertyId, req.body);
      res.json({ success: true, data: updated, message: 'Reservation ungrouped successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  linkGroup: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const targetResNo = req.body.targetReservationNumber || req.params.id;
      const toLinkResNo = req.body.reservationToLink || req.body.reservationToLinkNumber;
      if (!targetResNo || !toLinkResNo) {
        return res.status(400).json({ success: false, error: 'Both targetReservationNumber and reservationToLink are required.' });
      }
      const result = await bookingService.linkBookingsToGroup(targetResNo, toLinkResNo, propertyId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  unlinkGroup: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const resNo = req.body.reservationNumber || req.params.id;
      if (!resNo) {
        return res.status(400).json({ success: false, error: 'reservationNumber is required.' });
      }
      const updated = await bookingService.unlinkBookingFromGroup(resNo, propertyId);
      res.json({ success: true, data: updated, message: 'Reservation unlinked from group successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  changeOwner: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const updated = await bookingService.changeGroupOwner(id, propertyId, req.body);
      res.json({ success: true, data: updated, message: 'Group owner updated successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  deleteBooking: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      await bookingService.deleteBooking(id, propertyId);

      // Event-driven broadcast to all connected terminals
      try {
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          deletedReservationId: id,
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast reservation deletion', err);
      }

      res.json({ success: true, message: 'Reservation cancelled successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  resetInventory: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = req.propertyId || 'prop_grand_palace';
      await bookingService.resetAllBookingsAndInventory(propertyId);
      try {
        broadcastServerEvent({
          type: 'INVENTORY_REFRESH',
          propertyId
        });
      } catch (err) {
        console.warn('Failed to broadcast inventory reset event', err);
      }
      res.json({ success: true, message: 'All reservations and inventory cleared successfully' });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
