import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Camera, ScanLine, Upload, RefreshCw } from "lucide-react";

export default function BarcodeScanner({ onDetect, onClose }) {
  const fileRef = useRef(null);
  const inputRef = useRef(null);
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

  const handleDetect = (code) => {
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
        { fps: 10, qrbox: { width: 280, height: 120 } },
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
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-black rounded border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 bg-zinc-900">
          <div className="flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-[#E60000]" strokeWidth={2.5} />
            <span className="text-white text-xs font-bold uppercase tracking-wider">Barcode Scanner</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-700 rounded" aria-label="Close scanner">
            <X className="w-4 h-4 text-zinc-400" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative bg-black overflow-hidden" style={{ height: "260px" }}>
          <div id="qr-reader-live" className="w-full h-full" />

          {mode === "init" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-2 z-10">
              <div className="w-6 h-6 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-500 text-[10px] font-mono">Starting camera...</p>
            </div>
          )}

          {mode === "live" && (
            <>
              <div className="absolute inset-x-4 z-10 pointer-events-none animate-[scan_2s_ease-in-out_infinite]">
                <div className="h-0.5 bg-red-500 shadow-[0_0_10px_#ff0000]" />
              </div>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 bg-black/70 px-2 py-0.5 rounded">
                <p className="text-[8px] text-zinc-500 font-mono tracking-wider">SCANNING</p>
              </div>
            </>
          )}

          <div ref={flashRef} className="absolute inset-0 bg-green-500/40 z-20 pointer-events-none opacity-0 transition-opacity duration-200" />
        </div>

        {mode === "manual" && (
          <div className="bg-zinc-900 px-4 py-6">
            <div className="space-y-3">
              <p className="text-zinc-400 text-xs text-center">Camera unavailable</p>
              <button onClick={startCamera} className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold uppercase tracking-widest border border-zinc-700 rounded flex items-center justify-center gap-1.5">
                <RefreshCw className="w-3 h-3" /> Try Camera Again
              </button>
              <input value={manual} onChange={e => setManual(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && manual.trim()) { e.preventDefault(); onDetect(manual.trim()); } }}
                placeholder="Type barcode..."
                className="w-full h-10 bg-zinc-800 border border-zinc-700 text-white px-3 font-mono text-sm text-center focus:outline-none focus:border-[#E60000] placeholder-zinc-600 rounded" autoFocus />
              <div className="flex items-center gap-3"><div className="flex-1 h-px bg-zinc-800" /><span className="text-zinc-600 text-[10px] font-mono">or</span><div className="flex-1 h-px bg-zinc-800" /></div>
              <button onClick={() => fileRef.current?.click()}
                className="w-full h-8 bg-zinc-800 hover:bg-zinc-700 border border-dashed border-zinc-700 text-zinc-400 text-xs font-mono flex items-center justify-center gap-1.5 rounded">
                <Upload className="w-3 h-3" /> Upload Image
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
              <div id="qr-reader-file" className="hidden" />
            </div>
          </div>
        )}

        {error && <div className="px-3 py-1.5 bg-red-900/30 border-t border-red-800"><p className="text-[11px] text-red-400 font-mono">{error}</p></div>}
      </div>
    </div>
  );
}
