import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

const RoleSchema = new Schema<IRole>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  permissions: { type: [String], default: [] },
  is_system: { type: Boolean, default: false },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
});

export const Role = mongoose.model<IRole>('Role', RoleSchema);
