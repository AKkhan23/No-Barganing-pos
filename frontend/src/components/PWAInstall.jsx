import React, { useEffect, useState, useCallback } from "react";
import { Download, Wifi, WifiOff, Smartphone, X, Share, MoreVertical } from "lucide-react";

/**
 * PWA install prompt banner + offline indicator.
 * Shown once when browser fires 'beforeinstallprompt'.
 */
export default function PWAInstall() {
  const [prompt, setPrompt] = useState(null);
  const [hidden, setHidden] = useState(() => localStorage.getItem("pwa_dismissed") === "1");
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
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
        <div className="fixed top-0 left-0 right-0 z-[60] bg-[#E60000] text-white text-center py-1 text-[10px] font-mono uppercase tracking-widest flex items-center justify-center gap-2">
          <WifiOff className="w-3 h-3" /> Offline — sales queued locally
        </div>
      )}
      {prompt && !hidden && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-[60] bg-white border-2 border-zinc-900 shadow-xl p-4" data-testid="pwa-install-banner">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E60000] flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div className="flex-1">
              <div className="font-display font-bold uppercase text-sm">Install POS App</div>
              <div className="text-xs text-zinc-600 mt-1">Add to home screen for fast, offline-ready checkout.</div>
              <div className="flex gap-2 mt-3">
                <button onClick={install} data-testid="pwa-install-btn" className="flex-1 h-9 bg-[#E60000] text-white text-[10px] font-bold uppercase tracking-widest">Install</button>
                <button onClick={dismiss} className="h-9 px-3 border border-zinc-300 text-[10px] font-bold uppercase tracking-widest">Later</button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    <div className={`flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest ${online ? "text-green-700" : "text-[#E60000]"}`}>
      {online ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
      {online ? "Online" : "Offline"}
    </div>
  );
}

export function InstallAppButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid="install-app-btn"
        className="w-full mb-2 flex items-center justify-center gap-2 h-9 border-2 border-dashed border-[#FDE047] hover:bg-[#FDE047] hover:text-zinc-900 text-[#FDE047] text-[10px] font-bold uppercase tracking-widest transition-colors"
      >
        <Smartphone className="w-3.5 h-3.5" strokeWidth={2.5} /> Install App on Phone
      </button>
      {open && <InstallHelpModal onClose={() => setOpen(false)} />}
    </>
  );
}

function InstallHelpModal({ onClose }) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href.split('?')[0].split('#')[0];
  const shareUrl = url.includes('localhost') ? 'https://pos.webimaticsolutions.com' : url;
  return (
    <div className="fixed inset-0 z-[70] bg-black/70 flex items-center justify-center p-4" data-testid="install-help-modal">
      <div className="w-full max-w-2xl bg-white border-2 border-zinc-900 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white sticky top-0">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-[#E60000]" strokeWidth={2.5} />
            <div className="font-display font-black uppercase text-lg">Install No Bargaining POS</div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-[#E60000]/5 border-2 border-[#E60000] p-4 rounded">
            <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-1">Share this URL with your team:</div>
            <div className="flex items-center gap-2">
              <input readOnly value={shareUrl} onClick={(e) => e.target.select()}
                className="flex-1 h-11 border-2 border-zinc-300 px-3 text-sm font-mono bg-white focus:outline-none focus:border-[#E60000]" />
              <button onClick={() => { navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="h-11 px-4 bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest hover:bg-black transition-colors">
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="text-sm text-zinc-600">
            Install this POS as an app on any device — works offline, opens fast, no browser bar. Follow the guide for your device:
          </div>

          <Section title="Android · Chrome / Edge">
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Open <b>{shareUrl}</b> in <b>Chrome</b> on your phone.</li>
              <li>Tap the <b>⋮ menu</b> (top-right).</li>
              <li>Tap <b>"Install app"</b> or <b>"Add to Home Screen"</b>.</li>
              <li>Tap <b>Install</b> — done! App icon appears on home screen.</li>
            </ol>
          </Section>

          <Section title="iPhone / iPad · Safari">
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Open <b>{shareUrl}</b> in <b>Safari</b> (not Chrome — Apple requires Safari).</li>
              <li>Tap the <b>Share button <Share className="inline w-3 h-3" /></b> at the bottom.</li>
              <li>Scroll down and tap <b>"Add to Home Screen"</b>.</li>
              <li>Tap <b>Add</b> — icon appears on home screen.</li>
            </ol>
          </Section>

          <Section title="Desktop · Chrome / Edge / Brave">
            <ol className="list-decimal ml-5 space-y-1 text-sm">
              <li>Open <b>{shareUrl}</b> in your browser.</li>
              <li>Look for the <b>install icon</b> (⊕ / monitor icon) in the address bar.</li>
              <li>Click it → <b>"Install"</b> in the popup.</li>
              <li>App opens in its own window like native software.</li>
            </ol>
          </Section>

          <div className="bg-yellow-50 border-2 border-[#FDE047] p-3 text-xs">
            <b>Tip for store owners:</b> After installing on the cashier's tablet, you can rotate the tablet or use a USB barcode gun — the POS screen is optimized for both.
            <br /><br />
            <b>Note:</b> If you're on localhost, share the <b>deployed URL</b> (not localhost). Deploy your frontend to see it online.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="border-l-4 border-[#E60000] pl-4">
      <div className="font-display font-bold uppercase text-sm mb-2">{title}</div>
      {children}
    </div>
  );
}
