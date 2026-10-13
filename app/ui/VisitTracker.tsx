'use client';
import {useEffect, useRef, useState} from 'react';
import {ANALYTICS_EVENT, ANALYTICS_ID, ANALYTICS_OPTOUT} from '../../lib/analytics';
import {publicApi,signInUrl,STATIC_MODE} from '../../lib/site-mode';
import {useI18n} from './Language';

function browserPrivacy() {
  return navigator.doNotTrack === '1' || (navigator as Navigator & {globalPrivacyControl?: boolean}).globalPrivacyControl === true;
}
function excluded() {
  try { return browserPrivacy() || localStorage.getItem(ANALYTICS_OPTOUT) === '1' || new URLSearchParams(location.search).get('analytics') === 'off'; }
  catch { return true; }
}

export default function VisitTracker({view, ready, isAdmin}: {view: string; ready: boolean; isAdmin: boolean}) {
  const lastView = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || isAdmin) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function schedule() {
      clearTimeout(timer);
      if (document.visibilityState !== 'visible' || excluded() || lastView.current === view) return;
      timer = setTimeout(() => {
        if (excluded()) return;
        let visitorId: string;
        try {
          visitorId = localStorage.getItem(ANALYTICS_ID) || '';
          if (!/^[0-9a-f-]{36}$/i.test(visitorId)) { visitorId = crypto.randomUUID(); localStorage.setItem(ANALYTICS_ID, visitorId); }
        } catch { return; }
        lastView.current = view;
        const body = JSON.stringify({visitorId, eventId: crypto.randomUUID()});
        async function send() {
          if (excluded()) return;
          const response = await fetch(publicApi('/api/visits'), {method: 'POST', credentials: 'omit', keepalive: true, headers: {'Content-Type': 'application/json'}, body});
          if (!response.ok && response.status >= 500) throw new Error('Retryable visit');
        }
        // A single identical retry cannot inflate counts; analytics failures never interrupt browsing.
        void send().catch(() => setTimeout(() => { void send().catch(() => {}); }, 1000));
      }, 600);
    }
    schedule();
    document.addEventListener('visibilitychange', schedule);
    window.addEventListener(ANALYTICS_EVENT, schedule);
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', schedule); window.removeEventListener(ANALYTICS_EVENT, schedule); };
  }, [view, ready, isAdmin]);
  return null;
}

export function VisitPrivacy() {
  const {bi} = useI18n(), [off, setOff] = useState(false), [forced, setForced] = useState(false), [available, setAvailable] = useState(false);
  useEffect(() => { setForced(browserPrivacy()); setOff(excluded()); try { localStorage.getItem(ANALYTICS_OPTOUT); setAvailable(true); } catch {} }, []);
  function toggle() {
    try {
      const next = !off;
      localStorage.setItem(ANALYTICS_OPTOUT, next ? '1' : '0');
      if (next) localStorage.removeItem(ANALYTICS_ID);
      setOff(next); window.dispatchEvent(new Event(ANALYTICS_EVENT));
    } catch { setAvailable(false); }
  }
  return <section className="visit-privacy"><div><strong>{bi('匿名访问统计','Anonymous visit statistics')}</strong><p>{bi('使用此浏览器保存的随机标识估算访客量，仅维护者可查看汇总。不记录姓名、邮箱、搜索内容或原始 IP，不追踪其他网站。','A random identifier saved in this browser estimates visitor counts. Only maintainers can view aggregate statistics. We do not record names, emails, searches or raw IP addresses, or track other websites.')}</p><small>{bi(forced ? '已遵循浏览器的“不跟踪”或隐私信号，停止统计。' : off ? '此浏览器已关闭统计。' : '你可随时关闭此浏览器的统计。', forced ? 'Tracking is disabled by your browser privacy signal.' : off ? 'Statistics are disabled in this browser.' : 'You can disable statistics in this browser at any time.')}</small>{STATIC_MODE&&<p><a className="text-link" href={signInUrl('/?view=data')}>{bi('维护者登录查看两个站点的访问统计 →','Maintainer sign-in: view statistics for both websites →')}</a></p>}</div><button className="secondary" onClick={toggle} disabled={!available || forced} aria-pressed={off}>{bi(off ? '开启本浏览器统计' : '关闭本浏览器统计', off ? 'Enable statistics here' : 'Disable statistics here')}</button></section>;
}
