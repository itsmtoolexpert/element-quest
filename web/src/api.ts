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

export interface Material {
  id: number; name: string; aliases: string[]; formula: string | null; kind: "element" | "compound" | "mixture";
  composition: Record<string, number>; atoms: Record<string, number> | null;
  note: string | null; source: string | null; featured: boolean;
}

export type Level = "unexplored" | "learning" | "reviewing" | "mastered";
export interface Mastery { levels: Record<string, Level>; counts: Record<Level, number> }

export interface CardQuestion {
  card_id: number; element: number; fact: string; kind: string; prompt: string; options: string[]; state: string;
}
export interface ReviewQueue { due_total: number; cards: CardQuestion[] }
export interface ReviewAnswer {
  correct: boolean; answer: string; explanation: string; rating: string; next_due: string;
  interval_days: number; element_level: Level; due_total: number; new_badges: Badge[];
}

export interface QuizQuestion { element: number; fact: string; kind: string; prompt: string; options: string[]; answer: string; explanation: string }
export interface QuizRound { mode: string; title: string; note: string | null; questions: QuizQuestion[] }
export interface QuizResult { element: number; fact: string; correct: boolean }
export interface QuizFinish { score: number; total: number; new_badges: Badge[] }

export interface Badge { code: string; label: string }
export interface Explored { numbers: number[]; badges: Badge[] }
export interface ExploreResult { new: boolean; explored_count: number; new_badges: Badge[] }

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
  myStats: () => request<MyStats>("/api/me/stats"),
  materials: () => request<Material[]>("/api/materials"),
  explored: () => request<Explored>("/api/me/explored"),
  explore: (n: number) => request<ExploreResult>(`/api/me/explored/${n}`, { method: "POST" }),
  mastery: () => request<Mastery>("/api/me/mastery"),
  reviewQueue: (limit = 20) => request<ReviewQueue>(`/api/review/queue?limit=${limit}`),
  reviewAnswer: (cardId: number, answer: string, duration_ms: number) =>
    request<ReviewAnswer>(`/api/review/${cardId}`, { method: "POST", body: JSON.stringify({ answer, duration_ms }) }),
  quizStart: (mode: string) => request<QuizRound>("/api/quiz/start", { method: "POST", body: JSON.stringify({ mode }) }),
  quizFinish: (mode: string, results: QuizResult[]) =>
    request<QuizFinish>("/api/quiz/finish", { method: "POST", body: JSON.stringify({ mode, results }) }),
  logMiss: (query: string) =>
    request<void>("/api/search-misses", { method: "POST", body: JSON.stringify({ query }) }),
};
