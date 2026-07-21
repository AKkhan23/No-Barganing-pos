import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IStockBatch extends Document {
  id: string;
  product_id: string;
  product_name: string;
  batch_no: string;
  expiry_date?: string;
  mfg_date?: string;
  quantity: number;
  cost_price: number;
  created_at: string;
}

const StockBatchSchema = new Schema<IStockBatch>({
  id: { type: String, required: true, unique: true },
  product_id: { type: String, required: true, index: true },
  product_name: { type: String, required: true },
  batch_no: { type: String, required: true },
  expiry_date: { type: String },
  mfg_date: { type: String },
  quantity: { type: Number, required: true, default: 0 },
  cost_price: { type: Number, default: 0 },
  created_at: { type: String, required: true },
});
StockBatchSchema.plugin(scopePlugin);

StockBatchSchema.index({ product_id: 1, expiry_date: 1 });

export const StockBatch = mongoose.model<IStockBatch>('StockBatch', StockBatchSchema);
