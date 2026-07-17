import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, CheckSquare, Square, Edit3, X, Package } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { PageShell } from "./Dashboard";
import { formatMoney } from "../lib/format";
import { isWeightUnit, formatStock } from "../lib/sellBy";

const UPDATE_FIELDS = [
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
  { value: "cost_price", label: "Cost Price" },
  { value: "mrp", label: "MRP" },
  { value: "discount_percent", label: "Discount %" },
];

export default function BulkItemUpdate() {
  const { t } = useTranslation();
  const P = (k) => t(`page.${k}`);

  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [modal, setModal] = useState(null);

  const load = async () => {
    try {
      const r = await api.get("/products");
      setItems(r.data);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to load products");
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (p.name || "").toLowerCase().includes(s) ||
      (p.sku || "").toLowerCase().includes(s) ||
      (p.category || "").toLowerCase().includes(s)
    );
  });

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const handleBulkUpdate = async (field, value) => {
    if (!field || value === undefined || value === "") {
      toast.error("Please select a field and enter a value");
      return;
    }
    try {
      const ids = Array.from(selected);
      await api.post("/products/bulk-update", { ids, updates: { field, value: Number(value) } });
      toast.success(`Updated ${ids.length} products`);
      setSelected(new Set());
      setModal(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Bulk update failed");
    }
  };

  return (
    <PageShell title="Bulk Item Update" subtitle="Update multiple products at once">
      <div className="p-6 h-full overflow-y-auto flex flex-col">
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name, SKU or category..."
            className="w-full h-11 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm flex-1">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 w-12">
                  <button onClick={toggleAll} className="p-1 hover:bg-zinc-200 rounded transition-colors">
                    {selected.size === filtered.length && filtered.length > 0
                      ? <CheckSquare className="w-4 h-4 text-[#E60000]" />
                      : <Square className="w-4 h-4 text-zinc-400" />}
                  </button>
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Name</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">SKU</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">Price</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">Stock</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Category</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={`border-t border-zinc-100 hover:bg-zinc-50 transition-colors ${selected.has(p.id) ? "bg-[#E60000]/5" : ""}`}>
                  <td className="p-4">
                    <button onClick={() => toggleOne(p.id)} className="p-1 hover:bg-zinc-200 rounded transition-colors">
                      {selected.has(p.id)
                        ? <CheckSquare className="w-4 h-4 text-[#E60000]" />
                        : <Square className="w-4 h-4 text-zinc-400" />}
                    </button>
                  </td>
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-zinc-500" />
                      </div>
                      {p.name?.replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml|pcs|pack)$/i, "") || p.name}
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-zinc-500">{p.sku}</td>
                  <td className="p-4 text-right font-mono font-bold">{formatMoney(p.price)}</td>
                  <td className="p-4 text-right font-mono text-sm">
                    <span className={`font-bold ${Number(p.stock) <= Number(p.low_stock_threshold || 5) ? "text-[#E60000]" : "text-zinc-700"}`}>
                      {formatStock(p.stock, p.sell_by)}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{p.category || "-"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <div className="text-zinc-300 mb-2">
                      <Package className="w-12 h-12 mx-auto" strokeWidth={1} />
                    </div>
                    <div className="text-zinc-400 font-medium mb-1">{search ? "No matching products" : "No products found"}</div>
                    <div className="text-zinc-400 text-sm">{search ? "Try a different search term" : "Add products first"}</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Bottom Selection Bar */}
        {selected.size > 0 && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-zinc-900 shadow-2xl px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
                <CheckSquare className="w-5 h-5 text-[#E60000]" />
              </div>
              <div>
                <div className="font-display font-black text-lg">{selected.size} selected</div>
                <div className="text-xs text-zinc-500">Items ready for bulk update</div>
              </div>
            </div>
            <button
              onClick={() => setModal({ field: "", value: "" })}
              className="h-12 px-8 bg-zinc-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Edit3 className="w-4 h-4" /> Update Selected
            </button>
          </div>
        )}

        {/* Update Modal */}
        {modal && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
            <div className="w-full max-w-md bg-white rounded-xl shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-zinc-200">
                <div>
                  <div className="font-display font-black uppercase text-lg">Bulk Update</div>
                  <div className="text-xs text-zinc-500 mt-0.5">Updating {selected.size} products</div>
                </div>
                <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Field to Update <span className="text-[#E60000]">*</span></label>
                  <select
                    value={modal.field}
                    onChange={(e) => setModal({ ...modal, field: e.target.value })}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm bg-white"
                  >
                    <option value="">-- Select field --</option>
                    {UPDATE_FIELDS.map((f) => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">New Value <span className="text-[#E60000]">*</span></label>
                  <input
                    type="number" step="any"
                    value={modal.value}
                    onChange={(e) => setModal({ ...modal, value: e.target.value })}
                    placeholder="Enter new value"
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModal(null)}
                    className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={() => handleBulkUpdate(modal.field, modal.value)}
                    className="h-11 px-6 bg-zinc-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Apply to {selected.size} Items
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Spacer for bottom bar */}
        {selected.size > 0 && <div className="h-24" />}
      </div>
    </PageShell>
  );
}
