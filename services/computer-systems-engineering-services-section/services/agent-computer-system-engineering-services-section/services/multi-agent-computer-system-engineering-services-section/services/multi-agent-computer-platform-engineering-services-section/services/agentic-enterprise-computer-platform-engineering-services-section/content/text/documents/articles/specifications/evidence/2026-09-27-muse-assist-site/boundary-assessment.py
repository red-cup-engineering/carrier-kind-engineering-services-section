from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urljoin,urlsplit,unquote
import json,hashlib,subprocess,tempfile
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();c=Path(Path('/tmp/muse-public-candidate').read_text());old=Path('/tmp/muse-public-candidate-e6fop32a');r=Path(Path('/tmp/muse-provenance-generation-run').read_text());stage=Path(Path('/tmp/muse-site-input-stage').read_text());files={str(p.relative_to(c)):sha(p) for p in c.rglob('*') if p.is_file()};previous={str(p.relative_to(old)):sha(p) for p in old.rglob('*') if p.is_file()};assert files.keys()==previous.keys();changed=[n for n in files if files[n]!=previous[n]];assert set(changed)=={'release-manifest.json','report.json'}
for p in c.rglob('*'):
 if p.is_file():
  data=p.read_bytes();assert not any(x in data for x in [b'file://',b'/home/',b'/tmp/',b'/mnt/']),str(p)
class Read(HTMLParser):
 def __init__(self):super().__init__();self.ids=set();self.links=[];self.robots=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.add(a['id'])
  if tag in ['a','link'] and 'href' in a:self.links.append(a['href'])
  if tag in ['script','img'] and 'src' in a:self.links.append(a['src'])
  if tag=='meta' and a.get('name')=='robots':self.robots.append(a.get('content'))
parsed={}
for n in files:
 if n.endswith('.html'):x=Read();x.feed((c/n).read_text());parsed[n]=x
assert 'noindex' in parsed['404.html'].robots
count=0
for n,x in parsed.items():
 base='https://muse.561.group/'+('' if n=='index.html' else n.removesuffix('index.html'))
 for href in x.links:
  u=urlsplit(urljoin(base,href))
  if u.hostname!='muse.561.group':continue
  target=unquote(u.path).lstrip('/');target=target+'index.html' if not target or target.endswith('/') else target
  assert target in files,(n,href,target)
  if u.fragment:assert unquote(u.fragment) in parsed[target].ids,(n,href)
  count+=1
build=json.loads((r/'site-build.json').read_text());args=build['argv'];other=Path(tempfile.mkdtemp(prefix='muse-public-repeat-'));args=args.copy();args[4]=str(other);x=subprocess.run(args,capture_output=True,text=True);assert x.returncode==0,x.stderr;repeated={str(p.relative_to(other)):sha(p) for p in other.rglob('*') if p.is_file()};assert files==repeated
receipt={'candidate':str(c),'inventory':files,'changedSinceBrowserInspectedCandidate':changed,'allReadingAndAssetBytesIdenticalToBrowserAssessment':True,'localLinksChecked':count,'privatePathDisclosure':False,'notFoundNoindex':True,'identicalRepeat':{'path':str(other),'stdout':x.stdout,'stderr':x.stderr},'browserEvidence':'/tmp/muse-browser-final-observations.json','zoomEvidence':'/tmp/muse-final-zoom-observations.json','limits':['CSS zoom simulation, not browser UI zoom.','No public deployment established.']};Path('/tmp/muse-site-final-boundary-check.json').write_text(json.dumps(receipt,indent=2));print(json.dumps({k:v for k,v in receipt.items() if k not in ['inventory','identicalRepeat']}))
