import { Request } from 'express';

export function scopeFilter(req: Request) {
  if (!req.user) return {};
  if (req.user.role === 'super_admin') return {};
  return { created_by: req.user.id };
}
