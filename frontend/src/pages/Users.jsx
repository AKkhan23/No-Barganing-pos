import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, X, Loader2, Shield, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

const EMPTY = { name: "", email: "", password: "", role: "cashier", phone: "", active: true };

export default function Users() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/users"); setUsers(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const f = modal.form;
      const payload = { ...f, active: f.active != null ? f.active : true };
      if (!payload.password && modal.edit) delete payload.password;
      if (modal.edit) { await api.patch(`/users/${modal.edit.id}`, payload); toast.success(t("page.user_updated")); }
      else { await api.post("/users", payload); toast.success(t("page.user_created")); }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const toggleActive = async (u) => {
    try { await api.patch(`/users/${u.id}`, { active: !u.active }); toast.success(t("page.status_updated")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const handleDelete = async (u) => {
    const ok = await confirm(`${t("common.delete")} ${t("page.user_lower")} "${u.name || u.email}"?`, t("common.confirm_delete")); if (!ok) return;
    try { await api.delete(`/users/${u.id}`); toast.success(t("common.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  const roleBadge = (r) => {
    const colors = { admin: "bg-red-100 text-red-800", manager: "bg-blue-100 text-blue-800", cashier: "bg-green-100 text-green-800" };
    return <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${colors[r] || "bg-zinc-100 text-zinc-500"}`}>{r}</span>;
  };

  return (
    <PageShell title={t("page.users")} subtitle={`${users.length} ${t("page.users_count")}`}
      right={
        <button onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_user")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : users.length === 0 ? (
            <div className="col-span-full text-center py-20 text-zinc-400"><Shield className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>{t("page.no_users_yet")}</p></div>
          ) : users.map((u) => (
            <div key={u.id} className={`bg-white border-2 p-5 ${u.active ? "border-zinc-200" : "border-zinc-100 opacity-60"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm">{u.name || u.email}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{u.email}</p>
                  {u.phone && <p className="text-[10px] text-zinc-400 font-mono">{u.phone}</p>}
                </div>
                <div className="flex items-center gap-1">
                  {roleBadge(u.role)}
                  <button onClick={() => toggleActive(u)} className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-900" title={u.active ? t("page.deactivate") : t("page.activate")}>
                    {u.active ? <Shield className="w-4 h-4 text-green-600" /> : <ShieldOff className="w-4 h-4 text-red-500" />}
                  </button>
                </div>
              </div>
              <div className="mt-3 text-[10px] font-mono text-zinc-400">{t("page.created")}: {formatDate(u.created_at)}</div>
              <div className="flex gap-1 mt-3 pt-3 border-t border-zinc-100">
                <button onClick={() => setModal({ edit: u, form: { name: u.name, email: u.email, password: "", role: u.role, phone: u.phone || "", active: u.active } })}
                  className="flex-1 h-8 flex items-center justify-center gap-1 border-2 border-zinc-200 text-zinc-600 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50">
                  <Pencil className="w-3 h-3" /> {t("common.edit")}
                </button>
                <button onClick={() => handleDelete(u)} disabled={u.role === "admin"}
                  className="w-8 h-8 flex items-center justify-center border-2 border-zinc-200 text-[#E60000] hover:bg-red-50 disabled:opacity-30">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_user") : t("page.new_user")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <label className="col-span-2"><span className="label">{t("page.name")} *</span><input className="input" value={modal.form.name} onChange={e => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} /></label>
                <label className="col-span-2"><span className="label">{t("page.email")} *</span><input type="email" className="input" value={modal.form.email} onChange={e => setModal({ ...modal, form: { ...modal.form, email: e.target.value } })} /></label>
                <label className="col-span-2"><span className="label">{t("page.password")} {modal.edit ? `(${t("page.leave_blank")})` : "*"}</span><input type="password" className="input" value={modal.form.password} onChange={e => setModal({ ...modal, form: { ...modal.form, password: e.target.value } })} /></label>
                <label><span className="label">{t("page.role")}</span><select className="input" value={modal.form.role} onChange={e => setModal({ ...modal, form: { ...modal.form, role: e.target.value } })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="cashier">Cashier</option></select></label>
                <label><span className="label">{t("page.phone")}</span><input className="input" value={modal.form.phone} onChange={e => setModal({ ...modal, form: { ...modal.form, phone: e.target.value } })} /></label>
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
