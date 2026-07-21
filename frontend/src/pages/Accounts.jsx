import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConfirm } from "../lib/confirm";
import { Plus, Edit3, Trash2, X, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney } from "../lib/format";
import { PageShell } from "./Dashboard";

const EMPTY = { name: "", type: "cash", opening_balance: "0" };
const TYPES = ["cash", "bank", "upi", "wallet"];

export default function Accounts() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    const r = await api.get("/accounts");
    setItems(r.data);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((a) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return a.name.toLowerCase().includes(s) || a.type.toLowerCase().includes(s);
  });

  const onSave = async (form) => {
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance || 0) };
      if (modal.edit) {
        await api.patch(`/accounts/${modal.edit.id}`, payload);
        toast.success(t("page.account_updated"));
      } else {
        await api.post("/accounts", payload);
        toast.success(t("page.account_created"));
      }
      setModal(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    }
  };

  const onDelete = async (a) => {
    const ok = await confirm(`${t("common.delete")} ${a.name}?`, t("common.confirm_delete")); if (!ok) return;
    try {
      await api.delete(`/accounts/${a.id}`);
      toast.success(t("page.deleted"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed"));
    }
  };

  return (
    <PageShell
      title={t("page.accounts")}
      subtitle={`${items.length} ${t("page.ledgers")}`}
      right={
        <button
          onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-account-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("common.add")} {t("page.accounts")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_accounts")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
            data-testid="accounts-search"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.type")}</th>
                <th className="p-3 text-right">{t("page.opening_balance")}</th>
                <th className="p-3 text-right">{t("page.balance")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`row-account-${a.id}`}>
                  <td className="p-3 font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-zinc-500" />{a.name}</td>
                  <td className="p-3 text-xs uppercase font-mono">{a.type}</td>
                  <td className="p-3 font-mono text-right">{formatMoney(a.opening_balance)}</td>
                  <td className="p-3 font-mono text-right font-bold">{formatMoney(a.current_balance ?? a.opening_balance)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setModal({ edit: a, form: { ...a, opening_balance: String(a.opening_balance) } })}
                      className="p-1.5 hover:bg-zinc-200 mr-1" data-testid={`edit-account-${a.id}`}
                    ><Edit3 className="w-4 h-4" /></button>
                    <button
                      onClick={() => onDelete(a)}
                      className="p-1.5 hover:bg-red-100 text-[#E60000]" data-testid={`delete-account-${a.id}`}
                    ><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_accounts")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <AccountModal
          initial={modal.form}
          edit={!!modal.edit}
          onClose={() => setModal(null)}
          onSave={onSave}
          t={t}
        />
      )}
    </PageShell>
  );
}

function AccountModal({ initial, edit, onClose, onSave, t }) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const upd = (k, v) => setForm({ ...form, [k]: v });
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSave(form); } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="account-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">{edit ? t("page.edit_account") : t("page.new_account")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" data-testid="account-modal-close"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={submit}>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("common.name")} *</label>
            <input value={form.name} onChange={(e) => upd("name", e.target.value)} required
              data-testid="am-name" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.type")} *</label>
            <select value={form.type} onChange={(e) => upd("type", e.target.value)}
              data-testid="am-type" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.opening_balance")}</label>
            <input type="number" step="0.01" value={form.opening_balance} onChange={(e) => upd("opening_balance", e.target.value)}
              data-testid="am-balance" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest" data-testid="am-cancel">{t("common.cancel")}</button>
            <button type="submit" disabled={busy} data-testid="am-save"
              className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
              {busy ? t("page.saving") : (edit ? t("page.update") : t("page.create"))}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
