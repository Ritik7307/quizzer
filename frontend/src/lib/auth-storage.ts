const TOKEN_KEY = "quizzer_token";
const USER_KEY = "quizzer_user";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: "ADMIN" | "CANDIDATE";
  leetcodeHandle?: string | null;
  codeforcesHandle?: string | null;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuth(token: string, user: StoredUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
