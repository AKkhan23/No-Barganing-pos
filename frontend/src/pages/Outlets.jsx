import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Store } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../lib/api";
import { formatDate } from "../lib/format";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

const EMPTY = { name: "", address: "", phone: "", gstin: "" };

export default function Outlets() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(null); // null | {edit?, form}
  const confirm = useConfirm();

  const load = async () => {
    try {
      const r = await api.get("/outlets");
      setRows(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load_outlets"));
    }
  };
  useEffect(() => { load(); }, []);

  const reloadOutlets = () => { load(); window.dispatchEvent(new Event("outlets-changed")); };

  const onSave = async (form) => {
    try {
      if (modal.edit) {
        await api.patch(`/outlets/${modal.edit.id}`, form);
        toast.success(t("page.outlet_updated"));
      } else {
        await api.post("/outlets", form);
        toast.success(t("page.outlet_created"));
      }
      setModal(null); reloadOutlets();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    }
  };

  const onDelete = async (o) => {
    const ok = await confirm(t("page.delete_confirm_item", { name: o.name }), t("common.confirm_delete")); if (!ok) return;
    try {
      await api.delete(`/outlets/${o.id}`);
      toast.success(t("page.deleted"));
      reloadOutlets();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed"));
    }
  };

  return (
    <PageShell
      title={t("nav.outlets")}
      subtitle={`${rows.length} ${t("nav.outlets").toLowerCase()}`}
      right={
        <button onClick={() => setModal({ form: { ...EMPTY } })} data-testid="out-add"
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("common.add")} Outlet
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.address")}</th>
                <th className="p-3 text-left">{t("page.phone")}</th>
                <th className="p-3 text-left">{t("page.gstin")}</th>
                <th className="p-3 text-right">{t("page.date")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`out-row-${o.id}`}>
                  <td className="p-3 font-semibold">{o.name}</td>
                  <td className="p-3 text-xs">{o.address || "-"}</td>
                  <td className="p-3 font-mono text-xs">{o.phone || "-"}</td>
                  <td className="p-3 font-mono text-xs">{o.gstin || "-"}</td>
                  <td className="p-3 font-mono text-right text-xs">{formatDate(o.created_at)}</td>
                  <td className="p-3 text-right">
                    <button onClick={() => setModal({ edit: o, form: { ...o } })} data-testid={`out-edit-${o.id}`}
                      className="p-1.5 hover:bg-zinc-200 mr-1"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(o)} data-testid={`out-delete-${o.id}`}
                      className="p-1.5 hover:bg-red-100 text-[#E60000]"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_outlets")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && <OutletModal initial={modal.form} edit={!!modal.edit} onClose={() => setModal(null)} onSave={onSave} />}
    </PageShell>
  );
}

function OutletModal({ initial, edit, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const VALIDATORS = {
    name: (v) => (!v.trim() ? t("page.name_required") : v.length > 100 ? t("page.name_too_long") : null),
    address: (v) => (!v.trim() ? t("page.address_required") : v.length > 500 ? t("page.address_too_long") : null),
    phone: (v) => (v && !/^[0-9]{10}$/.test(v) ? t("page.phone_invalid") : null),
    gstin: (v) => (v && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(v) ? t("page.gstin_invalid") : null),
  };
  const upd = (k, v) => {
    setForm({ ...form, [k]: v });
    const err = VALIDATORS[k](v);
    setErrors((prev) => ({ ...prev, [k]: err }));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    let hasError = false;
    for (const k of ["name", "address", "phone", "gstin"]) {
      const err = VALIDATORS[k](form[k] || "");
      if (err) { newErrors[k] = err; hasError = true; }
    }
    setErrors(newErrors);
    if (!hasError) onSave(form);
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-2 border-zinc-900" data-testid="out-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">{edit ? t("page.edit_outlet") : t("page.add_outlet")}</div>
          <button onClick={onClose} data-testid="out-close" className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {[
            { k: "name", label: t("common.name"), req: true },
            { k: "address", label: t("page.address"), req: true },
            { k: "phone", label: t("page.phone") },
            { k: "gstin", label: t("page.gstin") },
          ].map((f) => (
            <div key={f.k}>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{f.label}{f.req && " *"}</label>
              <input value={form[f.k]} onChange={(e) => upd(f.k, e.target.value)} required={f.req} data-testid={`out-${f.k}`}
                className={`w-full h-11 border-2 px-3 focus:outline-none text-sm ${errors[f.k] ? "border-red-500 focus:border-red-600" : "border-zinc-300 focus:border-[#E60000]"}`} />
              {errors[f.k] && <p className="text-red-600 text-[10px] font-mono mt-1">{errors[f.k]}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} data-testid="out-cancel" className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
            <button type="submit" data-testid="out-save" className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest">
              {edit ? t("page.update") : t("page.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
