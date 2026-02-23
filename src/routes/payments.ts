import express, {
  Router,
  Response,
  NextFunction,
  Request as ExpressRequest,
  type Router as ExpressRouter,
} from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthenticatedRequest } from '../utils/auth';
import { NotFoundError, ValidationError } from '../utils/errors';
import Stripe from 'stripe';
import { z } from 'zod';

const router: ExpressRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

const createPaymentSchema = z.object({
  bookingId: z.string(),
});

// Create payment intent
router.post(
  '/create-intent',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const body = createPaymentSchema.parse(req.body);

      const booking = await prisma.booking.findUnique({
        where: { id: body.bookingId },
        include: {
          service: true,
        },
      });

      if (!booking) {
        return new NotFoundError('Booking not found');
      }

      if (booking.customerId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      // Check if payment already exists
      const existingPayment = await prisma.payment.findUnique({
        where: { bookingId: body.bookingId },
      });

      if (existingPayment) {
        return new ValidationError('Payment already exists for this booking');
      }

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.service.price * 100), // convert to cents
        currency: 'usd',
        metadata: {
          bookingId: booking.id,
          userId: req.user.id,
        },
      });

      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId: body.bookingId,
          userId: req.user.id,
          amount: booking.service.price,
          stripePaymentIntentId: paymentIntent.id,
          status: 'PENDING',
        },
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        payment,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Confirm payment
router.post(
  '/confirm',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const { bookingId } = req.body;

      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
      });

      if (!booking) {
        return new NotFoundError('Booking not found');
      }

      const payment = await prisma.payment.findUnique({
        where: { bookingId },
      });

      if (!payment) {
        return new NotFoundError('Payment not found');
      }

      // Check payment status on Stripe
      if (!payment.stripePaymentIntentId) {
        return new ValidationError('Invalid payment');
      }

      const paymentIntent = await stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);

      if (paymentIntent.status === 'succeeded') {
        // Update payment and booking status
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CONFIRMED' },
        });

        res.json({
          message: 'Payment successful',
          status: 'COMPLETED',
        });
      } else {
        res.status(400).json({
          message: 'Payment not completed',
          status: paymentIntent.status,
        });
      }
    } catch (error) {
      next(error);
    }
  }
);

// Get payment status
router.get(
  '/:paymentId',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) return new ValidationError('User not authenticated');

      const payment = await prisma.payment.findUnique({
        where: { id: req.params.paymentId },
        include: { booking: true },
      });

      if (!payment) {
        return new NotFoundError('Payment not found');
      }

      if (payment.userId !== req.user.id) {
        return new ValidationError('Unauthorized');
      }

      res.json(payment);
    } catch (error) {
      next(error);
    }
  }
);

// Webhook for Stripe
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req: ExpressRequest<{ id: string }>, res: Response) => {
    try {
      const sig = req.headers['stripe-signature'] as string;

      if (!sig) {
        return new ValidationError('Missing stripe-signature header');
      }

      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        return new Error('STRIPE_WEBHOOK_SECRET not set');
      }

      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      // Handle the event
      if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        const payment = await prisma.payment.findFirst({
          where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (payment) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED' },
          });

          await prisma.booking.update({
            where: { id: payment.bookingId },
            data: { status: 'CONFIRMED' },
          });
        } else {
          console.warn(`Payment not found for intent: ${paymentIntent.id}`);
        }
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error('Webhook error:', err.message);
      res.status(400).json({ error: err.message });
    }
  }
);

export default router;
