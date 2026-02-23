import { Router, Response, NextFunction, type Router as ExpressRouter } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../utils/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const router: ExpressRouter = Router();

const createBookingSchema = z.object({
  businessId: z.string(),
  serviceId: z.string(),
  slotId: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
});

const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED']),
});

// Create booking
router.post(
  '/',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const body = createBookingSchema.parse(req.body);

      // Check if slot exists and is available
      const slot = await prisma.timeSlot.findUnique({
        where: { id: body.slotId },
      });

      if (!slot || !slot.isAvailable) {
        return new ValidationError('This slot is not available');
      }

      // Check number of bookings for this slot
      const bookingCount = await prisma.booking.count({
        where: {
          slotId: body.slotId,
          status: { not: 'CANCELLED' },
        },
      });

      const business = await prisma.business.findUnique({
        where: { id: body.businessId },
      });

      if (!business) {
        return new NotFoundError('Business not found');
      }

      if (bookingCount >= business.maxBookingsPerSlot) {
        return new ValidationError('This slot is fully booked');
      }

      // Get service details for timing
      const service = await prisma.service.findUnique({
        where: { id: body.serviceId },
      });

      if (!service) {
        return new NotFoundError('Service not found');
      }

      // Calculate start and end times
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const startTime = new Date(slot.date);
      startTime.setHours(startHour, startMinute, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + service.duration);

      const booking = await prisma.booking.create({
        data: {
          businessId: body.businessId,
          customerId: req.user.id,
          serviceId: body.serviceId,
          slotId: body.slotId,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          startTime,
          endTime,
          status: 'PENDING',
        },
        include: {
          service: true,
          business: true,
        },
      });

      res.status(201).json({
        message: 'Booking created successfully',
        booking,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get my bookings (customer)
router.get(
  '/my-bookings',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const bookings = await prisma.booking.findMany({
        where: { customerId: req.user.id },
        include: {
          service: true,
          business: true,
        },
        orderBy: { startTime: 'desc' },
      });

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
);

// Get business bookings
router.get(
  '/business/:businessId',
  authMiddleware,
  requireRole(['BUSINESS_OWNER']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { businessId } = req.params;

      // Verify ownership
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || business.userId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      const bookings = await prisma.booking.findMany({
        where: { businessId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          service: true,
        },
        orderBy: { startTime: 'asc' },
      });

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  }
);

// Update booking status
router.patch(
  '/:bookingId/status',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { bookingId } = req.params;
      const body = updateBookingStatusSchema.parse(req.body);

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { business: true },
      });

      if (!booking) {
        return new NotFoundError('Booking not found');
      }

      // Verify authorization (owner or customer)
      if (booking.business.userId !== req.user.id && booking.customerId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      const updatedBooking = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: body.status },
        include: {
          service: true,
          business: true,
        },
      });

      res.json({
        message: 'Booking status updated',
        booking: updatedBooking,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Cancel booking
router.delete(
  '/:bookingId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { bookingId } = req.params;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return new NotFoundError('Booking not found');
      }

      if (booking.customerId !== req.user.id && booking.status !== 'PENDING') {
        return new ValidationError('You cannot cancel this booking');
      }

      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      res.json({
        message: 'Booking cancelled successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
