import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IIncomeItem extends Document {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const IncomeItemSchema = new Schema<IIncomeItem>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
IncomeItemSchema.plugin(scopePlugin);

export const IncomeItem = mongoose.model<IIncomeItem>('IncomeItem', IncomeItemSchema);
