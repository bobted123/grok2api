import type { GrokSettings } from "../settings";

const DEFAULT_MAX_RETRY = 3;
const DEFAULT_RETRY_CODES = [401, 429, 403];

function normalizeMaxRetry(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return DEFAULT_MAX_RETRY;
  return Math.max(0, Math.floor(value));
}

function normalizeRetryCodes(value: unknown): number[] {
  if (!Array.isArray(value)) return [...DEFAULT_RETRY_CODES];
  const codes = value.filter((code): code is number => typeof code === "number" && Number.isInteger(code));
  return codes.length ? codes : [...DEFAULT_RETRY_CODES];
}

function defaultExtractStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const typed = error as { status?: unknown; details?: { status?: unknown } };
  const status = typed.status ?? typed.details?.status;
  return typeof status === "number" && Number.isInteger(status) ? status : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class RetryConfig {
  readonly maxRetry: number;
  readonly retryCodes: number[];

  constructor(settings: GrokSettings) {
    this.maxRetry = normalizeMaxRetry(settings.max_retry);
    const codes = settings.retry_codes ?? settings.retry_status_codes;
    this.retryCodes = normalizeRetryCodes(codes);
  }
}

export type RetryStatusExtractor = (error: unknown) => number | null | undefined;
export type RetryCallback = (attempt: number, status: number, error: unknown) => void | Promise<void>;

export async function withRetry<T>(
  action: () => Promise<T>,
  opts: {
    settings: GrokSettings;
    extractStatus?: RetryStatusExtractor;
    onRetry?: RetryCallback;
  },
): Promise<T> {
  const cfg = new RetryConfig(opts.settings);
  const extractStatus = opts.extractStatus ?? defaultExtractStatus;

  let attempts = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const result = await action();
      if (attempts > 0) console.info(`Retry succeeded after ${attempts} attempts`);
      return result;
    } catch (error) {
      const rawStatus = extractStatus(error);
      const status = typeof rawStatus === "number" && Number.isInteger(rawStatus) ? rawStatus : null;

      if (status === null) {
        console.error(`Non-retryable error: ${error instanceof Error ? error.message : String(error)}`);
        throw error;
      }

      const retryable = cfg.retryCodes.includes(status);
      if (!retryable || attempts >= cfg.maxRetry) {
        if (retryable) {
          if (attempts > 0) console.warn(`Retry ${attempts}/${cfg.maxRetry} for status ${status}, failed`);
          console.error(`Retry exhausted after ${cfg.maxRetry} attempts, last status: ${status}`);
        } else {
          console.error(`Non-retryable status code: ${status}`);
        }
        throw error;
      }

      const nextAttempt = attempts + 1;
      const delay = 500 * nextAttempt;
      console.warn(`Retry ${nextAttempt}/${cfg.maxRetry} for status ${status}, waiting ${delay}ms`);
      if (opts.onRetry) await opts.onRetry(nextAttempt, status, error);
      await sleep(delay);
      attempts = nextAttempt;
    }
  }
}
