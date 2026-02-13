import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import {
  authMiddleware,
  AuthenticatedRequest,
  requireRole,
} from "../utils/auth";
import { NotFoundError, ValidationError } from "../utils/errors";
import { z } from "zod";

const router = Router();

const createSlotsSchema = z.object({
  businessId: z.string(),
  date: z.string(), // YYYY-MM-DD
  slots: z.array(
    z.object({
      startTime: z.string(), // HH:mm
      endTime: z.string(), // HH:mm
    })
  ),
});

const getAvailableSlotsSchema = z.object({
  businessId: z.string(),
  date: z.string().optional(),
  serviceId: z.string(),
});

// Create time slots (business owner)
router.post(
  "/",
  authMiddleware,
  requireRole(["BUSINESS_OWNER"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError("User not authenticated");

      const body = createSlotsSchema.parse(req.body);

      // Verify business ownership
      const business = await prisma.business.findUnique({
        where: { id: body.businessId },
      });

      if (!business || business.userId !== req.user.id) {
        throw new ValidationError("Unauthorized");
      }

      // Create slots
      const date = new Date(body.date);

      const createdSlots = await Promise.all(
        body.slots.map((slot) =>
          prisma.timeSlot.create({
            data: {
              businessId: body.businessId,
              date,
              startTime: slot.startTime,
              endTime: slot.endTime,
            },
          })
        )
      );

      res.status(201).json({
        message: `${createdSlots.length} time slots created`,
        slots: createdSlots,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get available slots
router.get(
  "/available",
  async (req: Response, next: NextFunction) => {
    try {
      const { businessId, date, serviceId } = req.query;

      if (!businessId || !serviceId) {
        throw new ValidationError("businessId and serviceId are required");
      }

      // Get service to calculate required duration
      const service = await prisma.service.findUnique({
        where: { id: serviceId as string },
      });

      if (!service) {
        throw new NotFoundError("Service not found");
      }

      let query: any = {
        businessId: businessId as string,
        isAvailable: true,
      };

      if (date) {
        const queryDate = new Date(date as string);
        const nextDate = new Date(queryDate);
        nextDate.setDate(nextDate.getDate() + 1);

        query.date = {
          gte: queryDate,
          lt: nextDate,
        };
      } else {
        // By default, get slots for next 7 days
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        query.date = {
          gte: today,
          lt: nextWeek,
        };
      }

      const slots = await prisma.timeSlot.findMany({
        where: query,
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      });

      // Filter slots that have availability
      const availableSlots = await Promise.all(
        slots.map(async (slot) => {
          const bookingCount = await prisma.booking.count({
            where: {
              slotId: slot.id,
              status: { not: "CANCELLED" },
            },
          });

          const business = await prisma.business.findUnique({
            where: { id: businessId as string },
          });

          return {
            ...slot,
            isBooked: bookingCount >= (business?.maxBookingsPerSlot || 1),
            bookingCount,
          };
        })
      );

      res.json(availableSlots);
    } catch (error) {
      next(error);
    }
  }
);

// Delete slot
router.delete(
  "/:slotId",
  authMiddleware,
  requireRole(["BUSINESS_OWNER"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError("User not authenticated");

      const { slotId } = req.params;

      const slot = await prisma.timeSlot.findUnique({
        where: { id: slotId },
      });

      if (!slot) {
        throw new NotFoundError("Slot not found");
      }

      // Verify ownership
      const business = await prisma.business.findUnique({
        where: { id: slot.businessId },
      });

      if (business?.userId !== req.user.id) {
        throw new ValidationError("Unauthorized");
      }

      // Check if slot has any bookings
      const bookingCount = await prisma.booking.count({
        where: {
          slotId,
          status: { not: "CANCELLED" },
        },
      });

      if (bookingCount > 0) {
        throw new ValidationError("Cannot delete slot with active bookings");
      }

      await prisma.timeSlot.delete({
        where: { id: slotId },
      });

      res.json({
        message: "Slot deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
