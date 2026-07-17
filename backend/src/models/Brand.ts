import mongoose, { Schema, Document } from 'mongoose';

export interface IBrand extends Document {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const BrandSchema = new Schema<IBrand>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});

export const Brand = mongoose.model<IBrand>('Brand', BrandSchema);
