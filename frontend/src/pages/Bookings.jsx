import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, ArrowRightLeft, X, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

const EMPTY = {
  customer_name: "",
  customer_id: "",
  note: "",
  token_amount: "",
  deposit: "",
  items: [],
};

export default function Bookings() {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [modal, setModal] = useState(false);

  const load = async () => {
    try {
      const r = await api.get("/bookings");
      setRows(r.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_load"));
    }
  };
  useEffect(() => {
    load();
  }, []);

  return (
    <PageShell
      title={t("page.bookings")}
      subtitle={`${rows.length} ${t("page.bookings_count")}`}
      right={
        <button
          onClick={() => setModal(true)}
          data-testid="bk-new"
          className="h-11 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} /> {t("page.new_booking")}
        </button>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">{t("page.customer")}</th>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-right">{t("page.token_amount")}</th>
                <th className="p-3 text-right">{t("page.deposit")}</th>
                <th className="p-3 text-right">{t("page.balance")}</th>
                <th className="p-3 text-center">{t("page.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr
                  key={b.id}
                  className="border-t border-zinc-200 hover:bg-zinc-50"
                  data-testid={`bk-row-${b.id}`}
                >
                  <td className="p-3 font-mono text-xs">#{b.id}</td>
                  <td className="p-3 font-semibold">
                    {b.customer_name || b.customer_id || "Walk-in"}
                  </td>
                  <td className="p-3 font-mono text-xs">
                    {formatDate(b.created_at || b.date)}
                  </td>
                  <td className="p-3 font-mono text-right">
                    {formatMoney(b.token_amount)}
                  </td>
                  <td className="p-3 font-mono text-right">
                    {formatMoney(b.deposit)}
                  </td>
                  <td className="p-3 font-mono text-right font-bold">
                    {formatMoney((b.token_amount || 0) - (b.deposit || 0))}
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${b.status === "converted" ? "text-green-700 bg-green-50 border-green-300" : "text-[#E60000] bg-red-50 border-red-300"}`}
                    >
                      {b.status === "converted"
                        ? t("page.converted")
                        : t("page.open")}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {b.status !== "converted" && (
                      <button
                        onClick={async () => {
                          try {
                            await api.post(`/bookings/${b.id}/convert`);
                            toast.success(t("page.convert_to_sale"));
                            load();
                          } catch (e2) {
                            toast.error(
                              e2?.response?.data?.detail ||
                                t("page.convert_failed"),
                            );
                          }
                        }}
                        data-testid={`bk-convert-${b.id}`}
                        className="p-1.5 hover:bg-zinc-200"
                        title={t("page.convert_to_sale")}
                      >
                        <ArrowRightLeft className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-zinc-500 font-mono text-sm"
                  >
                    {t("page.no_bookings")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <BookingModal
          onClose={() => setModal(false)}
          onDone={() => {
            setModal(false);
            load();
          }}
          t={t}
        />
      )}
    </PageShell>
  );
}

function BookingModal({ onClose, onDone, t }) {
  const [form, setForm] = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get("/products")
      .then((r) => setProducts(r.data))
      .catch(() => {});
  }, []);

  const upd = (k, v) => setForm({ ...form, [k]: v });
  const addItem = () =>
    setForm({
      ...form,
      items: [...form.items, { product_id: "", price: "", qty: "1" }],
    });
  const setItem = (i, k, v) => {
    const items = form.items.slice();
    items[i] = { ...items[i], [k]: v };
    if (k === "product_id") {
      const p = products.find((x) => String(x.id) === String(v));
      if (p) items[i].price = String(p.price);
    }
    setForm({ ...form, items });
  };
  const removeItem = (i) =>
    setForm({ ...form, items: form.items.filter((_, j) => j !== i) });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/bookings", {
        customer_name: form.customer_name || null,
        customer_id: form.customer_id ? Number(form.customer_id) : null,
        note: form.note || null,
        token_amount: Number(form.token_amount || 0),
        deposit: Number(form.deposit || 0),
        items: form.items.map((it) => ({
          product_id: Number(it.product_id),
          price: Number(it.price || 0),
          qty: Number(it.qty || 1),
        })),
      });
      toast.success(t("page.booking_created"));
      onDone();
    } catch (e2) {
      toast.error(e2?.response?.data?.detail || t("page.create_failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div
        className="w-full max-w-2xl bg-white border-2 border-zinc-900"
        data-testid="bk-modal"
      >
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">
            {t("page.new_booking")}
          </div>
          <button
            onClick={onClose}
            data-testid="bk-close"
            className="p-1 hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="p-5 space-y-4 overflow-y-auto max-h-[80vh]"
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                {t("page.customer_name_label")}
              </label>
              <input
                value={form.customer_name}
                onChange={(e) => upd("customer_name", e.target.value)}
                data-testid="bk-customer-name"
                className="w-full h-11 border-2 border-zinc-300 px-3 focus:outline-none focus:border-[#E60000] text-sm"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                {t("page.customer_id_label")}
              </label>
              <input
                type="number"
                value={form.customer_id}
                onChange={(e) => upd("customer_id", e.target.value)}
                data-testid="bk-customer-id"
                className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                {t("page.token_amount")}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.token_amount}
                onChange={(e) => upd("token_amount", e.target.value)}
                data-testid="bk-token"
                className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
                {t("page.deposit")}
              </label>
              <input
                type="number"
                step="0.01"
                value={form.deposit}
                onChange={(e) => upd("deposit", e.target.value)}
                data-testid="bk-deposit"
                className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                {t("page.items")}
              </label>
              <button
                type="button"
                onClick={addItem}
                data-testid="bk-add-item"
                className="text-xs font-bold uppercase tracking-widest text-[#E60000] flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> {t("page.add_item")}
              </button>
            </div>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div
                  key={i}
                  className="grid grid-cols-12 gap-2 items-center"
                  data-testid={`bk-item-${i}`}
                >
                  <select
                    value={it.product_id}
                    onChange={(e) => setItem(i, "product_id", e.target.value)}
                    data-testid={`bk-item-prod-${i}`}
                    className="col-span-5 h-11 border-2 border-zinc-300 px-2 bg-white focus:outline-none focus:border-[#E60000] text-sm"
                  >
                    <option value="">{t("page.select_option")}</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    value={it.price}
                    onChange={(e) => setItem(i, "price", e.target.value)}
                    data-testid={`bk-item-price-${i}`}
                    placeholder={t("page.price")}
                    className="col-span-3 h-11 border-2 border-zinc-300 px-2 font-mono focus:outline-none focus:border-[#E60000]"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={it.qty}
                    onChange={(e) => setItem(i, "qty", e.target.value)}
                    data-testid={`bk-item-qty-${i}`}
                    placeholder={t("page.qty")}
                    className="col-span-3 h-11 border-2 border-zinc-300 px-2 font-mono focus:outline-none focus:border-[#E60000]"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    data-testid={`bk-item-remove-${i}`}
                    className="col-span-1 p-2 hover:bg-red-100 text-[#E60000]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {form.items.length === 0 && (
                <div className="text-xs text-zinc-500 font-mono">
                  {t("page.no_items_added")}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">
              {t("page.note")}
            </label>
            <textarea
              value={form.note}
              onChange={(e) => upd("note", e.target.value)}
              data-testid="bk-note"
              rows={2}
              className="w-full border-2 border-zinc-300 px-3 py-2 focus:outline-none focus:border-[#E60000] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              data-testid="bk-cancel"
              className="h-11 px-5 border-2 border-zinc-300 text-xs font-bold uppercase tracking-widest"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              data-testid="bk-save"
              className="h-11 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest disabled:opacity-40"
            >
              {busy ? t("page.saving") : t("page.create_booking")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
