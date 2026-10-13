'use client';
import {useEffect, useState} from 'react';
import {BarChart3, RefreshCw, ShieldCheck, Users, Eye} from 'lucide-react';
import {useI18n} from './Language';
import type {AnalyticsSummary} from '../../lib/analytics';

export default function VisitorAnalytics() {
  const {bi, lang} = useI18n(), [days, setDays] = useState(30), [source, setSource] = useState('all');
  const [data, setData] = useState<AnalyticsSummary | null>(null), [loading, setLoading] = useState(true), [error, setError] = useState(''), [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(''); setData(null);
    fetch(`/api/analytics?days=${days}&source=${source}`, {cache: 'no-store', signal: controller.signal})
      .then(async r => { if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<AnalyticsSummary>; })
      .then(setData).catch(e => { if (e.name !== 'AbortError') setError(bi('访问统计暂时无法读取，请刷新重试。','Statistics could not be loaded. Please refresh.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [days, source, version, lang]);
  const number = (n: number | undefined) => n === undefined ? '—' : n.toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US');
  const maximum = Math.max(1, ...(data?.trend.map(d => d.pageviews) || []));
  return <section className="visitor-analytics" aria-label={bi('仅维护者可见的访问统计','Maintainer-only visit statistics')}>
    <div className="analytics-heading"><div><span className="eyebrow"><ShieldCheck size={14}/>{bi('仅维护者可见','Maintainer only')}</span><h2><BarChart3 size={25}/>{bi('网站访问统计','Website visits')}</h2></div><button className="secondary" onClick={() => setVersion(v => v + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{bi('刷新','Refresh')}</button></div>
    <div className="analytics-filters"><label>{bi('统计站点','Website')}<select value={source} onChange={e => setSource(e.target.value)}><option value="all">{bi('两个站点合计','Both websites')}</option><option value="sites">{bi('云端站点','Cloud website')}</option><option value="github-pages">GitHub Pages</option></select></label><div role="group" aria-label={bi('统计时间范围','Statistics period')}>{[7, 30, 90].map(n => <button key={n} className={days === n ? 'active' : ''} aria-pressed={days === n} onClick={() => setDays(n)}>{bi(`近 ${n} 天`,`${n} days`)}</button>)}</div></div>
    {error && <p className="analytics-error" role="alert">{error}</p>}
    <div className="analytics-cards" aria-busy={loading}>
      <article><Users size={18}/><span>{bi('累计独立访客','All-time unique visitors')}</span><strong>{number(data?.total.visitors)}</strong><small>{bi('按匿名浏览器标识去重','Distinct anonymous browser identifiers')}</small></article>
      <article><Eye size={18}/><span>{bi('累计浏览次数','All-time page views')}</span><strong>{number(data?.total.pageviews)}</strong><small>{bi('打开页面及切换主要栏目','Page loads and main-section changes')}</small></article>
      <article><span>{bi(`近 ${days} 天独立访客`,`${days}-day unique visitors`)}</span><strong>{number(data?.period.visitors)}</strong><small>{bi('在整个所选期间去重','Deduplicated across the selected period')}</small></article>
      <article><span>{bi(`近 ${days} 天浏览次数`,`${days}-day page views`)}</span><strong>{number(data?.period.pageviews)}</strong><small>{bi('北京时间，含今天','Asia/Shanghai, including today')}</small></article>
    </div>
    <div className="analytics-trend-heading"><h3>{bi('每日访问趋势','Daily visit trend')}</h3><div><span className="analytics-uv-key"/>{bi('独立访客','Visitors')}<span className="analytics-pv-key"/>{bi('浏览次数','Views')}</div></div>
    {loading ? <p className="analytics-empty" role="status">{bi('正在读取访问统计…','Loading statistics…')}</p> : data && <>
      {data.period.pageviews === 0 && <p className="analytics-empty">{bi('所选期间尚无已记录访问。统计从功能启用后开始，不补算此前流量。','No visits recorded in this period. Statistics start when tracking is enabled; earlier traffic is unavailable.')}</p>}
      <div className="analytics-chart-scroll"><div className={'analytics-chart' + (days === 90 ? ' wide' : '')} role="img" aria-label={bi(`近 ${days} 天趋势，详细数据见下方表格`,`${days}-day trend. Exact values are available in the table below.`)}>{data.trend.map(d => <div className="analytics-day" key={d.day} title={`${d.day} · ${bi('访客','Visitors')} ${d.visitors} · ${bi('浏览','Views')} ${d.pageviews}`}><i className="analytics-pv" style={{height: `${d.pageviews / maximum * 100}%`}}/><i className="analytics-uv" style={{height: `${d.visitors / maximum * 100}%`}}/></div>)}</div></div>
      <div className="analytics-chart-axis"><span>{data.trend[0]?.day}</span><span>{bi(`纵轴最高 ${maximum} 次`, `Scale maximum: ${maximum}`)}</span><span>{data.trend.at(-1)?.day}</span></div>
      <details className="analytics-table"><summary>{bi('查看每日数据','View daily data')}</summary><table><thead><tr><th>{bi('日期','Date')}</th><th>{bi('独立访客','Unique visitors')}</th><th>{bi('浏览次数','Page views')}</th></tr></thead><tbody>{[...data.trend].reverse().map(d => <tr key={d.day}><td>{d.day}</td><td>{number(d.visitors)}</td><td>{number(d.pageviews)}</td></tr>)}</tbody></table></details>
      <p className="analytics-updated">{data.firstRecordedAt ? bi('首条记录：','First recorded visit: ') + new Date(data.firstRecordedAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US', {timeZone: 'Asia/Shanghai'}) : bi('尚无访问记录','No visits recorded')} · {bi('更新于 ','Updated ')}{new Date(data.updatedAt).toLocaleTimeString(lang === 'zh' ? 'zh-CN' : 'en-US', {timeZone: 'Asia/Shanghai'})}</p>
    </>}
    <p className="analytics-scope">{bi('“独立访客”是浏览器数量的估计，不是真实人数。同一浏览器的重复浏览不增加独立访客；换设备、清除浏览器数据或跨两个域名访问可能重复计数。每天的访客数不能相加作为期间独立访客。已登录维护者、已知机器人和选择退出统计的访问不计入；拦截统计请求也会造成漏计。','Unique visitors estimate browsers, not individual people. Repeat visits in the same browser count once; different devices, cleared browser data and visits to both domains may count separately. Daily uniques cannot be added to get period uniques. Signed-in maintainers, known bots and opt-outs are excluded; blocked requests can cause undercounting.')}</p>
  </section>;
}
