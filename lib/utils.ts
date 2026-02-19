import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatId(prefix: string, id: number): string {
    return `${prefix}#${String(id).padStart(2, "0")}`;
}
