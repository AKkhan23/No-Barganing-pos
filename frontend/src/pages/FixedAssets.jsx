import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { PageShell } from "@/pages/Dashboard";

const EMPTY = { name: "", purchase_date: "", purchase_price: 0, current_value: 0, depreciation_method: "straight_line", depreciation_rate: 0, useful_life_years: 5, location: "", category: "", notes: "", active: true };

export default function FixedAssets() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/fixed-assets"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const validate = (f) => {
    if (!f.name.trim()) { toast.error(t("page.asset_name_required")); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate(modal.form)) return;
    setSaving(true);
    try {
      const payload = { ...modal.form, purchase_price: Number(modal.form.purchase_price || 0), current_value: Number(modal.form.current_value || 0), depreciation_rate: Number(modal.form.depreciation_rate || 0), useful_life_years: Number(modal.form.useful_life_years || 5) };
      if (modal.edit) { await api.patch(`/fixed-assets/${modal.edit.id}`, payload); toast.success(t("page.asset_updated")); }
      else { await api.post("/fixed-assets", payload); toast.success(t("page.asset_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    const ok = await confirm(`${t("common.delete")} "${p.name}"?`, t("common.confirm_delete")); if (!ok) return;
    setDeleting(p.id);
    try { await api.delete(`/fixed-assets/${p.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); } finally { setDeleting(null); }
  };

  return (
    <PageShell title={t("page.fixed_assets")} subtitle={`${list.length} ${t("page.assets_count")}`} right={
      <button onClick={() => setModal({ form: { ...EMPTY } })}
        className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_asset")}
      </button>
    }>
      <div className="p-6 overflow-y-auto h-full">
        <table className="data-table">
          <thead><tr><th>{t("common.name")}</th><th>{t("page.category")}</th><th>{t("page.purchase_price")}</th><th>{t("page.current_value")}</th><th>{t("page.location")}</th><th>{t("page.status")}</th><th className="text-right">{t("page.actions")}</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={7} className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline" /> {t("common.loading")}</td></tr>
            ) : list.length === 0 ? (<tr><td colSpan={7} className="text-center py-8 text-zinc-400">{t("page.no_assets_yet")}</td></tr>
            ) : list.map((a) => (<tr key={a.id}>
              <td className="font-medium">{a.name}</td><td>{a.category}</td><td>{a.purchase_price}</td><td>{a.current_value}</td><td>{a.location}</td>
              <td><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${a.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-500"}`}>{a.active ? t("page.active") : t("page.inactive")}</span></td>
              <td className="text-right">
                <button onClick={() => setModal({ edit: a, form: { ...a } })} className="btn-icon"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(a)} disabled={deleting === a.id} className="btn-icon text-[#E60000]">
                  {deleting === a.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </td>
            </tr>))}
          </tbody>
        </table>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
            <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_asset") : t("page.new_asset")}</div>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="col-span-2"><span className="label">{t("common.name")} *</span><input className="input" value={modal.form.name} onChange={e => setModal({ ...modal, form: { ...modal.form, name: e.target.value }})} /></label>
                  <label><span className="label">{t("page.category")}</span><input className="input" value={modal.form.category} onChange={e => setModal({ ...modal, form: { ...modal.form, category: e.target.value }})} /></label>
                  <label><span className="label">{t("page.location")}</span><input className="input" value={modal.form.location} onChange={e => setModal({ ...modal, form: { ...modal.form, location: e.target.value }})} /></label>
                  <label><span className="label">{t("page.purchase_date")}</span><input type="date" className="input" value={modal.form.purchase_date} onChange={e => setModal({ ...modal, form: { ...modal.form, purchase_date: e.target.value }})} /></label>
                  <label><span className="label">{t("page.purchase_price")}</span><input type="number" step="0.01" className="input" value={modal.form.purchase_price} onChange={e => setModal({ ...modal, form: { ...modal.form, purchase_price: e.target.value }})} /></label>
                  <label><span className="label">{t("page.current_value")}</span><input type="number" step="0.01" className="input" value={modal.form.current_value} onChange={e => setModal({ ...modal, form: { ...modal.form, current_value: e.target.value }})} /></label>
                  <label><span className="label">{t("page.depreciation_method")}</span><select className="input" value={modal.form.depreciation_method} onChange={e => setModal({ ...modal, form: { ...modal.form, depreciation_method: e.target.value }})}><option value="straight_line">{t("page.straight_line")}</option><option value="declining">{t("page.declining_balance")}</option></select></label>
                  <label><span className="label">{t("page.depreciation_rate")}</span><input type="number" step="0.01" className="input" value={modal.form.depreciation_rate} onChange={e => setModal({ ...modal, form: { ...modal.form, depreciation_rate: e.target.value }})} /></label>
                  <label><span className="label">{t("page.useful_life")}</span><input type="number" className="input" value={modal.form.useful_life_years} onChange={e => setModal({ ...modal, form: { ...modal.form, useful_life_years: e.target.value }})} /></label>
                  <label className="col-span-2"><span className="label">{t("page.notes")}</span><textarea className="input" rows={2} value={modal.form.notes} onChange={e => setModal({ ...modal, form: { ...modal.form, notes: e.target.value }})} /></label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={modal.form.active} onChange={e => setModal({ ...modal, form: { ...modal.form, active: e.target.checked }})} className="w-4 h-4" /> {t("page.active")}</label>
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
      </div>
    </PageShell>
  );
}
