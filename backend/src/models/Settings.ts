import mongoose, { Schema, Document } from 'mongoose';
import { scopePlugin } from '../plugins/scopePlugin';

export interface ISettings extends Document {
  id: string;
  store_name: string;
  address: string;
  phone: string;
  gstin: string;
  currency: string;
  currency_symbol: string;
  currency_position: string;
  default_tax_rate: number;
  receipt_footer: string;
  tax_id: string;
  company_name: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  timezone: string;
  date_format: string;
  invoice_settings: {
    prefix: string;
    next_number: number;
    template: string;
    show_logo: boolean;
    show_tax: boolean;
    show_discount: boolean;
    show_customer_info: boolean;
    terms_conditions: string;
  };
  email_config: {
    smtp_host: string;
    smtp_port: number;
    smtp_user: string;
    smtp_pass: string;
    smtp_from: string;
    smtp_secure: boolean;
  };
  sms_config: {
    provider: string;
    api_key: string;
    api_secret: string;
    sender_id: string;
  };
  whatsapp_config: {
    api_key: string;
    phone_number_id: string;
    business_account_id: string;
    api_url: string;
  };
  payment_gateway: {
    provider: string;
    api_key: string;
    api_secret: string;
    merchant_id: string;
    sandbox_mode: boolean;
  };
  printer_config: {
    type: string;
    interface: string;
    ip_address: string;
    port: number;
    characters_per_line: number;
  };
  whitelabel: {
    app_name: string;
    app_logo: string;
    primary_color: string;
    favicon: string;
    login_background: string;
    footer_text: string;
  };
  module_status: Record<string, boolean>;
  updated_at: string;
}

const SettingsSchema = new Schema<ISettings>({
  id: { type: String, required: true, unique: true },
  store_name: { type: String, default: 'No Bargaining Mart' },
  address: { type: String, default: 'Shop No. 1, Main Street, City' },
  phone: { type: String, default: '+91 00000 00000' },
  gstin: { type: String, default: '' },
  currency: { type: String, default: 'INR' },
  currency_symbol: { type: String, default: '₹', set: (v: string) => v === '$' ? '₹' : v },
  currency_position: { type: String, default: 'before' },
  default_tax_rate: { type: Number, default: 5 },
  receipt_footer: { type: String, default: 'No Bargaining! Fixed Prices. Thank you for shopping.' },
  tax_id: { type: String, default: '' },
  company_name: { type: String, default: 'My Store' },
  company_address: { type: String, default: '' },
  company_phone: { type: String, default: '' },
  company_email: { type: String, default: '' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  date_format: { type: String, default: 'YYYY-MM-DD' },
  invoice_settings: {
    type: Schema.Types.Mixed,
    default: {
      prefix: 'INV-',
      next_number: 1000,
      template: 'standard',
      show_logo: true,
      show_tax: true,
      show_discount: true,
      show_customer_info: true,
      terms_conditions: 'No Bargaining! Fixed Prices.',
    },
  },
  email_config: {
    type: Schema.Types.Mixed,
    default: {
      smtp_host: '',
      smtp_port: 587,
      smtp_user: '',
      smtp_pass: '',
      smtp_from: '',
      smtp_secure: false,
    },
  },
  sms_config: {
    type: Schema.Types.Mixed,
    default: {
      provider: 'twilio',
      api_key: '',
      api_secret: '',
      sender_id: '',
    },
  },
  whatsapp_config: {
    type: Schema.Types.Mixed,
    default: {
      api_key: '',
      phone_number_id: '',
      business_account_id: '',
      api_url: '',
    },
  },
  payment_gateway: {
    type: Schema.Types.Mixed,
    default: {
      provider: 'razorpay',
      api_key: '',
      api_secret: '',
      merchant_id: '',
      sandbox_mode: true,
    },
  },
  printer_config: {
    type: Schema.Types.Mixed,
    default: {
      type: 'thermal',
      interface: 'usb',
      ip_address: '',
      port: 9100,
      characters_per_line: 42,
    },
  },
  whitelabel: {
    type: Schema.Types.Mixed,
    default: {
      app_name: 'No Bargaining POS',
      app_logo: '',
      primary_color: '#dc2626',
      favicon: '',
      login_background: '',
      footer_text: 'Powered by No Bargaining POS',
    },
  },
  module_status: {
    type: Schema.Types.Mixed,
    default: {},
  },
  updated_at: { type: String, required: true },
});
SettingsSchema.plugin(scopePlugin);

export const Settings = mongoose.model<ISettings>('Settings', SettingsSchema);
