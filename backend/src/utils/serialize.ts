export function parseOptions(options: string): string[] {
  try {
    const parsed = JSON.parse(options);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function stringifyOptions(options: string[]): string {
  return JSON.stringify(options);
}

export function parseAnswers(answers: string): Record<string, number> {
  try {
    const parsed = JSON.parse(answers);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function stringifyAnswers(answers: Record<string, number>): string {
  return JSON.stringify(answers);
}

export function formatQuestion<T extends { options: string }>(q: T) {
  return { ...q, options: parseOptions(q.options) };
}
