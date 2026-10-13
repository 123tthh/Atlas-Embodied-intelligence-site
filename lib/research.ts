import type {Directory,ResearchWork} from './types';
export const evidenceFilters = {verified:['有代表成果','With research evidence'],reviewed:['已发表论文','Peer-reviewed papers'],weights:['公开权重','Released weights'],code:['公开代码','Released code'],data:['公开数据','Released data'],all:['全部机构目录','All directory records']} as const;
export type EvidenceFilter=keyof typeof evidenceFilters;
export function evidenceFilter(value:string|null):EvidenceFilter{return value&&value in evidenceFilters?value as EvidenceFilter:'verified';}
export function worksFor(data:Directory,organizationId:string,labId?:string){return (data.works||[]).filter(w=>w.organizationIds.includes(organizationId)&&(!labId||w.labIds.includes(labId))).sort((a,b)=>b.date.localeCompare(a.date));}
export function workMatchesEvidence(w:ResearchWork,filter:EvidenceFilter){return filter==='all'||filter==='verified'||(filter==='reviewed'?w.status==='peer-reviewed':w.signals.includes(filter));}
export function organizationMatchesEvidence(data:Directory,id:string,filter:EvidenceFilter){return filter==='all'||worksFor(data,id).some(w=>workMatchesEvidence(w,filter));}
export function researchStats(data:Directory,ids?:string[]){const works=(data.works||[]).filter(w=>!ids||w.organizationIds.some(id=>ids.includes(id)));return {works:works.length,organizations:new Set(works.flatMap(w=>w.organizationIds).filter(id=>!ids||ids.includes(id))).size,reviewed:works.filter(w=>w.status==='peer-reviewed').length,weights:works.filter(w=>w.signals.includes('weights')).length};}
