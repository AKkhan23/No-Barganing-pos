import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
  sell_by?: string;
  unit?: string;
}

interface ReceiptData {
  outletName: string;
  outletAddress?: string;
  outletPhone?: string;
  outletGstin?: string;
  invoiceNo: string;
  dateStr: string;
  timeStr: string;
  cashier: string;
  customerName?: string;
  items: ReceiptItem[];
  itemsTotal: number;
  discountAmount: number;
  discountPercent: number;
  taxTotal: number;
  netPayable: number;
  paid: number;
  change: number;
  footer?: string;
  currencySymbol: string;
}

export function generateReceiptPdf(data: ReceiptData): string {
  const { outletName, outletAddress, outletPhone, outletGstin, invoiceNo, dateStr, timeStr, cashier, customerName, items, itemsTotal, discountAmount, discountPercent, taxTotal, netPayable, paid, change, footer, currencySymbol } = data;

  const safeInvoice = (invoiceNo || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '');
  const filename = `receipt-${safeInvoice}-${Date.now()}.pdf`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const doc = new PDFDocument({
    size: [226, 800],
    margin: 8,
    font: 'Courier',
  });

  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  const f = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
  const cen = (text: string) => {
    const w = doc.widthOfString(text);
    doc.text(text, (doc.page.width - w) / 2, undefined, { align: 'center' });
  };
  const sep = () => doc.text('─'.repeat(38));
  const l = (left: string, right: string) => {
    const lw = doc.widthOfString(left);
    const rw = doc.widthOfString(right);
    const dotsNeeded = doc.page.width - 16 - lw - rw;
    const dot = doc.widthOfString('.');
    doc.text(`${left}${'.'.repeat(Math.max(1, Math.floor(dotsNeeded / (dot || 1))))}${right}`);
  };

  doc.fontSize(12).font('Courier-Bold');
  cen(outletName);
  doc.font('Courier').fontSize(7);
  if (outletAddress) cen(outletAddress);
  if (outletPhone) cen(`Ph: ${outletPhone}`);
  if (outletGstin) cen(`GST: ${outletGstin}`);

  doc.fontSize(8);
  sep();

  l('Invoice', invoiceNo);
  l('Date', `${dateStr} ${timeStr}`);
  l('Cashier', cashier);
  if (customerName) l('Customer', customerName);

  sep();

  doc.font('Courier-Bold');
  doc.text('Item                  Qty   Rate    Amt');
  doc.font('Courier');

  items.forEach((i) => {
    const qty = i.quantity;
    const qtyStr = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
    const rateStr = `${currencySymbol}${i.price.toFixed(2)}`;
    const amtStr = f(i.line_total);
    const name = i.name.length > 18 ? i.name.slice(0, 18) : i.name;
    doc.text(`${name.padEnd(18)} ${qtyStr.padStart(4)}  ${rateStr.padStart(6)}  ${amtStr.padStart(6)}`);
  });

  sep();

  l('Subtotal', f(itemsTotal));
  if (discountAmount > 0) l(`Discount (${discountPercent}%)`, `-${f(discountAmount)}`);
  if (taxTotal > 0) l('Tax', `+${f(taxTotal)}`);

  doc.font('Courier-Bold').fontSize(10);
  l('Net Payable', f(netPayable));
  doc.font('Courier').fontSize(8);

  l('Paid', f(paid));
  l('Change', f(change));

  sep();

  if (footer) {
    doc.fontSize(7);
    cen(footer);
  }

  doc.end();

  return filename;
}
