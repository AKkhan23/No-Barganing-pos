import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Printer, Search, Loader2, FileText, Receipt } from "lucide-react";
import JsBarcode from "jsbarcode";
import ReactDOMServer from "react-dom/server";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageShell } from "@/pages/Dashboard";

const ESC = (s) => (s || "").replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c]);

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
    label: "Thermal Print",
    icon: Receipt,
    bodyClass: "mode-thermal",
    labelWmm: 50,
    labelHmm: 35,
    nameSize: "2.8mm",
    priceSize: "3mm",
  },
  a4: {
    label: "A4 Print",
    icon: FileText,
    bodyClass: "mode-a4",
    labelWmm: "100%",
    labelHmm: 35,
    nameSize: "2.8mm",
    priceSize: "3mm",
  },
};

export default function BarcodeLabels() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState([]);
  const [mode, setMode] = useState("a4");
  const printRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await api.get(q ? `/products?q=${encodeURIComponent(q)}` : "/products?limit=200");
        setProducts(r.data);
      } catch (e) { toast.error(t("page.failed_to_load_products")); } finally { setLoading(false); }
    };
    load();
  }, [q]);

  const toggleProduct = (id) => {
    setSelected((prev) =>
      prev.find((s) => s.id === id)
        ? prev.filter((s) => s.id !== id)
        : [...prev, { id, copies: 1 }]
    );
  };

  const updateCopies = (id, val) => {
    setSelected((prev) =>
      prev.map((s) => (s.id === id ? { ...s, copies: Math.max(1, val || 1) } : s))
    );
  };

  const handlePrint = (printMode) => {
    if (!selected.length) { toast.error(t("page.select_least_one")); return; }
    const cfg = MODES[printMode];

    let idx = 0;
    let labelsHtml = "";
    selected.forEach((s) => {
      const p = products.find((x) => x.id === s.id);
      if (!p) return;
      const escName = ESC(p.name);
      const escUnit = ESC(p.unit || "pcs");
      const value = p.barcode || barcode12(p.sku);
      const qr = qrSvg(p.id, 48);
      for (let c = 0; c < s.copies; c++) {
        idx++;
        labelsHtml += `<div class="label-card">
          <div class="label-name">${escName}</div>
          <div class="label-price">&#8377;${Number(p.price).toFixed(2)}</div>
          <div class="label-barcode-row">
            <div class="label-barcode-wrap"><svg id="b${idx}"></svg><div class="label-barcode-num">${value}</div></div>
            ${qr ? `<div class="label-qr-wrap">${qr}</div>` : ""}
          </div>
        </div>`;
      }
    });
    if (!idx) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Barcode Labels - ${cfg.label}</title>
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
<div id="sheet">${labelsHtml}</div>
</body>
</html>`);
    printWindow.document.close();

    let genIdx = 0;
    selected.forEach((s) => {
      const p = products.find((x) => x.id === s.id);
      if (!p) return;
      const value = p.barcode || barcode12(p.sku);
      for (let c = 0; c < s.copies; c++) {
        genIdx++;
        const svgEl = printWindow.document.getElementById(`b${genIdx}`);
        if (!svgEl) continue;
        try {
          JsBarcode(svgEl, value, {
            format: "CODE128",
            lineColor: "#000000",
            background: "#ffffff",
            width: 1.5,
            height: 32,
            margin: 2,
            displayValue: false,
          });
        } catch (e) {}
      }
    });

    setTimeout(() => { try { printWindow.print(); } catch (e) {} }, 300);
  };

  return (
    <PageShell title={t("page.barcode_labels")} subtitle={`${selected.length} ${t("page.products_selected")}`} right={
      <div className="flex items-center gap-2">
        <div className="flex bg-zinc-100 rounded-lg p-0.5">
          {Object.entries(MODES).map(([key, cfg]) => {
            const Icon = cfg.icon;
            const active = mode === key;
            return (
              <button key={key} onClick={() => setMode(key)}
                className={`h-9 px-3 rounded-md text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 transition-colors ${active ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"}`}>
                <Icon className="w-3.5 h-3.5" /> {cfg.label}
              </button>
            );
          })}
        </div>
        <button onClick={() => handlePrint(mode)} disabled={!selected.length}
          className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 hover:bg-[#cc0000] transition-colors">
          <Printer className="w-4 h-4" /> {t("page.print_labels")}
        </button>
      </div>
    }>
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex gap-3 mb-4 items-center flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input className="w-full h-11 border-2 border-zinc-300 rounded-lg pl-10 pr-4 text-sm focus:outline-none focus:border-[#E60000]"
              placeholder={t("page.search_products")} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("page.loading_products")}</div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="p-3 w-10"></th>
                  <th className="p-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.product_cap")}</th>
                  <th className="p-3 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.barcode")}</th>
                  <th className="p-3 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.price")}</th>
                  <th className="p-3 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500 w-28">{t("page.copies")}</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const sel = selected.find((s) => s.id === p.id);
                  return (
                    <tr key={p.id} className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors cursor-pointer ${sel ? "bg-red-50" : ""}`}
                      onClick={() => toggleProduct(p.id)}>
                      <td className="p-3 text-center">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${sel ? "border-[#E60000] bg-[#E60000]" : "border-zinc-300"}`}>
                          {sel && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-sm">{p.name}</td>
                      <td className="p-3 font-mono text-xs text-zinc-500">{p.barcode || p.sku}</td>
                      <td className="p-3 font-mono text-right font-bold">₹{Number(p.price).toFixed(2)}</td>
                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input type="number" min={1} max={999} value={sel ? sel.copies : 1}
                          onChange={(e) => updateCopies(p.id, parseInt(e.target.value) || 1)}
                          className="w-16 h-8 border border-zinc-300 rounded text-center text-sm font-mono focus:outline-none focus:border-[#E60000]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
