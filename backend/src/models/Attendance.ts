import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IAttendance extends Document {
  id: string;
  outlet_id?: string;
  user_id: string;
  user_name: string;
  role: string;
  check_in?: string;
  check_out?: string;
  latitude?: number;
  longitude?: number;
  date: string;
  total_hours: number;
  created_at: string;
}

const AttendanceSchema = new Schema<IAttendance>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  user_id: { type: String, required: true },
  user_name: { type: String, required: true },
  role: { type: String, required: true },
  check_in: { type: String },
  check_out: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  date: { type: String, required: true },
  total_hours: { type: Number, default: 0 },
  created_at: { type: String, required: true },
});
AttendanceSchema.plugin(scopePlugin);

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
