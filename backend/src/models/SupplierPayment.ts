import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ISupplierPayment extends Document {
  id: string;
  outlet_id?: string;
  supplier_id: string;
  supplier_name: string;
  amount: number;
  mode: string;
  note?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const SupplierPaymentSchema = new Schema<ISupplierPayment>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  supplier_id: { type: String, required: true },
  supplier_name: { type: String, required: true },
  amount: { type: Number, required: true },
  mode: { type: String, required: true, enum: ['cash', 'card', 'upi', 'wallet'] },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});
SupplierPaymentSchema.index({ supplier_id: 1, created_at: -1 });
SupplierPaymentSchema.index({ created_at: -1 });
SupplierPaymentSchema.plugin(scopePlugin);

export const SupplierPayment = mongoose.model<ISupplierPayment>('SupplierPayment', SupplierPaymentSchema);