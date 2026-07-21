import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IAccount extends Document {
  id: string;
  name: string;
  type: string;
  opening_balance: number;
  current_balance: number;
  outlet_id?: string;
  created_at: string;
}

const AccountSchema = new Schema<IAccount>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  opening_balance: { type: Number, default: 0 },
  current_balance: { type: Number, default: 0 },
  outlet_id: { type: String },
  created_at: { type: String, required: true },
});
AccountSchema.plugin(scopePlugin);

export const Account = mongoose.model<IAccount>('Account', AccountSchema);
