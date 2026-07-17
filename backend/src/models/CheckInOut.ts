import mongoose, { Schema, Document } from 'mongoose';

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

export const CheckInOut = mongoose.model<ICheckInOut>('CheckInOut', CheckInOutSchema);
