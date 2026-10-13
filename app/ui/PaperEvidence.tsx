'use client';
import {Award,ArrowUpRight,FlaskConical} from 'lucide-react';
import type {Paper,Directory,TeamReview} from '../../lib/types';
import {recognitionFilters,venueGroups} from '../../lib/paper-evidence';
import {safeUrl} from '../../lib/domain';
import reviewJson from '../../lib/team-reviews.json';
import catalogJson from '../../lib/catalog.json';
import {teamLines} from '../../lib/team-graph';
import directoryJson from '../../lib/directory.json';
import {useI18n} from './Language';
const data=directoryJson as Directory;
const eligible=new Set(teamLines(catalogJson.papers as Paper[],data,reviewJson as TeamReview[]).map(l=>l.id));
export function PaperEvidenceFilters({venue,recognition,onVenue,onRecognition}:{venue:string;recognition:string;onVenue:(v:string)=>void;onRecognition:(v:string)=>void}){const {bi}=useI18n();return <><label className="filter-select"><select aria-label={bi('按会议或期刊筛选','Filter by conference or journal')} value={venue} onChange={e=>onVenue(e.target.value)}>{Object.entries(venueGroups).map(([k,n])=><option key={k} value={k}>{bi(n[0],n[1])}</option>)}</select></label><label className="filter-select"><Award size={14}/><select aria-label={bi('按展示与奖项筛选','Filter by presentation or award')} value={recognition} onChange={e=>onRecognition(e.target.value)}>{Object.entries(recognitionFilters).map(([k,n])=><option key={k} value={k}>{bi(n[0],n[1])}</option>)}</select></label></>}
export function RecognitionBadges({paper,links=false}:{paper:Paper;links?:boolean}){const {bi}=useI18n();if(!paper.recognitions?.length)return null;return <div className="recognition-badges">{paper.recognitions.map((r,i)=>links?<a key={i} href={safeUrl(r.sourceUrl)} target="_blank" rel="noopener noreferrer" title={r.venue+' '+r.year}><Award size={12}/>{r.label}<ArrowUpRight size={10}/></a>:<span key={i} title={bi('点击论文后查看官方依据','Open the paper for the official source')}><Award size={11}/>{r.label}</span>)}</div>}
export function PaperTeamLinks({paper}:{paper:Paper}){const {bi,lang}=useI18n();const labs=(paper.labIds||[]).filter(id=>eligible.has('lab:'+id)).map(id=>data.labs.find(l=>l.id===id)).filter(Boolean),orgs=(paper.organizationIds||[]).filter(id=>eligible.has('org:'+id)).map(id=>data.organizations.find(o=>o.id===id)).filter(Boolean);if(!labs.length&&!orgs.length)return null;return <div className="paper-team-links"><h3>{bi('团队技术主线','Team research lines')}</h3>{labs.map(l=>l&&<a key={l.id} href={`/?view=teamgraph&tlines=${encodeURIComponent('lab:'+l.id)}&lang=${lang}`}><FlaskConical size={12}/>{bi(l.nameZh||l.name,l.name)}<ArrowUpRight size={12}/></a>)}{orgs.map(o=>o&&<a key={o.id} href={`/?view=teamgraph&tlines=${encodeURIComponent('org:'+o.id)}&lang=${lang}`}>{bi(o.nameZh||o.name,o.name)}<ArrowUpRight size={12}/></a>)}<small>{bi('署名与合作归属，不表示独家成果。','Attribution and collaboration, not exclusive ownership.')}</small></div>}
