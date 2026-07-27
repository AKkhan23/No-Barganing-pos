import React, { useEffect, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney } from "../lib/format";
import { PageShell } from "./Dashboard";
import { useConfirm } from "../lib/confirm";
import { useAuth } from "../lib/auth";

const EMPTY = { name: "", phone: "", email: "" };
const ERR = { name: "", phone: "", email: "" };

function validate(f) {
  const e = { ...ERR };
  if (!f.name || !f.name.trim()) e.name = "Name is required";
  if (f.phone && !/^[6-9]\d{9}$/.test(f.phone)) e.phone = "Enter a valid 10-digit mobile (starts with 6-9)";
  if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) e.email = "Enter a valid email address";
  return e;
}

function hasErrors(e) { return Object.values(e).some(Boolean); }

export default function Customers() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState({ ...ERR });
  const confirm = useConfirm();

  const load = async () => setItems((await api.get("/customers")).data);
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    const v = validate(form);
    setErrors(v);
    if (hasErrors(v)) return;
    try {
      await api.post("/customers", form);
      toast.success(t("page.customer_added"));
      setModal(null); setForm({ ...EMPTY }); setErrors({ ...ERR });
      load();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.save_failed"));
    }
  };

  const del = async (c) => {
    const ok = await confirm(t("page.delete_confirm_item", { name: c.name }), t("common.confirm_delete")); if (!ok) return;
    await api.delete(`/customers/${c.id}`);
    toast.success(t("page.deleted"));
    load();
  };

  return (
    <PageShell
      title={t("page.customers")}
      subtitle={`${items.length} ${t("page.customers").toLowerCase()}`}
      right={
        <button
          onClick={() => setModal(true)}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-customer-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("common.add")} {t("page.customer")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.phone")}</th>
                <th className="p-3 text-left">{t("page.email")}</th>
                <th className="p-3 text-right">{t("page.loyalty_points")}</th>
                <th className="p-3 text-right">{t("page.total_spent")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`cust-${c.id}`}>
                  <td className="p-3 font-semibold">{c.name}</td>
                  <td className="p-3 font-mono text-xs">{c.phone || "-"}</td>
                  <td className="p-3 font-mono text-xs">{c.email || "-"}</td>
                  <td className="p-3 font-mono text-right">{c.loyalty_points}</td>
                  <td className="p-3 font-mono text-right font-bold">{formatMoney(c.total_spent)}</td>
                  <td className="p-3 text-right">
                    {(user?.role === "admin" || user?.role === "manager") && (
                      <button onClick={() => del(c)} className="p-1.5 hover:bg-red-100 text-[#E60000]"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_customers")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border-2 border-zinc-900">
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{t("page.new_customer")}</div>
              <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-4" onSubmit={save}>
              {["name", "phone", "email"].map((k) => (
                <div key={k}>
                  <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{k === "name" ? t("common.name") : k === "phone" ? t("page.phone") : t("page.email")}</label>
                  <input
                    value={form[k]}
                    onChange={(e) => { setForm({ ...form, [k]: e.target.value }); if (errors[k]) setErrors({ ...errors, [k]: "" }); }}
                    data-testid={`cf-${k}`}
                    className={`w-full h-11 border-2 px-3 focus:outline-none focus:border-[#E60000] font-mono text-sm ${errors[k] ? "border-red-500" : "border-zinc-300"}`}
                  />
                  {errors[k] && <p className="text-red-500 text-[10px] mt-1">{errors[k]}</p>}
                </div>
              ))}
              <button type="submit" data-testid="cf-save" className="w-full h-11 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">{t("common.save")}</button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
