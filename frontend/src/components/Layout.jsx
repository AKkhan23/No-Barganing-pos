import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ScanBarcode, Package, Users, UserCog,
  Settings as SettingsIcon, LogOut, Store, CalendarCheck,
  ArrowLeftRight, Truck, ShoppingBag, Undo2, PackageX,
  Landmark, CreditCard, Banknote, Repeat, TrendingDown,
  TrendingUp, Clock, Wallet, PieChart, Calculator, Bell, X,
  Globe, BookOpen, Scale, FileBarChart, Tag, ShieldCheck,
  Building2, FileText, Printer, ChevronDown, Search, Receipt,
  Layers, Ruler, TableProperties, Hash, Palette, Currency,
  UserPlus, Wrench, ArrowRightToLine, ArrowLeftFromLine, ListChecks, FlaskConical, Tally5, BarChart,
  Menu, ShoppingCart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../lib/auth";
import { Toaster } from "sonner";
import { toast } from "sonner";
import api from "../lib/api";
import { ConnectionBadge, InstallAppButton } from "./PWAInstall";

const GROUPS = [
  { label: "Home", items: [
    { to: "/dashboard", key: "home", label: "Home", icon: LayoutDashboard, roles: ["admin", "manager"] },
  ]},
  { label: "Outlets", items: [
    { to: "/outlets", key: "outlets", label: "Outlets", icon: Store, roles: ["admin", "manager"] },
  ]},
  { label: "Sale", items: [
    { to: "/pos", key: "pos", label: "POS", icon: ScanBarcode, roles: ["admin", "manager", "cashier"] },
    { to: "/orders", key: "sales", label: "Sales", icon: Receipt, roles: ["admin", "manager", "cashier"] },
    { to: "/customers", key: "customers", label: "Customers", icon: Users, roles: ["admin", "manager", "cashier"] },
    { to: "/customer-groups", key: "customerGroups", label: "Customer Groups", icon: Users, roles: ["admin", "manager"] },
    { to: "/promotions", key: "promotions", label: "Promotions", icon: Tag, roles: ["admin", "manager"] },
    { to: "/delivery-partners", key: "deliveryPartners", label: "Delivery Partners", icon: Truck, roles: ["admin", "manager"] },
    { to: "/counters", key: "counters", label: "Counters", icon: Hash, roles: ["admin", "manager"] },
  ]},
  { label: "Item / Product", items: [
    { to: "/products", key: "products", label: "Products", icon: Package, roles: ["admin", "manager"] },
    { to: "/categories", key: "categories", label: "Categories", icon: BookOpen, roles: ["admin", "manager"] },
    { to: "/brands", key: "brands", label: "Brands", icon: Palette, roles: ["admin", "manager"] },
    { to: "/units", key: "units", label: "Units", icon: Ruler, roles: ["admin", "manager"] },
    { to: "/racks", key: "racks", label: "Racks", icon: TableProperties, roles: ["admin", "manager"] },
    { to: "/variations", key: "variations", label: "Variations", icon: Layers, roles: ["admin", "manager"] },
  ]},
  { label: "Purchase", items: [
    { to: "/purchases", key: "purchases", label: "Purchases", icon: ShoppingBag, roles: ["admin", "manager"] },
    { to: "/purchase-returns", key: "purchaseReturns", label: "Purchase Returns", icon: Undo2, roles: ["admin", "manager"] },
    { to: "/suppliers", key: "suppliers", label: "Suppliers", icon: Truck, roles: ["admin", "manager"] },
  ]},
  { label: "Customer Receive", items: [
    { to: "/customer-dues", key: "customerDues", label: "Customer Receive", icon: CreditCard, roles: ["admin", "manager"] },
  ]},
  { label: "Deposit", items: [
    { to: "/deposits", key: "deposits", label: "Deposits", icon: Landmark, roles: ["admin", "manager"] },
  ]},
  { label: "Supplier Payment", items: [
    { to: "/supplier-payments", key: "supplierPayments", label: "Supplier Payment", icon: Banknote, roles: ["admin", "manager"] },
  ]},
  { label: "Accounting", items: [
    { to: "/accounts", key: "accounts", label: "Accounts", icon: Landmark, roles: ["admin", "manager"] },
    { to: "/trial-balance", key: "trialBalance", label: "Trial Balance", icon: BookOpen, roles: ["admin", "manager"] },
    { to: "/balance-sheet", key: "balanceSheet", label: "Balance Sheet", icon: Scale, roles: ["admin", "manager"] },
    { to: "/profit-loss", key: "profitLoss", label: "Profit & Loss", icon: TrendingDown, roles: ["admin", "manager"] },
    { to: "/accounting-reports", key: "accountingReports", label: "Accounting Reports", icon: FileBarChart, roles: ["admin", "manager"] },
  ]},
  { label: "Attendance", items: [
    { to: "/attendance", key: "attendance", label: "Attendance", icon: Clock, roles: ["admin", "manager", "cashier"] },
    { to: "/check-in-out", key: "checkInOut", label: "Check In/Out", icon: ArrowRightToLine, roles: ["admin", "manager", "cashier"] },
  ]},
  { label: "Report", items: [
    { to: "/reports", key: "reports", label: "Reports", icon: PieChart, roles: ["admin", "manager"] },
    { to: "/advanced-reports", key: "advancedReports", label: "Advanced Reports", icon: FileBarChart, roles: ["admin", "manager"] },
    { to: "/bi", key: "bi", label: "BI Dashboard", icon: BarChart, roles: ["admin", "manager"] },
  ]},
  { label: "Expense", items: [
    { to: "/expenses", key: "expenses", label: "Expenses", icon: TrendingDown, roles: ["admin", "manager"] },
    { to: "/expense-items", key: "expenseItems", label: "Expense Categories", icon: BookOpen, roles: ["admin", "manager"] },
  ]},
  { label: "Income", items: [
    { to: "/income", key: "income", label: "Income", icon: TrendingUp, roles: ["admin", "manager"] },
    { to: "/income-items", key: "incomeItems", label: "Income Items", icon: BookOpen, roles: ["admin", "manager"] },
  ]},
  { label: "Sale Return", items: [
    { to: "/sale-returns", key: "saleReturns", label: "Sale Returns", icon: ArrowLeftRight, roles: ["admin", "manager"] },
  ]},
  { label: "Installment Sales", items: [
    { to: "/installments", key: "installments", label: "Installments", icon: CreditCard, roles: ["admin", "manager"] },
  ]},
  { label: "Warranty / Servicing", items: [
    { to: "/warranties", key: "warranties", label: "Warranties", icon: ShieldCheck, roles: ["admin", "manager"] },
    { to: "/servicing", key: "servicing", label: "Servicing", icon: Wrench, roles: ["admin", "manager"] },
  ]},
  { label: "Salary / Payroll", items: [
    { to: "/payroll", key: "payroll", label: "Salary", icon: Wallet, roles: ["admin", "manager"] },
  ]},
  { label: "Fixed Assets", items: [
    { to: "/fixed-assets", key: "fixedAssets", label: "Fixed Assets", icon: Building2, roles: ["admin", "manager"] },
    { to: "/fixed-asset-stock", key: "fixedAssetStock", label: "Asset Stock", icon: Package, roles: ["admin", "manager"] },
  ]},
  { label: "Booking", items: [
    { to: "/bookings", key: "bookings", label: "Booking", icon: CalendarCheck, roles: ["admin", "manager", "cashier"] },
  ]},
  { label: "Quotation", items: [
    { to: "/quotations", key: "quotations", label: "Quotations", icon: FileText, roles: ["admin", "manager"] },
  ]},
  { label: "Register", items: [
    { to: "/registers", key: "registers", label: "Registers", icon: Tally5, roles: ["admin", "manager"] },
  ]},
  { label: "Transfer", items: [
    { to: "/transfers", key: "transfers", label: "Transfers", icon: Repeat, roles: ["admin", "manager"] },
  ]},
  { label: "Inventory / Stock", items: [
    { to: "/stock", key: "stock", label: "Stock Movements", icon: Package, roles: ["admin", "manager"] },
    { to: "/damage-stock", key: "damageStock", label: "Damage Stock", icon: PackageX, roles: ["admin", "manager"] },
  ]},
  { label: "Tools", items: [
    { to: "/bulk-item-update", key: "bulkItemUpdate", label: "Bulk Item Update", icon: ListChecks, roles: ["admin", "manager"] },
  ]},
  { label: "Setting", items: [
    { to: "/settings", key: "settings", label: "Settings", icon: SettingsIcon, roles: ["admin"] },
    { to: "/barcode-labels", key: "barcodeLabels", label: "Barcode Labels", icon: Printer, roles: ["admin", "manager"] },
    { to: "/denominations", key: "denominations", label: "Denominations", icon: Currency, roles: ["admin", "manager"] },
    { to: "/multiple-currencies", key: "multipleCurrencies", label: "Currencies", icon: Globe, roles: ["admin", "manager"] },
    { to: "/payment-methods", key: "paymentMethods", label: "Payment Methods", icon: CreditCard, roles: ["admin", "manager"] },
    { to: "/roles", key: "roles", label: "Roles", icon: ShieldCheck, roles: ["admin"] },
  ]},
  { label: "Authentication", items: [
    { to: "/users", key: "users", label: "Users", icon: UserCog, roles: ["super_admin"] },
    { to: "/profile", key: "profile", label: "My Profile", icon: UserPlus, roles: ["admin", "manager", "cashier"] },
  ]},
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const items = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((n) => user?.role === 'super_admin' || n.roles?.includes(user?.role)),
  })).filter((g) => g.items.length > 0);
  const [openGroups, setOpenGroups] = useState({});
  const [navSearch, setNavSearch] = useState("");
  const allNavItems = GROUPS.flatMap((g) => g.items);
  const [shiftOpen, setShiftOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [bottomOpen, setBottomOpen] = useState(false);
  const [outlets, setOutlets] = useState([]);
  const [outlet, setOutlet] = useState(localStorage.getItem("pos_outlet") || "");
  const [outletOpen, setOutletOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const unread = notifs.filter((n) => !n.read).length;

  const loadOutlets = () =>
    api.get("/outlets").then((r) => {
      setOutlets(r.data || []);
      if (!localStorage.getItem("pos_outlet") && (r.data || []).length) {
        const first = r.data[0];
        localStorage.setItem("pos_outlet", String(first.id));
        localStorage.setItem("pos_outlet_name", first.name || "");
        localStorage.setItem("pos_outlet_address", first.address || "");
        localStorage.setItem("pos_outlet_phone", first.phone || "");
        localStorage.setItem("pos_outlet_gstin", first.gstin || "");
        setOutlet(String(first.id));
      }
    }).catch(() => {});

  const loadNotifs = () =>
    api.get("/notifications").then((r) => setNotifs(r.data || [])).catch(() => {});

  useEffect(() => {
    loadOutlets();
    loadNotifs();
    const onOutletsChanged = () => loadOutlets();
    window.addEventListener("outlets-changed", onOutletsChanged);
    const onClickOutside = () => setOutletOpen(false);
    window.addEventListener("click", onClickOutside);
    return () => {
      window.removeEventListener("outlets-changed", onOutletsChanged);
      window.removeEventListener("click", onClickOutside);
    };
  }, []);

  const onOutletChange = (e) => {
    localStorage.setItem("pos_outlet", e.target.value);
    const selected = outlets.find((o) => String(o.id) === e.target.value);
    if (selected) {
      localStorage.setItem("pos_outlet_name", selected.name || "");
      localStorage.setItem("pos_outlet_address", selected.address || "");
      localStorage.setItem("pos_outlet_phone", selected.phone || "");
      localStorage.setItem("pos_outlet_gstin", selected.gstin || "");
    }
    setOutlet(e.target.value);
  };

  const markRead = async (n) => {
    if (n.read) return;
    try {
      await api.patch(`/notifications/${n.id}/read`, {});
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {}
  };

  return (
    <div className="flex h-screen w-full bg-zinc-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-64 bg-zinc-950 text-zinc-100 flex flex-col border-r-2 border-zinc-900
        h-screen overflow-hidden transition-transform duration-300
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        <div className="p-5 border-b-2 border-zinc-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => { navigate("/pos"); setSidebarOpen(false); }} data-testid="brand-logo">
              <div className="w-10 h-10 bg-[#E60000] flex items-center justify-center">
                <Store className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <div className="font-display font-black text-xl leading-none tracking-tight uppercase">No Bargaining</div>
                <div className="text-xs font-mono text-zinc-500 mt-1 uppercase tracking-widest"> </div>
              </div>
            </div>
            <button onClick={() => setNotifOpen((v) => !v)} data-testid="nav-notifications" className="relative p-2 hover:bg-zinc-800 transition-colors" title={t("nav.notifications")}>
              <Bell className="w-5 h-5 text-zinc-300" strokeWidth={2.5} />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#E60000] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
          </div>
          {notifOpen && (
            <div className="mt-3 bg-zinc-900 border-2 border-zinc-700 max-h-72 overflow-y-auto" data-testid="notif-dropdown">
              {notifs.length === 0 ? (
                  <div className="p-3 text-xs font-mono text-zinc-500">No notifications.</div>
              ) : (
                notifs.map((n) => (
                  <button key={n.id} onClick={() => markRead(n)}
                    className={`w-full text-left p-3 border-b border-zinc-800 last:border-0 flex items-start gap-2 hover:bg-zinc-800 ${n.read ? "opacity-60" : ""}`} data-testid={`notif-${n.id}`}>
                    <span className={`mt-1 w-2 h-2 flex-shrink-0 ${n.read ? "bg-zinc-600" : "bg-[#FDE047]"}`} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-white truncate">{n.title}</span>
                      {n.message && <span className="block text-[11px] text-zinc-400 leading-snug">{n.message}</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-4 pt-3 pb-1">
          <div className="relative">
            <input type="text" value={navSearch} onChange={(e) => setNavSearch(e.target.value)}
              placeholder={t("common.search") + " pages\u2026"}
              className="w-full h-9 bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-mono px-3 pl-8 focus:outline-none focus:border-[#E60000] placeholder-zinc-600" />
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" strokeWidth={2.5} />
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto py-1 min-h-0">
          {navSearch ? (
            allNavItems.filter((n) => {
              const label = t(`nav.${n.key}`, n.label).toLowerCase();
              return label.includes(navSearch.toLowerCase());
            }).map((n) => {
              const Icon = n.icon;
              return (
                <NavLink key={n.to} to={n.to} onClick={() => { setNavSearch(""); setSidebarOpen(false); }}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider border-l-4 transition-all ${
                      isActive ? "bg-zinc-900 border-[#E60000] text-white" : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`
                  }>
                  <Icon className="w-5 h-5" strokeWidth={2.5} />
                  {t(`nav.${n.key}`, n.label)}
                </NavLink>
              );
            })
          ) : (
            items.map((g) => {
              const isOpen = openGroups[g.label] !== false;
              return (
                <div key={g.label} className="mb-1">
                  <button onClick={() => setOpenGroups((prev) => ({ ...prev, [g.label]: !isOpen }))}
                    className="w-full flex items-center justify-between px-5 py-2.5 text-xs font-semibold font-mono uppercase tracking-widest text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 transition-colors">
                    <span>{g.items[0] ? t(`nav.${g.items[0].key}`, g.label) : g.label}</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} strokeWidth={3} />
                  </button>
                  {isOpen && g.items.map((n) => {
                    const Icon = n.icon;
                    return (
                      <NavLink key={n.to} to={n.to} data-testid={n.testid} onClick={() => setSidebarOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-5 py-2.5 text-sm font-semibold uppercase tracking-wider border-l-4 transition-all ${
                            isActive
                              ? "bg-zinc-900 border-[#E60000] text-white"
                              : "border-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white"
                          }`
                        }>
                        <Icon className="w-5 h-5" strokeWidth={2.5} />
                        {t(`nav.${n.key}`, n.label)}
                      </NavLink>
                    );
                  })}
                </div>
              );
            })
          )}
        </nav>

        <div className="relative border-t border-zinc-800 px-4 py-2 flex-shrink-0 space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 min-w-0">
            <Store className="w-4 h-4 text-[#E60000] flex-shrink-0" strokeWidth={2.5} />
            <button onClick={() => setOutletOpen(!outletOpen)} data-testid="outlet-switcher"
              className="flex-1 h-9 bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs px-2 truncate text-left flex items-center justify-between gap-1 focus:outline-none focus:border-[#E60000]">
              <span className="truncate">{outlets.find((o) => String(o.id) === outlet)?.name || "Select outlet"}</span>
              <ChevronDown className={`w-3 h-3 text-zinc-400 flex-shrink-0 transition-transform ${outletOpen ? "rotate-180" : ""}`} strokeWidth={3} />
            </button>
          </div>
          {outletOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-1 bg-zinc-800 border border-zinc-700 shadow-xl max-h-40 overflow-y-auto z-50" onClick={(e) => e.stopPropagation()}>
              {outlets.length === 0 && <div className="px-3 py-2 text-xs text-zinc-500">No outlets</div>}
              {outlets.map((o) => (
                <button key={o.id} onClick={() => { onOutletChange({ target: { value: String(o.id) } }); setOutletOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs truncate hover:bg-zinc-700 transition-colors ${String(o.id) === outlet ? "text-[#E60000] font-bold bg-zinc-700" : "text-zinc-100"}`}>
                  {o.name}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 min-w-0">
            <Globe className="w-4 h-4 text-zinc-400 flex-shrink-0" strokeWidth={2.5} />
            <select value={i18n.language} onChange={(e) => { i18n.changeLanguage(e.target.value); localStorage.setItem("pos_lang", e.target.value); }} data-testid="lang-select"
              className="flex-1 h-9 bg-zinc-800 border border-zinc-700 text-zinc-100 text-xs px-2 focus:outline-none focus:border-[#E60000]">
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="mr">मराठी</option>
              <option value="ta">தமிழ்</option>
              <option value="ur">اردو</option>
            </select>
          </div>
        </div>
        <div className="border-t-2 border-zinc-800 bg-zinc-900">
          <button onClick={() => setBottomOpen((v) => !v)} data-testid="nav-bottom-toggle"
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors">
            <div className="w-9 h-9 bg-[#FDE047] text-zinc-900 flex items-center justify-center font-display font-bold flex-shrink-0">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-base font-semibold truncate text-white" data-testid="current-user-name">{user?.name}</div>
                <div className="text-xs font-mono uppercase text-zinc-500 tracking-widest">{user?.role}</div>
              </div>
            <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${bottomOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
          </button>
          {bottomOpen && (
            <div className="px-4 pb-4 space-y-2 border-t border-zinc-800 pt-3">
              <button onClick={() => setShiftOpen(true)} data-testid="nav-shift"
                className="w-full flex items-center justify-center gap-2 h-10 bg-[#FDE047] text-zinc-900 text-xs font-bold uppercase tracking-widest hover:bg-yellow-300 transition-colors">
                <Calculator className="w-4 h-4" strokeWidth={2.5} /> Shift Report
              </button>

              <InstallAppButton />
              <ConnectionBadge />
              <button onClick={() => window.open('/api/docs', '_blank')} data-testid="nav-swagger"
                className="w-full flex items-center justify-center gap-2 h-10 bg-zinc-800 hover:bg-blue-600 text-white text-xs font-bold uppercase tracking-widest transition-colors">
                <BookOpen className="w-4 h-4" strokeWidth={2.5} /> API Docs
              </button>
              <button onClick={logout} data-testid="logout-btn"
                className="w-full flex items-center justify-center gap-2 h-10 bg-zinc-800 hover:bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest transition-colors">
                <LogOut className="w-4 h-4" strokeWidth={2.5} /> {t("common.logout")}
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 overflow-hidden bg-zinc-50 flex flex-col min-w-0">
        {/* Mobile header with hamburger */}
        <div className="lg:hidden flex items-center justify-between bg-zinc-950 text-white px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="p-1 hover:bg-zinc-800 rounded" aria-label="Open menu">
            <Menu className="w-6 h-6" strokeWidth={2.5} />
          </button>
          <div className="font-display font-black text-sm uppercase tracking-tight">No Bargaining</div>
          <button onClick={() => setNotifOpen((v) => !v)} className="relative p-1 hover:bg-zinc-800 rounded" title={t("nav.notifications")}>
            <Bell className="w-5 h-5 text-zinc-300" strokeWidth={2.5} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-[#E60000] text-white text-[9px] font-mono font-bold flex items-center justify-center">
                {unread}
              </span>
            )}
          </button>
        </div>
        <div className="flex-1 overflow-hidden pb-16 lg:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t-2 border-zinc-800 flex items-center justify-around h-14 safe-area-bottom">
        {[
          { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
          { to: "/pos", icon: ScanBarcode, label: "POS" },
          { to: "/pos?cart=1", icon: ShoppingCart, label: "Cart" },
          { to: "#more", icon: Menu, label: "More" },
        ].map((tab) => {
          const isActive = tab.to === "#more"
            ? false
            : tab.to === location.pathname || (tab.to.includes("?") && location.pathname + location.search === tab.to) || (tab.to === "/pos" && (location.pathname === "/pos" || location.pathname.startsWith("/pos")) && !location.search.includes("cart=1"));
          const cartActive = tab.to.includes("cart=1") && location.pathname === "/pos" && location.search.includes("cart=1");
          const active = tab.to === "#more" ? false : (tab.to === "/pos" && location.pathname === "/pos" && !location.search.includes("cart=1")) ? (isActive && !location.search.includes("cart=1")) : (tab.to === "/pos?cart=1") ? cartActive : isActive;
          return tab.to === "#more" ? (
            <button key="more" onClick={() => setSidebarOpen(true)}
              className="flex flex-col items-center justify-center gap-0.5 h-full px-4 text-zinc-500">
              <Menu className="w-5 h-5" strokeWidth={2} />
              <span className="text-[9px] font-mono uppercase tracking-wider">More</span>
            </button>
          ) : (
            <NavLink key={tab.to} to={tab.to}
              className="flex flex-col items-center justify-center gap-0.5 h-full px-4">
              <tab.icon className={`w-5 h-5 ${active ? "text-[#E60000]" : "text-zinc-500"}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[9px] font-mono uppercase tracking-wider ${active ? "text-[#E60000] font-bold" : "text-zinc-500"}`}>{tab.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <Toaster position="bottom-right" theme="light" richColors duration={1000} />
      {shiftOpen && <ShiftModal onClose={() => setShiftOpen(false)} />}
    </div>
  );
}

function ShiftModal({ onClose }) {
  const [current, setCurrent] = useState(null);
  const [openingCash, setOpeningCash] = useState("0");
  const [cash, setCash] = useState("");
  const [expected, setExpected] = useState("");
  const [busy, setBusy] = useState(false);
  const [variance, setVariance] = useState(null);

  const loadCurrent = () => api.get("/shifts/current").then((r) => setCurrent(r.data)).catch(() => setCurrent(null));
  useEffect(() => { loadCurrent(); }, []);

  const openShift = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/shifts", { opening_cash: Number(openingCash || 0) }); toast.success("Shift opened"); loadCurrent(); }
    catch (err) { toast.error(err?.response?.data?.detail || "Failed"); } finally { setBusy(false); }
  };

  const closeShift = async (e) => {
    e.preventDefault(); if (!current) return; setBusy(true);
    try {
      const { data } = await api.post(`/shifts/${current.id}/close`, { closing_cash: Number(cash || 0), expected_cash: Number(expected || 0) });
      setVariance(data.variance); toast.success("Shift closed"); setCurrent(null);
    } catch (err) { toast.error(err?.response?.data?.detail || "Failed"); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="shift-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black uppercase text-lg">Cashier Shift</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {current ? (
            <>
              <div className="bg-zinc-50 border-2 border-zinc-900 p-3 text-xs font-mono">Shift #{current.id} open · Opening: ₹{Number(current.opening_cash).toFixed(2)}</div>
              <div><label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Closing Cash</label><input type="number" step="0.01" value={cash} onChange={(e) => setCash(e.target.value)} data-testid="shift-closing-cash" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" /></div>
              <div><label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Expected Cash</label><input type="number" step="0.01" value={expected} onChange={(e) => setExpected(e.target.value)} data-testid="shift-expected-cash" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" /></div>
              {variance != null && <div className={`border-2 p-3 text-sm font-mono font-bold ${variance < 0 ? "border-[#E60000] text-[#E60000]" : "border-green-600 text-green-700"}`} data-testid="shift-variance">Variance: ₹{Number(variance).toFixed(2)}</div>}
              <button onClick={closeShift} disabled={busy} data-testid="shift-close-btn" className="w-full h-12 bg-[#E60000] text-white font-bold uppercase tracking-widest disabled:opacity-40">Close Shift</button>
            </>
          ) : (
            <>
              <div className="text-xs font-mono text-zinc-600">No active shift. Open a new cashier shift.</div>
              <div><label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">Opening Cash</label><input type="number" step="0.01" value={openingCash} onChange={(e) => setOpeningCash(e.target.value)} data-testid="shift-opening-cash" className="w-full h-11 border-2 border-zinc-300 px-3 font-mono focus:outline-none focus:border-[#E60000]" /></div>
              <button onClick={openShift} disabled={busy} data-testid="shift-open-btn" className="w-full h-12 bg-[#E60000] text-white font-bold uppercase tracking-widest disabled:opacity-40">Open Shift</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}