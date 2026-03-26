import { NextFunction, Request, Response } from "express";

export function requireDebugEnabled(_req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ code: "NOT_FOUND", message: "debug endpoint disabled" });
  }
  return next();
}
