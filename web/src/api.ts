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

// ---------------------------------------------------------------- admin
export interface DayActivity { date: string; explored: number; reviews: number; quizzes: number }
export interface Trouble { number: number; symbol: string; name: string; right: number; wrong: number }
export interface StudentSummary {
  id: number; username: string; display_name: string; avatar: string | null; grade: string | null; is_active: boolean;
  last_active: string | null; streak_days: number; explored: number; mastered: number; due_now: number;
  reviews_7d: number; accuracy_7d: number | null; quizzes_7d: number; activity: DayActivity[]; trouble: Trouble[];
}
export interface StudentDetail extends StudentSummary {
  levels: Record<string, Level>; level_counts: Record<Level, number>; badges: Badge[];
  recent_quizzes: { mode: string; score: number; total: number; created_at: string }[];
}
export interface AdminUser {
  id: number; username: string; display_name: string; role: Role; avatar: string | null; grade: string | null;
  is_active: boolean; last_seen_at: string | null;
}
export interface ContentIn {
  everyday_use: string; go_deeper: string | null; try_it: string | null; featured: boolean; check_question: CheckQuestion | null;
}
export interface MaterialIn {
  name: string; aliases: string[]; formula?: string | null; composition?: Record<string, number> | null;
  note: string | null; source: string | null; featured: boolean;
}
export interface MissGroup { query: string; count: number; students: string[]; last_at: string }

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
    try {
      const body = await res.json();
      if (typeof body.detail === "string") msg = body.detail;
      // FastAPI validation errors: [{loc, msg}, …] → "field: problem"
      else if (Array.isArray(body.detail)) {
        msg = body.detail.map((d: { loc?: string[]; msg?: string }) => {
          const field = d.loc?.filter((x) => x !== "body").join(" ");
          return `${field ? `${field}: ` : ""}${(d.msg ?? "").replace(/^Value error, /, "")}`;
        }).join("; ");
      }
    } catch { /* not JSON */ }
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
  changePassword: (current: string, next: string) =>
    request<void>("/api/auth/password", { method: "POST", body: JSON.stringify({ current, new: next }) }),

  admin: {
    overview: () => request<StudentSummary[]>("/api/admin/overview"),
    student: (id: number) => request<StudentDetail>(`/api/admin/students/${id}`),
    users: () => request<AdminUser[]>("/api/admin/users"),
    createUser: (u: { username: string; display_name: string; password: string; avatar?: string; grade?: string | null }) =>
      request<AdminUser>("/api/admin/users", { method: "POST", body: JSON.stringify(u) }),
    updateUser: (id: number, patch: Partial<Pick<AdminUser, "display_name" | "avatar" | "grade" | "is_active">>) =>
      request<AdminUser>(`/api/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
    setPassword: (id: number, password: string) =>
      request<void>(`/api/admin/users/${id}/password`, { method: "POST", body: JSON.stringify({ password }) }),
    saveContent: (n: number, c: ContentIn) =>
      request<unknown>(`/api/admin/elements/${n}/content`, { method: "PUT", body: JSON.stringify(c) }),
    previewFormula: (formula: string) =>
      request<{ atoms: Record<string, number>; composition: Record<string, number> }>("/api/admin/materials/preview", { method: "POST", body: JSON.stringify({ formula }) }),
    createMaterial: (m: MaterialIn) => request<Material>("/api/admin/materials", { method: "POST", body: JSON.stringify(m) }),
    updateMaterial: (id: number, m: MaterialIn) => request<Material>(`/api/admin/materials/${id}`, { method: "PUT", body: JSON.stringify(m) }),
    deleteMaterial: (id: number) => request<void>(`/api/admin/materials/${id}`, { method: "DELETE" }),
    createCollection: (c: { label: string; note: string; symbols: string[] }) =>
      request<Collection>("/api/admin/collections", { method: "POST", body: JSON.stringify(c) }),
    updateCollection: (slug: string, c: { label: string; note: string; symbols: string[] }) =>
      request<Collection>(`/api/admin/collections/${slug}`, { method: "PUT", body: JSON.stringify(c) }),
    deleteCollection: (slug: string) => request<void>(`/api/admin/collections/${slug}`, { method: "DELETE" }),
    misses: () => request<MissGroup[]>("/api/admin/search-misses"),
    dismissMiss: (query: string) => request<void>(`/api/admin/search-misses?query=${encodeURIComponent(query)}`, { method: "DELETE" }),
  },

  logMiss: (query: string) =>
    request<void>("/api/search-misses", { method: "POST", body: JSON.stringify({ query }) }),
};
