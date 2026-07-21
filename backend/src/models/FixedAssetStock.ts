import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IFixedAssetStock extends Document {
  id: string;
  asset_id: string;
  asset_name: string;
  type: 'in' | 'out';
  quantity: number;
  quantity_unit: string;
  notes?: string;
  reference?: string;
  created_by?: string;
  created_at: string;
}

const FixedAssetStockSchema = new Schema<IFixedAssetStock>({
  id: { type: String, required: true, unique: true },
  asset_id: { type: String, required: true, index: true },
  asset_name: { type: String, required: true },
  type: { type: String, enum: ['in', 'out'], required: true },
  quantity: { type: Number, required: true, default: 0 },
  quantity_unit: { type: String, default: 'quantity' },
  notes: { type: String },
  reference: { type: String },
  created_by: { type: String },
  created_at: { type: String, required: true },
});
FixedAssetStockSchema.plugin(scopePlugin);

export const FixedAssetStock = mongoose.model<IFixedAssetStock>('FixedAssetStock', FixedAssetStockSchema);
