import mongoose, { Schema, Document } from 'mongoose';

export interface IServicing extends Document {
  id: string;
  customer_name: string;
  customer_phone: string;
  product_name: string;
  product_serial: string;
  issue_description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'delivered';
  cost: number;
  notes: string;
  received_date: string;
  delivery_date: string;
  created_at: string;
  updated_at?: string;
}

const ServicingSchema = new Schema<IServicing>({
  id: { type: String, required: true, unique: true },
  customer_name: { type: String, required: true },
  customer_phone: { type: String, default: '' },
  product_name: { type: String, default: '' },
  product_serial: { type: String, default: '' },
  issue_description: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed', 'delivered'], default: 'pending' },
  cost: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  received_date: { type: String, default: '' },
  delivery_date: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});

export const Servicing = mongoose.model<IServicing>('Servicing', ServicingSchema);
