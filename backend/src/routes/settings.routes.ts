import { Router, Request, Response } from 'express';
import { Settings } from '../models/Settings';
import { verifyJWT, requireRoles } from '../middleware/auth';

const router = Router();

router.get('/', verifyJWT, async (_req: Request, res: Response) => {
  let settings = await Settings.findOne({}).lean();
  if (!settings) {
    res.json({
      id: 'default', store_name: 'No Bargaining Mart', address: '', phone: '', gstin: '',
      currency: 'INR', currency_symbol: '₹', currency_position: 'before', default_tax_rate: 5,
      receipt_footer: 'No Bargaining! Fixed Prices. Thank you for shopping.', tax_id: '',
      company_name: 'My Store', company_address: '', company_phone: '', company_email: '',
      timezone: 'Asia/Kolkata', date_format: 'YYYY-MM-DD',
      invoice_settings: { prefix: 'INV-', next_number: 1000, template: 'standard', show_logo: true, show_tax: true, show_discount: true, show_customer_info: true, terms_conditions: 'No Bargaining! Fixed Prices.' },
      email_config: { smtp_host: '', smtp_port: 587, smtp_user: '', smtp_pass: '', smtp_from: '', smtp_secure: false },
      sms_config: { provider: 'twilio', api_key: '', api_secret: '', sender_id: '' },
      whatsapp_config: { api_key: '', phone_number_id: '', business_account_id: '' },
      payment_gateway: { provider: 'razorpay', api_key: '', api_secret: '', merchant_id: '', sandbox_mode: true },
      printer_config: { type: 'thermal', interface: 'usb', ip_address: '', port: 9100, characters_per_line: 42 },
      whitelabel: { app_name: 'No Bargaining POS', app_logo: '', primary_color: '#dc2626', favicon: '', login_background: '', footer_text: 'Powered by No Bargaining POS' },
      module_status: {},
      updated_at: new Date().toISOString(),
    });
    return;
  }
  res.json({ ...settings, _id: undefined, __v: undefined });
});

router.put('/', verifyJWT, requireRoles('admin'), async (req: Request, res: Response) => {
  const update = { ...req.body, updated_at: new Date().toISOString() };
  const settings = await Settings.findOneAndUpdate({}, { $set: update }, { upsert: true, new: true }).lean();
  res.json({ ...settings, _id: undefined, __v: undefined });
});

router.patch('/:group', verifyJWT, requireRoles('admin'), async (req: Request, res: Response) => {
  const { group } = req.params;
  const allowedGroups = ['invoice_settings', 'email_config', 'sms_config', 'whatsapp_config', 'payment_gateway', 'printer_config', 'whitelabel', 'module_status'];
  if (!allowedGroups.includes(group)) {
    res.status(400).json({ detail: `Invalid config group: ${group}` });
    return;
  }
  let settings = await Settings.findOne({});
  if (!settings) {
    const now = new Date().toISOString();
    settings = await Settings.create({
      id: 'default',
      store_name: 'No Bargaining Mart',
      address: '',
      phone: '',
      gstin: '',
      currency: 'INR',
      currency_symbol: '₹',
      currency_position: 'before',
      default_tax_rate: 5,
      receipt_footer: 'No Bargaining! Fixed Prices. Thank you for shopping.',
      tax_id: '',
      company_name: 'My Store',
      company_address: '',
      company_phone: '',
      company_email: '',
      timezone: 'Asia/Kolkata',
      date_format: 'YYYY-MM-DD',
      updated_at: new Date().toISOString(),
    });
  }
  const updated = await Settings.findOneAndUpdate(
    {},
    { $set: { [group]: req.body, updated_at: new Date().toISOString() } },
    { new: true }
  ).lean();
  res.json({ ...updated, _id: undefined, __v: undefined });
});

export default router;
