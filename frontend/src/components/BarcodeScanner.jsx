import React, { useState } from "react";
import { X, Camera, ScanLine, Upload, RefreshCw } from "lucide-react";

export default function BarcodeScanner({ onDetect, onClose }) {
  const fileRef = React.useRef(null);
  const inputRef = React.useRef(null);
  const videoRef = React.useRef(null);
  const [mode, setMode] = useState("init");
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  const openCam = React.useCallback(async () => {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !isLocal) {
      setMode("manual");
      return;
    }
    setMode("init");
    const cams = [
      { facingMode: "environment" },
      { facingMode: "user" },
      true,
    ];
    for (const constraints of cams) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: constraints });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setMode("live");
        return;
      } catch {}
    }
    setMode("manual");
  }, []);

  React.useEffect(() => {
    openCam();
    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
    };
  }, [openCam]);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const s = new Html5Qrcode("qr-reader-file");
      const result = await s.scanFile(file, true);
      onDetect(result);
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
          <video ref={videoRef} autoPlay playsInline muted className="w-full object-contain" style={{ maxHeight: "320px" }} />
          {mode === "init" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900 gap-3 z-10">
              <div className="w-8 h-8 border-2 border-zinc-500 border-t-white rounded-full animate-spin" />
              <p className="text-zinc-400 text-xs font-mono">Starting camera...</p>
            </div>
          )}
        </div>

        {mode === "manual" && (
          <div className="bg-zinc-900 py-8 px-6" style={{ minHeight: "280px" }}>
            <div className="max-w-md mx-auto space-y-5">
              <div className="text-center">
                <ScanLine className="w-10 h-10 text-zinc-500 mx-auto mb-2" strokeWidth={1.5} />
                <p className="text-zinc-400 text-sm">Camera unavailable. Type barcode or upload image.</p>
                <button onClick={openCam} className="mt-3 h-9 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mx-auto transition-colors rounded border border-zinc-600">
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
