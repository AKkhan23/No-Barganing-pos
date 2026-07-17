import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Save, Database, Trash2, RefreshCw } from "lucide-react";
import api from "../lib/api";
import { PageShell } from "./Dashboard";

const MODULES = [
  "pos", "orders", "products", "customers", "suppliers", "purchases",
  "purchase_returns", "sale_returns", "inventory", "expenses", "income",
  "accounts", "reports", "attendance", "payroll", "bookings", "quotations",
  "transfers", "promotions", "customer_groups", "delivery_partners",
  "warranties", "fixed_assets", "installments", "denominations",
  "multiple_currencies", "barcode_labels", "servicing", "deposits",
  "registers", "check_in_out", "roles",
];

const TABS = [
  { key: "general", label: "General" },
  { key: "invoice", label: "Invoice" },
  { key: "tax", label: "Tax" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "payment_gateway", label: "Payment Gateway" },
  { key: "printer", label: "Printer" },
  { key: "whitelabel", label: "WhiteLabel" },
  { key: "modules", label: "Modules" },
  { key: "data", label: "Data" },
];

export default function Settings() {
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("general");
  const [dataBusy, setDataBusy] = useState(null);

  useEffect(() => {
    api.get("/settings").then((r) => setData(r.data)).catch(() => {});
  }, []);

  const handleChange = (path, value) => {
    setData((prev) => {
      const parts = path.split(".");
      const newData = { ...prev };
      let obj = newData;
      for (let i = 0; i < parts.length - 1; i++) {
        obj[parts[i]] = { ...obj[parts[i]] };
        obj = obj[parts[i]];
      }
      obj[parts[parts.length - 1]] = value;
      return newData;
    });
  };

  const saveGeneral = async () => {
    try {
      await api.put("/settings", {
        ...data,
        default_tax_rate: Number(data.default_tax_rate) || 0,
      });
      toast.success(t("page.settings_saved"));
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.save_failed"));
    }
  };

  const saveTax = async () => {
    try {
      await api.put("/settings", {
        ...data,
        default_tax_rate: Number(data.default_tax_rate) || 0,
      });
      toast.success(t("page.settings_saved"));
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.save_failed"));
    }
  };

  const saveGroup = async (group, body) => {
    try {
      await api.patch(`/settings/${group}`, body);
      toast.success(t("page.settings_saved"));
    } catch (e) {
      toast.error(e?.response?.data?.detail || t("common.save_failed"));
    }
  };

  if (!data) {
    return (
      <PageShell title={t("nav.settings")}>
        <div className="p-6">{t("common.loading")}</div>
      </PageShell>
    );
  }

  const inputClass = "w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm";
  const labelClass = "block text-xs font-semibold text-zinc-600 mb-1.5";
  const selectClass = "w-full h-11 border border-zinc-300 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm bg-white appearance-none cursor-pointer";
  const textareaClass = "w-full border border-zinc-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-[#E60000]/30 focus:border-[#E60000] text-sm resize-none";
  const toggleClass = "relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#E60000]/30";
  const btnClass = "h-11 px-6 bg-[#E60000] text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] transition-colors flex items-center gap-2";

  const renderGeneral = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>{t("page.store_name")}</label>
        <input className={inputClass} value={data.store_name ?? ""} onChange={(e) => handleChange("store_name", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>{t("page.phone")}</label>
        <input className={inputClass} value={data.phone ?? ""} onChange={(e) => handleChange("phone", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>{t("page.gstin")}</label>
        <input className={inputClass} value={data.gstin ?? ""} onChange={(e) => handleChange("gstin", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>{t("page.currency_code")}</label>
        <input className={inputClass} value={data.currency ?? ""} onChange={(e) => handleChange("currency", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>{t("page.currency_symbol")}</label>
        <input className={inputClass} value={data.currency_symbol ?? ""} onChange={(e) => handleChange("currency_symbol", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>{t("page.default_tax")}</label>
        <input className={inputClass} type="number" value={data.default_tax_rate ?? 0} onChange={(e) => handleChange("default_tax_rate", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>{t("page.address")}</label>
        <textarea className={textareaClass} rows={3} value={data.address ?? ""} onChange={(e) => handleChange("address", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <label className={labelClass}>{t("page.receipt_footer")}</label>
        <textarea className={textareaClass} rows={3} value={data.receipt_footer ?? ""} onChange={(e) => handleChange("receipt_footer", e.target.value)} />
      </div>
      <div className="md:col-span-2 pt-2">
        <button className={btnClass} onClick={saveGeneral}><Save className="w-4 h-4" /> {t("common.save")}</button>
      </div>
    </div>
  );

  const renderInvoice = () => {
    const inv = data.invoice_settings || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Prefix</label>
          <input className={inputClass} value={inv.prefix ?? ""} onChange={(e) => handleChange("invoice_settings.prefix", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Next Number</label>
          <input className={inputClass} type="number" value={inv.next_number ?? 1000} onChange={(e) => handleChange("invoice_settings.next_number", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Template</label>
          <select className={selectClass} value={inv.template ?? "standard"} onChange={(e) => handleChange("invoice_settings.template", e.target.value)}>
            <option value="standard">Standard</option>
            <option value="compact">Compact</option>
            <option value="thermal">Thermal</option>
          </select>
        </div>
        <div />
        <div className="md:col-span-2 space-y-4">
          <div className="font-semibold text-sm text-zinc-700">Toggle Options</div>
          {[
            { key: "show_logo", label: "Show Logo" },
            { key: "show_tax", label: "Show Tax" },
            { key: "show_discount", label: "Show Discount" },
            { key: "show_customer_info", label: "Show Customer Info" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-zinc-600">{label}</span>
              <button type="button" className={toggleClass} style={{ backgroundColor: inv[key] ? "#E60000" : "#d4d4d4" }} onClick={() => handleChange(`invoice_settings.${key}`, !inv[key])}>
                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: inv[key] ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>
          ))}
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Terms & Conditions</label>
          <textarea className={textareaClass} rows={3} value={inv.terms_conditions ?? ""} onChange={(e) => handleChange("invoice_settings.terms_conditions", e.target.value)} />
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("invoice_settings", data.invoice_settings)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderTax = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div>
        <label className={labelClass}>Tax ID (GSTIN)</label>
        <input className={inputClass} value={data.tax_id ?? ""} onChange={(e) => handleChange("tax_id", e.target.value)} />
      </div>
      <div>
        <label className={labelClass}>Default Tax Rate (%)</label>
        <input className={inputClass} type="number" value={data.default_tax_rate ?? 0} onChange={(e) => handleChange("default_tax_rate", e.target.value)} />
      </div>
      <div className="md:col-span-2 pt-2">
        <button className={btnClass} onClick={saveTax}><Save className="w-4 h-4" /> {t("common.save")}</button>
      </div>
    </div>
  );

  const renderEmail = () => {
    const ec = data.email_config || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>SMTP Host</label>
          <input className={inputClass} value={ec.smtp_host ?? ""} onChange={(e) => handleChange("email_config.smtp_host", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>SMTP Port</label>
          <input className={inputClass} type="number" value={ec.smtp_port ?? 587} onChange={(e) => handleChange("email_config.smtp_port", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>SMTP User</label>
          <input className={inputClass} value={ec.smtp_user ?? ""} onChange={(e) => handleChange("email_config.smtp_user", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>SMTP Password</label>
          <input className={inputClass} type="password" value={ec.smtp_pass ?? ""} onChange={(e) => handleChange("email_config.smtp_pass", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>SMTP From</label>
          <input className={inputClass} value={ec.smtp_from ?? ""} onChange={(e) => handleChange("email_config.smtp_from", e.target.value)} />
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-zinc-600 font-medium">SMTP Secure</span>
            <button type="button" className={toggleClass} style={{ backgroundColor: ec.smtp_secure ? "#E60000" : "#d4d4d4" }} onClick={() => handleChange("email_config.smtp_secure", !ec.smtp_secure)}>
              <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: ec.smtp_secure ? "translateX(22px)" : "translateX(2px)" }} />
            </button>
          </div>
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("email_config", data.email_config)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderSms = () => {
    const sc = data.sms_config || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Provider</label>
          <select className={selectClass} value={sc.provider ?? "twilio"} onChange={(e) => handleChange("sms_config.provider", e.target.value)}>
            <option value="twilio">Twilio</option>
            <option value="msg91">MSG91</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div />
        <div>
          <label className={labelClass}>API Key</label>
          <input className={inputClass} value={sc.api_key ?? ""} onChange={(e) => handleChange("sms_config.api_key", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>API Secret</label>
          <input className={inputClass} value={sc.api_secret ?? ""} onChange={(e) => handleChange("sms_config.api_secret", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Sender ID</label>
          <input className={inputClass} value={sc.sender_id ?? ""} onChange={(e) => handleChange("sms_config.sender_id", e.target.value)} />
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("sms_config", data.sms_config)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderWhatsApp = () => {
    const wc = data.whatsapp_config || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>API Key</label>
          <input className={inputClass} value={wc.api_key ?? ""} onChange={(e) => handleChange("whatsapp_config.api_key", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Phone Number ID</label>
          <input className={inputClass} value={wc.phone_number_id ?? ""} onChange={(e) => handleChange("whatsapp_config.phone_number_id", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Business Account ID</label>
          <input className={inputClass} value={wc.business_account_id ?? ""} onChange={(e) => handleChange("whatsapp_config.business_account_id", e.target.value)} />
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("whatsapp_config", data.whatsapp_config)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderPaymentGateway = () => {
    const pg = data.payment_gateway || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Provider</label>
          <select className={selectClass} value={pg.provider ?? "razorpay"} onChange={(e) => handleChange("payment_gateway.provider", e.target.value)}>
            <option value="razorpay">Razorpay</option>
            <option value="instamojo">Instamojo</option>
            <option value="paytm">Paytm</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div />
        <div>
          <label className={labelClass}>API Key</label>
          <input className={inputClass} value={pg.api_key ?? ""} onChange={(e) => handleChange("payment_gateway.api_key", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>API Secret</label>
          <input className={inputClass} value={pg.api_secret ?? ""} onChange={(e) => handleChange("payment_gateway.api_secret", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Merchant ID</label>
          <input className={inputClass} value={pg.merchant_id ?? ""} onChange={(e) => handleChange("payment_gateway.merchant_id", e.target.value)} />
        </div>
        <div className="flex items-end pb-2">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-zinc-600 font-medium">Sandbox Mode</span>
            <button type="button" className={toggleClass} style={{ backgroundColor: pg.sandbox_mode ? "#E60000" : "#d4d4d4" }} onClick={() => handleChange("payment_gateway.sandbox_mode", !pg.sandbox_mode)}>
              <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: pg.sandbox_mode ? "translateX(22px)" : "translateX(2px)" }} />
            </button>
          </div>
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("payment_gateway", data.payment_gateway)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderPrinter = () => {
    const pc = data.printer_config || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>Type</label>
          <select className={selectClass} value={pc.type ?? "thermal"} onChange={(e) => handleChange("printer_config.type", e.target.value)}>
            <option value="thermal">Thermal</option>
            <option value="a4">A4</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Interface</label>
          <select className={selectClass} value={pc.interface ?? "usb"} onChange={(e) => handleChange("printer_config.interface", e.target.value)}>
            <option value="usb">USB</option>
            <option value="network">Network</option>
            <option value="bluetooth">Bluetooth</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>IP Address</label>
          <input className={inputClass} value={pc.ip_address ?? ""} onChange={(e) => handleChange("printer_config.ip_address", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Port</label>
          <input className={inputClass} type="number" value={pc.port ?? 9100} onChange={(e) => handleChange("printer_config.port", Number(e.target.value))} />
        </div>
        <div>
          <label className={labelClass}>Characters Per Line</label>
          <input className={inputClass} type="number" value={pc.characters_per_line ?? 42} onChange={(e) => handleChange("printer_config.characters_per_line", Number(e.target.value))} />
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("printer_config", data.printer_config)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderWhiteLabel = () => {
    const wl = data.whitelabel || {};
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className={labelClass}>App Name</label>
          <input className={inputClass} value={wl.app_name ?? ""} onChange={(e) => handleChange("whitelabel.app_name", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>App Logo (URL)</label>
          <input className={inputClass} value={wl.app_logo ?? ""} onChange={(e) => handleChange("whitelabel.app_logo", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" className="h-11 w-16 border border-zinc-300 rounded-lg cursor-pointer p-1" value={wl.primary_color || "#dc2626"} onChange={(e) => handleChange("whitelabel.primary_color", e.target.value)} />
            <input className={inputClass} value={wl.primary_color ?? ""} onChange={(e) => handleChange("whitelabel.primary_color", e.target.value)} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Favicon (URL)</label>
          <input className={inputClass} value={wl.favicon ?? ""} onChange={(e) => handleChange("whitelabel.favicon", e.target.value)} />
        </div>
        <div>
          <label className={labelClass}>Login Background</label>
          <input className={inputClass} value={wl.login_background ?? ""} onChange={(e) => handleChange("whitelabel.login_background", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className={labelClass}>Footer Text</label>
          <textarea className={textareaClass} rows={3} value={wl.footer_text ?? ""} onChange={(e) => handleChange("whitelabel.footer_text", e.target.value)} />
        </div>
        <div className="md:col-span-2 pt-2">
          <button className={btnClass} onClick={() => saveGroup("whitelabel", data.whitelabel)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderModules = () => {
    const ms = data.module_status || {};
    return (
      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {MODULES.map((mod) => (
            <div key={mod} className="flex items-center justify-between bg-white border border-zinc-200 rounded-lg px-4 py-3 hover:border-zinc-300 transition-colors">
              <span className="text-sm font-medium text-zinc-700 capitalize">{mod.replace(/_/g, " ")}</span>
              <button type="button" className={toggleClass} style={{ backgroundColor: ms[mod] ? "#E60000" : "#d4d4d4" }} onClick={() => handleChange(`module_status.${mod}`, !ms[mod])}>
                <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: ms[mod] ? "translateX(22px)" : "translateX(2px)" }} />
              </button>
            </div>
          ))}
        </div>
        <div className="pt-6">
          <button className={btnClass} onClick={() => saveGroup("module_status", data.module_status)}><Save className="w-4 h-4" /> {t("common.save")}</button>
        </div>
      </div>
    );
  };

  const renderData = () => {
    const handleAction = async (action, label) => {
      setDataBusy(action);
      try {
        let res;
        if (action === "generate") res = await api.post("/wipe/generate");
        else if (action === "wipe-demo") res = await api.delete("/wipe/demo-data");
        else if (action === "wipe-transactional") res = await api.delete("/wipe/transactional");
        else if (action === "wipe-all") res = await api.delete("/wipe/all");
        toast.success(res?.data?.message || `${label} successful`);
        if (action !== "generate") window.location.reload();
      } catch (e) {
        toast.error(e?.response?.data?.detail || `${label} failed`);
      } finally { setDataBusy(null); }
    };
    const busy = dataBusy;
    return (
      <div className="space-y-6">
        <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-[#E60000]" />
            <div>
              <div className="font-bold text-sm">Generate Dummy Data</div>
              <div className="text-xs text-zinc-500">Create sample products, customers, and suppliers for testing</div>
            </div>
          </div>
          <button onClick={() => handleAction("generate", "Generate")} disabled={dataBusy === "generate"}
            className="h-10 px-5 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 ${dataBusy === "generate" ? "animate-spin" : ""}`} /> Generate
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-bold text-sm text-red-800">Wipe Demo Data</div>
              <div className="text-xs text-red-600">Delete all demo data but keep users and settings</div>
            </div>
          </div>
          <button onClick={() => handleAction("wipe-demo", "Wipe Demo")} disabled={dataBusy === "wipe-demo"}
            className="h-10 px-5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> Wipe Demo Data
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-bold text-sm text-red-800">Wipe Transactional Data</div>
              <div className="text-xs text-red-600">Delete orders, payments, expenses (keeps products, customers, settings)</div>
            </div>
          </div>
          <button onClick={() => handleAction("wipe-transactional", "Wipe Transactional")} disabled={dataBusy === "wipe-transactional"}
            className="h-10 px-5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> Wipe Transactional Data
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <div className="flex items-center gap-3 mb-3">
            <Trash2 className="w-5 h-5 text-red-600" />
            <div>
              <div className="font-bold text-sm text-red-800">Wipe All Data</div>
              <div className="text-xs text-red-600">Delete EVERYTHING including users. Factory reset.</div>
            </div>
          </div>
          <button onClick={() => handleAction("wipe-all", "Wipe All")} disabled={dataBusy === "wipe-all"}
            className="h-10 px-5 bg-red-600 text-white text-xs font-bold uppercase tracking-widest rounded-lg flex items-center gap-2 disabled:opacity-40">
            <Trash2 className="w-4 h-4" /> Wipe All Data
          </button>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (tab) {
      case "general": return renderGeneral();
      case "invoice": return renderInvoice();
      case "tax": return renderTax();
      case "email": return renderEmail();
      case "sms": return renderSms();
      case "whatsapp": return renderWhatsApp();
      case "payment_gateway": return renderPaymentGateway();
      case "printer": return renderPrinter();
      case "whitelabel": return renderWhiteLabel();
      case "modules": return renderModules();
      case "data": return renderData();
      default: return renderGeneral();
    }
  };

  const activeTab = TABS.find((t) => t.key === tab);

  return (
    <PageShell title={t("nav.settings")} subtitle={t("page.store_configuration")}>
      <div className="flex h-full">
        <div className="w-56 flex-shrink-0 bg-zinc-900 overflow-y-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full text-left px-5 py-3 text-xs font-bold uppercase tracking-widest transition-colors border-l-4 ${
                tab === t.key
                  ? "bg-zinc-800 text-white border-[#E60000]"
                  : "bg-zinc-900 text-zinc-400 border-transparent hover:bg-zinc-800 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl bg-white border border-zinc-200 rounded-xl shadow-sm p-6">
            <div className="font-display font-black uppercase text-sm mb-6 text-zinc-700">
              {activeTab?.label} Settings
            </div>
            {renderContent()}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
