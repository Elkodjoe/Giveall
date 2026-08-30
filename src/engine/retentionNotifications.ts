/**
 * Retention notifications must always reference a specific past win or a
 * specific near-term payoff — never a bare reminder or streak-loss threat.
 * See docs/03-power-ups.md #2.
 */

export interface RetentionContext {
  lastActionSummary?: string; // e.g. "felt extra loved yesterday after your voice note"
  bidResponseRatioPct?: number; // e.g. 85
}

export interface RetentionNotificationContent {
  // i18next key + params, not display text — this file has no framework/i18n
  // dependency by design (see README). The caller (src/notifications/checkinReminder.ts)
  // resolves this via i18next's t() outside React, since a local push
  // notification's body isn't rendered through a component tree.
  key: 'retention.lastActionSummary' | 'retention.bidResponse' | 'retention.neutral';
  params?: Record<string, string | number>;
}

export function buildRetentionNotification(ctx: RetentionContext): RetentionNotificationContent {
  if (ctx.lastActionSummary) {
    return { key: 'retention.lastActionSummary', params: { summary: ctx.lastActionSummary } };
  }
  if (ctx.bidResponseRatioPct !== undefined) {
    return { key: 'retention.bidResponse', params: { pct: ctx.bidResponseRatioPct } };
  }
  return { key: 'retention.neutral' };
}
