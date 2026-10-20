import { useQueryClient } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

import { api, CONNECTION_EVENT } from "../api";

/**
 * Shows a banner when the laptop running Element Quest stops answering (asleep, off, or out of Wi-Fi range),
 * checks again every few seconds, and refreshes everything once it's back.
 */
export default function ConnectionBanner() {
  const qc = useQueryClient();
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const on = (e: Event) => setOffline(!(e as CustomEvent<{ online: boolean }>).detail.online);
    window.addEventListener(CONNECTION_EVENT, on);
    return () => window.removeEventListener(CONNECTION_EVENT, on);
  }, []);

  useEffect(() => {
    if (!offline) return;
    const t = setInterval(() => {
      api.health().then(() => { setOffline(false); qc.invalidateQueries(); }).catch(() => {});
    }, 5000);
    return () => clearInterval(t);
  }, [offline, qc]);

  if (!offline) return null;
  return (
    <div role="alert" className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-fg px-4 py-3 text-center text-bg"
      style={{ paddingTop: "calc(12px + env(safe-area-inset-top, 0px))" }}>
      <WifiOff size={18} className="shrink-0" />
      <span><b>Can't reach Element Quest.</b> Is the laptop awake and on the same Wi-Fi? Checking again every few seconds…</span>
    </div>
  );
}
