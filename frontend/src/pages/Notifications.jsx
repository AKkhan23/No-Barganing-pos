import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bell, CheckCheck, Trash2, Loader2, Info, AlertTriangle, ShoppingCart, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";

const iconMap = { info: Info, warning: AlertTriangle, order: ShoppingCart, payment: DollarSign, reminder: Clock };

export default function Notifications() {
  const { t } = useTranslation();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    try { const r = await api.get("/notifications"); setList(r.data); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = filter === "all" ? list : filter === "read" ? list.filter((n) => n.read) : list.filter((n) => !n.read);

  const markRead = async (id) => {
    try { await api.patch(`/notifications/${id}`, { read: true }); setList(list.map((n) => n.id === id ? { ...n, read: true } : n)); }
    catch { toast.error(t("page.save_failed")); }
  };

  const markAllRead = async () => {
    try { await api.post("/notifications/read-all"); setList(list.map((n) => ({ ...n, read: true }))); }
    catch { toast.error(t("page.save_failed")); }
  };

  const handleDelete = async (id) => {
    try { await api.delete(`/notifications/${id}`); setList(list.filter((n) => n.id !== id)); }
    catch { toast.error(t("page.delete_failed")); }
  };

  const unread = list.filter((n) => !n.read).length;
  const IconComp = (t2) => iconMap[t2] || Info;

  return (
    <PageShell
      title={t("page.notifications")}
      subtitle={`${list.length} ${t("page.notifications_count").replace("{}", list.length)}`}
      right={
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            {unread > 0 ? `${unread} ${t("page.unread")}` : t("page.all_read")}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="h-9 px-3 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 hover:bg-zinc-800">
              <CheckCheck className="w-3.5 h-3.5" /> {t("page.mark_all_read")}
            </button>
          )}
        </div>
      }
    >
      <div className="p-4 overflow-y-auto h-full">
        <div className="flex gap-1 mb-4">
          {["all", "unread", "read"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 h-9 text-[10px] font-bold uppercase tracking-widest border-2 ${filter === f ? "bg-zinc-900 border-zinc-900 text-white" : "border-zinc-200 text-zinc-500 hover:bg-zinc-100"}`}>
              {f === "all" ? t("page.all") : f === "unread" ? t("page.unread") : t("page.read")}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-500"><Loader2 className="w-6 h-6 animate-spin mr-2" /> {t("common.loading")}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-zinc-400"><Bell className="w-10 h-10 mx-auto mb-3 opacity-30" /><p className="font-mono text-sm">{t("page.no_notifications")}</p></div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const Ic = IconComp(n.type);
              return (
                <div key={n.id}
                  className={`flex items-start gap-4 p-4 border-2 transition-colors ${n.read ? "border-zinc-200 bg-white" : "border-zinc-900 bg-zinc-50"}`}>
                  <div className={`w-10 h-10 flex items-center justify-center flex-shrink-0 ${n.read ? "bg-zinc-100 text-zinc-400" : "bg-[#E60000]/10 text-[#E60000]"}`}>
                    <Ic className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`text-sm ${n.read ? "text-zinc-600" : "text-zinc-900 font-semibold"}`}>{n.title}</p>
                        {n.message && <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>}
                      </div>
                      {!n.read && <span className="w-2 h-2 bg-[#E60000] flex-shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[10px] font-mono text-zinc-400 mt-1">{formatDate(n.created_at)} {n.created_at ? new Date(n.created_at).toLocaleTimeString() : ""}</p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!n.read && <button onClick={() => markRead(n.id)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100"><CheckCheck className="w-4 h-4" /></button>}
                    <button onClick={() => handleDelete(n.id)} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-[#E60000] hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageShell>
  );
}
