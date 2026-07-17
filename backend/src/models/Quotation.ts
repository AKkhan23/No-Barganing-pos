import mongoose, { Schema, Document } from 'mongoose';

export interface IQuotationItem {
  product_id: string;
  product_name: string;
  quantity: number;
  price: number;
  tax: number;
  total: number;
}

export interface IQuotation extends Document {
  id: string;
  quote_no: string;
  customer_id?: string;
  customer_name: string;
  items: IQuotationItem[];
  subtotal: number;
  tax_total: number;
  discount: number;
  grand_total: number;
  status: string;
  valid_until: string;
  notes?: string;
  created_by_id?: string;
  created_at: string;
}

const QuotationItemSchema = new Schema<IQuotationItem>({
  product_id: { type: String, default: '' },
  product_name: { type: String, default: '' },
  quantity: { type: Number, default: 1 },
  price: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  total: { type: Number, default: 0 },
}, { _id: false });

const QuotationSchema = new Schema<IQuotation>({
  id: { type: String, required: true, unique: true },
  quote_no: { type: String, default: '' },
  customer_id: { type: String },
  customer_name: { type: String, default: '' },
  items: { type: [QuotationItemSchema], default: [] },
  subtotal: { type: Number, default: 0 },
  tax_total: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  grand_total: { type: Number, default: 0 },
  status: { type: String, default: 'draft' },
  valid_until: { type: String, default: '' },
  notes: { type: String },
  created_by_id: { type: String },
  created_at: { type: String, required: true },
});

export const Quotation = mongoose.model<IQuotation>('Quotation', QuotationSchema);