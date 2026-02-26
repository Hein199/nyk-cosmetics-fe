import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatId(prefix: string, id: number): string {
    return `${prefix}#${String(id).padStart(2, "0")}`;
}

// ─── Thailand Timezone Helpers ────────────────────────────────────────────────

export const THAI_TZ = "Asia/Bangkok";

/** Returns today's date string in Asia/Bangkok timezone as YYYY-MM-DD */
export function thaiToday(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: THAI_TZ }).format(new Date());
}

/**
 * Returns a date string offset by `days` from Bangkok today (YYYY-MM-DD).
 * Thailand has no DST so +7h offset is constant — safe to use ms arithmetic.
 */
export function thaiOffsetDay(days: number): string {
    const todayBkk = new Date(`${thaiToday()}T00:00:00+07:00`);
    const target = new Date(todayBkk.getTime() + days * 86_400_000);
    return new Intl.DateTimeFormat("en-CA", { timeZone: THAI_TZ }).format(target);
}

/** Extracts the YYYY-MM-DD date in Asia/Bangkok timezone from any ISO/UTC date string.
 *  Use this for date-range filter comparisons so UTC 17:00 = Bangkok next day, not same day. */
export function toBangkokDateStr(isoString: string): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: THAI_TZ }).format(
        new Date(isoString)
    );
}

/** Formats any ISO/date string for display in Asia/Bangkok timezone */
export function formatThaiDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        timeZone: THAI_TZ,
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
