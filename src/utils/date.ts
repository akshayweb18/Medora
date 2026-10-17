/**
 * Shared date/time utilities for MediVault.
 * Uses only the built-in Date object; no heavy library needed for most operations.
 */

import { ScheduledTime } from '@/types';

/** Generate a compact UUID-style ID. */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Current time as ISO 8601 string. */
export function nowISO(): string {
  return new Date().toISOString();
}

/** Format Date to YYYY-MM-DD. */
export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today as YYYY-MM-DD in local time. */
export function todayStr(): string {
  return toDateStr(new Date());
}

/** Parse YYYY-MM-DD safely to a local Date. */
export function parseDate(str: string): Date {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Given a date string and ScheduledTime, build an ISO datetime string. */
export function scheduledDateTime(dateStr: string, time: ScheduledTime): string {
  const d = parseDate(dateStr);
  d.setHours(time.hour, time.minute, 0, 0);
  return d.toISOString();
}

/** Format time as "hh:mm AM/PM". */
export function formatTime(hour: number, minute: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${ampm}`;
}

/** Format ISO string time as "hh:mm AM/PM". */
export function formatISOTime(iso: string): string {
  const d = new Date(iso);
  return formatTime(d.getHours(), d.getMinutes());
}

/** Pretty-print a date: "14 Oct 2024". */
export function formatDate(str: string): string {
  const d = parseDate(str);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Pretty-print today's date: "Wednesday, 14 October". */
export function formatTodayFull(): string {
  return new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

/** Relative date label: "Today", "Yesterday", "14 Oct 2024". */
export function relativeDate(str: string): string {
  const today = todayStr();
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (str === today) return 'Today';
  if (str === yesterday) return 'Yesterday';
  return formatDate(str);
}

/** Check if a medicine is active on a given date. */
export function isMedicineActiveOnDate(
  startDate: string,
  endDate: string | undefined,
  dateStr: string
): boolean {
  if (dateStr < startDate) return false;
  if (endDate && dateStr > endDate) return false;
  return true;
}

/** Return default scheduled times for a given frequency. */
export function defaultTimesForFrequency(frequency: string): ScheduledTime[] {
  switch (frequency) {
    case 'once_daily':        return [{ hour: 8, minute: 0 }];
    case 'twice_daily':       return [{ hour: 8, minute: 0 }, { hour: 20, minute: 0 }];
    case 'three_times_daily': return [{ hour: 8, minute: 0 }, { hour: 14, minute: 0 }, { hour: 20, minute: 0 }];
    case 'four_times_daily':  return [{ hour: 8, minute: 0 }, { hour: 12, minute: 0 }, { hour: 16, minute: 0 }, { hour: 20, minute: 0 }];
    default:                  return [{ hour: 8, minute: 0 }];
  }
}

/** Format file size to human-readable string. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
