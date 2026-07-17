import React, { useEffect, useState, useRef } from "react";
import { Plus, X, Search, Loader2, CheckCircle, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

function SelectDropdown({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const selected = options.find((o) => o.value === value);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)}
        className="w-full h-9 border border-zinc-300 px-2 text-xs flex items-center justify-between gap-1 bg-white focus:outline-none focus:border-[#E60000]">
        <span className={`truncate ${selected ? "text-zinc-900" : "text-zinc-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <span className="text-zinc-500 shrink-0">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-[100] mt-0.5 border border-zinc-300 bg-white shadow-lg max-h-40 overflow-y-auto">
          {options.map((opt) => (
            <button key={opt.value} type="button"
              onMouseDown={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-2 py-1.5 text-xs border-b border-zinc-100 last:border-b-0 hover:bg-zinc-100 ${opt.value === value ? "bg-zinc-50 font-semibold" : ""}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Purchases() {
  const { t } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyReceive, setBusyReceive] = useState(null);
  const [busyDelete, setBusyDelete] = useState(null);
  const [detailPurchase, setDetailPurchase] = useState(null);
  const confirm = useConfirm();
  const [form, setForm] = useState({
    supplier_id: "", items: [{ product_id: "", quantity: "", cost: "", tax_rate: "" }],
    reference: "", note: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const [p, s, pr] = await Promise.all([
        api.get("/purchases"),
        api.get("/suppliers"),
        api.get("/products"),
      ]);
      setPurchases(p.data);
      setSuppliers(s.data);
      setProducts(pr.data || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = purchases.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (x.supplier_name || "").toLowerCase().includes(s) || (x.items || []).some((i) =>
      (i.name || "").toLowerCase().includes(s)
    );
  });

  const resetForm = () => setForm({
    supplier_id: "", items: [{ product_id: "", quantity: "", cost: "", tax_rate: "" }],
    reference: "", note: "",
  });

  const handleSave = async () => {
    if (!form.supplier_id) { toast.error(t("page.fill_all_fields")); return; }
    for (const it of form.items) {
      if (!it.product_id || !it.quantity || Number(it.quantity) <= 0 || !it.cost || Number(it.cost) <= 0) {
        toast.error(t("page.fill_all_fields")); return;
      }
    }
    setSaving(true);
    try {
      await api.post("/purchases", {
        supplier_id: form.supplier_id,
        items: form.items.map((it) => ({
          product_id: it.product_id,
          quantity: Number(it.quantity),
          cost: Number(it.cost),
          tax_rate: Number(it.tax_rate || 0),
        })),
        reference: form.reference || undefined,
        note: form.note || undefined,
      });
      toast.success(t("page.purchase_created"));
      setModal(false);
      resetForm();
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    } finally { setSaving(false); }
  };

  const onReceive = async (p) => {
    setBusyReceive(p.id);
    try {
      await api.post(`/purchases/${p.id}/receive`);
      toast.success(t("page.purchase_received"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    } finally { setBusyReceive(null); }
  };

  const onDelete = async (p) => {
    const ok = await confirm(t("page.delete_confirm_item", { name: p.supplier_name }), t("common.confirm_delete"));
    if (!ok) return;
    setBusyDelete(p.id);
    try {
      await api.delete(`/purchases/${p.id}`);
      toast.success(t("page.deleted"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed"));
    } finally { setBusyDelete(null); }
  };

  const getProductUnit = (productId) => {
    const pr = products.find((x) => x.id === productId);
    return pr ? (pr.unit || "pcs") : "pcs";
  };

  const updItem = (i, k, v) => {
    const next = [...form.items];
    next[i] = { ...next[i], [k]: v };
    setForm({ ...form, items: next });
  };
  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: "", quantity: "", cost: "", tax_rate: "" }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });

  return (
    <PageShell
      title={t("page.purchases")}
      subtitle={`${purchases.length} ${t("page.purchases_count")}`}
      right={
        <button onClick={() => setModal(true)}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.new_purchase")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_purchases")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
        </div>
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-left">{t("page.invoice")}</th>
                <th className="p-3 text-left">{t("page.supplier_name")}</th>
                <th className="p-3 text-left">{t("page.items")}</th>
                <th className="p-3 text-right">{t("page.total")}</th>
                <th className="p-3 text-left">{t("page.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-400">{t("page.no_purchases_found")}</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3 text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="p-3 font-mono text-xs font-semibold">{p.reference || "-"}</td>
                  <td className="p-3">
                    <button onClick={() => setDetailPurchase(p)} className="font-semibold hover:text-[#E60000] text-left">{p.supplier_name}</button>
                  </td>
                  <td className="p-3 text-xs">
                    {(p.items || []).map((it, idx) => (
                      <div key={idx} className="flex gap-2">
                        <span className="font-medium truncate max-w-[200px]">{it.name}</span>
                        <span className="text-zinc-500 shrink-0">x{it.quantity} {getProductUnit(it.product_id)}</span>
                        <span className="text-zinc-400 shrink-0">@{formatMoney(it.cost)}</span>
                      </div>
                    ))}
                    {(!p.items || p.items.length === 0) && <span className="text-zinc-400">-</span>}
                  </td>
                  <td className="p-3 text-right font-mono font-bold">{formatMoney(p.total)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${p.status === "received" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>{p.status}</span>
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {p.status !== "received" && (
                      <button onClick={() => onReceive(p)} disabled={busyReceive === p.id}
                        className="p-1.5 hover:bg-green-100 text-green-700 mr-1" title={t("page.receive")}>
                        {busyReceive === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      </button>
                    )}
                    {p.status === "draft" && (
                      <button onClick={() => onDelete(p)} disabled={busyDelete === p.id}
                        className="p-1.5 hover:bg-red-100 text-[#E60000]" title={t("common.delete")}>
                        {busyDelete === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white shrink-0">
              <div className="font-display font-black uppercase text-lg">{t("page.new_purchase")}</div>
              <button onClick={() => { setModal(false); resetForm(); }} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.supplier_name")} *</label>
                  <SelectDropdown
                    value={form.supplier_id}
                    onChange={(v) => setForm({ ...form, supplier_id: v })}
                    options={[
                      { value: "", label: "-- " + t("page.select_supplier") + " --" },
                      ...suppliers.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                    placeholder={"-- " + t("page.select_supplier") + " --"}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.invoice_no")} / {t("page.reference")}</label>
                  <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.items")} *</label>
                  <button type="button" onClick={addItem} className="text-xs font-bold uppercase tracking-widest text-[#E60000] flex items-center gap-1"><Plus className="w-3 h-3" /> {t("common.add")}</button>
                </div>
                <div className="border border-zinc-200 rounded">
                  <div className="grid grid-cols-[1fr_80px_40px_100px_70px_36px] gap-0 bg-zinc-50 text-[10px] font-mono uppercase tracking-widest text-zinc-500 border-b border-zinc-200">
                    <div className="p-2 pl-3">{t("page.product")}</div>
                    <div className="p-2 text-right">{t("page.qty")}</div>
                    <div className="p-2 text-center">{t("page.unit")}</div>
                    <div className="p-2 text-right">{t("page.rate")}</div>
                    <div className="p-2 text-right">{t("page.tax_rate")}</div>
                    <div></div>
                  </div>
                  {form.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-[1fr_80px_40px_100px_70px_36px] gap-0 items-center border-b border-zinc-100 last:border-b-0">
                      <div className="p-1 pl-2">
                        <SelectDropdown
                          value={it.product_id}
                          onChange={(v) => updItem(i, "product_id", v)}
                          options={[
                            { value: "", label: "-- " + t("page.select_product") + " --" },
                            ...products.map((pr) => ({ value: pr.id, label: pr.name + " (" + (pr.unit || "pcs") + ")" })),
                          ]}
                          placeholder={"-- " + t("page.select_product") + " --"}
                        />
                      </div>
                      <div className="p-1">
                        <input type="number" step="0.01" min="0" value={it.quantity}
                          onChange={(e) => updItem(i, "quantity", e.target.value)}
                          className="w-full h-9 border border-zinc-300 px-2 text-xs font-mono text-right focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div className="p-1 text-center text-xs font-mono text-zinc-600">
                        {getProductUnit(it.product_id)}
                      </div>
                      <div className="p-1">
                        <input type="number" step="0.01" min="0" value={it.cost}
                          onChange={(e) => updItem(i, "cost", e.target.value)}
                          className="w-full h-9 border border-zinc-300 px-2 text-xs font-mono text-right focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div className="p-1">
                        <input type="number" step="0.1" min="0" value={it.tax_rate}
                          onChange={(e) => updItem(i, "tax_rate", e.target.value)}
                          className="w-full h-9 border border-zinc-300 px-2 text-xs font-mono text-right focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div className="p-1 flex justify-center">
                        {form.items.length > 1 && (
                          <button type="button" onClick={() => removeItem(i)} className="p-1 text-red-500 hover:bg-red-50 rounded"><X className="w-4 h-4" /></button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
                <textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={2}
                  className="w-full border-2 border-zinc-300 px-3 py-2 text-sm focus:outline-none focus:border-[#E60000]" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
                <button onClick={() => { setModal(false); resetForm(); }} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
                <button onClick={handleSave} disabled={saving}
                  className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {detailPurchase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetailPurchase(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white shrink-0">
              <div className="font-display font-black uppercase text-lg">{detailPurchase.supplier_name}</div>
              <button onClick={() => setDetailPurchase(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 min-h-0 p-5 overflow-y-auto">
              <div className="text-xs text-zinc-500 mb-4">
                {t("page.date")}: {formatDate(detailPurchase.created_at)} | {t("page.invoice")}: {detailPurchase.reference || "-"} | {t("page.status")}: {detailPurchase.status}
              </div>
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{t("page.product")}</th>
                    <th className="p-2 text-right">{t("page.qty")}</th>
                    <th className="p-2 text-right">{t("page.rate")}</th>
                    <th className="p-2 text-right">{t("page.tax_rate")}</th>
                    <th className="p-2 text-right">{t("page.amount")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(detailPurchase.items || []).map((it, idx) => (
                    <tr key={idx} className="border-t border-zinc-200">
                      <td className="p-2 text-xs">{idx + 1}</td>
                      <td className="p-2 text-xs font-medium">{it.name} <span className="text-zinc-400">({getProductUnit(it.product_id)})</span></td>
                      <td className="p-2 text-xs font-mono text-right">{it.quantity} {getProductUnit(it.product_id)}</td>
                      <td className="p-2 text-xs font-mono text-right">{formatMoney(it.cost)}</td>
                      <td className="p-2 text-xs font-mono text-right">{it.tax_rate || 0}%</td>
                      <td className="p-2 text-xs font-mono text-right font-bold">{formatMoney(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-zinc-900">
                  <tr>
                    <td colSpan={4}></td>
                    <td className="p-2 text-xs font-mono text-right font-bold">{t("page.subtotal")}</td>
                    <td className="p-2 text-xs font-mono text-right font-bold">{formatMoney(detailPurchase.subtotal)}</td>
                  </tr>
                  {detailPurchase.tax_total > 0 && (
                    <tr>
                      <td colSpan={4}></td>
                      <td className="p-2 text-xs font-mono text-right">{t("page.tax")}</td>
                      <td className="p-2 text-xs font-mono text-right">{formatMoney(detailPurchase.tax_total)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4}></td>
                    <td className="p-2 text-xs font-mono text-right font-bold text-lg">{t("page.total")}</td>
                    <td className="p-2 text-xs font-mono text-right font-bold text-lg text-[#E60000]">{formatMoney(detailPurchase.total)}</td>
                  </tr>
                </tfoot>
              </table>
              {detailPurchase.note && (
                <div className="mt-4 text-xs text-zinc-500">
                  <span className="font-semibold">{t("page.note")}:</span> {detailPurchase.note}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
