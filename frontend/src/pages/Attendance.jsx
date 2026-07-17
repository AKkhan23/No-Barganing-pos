import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, BarChart3, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

export default function Attendance() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

  const load = async () => {
    try {
      const r = await api.get("/attendance");
      setRows(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load"));
    }
  };
  useEffect(() => { load(); }, []);

  const checkIn = async () => {
    try {
      let latitude, longitude;
      try {
        const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { timeout: 4000 }));
        latitude = pos.coords.latitude; longitude = pos.coords.longitude;
      } catch { /* optional */ }
      await api.post("/attendance/check-in", { latitude, longitude });
      toast.success(t("page.checked_in"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load"));
    }
  };

  const checkOut = async () => {
    try {
      await api.post("/attendance/check-out");
      toast.success(t("page.checked_out"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load"));
    }
  };

  const showSummary = async () => {
    try {
      const r = await api.get(`/attendance/summary?month=${month}`);
      setSummary(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load"));
    }
  };

  return (
    <PageShell
      title={t("page.attendance")}
      subtitle={`${rows.length} ${t("page.records")}`}
      right={
        <div className="flex gap-2">
          <button onClick={checkIn} data-testid="att-check-in"
            className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <LogIn className="w-4 h-4" strokeWidth={2.5} /> {t("page.check_in")}
          </button>
          <button onClick={checkOut} data-testid="att-check-out"
            className="h-11 px-4 bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <LogOut className="w-4 h-4" strokeWidth={2.5} /> {t("page.check_out")}
          </button>
          <button onClick={showSummary} data-testid="att-summary"
            className="h-11 px-4 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <BarChart3 className="w-4 h-4" strokeWidth={2.5} /> {t("page.summary")}
          </button>
        </div>
      }
    >
      <div className="p-6 overflow-y-auto h-full space-y-4">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-right">{t("page.check_in")}</th>
                <th className="p-3 text-right">{t("page.check_out")}</th>
                <th className="p-3 text-right">{t("page.hours")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`att-row-${a.id}`}>
                  <td className="p-3 font-semibold">{a.user_name || a.user || a.user_id}</td>
                  <td className="p-3 font-mono text-xs">{formatDate(a.date)}</td>
                  <td className="p-3 font-mono text-right">{a.check_in ? formatDate(a.check_in) : "-"}</td>
                  <td className="p-3 font-mono text-right">{a.check_out ? formatDate(a.check_out) : "-"}</td>
                  <td className="p-3 font-mono text-right font-bold">{a.hours != null ? a.hours : "-"}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_attendance_records")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {summary && (
          <div className="border-2 border-zinc-900 bg-white p-5" data-testid="att-summary-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-black uppercase text-lg">{t("page.monthly_summary")} — {month}</h3>
              <button onClick={() => setSummary(null)} data-testid="att-summary-close" className="p-1 hover:bg-zinc-100"><BarChart3 className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Array.isArray(summary) ? (
                <table className="md:col-span-3 w-full text-sm">
                  <thead className="bg-zinc-100 uppercase text-[10px] tracking-widest">
                    <tr>
                      <th className="p-2 text-left">{t("common.name")}</th>
                      <th className="p-2 text-right">{t("page.days")}</th>
                      <th className="p-2 text-right">{t("page.hours")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((s, i) => (
                      <tr key={i} className="border-t border-zinc-200" data-testid={`att-sum-row-${i}`}>
                        <td className="p-2 font-semibold">{s.user_name || s.user || s.user_id}</td>
                        <td className="p-2 font-mono text-right">{s.days}</td>
                        <td className="p-2 font-mono text-right">{s.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <>
                  <div className="border-2 border-zinc-200 p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.total_days")}</div><div className="font-mono font-black text-2xl">{summary.total_days}</div></div>
                  <div className="border-2 border-zinc-200 p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.total_hours")}</div><div className="font-mono font-black text-2xl">{summary.total_hours}</div></div>
                  <div className="border-2 border-zinc-200 p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.overtime")}</div><div className="font-mono font-black text-2xl">{summary.overtime || 0}</div></div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
