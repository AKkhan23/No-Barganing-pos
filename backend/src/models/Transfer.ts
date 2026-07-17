import mongoose, { Schema, Document } from 'mongoose';

export interface ITransfer extends Document {
  id: string;
  outlet_id?: string;
  from_account: string;
  to_account: string;
  amount: number;
  note?: string;
  created_at: string;
  created_by_id?: string;
  created_by_name?: string;
}

const TransferSchema = new Schema<ITransfer>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  from_account: { type: String, required: true },
  to_account: { type: String, required: true },
  amount: { type: Number, required: true },
  note: { type: String },
  created_at: { type: String, required: true },
  created_by_id: { type: String },
  created_by_name: { type: String },
});

export const Transfer = mongoose.model<ITransfer>('Transfer', TransferSchema);