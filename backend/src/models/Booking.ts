import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IBookingItem {
  product_id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  tax_rate: number;
  line_total: number;
}

export interface IBooking extends Document {
  id: string;
  outlet_id?: string;
  customer_id?: string;
  customer_name?: string;
  items: IBookingItem[];
  token_amount: number;
  deposit: number;
  status: string;
  note?: string;
  created_at: string;
  created_by_id: string;
  created_by_name: string;
}

const BookingItemSchema = new Schema<IBookingItem>({
  product_id: { type: String, required: true },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  tax_rate: { type: Number, default: 0 },
  line_total: { type: Number, required: true },
}, { _id: false });

const BookingSchema = new Schema<IBooking>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  customer_id: { type: String },
  customer_name: { type: String },
  items: { type: [BookingItemSchema], default: [] },
  token_amount: { type: Number, required: true },
  deposit: { type: Number, required: true },
  status: { type: String, default: 'open' },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String, required: true },
  created_by_name: { type: String, required: true },
});
BookingSchema.plugin(scopePlugin);

export const Booking = mongoose.model<IBooking>('Booking', BookingSchema);
