import { catalog, error } from '../../../lib/server';
export async function GET(){try{return Response.json(await catalog(),{headers:{'Cache-Control':'public, max-age=30'}});}catch{return error('社区资料暂时不可用，当前展示已核验种子库。请稍后刷新。',503);}}
