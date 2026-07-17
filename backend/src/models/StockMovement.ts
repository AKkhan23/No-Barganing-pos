import mongoose, { Schema, Document } from 'mongoose';

export interface IStockMovement extends Document {
  id: string;
  product_id: string;
  product_name: string;
  type: string;
  reason: string;
  change: number;
  quantity: number;
  reference?: string;
  ref?: string;
  note?: string;
  user_id: string;
  user_name: string;
  created_by_id?: string;
  created_at: string;
}

const StockMovementSchema = new Schema<IStockMovement>({
  id: { type: String, required: true, unique: true },
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  type: { type: String, default: 'adjustment' },
  reason: { type: String, default: '' },
  change: { type: Number, default: 0 },
  quantity: { type: Number, default: 0 },
  reference: { type: String },
  ref: { type: String },
  note: { type: String },
  user_id: { type: String, default: '' },
  user_name: { type: String, default: '' },
  created_by_id: { type: String },
  created_at: { type: String, required: true },
});

export const StockMovement = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);