import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Search, PackageX } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { PageShell } from "./Dashboard";

const EMPTY = { product_id: "", quantity: "1", reason: "damaged", note: "" };
const REASONS = ["damaged", "expired", "lost", "theft", "other"];

export default function DamageStock() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);

  const load = async () => {
    const [d, p] = await Promise.all([api.get("/damage-stock"), api.get("/products")]);
    setItems(d.data); setProducts(p.data);
  };
  useEffect(() => { load(); }, []);

  const pname = (id) => (products.find((p) => p.id === id) || {}).name || id;

  const filtered = items.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (pname(x.product_id) || "").toLowerCase().includes(s) || (x.reason || "").toLowerCase().includes(s);
  });

  const onSave = async (form) => {
    try {
      const payload = { ...form, quantity: Number(form.quantity || 0) };
      await api.post("/damage-stock", payload);
      toast.success(t("page.damage_recorded"));
      setModal(false); load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.save_failed"));
    }
  };

  return (
    <PageShell
      title={t("page.damage_stock")}
      subtitle={`${items.length} ${t("page.write_offs")}`}
      right={
        <button
          onClick={() => setModal(true)}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-damage-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.report_damage")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_damage_entries")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
            data-testid="damage-search"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.product_cap")}</th>
                <th className="p-3 text-right">{t("page.quantity")}</th>
                <th className="p-3 text-left">{t("page.reason")}</th>
                <th className="p-3 text-left">{t("page.note")}</th>
                <th className="p-3 text-left">{t("page.date")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`row-damage-${x.id}`}>
                  <td className="p-3 font-semibold flex items-center gap-2"><PackageX className="w-4 h-4 text-[#E60000]" />{pname(x.product_id)}</td>
                  <td className="p-3 font-mono text-right font-bold">{x.quantity}</td>
                  <td className="p-3 uppercase font-mono text-xs">{x.reason}</td>
                  <td className="p-3 text-xs text-zinc-600">{x.note || "-"}</td>
                  <td className="p-3 font-mono text-xs">{x.created_at ? x.created_at.slice(0, 10) : "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_damage_entries")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <DamageModal
          products={products}
          onClose={() => setModal(false)}
          onSave={onSave}
          t={t}
        />
      )}
    </PageShell>
  );
}

function DamageModal({ products, onClose, onSave, t }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm({ ...form, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="damage-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">{t("page.report_damage")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" data-testid="damage-modal-close"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.product_cap")} *</label>
            <select value={form.product_id} onChange={(e) => upd("product_id", e.target.value)}
              required data-testid="dm-product" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
              <option value="">{t("page.select_product")}</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.quantity")} *</label>
            <input type="number" step="0.01" min="0.01" value={form.quantity} onChange={(e) => upd("quantity", e.target.value)}
              required data-testid="dm-quantity" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.reason")}</label>
            <select value={form.reason} onChange={(e) => upd("reason", e.target.value)}
              data-testid="dm-reason" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
              {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
            <input value={form.note} onChange={(e) => upd("note", e.target.value)}
              data-testid="dm-note" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest" data-testid="dm-cancel">{t("common.cancel")}</button>
            <button type="submit" disabled={busy} data-testid="dm-save"
              className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
              {busy ? t("page.saving") : t("page.report")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
