import React, { useEffect, useState } from "react";
import { Plus, X, Search, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function SupplierPayments() {
  const { t } = useTranslation();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", amount: "", mode: "cash", note: "", date: new Date().toISOString().slice(0, 10) });

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.get("/supplier-payments"), api.get("/suppliers")]);
      setPayments(p.data); setSuppliers(s.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = payments.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (x.supplier_name || "").toLowerCase().includes(s) || (x.note || "").toLowerCase().includes(s);
  });

  const handleSave = async () => {
    if (!form.supplier_id || !form.amount) { toast.error(t("page.fill_required")); return; }
    setSaving(true);
    try {
      await api.post("/supplier-payments", { ...form, amount: Number(form.amount) });
      toast.success(t("page.payment_recorded"));
      setModal(false); setForm({ supplier_id: "", amount: "", mode: "cash", note: "", date: new Date().toISOString().slice(0, 10) }); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const getBalance = (supplierId) => {
    const s = suppliers.find((x) => x.id === supplierId);
    return s ? s.current_balance : null;
  };

  return (
    <PageShell
      title={t("page.supplier_payments")}
      subtitle={`${payments.length} ${t("page.payments_made")}`}
      right={
        <button onClick={() => setModal(true)}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.record_payment")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_payments")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">{t("page.date")}</th><th className="p-3 text-left">{t("page.supplier")}</th><th className="p-3 text-left">{t("page.balance")}</th><th className="p-3 text-right">{t("page.amount")}</th><th className="p-3 text-left">{t("page.method")}</th><th className="p-3 text-left">{t("page.note")}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-400">{t("page.no_supplier_payments")}</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3 text-xs font-mono">{p.date ? p.date.slice(0, 10) : formatDate(p.created_at)}</td>
                  <td className="p-3 font-semibold">{p.supplier_name}</td>
                  <td className="p-3 font-mono text-xs">{formatMoney(getBalance(p.supplier_id) ?? 0)}</td>
                  <td className="p-3 text-right font-mono font-bold text-[#E60000]">{formatMoney(p.amount)}</td>
                  <td className="p-3 text-xs uppercase">{p.mode || p.payment_method}</td>
                  <td className="p-3 text-xs">{p.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{t("page.record_payment")}</div>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.supplier")} *</label>
                <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
                  <option value="">{t("page.select_supplier")}</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.current_balance || 0)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.amount")} *</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.payment_method")}</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
                  <option value="cash">Cash</option><option value="bank_transfer">{t("page.bank_transfer")}</option>
                  <option value="cheque">Cheque</option><option value="upi">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.date")}</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModal(false)} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
                <button onClick={handleSave} disabled={saving}
                  className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
