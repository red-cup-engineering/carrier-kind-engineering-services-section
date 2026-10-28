#!/usr/bin/env python3
"""Mini-RelCrypt Ω/Ξ cryptanalysis: exact 12-bit reduced model.

This mini model keeps the RelMath-inspired operator shapes while making ANF degree,
coordinate-invariant, linear-invariant, and differential probes cheap enough to run
exactly or semi-exactly.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple
import json, math, random, statistics

W=3; MASK=(1<<W)-1; NVAR=12; SPACE=1<<NVAR; FULL=SPACE-1

def rotl(x:int,r:int)->int:
    r%=W; x&=MASK
    return ((x<<r)|(x>>(W-r)))&MASK if r else x

def rotr(x:int,r:int)->int:
    r%=W; x&=MASK
    return ((x>>r)|(x<<(W-r)))&MASK if r else x

def bitselect(m:int,a:int,b:int)->int:
    m&=MASK
    return ((m&a)|((~m&MASK)&b))&MASK

def mix(x:int)->int:
    x&=MASK
    x ^= rotl(x,1)
    x ^= ((x & rotl(x,2)) << 1) & MASK
    x ^= ((~x&MASK)&rotr(x,1))
    return x&MASK

def rc(r:int,d:int=0)->int:
    z=(0x5 ^ (r*0x3) ^ (d*0x6) ^ ((r+d)*0x7)) & MASK
    t=0
    for i in range(W):
        if ((i+r+3*d).bit_count()&1): t|=1<<i
    return mix(z^t)

def exists_nb(x:int,a:int,b:int)->int: return (x|rotl(x,a)|rotr(x,b))&MASK
def forall_nb(x:int,a:int,b:int)->int: return (x&rotl(x,a)&rotr(x,b))&MASK

def rows(P:int,N:int)->Tuple[int,int,int,int]:
    P&=MASK;N&=MASK
    T=P&(~N&MASK); F=(~P&MASK)&N; TOP=P&N; BOT=(~P&MASK)&(~N&MASK)
    return T,F,TOP,BOT

def gauge2(P:int,N:int,G:int)->Tuple[int,int]: return bitselect(G,N,P), bitselect(G,P,N)

def k4(P:int,N:int,M0:int,M1:int)->Tuple[int,int]:
    idm=(~M0&~M1)&MASK; neg=(M0&~M1)&MASK; conf=(~M0&M1)&MASK; nc=(M0&M1)&MASK
    outP=((idm&P)|(neg&N)|(conf&(~N&MASK))|(nc&(~P&MASK)))&MASK
    outN=((idm&N)|(neg&P)|(conf&(~P&MASK))|(nc&(~N&MASK)))&MASK
    return outP,outN

def adjoint(P:int,N:int,r:int,salt:int)->Tuple[int,int,int]:
    ep=exists_nb(P,1+(r&1),1+((salt>>1)&1)); en=exists_nb(N,1+((r>>1)&1),1+((salt>>2)&1))
    ap=forall_nb(P,1+((salt>>0)&1),1+(r&1)); an=forall_nb(N,1+((salt>>1)&1),1+((r>>1)&1))
    bd=(ep^ap^rotl(en^an,1)^((ep&an)|(en&ap)))&MASK
    return (ep^rotl(ap,1))&MASK,(en^rotr(an,1))&MASK,bd

def k_nucleus(P:int,N:int,r:int,obs:int)->Tuple[int,int]:
    T,F,TOP,BOT=rows(P,N)
    pf=(rotl(T,1+(r&1)) | (rotl(P,1)&rotr(N,1)) | (BOT&rotl(obs,1)) | (TOP&rc(r,1)))&MASK
    nf=(rotr(F,1+(r&1)) | (rotr(N,1)&rotl(P,1)) | (BOT&rotr(obs,1)) | (TOP&rc(r,2)))&MASK
    tf=((pf&nf)|(rotl(TOP,1)&rc(r,3))|((P^rotr(N,1))&TOP))&MASK
    return (P|pf|tf)&MASK,(N|nf|tf)&MASK

def t_nucleus(P:int,N:int,r:int,obs:int)->Tuple[int,int]:
    T,F,TOP,BOT=rows(P,N)
    pf=(rotl(T|TOP,1+(r&1)) ^ (BOT&rotl(obs,1)) ^ (P&rotr(T,1)))&MASK
    nf=(rotr(F|TOP,1+((r>>1)&1)) ^ (BOT&rotr(obs,1)) ^ (N&rotl(F,1)))&MASK
    return (P|pf)&MASK,(N|nf)&MASK

def commutator(P:int,N:int,r:int,obs:int)->Tuple[int,int,int]:
    kP,kN=k_nucleus(P,N,r,obs); ktP,ktN=t_nucleus(kP,kN,r+1,rotl(obs,1))
    tP,tN=t_nucleus(P,N,r,obs); tkP,tkN=k_nucleus(tP,tN,r+1,rotr(obs,1))
    cP=ktP^tkP; cN=ktN^tkN; c=mix(cP^rotl(cN,1)^rc(r,4))
    return cP,cN,c

def chu(P:int,N:int,O:int,r:int)->int:
    T,F,TOP,BOT=rows(P,N)
    e0=(T&O).bit_count(); e1=(F&rotl(O,1)).bit_count(); e2=(TOP&rotr(O,1)).bit_count(); e3=(BOT&(O^rotl(O,2))).bit_count()
    bits=0; bits|=(e0>e1); bits|=(e2>1)<<1; bits|=((e0+e2)>(e1+e3))<<2; bits|=((e0^e1^e2^e3)&1)<<3
    return mix(bits^(e0<<1)^(e1<<2)^(e2<<3)^rc(r,5))

@dataclass(frozen=True)
class Variant:
    name:str; gauge:bool=True; adj:bool=True; comm:bool=True; chu:bool=True; k4:bool=True; bridge:bool=True

VARS=[
    Variant('mini_omega_full'),
    Variant('mini_xi_no_commutator', comm=False),
    Variant('mini_phi_baseline', adj=False, comm=False, chu=False),
    Variant('mini_no_gauge2', gauge=False),
    Variant('mini_no_k4_boundary', k4=False),
    Variant('mini_no_flow_bridge', bridge=False),
    Variant('mini_gf2_only', gauge=False, adj=False, comm=False, chu=False, k4=False),
]

def oracle(b:int,c:int,d:int,r:int,v:Variant)->int:
    P=(b^rotl(c,1)^rc(r,10))&MASK; N=(d^rotr(c,1)^rc(r,11))&MASK
    obs=mix(b^rotl(c,1)^rotr(d,1)^rc(r,12))
    if v.gauge:
        P,N=gauge2(P,N,(c^rotl(d,1)^rc(r,13))&MASK)
    bd=0
    if v.adj:
        aP,aN,bd=adjoint(P,N,r,obs); P^=aP; N^=aN
    P,N=k_nucleus(P,N,r,obs^bd)
    curv=0
    if v.comm:
        cP,cN,curv=commutator(P,N,r,obs^bd); P^=cP; N^=cN
    if v.chu:
        obs^=chu(P,N,mix(b^d^rc(r,14)),r)
    T,F,TOP,BOT=rows(P,N)
    h=(T.bit_count() ^ (F.bit_count()<<1) ^ (TOP.bit_count()<<2) ^ (BOT.bit_count()<<3))&MASK
    if v.k4:
        P,N=k4(P,N,(b^obs^rc(r,15))&MASK,(d^bd^curv^rc(r,16))&MASK)
    sem=(P^rotl(N,1)^h^bd^curv^obs)&MASK
    if v.bridge:
        br=(b^rotl(c,1)^rotr(d,1)^((b+d+rc(r,17))&MASK))&MASK
        sem^=mix(br^(b&rotl(d,1)))
    return sem&MASK

def rnd(s:int,r:int,v:Variant)->int:
    a=s&MASK; b=(s>>3)&MASK; c=(s>>6)&MASK; d=(s>>9)&MASK
    f=oracle(b,c,d,r,v)
    return b | (c<<3) | (d<<6) | ((a^f)&MASK)<<9

def perm(s:int,rounds:int,v:Variant)->int:
    for r in range(rounds): s=rnd(s,r,v)
    return s&FULL

def map_perm(rounds:int,v:Variant)->List[int]: return [perm(x,rounds,v) for x in range(SPACE)]

def anf(mp:List[int])->Dict[str,object]:
    weights=[i.bit_count() for i in range(SPACE)]
    degs=[]; terms=[]
    for bit in range(NVAR):
        f=[(y>>bit)&1 for y in mp]
        for i in range(NVAR):
            half=1<<i; block=half<<1
            for base in range(0,SPACE,block):
                for j in range(base,base+half): f[j+half]^=f[j]
        deg=0; cnt=0; maxt=0
        for m,c in enumerate(f):
            if c:
                w=weights[m]; cnt+=1
                if w>deg: deg=w; maxt=1
                elif w==deg: maxt+=1
        degs.append(deg); terms.append(cnt)
    return {'degrees':degs,'max_degree':max(degs),'min_degree':min(degs),'avg_degree':sum(degs)/NVAR,'avg_terms':sum(terms)/NVAR,'terms':terms}

def diff_probe(mp:List[int],deltas:List[int])->Dict[str,object]:
    worst=0; wd=0; wo=0; probs=[]
    for dlt in deltas:
        counts={}
        for x in range(SPACE):
            od=mp[x]^mp[x^dlt]
            counts[od]=counts.get(od,0)+1
        od,c=max(counts.items(),key=lambda kv:kv[1])
        probs.append(c/SPACE)
        if c>worst: worst=c; wd=dlt; wo=od
    return {'num_deltas':len(deltas),'worst_probability':worst/SPACE,'worst_count':worst,'worst_input_delta_hex':hex(wd),'worst_output_delta_hex':hex(wo),'avg_max_probability':sum(probs)/len(probs),'median_max_probability':statistics.median(probs)}

def coord_inv(mp:List[int])->Dict[str,object]:
    found=[]
    for M in range(1,SPACE):
        comp=(~M)&FULL; y=comp; ok=True
        while True:
            if mp[y]&M: ok=False; break
            if y==0: break
            y=(y-1)&comp
        if ok: found.append(M)
    return {'found':bool(found),'count':len(found),'masks_hex':[hex(m) for m in found[:20]]}

def lin_inv(mp:List[int])->Dict[str,object]:
    found=[]
    # all masks exact, 4095*4096 cheap enough for selected rounds
    for M in range(1,SPACE):
        ok=True
        for x,y in enumerate(mp):
            if (((x&M).bit_count()^(y&M).bit_count())&1): ok=False; break
        if ok: found.append(M)
    return {'found':bool(found),'count':len(found),'masks_hex':[hex(m) for m in found[:20]]}

def pearson(xs,ys):
    mx=sum(xs)/len(xs); my=sum(ys)/len(ys); vx=sum((x-mx)**2 for x in xs); vy=sum((y-my)**2 for y in ys)
    if vx==0 or vy==0: return 0.0
    return sum((x-mx)*(y-my) for x,y in zip(xs,ys))/math.sqrt(vx*vy)

def apply_mask(c:int,m:int)->int:
    p=c&1; n=(c>>1)&1
    if m==0: o=(p,n)
    elif m==1: o=(n,p)
    elif m==2: o=(1-n,1-p)
    else: o=(1-p,1-n)
    return o[0]|(o[1]<<1)

def leakage(samples=200000,seed=123)->Dict[str,object]:
    rng=random.Random(seed); out={}
    schemes={'none':lambda c:c,'gauge2_uniform':lambda c:apply_mask(c,rng.randrange(2)),'k4_uniform':lambda c:apply_mask(c,rng.randrange(4))}
    for name,fn in schemes.items():
        hw=[]; lp=[]; ln=[]; pos=[]; neg=[]; truth=[]; false=[]; top=[]; bottom=[]; classical=[]
        for _ in range(samples):
            c=rng.randrange(4); p=c&1; n=(c>>1)&1; m=fn(c); mp=m&1; mn=(m>>1)&1
            hw.append(mp+mn); lp.append(mp); ln.append(mn); pos.append(p); neg.append(n)
            truth.append(1 if (p,n)==(1,0) else 0); false.append(1 if (p,n)==(0,1) else 0); top.append(1 if (p,n)==(1,1) else 0); bottom.append(1 if (p,n)==(0,0) else 0); classical.append(1 if p^n else 0)
        out[name]={'corr_hw_pos':pearson(hw,pos),'corr_hw_neg':pearson(hw,neg),'corr_hw_truth':pearson(hw,truth),'corr_hw_false':pearson(hw,false),'corr_hw_top':pearson(hw,top),'corr_hw_bottom':pearson(hw,bottom),'corr_hw_classical_orbit':pearson(hw,classical),'corr_leakpos_pos':pearson(lp,pos),'corr_leakpos_neg':pearson(lp,neg),'corr_leakpos_truth':pearson(lp,truth),'corr_leakpos_false':pearson(lp,false)}
    return out

def run():
    rounds=[1,2,3,4,5,6,8]
    rng=random.Random(4242)
    low=[1<<i for i in range(NVAR)] + [(1<<i)^(1<<((i+1)%NVAR)) for i in range(NVAR)]
    rand=[]
    while len(rand)<24:
        d=rng.randrange(1,SPACE)
        if d not in rand: rand.append(d)
    deltas=low+rand
    res={'params':{'nvars':NVAR,'space':SPACE,'branch_bits':W},'sidechannel':leakage(),'variants':{}}
    for v in VARS:
        print('[variant]',v.name,flush=True)
        vr={'config':asdict(v),'rounds':{}}
        for r in rounds:
            print('  r',r,flush=True)
            mp=map_perm(r,v)
            item={'bijective':len(set(mp))==SPACE,'anf':anf(mp),'differential':diff_probe(mp,deltas if r>=2 else low)}
            if r in (2,4,6,8):
                item['coordinate_zero_invariants']=coord_inv(mp)
                item['linear_invariants']=lin_inv(mp)
            vr['rounds'][str(r)]=item
        res['variants'][v.name]=vr
    return res

if __name__=='__main__':
    out=run(); p=Path('/mnt/data/relcrypt_mini12_cryptanalysis_results.json'); p.write_text(json.dumps(out,indent=2),encoding='utf-8'); print('wrote',p)
