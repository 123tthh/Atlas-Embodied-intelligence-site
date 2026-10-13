import {env} from 'cloudflare:workers';
import {identity, error, privateJson} from '../../../lib/server';
import {authorizedUpdater} from '../../../lib/update-auth';
import {analyticsDays} from '../../../lib/analytics';
import type {VisitCount} from '../../../lib/analytics';

export async function GET(request: Request) {
  const user = await identity();
  if (!user?.isAdmin && !await authorizedUpdater(request)) return error('只有维护者可以查看访问统计', 403);
  const params = new URL(request.url).searchParams, days = Number(params.get('days') || 30), source = params.get('source') || 'all';
  if (![7, 30, 90].includes(days) || !['all', 'sites', 'github-pages'].includes(source)) return error('Invalid statistics filter');
  const db = env.DB;
  if (!db) return error('访问统计暂时不可用', 503);
  try {
    const now = Date.now(), dates = analyticsDays(days, now);
    const results = await db.batch([
      db.prepare('SELECT COUNT(*) AS visitors, COALESCE(SUM(pageviews),0) AS pageviews, MIN(first_seen) AS firstRecordedAt FROM visit_visitors WHERE (? = \'all\' OR source=?)').bind(source, source),
      db.prepare('SELECT COUNT(DISTINCT visitor_hash) AS visitors, COALESCE(SUM(pageviews),0) AS pageviews FROM visit_days WHERE day>=? AND day<=? AND (? = \'all\' OR source=?)').bind(dates[0], dates.at(-1), source, source),
      db.prepare('SELECT day,COUNT(*) AS visitors,SUM(pageviews) AS pageviews FROM visit_days WHERE day>=? AND day<=? AND (? = \'all\' OR source=?) GROUP BY day ORDER BY day').bind(dates[0], dates.at(-1), source, source),
    ]);
    const total = results[0].results[0] as unknown as VisitCount & {firstRecordedAt: number | null};
    const daily = results[2].results as unknown as ({day: string} & VisitCount)[];
    return privateJson({timezone: 'Asia/Shanghai', source, days, updatedAt: now, firstRecordedAt: total.firstRecordedAt,
      total: {visitors: total.visitors, pageviews: total.pageviews}, period: results[1].results[0],
      trend: dates.map(day => daily.find(d => d.day === day) || {day, visitors: 0, pageviews: 0}),
    });
  } catch { return error('访问统计暂时无法读取，请稍后重试', 503); }
}
