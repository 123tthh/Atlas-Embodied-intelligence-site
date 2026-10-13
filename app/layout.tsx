import type { Metadata } from 'next';
import './globals.css';
import './directory.css';
import './world-map.css';
import './regional.css';
export const metadata:Metadata={metadataBase:new URL('https://embodied-atlas.xyl1122.chatgpt.site'),title:'Embodied Atlas · 具身研究地图',description:'从技术关键词出发，探索具身智能论文、研究团队与技术演化。附 arXiv、项目主页、Google Scholar 与会议检索入口。',icons:{icon:'/favicon.svg'},openGraph:{title:'Embodied Atlas · 具身研究地图',description:'每一篇研究，都有它的来处。探索技术脉络，找到下一篇。',locale:'zh_CN',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
