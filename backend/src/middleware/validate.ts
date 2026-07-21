import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export function validate(schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const details = result.error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));
        res.status(422).json({ detail: 'Validation failed', errors: details });
        return;
      }
      req[source] = result.data;
      next();
    } catch (err: any) {
      console.error('Validate error:', err?.message || err);
      res.status(500).json({ detail: err?.message || 'Internal server error' });
    }
  };
}
