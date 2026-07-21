import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ICustomerGroup extends Document {
  id: string;
  name: string;
  discount_percent: number;
  description?: string;
  created_at: string;
}

const CustomerGroupSchema = new Schema<ICustomerGroup>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  discount_percent: { type: Number, default: 0 },
  description: { type: String },
  created_at: { type: String, required: true },
});
CustomerGroupSchema.plugin(scopePlugin);

export const CustomerGroup = mongoose.model<ICustomerGroup>('CustomerGroup', CustomerGroupSchema);
