import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { PageShell } from "@/pages/Dashboard";

const EMPTY = { name: "", discount_percent: 0, description: "" };

export default function CustomerGroups() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/customer-groups"); setList(r.data); } finally { setLoading(false); }
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
      const payload = { ...modal.form, discount_percent: Number(modal.form.discount_percent || 0) };
      if (modal.edit) { await api.patch(`/customer-groups/${modal.edit.id}`, payload); toast.success(t("page.group_updated")); }
      else { await api.post("/customer-groups", payload); toast.success(t("page.group_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    const ok = await confirm(`${t("common.delete")} "${p.name}"?`, t("common.confirm_delete")); if (!ok) return;
    setDeleting(p.id);
    try { await api.delete(`/customer-groups/${p.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); } finally { setDeleting(null); }
  };

  return (
    <PageShell title={t("page.customer_groups")} subtitle={`${list.length} ${t("page.groups_count")}`} right={
      <button onClick={() => setModal({ form: { ...EMPTY } })}
        className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_group")}
      </button>
    }>
      <div className="p-6 overflow-y-auto h-full">
        <table className="data-table">
          <thead><tr><th>{t("common.name")}</th><th>{t("page.discount_percent")}</th><th>{t("page.description")}</th><th className="text-right">{t("page.actions")}</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline" /> {t("common.loading")}</td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-8 text-zinc-400">{t("page.no_groups_yet")}</td></tr>
            ) : list.map((g) => (
              <tr key={g.id}>
                <td className="font-medium">{g.name}</td>
                <td>{g.discount_percent}%</td>
                <td className="text-zinc-500">{g.description}</td>
                <td className="text-right">
                  <button onClick={() => setModal({ edit: g, form: { ...g } })} className="btn-icon"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(g)} disabled={deleting === g.id} className="btn-icon text-[#E60000]">
                    {deleting === g.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_group") : t("page.new_group")}</div>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <label><span className="label">{t("common.name")} *</span><input className="input" value={modal.form.name} onChange={e => setModal({ ...modal, form: { ...modal.form, name: e.target.value }})} /></label>
                <label><span className="label">{t("page.discount_percent")}</span><input type="number" step="0.01" className="input" value={modal.form.discount_percent} onChange={e => setModal({ ...modal, form: { ...modal.form, discount_percent: e.target.value }})} /></label>
                <label><span className="label">{t("page.description")}</span><textarea className="input" rows={3} value={modal.form.description} onChange={e => setModal({ ...modal, form: { ...modal.form, description: e.target.value }})} /></label>
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
