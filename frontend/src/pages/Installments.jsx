import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useConfirm } from "@/lib/confirm";
import { PageShell } from "@/pages/Dashboard";

const EMPTY = { customer_name: "", total_amount: 0, down_payment: 0, installment_amount: 0, total_installments: 1, installments_paid: 0, status: "active", due_date: "" };

export default function Installments() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/installments"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const validate = (f) => {
    if (!f.customer_name.trim()) { toast.error(t("page.customer_name_required")); return false; }
    if (Number(f.total_amount) <= 0) { toast.error(t("page.total_amount_positive")); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate(modal.form)) return;
    setSaving(true);
    try {
      const payload = { ...modal.form, total_amount: Number(modal.form.total_amount || 0), down_payment: Number(modal.form.down_payment || 0), installment_amount: Number(modal.form.installment_amount || 0), total_installments: Number(modal.form.total_installments || 1), installments_paid: Number(modal.form.installments_paid || 0) };
      if (modal.edit) { await api.patch(`/installments/${modal.edit.id}`, payload); toast.success(t("page.installment_updated")); }
      else { await api.post("/installments", payload); toast.success(t("page.installment_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleDelete = async (p) => {
    const ok = await confirm(`${t("common.delete")} ${t("page.installment_lower")} "${p.customer_name}"?`, t("common.confirm_delete")); if (!ok) return;
    setDeleting(p.id);
    try { await api.delete(`/installments/${p.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); } finally { setDeleting(null); }
  };

  return (
    <PageShell title={t("page.installments")} subtitle={`${list.length} ${t("page.plans_count")}`} right={
      <button onClick={() => setModal({ form: { ...EMPTY } })}
        className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
        <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_plan")}
      </button>
    }>
      <div className="p-6 overflow-y-auto h-full">
        <table className="data-table">
          <thead><tr><th>{t("page.customer")}</th><th>{t("page.total")}</th><th>{t("page.down_payment")}</th><th>{t("page.installment_amount")}</th><th>{t("page.paid_total")}</th><th>{t("page.due_date")}</th><th>{t("page.status")}</th><th className="text-right">{t("page.actions")}</th></tr></thead>
          <tbody>
            {loading ? (<tr><td colSpan={8} className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline" /> {t("common.loading")}</td></tr>
            ) : list.length === 0 ? (<tr><td colSpan={8} className="text-center py-8 text-zinc-400">{t("page.no_plans_yet")}</td></tr>
            ) : list.map((pl) => (<tr key={pl.id}>
              <td className="font-medium">{pl.customer_name}</td><td>{pl.total_amount}</td><td>{pl.down_payment}</td><td>{pl.installment_amount}</td>
              <td>{pl.installments_paid} / {pl.total_installments}</td><td className="text-xs">{pl.due_date?.slice(0,10)}</td>
              <td><span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${pl.status === "active" ? "bg-green-100 text-green-800" : pl.status === "completed" ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800"}`}>{pl.status}</span></td>
              <td className="text-right">
                <button onClick={() => setModal({ edit: pl, form: { ...pl } })} className="btn-icon"><Pencil className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(pl)} disabled={deleting === pl.id} className="btn-icon text-[#E60000]">
                  {deleting === pl.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                </button>
              </td>
            </tr>))}
          </tbody>
        </table>
        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
            <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_plan") : t("page.new_plan")}</div>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <label className="col-span-2"><span className="label">{t("page.customer_name")} *</span><input className="input" value={modal.form.customer_name} onChange={e => setModal({ ...modal, form: { ...modal.form, customer_name: e.target.value }})} /></label>
                  <label><span className="label">{t("page.total_amount")} *</span><input type="number" step="0.01" className="input" value={modal.form.total_amount} onChange={e => setModal({ ...modal, form: { ...modal.form, total_amount: e.target.value }})} /></label>
                  <label><span className="label">{t("page.down_payment")}</span><input type="number" step="0.01" className="input" value={modal.form.down_payment} onChange={e => setModal({ ...modal, form: { ...modal.form, down_payment: e.target.value }})} /></label>
                  <label><span className="label">{t("page.installment_amount")}</span><input type="number" step="0.01" className="input" value={modal.form.installment_amount} onChange={e => setModal({ ...modal, form: { ...modal.form, installment_amount: e.target.value }})} /></label>
                  <label><span className="label">{t("page.total_installments")}</span><input type="number" className="input" value={modal.form.total_installments} onChange={e => setModal({ ...modal, form: { ...modal.form, total_installments: e.target.value }})} /></label>
                  <label><span className="label">{t("page.installments_paid")}</span><input type="number" className="input" value={modal.form.installments_paid} onChange={e => setModal({ ...modal, form: { ...modal.form, installments_paid: e.target.value }})} /></label>
                  <label><span className="label">{t("page.due_date")}</span><input type="date" className="input" value={modal.form.due_date} onChange={e => setModal({ ...modal, form: { ...modal.form, due_date: e.target.value }})} /></label>
                  <label><span className="label">{t("page.status")}</span><select className="input" value={modal.form.status} onChange={e => setModal({ ...modal, form: { ...modal.form, status: e.target.value }})}><option value="active">{t("page.active")}</option><option value="completed">Completed</option><option value="defaulted">Defaulted</option></select></label>
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
