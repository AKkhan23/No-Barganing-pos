import React, { useEffect, useState } from "react";
import { Plus, Edit3, Trash2, X, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { useConfirm } from "../lib/confirm";
import { PageShell } from "./Dashboard";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  delivered: "bg-zinc-100 text-zinc-600",
};

const EMPTY = {
  customer_name: "",
  customer_phone: "",
  product_name: "",
  product_serial: "",
  issue_description: "",
  status: "pending",
  cost: "",
  notes: "",
  received_date: todayISO(),
  delivery_date: "",
};

export default function Servicing() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState("");
  const confirm = useConfirm();

  const load = async () => {
    try {
      const r = await api.get("/servicing");
      setItems(r.data);
    } catch {}
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = items.filter(
    (c) =>
      (c.customer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (c.product_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  const onSave = async (form) => {
    try {
      const payload = { ...form, cost: parseFloat(form.cost) || 0 };
      if (modal?.edit) {
        await api.patch(`/servicing/${modal.edit.id}`, payload);
        toast.success(t("page.servicing_updated"));
      } else {
        await api.post("/servicing", payload);
        toast.success(t("page.servicing_created"));
      }
      setModal(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    }
  };

  const onDelete = async (item) => {
    const ok = await confirm(
      t("page.delete_confirm", { name: item.customer_name }),
      t("page.delete_title"),
    );
    if (!ok) return;
    try {
      await api.delete(`/servicing/${item.id}`);
      toast.success(t("page.deleted"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.delete_failed"));
    }
  };

  const onStatusChange = async (item, newStatus) => {
    try {
      await api.patch(`/servicing/${item.id}/status`, { status: newStatus });
      toast.success(t("page.status_updated"));
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.save_failed"));
    }
  };

  return (
    <PageShell title={t("page.servicing")} subtitle={t("page.servicing_sub")}>
      <div className="p-6 h-full overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#E60000]/10 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-[#E60000]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </div>
            <div>
              <div className="font-display font-black text-lg">
                {items.length} {t("page.servicing")}
              </div>
              <div className="text-xs text-zinc-500">
                {t("page.total_servicing")}
              </div>
            </div>
          </div>
          <button
            onClick={() => setModal({ edit: null, form: { ...EMPTY } })}
            className="h-10 px-5 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> {t("page.add_servicing")}
          </button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("page.search_servicing")}
            className="w-full h-10 pl-10 pr-4 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000]"
          />
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.customer_name")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.product")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.serial")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.issue")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.status")}
                </th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.cost")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.received")}
                </th>
                <th className="p-4 text-left font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.delivery")}
                </th>
                <th className="p-4 text-right font-mono text-[10px] uppercase tracking-widest text-zinc-500">
                  {t("page.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50 transition-colors"
                >
                  <td className="p-4 font-medium">{c.customer_name}</td>
                  <td className="p-4 text-sm text-zinc-500">
                    {c.product_name || "-"}
                  </td>
                  <td className="p-4 text-sm text-zinc-500 font-mono">
                    {c.product_serial || "-"}
                  </td>
                  <td className="p-4 text-sm text-zinc-500 max-w-[200px] truncate">
                    {c.issue_description || "-"}
                  </td>
                  <td className="p-4">
                    <select
                      value={c.status || "pending"}
                      onChange={(e) => onStatusChange(c, e.target.value)}
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded border-0 cursor-pointer ${STATUS_STYLES[c.status] || STATUS_STYLES.pending}`}
                    >
                      <option value="pending">{t("page.pending")}</option>
                      <option value="in_progress">
                        {t("page.in_progress")}
                      </option>
                      <option value="completed">{t("page.completed")}</option>
                      <option value="delivered">{t("page.delivered")}</option>
                    </select>
                  </td>
                  <td className="p-4 text-right font-semibold">
                    ₹{(c.cost || 0).toFixed(2)}
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {c.received_date
                      ? new Date(c.received_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4 text-sm text-zinc-500">
                    {c.delivery_date
                      ? new Date(c.delivery_date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() =>
                        setModal({
                          edit: c,
                          form: {
                            customer_name: c.customer_name,
                            customer_phone: c.customer_phone || "",
                            product_name: c.product_name || "",
                            product_serial: c.product_serial || "",
                            issue_description: c.issue_description || "",
                            status: c.status || "pending",
                            cost: c.cost || "",
                            notes: c.notes || "",
                            received_date: c.received_date
                              ? c.received_date.slice(0, 10)
                              : todayISO(),
                            delivery_date: c.delivery_date
                              ? c.delivery_date.slice(0, 10)
                              : "",
                          },
                        })
                      }
                      className="p-2 hover:bg-zinc-100 rounded-lg mr-1 transition-colors"
                      title={t("page.edit")}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(c)}
                      className="p-2 hover:bg-red-50 rounded-lg text-[#E60000] transition-colors"
                      title={t("page.delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-12 text-center">
                    <div className="text-zinc-300 mb-2">
                      <svg
                        className="w-12 h-12 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                    </div>
                    <div className="text-zinc-400 font-medium mb-1">
                      {search ? t("page.no_matching") : t("page.no_servicing")}
                    </div>
                    <div className="text-zinc-400 text-sm">
                      {search
                        ? t("page.try_different")
                        : t("page.click_add_servicing")}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="w-full max-w-lg bg-white rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-zinc-200">
              <div>
                <div className="font-display font-black uppercase text-lg">
                  {modal.edit
                    ? t("page.edit_servicing")
                    : t("page.new_servicing")}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {modal.edit
                    ? t("page.update_servicing_details")
                    : t("page.add_servicing_prompt")}
                </div>
              </div>
              <button
                onClick={() => setModal(null)}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form
              className="p-5 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                onSave(modal.form);
              }}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.customer_name")}{" "}
                    <span className="text-[#E60000]">*</span>
                  </label>
                  <input
                    value={modal.form.customer_name}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, customer_name: e.target.value },
                      })
                    }
                    required
                    placeholder={t("page.enter_customer_name")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.phone")}
                  </label>
                  <input
                    value={modal.form.customer_phone}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, customer_phone: e.target.value },
                      })
                    }
                    placeholder={t("page.enter_phone")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.product_name")}{" "}
                    <span className="text-[#E60000]">*</span>
                  </label>
                  <input
                    value={modal.form.product_name}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, product_name: e.target.value },
                      })
                    }
                    required
                    placeholder={t("page.enter_product_name")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.serial_number")}
                  </label>
                  <input
                    value={modal.form.product_serial}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, product_serial: e.target.value },
                      })
                    }
                    placeholder={t("page.enter_serial")}
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  {t("page.issue_description")}{" "}
                  <span className="text-[#E60000]">*</span>
                </label>
                <textarea
                  value={modal.form.issue_description}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      form: {
                        ...modal.form,
                        issue_description: e.target.value,
                      },
                    })
                  }
                  rows={3}
                  required
                  placeholder={t("page.describe_issue")}
                  className="w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.status")} <span className="text-[#E60000]">*</span>
                  </label>
                  <select
                    value={modal.form.status}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, status: e.target.value },
                      })
                    }
                    required
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  >
                    <option value="pending">{t("page.pending")}</option>
                    <option value="in_progress">{t("page.in_progress")}</option>
                    <option value="completed">{t("page.completed")}</option>
                    <option value="delivered">{t("page.delivered")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.cost")}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={modal.form.cost}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, cost: e.target.value },
                      })
                    }
                    placeholder="0.00"
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.received_date")}{" "}
                    <span className="text-[#E60000]">*</span>
                  </label>
                  <input
                    type="date"
                    value={modal.form.received_date}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, received_date: e.target.value },
                      })
                    }
                    required
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                    {t("page.delivery_date")}
                  </label>
                  <input
                    type="date"
                    value={modal.form.delivery_date}
                    onChange={(e) =>
                      setModal({
                        ...modal,
                        form: { ...modal.form, delivery_date: e.target.value },
                      })
                    }
                    className="w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">
                  {t("page.notes")}
                </label>
                <textarea
                  value={modal.form.notes}
                  onChange={(e) =>
                    setModal({
                      ...modal,
                      form: { ...modal.form, notes: e.target.value },
                    })
                  }
                  rows={3}
                  placeholder={t("page.enter_notes")}
                  className="w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="h-11 px-6 border border-zinc-300 rounded-lg text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  {t("page.cancel")}
                </button>
                <button
                  type="submit"
                  className="h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors"
                >
                  {modal.edit ? t("page.update") : t("page.add")}{" "}
                  {t("page.servicing_entry")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
