import mongoose, { Schema, Document } from 'mongoose';

export interface IDenomination extends Document {
  id: string;
  amount: number;
  description: string;
  created_at: string;
  updated_at?: string;
}

const DenominationSchema = new Schema<IDenomination>({
  id: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  created_at: { type: String, required: true },
  updated_at: { type: String },
});

export const Denomination = mongoose.model<IDenomination>('Denomination', DenominationSchema);
