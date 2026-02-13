import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { AppError } from "./utils/errors";

// Import routes
import authRoutes from "./routes/auth";
import businessRoutes from "./routes/business";
import servicesRoutes from "./routes/services";
import bookingsRoutes from "./routes/bookings";
import slotsRoutes from "./routes/slots";
import paymentsRoutes from "./routes/payments";

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/business/:businessId/services", servicesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/slots", slotsRoutes);
app.use("/api/payments", paymentsRoutes);

// Health check
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    path: req.path,
  });
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      message: err.message,
      ...(err.constructor.name === "ValidationError" && {
        errors: (err as any).errors,
      }),
    });
  }

  // Zod validation errors
  if (err.name === "ZodError") {
    return res.status(400).json({
      message: "Validation failed",
      errors: err.errors,
    });
  }

  // Default error
  res.status(500).json({
    message: "Internal server error",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

export default app;
