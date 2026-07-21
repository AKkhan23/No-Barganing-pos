import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IShiftReport extends Document {
  id: string;
  outlet_id?: string;
  user_id: string;
  user_name: string;
  opened_at: string;
  closed_at?: string;
  opening_cash: number;
  closing_cash?: number;
  expected_cash?: number;
  variance?: number;
  note?: string;
  status: string;
  created_at: string;
}

const ShiftReportSchema = new Schema<IShiftReport>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  opened_at: { type: String, required: true },
  closed_at: { type: String },
  opening_cash: { type: Number, required: true },
  closing_cash: { type: Number },
  expected_cash: { type: Number },
  variance: { type: Number },
  note: { type: String },
  status: { type: String, default: 'open', enum: ['open', 'closed'] },
  created_at: { type: String, required: true },
});
ShiftReportSchema.plugin(scopePlugin);

export const ShiftReport = mongoose.model<IShiftReport>('ShiftReport', ShiftReportSchema);