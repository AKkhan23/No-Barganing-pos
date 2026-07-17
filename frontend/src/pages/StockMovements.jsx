import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpDown, Loader2, Search, Filter } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function StockMovements() {
  const { t } = useTranslation();
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/stock-movements", { params: { limit: 200 } });
      setMovements(r.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = movements.filter((m) => {
    if (typeFilter !== "all" && m.type !== typeFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return (m.product_name || "").toLowerCase().includes(s) || (m.reference || "").toLowerCase().includes(s) || (m.note || "").toLowerCase().includes(s);
  });

  return (
    <PageShell title={t("page.stock_movements")} subtitle={`${movements.length} ${t("page.total_movements")}`}>
      <div className="p-6 overflow-y-auto h-full">
        <div className="flex gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_movements")}
              className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
          </div>
          <div className="flex gap-1">
            {["all", "in", "out", "adjustment"].map((f) => (
              <button key={f} onClick={() => setTypeFilter(f)}
                className={`px-3 h-11 text-[10px] font-bold uppercase tracking-widest border-2 ${typeFilter === f ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"}`}>
                {f === "all" ? t("page.all") : f === "in" ? t("page.stock_in") : f === "out" ? t("page.stock_out") : t("page.adjustment")}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">{t("page.date")}</th><th className="p-3 text-left">{t("page.product")}</th><th className="p-3 text-left">{t("page.type")}</th><th className="p-3 text-right">{t("page.quantity")}</th><th className="p-3 text-left">{t("page.reference")}</th><th className="p-3 text-left">{t("page.note")}</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-zinc-400">{t("page.no_movements")}</td></tr>
              ) : filtered.map((m) => (
                <tr key={m.id} className="border-t border-zinc-200 hover:bg-zinc-50">
                  <td className="p-3 text-xs font-mono">{formatDate(m.created_at)}</td>
                  <td className="p-3 font-semibold">{m.product_name || "-"}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase ${m.type === "in" ? "bg-green-100 text-green-800" : m.type === "out" ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"}`}>
                      <ArrowUpDown className={`w-3 h-3 ${m.type === "in" ? "rotate-0" : "rotate-180"}`} />
                      {m.type}
                    </span>
                  </td>
                  <td className="p-3 text-right font-mono">{m.quantity}</td>
                  <td className="p-3 text-xs">{m.reference || "-"}</td>
                  <td className="p-3 text-xs">{m.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
