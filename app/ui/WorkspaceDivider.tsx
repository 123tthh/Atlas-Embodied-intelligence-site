'use client';
import {useEffect,useRef,useState} from 'react';
import type {ReactNode,RefObject,PointerEvent,KeyboardEvent} from 'react';
import {GripHorizontal,RotateCcw,PanelTopClose,PanelTopOpen,Scan} from 'lucide-react';
import {splitHeight} from '../../lib/graph-viewport';
import {useI18n} from './Language';

export default function WorkspaceDivider({toolbar,upper,workspace,height,onHeightChange,onOverview,reading=false}:{toolbar:ReactNode;upper:RefObject<HTMLDivElement|null>;workspace:RefObject<HTMLElement|null>;height:number|null;onHeightChange:(height:number|null)=>void;onOverview:()=>void;reading?:boolean}) {
  const {bi}=useI18n(),bar=useRef<HTMLDivElement>(null),drag=useRef<{y:number;height:number}|null>(null);
  const [bounds,setBounds]=useState({value:300,max:600}),[dragging,setDragging]=useState(false);
  function maximum(){return Math.max(0,(workspace.current?.clientHeight||720)-(bar.current?.clientHeight||58)-(workspace.current?.querySelector('footer')?.clientHeight||34)-180);}
  function update(){const max=maximum();setBounds({value:upper.current?.clientHeight||0,max});if(height!==null&&height>max)onHeightChange(max);}
  useEffect(()=>{const observer=new ResizeObserver(update);for(const el of [upper.current,workspace.current,bar.current])if(el)observer.observe(el);update();return()=>observer.disconnect();},[height]);
  function start(event:PointerEvent<HTMLDivElement>){if(event.button!==0)return;event.preventDefault();drag.current={y:event.clientY,height:upper.current?.clientHeight||0};event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);}
  function stop(){drag.current=null;setDragging(false);}
  function keyboard(event:KeyboardEvent<HTMLDivElement>){const current=upper.current?.clientHeight||0;if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();onHeightChange(splitHeight(current+(event.key==='ArrowUp'?-40:40),maximum()));}else if(event.key==='Home'){event.preventDefault();onHeightChange(0);}else if(event.key==='End'){event.preventDefault();onHeightChange(maximum());}else if(event.key==='Enter'){event.preventDefault();onHeightChange(null);}}
  return <div ref={bar} className={'workspace-divider'+(dragging?' is-dragging':'')}>
    <div className="divider-layout-options">{toolbar}</div>
    <div className="workspace-divider-grip" role="separator" tabIndex={0} aria-orientation="horizontal" aria-label={bi('上下拖动分界线','Drag the panel divider up or down')} aria-valuemin={0} aria-valuemax={bounds.max} aria-valuenow={bounds.value} aria-valuetext={bi(`上方区域 ${bounds.value} 像素；上下方向键调整，Enter 恢复布局`,`Upper panel ${bounds.value} pixels; arrow keys resize, Enter resets`)} title={bi('向上拖动扩大图谱，向下拖动展开上栏；双击恢复','Drag up for a larger graph, down for a larger header; double-click to reset')} onPointerDown={start} onPointerMove={e=>{if(drag.current)onHeightChange(splitHeight(drag.current.height+e.clientY-drag.current.y,maximum()));}} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onDoubleClick={()=>onHeightChange(null)} onKeyDown={keyboard}>
      <span className="divider-rule"/><GripHorizontal size={21}/><span>{bi('上下拖动分界线','Drag divider')}</span><span className="divider-rule"/>
    </div>
    <div className="divider-actions">
      <button aria-label={bi('恢复上下区域布局','Reset panel layout')} title={bi('恢复布局','Reset layout')} onClick={()=>onHeightChange(null)}><RotateCcw size={15}/><span>{bi('恢复布局','Reset')}</span></button>
      {!reading&&<button aria-label={bi('全图总览','Overview')} title={bi('全图总览','Overview')} onClick={onOverview}><Scan size={16}/><span>{bi('全图总览','Overview')}</span></button>}
      <button aria-label={bi(bounds.value<50?'展开上方区域':'收起上方区域',bounds.value<50?'Expand upper panel':'Collapse upper panel')} title={bi(bounds.value<50?'展开上栏':'收起上栏',bounds.value<50?'Expand header':'Collapse header')} onClick={()=>onHeightChange(bounds.value<50?null:0)}>{bounds.value<50?<PanelTopOpen size={16}/>:<PanelTopClose size={16}/>}</button>
    </div>
  </div>;
}
