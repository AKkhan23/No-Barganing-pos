import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Search, Receipt } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

const EMPTY = { category: "rent", account: "", amount: "", note: "", date: new Date().toISOString().slice(0, 10) };
const CATS = ["rent", "utility", "salary", "misc"];

export default function Expenses() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);

  const load = async () => {
    const [e, a] = await Promise.all([api.get("/expenses"), api.get("/accounts")]);
    setItems(e.data); setAccounts(a.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (x.category || "").toLowerCase().includes(s) || (x.account || "").toLowerCase().includes(s) || (x.note || "").toLowerCase().includes(s);
  });

  const onSave = async (form) => {
    try {
      const payload = { ...form, amount: Number(form.amount || 0) };
      await api.post("/expenses", payload);
      toast.success(t("page.expense_recorded"));
      setModal(false); load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.save_failed"));
    }
  };

  return (
    <PageShell
      title={t("page.expenses")}
      subtitle={`${items.length} ${t("page.entries_count_expenses")}`}
      right={
        <button
          onClick={() => setModal(true)}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-expense-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("common.add")} {t("page.expenses")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_expenses")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
            data-testid="expenses-search"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-left">{t("page.category")}</th>
                <th className="p-3 text-left">{t("page.paid_via")}</th>
                <th className="p-3 text-right">{t("page.amount")}</th>
                <th className="p-3 text-left">{t("page.note")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((x) => (
                <tr key={x.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`row-expense-${x.id}`}>
                  <td className="p-3 font-mono text-xs">{x.date ? x.date.slice(0, 10) : formatDate(x.created_at)}</td>
                  <td className="p-3 uppercase font-mono text-xs">{x.category}</td>
                  <td className="p-3 font-semibold">{x.account}</td>
                  <td className="p-3 font-mono text-right font-bold">{formatMoney(x.amount)}</td>
                  <td className="p-3 text-xs text-zinc-600">{x.note || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_expenses")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ExpenseModal
          accounts={accounts}
          onClose={() => setModal(false)}
          onSave={onSave}
          t={t}
        />
      )}
    </PageShell>
  );
}

function ExpenseModal({ accounts, onClose, onSave, t }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm({ ...form, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="expense-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">{t("common.add")} {t("page.expenses")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" data-testid="expense-modal-close"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.category")} *</label>
            <select value={form.category} onChange={(e) => upd("category", e.target.value)}
              data-testid="em-category" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
              {CATS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.paid_via")} *</label>
            <select value={form.account} onChange={(e) => upd("account", e.target.value)}
              required data-testid="em-account" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
              <option value="">{t("page.select_account")}</option>
              {accounts.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.amount")} *</label>
            <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => upd("amount", e.target.value)}
              required data-testid="em-amount" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.date")} *</label>
            <input type="date" value={form.date} onChange={(e) => upd("date", e.target.value)}
              required data-testid="em-date" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
            <input value={form.note} onChange={(e) => upd("note", e.target.value)}
              data-testid="em-note" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest" data-testid="em-cancel">{t("common.cancel")}</button>
            <button type="submit" disabled={busy} data-testid="em-save"
              className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
              {busy ? t("page.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
