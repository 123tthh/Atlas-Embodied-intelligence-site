import type {Paper, Person} from './types';

export type ResearcherNode = {
  id:string; name:string; nameZh:string; aliases:string[]; homepage:string;
  personId?:string; paperIds:string[]; identity:'profile'|'full-name'|'paper-only';
};
export type CollaborationEdge = {id:string; source:string; target:string; paperIds:string[]};
export type ResearcherNetwork = {
  nodes:ResearcherNode[]; edges:CollaborationEdge[];
  nodeById:Map<string,ResearcherNode>; edgeById:Map<string,CollaborationEdge>;
  adjacency:Map<string,Map<string,CollaborationEdge>>; papers:Map<string,Paper>;
  authorPaperCount:number; totalPaperCount:number; excludedAuthorCount:number;
};
export const researcherKey=(name:string)=>name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export const collaborationKey=(a:string,b:string)=>JSON.stringify([a,b].sort());
const cleanName=(name:string)=>name.replace(/[\*†‡§]+/g,'').trim();
const urlKey=(value:string)=>{try{const u=new URL(value);return /https?:/.test(u.protocol)?u.host.toLowerCase()+u.pathname.replace(/\/$/,''):'';}catch{return '';}};
const collective=(name:string)=>/\b(team|contributors?|consortium|collaboration|research|robotics|nvidia|openai|deepmind|et\s*al)\b/i.test(name)||!name.trim();
const fullName=(name:string)=>/^[\p{Script=Han}]{2,6}$/u.test(name)||name.split(/[\s-]+/).filter(Boolean).length>1&&!name.split(/[\s-]+/).some(part=>/^[A-Za-z]\.?$/.test(part));

/** A name match is a catalog identity, never evidence of friendship or mentorship. */
export function buildResearcherNetwork(papers:Paper[],people:Person[],options:{throughYear?:number;minimumPapers?:number}={}):ResearcherNetwork {
  const aliases=new Map<string,Person[]>(),homeOwners=new Map<string,Set<string>>();
  for(const p of people)for(const a of new Set([p.name,p.nameZh,...p.aliases||[]].filter(Boolean).map(researcherKey))){const list=aliases.get(a)||[];list.push(p);aliases.set(a,list);}
  // Conflicting homepages keep homonyms apart. Missing URLs cannot bridge these identities.
  for(const p of papers)for(const a of p.authors){const name=researcherKey(cleanName(a.name)),url=urlKey(a.url||'');if(url){const set=homeOwners.get(name)||new Set();set.add(url);homeOwners.set(name,set);}}
  const nodes=new Map<string,ResearcherNode>(people.map(p=>[p.id,{id:p.id,name:p.name,nameZh:p.nameZh,aliases:p.aliases||[],homepage:p.homepage,personId:p.id,paperIds:[],identity:'profile'}]));
  const edges=new Map<string,CollaborationEdge>(),records=new Map<string,Paper>(),seenPapers=new Set<string>();let authorPaperCount=0,excludedAuthorCount=0;
  for(const paper of papers){
    if(options.throughYear&&paper.year>options.throughYear)continue;
    const arxiv=paper.arxiv?.match(/(?:abs|pdf)\/(\d{4}\.\d{4,5})/)?.[1],canonical=arxiv||paper.id;
    if(seenPapers.has(canonical))continue;seenPapers.add(canonical);records.set(paper.id,paper);
    const authors=new Set<string>();
    for(const author of paper.authors){
      const name=cleanName(author.name);if(collective(name)){excludedAuthorCount++;continue;}
      const key=researcherKey(name),url=urlKey(author.url||''),candidates=aliases.get(key)||[];
      const explicit=author.personId?people.find(p=>p.id===author.personId):undefined;
      const matches=candidates.filter(p=>p.researchPaperIds?.includes(paper.id)||(url&&urlKey(p.homepage)===url));
      const conflict=(homeOwners.get(key)?.size||0)>1;
      const person=explicit||(matches.length===1?matches[0]:candidates.length===1&&!conflict&&!url?candidates[0]:candidates.length===1&&urlKey(candidates[0].homepage)===url?candidates[0]:undefined);
      const uncertain=!fullName(name)||candidates.length>1||(conflict&&!url);
      const id=person?.id||`author:${key}${uncertain?':paper:'+paper.id:conflict?':url:'+encodeURIComponent(url):''}`;
      if(!nodes.has(id))nodes.set(id,{id,name,nameZh:author.nameZh||'',aliases:[],homepage:author.url||'',paperIds:[],identity:uncertain?'paper-only':'full-name'});
      const node=nodes.get(id)!;if(!node.homepage&&author.url)node.homepage=author.url;if(!node.nameZh&&author.nameZh)node.nameZh=author.nameZh;
      if(!node.paperIds.includes(paper.id))node.paperIds.push(paper.id);authors.add(id);
    }
    const ids=[...authors].sort();if(ids.length>=2)authorPaperCount++;
    for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){const id=collaborationKey(ids[a],ids[b]),edge=edges.get(id)||{id,source:ids[a],target:ids[b],paperIds:[]};edge.paperIds.push(paper.id);edges.set(id,edge);}
  }
  const retained=[...edges.values()].filter(e=>e.paperIds.length>=(options.minimumPapers||1));
  const adjacency=new Map([...nodes.keys()].map(id=>[id,new Map<string,CollaborationEdge>()]));
  for(const edge of retained){adjacency.get(edge.source)!.set(edge.target,edge);adjacency.get(edge.target)!.set(edge.source,edge);}
  return {nodes:[...nodes.values()],edges:retained,nodeById:nodes,edgeById:new Map(retained.map(e=>[e.id,e])),adjacency,papers:records,authorPaperCount,totalPaperCount:records.size,excludedAuthorCount};
}

/** Unweighted BFS over the full filtered network, independent of display limits. */
export function shortestResearcherPath(network:ResearcherNetwork,from:string,to:string):string[]|null {
  if(!network.nodeById.has(from)||!network.nodeById.has(to))return null;
  const parent=new Map<string,string|null>([[from,null]]),queue=[from];
  for(let i=0;i<queue.length;i++){
    const current=queue[i];if(current===to){const path:string[]=[];for(let id:string|null=to;id!==null;id=parent.get(id)??null)path.unshift(id);return path;}
    for(const next of [...(network.adjacency.get(current)?.keys()||[])].sort((a,b)=>Number(!!network.nodeById.get(b)?.personId)-Number(!!network.nodeById.get(a)?.personId)||a.localeCompare(b)))if(!parent.has(next)){parent.set(next,current);queue.push(next);}
  }
  return null;
}

export function researcherNeighborhood(network:ResearcherNetwork,center:string,depth:number,limit=60){
  const distance=new Map<string,number>(),parent=new Map<string,string>();if(!network.nodeById.has(center))return {ids:[],distance,parent,total:0};
  distance.set(center,0);const queue=[center];
  for(let i=0;i<queue.length;i++){const current=queue[i],level=distance.get(current)!;if(level>=depth)continue;for(const [next]of [...network.adjacency.get(current)||[]].sort((a,b)=>b[1].paperIds.length-a[1].paperIds.length||a[0].localeCompare(b[0]))){if(!distance.has(next)){distance.set(next,level+1);parent.set(next,current);queue.push(next);}}}
  return {ids:queue.slice(0,Math.max(1,limit)),distance,parent,total:queue.length};
}

export function searchResearchers(network:ResearcherNetwork,query:string,limit=10){
  const q=researcherKey(query);
  return network.nodes.filter(n=>!q||[n.name,n.nameZh,...n.aliases].some(v=>researcherKey(v).includes(q))).sort((a,b)=>{
    const exact=(n:ResearcherNode)=>Number(!!q&&[n.name,n.nameZh,...n.aliases].some(v=>researcherKey(v)===q));
    return exact(b)-exact(a)||Number(!!b.personId)-Number(!!a.personId)||(network.adjacency.get(b.id)?.size||0)-(network.adjacency.get(a.id)?.size||0)||a.name.localeCompare(b.name);
  }).slice(0,limit);
}

export type ResearcherPoint={id:string;x:number;y:number};
export function layoutResearcherNetwork(ids:string[],center:string,distance:Map<string,number>,path=false):ResearcherPoint[]{
  if(path)return ids.map((id,i)=>({id,x:100+(i%5)*190,y:150+Math.floor(i/5)*160+(i%2)*30}));
  const rings=new Map<number,string[]>();for(const id of ids){if(id===center)continue;const d=distance.get(id)||1;rings.set(d,[...rings.get(d)||[],id]);}
  const points:ResearcherPoint[]=[{id:center,x:500,y:330}];
  for(const [level,ring]of rings){const radius=level===1?230:level===2?400:550;ring.forEach((id,i)=>{const angle=-Math.PI/2+2*Math.PI*i/ring.length+level*.15;points.push({id,x:500+Math.cos(angle)*radius,y:330+Math.sin(angle)*radius*.83});});}
  // Deterministic separation keeps adjacent labels readable without a moving simulation.
  for(let iteration=0;iteration<50;iteration++)for(let a=1;a<points.length;a++)for(let b=a+1;b<points.length;b++){
    const p=points[a],q=points[b],dx=q.x-p.x,dy=q.y-p.y;if(Math.abs(dx)<120&&Math.abs(dy)<48){const sy=dy===0?(a%2?1:-1):Math.sign(dy),sx=dx===0?(b%2?1:-1):Math.sign(dx),pushY=(48-Math.abs(dy))*.1,pushX=(120-Math.abs(dx))*.07;p.y-=sy*pushY;q.y+=sy*pushY;p.x-=sx*pushX;q.x+=sx*pushX;}
  }
  return points;
}
