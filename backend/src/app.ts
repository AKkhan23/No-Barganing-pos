import path from 'path';
import express from 'express';
import cors from 'cors';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { seedData } from './services/seed.service';
import { globalErrorHandler } from './middleware/error';
import logger from './utils/logger';
import mongoose from 'mongoose';

import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import productsRoutes from './routes/products.routes';
import categoriesRoutes from './routes/categories.routes';
import customersRoutes from './routes/customers.routes';
import ordersRoutes from './routes/orders.routes';
import stockMovementsRoutes from './routes/stockMovements.routes';
import dashboardRoutes from './routes/dashboard.routes';
import reportsRoutes from './routes/reports.routes';
import settingsRoutes from './routes/settings.routes';
import accountsRoutes from './routes/accounts.routes';
import accountingReportsRoutes from './routes/accountingReports.routes';
import attendanceRoutes from './routes/attendance.routes';
import barcodeUtilsRoutes from './routes/barcodeUtils.routes';
import biDashboardRoutes from './routes/biDashboard.routes';
import bookingsRoutes from './routes/bookings.routes';
import customerDuesRoutes from './routes/customerDues.routes';
import customerGroupsRoutes from './routes/customerGroups.routes';
import damageStockRoutes from './routes/damageStock.routes';
import deliveryPartnersRoutes from './routes/deliveryPartners.routes';
import expensesRoutes from './routes/expenses.routes';
import fixedAssetsRoutes from './routes/fixedAssets.routes';
import incomeRoutes from './routes/income.routes';
import installmentsRoutes from './routes/installments.routes';
import notificationsRoutes from './routes/notifications.routes';
import outletsRoutes from './routes/outlets.routes';
import payrollRoutes from './routes/payroll.routes';
import promotionsRoutes from './routes/promotions.routes';
import purchasesRoutes from './routes/purchases.routes';
import purchaseReturnsRoutes from './routes/purchaseReturns.routes';
import quotationsRoutes from './routes/quotations.routes';
import saleReturnsRoutes from './routes/saleReturns.routes';
import shiftsRoutes from './routes/shifts.routes';
import suppliersRoutes from './routes/suppliers.routes';
import supplierPaymentsRoutes from './routes/supplierPayments.routes';
import transfersRoutes from './routes/transfers.routes';
import warrantiesRoutes from './routes/warranties.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import wipeRoutes from './routes/wipe.routes';
import batchesRoutes from './routes/batches.routes';
import brandsRoutes from './routes/brands.routes';
import unitsRoutes from './routes/units.routes';
import racksRoutes from './routes/racks.routes';
import variationsRoutes from './routes/variations.routes';
import countersRoutes from './routes/counters.routes';
import denominationsRoutes from './routes/denominations.routes';
import multipleCurrenciesRoutes from './routes/multipleCurrencies.routes';
import expenseItemsRoutes from './routes/expenseItems.routes';
import incomeItemsRoutes from './routes/incomeItems.routes';
import rolesRoutes from './routes/roles.routes';
import paymentMethodsRoutes from './routes/paymentMethods.routes';
import registersRoutes from './routes/registers.routes';
import depositsRoutes from './routes/deposits.routes';
import servicingRoutes from './routes/servicing.routes';
import checkInOutRoutes from './routes/checkInOut.routes';
import extraReportsRoutes from './routes/extraReports.routes';

const app = express();
const publicDir = path.join(__dirname, 'public');
app.use(express.static(publicDir));

const corsOrigins = env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(',');
app.use(cors({ origin: corsOrigins, credentials: env.CORS_ORIGINS !== '*' }));
app.use((req, _res, next) => {
  console.log(`[CORS] ${req.method} ${req.url} | Origin: ${req.headers.origin || 'same-origin'} | Host: ${req.headers.host}`);
  next();
});
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'No Bargaining POS API', version: '2.0.0', description: 'Express + TypeScript backend' },
    servers: [{ url: '/api' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api', (_req, res) => {
  res.json({ service: 'No Bargaining POS', ok: true });
});
app.get('/api/health', (_req, res) => {
  const mongoState = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
  res.json({ ok: mongoState === 'connected', mongo: mongoState, uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/stock-movements', stockMovementsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/accounts', accountsRoutes);
app.use('/api/accounting', accountingReportsRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/tools', barcodeUtilsRoutes);
app.use('/api/bi', biDashboardRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/customer-dues', customerDuesRoutes);
app.use('/api/customer-groups', customerGroupsRoutes);
app.use('/api/damage-stock', damageStockRoutes);
app.use('/api/delivery-partners', deliveryPartnersRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/fixed-assets', fixedAssetsRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/installments', installmentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/outlets', outletsRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/purchase-returns', purchaseReturnsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/sale-returns', saleReturnsRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/supplier-payments', supplierPaymentsRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/warranties', warrantiesRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/wipe', wipeRoutes);
app.use('/api/batches', batchesRoutes);
app.use('/api/brands', brandsRoutes);
app.use('/api/units', unitsRoutes);
app.use('/api/racks', racksRoutes);
app.use('/api/variations', variationsRoutes);
app.use('/api/counters', countersRoutes);
app.use('/api/denominations', denominationsRoutes);
app.use('/api/multiple-currencies', multipleCurrenciesRoutes);
app.use('/api/expense-items', expenseItemsRoutes);
app.use('/api/income-items', incomeItemsRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/payment-methods', paymentMethodsRoutes);
app.use('/api/registers', registersRoutes);
app.use('/api/deposits', depositsRoutes);
app.use('/api/servicing', servicingRoutes);
app.use('/api/check-in-out', checkInOutRoutes);
app.use('/api/extra-reports', extraReportsRoutes);

// Serve frontend SPA for all non-API routes
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use(globalErrorHandler);

export { app };
