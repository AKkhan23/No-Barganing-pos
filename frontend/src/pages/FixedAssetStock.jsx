import React, { useEffect, useState } from "react";
import { Plus, X, Loader2, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";
import { useTranslation } from "react-i18next";

export default function FixedAssetStock() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [list, setList] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState(null);
  const [assetFilter, setAssetFilter] = useState("");
  const [summary, setSummary] = useState([]);
  const [activeTab, setActiveTab] = useState("Movements");

  const load = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get("/fixed-asset-stock"),
        api.get("/fixed-assets"),
        api.get("/fixed-asset-stock/summary"),
      ]);
      setList(r1.data);
      setAssets(r2.data);
      setSummary(r3.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = assetFilter
    ? list.filter((m) => m.asset_id === assetFilter || m.asset_name === assetFilter)
    : list;

  const sorted = [...filtered].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalIn = list.filter((m) => m.type === "in").reduce((s, m) => s + Number(m.quantity || 0), 0);
  const totalOut = list.filter((m) => m.type === "out").reduce((s, m) => s + Number(m.quantity || 0), 0);

  const handleSave = async () => {
    const f = modal.form;
    if (!f.asset_id) { toast.error(t("common.required") || "Select an asset"); return; }
    if (!f.type) { toast.error(t("common.required") || "Select type"); return; }
    if (!f.quantity || Number(f.quantity) <= 0) { toast.error(t("common.required") || "Quantity must be greater than 0"); return; }
    setSaving(true);
    try {
      await api.post("/fixed-asset-stock", {
        asset_id: f.asset_id,
        type: f.type,
        quantity: Number(f.quantity),
        notes: f.notes || "",
        reference: f.reference || "",
      });
      toast.success(t("page.saved") || "Movement recorded");
      setModal(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed") || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (m) => {
    const ok = await confirm(
      t("common.confirm_delete") || "Delete this movement?",
      t("common.confirm_delete_desc") || "This action cannot be undone."
    );
    if (!ok) return;
    try {
      await api.delete(`/fixed-asset-stock/${m.id}`);
      toast.success(t("page.deleted") || "Deleted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed") || "Delete failed");
    }
  };

  const assetMap = {};
  assets.forEach((a) => { assetMap[a.id] = a; });
  assets.forEach((a) => { assetMap[a._id] = a; });

  const KPI = [
    { label: t("page.total_movements") || "Total Movements", value: list.length },
    { label: t("page.total_in") || "Total In", value: totalIn },
    { label: t("page.total_out") || "Total Out", value: totalOut },
  ];

  return (
    <PageShell
      title={t("page.fixed_asset_stock") || "Fixed Asset Stock"}
      subtitle={`${list.length} ${t("page.movements") || "Movements"}`}
      right={
        <button
          onClick={() => setModal({ form: { asset_id: "", type: "in", quantity: "", notes: "", reference: "" } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.add_stock") || "Add Stock"}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="grid grid-cols-3 gap-4 mb-6">
          {KPI.map((k, i) => (
            <div key={i} className="bg-white border-2 border-zinc-200 p-4">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{k.label}</div>
              <div className="text-2xl font-black font-display mt-1">{k.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6">
          {["Movements", "Summary"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 h-10 text-[10px] font-bold uppercase tracking-widest border-2 ${
                activeTab === tab
                  ? "bg-zinc-900 border-zinc-900 text-white"
                  : "border-zinc-300 text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {tab === "Movements" ? (t("page.movements") || "Movements") : (t("page.summary") || "Summary")}
            </button>
          ))}
        </div>

        {activeTab === "Movements" && (
          <>
            <div className="flex gap-3 mb-4 flex-wrap items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <select
                  value={assetFilter}
                  onChange={(e) => setAssetFilter(e.target.value)}
                  className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm appearance-none bg-white"
                >
                  <option value="">{t("page.all_assets") || "All Assets"}</option>
                  {assets.map((a) => (
                    <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-3 text-left">{t("page.date") || "Date"}</th>
                    <th className="p-3 text-left">{t("page.asset") || "Asset"}</th>
                    <th className="p-3 text-left">{t("page.type") || "Type"}</th>
                    <th className="p-3 text-right">{t("page.quantity") || "Quantity"}</th>
                    <th className="p-3 text-left">{t("page.notes") || "Notes"}</th>
                    <th className="p-3 text-left">{t("page.reference") || "Reference"}</th>
                    <th className="p-3 text-right">{t("page.actions") || "Actions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
                  ) : sorted.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-zinc-400">{t("page.no_movements") || "No movements"}</td></tr>
                  ) : sorted.map((m) => (
                    <tr key={m.id || m._id} className="border-t border-zinc-200 hover:bg-zinc-50">
                      <td className="p-3 text-xs font-mono">{formatDate(m.created_at)}</td>
                      <td className="p-3 font-semibold">{m.asset_name || "-"}</td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase ${
                          m.type === "in" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {m.type === "in" ? (t("page.in") || "In") : (t("page.out") || "Out")}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{m.quantity}</td>
                      <td className="p-3 text-xs">{m.notes || "-"}</td>
                      <td className="p-3 text-xs">{m.reference || "-"}</td>
                      <td className="p-3 text-right">
                        <button onClick={() => handleDelete(m)} className="btn-icon text-[#E60000]">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === "Summary" && (
          <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-3 text-left">{t("page.asset") || "Asset"}</th>
                  <th className="p-3 text-right">{t("page.total_in") || "Total In"}</th>
                  <th className="p-3 text-right">{t("page.total_out") || "Total Out"}</th>
                  <th className="p-3 text-right">{t("page.current_balance") || "Current Balance"}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
                ) : summary.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-zinc-400">{t("page.no_summary") || "No data"}</td></tr>
                ) : summary.map((s) => (
                  <tr key={s.asset_id || s._id || s.asset_name} className="border-t border-zinc-200 hover:bg-zinc-50">
                    <td className="p-3 font-semibold">{s.asset_name || "-"}</td>
                    <td className="p-3 text-right font-mono text-green-700">{s.total_in || 0}</td>
                    <td className="p-3 text-right font-mono text-red-700">{s.total_out || 0}</td>
                    <td className="p-3 text-right font-mono font-bold">{(s.total_in || 0) - (s.total_out || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(null)}>
            <div className="bg-white border-2 border-zinc-900 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
                <div className="font-display font-black uppercase text-lg">{t("page.add_stock_movement") || "Add Stock Movement"}</div>
                <button onClick={() => setModal(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <label>
                  <span className="label">{t("page.asset") || "Asset"} *</span>
                  <select
                    className="input"
                    value={modal.form.asset_id}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, asset_id: e.target.value } })}
                  >
                    <option value="">{t("page.select_asset") || "Select Asset"}</option>
                    {assets.map((a) => (
                      <option key={a.id || a._id} value={a.id || a._id}>{a.name}</option>
                    ))}
                  </select>
                </label>
                <div>
                  <span className="label">{t("page.type") || "Type"} *</span>
                  <div className="flex gap-4 mt-1">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stockType"
                        value="in"
                        checked={modal.form.type === "in"}
                        onChange={(e) => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold text-green-700">{t("page.in") || "In"}</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="stockType"
                        value="out"
                        checked={modal.form.type === "out"}
                        onChange={(e) => setModal({ ...modal, form: { ...modal.form, type: e.target.value } })}
                        className="w-4 h-4"
                      />
                      <span className="text-sm font-semibold text-red-700">{t("page.out") || "Out"}</span>
                    </label>
                  </div>
                </div>
                {modal.form.type === "out" && (
                  <div className="bg-amber-50 border border-amber-300 text-amber-800 text-xs p-3 rounded">
                    {t("page.out_warning") || "Ensure sufficient stock is available before recording an Out movement."}
                  </div>
                )}
                <label>
                  <span className="label">{t("page.quantity") || "Quantity"} *</span>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    className="input"
                    value={modal.form.quantity}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, quantity: e.target.value } })}
                  />
                </label>
                <label>
                  <span className="label">{t("page.notes") || "Notes"}</span>
                  <input
                    className="input"
                    value={modal.form.notes}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, notes: e.target.value } })}
                  />
                </label>
                <label>
                  <span className="label">{t("page.reference") || "Reference"}</span>
                  <input
                    className="input"
                    value={modal.form.reference}
                    onChange={(e) => setModal({ ...modal, form: { ...modal.form, reference: e.target.value } })}
                  />
                </label>
                <div className="flex justify-end gap-3 pt-4 border-t-2 border-zinc-200">
                  <button
                    onClick={() => setModal(null)}
                    className="h-11 px-6 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest"
                  >
                    {t("common.cancel") || "Cancel"}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="h-11 px-6 bg-[#E60000] hover:bg-[#CC0000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40 flex items-center gap-2"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {t("common.save") || "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
}
