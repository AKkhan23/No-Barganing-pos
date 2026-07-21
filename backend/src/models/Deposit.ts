import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IDeposit extends Document {
  id: string;
  customer_name: string;
  customer_phone: string;
  amount: number;
  payment_method: string;
  note: string;
  date: string;
  created_at: string;
  updated_at?: string;
}

const DepositSchema = new Schema<IDeposit>({
  id: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, default: '' },
  amount: { type: Number, required: true },
  payment_method: { type: String, default: '' },
  note: { type: String, default: '' },
  date: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
DepositSchema.plugin(scopePlugin);

export const Deposit = mongoose.model<IDeposit>('Deposit', DepositSchema);
