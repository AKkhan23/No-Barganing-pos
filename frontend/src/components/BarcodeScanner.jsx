import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, ScanLine, Upload, RefreshCw } from "lucide-react";

export default function BarcodeScanner({ onDetect, onClose }) {
  const fileRef = useRef(null);
  const inputRef = useRef(null);
  const qrDivRef = useRef(null);
  const qrRef = useRef(null);
  const flashRef = useRef(null);
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

  const success = (code) => {
    beep();
    flashGreen();
    if (qrRef.current) {
      qrRef.current.stop().catch(() => {}).then(() => {
        setTimeout(() => onDetect(code), 200);
      });
    } else {
      setTimeout(() => onDetect(code), 200);
    }
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
        { fps: 10, qrbox: { width: 280, height: 120 } },
        (code) => success(code),
        () => {}
      );
      setMode("live");
    } catch (err) {
      setMode("manual");
    }
  }, [onDetect]);

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
      success(result);
    } catch {
      setError("Could not read barcode from image. Try typing it.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-2 border-white/20">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#E60000]" strokeWidth={2.5} />
            <h3 className="font-display font-bold uppercase tracking-wider">Scan Barcode</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" aria-label="Close scanner">
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative bg-black flex items-center justify-center overflow-hidden" style={{ minHeight: mode === "manual" ? 0 : "320px" }}>
          <div ref={qrDivRef} id="qr-reader-live" className="w-full" style={{ minHeight: "320px" }} />

          {/* Red laser line */}
          {mode === "live" && (
            <>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_#ff0000] z-10 pointer-events-none">
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_#ff0000]" />
              </div>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 px-3 py-1 rounded-full">
                <div className="w-32 h-1 bg-zinc-700 rounded overflow-hidden">
                  <div className="h-full bg-[#E60000] rounded animate-pulse" style={{ width: "60%" }} />
                </div>
                <p className="text-[9px] text-zinc-400 font-mono text-center mt-0.5">Scanning...</p>
              </div>
            </>
          )}

          {mode === "init" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-3 z-10">
              <div className="w-8 h-8 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-400 text-xs font-mono">Starting camera...</p>
            </div>
          )}

          {/* Green flash overlay */}
          <div ref={flashRef} className="absolute inset-0 bg-green-500/40 z-20 pointer-events-none opacity-0 transition-opacity duration-150" />
        </div>

        {mode === "manual" && (
          <div className="bg-zinc-900 py-8 px-6" style={{ minHeight: "280px" }}>
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center">
                <ScanLine className="w-10 h-10 text-zinc-500 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm">Camera unavailable. Type barcode or upload image.</p>
                <button onClick={startCamera} className="mt-3 h-9 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors rounded border border-zinc-600">
                  <RefreshCw className="w-3.5 h-3.5" /> Try Camera Again
                </button>
              </div>
              <div>
                <input ref={inputRef} value={manual} onChange={e => setManual(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && manual.trim()) { e.preventDefault(); onDetect(manual.trim()); } }}
                  placeholder="e.g. 8901234567890"
                  className="w-full h-12 bg-zinc-800 border-2 border-zinc-600 text-white px-4 font-mono text-lg tracking-wider text-center focus:outline-none focus:border-[#E60000] placeholder-zinc-600" autoFocus />
              </div>
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-700" /></div>
                <div className="relative flex justify-center"><span className="bg-zinc-900 px-3 text-[10px] font-mono uppercase text-zinc-500">or</span></div>
              </div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 border-2 border-dashed border-zinc-600 text-zinc-300 font-bold uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-colors">
                <Upload className="w-4 h-4" /> Upload barcode image
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div id="qr-reader-file" className="hidden" />
            </div>
          </div>
        )}

        {error && <div className="px-4 py-2 bg-red-50 border-t-2 border-red-200"><p className="text-xs text-red-600 font-mono">{error}</p></div>}
      </div>
    </div>
  );
}
