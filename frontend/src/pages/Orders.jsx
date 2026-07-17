import React, { useEffect, useState } from "react";
import { Eye, X, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

export default function Orders() {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [detail, setDetail] = useState(null);
  const [sym, setSym] = useState("₹");
  const [payFilter, setPayFilter] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waBusy, setWaBusy] = useState(false);

  useEffect(() => {
    const load = async () => {
      const params = payFilter ? { payment_mode: payFilter } : {};
      const r = await api.get("/orders", { params });
      setOrders(r.data);
    };
    load();
  }, [payFilter]);
  useEffect(() => { api.get("/settings").then(r => setSym(r.data.currency_symbol || "₹")); }, []);

  const sendWhatsApp = async (o) => {
    if (!waPhone.trim()) {
      toast.error(t("page.enter_customer_phone"));
      return;
    }
    setWaBusy(true);
    try {
      const message =
        `Invoice ${o.invoice_no}\nTotal: ${formatMoney(o.total, sym)}\nThank you for your purchase!`;
      await api.post("/whatsapp/send", {
        phone: waPhone.trim(),
        message,
        invoice_no: o.invoice_no,
      });
      toast.success(t("page.sent_on_whatsapp"));
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("page.failed_to_send"));
    } finally { setWaBusy(false); }
  };

  return (
    <PageShell
      title={t("page.order_list")}
      subtitle={`${orders.length} ${t("page.items").toLowerCase()}`}
      right={
        <select
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value)}
          className="h-11 border-2 border-zinc-300 px-3 text-sm bg-white focus:outline-none focus:border-[#E60000]"
          data-testid="orders-pay-filter"
        >
          <option value="">{t("page.all")} {t("page.payment_mode")}</option>
          <option value="cash">{t("page.cash")}</option>
          <option value="card">{t("page.card")}</option>
          <option value="upi">{t("page.upi")}</option>
          <option value="wallet">{t("page.wallet")}</option>
        </select>
      }
    >
      <div className="p-6 overflow-y-auto h-full">
        <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-100 uppercase text-[10px] tracking-widest">
              <tr>
                <th className="p-3 text-left">{t("page.invoice")}</th>
                <th className="p-3 text-left">{t("page.date")}</th>
                <th className="p-3 text-left">{t("page.cashier")}</th>
                <th className="p-3 text-left">{t("page.customer")}</th>
                <th className="p-3 text-left">{t("page.payment_mode")}</th>
                <th className="p-3 text-right">{t("page.items")}</th>
                <th className="p-3 text-right">{t("page.total")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-t border-zinc-200 hover:bg-zinc-50" data-testid={`order-${o.invoice_no}`}>
                  <td className="p-3 font-mono font-bold">{o.invoice_no}</td>
                  <td className="p-3 font-mono text-xs">{formatDate(o.created_at)}</td>
                  <td className="p-3 text-xs">{o.cashier_name}</td>
                  <td className="p-3 text-xs">{o.customer_name || t("page.no_customer")}</td>
                  <td className="p-3">
                    <span className="inline-block px-2 py-0.5 bg-zinc-100 border border-zinc-300 text-[10px] font-mono uppercase tracking-widest">
                      {o.payment_mode}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-right">{o.items.length}</td>
                  <td className="p-3 font-mono text-right font-bold">{formatMoney(o.total, sym)}</td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setDetail(o)}
                      className="p-1.5 hover:bg-zinc-200"
                      data-testid={`view-${o.invoice_no}`}
                    ><Eye className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-zinc-500 font-mono text-sm">{t("page.no_orders")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white border-2 border-zinc-900" data-testid="order-detail-modal">
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.invoice")}</div>
                <div className="font-display font-black uppercase text-lg">{detail.invoice_no}</div>
              </div>
              <button onClick={() => setDetail(null)} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5">
              <div className="text-xs font-mono text-zinc-600 mb-3">
                {formatDate(detail.created_at)} · {t("page.cashier")}: {detail.cashier_name}<br />
                {t("page.customer")}: {detail.customer_name || t("page.no_customer")} · {t("page.payment_mode")}: {detail.payment_mode.toUpperCase()}{detail.counter_name ? ` · Counter: ${detail.counter_name}` : ""}{detail.delivery_partner_name ? ` · Delivery: ${detail.delivery_partner_name}` : ""}
              </div>
              <table className="w-full text-xs border-t border-b border-zinc-300">
                <thead className="text-[10px] uppercase tracking-widest">
                  <tr>
                    <th className="text-left py-1">{t("page.items")}</th>
                    <th className="text-right py-1">{t("page.qty")}</th>
                    <th className="text-right py-1">{t("page.amount")}</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {detail.items.map((i, idx) => (
                    <tr key={idx} className="border-t border-zinc-200">
                      <td className="py-1.5">{i.name}</td>
                      <td className="py-1.5 text-right">{i.quantity}</td>
                      <td className="py-1.5 text-right">{formatMoney(i.line_total, sym)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 space-y-1 font-mono text-sm">
                <div className="flex justify-between"><span>{t("page.subtotal")}</span><span>{formatMoney(detail.subtotal, sym)}</span></div>
                <div className="flex justify-between"><span>{t("page.tax_rate")}</span><span>{formatMoney(detail.tax_total, sym)}</span></div>
                <div className="flex justify-between text-[#E60000]"><span>{t("page.discount")}</span><span>-{formatMoney(detail.discount_amount, sym)}</span></div>
                <div className="flex justify-between font-black text-lg pt-1 border-t-2 border-zinc-900"><span>{t("page.grand_total")}</span><span>{formatMoney(detail.total, sym)}</span></div>
              </div>
              <div className="mt-4 flex items-center gap-3 border-t-2 border-zinc-900 pt-4">
                <div className="flex flex-col items-center">
                  <QRCodeSVG
                    value={JSON.stringify({ invoice_no: detail.invoice_no, total: detail.total })}
                    size={88}
                    data-testid="order-qr"
                  />
                  <span className="text-[9px] font-mono text-zinc-500 mt-1">{t("page.scan_invoice")}</span>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder={t("page.customer_phone_placeholder")}
                    className="w-full h-10 border-2 border-zinc-300 px-3 font-mono text-sm focus:outline-none focus:border-[#E60000]"
                    data-testid="wa-phone"
                  />
                  <button
                    onClick={() => sendWhatsApp(detail)}
                    disabled={waBusy}
                    data-testid="send-wa-btn"
                    className="w-full h-10 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" strokeWidth={2.5} />
                    {waBusy ? t("page.sending") : t("page.send_whatsapp")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
