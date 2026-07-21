import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IWarranty extends Document {
  id: string;
  order_id?: string;
  product_id?: string;
  product_name: string;
  customer_id?: string;
  customer_name: string;
  sale_date: string;
  warranty_period_days: number;
  expiry_date: string;
  service_status: string;
  notes?: string;
  created_at: string;
}

const WarrantySchema = new Schema<IWarranty>({
  id: { type: String, required: true, unique: true },
  order_id: { type: String },
  product_id: { type: String },
  product_name: { type: String, default: '' },
  customer_id: { type: String },
  customer_name: { type: String, default: '' },
  sale_date: { type: String, default: '' },
  warranty_period_days: { type: Number, default: 365 },
  expiry_date: { type: String, default: '' },
  service_status: { type: String, default: 'active' },
  notes: { type: String },
  created_at: { type: String, required: true },
});
WarrantySchema.plugin(scopePlugin);

export const Warranty = mongoose.model<IWarranty>('Warranty', WarrantySchema);