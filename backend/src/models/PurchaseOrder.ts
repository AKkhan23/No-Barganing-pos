import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IPOItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  cost: number;
  tax_rate: number;
  line_total: number;
}

export interface IPurchaseOrder extends Document {
  id: string;
  outlet_id?: string;
  supplier_id: string;
  supplier_name: string;
  reference?: string;
  status: string;
  items: IPOItem[];
  subtotal: number;
  tax_total: number;
  total: number;
  note?: string;
  created_by_id?: string;
  created_by_name?: string;
  created_at: string;
}

const POItemSchema = new Schema<IPOItem>({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true },
  cost: { type: Number, required: true },
  tax_rate: { type: Number, default: 0 },
  line_total: { type: Number, required: true },
}, { _id: false });

const PurchaseOrderSchema = new Schema<IPurchaseOrder>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  supplier_id: { type: String, required: true },
  supplier_name: { type: String, required: true },
  reference: { type: String },
  status: { type: String, default: 'draft' },
  items: { type: [POItemSchema], default: [] },
  subtotal: { type: Number, required: true },
  tax_total: { type: Number, required: true },
  total: { type: Number, required: true },
  note: { type: String },
  created_by_id: { type: String },
  created_by_name: { type: String },
  created_at: { type: String, required: true },
});
PurchaseOrderSchema.index({ supplier_id: 1, created_at: -1 });
PurchaseOrderSchema.index({ created_at: -1 });
PurchaseOrderSchema.plugin(scopePlugin);

export const PurchaseOrder = mongoose.model<IPurchaseOrder>('PurchaseOrder', PurchaseOrderSchema);