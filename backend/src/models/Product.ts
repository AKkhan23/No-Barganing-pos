import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IProduct extends Document {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  category?: string;
  price: number;
  cost: number;
  tax_rate: number;
  stock: number;
  low_stock_threshold: number;
  unit: string;
  sell_by: string;
  image_url?: string;
  active: boolean;
  brand?: string;
  rack?: string;
  variant_group_id?: string;
  variant_name?: string;
  repack_parent_id?: string;
  created_at: string;
  updated_at: string;
}

const ProductSchema = new Schema<IProduct>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  barcode: { type: String },
  category: { type: String },
  price: { type: Number, required: true },
  cost: { type: Number, default: 0 },
  tax_rate: { type: Number, default: 0 },
  stock: { type: Number, default: 0 },
  low_stock_threshold: { type: Number, default: 5 },
  unit: { type: String, default: 'pcs' },
  sell_by: { type: String, default: 'pcs' },
  image_url: { type: String },
  active: { type: Boolean, default: true },
  brand: { type: String },
  rack: { type: String },
  variant_group_id: { type: String },
  variant_name: { type: String },
  repack_parent_id: { type: String },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
});
ProductSchema.plugin(scopePlugin);

export const Product = mongoose.model<IProduct>('Product', ProductSchema);
