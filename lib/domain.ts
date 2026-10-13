import type { Paper, Edge } from './types';
export const lanes = {
  policy: { name: '动作策略', english: 'Action policies', color: '#7a705c' },
  vla: { name: '视觉 · 语言 · 动作', english: 'Vision–language–action', color: '#946a50' },
  world: { name: '世界模型与规划', english: 'World models & planning', color: '#8b7157' },
  navigation: { name: '导航与空间智能', english: 'Navigation & spatial AI', color: '#667f7a' },
  locomotion: { name: '运动控制与人形', english: 'Locomotion & humanoids', color: '#7d7287' },
  dexterity: { name: '灵巧操作与触觉', english: 'Dexterity & touch', color: '#956f74' },
  simulation: { name: '仿真与训练', english: 'Simulation & training', color: '#7b7c64' },
  data: { name: '数据与通用策略', english: 'Data & generalists', color: '#74785f' },
};
const aliases = [ ['diffusion','扩散'], ['vla','vision language action','视觉语言动作'], ['imitation learning','模仿学习'], ['point cloud','点云','3d'], ['distillation','蒸馏'], ['flow matching','流匹配'], ['action chunking','动作分块','动作序列'], ['fine tuning','finetuning','微调'], ['reinforcement learning','强化学习'], ['world model','世界模型'], ['teleoperation','遥操作'], ['navigation','导航'], ['tactile','touch','触觉'], ['humanoid','人形'], ['simulation','仿真'], ['dexterous','dexterity','灵巧'], ['locomotion','legged','足式','运动控制'] ];
export function normalize(text: string) { return text.toLowerCase().normalize('NFKC').replace(/[\-_·]/g,' ').replace(/\s+/g,' ').trim(); }
export function searchPapers(papers: Paper[], query: string) {
  const terms = normalize(query).split(' ').filter(Boolean);
  return papers.filter(p => { let text = normalize([p.short,p.title,p.arxiv,p.venue,...p.tags,lanes[p.lane].name,lanes[p.lane].english,...(p.subfields||[]),...p.teams,...p.authors.flatMap(a=>[a.name,a.nameZh||''])].join(' '));for (const group of aliases) if (group.some(alias => text.includes(alias))) text += ' '+group.join(' ');return terms.every(term => text.includes(term)); });
}
export function arxivId(value: string): string | null {
  const trimmed=value.trim();if (/^\d{4}\.\d{4,5}(v\d+)?$/.test(trimmed)) return trimmed.replace(/v\d+$/,'');
  try { const url=new URL(trimmed);if(!['arxiv.org','www.arxiv.org','export.arxiv.org'].includes(url.hostname))return null;return url.pathname.match(/^\/(?:abs|pdf|html)\/(\d{4}\.\d{4,5})(?:v\d+)?(?:\.pdf)?\/?$/)?.[1] ?? null; } catch{return null;}
}
export function safeUrl(value: string) { try { const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password ? u.href : ''; } catch {return '';} }
export function canonicalUrl(value: string) { const id=arxivId(value);if(id)return 'https://arxiv.org/abs/'+id;const s=safeUrl(value);if(!s)return '';const u=new URL(s);u.hash='';for(const key of [...u.searchParams.keys()])if(key.startsWith('utm_'))u.searchParams.delete(key);return u.href.replace(/\/$/,''); }
export function scholar(query: string) {return 'https://scholar.google.com/scholar?hl=en&q='+encodeURIComponent(query);}
export function arxivSearch(query: string) {return 'https://arxiv.org/search/?searchtype=all&query='+encodeURIComponent(query)+'&order=-announced_date_first&size=50';}
export const venues = [['RSS','site:roboticsproceedings.org'],['CoRL','site:proceedings.mlr.press "Conference on Robot Learning"'],['ICRA','site:ieeexplore.ieee.org "International Conference on Robotics and Automation"'],['IROS','site:ieeexplore.ieee.org "Intelligent Robots and Systems"'],['CVPR','site:openaccess.thecvf.com CVPR'],['ICCV','site:openaccess.thecvf.com ICCV'],['ECCV','site:ecva.net'],['IEEE RA-L','site:ieeexplore.ieee.org \"Robotics and Automation Letters\"'],['IEEE T-RO','site:ieeexplore.ieee.org \"Transactions on Robotics\"'],['Science Robotics','site:science.org/journal/scirobotics'],['NeurIPS','site:proceedings.neurips.cc'],['ICLR','site:openreview.net ICLR'],['ICML','site:proceedings.mlr.press "International Conference on Machine Learning"']];
export function neighbors(id: string, edges: Edge[], depth=1) {const seen=new Set([id]);for(let d=0;d<depth;d++){for(const e of edges.filter(e=>seen.has(e.source)||seen.has(e.target))){seen.add(e.source);seen.add(e.target);}}return seen;}
export function importBookmarks(input: unknown, papers: Paper[]): string[] {
  if(!input||typeof input!=='object'||!('bookmarks' in input)||!Array.isArray(input.bookmarks))throw new Error('请选择本站导出的收藏 JSON 文件');
  if(input.bookmarks.length>5000)throw new Error('一次最多导入 5000 个条目');
  const allowed=new Set(papers.map(p=>p.id));return [...new Set(input.bookmarks.filter((v):v is string=>typeof v==='string'&&allowed.has(v)))];
}
export function decodeXml(text: string) {return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):parseInt(n,10);return code>=0&&code<=0x10ffff?String.fromCodePoint(code):'';}).replace(/&(amp|lt|gt|quot|apos);/g,(_,s)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[s as 'amp']));}
export function parseAtom(xml: string) {return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(m=>{const entry=m[1];const get=(tag:string)=>decodeXml(entry.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>'))?.[1]??'').replace(/\s+/g,' ').trim();return {title:get('title'),url:get('id').replace('http:','https:'),date:get('published').slice(0,10),summary:get('summary'),authors:[...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map(m=>decodeXml(m[1]))};}).filter(p=>p.title&&arxivId(p.url));}
