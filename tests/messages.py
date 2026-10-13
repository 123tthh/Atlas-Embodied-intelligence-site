"""Anonymous inbox integration checks against LOCAL preview only; no email is sent."""
import concurrent.futures,json,pathlib,sqlite3,urllib.request,urllib.error,uuid
BASE='http://127.0.0.1:4173'
ORIGIN='https://123tthh.github.io'
ADMIN=('qa-admin','qa-admin@sites.test')
VISITOR=('qa-reader','qa-reader@sites.test')
key='inbox-local-'+uuid.uuid4().hex
email=key+'@example.invalid'
created=[];passed=0

def req(method='GET',body=None,origin=BASE,user=None,path='/api/messages',network=None):
 headers={'Origin':origin,'Content-Type':'application/json'}
 if network:headers['cf-connecting-ip']=network
 if user:headers.update({'oai-authenticated-user-id':user[0],'oai-authenticated-user-email':user[1]})
 request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 for attempt in range(2):
  try:r=urllib.request.urlopen(request,timeout=20)
  except TimeoutError:
   # Local workerd can stall an idle D1 read after a rejected request.
   # Only retry a read, once; never treat a timeout as a passing assertion.
   if method=='GET' and attempt==0:
    print('Local preview read timed out; retrying once.')
    continue
   raise
  except urllib.error.HTTPError as e:r=e
  with r:status,raw,h=r.status,r.read().decode(),dict(r.headers)
  if not(status==503 and raw.startswith('Your worker restarted mid-request.')):break
 try:data=json.loads(raw)
 except json.JSONDecodeError:data=raw
 return status,data,{k.lower():v for k,v in h.items()}

def check(name,result,status,predicate=lambda x:True):
 global passed
 assert result[0]==status and predicate(result[1]),(name,result)
 passed+=1;print('PASS',name)

def payload(message='A local-only inbox fixture; this must never be sent to a hosted website.'):
 rid=str(uuid.uuid4());created.append(rid)
 return {'requestId':rid,'email':email,'message':message,'website':''}

try:
 p=payload()
 r=req('OPTIONS',origin=ORIGIN)
 check('Pages preflight supports anonymous POST',r,204)
 assert r[2]['access-control-allow-origin']==ORIGIN and 'POST' in r[2]['access-control-allow-methods'] and 'access-control-allow-credentials' not in r[2]
 check('untrusted origin preflight rejected',req('OPTIONS',origin='https://untrusted.invalid'),403)
 check('untrusted origin cannot submit',req('POST',p,origin='https://untrusted.invalid'),403)
 check('invalid email rejected',req('POST',{**p,'email':'not-an-email'},origin=ORIGIN),400)
 check('empty message rejected',req('POST',{**p,'message':' '},origin=ORIGIN),400)
 check('oversized message rejected',req('POST',{**p,'message':'x'*30000},origin=ORIGIN),413)
 r=req('POST',p,origin=ORIGIN)
 check('anonymous Pages message saved with receipt',r,201,lambda d:d['received'] and d['id']==p['requestId'])
 assert r[2]['access-control-allow-origin']==ORIGIN
 check('identical retry does not duplicate',req('POST',p,origin=ORIGIN),200,lambda d:d.get('replayed') is True)
 check('changed payload cannot reuse request ID',req('POST',{**p,'message':'A different message using the same request ID.'},origin=ORIGIN),409)
 check('anonymous visitor cannot read messages',req(),403)
 check('signed-in non-maintainer cannot read messages',req(user=VISITOR),403)
 check('anonymous visitor cannot change status',req('PATCH',{'id':p['requestId'],'status':'done'}),403)
 check('non-maintainer cannot change status',req('PATCH',{'id':p['requestId'],'status':'done'},user=VISITOR),403)
 r=req(user=ADMIN)
 check('maintainer sees saved private message once',r,200,lambda d:sum(m['id']==p['requestId'] for m in d['messages'])==1 and any(m['id']==p['requestId'] and m['email']==email and m['source']=='github-pages' for m in d['messages']))
 assert 'clientHash' not in json.dumps(r[1]) and 'fingerprint' not in json.dumps(r[1])
 check('maintainer can mark handled',req('PATCH',{'id':p['requestId'],'status':'done'},user=ADMIN),200)
 check('handled status persists',req(user=ADMIN),200,lambda d:any(m['id']==p['requestId'] and m['status']=='done' for m in d['messages']))
 check('cross-origin status change rejected even for maintainer',req('PATCH',{'id':p['requestId'],'status':'new'},user=ADMIN,origin=ORIGIN),403)
 honey=payload();honey['website']='robot.example'
 check('honeypot returns neutral receipt',req('POST',honey,origin=ORIGIN),201)
 check('honeypot was not stored',req(user=ADMIN),200,lambda d:all(m['id']!=honey['requestId'] for m in d['messages']))
 network='local-rate-'+uuid.uuid4().hex
 batch=[payload('Local-only concurrent limiter fixture '+str(i)) for i in range(10)]
 with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
  results=list(pool.map(lambda b:req('POST',b,origin=ORIGIN,network=network),batch))
 assert sum(r[0] in [200,201] for r in results)==8 and sum(r[0]==429 for r in results)==2,results
 passed+=1;print('PASS concurrent submissions obey atomic daily limit')
 r=req(path='/api/catalog')
 check('private inbox data excluded from public catalog',r,200,lambda d:email not in json.dumps(d) and key not in json.dumps(d))
 print(str(passed)+' local inbox checks passed.')
finally:
 for dbfile in pathlib.Path('.wrangler/state').rglob('*.sqlite'):
  con=sqlite3.connect(dbfile)
  try:
   con.executemany('DELETE FROM messages WHERE id=? AND email=?',[(id,email) for id in created]);con.commit()
  except sqlite3.OperationalError:pass
  finally:con.close()
