import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, Search, X, Receipt, Building2, Loader2, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { formatApiErrorDetail } from "../lib/api";
import { PageShell } from "./Dashboard";
import { useConfirm } from "../lib/confirm";

const EMPTY = { name: "", phone: "", email: "", address: "", gstin: "", opening_balance: "0" };

export default function Suppliers() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [loadingLedger, setLoadingLedger] = useState(null);
  const [modal, setModal] = useState(null);
  const [ledgerFor, setLedgerFor] = useState(null);
  const [ledger, setLedger] = useState(null);
  const [purchasesFor, setPurchasesFor] = useState(null);
  const [purchases, setPurchases] = useState(null);
  const [loadingPurchases, setLoadingPurchases] = useState(null);
  const confirm = useConfirm();

  const load = async (searchQ) => {
    setLoading(true);
    try {
      const r = await api.get(searchQ ? `/suppliers?q=${encodeURIComponent(searchQ)}` : "/suppliers");
      setItems(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(q); }, [q]);

  const onSave = async (form) => {
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance || 0) };
      if (modal.edit) {
        await api.patch(`/suppliers/${modal.edit.id}`, payload);
        toast.success(t("page.supplier_updated"));
      } else {
        await api.post("/suppliers", payload);
        toast.success(t("page.supplier_created"));
      }
      setModal(null); load(q);
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || t("page.save_failed"));
    }
  };

  const onDelete = async (p) => {
    const ok = await confirm(t("page.delete_confirm_item", { name: p.name }), t("common.confirm_delete")); if (!ok) return;
    setDeleting(p.id);
    try {
      await api.delete(`/suppliers/${p.id}`);
      toast.success(t("page.deleted"));
      load(q);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed"));
    } finally { setDeleting(null); }
  };

  const openLedger = async (p) => {
    setLedgerFor(p); setLedger(null); setLoadingLedger(p.id);
    try {
      const r = await api.get(`/suppliers/${p.id}/ledger`);
      setLedger(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.ledger_load_failed"));
    } finally { setLoadingLedger(null); }
  };

  const openPurchases = async (p) => {
    setPurchasesFor(p); setPurchases(null); setLoadingPurchases(p.id);
    try {
      const r = await api.get(`/suppliers/${p.id}/purchases`);
      setPurchases(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.purchase_history_load_failed"));
    } finally { setLoadingPurchases(null); }
  };

  return (
    <PageShell
      title={t("nav.suppliers")}
      subtitle={`${items.length} ${t("nav.suppliers").toLowerCase()}`}
      right={
        <button
          onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-supplier-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("common.add")} {t("nav.suppliers")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            <Search className={`w-4 h-4 text-zinc-400 ${loading ? "animate-pulse" : ""}`} />
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(q)}
            placeholder={t("page.search_suppliers")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
            data-testid="supplier-search"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.phone")}</th>
                <th className="p-3 text-left">{t("page.gst")}</th>
                <th className="p-3 text-right">{t("page.balance")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
                {loading && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("common.loading")}</td></tr>
              )}
              {!loading && items.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`supplier-row-${p.id}`}>
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3 font-mono text-xs">{p.phone || "-"}</td>
                  <td className="p-3 font-mono text-xs">{p.gstin || "-"}</td>
                  <td className={`p-3 font-mono text-right font-bold ${Number(p.current_balance || 0) > 0 ? "text-[#E60000]" : ""}`}>
                    {formatMoney(p.current_balance || 0)}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button onClick={() => openPurchases(p)}
                      className={`p-1.5 hover:bg-zinc-200 mr-1 ${loadingPurchases === p.id ? "btn-loading" : ""}`} title={t("page.purchase_history")}
                      data-testid={`purchases-${p.id}`}
                    ><ShoppingBag className="w-4 h-4" /></button>
                    <button
                      onClick={() => openLedger(p)}
                      className={`p-1.5 hover:bg-zinc-200 mr-1 ${loadingLedger === p.id ? "btn-loading" : ""}`} title={t("page.ledger")}
                      data-testid={`ledger-${p.id}`}
                    ><Receipt className="w-4 h-4" /></button>
                    <button
                      onClick={() => setModal({ edit: p, form: { ...p, opening_balance: String(p.opening_balance || 0) } })}
                      className="p-1.5 hover:bg-zinc-200 mr-1"
                      data-testid={`edit-${p.id}`}
                    ><Edit3 className="w-4 h-4" /></button>
                    <button
                      onClick={() => onDelete(p)}
                      className={`p-1.5 hover:bg-red-100 text-[#E60000] ${deleting === p.id ? "btn-loading" : ""}`}
                      data-testid={`delete-${p.id}`}
                    ><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {!loading && items.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_suppliers")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <SupplierModal
          initial={modal.form}
          edit={!!modal.edit}
          onClose={() => setModal(null)}
          onSave={onSave}
        />
      )}
      {ledgerFor && (
        <LedgerModal supplier={ledgerFor} ledger={ledger} onClose={() => setLedgerFor(null)} />
      )}
      {purchasesFor && (
        <PurchaseHistoryModal supplier={purchasesFor} purchases={purchases} onClose={() => setPurchasesFor(null)} />
      )}
    </PageShell>
  );
}

function SupplierModal({ initial, edit, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const upd = (k, v) => { setForm({ ...form, [k]: v }); if (errors[k]) setErrors({ ...errors, [k]: "" }); };

  const validate = () => {
    const e = {};
    if (!form.phone) e.phone = t("page.phone_required");
    else if (!/^[6-9]\d{9}$/.test(form.phone)) e.phone = t("page.phone_invalid");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = t("page.email_invalid");
    if (form.gstin && !/^[0-9A-Z]{15}$/.test(form.gstin)) e.gstin = t("page.gst_invalid");
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-2 border-zinc-900" data-testid="supplier-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">{edit ? t("page.edit_supplier") : t("page.new_supplier")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={submit}>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("common.name")} *</label>
            <input required value={form.name} onChange={(e) => upd("name", e.target.value)}
              data-testid="sp-name" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.phone")} *</label>
            <input type="tel" required value={form.phone} onChange={(e) => upd("phone", e.target.value.replace(/\D/g, ''))} maxLength={10}
              data-testid="sp-phone" inputMode="numeric" pattern="[0-9]{10}"
              className={`w-full h-11 border-2 px-3 font-mono focus:outline-none text-sm ${errors.phone ? "border-[#E60000] bg-red-50" : "border-zinc-300 focus:border-[#E60000]"}`} />
            {errors.phone && <div className="text-[10px] text-[#E60000] font-mono mt-1">{errors.phone}</div>}
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.email")}</label>
            <input value={form.email} onChange={(e) => upd("email", e.target.value)}
              data-testid="sp-email"
              className={`w-full h-11 border-2 px-3 focus:outline-none text-sm ${errors.email ? "border-[#E60000] bg-red-50" : "border-zinc-300 focus:border-[#E60000]"}`} />
            {errors.email && <div className="text-[10px] text-[#E60000] font-mono mt-1">{errors.email}</div>}
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.gst")}</label>
            <input value={form.gstin} onChange={(e) => upd("gstin", e.target.value.toUpperCase())} maxLength={15}
              data-testid="sp-gst"
              className={`w-full h-11 border-2 px-3 font-mono focus:outline-none text-sm ${errors.gstin ? "border-[#E60000] bg-red-50" : "border-zinc-300 focus:border-[#E60000]"}`} />
            {errors.gstin && <div className="text-[10px] text-[#E60000] font-mono mt-1">{errors.gstin}</div>}
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.address")}</label>
            <input value={form.address} onChange={(e) => upd("address", e.target.value)}
              data-testid="sp-address" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.opening_balance")}</label>
            <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => upd("opening_balance", e.target.value)}
              data-testid="sp-balance" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
            <button type="submit" disabled={busy} data-testid="sp-save"
              className={`h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40 ${busy ? "btn-loading" : ""}`}>
              {edit ? t("page.update") : t("page.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LedgerModal({ supplier, ledger, onClose }) {
  const { t } = useTranslation();
  const totalCredit = Array.isArray(ledger) ? ledger.reduce((s, e) => s + (e.credit || 0), 0) : 0;
  const totalDebit = Array.isArray(ledger) ? ledger.reduce((s, e) => s + (e.debit || 0), 0) : 0;
  const netBalance = totalCredit - totalDebit;
  const fm = (n) => (n == null ? formatMoney(0) : formatMoney(n));
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white border-2 border-zinc-900" data-testid="ledger-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <div className="font-display font-black uppercase text-lg">{supplier.name}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {!ledger ? (
            <div className="text-center text-zinc-500 font-mono text-sm py-8 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}</div>
          ) : !Array.isArray(ledger) || ledger.length === 0 ? (
            <div className="text-center text-zinc-500 font-mono text-sm py-8">{t("page.no_ledger_entries")}</div>
          ) : (
            <><div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-green-700">{t("page.total_purchases")}</div>
                 <div className="font-mono font-bold text-lg text-green-700">+{fm(totalCredit)}</div>
              </div>
              <div className="bg-red-50 border border-red-200 p-3 rounded-lg text-center">
                <div className="text-[10px] font-mono uppercase tracking-widest text-red-700">{t("page.total_paid")}</div>
                 <div className="font-mono font-bold text-lg text-red-700">-{fm(totalDebit)}</div>
              </div>
              <div className={`border-2 p-3 rounded-lg text-center ${netBalance > 0 ? "bg-amber-50 border-amber-300" : "bg-green-50 border-green-300"}`}>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">{t("page.balance_due")}</div>
                <div className={`font-mono font-bold text-lg ${netBalance > 0 ? "text-amber-700" : "text-green-700"}`}>
                   {netBalance > 0 ? fm(netBalance) : formatMoney(0) + " ✓"}
                </div>
              </div>
            </div><table className="w-full text-sm">
              <thead className="bg-zinc-100 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-3 text-left">{t("page.date")}</th>
                  <th className="p-3 text-left">{t("page.note")}</th>
                  <th className="p-3 text-right">{t("page.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((e, i) => (
                  <tr key={e.id || i} className="border-t border-zinc-200" data-testid={`ledger-row-${e.id || i}`}>
                    <td className="p-3 font-mono text-xs">{formatDate(e.date || e.created_at)}</td>
                    <td className="p-3 text-xs text-zinc-500 max-w-[200px] truncate">{e.note || "-"}</td>
                    <td className={`p-3 font-mono text-right font-bold ${e.debit ? "text-[#E60000]" : "text-green-700"}`}>
                       {e.debit ? `-${fm(e.debit)}` : `+${fm(e.credit)}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex justify-between items-center">
              <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                {netBalance > 0 ? t("page.balance_outstanding") : t("page.balance_cleared")}
              </span>
              <span className={`font-mono font-bold text-lg ${netBalance > 0 ? "text-[#E60000]" : "text-green-700"}`}>
                {netBalance > 0 ? fm(netBalance) : formatMoney(0) + " ✓"}
              </span>
            </div></>
          )}
        </div>
      </div>
    </div>
  );
}

function PurchaseHistoryModal({ supplier, purchases, onClose }) {
  const { t } = useTranslation();
  const totalSpent = Array.isArray(purchases) ? purchases.reduce((s, p) => s + (p.total || 0), 0) : 0;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white border-2 border-zinc-900 max-h-[90vh] overflow-y-auto" data-testid="purchases-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white sticky top-0 z-10">
          <div>
            <div className="font-display font-black uppercase text-lg">{t("page.purchase_history")} — {supplier.name}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{t("page.total")}: {formatMoney(totalSpent)} ({purchases?.length || 0})</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">
          {!purchases ? (
            <div className="text-center text-zinc-500 font-mono text-sm py-8 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> {t("common.loading")}</div>
          ) : !Array.isArray(purchases) || purchases.length === 0 ? (
            <div className="text-center text-zinc-500 font-mono text-sm py-8">{t("page.no_purchases")}</div>
          ) : (
            <div className="space-y-4">
              {purchases.map((po) => (
                <div key={po.id} className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="bg-zinc-50 px-4 py-2.5 flex justify-between items-center border-b border-zinc-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-zinc-500">{formatDate(po.created_at)}</span>
                      <span className="font-mono text-xs text-zinc-400">#{(po.id || "").slice(0, 8)}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${po.status === "received" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>{po.status}</span>
                    </div>
                    <div className="font-mono font-bold text-sm">{formatMoney(po.total)}</div>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-mono uppercase text-zinc-500">
                        <th className="p-2 pl-4 text-left">{t("page.items")}</th>
                        <th className="p-2 text-right">{t("page.qty")}</th>
                        <th className="p-2 text-right">{t("page.rate")}</th>
                        <th className="p-2 pr-4 text-right">{t("page.total")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(po.items || []).map((item, i) => (
                        <tr key={i} className="border-t border-zinc-100">
                          <td className="p-2 pl-4 font-medium">{item.name}</td>
                          <td className="p-2 text-right font-mono text-xs">{item.quantity}</td>
                          <td className="p-2 text-right font-mono text-xs">{formatMoney(item.cost)}</td>
                          <td className="p-2 pr-4 text-right font-mono text-xs font-bold">{formatMoney((Number(item.quantity) || 0) * (Number(item.cost) || 0))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {po.note && <div className="px-4 py-2 text-xs text-zinc-500 border-t border-zinc-100 italic">{po.note}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
