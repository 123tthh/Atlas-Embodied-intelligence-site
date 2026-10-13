'use client';
import { useState } from 'react';
import { GitBranch, LogIn, ArrowLeft, ShieldCheck, LoaderCircle } from 'lucide-react';
export default function LoginOptions({ githubReady, returnTo, error }: { githubReady: boolean; returnTo: string; error: string }) {
  const [busy, setBusy] = useState(false), [problem, setProblem] = useState('');
  const [english, setEnglish] = useState(false);
  const bi = (zh: string, en: string) => english ? en : zh;
  async function signIn() {
    setBusy(true); setProblem('');
    try {
      const csrfResponse = await fetch('/api/auth/csrf', { cache: 'no-store' });
      const { csrfToken } = await csrfResponse.json() as { csrfToken?: string };
      if (!csrfResponse.ok || typeof csrfToken !== 'string') throw new Error();
      const response = await fetch('/api/auth/signin/github', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Auth-Return-Redirect': '1' }, body: new URLSearchParams({ csrfToken, callbackUrl: returnTo }) });
      const result = await response.json() as { url?: string };
      if (!response.ok || typeof result.url !== 'string') throw new Error();
      const url = new URL(result.url, window.location.origin);
      if (url.origin !== window.location.origin && url.origin !== 'https://github.com') throw new Error();
      window.location.assign(url.href);
    } catch { setProblem(bi('暂时无法连接 GitHub 登录，请重试或使用 ChatGPT。', 'GitHub sign-in is unavailable. Retry or use ChatGPT.')); setBusy(false); }
  }
  return <section className="atlas-login-card"><div className="atlas-login-top"><a href="/" aria-label="Embodied Atlas"><span className="logo-mark">E<span>·</span>A</span></a><button className="text-button" onClick={() => setEnglish(!english)}>{english ? '中文' : 'English'}</button></div>
    <span className="eyebrow">Embodied Atlas</span><h1>{bi('登录研究地图', 'Sign in to the atlas')}</h1><p>{bi('选择你的登录方式。浏览目录与提交留言无需登录。', 'Choose how to sign in. Browsing and suggestions need no account.')}</p>
    {(error || problem) && <p className="community-error" role="alert">{problem || (error === 'AccessDenied' ? bi('这个 GitHub 账号没有维护者权限，请切换至 123tthh。', 'This GitHub account is not the maintainer. Switch to 123tthh.') : bi('登录未完成，请重新尝试。', 'Sign-in did not complete. Please retry.'))}</p>}
    <button className="primary atlas-login-provider" disabled={!githubReady || busy} onClick={signIn}>{busy ? <LoaderCircle size={19} className="spin"/> : <GitBranch size={19}/>} {bi('使用 GitHub 登录', 'Continue with GitHub')}<small>{bi('维护者 123tthh', 'Maintainer 123tthh')}</small></button>
    {!githubReady && <small className="atlas-login-hint">{bi('GitHub 登录正在配置，当前可使用 ChatGPT 登录。', 'GitHub sign-in is being configured. ChatGPT sign-in is available.')}</small>}
    <a className="secondary atlas-login-provider" href={'/signin-with-chatgpt?return_to=' + encodeURIComponent(returnTo)} target="_top"><LogIn size={19}/>{bi('使用 ChatGPT 登录', 'Continue with ChatGPT')}</a>
    <div className="atlas-login-policy"><ShieldCheck size={19}/><p>{bi('只有网站所有者和已绑定的 123tthh 账号可以查看私密留言、审核和修改内容。GitHub 登录仅读取个人资料，不申请仓库权限。', 'Only the site owner and the linked 123tthh account can read private messages and moderate content. GitHub sign-in reads your profile only and requests no repository access.')}</p></div>
    <small className="atlas-login-hint">{bi('两种登录方式的个人收藏分别保存。', 'Each sign-in method keeps its own personal bookmarks.')}</small><a className="text-button" href="/"><ArrowLeft size={14}/>{bi('返回地图', 'Back to the atlas')}</a>
  </section>;
}
