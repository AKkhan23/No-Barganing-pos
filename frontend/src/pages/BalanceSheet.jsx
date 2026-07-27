import React, { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../lib/api";
import { formatMoney } from "../lib/format";
import { PageShell } from "./Dashboard";

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function BalanceSheet() {
  const [data, setData] = useState(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState(today());
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setBusy(true);
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const r = await api.get("/accounting/balance-sheet", { params });
      setData(r.data);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    load();
  }, [dateFrom, dateTo]);

  const assets = (data?.assets || []).map((a) => ({
    name: a.account_name || a.account,
    amount: a.balance,
  }));
  const liabilities = (data?.liabilities || []).map((l) => ({
    name: l.account_name || l.account,
    amount: l.balance,
  }));
  const equity = data ? [{ name: "Owner's Equity", amount: data.equity }] : [];
  const totalAssets = data?.total_assets ?? 0;
  const totalLiabilities = data?.total_liabilities ?? 0;
  const totalEquity = data?.equity ?? 0;

  const Section = ({ title, items, accent, testid }) => (
    <div className="bg-white border-2 border-zinc-200" data-testid={testid}>
      <div className="p-4 border-b-2 border-zinc-200 bg-zinc-100 flex items-center gap-2">
        <span className="w-3 h-3" style={{ background: accent }} />
        <h3 className="font-display font-black uppercase text-lg">{title}</h3>
      </div>
      <div className="p-4 space-y-2">
        {items.map((x, i) => (
          <div
            key={x.name || i}
            className="flex justify-between items-center border-b border-zinc-100 pb-2"
            data-testid={`${testid}-row-${i}`}
          >
            <span className="text-sm font-semibold">{x.name}</span>
            <span className="font-mono text-sm font-bold">
              {formatMoney(x.amount)}
            </span>
          </div>
        ))}
        {items.length === 0 && (
          <div className="text-sm text-zinc-500 font-mono">No entries</div>
        )}
      </div>
    </div>
  );

  return (
    <PageShell
      title="Balance Sheet"
      subtitle="Assets · Liabilities · Equity"
      right={
        <button
          onClick={load}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="bs-refresh"
        >
          <Search className="w-4 h-4" strokeWidth={2.5} /> Run
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              data-testid="bs-date-from"
              className="h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              data-testid="bs-date-to"
              className="h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]"
            />
          </div>
        </div>

        {!data ? (
          <div className="text-zinc-500 font-mono text-sm p-8">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Section
              title="Assets"
              items={assets}
              accent="#E60000"
              testid="bs-assets"
            />
            <Section
              title="Liabilities"
              items={liabilities}
              accent="#FDE047"
              testid="bs-liabilities"
            />
            <Section
              title="Equity"
              items={equity}
              accent="#09090B"
              testid="bs-equity"
            />
          </div>
        )}

        {data && (
          <>
            <div
              className="mt-4 bg-zinc-950 text-white border-2 border-zinc-900 p-4 grid grid-cols-1 md:grid-cols-3 gap-4"
              data-testid="bs-totals"
            >
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  Total Assets
                </div>
                <div className="font-mono font-black text-2xl">
                  {formatMoney(totalAssets)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  Total Liabilities
                </div>
                <div className="font-mono font-black text-2xl">
                  {formatMoney(totalLiabilities)}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                  Total Equity
                </div>
                <div className="font-mono font-black text-2xl">
                  {formatMoney(totalEquity)}
                </div>
              </div>
            </div>
            {data.period && (
              <div
                className="mt-4 bg-white border-2 border-zinc-200 p-4"
                data-testid="bs-period"
              >
                <h3 className="font-display font-black uppercase text-sm mb-3">
                  Period P&L ({data.period.date_from || "start"} –{" "}
                  {data.period.date_to || "now"})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div className="border border-zinc-200 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      Revenue
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatMoney(data.period.revenue)}
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      Purchases
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatMoney(data.period.purchases)}
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      Expenses
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatMoney(data.period.expenses)}
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      Other Income
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatMoney(data.period.income)}
                    </div>
                  </div>
                  <div className="border border-zinc-200 p-3 bg-zinc-50">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                      Net Profit
                    </div>
                    <div className="font-mono font-bold text-lg">
                      {formatMoney(data.period.net_profit)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
