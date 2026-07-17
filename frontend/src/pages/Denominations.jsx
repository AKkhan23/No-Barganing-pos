import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

const EMPTY = { amount: "", description: "" };

export default function Denominations() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    try { const r = await api.get("/denominations"); setItems(r.data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (c) =>
      (String(c.amount) || "").includes(search) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const formatAmt = (v) => `₹${Number(v).toLocaleString("en-IN")}`;

  const onSave = async (form) => {
    try {
      const payload = { amount: Number(form.amount), description: form.description };
      if (modal?.edit) {
        await api.patch(`/denominations/${modal.edit.id}`, payload);
        toast.success("Denomination updated");
      } else {
        await api.post("/denominations", payload);
        toast.success("Denomination created");
      }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const onDelete = async (item) => {
    const ok = await confirm(`Delete denomination ${formatAmt(item.amount)}?`, "Delete?"); if (!ok) return;
    try { await api.delete(`/denominations/${item.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  return (
    <PageShell title="Denominations" subtitle="Manage cash denominations">
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-[#E60000]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
            </div>
            <div>
              <div className="font-display font-black text-lg">{items.length} Denominations</div>
              <div className="text-xs text-zinc-500">Total cash denominations</div>
            </div>
          </div>
          <button onClick={() => setModal({ edit: null, form: { amount: "", description: "" } })}
            className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Denomination
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search denominations..."
            className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]"
          />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Amount</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Description</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#E60000", "#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][i % 6] }} />
                      {formatAmt(c.amount)}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{c.description || "-"}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => setModal({ edit: c, form: { amount: String(c.amount), description: c.description || "" } })}
                      className="p-2 hover:bg-zinc-100 rounded-lg mr-1 transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete(c)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#E60000] transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="p-12 text-center">
                  <div className="text-zinc-300 mb-2"><svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg></div>
                    <div className="text-zinc-400 font-medium mb-1">{search ? "No matching denominations" : "No denominations yet"}</div>
                  <div className="text-zinc-400 text-sm">{search ? "Try a different search" : "Click Add Denomination to create one"}</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div>
                <div className="font-display font-black uppercase text-lg">{modal.edit ? "Edit Denomination" : "New Denomination"}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{modal.edit ? "Update denomination details" : "Add a new cash denomination"}</div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-5" onSubmit={(e) => { e.preventDefault(); onSave(modal.form); }}>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Amount (₹) <span className="text-[#E60000]">*</span></label>
                <input value={modal.form.amount} onChange={(e) => setModal({ ...modal, form: { ...modal.form, amount: e.target.value } })} required type="number" min="0" step="0.01" placeholder="e.g. 500"
                  className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Description</label>
                <textarea value={modal.form.description} onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} rows={3} placeholder="Enter denomination description"
                  className="w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors">
                  {modal.edit ? "Update" : "Add"} Denomination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
