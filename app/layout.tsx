import type { Metadata } from 'next';
import './globals.css';
import './directory.css';
import './world-map.css';
import './regional.css';
export const metadata:Metadata={metadataBase:new URL('https://embodied-atlas.xyl1122.chatgpt.site'),title:'Embodied Atlas · 具身研究地图',description:'免登录浏览具身智能与机器人研究地图：论文、模型、团队、人物、技术演化和世界地图。中英双语，开放社区留言。',icons:{icon:'/favicon.svg'},openGraph:{title:'Embodied Atlas · 具身研究地图',description:'每一篇研究，都有它的来处。探索技术脉络，找到下一篇。',locale:'zh_CN',type:'website'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>;}
