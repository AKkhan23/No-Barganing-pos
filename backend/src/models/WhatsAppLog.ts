import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IWhatsAppLog extends Document {
  id: string;
  phone: string;
  message: string;
  invoice_no?: string;
  status: string;
  error?: string;
  created_at: string;
}

const WhatsAppLogSchema = new Schema<IWhatsAppLog>({
  id: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  message: { type: String, required: true },
  invoice_no: { type: String },
  status: { type: String, default: 'stubbed' },
  error: { type: String },
  created_at: { type: String, required: true },
});
WhatsAppLogSchema.plugin(scopePlugin);

export const WhatsAppLog = mongoose.model<IWhatsAppLog>('WhatsAppLog', WhatsAppLogSchema);