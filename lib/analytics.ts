export const ANALYTICS_ID = 'atlas-anonymous-visitor-v1';
export const ANALYTICS_OPTOUT = 'atlas-analytics-optout-v1';
export const ANALYTICS_EVENT = 'atlas-analytics-preference';
export const beijingDay = (now: number) => new Date(now + 8 * 3600000).toISOString().slice(0, 10);
export function analyticsDays(count: number, now: number) {
  const today = Date.parse(beijingDay(now) + 'T00:00:00Z');
  return Array.from({length: count}, (_, i) => new Date(today - (count - 1 - i) * 86400000).toISOString().slice(0, 10));
}
export const knownBot = (ua: string) => /bot\b|spider|crawler|headless|preview|uptime|monitoring|curl\b|wget\b|python-requests/i.test(ua);
export type VisitCount = {visitors: number; pageviews: number};
export type AnalyticsSummary = {
  timezone: string; source: string; days: number; updatedAt: number; firstRecordedAt: number | null;
  total: VisitCount; period: VisitCount; trend: ({day: string} & VisitCount)[];
};
