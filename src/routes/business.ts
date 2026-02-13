import { Router, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import {
  authMiddleware,
  AuthenticatedRequest,
  requireRole,
} from "../utils/auth";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors";
import { z } from "zod";

const router = Router();

// Validation schemas
const createBusinessSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().optional(),
  phone: z.string(),
  email: z.string().email(),
  address: z.string(),
  city: z.string(),
  openTime: z.string().default("09:00"),
  closeTime: z.string().default("18:00"),
  slotDuration: z.number().default(30),
});

const updateBusinessSchema = createBusinessSchema.partial();

// Create business
router.post(
  "/",
  authMiddleware,
  requireRole(["CUSTOMER"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError("User not authenticated");

      // Check if user already has a business
      const existingBusiness = await prisma.business.findUnique({
        where: { userId: req.user.id },
      });

      if (existingBusiness) {
        throw new ConflictError("You already have a business. Update it instead.");
      }

      const body = createBusinessSchema.parse(req.body);

      // Update user role to BUSINESS_OWNER
      const business = await prisma.business.create({
        data: {
          userId: req.user.id,
          ...body,
        },
      });

      await prisma.user.update({
        where: { id: req.user.id },
        data: { role: "BUSINESS_OWNER" },
      });

      res.status(201).json({
        message: "Business created successfully",
        business,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get my business
router.get(
  "/my-business",
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError("User not authenticated");

      const business = await prisma.business.findUnique({
        where: { userId: req.user.id },
        include: {
          services: true,
          bookings: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!business) {
        throw new NotFoundError("Business not found");
      }

      res.json(business);
    } catch (error) {
      next(error);
    }
  }
);

// Get business by ID (public)
router.get(
  "/:id",
  async (req: Response, next: NextFunction) => {
    try {
      const business = await prisma.business.findUnique({
        where: { id: req.params.id },
        include: {
          services: true,
        },
      });

      if (!business) {
        throw new NotFoundError("Business not found");
      }

      res.json(business);
    } catch (error) {
      next(error);
    }
  }
);

// Update business
router.put(
  "/:id",
  authMiddleware,
  requireRole(["BUSINESS_OWNER"]),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new ValidationError("User not authenticated");

      // Verify ownership
      const business = await prisma.business.findUnique({
        where: { id: req.params.id },
      });

      if (!business) {
        throw new NotFoundError("Business not found");
      }

      if (business.userId !== req.user.id) {
        throw new ValidationError("You can only update your own business");
      }

      const body = updateBusinessSchema.parse(req.body);

      const updatedBusiness = await prisma.business.update({
        where: { id: req.params.id },
        data: body,
      });

      res.json({
        message: "Business updated successfully",
        business: updatedBusiness,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
