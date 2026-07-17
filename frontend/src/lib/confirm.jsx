import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({ open: false, title: "", message: "" });
  const resolveRef = useRef(null);

  const showConfirm = useCallback((message, title = "Confirm") => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ open: true, title, message });
    });
  }, []);

  const handleConfirm = () => {
    setState({ open: false });
    if (resolveRef.current) resolveRef.current(true);
  };

  const handleCancel = () => {
    setState({ open: false });
    if (resolveRef.current) resolveRef.current(false);
  };

  return (
    <ConfirmContext.Provider value={showConfirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(o) => { if (!o) handleCancel(); }}>
        <AlertDialogPortal>
          <AlertDialogOverlay className="bg-black/70" />
          <AlertDialogContent className="border-2 border-zinc-900 rounded-none max-w-sm p-0 gap-0 bg-white">
            <div className="bg-zinc-950 text-white px-5 py-3">
              <AlertDialogTitle className="text-sm font-bold uppercase tracking-widest">{state.title}</AlertDialogTitle>
            </div>
            <div className="px-5 py-6">
              <AlertDialogDescription className="text-sm text-zinc-700">{state.message}</AlertDialogDescription>
            </div>
            <AlertDialogFooter className="px-5 py-3 bg-zinc-50 border-t border-zinc-200 flex-row gap-2 sm:justify-end">
              <AlertDialogCancel onClick={handleCancel}
                className="h-9 px-4 border border-zinc-300 rounded text-xs font-bold uppercase tracking-widest text-zinc-600 hover:bg-zinc-100 m-0">
                No
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirm}
                className="h-9 px-4 bg-[#E60000] text-white rounded text-xs font-bold uppercase tracking-widest hover:bg-[#cc0000] m-0">
                Yes
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
