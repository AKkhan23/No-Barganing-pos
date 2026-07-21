import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ICustomer extends Document {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  opening_balance: number;
  loyalty_points: number;
  total_spent: number;
  receivable: number;
  outlet_id?: string;
  created_at: string;
  updated_at: string;
}

const CustomerSchema = new Schema<ICustomer>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  address: { type: String },
  opening_balance: { type: Number, default: 0 },
  loyalty_points: { type: Number, default: 0 },
  total_spent: { type: Number, default: 0 },
  receivable: { type: Number, default: 0 },
  outlet_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
});
CustomerSchema.plugin(scopePlugin);

export const Customer = mongoose.model<ICustomer>('Customer', CustomerSchema);