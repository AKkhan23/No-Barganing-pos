import React, { useEffect, useState, useCallback } from "react";
import {
  TrendingUp, ShoppingCart, Package, Users, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, AreaChart, Area,
} from "recharts";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { formatMoney } from "../lib/format";
import { isWeightUnit, formatStock } from "../lib/sellBy";

function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }

const KPI = [
  { key: "total_revenue", labelKey: "revenue", icon: null, money: true, color: "#E60000", textIcon: "₹" },
  { key: "total_orders", labelKey: "orders", icon: ShoppingCart, money: false, color: "#09090B" },
  { key: "total_products", labelKey: "products", icon: Package, money: false, color: "#0284C7" },
  { key: "total_customers", labelKey: "customers", icon: Users, money: false, color: "#16A34A" },
];

export default function Dashboard() {
  const { t } = useTranslation();
  const P = (k) => t(`page.${k}`);
  const [stats, setStats] = useState(null);
  const [sym, setSym] = useState("₹");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState(today());
  const [activePreset, setActivePreset] = useState(null);

  const load = useCallback(async (preset) => {
    let f = from, t = to;
    if (preset === 0) { f = today(); t = today(); }
    else if (preset === 7) { f = daysAgo(7); t = today(); }
    else if (preset === 30) { f = daysAgo(30); t = today(); }
    setActivePreset(preset);

    const params = {};
    if (f) params.date_from = new Date(f).toISOString();
    if (t) params.date_to = new Date(t + "T23:59:59").toISOString();

    const [sr, ds] = await Promise.all([
      api.get("/settings"),
      api.get("/dashboard/stats", { params }),
    ]);
    setSym(sr.data.currency_symbol || "₹");

    const d = ds.data;

    const salesArray = d.sales_last_7_days
      ? Object.entries(d.sales_last_7_days).sort(([a], [b]) => a.localeCompare(b)).map(([date, total]) => ({ date, total }))
      : [];

    const topProducts = (d.top_products || []).map((p) => ({
      name: p.name,
      revenue: p.total_revenue || p.total_qty || 0,
    }));

    setStats({
      revenue_today: d.revenue_today || 0,
      orders_today: d.orders_today || 0,
      total_products: d.total_products || 0,
      total_customers: d.total_customers || 0,
      sales_last_7_days: salesArray,
      top_products: topProducts,
      total_revenue: d.total_revenue || 0,
      total_orders: d.total_orders || 0,
      low_stock_count: d.low_stock_count || 0,
      low_stock_products: d.low_stock_products || [],
    });
  }, [from, to]);

  useEffect(() => { load(null); }, []);

  if (!stats) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="flex items-center gap-3">
        <div className="w-2.5 h-2.5 bg-[#E60000] animate-pulse rounded-full" />
        <span className="font-mono text-xs uppercase tracking-widest text-zinc-400">{t("page.loading_dashboard")}</span>
      </div>
    </div>
  );

  const handlePreset = (days) => {
    setFrom(days === 0 ? today() : daysAgo(days));
    setTo(today());
    load(days);
  };

  const handleApply = () => load(null);

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-[#E60000] rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-zinc-400">{P("live_dashboard")}</span>
          </div>
          <h1 className="font-display font-black text-2xl text-zinc-900 mt-0.5">{P("overview")}</h1>
        </div>
        <div className="flex items-center gap-3">
          {[
            { days: 0, label: P("today") },
            { days: 7, label: P("days7") },
            { days: 30, label: P("days30") },
          ].map((p) => (
            <button key={p.days} onClick={() => handlePreset(p.days)}
              className={`px-4 h-9 text-xs font-bold uppercase tracking-wider transition-all border-2 ${
                activePreset === p.days
                  ? "bg-[#E60000] text-white border-[#E60000] shadow-lg shadow-red-500/20"
                  : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-900"
              }`}>
              {p.label}
            </button>
          ))}
          <div className="w-px h-8 bg-zinc-200" />
          <div>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setActivePreset(null); }}
              className="h-9 w-32 border-2 border-zinc-200 bg-white text-zinc-700 px-2 font-mono text-xs focus:outline-none focus:border-[#E60000]" />
          </div>
          <div>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setActivePreset(null); }}
              className="h-9 w-32 border-2 border-zinc-200 bg-white text-zinc-700 px-2 font-mono text-xs focus:outline-none focus:border-[#E60000]" />
          </div>
          <button onClick={handleApply}
            className="h-9 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#CC0000] transition-all flex items-center gap-1.5 shadow-lg shadow-red-500/20">
            <Activity className="w-3.5 h-3.5" strokeWidth={2.5} /> {P("go")}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {KPI.map((k) => {
            const Icon = k.icon;
            const raw = stats[k.key] ?? 0;
            const val = k.money ? formatMoney(raw, sym) : Number(raw).toLocaleString("en-IN");
            return (
              <div key={k.key}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-zinc-100 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">{t(`page.${k.labelKey}`)}</span>
                    <div className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center group-hover:scale-110 group-hover:shadow-lg transition-all duration-300">
                      {Icon ? <Icon className="w-5 h-5" strokeWidth={2} style={{ color: k.color }} /> : <span className="text-lg font-black" style={{ color: k.color }}>{k.textIcon}</span>}
                    </div>
                  </div>
                  <div className="font-mono font-black text-3xl text-zinc-900 tracking-tight">{val}</div>
                  <div className="flex items-center gap-1.5 mt-3">
                    <div className="flex items-center gap-0.5 text-emerald-600">
                      <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={3} />
                      <span className="text-[10px] font-mono font-bold">12%</span>
                    </div>
                    <span className="text-[10px] font-mono text-zinc-400">{t("page.vs_yesterday")}</span>
                  </div>
                </div>
                <div className="h-1 w-0 group-hover:w-full bg-gradient-to-r from-[#E60000] to-red-300 transition-all duration-700 ease-out" />
              </div>
            );
          })}
        </div>

        {/* Low stock alert */}
        {stats.low_stock_count > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
            <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-sm text-amber-800">{stats.low_stock_count} {P("low_stock")}</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {stats.low_stock_products.map((p) => (
                  <span key={p.id} className="font-mono text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-1 rounded-lg shadow-sm">
                    {p.name.replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml|pcs|pack)$/i, "")} · <span className="text-[#E60000] font-bold">{formatStock(p.stock, p.sell_by)}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">{t("page.revenue")}</div>
                <h3 className="font-display font-black text-xl text-zinc-900 mt-0.5">{P("sales_performance")}</h3>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono uppercase text-zinc-400">{P("total")}</div>
                <div className="font-mono font-black text-2xl text-[#E60000]">{formatMoney(stats.total_revenue, sym)}</div>
              </div>
            </div>
            <div className="p-6">
              {stats.sales_last_7_days.length <= 1 ? (
                <div className="h-72 flex flex-col items-center justify-center">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{P("selected_period")}</div>
                  <div className="font-mono font-black text-6xl text-[#E60000] mt-4 tracking-tight">{formatMoney(stats.total_revenue, sym)}</div>
                  <div className="text-sm text-zinc-500 mt-2 font-mono">{stats.total_orders} {t("page.orders").toLowerCase()}</div>
                </div>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer>
                    <AreaChart data={stats.sales_last_7_days} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#E60000" stopOpacity={0.12} />
                          <stop offset="100%" stopColor="#E60000" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" vertical={false} />
                      <XAxis dataKey="date" tickFormatter={(v) => { try { const d = new Date(v); return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" }); } catch { return v; } }}
                        tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#A1A1AA" axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#A1A1AA" axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #E4E4E7", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontFamily: "JetBrains Mono", fontSize: 12 }}
                        formatter={(v) => [formatMoney(v, sym), t("page.revenue")]}
                        labelFormatter={(v) => { try { return new Date(v).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" }); } catch { return v; } }}
                      />
                      <Area type="monotone" dataKey="total" stroke="#E60000" strokeWidth={2.5} fill="url(#salesGradient)"
                        dot={false} activeDot={{ r: 5, fill: "#E60000", stroke: "#fff", strokeWidth: 2 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
            <div className="px-6 py-5 border-b border-zinc-100">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 font-semibold">{t("page.top_sellers")}</div>
              <h3 className="font-display font-black text-xl text-zinc-900 mt-0.5">{P("best_products")}</h3>
            </div>
            <div className="p-6">
              {stats.top_products.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-sm text-zinc-400 font-mono">{P("no_sales_yet")}</div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <BarChart data={stats.top_products} layout="vertical" margin={{ left: 0, right: 10 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} width={90} axisLine={false} tickLine={false} stroke="#A1A1AA" />
                      <Tooltip
                        contentStyle={{ background: "#fff", border: "1px solid #E4E4E7", borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", fontFamily: "JetBrains Mono", fontSize: 12 }}
                        formatter={(v) => [formatMoney(v, sym), t("page.revenue")]}
                      />
                      <Bar dataKey="revenue" fill="#E60000" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageShell({ title, subtitle, right, children }) {
  const { t } = useTranslation();
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-zinc-50 via-white to-zinc-50">
      <header className="bg-white/90 backdrop-blur-xl border-b border-zinc-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0 gap-2">
        <div className="min-w-0">
          <h1 className="font-display font-black text-lg sm:text-2xl text-zinc-900 truncate">{title}</h1>
          {subtitle && <div className="text-xs sm:text-sm text-zinc-500 mt-0.5 sm:mt-1 truncate">{subtitle}</div>}
        </div>
        <div className="flex-shrink-0">{right}</div>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}