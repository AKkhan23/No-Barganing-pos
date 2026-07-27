import React, { useEffect, useState, useRef } from "react";
import { Plus, Edit3, Trash2, Search, X, Package2, Tag, Layers, Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney } from "../lib/format";
import { PageShell } from "./Dashboard";
import BarcodeLabel from "../components/BarcodeLabel";
import BatchManager from "../components/BatchManager";
import { useConfirm } from "../lib/confirm";
import { isWeightUnit, formatStock } from "../lib/sellBy";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";

const EMPTY = {
  name: "", size: "", sku: "", barcode: "", category: "", brand: "", rack: "",
  price: "", cost: "", tax_rate: "5", stock: "0", low_stock_threshold: "5",
  unit: "pcs", sell_by: "pcs", image_url: "", variant_template: "",
};
const UNITS = ["pcs", "ml", "l", "g", "kg", "pack", "box"];
const PACK_SIZES = [
  { label: "10g", size: "10", unit: "g" },
  { label: "20g", size: "20", unit: "g" },
  { label: "50g", size: "50", unit: "g" },
  { label: "100g", size: "100", unit: "g" },
  { label: "200g", size: "200", unit: "g" },
  { label: "500g", size: "500", unit: "g" },
  { label: "1kg", size: "1", unit: "kg" },
  { label: "2kg", size: "2", unit: "kg" },
  { label: "5kg", size: "5", unit: "kg" },
  { label: "10kg", size: "10", unit: "kg" },
  { label: "25kg", size: "25", unit: "kg" },
  { label: "200ml", size: "200", unit: "ml" },
  { label: "500ml", size: "500", unit: "ml" },
  { label: "1L", size: "1", unit: "l" },
  { label: "2L", size: "2", unit: "l" },
  { label: "5L", size: "5", unit: "l" },
  { label: "75g", size: "75", unit: "g" },
  { label: "150g", size: "150", unit: "g" },
  { label: "400g", size: "400", unit: "g" },
  { label: "1pc", size: "1", unit: "pcs" },
  { label: "5pcs", size: "5", unit: "pcs" },
  { label: "10pcs", size: "10", unit: "pcs" },
];

export default function Products() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [cats, setCats] = useState([]);
  const [units, setUnits] = useState([]);
  const [brands, setBrands] = useState([]);
  const [racks, setRacks] = useState([]);
  const [variations, setVariations] = useState([]);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(null);
  const [labelFor, setLabelFor] = useState(null);
  const [repackFor, setRepackFor] = useState(null);
  const [batchFor, setBatchFor] = useState(null);
  const [expandedParents, setExpandedParents] = useState({});
  const [repackChildren, setRepackChildren] = useState({});
  const [variantChildren, setVariantChildren] = useState({});
  const confirm = useConfirm();

  const load = async () => {
    try {
      const [p, c, u, b, r, v] = await Promise.all([
        api.get("/products"), api.get("/categories"), api.get("/units"),
        api.get("/brands"), api.get("/racks"), api.get("/variations"),
      ]);
      setItems(p.data); setCats(c.data); setUnits(u.data || []);
      setBrands(b.data || []); setRacks(r.data || []); setVariations(v.data || []);
    } catch {
      toast.error("Failed to load products — backend may be down");
    }
  };
  useEffect(() => {
    api.post("/products/backfill-repack-parents").catch(() => {});
    load();
  }, []);

  const filtered = items.filter((p) => {
    if (p.repack_parent_id) return false;
    if (p.variant_name) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    if (p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s) || (p.barcode || "").includes(s)) return true;
    const rkids = repackChildren[p.id];
    if (rkids) return rkids.some((k) => k.name.toLowerCase().includes(s) || k.sku.toLowerCase().includes(s) || (k.barcode || "").includes(s));
    const vkids = variantChildren[p.id];
    if (vkids) return vkids.some((k) => k.name.toLowerCase().includes(s) || k.sku.toLowerCase().includes(s) || (k.barcode || "").includes(s));
    if (p.variant_group_id) {
      return items.some((i) => i.variant_group_id === p.variant_group_id && i.variant_name && (i.name.toLowerCase().includes(s) || i.sku.toLowerCase().includes(s) || (i.barcode || "").includes(s)));
    }
    return false;
  });

  const toggleExpand = async (id) => {
    if (expandedParents[id]) {
      setExpandedParents((prev) => ({ ...prev, [id]: false }));
      return;
    }
    if (!repackChildren[id]) {
      try {
        const res = await api.get(`/products/${id}/repack-children`);
        setRepackChildren((prev) => ({ ...prev, [id]: res.data }));
      } catch {}
    }
    const prod = items.find((p) => p.id === id);
    if (prod && prod.variant_group_id && !variantChildren[id]) {
      try {
        const res = await api.get(`/products/${id}/variants`);
        setVariantChildren((prev) => ({ ...prev, [id]: (res.data || []).filter((v) => v.id !== id) }));
      } catch {}
    }
    setExpandedParents((prev) => ({ ...prev, [id]: true }));
  };

  const onSave = async (form, targetId) => {
    try {
      const payload = {
        ...form,
        price: Number(form.price), cost: Number(form.cost || 0),
        tax_rate: Number(form.tax_rate || 0), stock: Number(form.stock || 0),
        low_stock_threshold: Number(form.low_stock_threshold || 5),
      };
      const id = targetId || modal?.edit?.id;
      if (id) {
        await api.patch(`/products/${id}`, payload);
        if (targetId && modal?.edit?.variant_group_id && targetId !== modal.edit.id) {
          const vars = await api.get(`/products/${modal.edit.id}/variants`);
          const total = (vars.data || []).filter((v) => v.id !== modal.edit.id).reduce((s, v) => s + Number(v.stock || 0), 0);
          await api.patch(`/products/${modal.edit.id}`, { stock: total });
        }
        toast.success(t("page.product_updated"));
      } else {
        const res = await api.post("/products", payload);
        const created = res.data;
        if (created.variants && created.variants.length > 0) {
          const parentStock = Number(form.stock || 0);
          const totalVariantStock = created.variants.reduce((s, v) => s + Number(v.stock || 0), 0);
          const remaining = Math.max(0, parentStock - totalVariantStock);
          if (remaining !== parentStock) {
            await api.patch(`/products/${created.product.id}`, { stock: remaining });
          }
          toast.success(t("page.product_created_with_variants", { count: created.variants.length }));
        } else {
          toast.success(t("page.product_created"));
        }
      }
      setModal(null); load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    }
  };

  const onDelete = async (p) => {
    const ok = await confirm(t("page.delete_confirm_item", { name: p.name }), t("common.confirm_delete")); if (!ok) return;
    await api.delete(`/products/${p.id}`);
    toast.success(t("page.deleted"));
    load();
  };

  return (
    <PageShell
      title={t("page.products")}
      subtitle={`${items.length} ${t("page.items").toLowerCase()} in ${t("page.products").toLowerCase()}`}
      right={
        <button
          onClick={() => setModal({ form: { ...EMPTY } })}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
          data-testid="add-product-btn"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.new_product")}
        </button>
      }
    >
      <div className="p-3 sm:p-6 overflow-y-auto h-full">
        <div className="mb-3 sm:mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("page.search_products")}
            className="w-full h-10 sm:h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-xs sm:text-sm"
            data-testid="products-search"
          />
        </div>

        {/* Desktop: Table view */}
        <div className="hidden md:block bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm min-w-[750px]">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("common.name")}</th>
                <th className="p-3 text-left">{t("page.sku")}</th>
                <th className="p-3 text-left">{t("page.barcode")}</th>
                <th className="p-3 text-left">{t("page.category")}</th>
                <th className="p-3 text-right">{t("page.price")}</th>
                <th className="p-3 text-right">{t("page.stock")}</th>
                <th className="p-3 text-right">{t("page.tax_rate")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const low = p.stock <= p.low_stock_threshold;
                const rkids = repackChildren[p.id];
                const vkids = variantChildren[p.id];
                const rCount = rkids?.length || 0;
                const vCount = vkids?.length || 0;
                const isOpen = expandedParents[p.id];
                return (
                  <React.Fragment key={p.id}>
                    <tr className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`row-${p.sku}`}>
                      <td className="p-3 font-semibold flex items-center gap-1">
                        {(rCount > 0 || p.variant_group_id) && (
                          <button onClick={() => toggleExpand(p.id)} className="p-0.5 hover:bg-zinc-200 rounded shrink-0">
                            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        )}
                        {p.name}
                        {rCount > 0 && <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{rCount} {t("page.packets")}</span>}
                        {vCount > 0 && <span className="ml-1 text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded">{vCount} {t("page.variant")}</span>}
                      </td>
                      <td className="p-3 font-mono text-xs">{p.sku}</td>
                      <td className="p-3 font-mono text-xs">{p.barcode || "-"}</td>
                      <td className="p-3 text-xs">{p.category || "-"}</td>
                      <td className="p-3 font-mono text-right font-bold">{formatMoney(p.price)}</td>
                      <td className={`p-3 font-mono text-right ${low ? "text-[#E60000] font-bold" : ""}`} style={{ lineHeight: 1.4 }}>
                        <div className="font-bold">{formatStock(p.stock, p.sell_by)}</div>
                        {p.sold_today > 0 && (
                          <div className="text-xs font-normal" style={{ color: "#888", borderTop: "1px dashed #ddd", paddingTop: 2, marginTop: 2 }}>
                            {t("page.total")}: {formatStock(p.stock + p.sold_today, p.sell_by)} &minus; {t("page.sold")}: {formatStock(p.sold_today, p.sell_by)}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-right">{p.tax_rate}%</td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => setBatchFor(p)}
                          className="p-1.5 hover:bg-zinc-200 mr-1 rounded" title={t("page.manage_batches")}
                          data-testid={`batch-${p.sku}`}
                        ><Calendar className="w-4 h-4" /></button>
                        <button onClick={() => setLabelFor(p)}
                          className="p-1.5 hover:bg-zinc-200 mr-1" title={t("page.print_barcode_labels")}
                          data-testid={`label-${p.sku}`}
                        ><Tag className="w-4 h-4" /></button>
                        <button onClick={() => setRepackFor(p)}
                          className="p-1.5 hover:bg-zinc-200 mr-1" title={t("page.repack_title")}
                          data-testid={`repack-${p.sku}`}
                        ><Package2 className="w-4 h-4" /></button>
                        <button onClick={() => setModal({ edit: p, form: { ...p, price: String(p.price), cost: String(p.cost), tax_rate: String(p.tax_rate), stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold), sell_by: p.sell_by || "pcs" } })}
                          className="p-1.5 hover:bg-zinc-200 mr-1"
                          data-testid={`edit-${p.sku}`}
                        ><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(p)}
                          className="p-1.5 hover:bg-red-100 text-[#E60000]"
                          data-testid={`delete-${p.sku}`}
                        ><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                    {isOpen && (rkids || []).map((kid) => {
                      const kLow = kid.stock <= kid.low_stock_threshold;
                      return (
                        <tr key={kid.id} className="bg-zinc-50 border-t border-zinc-100" data-testid={`child-${kid.sku}`}>
                          <td className="p-3 pl-8 font-semibold text-sm text-zinc-700">
                            <span className="text-[10px] text-zinc-400 mr-2 font-mono">&#9492;</span>{kid.name}
                          </td>
                          <td className="p-3 font-mono text-xs text-zinc-500">{kid.sku}</td>
                          <td className="p-3 font-mono text-xs">{kid.barcode || "-"}</td>
                          <td className="p-3 text-xs text-zinc-500">{kid.category || "-"}</td>
                          <td className="p-3 font-mono text-right font-bold text-zinc-700">{formatMoney(kid.price)}</td>
                          <td className={`p-3 font-mono text-right ${kLow ? "text-[#E60000] font-bold" : "text-zinc-700"}`}>{formatStock(kid.stock, kid.sell_by)}</td>
                          <td className="p-3 font-mono text-right text-zinc-500">{kid.tax_rate}%</td>
                          <td className="p-3 text-right">
                            <button onClick={() => setLabelFor(kid)}
                              className="p-1.5 hover:bg-zinc-200 mr-1" title={t("page.print_barcode_labels")}
                            ><Tag className="w-4 h-4" /></button>
                            <button onClick={() => setModal({ edit: kid, form: { ...kid, price: String(kid.price), cost: String(kid.cost), tax_rate: String(kid.tax_rate), stock: String(kid.stock), low_stock_threshold: String(kid.low_stock_threshold), sell_by: kid.sell_by || "pcs" } })}
                              className="p-1.5 hover:bg-zinc-200 mr-1"
                              data-testid={`edit-${kid.sku}`}
                            ><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(kid)}
                              className="p-1.5 hover:bg-red-100 text-[#E60000]"
                              data-testid={`delete-${kid.sku}`}
                            ><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {isOpen && p.variant_group_id && (vkids || []).map((v) => {
                      const vLow = v.stock <= v.low_stock_threshold;
                      return (
                        <tr key={v.id} className="bg-red-50/30 border-t border-zinc-100" data-testid={`variant-${v.sku}`}>
                          <td className="p-3 pl-8 font-semibold text-sm text-zinc-700">
                            <span className="text-[10px] text-zinc-400 mr-2 font-mono">&#9492;</span>{v.name}
                            <span className="ml-1.5 text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">{v.variant_name}</span>
                          </td>
                          <td className="p-3 font-mono text-xs text-zinc-500">{v.sku}</td>
                          <td className="p-3 font-mono text-xs">{v.barcode || "-"}</td>
                          <td className="p-3 text-xs text-zinc-500">{v.category || "-"}</td>
                          <td className="p-3 font-mono text-right font-bold text-zinc-700">{formatMoney(v.price)}</td>
                          <td className={`p-3 font-mono text-right ${vLow ? "text-[#E60000] font-bold" : "text-zinc-700"}`}>{formatStock(v.stock, v.sell_by)}</td>
                          <td className="p-3 font-mono text-right text-zinc-500">{v.tax_rate}%</td>
                          <td className="p-3 text-right">
                            <button onClick={() => setLabelFor(v)}
                              className="p-1.5 hover:bg-zinc-200 mr-1" title={t("page.print_barcode_labels")}
                            ><Tag className="w-4 h-4" /></button>
                            <button onClick={() => setModal({ edit: v, form: { ...v, price: String(v.price), cost: String(v.cost), tax_rate: String(v.tax_rate), stock: String(v.stock), low_stock_threshold: String(v.low_stock_threshold), sell_by: v.sell_by || "pcs" } })}
                              className="p-1.5 hover:bg-zinc-200 mr-1"
                              data-testid={`edit-${v.sku}`}
                            ><Edit3 className="w-4 h-4" /></button>
                            <button onClick={() => onDelete(v)}
                              className="p-1.5 hover:bg-red-100 text-[#E60000]"
                              data-testid={`delete-${v.sku}`}
                            ><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_products")}</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: Card view */}
        <div className="md:hidden space-y-2">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_products")}</div>
          ) : (
            filtered.map((p) => {
              const low = p.stock <= p.low_stock_threshold;
              const rkids = repackChildren[p.id];
              const vkids = variantChildren[p.id];
              const rCount = rkids?.length || 0;
              const vCount = vkids?.length || 0;
              const isOpen = expandedParents[p.id];
              return (
                <div key={p.id} className="bg-white border-2 border-zinc-200">
                  <div className="p-3 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate flex items-center gap-1">
                        {(rCount > 0 || p.variant_group_id) && (
                          <button onClick={() => toggleExpand(p.id)} className="p-0.5 hover:bg-zinc-200 rounded shrink-0">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {p.name}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {rCount > 0 && <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 px-1.5 py-0.5">{rCount} {t("page.packets")}</span>}
                        {vCount > 0 && <span className="text-[9px] font-bold uppercase tracking-widest bg-zinc-100 text-zinc-600 px-1.5 py-0.5">{vCount} {t("page.variant")}</span>}
                        <span className="text-[10px] font-mono text-zinc-400">{p.sku}</span>
                        {p.barcode && <span className="text-[10px] font-mono text-zinc-400">· {p.barcode}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-mono font-bold">{formatMoney(p.price)}</span>
                        <span className={`font-mono ${low ? "text-[#E60000] font-bold" : "text-zinc-600"}`}>Stk {formatStock(p.stock, p.sell_by)}</span>
                        <span className="font-mono text-zinc-500">{p.tax_rate}%</span>
                      </div>
                      {p.sold_today > 0 && (
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          {t("page.total")}: {formatStock(p.stock + p.sold_today, p.sell_by)} &minus; {t("page.sold")}: {formatStock(p.sold_today, p.sell_by)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => setBatchFor(p)} className="p-1.5 hover:bg-zinc-200 rounded" title={t("page.manage_batches")}><Calendar className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setLabelFor(p)} className="p-1.5 hover:bg-zinc-200" title={t("page.print_barcode_labels")}><Tag className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setRepackFor(p)} className="p-1.5 hover:bg-zinc-200" title={t("page.repack_title")}><Package2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setModal({ edit: p, form: { ...p, price: String(p.price), cost: String(p.cost), tax_rate: String(p.tax_rate), stock: String(p.stock), low_stock_threshold: String(p.low_stock_threshold), sell_by: p.sell_by || "pcs" } })}
                        className="p-1.5 hover:bg-zinc-200"><Edit3 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(p)} className="p-1.5 hover:bg-red-100 text-[#E60000]"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  {isOpen && (rkids || []).map((kid) => (
                    <div key={kid.id} className="border-t border-zinc-100 bg-zinc-50 px-3 py-2 pl-7 text-sm flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-700 truncate">{kid.name}</div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                          <span>{kid.sku}</span>
                          <span className={`${kid.stock <= kid.low_stock_threshold ? "text-[#E60000] font-bold" : ""}`}>Stk {formatStock(kid.stock, kid.sell_by)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setLabelFor(kid)} className="p-1 hover:bg-zinc-200"><Tag className="w-3 h-3" /></button>
                        <button onClick={() => setModal({ edit: kid, form: { ...kid, price: String(kid.price), cost: String(kid.cost), tax_rate: String(kid.tax_rate), stock: String(kid.stock), low_stock_threshold: String(kid.low_stock_threshold), sell_by: kid.sell_by || "pcs" } })}
                          className="p-1 hover:bg-zinc-200"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => onDelete(kid)} className="p-1 hover:bg-red-100 text-[#E60000]"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                  {isOpen && p.variant_group_id && (vkids || []).map((v) => (
                    <div key={v.id} className="border-t border-zinc-100 bg-red-50/30 px-3 py-2 pl-7 text-sm flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-700 truncate flex items-center gap-1">
                          {v.name} <span className="text-[9px] font-bold uppercase bg-zinc-100 text-zinc-500 px-1 py-0.5">{v.variant_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500">
                          <span>{v.sku}</span>
                          <span className={`${v.stock <= v.low_stock_threshold ? "text-[#E60000] font-bold" : ""}`}>Stk {formatStock(v.stock, v.sell_by)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setLabelFor(v)} className="p-1 hover:bg-zinc-200"><Tag className="w-3 h-3" /></button>
                        <button onClick={() => setModal({ edit: v, form: { ...v, price: String(v.price), cost: String(v.cost), tax_rate: String(v.tax_rate), stock: String(v.stock), low_stock_threshold: String(v.low_stock_threshold), sell_by: v.sell_by || "pcs" } })}
                          className="p-1 hover:bg-zinc-200"><Edit3 className="w-3 h-3" /></button>
                        <button onClick={() => onDelete(v)} className="p-1 hover:bg-red-100 text-[#E60000]"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </div>
      </div>

      {modal && (
        <ProductModal
          initial={modal.form}
          edit={!!modal.edit}
          cats={cats}
          units={units}
          brands={brands}
          racks={racks}
          variations={variations}
          allProducts={items}
          onClose={() => setModal(null)}
          onSave={onSave}
          onBrandCreated={(b) => setBrands(prev => [...prev, b])}
        />
      )}
      {labelFor && <BarcodeLabel product={labelFor} onClose={() => setLabelFor(null)} />}
      {repackFor && (
        <RepackModal
          product={repackFor}
          onClose={() => setRepackFor(null)}
          onDone={() => { setRepackFor(null); load(); }}
        />
      )}
      {batchFor && (
        <BatchManager product={batchFor} onClose={() => { setBatchFor(null); load(); }} />
      )}
    </PageShell>
  );
}

function RepackModal({ product, onClose, onDone }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ packet_weight: "1", packet_count: "10", packet_name: "", packet_price: "" });
  const [busy, setBusy] = useState(false);
  const total = Number(form.packet_weight || 0) * Number(form.packet_count || 0);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post(`/products/${product.id}/repack`, {
        source_product_id: product.id,
        packet_weight: Number(form.packet_weight),
        packet_count: Number(form.packet_count),
        packet_name: form.packet_name || null,
        packet_price: form.packet_price ? Number(form.packet_price) : null,
      });
      toast.success(t("page.created_packets", { count: form.packet_count }));
      onDone();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.repack_failed"));
    } finally { setBusy(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="repack-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.repack_title")}</div>
            <div className="font-display font-black uppercase">{product.name}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-5 space-y-4" onSubmit={submit}>
          <div className="bg-zinc-50 border border-zinc-300 p-3 text-xs font-mono">
            {t("page.available_bulk")}: <b>{product.stock} {product.unit}</b> · {t("page.rate")} ₹{product.price}/{product.unit}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.packet_size", { unit: product.unit })}</label>
              <input type="number" step="0.01" min="0" required value={form.packet_weight}
                onChange={(e) => setForm({ ...form, packet_weight: e.target.value })}
                data-testid="rp-weight" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.packet_count")}</label>
              <input type="number" min="1" required value={form.packet_count}
                onChange={(e) => setForm({ ...form, packet_count: e.target.value })}
                data-testid="rp-count" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.custom_packet_name")}</label>
            <input value={form.packet_name} onChange={(e) => setForm({ ...form, packet_name: e.target.value })}
              className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.custom_packet_price")}</label>
            <input type="number" step="0.01" value={form.packet_price} onChange={(e) => setForm({ ...form, packet_price: e.target.value })}
                placeholder={`${t("page.auto")} ≈ ₹${(Number(form.packet_weight || 0) * product.price * 1.15).toFixed(2)}`}
              className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
          </div>
          <div className="text-xs font-mono border-t-2 border-zinc-900 pt-2 flex justify-between">
            <span>{t("page.will_consume")}:</span><span className="font-bold">{total} {product.unit}</span>
          </div>
          <button type="submit" disabled={busy || total > product.stock} data-testid="rp-submit"
            className="w-full h-12 bg-[#E60000] text-white font-bold uppercase tracking-widest disabled:opacity-40">
            {busy ? t("page.creating") : t("page.create_packets")}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductModal({ initial, edit, cats, units, brands, racks, variations, allProducts, onClose, onSave, onBrandCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(initial);
  const [variants, setVariants] = useState([]);
  const [showVariants, setShowVariants] = useState(false);
  const [variantGroup, setVariantGroup] = useState([]);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [parentProductId, setParentProductId] = useState("");
  const [brandDialogOpen, setBrandDialogOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [localBrands, setLocalBrands] = useState(brands);
  const skuTouched = useRef(false);
  const upd = (k, v) => {
    if (k === "sku") skuTouched.current = true;
    setForm((prev) => ({ ...prev, [k]: v }));
  };

  useEffect(() => {
    if (!edit || !initial.variant_group_id) return;
    api.get(`/products/${initial.id}/variants`).then((r) => {
      const all = [initial, ...(r.data || [])];
      setVariantGroup(all);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (edit || skuTouched.current || !form.name?.trim()) return;
    const name = form.name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
    if (name.length >= 2) {
      const suffix = Math.floor(1000 + Math.random() * 9000);
      setForm((prev) => ({ ...prev, sku: `${name}-${suffix}` }));
    }
  }, [form.name]);

  const addVariant = () => {
    setVariants([...variants, { variant_name: "", sku: "", price: "", stock: "0" }]);
  };
  const updVariant = (i, k, v) => {
    const next = [...variants];
    next[i] = { ...next[i], [k]: v };
    setVariants(next);
  };
  const removeVariant = (i) => setVariants(variants.filter((_, idx) => idx !== i));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name?.trim()) { toast.error(t("page.name_required")); return; }
    if (!form.sku?.trim()) { toast.error(t("page.sku_required")); return; }
    if (!form.price || Number(form.price) <= 0) { toast.error(t("page.price_required")); return; }
    if (!edit && showVariants && variants.length > 0) {
      for (const v of variants) {
        if (!v.variant_name?.trim()) { toast.error(t("page.variant_name_required")); return; }
        if (!v.sku?.trim()) { toast.error(t("page.variant_sku_required")); return; }
        if (!v.price || Number(v.price) <= 0) { toast.error(t("page.variant_price_required")); return; }
      }
      const totalVariant = variants.reduce((s, v) => s + Number(v.stock || 0), 0);
      if (totalVariant > Number(form.stock || 0)) {
        toast.error(t("page.variant_stock_exceeds", { total: totalVariant, unit: form.unit, main: Number(form.stock || 0) }));
        return;
      }
    }
    let finalName = form.name.trim();
    if (form.size) {
      finalName = finalName + " " + form.size.trim() + form.unit;
    }
    const payload = {
      ...form,
      name: finalName,
      price: Number(form.price), cost: Number(form.cost || 0),
      tax_rate: Number(form.tax_rate || 0), stock: Number(form.stock || 0),
      low_stock_threshold: Number(form.low_stock_threshold || 5),
    };
    delete payload.size;
    if (!edit && showVariants && variants.length > 0) {
      payload.variants = variants.map(v => ({
        variant_name: v.variant_name,
        sku: v.sku,
        price: Number(v.price),
        stock: Number(v.stock || 0),
      }));
    }
    if (edit && parentProductId) {
      const parent = allProducts?.find((p) => p.id === parentProductId);
      if (parent) {
        const gid = parent.variant_group_id || crypto.randomUUID();
        payload.variant_group_id = gid;
        if (!parent.variant_group_id) {
          onSave({ variant_group_id: gid }, parentProductId);
        }
      }
    }
    onSave(payload, selectedVariantId);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-3xl bg-white border-2 border-zinc-900 max-h-[95vh] sm:max-h-[92vh] overflow-y-auto" data-testid="product-modal">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 bg-zinc-950 text-white sticky top-0 z-10">
          <div className="font-display font-black uppercase text-base sm:text-xl">{edit ? t("page.edit_product") : t("page.new_product")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        {edit && variantGroup.length > 1 && (
          <div className="mx-4 sm:mx-5 mt-3 sm:mt-4 relative">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.variant")} / {t("page.parent")}</label>
            <div className="relative">
              <select value={selectedVariantId || initial.id || ""} onChange={(e) => {
                const vid = e.target.value;
                setSelectedVariantId(vid);
                setParentProductId("");
                const v = variantGroup.find((x) => x.id === vid);
                if (v) setForm({ ...v, price: String(v.price), cost: String(v.cost || 0), tax_rate: String(v.tax_rate || 0), stock: String(v.stock || 0), low_stock_threshold: String(v.low_stock_threshold || 5) });
              }}
                className="w-full h-10 border-2 border-zinc-300 px-3 text-sm bg-white focus:outline-none focus:border-[#E60000] appearance-none pr-8">
                {variantGroup.map((v) => (
                  <option key={v.id} value={v.id}>{v.variant_name ? `${initial.name} — ${v.variant_name}` : `${v.name} (${t("page.parent")})`} — {t("page.stock")}: {v.stock} {v.unit}</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs">▾</span>
            </div>
          </div>
        )}
        {edit && variantGroup.length <= 1 && !initial.variant_group_id && allProducts?.length > 1 && (
          <div className="mx-4 sm:mx-5 mt-3 sm:mt-4">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("common.name")}</label>
            <div className="relative">
              <select value={parentProductId} onChange={(e) => setParentProductId(e.target.value)}
                className="w-full h-10 border-2 border-zinc-300 px-3 text-sm bg-white focus:outline-none focus:border-[#E60000] appearance-none pr-8">
                <option value="">{t("page.select_parent")}</option>
                {allProducts.filter((p) => p.id !== initial.id).map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none text-xs">▾</span>
            </div>
          </div>
        )}
        <form className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-3 sm:gap-y-4" onSubmit={handleSubmit}>
          {[
            { k: "name", label: t("common.name"), req: true, span: 2 },
            { k: "sku", label: t("page.sku"), req: true },
            { k: "category", label: t("page.category"), select: true },
            { k: "brand", label: "Brand", select: true },
            { k: "rack", label: "Rack", select: true },
            { k: "unit", label: t("page.unit"), select: true },
            { k: "sell_by", label: t("page.sell_by"), select: true },
          ].map((f) => (
            <div key={f.k} className={f.span === 2 ? "md:col-span-2" : ""}>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{f.label}{f.req && " *"}</label>
              {f.select ? (
                <Select key={f.k === "brand" ? `brand-${localBrands.length}` : undefined} value={form[f.k] || ""} onValueChange={(v) => {
                  if (f.k === "brand" && v === "__add_brand__") { setBrandDialogOpen(true); return; }
                  upd(f.k, v);
                }}>
                  <SelectTrigger data-testid={`pf-${f.k}`}
                    className="w-full h-10 text-sm border border-zinc-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded shadow-none [&>svg]:text-zinc-500">
                    <SelectValue placeholder={t("page.select_option")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-48 border border-zinc-200 rounded bg-white shadow-lg">
                    {f.k === "category" && cats.map((c) => <SelectItem key={c.id || c.name} value={c.name} className="text-sm">{c.name}</SelectItem>)}
                    {f.k === "unit" && (units.length ? units : UNITS).map((u) => <SelectItem key={u.unit_name || u} value={u.unit_name || u} className="text-sm">{u.unit_name || u}</SelectItem>)}
                    {f.k === "brand" && <>{localBrands.map((b) => <SelectItem key={b.id || b.name} value={b.name} className="text-sm">{b.name}</SelectItem>)}<Separator className="my-1" /><SelectItem value="__add_brand__" className="text-sm text-[#E60000] font-medium">+ Add Brand</SelectItem></>}
                    {f.k === "rack" && racks.map((r) => <SelectItem key={r.id || r.name} value={r.name} className="text-sm">{r.name}</SelectItem>)}
                    {f.k === "sell_by" && (units.length ? units : UNITS).map((u) => {
                      const val = u.unit_name || u;
                      return <SelectItem key={val} value={val} className="text-sm">{val}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              ) : (
                <input type="text" value={form[f.k] || ""} onChange={(e) => upd(f.k, e.target.value)} required={f.req}
                  data-testid={`pf-${f.k}`}
                  className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
              )}
            </div>
          ))}

          {/* Price / Cost / Tax Rate — 3 in one row */}
          <div className="md:col-span-2 grid grid-cols-3 gap-2 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.price")} *</label>
              <input type="number" value={form.price || ""} onChange={(e) => upd("price", e.target.value)} required
                data-testid="pf-price"
                className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.cost")}</label>
              <input type="number" value={form.cost || ""} onChange={(e) => upd("cost", e.target.value)}
                data-testid="pf-cost"
                className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.tax_rate")}</label>
              <input type="number" value={form.tax_rate || ""} onChange={(e) => upd("tax_rate", e.target.value)}
                data-testid="pf-tax_rate"
                className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
            </div>
          </div>

          {/* Stock / Low Stock Alert — 2 in one row */}
          <div className="md:col-span-2 grid grid-cols-2 gap-2 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.stock")}</label>
              <div className="relative">
                <input type="number" value={form.stock || ""} onChange={(e) => upd("stock", e.target.value)}
                  data-testid="pf-stock"
                  className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded pr-10" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold">{form.unit || "pcs"}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.low_stock_alert")}</label>
              <input type="number" value={form.low_stock_threshold || ""} onChange={(e) => upd("low_stock_threshold", e.target.value)}
                data-testid="pf-low_stock_threshold"
                className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
            </div>
          </div>

          {/* Image URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-600 mb-1">{t("page.image_url")}</label>
            <input type="text" value={form.image_url || ""} onChange={(e) => upd("image_url", e.target.value)}
              placeholder="https://..."
              data-testid="pf-image_url"
              className="w-full h-10 text-sm border border-zinc-300 px-3 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded" />
          </div>

          {!edit && (
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{t("page.select_pack_size")}</label>
              <div className="flex flex-wrap gap-1.5">
                {PACK_SIZES.map((ps) => (
                  <button key={ps.label} type="button" onClick={() => { upd("size", ps.size); upd("unit", ps.unit); upd("sell_by", "pcs"); }}
                    className={`px-3 py-1.5 text-xs font-bold rounded border transition-all ${form.size === ps.size && form.unit === ps.unit ? "bg-[#E60000] text-white border-[#E60000]" : "bg-white text-zinc-700 border-zinc-300 hover:border-[#E60000] hover:text-[#E60000]"}`}>
                    {ps.label}
                  </button>
                ))}
              </div>
              <div className="mt-2 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded">
                <span className="text-xs text-zinc-500 font-semibold">{t("page.product_name_preview")}: </span>
                <span className="text-sm font-bold text-zinc-900">{form.name.trim() || t("page.product_name")}{form.size ? ` ${form.size}${form.unit}` : ""}</span>
              </div>
            </div>
          )}

          {!edit && (
            <div className="md:col-span-2 border-t border-zinc-200 pt-4 mt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={showVariants} onChange={(e) => setShowVariants(e.target.checked)}
                  className="w-4 h-4 accent-[#E60000]" />
                <span className="text-sm font-semibold text-zinc-700">{t("page.has_variants")}</span>
              </label>

              {showVariants && (
                <div className="mt-3 space-y-2">
                  {variations.length > 0 && (
                    <div className="mb-3">
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Variation Template</label>
                      <Select value={form.variation_template || ""} onValueChange={(v) => {
                        const sel = variations.find((vt) => vt.id === v);
                        if (sel && sel.variation_values?.length) {
                          setVariants(sel.variation_values.map((vv) => ({
                            variant_name: vv, sku: form.sku ? `${form.sku}-${vv}` : "", price: form.price || "", stock: "0",
                          })));
                          upd("variation_template", sel.id);
                        } else {
                          upd("variation_template", "");
                        }
                      }}>
                        <SelectTrigger className="w-full h-10 text-sm border border-zinc-300 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] rounded shadow-none [&>svg]:text-zinc-500">
                          <SelectValue placeholder="-- Select --" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48 border border-zinc-200 rounded bg-white shadow-lg">
                          {variations.map((vt) => <SelectItem key={vt.id} value={vt.id} className="text-sm">{vt.variation_name} ({vt.variation_values?.join(", ")})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase tracking-widest text-zinc-500">{t("page.variants")}</span>
                    <button type="button" onClick={addVariant}
                      className="text-xs text-[#E60000] font-bold uppercase tracking-widest hover:underline">{t("page.add_variant")}</button>
                  </div>
                  {variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">{t("page.variant_name")}</label>
                        <input value={v.variant_name} onChange={(e) => updVariant(i, "variant_name", e.target.value)} placeholder="250gm"
                          className="w-full h-9 text-sm border border-zinc-300 px-2 rounded focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">{t("page.sku")}</label>
                        <input value={v.sku} onChange={(e) => updVariant(i, "sku", e.target.value)} placeholder="AMUL250"
                          className="w-full h-9 text-sm border border-zinc-300 px-2 rounded focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">{t("page.price")}</label>
                        <input type="number" value={v.price} onChange={(e) => updVariant(i, "price", e.target.value)} placeholder="30"
                          className="w-full h-9 text-sm border border-zinc-300 px-2 rounded focus:outline-none focus:border-[#E60000]" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-0.5">{t("page.stock")}</label>
                        <div className="relative">
                          <input type="number" value={v.stock} onChange={(e) => updVariant(i, "stock", e.target.value)} placeholder="0"
                            className="w-full h-9 text-sm border border-zinc-300 px-2 rounded focus:outline-none focus:border-[#E60000] pr-7" />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 font-semibold">{form.unit || "pcs"}</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeVariant(i)}
                        className="h-9 px-3 text-[#E60000] text-xs hover:bg-red-50 rounded">{t("page.remove")}</button>
                    </div>
                  ))}
                  {variants.length === 0 && <div className="text-xs text-zinc-400 py-2">{t("page.click_add_variant")}</div>}
                </div>
              )}
            </div>
          )}

          <div className="md:col-span-2 flex justify-end gap-3 pt-3 border-t border-zinc-200">
            <button type="button" onClick={onClose} className="h-10 px-5 border border-zinc-300 rounded text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50">{t("common.cancel")}</button>
            <button type="submit" data-testid="pf-save" className="h-10 px-5 bg-[#E60000] text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000]">
              {edit ? t("page.update") : t("page.create")}
            </button>
          </div>
        </form>

        <Dialog open={brandDialogOpen} onOpenChange={setBrandDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Add Brand</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <input type="text" value={newBrandName} onChange={(e) => setNewBrandName(e.target.value)}
                placeholder="Brand name"
                className="w-full h-10 text-sm border border-zinc-300 px-3 rounded focus:outline-none focus:ring-2 focus:ring-[#E60000]/30" />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => { setBrandDialogOpen(false); setNewBrandName(""); }}>Cancel</Button>
                <Button size="sm" className="bg-[#E60000] hover:bg-[#cc0000]" onClick={async () => {
                  if (!newBrandName.trim()) return;
                  const name = newBrandName.trim();
                  const tempBrand = { id: "new", name, created_at: new Date().toISOString() };
                  setLocalBrands((prev) => [...prev, tempBrand]);
                  upd("brand", name);
                  setBrandDialogOpen(false);
                  setNewBrandName("");
                  try {
                    const { data } = await api.post("/brands", { name });
                    setLocalBrands((prev) => prev.map((b) => b.id === "new" ? data : b));
                    if (onBrandCreated) onBrandCreated(data);
                  } catch (e) {
                    setLocalBrands((prev) => prev.filter((b) => b.id !== "new"));
                    upd("brand", "");
                    toast.error(e?.response?.data?.detail || "Failed to create brand");
                  }
                }}>Save</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

