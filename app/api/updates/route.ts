import {desc,eq} from 'drizzle-orm';
import {z} from 'zod';
import {getDb} from '../../../db';
import {automaticPapers,updateRuns,updateSettings} from '../../../db/schema';
import {catalog,error,privateJson} from '../../../lib/server';
import {canonicalUrl} from '../../../lib/domain';
import {duplicatePaper,toAutomaticPaper,updateBatch} from '../../../lib/update-contract';
import {authorizedUpdater,digest} from '../../../lib/update-auth';
import {reviewPolicy} from '../../../lib/review-contract';
export async function GET(){try{const db=getDb(),rows=await db.select().from(updateRuns).orderBy(desc(updateRuns.createdAt)).limit(12),settings=await db.select().from(updateSettings).where(eq(updateSettings.key,'schedule'));return privateJson({revision:1,communityReview:reviewPolicy,schedule:settings[0]?JSON.parse(settings[0].payload):{enabled:false},runs:rows.map(r=>({...JSON.parse(r.payload),runId:r.id,createdAt:r.createdAt})),instructions:'/api/updates/instructions'});}catch{return error('更新记录暂时无法读取',503);}}
export async function POST(request:Request){
 if(!await authorizedUpdater(request)){await request.body?.cancel().catch(()=>{});return error('Updater authorization required',401);}
 if(!request.headers.get('content-type')?.startsWith('application/json'))return error('Expected JSON',415);
 const raw=await request.text();if(raw.length>220000)return error('Batch too large',413);let value;try{value=JSON.parse(raw);}catch{return error('Invalid JSON');}
 const db=getDb();
 if(value?.action==='configure'){
  const result=z.object({action:z.literal('configure'),enabled:z.boolean(),automationId:z.string().min(1).max(150),timezone:z.literal('Asia/Shanghai'),cadenceDays:z.literal(7),time:z.string().regex(/^\d{2}:\d{2}$/),weekday:z.literal('Tuesday')}).strict().safeParse(value);if(!result.success)return error('Invalid schedule metadata');
  await db.insert(updateSettings).values({key:'schedule',payload:JSON.stringify(result.data)}).onConflictDoUpdate({target:updateSettings.key,set:{payload:JSON.stringify(result.data)}});return privateJson({saved:true,schedule:result.data});
 }
 const parsed=updateBatch.safeParse(value);if(!parsed.success)return error(parsed.error.issues.map(e=>e.path.join('.')+': '+e.message).join('; ').slice(0,1500));const batch=parsed.data,fingerprint=await digest(raw);
 const existing=await db.select().from(updateRuns).where(eq(updateRuns.id,batch.runId));if(existing[0])return existing[0].fingerprint===fingerprint?privateJson({...JSON.parse(existing[0].payload),runId:batch.runId,replayed:true}):error('runId already exists with different content',409);
 const current=await catalog(),accepted=[],skipped:string[]=[],now=new Date().toISOString();
 for(const p of batch.papers){if(duplicatePaper(p,[...current.papers,...accepted])){skipped.push(p.title);continue;}const canonical=canonicalUrl(p.arxiv||p.sources[0]),id='auto-'+(await digest(canonical)).slice(0,20);accepted.push(toAutomaticPaper(p,id,now.slice(0,10)));}
 const result={status:batch.status,windowStart:batch.windowStart,windowEnd:batch.windowEnd,summary:batch.summary,searchedSources:batch.searchedSources,failures:batch.failures,added:accepted.map(p=>({id:p.id,title:p.title,url:p.arxiv||p.sources[0]})),skipped};
 try{await db.batch([db.insert(updateRuns).values({id:batch.runId,fingerprint,payload:JSON.stringify(result),createdAt:Date.now()}),...accepted.map(p=>db.insert(automaticPapers).values({id:p.id,canonical:canonicalUrl(p.arxiv||p.sources[0]),payload:JSON.stringify(p),createdAt:Date.now(),runId:batch.runId}))]);return privateJson({...result,runId:batch.runId});}catch{return error('Update was not committed. Read the run log before retrying the same runId.',409);}
}
