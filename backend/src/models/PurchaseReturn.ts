import mongoose, { Schema, Document } from 'mongoose';

export interface IPRItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  cost: number;
  line_total: number;
}

export interface IPurchaseReturn extends Document {
  id: string;
  outlet_id?: string;
  supplier_id: string;
  supplier_name: string;
  purchase_order_id?: string;
  items: IPRItem[];
  subtotal: number;
  tax_total: number;
  total: number;
  reason?: string;
  note?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const PRItemSchema = new Schema<IPRItem>({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  cost: { type: Number, required: true },
  line_total: { type: Number, required: true },
}, { _id: false });

const PurchaseReturnSchema = new Schema<IPurchaseReturn>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  supplier_id: { type: String, required: true },
  supplier_name: { type: String, required: true },
  purchase_order_id: { type: String },
  items: { type: [PRItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  tax_total: { type: Number, required: true },
  total: { type: Number, required: true },
  reason: { type: String },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});

export const PurchaseReturn = mongoose.model<IPurchaseReturn>('PurchaseReturn', PurchaseReturnSchema);