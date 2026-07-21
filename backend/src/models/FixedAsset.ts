import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IFixedAsset extends Document {
  id: string;
  name: string;
  purchase_date: string;
  purchase_price: number;
  current_value: number;
  depreciation_method: string;
  depreciation_rate: number;
  useful_life_years: number;
  location?: string;
  category?: string;
  notes?: string;
  active: boolean;
  created_at: string;
}

const FixedAssetSchema = new Schema<IFixedAsset>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  purchase_date: { type: String, default: '' },
  purchase_price: { type: Number, default: 0 },
  current_value: { type: Number, default: 0 },
  depreciation_method: { type: String, default: 'straight_line' },
  depreciation_rate: { type: Number, default: 0 },
  useful_life_years: { type: Number, default: 5 },
  location: { type: String },
  category: { type: String },
  notes: { type: String },
  active: { type: Boolean, default: true },
  created_at: { type: String, required: true },
});
FixedAssetSchema.plugin(scopePlugin);

export const FixedAsset = mongoose.model<IFixedAsset>('FixedAsset', FixedAssetSchema);
