import React, { useEffect, useState } from "react";
import { Download, Smartphone, X, Wifi, WifiOff, Share2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

function getPrompt() { return window.__deferredPrompt || null; }

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(() => getPrompt());
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      window.__deferredPrompt = e;
      setPrompt(e);
    };
    // If already captured in HTML script, set it
    if (window.__deferredPrompt) setPrompt(window.__deferredPrompt);
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);
  return prompt;
}

export default function PWAInstall() {
  const [hidden, setHidden] = useState(() => localStorage.getItem("pwa_dismissed") === "1" && !window.location.search.includes("install=1"));
  const [offline, setOffline] = useState(!navigator.onLine);
  const prompt = useInstallPrompt();
  const fromQR = window.location.search.includes("install=1");

  const install = async () => {
    const p = getPrompt();
    if (!p) return;
    p.prompt();
    await p.userChoice;
    window.__deferredPrompt = null;
    setHidden(true);
    localStorage.setItem("pwa_dismissed", "1");
  };

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem("pwa_dismissed", "1");
  };

  // QR code visitors — show install popup regardless of beforeinstallprompt
  const showQRInstall = fromQR && !hidden;

  return (
    <>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-600 text-white text-center py-1 text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" /> Offline — some features limited
        </div>
      )}

      {/* QR code landing — centered full install popup */}
      {showQRInstall && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white border-2 border-zinc-900 w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
              <div className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-red-500" /> Install App
              </div>
              <button onClick={dismiss} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 text-center space-y-4">
              <div className="w-16 h-16 bg-[#E60000] rounded flex items-center justify-center mx-auto">
                <Download className="w-8 h-8 text-white" />
              </div>
              <p className="font-bold text-lg text-zinc-900">No Bargaining POS</p>
              <p className="text-sm text-zinc-600">Install on your phone for fast, offline access.</p>

              {getPrompt() ? (
                <button onClick={install}
                  className="w-full h-12 bg-[#E60000] hover:bg-red-700 text-white text-sm font-bold uppercase tracking-widest">
                  Install App
                </button>
              ) : (
                <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-800 text-left space-y-2">
                  <p><b>Android:</b> Chrome ⋮ → "Install app"</p>
                  <p><b>iPhone:</b> Safari Share → "Add to Home Screen"</p>
                </div>
              )}

              <button onClick={dismiss}
                className="text-xs text-zinc-400 hover:text-zinc-600 font-mono uppercase tracking-widest">
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Normal install banner (not from QR) */}
      {prompt && !hidden && !fromQR && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] bg-white border-2 border-zinc-900 shadow-xl p-4" data-testid="pwa-install-banner">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E60000] flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-zinc-900 uppercase">Install POS App</div>
              <div className="text-xs text-zinc-600 mt-1">Add to home screen for fast, offline-ready checkout.</div>
              <div className="flex gap-2 mt-3">
                <button onClick={install} data-testid="pwa-install-btn" className="flex-1 h-9 bg-[#E60000] text-white text-[10px] font-bold uppercase tracking-widest">Install</button>
                <button onClick={dismiss} className="h-9 px-3 border border-zinc-300 text-[10px] font-bold uppercase tracking-widest text-zinc-700">Later</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function InstallAppButton() {
  const [open, setOpen] = useState(false);
  const [installing, setInstalling] = useState(false);

  const doInstall = async () => {
    const p = getPrompt();
    if (p) {
      setInstalling(true);
      p.prompt();
      const result = await p.userChoice;
      window.__deferredPrompt = null;
      setInstalling(false);
      if (result.outcome === "accepted") {
        localStorage.setItem("pwa_dismissed", "1");
      }
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        onClick={doInstall}
        disabled={installing}
        data-testid="install-app-btn"
        className="w-full flex items-center justify-center gap-2 h-11 bg-[#E60000] hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
      >
        <Smartphone className="w-4 h-4" strokeWidth={2.5} />
        {installing ? "Installing…" : "Install App"}
      </button>
      <p className="text-[10px] text-zinc-400 text-center font-mono mt-1">Works offline · No browser needed</p>
      {open && <InstallHelpModal onClose={() => setOpen(false)} />}
    </>
  );
}

export function ConnectionBadge() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest ${online ? "text-green-400" : "text-amber-400"}`}>
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? "Online" : "Offline"}
    </div>
  );
}

function InstallHelpModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const url = "https://no-barganing-pos.vercel.app?install=1";

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" data-testid="install-help-modal">
      <div className="w-full max-w-md bg-white border-2 border-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white sticky top-0">
          <div className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-red-500" /> Install on Your Phone
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="bg-white border-2 border-zinc-200 p-3">
              <QRCodeSVG value={url} size={180} bgColor="#fff" fgColor="#18181b" level="M" />
            </div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Scan with phone camera
            </p>
          </div>

          <div className="bg-zinc-50 border border-zinc-200 p-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Or copy this link</div>
            <div className="flex items-center gap-2">
              <input readOnly value={url} onClick={(e) => e.target.select()}
                className="flex-1 h-10 border border-zinc-300 px-3 text-sm font-mono bg-white focus:outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="h-10 px-3 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-1.5">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-3 text-xs text-amber-800 space-y-2">
            <p><b>Android:</b> Open in Chrome → ⋮ → "Install app"</p>
            <p><b>iPhone:</b> Open in Safari → Share → "Add to Home Screen"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
