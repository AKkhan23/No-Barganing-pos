import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ICounter extends Document {
  id: string;
  name: string;
  outlet_id: string;
  printer_id: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const CounterSchema = new Schema<ICounter>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  outlet_id: { type: String, default: '' },
  printer_id: { type: String, default: '' },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
CounterSchema.plugin(scopePlugin);

export const Counter = mongoose.model<ICounter>('Counter', CounterSchema);
