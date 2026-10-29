import type { Response } from 'express';
import type { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { roomService, type RoomRecord } from '../services/room.service.js';

const getReqPropertyId = (req: AuthenticatedRequest): string | number | undefined => {
  return (req.query?.propertyId as string) || (req.headers?.['x-property-id'] as string) || (req.body?.propertyId as string) || req.propertyId;
};

export const roomController = {
  getAllRooms: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = getReqPropertyId(req);
      const { hkStatus, foStatus } = req.query as { hkStatus?: string; foStatus?: string };
      const rooms = propertyId ? await roomService.getAllRooms(propertyId, { hkStatus, foStatus }) : [];

      const response: ApiResponse<RoomRecord[]> = {
        success: true,
        data: rooms,
        metadata: {
          totalRecords: rooms.length,
          timestamp: new Date().toISOString(),
        },
      };
      res.json(response);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  updateHousekeeping: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const propertyId = getReqPropertyId(req);
      if (!propertyId) {
        res.status(400).json({ success: false, error: 'Property ID is required' });
        return;
      }
      const rawRoomNo = Array.isArray(req.params.roomNo) ? req.params.roomNo[0] : req.params.roomNo;
      const roomNo = rawRoomNo || '';
      const { status } = req.body;

      const updated = await roomService.updateHousekeepingStatus(roomNo, propertyId, status);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Room not found' });
        return;
      }
      res.json({ success: true, data: updated, message: `Room ${roomNo} status changed to ${status}` });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
