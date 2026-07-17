import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Search, Shield } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

const PERMISSION_GROUPS = [
  { label: "POS", perms: ["pos.access"] },
  { label: "Orders", perms: ["orders.read", "orders.create", "orders.edit", "orders.delete"] },
  { label: "Products", perms: ["products.read", "products.create", "products.edit", "products.delete"] },
  { label: "Customers", perms: ["customers.read", "customers.create", "customers.edit", "customers.delete"] },
  { label: "Suppliers", perms: ["suppliers.read", "suppliers.create", "suppliers.edit", "suppliers.delete"] },
  { label: "Purchases", perms: ["purchases.read", "purchases.create", "purchases.edit", "purchases.delete"] },
  { label: "Purchase Returns", perms: ["purchase_returns.read", "purchase_returns.create", "purchase_returns.edit", "purchase_returns.delete"] },
  { label: "Sale Returns", perms: ["sale_returns.read", "sale_returns.create", "sale_returns.edit", "sale_returns.delete"] },
  { label: "Inventory", perms: ["inventory.read", "inventory.create", "inventory.edit", "inventory.delete"] },
  { label: "Expenses", perms: ["expenses.read", "expenses.create", "expenses.edit", "expenses.delete"] },
  { label: "Income", perms: ["income.read", "income.create", "income.edit", "income.delete"] },
  { label: "Accounts", perms: ["accounts.read", "accounts.create", "accounts.edit", "accounts.delete"] },
  { label: "Reports", perms: ["reports.read"] },
  { label: "Attendance", perms: ["attendance.read", "attendance.create", "attendance.edit"] },
  { label: "Payroll", perms: ["payroll.read", "payroll.create", "payroll.edit"] },
  { label: "Bookings", perms: ["bookings.read", "bookings.create", "bookings.edit", "bookings.delete"] },
  { label: "Quotations", perms: ["quotations.read", "quotations.create", "quotations.edit", "quotations.delete"] },
  { label: "Transfers", perms: ["transfers.read", "transfers.create", "transfers.edit", "transfers.delete"] },
  { label: "Promotions", perms: ["promotions.read", "promotions.create", "promotions.edit", "promotions.delete"] },
  { label: "Customer Groups", perms: ["customer_groups.read", "customer_groups.create", "customer_groups.edit", "customer_groups.delete"] },
  { label: "Delivery Partners", perms: ["delivery_partners.read", "delivery_partners.create", "delivery_partners.edit", "delivery_partners.delete"] },
  { label: "Warranties", perms: ["warranties.read", "warranties.create", "warranties.edit", "warranties.delete"] },
  { label: "Fixed Assets", perms: ["fixed_assets.read", "fixed_assets.create", "fixed_assets.edit", "fixed_assets.delete"] },
  { label: "Installments", perms: ["installments.read", "installments.create", "installments.edit", "installments.delete"] },
  { label: "Settings", perms: ["settings.read", "settings.edit"] },
  { label: "Users", perms: ["users.read", "users.create", "users.edit", "users.delete"] },
  { label: "Roles", perms: ["roles.read", "roles.create", "roles.edit", "roles.delete"] },
  { label: "Outlets", perms: ["outlets.read", "outlets.create", "outlets.edit", "outlets.delete"] },
  { label: "Servicing", perms: ["servicing.read", "servicing.create", "servicing.edit", "servicing.delete"] },
  { label: "Deposits", perms: ["deposits.read", "deposits.create", "deposits.edit", "deposits.delete"] },
  { label: "Registers", perms: ["registers.read", "registers.create", "registers.edit", "registers.delete"] },
  { label: "Check In/Out", perms: ["check_in_out.read", "check_in_out.create"] },
];

const ALL_PERMS = PERMISSION_GROUPS.flatMap((g) => g.perms);

function permsToObj(arr) {
  const obj = {};
  ALL_PERMS.forEach((p) => { obj[p] = false; });
  (arr || []).forEach((p) => { obj[p] = true; });
  return obj;
}

function objToPerms(obj) {
  return ALL_PERMS.filter((p) => obj[p]);
}

const EMPTY = { name: "", description: "", permissions: permsToObj([]) };

export default function Roles() {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    try { const r = await api.get("/roles"); setItems(r.data); } catch {}
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(
    (c) =>
      (c.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const onSave = async (form) => {
    try {
      const payload = { name: form.name, description: form.description, permissions: objToPerms(form.permissions) };
      if (modal?.edit) {
        await api.patch(`/roles/${modal.edit.id}`, payload);
        toast.success("Role updated");
      } else {
        await api.post("/roles", payload);
        toast.success("Role created");
      }
      setModal(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const onDelete = async (item) => {
    const ok = await confirm(`Delete role "${item.name}"?`, "Delete?"); if (!ok) return;
    try { await api.delete(`/roles/${item.id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  const togglePerm = (perm) => {
    setModal({ ...modal, form: { ...modal.form, permissions: { ...modal.form.permissions, [perm]: !modal.form.permissions[perm] } } });
  };

  const toggleGroup = (group, val) => {
    const perms = { ...modal.form.permissions };
    group.perms.forEach((p) => { perms[p] = val; });
    setModal({ ...modal, form: { ...modal.form, permissions: perms } });
  };

  const groupAllChecked = (group) => group.perms.every((p) => modal.form.permissions[p]);
  const groupSomeChecked = (group) => group.perms.some((p) => modal.form.permissions[p]);

  return (
    <PageShell title="Roles" subtitle="Manage user roles & permissions">
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#E60000]" />
            </div>
            <div>
              <div className="font-display font-black text-lg">{items.length} Roles</div>
              <div className="text-xs text-zinc-500">Total system roles</div>
            </div>
          </div>
          <button onClick={() => setModal({ edit: null, form: { ...EMPTY, permissions: permsToObj([]) } })}
            className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Role
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search roles..."
            className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]"
          />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Name</th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">Description</th>
                <th className="p-4 text-center font-mono text-[10px] uppercase tracking-widest text-zinc-500">Permissions</th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors">
                  <td className="p-4 font-medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ["#E60000", "#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899"][i % 6] }} />
                      {c.name}
                      {c.is_system && <span className="ml-2 text-[10px] font-mono uppercase tracking-widest bg-zinc-800 text-white px-2 py-0.5 rounded font-bold">System</span>}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-zinc-500">{c.description || "-"}</td>
                  <td className="p-4 text-center">
                    <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-2.5 py-1 rounded-full">{c.permissions?.length || 0} perms</span>
                  </td>
                  <td className="p-4 text-right">
                    <button onClick={() => setModal({ edit: c, form: { name: c.name, description: c.description || "", permissions: permsToObj(c.permissions) } })}
                      className="p-2 hover:bg-zinc-100 rounded-lg mr-1 transition-colors" title="Edit"><Edit3 className="w-4 h-4" /></button>
                    {!c.is_system && (
                      <button onClick={() => onDelete(c)}
                        className="p-2 hover:bg-red-50 rounded-lg text-[#E60000] transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={4} className="p-12 text-center">
                  <div className="text-zinc-300 mb-2"><Shield className="w-12 h-12 mx-auto" strokeWidth={1} /></div>
                    <div className="text-zinc-400 font-medium mb-1">{search ? "No matching roles" : "No roles yet"}</div>
                  <div className="text-zinc-400 text-sm">{search ? "Try a different search" : "Click Add Role to create one"}</div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="w-full max-w-3xl bg-white rounded-xl shadow-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div>
                <div className="font-display font-black uppercase text-lg">{modal.edit ? "Edit Role" : "New Role"}</div>
                <div className="text-xs text-zinc-500 mt-0.5">{modal.edit ? "Update role details & permissions" : "Create a new role with permissions"}</div>
              </div>
              <button onClick={() => setModal(null)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <form className="p-5 space-y-5 overflow-y-auto flex-1" onSubmit={(e) => { e.preventDefault(); onSave(modal.form); }}>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Role Name <span className="text-[#E60000]">*</span></label>
                  <input value={modal.form.name} onChange={(e) => setModal({ ...modal, form: { ...modal.form, name: e.target.value } })} required placeholder="Enter role name"
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Description</label>
                  <textarea value={modal.form.description} onChange={(e) => setModal({ ...modal, form: { ...modal.form, description: e.target.value } })} rows={2} placeholder="Enter role description"
                    className="w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-zinc-600">Permissions</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { const p = {}; ALL_PERMS.forEach((x) => { p[x] = true; }); setModal({ ...modal, form: { ...modal.form, permissions: p } }); }}
                      className="text-[10px] font-mono uppercase tracking-widest text-[#E60000] font-bold hover:underline">Select All</button>
                    <span className="text-zinc-300">|</span>
                    <button type="button" onClick={() => { const p = {}; ALL_PERMS.forEach((x) => { p[x] = false; }); setModal({ ...modal, form: { ...modal.form, permissions: p } }); }}
                      className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold hover:underline">Clear All</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {PERMISSION_GROUPS.map((group) => (
                    <div key={group.label} className="border border-zinc-200 rounded-lg p-3">
                      <label className="flex items-center gap-2 mb-2 pb-2 border-b border-zinc-100 cursor-pointer">
                        <input type="checkbox"
                          checked={groupAllChecked(group)}
                          ref={(el) => { if (el) el.indeterminate = groupSomeChecked(group) && !groupAllChecked(group); }}
                          onChange={(e) => toggleGroup(group, e.target.checked)}
                          className="w-4 h-4 rounded border-zinc-300 text-[#E60000] focus:ring-[#E60000]/30" />
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-700">{group.label}</span>
                      </label>
                      <div className="space-y-1.5">
                        {group.perms.map((perm) => (
                          <label key={perm} className="flex items-center gap-2 cursor-pointer pl-1">
                            <input type="checkbox" checked={!!modal.form.permissions[perm]} onChange={() => togglePerm(perm)}
                              className="w-3.5 h-3.5 rounded border-zinc-300 text-[#E60000] focus:ring-[#E60000]/30" />
                            <span className="text-[11px] text-zinc-600">{perm.split(".").pop()}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-zinc-200">
                <button type="button" onClick={() => setModal(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors">Cancel</button>
                <button type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors">
                  {modal.edit ? "Update" : "Add"} Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
