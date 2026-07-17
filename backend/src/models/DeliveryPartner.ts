import mongoose, { Schema, Document } from 'mongoose';

export interface IDeliveryPartner extends Document {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  vehicle_no?: string;
  commission_type: string;
  commission_value: number;
  active: boolean;
  created_at: string;
}

const DeliveryPartnerSchema = new Schema<IDeliveryPartner>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String },
  email: { type: String },
  address: { type: String },
  vehicle_no: { type: String },
  commission_type: { type: String, default: 'fixed' },
  commission_value: { type: Number, default: 0 },
  active: { type: Boolean, default: true },
  created_at: { type: String, required: true },
});

export const DeliveryPartner = mongoose.model<IDeliveryPartner>('DeliveryPartner', DeliveryPartnerSchema);
