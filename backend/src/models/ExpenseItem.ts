import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IExpenseItem extends Document {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const ExpenseItemSchema = new Schema<IExpenseItem>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
ExpenseItemSchema.plugin(scopePlugin);

export const ExpenseItem = mongoose.model<IExpenseItem>('ExpenseItem', ExpenseItemSchema);
