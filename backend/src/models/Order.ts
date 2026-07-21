import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IOrderItem {
  product_id: string;
  product_name: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  tax: number;
  tax_rate: number;
  total: number;
  line_total: number;
  unit?: string;
  sell_by?: string;
}

export interface IOrder extends Document {
  id: string;
  invoice_no: string;
  customer_id?: string;
  customer_name: string;
  items: IOrderItem[];
  subtotal: number;
  tax_total: number;
  discount_percent: number;
  discount_amount: number;
  discount: number;
  grand_total: number;
  total: number;
  paid: number;
  due: number;
  amount_paid: number;
  change_due: number;
  payment_mode: string;
  payment_method: string;
  cashier_id: string;
  cashier_name: string;
  status: string;
  created_by_id?: string;
  note?: string;
  notes?: string;
  counter_id?: string;
  counter_name?: string;
  delivery_partner_id?: string;
  delivery_partner_name?: string;
  created_at: string;
}

const OrderItemSchema = new Schema<IOrderItem>({
  product_id: { type: String, required: true },
  product_name: { type: String, required: true },
  name: { type: String, default: '' },
  sku: { type: String, default: '' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  tax: { type: Number, default: 0 },
  tax_rate: { type: Number, default: 0 },
  total: { type: Number, required: true },
  line_total: { type: Number, default: 0 },
  unit: { type: String, default: 'pcs' },
  sell_by: { type: String, default: 'unit' },
}, { _id: false });

const OrderSchema = new Schema<IOrder>({
  id: { type: String, required: true, unique: true },
  invoice_no: { type: String, required: true, unique: true },
  customer_id: { type: String },
  customer_name: { type: String, default: 'Walk-in' },
  items: { type: [OrderItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  tax_total: { type: Number, default: 0 },
  discount_percent: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
  paid: { type: Number, default: 0 },
  due: { type: Number, default: 0 },
  amount_paid: { type: Number, default: 0 },
  change_due: { type: Number, default: 0 },
  payment_mode: { type: String, default: 'cash' },
  payment_method: { type: String, default: 'cash' },
  cashier_id: { type: String, default: '' },
  cashier_name: { type: String, default: '' },
  status: { type: String, default: 'completed' },
  created_by_id: { type: String },
  note: { type: String },
  notes: { type: String },
  counter_id: { type: String },
  counter_name: { type: String },
  delivery_partner_id: { type: String },
  delivery_partner_name: { type: String },
  created_at: { type: String, required: true },
});
OrderSchema.plugin(scopePlugin);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);