import * as Notifications from 'expo-notifications';
import { buildRetentionNotification, type RetentionContext } from '../engine/retentionNotifications';
import { nextOccurrence } from './nextOccurrence';

// A single well-known identifier so re-scheduling replaces the previous
// reminder instead of stacking duplicates — every check-in completion
// reschedules "tomorrow's" reminder with fresh content (see
// docs/03-power-ups.md #2: copy must reference a specific past result, not
// a bare reminder — a single static repeating notification can't do that,
// so this schedules a fresh one-time notification each day instead).
const REMINDER_ID = 'daily-checkin-reminder';

/**
 * Schedules (replacing any existing) the next daily check-in reminder.
 * `time24h` is "HH:mm". No-ops on platforms/environments where local
 * scheduled notifications aren't supported (e.g. Expo web) rather than
 * throwing — this is a nice-to-have, never something that should block
 * onboarding completion or a check-in save.
 */
export async function scheduleCheckinReminder(time24h: string, context: RetentionContext = {}): Promise<void> {
  const [hourStr, minuteStr] = time24h.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // nothing was scheduled yet — fine
  }

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'GiveAll',
        body: buildRetentionNotification(context),
      },
      trigger: nextOccurrence(hour, minute),
    });
  } catch {
    // Local scheduled notifications unsupported here (e.g. web) — non-fatal.
  }
}
