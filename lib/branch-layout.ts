import type {Paper,Edge} from './types';
import type {GraphColumn} from './graph-layout';

export type BranchNode={key:string;kind:'root'|'lane'|'year'|'paper'|'more';zh:string;en:string;count:number;childrenCount:number;x:number;y:number;depth:number;color:string;paper?:Paper;edge?:Edge;reverse?:boolean;parentKey?:string;lane?:string;year?:number;path:string[]};
type Seed=Omit<BranchNode,'x'|'y'|'depth'|'childrenCount'>;
export function branchLayout(papers:Paper[],edges:Edge[],groups:GraphColumn[],expanded:Set<string>,limits:Record<string,number>={}){
 const byId=new Map(papers.map(p=>[p.id,p])),byLane=new Map(groups.map(g=>[g.id,papers.filter(p=>g.paperIds.includes(p.id))]));
 const neighbors=new Map<string,{paper:Paper;edge:Edge;reverse:boolean}[]>();
 for(const edge of edges){const a=byId.get(edge.source),b=byId.get(edge.target);if(!a||!b)continue;for(const [from,to,reverse]of [[a,b,false],[b,a,true]] as const){const list=neighbors.get(from.id)||[];if(!list.some(v=>v.paper.id===to.id))list.push({paper:to,edge,reverse});neighbors.set(from.id,list);}}
 function children(n:Seed):Seed[]{
  if(n.kind==='root')return groups.filter(g=>byLane.get(g.id)?.length).map(g=>({key:'lane:'+g.id,kind:'lane',zh:g.zh,en:g.en,count:byLane.get(g.id)!.length,color:g.color,lane:g.id,path:[]}));
  if(n.kind==='lane'){const ps=byLane.get(n.lane!)||[];return [...new Set(ps.map(p=>p.year))].sort((a,b)=>b-a).map(year=>({key:n.key+'/'+year,kind:'year',zh:String(year),en:String(year),count:ps.filter(p=>p.year===year).length,color:n.color,lane:n.lane,year,path:[]}));}
  if(n.kind==='year')return (byLane.get(n.lane!)||[]).filter(p=>p.year===n.year).sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id)).map(p=>({key:n.key+'/'+p.id,kind:'paper',zh:p.short,en:p.short,paper:p,count:0,color:n.color,path:[p.id]}));
  if(n.kind==='paper')return (neighbors.get(n.paper!.id)||[]).filter(v=>!n.path.includes(v.paper.id)).sort((a,b)=>Number(a.edge.editorial)-Number(b.edge.editorial)||b.paper.date.localeCompare(a.paper.date)).map(v=>({key:n.key+'/'+v.paper.id,kind:'paper',zh:v.paper.short,en:v.paper.short,paper:v.paper,edge:v.edge,reverse:v.reverse,count:0,color:n.color,path:[...n.path,v.paper.id]}));
  return [];
 }
 const nodes:BranchNode[]=[],links:{source:BranchNode;target:BranchNode}[]=[];let cursor=48;
 function visit(seed:Seed,depth:number):BranchNode{
  const all=children(seed),node:BranchNode={...seed,x:32+depth*304,y:0,depth,childrenCount:all.length};nodes.push(node);
  if(expanded.has(seed.key)&&all.length){const limit=limits[seed.key]||8,visible=all.slice(0,limit);if(all.length>limit)visible.push({key:seed.key+'/more',kind:'more',zh:`展开其余 ${all.length-limit} 项`,en:`Show ${all.length-limit} more`,count:all.length-limit,color:seed.color,path:[],parentKey:seed.key});const kids=visible.map(child=>{const target=visit(child,depth+1);links.push({source:node,target});return target;});node.y=(kids[0].y+kids.at(-1)!.y)/2;
  }else{node.y=cursor;cursor+=76;}
  return node;
 }
 visit({key:'root',kind:'root',zh:'具身智能',en:'Embodied intelligence',count:papers.length,color:'#a9573a',path:[]},0);
 return {nodes,links,width:Math.max(...nodes.map(n=>n.x))+272,height:Math.max(160,cursor+8)};
}
