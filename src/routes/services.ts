import {
  Router,
  Response,
  NextFunction,
  Request as ExpressRequest,
  type Router as ExpressRouter,
} from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../utils/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import { z } from 'zod';

const router: ExpressRouter = Router({ mergeParams: true });

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  duration: z.number().min(5), // at least 5 minutes
  price: z.number().min(0),
});

const updateServiceSchema = createServiceSchema.partial();

// Create service
router.post(
  '/',
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

      if (!business) {
        return new NotFoundError('Business not found');
      }

      if (business.userId !== req.user.id) {
        return new ValidationError('You can only add services to your business');
      }

      const body = createServiceSchema.parse(req.body);

      const service = await prisma.service.create({
        data: {
          businessId,
          ...body,
        },
      });

      res.status(201).json({
        message: 'Service created successfully',
        service,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get all services for a business
router.get(
  '/',
  async (req: ExpressRequest<{ businessId: string }>, res: Response, next: NextFunction) => {
    try {
      const { businessId } = req.params;

      const services = await prisma.service.findMany({
        where: { businessId },
      });

      res.json(services);
    } catch (error) {
      next(error);
    }
  }
);

// Update service
router.put(
  '/:serviceId',
  authMiddleware,
  requireRole(['BUSINESS_OWNER']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { businessId, serviceId } = req.params;

      // Verify ownership
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || business.userId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service || service.businessId !== businessId) {
        return new NotFoundError('Service not found');
      }

      const body = updateServiceSchema.parse(req.body);

      const updatedService = await prisma.service.update({
        where: { id: serviceId },
        data: body,
      });

      res.json({
        message: 'Service updated successfully',
        service: updatedService,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Delete service
router.delete(
  '/:serviceId',
  authMiddleware,
  requireRole(['BUSINESS_OWNER']),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { businessId, serviceId } = req.params;

      // Verify ownership
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business || business.userId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service || service.businessId !== businessId) {
        return new NotFoundError('Service not found');
      }

      await prisma.service.delete({
        where: { id: serviceId },
      });

      res.json({
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
