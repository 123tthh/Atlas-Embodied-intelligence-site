'use client';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Network, FileCheck, MapPinned, ChartColumn, Search, ArrowUpRight, ArrowRight, Plus, Bookmark, Library, Users, GitBranch, Globe, ChevronDown, ChevronRight, ChevronLeft, X, SlidersHorizontal, Upload, Download, Share2, Check, Copy, ExternalLink, FileText, Code2, Link2, Layers, Info, Inbox, LogIn, LogOut, Command, Menu, LoaderCircle, RefreshCw, Filter, GitCompareArrows, CornerDownRight, ShieldCheck, CheckCircle2, AlertCircle, BookOpen, Orbit, Calendar, Trash2 } from 'lucide-react';
import Graph from './Graph';
import CommunityInbox from './CommunityInbox';
import {STATIC_MODE,BASE_PATH,LIVE_ORIGIN,REPOSITORY_URL,publicApi,signInUrl,paperUrl} from '../../lib/site-mode';
import BranchGraph from './BranchGraph';
import MobileGraph from './MobileGraph';
import TeamGraph from './TeamGraph';
import {PaperEvidenceFilters,RecognitionBadges,PaperTeamLinks} from './PaperEvidence';
import {paperMatchesVenue,paperMatchesRecognition,venueGroups,recognitionFilters} from '../../lib/paper-evidence';
import WorldMap from './WorldMap';
import RegionalResearch from './RegionalResearch';
import ResearchWorks from './ResearchWorks';
import Modal from './Modal';
import EntityDirectory from './EntityDirectory';
import DataUpdates from './DataUpdates';
import { LanguageProvider, LanguageSwitcher, useI18n } from './Language';
import { subfields, paperSubfields } from '../../lib/taxonomy';
import seed from '../../lib/catalog.json';
import { lanes, searchPapers, scholar, arxivSearch, venues, neighbors, importBookmarks, arxivId, safeUrl } from '../../lib/domain';
import type { Catalog, Paper, Edge, Lane, Identity, Proposal } from '../../lib/types';
type View = 'teamgraph' | 'works' | 'regions' | 'map' | 'graph' | 'library' | 'teams' | 'saved' | 'discover' | 'proposals' | 'people' | 'data';
type ArxivResult = {
    title: string;
    url: string;
    date: string;
    summary: string;
    authors: string[];
};
const STORE = 'embodied-atlas-bookmarks-v1';
const titles: Record<View, [
    string,
    string
]> = { teamgraph: ['团队技术图谱', '按实验室与团队追踪技术主线、联合工作和原始依据。'], works: ['论文与模型成果', '沿已发表论文、公开模型与技术成果，找到具体研究团队。'], regions: ['区域与产业', '比较区域样本、筛选机构，探索人才与科研网络。'], map: ['世界地图', '沿地理分布，探索具身智能与机器人研究团队。'], graph: ['技术演化图谱', '按时间与技术关系，浏览具身智能研究。'], library: ['论文索引', '链接、技术关键词与研究人物，一处直达。'], teams: ['机构与实验室', '从公司与大学，找到具体实验室和研究人物。'], people: ['Researchers', '按研究方向、机构与代表成果，发现研究者和在读学生。'], data: ['数据与更新', '了解知识库的来源、存储和维护方式。'], saved: ['我的研究书架', '保存论文与项目，建立你的阅读目录。'], discover: ['探索更多研究', '以同一组技术关键词，连接不同论文来源。'], proposals: ['社区贡献', '留个邮箱与建议，一起完善这张研究地图。'] };
function Ext({ href, children, className = '' }: {
    href: string;
    children: React.ReactNode;
    className?: string;
}) { return <a href={safeUrl(href) || undefined} target="_blank" rel="noopener noreferrer" className={className}>{children}</a>; }
async function api<T>(url: string, options?: RequestInit): Promise<T> { const r = await fetch(publicApi(url), options); let data; try {
    data = await r.json();
}
catch {
    throw new Error('服务暂时不可用，请稍后重试');
} if (!r.ok)
    throw new Error(data && typeof data === 'object' && 'error' in data ? String(data.error) : '操作未成功，请重试'); return data as T; }
function body(value: unknown, method = 'POST') { return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) }; }
function download(filename: string, data: unknown) { const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export default function Atlas(props: {
    user: Identity;
    initialId?: string;
}) { return <LanguageProvider><AtlasWorkspace {...props}/></LanguageProvider>; }
function AtlasWorkspace({ user, initialId }: {
    user: Identity;
    initialId?: string;
}) {
    const { lang, t, bi } = useI18n();
    const [catalog, setCatalog] = useState<Catalog>(seed as Catalog), [view, setView] = useState<View>('graph'), [query, setQuery] = useState(''), [selected, setSelected] = useState<string | null>(initialId || null), [lane, setLane] = useState('all'), [subfield, setSubfield] = useState('all'), [year, setYear] = useState('all'), [team, setTeam] = useState(''), [sort, setSort] = useState('new'), [relation, setRelation] = useState('all'), [focus, setFocus] = useState<string | null>(null), [depth, setDepth] = useState(1);
    const [teamOverview,setTeamOverview]=useState(true);
    const [isPhone,setIsPhone]=useState(false),[mobileFilters,setMobileFilters]=useState(false),[mobileCanvas,setMobileCanvas]=useState(false);
    useEffect(()=>{const media=window.matchMedia('(max-width:680px)');const update=()=>setIsPhone(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[]);
    const [graphMode,setGraphMode]=useState<'timeline'|'tree'>('timeline');
    const [venueGroup,setVenueGroup]=useState('all'),[recognition,setRecognition]=useState('all'),[paperFiltersReady,setPaperFiltersReady]=useState(false);
    const [saved, setSaved] = useState<string[]>([]), [savedReady, setSavedReady] = useState(!user), [saving, setSaving] = useState<string[]>([]), [compare, setCompare] = useState<string[]>([]), [compareOpen, setCompareOpen] = useState(false), [external, setExternal] = useState(false), [about, setAbout] = useState(false), [edgeInfo, setEdgeInfo] = useState<Edge | null>(null), [contribute, setContribute] = useState(false), [draft, setDraft] = useState<Partial<Proposal>>({}), [mobileNav, setMobileNav] = useState(false), [toast, setToast] = useState(''), [banner, setBanner] = useState('');
    const [live, setLive] = useState<ArxivResult[]>([]), [liveQuery, setLiveQuery] = useState(''), [liveStatus, setLiveStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'), [liveError, setLiveError] = useState(''), [proposals, setProposals] = useState<Proposal[]>([]), [proposalStatus, setProposalStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle'), [proposalError, setProposalError] = useState('');
    const searchRef = useRef<HTMLInputElement>(null), importRef = useRef<HTMLInputElement>(null), toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null), liveAbort = useRef<AbortController | null>(null);
    const notify = useCallback((message: string) => { setToast(message); if (toastTimer.current)
        clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 4500); }, []);
    const refreshCatalog = useCallback(async () => { try {
        setCatalog(await api<Catalog>('/api/catalog'));
        setBanner('');
    }
    catch (e) {
        setBanner((e as Error).message);
    } }, []);
    const refreshProposals = useCallback(async () => { if (!user)
        return; setProposalStatus('loading'); try {
        const r = await api<{
            proposals: Proposal[];
        }>('/api/proposals');
        setProposals(r.proposals);
        setProposalStatus('ready');
    }
    catch (e) {
        setProposalError((e as Error).message);
        setProposalStatus('error');
    } }, [user]);
    useEffect(() => { refreshCatalog(); const params = new URLSearchParams(location.search); if(params.get('layout')==='tree')setGraphMode('tree'); if(params.get('pv')&&params.get('pv')! in venueGroups)setVenueGroup(params.get('pv')!);if(params.get('pr')&&params.get('pr')! in recognitionFilters)setRecognition(params.get('pr')!);setPaperFiltersReady(true);if (params.get('q'))
        setQuery(params.get('q')!); if (params.get('subfield') && params.get('subfield')! in subfields)
        setSubfield(params.get('subfield')!); if (params.get('view') && Object.keys(titles).includes(params.get('view')!))
        setView(params.get('view') as View); if (params.get('paper'))
        setSelected(params.get('paper')); if (params.get('lane') && params.get('lane')! in lanes)
        setLane(params.get('lane')!); if (/^\d{4}$/.test(params.get('year') || ''))
        setYear(params.get('year')!); if (['all', 'evidence', 'compare'].includes(params.get('relation') || ''))
        setRelation(params.get('relation')!); if (['new', 'old', 'title'].includes(params.get('sort') || ''))
        setSort(params.get('sort')!); if (params.get('team'))
        setTeam(params.get('team')!); if (params.get('focus'))
        setFocus(params.get('focus')); if (params.get('depth') === '2')
        setDepth(2); if (user) {
        api<{
            bookmarks: string[];
        }>('/api/bookmarks').then(r => { setSaved(r.bookmarks); setSavedReady(true); }).catch(e => notify(e.message));
    }
    else {
        try {
            const local = JSON.parse(localStorage.getItem(STORE) || '[]');
            if (Array.isArray(local))
                setSaved(local.filter(v => typeof v === 'string'));
        }
        catch {
            notify(t("浏览器存储不可用；可用导出功能保留收藏"));
        }
    } return () => { if (toastTimer.current)
        clearTimeout(toastTimer.current); liveAbort.current?.abort(); }; }, []);
    useEffect(() => { const handler = (e: KeyboardEvent) => { const el = e.target as HTMLElement; const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable; if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key === 'k')) {
        e.preventDefault();
        searchRef.current?.focus();
    } if (e.key === 'Escape' && !document.querySelector('dialog[open]')) {
        setSelected(null);
        setFocus(null);
    } }; window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler); }, []);
    useEffect(() => { if (view === 'proposals')
        refreshProposals(); }, [view, refreshProposals]);
    useEffect(()=>{if(!paperFiltersReady||!['graph','teamgraph','library'].includes(view))return;const u=new URL(location.href);for(const [key,value]of Object.entries({q:query,lane,subfield,year,relation,pv:venueGroup,pr:recognition})){if(value&&value!=='all')u.searchParams.set(key,value);else u.searchParams.delete(key)}u.searchParams.set('view',view);history.replaceState({},'',u)},[paperFiltersReady,view,query,lane,subfield,year,relation,venueGroup,recognition]);
    const paper = catalog.papers.find(p => p.id === selected);
    const sourceQuery = query.trim() || paper?.short || 'embodied intelligence';
    const availableEdges = useMemo(() => catalog.edges.filter(e => relation === 'all' || (relation === 'evidence' ? !e.editorial : e.editorial)), [catalog.edges, relation]);
    const focusIds = useMemo(() => focus ? neighbors(focus, availableEdges, depth) : null, [focus, availableEdges, depth]);
    const filtered = useMemo(() => searchPapers(catalog.papers, query).filter(p => paperMatchesVenue(p,venueGroup)&&paperMatchesRecognition(p,recognition)&&(lane === 'all' || p.lane === lane) && (subfield === 'all' || paperSubfields(p).includes(subfield)) && (year === 'all' || String(p.year) === year) && (!team || p.teams.includes(team)) && (view !== 'saved' || saved.includes(p.id)) && (!focusIds || focusIds.has(p.id))).sort((a, b) => sort === 'title' ? a.short.localeCompare(b.short) : sort === 'old' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [catalog.papers, query, lane, subfield, year, team, view, saved, focusIds, sort,venueGroup,recognition]);
    const edgeList = availableEdges.filter(e => filtered.some(p => p.id === e.source) && filtered.some(p => p.id === e.target));
    const years = [...new Set(catalog.papers.map(p => p.year))].sort((a, b) => b - a);
    function changeGraphMode(mode:'timeline'|'tree'){setGraphMode(mode);const u=new URL(location.href);u.searchParams.set('view','graph');if(mode==='tree')u.searchParams.set('layout','tree');else u.searchParams.delete('layout');history.replaceState({},'',u);}
    const selectPaper = (id: string) => { setSelected(id); const url = paperUrl(new URL(location.href),id,view==='teamgraph'||view==='graph'); if(view==='teamgraph'||view==='graph')url.searchParams.set('view',view);url.searchParams.set('lang',lang);history.replaceState({},'',url); };
    const navigate = (next: View) => { setView(next); setFocus(null); setTeam(''); setMobileNav(false); setSelected(null); if (next === 'saved' || next === 'proposals')
        resetFilters(); const u = new URL(location.href); u.pathname = BASE_PATH; u.search = ''; u.searchParams.set('lang', lang); if (next !== 'graph')
        u.searchParams.set('view', next); history.replaceState({}, '', u); };
    function resetFilters() { setVenueGroup('all');setRecognition('all');setQuery(''); setLane('all'); setSubfield('all'); setYear('all'); setTeam(''); setFocus(null); setRelation('all'); }
    async function save(id: string) { if (user && !savedReady) {
        notify(t("云端收藏尚未载入，请刷新后重试"));
        return;
    } if (saving.includes(id))
        return; const exists = saved.includes(id), next = exists ? saved.filter(v => v !== id) : [...saved, id]; setSaved(next); if (user) {
        setSaving(v => [...v, id]);
        try {
            await api('/api/bookmarks', body({ paperId: id, save: !exists }));
            notify(exists ? t("已移出云端收藏") : t("已保存到云端书架"));
        }
        catch (e) {
            setSaved(v => exists ? [...v.filter(x => x !== id), id] : v.filter(x => x !== id));
            notify((e as Error).message);
        }
        finally {
            setSaving(v => v.filter(x => x !== id));
        }
    }
    else {
        try {
            localStorage.setItem(STORE, JSON.stringify(next));
            notify(exists ? t("已移出本机收藏") : t("已保存到本机书架"));
        }
        catch {
            notify(t("无法写入本机存储，请导出收藏以保存"));
        }
    } }
    function toggleCompare(id: string) { setCompare(v => { if (v.includes(id))
        return v.filter(x => x !== id); if (v.length === 3) {
        notify(t("最多同时对比 3 篇论文"));
        return v;
    } return [...v, id]; }); }
    async function share(id?: string) { const u = new URL(BASE_PATH,location.origin); if (id)
        paperUrl(u,id);
    else {
        u.searchParams.set('view', view === 'saved' ? 'library' : view);
        if(view==='graph'&&graphMode==='tree'){u.searchParams.set('layout','tree');const current=new URL(location.href);for(const key of ['bopen','bpages','paper'])if(current.searchParams.has(key))u.searchParams.set(key,current.searchParams.get(key)!);}
        if (query)
            u.searchParams.set('q', query);
        if (lane !== 'all')
            u.searchParams.set('lane', lane);
        if (subfield !== 'all')
            u.searchParams.set('subfield', subfield);
        if (year !== 'all')
            u.searchParams.set('year', year);
        if (relation !== 'all')
            u.searchParams.set('relation', relation);
        if (sort !== 'new')
            u.searchParams.set('sort', sort);
        if(venueGroup!=='all')u.searchParams.set('pv',venueGroup);if(recognition!=='all')u.searchParams.set('pr',recognition);if(view==='teamgraph'){const current=new URL(location.href);for(const k of ['tlines','tgroup','tmode','tq','tr','tc','tt','ts','torder'])if(current.searchParams.has(k))u.searchParams.set(k,current.searchParams.get(k)!);}
        if (team)
            u.searchParams.set('team', team);
        if (focus) {
            u.searchParams.set('focus', focus);
            u.searchParams.set('depth', String(depth));
        }
        if (view === 'works' || view === 'regions' || view === 'map' || view === 'teams' || view === 'people') {
            const current = new URL(location.href);
            for (const key of ['org', 'lab', 'type', 'country', 'topic', 'mapx', 'mapy', 'mapz', 'region', 'place', 'sector', 'level', 'compare', 'evidence', 'kind', 'order', 'career'])
                if (current.searchParams.get(key))
                    u.searchParams.set(key, current.searchParams.get(key)!);
        }
    } u.searchParams.set('lang', lang); try {
        await navigator.clipboard.writeText(u.href);
        notify(t("分享链接已复制"));
    }
    catch {
        notify(t("复制失败，请从浏览器地址栏复制当前页面链接"));
    } }
    async function searchArxiv() { if(STATIC_MODE){setLiveStatus('error');setLiveQuery(query.trim()||'embodied intelligence');setLiveError(bi('GitHub Pages 提供本地目录检索；实时新论文请打开下方 arXiv 原站入口。','Search the local catalog here; use the arXiv link below for live papers.'));return;} const q = query.trim() || 'embodied intelligence'; liveAbort.current?.abort(); const controller = new AbortController(); liveAbort.current = controller; setLiveStatus('loading'); setLiveQuery(q); setLiveError(''); try {
        const result = await api<{
            results: ArxivResult[];
        }>('/api/arxiv?q=' + encodeURIComponent(q), { signal: controller.signal });
        setLive(result.results);
        setLiveStatus('ready');
    }
    catch (e) {
        if (controller.signal.aborted)
            return;
        setLiveStatus('error');
        setLiveError((e as Error).message);
    } }
    async function importSaved(file: File) { if (file.size > 2000000) {
        notify(t("文件过大，请选择本站导出的收藏文件"));
        return;
    } try {
        const ids = importBookmarks(JSON.parse(await file.text()), catalog.papers), newIds = ids.filter(id => !saved.includes(id));
        if (user) {
            if (!savedReady)
                throw new Error(t("云端收藏尚未载入"));
            let ok = 0;
            for (const id of newIds) {
                await api('/api/bookmarks', body({ paperId: id, save: true }));
                setSaved(v => v.includes(id) ? v : [...v, id]);
                ok++;
            }
            notify(t("已导入 {0} 条云端收藏", ok));
        }
        else {
            const next = [...new Set([...saved, ...ids])];
            localStorage.setItem(STORE, JSON.stringify(next));
            setSaved(next);
            notify(t("已导入 {0} 条收藏；未知条目已忽略", newIds.length));
        }
    }
    catch (e) {
        notify((e as Error).message);
    } }
    const closeCompare = useCallback(() => setCompareOpen(false), []), closeExternal = useCallback(() => setExternal(false), []), closeAbout = useCallback(() => setAbout(false), []), closeEdge = useCallback(() => setEdgeInfo(null), []), closeContribute = useCallback(() => setContribute(false), []);
    const navItems: [
        View,
        typeof Network,
        string
    ][] = [['graph', Network, t("技术图谱")], ['teamgraph',GitBranch,bi('团队技术图谱','Team research graph')], ['map', MapPinned, t("世界地图")], ['regions', ChartColumn, t("区域与产业")], ['works', FileCheck, bi('论文与模型成果','Research outputs')], ['library', Library, t("论文索引")], ['teams', Users, t("机构与实验室")], ['people', Search, "Researchers"], ['discover', Globe, t("发现新研究")], ['saved', Bookmark, t("我的书架")], ['proposals', Inbox, user?.isAdmin ? bi('留言与投稿','Inbox & submissions') : t("社区贡献")], ['data', Info, t("数据与更新")]];
    return <div className="app-shell">
    <aside className={'sidebar' + (mobileNav ? ' open' : '')}><a className="brand" href={BASE_PATH} aria-label={t("Embodied Atlas 首页")}><span>Atlas<small>Embodied intelligence</small></span></a><div className="sidebar-label">{t("研究工作台 ")}<span>0.99 RC</span></div><nav className="primary-nav">{navItems.map(([id, Icon, label]) => <button key={id} onClick={() => navigate(id)} className={view === id ? 'active' : ''} aria-current={view === id ? 'page' : undefined}><Icon size={18}/><span>{t(label)}</span>{id === 'saved' && saved.length > 0 ? <small>{saved.length}</small> : id === 'discover' ? <ArrowUpRight size={13}/> : null}</button>)}</nav><div className="sidebar-divider"/><div className="sidebar-label">{t("研究方向")}</div><div className="lane-nav">{Object.entries(lanes).map(([key, l]) => <button key={key} className={lane === key ? 'active' : ''} onClick={() => { setLane(lane === key ? 'all' : key); if (['works', 'regions', 'map', 'teams', 'people', 'data', 'discover', 'proposals'].includes(view))
        setView('graph'); setMobileNav(false); }}><span className="lane-dot" style={{ background: l.color }}/>{bi(l.name, l.english)}<small>{catalog.papers.filter(p => p.lane === key).length}</small></button>)}</div><div className="sidebar-bottom"><button className="about-link" onClick={() => setAbout(true)}><Info size={15}/>{t("关于这张地图")}<span>↗</span></button><div className="profile"><span className="avatar">{user ? user.displayName.slice(0, 1).toUpperCase() : <Users size={16}/>}</span><div><strong>{user ? (user.isAdmin ? t("地图维护者") : t("研究贡献者")) : t("访客模式")}</strong><small>{user ? t("收藏已连接云端") : t("收藏保存在此浏览器")}</small></div><a className="icon-button" aria-label={user ? t("退出登录") : t("使用 ChatGPT 登录")} href={user ? '/signout-with-chatgpt?return_to=/' : signInUrl()} target="_top">{user ? <LogOut size={16}/> : <LogIn size={16}/>}</a></div></div></aside>
    {mobileNav && <button className="mobile-scrim" aria-label={t("关闭导航")} onClick={() => setMobileNav(false)}/>}
    <main className={"main-workspace"+(view==='graph'?' is-technical-graph':'')}><header className="topbar"><button className="mobile-menu icon-button" aria-label={t("打开导航")} onClick={() => setMobileNav(true)}><Menu size={21}/></button><div className="breadcrumb">{t("研究地图")}<ChevronRight size={14}/><strong>{t(titles[view][0])}</strong></div><form className="global-search" onSubmit={e => { e.preventDefault(); if (view === 'discover')
        searchArxiv(); }}><Search size={17}/><input ref={searchRef} type="search" placeholder={view === 'works' ? bi('搜索论文、模型、团队或城市…','Find papers, models, teams or cities…') : ['regions', 'map', 'teams', 'people'].includes(view) ? bi('搜索机构、实验室、人物或领域…', 'Find organizations, labs, people or topics…') : bi('搜索技术关键词，如 World model…', 'Search research, e.g. World models…')} aria-label={bi('全局检索', 'Search the atlas')} maxLength={180} value={query} onChange={e => setQuery(e.target.value)}/><kbd>/</kbd></form><LanguageSwitcher /><button className="secondary compact external-top" onClick={() => setExternal(true)}><Globe size={16}/>{t("站外检索")}<ArrowUpRight size={14}/></button><button className="primary compact contribute-top" onClick={() => { setDraft({}); setContribute(true); }}><Plus size={17}/>{t("贡献")}</button></header>
      {STATIC_MODE&&<div className="pages-reading-note"><span>{bi("GitHub Pages · 免登录浏览 · 本机收藏","GitHub Pages · Browse without signing in · Local bookmarks")}</span><a href={LIVE_ORIGIN}>{bi("打开云端版本","Open cloud edition")} ↗</a></div>}
      {banner && <div className="service-banner" role="status"><AlertCircle size={15}/>{t(banner)}<button onClick={refreshCatalog}>{t("重试")}</button></div>}
      <section className="workspace-heading"><div><div className="eyebrow">{view === 'graph' ? 'Research map' : view === 'saved' ? 'Reading list' : 'Embodied Atlas'}</div><h1>{t(titles[view][0])}</h1><p>{t(titles[view][1])}</p></div><div className="heading-actions">{view === 'saved' ? <><button className="secondary" onClick={() => importRef.current?.click()}><Upload size={16}/>{t("导入")}</button><button className="secondary" onClick={() => download('atlas-bookmarks.json', { format: 'embodied-atlas', version: 1, exportedAt: new Date().toISOString(), bookmarks: saved, papers: catalog.papers.filter(p => saved.includes(p.id)) })}><Download size={16}/>{t("导出收藏")}</button></> : view === 'proposals' ? <button className="primary" onClick={() => { setDraft({}); setContribute(true); }}><Plus size={16}/>{user?t("提交论文"):bi("写留言","Leave a note")}</button> : <><div className="catalog-stat" style={['works', 'regions', 'map', 'teams', 'people'].includes(view) ? {display: 'none'} : undefined}><strong>{catalog.papers.length}</strong><span>{bi("研究成果","research works")}</span><i /><strong>{catalog.edges.length}</strong><span>{t("研究关联")}</span></div><button className="icon-button" aria-label={t("分享当前视图")} onClick={() => share()}><Share2 size={17}/></button></>}</div></section>
      {!['works', 'regions', 'map', 'discover', 'proposals', 'teams', 'people', 'data'].includes(view) && !(view==='teamgraph'&&teamOverview) && <div className={"filterbar"+(mobileFilters?" mobile-filters-open":"")}><button className="mobile-filter-toggle" onClick={()=>setMobileFilters(!mobileFilters)} aria-expanded={mobileFilters}><SlidersHorizontal size={16}/>{bi(mobileFilters?"收起筛选":"筛选研究",mobileFilters?"Hide filters":"Filter research")}<small>{[lane,subfield,year,relation,venueGroup,recognition].filter(v=>v!=="all").length||""}</small></button><div className="filter-group"><label className="filter-select"><Calendar size={14}/><select aria-label={t("按年份筛选")} value={year} onChange={e => setYear(e.target.value)}><option value="all">{t("全部年份")}</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select><ChevronDown size={12}/></label><label className="filter-select"><Layers size={14}/><select aria-label={t("按技术方向筛选")} value={lane} onChange={e => setLane(e.target.value)}><option value="all">{t("全部方向")}</option>{Object.entries(lanes).map(([id, l]) => <option key={id} value={id}>{bi(l.name, l.english)}</option>)}</select><ChevronDown size={12}/></label><label className="filter-select"><Filter size={14}/><select aria-label={bi('按子领域筛选', 'Filter by subfield')} value={subfield} onChange={e => setSubfield(e.target.value)}><option value="all">{bi('全部子领域', 'All subfields')}</option>{Object.entries(subfields).filter(([id]) => catalog.papers.some(p => paperSubfields(p).includes(id))).map(([id, names]) => <option key={id} value={id}>{bi(names[0], names[1])}</option>)}</select><ChevronDown size={12}/></label>{['graph','teamgraph'].includes(view) ? <label className="filter-select"><GitBranch size={14}/><select aria-label={t("关系类型")} value={relation} onChange={e => setRelation(e.target.value)}><option value="all">{t("全部关系")}</option><option value="evidence">{t("有据关系")}</option><option value="compare">{t("同类比较")}</option></select><ChevronDown size={12}/></label> : <label className="filter-select"><select aria-label={t("论文排序")} value={sort} onChange={e => setSort(e.target.value)}><option value="new">{t("最新在前")}</option><option value="old">{t("最早在前")}</option><option value="title">{t("按名称")}</option></select><ChevronDown size={12}/></label>}<PaperEvidenceFilters venue={venueGroup} recognition={recognition} onVenue={setVenueGroup} onRecognition={setRecognition}/>{team && <button className="filter-chip" onClick={() => setTeam('')}>{team}<X size={12}/></button>}{focus && <span className="focus-chip">{catalog.papers.find(p => p.id === focus)?.short}<select aria-label={t("关联展开层数")} value={depth} onChange={e => setDepth(Number(e.target.value))}><option value="1">{t("1 层关联")}</option><option value="2">{t("2 层关联")}</option></select><button aria-label={t("取消局部聚焦")} onClick={() => setFocus(null)}><X size={12}/></button></span>}{(query || lane !== 'all' || subfield !== 'all' || year !== 'all' || team || focus || relation !== 'all'||venueGroup!=='all'||recognition!=='all') && <button className="text-button" onClick={resetFilters}>{t("清除筛选")}</button>}</div><span className="result-count" aria-live="polite">{view==='teamgraph'&&bi('全库匹配：','Catalog matches: ')}{filtered.length}{t(" 篇")}{view === 'graph' ? ' · ' + edgeList.length + t(" 条关系") : ''}</span></div>}
      {['graph','teamgraph','library'].includes(view)&&!(view==='teamgraph'&&teamOverview)&&<div className="paper-cutoff-note">{bi('检索截止','Research cutoff')} {catalog.cutoff||catalog.updated} · {bi('重点展示与奖项均附原始依据；时间先后不代表技术继承。','Distinctions link to original sources; chronology alone does not imply technical inheritance.')}</div>}
      <div className={'workspace-body' + (paper && !['works', 'regions', 'map', 'proposals', 'discover', 'teams', 'people', 'data'].includes(view) ? ' has-detail' : '')}>
        <div className="view-content">
          {view === 'teamgraph' && <TeamGraph onOverviewChange={setTeamOverview} catalog={catalog} papers={filtered} edges={edgeList} selected={selected} onSelect={selectPaper} onEdge={setEdgeInfo} focus={focus}/>}
          {view === 'graph' && <div className="graph-explorer"><div className="graph-layout-toolbar"><div className="graph-layout-toggle" role="group" aria-label={bi('图谱布局','Graph layout')}><button aria-pressed={graphMode==='timeline'} onClick={()=>changeGraphMode('timeline')}><Calendar size={15}/>{bi('时间图谱','Timeline')}</button><button aria-pressed={graphMode==='tree'} onClick={()=>changeGraphMode('tree')}><GitBranch size={15}/>{bi('分叉树','Branch tree')}</button></div>{isPhone&&<button className="mobile-canvas-switch" aria-pressed={mobileCanvas} onClick={()=>setMobileCanvas(!mobileCanvas)}>{bi(mobileCanvas?'阅读模式':'自由画布',mobileCanvas?'Reading view':'Free canvas')}</button>}<span>{graphMode==='tree'?bi('逐层展开 · 点击论文查看详情与关联','Expand branches · Explore papers and relations'):bi('仅显示有记录的年份','Only years with research records')}</span></div>{isPhone&&!mobileCanvas?<MobileGraph papers={filtered} edges={edgeList} mode={graphMode} selected={selected} onSelect={selectPaper} onEdge={setEdgeInfo}/>:graphMode==='tree'?<BranchGraph papers={filtered} edges={edgeList} selected={selected} onSelect={selectPaper} onEdge={setEdgeInfo}/>:<Graph papers={filtered} edges={edgeList} selected={selected} onSelect={selectPaper} onEdge={setEdgeInfo} focus={focus}/>}</div>}
          {(view === 'library' || view === 'saved') && <div className="paper-library">{view === 'saved' && <div className="shelf-note"><Bookmark size={16}/>{user ? t("云端书架 \u00B7 登录后可跨设备访问") : t("本机书架 \u00B7 收藏保存在当前浏览器，可导出备份")}{!user && <a href={signInUrl("/?view=saved")} target="_top">{t("登录使用云端收藏")}<ArrowUpRight size={13}/></a>}</div>}{filtered.length ? filtered.map(p => <PaperRow key={p.id} paper={p} selected={selected === p.id} saved={saved.includes(p.id)} compare={compare.includes(p.id)} onSelect={() => selectPaper(p.id)} onSave={() => save(p.id)} onCompare={() => toggleCompare(p.id)}/>) : <Empty icon={<BookOpen size={38}/>} title={view === 'saved' ? t("书架中还没有论文") : t("没有匹配的论文")} text={view === 'saved' ? t("点击论文上的书签，即可保存到这里。") : t("换一个关键词，或到外部论文库继续探索。")} action={<button className="primary" onClick={() => view === 'saved' ? navigate('library') : setExternal(true)}>{view === 'saved' ? t("浏览论文") : t("站外检索")}<ArrowRight size={16}/></button>}/>}</div>}
          {view === 'works' && <ResearchWorks query={query} onQuery={setQuery} automaticPapers={catalog.papers.filter(p=>p.ingestion==='weekly')}/>}
          {view === 'regions' && <RegionalResearch query={query} onQuery={setQuery}/>}
          {view === 'map' && <WorldMap query={query} onQuery={setQuery}/>}
          {view === 'teams' && <EntityDirectory key="organizations" mode="organizations" query={query} onQuery={setQuery}/>}
          {view === 'people' && <EntityDirectory key="people" mode="people" query={query} onQuery={setQuery}/>}
          {view === 'data' && <DataUpdates catalog={catalog} onDiscover={() => navigate('discover')} onContribute={() => { setDraft({}); setContribute(true); }} onRefresh={() => { refreshCatalog(); notify(bi('正在刷新已发布目录', 'Refreshing the published catalog')); }} onExport={() => download('embodied-atlas-catalog.json', catalog)}/>}
          {view === 'discover' && <div className="discover-page"><div className="discovery-hero"><div className="eyebrow">Research discovery</div><h2>{t("从技术关键词开始。")}</h2><p>{t("输入技术关键词，在 arXiv 查看新论文，或直达 Scholar 与会议论文库。")}</p><div className="quick-queries">{['World models', 'Humanoid', 'Visual navigation', 'Tactile', 'Diffusion Policy', 'Vision Language Action'].map(q => <button key={q} onClick={() => setQuery(q)}>{q}<ArrowUpRight size={12}/></button>)}</div></div><ExternalSources query={sourceQuery}/><div className="section-title"><div><h3>{t("arXiv 发现")}</h3><span>{t("实时检索 \u00B7 最近提交优先 \u00B7 最多 12 条")}</span></div><button className="primary" onClick={searchArxiv} disabled={liveStatus === 'loading'}>{liveStatus === 'loading' ? <LoaderCircle size={16} className="spin"/> : <Search size={16}/>}{t("检索 ")}{query || 'embodied intelligence'}</button></div>{liveStatus === 'idle' && <div className="inline-empty">{t("搜索结果尚未载入。输入关键词后点击检索。")}</div>}{liveStatus === 'loading' && <div className="inline-empty"><LoaderCircle className="spin"/>{t("正在连接 arXiv\u2026")}</div>}{liveStatus === 'error' && <div className="error-state" role="alert"><AlertCircle size={22}/><p>{t(liveError)}</p><Ext href={arxivSearch(liveQuery)}>{t("在 arXiv 原站检索")}<ArrowUpRight size={14}/></Ext><button className="secondary" onClick={searchArxiv}>{t("重试")}</button></div>}{liveStatus === 'ready' && <><div className="query-caption">“{liveQuery}” · {live.length}{t(" 条结果 \u00B7 尚未经本站整理审核")}</div>{live.length ? live.map(r => <article className="arxiv-result" key={r.url}><div className="result-meta">{r.date}<span>arXiv</span></div><Ext href={r.url}><h3>{r.title}<ArrowUpRight size={16}/></h3></Ext><p>{r.authors.slice(0, 5).join(' · ')}{r.authors.length > 5 ? t(" 等") : ''}</p><details><summary>{t("查看摘要")}</summary><p>{r.summary}</p></details><button className="text-button" onClick={() => { setDraft({ title: r.title, url: r.url, year: Number(r.date.slice(0, 4)), authors: r.authors.join(', '), keywords: query ? [query] : [] }); setContribute(true); }}><Plus size={14}/>{t("提议加入图谱")}</button></article>) : <div className="inline-empty">{t("没有找到匹配结果，试试更短的英文技术关键词。")}</div>}</>}</div>}
          {view === 'proposals' && <div className="proposal-page"><CommunityInbox user={user}/><details className="optional-contributions"><summary>{bi('可选：登录后提交结构化论文或查看审核','Optional: sign in for structured papers and review status')}</summary>{!user ? <Empty icon={<Inbox size={32}/>} title={bi('更多贡献工具','More contribution tools')} text={bi('上方留言箱无需登录。ChatGPT 登录用于云端书架、结构化投稿与维护者审核。','The inbox above needs no sign-in. ChatGPT sign-in provides cloud bookmarks, structured submissions and maintainer review.')} action={<a className="secondary" href={signInUrl("/?view=proposals")} target="_top"><LogIn size={16}/>{t("使用 ChatGPT 登录")}</a>}/> : <><div className="contribution-flow"><span><Plus size={15}/>{t("提交链接")}</span><ChevronRight size={14}/><span><Link2 size={15}/>{t("补充关键词与依据")}</span><ChevronRight size={14}/><span><ShieldCheck size={15}/>{t("维护者审核")}</span><ChevronRight size={14}/><span><Network size={15}/>{t("加入图谱")}</span></div><div className="section-title"><h3>{user.isAdmin ? t("审核工作台") : t("我的投稿")}<span className="count-pill">{proposals.length}</span></h3><button className="text-button" onClick={refreshProposals}><RefreshCw size={14}/>{t("刷新")}</button></div>{proposalStatus === 'loading' ? <div className="inline-empty"><LoaderCircle className="spin"/>{t("正在读取投稿")}</div> : proposalStatus === 'error' ? <div className="error-state" role="alert">{t(proposalError)}<button onClick={refreshProposals}>{t("重试")}</button></div> : proposals.length ? proposals.map(p => <ProposalRow key={p.id} p={p} admin={user.isAdmin} onAction={async (status, note) => { try {
        await api('/api/proposals', body(status === 'withdraw' ? { id: p.id } : { id: p.id, status, note }, status === 'withdraw' ? 'DELETE' : 'PATCH'));
        notify(status === 'approved' ? t("已审核发布，论文已加入图谱") : status === 'withdraw' ? t("已撤回投稿") : t("已保存审核结果"));
        await refreshProposals();
        await refreshCatalog();
    }
    catch (e) {
        notify((e as Error).message);
    } }}/>) : <Empty icon={<Inbox size={36}/>} title={t("这里还没有投稿")} text={t("从一篇你熟悉的论文开始，补充它的技术关键词与官方链接。")} action={<button className="primary" onClick={() => { setDraft({}); setContribute(true); }}><Plus size={16}/>{t("提交第一篇论文")}</button>}/>}</>}</details></div>}
        </div>
        {paper && !['works', 'regions', 'map', 'proposals', 'discover', 'teams', 'people', 'data'].includes(view) && <><button className="mobile-detail-backdrop" aria-label={bi('返回图谱','Return to graph')} onClick={()=>{setSelected(null);const u=new URL(location.href);u.searchParams.delete('paper');history.replaceState({},'',u)}}/><PaperDetail paper={paper} catalog={catalog} saved={saved.includes(paper.id)} compared={compare.includes(paper.id)} onClose={() => {setSelected(null);const u=new URL(location.href);u.searchParams.delete('paper');if(u.pathname.startsWith('/paper/'))u.pathname=BASE_PATH;history.replaceState({},'',u)}} onSave={() => save(paper.id)} onCompare={() => toggleCompare(paper.id)} onShare={() => share(paper.id)} onTag={t => { setQuery(t); setFocus(null); }} onSelect={selectPaper} onFocus={() => { setView('graph'); setQuery(''); setLane('all'); setSubfield('all'); setYear('all'); setTeam(''); setFocus(paper.id);if(isPhone)setSelected(null); }} onEdge={setEdgeInfo}/></>}
      </div>
      <footer className="workspace-footer"><span><span className="live-dot"/>{t("0.99 预发布")}<span className="footer-divider">/</span>{Math.min(...catalog.papers.map(p => p.year))}–{Math.max(...catalog.papers.map(p => p.year))} {bi('精选研究', 'selected research')}</span><span>{t("关系可追溯 \u00B7 数据更新 ")}{catalog.updated}<button onClick={() => setAbout(true)}>{t("收录说明")}<ArrowUpRight size={11}/></button></span></footer>
    </main>
    {compare.length > 0 && <div className="compare-tray"><GitCompareArrows size={17}/><strong>{t("论文对比")}</strong><div>{compare.map(id => <button key={id} onClick={() => toggleCompare(id)}>{catalog.papers.find(p => p.id === id)?.short}<X size={12}/></button>)}</div><button className="primary compact" disabled={compare.length < 2} onClick={() => setCompareOpen(true)}>{t("开始对比 (")}{compare.length}/3)<ArrowRight size={14}/></button><button className="icon-button" aria-label={t("清空对比")} onClick={() => setCompare([])}><X size={17}/></button></div>}
    {toast && <div className="toast" role="status"><CheckCircle2 size={16}/>{t(toast)}</div>}
    <input hidden ref={importRef} type="file" accept=".json,application/json" onChange={e => { if (e.target.files?.[0])
        importSaved(e.target.files[0]); e.target.value = ''; }}/>
    {external && <Modal title={t("一个关键词，多个研究入口")} onClose={closeExternal} wide><p className="modal-description">{t("当前关键词：")}<strong>{sourceQuery}</strong>{t("。以下链接在新页面打开，不会将外站结果冒充本站收录。")}</p><ExternalSources query={sourceQuery}/></Modal>}
    {compareOpen && <Modal title={t("技术关键词对比")} onClose={closeCompare} wide><p className="modal-description">{t("并排查看方法、来源与人物；不同实验设置下的成功率不在这里排名。")}</p><div className="comparison-columns">{compare.map(id => catalog.papers.find(p => p.id === id)).filter((p): p is Paper => Boolean(p)).map(p => <section className="comparison-paper" key={p.id} style={{ '--lane': lanes[p.lane].color } as React.CSSProperties}><span className="eyebrow">{p.year} · {p.venue}</span><h3>{p.short}</h3><div className="tag-list">{p.tags.map(t => <span key={t}>{t}</span>)}</div><dl><dt>{t("技术概述")}</dt><dd>{lang === 'en' ? (p.summaryEn || p.summary) : p.summary}</dd><dt>{t("研究团队")}</dt><dd>{p.teams.join(' · ') || t("待补充")}</dd><dt>{t("作者（节选）")}</dt><dd>{p.authors.map(a => a.name).join(' · ')}</dd><dt>{t("原始资料")}</dt><dd className="comparison-links">{p.arxiv && <Ext href={p.arxiv}>{t("论文")}<ArrowUpRight size={12}/></Ext>}{p.project && <Ext href={p.project}>{t("项目")}<ArrowUpRight size={12}/></Ext>}{p.code && <Ext href={p.code}>{t("代码")}<ArrowUpRight size={12}/></Ext>}</dd></dl></section>)}</div></Modal>}
    {edgeInfo && <Modal title={t("为什么这两篇研究相连")} onClose={closeEdge}><div className="edge-dialog"><span className={'edge-badge ' + (edgeInfo.editorial ? 'editorial' : '')}>{edgeInfo.editorial ? t("编辑归类 \u00B7 同类比较") : t("来源支持 \u00B7 ") + (lang === 'en' ? (edgeInfo.labelEn || edgeInfo.label) : edgeInfo.label)}</span><h3>{catalog.papers.find(p => p.id === edgeInfo.source)?.short}<span>{edgeInfo.editorial ? '↔' : '→'}</span>{catalog.papers.find(p => p.id === edgeInfo.target)?.short}</h3><p>{lang === 'en' ? (edgeInfo.evidenceEn || edgeInfo.evidence) : edgeInfo.evidence}</p><Ext className="primary" href={edgeInfo.url}>{t("查看原始依据")}<ArrowUpRight size={15}/></Ext></div></Modal>}
    {about && <Modal title={t("关于 Embodied Atlas")} onClose={closeAbout}><div className="about-copy"><span className="version-pill">0.99 RELEASE CANDIDATE</span><h3>{t("具身智能研究目录")}</h3><p>{t("这是一个面向具身智能研究者的开放研究地图。以技术关键词组织论文，通过有来源的关系连接方法、数据与人物。")}</p><h4>{t("收录边界")}</h4><p>{t("研究方向涵盖动作策略、VLA、世界模型、导航与空间智能、运动控制、灵巧操作、仿真和数据。目录为精选资料，并非完整或实时文献库。年份优先采用首次预印本日期，会议单列。")}</p><h4>{t("关系与人物")}</h4><p>{t("实线代表有来源的方法扩展、蒸馏或资源使用；虚线是编辑推荐的同类比较。点击连线可检查证据。论文作者为节选，署名机构保留发表时信息；机构与人物目录另行核验当前公开归属，并提供官方依据。")}</p><h4>{t("收藏与贡献")}</h4><p>{t("访客收藏保存在当前浏览器，可导入导出；登录收藏保存在云端。社区留言无需账号与密码，邮箱和建议仅维护者可见；结构化论文投稿可选择登录后提交并跟踪审核。只有维护者能批准发布。站外检索由目标网站提供，本站不会自动抓取 Google Scholar。")}</p><h4>{t("数据导出")}</h4><button className="secondary" onClick={() => download('embodied-atlas-catalog.json', catalog)}><Download size={16}/>{t("下载当前研究目录 JSON")}</button></div></Modal>}
    {contribute && <Modal title={user?t("贡献一篇研究"):bi("免登录社区留言","Leave a suggestion")} onClose={closeContribute} wide>{user ? <ContributeForm initial={draft} papers={catalog.papers} onSuccess={async () => { setContribute(false); navigate('proposals'); notify(t("投稿已入库，等待维护者审核")); await refreshProposals(); }}/> : <CommunityInbox user={null} compact initialMessage={[draft.title,draft.url].filter(Boolean).join("\n")}/>}</Modal>}
  </div>;
}
function PaperRow({ paper: p, selected, saved, compare, onSelect, onSave, onCompare }: {
    paper: Paper;
    selected: boolean;
    saved: boolean;
    compare: boolean;
    onSelect: () => void;
    onSave: () => void;
    onCompare: () => void;
}) { const { lang, t, bi } = useI18n(); return <article className={'paper-row' + (selected ? ' active' : '')}><div className="paper-year">{p.year}<span className="lane-dot" style={{ background: lanes[p.lane].color }}/></div><button className="paper-row-main" onClick={onSelect}><div className="row-venue">{p.venue}<span>{bi(lanes[p.lane].name, lanes[p.lane].english)}</span></div><h3>{p.short}<ArrowUpRight size={16}/></h3><p>{p.title}</p><RecognitionBadges paper={p}/><div className="row-tags">{p.tags.slice(0, 4).map(t => <span key={t}>{t}</span>)}</div></button><div className="row-actions"><button className={'icon-button' + (saved ? ' marked' : '')} aria-label={`${saved ? t("取消收藏") : t("收藏")} ${p.short}`} aria-pressed={saved} onClick={onSave}><Bookmark size={17} fill={saved ? 'currentColor' : 'none'}/></button><button className={'icon-button' + (compare ? ' marked' : '')} aria-label={t("{0}对比 {1}", compare ? t("移出") : t("加入"), p.short)} aria-pressed={compare} onClick={onCompare}><GitCompareArrows size={17}/></button></div></article>; }
function Empty({ icon, title, text, action }: {
    icon: React.ReactNode;
    title: string;
    text: string;
    action?: React.ReactNode;
}) { const { lang, t, bi } = useI18n(); return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>; }
function ExternalSources({ query }: {
    query: string;
}) { const { lang, t, bi } = useI18n(); return <div className="external-sources"><div className="major-sources"><Ext href={scholar(query)} className="source-card"><span className="source-symbol scholar">G</span><div><h3>Google Scholar</h3><p>{t("论文、引用与学术人物")}</p></div><ArrowUpRight size={20}/></Ext><Ext href={arxivSearch(query)} className="source-card"><span className="source-symbol arxiv">a<span>χ</span></span><div><h3>arXiv</h3><p>{t("预印本与最新研究")}</p></div><ArrowUpRight size={20}/></Ext></div><div className="conference-header"><h4>{t("会议论文库")}</h4><span>{t("Google 定向检索 \u00B7 携带当前关键词")}</span></div><div className="conference-links">{venues.map(([name, scope]) => <Ext key={name} href={'https://www.google.com/search?q=' + encodeURIComponent(query + ' ' + scope)}>{name}<ArrowUpRight size={14}/></Ext>)}</div></div>; }
function PaperDetail({ paper: p, catalog, saved, compared, onClose, onSave, onCompare, onShare, onTag, onSelect, onFocus, onEdge }: {
    paper: Paper;
    catalog: Catalog;
    saved: boolean;
    compared: boolean;
    onClose: () => void;
    onSave: () => void;
    onCompare: () => void;
    onShare: () => void;
    onTag: (s: string) => void;
    onSelect: (id: string) => void;
    onFocus: () => void;
    onEdge: (e: Edge) => void;
}) {
    const { lang, t, bi } = useI18n();
    const related = catalog.edges.filter(e => e.source === p.id || e.target === p.id);
    const detailRef=useRef<HTMLElement>(null),closeRef=useRef(onClose),[phoneDetail,setPhoneDetail]=useState(false);closeRef.current=onClose;
    useEffect(()=>{const media=window.matchMedia('(max-width:680px)');setPhoneDetail(media.matches);if(!media.matches)return;const root=detailRef.current,previous=document.activeElement as HTMLElement|null;root?.querySelector<HTMLButtonElement>('[data-close-detail]')?.focus();const trap=(e:KeyboardEvent)=>{if(document.querySelector('dialog[open]'))return;if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();closeRef.current();return;}if(e.key!=='Tab'||!root)return;const nodes=[...root.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],summary,select')].filter(n=>n.getClientRects().length);const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};document.addEventListener('keydown',trap,true);return()=>{document.removeEventListener('keydown',trap,true);previous?.focus();}},[]);
    return <aside ref={detailRef} className="detail-panel" role={phoneDetail?"dialog":undefined} aria-modal={phoneDetail||undefined} aria-label={t("{0} 论文详情", p.short)}><div className="detail-top"><span className="tiny-label">Research note</span><div><button className={'icon-button' + (saved ? ' marked' : '')} onClick={onSave} aria-label={saved ? t("取消收藏当前论文") : t("收藏当前论文")}><Bookmark size={16} fill={saved ? 'currentColor' : 'none'}/></button><button className="icon-button" aria-label={t("分享当前论文")} onClick={onShare}><Share2 size={16}/></button><button data-close-detail className="icon-button" aria-label={t("关闭论文详情")} onClick={onClose}><X size={18}/></button></div></div><div className="detail-content"><div className="detail-meta"><span style={{ color: lanes[p.lane].color }}>{bi(lanes[p.lane].name, lanes[p.lane].english)}</span><span>{p.year}</span></div><h2>{p.short}</h2><p className="full-title">{p.title}</p><span className="venue-pill">{p.venue || t("发表场所待核验")}</span>{p.ingestion==='weekly'&&<p className="automatic-note">{bi('每周检索收录 · 来源核验于 ','Weekly import · Sources checked ')}{p.verifiedAt}</p>}<RecognitionBadges paper={p} links/><div className="resource-links">{(p.arxiv || p.sources[0]) && <Ext href={p.arxiv || p.sources[0]}><FileText size={16}/><span>{p.arxiv ? (/arxiv\.org/.test(p.arxiv)?t('论文 / arXiv'):t('论文')) : bi('原始资料','Original source')}</span><ArrowUpRight size={14}/></Ext>}{p.project && <Ext href={p.project}><Globe size={16}/><span>{t("项目主页")}</span><ArrowUpRight size={14}/></Ext>}{p.modelUrl&&<Ext href={p.modelUrl}><Layers size={16}/><span>{bi('模型 / 数据仓库','Model / data repository')}</span><ArrowUpRight size={14}/></Ext>}{p.code && <Ext href={p.code}><Code2 size={16}/><span>{t("代码仓库")}</span><ArrowUpRight size={14}/></Ext>}<Ext href={scholar(p.title)}><Search size={16}/><span>Google Scholar</span><ArrowUpRight size={14}/></Ext></div><div className="detail-section"><h3>{t("技术关键词")}<span>{t("点击检索")}</span></h3><div className="tag-list interactive">{p.tags.map(t => <button key={t} onClick={() => onTag(t)}>{t}</button>)}</div></div><PaperTeamLinks paper={p}/><div className="detail-section"><h3>{t("研究人物")}<span>{t("节选")}</span></h3><div className="author-list">{p.authors.map(a => <div key={a.name}><span className="author-avatar">{a.name.split(' ').map(s => s[0]).slice(0, 2).join('')}</span>{a.url ? <Ext href={a.url} className="author-name">{a.name}<ArrowUpRight size={12}/></Ext> : <span className="author-name">{a.name}</span>}<Ext className="scholar-mini" href={scholar('author:"' + a.name + '"')}>Scholar<ArrowUpRight size={11}/></Ext></div>)}</div>{p.teams.length > 0 && <p className="team-note">{p.teams.join(' · ')}</p>}</div><div className="detail-section"><h3>{t("技术关联")}<span>{related.length}</span></h3>{related.map((e, i) => { const other = catalog.papers.find(q => q.id === (e.source === p.id ? e.target : e.source)); return other ? <div className="related-row" key={i}><button onClick={() => onSelect(other.id)}><span className="relation-label">{e.editorial ? t("同类比较") : e.source === p.id ? t("后续 / 使用") : t("上游 / 来源")} · {lang === 'en' ? (e.labelEn || e.label) : e.label}</span><strong>{other.short}<ArrowUpRight size={13}/></strong></button><button className="evidence-button" aria-label={t("查看与 {0} 的关系依据", other.short)} onClick={() => onEdge(e)}><Link2 size={14}/></button></div> : null; })}{!related.length && <p className="muted">{t("暂未收录相关关系。")}</p>}<button className="focus-button" onClick={onFocus}><GitBranch size={16}/>{t("展开附近脉络")}<ArrowRight size={15}/></button></div><details className="source-details"><summary>{t("简介与核验来源")}<ChevronDown size={14}/></summary><p>{lang === 'en' ? (p.summaryEn || p.summary) : p.summary}</p><div>{p.sources.map((url, i) => <Ext key={url} href={url}>{t("来源 ")}{i + 1}<ArrowUpRight size={12}/></Ext>)}</div><small>{bi('首次公开：','First public release: ')}{p.date}{p.datePrecision==='year'&&bi('（仅核验到年份）',' (year precision)')}{t(" \u00B7 完整作者以原文为准")}</small>{!!p.discoverySources?.length&&<div className="paper-discovery-sources"><small>{bi('发现线索（需结合原始材料核验）','Discovery trail (checked against primary sources)')}</small>{p.discoverySources.map((s,i)=><Ext href={s.url} key={i}>{s.label}<ArrowUpRight size={12}/></Ext>)}</div>}{!!p.verificationNotes?.length&&<div className="verification-notes">{p.verificationNotes.map((n,i)=><p key={i}>{n.supports}</p>)}</div>}</details><button className={'secondary detail-compare' + (compared ? ' active' : '')} onClick={onCompare}><GitCompareArrows size={16}/>{compared ? t("移出论文对比") : t("加入论文对比")}</button></div></aside>;
}
function ProposalRow({ p, admin, onAction }: {
    p: Proposal;
    admin: boolean;
    onAction: (status: string, note?: string) => Promise<void>;
}) { const { lang, t, bi } = useI18n(); const [note, setNote] = useState(''), [busy, setBusy] = useState(false); const action = async (status: string) => { setBusy(true); try {
    await onAction(status, note);
}
finally {
    setBusy(false);
} }; return <article className="proposal-row"><div className="result-meta"><span className={'status-badge ' + p.status}>{{ pending: t("待审核"), approved: t("已收录"), rejected: t("未通过") }[p.status] || p.status}</span><span>{new Date(p.createdAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN')}</span></div><h3>{p.title}</h3><div className="tag-list">{p.keywords.map(k => <span key={k}>{k}</span>)}</div><div className="proposal-links"><Ext href={p.url}>{t("原始论文")}<ArrowUpRight size={12}/></Ext>{p.project && <Ext href={p.project}>{t("项目主页")}<ArrowUpRight size={12}/></Ext>}</div>{p.relationTo && <p className="muted">{t("关系：")}{p.relationTo}{t(" \u2192 本文 \u00B7 ")}{p.evidence} {p.evidenceUrl && <Ext href={p.evidenceUrl}>{t("查看依据")}</Ext>}</p>}{p.reviewNote && <p className="review-note">{t("审核备注：")}{p.reviewNote}</p>}{p.status === 'pending' && (admin ? <div className="review-actions"><input aria-label={t("审核备注 {0}", p.title)} placeholder={t("审核备注（可选）")} value={note} onChange={e => setNote(e.target.value)} maxLength={1000}/><button className="secondary" disabled={busy} onClick={() => action('rejected')}>{t("不予收录")}</button><button className="primary" disabled={busy} onClick={() => action('approved')}><Check size={15}/>{t("审核发布")}</button></div> : <button className="text-button" disabled={busy} onClick={() => action('withdraw')}><Trash2 size={14}/>{t("撤回投稿")}</button>)}</article>; }
function ContributeForm({ initial, papers, onSuccess }: {
    initial: Partial<Proposal>;
    papers: Paper[];
    onSuccess: () => void;
}) {
    const { lang, t, bi } = useI18n();
    const [form, setForm] = useState({ title: initial.title || '', url: initial.url || '', project: initial.project || '', keywords: initial.keywords?.join(', ') || '', year: initial.year || new Date().getFullYear(), lane: initial.lane || 'policy', authors: initial.authors || '', relationTo: '', relationType: 'extends', evidence: '', evidenceUrl: '' }), [busy, setBusy] = useState(false), [resolving, setResolving] = useState(false), [error, setError] = useState('');
    const change = (key: string, value: string | number) => setForm(f => ({ ...f, [key]: value }));
    const resolve = async () => { const id = arxivId(form.url); if (!id) {
        setError(t("填入 arXiv 链接或编号后可自动补全；其他来源请手动填写。"));
        return;
    } setResolving(true); setError(''); try {
        const data = await api<{
            results: ArxivResult[];
        }>('/api/arxiv?id=' + encodeURIComponent(id));
        const p = data.results[0];
        if (!p)
            throw new Error(t("未找到对应论文，请检查编号或手动填写。"));
        setForm(f => ({ ...f, title: p.title, url: p.url, year: Number(p.date.slice(0, 4)), authors: p.authors.join(', ') }));
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setResolving(false);
    } };
    return <form className="contribute-form" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setError(''); try {
        await api('/api/proposals', body({ ...form, url: arxivId(form.url) ? 'https://arxiv.org/abs/' + arxivId(form.url) : form.url, keywords: form.keywords.split(/[,，;；]/).map(t => t.trim()).filter(Boolean), year: Number(form.year) }));
        onSuccess();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }}><p className="modal-description">{t("提供原始链接与技术关键词。审核通过后加入公共图谱；已有论文会自动检查重复。")}</p><label>{t("论文链接 / arXiv 编号 ")}<span>*</span><div className="input-action"><input required value={form.url} onChange={e => change('url', e.target.value)} placeholder="https://arxiv.org/abs/…" maxLength={2048}/><button className="secondary" type="button" disabled={resolving} onClick={resolve}>{resolving ? <LoaderCircle className="spin" size={14}/> : <RefreshCw size={14}/>}{t("自动补全")}</button></div></label><label>{t("论文标题 ")}<span>*</span><input required minLength={3} maxLength={250} value={form.title} onChange={e => change('title', e.target.value)} placeholder={t("论文的完整标题")}/></label><label>{t("技术关键词 ")}<span>*</span><input required maxLength={550} value={form.keywords} onChange={e => change('keywords', e.target.value)} placeholder={t("Diffusion, VLA, Flow Matching（逗号分隔）")}/></label><div className="form-grid"><label>{t("首次发表年份 ")}<span>*</span><input required type="number" min="1990" max={new Date().getFullYear()} value={form.year} onChange={e => change('year', Number(e.target.value))}/></label><label>{t("研究方向")}<select value={form.lane} onChange={e => change('lane', e.target.value)}>{Object.entries(lanes).map(([k, l]) => <option key={k} value={k}>{bi(l.name, l.english)}</option>)}</select></label></div><label>{t("项目主页")}<input type="url" maxLength={2048} value={form.project} onChange={e => change('project', e.target.value)} placeholder={t("https://\u2026（可选）")}/></label><label>{t("作者")}<input value={form.authors} maxLength={500} onChange={e => change('authors', e.target.value)} placeholder={t("姓名以逗号分隔（可选）")}/></label><details className="contribute-relation"><summary><GitBranch size={15}/>{t("补充与已有论文的关系（可选）")}<ChevronDown size={14}/></summary><div className="form-grid"><label>{t("上游 / 对比论文")}<select value={form.relationTo} onChange={e => change('relationTo', e.target.value)}><option value="">{t("不添加关系")}</option>{papers.map(p => <option key={p.id} value={p.id}>{p.short}</option>)}</select></label><label>{t("本文与其关系")}<select value={form.relationType} onChange={e => change('relationType', e.target.value)}><option value="extends">{t("扩展其方法")}</option><option value="distills">{t("从其蒸馏")}</option><option value="uses">{t("使用其方法 / 数据 / 平台")}</option><option value="comparable">{t("同类比较（编辑归类）")}</option></select></label></div><label>{t("关系依据")}<textarea value={form.evidence} onChange={e => change('evidence', e.target.value)} placeholder={t("说明论文原文或官方项目中的依据")} maxLength={2000} required={Boolean(form.relationTo)} minLength={form.relationTo ? 10 : undefined}/></label><label>{t("依据链接")}<input type="url" value={form.evidenceUrl} maxLength={2048} onChange={e => change('evidenceUrl', e.target.value)} required={Boolean(form.relationTo)}/></label></details>{error && <div role="alert" className="form-error"><AlertCircle size={16}/>{t(error)}</div>}<div className="form-footer"><span><ShieldCheck size={15}/>{t("提交后进入审核，不会立即公开")}</span><button className="primary" type="submit" disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <Plus size={16}/>}{t("提交审核")}</button></div></form>;
}
