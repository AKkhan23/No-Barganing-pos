import React, { useEffect, useRef, useState } from "react";
import { X, Camera, ScanLine } from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

export default function BarcodeScanner({ onDetect, onClose }) {
  const containerRef = useRef(null);
  const startedRef = useRef(false);
  const [error, setError] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let alive = true;
    let scanner = null;

    async function initScanner() {
      try {
        scanner = new Html5Qrcode("qr-reader");
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 280, height: 220 },
            formatsToSupport: [
              "QR_CODE",
              "EAN_13",
              "EAN_8",
              "CODE_128",
              "CODE_39",
              "UPC_A",
              "UPC_E",
              "ITF",
            ],
          },
          (decodedText) => {
            if (alive) onDetect(decodedText);
          },
          () => {}
        );
        if (alive) startedRef.current = true;
      } catch (err) {
        if (alive) {
          console.log("[Scanner] init error:", err?.message || err);
          setError("Camera access denied or not available. Type code manually.");
        }
      }
    }

    initScanner();

    return () => {
      alive = false;
      if (startedRef.current && scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white border-2 border-white/20">
        <div className="flex items-center justify-between p-4 bg-zinc-950 text-white">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#E60000]" strokeWidth={2.5} />
            <h3 className="font-display font-bold uppercase tracking-wider">Scan Barcode / QR</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800" aria-label="Close scanner">
            <X className="w-5 h-5" strokeWidth={2.5} />
          </button>
        </div>

        <div className="relative bg-black" style={{ minHeight: "300px" }}>
          <div id="qr-reader" ref={containerRef} className="w-full" />
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white p-4 text-center text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="p-4 bg-zinc-50 border-t-2 border-zinc-200">
          <div className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
            <ScanLine className="w-3 h-3" /> Point camera at barcode or QR code
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
              placeholder="Or type barcode / SKU"
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
