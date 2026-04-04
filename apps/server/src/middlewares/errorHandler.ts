import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, mapDomainError } from "../utils/apiError";

function mapInfrastructureError(err: Error) {
  const message = err.message ?? "";
  if (message.includes("Can't reach database server")) {
    return {
      status: 503,
      code: "DB_UNREACHABLE",
      message: "Database is unreachable. Ensure PostgreSQL is running and DATABASE_URL points to the correct host:port. If using Docker Desktop on Windows, confirm the Docker daemon is running."
    };
  }
  if (message.includes("does not exist in the current database")) {
    return {
      status: 503,
      code: "DB_SCHEMA_NOT_READY",
      message: "Database schema is not ready. Run `cd apps/server && npx prisma migrate dev --name init && npm run seed`."
    };
  }
  return null;
}

export function requestLogger(req: Request, _res: Response, next: NextFunction) {
  console.info(`[REQ] ${req.method} ${req.path}`);
  next();
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ code: err.code, message: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "validation failed",
      issues: err.issues
    });
  }

  if (err instanceof Error) {
    const infra = mapInfrastructureError(err);
    if (infra) {
      return res.status(infra.status).json({ code: infra.code, message: infra.message });
    }
    const mapped = mapDomainError(err);
    return res.status(mapped.status).json({ code: mapped.code, message: err.message });
  }

  return res.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "unexpected error" });
}
