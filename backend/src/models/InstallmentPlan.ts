import mongoose, { Schema, Document } from 'mongoose';

export interface IInstallmentPlan extends Document {
  id: string;
  order_id?: string;
  customer_id?: string;
  customer_name: string;
  total_amount: number;
  down_payment: number;
  installment_amount: number;
  total_installments: number;
  installments_paid: number;
  status: string;
  due_date: string;
  created_at: string;
}

const InstallmentPlanSchema = new Schema<IInstallmentPlan>({
  id: { type: String, required: true, unique: true },
  order_id: { type: String },
  customer_id: { type: String },
  customer_name: { type: String, default: '' },
  total_amount: { type: Number, default: 0 },
  down_payment: { type: Number, default: 0 },
  installment_amount: { type: Number, default: 0 },
  total_installments: { type: Number, default: 1 },
  installments_paid: { type: Number, default: 0 },
  status: { type: String, default: 'active' },
  due_date: { type: String, default: '' },
  created_at: { type: String, required: true },
});

export const InstallmentPlan = mongoose.model<IInstallmentPlan>('InstallmentPlan', InstallmentPlanSchema);
