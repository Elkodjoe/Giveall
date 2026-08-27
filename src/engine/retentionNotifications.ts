/**
 * Retention notifications must always reference a specific past win or a
 * specific near-term payoff — never a bare reminder or streak-loss threat.
 * See docs/03-power-ups.md #2.
 */

export interface RetentionContext {
  lastActionSummary?: string; // e.g. "felt extra loved yesterday after your voice note"
  bidResponseRatioPct?: number; // e.g. 85
}

export function buildRetentionNotification(ctx: RetentionContext): string {
  if (ctx.lastActionSummary) {
    return `Your partner ${ctx.lastActionSummary}. Keep momentum? 2-min check-in.`;
  }
  if (ctx.bidResponseRatioPct !== undefined) {
    return `Your Bid Response is at ${ctx.bidResponseRatioPct}% this week — that's Secure Zone. One more check-in locks it in.`;
  }
  return "Ready for today's 90-second check-in?";
}
