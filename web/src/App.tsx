import { useQuery } from "@tanstack/react-query";
import { Navigate, Route, Routes } from "react-router";

import { api, ApiError } from "./api";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      try { return await api.me(); }
      catch (e) { if (e instanceof ApiError && e.status === 401) return null; throw e; }
    },
  });
}

export default function App() {
  const me = useMe();
  if (me.isPending) return <Splash />;
  if (me.isError) return <Splash message="Can't reach Element Quest. Is the laptop awake?" />;
  const user = me.data;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={user ? <HomePage user={user} /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

function Splash({ message }: { message?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center p-6 text-center">
      <div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Element <span className="rainbow-text">Quest</span>
        </h1>
        <p className="mt-3 text-muted">{message ?? "Loading…"}</p>
      </div>
    </div>
  );
}
