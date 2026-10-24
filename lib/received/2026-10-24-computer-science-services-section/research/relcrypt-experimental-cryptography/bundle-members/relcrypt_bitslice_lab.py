import time, math, statistics, os, random, struct, hashlib
MASK=(1<<64)-1

def rotl(x,k):
    k%=64
    return ((x<<k)&MASK)|(x>>(64-k) if k else x)

def rotr(x,k):
    k%=64
    return (x>>k)|(((x<<(64-k))&MASK) if k else 0)

def init_state(key:bytes, nonce:bytes=b''):
    h=hashlib.blake2b(key+nonce, digest_size=32).digest()
    return list(struct.unpack('<4Q', h))

def k4_act(p,n,m0,m1):
    # m0 = neg generator, m1 = conf generator.
    # id: (p,n); neg: (n,p); conf: (~n,~p); negConf: (~p,~n)
    s=(m0^m1)&MASK
    pp=((p & (~s & MASK)) | (n & s)) & MASK
    nn=((n & (~s & MASK)) | (p & s)) & MASK
    pp ^= m1; nn ^= m1
    return pp&MASK, nn&MASK

def settle_planes_v5(p,n,k,rounds=2):
    for r in range(rounds):
        kp=rotl(k, (r*13+5)%64)
        pos_fire = ((rotl(p,1) & rotr(n,3)) | (rotl(p,7)&p) | (kp & rotr(p^n,11))) & MASK
        neg_fire = ((rotr(p,1) & rotl(n,5)) | (rotl(n,9)&n) | ((~kp&MASK) & rotl(p^n,17))) & MASK
        both_fire = (rotl(p&n, r+1) | (pos_fire & neg_fire) | (rotl(pos_fire,3)&rotr(neg_fire,5))) & MASK
        p |= pos_fire | both_fire
        n |= neg_fire | both_fire
        p &= MASK; n &= MASK
    return p,n

def settle_planes_v6(p,n,k,rounds=3):
    for r in range(rounds):
        top=p&n; truth=p&(~n&MASK); false=(~p&MASK)&n
        boundary=(top ^ rotl(top,1) ^ rotr(top,1)) & MASK
        pos_fire = (rotl(truth,5) | (rotr(false,7)&rotl(p^n,11)) | (boundary & rotl(k,r+3))) & MASK
        neg_fire = (rotr(false,3) | (rotl(truth,13)&rotr(p^n,9)) | (boundary & rotr(k,r+5))) & MASK
        both_fire = ((pos_fire&neg_fire) | (rotl(top,2*r+1)&(p^n)) | (rotl(boundary,17)&rotr(k,23))) & MASK
        p |= pos_fire | both_fire
        n |= neg_fire | both_fire
        gm0=rotl(k,7*r+1); gm1=rotr(k,11*r+5)
        p,n=k4_act(p,n,gm0,gm1)
    return p&MASK,n&MASK

class RelStreamV5:
    def __init__(self,key:bytes,nonce:bytes=b''):
        self.s=init_state(b'v5'+key,nonce); self.ctr=0
    def word(self):
        s0,s1,s2,s3=self.s
        result=(rotl((s1*5)&MASK,7)*9)&MASK
        t=(s1<<17)&MASK
        s2 ^= s0; s3 ^= s1; s1 ^= s2; s0 ^= s3
        s2 ^= t; s3=rotl(s3,45)
        self.s=[s0&MASK,s1&MASK,s2&MASK,s3&MASK]
        k=(result ^ rotl(s0,23) ^ rotr(s3,19) ^ self.ctr)&MASK
        p=(s0 ^ rotl(s1,17) ^ k)&MASK
        n=(s2 ^ rotl(s3,31) ^ rotr(k,7))&MASK
        m0=(s1 ^ rotr(s2,13) ^ rotl(k,3))&MASK
        m1=(s3 ^ rotl(s0,29) ^ rotr(k,5))&MASK
        p,n=k4_act(p,n,m0,m1)
        p,n=settle_planes_v5(p,n,k,rounds=2)
        top=p&n; truth=p&(~n&MASK); false=(~p&MASK)&n
        h0t=truth.bit_count(); h0top=top.bit_count(); bd=(top^rotl(top,1)).bit_count()
        inv=((h0t*0x9E3779B97F4A7C15) ^ (h0top*0xD1B54A32D192ED03) ^ (bd*0x94D049BB133111EB))&MASK
        out=(result ^ p ^ rotl(n,11) ^ rotl(top,23) ^ inv ^ rotr(k,17))&MASK
        self.s[0]^=out; self.s[1]^=rotl(out,17); self.s[2]^=top; self.s[3]^=rotl(truth^false,29)
        self.ctr=(self.ctr+0x9E3779B97F4A7C15)&MASK
        return out&MASK
    def keystream(self,nbytes):
        out=bytearray()
        while len(out)<nbytes:
            out += self.word().to_bytes(8,'little')
        return bytes(out[:nbytes])
    def crypt(self,data):
        ks=self.keystream(len(data))
        return bytes(a^b for a,b in zip(data,ks))

class RelStreamV6:
    def __init__(self,key:bytes,nonce:bytes=b''):
        self.s=init_state(b'v6'+key,nonce); self.ctr=0
    def word(self):
        s0,s1,s2,s3=self.s
        z=(s0 + rotl(s3,23) + self.ctr)&MASK
        core=(z ^ rotl(s1,17) ^ (s2 & rotl(s3,41)))&MASK
        ns0=(rotl(s0,11) ^ s1 ^ (s2&s3) ^ self.ctr)&MASK
        ns1=(rotl(s1,19) ^ s2 ^ (s3|s0))&MASK
        ns2=(rotl(s2,37) ^ s3 ^ (s0&s1))&MASK
        ns3=(rotl(s3,53) ^ s0 ^ (s1|s2) ^ 0xA5A5A5A5A5A5A5A5)&MASK
        self.s=[ns0,ns1,ns2,ns3]
        p=(core ^ ns0 ^ rotl(ns2,7))&MASK
        n=(rotr(core,3) ^ ns1 ^ rotl(ns3,29))&MASK
        m0=(ns0^ns1^rotl(core,13))&MASK
        m1=(ns2^ns3^rotr(core,17))&MASK
        p,n=k4_act(p,n,m0,m1)
        p,n=settle_planes_v6(p,n,core^self.ctr,rounds=3)
        top=p&n; truth=p&(~n&MASK); false=(~p&MASK)&n; bot=(~p&MASK)&(~n&MASK)
        h=(truth.bit_count() | (false.bit_count()<<7) | (top.bit_count()<<14) | ((top^rotl(top,1)).bit_count()<<21)) & MASK
        h ^= ((bot.bit_count()*0x100000001B3)&MASK)
        out=(core ^ p ^ rotl(n,9) ^ rotr(truth,7) ^ rotl(false,31) ^ ((h*0x9E3779B97F4A7C15)&MASK))&MASK
        # MurmurHash3 finalizer as nonlinear whitening, not a security claim.
        out ^= out>>33; out=(out*0xff51afd7ed558ccd)&MASK; out ^= out>>33; out=(out*0xc4ceb9fe1a85ec53)&MASK; out ^= out>>33
        self.s[0]^=out; self.s[1]^=rotl(out,13); self.s[2]^=top^rotl(truth,5); self.s[3]^=false^rotl(p^n,27)
        self.ctr=(self.ctr+1)&MASK
        return out&MASK
    def keystream(self,nbytes):
        out=bytearray()
        while len(out)<nbytes:
            out += self.word().to_bytes(8,'little')
        return bytes(out[:nbytes])
    def crypt(self,data):
        ks=self.keystream(len(data))
        return bytes(a^b for a,b in zip(data,ks))

def stats(data: bytes):
    nbits=len(data)*8
    ones=sum(b.bit_count() for b in data)
    z=(ones-nbits/2)/math.sqrt(nbits/4) if nbits else 0
    counts=[0]*256
    for b in data: counts[b]+=1
    exp=len(data)/256
    chi=sum((c-exp)**2/exp for c in counts) if exp else 0
    ent=0.0
    for c in counts:
        if c:
            p=c/len(data); ent-=p*math.log2(p)
    if len(data)>1:
        xs=data[:-1]; ys=data[1:]
        mx=sum(xs)/len(xs); my=sum(ys)/len(ys)
        cov=sum((x-mx)*(y-my) for x,y in zip(xs,ys))
        vx=sum((x-mx)**2 for x in xs); vy=sum((y-my)**2 for y in ys)
        corr=cov/math.sqrt(vx*vy) if vx and vy else 0
    else: corr=0
    return dict(size=len(data), monobit_z=z, byte_chi2=chi, entropy=ent, serial_corr=corr)

def key_avalanche(C, nbytes=8192, trials=128):
    base_key=bytes(range(32)); nonce=b'nonce-1234567890'
    base=C(base_key, nonce).keystream(nbytes)
    fracs=[]
    for i in range(trials):
        k=bytearray(base_key); bit=i%(len(k)*8); k[bit//8]^=1<<(bit%8)
        out=C(bytes(k), nonce).keystream(nbytes)
        dist=sum((a^b).bit_count() for a,b in zip(base,out))
        fracs.append(dist/(nbytes*8))
    return dict(mean=statistics.mean(fracs), stdev=statistics.pstdev(fracs), min=min(fracs), max=max(fracs))

def nonce_avalanche(C, nbytes=8192, trials=64):
    key=bytes(range(32)); base_nonce=bytearray(b'nonce-1234567890')
    base=C(key, bytes(base_nonce)).keystream(nbytes)
    fracs=[]
    for i in range(trials):
        n=bytearray(base_nonce); bit=i%(len(n)*8); n[bit//8]^=1<<(bit%8)
        out=C(key, bytes(n)).keystream(nbytes)
        dist=sum((a^b).bit_count() for a,b in zip(base,out))
        fracs.append(dist/(nbytes*8))
    return dict(mean=statistics.mean(fracs), stdev=statistics.pstdev(fracs), min=min(fracs), max=max(fracs))

def throughput(C, nbytes=1024*1024):
    t0=time.perf_counter(); data=C(b'K'*32,b'N'*16).keystream(nbytes); t1=time.perf_counter()
    return dict(mbps=nbytes/(t1-t0)/1e6, first16=data[:16].hex())

def aes_ctr_sample(nbytes=1024*1024):
    try:
        from Crypto.Cipher import AES
        from Crypto.Util import Counter
        key=bytes(range(32)); ctr=Counter.new(128, initial_value=0)
        c=AES.new(key,AES.MODE_CTR,counter=ctr)
        t0=time.perf_counter(); data=c.encrypt(b'\x00'*nbytes); t1=time.perf_counter()
        return data, nbytes/(t1-t0)/1e6
    except Exception:
        return None, None

def run():
    rows=[]
    for C in [RelStreamV5,RelStreamV6]:
        data=C(b'testkey'*4,b'nonce').keystream(512*1024)
        row={'name':C.__name__}
        row.update(stats(data)); row['key_avalanche']=key_avalanche(C); row['nonce_avalanche']=nonce_avalanche(C); row['throughput']=throughput(C,512*1024)
        rows.append(row)
    aes,ambps=aes_ctr_sample(512*1024)
    if aes is not None:
        row={'name':'AES-CTR(PyCryptodome)'}; row.update(stats(aes)); row['throughput']={'mbps':ambps,'first16':aes[:16].hex()}; rows.append(row)
    return rows

if __name__=='__main__':
    import json
    print(json.dumps(run(),indent=2))
