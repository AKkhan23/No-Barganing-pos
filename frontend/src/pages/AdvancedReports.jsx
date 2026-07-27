import React, { useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../lib/api";
import { formatMoney, formatDate } from "../lib/format";
import { PageShell } from "./Dashboard";

function KpiCard({ label, value }) {
  return (
    <div className="bg-white border-2 border-zinc-200 p-5">
      <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div className="text-3xl font-black text-zinc-900 mt-1">{value}</div>
    </div>
  );
}

function MoneyTable({ columns, rows, renderRow }) {
  return (
    <div className="bg-white border-2 border-zinc-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-zinc-100 text-zinc-900 uppercase text-[10px] tracking-widest">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={`p-3 text-${c.align || "left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="p-6 text-center text-zinc-400"
              >
                No data
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i} className="border-t border-zinc-200 hover:bg-zinc-50">
                {renderRow(row, i)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function loadingSpinner() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );
}

function noData() {
  return (
    <div className="text-center py-20 text-zinc-400">No data available</div>
  );
}

function useFetch(endpoint, params, deps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(
    () => {
      if (!endpoint) return;
      setLoading(true);
      const cleaned = {};
      Object.entries(params || {}).forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) cleaned[k] = v;
      });
      api
        .get(endpoint, { params: cleaned })
        .then((r) => setData(r.data))
        .catch(() => {
          setData(null);
        })
        .finally(() => setLoading(false));
    },
    deps || [endpoint],
  );
  return { data, loading };
}

const endpointFor = (tab) =>
  `/advanced-reports${tab
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")}`;

const TABS = [
  "Z Report",
  "Daily Summary",
  "Due Sales",
  "Final Due",
  "Service Sales",
  "Combo Service",
  "Expiry Stock",
  "Employee Sales",
  "Customer Due Receive",
  "Attendance",
  "Product Profit",
  "Product Sales",
  "Tax Report",
  "Detailed Sales",
  "Purchase by Date",
  "Product Purchase",
  "Salary",
  "Installments",
  "Installment Due",
  "Item Tracing",
  "Price History",
  "Stock Report",
];

function ZReportTab({ date }) {
  const { data, loading } = useFetch("/advanced-reports/z-report", { date }, [
    date,
  ]);
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const pm = data.payment_methods || data.payments || data.paymentModes || [];
  const cs = data.cashiers || data.cashier_summary || [];
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Sales"
          value={formatMoney(data.total_sales || data.total || 0)}
        />
        <KpiCard
          label="Orders Count"
          value={
            data.order_count || data.orders_count || data.total_orders || 0
          }
        />
        <KpiCard
          label="Avg Order"
          value={formatMoney(data.avg_order || data.average || 0)}
        />
        <KpiCard
          label="Tax Collected"
          value={formatMoney(data.total_tax || data.tax || 0)}
        />
      </div>
      {Array.isArray(pm) && pm.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Payment Methods
          </div>
          <MoneyTable
            columns={[
              { key: "method", label: "Method" },
              { key: "count", label: "Count", align: "right" },
              { key: "total", label: "Total", align: "right" },
            ]}
            rows={pm}
            renderRow={(row) => (
              <>
                <td className="p-3 capitalize">
                  {row.method || row.mode || row.name || "-"}
                </td>
                <td className="p-3 text-right font-mono">
                  {row.count || row.orders || 0}
                </td>
                <td className="p-3 text-right font-mono">
                  {formatMoney(row.total || row.amount || 0)}
                </td>
              </>
            )}
          />
        </div>
      )}
      {Array.isArray(cs) && cs.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
            Cashier Summary
          </div>
          <MoneyTable
            columns={[
              { key: "name", label: "Name" },
              { key: "orders", label: "Orders", align: "right" },
              { key: "total", label: "Total", align: "right" },
            ]}
            rows={cs}
            renderRow={(row) => (
              <>
                <td className="p-3">
                  {row.name || row.cashier || row.user || "-"}
                </td>
                <td className="p-3 text-right font-mono">
                  {row.orders || row.count || 0}
                </td>
                <td className="p-3 text-right font-mono">
                  {formatMoney(row.total || row.amount || 0)}
                </td>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

function DailySummaryTab({ date }) {
  const { data, loading } = useFetch(
    "/advanced-reports/daily-summary",
    { date },
    [date],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.hours ||
    data.hourly ||
    data.records ||
    data.details ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Sales"
          value={formatMoney(data.total_sales || data.total || 0)}
        />
        <KpiCard
          label="Total Orders"
          value={data.total_orders || data.orders || 0}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "hour", label: "Hour" },
          { key: "orders", label: "Orders", align: "right" },
          { key: "sales", label: "Sales", align: "right" },
          { key: "avg", label: "Avg", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono text-xs">
              {row.hour || row.time || row.period || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.orders || row.count || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.sales || row.total || row.amount || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.avg || row.average || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function DueSalesTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/due-sales",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.orders ||
    data.due_orders ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Due"
          value={formatMoney(data.total_due || data.total || 0)}
        />
        <KpiCard
          label="Total Orders"
          value={data.total_orders || data.orders_count || data.count || 0}
        />
        <KpiCard
          label="Total Amount"
          value={formatMoney(data.total_amount || data.amount || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "inv", label: "Invoice" },
          { key: "customer", label: "Customer" },
          { key: "date", label: "Date" },
          { key: "total", label: "Total", align: "right" },
          { key: "paid", label: "Paid", align: "right" },
          { key: "due", label: "Due", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono text-xs">
              {row.invoice_no || row.invoice || row._id?.slice(-6) || "-"}
            </td>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3 text-xs">
              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.total || row.grand_total || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.paid || 0)}
            </td>
            <td className="p-3 text-right font-mono font-bold text-[#E60000]">
              {formatMoney(row.due || row.balance || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function FinalDueTab() {
  const { data, loading } = useFetch(
    "/advanced-reports/final-due-sales",
    {},
    [],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.customers ||
    data.due_customers ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Customers"
          value={data.total_customers || data.count || rows.length}
        />
        <KpiCard
          label="Total Due Amount"
          value={formatMoney(data.total_due || data.total || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "name", label: "Customer" },
          { key: "phone", label: "Phone" },
          { key: "total", label: "Total Due", align: "right" },
          { key: "last", label: "Last Order" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">{row.customer_name || row.name || "-"}</td>
            <td className="p-3 font-mono text-xs">
              {row.phone || row.customer_phone || "-"}
            </td>
            <td className="p-3 text-right font-mono text-[#E60000] font-bold">
              {formatMoney(row.total_due || row.due || row.balance || 0)}
            </td>
            <td className="p-3 text-xs">
              {row.last_order_date || row.last_order
                ? new Date(
                    row.last_order_date || row.last_order,
                  ).toLocaleDateString()
                : "-"}
            </td>
          </>
        )}
      />
    </div>
  );
}

function ServiceSalesTab({ startDate, endDate }) {
  const [status, setStatus] = useState("");
  const { data, loading } = useFetch(
    "/advanced-reports/service-sales",
    { start_date: startDate, end_date: endDate, status },
    [startDate, endDate, status],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.services ||
    data.records ||
    data.orders ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Services"
          value={data.total_services || data.total || data.count || rows.length}
        />
        <KpiCard
          label="Total Amount"
          value={formatMoney(data.total_amount || data.amount || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "id", label: "ID" },
          { key: "customer", label: "Customer" },
          { key: "service", label: "Service" },
          { key: "date", label: "Date" },
          { key: "amount", label: "Amount", align: "right" },
          { key: "status", label: "Status" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono text-xs">
              {row.service_id || row._id?.slice(-6) || "-"}
            </td>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3">
              {row.service_name ||
                row.service_description ||
                row.description ||
                "-"}
            </td>
            <td className="p-3 text-xs">
              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.amount || row.total || 0)}
            </td>
            <td className="p-3">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.status === "completed" ? "bg-green-100 text-green-700" : row.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-zinc-100 text-zinc-500"}`}
              >
                {row.status || "-"}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}

function ComboServiceTab() {
  const { data, loading } = useFetch("/advanced-reports/combo-service", {}, []);
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.services ||
    data.groups ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Groups"
          value={data.total_groups || data.total || data.count || rows.length}
        />
        <KpiCard
          label="Total Amount"
          value={formatMoney(data.total_amount || data.amount || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "type", label: "Service Type" },
          { key: "count", label: "Count", align: "right" },
          { key: "amount", label: "Amount", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.service_type || row.type || row.name || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.count || row.orders || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.amount || row.total || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function ExpiryStockTab() {
  const [days, setDays] = useState(30);
  const { data, loading } = useFetch(
    "/advanced-reports/expiry-stock",
    { days },
    [days],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.products ||
    data.items ||
    data.stock ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Expire Within (days)
        </label>
        <input
          type="number"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-10 w-24 border-2 border-zinc-300 px-3 font-mono text-xs"
          min={1}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Expiring Products"
          value={data.total_products || data.total || data.count || rows.length}
        />
        <KpiCard
          label="Total Quantity"
          value={data.total_qty || data.total_quantity || 0}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "product", label: "Product" },
          { key: "batch", label: "Batch" },
          { key: "qty", label: "Qty", align: "right" },
          { key: "expiry", label: "Expiry Date" },
          { key: "days", label: "Days Left", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.product_name || row.name || row.product || "-"}
            </td>
            <td className="p-3 font-mono text-xs">
              {row.batch_no || row.batch || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.quantity || row.qty || row.stock || 0}
            </td>
            <td className="p-3 text-xs">
              {row.expiry_date || row.expiry
                ? new Date(row.expiry_date || row.expiry).toLocaleDateString()
                : "-"}
            </td>
            <td className="p-3 text-right font-mono">
              <span
                className={
                  Number(row.days_left || row.days) <= 7
                    ? "text-[#E60000] font-bold"
                    : ""
                }
              >
                {row.days_left || row.days || "-"}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}

function EmployeeSalesTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/employee-sales",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.employees ||
    data.records ||
    data.sales ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Employees"
          value={data.total_employees || data.count || rows.length}
        />
        <KpiCard
          label="Total Sales"
          value={formatMoney(data.total_sales || data.total || 0)}
        />
        <KpiCard
          label="Avg Per Employee"
          value={formatMoney(data.avg_per_employee || data.average || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "emp", label: "Employee" },
          { key: "orders", label: "Orders", align: "right" },
          { key: "sales", label: "Sales", align: "right" },
          { key: "avg", label: "Avg Order", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.employee_name || row.name || row.employee || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.orders || row.count || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.sales || row.total || row.amount || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.avg || row.average || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function CustomerDueReceiveTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/customer-due-receive",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.payments ||
    data.receives ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Received"
          value={formatMoney(data.total_received || data.total || 0)}
        />
        <KpiCard
          label="Total Payments"
          value={data.total_payments || data.count || rows.length}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "customer", label: "Customer" },
          { key: "phone", label: "Phone" },
          { key: "amount", label: "Amount", align: "right" },
          { key: "date", label: "Date" },
          { key: "method", label: "Method" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3 font-mono text-xs">
              {row.phone || row.customer_phone || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.amount || row.paid || row.total || 0)}
            </td>
            <td className="p-3 text-xs">
              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 capitalize">
              {row.payment_method || row.method || row.mode || "-"}
            </td>
          </>
        )}
      />
    </div>
  );
}

function AttendanceTab({ startDate, endDate }) {
  const [status, setStatus] = useState("");
  const { data, loading } = useFetch(
    "/advanced-reports/attendance-report",
    { start_date: startDate, end_date: endDate, status },
    [startDate, endDate, status],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.attendance ||
    data.records ||
    data.entries ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          <option value="">All Status</option>
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="late">Late</option>
          <option value="half-day">Half Day</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Records"
          value={data.total_records || data.count || rows.length}
        />
        <KpiCard
          label="Present"
          value={data.present || data.total_present || 0}
        />
        <KpiCard label="Absent" value={data.absent || data.total_absent || 0} />
        <KpiCard label="Late" value={data.late || data.total_late || 0} />
      </div>
      <MoneyTable
        columns={[
          { key: "emp", label: "Employee" },
          { key: "date", label: "Date" },
          { key: "time", label: "Time" },
          { key: "status", label: "Status" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.employee_name || row.name || row.employee || "-"}
            </td>
            <td className="p-3 text-xs">
              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 font-mono text-xs">
              {row.check_in || row.time || row.login_time || "-"}
            </td>
            <td className="p-3">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.status === "present" ? "bg-green-100 text-green-700" : row.status === "absent" ? "bg-red-100 text-red-700" : row.status === "late" ? "bg-yellow-100 text-yellow-700" : "bg-zinc-100 text-zinc-500"}`}
              >
                {row.status || "-"}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}

function ProductProfitTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/product-profit",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.products ||
    data.items ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={formatMoney(data.total_revenue || data.revenue || 0)}
        />
        <KpiCard
          label="Total Cost"
          value={formatMoney(data.total_cost || data.cost || 0)}
        />
        <KpiCard
          label="Total Profit"
          value={formatMoney(data.total_profit || data.profit || 0)}
        />
        <KpiCard
          label="Margin"
          value={data.margin ? `${data.margin}%` : "0%"}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "product", label: "Product" },
          { key: "qty", label: "Qty Sold", align: "right" },
          { key: "revenue", label: "Revenue", align: "right" },
          { key: "cost", label: "Cost", align: "right" },
          { key: "profit", label: "Profit", align: "right" },
          { key: "margin", label: "Margin", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.product_name || row.name || row.product || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.qty || row.quantity || row.sold || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.revenue || row.total || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.cost || row.total_cost || 0)}
            </td>
            <td className="p-3 text-right font-mono font-bold text-[#E60000]">
              {formatMoney(row.profit || row.total_profit || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {row.margin ? `${row.margin}%` : "-"}
            </td>
          </>
        )}
      />
    </div>
  );
}

function ProductSalesTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/product-sales",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.products ||
    data.items ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Products"
          value={data.total_products || data.count || rows.length}
        />
        <KpiCard
          label="Total Quantity"
          value={data.total_qty || data.total_quantity || 0}
        />
        <KpiCard
          label="Total Revenue"
          value={formatMoney(data.total_revenue || data.total || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "product", label: "Product" },
          { key: "qty", label: "Qty", align: "right" },
          { key: "revenue", label: "Revenue", align: "right" },
          { key: "avg", label: "Avg Price", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.product_name || row.name || row.product || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.qty || row.quantity || row.sold || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.revenue || row.total || row.amount || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.avg || row.average || row.avg_price || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function TaxReportTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/tax-report",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.tax_rates ||
    data.taxes ||
    data.rates ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Tax"
          value={formatMoney(data.total_tax || data.total || 0)}
        />
        <KpiCard
          label="Total Sales"
          value={formatMoney(data.total_sales || data.sales || 0)}
        />
        <KpiCard
          label="Taxable Amount"
          value={formatMoney(data.taxable_amount || data.taxable || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "rate", label: "Tax Rate" },
          { key: "sales", label: "Taxable Sales", align: "right" },
          { key: "tax", label: "Tax Amount", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono">
              {row.tax_rate || row.rate || row.name || "0"}%
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.taxable_sales || row.taxable || row.sales || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.tax_amount || row.tax || row.amount || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function DetailedSalesTab({ startDate, endDate }) {
  const [limit, setLimit] = useState(100);
  const { data, loading } = useFetch(
    "/advanced-reports/detailed-sales",
    { start_date: startDate, end_date: endDate, limit },
    [startDate, endDate, limit],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.orders ||
    data.sales ||
    data.records ||
    data.details ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
          Limit
        </label>
        <input
          type="number"
          value={limit}
          onChange={(e) => setLimit(Number(e.target.value))}
          className="h-10 w-20 border-2 border-zinc-300 px-3 font-mono text-xs"
          min={1}
        />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Orders"
          value={data.total_orders || data.count || rows.length}
        />
        <KpiCard
          label="Total Revenue"
          value={formatMoney(data.total_revenue || data.total || 0)}
        />
        <KpiCard
          label="Total Tax"
          value={formatMoney(data.total_tax || data.tax || 0)}
        />
        <KpiCard
          label="Total Discount"
          value={formatMoney(data.total_discount || data.discount || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "inv", label: "Invoice" },
          { key: "customer", label: "Customer" },
          { key: "date", label: "Date" },
          { key: "items", label: "Items", align: "right" },
          { key: "subtotal", label: "Subtotal", align: "right" },
          { key: "discount", label: "Discount", align: "right" },
          { key: "tax", label: "Tax", align: "right" },
          { key: "total", label: "Total", align: "right" },
          { key: "paid", label: "Paid", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 font-mono text-xs">
              {row.invoice_no || row.invoice || row._id?.slice(-6) || "-"}
            </td>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3 text-xs">
              {row.date || row.created_at
                ? new Date(row.date || row.created_at).toLocaleDateString()
                : "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.items_count || row.items || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.subtotal || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.discount_amount || row.discount || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.tax_total || row.tax || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.grand_total || row.total || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.paid || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function PurchaseByDateTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/purchase-by-date",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.purchases ||
    data.records ||
    data.entries ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Purchases"
          value={data.total_purchases || data.count || rows.length}
        />
        <KpiCard
          label="Total Amount"
          value={formatMoney(data.total_amount || data.total || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "date", label: "Date" },
          { key: "count", label: "Orders", align: "right" },
          { key: "amount", label: "Amount", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3 text-xs">
              {row.date ? new Date(row.date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.count || row.orders || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.amount || row.total || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function ProductPurchaseTab({ startDate, endDate }) {
  const { data, loading } = useFetch(
    "/advanced-reports/product-purchase",
    { start_date: startDate, end_date: endDate },
    [startDate, endDate],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.products ||
    data.items ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Products"
          value={data.total_products || data.count || rows.length}
        />
        <KpiCard
          label="Total Qty Purchased"
          value={data.total_qty || data.total_quantity || 0}
        />
        <KpiCard
          label="Total Cost"
          value={formatMoney(data.total_cost || data.total || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "product", label: "Product" },
          { key: "qty", label: "Qty", align: "right" },
          { key: "rate", label: "Rate", align: "right" },
          { key: "total", label: "Total", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.product_name || row.name || row.product || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.qty || row.quantity || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.rate || row.price || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.total || row.amount || row.cost || 0)}
            </td>
          </>
        )}
      />
    </div>
  );
}

function SalaryTab({ startDate, endDate }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [status, setStatus] = useState("");
  const { data, loading } = useFetch(
    "/advanced-reports/salary-report",
    { month, year, status },
    [month, year, status],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.salaries ||
    data.records ||
    data.employees ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Date(0, i).toLocaleString("default", { month: "long" })}
            </option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <option key={i} value={year - 2 + i}>
              {year - 2 + i}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          <option value="">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Salary"
          value={formatMoney(data.total_salary || data.total || 0)}
        />
        <KpiCard
          label="Total Employees"
          value={data.total_employees || data.count || rows.length}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "emp", label: "Employee" },
          { key: "basic", label: "Basic", align: "right" },
          { key: "allowance", label: "Allowance", align: "right" },
          { key: "deduction", label: "Deduction", align: "right" },
          { key: "net", label: "Net", align: "right" },
          { key: "status", label: "Status" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.employee_name || row.name || row.employee || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.basic || row.basic_salary || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.allowance || row.total_allowance || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.deduction || row.total_deduction || 0)}
            </td>
            <td className="p-3 text-right font-mono font-bold">
              {formatMoney(row.net || row.net_salary || row.total || 0)}
            </td>
            <td className="p-3">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.status === "paid" ? "bg-green-100 text-green-700" : row.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-zinc-100 text-zinc-500"}`}
              >
                {row.status || "-"}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}

function InstallmentsTab({ startDate, endDate }) {
  const [status, setStatus] = useState("");
  const { data, loading } = useFetch(
    "/advanced-reports/installment-report",
    { status },
    [status],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.installments ||
    data.records ||
    data.entries ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="defaulted">Defaulted</option>
        </select>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Total Installments"
          value={data.total_installments || data.count || rows.length}
        />
        <KpiCard
          label="Total Amount"
          value={formatMoney(data.total_amount || data.total || 0)}
        />
        <KpiCard
          label="Collected"
          value={formatMoney(data.collected || data.total_collected || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "customer", label: "Customer" },
          { key: "product", label: "Product" },
          { key: "total", label: "Total", align: "right" },
          { key: "paid", label: "Paid", align: "right" },
          { key: "due", label: "Due", align: "right" },
          { key: "status", label: "Status" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3">{row.product_name || row.product || "-"}</td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.total || row.total_amount || 0)}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(row.paid || row.paid_amount || 0)}
            </td>
            <td className="p-3 text-right font-mono text-[#E60000] font-bold">
              {formatMoney(row.due || row.due_amount || 0)}
            </td>
            <td className="p-3">
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.status === "completed" ? "bg-green-100 text-green-700" : row.status === "active" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}
              >
                {row.status || "-"}
              </span>
            </td>
          </>
        )}
      />
    </div>
  );
}

function InstallmentDueTab() {
  const { data, loading } = useFetch(
    "/advanced-reports/installment-due",
    {},
    [],
  );
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.installments ||
    data.due ||
    data.overdue ||
    data.records ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          label="Overdue Count"
          value={data.overdue_count || data.count || rows.length}
        />
        <KpiCard
          label="Total Due"
          value={formatMoney(data.total_due || data.total || 0)}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "customer", label: "Customer" },
          { key: "phone", label: "Phone" },
          { key: "product", label: "Product" },
          { key: "amount", label: "Due Amount", align: "right" },
          { key: "due_date", label: "Due Date" },
          { key: "days", label: "Days Overdue", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">{row.customer_name || row.customer || "-"}</td>
            <td className="p-3 font-mono text-xs">
              {row.phone || row.customer_phone || "-"}
            </td>
            <td className="p-3">{row.product_name || row.product || "-"}</td>
            <td className="p-3 text-right font-mono text-[#E60000] font-bold">
              {formatMoney(row.due_amount || row.amount || row.due || 0)}
            </td>
            <td className="p-3 text-xs">
              {row.due_date ? new Date(row.due_date).toLocaleDateString() : "-"}
            </td>
            <td className="p-3 text-right font-mono text-[#E60000]">
              {row.days_overdue || row.days || 0}
            </td>
          </>
        )}
      />
    </div>
  );
}

function ItemTracingTab({ startDate, endDate }) {
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState([]);
  const { data, loading } = useFetch(
    productId ? "/advanced-reports/item-tracing" : null,
    { product_id: productId, start_date: startDate, end_date: endDate },
    [productId, startDate, endDate],
  );

  useEffect(() => {
    api
      .get("/products")
      .then((r) =>
        setProducts(Array.isArray(r.data) ? r.data : r.data?.products || []),
      )
      .catch(() => {});
  }, []);

  const filtered = products.filter((p) =>
    (p.name || "").toLowerCase().includes(productSearch.toLowerCase()),
  );
  const rows =
    data?.movements ||
    data?.tracing ||
    data?.records ||
    data?.entries ||
    (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search product..."
            className="h-10 w-full border-2 border-zinc-300 pl-9 pr-3 font-mono text-xs"
          />
        </div>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs min-w-[200px]"
        >
          <option value="">-- Select Product --</option>
          {filtered.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!productId ? (
        <div className="text-center py-20 text-zinc-400">
          Select a product to trace
        </div>
      ) : loading ? (
        loadingSpinner()
      ) : !data ? (
        noData()
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Product"
              value={
                data.product_name ||
                products.find((p) => p._id === productId)?.name ||
                "-"
              }
            />
            <KpiCard
              label="Current Stock"
              value={data.current_stock || data.stock || 0}
            />
            <KpiCard
              label="Total Movements"
              value={data.total_movements || data.count || rows.length}
            />
          </div>
          <MoneyTable
            columns={[
              { key: "date", label: "Date" },
              { key: "type", label: "Type" },
              { key: "ref", label: "Reference" },
              { key: "in", label: "In", align: "right" },
              { key: "out", label: "Out", align: "right" },
              { key: "balance", label: "Balance", align: "right" },
              { key: "note", label: "Note" },
            ]}
            rows={Array.isArray(rows) ? rows : []}
            renderRow={(row) => (
              <>
                <td className="p-3 text-xs">
                  {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                </td>
                <td className="p-3">
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.type === "in" || row.type === "purchase" || row.type === "received" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
                  >
                    {row.type || "-"}
                  </span>
                </td>
                <td className="p-3 font-mono text-xs">
                  {row.reference || row.ref || row.order_no || "-"}
                </td>
                <td className="p-3 text-right font-mono text-green-700">
                  {row.in_qty ||
                    row.qty_in ||
                    row.received ||
                    (row.type === "in" ? row.quantity : 0) ||
                    0}
                </td>
                <td className="p-3 text-right font-mono text-[#E60000]">
                  {row.out_qty ||
                    row.qty_out ||
                    row.sold ||
                    (row.type === "out" ? row.quantity : 0) ||
                    0}
                </td>
                <td className="p-3 text-right font-mono">
                  {row.balance_qty || row.balance || row.remaining || 0}
                </td>
                <td className="p-3 text-xs text-zinc-500">
                  {row.note || row.notes || row.description || "-"}
                </td>
              </>
            )}
          />
        </>
      )}
    </div>
  );
}

function PriceHistoryTab() {
  const [productSearch, setProductSearch] = useState("");
  const [productId, setProductId] = useState("");
  const [products, setProducts] = useState([]);
  const { data, loading } = useFetch(
    productId ? "/advanced-reports/price-history" : null,
    { product_id: productId },
    [productId],
  );

  useEffect(() => {
    api
      .get("/products")
      .then((r) =>
        setProducts(Array.isArray(r.data) ? r.data : r.data?.products || []),
      )
      .catch(() => {});
  }, []);

  const filtered = products.filter((p) =>
    (p.name || "").toLowerCase().includes(productSearch.toLowerCase()),
  );
  const rows =
    data?.history ||
    data?.price_history ||
    data?.records ||
    data?.changes ||
    (Array.isArray(data) ? data : []);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            placeholder="Search product..."
            className="h-10 w-full border-2 border-zinc-300 pl-9 pr-3 font-mono text-xs"
          />
        </div>
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs min-w-[200px]"
        >
          <option value="">-- Select Product --</option>
          {filtered.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {!productId ? (
        <div className="text-center py-20 text-zinc-400">
          Select a product to view price history
        </div>
      ) : loading ? (
        loadingSpinner()
      ) : !data ? (
        noData()
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Product"
              value={
                data.product_name ||
                products.find((p) => p._id === productId)?.name ||
                "-"
              }
            />
            <KpiCard
              label="Current Price"
              value={formatMoney(data.current_price || data.price || 0)}
            />
            <KpiCard
              label="Total Changes"
              value={data.total_changes || data.count || rows.length}
            />
          </div>
          <MoneyTable
            columns={[
              { key: "date", label: "Date" },
              { key: "old", label: "Old Price", align: "right" },
              { key: "new", label: "New Price", align: "right" },
              { key: "diff", label: "Change", align: "right" },
              { key: "by", label: "Changed By" },
            ]}
            rows={Array.isArray(rows) ? rows : []}
            renderRow={(row) => {
              const diff =
                (row.new_price || row.new || 0) -
                (row.old_price || row.old || 0);
              return (
                <>
                  <td className="p-3 text-xs">
                    {row.date ? new Date(row.date).toLocaleDateString() : "-"}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatMoney(row.old_price || row.old || 0)}
                  </td>
                  <td className="p-3 text-right font-mono">
                    {formatMoney(row.new_price || row.new || 0)}
                  </td>
                  <td
                    className={`p-3 text-right font-mono ${diff >= 0 ? "text-green-700" : "text-[#E60000]"}`}
                  >
                    {diff >= 0 ? "+" : ""}
                    {formatMoney(diff)}
                  </td>
                  <td className="p-3 text-xs">
                    {row.changed_by || row.user || row.updated_by || "-"}
                  </td>
                </>
              );
            }}
          />
        </>
      )}
    </div>
  );
}

function StockReportTab() {
  const { data, loading } = useFetch("/advanced-reports/stock-report", {}, []);
  if (loading) return loadingSpinner();
  if (!data) return noData();
  const rows =
    data.products ||
    data.stock ||
    data.items ||
    (Array.isArray(data) ? data : []);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Total Products"
          value={data.total_products || data.count || rows.length}
        />
        <KpiCard
          label="Total Stock Qty"
          value={data.total_qty || data.total_quantity || data.total_stock || 0}
        />
        <KpiCard
          label="Total Value"
          value={formatMoney(data.total_value || data.value || 0)}
        />
        <KpiCard
          label="Low Stock Items"
          value={data.low_stock || data.low_stock_count || 0}
        />
      </div>
      <MoneyTable
        columns={[
          { key: "product", label: "Product" },
          { key: "sku", label: "SKU" },
          { key: "category", label: "Category" },
          { key: "stock", label: "Stock", align: "right" },
          { key: "price", label: "Price", align: "right" },
          { key: "value", label: "Value", align: "right" },
        ]}
        rows={Array.isArray(rows) ? rows : []}
        renderRow={(row) => (
          <>
            <td className="p-3">
              {row.product_name || row.name || row.product || "-"}
            </td>
            <td className="p-3 font-mono text-xs">
              {row.sku || row.sku_code || "-"}
            </td>
            <td className="p-3 text-xs">
              {row.category || row.category_name || "-"}
            </td>
            <td className="p-3 text-right font-mono">
              {row.stock || row.quantity || row.qty || 0}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(
                row.price || row.selling_price || row.sale_price || 0,
              )}
            </td>
            <td className="p-3 text-right font-mono">
              {formatMoney(
                row.value ||
                  row.stock_value ||
                  (row.stock || 0) * (row.price || 0),
              )}
            </td>
          </>
        )}
      />
    </div>
  );
}

const NEEDS_DATE_RANGE = [
  "Due Sales",
  "Service Sales",
  "Employee Sales",
  "Customer Due Receive",
  "Attendance",
  "Product Profit",
  "Product Sales",
  "Tax Report",
  "Detailed Sales",
  "Purchase by Date",
  "Product Purchase",
];

const NEEDS_SINGLE_DATE = ["Z Report", "Daily Summary"];

export default function AdvancedReports() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("Z Report");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [appliedStart, setAppliedStart] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [appliedEnd, setAppliedEnd] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [singleDate, setSingleDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [appliedSingle, setAppliedSingle] = useState(
    new Date().toISOString().slice(0, 10),
  );

  useEffect(() => {
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate(new Date().toISOString().slice(0, 10));
    setAppliedStart(new Date().toISOString().slice(0, 10));
    setAppliedEnd(new Date().toISOString().slice(0, 10));
    setSingleDate(new Date().toISOString().slice(0, 10));
    setAppliedSingle(new Date().toISOString().slice(0, 10));
  }, [activeTab]);

  const showDateRange = NEEDS_DATE_RANGE.includes(activeTab);
  const showSingleDate = NEEDS_SINGLE_DATE.includes(activeTab);

  const handleLoad = () => {
    setAppliedStart(startDate);
    setAppliedEnd(endDate);
  };

  const handleSingleLoad = () => {
    setAppliedSingle(singleDate);
  };

  return (
    <PageShell
      title="Advanced Reports"
      subtitle="Comprehensive business intelligence reports"
    >
      <div className="p-6 overflow-y-auto h-full space-y-6">
        <div className="flex gap-0 border-b-2 border-zinc-200 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-widest whitespace-nowrap border-b-2 -mb-[2px] transition-colors ${activeTab === t ? "border-[#E60000] text-[#E60000]" : "border-transparent text-zinc-500 hover:text-zinc-800"}`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4">
          {showDateRange && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
              />
              <button
                onClick={handleLoad}
                className="h-10 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest"
              >
                Load
              </button>
            </>
          )}
          {showSingleDate && (
            <>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="h-10 border-2 border-zinc-300 px-3 font-mono text-xs"
              />
              <button
                onClick={handleSingleLoad}
                className="h-10 px-4 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest"
              >
                Load
              </button>
            </>
          )}
        </div>

        <div className="min-h-[300px]">
          {activeTab === "Z Report" && <ZReportTab date={appliedSingle} />}
          {activeTab === "Daily Summary" && (
            <DailySummaryTab date={appliedSingle} />
          )}
          {activeTab === "Due Sales" && (
            <DueSalesTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Final Due" && <FinalDueTab />}
          {activeTab === "Service Sales" && (
            <ServiceSalesTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Combo Service" && <ComboServiceTab />}
          {activeTab === "Expiry Stock" && <ExpiryStockTab />}
          {activeTab === "Employee Sales" && (
            <EmployeeSalesTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Customer Due Receive" && (
            <CustomerDueReceiveTab
              startDate={appliedStart}
              endDate={appliedEnd}
            />
          )}
          {activeTab === "Attendance" && (
            <AttendanceTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Product Profit" && (
            <ProductProfitTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Product Sales" && (
            <ProductSalesTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Tax Report" && (
            <TaxReportTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Detailed Sales" && (
            <DetailedSalesTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Purchase by Date" && (
            <PurchaseByDateTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Product Purchase" && (
            <ProductPurchaseTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Salary" && (
            <SalaryTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Installments" && (
            <InstallmentsTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Installment Due" && <InstallmentDueTab />}
          {activeTab === "Item Tracing" && (
            <ItemTracingTab startDate={appliedStart} endDate={appliedEnd} />
          )}
          {activeTab === "Price History" && <PriceHistoryTab />}
          {activeTab === "Stock Report" && <StockReportTab />}
        </div>
      </div>
    </PageShell>
  );
}
