/**
 * Formats a nanosecond timestamp (as string from Motoko Time.now()) into a human-readable string.
 * Motoko Time.now() returns nanoseconds since epoch.
 */
export function formatTimestamp(timestamp: string): string {
  try {
    // Motoko Time.now() returns nanoseconds as an integer string
    const ns = BigInt(timestamp);
    const ms = Number(ns / BigInt(1_000_000));
    const date = new Date(ms);

    if (isNaN(date.getTime())) {
      return '';
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86_400_000);
    const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msgDay.getTime() === today.getTime()) {
      return `Today ${timeStr}`;
    } else if (msgDay.getTime() === yesterday.getTime()) {
      return `Yesterday ${timeStr}`;
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
    }
  } catch {
    return '';
  }
}
