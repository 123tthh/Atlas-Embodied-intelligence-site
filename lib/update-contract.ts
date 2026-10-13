import {z} from 'zod';
import {canonicalUrl,normalize} from './domain';
import type {Paper} from './types';

const url=z.string().url().max(2048).refine(value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[)/.test(u.hostname);}catch{return false;}},'Use a public HTTPS source');
const optionalUrl=z.union([url,z.literal('')]).default('');
const day=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>!Number.isNaN(Date.parse(v))&&v<=new Date().toISOString().slice(0,10),'Date must not be in the future');
export const updatePaper=z.object({
 title:z.string().min(5).max(400),short:z.string().min(2).max(100),date:day,workKind:z.enum(['paper','model','dataset','benchmark']).default('paper'),
 lane:z.enum(['policy','vla','data','world','navigation','locomotion','dexterity','simulation']),
 venue:z.string().max(150),publicationStatus:z.enum(['peer-reviewed','preprint','technical-release']),
 tags:z.array(z.string().min(1).max(60)).min(1).max(12),
 authors:z.array(z.object({name:z.string().min(1).max(150)})).min(1).max(100),
 summary:z.string().min(30).max(3000),summaryEn:z.string().max(3000).optional(),
 arxiv:optionalUrl,project:optionalUrl,code:optionalUrl,modelUrl:optionalUrl,
 sources:z.array(url).min(1).max(8),
 checks:z.array(z.object({url,supports:z.string().min(20).max(1500)})).min(1).max(8),
}).strict().superRefine((p,ctx)=>{if(p.checks.some(c=>!p.sources.some(s=>canonicalUrl(s)===canonicalUrl(c.url))))ctx.addIssue({code:'custom',message:'Every source check must reference a supplied primary source'});if(p.arxiv&&!p.sources.some(s=>canonicalUrl(s)===canonicalUrl(p.arxiv)))ctx.addIssue({code:'custom',message:'Include the paper URL among sources'});});
export const updateBatch=z.object({action:z.literal('ingest'),runId:z.string().regex(/^[a-zA-Z0-9_-]{8,80}$/),windowStart:day,windowEnd:day,status:z.enum(['success','partial','failed']),summary:z.string().min(10).max(2000),searchedSources:z.array(url).min(1).max(40),failures:z.array(z.string().max(300)).max(20).default([]),papers:z.array(updatePaper).max(30)}).strict().superRefine((b,ctx)=>{if(b.windowStart>b.windowEnd)ctx.addIssue({code:'custom',message:'Invalid search window'});if(b.status==='failed'&&b.papers.length)ctx.addIssue({code:'custom',message:'A failed run cannot publish papers'});});
export type UpdateBatch=z.infer<typeof updateBatch>;
export function duplicatePaper(candidate:{title:string;sources:string[];arxiv?:string},papers:Paper[]){const urls=new Set([...candidate.sources,candidate.arxiv||''].filter(Boolean).map(canonicalUrl));return papers.some(p=>normalize(p.title)===normalize(candidate.title)||[p.arxiv,...p.sources].filter(Boolean).some(u=>urls.has(canonicalUrl(u))));}
export function toAutomaticPaper(p:z.infer<typeof updatePaper>,id:string,verifiedAt:string):Paper{const {checks,...record}=p;return {...record,id,year:Number(p.date.slice(0,4)),teams:[],organizationIds:[],labIds:[],verifiedAt,ingestion:'weekly',verificationNotes:checks};}
