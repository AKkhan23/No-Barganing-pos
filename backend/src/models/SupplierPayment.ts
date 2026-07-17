import mongoose, { Schema, Document } from 'mongoose';

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

export const SupplierPayment = mongoose.model<ISupplierPayment>('SupplierPayment', SupplierPaymentSchema);