import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, ScanBarcode, Plus, Minus, Trash2, User, Wallet,
  CreditCard, Smartphone, Banknote, Receipt, X, Check, Mic,
  ShoppingCart, ArrowLeftFromLine, ChevronDown, Loader2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import api, { formatApiErrorDetail, BACKEND_URL } from "../lib/api";
import { queuedPost, pendingQueueCount } from "../lib/offlineQueue";
import { saveToCache, loadFromCache } from "../lib/offlineCache";
import { formatMoney } from "../lib/format";
import { isWeightUnit, formatStock, formatQty, hasSubUnit, getSubUnit, getDisplayUnit, isKgUnit } from "../lib/sellBy";
import BarcodeScanner from "../components/BarcodeScanner";
import { useAuth } from "../lib/auth";
import { getSocket } from "../lib/socket";

const PAYMENT_MODES = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "upi", label: "UPI", icon: Smartphone },
  { key: "wallet", label: "Wallet", icon: Wallet },
];

export default function POS() {
  const { t } = useTranslation();
  const P = (k) => t(`page.${k}`);
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [settings, setSettings] = useState({ currency_symbol: "₹" });
  const [expiredCache, setExpiredCache] = useState({});
  const [q, setQ] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [amountPaid, setAmountPaid] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [weightModal, setWeightModal] = useState(null); // { product }
  const [gunBuffer, setGunBuffer] = useState("");
  const [listening, setListening] = useState(false);
  const [cartWidth, setCartWidth] = useState(() => Math.min(440, Math.max(280, parseInt(localStorage.getItem("pos_cart_width") || "420"))));
  const [promotions, setPromotions] = useState([]);
  const [counters, setCounters] = useState([]);
  const [deliveryPartners, setDeliveryPartners] = useState([]);
  const [selectedCounter, setSelectedCounter] = useState("");
  const [selectedDeliveryPartner, setSelectedDeliveryPartner] = useState("");
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [mobileView, setMobileView] = useState("products");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(pendingQueueCount());
  const [searchParams] = useSearchParams();
  const resizing = React.useRef(false);
  useEffect(() => {
    if (!isDesktop && searchParams.get("cart") === "1") setMobileView("cart");
    const barcode = searchParams.get("barcode");
    if (barcode) {
      // Remove the query param to prevent re-processing
      window.history.replaceState({}, '', '/pos');
      // Small delay to let products load, then scan
      setTimeout(() => handleScan(barcode), 500);
    }
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // USB barcode gun listener — treats fast keyboard bursts as scans.
  // A gun typically fires all keys within ~50ms + Enter.
  useEffect(() => {
    let buffer = "";
    let lastTs = 0;
    const onKey = (e) => {
      // Ignore when typing in inputs / modals open
      const t = e.target;
      const inField = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if (inField || scannerOpen || checkoutOpen || weightModal) return;
      const now = Date.now();
      if (now - lastTs > 100) buffer = "";
      lastTs = now;
      if (e.key === "Enter") {
        if (buffer.length >= 4) {
          handleScan(buffer);
          buffer = "";
          setGunBuffer("");
        }
      } else if (e.key.length === 1) {
        buffer += e.key;
        setGunBuffer(buffer);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerOpen, checkoutOpen, weightModal, products]);

  const reload = useCallback(async () => {
    const safeGet = async (url, fallback = []) => {
      try {
        const r = await api.get(url);
        const data = r.data ?? fallback;
        saveToCache(url, data);
        return data;
      } catch {
        const cached = loadFromCache(url);
        if (cached !== null) return cached;
        return fallback;
      }
    };
    const [products, categories, customers, settings, promotions, counters, deliveryPartners] = await Promise.all([
      safeGet("/products"),
      safeGet("/categories"),
      safeGet("/customers"),
      safeGet("/settings", null),
      safeGet("/promotions?active_only=true"),
      safeGet("/counters"),
      safeGet("/delivery-partners"),
    ]);
    setProducts(products);
    setCategories(categories);
    setCustomers(customers);
    setSettings(settings || { currency_symbol: "₹" });
    setPromotions(promotions);
    setCounters(counters);
    setDeliveryPartners(deliveryPartners);
    setIsOnline(navigator.onLine);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") reload(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(() => reload(), 60000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, [reload]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    const pendingInterval = setInterval(() => setPendingCount(pendingQueueCount()), 5000);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      clearInterval(pendingInterval);
    };
  }, []);

  const expiredCacheRef = useRef({});

  // Refs for socket handler to avoid stale closures
  const addToCartRef = useRef(null);
  const handleScanRef = useRef(null);
  const productsRef = useRef([]);

  // Keep refs fresh every render (must run BEFORE socket effect below)
  useEffect(() => {
    addToCartRef.current = addToCart;
    handleScanRef.current = handleScan;
    productsRef.current = products;
  });

  useEffect(() => {
    const socket = getSocket();
    const handler = (data) => {
      const list = productsRef.current;
      const product = list.find((p) => p.barcode === data.barcode || p.sku === data.barcode || p.id === data.product_id);
      if (product) {
        addToCartRef.current(product, data.weight || null);
        toast.success(t("page.scanned_from_device", { name: product.name }));
      } else {
        handleScanRef.current(data.barcode || data.code);
      }
    };
    socket.on('product:scanned', handler);
    return () => { socket.off('product:scanned', handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  const filtered = useMemo(() => {
    let list = products;
    if (activeCategory !== "All") list = list.filter((p) => p.category === activeCategory);
    if (q) {
      const s = q.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(s) ||
        p.sku.toLowerCase().includes(s) ||
        (p.barcode || "").includes(s)
      );
    }
    return list;
  }, [products, q, activeCategory]);

  const subtotal = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart]
  );
  const taxTotal = useMemo(
    () => cart.reduce((s, i) => s + (i.price * i.qty * (i.tax_rate || 0)) / 100, 0),
    [cart]
  );
  const discountAmount = useMemo(() => (subtotal * discount) / 100, [subtotal, discount]);
  const total = useMemo(() => Math.max(0, subtotal + taxTotal - discountAmount), [subtotal, taxTotal, discountAmount]);
  const paid = Number(amountPaid || 0);
  const change = Math.max(0, paid - total);

  const checkExpiry = async (product) => {
    if (expiredCache[product.id] !== undefined) return expiredCache[product.id];
    try {
      const r = await api.get(`/batches/check-expiry/${product.id}`);
      const data = r.data;
      if (data.has_expired && !data.has_non_expired) {
        setExpiredCache((prev) => ({ ...prev, [product.id]: { expired: true, batches: data.expired_batches } }));
        return { expired: true, batches: data.expired_batches };
      }
      if (data.has_expired) {
        setExpiredCache((prev) => ({ ...prev, [product.id]: { expired: false, partial: true, batches: data.expired_batches } }));
        return { expired: false, partial: true, batches: data.expired_batches };
      }
      setExpiredCache((prev) => ({ ...prev, [product.id]: { expired: false } }));
      return { expired: false };
    } catch {
      return { expired: false };
    }
  };

  const addToCart = async (product, weight = null) => {
    if (product.stock <= 0) {
      toast.error(t("page.out_of_stock", { name: product.name }));
      return;
    }
    const expiry = await checkExpiry(product);
    if (expiry.expired) {
      toast.error(t("page.product_expired", { name: product.name }));
      return;
    }
    if (expiry.partial) {
      toast.warning(t("page.some_batches_expired", { name: product.name }));
    }
    // Only kg products: open weight input modal unless weight given
    if (isKgUnit(product.sell_by) && weight == null) {
      setWeightModal({ product });
      return;
    }
    const addQty = weight != null ? Math.round(Number(weight) * 1000) / 1000 : 1;
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        const newQty = existing.qty + addQty;
        if (newQty > product.stock) {
          const fmtStock = formatStock(product.stock, product.sell_by);
          toast.error(t("page.only_stock", { stock: fmtStock }));
          return prev;
        }
        return prev.map((i) => i.product_id === product.id ? { ...i, qty: newQty } : i);
      }
      if (addQty > product.stock) {
        const fmtStock = formatStock(product.stock, product.sell_by);
        toast.error(t("page.only_stock", { stock: fmtStock }));
        return prev;
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        tax_rate: product.tax_rate || 0,
        qty: addQty,
        stock: product.stock,
        unit: product.unit || "pcs",
        sell_by: product.sell_by || "pcs",
      }];
    });
  };

  const updateQty = (pid, delta) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.product_id !== pid) return i;
          const newQty = Math.round((i.qty + delta) * 1000) / 1000;
          if (newQty > i.stock) {
            toast.error(t("page.only_stock", { stock: i.stock }));
            return i;
          }
          return { ...i, qty: newQty };
        })
        .filter((i) => i.qty > 0)
    );
  };

  const removeItem = (pid) => setCart((p) => p.filter((i) => i.product_id !== pid));

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setCustomerId("");
    setAmountPaid("");
    setPaymentMode("cash");
    if (!isDesktop) setMobileView("products");
  };

  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      toast.error(t("page.speech_not_supported"));
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(true);
    rec.onresult = (e) => {
      const phrase = e.results[0][0].transcript.toLowerCase();
      const m = phrase.match(/(\d+(?:\.\d+)?)\s*(kg|g|gms|gram|pcs|piece|pack)?/);
      const qty = m ? Number(m[1]) : 1;
      const namePart = phrase.replace(/add\s*/, "").replace(/(\d+(?:\.\d+)?\s*(kg|g|gms|gram|pcs|piece|pack)?)/, "").trim();
      const match = products.find(
        (p) => p.name.toLowerCase().includes(namePart) || namePart.includes(p.name.toLowerCase())
      );
      if (match) {
        if (isWeightUnit(match.sell_by) && qty) addToCart(match, qty);
        else {
          addToCart(match);
          for (let i = 1; i < qty; i++) addToCart(match);
        }
        toast.success(t("page.voice_added", { name: match.name }));
      } else {
        toast.error(t("page.no_voice_match", { name: namePart }));
      }
    };
    rec.onerror = () => toast.error(t("page.voice_capture_failed"));
    rec.onend = () => setListening(false);
    rec.start();
  };

  const handleScan = async (code) => {
    const foundProduct = (p) => {
      addToCart(p);
      toast.success(t("page.added_item", { name: p.name }));
      try { getSocket().emit('product:scanned', { barcode: code, product_id: p.id }); } catch {}
      try { api.post('/scan-events', { barcode: code, product_id: p.id }); } catch {}
    };
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);
    if (isUUID) {
      const found = products.find((p) => p.id === code);
      if (found) { foundProduct(found); return; }
    }
    try {
      const { data } = await api.get(`/products/barcode/${encodeURIComponent(code)}`);
      foundProduct(data);
    } catch {
      const local = products.find((p) => p.barcode === code || p.sku === code);
      if (local) { foundProduct(local); return; }
      const last12 = String(code).replace(/\D/g, '').slice(-12);
      const local2 = products.find((p) => {
        const pb = String(p.barcode || '').replace(/\D/g, '');
        return pb.slice(-12) === last12 || pb === last12.slice(0, -1);
      });
      if (local2) { foundProduct(local2); return; }
      toast.error(t("page.no_product_for_code", { code }));
    }
  };

  const openCheckout = () => {
    if (cart.length === 0) return toast.error(t("page.cart_empty"));
    setAmountPaid(total.toFixed(2));
    // Auto-apply best active promotion
    const now = new Date();
    const activePromos = promotions.filter((p) => {
      if (!p.active) return false;
      if (p.valid_from && new Date(p.valid_from) > now) return false;
      if (p.valid_to && new Date(p.valid_to) < now) return false;
      if (p.min_purchase > 0 && subtotal < p.min_purchase) return false;
      return true;
    });
    if (activePromos.length > 0) {
      const best = activePromos.sort((a, b) => (b.discount_value || 0) - (a.discount_value || 0))[0];
      if (best.type === "percentage") {
        setDiscount(best.discount_value || 0);
        toast.info(`${best.name} — ${best.discount_value}% off auto-applied`);
      }
    }
    setCheckoutOpen(true);
  };

  const submitOrder = async () => {
    for (const item of cart) {
      const product = products.find((p) => p.id === item.product_id);
      if (product && item.qty > product.stock) {
        toast.warning(t("page.insufficient_stock", { name: item.name, available: product.stock, requested: item.qty }));
        return;
      }
    }
    try {
      const payload = {
        items: cart.map((i) => ({
          product_id: i.product_id, name: i.name, sku: i.sku,
          price: i.price, quantity: i.qty, tax_rate: i.tax_rate,
          unit: i.unit || "pcs", sell_by: i.sell_by || "pcs",
          line_total: i.price * i.qty * (1 + (i.tax_rate || 0) / 100),
        })),
        subtotal,
        tax_total: taxTotal,
        discount_percent: discount,
        payment_mode: paymentMode,
        amount_paid: paid,
        customer_id: customerId || undefined,
        customer_name: customerId ? customers.find((c) => c.id === customerId)?.name || "Walk-in" : "Walk-in",
        customer_phone: customerId ? customers.find((c) => c.id === customerId)?.phone || "" : "",
        counter_id: selectedCounter || undefined,
        counter_name: counters.find((c) => String(c.id) === selectedCounter)?.name || undefined,
        delivery_partner_id: selectedDeliveryPartner || undefined,
        delivery_partner_name: deliveryPartners.find((d) => String(d.id) === selectedDeliveryPartner)?.name || undefined,
      };
      const res = await queuedPost("/orders", payload);
      if (res && res.queued) {
        toast.success(t("page.sale_queued"));
        clearCart();
        return;
      }
      setLastOrder(res.data);
      setCheckoutOpen(false);
      setReceiptOpen(true);
      clearCart();
      reload();
      toast.success(t("page.sale_complete", { invoice: res.data.invoice_no }));
    } catch (e) {
      toast.error(formatApiErrorDetail(e?.response?.data?.detail) || e?.message || t("page.failed_sale"));
    }
  };

  const cats = ["All", ...categories.map((c) => c.name)];
  const sym = settings.currency_symbol || "₹";

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-hidden">
      {/* Mobile: Products View */}
      {(!isDesktop && mobileView === "products") || isDesktop ? (
        <div className={`flex-1 flex flex-col min-w-0 border-r border-zinc-200 ${!isDesktop && mobileView !== "products" ? "hidden" : ""}`}>
          {/* Top bar */}
          <div className="p-2 sm:p-4 bg-white border-b-2 border-zinc-200 flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {pendingCount > 0 && (
              <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-300 px-2 py-1 rounded whitespace-nowrap" title={t("page.pending_sync")}>
                ⏳ {pendingCount}
              </div>
            )}
            {!isOnline && (
              <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#E60000] bg-red-50 border border-red-300 px-2 py-1 rounded whitespace-nowrap">
                ● OFFLINE
              </div>
            )}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={P("search_products")}
                className="w-full h-10 sm:h-12 border-2 border-zinc-300 pl-8 sm:pl-10 pr-2 sm:pr-4 focus:outline-none focus:border-[#E60000] font-mono text-xs sm:text-sm"
                data-testid="pos-search"
              />
            </div>
            <button
              onClick={() => setScannerOpen(true)}
              className="h-10 sm:h-12 px-3 sm:px-5 bg-zinc-950 hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 flex-shrink-0"
              data-testid="pos-scan-btn"
            >
              <ScanBarcode className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={2.5} />
              <span className="hidden sm:inline">{t("page.scan")}</span>
            </button>
            <button
              onClick={startVoice}
              className={`h-10 sm:h-12 px-3 sm:px-4 bg-zinc-950 hover:bg-black text-white font-bold uppercase tracking-widest text-[10px] sm:text-xs flex items-center gap-1 sm:gap-2 flex-shrink-0 ${listening ? "ring-2 ring-[#E60000]" : ""}`}
              data-testid="voice-search-btn"
              title={t("page.voice_add_to_cart")}
            >
              <Mic className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${listening ? "text-[#E60000] animate-pulse" : ""}`} strokeWidth={2.5} />
              <span className="hidden sm:inline">{listening ? t("page.listening") : t("page.voice")}</span>
            </button>
          </div>

          {/* Categories */}
          <div className="px-2 sm:px-4 py-2 sm:py-3 bg-white border-b border-zinc-200 flex-shrink-0 overflow-x-auto">
            <div className="flex gap-1.5 sm:gap-2 min-w-max">
              {cats.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCategory(c)}
                  data-testid={`cat-${c}`}
                  className={`px-3 sm:px-4 h-8 sm:h-9 text-[10px] sm:text-xs font-bold uppercase tracking-widest border-2 transition-colors ${
                    activeCategory === c
                      ? "bg-[#E60000] text-white border-[#E60000]"
                      : "bg-white text-zinc-700 border-zinc-300 hover:border-zinc-900"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Product grid */}
          <div className="flex-1 overflow-y-auto p-2 sm:p-4 bg-zinc-50 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center text-zinc-500 py-16 font-mono text-sm">{t("page.no_products")}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2 sm:gap-3">
                {filtered.map((p) => {
                  const low = p.stock <= p.low_stock_threshold;
                  const out = p.stock <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p)}
                      disabled={out}
                      data-testid={`product-${p.sku}`}
                      className={`text-left bg-white border-2 border-zinc-200 hover:border-[#E60000] p-2 sm:p-3 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group`}
                    >
                      <div className="aspect-square bg-zinc-100 flex items-center justify-center mb-1 sm:mb-2 relative overflow-hidden">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="font-display font-black text-2xl sm:text-3xl text-zinc-300 uppercase">
                            {p.name.slice(0, 2)}
                          </div>
                        )}
                        {low && (
                          <div className={`absolute top-1 right-1 px-1 py-0.5 text-[8px] sm:text-[9px] font-mono font-bold uppercase ${out ? "bg-zinc-900 text-white" : "bg-[#FDE047] text-zinc-900"}`}>
                            {out ? t("page.out_of_stock_short") : t("page.low_on_stock_short")}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] sm:text-xs font-semibold line-clamp-2 min-h-[1.5rem] sm:min-h-[2rem] leading-tight">{isWeightUnit(p.sell_by) ? p.name.replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml|pcs)$/i, "") : p.name}</div>
                      <div className="flex items-center justify-between mt-0.5 sm:mt-1 gap-1">
                        <div className="font-mono text-xs sm:text-sm font-bold truncate min-w-0">{formatMoney(p.price, sym)}</div>
                        <div className="font-mono text-[9px] sm:text-[10px] text-zinc-500 text-right whitespace-nowrap">Stk {formatStock(p.stock, p.sell_by)}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Mobile: Cart View (full screen) */}
      {!isDesktop && mobileView === "cart" ? (
        <div className="flex-1 flex flex-col h-full bg-white">
          <div className="p-3 border-b-2 border-zinc-900 bg-zinc-950 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileView("products")} className="p-1 hover:bg-zinc-800 rounded">
                <ArrowLeftFromLine className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.current_sale")}</div>
                <div className="font-display font-black text-lg uppercase">{t("page.cart")} · {cart.length}</div>
              </div>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-[#E60000]">
                {t("page.clear")}
              </button>
            )}
          </div>

          <div className="p-3 border-b border-zinc-200 flex items-center gap-2 flex-shrink-0">
            <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="flex-1 h-10 border border-zinc-300 px-2 text-sm bg-white focus:outline-none focus:border-[#E60000]">
              <option value="">{t("page.no_customer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 font-mono text-sm">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                {t("page.scan_or_tap_products")}
                <button onClick={() => setMobileView("products")} className="block mx-auto mt-4 h-11 px-6 bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest">
                  {t("page.browse_products")}
                </button>
              </div>
            ) : (
              <ul>
                {cart.map((i) => (
                  <li key={i.product_id} className="border-b border-zinc-200 p-3 cart-pop">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold truncate">{i.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase">{i.sku} · {formatMoney(i.price, sym)}</div>
                      </div>
                      <button onClick={() => removeItem(i.product_id)} className="p-1 text-zinc-400 hover:text-[#E60000]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex border border-zinc-300">
                        <button onClick={() => updateQty(i.product_id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100">
                          <Minus className="w-3 h-3" />
                        </button>
                        <div className="w-10 h-8 flex items-center justify-center font-mono font-bold text-sm border-x border-zinc-300">
                          {isWeightUnit(i.sell_by) ? formatQty(i.qty, i.sell_by) : i.qty}
                        </div>
                        <button onClick={() => updateQty(i.product_id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-mono font-bold">{formatMoney(i.price * i.qty, sym)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t-2 border-zinc-900 bg-zinc-50 p-4 flex-shrink-0">
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-zinc-500">{t("page.subtotal")}</span>
              <span className="font-bold">{formatMoney(subtotal, sym)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-zinc-500">{t("page.tax_rate")}</span>
              <span className="font-bold">{formatMoney(taxTotal, sym)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-mono">
              <label className="text-zinc-500 flex items-center gap-1">
                {t("page.discount")}
                <input type="number" min="0" max="100" value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-14 h-7 border border-zinc-300 px-1 text-right font-mono text-xs focus:outline-none focus:border-[#E60000]" />%
              </label>
              <span className="font-bold text-[#E60000]">-{formatMoney(discountAmount, sym)}</span>
            </div>
            <div className="mt-3 pt-3 border-t-2 border-zinc-900 flex items-baseline justify-between">
              <span className="font-display font-black uppercase text-lg">{t("page.grand_total")}</span>
              <span className="font-mono font-black text-3xl">{formatMoney(total, sym)}</span>
            </div>
            <button onClick={() => { setMobileView("checkout"); openCheckout(); }}
              disabled={cart.length === 0}
              className="mt-3 w-full h-14 bg-[#E60000] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2 transition-colors">
              <Check className="w-5 h-5" strokeWidth={2.5} />
              {t("page.checkout")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Mobile: Checkout View (full screen) */}
      {!isDesktop && mobileView === "checkout" && checkoutOpen ? (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between p-4 bg-zinc-950 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => { setMobileView("cart"); setCheckoutOpen(false); }} className="p-1 hover:bg-zinc-800 rounded">
                <ArrowLeftFromLine className="w-5 h-5" strokeWidth={2.5} />
              </button>
              <span className="font-display font-black text-lg uppercase">{t("page.checkout")}</span>
            </div>
            <button onClick={() => { setMobileView("cart"); setCheckoutOpen(false); }} className="p-1 hover:bg-zinc-800">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            <div className="bg-zinc-50 border-2 border-zinc-900 p-4 text-center">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.amount_due")}</div>
              <div className="font-mono font-black text-4xl mt-1">{formatMoney(total, sym)}</div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{t("page.payment_mode")}</div>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_MODES.map((m) => {
                  const Icon = m.icon;
                  return (
                    <button key={m.key} onClick={() => setPaymentMode(m.key)}
                      className={`h-14 border-2 flex flex-col items-center justify-center gap-1 text-[9px] font-bold uppercase tracking-widest ${paymentMode === m.key ? "border-[#E60000] bg-red-50 text-[#E60000]" : "border-zinc-300 text-zinc-700 hover:border-zinc-900"}`}>
                      <Icon className="w-5 h-5" strokeWidth={2.5} />
                      {t("page." + m.key)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{t("page.amount_received")}</label>
              <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full h-14 border-2 border-zinc-300 px-4 focus:outline-none focus:border-[#E60000] font-mono font-bold text-2xl text-right" />
              <div className="grid grid-cols-2 gap-2 mt-2">
                {[total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000].map((v, idx) => (
                  <button key={idx} onClick={() => setAmountPaid(String(v.toFixed(2)))} className="h-9 border border-zinc-300 hover:border-zinc-900 text-[11px] font-mono">
                    {formatMoney(v, sym)}
                  </button>
                ))}
              </div>
            </div>
            {(counters.length > 0 || deliveryPartners.length > 0) && (
              <div className="flex flex-col gap-2 mt-3">
                {counters.length > 0 && (<MiniSelect value={selectedCounter} onChange={setSelectedCounter} options={counters} placeholder={t("page.counter")} />)}
                {deliveryPartners.length > 0 && (<MiniSelect value={selectedDeliveryPartner} onChange={setSelectedDeliveryPartner} options={deliveryPartners} placeholder={t("page.delivery_partner")} />)}
              </div>
            )}
            <div className="flex items-center justify-between border-t-2 border-zinc-200 mt-4 pt-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.change")}</span>
              <span className="font-mono font-black text-xl">{formatMoney(change, sym)}</span>
            </div>
            <button onClick={() => { submitOrder(); setMobileView("products"); }}
              data-testid="checkout-confirm"
              className="w-full h-14 mt-4 bg-[#E60000] hover:bg-red-700 text-white font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Check className="w-5 h-5" strokeWidth={2.5} />
              {t("page.complete_sale")}
            </button>
          </div>
        </div>
      ) : null}

      {/* Desktop: Resize handle */}
      <div
        className="hidden lg:flex flex-col items-center justify-center w-[10px] cursor-col-resize bg-zinc-100 hover:bg-[#E60000] group transition-colors flex-shrink-0 relative select-none"
        onMouseDown={(e) => {
          e.preventDefault();
          document.body.style.userSelect = "none";
          resizing.current = true;
          const startX = e.clientX;
          const startW = cartWidth;
          const onMove = (ev) => {
            if (!resizing.current) return;
            const newW = Math.max(280, Math.min(800, startW - (ev.clientX - startX)));
            setCartWidth(newW);
            localStorage.setItem("pos_cart_width", newW);
          };
          const onUp = () => {
            resizing.current = false;
            document.body.style.userSelect = "";
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
          };
          document.addEventListener("mousemove", onMove);
          document.addEventListener("mouseup", onUp);
        }}
      >
        <div className="w-[3px] h-8 rounded-full bg-zinc-300 group-hover:bg-white transition-colors" />
      </div>

      {/* Desktop: Cart */}
      {isDesktop ? (
        <aside className="w-full bg-white flex flex-col lg:h-full flex-shrink-0 border-t-2 lg:border-t-0 lg:border-l-2 border-zinc-900 max-h-[50vh] lg:max-h-none"
          style={{ width: cartWidth + "px" }}>
          <div className="p-4 border-b-2 border-zinc-900 bg-zinc-950 text-white flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.current_sale")}</div>
              <div className="font-display font-black text-xl uppercase">{t("page.cart")} · {cart.length}</div>
            </div>
            {cart.length > 0 && (
              <button onClick={clearCart} className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-[#E60000]">
                {t("page.clear")}
              </button>
            )}
          </div>
          <div className="p-3 border-b border-zinc-200 flex items-center gap-2">
            <User className="w-4 h-4 text-zinc-500 flex-shrink-0" />
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}
              className="flex-1 h-10 border border-zinc-300 px-2 text-sm bg-white focus:outline-none focus:border-[#E60000]">
              <option value="">{t("page.no_customer")}</option>
              {customers.map((c) => (<option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>))}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {cart.length === 0 ? (
              <div className="p-8 text-center text-zinc-400 font-mono text-sm">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-zinc-300" strokeWidth={1.5} />
                {t("page.scan_or_tap_products")}
              </div>
            ) : (
              <ul>
                {cart.map((i) => (
                  <li key={i.product_id} className="border-b border-zinc-200 p-3 cart-pop">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate">{i.name}</div>
                        <div className="text-[10px] font-mono text-zinc-500 uppercase">{i.sku} · {formatMoney(i.price, sym)}</div>
                      </div>
                      <button onClick={() => removeItem(i.product_id)} className="p-1 text-zinc-400 hover:text-[#E60000]">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="inline-flex border border-zinc-300">
                        <button onClick={() => updateQty(i.product_id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100"><Minus className="w-3 h-3" /></button>
                        <div className="w-10 h-8 flex items-center justify-center font-mono font-bold text-sm border-x border-zinc-300">
                          {isWeightUnit(i.sell_by) ? formatQty(i.qty, i.sell_by) : i.qty}
                        </div>
                        <button onClick={() => updateQty(i.product_id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-zinc-100"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="font-mono font-bold">{formatMoney(i.price * i.qty, sym)}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t-2 border-zinc-900 bg-zinc-50 p-4 flex-shrink-0">
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-zinc-500">{t("page.subtotal")}</span>
              <span className="font-bold">{formatMoney(subtotal, sym)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-mono">
              <span className="text-zinc-500">{t("page.tax_rate")}</span>
              <span className="font-bold">{formatMoney(taxTotal, sym)}</span>
            </div>
            <div className="flex items-center justify-between text-sm font-mono">
              <label className="text-zinc-500 flex items-center gap-1">
                {t("page.discount")}
                <input type="number" min="0" max="100" value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-14 h-7 border border-zinc-300 px-1 text-right font-mono text-xs focus:outline-none focus:border-[#E60000]" />%
              </label>
              <span className="font-bold text-[#E60000]">-{formatMoney(discountAmount, sym)}</span>
            </div>
            <div className="mt-3 pt-3 border-t-2 border-zinc-900 flex items-baseline justify-between">
              <span className="font-display font-black uppercase text-lg">{t("page.grand_total")}</span>
              <span className="font-mono font-black text-3xl">{formatMoney(total, sym)}</span>
            </div>
            <button onClick={() => { setCheckoutOpen(true); openCheckout(); }}
              disabled={cart.length === 0}
              className="mt-3 w-full h-14 bg-[#E60000] hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold uppercase tracking-widest text-base flex items-center justify-center gap-2 transition-colors">
              <Check className="w-5 h-5" strokeWidth={2.5} />
              {t("page.checkout")}
            </button>
          </div>
        </aside>
      ) : null}

      {/* Mobile: Floating Cart FAB */}
      {!isDesktop && cart.length > 0 && mobileView === "products" && (
        <button onClick={() => setMobileView("cart")}
          className="fixed bottom-20 right-4 z-30 w-14 h-14 bg-[#E60000] text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform">
          <ShoppingCart className="w-6 h-6" strokeWidth={2.5} />
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-zinc-900 text-white text-[10px] font-mono font-bold flex items-center justify-center rounded-full border-2 border-white">
            {cart.length}
          </span>
        </button>
      )}

      {scannerOpen && (
        <BarcodeScanner
          onDetect={(code) => { handleScan(code); }}
          onClose={() => setScannerOpen(false)}
        />
      )}

      {isDesktop && checkoutOpen && (
        <CheckoutModal
          total={total}
          paymentMode={paymentMode}
          setPaymentMode={setPaymentMode}
          amountPaid={amountPaid}
          setAmountPaid={setAmountPaid}
          change={change}
          onClose={() => setCheckoutOpen(false)}
          onSubmit={submitOrder}
          sym={sym}
          counters={counters}
          selectedCounter={selectedCounter}
          setSelectedCounter={setSelectedCounter}
          deliveryPartners={deliveryPartners}
          selectedDeliveryPartner={selectedDeliveryPartner}
          setSelectedDeliveryPartner={setSelectedDeliveryPartner}
        />
      )}

      {receiptOpen && lastOrder && (
        <ReceiptModal
          order={lastOrder}
          settings={settings}
          cashier={user?.name}
          onClose={() => setReceiptOpen(false)}
        />
      )}

      {weightModal && (
        <WeightModal
          product={weightModal.product}
          sym={sym}
          onClose={() => setWeightModal(null)}
          onSubmit={(w) => { addToCart(weightModal.product, w); setWeightModal(null); }}
          isMobile={!isDesktop}
        />
      )}
    </div>
  );
}

function WeightModal({ product, onClose, onSubmit, sym, isMobile }) {
  const { t } = useTranslation();
  const [weight, setWeight] = useState("1");
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState("weight");
  const price = product.price || 0;
  const unit = product.sell_by || "kg";
  const dispUnit = getDisplayUnit(unit);
  const hasSub = hasSubUnit(unit);
  const subUnit = getSubUnit(unit);

  const updateWeight = (w) => {
    setActiveTab("weight");
    setWeight(String(w));
    setAmount(String((Number(w) * price).toFixed(2)));
  };

  const updateAmount = (a) => {
    setActiveTab("amount");
    setAmount(String(a));
    if (price > 0) setWeight(String((Number(a) / price).toFixed(3)));
  };

  const w = Number(weight) || 0;
  const total = w * price;

  const weightPresets = () => {
    if (hasSub) {
      return w < 1
        ? [50, 100, 200, 250, 500].map((v) => ({
            label: `${v} ${subUnit}`,
            value: v / 1000,
            active: Math.round(w * 1000) === v,
          }))
        : [0.25, 0.5, 1, 2, 3, 5].map((v) => ({
            label: `${v} ${dispUnit}`,
            value: v,
            active: Number(weight) === v,
          }));
    }
    return [50, 100, 200, 500, 1000].map((v) => ({
      label: `${v} ${dispUnit}`,
      value: v,
      active: Number(weight) === v,
    }));
  };

  const totalDisplay = hasSub
    ? (w < 1 ? Math.round(w * 1000) + " " + subUnit : Number(w.toFixed(3)) + " " + dispUnit)
    : Math.round(w) + " " + dispUnit;

  const bottomSheet = isMobile;
  return (
    <div className={`fixed inset-0 z-50 bg-black/60 ${bottomSheet ? "flex items-end" : "flex items-center justify-center p-4"}`} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className={`${bottomSheet ? "w-full max-h-[85vh] rounded-t-2xl overflow-hidden" : "w-full max-w-sm"} bg-white border-2 border-zinc-900 ${bottomSheet ? "border-b-0" : ""}`} data-testid="weight-modal">
        <div className={`flex items-center justify-between p-4 bg-zinc-950 text-white`}>
          {bottomSheet && <button onClick={onClose} className="p-1 hover:bg-zinc-800"><ChevronDown className="w-5 h-5" strokeWidth={3} /></button>}
          <div className={bottomSheet ? "text-center flex-1" : ""}>
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">{t("page.weight_sale")}</div>
            <div className="font-display font-black uppercase">{product.name.replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml)$/i, "")}</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="text-center bg-zinc-50 border-2 border-zinc-200 py-3">
            <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{t("page.rate")}</div>
            <div className="font-mono font-bold text-xl">{formatMoney(price, sym)} / {dispUnit}</div>
          </div>

          <div className="flex border-2 border-zinc-200">
              <button onClick={() => { setActiveTab("weight"); if (price > 0) setAmount(String((w * price).toFixed(2))); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === "weight" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}>
                {t("page.by_weight")}
              </button>
              <button onClick={() => { setActiveTab("amount"); if (price > 0 && !amount) setAmount("0"); }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-widest ${activeTab === "amount" ? "bg-zinc-900 text-white" : "bg-white text-zinc-600 hover:bg-zinc-50"}`}>
                {t("page.by_amount")}
            </button>
          </div>

          {activeTab === "weight" ? (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.weight")} ({dispUnit})</label>
              <input type="number" step={hasSub ? "0.001" : "1"} min="0" value={weight} autoFocus
                onChange={(e) => updateWeight(e.target.value)}
                data-testid="weight-input"
                className="w-full h-14 border-2 border-zinc-300 px-4 font-mono font-bold text-2xl text-right focus:outline-none focus:border-[#E60000]" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                {weightPresets().map((preset) => (
                  <button key={preset.value} type="button" onClick={() => updateWeight(preset.value)}
                    className={`h-9 border text-xs font-mono font-bold ${preset.active ? "border-[#E60000] bg-red-50 text-[#E60000]" : "border-zinc-300 hover:border-zinc-900"}`}>
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-1">{t("page.amount")}</label>
              <input type="number" step="0.01" min="0" value={amount} autoFocus
                onChange={(e) => updateAmount(e.target.value)}
                data-testid="amount-input"
                className="w-full h-14 border-2 border-zinc-300 px-4 font-mono font-bold text-2xl text-right focus:outline-none focus:border-[#E60000]" />
              <div className="grid grid-cols-4 sm:grid-cols-4 gap-2 mt-2">
                {[10, 20, 25, 30, 50, 100, 200, 500].map((v) => (
                  <button key={v} type="button" onClick={() => updateAmount(v)}
                    className={`h-9 border text-xs font-mono font-bold ${Number(amount) === v ? "border-[#E60000] bg-red-50 text-[#E60000]" : "border-zinc-300 hover:border-zinc-900"}`}>
                    ₹{v}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="border-2 border-zinc-200 flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{t("page.weight")}</div>
              <div className="font-mono font-bold text-lg">{totalDisplay}</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{t("page.amount")}</div>
              <div className="font-mono font-black text-xl">{formatMoney(total, sym)}</div>
            </div>
          </div>

          <button onClick={() => onSubmit(w)}
            disabled={w <= 0}
            data-testid="weight-add"
            className="w-full h-12 bg-[#E60000] text-white font-bold uppercase tracking-widest disabled:opacity-40">
            {t("page.add_to_cart")} — {formatMoney(total, sym)}
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative flex-1" ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full h-10 border-2 border-zinc-300 px-2 text-sm bg-white flex items-center justify-between focus:outline-none focus:border-[#E60000] text-left">
        <span className={value ? "text-zinc-900" : "text-zinc-400"}>{value ? (options.find(o => o.id === value)?.name || value) : placeholder}</span>
        <span className="ml-1 text-zinc-400">▾</span>
      </button>
      {open && (
        <div className="absolute z-[60] top-full left-0 right-0 mt-1 border-2 border-zinc-300 bg-white max-h-40 overflow-y-auto shadow-lg">
          {options.map((opt) => (
            <button key={opt.id} type="button" onClick={() => { onChange(opt.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-red-50 ${opt.id === value ? "bg-red-50 text-[#E60000] font-bold" : ""}`}>
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckoutModal({ total, paymentMode, setPaymentMode, amountPaid, setAmountPaid, change, onClose, onSubmit, sym, counters, selectedCounter, setSelectedCounter, deliveryPartners, selectedDeliveryPartner, setSelectedDeliveryPartner }) {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const quicks = [total, Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000];
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900" data-testid="checkout-modal">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="font-display font-black text-lg uppercase">{t("page.checkout")}</div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" data-testid="checkout-close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5">
          <div className="bg-zinc-50 border-2 border-zinc-900 p-4 text-center">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.amount_due")}</div>
            <div className="font-mono font-black text-4xl mt-1">{formatMoney(total, sym)}</div>
          </div>

          <div className="mt-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">{t("page.payment_mode")}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PAYMENT_MODES.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.key}
                    onClick={() => setPaymentMode(m.key)}
                    data-testid={`pay-${m.key}`}
                    className={`h-14 sm:h-16 border-2 flex flex-col items-center justify-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                      paymentMode === m.key
                        ? "border-[#E60000] bg-red-50 text-[#E60000]"
                        : "border-zinc-300 text-zinc-700 hover:border-zinc-900"
                    }`}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                    {t("page." + m.key)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">
              {t("page.amount_received")}
            </label>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className="w-full h-14 border-2 border-zinc-300 px-4 focus:outline-none focus:border-[#E60000] font-mono font-bold text-2xl text-right"
              data-testid="checkout-amount"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
              {quicks.map((v, idx) => (
                <button
                  key={idx}
                  onClick={() => setAmountPaid(String(v.toFixed(2)))}
                  className="h-9 border border-zinc-300 hover:border-zinc-900 text-[11px] sm:text-xs font-mono"
                >
                  {formatMoney(v, sym)}
                </button>
              ))}
            </div>
          </div>

          {(counters.length > 0 || deliveryPartners.length > 0) && (
            <div className="flex flex-col sm:flex-row gap-2 mt-3">
              {counters.length > 0 && (
                <MiniSelect value={selectedCounter} onChange={setSelectedCounter} options={counters} placeholder={t("page.counter")} />
              )}
              {deliveryPartners.length > 0 && (
                <MiniSelect value={selectedDeliveryPartner} onChange={setSelectedDeliveryPartner} options={deliveryPartners} placeholder={t("page.delivery_partner")} />
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t-2 border-zinc-200 mt-4 pt-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">{t("page.change")}</span>
            <span className="font-mono font-black text-xl" data-testid="checkout-change">
              {formatMoney(change, sym)}
            </span>
          </div>

          <button
            onClick={async () => { setSubmitting(true); try { await onSubmit(); } finally { setSubmitting(false); } }}
            disabled={submitting}
            data-testid="checkout-confirm"
            className="w-full h-14 bg-[#E60000] hover:bg-red-700 text-white font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" strokeWidth={2.5} /> : <Check className="w-5 h-5" strokeWidth={2.5} />}
            {submitting ? "Processing..." : t("page.complete_sale")}
          </button>
        </div>
      </div>
    </div>
  );
}

function ReceiptModal({ order, settings, cashier, onClose }) {
  const { t } = useTranslation();
  const sym = settings?.currency_symbol || "₹";
  const [waPhone, setWaPhone] = useState("");
  const [waSending, setWaSending] = useState(false);
  const [waPdfSending, setWaPdfSending] = useState(false);
  const print = () => window.print();
  const outletName = localStorage.getItem("pos_outlet_name") || settings?.store_name || "Store";
  const outletAddress = localStorage.getItem("pos_outlet_address") || settings?.address || "";
  const outletPhone = localStorage.getItem("pos_outlet_phone") || settings?.phone || "";
  const outletGstin = localStorage.getItem("pos_outlet_gstin") || settings?.gstin || "";
  const itemsSubtotal = order.items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0);
  const netPayable = order.total || (itemsSubtotal + (order.tax_total || 0) - (order.discount_amount || 0));
  const now = new Date(order.created_at);
  const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const sendWA = async () => {
    if (!waPhone.trim()) { toast.error("Enter customer phone"); return; }
    setWaSending(true);
    try {
      const itemsList = order.items.map((i) => `${i.name} x${i.quantity} = ${formatMoney((i.price || 0) * (i.quantity || 0), sym)}`).join("\n");
      const msg = [
        `*${outletName}*`,
        outletAddress && `📍 ${outletAddress}`,
        outletPhone && `📞 ${outletPhone}`,
        `🧾 ${order.invoice_no}`,
        `📅 ${dateStr} ${timeStr}`,
        `─────────────────`,
        `*ITEMS:*`,
        itemsList,
        `─────────────────`,
        `Subtotal: ${formatMoney(itemsSubtotal, sym)}`,
        order.tax_total > 0 && `Tax: +${formatMoney(order.tax_total, sym)}`,
        order.discount_amount > 0 && `Discount: -${formatMoney(order.discount_amount, sym)}`,
        `*Net Payable: ${formatMoney(netPayable, sym)}*`,
        `Paid: ${formatMoney(order.amount_paid, sym)}`,
        `Change: ${formatMoney(order.change_due, sym)}`,
        settings?.receipt_footer && `\n${settings.receipt_footer}`,
      ].filter(Boolean).join("\n");
      await api.post("/whatsapp/send", { phone: waPhone.trim(), message: msg, invoice_no: order.invoice_no });
      toast.success("Receipt sent on WhatsApp");
      setWaPhone("");
    } catch (e) {
      const d = e?.response?.data;
      const detail = d?.detail || d?.errors?.map(er=>`${er.field}: ${er.message}`).join(', ') || "Failed to send";
      toast.error(detail.includes("WhatsApp") ? `${detail} ⚙️` : detail);
    } finally { setWaSending(false); }
  };
  const sendPDF = async () => {
    if (!waPhone.trim()) { toast.error("Enter customer phone"); return; }
    setWaPdfSending(true);
    try {
      await api.post("/whatsapp/send-pdf", {
        phone: waPhone.trim(),
        invoice_no: order.invoice_no,
        outletName,
        outletAddress,
        outletPhone,
        outletGstin,
        dateStr, timeStr,
        cashier: cashier || 'Admin',
        customerName: order.customer_name,
        items: order.items.map((i) => ({
          name: i.name,
          quantity: Number(i.quantity) || 0,
          price: i.price || 0,
          line_total: (i.price || 0) * (Number(i.quantity) || 0),
          sell_by: i.sell_by,
          unit: i.unit,
        })),
        itemsTotal: itemsSubtotal,
        discountAmount: order.discount_amount || 0,
        discountPercent: order.discount_percent || 0,
        taxTotal: order.tax_total || 0,
        netPayable,
        paid: order.amount_paid || 0,
        change: order.change_due || 0,
        footer: settings?.receipt_footer,
        currencySymbol: sym,
      });
      toast.success("Receipt PDF sent on WhatsApp");
      setWaPhone("");
    } catch (e) {
      const d = e?.response?.data;
      const errs = d?.errors?.map(er=>`${er.field}: ${er.message}`).join(', ');
      const detail = d?.detail ? (errs ? `${d.detail}: ${errs}` : d.detail) : (errs || e?.message || "Failed to send PDF");
      console.error('send-pdf failed', d || e?.message, e);
      toast.error(detail);
    } finally { setWaPdfSending(false); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4 print:bg-white print:p-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; padding: 0; background: #fff; }
        }
        #thermal-receipt { font-family: 'Courier New', Courier, monospace; }
        @media print {
          #thermal-receipt { width: 72mm; margin: 0 auto; padding: 2mm 4mm; font-size: 10px; line-height: 1.3; color: #000; background: #fff; }
          #thermal-receipt .print-hide { display: none !important; }
        }
      `}</style>
      <div id="thermal-receipt" className="w-full max-w-sm bg-white border-2 border-zinc-900 print:border-0 max-h-[90vh] flex flex-col" data-testid="receipt-modal">
        <div className="flex items-center justify-between p-3 bg-zinc-950 text-white print-hide print:hidden">
          <div className="font-bold uppercase text-xs tracking-wider">{t("page.receipt")}</div>
          <button onClick={onClose} data-testid="receipt-close" className="p-1 hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="font-mono text-[10px] overflow-y-auto flex-1 p-4 print:p-0">
          <div className="text-center border-b border-dashed border-zinc-400 pb-3 print:pb-2">
            <div className="font-bold text-lg uppercase tracking-tight leading-tight">{outletName}</div>
            {outletAddress && <div className="text-[9px] text-zinc-600 mt-0.5">{outletAddress}</div>}
            <div className="text-[9px] text-zinc-600 mt-0.5">
              {outletPhone && <span>Ph: {outletPhone}</span>}
              {outletPhone && outletGstin && <span> | </span>}
              {outletGstin && <span>GST: {outletGstin}</span>}
            </div>
          </div>
          <div className="text-[9px] py-2 space-y-0.5 border-b border-dashed border-zinc-400">
            <div className="flex justify-between">
              <span>{t("page.invoice")}</span><span className="font-bold">{order.invoice_no}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("page.date")}</span><span>{dateStr} {timeStr}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("page.cashier")}</span><span>{cashier}</span>
            </div>
            {order.customer_name && (
              <div className="flex justify-between">
                <span>{t("page.customer")}</span><span>{order.customer_name}</span>
              </div>
            )}
          </div>
          <div className="py-2">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-t border-b border-zinc-900">
                  <th className="text-left py-1 font-bold">{t("page.items")}</th>
                  <th className="text-right py-1 font-bold">{t("page.qty")}</th>
                  <th className="text-right py-1 font-bold">{t("page.rate")}</th>
                  <th className="text-right py-1 font-bold">{t("page.amount")}</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((i, idx) => {
                  const cleanName = i.name.replace(/\s+\d+(\.\d+)?\s*(kg|g|l|ml|pcs)$/i, "").trim();
                  const qty = Number(i.quantity) || 0;
                  const qtyDisplay = isWeightUnit(i.sell_by) ? formatQty(qty, i.sell_by) : (qty + (i.unit && i.unit !== "pcs" ? ` ${i.unit}` : ""));
                  const rate = i.price;
                  const lineAmt = (rate || 0) * qty;
                  return (
                    <tr key={idx}>
                      <td className="py-0.5 pr-1 max-w-[100px] truncate">{cleanName}</td>
                      <td className="text-right py-0.5 whitespace-nowrap">{qtyDisplay}</td>
                      <td className="text-right py-0.5 whitespace-nowrap">{formatMoney(rate, sym)}</td>
                      <td className="text-right py-0.5 whitespace-nowrap">{formatMoney(lineAmt, sym)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-dashed border-zinc-400 pt-2 space-y-1 text-[10px]">
            <div className="flex justify-between">
              <span>{t("page.subtotal")}</span><span>{formatMoney(itemsSubtotal, sym)}</span>
            </div>
            {order.tax_total > 0 && (
              <div className="flex justify-between">
                <span>{t("page.tax")}</span><span>+{formatMoney(order.tax_total, sym)}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between">
                <span>{t("page.discount")} ({order.discount_percent}%)</span><span>-{formatMoney(order.discount_amount, sym)}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm border-t border-zinc-900 pt-1 mt-1">
              <span>{t("page.net_payable")}</span><span>{formatMoney(netPayable, sym)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t("page.paid")}</span><span>{formatMoney(order.amount_paid, sym)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-zinc-400 pb-2">
              <span>{t("page.change")}</span><span>{formatMoney(order.change_due, sym)}</span>
            </div>
          </div>
          <div className="text-center text-[9px] text-zinc-600 pt-2 border-t border-dashed border-zinc-400">
            {settings.receipt_footer || t("page.thank_you")}
          </div>
          <div className="mt-2 bg-[#1a1a2e] text-center py-2 px-3 rounded-sm">
            <span className="text-[7px] text-[#8899aa]">Powered by </span>
            <span className="text-[9px] text-[#b0bec5] font-medium tracking-[1px]">AIMFORTECH SOLUTIONS</span>
          </div>
        </div>
        <div className="p-3 border-t-2 border-zinc-200 flex flex-col gap-2 print-hide print:hidden">
          <div className="flex gap-2">
            <input type="text" value={waPhone} onChange={(e) => setWaPhone(e.target.value)}
              placeholder="Customer phone (e.g. 919876543210)"
              className="flex-1 h-11 text-sm border border-zinc-300 px-3 rounded focus:outline-none focus:ring-2 focus:ring-[#E60000]/30" />
            <button onClick={sendWA} disabled={waSending}
              className="h-11 px-4 bg-green-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-green-700 disabled:opacity-50">
              {waSending ? "..." : "Text"}
            </button>
            <button onClick={sendPDF} disabled={waPdfSending}
              className="h-11 px-4 bg-blue-600 text-white text-xs font-bold uppercase tracking-widest rounded hover:bg-blue-700 disabled:opacity-50">
              {waPdfSending ? "..." : "PDF"}
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={print} data-testid="receipt-print" className="flex-1 h-11 bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest">
              {t("page.print")}
            </button>
            <button onClick={onClose} data-testid="receipt-done" className="flex-1 h-11 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest">
              {t("page.done")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
