import mongoose, { Schema, Document } from 'mongoose';

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

export const CustomerGroup = mongoose.model<ICustomerGroup>('CustomerGroup', CustomerGroupSchema);
