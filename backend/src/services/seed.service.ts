import mongoose from 'mongoose';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Category } from '../models/Category';
import { Unit } from '../models/Unit';
import { Brand } from '../models/Brand';
import { Rack } from '../models/Rack';
import { Variation } from '../models/Variation';
import { Settings } from '../models/Settings';
import { hashPassword } from '../utils/password';
import { generateId } from '../utils/invoice';
import { env } from '../config/env';
import logger from '../utils/logger';

const DEFAULT_CATEGORIES = [
  { name: 'Dairy', description: 'Milk, butter, ghee, cheese, paneer, curd' },
  { name: 'Grocery & Staples', description: 'Rice, atta, daal, oil, sugar, salt, spices' },
  { name: 'Beverages', description: 'Tea, coffee, juice, cold drinks, water' },
  { name: 'Snacks & Namkeen', description: 'Chips, biscuits, namkeen, kurkure' },
  { name: 'Personal Care', description: 'Soap, shampoo, toothpaste, deo, sanitizer' },
  { name: 'Household & Cleaning', description: 'Detergent, dishwash, floor cleaner' },
  { name: 'Bakery & Confectionery', description: 'Bread, cake, biscuits, chocolates' },
];

export async function seedData(): Promise<void> {
  const adminEmail = env.ADMIN_EMAIL.toLowerCase();
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      id: generateId(), email: adminEmail, name: 'Store Admin',
      role: 'super_admin', active: true,
      password_hash: hashPassword(env.ADMIN_PASSWORD),
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    logger.info('Admin user created');
  } else if (existingAdmin.role !== 'super_admin') {
    existingAdmin.role = 'super_admin';
    await existingAdmin.save();
    logger.info('Admin user role upgraded to super_admin');
  }

  const existingRoles = await Role.countDocuments({});
  if (existingRoles === 0) {
    const nowRoles = new Date().toISOString();
    const DEFAULT_ROLES = [
      {
        id: generateId(), name: 'admin', description: 'Full system access',
        permissions: ['*'], is_system: true, created_at: nowRoles, updated_at: nowRoles,
      },
      {
        id: generateId(), name: 'manager', description: 'Store manager with operational access',
        permissions: [
          'orders.read', 'orders.create', 'orders.edit',
          'products.read', 'products.create', 'products.edit',
          'customers.read', 'customers.create', 'customers.edit',
          'reports.read',
          'purchases.read', 'purchases.create', 'purchases.edit',
          'suppliers.read', 'suppliers.create', 'suppliers.edit',
          'expenses.read', 'expenses.create', 'expenses.edit',
          'inventory.read', 'inventory.create', 'inventory.edit',
          'attendance.read', 'attendance.create',
        ], is_system: true, created_at: nowRoles, updated_at: nowRoles,
      },
      {
        id: generateId(), name: 'cashier', description: 'Cashier with POS and basic operations',
        permissions: [
          'pos.access', 'orders.create',
          'customers.read', 'customers.create',
          'attendance.read', 'attendance.create',
        ], is_system: true, created_at: nowRoles, updated_at: nowRoles,
      },
    ];
    await Role.insertMany(DEFAULT_ROLES);
    logger.info(`${DEFAULT_ROLES.length} default roles seeded`);
  }

  await Category.deleteMany({});
  const now = new Date().toISOString();
  const cats = DEFAULT_CATEGORIES.map(c => ({
    id: generateId(), name: c.name, description: c.description, created_at: now,
  }));
  await Category.insertMany(cats);
  logger.info(`${cats.length} default categories seeded`);

  const DEFAULT_UNITS = ['pcs', 'kg', 'g', 'ml', 'l', 'pack', 'box', 'bottle', 'packet', 'tin', 'jar', 'carton'];
  await Unit.deleteMany({});
  const units = DEFAULT_UNITS.map(name => ({
    id: generateId(), unit_name: name, description: '', created_at: now,
  }));
  await Unit.insertMany(units);
  logger.info(`${units.length} default units seeded`);

  const DEFAULT_BRANDS = ['Local', 'Amul', 'Britannia', 'Parle', 'Nestle', 'Pepsi', 'Coca-Cola', 'Haldiram', 'ITC', 'Dabur', 'Patanjali', 'MTR', 'Fortune', 'Saffola'];
  await Brand.deleteMany({});
  const brands = DEFAULT_BRANDS.map(name => ({
    id: generateId(), name, description: '', created_at: now,
  }));
  await Brand.insertMany(brands);
  logger.info(`${brands.length} default brands seeded`);

  const DEFAULT_RACKS = ['A1', 'A2', 'A3', 'B1', 'B2', 'B3', 'C1', 'C2', 'C3', 'D1', 'D2', 'Freezer', 'Counter'];
  await Rack.deleteMany({});
  const racks = DEFAULT_RACKS.map(name => ({
    id: generateId(), name, description: '', created_at: now,
  }));
  await Rack.insertMany(racks);
  logger.info(`${racks.length} default racks seeded`);

  const DEFAULT_VARIATIONS = [
    { variation_name: 'Size', variation_values: ['Small', 'Medium', 'Large'] },
    { variation_name: 'Flavour', variation_values: ['Strawberry', 'Chocolate', 'Vanilla', 'Mango'] },
    { variation_name: 'Type', variation_values: ['Standard', 'Premium', 'Economy'] },
    { variation_name: 'Colour', variation_values: ['Red', 'Blue', 'Green', 'Black', 'White'] },
  ];
  await Variation.deleteMany({});
  const variations = DEFAULT_VARIATIONS.map(v => ({
    id: generateId(), variation_name: v.variation_name, variation_values: v.variation_values, created_at: now,
  }));
  await Variation.insertMany(variations);
  logger.info(`${variations.length} default variations seeded`);

  const existingSettings = await Settings.findOne({});
  if (!existingSettings) {
    await Settings.create({
      id: 'default',
      store_name: 'No Bargaining Mart',
      address: 'Shop No. 1, Main Street, City',
      phone: '+91 00000 00000',
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
    logger.info('Default settings created');
  }

  // Backfill removed — scopeFilter uses exact created_by match only
}
