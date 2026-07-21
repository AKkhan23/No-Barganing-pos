import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Search, FileText, Loader2, X, Eye } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

export default function Quotations() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const confirm = useConfirm();

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/quotations"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = list.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (x.customer_name || "").toLowerCase().includes(s) || (x.id || "").toString().includes(s);
  });

  const convertToOrder = async (qid) => {
    try { await api.post(`/quotations/${qid}/convert`); toast.success(t("page.converted_to_order")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); }
  };

  const deleteQuotation = async (qid) => {
    const ok = await confirm(t("page.confirm_delete_quotation"), t("common.confirm_delete")); if (!ok) return;
    try { await api.delete(`/quotations/${qid}`); toast.success(t("common.deleted")); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  return (
    <PageShell title={t("page.quotations")} subtitle={`${list.length} ${t("page.quotations_count")}`}>
      <div className="p-6 overflow-y-auto h-full space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_quotations")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">{t("page.quotation_id")}</th><th className="p-3 text-left">{t("page.customer")}</th><th className="p-3 text-right">{t("page.total")}</th><th className="p-3 text-left">{t("page.date")}</th><th className="p-3 text-left">{t("page.expiry")}</th><th className="p-3 text-left">{t("page.status")}</th><th className="p-3 text-right">{t("page.actions")}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-zinc-400">{t("page.no_quotations")}</td></tr>
              ) : filtered.map((q) => (
                <tr key={q.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3 font-mono text-xs font-semibold">#{q.id}</td>
                  <td className="p-3 font-semibold">{q.customer_name}</td>
                  <td className="p-3 text-right font-mono font-bold text-[#E60000]">{formatMoney(q.grand_total || q.total)}</td>
                  <td className="p-3 text-xs">{formatDate(q.date || q.created_at)}</td>
                    <td className="p-3 text-xs">{q.valid_until ? formatDate(q.valid_until) : "-"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${q.status === "approved" ? "bg-green-100 text-green-800" : q.status === "converted" ? "bg-blue-100 text-blue-800" : q.status === "expired" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"}`}>{q.status || "draft"}</span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setSelected(q)} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:bg-zinc-100"><Eye className="w-4 h-4" /></button>
                      {(!q.status || q.status === "draft" || q.status === "approved") && <button onClick={() => convertToOrder(q.id)} className="h-8 px-2 bg-[#E60000] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#CC0000]">{t("page.convert")}</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> {t("page.quotation")} #{selected.id}</div>
              <button onClick={() => setSelected(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-[10px] font-mono uppercase text-zinc-500">{t("page.customer")}</span><p className="font-semibold">{selected.customer_name}</p></div>
                <div><span className="text-[10px] font-mono uppercase text-zinc-500">{t("page.date")}</span><p>{formatDate(selected.date || selected.created_at)}</p></div>
                {selected.customer_phone && <div><span className="text-[10px] font-mono uppercase text-zinc-500">{t("page.phone")}</span><p>{selected.customer_phone}</p></div>}
                {selected.valid_until && <div><span className="text-[10px] font-mono uppercase text-zinc-500">{t("page.expiry")}</span><p>{formatDate(selected.valid_until)}</p></div>}
              </div>
              {selected.items && selected.items.length > 0 && (
                <div><h4 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">{t("page.items")}</h4>
                <table className="w-full text-sm border-2 border-zinc-200"><thead className="bg-zinc-100 text-[10px] uppercase tracking-widest"><tr><th className="p-2 text-left">{t("page.product")}</th><th className="p-2 text-right">{t("page.qty")}</th><th className="p-2 text-right">{t("page.rate")}</th><th className="p-2 text-right">{t("page.amount")}</th></tr></thead>
                <tbody>{selected.items.map((item, i) => (
                  <tr key={i} className="border-t border-zinc-200"><td className="p-2">{item.product_name}</td><td className="p-2 text-right font-mono">{item.quantity}</td><td className="p-2 text-right font-mono">{formatMoney(item.price)}</td><td className="p-2 text-right font-mono font-bold">{formatMoney(item.total || item.quantity * item.price)}</td></tr>
                ))}</tbody></table></div>
              )}
              <div className="border-t-2 border-zinc-200 pt-3 text-right"><span className="text-sm text-zinc-500">{t("page.total_amount")}: </span><span className="text-2xl font-black">{formatMoney(selected.grand_total || selected.total)}</span></div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
