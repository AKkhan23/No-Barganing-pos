import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Undo2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function SaleReturns() {
  const { t } = useTranslation();
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/sale-returns"); setReturns(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <PageShell title={t("page.sale_returns")} subtitle={`${returns.length} ${t("page.returns_recorded")}`}>
      <div className="p-6 overflow-y-auto h-full">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : returns.length === 0 ? (
          <div className="text-center py-20"><Undo2 className="w-12 h-12 mx-auto text-zinc-200 mb-3" /><p className="font-mono text-zinc-400">{t("page.no_sale_returns")}</p></div>
        ) : (
          <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                <tr><th className="p-3 text-left">{t("page.date")}</th><th className="p-3 text-left">{t("page.order_id")}</th><th className="p-3 text-left">{t("page.customer")}</th><th className="p-3 text-left">{t("page.product")}</th><th className="p-3 text-right">{t("page.quantity")}</th><th className="p-3 text-right">{t("page.refund_amount")}</th><th className="p-3 text-left">{t("page.note")}</th></tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="p-3 text-xs font-mono">{formatDate(r.created_at)}</td>
                    <td className="p-3 font-mono text-xs">#{r.order_id}</td>
                    <td className="p-3">{r.customer_name || "-"}</td>
                    <td className="p-3">{r.items?.[0]?.name || "-"}{r.items?.length > 1 ? ` +${r.items.length - 1}` : ""}</td>
                    <td className="p-3 text-right font-mono">{r.items?.reduce((s, i) => s + i.quantity, 0) || 0}</td>
                    <td className="p-3 text-right font-mono text-[#E60000] font-bold">{formatMoney(r.total)}</td>
                    <td className="p-3 text-xs">{r.note || "-"}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-800">completed</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PageShell>
  );
}
