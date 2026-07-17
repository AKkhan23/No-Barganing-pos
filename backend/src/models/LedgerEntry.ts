import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerEntry extends Document {
  id: string;
  outlet_id?: string;
  date: string;
  account: string;
  party_type?: string;
  party_id?: string;
  debit: number;
  credit: number;
  reference: string;
  note: string;
  created_by_id?: string;
  created_by_name?: string;
  created_at: string;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>({
  id: { type: String, required: true, unique: true },
  outlet_id: { type: String },
  date: { type: String },
  account: { type: String, required: true },
  party_type: { type: String },
  party_id: { type: String },
  debit: { type: Number, default: 0 },
  credit: { type: Number, default: 0 },
  reference: { type: String, default: '' },
  note: { type: String, default: '' },
  created_by_id: { type: String },
  created_by_name: { type: String },
  created_at: { type: String, required: true },
});

export const LedgerEntry = mongoose.model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
