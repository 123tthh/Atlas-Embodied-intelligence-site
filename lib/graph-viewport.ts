export type GraphViewCommand = {type:'overview'; serial:number};
export function splitHeight(height:number, maximum:number) {
  return Math.round(Math.max(0, Math.min(maximum, height)));
}
export function overviewScale(view:{width:number;height:number}, content:{width:number;height:number}, padding:{x:number;y:number}, maximum=1) {
  return Math.max(Number.EPSILON, Math.min(maximum, Math.max(1,view.width-padding.x)/Math.max(1,content.width), Math.max(1,view.height-padding.y)/Math.max(1,content.height)));
}
export function zoomScale(current:number, factor:number, overview:number, maximum:number) {
  return Math.max(Math.min(.12,overview/2), Math.min(maximum,current*factor));
}
