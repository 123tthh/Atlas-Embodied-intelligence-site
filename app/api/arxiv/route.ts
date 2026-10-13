import { arxivId,parseAtom } from '../../../lib/domain';
import { error } from '../../../lib/server';
export async function GET(request:Request){
  const params=new URL(request.url).searchParams,id=arxivId(params.get('id')??''),q=(params.get('q')??'').trim();
  if(!id&&(!q||q.length>180))return error('请输入 1–180 字的技术关键词');
  const upstream=new URL('https://export.arxiv.org/api/query');
  if(id)upstream.searchParams.set('id_list',id);else {upstream.searchParams.set('search_query',q.replace(/["\\]/g,' ').split(/\s+/).filter(Boolean).slice(0,12).map(t=>'all:"'+t+'"').join(' AND '));upstream.searchParams.set('sortBy','submittedDate');upstream.searchParams.set('sortOrder','descending');}
  upstream.searchParams.set('max_results','12');
  try{const r=await fetch(upstream,{signal:AbortSignal.timeout(12000),headers:{'User-Agent':'EmbodiedAtlas/0.99 (+https://embodied-atlas.xyl1122.chatgpt.site)'}});if(!r.ok)return error('arXiv 暂时繁忙，可以使用站外检索入口继续。',502);const xml=await r.text();if(!xml.includes('<feed'))return error('arXiv 返回异常，请使用站外检索。',502);return Response.json({results:parseAtom(xml),source:'arXiv'},{headers:{'Cache-Control':'public, max-age=300'}});}catch{return error('arXiv 暂时无法连接，可以在原站继续检索。',502);}
}
