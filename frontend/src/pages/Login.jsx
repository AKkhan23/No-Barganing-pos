import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Store, LogIn, Eye, EyeOff, CloudOff, LogOut, ArrowRight } from "lucide-react";
import { useAuth } from "../lib/auth";
import api, { formatApiErrorDetail, BACKEND_URL } from "../lib/api";

export default function Login() {
  const { t } = useTranslation();
  const { login, user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [waking, setWaking] = useState(false);
  const wakeRef = useRef(null);

  useEffect(() => {
    if (!BACKEND_URL) return;
    let cancelled = false;
    let retries = 0;
    setWaking(true);
    const ping = () => {
      if (cancelled) return;
      retries++;
      api.get("/health").then(() => { if (!cancelled) setWaking(false); }).catch(() => {
        if (!cancelled && retries < 8) setTimeout(ping, Math.min(retries * 2000, 8000));
        else if (!cancelled) setWaking(false);
      });
    };
    ping();
    return () => { cancelled = true; if (wakeRef.current) clearTimeout(wakeRef.current); };
  }, []);

  if (!loading && user) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-sm border-2 border-zinc-900 bg-white p-8 text-center">
          <div className="w-14 h-14 bg-[#E60000] flex items-center justify-center mx-auto">
            <Store className="w-8 h-8 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="font-display font-black text-2xl uppercase mt-4">No Bargaining</h1>
          <p className="text-sm text-zinc-500 mt-2">Signed in as</p>
          <p className="text-lg font-bold text-zinc-900 mt-1">{user.name}</p>
          <p className="text-xs font-mono text-zinc-400 uppercase">{user.role}</p>
          <div className="mt-6 space-y-3">
            <button onClick={() => navigate("/pos")}
              className="w-full h-12 bg-[#E60000] hover:bg-red-700 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors">
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} /> Continue to POS
            </button>
            <button onClick={logout}
              className="w-full h-12 border-2 border-zinc-300 hover:border-[#E60000] text-zinc-700 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 transition-colors">
              <LogOut className="w-4 h-4" strokeWidth={2.5} /> Switch User
            </button>
          </div>
        </div>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/pos");
    } catch (e2) {
      setErr(formatApiErrorDetail(e2?.response?.data?.detail) || e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-zinc-50">
      <div className="hidden lg:block w-1/2 relative overflow-hidden bg-zinc-900">
        <img
          src="https://images.pexels.com/photos/5498233/pexels-photo-5498233.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940"
          alt="Retail store"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-[#E60000]/40" />
        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-[#E60000] flex items-center justify-center">
              <Store className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-black text-3xl uppercase tracking-tight">{t("page.no_bargaining")}</div>
              <div className="text-xs font-mono uppercase tracking-widest text-zinc-300">{t("page.fixed_prices_fast_checkout")}</div>
            </div>
          </div>
          <div>
            <div className="text-[10rem] font-display font-black leading-none tracking-tighter text-white/10 select-none">
              POS
            </div>
            <h2 className="font-display text-4xl font-black uppercase leading-tight max-w-md">
              {t("page.industrial_grade_pos")}
            </h2>
            <p className="mt-4 text-zinc-300 max-w-sm text-sm">
              {t("page.pos_description")}
            </p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "12", v: t("page.modules") },
                { k: "3", v: t("page.roles") },
                { k: "∞", v: t("page.products") },
              ].map((s) => (
                <div key={s.v} className="border-l-2 border-[#FDE047] pl-3">
                  <div className="font-mono text-3xl font-bold">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-widest text-zinc-400">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
            © 2026 {t("page.no_bargaining")} · {t("page.all_rights_reserved")}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-[#E60000] flex items-center justify-center">
              <Store className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div className="font-display font-black text-2xl uppercase">{t("page.no_bargaining")}</div>
          </div>

          <div className="border-2 border-zinc-900 bg-white p-8">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#E60000] mb-2">
              {t("page.staff_access")}
            </div>
            <h1 className="font-display text-4xl font-black uppercase leading-none tracking-tight">
              {t("page.sign_in")}
            </h1>
            <p className="text-sm text-zinc-500 mt-2">{t("page.enter_credentials")}</p>

            <form onSubmit={submit} className="mt-8 space-y-4" autoComplete="off">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2">
                  {t("page.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="off"
                  data-testid="login-email"
                  className="w-full h-12 border-2 border-zinc-300 px-4 focus:outline-none focus:border-[#E60000] font-mono text-sm"
                  placeholder={"Enter your email"}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-zinc-600 mb-2">
                  {t("page.password")}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    data-testid="login-password"
                    className="w-full h-12 border-2 border-zinc-300 px-4 pr-12 focus:outline-none focus:border-[#E60000] font-mono text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-900"
                    data-testid="login-toggle-password"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {waking && (
                <div className="border-2 border-amber-400 bg-amber-50 text-amber-700 text-sm p-3 font-medium flex items-center gap-2">
                  <CloudOff className="w-4 h-4 shrink-0" />
                  Server is waking up… this may take 30-60 seconds on first visit
                </div>
              )}
              {err && (
                <div
                  className="border-2 border-[#E60000] bg-red-50 text-[#E60000] text-sm p-3 font-medium"
                  data-testid="login-error"
                >
                  {err}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                data-testid="login-submit"
                className="w-full h-14 bg-[#E60000] hover:bg-red-700 text-white font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
              >
                <LogIn className="w-4 h-4" strokeWidth={2.5} />
                {busy ? t("page.signing_in") : t("page.enter_terminal")}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-zinc-200 text-center">
              <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                Fixed prices · Fast checkout · No bargaining
              </p>
              <p className="text-[10px] font-mono text-zinc-300 mt-1">
                Industrial-grade POS for retail stores
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
