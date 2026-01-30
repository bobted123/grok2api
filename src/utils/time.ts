// 东八区偏移量（毫秒）
const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;

export function nowMs(): number {
  return Date.now();
}

/** 将 UTC 时间戳转换为东八区 Date 对象（用于格式化） */
function toBeijingDate(utcMs: number): Date {
  return new Date(utcMs + TZ_OFFSET_MS);
}

export function formatUtcSeconds(seconds: number): string {
  const d = toBeijingDate(seconds * 1000);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

export function formatUtcMs(ms: number): string {
  const d = toBeijingDate(ms);
  return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "");
}

/** 获取东八区的小时键（用于统计） */
export function toBeijingHourKey(ts: number): string {
  const d = toBeijingDate(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const h = String(d.getUTCHours()).padStart(2, "0");
  return `${y}-${m}-${day} ${h}`;
}

/** 获取东八区的日期键（用于统计） */
export function toBeijingDateKey(ts: number): string {
  const d = toBeijingDate(ts);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 获取东八区的小时数（0-23） */
export function toBeijingHour(ts: number): number {
  return toBeijingDate(ts).getUTCHours();
}

