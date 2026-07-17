import mongoose, { Schema, Document } from 'mongoose';

export interface ISupplier extends Document {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  gstin?: string;
  opening_balance: number;
  current_balance: number;
  outlet_id?: string;
  created_at: string;
}

const SupplierSchema = new Schema<ISupplier>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  gstin: { type: String },
  opening_balance: { type: Number, default: 0 },
  current_balance: { type: Number, default: 0 },
  outlet_id: { type: String },
  created_at: { type: String, required: true },
});

export const Supplier = mongoose.model<ISupplier>('Supplier', SupplierSchema);