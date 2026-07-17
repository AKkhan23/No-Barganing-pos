import mongoose, { Schema, Document } from 'mongoose';

export interface IPayroll extends Document {
  id: string;
  outlet_id?: string;
  user_id: string;
  user_name: string;
  month: string;
  base: number;
  advance: number;
  bonus: number;
  deduction: number;
  net: number;
  paid: boolean;
  paid_via?: string;
  created_at: string;
}

const PayrollSchema = new Schema<IPayroll>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  month: { type: String, required: true },
  base: { type: Number, required: true },
  advance: { type: Number, default: 0 },
  bonus: { type: Number, default: 0 },
  deduction: { type: Number, default: 0 },
  net: { type: Number, required: true },
  paid: { type: Boolean, default: false },
  paid_via: { type: String, enum: ['cash','bank','upi','wallet'] },
  created_at: { type: String, required: true },
});

export const Payroll = mongoose.model<IPayroll>('Payroll', PayrollSchema);