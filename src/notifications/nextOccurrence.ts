/**
 * Next Date at hour:minute — today if that time hasn't passed yet,
 * otherwise tomorrow. Pure and framework-agnostic (no expo-notifications
 * import) so it's unit-testable without a React Native runtime, unlike
 * checkinReminder.ts which actually calls the notifications API.
 */
export function nextOccurrence(hour: number, minute: number, now: Date = new Date()): Date {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next;
}
