import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface INotification extends Document {
  id: string;
  outlet_id?: string;
  type: string;
  title: string;
  message: string;
  ref?: string;
  read: boolean;
  created_at: string;
}

const NotificationSchema = new Schema<INotification>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  type: { type: String, required: true, enum: ['low_stock', 'due', 'salary', 'birthday', 'system'] },
  title: { type: String, required: true },
  message: { type: String, required: true },
  ref: { type: String },
  read: { type: Boolean, default: false },
  created_at: { type: String, required: true },
});
NotificationSchema.plugin(scopePlugin);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
