import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatId(prefix: string, id: number): string {
    return `${prefix}#${String(id).padStart(2, "0")}`;
}

// ─── Local Date/Time Helpers ─────────────────────────────────────────────────

function toLocalDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/** Returns today's local date string as YYYY-MM-DD. */
export function thaiToday(): string {
    return toLocalDateInputValue(new Date());
}

/** Returns a local date string offset by `days` from today (YYYY-MM-DD). */
export function thaiOffsetDay(days: number): string {
    const target = new Date();
    target.setHours(0, 0, 0, 0);
    target.setDate(target.getDate() + days);
    return toLocalDateInputValue(target);
}

/** Extracts local YYYY-MM-DD from any ISO/UTC date string. */
export function toBangkokDateStr(isoString: string): string {
    return toLocalDateInputValue(new Date(isoString));
}

/** Formats any ISO/date string for display in local timezone. */
export function formatThaiDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}
