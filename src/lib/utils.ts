import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Standard RFC4122 v4 compliant UUID generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function normalizePlayerNameKey(nombre?: string, apellidos?: string): string {
  const n = (nombre || '').trim().toLowerCase();
  let a = (apellidos || '').trim().toLowerCase();
  if (a === 'marta pulido') a = 'pulido';
  return `${n} ${a}`.trim();
}

