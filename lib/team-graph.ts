import type {Directory,Paper,TeamReview} from './types';
import {scorePapers,compareResearch} from './relevance';
import type {ResearchScore} from './relevance';
import type {GraphColumn} from './graph-layout';
export type TeamLine=GraphColumn&{kind:'lab'|'organization';organizationId:string;url:string;summaryZh:string;summaryEn:string;review:TeamReview;eligible:boolean;score:ResearchScore};
const colors=['#877260','#657d78','#85738b','#9b756a','#797e5f','#65748a'];
const validSources=(sources:TeamReview['sources']|undefined)=>!!sources?.some(s=>/^https:\/\//.test(s.url));
export function teamCandidates(papers:Paper[],directory:Directory,reviews:TeamReview[]):TeamLine[]{
 const lines:TeamLine[]=[];
 for(const review of reviews){
  const kind=review.lineId.startsWith('lab:')?'lab':'organization',key=review.lineId.slice(4);
  const entity=kind==='lab'?directory.labs.find(l=>l.id===key):directory.organizations.find(o=>o.id===key);
  if(!entity)continue;
  const organizationId='organizationId' in entity?entity.organizationId:entity.id;
  const company=directory.organizations.find(o=>o.id===organizationId)?.type==='company';
  const attributed=papers.filter(p=>kind==='lab'?p.labIds?.includes(key):p.organizationIds?.includes(key));
  const ids=[...new Set(review.paperIds)].filter(id=>attributed.some(p=>p.id===id));
  const researchEvidence=attributed.some(p=>ids.includes(p.id)&&p.publicationStatus==='peer-reviewed')||validSources(review.evaluationSources)||validSources(review.modelEvaluationSources);
  const robotEvidence=validSources(review.realRobotSources),modelEvidence=(review.validationMode==='model'||review.validationMode==='mixed')&&validSources(review.modelEvaluationSources);
  const industryEvidence=!company||((review.validationMode==='mixed'?robotEvidence&&modelEvidence:review.validationMode==='model'?modelEvidence:robotEvidence)&&validSources(review.artifactSources));
  const eligible=review.status==='approved'&&ids.length>=2&&validSources(review.sources)&&researchEvidence&&industryEvidence;
  lines.push({id:review.lineId,zh:entity.nameZh||entity.name,en:entity.name,kind,organizationId,url:entity.url,summaryZh:entity.summaryZh,summaryEn:entity.summaryEn,paperIds:ids,color:colors[lines.length%colors.length],review,eligible,score:scorePapers(attributed.filter(p=>ids.includes(p.id)),directory.verifiedAt)});
 }
 return lines.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||compareResearch(a.score,b.score)||a.en.localeCompare(b.en));
}
export function teamLines(papers:Paper[],directory:Directory,reviews:TeamReview[]=[]):TeamLine[]{return teamCandidates(papers,directory,reviews).filter(l=>l.eligible);}
export function chosenTeamLines(lines:TeamLine[],ids:string[]){return [...new Set(ids)].map(id=>lines.find(l=>l.id===id)).filter((v):v is TeamLine=>!!v).slice(0,4);}
export function teamPaperIds(lines:TeamLine[]){return new Set(lines.flatMap(l=>l.paperIds));}
