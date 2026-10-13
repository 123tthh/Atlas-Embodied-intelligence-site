import type {Directory,Paper,ResearchWork} from './types';

export type ResearchOrder='evidence'|'reviewed'|'recent'|'name';
export type ResearchScore={score:number;works:number;reviewed:number;journals:number;artifacts:number;recent:number;latest:string};
type WorkEvidence={id:string;date:string;venue?:string;reviewed:boolean;artifacts:number;paperUrl?:string};
export const researchOrder=(value:string|null):ResearchOrder=>['evidence','reviewed','recent','name'].includes(value||'')?value as ResearchOrder:'evidence';
export const isRoboticsJournal=(venue:string)=>/Science Robotics|Transactions on Robotics|\bT-RO\b|International Journal of Robotics Research|\bIJRR\b|Robotics and Automation Letters|\bRA-L\b|Autonomous Robots|Advanced Robotics|Field Robotics|Soft Robotics|Robotics and Autonomous Systems|Frontiers in Robotics|Robotics [&a-z ]*Automation Magazine|Advanced Intelligent Systems|Transactions on Automation Science/i.test(venue);
const empty=():ResearchScore=>({score:0,works:0,reviewed:0,journals:0,artifacts:0,recent:0,latest:''});
function scoreEvidence(works:WorkEvidence[],cutoff:string):ResearchScore{
 const result=empty(),seen=new Set<string>(),recentYear=Number(cutoff.slice(0,4))-1;
 for(const w of works){const arxiv=w.paperUrl?.match(/arxiv\.org\/(?:abs|pdf)\/(\d{4}\.\d{4,5})/)?.[1],key=arxiv||w.id;if(seen.has(key))continue;seen.add(key);
  const journal=w.reviewed&&isRoboticsJournal(w.venue||''),artifacts=Math.min(2,w.artifacts),recent=Number(w.date.slice(0,4))>=recentYear&&w.date<=cutoff;
  result.works++;result.reviewed+=Number(w.reviewed);result.journals+=Number(journal);result.artifacts+=artifacts;result.recent+=Number(recent);result.latest=result.latest>w.date?result.latest:w.date;
  result.score+=1+4*Number(w.reviewed)+2*Number(journal)+artifacts+Number(recent);
 }
 return result;
}
export function scoreWorks(works:ResearchWork[],cutoff='2026-10-13'){return scoreEvidence(works.map(w=>({id:w.id,date:w.date,venue:w.venue,reviewed:w.status==='peer-reviewed',artifacts:['weights','code','data'].filter(s=>w.signals.includes(s as 'weights'|'code'|'data')).length,paperUrl:w.paperUrl})),cutoff)}
export function scorePapers(papers:Paper[],cutoff='2026-10-13'){return scoreEvidence(papers.map(p=>({id:p.id,date:p.date||String(p.year||''),venue:p.venue,reviewed:p.publicationStatus==='peer-reviewed',artifacts:Number(!!p.code)+Number(!!p.modelUrl),paperUrl:p.arxiv})),cutoff)}
export function organizationScores(data:Directory){return new Map(data.organizations.map(o=>[o.id,scoreWorks((data.works||[]).filter(w=>w.organizationIds.includes(o.id)),data.verifiedAt)]))}
export function labScores(data:Directory){return new Map(data.labs.map(l=>[l.id,scoreWorks((data.works||[]).filter(w=>w.labIds.includes(l.id)),data.verifiedAt)]))}
export function compareResearch(a:ResearchScore,b:ResearchScore,order:ResearchOrder='evidence'){
 if(order==='name')return 0;
 if(order==='recent')return b.latest.localeCompare(a.latest)||b.score-a.score;
 if(order==='reviewed')return b.reviewed-a.reviewed||b.journals-a.journals||b.score-a.score;
 return b.score-a.score||b.reviewed-a.reviewed||b.latest.localeCompare(a.latest);
}
export function sortResearchEntities<T extends {id:string;name:string}>(entities:T[],scores:Map<string,ResearchScore>,order:ResearchOrder='evidence'){return [...entities].sort((a,b)=>compareResearch(scores.get(a.id)||empty(),scores.get(b.id)||empty(),order)||a.name.localeCompare(b.name))}
