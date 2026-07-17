import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentMethod extends Document {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'upi' | 'bank' | 'other';
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['cash', 'card', 'upi', 'bank', 'other'], required: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});

export const PaymentMethod = mongoose.model<IPaymentMethod>('PaymentMethod', PaymentMethodSchema);
