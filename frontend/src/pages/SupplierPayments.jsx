import React, { useEffect, useState } from "react";
import { Plus, X, Search, Loader2, Trash2, ChevronDown, ChevronRight, Wallet, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api from "@/lib/api";
import { formatMoney, formatDate } from "@/lib/format";
import { PageShell } from "@/pages/Dashboard";
import { useConfirm } from "@/lib/confirm";

export default function SupplierPayments() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [payments, setPayments] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", amount: "", mode: "cash", note: "" });
  const [expanded, setExpanded] = useState({});
  const [detailSupplier, setDetailSupplier] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([api.get("/supplier-payments"), api.get("/suppliers")]);
      setPayments(p.data); setSuppliers(s.data);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.current_balance || 0), 0);
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const paidToday = payments
    .filter((p) => (p.created_at || "").slice(0, 10) === todayStr)
    .reduce((sum, p) => sum + (p.amount || 0), 0);
  const dueSuppliers = suppliers.filter((s) => (s.current_balance || 0) > 0).length;

  const grouped = {};
  for (const p of payments) {
    const key = p.supplier_id;
    if (!grouped[key]) grouped[key] = { supplier_id: key, supplier_name: p.supplier_name, payments: [] };
    grouped[key].payments.push(p);
  }
  let groups = Object.values(grouped).sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));

  if (q) {
    const s = q.toLowerCase();
    groups = groups.filter((g) => g.supplier_name.toLowerCase().includes(s));
    for (const g of groups) {
      g.payments = g.payments.filter((p) => (p.note || "").toLowerCase().includes(s));
    }
  }

  const toggleGroup = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const getBalance = (supplierId) => {
    const s = suppliers.find((x) => x.id === supplierId);
    return s ? s.current_balance : null;
  };

  const handleSave = async () => {
    if (!form.supplier_id || !form.amount) { toast.error(t("page.fill_required")); return; }
    setSaving(true);
    try {
      await api.post("/supplier-payments", { ...form, amount: Number(form.amount) });
      toast.success(t("page.payment_recorded"));
      setModal(false); setForm({ supplier_id: "", amount: "", mode: "cash", note: "" }); load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.save_failed")); } finally { setSaving(false); }
  };

  const handleQuickPay = async (supplierId) => {
    setForm({ supplier_id: supplierId, amount: "", mode: "cash", note: "" });
    setModal(true);
  };

  const handleDelete = async (id) => {
    if (!await confirm("Delete this payment? Balance will be reversed.")) return;
    try {
      await api.delete(`/supplier-payments/${id}`);
      toast.success(t("page.deleted"));
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || t("page.delete_failed")); }
  };

  return (
    <PageShell
      title={t("page.supplier_payments")}
      // subtitle={`${t("page.total_paid")}: ${formatMoney(totalPaid)} | ${t("page.paid_today")}: ${formatMoney(paidToday)}`}
      right={
        <button onClick={() => { setForm({ supplier_id: "", amount: "", mode: "cash", note: "" }); setModal(true); }}
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.record_payment")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("page.search_payments")}
            className="w-full h-11 border-2 border-zinc-300 pl-10 pr-4 focus:outline-none focus:border-[#E60000] font-mono text-sm" />
        </div>

        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr><th className="p-3 text-left">Supplier</th><th className="p-3 text-right">Balance</th><th className="p-3 text-right">Payments</th><th className="p-3 text-right">Total Paid</th><th className="p-3 text-center">Action</th></tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
              ) : groups.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-zinc-400">{t("page.no_supplier_payments")}</td></tr>
              ) : groups.map((g) => {
                const bal = getBalance(g.supplier_id) ?? 0;
                const totalForSupplier = g.payments.reduce((s, p) => s + (p.amount || 0), 0);
                const isOpen = expanded[g.supplier_id];
                return (
                  <React.Fragment key={g.supplier_id}>
                    <tr className="border-t border-zinc-200 bg-zinc-50 hover:bg-zinc-100 cursor-pointer" onClick={() => toggleGroup(g.supplier_id)}>
                      <td className="p-3 font-semibold flex items-center gap-2">
                        {isOpen ? <ChevronDown className="w-4 h-4 text-zinc-400" /> : <ChevronRight className="w-4 h-4 text-zinc-400" />}
                        {g.supplier_name}
                        <span className="text-[10px] font-mono text-zinc-400 ml-1">({g.payments.length})</span>
                      </td>
                      <td className={`p-3 font-mono text-right font-bold ${bal > 0 ? "text-[#E60000]" : "text-green-600"}`}>{formatMoney(bal)}</td>
                      <td className="p-3 font-mono text-right text-xs text-zinc-500">{g.payments.length}x</td>
                      <td className="p-3 font-mono text-right font-bold text-[#E60000]">{formatMoney(totalForSupplier)}</td>
                      <td className="p-3 text-center whitespace-nowrap">
                        <button onClick={(e) => { e.stopPropagation(); setDetailSupplier(g); }}
                          className="p-1.5 hover:bg-blue-100 text-blue-600 mr-1" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleQuickPay(g.supplier_id); }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-widest rounded hover:bg-emerald-700">
                          Pay
                        </button>
                      </td>
                    </tr>
                    {isOpen && g.payments.map((p) => (
                      <tr key={p.id} className="border-t border-zinc-100 hover:bg-zinc-50">
                        <td className="p-2 pl-10 text-xs font-mono text-zinc-500" colSpan={1}>{formatDate(p.created_at)}</td>
                        <td className="p-2 text-xs font-mono text-right text-zinc-400">-{formatMoney(p.amount)}</td>
                        <td className="p-2 text-xs font-mono text-right">{p.mode || p.payment_method}</td>
                        <td className="p-2 text-xs text-zinc-600 max-w-[160px] truncate">{p.note || "-"}</td>
                        <td className="p-2 text-center">
                          <button onClick={() => handleDelete(p.id)} className="p-1 rounded hover:bg-red-50 text-zinc-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detailSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetailSupplier(null)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div>
                <div className="font-display font-black uppercase text-lg">{detailSupplier.supplier_name}</div>
                <div className="text-xs text-zinc-400 mt-0.5">Payment Summary</div>
              </div>
              <button onClick={() => setDetailSupplier(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-200 p-4 text-center rounded">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-amber-700 mb-1">Total Due</div>
                  <div className="text-xl font-black font-mono text-amber-700">
                    {formatMoney(getBalance(detailSupplier.supplier_id) ?? 0)}
                  </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-4 text-center rounded">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-700 mb-1">Total Paid</div>
                  <div className="text-xl font-black font-mono text-emerald-700">
                    {formatMoney(detailSupplier.payments.reduce((s, p) => s + (p.amount || 0), 0))}
                  </div>
                </div>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded flex justify-between items-center">
                <span className="text-xs font-mono uppercase tracking-widest text-zinc-600">
                  {getBalance(detailSupplier.supplier_id) > 0 ? "Outstanding Balance" : "Balance Cleared"}
                </span>
                <span className={`font-mono font-bold text-lg ${getBalance(detailSupplier.supplier_id) > 0 ? "text-[#E60000]" : "text-green-700"}`}>
                  {formatMoney(getBalance(detailSupplier.supplier_id) ?? 0)}
                </span>
              </div>

              <div className="border-t border-zinc-200 pt-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Payment History ({detailSupplier.payments.length})</div>
                {detailSupplier.payments.length === 0 ? (
                  <div className="text-sm text-zinc-400 text-center py-4">No payments yet</div>
                ) : (
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {detailSupplier.payments.map((p) => (
                      <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-zinc-100 last:border-b-0">
                        <div>
                          <span className="text-xs font-mono text-zinc-500">{formatDate(p.created_at)}</span>
                          <span className="text-[10px] text-zinc-400 ml-2 uppercase">{p.mode}</span>
                        </div>
                        <div>
                          <span className="font-mono font-bold text-sm text-[#E60000]">{formatMoney(p.amount)}</span>
                          {p.note && <div className="text-[10px] text-zinc-400 text-right">{p.note}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={() => { setDetailSupplier(null); setForm({ supplier_id: detailSupplier.supplier_id, amount: "", mode: "cash", note: "" }); setModal(true); }}
                  className="h-11 px-5 bg-emerald-600 text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setModal(false)}>
          <div className="bg-white border-2 border-zinc-900 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-display font-black uppercase text-lg">{t("page.record_payment")}</div>
              <button onClick={() => setModal(false)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.supplier")} *</label>
                <select value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
                  <option value="">{t("page.select_supplier")}</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatMoney(s.current_balance || 0)})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.amount")} *</label>
                <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.payment_method")}</label>
                <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 bg-white focus:outline-none focus:border-[#E60000] text-sm">
                  <option value="cash">Cash</option><option value="bank_transfer">{t("page.bank_transfer")}</option>
                  <option value="cheque">Cheque</option><option value="upi">UPI</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.note")}</label>
                <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })}
                  className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setModal(false)} className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest">{t("common.cancel")}</button>
                <button onClick={handleSave} disabled={saving}
                  className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin inline" /> : t("common.save")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
