import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, Upload, RefreshCw } from "lucide-react";

export default function BarcodeScanner({ onDetect, onClose }) {
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const qrRef = useRef(null);
  const flashRef = useRef(null);
  const lastCodeRef = useRef(null);
  const lastTimeRef = useRef(0);
  const [mode, setMode] = useState("init");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  const beep = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const flashGreen = () => {
    if (flashRef.current) {
      flashRef.current.classList.remove("opacity-0");
      flashRef.current.classList.add("opacity-100");
      setTimeout(() => {
        if (flashRef.current) {
          flashRef.current.classList.remove("opacity-100");
          flashRef.current.classList.add("opacity-0");
        }
      }, 300);
    }
  };

  const handleDetect = (code) => {
    const now = Date.now();
    if (code === lastCodeRef.current && now - lastTimeRef.current < 5000) return;
    lastCodeRef.current = code;
    lastTimeRef.current = now;
    beep();
    flashGreen();
    onDetect(code);
  };

  const startCamera = useCallback(async () => {
    setMode("init");
    setError("");
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const qr = new Html5Qrcode("qr-reader-live");
      qrRef.current = qr;
      await qr.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 300, height: 200 } },
        (code) => handleDetect(code),
        () => {}
      );
      setMode("live");
    } catch {
      setMode("manual");
    }
  }, []);

  const stopCam = useCallback(async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch {}
      qrRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => { stopCam(); };
  }, [startCamera, stopCam]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("qr-reader-file");
      const result = await s.scanFile(file, true);
      handleDetect(result);
    } catch {
      setError("Could not read barcode from image. Try typing it.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 bg-white">
          <div className="flex items-center gap-2.5">
            <Camera className="w-5 h-5 text-[#E60000]" strokeWidth={2.5} />
            <span className="text-zinc-900 text-base font-bold uppercase tracking-wider">Barcode Scanner</span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-100 rounded-full transition-colors" aria-label="Close scanner">
            <X className="w-5 h-5 text-zinc-500" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative bg-black overflow-hidden" style={{ height: "380px" }}>
          <div id="qr-reader-live" className="w-full h-full" />

          {mode === "init" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-2 z-10">
              <div className="w-8 h-8 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-400 text-xs font-mono">Starting camera...</p>
            </div>
          )}

          {mode === "live" && (
            <>
              <div className="absolute inset-0 z-10 pointer-events-none scan-line">
                <div className="h-0.5 bg-red-500 shadow-[0_0_15px_#ff0000]" />
              </div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-4 py-1 rounded-full">
                <p className="text-[10px] text-zinc-400 font-mono tracking-widest">SCANNING</p>
              </div>
            </>
          )}

          <div ref={flashRef} className="absolute inset-0 bg-green-500/40 z-20 pointer-events-none opacity-0 transition-opacity duration-200" />
        </div>

        {mode === "manual" && (
          <div className="bg-white px-4 py-6">
            <div className="space-y-3">
              <p className="text-zinc-500 text-xs text-center">Camera unavailable</p>
              <button onClick={startCamera} className="w-full h-9 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold uppercase tracking-widest border border-zinc-300 rounded flex items-center justify-center gap-1.5 transition-colors">
                <RefreshCw className="w-3.5 h-3.5" /> Try Camera Again
              </button>
              <input value={manual} onChange={e => setManual(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && manual.trim()) { e.preventDefault(); onDetect(manual.trim()); } }}
                placeholder="Type barcode..."
                className="w-full h-10 bg-white border-2 border-zinc-300 text-zinc-900 px-3 font-mono text-sm text-center focus:outline-none focus:border-[#E60000] placeholder-zinc-400 rounded" autoFocus />
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-zinc-200" /><span className="text-zinc-400 text-[10px] font-mono">or</span><div className="flex-1 h-px bg-zinc-200" /></div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-9 bg-zinc-50 hover:bg-zinc-100 border border-dashed border-zinc-300 text-zinc-500 text-xs font-mono flex items-center justify-center gap-1.5 rounded transition-colors">
                <Upload className="w-3.5 h-3.5" /> Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div id="qr-reader-file" className="hidden" />
            </div>
          </div>
        )}

        {error && <div className="px-4 py-2 bg-red-50 border-t border-red-100"><p className="text-xs text-red-600 font-mono">{error}</p></div>}
      </div>
    </div>
  );
}
