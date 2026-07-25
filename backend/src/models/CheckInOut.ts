import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ICheckInOut extends Document {
  id: string;
  user_id: string;
  user_name: string;
  action: 'check_in' | 'check_out';
  timestamp: string;
  note: string;
  created_at: string;
}

const CheckInOutSchema = new Schema<ICheckInOut>({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  action: { type: String, enum: ['check_in', 'check_out'], required: true },
  timestamp: { type: String, required: true },
  note: { type: String, default: '' },
  created_at: { type: String, required: true },
});
CheckInOutSchema.index({ user_id: 1, created_at: -1 });
CheckInOutSchema.index({ user_id: 1, action: 1, timestamp: -1 });
CheckInOutSchema.plugin(scopePlugin);

export const CheckInOut = mongoose.model<ICheckInOut>('CheckInOut', CheckInOutSchema);
