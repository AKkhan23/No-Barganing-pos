import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IExpense extends Document {
  id: string;
  outlet_id?: string;
  category: string;
  account: string;
  amount: number;
  note?: string;
  date: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const ExpenseSchema = new Schema<IExpense>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  category: { type: String, required: true, enum: ['rent', 'utility', 'salary', 'misc'] },
  account: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  date: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});
ExpenseSchema.plugin(scopePlugin);

export const Expense = mongoose.model<IExpense>('Expense', ExpenseSchema);
