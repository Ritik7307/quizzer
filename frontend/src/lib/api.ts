/** Use same-origin /api (proxied by Next.js) to avoid CORS issues. Socket.IO still uses API_ORIGIN. */
export const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API_BASE = "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function getApiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof TypeError && err.message.includes("fetch")) {
    return "Cannot reach the API. Start the backend: cd backend && npm run dev";
  }
  return "Something went wrong. Please try again.";
}

export async function api<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const { token, ...init } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };

  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch {
    throw new TypeError("fetch failed");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError((body as { error?: string }).error ?? res.statusText, res.status);
  }

  if (res.status === 204) return {} as T;
  return res.json() as Promise<T>;
}

export function exportCsvUrl(quizId: string) {
  return `/api/admin/quizzes/${quizId}/export`;
}
