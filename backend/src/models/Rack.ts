import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IRack extends Document {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const RackSchema = new Schema<IRack>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
RackSchema.plugin(scopePlugin);

export const Rack = mongoose.model<IRack>('Rack', RackSchema);
