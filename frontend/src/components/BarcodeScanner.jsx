import React, { useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine, Image } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");
  const [mode, setMode] = useState("live");

  useEffect(() => {
    let alive = true;
    let scanner = null;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!alive) { stopStream(stream); return; }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        if ("BarcodeDetector" in window) {
          startBarcodeLoop();
        } else {
          startHtml5Loop();
        }
      } catch {
        if (alive) setMode("photo");
      }
    }

    async function startBarcodeLoop() {
      const detector = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "itf", "qr_code"],
      });
      while (true) {
        if (!videoRef.current || videoRef.current.readyState < 2) { await sleep(300); continue; }
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) { onDetect(codes[0].rawValue); return; }
        } catch {}
        await sleep(300);
      }
    }

    async function startHtml5Loop() {
      scanner = new Html5Qrcode("qr-reader");
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 220 } },
        (text) => { if (alive) onDetect(text); },
        () => {}
      );
    }

    startCamera();

    return () => {
      alive = false;
      if (scanner) scanner.stop().catch(() => {});
      stopStream(streamRef.current);
    };
  }, []);

  function stopStream(stream) {
    if (stream) stream.getTracks().forEach((t) => t.stop());
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const scanner = new Html5Qrcode("qr-reader");
      const result = await scanner.scanFile(file, true);
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

        {mode === "live" ? (
          <div className="relative bg-black" style={{ minHeight: "280px" }}>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center bg-zinc-900 py-10 px-4" style={{ minHeight: "280px" }}>
            <Camera className="w-12 h-12 text-zinc-500 mb-3" strokeWidth={1.5} />
            <p className="text-zinc-400 text-xs mb-4 text-center">
              Live camera not available on this connection.<br/>Take a photo of the barcode instead.
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="h-12 px-8 bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-zinc-200 flex items-center gap-2"
            >
              <Image className="w-4 h-4" /> Take Photo
            </button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="hidden" />
          </div>
        )}

        <div className="p-4 bg-zinc-50 border-t-2 border-zinc-200">
          {error && (
            <div className="text-xs text-red-600 mb-2 font-mono">{error}</div>
          )}
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
            <ScanLine className="w-3 h-3" /> Or type barcode manually
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) onDetect(manual.trim());
            }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Type barcode or SKU"
              className="flex-1 h-12 border-2 border-zinc-300 px-3 font-mono text-sm focus:outline-none focus:border-[#E60000]"
              autoFocus
            />
            <button
              type="submit"
              className="h-12 px-5 bg-[#E60000] text-white font-bold uppercase tracking-widest text-xs hover:bg-red-700"
            >
              Add
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}