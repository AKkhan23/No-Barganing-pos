import { randomUUID } from 'crypto';
import { Order } from '../models/Order';

let invoiceCounter = 0;
let initialized = false;

async function initCounter(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const last = await Order.findOne().sort({ created_at: -1 }).select('invoice_no').lean() as any;
  if (last?.invoice_no) {
    const parts = last.invoice_no.split('-');
    const num = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(num)) invoiceCounter = num;
  }
}

export async function generateInvoiceNo(): Promise<string> {
  await initCounter();
  invoiceCounter += 1;
  const date = new Date();
  const yymm = `${date.getFullYear().toString().slice(-2)}${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `INV-${yymm}-${String(invoiceCounter).padStart(6, '0')}`;
}

export function generateId(): string {
  return randomUUID();
}

export function computeEAN13(seed: string): string {
  const digits = seed.replace(/\D/g, '').padStart(12, '0').slice(-12);
  if (digits.length !== 12) return seed;
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}

export function generateBarcode12(seed: string): string {
  const digits = seed.replace(/\D/g, '').padStart(12, '0').slice(-12);
  return digits.length === 12 ? digits : digits.padEnd(12, '0');
}
