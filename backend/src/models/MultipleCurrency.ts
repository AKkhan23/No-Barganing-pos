import mongoose, { Schema, Document } from 'mongoose';

export interface IMultipleCurrency extends Document {
  id: string;
  currency: string;
  conversion_rate: number;
  created_at: string;
  updated_at?: string;
}

const MultipleCurrencySchema = new Schema<IMultipleCurrency>({
  id: { type: String, required: true, unique: true },
  currency: { type: String, required: true },
  conversion_rate: { type: Number, required: true },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});

export const MultipleCurrency = mongoose.model<IMultipleCurrency>('MultipleCurrency', MultipleCurrencySchema);
