from pathlib import Path
import subprocess,os,tempfile,json,sys,time,signal,hashlib
root=Path(tempfile.mkdtemp(prefix='muse-journal-lock-'));lock=root/'maintenance.lock';checks=[]
def check(name,condition,detail):
 checks.append({'name':name,'ok':bool(condition),'detail':detail});assert condition,name
def competing():return subprocess.run(['/usr/bin/flock','--exclusive','--nonblock',str(lock),'/bin/true'],capture_output=True).returncode
fd=os.open(lock,os.O_CREAT|os.O_RDWR,0o600);inode=os.fstat(fd).st_ino
x=subprocess.run(['/usr/bin/flock','--exclusive','--nonblock',str(fd)],pass_fds=(fd,),capture_output=True)
check('short-lived helper acquired lock',x.returncode==0,{'exitCode':x.returncode})
code=competing();check('parent retains lock after helper exited',code==1,{'competingExitCode':code})
os.close(fd);code=competing();check('closing parent descriptor releases lock',code==0,{'competingExitCode':code})
script='''import os,subprocess,sys,time
fd=os.open(sys.argv[1],os.O_RDWR)
r=subprocess.run(['/usr/bin/flock','--exclusive','--nonblock',str(fd)],pass_fds=(fd,))
assert r.returncode==0
print('held',flush=True)
time.sleep(30)
'''
child=subprocess.Popen([sys.executable,'-c',script,str(lock)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
 check('owner reports acquisition after helper exits',child.stdout.readline().strip()=='held',{'ownerPid':child.pid})
 code=competing();check('independent owner excludes competitor',code==1,{'competingExitCode':code})
 child.kill();child.wait(timeout=5)
 code=competing();check('SIGKILL owner releases lock without PID reclamation',code==0,{'ownerExitCode':child.returncode,'competingExitCode':code})
 check('lock file inode survives all releases',lock.stat().st_ino==inode,{'inode':inode})
finally:
 if child.poll() is None:child.kill();child.wait()
report={'checks':checks,'filesystem':subprocess.check_output(['stat','-f','-c','%T',str(root)],text=True).strip(),'kernel':os.uname().release,'flock':subprocess.check_output(['/usr/bin/flock','--version'],text=True).strip(),'limits':['Controlled local-host lock ownership observation only. No power-loss, remote filesystem, closure durability, journal integration or independent-writer compliance demonstrated.'],'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(root/'observation.json').write_text(json.dumps(report,indent=2)+'\n');Path('/tmp/muse-journal-lock-observation').write_text(str(root));print(json.dumps(report,indent=2))
