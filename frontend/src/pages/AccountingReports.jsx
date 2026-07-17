import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart3, Loader2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

const REPORTS = [
  { key: "account_balances", labelKey: "account_balances" },
  { key: "income_statement", labelKey: "income_statement" },
  { key: "cash_flow", labelKey: "cash_flow" },
  { key: "aging_summary", labelKey: "aging_summary" },
];

export default function AccountingReports() {
  const { t } = useTranslation();
  const [active, setActive] = useState("account_balances");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
      try { const r = await api.get(`/accounting/${active}`); setData(r.data); }
    catch (e) { toast.error(t("page.failed_load_report")); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [active]);

  return (
    <PageShell title={t("page.accounting_reports")} subtitle={t("page.accounting_reports_desc")}>
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {REPORTS.map((r) => (
            <button key={r.key} onClick={() => setActive(r.key)}
              className={`border-2 p-4 text-left transition-all ${active === r.key ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white hover:border-zinc-400"}`}>
              <BarChart3 className={`w-8 h-8 mb-2 ${active === r.key ? "text-white" : "text-zinc-500"}`} />
              <div className="text-xs font-bold uppercase tracking-widest">{t(`page.${r.labelKey}`)}</div>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : data ? (
          <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
            {Array.isArray(data) ? (
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                  <tr>{Object.keys(data[0] || {}).map((k) => <th key={k} className="p-3 text-left">{k}</th>)}</tr>
                </thead>
                <tbody>
                  {data.map((row, i) => (
                    <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                      {Object.values(row).map((v, j) => <td key={j} className="p-3">{v != null ? String(v) : "-"}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 space-y-2">
                {Object.entries(data).map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-zinc-100 py-2">
                    <span className="text-sm font-medium">{k}</span>
                    <span className="font-mono text-sm font-bold">{typeof v === "number" ? formatMoney(v) : String(v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 text-zinc-400">{t("page.select_report")}</div>
        )}
      </div>
    </PageShell>
  );
}
