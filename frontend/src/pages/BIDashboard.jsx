import React, { useEffect, useState, useCallback } from "react";

import { useTranslation } from "react-i18next";

import {

  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Cell,

} from "recharts";

import api from "../lib/api";

import { formatMoney } from "../lib/format";

import { PageShell } from "./Dashboard";



const BAR_COLORS = ["#E60000", "#09090B", "#FDE047", "#0284C7", "#16A34A"];

const DAY_MS = 24 * 60 * 60 * 1000;

const datePast = (d: number) => new Date(Date.now() - d * DAY_MS).toISOString().split("T")[0];



export default function BIDashboard() {

  const { t } = useTranslation();

  const [comparison, setComparison] = useState(null);

  const [topProducts, setTopProducts] = useState([]);

  const [topCustomers, setTopCustomers] = useState([]);

  const [profit, setProfit] = useState(null);

  const [cashFlow, setCashFlow] = useState([]);

  const [sym, setSym] = useState("₹");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(true);



  const fetchData = useCallback(() => {

    const p = datePast(30);

    const now = new Date().toISOString().split("T")[0];

    const dateQ = `date_from=${p}&date_to=${now}`;

    Promise.all([

      api.get(`/bi/comparison?${dateQ}`).then((r) => {

        const d = r.data;

        if (d && typeof d === "object" && !Array.isArray(d)) {

          setComparison([

            { label: "Purchases", value: d.total_purchases || 0 },

            { label: "Sales", value: d.total_sales || 0 },

            { label: "Damages", value: d.total_damages || 0 },

            { label: "Expenses", value: d.total_expenses || 0 },

            { label: "Income", value: d.total_income || 0 },

          ]);

        } else {

          setComparison(d || []);

        }

      }),

      api.get(`/bi/top-products?${dateQ}`).then((r) => setTopProducts(r.data)),

      api.get("/bi/top-customers").then((r) => setTopCustomers(r.data)),

      api.get(`/bi/profit-margin?${dateQ}`).then((r) => setProfit(r.data)),

      api.get(`/bi/cash-flow?${dateQ}`).then((r) => setCashFlow(r.data)),

      api.get("/settings").then((r) => setSym(r.data.currency_symbol || "₹")),

    ]).catch((err) => {

      setError(err?.response?.data?.detail || err?.message || "Failed to load data");

    }).finally(() => setLoading(false));

  }, []);



  useEffect(() => {

    setLoading(true);

    fetchData();

    const id = setInterval(fetchData, 30000);

    return () => clearInterval(id);

  }, [fetchData]);



  const chartData = comparison || [];

  const tooltip = { contentStyle: { border: "2px solid #09090B", borderRadius: 0, fontFamily: "JetBrains Mono", fontSize: 12 } };



  return (

    <PageShell title={t("page.bi_dashboard")} subtitle={t("page.flow_comparison")}>

      <div className="p-6 space-y-6 overflow-y-auto h-full">

        {loading && <div className="text-center py-8 text-zinc-500 font-mono text-sm">Loading...</div>}

        {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 p-3 font-mono text-xs">{error}</div>}

        <div className="bg-white border-2 border-zinc-200 p-5">

          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.flow_comparison")}</div>

          <h3 className="font-display font-black text-xl uppercase mb-4">{t("page.purchase_vs_sale")}</h3>

          <div className="h-72">

            <ResponsiveContainer>

              <BarChart data={chartData}>

                <CartesianGrid strokeDasharray="2 2" stroke="#E4E4E7" />

                <XAxis dataKey="label" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />

                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />

                <Tooltip {...tooltip} formatter={(v) => formatMoney(v, sym)} />

                <Bar dataKey="value" radius={0}>

                  {chartData.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}

                </Bar>

              </BarChart>

            </ResponsiveContainer>

          </div>

        </div>



        <div className="bg-white border-2 border-zinc-200 p-5">

          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.liquidity")}</div>

          <h3 className="font-display font-black text-xl uppercase mb-4">{t("page.daily_net_cash_flow")}</h3>

          <div className="h-64">

            <ResponsiveContainer>

              <LineChart data={cashFlow}>

                <CartesianGrid strokeDasharray="2 2" stroke="#E4E4E7" />

                <XAxis dataKey="date" tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />

                <YAxis tick={{ fontFamily: "JetBrains Mono", fontSize: 10 }} stroke="#71717A" />

                <Tooltip {...tooltip} formatter={(v) => formatMoney(v, sym)} />

                <Line type="monotone" dataKey="net" stroke="#E60000" strokeWidth={3} dot={{ fill: "#E60000", r: 3 }} />

              </LineChart>

            </ResponsiveContainer>

          </div>

        </div>



        <div className="bg-zinc-950 text-white border-2 border-zinc-900 p-5 flex items-center justify-between">

          <div>

            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.profit_margin")}</div>

            <div className="font-display font-black text-3xl uppercase mt-1">{profit ? `${profit.gross_margin_percent?.toFixed(1)}%` : "-"}</div>

          </div>

          <div className="text-right">

            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.net_profit")}</div>

            <div className="font-mono font-black text-2xl text-[#FDE047]">{profit ? formatMoney(profit.net_profit, sym) : "-"}</div>

          </div>

        </div>



        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <div className="bg-white border-2 border-zinc-200 p-5">

            <h3 className="font-display font-black text-lg uppercase mb-3">{t("page.top_10_products")}</h3>

            <table className="w-full text-xs">

              <thead className="text-[10px] uppercase tracking-widest"><tr><th className="text-left p-2">#</th><th className="text-left p-2">{t("page.product_cap")}</th><th className="text-right p-2">{t("page.revenue")}</th></tr></thead>

              <tbody className="font-mono">

                {topProducts.map((p, i) => (

                  <tr key={p.id || i} className="border-t border-zinc-200" data-testid={`top-prod-${i}`}>

                    <td className="p-2 text-zinc-500">{i + 1}</td>

                    <td className="p-2">{p.product_name}</td>

                    <td className="p-2 text-right">{formatMoney(p.total_revenue, sym)}</td>

                  </tr>

                ))}

                {topProducts.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-zinc-500">{t("page.no_data")}</td></tr>}

              </tbody>

            </table>

          </div>

          <div className="bg-white border-2 border-zinc-200 p-5">

            <h3 className="font-display font-black text-lg uppercase mb-3">{t("page.top_10_customers")}</h3>

            <table className="w-full text-xs">

              <thead className="text-[10px] uppercase tracking-widest"><tr><th className="text-left p-2">#</th><th className="text-left p-2">{t("common.name")}</th><th className="text-right p-2">{t("page.spent")}</th></tr></thead>

              <tbody className="font-mono">

                {topCustomers.map((c, i) => (

                  <tr key={c.id || i} className="border-t border-zinc-200" data-testid={`top-cust-${i}`}>

                    <td className="p-2 text-zinc-500">{i + 1}</td>

                    <td className="p-2">{c.name}</td>

                    <td className="p-2 text-right">{formatMoney(c.total_spent, sym)}</td>

                  </tr>

                ))}

                {topCustomers.length === 0 && <tr><td colSpan={3} className="p-3 text-center text-zinc-500">{t("page.no_data")}</td></tr>}

              </tbody>

            </table>

          </div>

        </div>

      </div>

    </PageShell>

  );

}
†
