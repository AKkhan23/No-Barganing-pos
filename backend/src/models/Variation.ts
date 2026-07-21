import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IVariation extends Document {
  id: string;
  variation_name: string;
  variation_values: string[];
  created_at: string;
  updated_at?: string;
}

const VariationSchema = new Schema<IVariation>({
  id: { type: String, required: true, unique: true },
  variation_name: { type: String, required: true },
  variation_values: { type: [String], default: [] },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
VariationSchema.plugin(scopePlugin);

export const Variation = mongoose.model<IVariation>('Variation', VariationSchema);
