'use client';
import {useEffect,useId,useRef,useState} from 'react';
import type {ReactNode} from 'react';
import {ChevronUp,ChevronDown,ChevronsUp,ChevronsDown} from 'lucide-react';
import {useI18n} from './Language';

export default function BrowsePane({children,view}:{children:ReactNode;view:string}) {
  const {bi}=useI18n(),root=useRef<HTMLDivElement>(null),id=useId(),[scroll,setScroll]=useState({visible:false,top:true,bottom:false});
  function target(){const el=root.current;if(!el)return null;return [...el.querySelectorAll<HTMLElement>('[data-page-scroll]')].reverse().find(node=>node.clientHeight>0&&node.scrollHeight>node.clientHeight+2)||el;}
  useEffect(()=>{
    const el=root.current;if(!el)return;let frame=0;const observed=new WeakSet<Element>();
    const resize=new ResizeObserver(schedule);
    function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(update);}
    function update(){const node=target();if(!node)return;const max=node.scrollHeight-node.clientHeight;setScroll({visible:max>2,top:node.scrollTop<=2,bottom:node.scrollTop>=max-2});for(const child of [el!,...el!.children,...el!.querySelectorAll('[data-page-scroll],.graph-canvas-slot')])if(!observed.has(child)){observed.add(child);resize.observe(child);}}
    const changes=new MutationObserver(schedule);changes.observe(el,{childList:true,subtree:true});el.addEventListener('scroll',schedule,true);update();
    return()=>{cancelAnimationFrame(frame);resize.disconnect();changes.disconnect();el.removeEventListener('scroll',schedule,true);};
  },[view]);
  function move(direction:number,edge=false){const el=target();if(!el)return;const top=edge?(direction<0?0:el.scrollHeight):el.scrollTop+direction*el.clientHeight*.8;el.scrollTo({top,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});}
  return <div className="browse-pane"><div id={id} className="view-content" ref={root}>{children}</div>{scroll.visible&&<nav className="page-scroll-dock" aria-label={bi('页面上下滚动','Page scrolling')} aria-controls={id}>
    <span>{bi('页面','Page')}</span>
    <button disabled={scroll.top} title={bi('回到页面顶部','Top of page')} aria-label={bi('回到页面顶部','Top of page')} onClick={()=>move(-1,true)}><ChevronsUp size={17}/></button>
    <button disabled={scroll.top} title={bi('页面向上翻页','Page up')} aria-label={bi('页面向上翻页','Page up')} onClick={()=>move(-1)}><ChevronUp size={19}/></button>
    <button disabled={scroll.bottom} title={bi('页面向下翻页','Page down')} aria-label={bi('页面向下翻页','Page down')} onClick={()=>move(1)}><ChevronDown size={19}/></button>
    <button disabled={scroll.bottom} title={bi('到达页面底部','Bottom of page')} aria-label={bi('到达页面底部','Bottom of page')} onClick={()=>move(1,true)}><ChevronsDown size={17}/></button>
  </nav>}</div>;
}
