import mongoose, { Schema, Document } from 'mongoose';

export interface IPromotion extends Document {
  id: string;
  name: string;
  type: string;
  discount_value: number;
  min_purchase: number;
  valid_from: string;
  valid_to: string;
  applicable_products: string[];
  applicable_categories: string[];
  active: boolean;
  max_discount?: number;
  usage_limit?: number;
  used_count: number;
  outlet_id?: string;
  created_at: string;
  created_by_id?: string;
}

const PromotionSchema = new Schema<IPromotion>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, default: 'percentage', enum: ['percentage','fixed','buy_x_get_y'] },
  discount_value: { type: Number, default: 0 },
  min_purchase: { type: Number, default: 0 },
  valid_from: { type: String, default: '' },
  valid_to: { type: String, default: '' },
  applicable_products: { type: [String], default: [] },
  applicable_categories: { type: [String], default: [] },
  active: { type: Boolean, default: true },
  max_discount: { type: Number },
  usage_limit: { type: Number },
  used_count: { type: Number, default: 0 },
  outlet_id: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
});

export const Promotion = mongoose.model<IPromotion>('Promotion', PromotionSchema);