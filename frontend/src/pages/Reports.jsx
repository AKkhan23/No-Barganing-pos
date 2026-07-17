import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

const COLORS = ["#E60000", "#09090B", "#0284C7", "#16A34A", "#F59E0B", "#8B5CF6", "#EC4899"];
const tooltipStyle = {
  contentStyle: { border: "2px solid #09090B", borderRadius: 0, fontFamily: "JetBrains Mono", fontSize: 12 },
};

const TABS = ["Sales", "Cash Flow", "Customer Reports", "Supplier Reports", "Balance Statement", "Deposit Report", "Register Report"];

function KpiCard({ label, value }) {
  return (
    <div className="bg-white border-2 border-zinc-200 p-5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{label}</div>
      <div className="text-3xl font-black text-zinc-900 mt-1">{value}</div>
    </div>
  );
}

function MoneyTable({ columns, rows, renderRow }) {
  return (
    <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`p-3 text-${c.align || "left"}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="p-6 text-center text-zinc-400">No data</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                {renderRow(row, i)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function DateFilter({ from, to, setFrom, setTo, onApply }) {
  return (
    <div className="flex gap-3 items-end">
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">From</label>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-sm" />
      </div>
      <div>
        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">To</label>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-sm" />
      </div>
      <button onClick={onApply}
        className="h-10 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest">Apply</button>
    </div>
  );
}

function SalesTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.date_from = new Date(from).toISOString();
      if (to) params.date_to = new Date(to + "T23:59:59").toISOString();
      const r = await api.get("/reports/sales", { params });
      setData(r.data);
    } catch (e) {
      toast.error("Failed to load report");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [from, to]);

  const paymentData = (data?.by_payment_mode || []).map((pm) => ({
    name: pm.mode.charAt(0).toUpperCase() + pm.mode.slice(1),
    value: pm.total,
  }));
  const topItems = (data?.top_items || []).slice(0, 5);
  const revenueData = data?.orders
    ? data.orders.map((o) => ({
        date: o.created_at ? new Date(o.created_at).toLocaleDateString() : "",
        revenue: o.grand_total || 0,
      })).reverse()
    : [];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-zinc-400">No data available</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Revenue" value={formatMoney(data.total_revenue || 0)} />
        <KpiCard label="Total Orders" value={data.total_orders || 0} />
        <KpiCard label="Total Tax" value={formatMoney(data.total_tax || 0)} />
        <KpiCard label="Total Due" value={formatMoney(data.total_due || 0)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border-2 border-zinc-200 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Payment Mode</div>
          {paymentData.length > 0 ? (
            <div className="flex items-center justify-center h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {paymentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-sm">
                {paymentData.map((pm, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 inline-block" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="capitalize">{pm.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">No payment data</div>
          )}
        </div>

        <div className="bg-white border-2 border-zinc-200 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Top Selling Items</div>
          {topItems.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topItems} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="#E4E4E7" />
                  <XAxis type="number" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />
                  <YAxis type="category" dataKey="name" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" width={100} />
                  <Tooltip {...tooltipStyle} formatter={(v) => v + " units"} />
                  <Bar dataKey="quantity" fill="#E60000" radius={[0, 4, 4, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-400">No sales data</div>
          )}
        </div>
      </div>

      {revenueData.length > 0 && (
        <div className="bg-white border-2 border-zinc-200 p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-4">Revenue Trend</div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="2 2" stroke="#E4E4E7" />
                <XAxis dataKey="date" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />
                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />
                <Tooltip {...tooltipStyle} formatter={(v) => formatMoney(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#E60000" fill="#E60000" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {data.orders && data.orders.length > 0 && (
        <div className="bg-white border-2 border-zinc-200">
          <div className="px-5 py-3 border-b border-zinc-200">
            <div className="text-[10px] font-mono uppercase tracking-widest font-bold">Recent Orders</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-3 text-left">Invoice</th>
                  <th className="p-3 text-left">Customer</th>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3 text-right">Paid</th>
                  <th className="p-3 text-left">Mode</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((o, i) => (
                  <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="p-3 font-mono text-xs">{o.invoice_no || o._id?.slice(-6) || "-"}</td>
                    <td className="p-3">{o.customer_name || "Walk-in"}</td>
                    <td className="p-3 text-xs">{o.created_at ? new Date(o.created_at).toLocaleDateString() : "-"}</td>
                    <td className="p-3 text-right font-mono font-bold">{formatMoney(o.grand_total || 0)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(o.paid || 0)}</td>
                    <td className="p-3 capitalize">{o.payment_mode || o.payment_method || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function CashFlowTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.start_date = new Date(from).toISOString();
      if (to) params.end_date = new Date(to + "T23:59:59").toISOString();
      const r = await api.get("/extra-reports/cash-flow", { params });
      setData(r.data);
    } catch (e) {
      toast.error("Failed to load cash flow");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [from, to]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-zinc-400">No data available</div>;
  }

  const summary = data.summary || data;
  const rows = data.details || data.entries || data.records || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Sales" value={formatMoney(summary.total_sales || 0)} />
        <KpiCard label="Total Expenses" value={formatMoney(summary.total_expenses || 0)} />
        <KpiCard label="Total Purchases" value={formatMoney(summary.total_purchases || 0)} />
        <KpiCard label="Net Cash Flow" value={formatMoney(summary.net_cash_flow || 0)} />
      </div>

      <MoneyTable
        columns={[
          { key: "date", label: "Date" },
          { key: "sales", label: "Sales", align: "right" },
          { key: "expenses", label: "Expenses", align: "right" },
          { key: "purchases", label: "Purchases", align: "right" },
          { key: "net", label: "Net", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.sales || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.expenses || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.purchases || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.net || 0)}</td>
          </>
        )}
      />
    </div>
  );
}

function CustomerReportsTab() {
  const [activeSub, setActiveSub] = useState("balance");
  const [balanceData, setBalanceData] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [ledgerData, setLedgerData] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    setBalanceLoading(true);
    api.get("/extra-reports/customer-balance").then((r) => setBalanceData(r.data)).catch(() => toast.error("Failed to load balances")).finally(() => setBalanceLoading(false));
    api.get("/customers").then((r) => setCustomers(Array.isArray(r.data) ? r.data : r.data?.customers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedCustomer) { setLedgerData(null); return; }
    setLedgerLoading(true);
    api.get(`/extra-reports/customer-ledger/${selectedCustomer}`).then((r) => setLedgerData(r.data)).catch(() => toast.error("Failed to load ledger")).finally(() => setLedgerLoading(false));
  }, [selectedCustomer]);

  const rows = balanceData?.balances || balanceData?.data || (Array.isArray(balanceData) ? balanceData : []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200 pb-0">
        <button onClick={() => setActiveSub("balance")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeSub === "balance" ? "bg-[#E60000] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Balance
        </button>
        <button onClick={() => setActiveSub("ledger")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeSub === "ledger" ? "bg-[#E60000] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Ledger
        </button>
      </div>

      {activeSub === "balance" && (
        balanceLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <MoneyTable
            columns={[
              { key: "name", label: "Customer Name" },
              { key: "debit", label: "Total Debit", align: "right" },
              { key: "credit", label: "Total Credit", align: "right" },
              { key: "balance", label: "Balance", align: "right" },
            ]}
            rows={rows}
            renderRow={(row) => (
              <>
                <td className="p-3">{row.customer_name || row.name || "-"}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.total_debit || row.debit || 0)}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.total_credit || row.credit || 0)}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.balance || 0)}</td>
              </>
            )}
          />
        )
      )}

      {activeSub === "ledger" && (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">Select Customer</label>
            <select value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}
              className="h-10 border-2 border-zinc-300 px-3 font-mono text-sm min-w-[250px]">
              <option value="">-- Select --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.name || c.customer_name}</option>
              ))}
            </select>
          </div>

          {ledgerLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : ledgerData ? (
            <MoneyTable
              columns={[
                { key: "date", label: "Date" },
                { key: "description", label: "Description" },
                { key: "debit", label: "Debit", align: "right" },
                { key: "credit", label: "Credit", align: "right" },
                { key: "balance", label: "Balance", align: "right" },
              ]}
              rows={ledgerData.entries || ledgerData.records || ledgerData.transactions || (Array.isArray(ledgerData) ? ledgerData : [])}
              renderRow={(row) => (
                <>
                  <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                  <td className="p-3">{row.description || row.note || "-"}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.debit || 0)}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.credit || 0)}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.running_balance || row.balance || 0)}</td>
                </>
              )}
            />
          ) : (
            <div className="text-center py-20 text-zinc-400">Select a customer to view ledger</div>
          )}
        </div>
      )}
    </div>
  );
}

function SupplierReportsTab() {
  const [activeSub, setActiveSub] = useState("balance");
  const [balanceData, setBalanceData] = useState(null);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [ledgerData, setLedgerData] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  useEffect(() => {
    setBalanceLoading(true);
    api.get("/extra-reports/supplier-balance").then((r) => setBalanceData(r.data)).catch(() => toast.error("Failed to load balances")).finally(() => setBalanceLoading(false));
    api.get("/suppliers").then((r) => setSuppliers(Array.isArray(r.data) ? r.data : r.data?.suppliers || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSupplier) { setLedgerData(null); return; }
    setLedgerLoading(true);
    api.get(`/extra-reports/supplier-ledger/${selectedSupplier}`).then((r) => setLedgerData(r.data)).catch(() => toast.error("Failed to load ledger")).finally(() => setLedgerLoading(false));
  }, [selectedSupplier]);

  const rows = balanceData?.balances || balanceData?.data || (Array.isArray(balanceData) ? balanceData : []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-zinc-200 pb-0">
        <button onClick={() => setActiveSub("balance")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeSub === "balance" ? "bg-[#E60000] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Balance
        </button>
        <button onClick={() => setActiveSub("ledger")}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-widest ${activeSub === "ledger" ? "bg-[#E60000] text-white" : "text-zinc-600 hover:bg-zinc-100"}`}>
          Ledger
        </button>
      </div>

      {activeSub === "balance" && (
        balanceLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : (
          <MoneyTable
            columns={[
              { key: "name", label: "Supplier Name" },
              { key: "debit", label: "Total Debit", align: "right" },
              { key: "credit", label: "Total Credit", align: "right" },
              { key: "balance", label: "Balance", align: "right" },
            ]}
            rows={rows}
            renderRow={(row) => (
              <>
                <td className="p-3">{row.supplier_name || row.name || "-"}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.total_debit || row.debit || 0)}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.total_credit || row.credit || 0)}</td>
                <td className="p-3 text-right font-mono">{formatMoney(row.balance || 0)}</td>
              </>
            )}
          />
        )
      )}

      {activeSub === "ledger" && (
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1 block">Select Supplier</label>
            <select value={selectedSupplier} onChange={(e) => setSelectedSupplier(e.target.value)}
              className="h-10 border-2 border-zinc-300 px-3 font-mono text-sm min-w-[250px]">
              <option value="">-- Select --</option>
              {suppliers.map((s) => (
                <option key={s._id} value={s._id}>{s.name || s.supplier_name}</option>
              ))}
            </select>
          </div>

          {ledgerLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : ledgerData ? (
            <MoneyTable
              columns={[
                { key: "date", label: "Date" },
                { key: "description", label: "Description" },
                { key: "debit", label: "Debit", align: "right" },
                { key: "credit", label: "Credit", align: "right" },
                { key: "balance", label: "Balance", align: "right" },
              ]}
              rows={ledgerData.entries || ledgerData.records || ledgerData.transactions || (Array.isArray(ledgerData) ? ledgerData : [])}
              renderRow={(row) => (
                <>
                  <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
                  <td className="p-3">{row.description || row.note || "-"}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.debit || 0)}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.credit || 0)}</td>
                  <td className="p-3 text-right font-mono">{formatMoney(row.running_balance || row.balance || 0)}</td>
                </>
              )}
            />
          ) : (
            <div className="text-center py-20 text-zinc-400">Select a supplier to view ledger</div>
          )}
        </div>
      )}
    </div>
  );
}

function BalanceStatementTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get("/extra-reports/balance-statement").then((r) => setData(r.data)).catch(() => toast.error("Failed to load balance statement")).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-zinc-400">No data available</div>;
  }

  const details = data.details || data.accounts || data.entries || (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard label="Total Assets" value={formatMoney(data.total_assets || 0)} />
        <KpiCard label="Total Liabilities" value={formatMoney(data.total_liabilities || 0)} />
        <KpiCard label="Equity" value={formatMoney(data.equity || 0)} />
      </div>

      {Array.isArray(details) && details.length > 0 && (
        <MoneyTable
          columns={[
            { key: "account", label: "Account" },
            { key: "type", label: "Type" },
            { key: "amount", label: "Amount", align: "right" },
          ]}
          rows={details}
          renderRow={(row) => (
            <>
              <td className="p-3">{row.account_name || row.name || "-"}</td>
              <td className="p-3 capitalize">{row.type || row.account_type || "-"}</td>
              <td className="p-3 text-right font-mono">{formatMoney(row.amount || row.balance || 0)}</td>
            </>
          )}
        />
      )}
    </div>
  );
}

function DepositReportTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.start_date = new Date(from).toISOString();
      if (to) params.end_date = new Date(to + "T23:59:59").toISOString();
      const r = await api.get("/extra-reports/deposit-report", { params });
      setData(r.data);
    } catch (e) {
      toast.error("Failed to load deposit report");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [from, to]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-zinc-400">No data available</div>;
  }

  const summary = data.summary || data;
  const rows = data.deposits || data.records || data.entries || (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <KpiCard label="Total Deposits" value={summary.total_deposits || summary.count || 0} />
        <KpiCard label="Total Amount" value={formatMoney(summary.total_amount || summary.amount || 0)} />
      </div>

      <MoneyTable
        columns={[
          { key: "customer", label: "Customer" },
          { key: "phone", label: "Phone" },
          { key: "amount", label: "Amount", align: "right" },
          { key: "method", label: "Payment Method" },
          { key: "date", label: "Date" },
          { key: "note", label: "Note" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3 text-xs font-mono">{row.phone || row.customer_phone || "-"}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.amount || 0)}</td>
            <td className="p-3 capitalize">{row.payment_method || row.method || "-"}</td>
            <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
            <td className="p-3 text-xs text-zinc-500">{row.note || row.description || "-"}</td>
          </>
        )}
      />
    </div>
  );
}

function RegisterReportTab({ from, to }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.start_date = new Date(from).toISOString();
      if (to) params.end_date = new Date(to + "T23:59:59").toISOString();
      const r = await api.get("/extra-reports/register-report", { params });
      setData(r.data);
    } catch (e) {
      toast.error("Failed to load register report");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [from, to]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-20 text-zinc-400">No data available</div>;
  }

  const summary = data.summary || data;
  const rows = data.shifts || data.registers || data.records || data.entries || (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total Shifts" value={summary.total_shifts || summary.count || 0} />
        <KpiCard label="Total Opening Cash" value={formatMoney(summary.total_opening_cash || summary.total_opening || 0)} />
        <KpiCard label="Total Closing Cash" value={formatMoney(summary.total_closing_cash || summary.total_closing || 0)} />
        <KpiCard label="Total Variance" value={formatMoney(summary.total_variance || summary.variance || 0)} />
      </div>

      <MoneyTable
        columns={[
          { key: "shift", label: "Shift ID" },
          { key: "opening", label: "Opening", align: "right" },
          { key: "closing", label: "Closing", align: "right" },
          { key: "expected", label: "Expected", align: "right" },
          { key: "variance", label: "Variance", align: "right" },
          { key: "date", label: "Date" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono text-xs">{row.shift_id || row._id?.slice(-6) || row.id || "-"}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.opening_cash || row.opening || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.closing_cash || row.closing || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.expected_cash || row.expected || 0)}</td>
            <td className="p-3 text-right font-mono">{formatMoney(row.variance || 0)}</td>
            <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString() : "-"}</td>
          </>
        )}
      />
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const [tab, setTab] = useState("Sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const showDateFilter = ["Sales", "Cash Flow", "Deposit Report", "Register Report"].includes(tab);

  return (
    <PageShell title={t("page.reports")} subtitle={t("page.reports_desc")}>
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="flex gap-0 border-b-2 border-zinc-200 overflow-x-auto">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 -mb-[2px] transition-colors ${tab === t ? "border-[#E60000] text-[#E60000]" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}>
              {t}
            </button>
          ))}
        </div>

        {showDateFilter && (
          <DateFilter from={from} to={to} setFrom={setFrom} setTo={setTo} onApply={() => {}} />
        )}

        <div className="min-h-[300px]">
          {tab === "Sales" && <SalesTab from={from} to={to} />}
          {tab === "Cash Flow" && <CashFlowTab from={from} to={to} />}
          {tab === "Customer Reports" && <CustomerReportsTab />}
          {tab === "Supplier Reports" && <SupplierReportsTab />}
          {tab === "Balance Statement" && <BalanceStatementTab />}
          {tab === "Deposit Report" && <DepositReportTab from={from} to={to} />}
          {tab === "Register Report" && <RegisterReportTab from={from} to={to} />}
        </div>
      </div>
    </PageShell>
  );
}
