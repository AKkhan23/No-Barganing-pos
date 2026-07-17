import mongoose, { Schema, Document } from 'mongoose';

export interface ISRItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  tax_rate: number;
  line_total: number;
}

export interface ISaleReturn extends Document {
  id: string;
  outlet_id?: string;
  order_id: string;
  invoice_no: string;
  customer_id?: string;
  customer_name?: string;
  items: ISRItem[];
  subtotal: number;
  tax_total: number;
  total: number;
  refund_mode: string;
  note?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const SRItemSchema = new Schema<ISRItem>({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  tax_rate: { type: Number, default: 0 },
  line_total: { type: Number, required: true },
}, { _id: false });

const SaleReturnSchema = new Schema<ISaleReturn>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  order_id: { type: String, required: true },
  invoice_no: { type: String, required: true },
  customer_id: { type: String },
  customer_name: { type: String },
  items: { type: [SRItemSchema], required: true },
  subtotal: { type: Number, required: true },
  tax_total: { type: Number, required: true },
  total: { type: Number, required: true },
  refund_mode: { type: String, required: true, enum: ['cash', 'card', 'upi', 'wallet'] },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});

export const SaleReturn = mongoose.model<ISaleReturn>('SaleReturn', SaleReturnSchema);