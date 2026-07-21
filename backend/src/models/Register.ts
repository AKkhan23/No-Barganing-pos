import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IRegister extends Document {
  id: string;
  name: string;
  type: 'main' | 'counter';
  is_active: boolean;
  opening_cash: number;
  cash_in_hand: number;
  created_at: string;
  updated_at?: string;
}

const RegisterSchema = new Schema<IRegister>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['main', 'counter'], required: true },
  is_active: { type: Boolean, default: true },
  opening_cash: { type: Number, default: 0 },
  cash_in_hand: { type: Number, default: 0 },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
RegisterSchema.plugin(scopePlugin);

export const Register = mongoose.model<IRegister>('Register', RegisterSchema);
