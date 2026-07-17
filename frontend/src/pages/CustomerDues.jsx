import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, X, Wallet } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

const MODES = ["cash", "card", "upi", "wallet"];

export default function CustomerDues() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ amount: "", mode: "cash", note: "" });
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/customer-dues");
      setItems(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (p.customer_name || "").toLowerCase().includes(s) || (p.phone || "").includes(s);
  });

  const openReceive = (row) => {
    setForm({ amount: String(row.due || ""), mode: "cash", note: "" });
    setModal({ customer_name: row.customer_name, customer: row });
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.post(`/customer-dues/receive-payment`, {
        customer_name: modal.customer_name,
        amount: Number(form.amount),
        mode: form.mode,
        note: form.note,
      });
      toast.success(t("page.saved_successfully"));
      setModal(null); load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.save_failed"));
    } finally { setBusy(false); }
  };

  return (
    <PageShell
      title={t("page.customer_dues")}
      subtitle={`${items.length} ${t("page.customers_with_dues")}`}
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_by_customer_or_phone")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
            data-testid="due-search"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.customer")}</th>
                <th className="p-3 text-left">{t("page.phone")}</th>
                <th className="p-3 text-right">{t("page.due")}</th>
                <th className="p-3 text-left">{t("page.since")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("common.loading")}</td></tr>
              )}
              {!loading && filtered.map((p) => (
                <tr key={p.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`due-row-${p.id}`}>
                  <td className="p-3 font-semibold">{p.customer_name || "-"}</td>
                  <td className="p-3 font-mono text-xs">{p.phone || "-"}</td>
                  <td className="p-3 font-mono text-right font-bold text-[#E60000]">{formatMoney(p.due)}</td>
                  <td className="p-3 font-mono text-xs">{formatDate(p.since || p.updated_at)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => openReceive(p)}
                      className="h-9 px-3 bg-[#E60000] text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ml-auto"
                      data-testid={`receive-payment-${p.id}`}>
                      <Wallet className="w-3.5 h-3.5" strokeWidth={2.5} /> {t("page.receive")}
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_dues")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="due-modal">
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{t("page.receive_payment")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-4" onSubmit={submit}>
              <div className="bg-zinc-50 border border-zinc-300 p-3 text-sm">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.customer")}</div>
                <div className="font-display font-bold uppercase">{modal.customer.customer_name}</div>
                <div className="text-xs font-mono text-zinc-600">
                  {t("page.outstanding")}: <b className="text-[#E60000]">{formatMoney(modal.customer.due)}</b>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.amount")} *</label>
                <input type="number" step="0.01" min="0" required value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="due-amount"
                  className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000] text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.mode")} *</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  data-testid="due-mode" className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
                  {MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  data-testid="due-note" className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModal(null)} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
                <button type="submit" disabled={busy} data-testid="due-save"
                  className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40 flex items-center gap-2">
                  <Wallet className="w-4 h-4" strokeWidth={2.5} /> {busy ? t("page.saving") : t("page.receive")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
