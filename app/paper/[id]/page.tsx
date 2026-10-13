import Atlas from '../../ui/Atlas';
import { notFound } from 'next/navigation';
import { identity, catalog } from '../../../lib/server';
import seed from '../../../lib/catalog.json';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{id:string}>}){const {id}=await params;const p=seed.papers.find(p=>p.id===id)||(id.startsWith('community-')?(await catalog()).papers.find(p=>p.id===id):undefined);return {title:p?`${p.short} · Embodied Atlas`:'论文 · Embodied Atlas',description:p?`${p.title} — ${p.tags.join('、')}。查看技术脉络、作者和项目来源。`:'探索具身智能论文的技术脉络。'};}
export default async function PaperPage({params}:{params:Promise<{id:string}>}){const {id}=await params;const exists=seed.papers.some(p=>p.id===id)||(id.startsWith('community-')&&(await catalog()).papers.some(p=>p.id===id));if(!exists)notFound();const user=await identity();return <Atlas initialId={id} user={user?{displayName:user.displayName,isAdmin:user.isAdmin}:null}/>;}
