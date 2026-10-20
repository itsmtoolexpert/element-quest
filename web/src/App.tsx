import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Navigate, Route, Routes } from "react-router";

import { api, ApiError } from "./api";
import ConnectionBanner from "./components/ConnectionBanner";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try { return await api.me(); }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
    },
    // If the laptop is unreachable at first load, keep trying quietly.
    refetchInterval: (q) => (q.state.status === "error" ? 5000 : false),
  });
}

export default function App() {
  const me = useMe();
  if (me.isPending) return <Splash />;
  if (me.isError && me.data === undefined) {
    return <Splash offline onRetry={() => me.refetch()} />;
  }
  const user = me.data;

  return (
    <>
      <ConnectionBanner />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/*" element={user ? <HomePage user={user} /> : <Navigate to="/login" replace />} />
      </Routes>
    </>
  );
}

function Splash({ offline, onRetry }: { offline?: boolean; onRetry?: () => void }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div className="flex max-w-md flex-col items-center gap-3">
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Element <span className="rainbow-text">Quest</span>
        </h1>
        {offline ? (
          <>
            <p className="text-lg font-bold">Can't reach Element Quest right now.</p>
            <p className="text-muted">
              It runs on the laptop at home. Check that the laptop is awake and that you're on the same Wi-Fi.
              This page will connect by itself as soon as it can.
            </p>
            <button onClick={onRetry} className="mt-2 flex items-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-white">
              <RefreshCw size={18} /> Try again now
            </button>
          </>
        ) : (
          <p className="text-muted">Loading…</p>
        )}
      </div>
    </div>
  );
}
