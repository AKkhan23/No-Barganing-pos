import mongoose, { Schema, Document } from 'mongoose';

export interface IWhatsAppLog extends Document {
  id: string;
  phone: string;
  message: string;
  invoice_no?: string;
  status: string;
  created_at: string;
}

const WhatsAppLogSchema = new Schema<IWhatsAppLog>({
  id: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  invoice_no: { type: String },
  status: { type: String, default: 'stubbed' },
  created_at: { type: String, required: true },
});

export const WhatsAppLog = mongoose.model<IWhatsAppLog>('WhatsAppLog', WhatsAppLogSchema);