'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Mail, Send, CheckCircle2, AlertCircle, Copy, RefreshCw, Inbox, ArrowUpRight, LoaderCircle } from 'lucide-react';
import { useI18n } from './Language';
import { CONTACT_EMAIL, publicApi, STATIC_MODE } from '../../lib/site-mode';
import type { Identity } from '../../lib/types';
import type { InboxMessage } from '../../lib/message-contract';

export default function CommunityInbox({ user, initialMessage = '', compact = false }: { user: Identity; initialMessage?: string; compact?: boolean }) {
  const { bi, lang } = useI18n();
  const formId = useId();
  const [email, setEmail] = useState(''), [message, setMessage] = useState(initialMessage), [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false), [receipt, setReceipt] = useState(''), [problem, setProblem] = useState(''), [copied, setCopied] = useState(false);
  const attempt = useRef<{ content: string; id: string } | null>(null);
  const text = `${bi('联系邮箱','Contact email')}: ${email.trim()}\n\n${message.trim()}`;
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Embodied Atlas · 社区建议')}&body=${encodeURIComponent(text)}`;
  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setProblem(''); setReceipt(''); setSending(true);
    const content = JSON.stringify({ email: email.trim(), message: message.trim() });
    if (attempt.current?.content !== content) attempt.current = { content, id: crypto.randomUUID() };
    const id = attempt.current.id, controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(publicApi('/api/messages'), { method: 'POST', credentials: 'omit', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...JSON.parse(content), requestId: id, website }) });
      const result = await response.json() as { received?: boolean; id?: string; code?: string };
      if (!response.ok || result.received !== true || result.id !== id) {
        if (result.code === 'rate') throw new Error('rate');
        if (result.code === 'invalid' || result.code === 'length') throw new Error('invalid');
        throw new Error('unconfirmed');
      }
      setReceipt(id); setMessage(''); setWebsite(''); attempt.current = null;
    } catch (e) {
      const code = (e as Error).message;
      setProblem(code === 'rate' ? bi('今天的留言次数已达上限。你仍可通过下方邮箱联系维护者。','The daily message limit has been reached. You can still contact the maintainer by email below.')
        : code === 'invalid' ? bi('请填写有效邮箱和 5–4000 字的建议。','Please enter a valid email and a suggestion of 5–4000 characters.')
        : bi('暂未确认收到留言，内容已保留。可重试，或复制内容后通过邮箱发送；重试同一条留言不会重复入箱。','Delivery is unconfirmed and your text is preserved. Retry, or copy it and send by email. Retrying the same message will not create a duplicate.'));
    } finally { clearTimeout(timeout); setSending(false); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { setProblem(bi('请直接选中并复制输入框中的内容。','Please select and copy the text in the fields.')); }
  }
  return <section className={'community-inbox' + (compact ? ' compact' : '')}>
    {!compact && <div className="community-intro"><span className="eyebrow">Open community</span><h2>{bi('给这张地图，留一条建议。','Leave a note for the atlas.')}</h2><p>{bi('推荐论文、补充团队、纠正资料，或告诉我们哪里还不够好。填写联系邮箱和建议即可，无需登录，也没有密码。','Recommend a paper, suggest a team, correct a record or help improve the experience. Just leave your email and suggestion — no account or password.')}</p><span className="community-open"><CheckCircle2 size={15}/>{bi('免登录留言 · 每 7 天审核一次','No sign-in · Reviewed every 7 days')}</span></div>}
    <div className="community-grid"><form className="community-form" onSubmit={send}>
      <label htmlFor={formId+'-email'}>{bi('联系邮箱','Contact email')}<input id={formId+'-email'} type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => {setEmail(e.target.value);setCopied(false)}} placeholder="you@example.com" disabled={sending}/><small>{bi('仅供维护者回复，不会公开，也不会创建账户。','Used only for a reply. Your email stays private and does not create an account.')}</small></label>
      <label htmlFor={formId+'-message'}>{bi('你的建议','Your suggestion')}<textarea id={formId+'-message'} required minLength={5} maxLength={4000} rows={compact ? 6 : 8} value={message} onChange={e => {setMessage(e.target.value);setCopied(false)}} placeholder={bi('可以附上论文、项目或资料链接；也欢迎直接描述想法。','Links to papers, projects or evidence are welcome. You can also just share an idea.')} disabled={sending}/><small className="message-length">{message.length} / 4000</small></label>
      <div className="community-honeypot" aria-hidden="true"><label>Website<input name="website" value={website} onChange={e => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"/></label></div>
      <p className="community-privacy">{bi('提交后进入私密待审核队列，与研究更新同步，每周二 10:00（北京时间）集中审查。只有通过原始来源核验的内容才会收录；证据不足的继续待审。邮箱不会公开。','Submissions enter a private review queue, reviewed with research updates every Tuesday at 10:00 Asia/Shanghai. Only source-verified content is accepted; insufficient evidence stays pending. Your email stays private.')}</p>
      {problem && <div className="community-error" role="alert"><AlertCircle size={18}/><p>{problem}</p></div>}
      {receipt && <div className="community-success" role="status"><CheckCircle2 size={19}/><div><strong>{bi('留言已收到，已进入待审核队列。','Your message was received and is pending review.')}</strong><small>{bi('回执编号：','Receipt: ')}{receipt}</small></div></div>}
      <div className="community-form-actions"><button className="primary" type="submit" disabled={sending}>{sending ? <LoaderCircle size={17} className="spin"/> : <Send size={17}/>} {bi(sending ? '正在提交…' : '提交留言', sending ? 'Sending…' : 'Send suggestion')}</button><span>{bi('不需要 ChatGPT 或 GitHub 账号','No ChatGPT or GitHub account needed')}</span></div>
    </form><aside className="community-contact"><Mail size={25}/><h3>{bi('也可以直接写邮件','Email works too')}</h3><p>{bi('如果留言提交暂时不可用，可以复制建议，用你常用的邮箱联系。','If the inbox is temporarily unavailable, copy your suggestion and send it from your usual email account.')}</p><a className="community-email" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a><div className="community-backup-actions"><a href={mailto} className="secondary"><Mail size={15}/>{bi('用邮件发送','Send by email')}<ArrowUpRight size={13}/></a><button type="button" className="text-button" onClick={copy}><Copy size={14}/>{bi(copied ? '已复制' : '复制留言内容', copied ? 'Copied' : 'Copy message')}</button></div><small>{bi('邮件入口会打开你的邮件应用，需由你完成发送。','The email link opens your mail app; you complete the send there.')}</small></aside></div>
    {user?.isAdmin && !STATIC_MODE && <MaintainerInbox lang={lang}/>}
  </section>;
}

function MaintainerInbox({ lang }: { lang: string }) {
  const { bi } = useI18n(), [rows, setRows] = useState<InboxMessage[]>([]), [loading, setLoading] = useState(false), [error, setError] = useState('');
  async function refresh() {
    setLoading(true); setError('');
    try { const r = await fetch('/api/messages', { cache: 'no-store' }); if (!r.ok) throw new Error(); const data = await r.json() as { messages: InboxMessage[] }; if(!Array.isArray(data.messages))throw new Error();setRows(data.messages); }
    catch { setError(bi('留言箱暂时无法读取，请重试。','The inbox could not be loaded. Please retry.')); }
    finally { setLoading(false); }
  }
  useEffect(() => { refresh(); }, []);
  async function change(row: InboxMessage) {
    try { const r = await fetch('/api/messages', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: row.id, status: row.status === 'new' ? 'done' : 'new' }) }); if (!r.ok) throw new Error(); await refresh(); }
    catch { setError(bi('处理状态未能保存，请重试。','The message status could not be saved. Please retry.')); }
  }
  return <section className="maintainer-inbox"><div className="section-title"><div><span className="eyebrow">Maintainer only</span><h3><Inbox size={20}/>{bi('收到的留言','Received suggestions')}<span className="count-pill">{rows.filter(r => r.status === 'new').length}</span></h3></div><button className="secondary" onClick={refresh} disabled={loading}><RefreshCw size={15} className={loading ? 'spin' : ''}/>{bi('刷新','Refresh')}</button></div><p className="community-privacy">{bi('仅维护者可查看最近 200 条留言。邮箱和留言不进入公开目录。回复按钮会打开邮件应用，不会自动发送。','Only maintainers can view the latest 200 messages. Emails and messages are excluded from the public catalog. Reply opens your email app; it does not send automatically.')}</p>{error && <p role="alert" className="community-error">{error}</p>}{!loading && !rows.length && !error && <p className="inline-empty">{bi('还没有收到留言。','No messages yet.')}</p>}<div className="maintainer-messages">{rows.map(row => <article key={row.id}><div className="message-meta"><span className={row.status === 'new' ? 'message-new' : ''}>{bi(row.status === 'new' ? '待处理' : '已处理', row.status === 'new' ? 'New' : 'Done')}</span><time>{new Date(row.createdAt).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en-US')}</time><small>{row.source === 'github-pages' ? 'GitHub Pages' : 'Atlas'}</small></div><p>{row.message}</p><div className="message-actions"><a href={`mailto:${row.email}?subject=${encodeURIComponent('Re: Embodied Atlas 社区建议')}`}>{row.email}<ArrowUpRight size={13}/></a><button onClick={() => change(row)}>{bi(row.status === 'new' ? '标为已处理' : '重新打开', row.status === 'new' ? 'Mark as done' : 'Reopen')}</button></div></article>)}</div></section>;
}
