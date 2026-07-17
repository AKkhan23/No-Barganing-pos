import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Search, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

const EMPTY = { name: "", type: "counter", is_active: true };

export default function Registers() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const [cashPrompt, setCashPrompt] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    try { const r = await api.get("/registers"); setItems(r.data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((c) => (c.name || "").toLowerCase().includes(search.toLowerCase()));

  const onSave = async (form) => {
    try {
      if (modal?.edit) {
        await api.patch(`/registers/${modal.edit.id}`, form);
        toast.success(t("page.register_updated"));
      } else {
        await api.post("/registers", form);
        toast.success(t("page.register_created"));
      }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const onDelete = async (item) => {
    const ok = await confirm(t("page.delete_confirm", { name: item.name }), t("page.delete_title")); if (!ok) return;
    try { await api.delete(`/registers/${item.id}`); toast.success(t("page.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  const onSetOpeningCash = async (item, amount) => {
    if (amount == null || amount < 0) { toast.error(t("page.valid_amount")); return; }
    try {
      await api.patch(`/registers/${item.id}`, { opening_cash: amount });
      toast.success(t("page.opening_cash_updated"));
      setCashPrompt(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  return (
    <PageShell title={t("page.registers")} subtitle={t("page.registers_sub")}>
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E60000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <div className="font-display font-black text-lg">{items.length} {t("page.registers")}</div>
              <div className="text-xs text-zinc-500">{t("page.total_registers")}</div>
            </div>
          </div>
          <button onClick={() => setModal({ edit: null, form: { ...EMPTY } })}
            className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t("page.add_register")}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("page.search_registers")}
            className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]" />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.name")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.type")}</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.opening_cash")}</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.cash_in_hand")}</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.status")}</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">{t("page.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${c.type === "main" ? "bg-[#2563EB]/10 text-[#2563EB]" : "bg-[#F59E0B]/10 text-[#F59E0B]"}`}>
                      {c.type}
                    </span>
                  </td>
                  <td className="p-4 text-right font-medium">₹{(c.opening_cash || 0).toFixed(2)}</td>
                  <td className="p-4 text-right font-medium">₹{(c.cash_in_hand || 0).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${c.is_active ? "bg-[#10B981]/10 text-[#10B981]" : "bg-zinc-100 text-zinc-500"}`}>
                      {c.is_active ? t("page.active") : t("page.inactive")}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setCashPrompt(c)}
                      className="p-2 hover:bg-green-50 rounded-lg mr-1 text-[#10B981] transition-colors" title={t("page.set_opening_cash")}><DollarSign className="w-4 h-4" /></button>
                    <button onClick={() => setModal({ edit: c, form: { name: c.name, type: c.type, is_active: c.is_active } })}
                      className="p-2 hover:bg-zinc-100 rounded-lg mr-1 transition-colors" title={t("page.edit")}><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(c)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#E60000] transition-colors" title={t("page.delete")}><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="p-12 text-center">
                  <div className="text-zinc-300 mb-2"><svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></div>
                  <div className="text-zinc-400 font-medium mb-1">{search ? t("page.no_matching") : t("page.no_registers")}</div>
                  <div className="text-zinc-400 text-sm">{search ? t("page.try_different") : t("page.click_add_register")}</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {cashPrompt && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setCashPrompt(null)}>
          <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div className="font-display font-black uppercase text-lg">{t("page.set_opening_cash")}</div>
              <button onClick={() => setCashPrompt(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.target); onSetOpeningCash(cashPrompt, parseFloat(fd.get("amount"))); }}>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.opening_cash_amount")} <span className="text-[#E60000]">*</span></label>
                <input name="amount" type="number" step="0.01" min="0" required defaultValue={cashPrompt.opening_cash || 0}
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setCashPrompt(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">{t("page.cancel")}</button>
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors">{t("page.save")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div>
                <div className="font-display font-black uppercase text-lg">{modal.edit ? t("page.edit_register") : t("page.new_register")}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{modal.edit ? t("page.update_register_details") : t("page.add_register_prompt")}</div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave(modal.form); }}>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.register_name")} <span className="text-[#E60000]">*</span></label>
                <input value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} required placeholder={t("page.enter_register_name")}
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.type")} <span className="text-[#E60000]">*</span></label>
                <select value={modal.form.type} onChange={(e) => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })} required
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm">
                  <option value="main">Main</option>
                  <option value="counter">Counter</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="is_active" checked={modal.form.is_active} onChange={(e) => setModal({ ...modal, form: { ...modal.form, is_active: e.target.checked } })}
                  className="w-4 h-4 rounded border-zinc-300 text-[#E60000] focus:ring-[#E60000]/30" />
                <label htmlFor="is_active" className="text-sm font-medium text-zinc-700">{t("page.active")}</label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">{t("page.cancel")}</button>
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors">
                  {modal.edit ? t("page.update") : t("page.add")} {t("page.register")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
