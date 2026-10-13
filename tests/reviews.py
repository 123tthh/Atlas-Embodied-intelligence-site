"""Weekly moderation integration tests. LOCAL production preview only; never sends email."""
import concurrent.futures,json,pathlib,sqlite3,urllib.request,urllib.error,uuid
BASE='http://127.0.0.1:4173'
TOKEN='local-integration-fixture'
key='qa-review-'+uuid.uuid4().hex
created=[];passed=0

def req(path='/api/reviews',body=None,token=TOKEN,method=None,user=None):
 headers={'Content-Type':'application/json','Origin':BASE}
 if token:headers['X-Atlas-Update-Token']=token
 if user:headers.update({'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@sites.test'})
 request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 for attempt in range(2):
  try:r=urllib.request.urlopen(request,timeout=30)
  except urllib.error.HTTPError as e:r=e
  with r:status,raw=r.status,r.read().decode()
  if not(status==503 and raw.startswith('Your worker restarted mid-request.')):break
 try:result=json.loads(raw)
 except json.JSONDecodeError:result=raw[:500]
 return status,result

def check(name,result,status=200,predicate=lambda d:True):
 global passed
 assert result[0]==status and predicate(result[1]),(name,result)
 passed+=1;print('PASS',name)

def proposal(relation=False):
 url='https://example.invalid/'+key+'/'+uuid.uuid4().hex
 p=dict(title='Local-only review fixture '+key,url=url,project='',keywords=['test'],year=2026,lane='world',authors='Test Author',relationTo='dp' if relation else '',relationType='extends',evidence='Local relationship review evidence' if relation else '',evidenceUrl=url if relation else '')
 r=req('/api/proposals',p,user='qa-review');check('proposal starts pending',r,201,lambda d:d['status']=='pending');created.append(r[1]['id']);return r[1]['id'],url

def decision(kind,id,status='deferred',url=None):
 queue=req()[1]
 row=next(r for r in queue['proposals' if kind=='proposal' else 'messages'] if r['id']==id)
 return dict(action='review',runId=key,kind=kind,id=id,snapshot=row['snapshot'],decision=status,note='Local-only evidence review reason; no production data.',checks=[dict(url=url,supports='Original-source check for an isolated local integration fixture.')] if url else [])

try:
 check('private queue rejects anonymous access',req(token=''),401)
 check('private queue rejects visitor identity alone',req(token='',user='qa-reader'),401)
 check('wrong reviewer credential rejected',req(token='wrong'),401)
 check('anonymous decisions rejected',req(body={'action':'configure'},token=''),401)
 check('weekly policy saved',req(body={'action':'configure'}),predicate=lambda d:d['saved'] and d['policy']['cadenceDays']==7)
 check('weekly policy read back',req(),predicate=lambda d:d['policy']['weekday']=='Tuesday' and d['policy']['time']=='10:00')
 pid,url=proposal();d=decision('proposal',pid,'approved',url)
 check('approval needs primary source checks',req(body={**d,'checks':[]}),400)
 check('stale snapshot cannot approve',req(body={**d,'snapshot':'0'*64}),409)
 check('pending remains absent publicly',req('/api/catalog'),predicate=lambda d:all(p['id']!='community-'+pid for p in d['papers']))
 check('verified proposal approved',req(body=d),predicate=lambda r:r['review']['status']=='approved')
 check('approved record becomes public',req('/api/catalog'),predicate=lambda d:any(p['id']=='community-'+pid for p in d['papers']))
 check('same review is idempotent',req(body=d),predicate=lambda r:r['replayed'])
 check('changed review cannot reuse ID',req(body={**d,'note':'A different reason for the same review ID.'}),409)
 check('audit readback has evidence and timestamp',req('/api/reviews?runId='+key),predicate=lambda r:any(v['id']==pid and v['checks'] and v['reviewedAt'] for v in r['reviews']))
 pid2,url2=proposal();d2=decision('proposal',pid2)
 check('insufficient evidence stays pending',req(body=d2),predicate=lambda r:r['review']['status']=='pending')
 check('deferred proposal remains in queue with reason',req(),predicate=lambda r:any(v['id']==pid2 and v['lastReview']['decision']=='deferred' for v in r['proposals']))
 check('deferred proposal remains private',req('/api/catalog'),predicate=lambda r:all(p['id']!='community-'+pid2 for p in r['papers']))
 rid,rurl=proposal(True)
 check('relationship proposal cannot be auto-approved',req(body=decision('proposal',rid,'approved',rurl)),400)
 wid,wurl=proposal();wd=decision('proposal',wid,'approved',wurl)
 check('pending proposal may be withdrawn',req('/api/proposals',{'id':wid},method='DELETE',user='qa-review'))
 check('withdrawn proposal cannot be approved',req(body=wd),409)
 mid=str(uuid.uuid4());created.append(mid)
 check('anonymous suggestion saved',req('/api/messages',dict(requestId=mid,email=key+'@example.invalid',message='Private local fixture '+key,website=''),token=''),201)
 check('reviewer queue omits contact and account data',req(),predicate=lambda r:key+'@example.invalid' not in json.dumps(r) and 'userId' not in json.dumps(r) and 'clientHash' not in json.dumps(r))
 md=decision('message',mid)
 check('suggestion can be deferred',req(body=md),predicate=lambda r:r['review']['status']=='new')
 check('accepted suggestion requires a persisted paper',req(body={**md,'runId':key+'-accept','decision':'approved','checks':[dict(url=url,supports='Primary source verified for the local paper fixture.')]}),400)
 check('nonexistent paper cannot accept a suggestion',req(body={**md,'runId':key+'-accept','decision':'approved','publishedPaperId':'absent','checks':[dict(url=url,supports='Primary source verified for the local paper fixture.')]}),400)
 accepted={**md,'runId':key+'-accept','decision':'approved','publishedPaperId':'community-'+pid,'checks':[dict(url=url,supports='Primary source verified for the local paper fixture.')]}
 check('source-linked acceptance closes private inbox item',req(body=accepted),predicate=lambda r:r['review']['status']=='done')
 check('closed suggestion removed from pending queue',req(),predicate=lambda r:all(v['id']!=mid for v in r['messages']))
 pid3,url3=proposal();race=decision('proposal',pid3,'approved',url3)
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(lambda suffix:req(body={**race,'runId':key+suffix}),['-race-a','-race-b']))
 assert sorted(r[0] for r in results)==[200,409],results
 passed+=1;print('PASS concurrent reviewers cannot approve twice')
 check('private review notes absent from public updates',req('/api/updates'),predicate=lambda r:key not in json.dumps(r) and r['communityReview']['cadenceDays']==7)
 print(str(passed)+' weekly moderation checks passed.')
finally:
 for filename in pathlib.Path('.wrangler/state').rglob('*.sqlite'):
  try:
   with sqlite3.connect(filename) as db:
    db.executemany('DELETE FROM proposals WHERE id=? AND user_id=?',[(i,'qa-review') for i in created])
    db.executemany('DELETE FROM messages WHERE id=? AND email=?',[(i,key+'@example.invalid') for i in created])
    db.execute('DELETE FROM update_settings WHERE key LIKE ? AND payload LIKE ? ',('community-review:%','%'+key+'%'))
  except sqlite3.OperationalError:pass
