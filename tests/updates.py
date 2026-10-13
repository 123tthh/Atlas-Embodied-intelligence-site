"""Updater integration checks: local preview only, with --var ATLAS_UPDATE_TOKEN:local-integration-fixture."""
import copy,datetime,json,pathlib,sqlite3,urllib.request,urllib.error,uuid
BASE='http://127.0.0.1:4173'
key='qa-update-'+uuid.uuid4().hex
today=datetime.datetime.now(datetime.timezone.utc).date().isoformat()
paper=dict(title='Local-only updater integration fixture '+key,short='Local fixture',date=today,lane='simulation',venue='Test fixture',publicationStatus='preprint',tags=['local fixture'],authors=[{'name':'Local fixture'}],summary='A local integration fixture for validating authenticated imports and atomic database writes.',arxiv='',project='',code='',modelUrl='',sources=['https://example.invalid/'+key],checks=[{'url':'https://example.invalid/'+key,'supports':'Local-only fixture representing a reviewed primary source for this integration test.'}])
batch=dict(action='ingest',runId=key,windowStart=today,windowEnd=today,status='success',summary='Local integration validation only.',searchedSources=['https://example.invalid/'+key],failures=[],papers=[paper])
passed=0
def request(path='/api/updates',payload=None,token='local-integration-fixture'):
 headers={'Content-Type':'application/json'}
 if token:headers['X-Atlas-Update-Token']=token
 req=urllib.request.Request(BASE+path,headers=headers,data=json.dumps(payload).encode() if payload is not None else None)
 try:r=urllib.request.urlopen(req,timeout=20)
 except urllib.error.HTTPError as e:r=e
 with r:status,raw=r.status,r.read().decode()
 if status==503 and raw.startswith('Your worker restarted mid-request.'):
  try:r=urllib.request.urlopen(req,timeout=20)
  except urllib.error.HTTPError as e:r=e
  with r:status,raw=r.status,r.read().decode()
 try:result=json.loads(raw)
 except json.JSONDecodeError:result=raw[:500]
 return status,result
def check(label,result,status,predicate=lambda x:True):
 global passed
 assert result[0]==status and predicate(result[1]),(label,result)
 passed+=1;print('PASS',label)
try:
 initial=request('/api/catalog')[1];size=len(initial['papers']);edges=initial['edges']
 check('anonymous writer rejected',request(payload=batch,token=''),401)
 check('wrong credential rejected',request(payload=batch,token='wrong'),401)
 bad=copy.deepcopy(batch);bad['papers'][0]['checks']=[]
 check('missing source checks rejected before writing',request(payload=bad),400)
 bad=copy.deepcopy(batch);bad['papers'][0]['teams']=['Unverified team']
 check('unverified team attribution cannot be imported',request(payload=bad),400)
 bad=copy.deepcopy(batch);bad['papers'][0]['date']='2999-01-01'
 check('future publication dates rejected',request(payload=bad),400)
 bad=copy.deepcopy(batch);bad['papers'][0]['checks'][0]['url']='https://example.invalid/other'
 check('unmatched evidence URL rejected',request(payload=bad),400)
 bad=copy.deepcopy(batch);bad['papers'].append({**paper,'title':''})
 check('invalid batch cannot partially import',request(payload=bad),400)
 check('rejections preserve catalog',request('/api/catalog'),200,lambda x:len(x['papers'])==size)
 result=request(payload=batch);check('authorized import committed',result,200,lambda x:len(x['added'])==1)
 pid=result[1]['added'][0]['id']
 check('same request replayed without duplicate',request(payload=batch),200,lambda x:x.get('replayed') is True and x['added'][0]['id']==pid)
 check('runId content conflict rejected',request(payload={**batch,'summary':'A changed request with the same identifier.'}),409)
 check('new run deduplicates existing paper',request(payload={**batch,'runId':key+'-duplicate'}),200,lambda x:len(x['added'])==0 and len(x['skipped'])==1)
 check('catalog persisted and curated edges preserved',request('/api/catalog'),200,lambda x:len(x['papers'])==size+1 and x['edges']==edges and any(p['id']==pid and p['ingestion']=='weekly' and p['verificationNotes'] for p in x['papers']))
 check('run history persists both unique runs',request(),200,lambda x:len([r for r in x['runs'] if r['runId'].startswith(key)])==2)
 check('instructions retrievable', (urllib.request.urlopen(BASE+'/api/updates/instructions').status,True),200)
 print(str(passed)+' updater integration checks passed.')
finally:
 for filename in pathlib.Path('.wrangler/state').rglob('*.sqlite'):
  try:
   with sqlite3.connect(filename) as db:
    db.execute('DELETE FROM automatic_papers WHERE run_id LIKE ?',(key+'%',))
    db.execute('DELETE FROM update_runs WHERE id LIKE ?',(key+'%',))
  except sqlite3.OperationalError:pass
