// Thin typed client for the Element Quest API. The session cookie is sent automatically.

export type Role = "student" | "admin";

export interface Profile { username: string; display_name: string; avatar: string | null; role: Role }
export interface User extends Profile { id: number; grade: string | null }

export interface Family { code: string; name: string; short_name: string; color: string; description: string }

export interface ElementSummary {
  number: number; symbol: string; name: string; mass: string; mass_is_estimate: boolean;
  family_code: string; group: number | null; period: number; block: string; state: string;
  radioactive: boolean; valence_electrons: number | null; featured: boolean; everyday_use: string;
}

export interface CheckQuestion { question: string; correct: string; wrong: string[]; explanation: string }

export interface ElementDetail extends ElementSummary {
  electron_config: string; shells: number[]; latin_name: string | null; family: Family;
  content: { everyday_use: string; go_deeper: string | null; try_it: string | null; featured: boolean; check_question: CheckQuestion | null } | null;
}

export interface Collection { slug: string; label: string; note: string; symbols: string[] }
export interface MyStats { explored: number; mastered: number; due_today: number; streak_days: number }

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try { const body = await res.json(); if (typeof body.detail === "string") msg = body.detail; } catch { /* not JSON */ }
    throw new ApiError(res.status, msg);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export const api = {
  profiles: () => request<Profile[]>("/api/auth/profiles"),
  me: () => request<User>("/api/auth/me"),
  login: (username: string, password: string) =>
    request<User>("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  families: () => request<Family[]>("/api/families"),
  elements: () => request<ElementSummary[]>("/api/elements"),
  element: (key: string | number) => request<ElementDetail>(`/api/elements/${key}`),
  collections: () => request<Collection[]>("/api/collections"),
  myStats: () => request<MyStats>("/api/stats/me"),
};
