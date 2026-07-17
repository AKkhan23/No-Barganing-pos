import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

const EMPTY = { employee_name: "", employee_code: "", designation: "", department: "", basic_salary: 0, allowances: 0, deductions: 0, net_salary: 0, pay_date: "", status: "pending", notes: "" };

export default function Payroll() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/payroll"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const recalcNet = (f) => ({ ...f, net_salary: Math.max(0, (Number(f.basic_salary) + Number(f.allowances)) - Number(f.deductions)) });

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = recalcNet(modal.form);
      const payload = { ...f, basic_salary: Number(f.basic_salary), allowances: Number(f.allowances), deductions: Number(f.deductions), net_salary: Number(f.net_salary) };
      if (modal.edit) { await api.patch(`/payroll/${modal.edit.id}`, payload); toast.success(t("page.payroll_updated")); }
      else { await api.post("/payroll", payload); toast.success(t("page.payroll_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleStatus = async (id, status) => {
    try { await api.patch(`/payroll/${id}`, { status }); toast.success(t("page.status_updated")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm(t("page.confirm_delete_payroll"), t("common.confirm_delete")); if (!ok) return;
    try { await api.delete(`/payroll/${id}`); toast.success(t("common.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  return (
    <PageShell
      title={t("page.payroll")}
      subtitle={`${list.length} ${t("page.employees_on_payroll")}`}
      right={
        <button onClick={() => setModal({ form: { ...EMPTY } })} className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_payroll_entry")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">{t("page.employee")}</th><th className="p-3 text-left">{t("page.designation")}</th><th className="p-3 text-right">{t("page.basic")}</th><th className="p-3 text-right">{t("page.allowances")}</th><th className="p-3 text-right">{t("page.deductions")}</th><th className="p-3 text-right">{t("page.net_salary")}</th><th className="p-3 text-left">{t("page.pay_date")}</th><th className="p-3 text-left">{t("page.status")}</th><th className="p-3 text-right">{t("page.actions")}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-zinc-500"><Loader2 className="w-5 h-5 animate-spin inline" /> {t("common.loading")}</td></tr>
              ) : list.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-8 text-zinc-400">{t("page.no_payroll_entries")}</td></tr>
              ) : list.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3"><div className="font-semibold">{p.employee_name}</div><div className="text-[10px] text-zinc-500">{p.employee_code}</div></td>
                  <td className="p-3 text-xs">{p.designation}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(p.basic_salary)}</td>
                  <td className="p-3 text-right font-mono text-green-600">{formatMoney(p.allowances)}</td>
                  <td className="p-3 text-right font-mono text-red-600">{formatMoney(p.deductions)}</td>
                  <td className="p-3 text-right font-mono font-bold">{formatMoney(p.net_salary)}</td>
                  <td className="p-3 text-xs">{p.pay_date?.slice(0, 10)}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded ${p.status === "paid" ? "bg-green-100 text-green-800" : p.status === "pending" ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "pending" && <button onClick={() => handleStatus(p.id, "paid")} className="w-7 h-7 flex items-center justify-center text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>}
                      <button onClick={() => setModal({ edit: p, form: { ...p } })} className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:bg-zinc-100"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center text-[#E60000] hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_payroll") : t("page.new_payroll")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2"><span className="label">{t("page.employee_name")} *</span><input className="input" value={modal.form.employee_name} onChange={e => setModal({ ...modal, form: recalcNet({ ...modal.form, employee_name: e.target.value }) })} required /></label>
                <label><span className="label">{t("page.employee_code")}</span><input className="input" value={modal.form.employee_code} onChange={e => setModal({ ...modal, form: { ...modal.form, employee_code: e.target.value } })} /></label>
                <label><span className="label">{t("page.designation")}</span><input className="input" value={modal.form.designation} onChange={e => setModal({ ...modal, form: { ...modal.form, designation: e.target.value } })} /></label>
                <label className="col-span-2"><span className="label">{t("page.department")}</span><input className="input" value={modal.form.department} onChange={e => setModal({ ...modal, form: { ...modal.form, department: e.target.value } })} /></label>
                <label><span className="label">{t("page.basic_salary")} *</span><input type="number" step="0.01" className="input" value={modal.form.basic_salary} onChange={e => setModal({ ...modal, form: recalcNet({ ...modal.form, basic_salary: e.target.value }) })} /></label>
                <label><span className="label">{t("page.allowances")}</span><input type="number" step="0.01" className="input" value={modal.form.allowances} onChange={e => setModal({ ...modal, form: recalcNet({ ...modal.form, allowances: e.target.value }) })} /></label>
                <label><span className="label">{t("page.deductions")}</span><input type="number" step="0.01" className="input" value={modal.form.deductions} onChange={e => setModal({ ...modal, form: recalcNet({ ...modal.form, deductions: e.target.value }) })} /></label>
                <label><span className="label">{t("page.net_salary")}</span><input type="number" step="0.01" className="input bg-zinc-100" value={modal.form.net_salary} readOnly /></label>
                <label><span className="label">{t("page.pay_date")} *</span><input type="date" className="input" value={modal.form.pay_date} onChange={e => setModal({ ...modal, form: { ...modal.form, pay_date: e.target.value } })} /></label>
                <label><span className="label">{t("page.status")}</span><select className="input" value={modal.form.status} onChange={e => setModal({ ...modal, form: { ...modal.form, status: e.target.value } })}><option value="pending">Pending</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option></select></label>
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
