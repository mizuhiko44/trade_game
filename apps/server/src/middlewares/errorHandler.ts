import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiError, mapDomainError } from "../utils/apiError";

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
    const mapped = mapDomainError(err);
    return res.status(mapped.status).json({ code: mapped.code, message: err.message });
  }

  return res.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "unexpected error" });
}
