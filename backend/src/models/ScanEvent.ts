import mongoose, { Schema, Document } from 'mongoose';

export interface IScanEvent extends Document {
  id: string;
  barcode: string;
  product_id: string;
  scanned_by: string;
  created_at: string;
}

const ScanEventSchema = new Schema<IScanEvent>({
  id: { type: String, required: true, unique: true },
  barcode: { type: String, required: true },
  product_id: { type: String, required: true },
  scanned_by: { type: String, required: true },
  created_at: { type: String, required: true },
}, { timestamps: false });

ScanEventSchema.index({ created_at: -1 });
ScanEventSchema.index({ scanned_by: 1, created_at: -1 });

export const ScanEvent = mongoose.model<IScanEvent>('ScanEvent', ScanEventSchema);
