import React, { useEffect, useState } from "react";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function ProfitLoss() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("monthly");
  const [months, setMonths] = useState(6);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get(`/accounting/balance-statement?period=${period}&months=${months}`); setData(r.data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [period, months]);

  return (
    <PageShell title="Profit & Loss" subtitle="Profit & Loss Report">
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">Period</label>
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="h-10 border-2 border-zinc-300 px-3 bg-white text-sm focus:outline-none focus:border-[#E60000]">
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">Months</label>
            <select value={months} onChange={(e) => setMonths(Number(e.target.value))} className="h-10 border-2 border-zinc-300 px-3 bg-white text-sm focus:outline-none focus:border-[#E60000]">
              {[3, 6, 12, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>
        ) : data ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border-2 border-green-200 p-5"><div className="text-[10px] font-mono uppercase tracking-widest text-green-600">Total Revenue</div><div className="text-2xl font-black mt-1 text-green-700">{formatMoney(data.revenue || data.total_revenue || 0)}</div></div>
              <div className="bg-white border-2 border-red-200 p-5"><div className="text-[10px] font-mono uppercase tracking-widest text-red-600">Total Expenses</div><div className="text-2xl font-black mt-1 text-red-700">{formatMoney(data.expenses || data.total_expenses || 0)}</div></div>
              <div className={`bg-white border-2 p-5 ${(data.net_profit || data.netProfit || 0) >= 0 ? "border-green-200" : "border-red-200"}`}>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">Net Profit</div>
                <div className={`text-2xl font-black mt-1 flex items-center gap-2 ${(data.net_profit || data.netProfit || 0) >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {(data.net_profit || data.netProfit || 0) >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  {formatMoney(data.net_profit || data.netProfit || 0)}
                </div>
              </div>
            </div>

            {data.periods && data.periods.length > 0 && (
              <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                    <tr><th className="p-3 text-left">Period</th><th className="p-3 text-right">Revenue</th><th className="p-3 text-right">Expenses</th><th className="p-3 text-right">Profit</th><th className="p-3 text-right">Margin</th></tr>
                  </thead>
                  <tbody>
                    {data.periods.map((p, i) => (
                      <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                        <td className="p-3 font-semibold">{p.label}</td>
                        <td className="p-3 text-right font-mono text-green-600">{formatMoney(p.revenue)}</td>
                        <td className="p-3 text-right font-mono text-red-600">{formatMoney(p.expenses)}</td>
                        <td className={`p-3 text-right font-mono font-bold ${p.profit >= 0 ? "text-green-700" : "text-red-700"}`}>{formatMoney(p.profit)}</td>
                        <td className="p-3 text-right font-mono">{(p.margin * 100).toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-zinc-400">No data</div>
        )}
      </div>
    </PageShell>
  );
}
