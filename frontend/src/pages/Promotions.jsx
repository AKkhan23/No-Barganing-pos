import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

const EMPTY = { name: "", type: "percentage", discount_value: 0, min_purchase: 0, max_discount: 0, valid_from: "", valid_to: "", active: true, applicable_to: "all", applicable_products: [], applicable_categories: [], description: "" };

export default function Promotions() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/promotions"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = modal.form;
      const payload = { ...f, discount_value: Number(f.discount_value), min_purchase: Number(f.min_purchase || 0), max_discount: Number(f.max_discount || 0) };
      if (modal.edit) { await api.patch(`/promotions/${modal.edit.id}`, payload); toast.success(t("page.promotion_updated")); }
      else { await api.post("/promotions", payload); toast.success(t("page.promotion_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const toggleActive = async (p) => {
    try { await api.patch(`/promotions/${p.id}`, { active: !p.active }); toast.success(t("page.promotion_updated")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const handleDelete = async (p) => {
    const ok = await confirm(`${t("common.delete")} ${t("page.promotion_lower")} "${p.name}"?`, t("common.confirm_delete")); if (!ok) return;
    try { await api.delete(`/promotions/${p.id}`); toast.success(t("common.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  const now = new Date();

  return (
    <PageShell
      title={t("page.promotions")}
      subtitle={`${list.length} ${t("page.promotions_count")}`}
      right={
        <button onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_promotion")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("common.loading")}</div>
          ) : list.length === 0 ? (
            <div className="col-span-full text-center py-20 text-zinc-400"><Percent className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-mono text-sm">{t("page.no_promotions_yet")}</p></div>
          ) : list.map((p) => {
            const expired = p.end_date && new Date(p.end_date) < now;
            const cardClass = expired ? "border-zinc-200 opacity-60" : p.active ? "border-zinc-900" : "border-zinc-300 opacity-70";
            return (
              <div key={p.id} className={`bg-white border-2 ${cardClass} p-5 relative`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm truncate">{p.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-black">{(p.type === "percentage" ? `${p.discount_value || p.value || 0}%` : formatMoney(p.discount_value || p.value || 0))}</span>
                      <span className="text-[10px] font-mono uppercase text-zinc-500">{p.type === "percentage" ? t("page.off") : t("page.flat_off")}</span>
                    </div>
                  </div>
                  <div className={`px-2 py-0.5 text-[10px] font-bold uppercase ${p.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-500"}`}>
                    {p.active ? t("page.active") : t("page.inactive")}
                  </div>
                </div>
                {p.min_purchase > 0 && <p className="text-xs text-zinc-500 mt-2">{t("page.min_purchase")}: {formatMoney(p.min_purchase)}</p>}
                {p.valid_from && <p className="text-[10px] font-mono text-zinc-400 mt-1">{t("page.valid")}: {formatDate(p.valid_from)} - {formatDate(p.valid_to)}</p>}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-100">
                  <button onClick={() => toggleActive(p)} className={`h-8 px-3 text-[10px] font-bold uppercase tracking-widest border-2 ${p.active ? "border-green-500 text-green-700" : "border-zinc-300 text-zinc-500"}`}>{p.active ? t("page.deactivate") : t("page.activate")}</button>
                  <button onClick={() => setModal({ edit: p, form: { ...p } })} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-100"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p)} className="w-8 h-8 flex items-center justify-center text-[#E60000] hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_promotion") : t("page.new_promotion")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2"><span className="label">{t("page.promotion_name")} *</span><input className="input" value={modal.form.name} onChange={e => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} /></label>
                <label><span className="label">{t("page.discount_type")}</span><select className="input" value={modal.form.type} onChange={e => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })}><option value="percentage">{t("page.percentage")}</option><option value="fixed">{t("page.fixed")}</option></select></label>
                <label><span className="label">{t("page.discount_value")} *</span><input type="number" step="0.01" className="input" value={modal.form.discount_value} onChange={e => setModal({ ...modal, form: { ...modal.form, discount_value: e.target.value } })} /></label>
                <label><span className="label">{t("page.min_purchase")}</span><input type="number" step="0.01" className="input" value={modal.form.min_purchase} onChange={e => setModal({ ...modal, form: { ...modal.form, min_purchase: e.target.value } })} /></label>
                <label><span className="label">{t("page.max_discount")}</span><input type="number" step="0.01" className="input" value={modal.form.max_discount} onChange={e => setModal({ ...modal, form: { ...modal.form, max_discount: e.target.value } })} /></label>
                <label><span className="label">{t("page.valid_from")} *</span><input type="date" className="input" value={modal.form.valid_from} onChange={e => setModal({ ...modal, form: { ...modal.form, valid_from: e.target.value } })} /></label>
                <label><span className="label">{t("page.valid_to")} *</span><input type="date" className="input" value={modal.form.valid_to} onChange={e => setModal({ ...modal, form: { ...modal.form, valid_to: e.target.value } })} /></label>
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
