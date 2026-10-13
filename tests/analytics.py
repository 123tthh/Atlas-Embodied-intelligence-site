"""Analytics integration tests against LOCAL production preview only. No hosted traffic is generated."""
import concurrent.futures,datetime,hashlib,hmac,json,pathlib,sqlite3,urllib.request,urllib.error,uuid
BASE='http://127.0.0.1:4173';PAGES='https://123tthh.github.io';TOKEN='local-integration-fixture'
visitors=[str(uuid.uuid4()) for _ in range(3)];events=[];passed=0
hashes=[hmac.new(TOKEN.encode(),('atlas-visits-v1\n'+s+'\n'+v).encode(),hashlib.sha256).hexdigest() for s in ['sites','github-pages'] for v in visitors]
def databases():
 for f in pathlib.Path('.wrangler/state').rglob('*.sqlite'):
  con=sqlite3.connect(f)
  if con.execute("SELECT count(*) FROM sqlite_master WHERE name='visit_days'").fetchone()[0]:yield con
  else:con.close()
def req(path='/api/analytics',body=None,token=TOKEN,origin=BASE,method=None,extra=None,user=None):
 headers={'Origin':origin,'Content-Type':'application/json','User-Agent':'Mozilla/5.0 Analytics local fixture'}
 if token:headers['X-Atlas-Update-Token']=token
 if user:headers.update({'oai-authenticated-user-id':user,'oai-authenticated-user-email':user+'@sites.test'})
 if extra:headers.update(extra)
 request=urllib.request.Request(BASE+path,data=json.dumps(body).encode() if body is not None else None,headers=headers,method=method)
 for attempt in range(2):
  try:r=urllib.request.urlopen(request,timeout=25)
  except urllib.error.HTTPError as e:r=e
  with r:status,raw,headers=r.status,r.read().decode(),dict(r.headers)
  if not(status==503 and raw.startswith('Your worker restarted mid-request.')):break
 try:data=json.loads(raw)
 except json.JSONDecodeError:data=raw[:300]
 return status,data,{k.lower():v for k,v in headers.items()}
def check(label,result,status=200,test=lambda d:True):
 global passed
 assert result[0]==status and test(result[1]),(label,result)
 passed+=1;print('PASS',label)
def event(v=0):
 eid=str(uuid.uuid4());events.append(eid);return dict(eventId=eid,visitorId=visitors[v])
def send(e,**kw):return req('/api/visits',e,token='',**kw)
try:
 check('anonymous statistics rejected',req(token=''),403)
 check('signed-in reader cannot view statistics',req(token='',user='qa-reader'),403)
 check('invalid service token cannot view statistics',req(token='wrong'),403)
 r=req(token='',user='qa-admin');check('maintainer can read private aggregate statistics',r);assert r[2]['cache-control']=='no-store' and 'access-control-allow-origin' not in r[2]
 check('invalid source filter rejected',req('/api/analytics?source=untrusted'),400)
 check('unbounded time window rejected',req('/api/analytics?days=999999'),400)
 baseline=req()[1]
 check('Pages CORS permits anonymous collection',req('/api/visits',token='',method='OPTIONS',origin=PAGES),204)
 check('untrusted origin cannot collect',send(event(),origin='https://untrusted.invalid'),403)
 check('arbitrary personal fields rejected',send({**event(),'email':'do-not-store@example.invalid'}),400)
 check('oversized event rejected',send({**event(),'junk':'x'*3000}),413)
 check('DNT signal ignored without counting',send(event(),extra={'DNT':'1'}),test=lambda d:d['ignored'])
 check('GPC signal ignored without counting',send(event(),extra={'Sec-GPC':'1'}),test=lambda d:d['ignored'])
 check('known bot ignored',send(event(),extra={'User-Agent':'Googlebot/2.1'}),test=lambda d:d['ignored'])
 assert req()[1]['total']==baseline['total']
 e=event();check('anonymous visit recorded',send(e),test=lambda d:d['received'])
 r=req()[1];assert r['total']['visitors']==baseline['total']['visitors']+1 and r['total']['pageviews']==baseline['total']['pageviews']+1
 check('same event safely replayed',send(e))
 assert req()[1]['total']==r['total']
 check('changed visitor cannot reuse event ID',send({**e,'visitorId':visitors[1]}),409)
 check('repeat browser view recorded',send(event()))
 r=req()[1];assert r['total']['visitors']==baseline['total']['visitors']+1 and r['total']['pageviews']==baseline['total']['pageviews']+2
 e2=event(1)
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(lambda _:send(e2),range(6)))
 assert all(r[0]==200 for r in results),results
 r=req()[1];assert r['total']['visitors']==baseline['total']['visitors']+2 and r['total']['pageviews']==baseline['total']['pageviews']+3
 passed+=1;print('PASS concurrent identical delivery counts once')
 check('Pages visit recorded through shared collector',send(event(),origin=PAGES))
 r=req()[1];assert r['total']['visitors']==baseline['total']['visitors']+3
 check('source filters isolate Pages',req('/api/analytics?source=github-pages'),test=lambda d:d['total']['visitors']>=1)
 assert len(r['trend'])==30 and r['timezone']=='Asia/Shanghai'
 assert all(v not in json.dumps(r) for v in visitors) and 'visitorHash' not in json.dumps(r)
 passed+=1;print('PASS statistics expose only aggregates and zero-fill missing days')
 today=(datetime.datetime.now(datetime.timezone.utc)+datetime.timedelta(hours=8)).date()
 yesterday=(today-datetime.timedelta(days=1)).isoformat()
 for con in databases():
  with con:
   con.execute('INSERT INTO visit_days(day,visitor_hash,source,pageviews) VALUES(?,?,?,?)',(yesterday,hashes[0],'sites',1))
   con.execute('UPDATE visit_visitors SET pageviews=pageviews+1 WHERE visitor_hash=?',(hashes[0],))
  con.close()
 r=req()[1]
 assert r['period']['visitors']==baseline['period']['visitors']+3 and sum(d['visitors'] for d in r['trend'])>r['period']['visitors']
 passed+=1;print('PASS period uniques deduplicate returning browsers across days')
 for con in databases():
  with con:con.execute('UPDATE visit_days SET pageviews=499 WHERE day=? AND visitor_hash=?',(today.isoformat(),hashes[0]))
  con.close()
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(send,[event(),event()]))
 assert sorted(r[0] for r in results)==[200,429],results
 passed+=1;print('PASS concurrent events respect per-browser daily cap')
 for con in databases():
  with con:
   rows=con.execute('SELECT visitor_hash FROM visit_visitors WHERE visitor_hash IN ('+','.join('?' for _ in hashes)+')',hashes).fetchall()
   assert rows and all(len(row[0])==64 and row[0] not in visitors for row in rows)
  con.close()
 passed+=1;print('PASS only secret-derived visitor hashes are stored')
 print(str(passed)+' local analytics checks passed.')
finally:
 for con in databases():
  with con:
   con.executemany('DELETE FROM visit_events WHERE id=?',[(e,) for e in events])
   con.executemany('DELETE FROM visit_days WHERE visitor_hash=?',[(h,) for h in hashes])
   con.executemany('DELETE FROM visit_visitors WHERE visitor_hash=?',[(h,) for h in hashes])
  con.close()
