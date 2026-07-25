import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Users, Package, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function DashboardV2() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/dashboard/stats"); setStats(r.data); } finally { setLoading(false); }
  };
  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  const cards = [
    { key: "revenue_today", label: "Today Revenue", icon: DollarSign, color: "green", format: true },
    { key: "orders_today", label: "Today Orders", icon: ShoppingCart, color: "blue", format: false },
    { key: "total_customers", label: "Total Customers", icon: Users, color: "purple", format: false },
    { key: "low_stock_count", label: "Low Stock Items", icon: Package, color: "red", format: false },
  ];

  return (
    <PageShell title="Dashboard V2" subtitle="Real-time Overview">
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => {
            const val = stats ? stats[c.key] : null;
            return (
              <div key={c.key} className={`bg-white border-2 border-${c.color}-200 p-5`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{c.label}</div>
                    <div className="text-2xl font-black">
                      {loading ? <Loader2 className="w-5 h-5 animate-spin inline" /> : c.format ? formatMoney(val || 0) : val ?? "-"}
                    </div>
                  </div>
                  <c.icon className={`w-10 h-10 text-${c.color}-500 opacity-30`} />
                </div>
              </div>
            );
          })}
        </div>

        {stats?.recent_orders && stats.recent_orders.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Recent Orders</h3>
            <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                  <tr><th className="p-3 text-left">Order ID</th><th className="p-3 text-left">Customer</th><th className="p-3 text-right">Total</th><th className="p-3 text-left">Status</th></tr>
                </thead>
                <tbody>
                  {stats.recent_orders.map((o) => (
                    <tr key={o.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                      <td className="p-3 font-mono text-xs">#{o.id}</td>
                      <td className="p-3">{o.customer_name || "Walk-in"}</td>
                      <td className="p-3 text-right font-mono font-bold">{formatMoney(o.grand_total || o.total)}</td>
                      <td className="p-3"><span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-green-100 text-green-800">{o.status || "completed"}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {stats?.top_products && stats.top_products.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Top Selling</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {stats.top_products.map((p, i) => (
                <div key={i} className="bg-white border-2 border-zinc-200 p-4">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">#{i + 1}</div>
                  <div className="font-bold text-sm mt-1">{p.name || p.product_name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5">{p.total_qty || p.quantity} sold</div>
                  <div className="text-sm font-black text-[#E60000] mt-1">{formatMoney(p.total_revenue || p.total_qty * p.price || 0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats?.revenue_trend && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3">Revenue Trend</h3>
            <div className="bg-white border-2 border-zinc-200 p-5">
              <div className="flex items-end gap-2 h-32">
                {stats.revenue_trend.map((d, i) => {
                  const max = Math.max(...stats.revenue_trend.map((x) => x.revenue), 1);
                  const h = (d.revenue / max) * 100;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full bg-[#E60000]/10 rounded-t" style={{ height: `${Math.max(h, 4)}%` }}>
                        <div className="w-full h-full bg-[#E60000] opacity-80" style={{ height: `${h}%` }} />
                      </div>
                      <span className="text-[8px] font-mono text-zinc-400">{d.label?.slice(0, 3)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
