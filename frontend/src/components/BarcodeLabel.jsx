import React, { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { Printer, X, FileText, Receipt, ArrowLeft } from "lucide-react";

function computeEan13(seed) {
  if (!seed) return null;
  const digits = seed.replace(/\D/g, "").padStart(12, "0").slice(-12);
  if (digits.length !== 12) return null;
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3);
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}

function barcode12(seed) {
  if (!seed) return "000000000001";
  const digits = String(seed).replace(/\D/g, "").padStart(12, "0").slice(-12);
  return digits.length === 12 ? digits : digits.padEnd(12, "0");
}

function qrSvg(value, size = 52) {
  try {
    return ReactDOMServer.renderToStaticMarkup(
      <QRCodeSVG value={String(value)} size={size} level="M" />
    );
  } catch { return ""; }
}

const MODES = {
  thermal: {
    cols: 1,
    labelW: "50mm",
    pageCss: "@page { size: 50mm 35mm; margin: 0; }",
    bodyClass: "mode-thermal",
    nameSize: "2.8mm",
    priceSize: "3mm",
  },
  a4: {
    cols: 3,
    labelW: "100%",
    pageCss: "@page { size: A4; margin: 8mm; }",
    bodyClass: "mode-a4",
    nameSize: "2.8mm",
    priceSize: "3mm",
  },
};

export default function BarcodeLabel({ product, onClose, count = 12 }) {
  const [copies, setCopies] = useState(count);
  const [mode, setMode] = useState("a4");
  const svgRefs = useRef([]);
  const value = product.barcode || barcode12(product.sku);
  const isEan13 = false;

  const handlePrint = () => {
    const cfg = MODES[mode];
    const ids = [];
    const qr = qrSvg(product.id, 48);
    let html = "";
    for (let i = 0; i < copies; i++) {
      const id = `bl${i}`;
      ids.push(id);
      html += `<div class="label-card">
        <div class="label-name">${product.name}</div>
        <div class="label-price">&#8377;${Number(product.price).toFixed(2)}</div>
        <div class="label-barcode-row">
          <div class="label-barcode-wrap"><svg id="${id}"></svg><div class="label-barcode-num">${value}</div></div>
          ${qr ? `<div class="label-qr-wrap">${qr}</div>` : ""}
        </div>
      </div>`;
    }

    const pw = window.open("", "_blank");
    pw.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Print Labels - ${product.name}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; }
.label-card {
  box-sizing: border-box;
  border: 0.3mm solid #000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}
.label-name {
  font-weight: 700;
  color: #000;
  width: 100%;
  line-height: 1.15;
  word-break: break-word;
}
.label-price {
  font-weight: 700;
  color: #000;
}
.label-barcode-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5mm;
  width: 100%;
}
.label-barcode-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.label-barcode-wrap svg {
  max-width: 100%;
  display: block;
}
.label-barcode-num {
  font-family: 'Courier New', Courier, monospace;
  font-size: 8px;
  color: #000;
  text-align: center;
  margin-top: 1px;
  letter-spacing: 0.3px;
}
.label-qr-wrap {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

body.mode-thermal { background: #fff; }
body.mode-thermal #sheet { display: flex; flex-direction: column; gap: 2mm; align-items: center; padding: 2mm 0; }
body.mode-thermal .label-card { width: 50mm; height: 35mm; padding: 1.5mm 2mm; }
body.mode-thermal .label-name  { font-size: 2.8mm; margin-bottom: 1mm; }
body.mode-thermal .label-price { font-size: 3mm; margin-bottom: 1mm; }
body.mode-thermal .label-qr-wrap svg { width: 8mm; display: block; }

body.mode-a4 { background: #fff; }
body.mode-a4 #sheet { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; padding: 5mm; }
body.mode-a4 .label-card { width: 100%; height: 35mm; padding: 1.5mm 2.5mm; }
body.mode-a4 .label-name  { font-size: 2.8mm; margin-bottom: 1mm; }
body.mode-a4 .label-price { font-size: 3mm; margin-bottom: 1mm; }
body.mode-a4 .label-qr-wrap svg { width: 8mm; display: block; }

@media print {
  body.mode-thermal @page { size: 50mm 35mm; margin: 0; }
  body.mode-thermal #sheet { padding: 0; gap: 0; }
  body.mode-thermal .label-card { border: none; page-break-after: always; width: 50mm; height: 35mm; padding: 1.5mm 2mm; }
  body.mode-a4 @page { size: A4; margin: 8mm; }
  body.mode-a4 #sheet { padding: 0; }
  body.mode-a4 .label-card { border: 0.2mm solid #000; padding: 1.5mm 2.5mm; }
}
</style>
</head>
<body class="${cfg.bodyClass}">
<div id="sheet">${html}</div>
</body>
</html>`);
    pw.document.close();

    ids.forEach((id) => {
      const el = pw.document.getElementById(id);
      if (!el) return;
      try {
        JsBarcode(el, value, {
          format: isEan13 ? "EAN13" : "CODE128",
          lineColor: "#000000",
          background: "#ffffff",
          width: 1.5,
          height: 32,
          margin: 2,
          displayValue: false,
        });
      } catch (e) {}
    });
    setTimeout(() => { try { pw.print(); } catch (e) {} }, 300);
  };

  useEffect(() => {
    svgRefs.current.forEach((el) => {
      if (!el) return;
      try {
        JsBarcode(el, value, {
          format: isEan13 ? "EAN13" : "CODE128",
          lineColor: "#000000",
          background: "#ffffff",
          width: 1.5,
          height: 32,
          margin: 2,
          displayValue: false,
        });
      } catch (e) {}
    });
  }, [product, value, isEan13, copies]);

  const stickers = Array.from({ length: copies });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 print:bg-white print:p-0">
      <div className="w-full max-w-4xl bg-white border-2 border-zinc-900 print:border-0 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-3 sm:p-4 bg-zinc-950 text-white print:hidden">
          <div className="flex items-center justify-between gap-2">
            <button onClick={onClose} className="flex items-center gap-1.5 p-1.5 hover:bg-zinc-800 rounded text-xs font-bold uppercase tracking-widest">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <div className="font-display font-black uppercase text-sm sm:text-lg truncate">{product.name}</div>
            <button onClick={onClose} className="p-1.5 hover:bg-zinc-800 rounded"><X className="w-4 h-4 sm:w-5 sm:h-5" /></button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <div className="flex bg-zinc-800 rounded-lg p-0.5">
              {Object.entries(MODES).map(([key, cfg]) => {
                const Icon = key === "thermal" ? Receipt : FileText;
                const active = mode === key;
                return (
                  <button key={key} onClick={() => setMode(key)}
                    className={`h-7 sm:h-8 px-2 sm:px-2.5 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 transition-colors ${active ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
                    <Icon className="w-3 h-3" /> {cfg.cols === 1 ? "Thermal" : "A4"}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-mono">
              <span className="text-zinc-400">Copies:</span>
              <input type="number" min={1} max={999} value={copies}
                onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 sm:w-16 h-7 sm:h-8 px-1.5 sm:px-2 bg-zinc-800 border border-zinc-600 text-white text-center rounded focus:outline-none focus:border-[#E60000]" />
            </div>
            <button onClick={handlePrint}
              className="ml-auto h-8 sm:h-10 px-3 sm:px-4 bg-[#E60000] text-white text-[10px] sm:text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 rounded hover:bg-[#cc0000] transition-colors">
              <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} /> Print
            </button>
          </div>
        </div>
        <div className="p-6 overflow-y-auto bg-zinc-100 print:bg-white print:p-2">
          <div className="grid gap-3" style={{ gridTemplateColumns: mode === "thermal" ? "repeat(1, 1fr)" : "repeat(3, 1fr)" }}>
            {stickers.map((_, i) => (
              <div key={i} className="bg-white border border-zinc-900 rounded text-center flex flex-col items-center p-1.5">
                <div className="font-bold text-2xs uppercase w-full leading-tight">{product.name}</div>
                <div className="font-bold text-sm my-0.5">₹{Number(product.price).toFixed(2)}</div>
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <div className="flex-1 flex flex-col items-center">
                    <svg ref={(el) => (svgRefs.current[i] = el)} style={{ maxWidth: "100%", display: "block" }} />
                    <div className="font-mono text-[8px] text-black mt-px">{value}</div>
                  </div>
                  <div className="flex-shrink-0"><QRCodeSVG value={product.id} size={28} level="M" /></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@media print { @page { margin: 0; } body * { visibility: hidden; } .print\\:bg-white, .print\\:bg-white * { visibility: visible; } }`}</style>
    </div>
  );
}
