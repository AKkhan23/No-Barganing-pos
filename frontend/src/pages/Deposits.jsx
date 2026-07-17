import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

function todayISO() { return new Date().toISOString().slice(0, 10); }

const EMPTY = { customer_name: "", customer_phone: "", amount: "", payment_method: "", note: "", date: todayISO() };

export default function Deposits() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    try { const r = await api.get("/deposits"); setItems(r.data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (c) =>
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.customer_phone || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalAmount = filtered.reduce((sum, c) => sum + (c.amount || 0), 0);

  const onSave = async (form) => {
    try {
      const payload = { ...form, amount: parseFloat(form.amount) || 0 };
      if (modal?.edit) {
        await api.patch(`/deposits/${modal.edit.id}`, payload);
        toast.success(t("page.deposit_updated"));
      } else {
        await api.post("/deposits", payload);
        toast.success(t("page.deposit_created"));
      }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const onDelete = async (item) => {
    const ok = await confirm(t("page.delete_confirm", { name: item.customer_name }), t("page.delete_title")); if (!ok) return;
    try { await api.delete(`/deposits/${item.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  return (
    <PageShell title={t("page.deposits")} subtitle={t("page.deposits_sub")}>
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E60000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <div>
              <div className="font-display font-black text-lg">{t("page.deposits")}</div>
              <div className="text-xs text-zinc-500">{t("page.total_deposits")}: ₹{totalAmount.toFixed(2)}</div>
            </div>
          </div>
          <button onClick={() => setModal({ edit: null, form: { ...EMPTY } })}
            className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("page.add_deposit")}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("page.search_deposits")}
            className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]" />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.customer_name")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.phone")}</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.amount")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.payment_method")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.date")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.note")}</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium">{c.customer_name}</td>
                  <td className="p-4 text-sm text-zinc-500">{c.customer_phone || "-"}</td>
                  <td className="p-4 text-right font-semibold">₹{(c.amount || 0).toFixed(2)}</td>
                  <td className="p-4 text-sm text-zinc-500">{c.payment_method || "-"}</td>
                  <td className="p-4 text-sm text-zinc-500">{c.date ? new Date(c.date).toLocaleDateString() : "-"}</td>
                  <td className="p-4 text-sm text-zinc-500 max-w-[200px] truncate">{c.note || "-"}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setModal({ edit: c, form: { customer_name: c.customer_name, customer_phone: c.customer_phone || "", amount: c.amount || "", payment_method: c.payment_method || "", note: c.note || "", date: c.date ? c.date.slice(0, 10) : todayISO() } })}
                      className="p-2 hover:bg-zinc-100 rounded-lg mr-1 transition-colors" title={t("page.edit")}><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(c)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#E60000] transition-colors" title={t("page.delete")}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="p-12 text-center">
                  <div className="text-zinc-300 mb-2"><svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div>
                  <div className="text-zinc-400 font-medium mb-1">{search ? t("page.no_matching") : t("page.no_deposits")}</div>
                  <div className="text-zinc-400 text-sm">{search ? t("page.try_different") : t("page.click_add_deposit")}</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div>
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_deposit") : t("page.new_deposit")}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{modal.edit ? t("page.update_deposit_details") : t("page.add_deposit_prompt")}</div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave(modal.form); }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.customer_name")} <span className="text-[#E60000]">*</span></label>
                  <input value={modal.form.customer_name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, customer_name: e.target.value } })} required placeholder={t("page.enter_customer_name")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.phone")}</label>
                  <input value={modal.form.customer_phone} onChange={(e) => setModal({ ...modal, form: { ...modal.form, customer_phone: e.target.value } })} placeholder={t("page.enter_phone")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.amount")} <span className="text-[#E60000]">*</span></label>
                  <input type="number" step="0.01" min="0" value={modal.form.amount} onChange={(e) => setModal({ ...modal, form: { ...modal.form, amount: e.target.value } })} required placeholder="0.00"
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.payment_method")}</label>
                  <input value={modal.form.payment_method} onChange={(e) => setModal({ ...modal, form: { ...modal.form, payment_method: e.target.value } })} placeholder={t("page.enter_payment_method")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.date")} <span className="text-[#E60000]">*</span></label>
                <input type="date" value={modal.form.date} onChange={(e) => setModal({ ...modal, form: { ...modal.form, date: e.target.value } })} required
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.note")}</label>
                <textarea value={modal.form.note} onChange={(e) => setModal({ ...modal, form: { ...modal.form, note: e.target.value } })} rows={3} placeholder={t("page.enter_note")}
                  className="w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">{t("page.cancel")}</button>
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors">
                  {modal.edit ? t("page.update") : t("page.add")} {t("page.deposit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
