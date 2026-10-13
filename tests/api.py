"""Integration checks for the LOCAL production preview only. Never target a hosted Site."""
import json, urllib.request, urllib.error, uuid
BASE='http://127.0.0.1:5174'
A=('qa-a','qa-a@sites.test'); B=('qa-b','qa-b@sites.test'); ADMIN=('qa-admin','qa-admin@sites.test')
passed=0
created=[]
def req(path,method='GET',data=None,user=None,origin=BASE):
 headers={'Content-Type':'application/json','Origin':origin}
 if user: headers.update({'oai-authenticated-user-id':user[0],'oai-authenticated-user-email':user[1]})
 request=urllib.request.Request(BASE+path,data=json.dumps(data).encode() if data is not None else None,headers=headers,method=method)
 try: response=urllib.request.urlopen(request,timeout=20)
 except urllib.error.HTTPError as error: response=error
 raw=response.read().decode();response.close()
 if response.status==503 and raw.startswith('Your worker restarted mid-request.'):
  # Miniflare may restart a local isolate after an early rejected request.
  try: response=urllib.request.urlopen(request,timeout=20)
  except urllib.error.HTTPError as error: response=error
  raw=response.read().decode();response.close()
 try: body=json.loads(raw)
 except: body=raw
 return response.status,body
def expect(name,result,status,predicate=lambda v:True):
 global passed
 assert result[0]==status and predicate(result[1]),(name,result)
 print('PASS',name);passed+=1
expect('public catalog',req('/api/catalog'),200,lambda x:len(x['papers'])>=24)
expect('anonymous bookmarks rejected',req('/api/bookmarks'),401)
expect('cross-origin write rejected',req('/api/bookmarks','POST',{'paperId':'dp','save':True},A,'https://example.invalid'),403)
expect('save bookmark',req('/api/bookmarks','POST',{'paperId':'dp','save':True},A),200)
expect('idempotent save',req('/api/bookmarks','POST',{'paperId':'dp','save':True},A),200)
expect('owner sees bookmark once',req('/api/bookmarks',user=A),200,lambda x:x['bookmarks']==['dp'])
expect('other user cannot see bookmark',req('/api/bookmarks',user=B),200,lambda x:x['bookmarks']==[])
expect('other user removal does not affect owner',req('/api/bookmarks','POST',{'paperId':'dp','save':False},B),200)
expect('owner bookmark remains',req('/api/bookmarks',user=A),200,lambda x:x['bookmarks']==['dp'])
expect('invalid paper rejected',req('/api/bookmarks','POST',{'paperId':'no-such-paper','save':True},A),404)
expect('invalid payload rejected',req('/api/bookmarks','POST',{'paperId':1,'save':'true'},A),400)
p={'title':'QA disposable research '+uuid.uuid4().hex[:8],'url':'https://example.invalid/atlas-qa/'+uuid.uuid4().hex,'project':'','keywords':['Diffusion'],'year':2026,'lane':'world','authors':'Test Researcher','relationTo':'dp','relationType':'extends','evidence':'This is an isolated integration test of the moderation workflow.','evidenceUrl':'https://example.invalid/evidence'}
expect('anonymous submission rejected',req('/api/proposals','POST',p),401)
expect('unsafe link rejected',req('/api/proposals','POST',{**p,'url':'javascript:alert(1)'},A),400)
expect('unknown direction rejected',req('/api/proposals','POST',{**p,'lane':'unknown-direction'},A),400)
expect('missing relation evidence rejected',req('/api/proposals','POST',{**p,'evidence':''},A),400)
r=req('/api/proposals','POST',p,A);expect('signed-in submission saved',r,201);pid=r[1]['id'];created.append(pid)
expect('duplicate submission rejected',req('/api/proposals','POST',p,A),409)
expect('pending submission private',req('/api/catalog'),200,lambda x:all(v['id']!='community-'+pid for v in x['papers']))
expect('other user cannot list proposal',req('/api/proposals',user=B),200,lambda x:all(v['id']!=pid for v in x['proposals']))
expect('other user cannot withdraw proposal',req('/api/proposals','DELETE',{'id':pid},B),403)
expect('contributor cannot self-approve',req('/api/proposals','PATCH',{'id':pid,'status':'approved'},A),403)
expect('administrator can approve',req('/api/proposals','PATCH',{'id':pid,'status':'approved','note':'Local test only'},ADMIN),200)
expect('approved proposal becomes public',req('/api/catalog'),200,lambda x:any(v['id']=='community-'+pid and v['lane']=='world' and not v['arxiv'] and v['sources'][0]==p['url'] for v in x['papers']) and any(e['target']=='community-'+pid for e in x['edges']))
expect('repeat review rejected',req('/api/proposals','PATCH',{'id':pid,'status':'rejected'},ADMIN),409)
expect('approved deep link',req('/paper/community-'+pid),200,lambda x:p['title'] in x)
expect('missing paper returns 404',req('/paper/no-such-paper'),404)
p.update({'url':'https://example.invalid/atlas-qa/'+uuid.uuid4().hex,'relationTo':''})
r=req('/api/proposals','POST',p,A);expect('second proposal saved',r,201);created.append(r[1]['id'])
expect('owner can withdraw pending proposal',req('/api/proposals','DELETE',{'id':r[1]['id']},A),200)
expect('remove bookmark',req('/api/bookmarks','POST',{'paperId':'dp','save':False},A),200)
expect('arXiv missing query rejected',req('/api/arxiv'),400)
print(f'{passed} API checks passed.')
# Remove only our synthetic rows from the local database; runtime data is never packaged.
import sqlite3,pathlib
for dbfile in pathlib.Path('.wrangler/state').rglob('*.sqlite'):
 try:
  con=sqlite3.connect(dbfile)
  con.executemany('DELETE FROM proposals WHERE id=? AND user_id=?',[(i,A[0]) for i in created])
  con.commit();con.close()
 except sqlite3.OperationalError: pass
