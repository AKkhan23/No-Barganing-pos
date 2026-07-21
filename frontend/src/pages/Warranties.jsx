import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Loader2, ShieldCheck, Search } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

const EMPTY = { product_name: "", customer_name: "", sale_date: "", warranty_period_days: 365, expiry_date: "", notes: "" };

export default function Warranties() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/warranties"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (x.product_name || "").toLowerCase().includes(s) || (x.customer_name || "").toLowerCase().includes(s);
  });

  const recalcExpiry = (f) => {
    if (f.sale_date && f.warranty_period_days) {
      const d = new Date(f.sale_date);
      d.setDate(d.getDate() + Number(f.warranty_period_days));
      return { ...f, expiry_date: d.toISOString().slice(0, 10) };
    }
    return f;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = recalcExpiry(modal.form);
      const payload = { ...f, warranty_period_months: Number(f.warranty_period_months) };
      if (modal.edit) { await api.patch(`/warranties/${modal.edit.id}`, payload); toast.success(t("page.warranty_updated")); }
      else { await api.post("/warranties", payload); toast.success(t("page.warranty_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const now = new Date();

  return (
    <PageShell
      title={t("page.warranties")}
      subtitle={`${list.length} ${t("page.warranties_count")}`}
      right={
        <button onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.register_warranty")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_warranties")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">{t("page.product")}</th><th className="p-3 text-left">{t("page.customer")}</th><th className="p-3 text-left">{t("page.purchased")}</th><th className="p-3 text-left">{t("page.expiry")}</th><th className="p-3 text-left">{t("page.remaining")}</th><th className="p-3 text-left">{t("page.status")}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-400"><ShieldCheck className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>{t("page.no_warranties")}</p></td></tr>
              ) : filtered.map((w) => {
                const exp = w.expiry_date ? new Date(w.expiry_date) : null;
                const expired = exp && exp < now;
                const daysLeft = exp ? Math.ceil((exp - now) / (1000 * 60 * 60 * 24)) : null;
                return (
                  <tr key={w.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="p-3 font-semibold">{w.product_name}</td>
                    <td className="p-3">{w.customer_name}</td>
                    <td className="p-3 text-xs">{w.sale_date ? formatDate(w.sale_date) : "-"}</td>
                    <td className="p-3 text-xs">{w.expiry_date ? formatDate(w.expiry_date) : "-"}</td>
                    <td className="p-3 text-xs font-mono">{daysLeft !== null ? (expired ? `${t("page.expired")} ${Math.abs(daysLeft)}d` : `${daysLeft} ${t("page.days_left")}`) : "-"}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${expired ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{expired ? t("page.expired") : t("page.active")}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_warranty") : t("page.register_warranty")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2"><span className="label">{t("page.product_name")} *</span><input className="input" value={modal.form.product_name} onChange={e => setModal({ ...modal, form: { ...modal.form, product_name: e.target.value } })} /></label>
                <label className="col-span-2"><span className="label">{t("page.customer_name")} *</span><input className="input" value={modal.form.customer_name} onChange={e => setModal({ ...modal, form: { ...modal.form, customer_name: e.target.value } })} /></label>
                <label><span className="label">{t("page.sale_date")} *</span><input type="date" className="input" value={modal.form.sale_date} onChange={e => setModal({ ...modal, form: recalcExpiry({ ...modal.form, sale_date: e.target.value }) })} /></label>
                <label><span className="label">{t("page.warranty_days")}</span><input type="number" className="input" value={modal.form.warranty_period_days} onChange={e => setModal({ ...modal, form: recalcExpiry({ ...modal.form, warranty_period_days: e.target.value }) })} /></label>
                <label className="col-span-2"><span className="label">{t("page.expiry_date")}</span><input type="date" className="input bg-zinc-100" value={modal.form.expiry_date} readOnly /></label>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t-2 border-zinc-200">
                <button onClick={() => setModal(null)} className="h-11 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
                <button onClick={handleSave} disabled={saving} className="h-11 px-6 bg-[#E60000] hover:bg-[#CC0000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />} {modal.edit ? t("page.update") : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
