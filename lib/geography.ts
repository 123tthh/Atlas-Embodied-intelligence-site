import type {Organization,OrganizationLocation} from './types';
export type MappedOrganization=Organization & {location:OrganizationLocation};
export type Point={x:number;y:number};
export type MapCamera={cx:number;cy:number;zoom:number};
export type MapCluster=Point & {id:string;organizations:MappedOrganization[]};
export const WORLD_WIDTH=1000,WORLD_HEIGHT=500;
export const WORLD_CAMERA:MapCamera={cx:500,cy:235,zoom:1};
export const project=(lon:number,lat:number):Point=>({x:(lon+180)/360*WORLD_WIDTH,y:(90-lat)/180*WORLD_HEIGHT});
export function hasLocation(org:Organization):org is MappedOrganization {const p=org.location;return !!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180;}
export const baseScale=(width:number,height:number)=>Math.max(.05,Math.min(width/WORLD_WIDTH,height/WORLD_HEIGHT)*.93);
export const clampCamera=(c:MapCamera):MapCamera=>({cx:Math.max(0,Math.min(1000,c.cx)),cy:Math.max(0,Math.min(500,c.cy)),zoom:Math.max(1,Math.min(40,c.zoom))});
export function fitOrganizations(orgs:MappedOrganization[],width:number,height:number):MapCamera {if(!orgs.length)return WORLD_CAMERA;const points=orgs.map(o=>project(o.location.lon,o.location.lat)),xs=points.map(p=>p.x),ys=points.map(p=>p.y);const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const scale=Math.min(Math.max(width-110,100)/Math.max(maxX-minX,18),Math.max(height-150,100)/Math.max(maxY-minY,18));return clampCamera({cx:(minX+maxX)/2,cy:(minY+maxY)/2,zoom:scale/baseScale(width,height)});}
export function inViewport(org:MappedOrganization,camera:MapCamera,width:number,height:number){const p=project(org.location.lon,org.location.lat),scale=baseScale(width,height)*camera.zoom;return Math.abs((p.x-camera.cx)*scale)<=width/2&&Math.abs((p.y-camera.cy)*scale)<=height/2;}
export function clusterOrganizations(orgs:MappedOrganization[],scale:number,radius=48):MapCluster[]{
  const sorted=[...orgs].sort((a,b)=>a.id.localeCompare(b.id)),points=sorted.map(o=>project(o.location.lon,o.location.lat));
  const parent=sorted.map((_,i)=>i);const root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));
  const cells=new Map<string,number[]>();const cellSize=radius/Math.max(scale,.0001);
  for(let i=0;i<points.length;i++){const p=points[i],gx=Math.floor(p.x/cellSize),gy=Math.floor(p.y/cellSize);for(let x=gx-1;x<=gx+1;x++)for(let y=gy-1;y<=gy+1;y++)for(const j of cells.get(`${x},${y}`)||[]){if(Math.hypot(p.x-points[j].x,p.y-points[j].y)*scale<=radius)parent[root(i)]=root(j);}const key=`${gx},${gy}`;cells.set(key,[...(cells.get(key)||[]),i]);}
  const groups=new Map<number,number[]>();for(let i=0;i<points.length;i++){const key=root(i);groups.set(key,[...(groups.get(key)||[]),i]);}
  return [...groups.values()].map(indices=>({id:indices.map(i=>sorted[i].id).join('|'),x:indices.reduce((a,i)=>a+points[i].x,0)/indices.length,y:indices.reduce((a,i)=>a+points[i].y,0)/indices.length,organizations:indices.map(i=>sorted[i])}));
}
