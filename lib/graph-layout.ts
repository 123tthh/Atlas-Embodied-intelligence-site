import type {Paper,Edge} from './types';
export type GraphColumn={id:string;zh:string;en:string;color:string;paperIds:string[]};
export type GraphNode={key:string;paper:Paper;columnId:string;x:number;y:number};
export type GraphCamera={x:number;y:number;scale:number};
export function clampGraphCamera(camera:GraphCamera,size:{width:number;height:number},layout:{width:number;height:number;rows:{top:number}[]}){
 const scale=camera.scale,top=96-(layout.rows[0]?.top||0)*scale;
 const bottom=Math.min(top,size.height-64-(layout.height-30)*scale);
 const contentWidth=layout.width*scale;
 const x=contentWidth<=size.width?(size.width-contentWidth)/2:Math.max(size.width-contentWidth-24,Math.min(24,camera.x));
 return {scale,x,y:Math.max(bottom,Math.min(top,camera.y))};
}
export function graphLayout(papers:Paper[],columns:GraphColumn[]){
 const years=[...new Set(papers.map(p=>p.year))].sort((a,b)=>a-b),nodes:GraphNode[]=[],rows:{year:number;top:number;height:number}[]=[];
 let top=82;
 for(const year of years){const groups=columns.map(c=>papers.filter(p=>p.year===year&&c.paperIds.includes(p.id)).sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id)));if(!groups.some(g=>g.length))continue;const height=Math.max(...groups.map(g=>g.length),1)*134+62;rows.push({year,top,height});groups.forEach((g,col)=>g.forEach((p,i)=>nodes.push({key:columns[col].id+':'+p.id,paper:p,columnId:columns[col].id,x:110+col*344,y:top+35+i*134})));top+=height;}
 const positions:Record<string,GraphNode[]>={};for(const n of nodes)(positions[n.paper.id]??=[]).push(n);
 return {nodes,rows,positions,width:Math.max(450,columns.length*344+158),height:top+30};
}
export function graphConnections(edges:Edge[],positions:Record<string,GraphNode[]>){return edges.flatMap((edge,index)=>{const a=positions[edge.source]||[],b=positions[edge.target]||[];if(!a.length||!b.length)return [];const same=a.flatMap(source=>b.filter(target=>source.columnId===target.columnId).map(target=>({source,target})));const pairs=same.length?same:[{source:a[0],target:b[0]}];return pairs.map(({source,target},i)=>({edge,source,target,key:index+':'+i}));});}
export function connectionPath(a:{x:number;y:number},b:{x:number;y:number}){if(Math.abs(a.y-b.y)<30){const right=b.x>a.x;const sx=a.x+(right?252:0),ex=b.x+(right?0:252),d=right?48:-48;return `M${sx},${a.y+50} C${sx+d},${a.y+50} ${ex-d},${b.y+50} ${ex},${b.y+50}`;}const start={x:a.x+126,y:a.y+106},end={x:b.x+126,y:b.y};const reverse=end.y<start.y,bend=Math.max(44,Math.abs(end.y-start.y)*.45);return `M${start.x},${start.y} C${start.x+(reverse?150:0)},${start.y+bend} ${end.x+(reverse?150:0)},${end.y-bend} ${end.x},${end.y}`;}
