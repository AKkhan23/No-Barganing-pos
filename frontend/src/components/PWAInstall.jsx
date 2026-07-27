import React, { useEffect, useState } from "react";
import { Download, Smartphone, X, Wifi, WifiOff, QrCode, Share2, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

let deferredPrompt = null;

export function useInstallPrompt() {
  const [prompt, setPrompt] = useState(null);
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    // If came via QR code, show banner immediately regardless of prompt
    if (window.location.search.includes("install=1")) {
      const timer = setTimeout(() => {
        if (!deferredPrompt) {
          setPrompt({ fromQR: true });
        }
      }, 1000);
      return () => { clearTimeout(timer); window.removeEventListener("beforeinstallprompt", handler); };
    }
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
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    setHidden(true);
    localStorage.setItem("pwa_dismissed", "1");
  };

  const dismiss = () => {
    setHidden(true);
    localStorage.setItem("pwa_dismissed", "1");
  };

  return (
    <>
      {offline && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-600 text-white text-center py-1 text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" /> Offline — some features limited
        </div>
      )}
      {prompt && !hidden && (
        <div className={`fixed z-[60] bg-white border-2 border-zinc-900 shadow-xl ${fromQR ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 p-6" : "bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 p-4"}`} data-testid="pwa-install-banner">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E60000] flex items-center justify-center flex-shrink-0 rounded">
              <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm text-zinc-900 uppercase">{fromQR ? "Install POS on Your Phone" : "Install POS App"}</div>
              <div className="text-xs text-zinc-600 mt-1">{fromQR ? "Tap Install to add to your home screen. Works offline!" : "Add to home screen for fast, offline-ready checkout."}</div>
              <div className="flex gap-2 mt-3">
                <button onClick={install} data-testid="pwa-install-btn" className={`font-bold uppercase tracking-widest ${fromQR ? "flex-1 h-12 bg-[#E60000] text-white text-sm" : "flex-1 h-9 bg-[#E60000] text-white text-[10px]"}`}>Install</button>
                <button onClick={dismiss} className={`border border-zinc-300 font-bold uppercase tracking-widest ${fromQR ? "h-12 px-6 text-xs text-zinc-700" : "h-9 px-3 text-[10px] text-zinc-700"}`}>Later</button>
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
    if (deferredPrompt) {
      setInstalling(true);
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      deferredPrompt = null;
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
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "No Bargaining POS", url }); } catch {}
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          {/* QR Code */}
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="bg-white border-2 border-zinc-200 p-3">
              <QRCodeSVG value={url} size={180} bgColor="#fff" fgColor="#18181b" level="M" />
            </div>
            <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
              Scan with phone camera
            </p>
          </div>

          {/* Copy URL */}
          <div className="bg-zinc-50 border border-zinc-200 p-3">
            <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 mb-2">Or copy this link</div>
            <div className="flex items-center gap-2">
              <input readOnly value={url} onClick={(e) => e.target.select()}
                className="flex-1 h-10 border border-zinc-300 px-3 text-sm font-mono bg-white focus:outline-none" />
              <button onClick={handleShare}
                className="h-10 px-3 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-black flex items-center gap-1.5">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-700">
              1. Open link on your phone
            </div>
            <div className="text-xs font-bold uppercase tracking-widest text-zinc-700">
              2. Install from browser menu:
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-zinc-50 border border-zinc-200 p-3">
                <p className="font-bold text-zinc-900 mb-1">Android</p>
                <p className="text-zinc-600">Chrome ⋮ → "Install app"</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 p-3">
                <p className="font-bold text-zinc-900 mb-1">iPhone</p>
                <p className="text-zinc-600">Safari Share → "Add to Home Screen"</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-300 p-3 text-[11px] text-amber-800">
            <b>Offline:</b> After installing, open from home screen — works even without internet.
          </div>

          {/* Share button for mobile */}
          {isMobile && navigator.share && (
            <button onClick={handleShare}
              className="w-full h-11 bg-[#E60000] text-white text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <Share2 className="w-4 h-4" /> Share with another device
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
