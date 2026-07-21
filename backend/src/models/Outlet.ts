import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IOutlet extends Document {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  gstin?: string;
  is_active: boolean;
  created_at: string;
}

const OutletSchema = new Schema<IOutlet>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  gstin: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: String, required: true },
});
OutletSchema.plugin(scopePlugin);

export const Outlet = mongoose.model<IOutlet>('Outlet', OutletSchema);