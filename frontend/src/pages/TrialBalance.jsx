import React, { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function TrialBalance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [asOf, setAsOf] = useState(new Date().toISOString().slice(0, 10));

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/accounting/trial-balance", { params: { as_of: asOf } }); setData(r.data); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [asOf]);

  const totalDebit = data?.total_debit || data?.accounts?.reduce((s, a) => s + Number(a.debit || 0), 0) || 0;
  const totalCredit = data?.total_credit || data?.accounts?.reduce((s, a) => s + Number(a.credit || 0), 0) || 0;
  const balanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <PageShell title="Trial Balance" subtitle="Trial Balance Report">
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">As of Date</label>
            <input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)}
              className="h-10 border-2 border-zinc-300 px-3 font-mono text-sm focus:outline-none focus:border-[#E60000]" />
          </div>
          <button onClick={load} className="h-10 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest">Refresh</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : data ? (
          <>
            {!balanced && (
              <div className="border-2 border-red-300 bg-red-50 p-4 flex items-center gap-3">
                <Scale className="w-5 h-5 text-red-600" />
                <div><span className="text-sm font-bold text-red-700">Trial Balance is Unbalanced</span><p className="text-xs text-red-600">Difference: {formatMoney(totalDebit - totalCredit)}</p></div>
              </div>
            )}
            {balanced && (
              <div className="border-2 border-green-300 bg-green-50 p-4 flex items-center gap-3">
                <Scale className="w-5 h-5 text-green-600" />
                <span className="text-sm font-bold text-green-700">Trial Balance is Balanced</span>
              </div>
            )}

            <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                  <tr><th className="p-3 text-left">Account</th><th className="p-3 text-right">Debit</th><th className="p-3 text-right">Credit</th></tr>
                </thead>
                <tbody>
                  {(data.entries || data.accounts || []).map((a, i) => (
                    <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                      <td className="p-3 font-semibold">{a.account_name || a.name || a.account}</td>
                      <td className="p-3 text-right font-mono">{(a.total_debit || a.debit || 0) > 0 ? formatMoney(a.total_debit || a.debit || 0) : ""}</td>
                      <td className="p-3 text-right font-mono">{(a.total_credit || a.credit || 0) > 0 ? formatMoney(a.total_credit || a.credit || 0) : ""}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-zinc-100 font-bold">
                  <tr><td className="p-3 text-xs uppercase">Totals</td><td className="p-3 text-right font-mono">{formatMoney(totalDebit)}</td><td className="p-3 text-right font-mono">{formatMoney(totalCredit)}</td></tr>
                </tfoot>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-zinc-400">No data</div>
        )}
      </div>
    </PageShell>
  );
}
