import React, { useEffect, useState } from "react";
import { Plus, X, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";

export default function BatchManager({ product, onClose }) {
  const [batches, setBatches] = useState([]);
  const [form, setForm] = useState({ batch_no: "", expiry_date: "", mfg_date: "", quantity: "0", cost_price: "0" });
  const confirm = useConfirm();

  const load = async () => {
    try { const r = await api.get(`/batches/product/${product.id}`); setBatches(r.data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const addBatch = async (e) => {
    e.preventDefault();
    if (!form.batch_no || !form.quantity) { toast.error("Batch no & quantity required"); return; }
    try {
      await api.post("/batches", {
        product_id: product.id, batch_no: form.batch_no,
        expiry_date: form.expiry_date, mfg_date: form.mfg_date,
        quantity: Number(form.quantity), cost_price: Number(form.cost_price || 0),
      });
      toast.success("Batch added");
      setForm({ batch_no: "", expiry_date: "", mfg_date: "", quantity: "0", cost_price: "0" });
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const deleteBatch = async (id) => {
    const ok = await confirm("Delete this batch?", "Delete?"); if (!ok) return;
    try { await api.delete(`/batches/${id}`); toast.success("Deleted"); load(); } catch {}
  };

  const isExpired = (date) => date && date <= new Date().toISOString().slice(0, 10);
  const totalQty = batches.reduce((s, b) => s + b.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white border-2 border-zinc-900 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white sticky top-0 z-10">
          <div>
            <div className="font-display font-black uppercase text-lg">Batches — {product.name}</div>
            <div className="text-xs text-zinc-400 mt-0.5">Total: {totalQty} {product.unit || "pcs"} in {batches.length} batches</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          <form onSubmit={addBatch} className="grid grid-cols-6 gap-2 items-end">
            <div className="col-span-2">
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-0.5">Batch No *</label>
              <input value={form.batch_no} onChange={(e) => setForm({ ...form, batch_no: e.target.value })} required placeholder="B001"
                className="w-full h-9 border border-zinc-300 px-2 text-sm rounded focus:outline-none focus:border-[#E60000]" />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-0.5">Expiry</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full h-9 border border-zinc-300 px-2 text-sm rounded focus:outline-none focus:border-[#E60000]" />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-0.5">Qty</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} min="1" required
                className="w-full h-9 border border-zinc-300 px-2 text-sm rounded focus:outline-none focus:border-[#E60000]" />
            </div>
            <div>
              <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-0.5">Cost</label>
              <input type="number" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                className="w-full h-9 border border-zinc-300 px-2 text-sm rounded focus:outline-none focus:border-[#E60000]" />
            </div>
            <button type="submit"
              className="h-9 px-3 bg-[#E60000] text-white text-xs font-bold uppercase rounded hover:bg-[#cc0000] flex items-center gap-1">
              <Plus className="w-3 h-3" /> Add
            </button>
          </form>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="p-2 text-left font-mono text-[10px] uppercase text-zinc-500">Batch</th>
                <th className="p-2 text-left font-mono text-[10px] uppercase text-zinc-500">Expiry</th>
                <th className="p-2 text-right font-mono text-[10px] uppercase text-zinc-500">Qty</th>
                <th className="p-2 text-right font-mono text-[10px] uppercase text-zinc-500">Cost</th>
                <th className="p-2"></th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b) => {
                const expired = b.expiry_date && isExpired(b.expiry_date);
                return (
                  <tr key={b.id} className={`border-t border-zinc-100 ${expired ? "bg-red-50" : ""}`}>
                    <td className="p-2 font-mono text-xs">{b.batch_no}</td>
                    <td className={`p-2 font-mono text-xs ${expired ? "text-[#E60000] font-bold flex items-center gap-1" : ""}`}>
                      {expired && <AlertTriangle className="w-3 h-3 inline" />}
                      {b.expiry_date || "-"}
                    </td>
                    <td className="p-2 font-mono text-xs text-right">{b.quantity}</td>
                    <td className="p-2 font-mono text-xs text-right">₹{b.cost_price?.toFixed(2) || "0.00"}</td>
                    <td className="p-2 text-right">
                      <button onClick={() => deleteBatch(b.id)} className="p-1 hover:bg-red-100 text-[#E60000] rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {batches.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-zinc-400 text-sm">No batches added yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}