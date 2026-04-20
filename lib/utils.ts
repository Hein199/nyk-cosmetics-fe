import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatId(prefix: string, id: number): string {
    return `${prefix}#${String(id).padStart(2, "0")}`;
}

// ─── Local Date/Time Helpers ─────────────────────────────────────────────────

const MYANMAR_TIMEZONE = "Asia/Yangon";

function toTimeZoneDateInputValue(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    if (!year || !month || !day) {
        return toLocalDateInputValue(date);
    }

    return `${year}-${month}-${day}`;
}

function toLocalDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Returns today's local date string as YYYY-MM-DD. */
export function thaiToday(): string {
    return toTimeZoneDateInputValue(new Date(), MYANMAR_TIMEZONE);
}

/** Returns a local date string offset by `days` from today (YYYY-MM-DD). */
export function thaiOffsetDay(days: number): string {
    const [year, month, day] = thaiToday().split("-").map(Number);
    const targetUtc = new Date(Date.UTC(year, month - 1, day + days, 0, 0, 0));
    return toTimeZoneDateInputValue(targetUtc, MYANMAR_TIMEZONE);
}

/** Extracts local YYYY-MM-DD from any ISO/UTC date string. */
export function toBangkokDateStr(isoString: string): string {
    return toTimeZoneDateInputValue(new Date(isoString), MYANMAR_TIMEZONE);
}

/** Formats any ISO/date string for display in local timezone. */
export function formatThaiDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        timeZone: MYANMAR_TIMEZONE,
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

export function formatMyanmarTime(dateInput: string | number | Date, includeSeconds = false): string {
    const date = new Date(dateInput);
    return date.toLocaleTimeString("en-US", {
        timeZone: MYANMAR_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        ...(includeSeconds ? { second: "2-digit" } : {}),
    });
}
