import React, { Suspense, lazy } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ConfirmProvider } from "@/lib/confirm";
import Layout from "@/components/Layout";

const Login = lazy(() => import("@/pages/Login"));
const POS = lazy(() => import("@/pages/POS"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Products = lazy(() => import("@/pages/Products"));
const Orders = lazy(() => import("@/pages/Orders"));
const Customers = lazy(() => import("@/pages/Customers"));
const Users = lazy(() => import("@/pages/Users"));
const Reports = lazy(() => import("@/pages/Reports"));
const Settings = lazy(() => import("@/pages/Settings"));
const StockMovements = lazy(() => import("@/pages/StockMovements"));
const Suppliers = lazy(() => import("@/pages/Suppliers"));
const Purchases = lazy(() => import("@/pages/Purchases"));
const PurchaseReturns = lazy(() => import("@/pages/PurchaseReturns"));
const SaleReturns = lazy(() => import("@/pages/SaleReturns"));
const CustomerDues = lazy(() => import("@/pages/CustomerDues"));
const SupplierPayments = lazy(() => import("@/pages/SupplierPayments"));
const Accounts = lazy(() => import("@/pages/Accounts"));
const Transfers = lazy(() => import("@/pages/Transfers"));
const Expenses = lazy(() => import("@/pages/Expenses"));
const Income = lazy(() => import("@/pages/Income"));
const DamageStock = lazy(() => import("@/pages/DamageStock"));
const AccountingReports = lazy(() => import("@/pages/AccountingReports"));
const Attendance = lazy(() => import("@/pages/Attendance"));
const Payroll = lazy(() => import("@/pages/Payroll"));
const Bookings = lazy(() => import("@/pages/Bookings"));
const Outlets = lazy(() => import("@/pages/Outlets"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const DashboardV2 = lazy(() => import("@/pages/DashboardV2"));
const TrialBalance = lazy(() => import("@/pages/TrialBalance"));
const BalanceSheet = lazy(() => import("@/pages/BalanceSheet"));
const ProfitLoss = lazy(() => import("@/pages/ProfitLoss"));
const Promotions = lazy(() => import("@/pages/Promotions"));
const CustomerGroups = lazy(() => import("@/pages/CustomerGroups"));
const DeliveryPartners = lazy(() => import("@/pages/DeliveryPartners"));
const Warranties = lazy(() => import("@/pages/Warranties"));
const FixedAssets = lazy(() => import("@/pages/FixedAssets"));
const Installments = lazy(() => import("@/pages/Installments"));
const Quotations = lazy(() => import("@/pages/Quotations"));
const BarcodeLabels = lazy(() => import("@/pages/BarcodeLabels"));
const Categories = lazy(() => import("@/pages/Categories"));
const Brands = lazy(() => import("@/pages/Brands"));
const Units = lazy(() => import("@/pages/Units"));
const Racks = lazy(() => import("@/pages/Racks"));
const Variations = lazy(() => import("@/pages/Variations"));
const Counters = lazy(() => import("@/pages/Counters"));
const Denominations = lazy(() => import("@/pages/Denominations"));
const MultipleCurrencies = lazy(() => import("@/pages/MultipleCurrencies"));
const ExpenseItems = lazy(() => import("@/pages/ExpenseItems"));
const IncomeItems = lazy(() => import("@/pages/IncomeItems"));
const Roles = lazy(() => import("@/pages/Roles"));
const PaymentMethods = lazy(() => import("@/pages/PaymentMethods"));
const Registers = lazy(() => import("@/pages/Registers"));
const Deposits = lazy(() => import("@/pages/Deposits"));

const Servicing = lazy(() => import("@/pages/Servicing"));
const CheckInOut = lazy(() => import("@/pages/CheckInOut"));
const UserProfile = lazy(() => import("@/pages/UserProfile"));
const BulkItemUpdate = lazy(() => import("@/pages/BulkItemUpdate"));

const AdvancedReports = lazy(() => import("@/pages/AdvancedReports"));
const FixedAssetStock = lazy(() => import("@/pages/FixedAssetStock"));

const Loading = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50">
    <div className="text-2xl font-bold tracking-tight text-red-600 mb-2">
      No Bargaining
    </div>
    <div className="flex gap-1 my-4">
      {[0,1,2].map((i) => (
        <span key={i} className="w-2 h-2 rounded-full bg-red-600 animate-bounce" style={{ animationDelay: `${i*0.2}s` }} />
      ))}
    </div>
    <div className="text-[0.65rem] uppercase tracking-[0.15em] text-zinc-400">
      Connecting to server…
    </div>
  </div>
);

const ALL = ["admin", "manager", "cashier"];

function ProtectedShell({ roles }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && user.role !== "super_admin" && !roles.includes(user.role))
    return <Navigate to="/pos" replace />;
  return <Layout />;
}

function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <BrowserRouter>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Any role */}
              <Route element={<ProtectedShell roles={ALL} />}>
                <Route path="/" element={<Navigate to="/pos" replace />} />
                <Route path="/pos" element={<POS />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/bookings" element={<Bookings />} />
                <Route path="/attendance" element={<Attendance />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/check-in-out" element={<CheckInOut />} />
                <Route path="/profile" element={<UserProfile />} />
              </Route>

              {/* Admin + Manager */}
              <Route element={<ProtectedShell roles={["admin", "manager"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/products" element={<Products />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/stock" element={<StockMovements />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/sale-returns" element={<SaleReturns />} />
                <Route path="/suppliers" element={<Suppliers />} />
                <Route path="/purchases" element={<Purchases />} />
                <Route path="/purchase-returns" element={<PurchaseReturns />} />
                <Route path="/damage-stock" element={<DamageStock />} />
                <Route path="/accounts" element={<Accounts />} />
                <Route path="/customer-dues" element={<CustomerDues />} />
                <Route
                  path="/supplier-payments"
                  element={<SupplierPayments />}
                />
                <Route path="/transfers" element={<Transfers />} />
                <Route path="/expenses" element={<Expenses />} />
                <Route path="/income" element={<Income />} />
                <Route path="/payroll" element={<Payroll />} />
                <Route path="/bi" element={<DashboardV2 />} />
                <Route path="/accounting" element={<TrialBalance />} />
                <Route path="/trial-balance" element={<TrialBalance />} />
                <Route path="/balance-sheet" element={<BalanceSheet />} />
                <Route path="/profit-loss" element={<ProfitLoss />} />
                <Route path="/outlets" element={<Outlets />} />
                <Route path="/promotions" element={<Promotions />} />
                <Route path="/customer-groups" element={<CustomerGroups />} />
                <Route
                  path="/delivery-partners"
                  element={<DeliveryPartners />}
                />
                <Route path="/warranties" element={<Warranties />} />
                <Route path="/fixed-assets" element={<FixedAssets />} />
                <Route path="/installments" element={<Installments />} />
                <Route path="/quotations" element={<Quotations />} />
                <Route path="/barcode-labels" element={<BarcodeLabels />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/units" element={<Units />} />
                <Route path="/racks" element={<Racks />} />
                <Route path="/variations" element={<Variations />} />
                <Route path="/counters" element={<Counters />} />
                <Route path="/denominations" element={<Denominations />} />
                <Route
                  path="/multiple-currencies"
                  element={<MultipleCurrencies />}
                />
                <Route path="/expense-items" element={<ExpenseItems />} />
                <Route path="/income-items" element={<IncomeItems />} />
                <Route
                  path="/accounting-reports"
                  element={<AccountingReports />}
                />
                <Route path="/roles" element={<Roles />} />
                <Route path="/payment-methods" element={<PaymentMethods />} />
                <Route path="/registers" element={<Registers />} />
                <Route path="/deposits" element={<Deposits />} />
                <Route path="/servicing" element={<Servicing />} />
                <Route path="/bulk-item-update" element={<BulkItemUpdate />} />
                <Route path="/advanced-reports" element={<AdvancedReports />} />
                <Route
                  path="/fixed-asset-stock"
                  element={<FixedAssetStock />}
                />
              </Route>

              {/* Admin only */}
              <Route element={<ProtectedShell roles={["admin"]} />}>
                <Route path="/settings" element={<Settings />} />
              </Route>
              {/* Super Admin only */}
              <Route element={<ProtectedShell roles={["super_admin"]} />}>
                <Route path="/users" element={<Users />} />
              </Route>

              <Route path="*" element={<Navigate to="/pos" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}

export default App;
