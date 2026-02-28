import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import routes from "./routes";

interface ApiError extends Error {
  statusCode?: number;
}

export function createServer(): express.Application {
  const app = express();

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });

  app.get("/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api", routes);

  return app;
}

export function setupErrorHandling(app: express.Application): void {
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: "Not Found",
      message: `Route ${req.method} ${req.path} not found`,
    });
  });

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

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
