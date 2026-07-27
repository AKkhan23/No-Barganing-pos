import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, Loader2, Search } from "lucide-react";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

export default function Transfers() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/transfers");
      setList(r.data);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = list.filter((x) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (
      (x.from_account || "").toLowerCase().includes(s) ||
      (x.to_account || "").toLowerCase().includes(s)
    );
  });

  return (
    <PageShell
      title={t("page.transfers")}
      subtitle={`${list.length} ${t("page.transfers_count")}`}
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_transfers")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
          />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-left">{t("page.from_account")}</th>
                <th className="p-3 text-left">{t("page.to_account")}</th>
                <th className="p-3 text-right">{t("page.amount")}</th>
                <th className="p-3 text-left">{t("page.note")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin inline" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-400">
                    <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>{t("page.no_transfers")}</p>
                  </td>
                </tr>
              ) : (
                filtered.map((tr) => (
                  <tr
                    key={tr.id}
                    className="border-t border-zinc-200 hover:bg-zinc-50"
                  >
                    <td className="p-3 text-xs font-mono">
                      {formatDate(tr.created_at)}
                    </td>
                    <td className="p-3 font-semibold">
                      {tr.from_account || "-"}
                    </td>
                    <td className="p-3 font-semibold">
                      {tr.to_account || "-"}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {formatMoney(tr.amount)}
                    </td>
                    <td className="p-3 text-xs">{tr.note || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
