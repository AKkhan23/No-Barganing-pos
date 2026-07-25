import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "uploads", "receipts");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const FONTS_DIR = path.join(process.cwd(), "assets", "fonts");

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

  const estHeight = 260 + items.length * 20 + (footer ? 40 : 0) + 40;

  const doc = new PDFDocument({
    size: [PAGE_W, Math.max(estHeight, 500)],
    margin: 0,
  });

  let FONT = "Helvetica";
  let FONT_BOLD = "Helvetica-Bold";
  const regularPath = path.join(FONTS_DIR, "NotoSans.ttf");
  const boldPath = path.join(FONTS_DIR, "NotoSans-Bold.ttf");
  if (fs.existsSync(regularPath) && fs.existsSync(boldPath)) {
    try {
      doc.registerFont("NotoSans", regularPath);
      doc.registerFont("NotoSans-Bold", boldPath);
      FONT = "NotoSans";
      FONT_BOLD = "NotoSans-Bold";
    } catch {}
  }

  const stream = fs.createWriteStream(filepath);
  doc.pipe(stream);

  const fmt = (n: number) => `${currencySymbol}${n.toFixed(2)}`;
  const cen = (text: string, y: number, opts: any = {}) =>
    doc.text(text, MARGIN, y, { width: CONTENT_W, align: "center", ...opts });

  let y = 0;

  y = 20;

  doc.fillColor(COLORS.title).font(FONT_BOLD).fontSize(18);
  cen(outletName, y);
  y += 24;

  doc.font(FONT).fontSize(9);
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

  const metaRow = (label: string, value: string) => {
    doc.font(FONT).fontSize(9).fillColor(COLORS.label).text(label, MARGIN, y);
    doc
      .font(FONT_BOLD)
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

  doc.font(FONT_BOLD).fontSize(9).fillColor(COLORS.label);
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

  const colW = { name: 110, qty: 60, rate: 60, amount: CONTENT_W - 230 };
  const colX = {
    name: MARGIN,
    qty: MARGIN + 110,
    rate: MARGIN + 170,
    amount: MARGIN + 230,
  };

  doc.font(FONT).fontSize(9).fillColor(COLORS.value);
  items.forEach((i) => {
    const qtyStr = Number.isInteger(i.quantity)
      ? String(i.quantity)
      : i.quantity.toFixed(2);

    let name = i.name;
    if (doc.widthOfString(name) > colW.name) {
      while (doc.widthOfString(name + "..") > colW.name && name.length > 0) {
        name = name.slice(0, -1);
      }
      name += "..";
    }

    doc.text(name, colX.name, y, { width: colW.name });
    doc.text(qtyStr, colX.qty, y, { width: colW.qty, align: "center" });
    doc.text(fmt(i.price), colX.rate, y, { width: colW.rate, align: "right" });
    doc.text(fmt(i.line_total), colX.amount, y, {
      width: colW.amount,
      align: "right",
    });
    y += 18;
  });

  y += 4;
  hr(y);
  y += 12;

  const totalRow = (
    label: string,
    value: string,
    color = COLORS.value,
    bold = false,
  ) => {
    doc.font(bold ? FONT_BOLD : FONT).fontSize(bold ? 13 : 10);
    doc
      .fillColor(COLORS.label)
      .text(label, MARGIN, y, { width: CONTENT_W * 0.5 });
    doc
      .fillColor(color)
      .text(value, MARGIN, y, { width: CONTENT_W, align: "right" });
    y += bold ? 22 : 16;
  };

  totalRow("Subtotal", fmt(itemsTotal));
  if (discountAmount > 0) {
    totalRow(
      `Discount (${discountPercent}%)`,
      `-${fmt(discountAmount)}`,
      COLORS.discountRed,
    );
  }
  if (taxTotal > 0) {
    totalRow("Tax", `+${fmt(taxTotal)}`);
  }

  hr(y);
  y += 10;

  totalRow("Net Payable", fmt(netPayable), COLORS.title, true);

  totalRow("Paid", fmt(paid));
  totalRow("Change", fmt(change));

  y += 6;
  hr(y);
  y += 14;

  if (footer) {
    doc.font(FONT).fontSize(8).fillColor(COLORS.footerBlue);
    cen(footer, y);
    y += 14;
  }

  y += 6;

  const stripH = 34;
  doc.rect(0, y, PAGE_W, stripH).fill("#1a1a2e");
  const brandStr = "AIMFORTECH SOLUTIONS";
  const byStr = "Powered by ";
  doc.font(FONT).fontSize(8);
  const pw = doc.widthOfString(byStr);
  doc.font(FONT).fontSize(9);
  const bw = doc.widthOfString(brandStr);
  const totalW = pw + bw;
  const startX = MARGIN + (CONTENT_W - totalW) / 2;
  const remW = PAGE_W - MARGIN - (startX + pw);
  doc.font(FONT).fontSize(8).fillColor("#8899aa");
  doc.text(byStr, startX, y + 11, { width: pw });
  doc.font(FONT).fontSize(9).fillColor("#b0bec5");
  doc.text(brandStr, startX + pw, y + 10, { width: remW });

  y += stripH;

  doc.end();
  return filename;
}
