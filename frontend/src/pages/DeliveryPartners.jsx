import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { PageShell } from "@/pages/Dashboard";

const EMPTY = { name: "", phone: "", email: "", address: "", vehicle_no: "", commission_type: "fixed", commission_value: 0, active: true };

export default function DeliveryPartners() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/delivery-partners"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const validate = (f) => {
    if (!f.name.trim()) { toast.error(t("page.name_required")); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate(modal.form)) return;
    setSaving(true);
    try {
      const payload = { ...modal.form, commission_value: Number(modal.form.commission_value || 0) };
      if (modal.edit) { await api.patch(`/delivery-partners/${modal.edit.id}`, payload); toast.success(t("page.partner_updated")); }
      else { await api.post("/delivery-partners", payload); toast.success(t("page.partner_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    const ok = await confirm(`${t("common.delete")} "${p.name}"?`, t("common.confirm_delete")); if (!ok) return;
    setDeleting(p.id);
    try { await api.delete(`/delivery-partners/${p.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); } finally { setDeleting(null); }
  };

  return (
    <PageShell title={t("page.delivery_partners")} subtitle={`${list.length} ${t("page.partners_count")}`} right={
      <button onClick={() => setModal({ form: { ...EMPTY } })}
        className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_partner")}
      </button>
    }>
      <div className="p-6 overflow-y-auto h-full">
        <table className="data-table">
          <thead><tr><th>{t("common.name")}</th><th>{t("page.phone")}</th><th>{t("page.vehicle_no")}</th><th>{t("page.commission")}</th><th>{t("page.status")}</th><th className="text-right">{t("page.actions")}</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline" /> {t("common.loading")}</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-zinc-400">{t("page.no_partners_yet")}</td></tr>
            ) : list.map((p) => (
              <tr key={p.id}>
                <td className="font-medium">{p.name}</td><td>{p.phone}</td><td>{p.vehicle_no}</td>
                <td>{p.commission_type === "percentage" ? `${p.commission_value}%` : p.commission_value}</td>
                <td><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${p.active ? "bg-green-100 text-green-800" : "bg-zinc-100 text-zinc-500"}`}>{p.active ? t("page.active") : t("page.inactive")}</span></td>
                <td className="text-right">
                  <button onClick={() => setModal({ edit: p, form: { ...p } })} className="btn-icon"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p)} disabled={deleting === p.id} className="btn-icon text-[#E60000]">
                    {deleting === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
            <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_partner") : t("page.new_partner")}</div>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="col-span-2"><span className="label">{t("common.name")} *</span><input className="input" value={modal.form.name} onChange={e => setModal({ ...modal, form: { ...modal.form, name: e.target.value }})} /></label>
                  <label><span className="label">{t("page.phone")}</span><input className="input" value={modal.form.phone} onChange={e => setModal({ ...modal, form: { ...modal.form, phone: e.target.value }})} /></label>
                  <label><span className="label">{t("page.email")}</span><input className="input" value={modal.form.email} onChange={e => setModal({ ...modal, form: { ...modal.form, email: e.target.value }})} /></label>
                  <label className="col-span-2"><span className="label">{t("page.address")}</span><textarea className="input" rows={2} value={modal.form.address} onChange={e => setModal({ ...modal, form: { ...modal.form, address: e.target.value }})} /></label>
                  <label><span className="label">{t("page.vehicle_no")}</span><input className="input" value={modal.form.vehicle_no} onChange={e => setModal({ ...modal, form: { ...modal.form, vehicle_no: e.target.value }})} /></label>
                  <label><span className="label">{t("page.commission_type")}</span><select className="input" value={modal.form.commission_type} onChange={e => setModal({ ...modal, form: { ...modal.form, commission_type: e.target.value }})}><option value="fixed">{t("page.fixed")}</option><option value="percentage">{t("page.percentage")}</option></select></label>
                  <label><span className="label">{t("page.commission_value")}</span><input type="number" step="0.01" className="input" value={modal.form.commission_value} onChange={e => setModal({ ...modal, form: { ...modal.form, commission_value: e.target.value }})} /></label>
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
