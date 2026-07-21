import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface IUnit extends Document {
  id: string;
  unit_name: string;
  description: string;
  created_at: string;
  updated_at?: string;
}

const UnitSchema = new Schema<IUnit>({
  id: { type: String, required: true, unique: true },
  unit_name: { type: String, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});
UnitSchema.plugin(scopePlugin);

export const Unit = mongoose.model<IUnit>('Unit', UnitSchema);
