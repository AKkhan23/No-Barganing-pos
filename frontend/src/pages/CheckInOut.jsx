import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { LogIn, LogOut, Search, Clock, Users } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { PageShell } from "./Dashboard";
import { useAuth } from "../lib/auth";
import { formatDate } from "../lib/format";

export default function CheckInOut() {
  const { t } = useTranslation();
  const P = (k) => t(`page.${k}`);
  const { user } = useAuth();

  const [records, setRecords] = useState([]);
  const [note, setNote] = useState("");
  const [selectedUser, setSelectedUser] = useState("all");
  const [userRecords, setUserRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadToday = async () => {
    try {
      const r = await api.get("/check-in-out/today");
      setRecords(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load records");
    }
  };

  useEffect(() => { loadToday(); }, []);

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await api.post("/check-in-out/check-in", {
        user_id: user.id,
        user_name: user.name,
        note: note || undefined,
      });
      toast.success("Checked in");
      setNote("");
      loadToday();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Check-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await api.post("/check-in-out/check-out", {
        user_id: user.id,
        note: note || undefined,
      });
      toast.success("Checked out");
      setNote("");
      loadToday();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Check-out failed");
    } finally {
      setLoading(false);
    }
  };

  const loadUserRecords = async (userId) => {
    if (userId === "all") {
      setUserRecords([]);
      return;
    }
    try {
      const r = await api.get(`/check-in-out/user/${userId}`);
      setUserRecords(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load user records");
    }
  };

  const getDistinctUsers = () => {
    const seen = new Set();
    return records.filter((r) => {
      const key = r.user_id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const todayCheckIn = records.filter((r) => r.user_id === user.id && r.action === "check_in").length;
  const todayCheckOut = records.filter((r) => r.user_id === user.id && r.action === "check_out").length;
  const isCheckedIn = todayCheckIn > todayCheckOut;

  const displayRecords = selectedUser !== "all" ? userRecords : records;

  return (
    <PageShell title="Check In / Out" subtitle="Track staff attendance">
      <div className="p-6 h-full overflow-y-auto space-y-6">
        {/* Check In/Out Button + Note */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <button
              onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
              disabled={loading}
              className={`h-14 px-8 rounded-xl text-sm font-bold uppercase tracking-widest flex items-center gap-3 transition-all shadow-lg ${
                isCheckedIn
                  ? "bg-[#E60000] text-white hover:bg-[#cc0000] shadow-red-500/30"
                  : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-500/30"
              }`}
            >
              {isCheckedIn ? <LogOut className="w-5 h-5" strokeWidth={2.5} /> : <LogIn className="w-5 h-5" strokeWidth={2.5} />}
              {isCheckedIn ? "Check Out" : "Check In"}
            </button>
            <div className="flex-1 w-full">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional)..."
                className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
            <div className="flex items-center gap-1.5">
              <LogIn className="w-3.5 h-3.5 text-emerald-500" /> Checked in: <span className="font-bold text-zinc-700">{todayCheckIn}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <LogOut className="w-3.5 h-3.5 text-[#E60000]" /> Checked out: <span className="font-bold text-zinc-700">{todayCheckOut}</span>
            </div>
          </div>
        </div>

        {/* User Selector */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <select
              value={selectedUser}
              onChange={(e) => { setSelectedUser(e.target.value); loadUserRecords(e.target.value); }}
              className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] bg-white appearance-none cursor-pointer"
            >
              <option value="all">All Users</option>
              {getDistinctUsers().map((r) => (
                <option key={r.user_id} value={r.user_id}>{r.user_name || r.user_id}</option>
              ))}
            </select>
          </div>
          {selectedUser !== "all" && (
            <span className="text-xs text-zinc-500 font-mono">{userRecords.length} records</span>
          )}
        </div>

        {/* Records Table */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Staff</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Action</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Timestamp</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Note</th>
              </tr>
            </thead>
            <tbody>
              {displayRecords.map((r) => (
                <tr key={r.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-zinc-400" />
                      {r.user_name || r.user_id}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      r.action === "check_in"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}>
                      {r.action === "check_in" ? <LogIn className="w-3 h-3" /> : <LogOut className="w-3 h-3" />}
                      {r.action === "check_in" ? "Check In" : "Check Out"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500 font-mono">{formatDate(r.timestamp)}</td>
                  <td className="p-4 text-sm text-zinc-500">{r.note || "-"}</td>
                </tr>
              ))}
              {displayRecords.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="text-zinc-300 mb-2">
                      <Clock className="w-12 h-12 mx-auto" strokeWidth={1} />
                    </div>
                    <div className="text-zinc-400 font-medium mb-1">No records found</div>
                    <div className="text-zinc-400 text-sm">Check in to start tracking</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PageShell>
  );
}
