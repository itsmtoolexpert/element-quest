import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

const ToastCtx = createContext<(msg: string) => void>(() => {});

export function useToast() {
  return useContext(ToastCtx);
}

/** One message at a time, slides up from the bottom. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const toast = useCallback((m: string) => {
    setMsg(m);
    setShow(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setShow(false), 3000);
  }, []);

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className={`fixed left-1/2 z-[100] max-w-[calc(100vw-32px)] -translate-x-1/2 rounded-full bg-fg px-5 py-3 text-center font-bold text-bg shadow-xl transition-transform duration-300 ease-[cubic-bezier(.2,1.4,.4,1)] ${show ? "translate-y-0" : "translate-y-[160%]"}`}
        style={{ bottom: "calc(20px + env(safe-area-inset-bottom, 0px))" }}
      >
        {msg}
      </div>
    </ToastCtx.Provider>
  );
}
