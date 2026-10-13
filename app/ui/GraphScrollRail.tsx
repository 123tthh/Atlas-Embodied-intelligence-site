'use client';
import {ChevronUp,ChevronDown} from 'lucide-react';
import {useI18n} from './Language';
export default function GraphScrollRail({top,bottom,value,onChange,onStep}:{top:number;bottom:number;value:number;onChange:(value:number)=>void;onStep:(direction:number)=>void}) {
  const {bi}=useI18n(),range=Math.max(0,top-bottom),progress=range>1?Math.max(0,Math.min(1000,(top-value)/range*1000)):0;
  return <div className="graph-scroll-rail" aria-label={bi('图谱上下浏览','Vertical graph navigation')}>
    <button disabled={range<=1||progress<=1} aria-label={bi('图谱向上浏览','Browse graph upward')} title={bi('向上浏览图谱','Browse graph upward')} onClick={()=>onStep(-1)}><ChevronUp size={17}/></button>
    <input type="range" min="0" max="1000" step="1" value={Math.round(progress)} disabled={range<=1} aria-label={bi('图谱垂直位置','Graph vertical position')} aria-valuetext={bi(`已浏览 ${Math.round(progress/10)}%`,`${Math.round(progress/10)}% through graph`)} onChange={e=>onChange(top-Number(e.target.value)/1000*range)}/>
    <button disabled={range<=1||progress>=999} aria-label={bi('图谱向下浏览','Browse graph downward')} title={bi('向下浏览图谱','Browse graph downward')} onClick={()=>onStep(1)}><ChevronDown size={17}/></button>
  </div>;
}
