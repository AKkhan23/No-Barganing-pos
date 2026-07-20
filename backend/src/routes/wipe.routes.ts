import { Router, Request, Response } from 'express';
import { Account } from '../models/Account';
import { Attendance } from '../models/Attendance';
import { Booking } from '../models/Booking';
import { Category } from '../models/Category';
import { Customer } from '../models/Customer';
import { CustomerGroup } from '../models/CustomerGroup';
import { DamageStock } from '../models/DamageStock';
import { DeliveryPartner } from '../models/DeliveryPartner';
import { Expense } from '../models/Expense';
import { FixedAsset } from '../models/FixedAsset';
import { Income } from '../models/Income';
import { InstallmentPlan } from '../models/InstallmentPlan';
import { LedgerEntry } from '../models/LedgerEntry';
import { Notification } from '../models/Notification';
import { Order } from '../models/Order';
import { Outlet } from '../models/Outlet';
import { Payroll } from '../models/Payroll';
import { Product } from '../models/Product';
import { Promotion } from '../models/Promotion';
import { PurchaseOrder } from '../models/PurchaseOrder';
import { PurchaseReturn } from '../models/PurchaseReturn';
import { Quotation } from '../models/Quotation';
import { SaleReturn } from '../models/SaleReturn';
import { Settings } from '../models/Settings';
import { ShiftReport } from '../models/ShiftReport';
import { StockMovement } from '../models/StockMovement';
import { Supplier } from '../models/Supplier';
import { SupplierPayment } from '../models/SupplierPayment';
import { Transfer } from '../models/Transfer';
import { User } from '../models/User';
import { Warranty } from '../models/Warranty';
import { WhatsAppLog } from '../models/WhatsAppLog';
import { PaymentMethod } from '../models/PaymentMethod';
import { Register } from '../models/Register';
import { Deposit } from '../models/Deposit';
import { Servicing } from '../models/Servicing';
import { CheckInOut } from '../models/CheckInOut';
import { verifyJWT, requireRoles } from '../middleware/auth';
import { generateId } from '../utils/invoice';

const router = Router();
router.use(verifyJWT, requireRoles('admin'));

const ALL_MODELS: any[] = [
  Account, Attendance, Booking, Category, Customer, CustomerGroup,
  DamageStock, DeliveryPartner, Expense, FixedAsset, Income,
  InstallmentPlan, LedgerEntry, Notification, Order, Outlet, Payroll,
  Product, Promotion, PurchaseOrder, PurchaseReturn, Quotation,
  SaleReturn, Settings, ShiftReport, StockMovement, Supplier,
  SupplierPayment, Transfer, Warranty, WhatsAppLog,
  PaymentMethod, Register, Deposit, Servicing, CheckInOut,
];

const TRANSACTIONAL_MODELS: any[] = [
  Order, SaleReturn, PurchaseOrder, PurchaseReturn, StockMovement,
  LedgerEntry, ShiftReport, Expense, Income, SupplierPayment,
  DamageStock, Transfer, Booking, Quotation, InstallmentPlan,
  Attendance, Payroll, Notification, WhatsAppLog,
  Deposit, Servicing, CheckInOut,
];

/**
 * @openapi
 * /wipe/demo-data:
 *   delete:
 *     tags: [Wipe]
 *     summary: Wipe all demo/seed data (except users)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Demo data wiped
 */
router.delete('/demo-data', async (_req: Request, res: Response) => {
  for (const model of ALL_MODELS) {
    await model.deleteMany({});
  }
  res.json({ ok: true, message: 'Demo data wiped' });
});

/**
 * @openapi
 * /wipe/all:
 *   delete:
 *     tags: [Wipe]
 *     summary: Factory reset - wipe ALL data including users
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All data wiped
 */
router.delete('/all', async (_req: Request, res: Response) => {
  for (const model of ALL_MODELS) {
    await model.deleteMany({});
  }
  await User.deleteMany({});
  res.json({ ok: true, message: 'All data wiped' });
});

/**
 * @openapi
 * /wipe/barcodes:
 *   post:
 *     tags: [Wipe]
 *     summary: Clear all product barcodes
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Barcodes cleared
 */
router.post('/barcodes', async (_req: Request, res: Response) => {
  const r = await Product.updateMany({}, { $unset: { barcode: '' } });
  res.json({ ok: true, modifiedCount: r.modifiedCount, message: 'All barcodes cleared' });
});

/**
 * @openapi
 * /wipe/products:
 *   delete:
 *     tags: [Wipe]
 *     summary: Delete all products and stock movements
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: All products deleted
 */
router.delete('/products', async (_req: Request, res: Response) => {
  const r = await Product.deleteMany({});
  await StockMovement.deleteMany({});
  res.json({ ok: true, deletedCount: r.deletedCount, message: 'All products deleted' });
});

/**
 * @openapi
 * /wipe/transactional:
 *   delete:
 *     tags: [Wipe]
 *     summary: Wipe all transactional data (orders, payments, etc.)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Transactional data wiped
 */
router.delete('/transactional', async (_req: Request, res: Response) => {
  for (const model of TRANSACTIONAL_MODELS) {
    await model.deleteMany({});
  }
  res.json({ ok: true, message: 'Transactional data wiped' });
});

/**
 * @openapi
 * /wipe/generate:
 *   post:
 *     tags: [Wipe]
 *     summary: Generate dummy data (categories, products, customers, suppliers)
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Dummy data generated
 */
router.post('/generate', async (_req: Request, res: Response) => {
  const now = new Date().toISOString();
  const results: string[] = [];

  // Generate sample categories if none exist
  const catCount = await Category.countDocuments({});
  if (catCount === 0) {
    const cats = ['Dairy', 'Grocery', 'Beverages', 'Snacks', 'Personal Care', 'Household', 'Bakery'].map(n => ({
      id: generateId(), name: n, description: `${n} items`, created_at: now,
    }));
    await Category.insertMany(cats);
    results.push('7 categories created');
  }

  // Generate sample products
  const prodCount = await Product.countDocuments({});
  if (prodCount === 0) {
    const catIds = (await Category.find({}).lean()).map(c => c.id);
    const products = [];
    const names = ['Milk', 'Bread', 'Rice', 'Sugar', 'Tea', 'Soap', 'Shampoo', 'Biscuit', 'Oil', 'Salt'];
    for (let i = 0; i < 20; i++) {
      const name = names[i % names.length];
      products.push({
        id: generateId(), name: `${name} ${Math.floor(Math.random() * 10) + 1}`,
        sku: `SKU${String(i + 1).padStart(4, '0')}`,
        price: Math.floor(Math.random() * 500) + 10,
        cost_price: Math.floor(Math.random() * 300) + 5,
        stock: Math.floor(Math.random() * 100) + 10,
        category_id: catIds[i % catIds.length],
        unit: 'pcs',
        sell_by: 'pcs',
        created_at: now, updated_at: now,
      });
    }
    await Product.insertMany(products);
    results.push(`${products.length} products created`);
  }

  // Generate sample customers
  const custCount = await Customer.countDocuments({});
  if (custCount === 0) {
    const customers = [];
    const custNames = ['Rahul Sharma', 'Priya Patel', 'Amit Singh', 'Sneha Gupta', 'Vijay Kumar'];
    for (let i = 0; i < 10; i++) {
      customers.push({
        id: generateId(), name: custNames[i % custNames.length],
        phone: `98${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
        email: `customer${i + 1}@example.com`,
        address: `${i + 1}, Main Street, City`,
        created_at: now, updated_at: now,
      });
    }
    await Customer.insertMany(customers);
    results.push(`${customers.length} customers created`);
  }

  // Generate sample suppliers
  const supCount = await Supplier.countDocuments({});
  if (supCount === 0) {
    const suppliers = ['ABC Distributors', 'XYZ Wholesale', 'PQR Enterprises', 'LMN Traders'].map(n => ({
      id: generateId(), name: n, phone: `99${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`,
      email: `${n.toLowerCase().replace(/\s/g, '')}@example.com`,
      balance: Math.floor(Math.random() * 50000),
      created_at: now, updated_at: now,
    }));
    await Supplier.insertMany(suppliers);
    results.push(`${suppliers.length} suppliers created`);
  }

  res.json({ ok: true, message: 'Dummy data generated', details: results });
});

export default router;
