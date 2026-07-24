// import PDFDocument from 'pdfkit';
// import path from 'path';
// import fs from 'fs';

// const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'receipts');

// if (!fs.existsSync(UPLOAD_DIR)) {
//   fs.mkdirSync(UPLOAD_DIR, { recursive: true });
// }

// interface ReceiptItem {
//   name: string;
//   quantity: number;
//   price: number;
//   line_total: number;
//   sell_by?: string;
//   unit?: string;
// }

// interface ReceiptData {
//   outletName: string;
//   outletAddress?: string;
//   outletPhone?: string;
//   outletGstin?: string;
//   invoiceNo: string;
//   dateStr: string;
//   timeStr: string;
//   cashier: string;
//   customerName?: string;
//   items: ReceiptItem[];
//   itemsTotal: number;
//   discountAmount: number;
//   discountPercent: number;
//   taxTotal: number;
//   netPayable: number;
//   paid: number;
//   change: number;
//   footer?: string;
//   currencySymbol: string;
// }

// export function generateReceiptPdf(data: ReceiptData): string {
//   const { outletName, outletAddress, outletPhone, outletGstin, invoiceNo, dateStr, timeStr, cashier, customerName, items, itemsTotal, discountAmount, discountPercent, taxTotal, netPayable, paid, change, footer, currencySymbol } = data;

//   const safeInvoice = (invoiceNo || 'receipt').replace(/[^a-zA-Z0-9_-]/g, '');
//   const filename = `receipt-${safeInvoice}-${Date.now()}.pdf`;
//   const filepath = path.join(UPLOAD_DIR, filename);

//   const doc = new PDFDocument({
//     size: [226, 800],
//     margin: 8,
//     font: 'Courier',
//   });

//   const stream = fs.createWriteStream(filepath);
//   doc.pipe(stream);

//   const f = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
//   const cen = (text: string) => {
//     const w = doc.widthOfString(text);
//     doc.text(text, (doc.page.width - w) / 2, undefined, { align: 'center' });
//   };
//   const sep = () => doc.text('─'.repeat(38));
//   const l = (left: string, right: string) => {
//     const lw = doc.widthOfString(left);
//     const rw = doc.widthOfString(right);
//     const dotsNeeded = doc.page.width - 16 - lw - rw;
//     const dot = doc.widthOfString('.');
//     doc.text(`${left}${'.'.repeat(Math.max(1, Math.floor(dotsNeeded / (dot || 1))))}${right}`);
//   };

//   doc.fontSize(12).font('Courier-Bold');
//   cen(outletName);
//   doc.font('Courier').fontSize(7);
//   if (outletAddress) cen(outletAddress);
//   if (outletPhone) cen(`Ph: ${outletPhone}`);
//   if (outletGstin) cen(`GST: ${outletGstin}`);

//   doc.fontSize(8);
//   sep();

//   l('Invoice', invoiceNo);
//   l('Date', `${dateStr} ${timeStr}`);
//   l('Cashier', cashier);
//   if (customerName) l('Customer', customerName);

//   sep();

//   doc.font('Courier-Bold');
//   doc.text('Item                  Qty   Rate    Amt');
//   doc.font('Courier');

//   items.forEach((i) => {
//     const qty = i.quantity;
//     const qtyStr = Number.isInteger(qty) ? String(qty) : qty.toFixed(2);
//     const rateStr = `${currencySymbol}${i.price.toFixed(2)}`;
//     const amtStr = f(i.line_total);
//     const name = i.name.length > 18 ? i.name.slice(0, 18) : i.name;
//     doc.text(`${name.padEnd(18)} ${qtyStr.padStart(4)}  ${rateStr.padStart(6)}  ${amtStr.padStart(6)}`);
//   });

//   sep();

//   l('Subtotal', f(itemsTotal));
//   if (discountAmount > 0) l(`Discount (${discountPercent}%)`, `-${f(discountAmount)}`);
//   if (taxTotal > 0) l('Tax', `+${f(taxTotal)}`);

//   doc.font('Courier-Bold').fontSize(10);
//   l('Net Payable', f(netPayable));
//   doc.font('Courier').fontSize(8);

//   l('Paid', f(paid));
//   l('Change', f(change));

//   sep();

//   if (footer) {
//     doc.fontSize(7);
//     cen(footer);
//   }

//   doc.end();

//   return filename;
// }

import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "receipts");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  line_total: number;
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

// ---- theme colors (matches the reference receipt look) ----
const COLORS = {
  headerBg: "#111111",
  headerText: "#ffffff",
  title: "#111111",
  subtitleGreen: "#2f8f5b",
  contactBlue: "#3366cc",
  label: "#333333",
  value: "#111111",
  lineGray: "#dddddd",
  discountRed: "#c0392b",
  footerBlue: "#3366cc",
};

export function generateReceiptPdf(data: ReceiptData): string {
  const {
    outletName,
    outletAddress,
    outletPhone,
    outletGstin,
    invoiceNo,
    dateStr,
    timeStr,
    cashier,
    customerName,
    items,
    itemsTotal,
    discountAmount,
    discountPercent,
    taxTotal,
    netPayable,
    paid,
    change,
    footer,
    currencySymbol,
  } = data;

  const safeInvoice = (invoiceNo || "receipt").replace(/[^a-zA-Z0-9_-]/g, "");
  const filename = `receipt-${safeInvoice}-${Date.now()}.pdf`;
  const filepath = path.join(UPLOAD_DIR, filename);

  const PAGE_W = 340;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // rough height estimate so page isn't cut short / too long
  const estHeight = 260 + items.length * 20 + (footer ? 40 : 0);

  const doc = new PDFDocument({
    size: [PAGE_W, Math.max(estHeight, 500)],
    margin: 0,
    font: "Helvetica",
  });

  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  const f = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
  const cen = (text: string, y: number, opts: any = {}) =>
    doc.text(text, MARGIN, y, { width: CONTENT_W, align: "center", ...opts });

  let y = 0;

  // ---- Header bar ----
  doc.rect(0, 0, PAGE_W, 40).fill(COLORS.headerBg);
  doc.fillColor(COLORS.headerText).font("Helvetica-Bold").fontSize(11);
  doc.text("RECEIPT", MARGIN, 14);
  doc.fontSize(14).text("×", PAGE_W - MARGIN - 10, 10);

  y = 55;

  // ---- Store title ----
  doc.fillColor(COLORS.title).font("Helvetica-Bold").fontSize(18);
  cen(outletName, y);
  y += 24;

  doc.font("Helvetica").fontSize(9);
  if (outletAddress) {
    doc.fillColor(COLORS.subtitleGreen);
    cen(outletAddress, y);
    y += 14;
  }
  if (outletPhone || outletGstin) {
    doc.fillColor(COLORS.contactBlue);
    const line = [
      outletPhone ? `Ph: ${outletPhone}` : "",
      outletGstin ? `GST: ${outletGstin}` : "",
    ]
      .filter(Boolean)
      .join("  |  ");
    cen(line, y);
    y += 18;
  }

  const hr = (yy: number) => {
    doc
      .moveTo(MARGIN, yy)
      .lineTo(PAGE_W - MARGIN, yy)
      .dash(2, { space: 2 })
      .strokeColor(COLORS.lineGray)
      .stroke()
      .undash();
  };

  hr(y);
  y += 10;

  // ---- Meta rows ----
  const metaRow = (label: string, value: string) => {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(COLORS.label)
      .text(label, MARGIN, y);
    doc
      .font("Helvetica-Bold")
      .fillColor(COLORS.value)
      .text(value, MARGIN, y, { width: CONTENT_W, align: "right" });
    y += 16;
  };

  metaRow("Invoice", invoiceNo);
  metaRow("Date", `${dateStr} ${timeStr}`);
  metaRow("Cashier", cashier);
  metaRow("Customer", customerName || "Walk-in");

  y += 4;
  hr(y);
  y += 14;

  // ---- Items table header ----
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.label);
  doc.text("Items", MARGIN, y, { width: 110 });
  doc.text("Qty", MARGIN + 110, y, { width: 60, align: "center" });
  doc.text("Rate", MARGIN + 170, y, { width: 60, align: "right" });
  doc.text("Amount", MARGIN + 230, y, {
    width: CONTENT_W - 230,
    align: "right",
  });
  y += 14;
  hr(y);
  y += 10;

  // ---- Items ----
  doc.font("Helvetica").fontSize(9).fillColor(COLORS.value);
  items.forEach((i) => {
    const qtyStr = Number.isInteger(i.quantity)
      ? String(i.quantity)
      : i.quantity.toFixed(2);
    doc.text(i.name, MARGIN, y, { width: 110 });
    doc.text(qtyStr, MARGIN + 110, y, { width: 60, align: "center" });
    doc.text(f(i.price), MARGIN + 170, y, { width: 60, align: "right" });
    doc.text(f(i.line_total), MARGIN + 230, y, {
      width: CONTENT_W - 230,
      align: "right",
    });
    y += 18;
  });

  y += 4;
  hr(y);
  y += 12;

  // ---- Totals ----
  const totalRow = (
    label: string,
    value: string,
    color = COLORS.value,
    bold = false,
  ) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 13 : 10);
    doc
      .fillColor(COLORS.label)
      .text(label, MARGIN, y, { width: CONTENT_W * 0.5 });
    doc
      .fillColor(color)
      .text(value, MARGIN, y, { width: CONTENT_W, align: "right" });
    y += bold ? 22 : 16;
  };

  totalRow("Subtotal", f(itemsTotal));
  if (discountAmount > 0) {
    totalRow(
      `Discount (${discountPercent}%)`,
      `-${f(discountAmount)}`,
      COLORS.discountRed,
    );
  }
  if (taxTotal > 0) {
    totalRow("Tax", `+${f(taxTotal)}`);
  }

  hr(y);
  y += 10;

  totalRow("Net Payable", f(netPayable), COLORS.title, true);

  totalRow("Paid", f(paid));
  totalRow("Change", f(change));

  y += 6;
  hr(y);
  y += 14;

  // ---- Footer ----
  if (footer) {
    doc.font("Helvetica").fontSize(8).fillColor(COLORS.footerBlue);
    cen(footer, y);
  }

  doc.end();

  return filename;
}
