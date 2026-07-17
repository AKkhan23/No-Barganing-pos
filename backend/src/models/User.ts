import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  password_hash: string;
  phone: string;
  security_question: string;
  security_answer: string;
  created_at: string;
  updated_at: string;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: 'cashier' },
  active: { type: Boolean, default: true },
  password_hash: { type: String, required: true },
  phone: { type: String, default: '' },
  security_question: { type: String, default: '' },
  security_answer: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
});

export const User = mongoose.model<IUser>('User', UserSchema);
