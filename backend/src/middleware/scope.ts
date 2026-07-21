import { Request } from 'express';

export function scopeFilter(req: Request) {
  if (!req.user) return {};
  if (req.user.role === 'super_admin') return {};
  return { $or: [{ created_by: req.user.id }, { created_by: null }, { created_by: { $exists: false } }] };
}
