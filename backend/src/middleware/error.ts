import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export function globalErrorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  logger.error(`Unhandled error on ${req.method} ${req.path}:`, err);
  res.status(500).json({ detail: 'Internal server error' });
}
