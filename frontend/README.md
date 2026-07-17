# No Bargaining POS — Frontend

React 19 + Tailwind CSS POS / retail-ERP frontend for the No Bargaining POS.
Industrial red (`#E60000`) + black + yellow (`#FDE047`) design, sharp edges,
Cabinet Grotesk display font, JetBrains Mono for numerics, lucide-react icons.

## Tech
- React 19, React Router 7, Recharts, react-i18next, sonner, qrcode.react
- Axios (`src/lib/api.js`) — auto-attaches `Authorization: Bearer` from `localStorage.pos_token`
- State: React Query / SWR where used; mostly local `useState`

## Local run
```bash
cd frontend
cp .env.example .env          # set REACT_APP_BACKEND_URL (default http://localhost:8001)
npm install                   # or yarn
npm start                     # craco dev server on http://localhost:3000
```
The backend must be running (see `../backend/README.md`).

## Features / modules
| Group | Pages |
|-------|-------|
| Sales | Billing/POS, Orders, Customers, Bookings, Sale Returns |
| Purchase | Suppliers, Purchases (PO + receive), Purchase Returns, Damage Stock |
| Accounts | Accounts, Transfers, Expenses, Income, Customer Dues, Supplier Payments |
| HR | Attendance, Payroll, Staff |
| Reports | Dashboard, Reports, BI Dashboard v2, Trial Balance, Balance Sheet, Profit & Loss |
| Setup | Outlets (multi-outlet switcher), Notifications (bell), Settings |

## Highlights (better-than-QPos)
- Multi-language (English / Hindi via react-i18next, language switch in top bar)
- BI Dashboard v2: comparison chart, Top-10 items/customers, cash-flow, profit margin
- Cashier Shift open/close with variance (top-bar Shift button)
- WhatsApp bill send (stub) + QR code on receipt
- GS1 EAN-13 barcode on labels
- Voice search on POS ("add 2 kg sugar")
- Offline-first: `src/lib/offlineQueue.js` queues POSTs when offline, flushes on reconnect

Every interactive element has a unique kebab-case `data-testid` for E2E testing.
