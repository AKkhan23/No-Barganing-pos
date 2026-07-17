import mongoose, { Schema, Document } from 'mongoose';

export interface IIncome extends Document {
  id: string;
  outlet_id?: string;
  source: string;
  account: string;
  amount: number;
  note?: string;
  date: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const IncomeSchema = new Schema<IIncome>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  source: { type: String, required: true },
  account: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  date: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});

export const Income = mongoose.model<IIncome>('Income', IncomeSchema);
