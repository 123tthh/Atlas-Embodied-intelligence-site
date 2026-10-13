import { env } from 'cloudflare:workers';
import { eq } from 'drizzle-orm';
import { getChatGPTUser } from '../app/chatgpt-auth';
import { getDb } from '../db';
import { proposals,automaticPapers } from '../db/schema';
import seed from './catalog.json';
import { arxivId } from './domain';
import type { Catalog, Paper, Edge, Proposal } from './types';
export async function identity() {
  const user=await getChatGPTUser();
  const admins=((env as unknown as {ADMIN_EMAILS?:string}).ADMIN_EMAILS??'').split(',').map(s=>s.trim().toLowerCase()).filter(Boolean);
  return user?{...user,isAdmin:admins.includes(user.email.toLowerCase())}:null;
}
export function checkOrigin(request:Request) {const origin=request.headers.get('origin');return origin===new URL(request.url).origin&&request.headers.get('content-type')?.startsWith('application/json');}
export const error=(message:string,status=400)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export const privateJson=(value:unknown,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
export async function catalog():Promise<Catalog>{
  const rows=await getDb().select().from(proposals).where(eq(proposals.status,'approved'));
  const papers=[...seed.papers] as Paper[],edges=[...seed.edges] as Edge[];
  for(const row of rows){const p=JSON.parse(row.payload) as Proposal;const id='community-'+row.id;papers.push({id,title:p.title,short:p.title.length>48?p.title.slice(0,45)+'…':p.title,year:p.year,date:String(p.year),venue:'社区收录',tags:p.keywords,lane:p.lane,project:p.project,arxiv:arxivId(p.url)?p.url:'',code:'',authors:p.authors.split(/[,，;；]/).filter(Boolean).map(name=>({name:name.trim()})),teams:[],summary:'社区提交并经维护者审核的研究条目。',sources:[p.url,...(p.evidenceUrl?[p.evidenceUrl]:[])]});if(p.relationTo&&papers.some(q=>q.id===p.relationTo))edges.push({source:p.relationTo,target:id,type:p.relationType,label:{extends:'方法扩展',distills:'蒸馏',uses:'使用',comparable:'同类比较'}[p.relationType],evidence:p.evidence,url:p.evidenceUrl,editorial:p.relationType==='comparable'});}
  const automatic=await getDb().select().from(automaticPapers);for(const row of automatic){const p=JSON.parse(row.payload) as Paper;if(!papers.some(q=>q.id===p.id))papers.push(p);}
  const updated=automatic.reduce((date,r)=>{const checked=(JSON.parse(r.payload) as Paper).verifiedAt||'';return checked>date?checked:date;},seed.updated);
  return {...seed,papers,edges,updated} as Catalog;
}
