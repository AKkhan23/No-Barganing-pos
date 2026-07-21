import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ICategory extends Document {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

const CategorySchema = new Schema<ICategory>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String },
  created_at: { type: String, required: true },
});
CategorySchema.plugin(scopePlugin);

export const Category = mongoose.model<ICategory>('Category', CategorySchema);