import mongoose, { Schema, Document } from 'mongoose';

export interface IDamageStock extends Document {
  id: string;
  outlet_id?: string;
  product_id: string;
  product_name: string;
  quantity: number;
  reason: string;
  note?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const DamageStockSchema = new Schema<IDamageStock>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  quantity: { type: Number, required: true },
  reason: { type: String, required: true },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});

export const DamageStock = mongoose.model<IDamageStock>('DamageStock', DamageStockSchema);
