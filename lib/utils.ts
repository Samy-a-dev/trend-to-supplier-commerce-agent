export function asError(error: unknown) {
  if (error instanceof Error) return error;
  return new Error(typeof error === "string" ? error : JSON.stringify(error));
}

export function serializeError(error: unknown) {
  const normalized = asError(error);
  return {
    name: normalized.name,
    message: normalized.message,
    stack: normalized.stack
  };
}

export function safeJson(value: unknown) {
  return JSON.stringify(value, (_key, inner) => {
    if (typeof inner === "bigint") return inner.toString();
    if (inner instanceof Error) return serializeError(inner);
    return inner;
  });
}

export function parseJson<T>(value: string | undefined | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function withTimeout<T>(
  label: string,
  timeoutMs: number,
  fn: (signal: AbortSignal) => Promise<T>
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${label} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function withRetry<T>(
  label: string,
  attempts: number,
  fn: (attempt: number) => Promise<T>
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn(attempt);
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
      }
    }
  }
  throw new Error(`${label} failed after ${attempts} attempts: ${asError(lastError).message}`);
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}
