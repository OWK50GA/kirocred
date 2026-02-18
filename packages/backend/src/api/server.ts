import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import routes from "./routes";

// Error interface for consistent error handling
interface ApiError extends Error {
  statusCode?: number;
}

// Create Express server setup
export function createServer(): express.Application {
  const app = express();

  // Middleware setup
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  // Health check endpoint
  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", routes);

  return app;
}

// Error handling middleware
export function setupErrorHandling(app: express.Application): void {
  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

  // Global error handler
  app.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
    console.error("API Error:", err);

    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      error: statusCode >= 500 ? "Internal Server Error" : "Client Error",
      message: statusCode >= 500 ? "An internal error occurred" : message,
    });
  });
}

// Request validation helper
export function validateRequest(schema: any) {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body);
    if (error) {
      const apiError: ApiError = new Error(error.details[0].message);
      apiError.statusCode = 400;
      return next(apiError);
    }
    next();
  };
}

// Async route handler wrapper
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
