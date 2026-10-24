#!/usr/bin/env python3
"""Mini-RelCrypt-Sigma exact 8-bit cryptanalysis.

This exact reduced model is intentionally small enough to exhaustively compute ANF,
differentials, invariants, and representation leakage. It is not a security proof for
512-bit Sigma; it is a fast microscope for structural failures.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Dict, List, Tuple
import json, math, random, statistics

W=2; MASK=(1<<W)-1; NVAR=8; SPACE=1<<NVAR; FULL=SPACE-1

def rotl(x:int,r:int)->int:
    r%=W; x&=MASK
    return (((x<<r)&MASK)|(x>>(W-r)))&MASK if r else x

def rotr(x:int,r:int)->int:
    r%=W; x&=MASK
    return ((x>>r)|((x<<(W-r))&MASK))&MASK if r else x

def mix(x:int)->int:
    x&=MASK
    x ^= rotl(x,1)
    x ^= ((x & rotl(x,1)) << 1) & MASK
    x ^= ((~x & MASK) & rotr(x,1))
    x ^= (x*3+1)&MASK
    return x&MASK

def rc(r:int,d:int=0)->int:
    z=(1 ^ r*3 ^ d*2 ^ (r+d)*1)&MASK
    t=0
    for i in range(W):
        if ((i+r+2*d).bit_count()&1): t|=1<<i
    return mix(z^t)

def exists_nb(x:int,a:int,b:int)->int: return (x|rotl(x,a)|rotr(x,b))&MASK
def forall_nb(x:int,a:int,b:int)->int: return (x&rotl(x,a)&rotr(x,b))&MASK

def rows(P:int,N:int):
    P&=MASK; N&=MASK
    return P&(~N&MASK), (~P&MASK)&N, P&N, (~P&MASK)&(~N&MASK)

def sel(m,a,b): return ((m&a)|((~m&MASK)&b))&MASK

def gauge2(P,N,G): return sel(G,N,P), sel(G,P,N)

def k4(P,N,M0,M1):
    idm=(~M0&~M1)&MASK; neg=(M0&~M1)&MASK; nc=(~M0&M1)&MASK; conf=(M0&M1)&MASK
    outP=((idm&P)|(neg&N)|(nc&(~P&MASK))|(conf&(~N&MASK)))&MASK
    outN=((idm&N)|(neg&P)|(nc&(~N&MASK))|(conf&(~P&MASK)))&MASK
    return outP,outN

@dataclass(frozen=True)
class Variant:
    name:str; balanced:bool=True; gauge:bool=True; adjoint:bool=True; chu:bool=True; k4:bool=True; bridge:bool=True; closure_passes:int=2

VARIANTS=[
    Variant('sigma_full'),
    Variant('sigma_no_balanced_code', balanced=False),
    Variant('sigma_no_gauge2', gauge=False),
    Variant('sigma_no_adjoint', adjoint=False),
    Variant('sigma_no_chu_fca', chu=False),
    Variant('sigma_no_k4_boundary', k4=False),
    Variant('sigma_no_flow_bridge', bridge=False),
    Variant('sigma_one_closure_pass', closure_passes=1),
    Variant('sigma_gf2_core_only', balanced=False,gauge=False,adjoint=False,chu=False,k4=False,closure_passes=0),
]

def oracle(b,c,d,r,v:Variant):
    flow=mix((b+rotl(c,1)+rc(r,0))&MASK) ^ rotl(d^rc(r,1),1)
    flow=mix(flow^b^c^d)
    P=mix(b^rotl(c,1)^rc(r,2)); N=mix(d^rotr(c,1)^rc(r,3))
    if v.gauge:
        P,N=gauge2(P,N,mix(c^rotl(d,1)^rc(r,4)))
    PP,NN=P,N
    for j in range(v.closure_passes):
        T,F,TOP,BOT=rows(PP,NN)
        pf=(rotl(T,1)| (rotl(PP,1)&rotr(NN,1)) | (flow&exists_nb(TOP,1,1)))&MASK
        nf=(rotr(F,1)| (rotr(NN,1)&rotl(PP,1)) | (rotl(flow,1)&exists_nb(TOP,1,1)))&MASK
        tf=((pf&nf)|rotl(TOP,1)|(exists_nb(T,1,1)&exists_nb(F,1,1)))&MASK
        PP=(PP|pf|tf)&MASK; NN=(NN|nf|tf)&MASK
    T,F,TOP,BOT=rows(PP,NN)
    if v.balanced:
        B0,B1,B2,B3=NN,PP,(~PP)&MASK,(~NN)&MASK
        semcode=(B0^rotl(B1,1)^B2^rotl(B3,1))&MASK
    else:
        semcode=(PP^rotl(NN,1)^TOP)&MASK
    adj=0
    if v.adjoint:
        adj=(exists_nb(T,1,1)^forall_nb(T,1,1)^rotl(exists_nb(TOP,1,1)^forall_nb(TOP,1,1),1))&MASK
    fp=0
    if v.chu:
        O=mix(flow^semcode^rc(r,5))
        hT=(T&O).bit_count(); hF=(F&rotl(O,1)).bit_count(); hTop=(TOP&rotr(O,1)).bit_count(); hBot=(BOT&(O^rotl(O,1))).bit_count()
        rel=((hT>hF)<<0)|((hTop>hBot)<<1)|(((hT+hTop)>(hF+hBot))<<2)|(((hTop^hBot)&1)<<3)
        fp=mix(rel^(hT<<1)^(hF<<2)^(hTop<<3)^rc(r,6))
    if v.k4:
        WP,WN=k4(PP,NN,mix(fp^b^rc(r,7)),mix(adj^d^flow^rc(r,8)))
    else:
        WP,WN=PP,NN
    z=mix(WP^rotl(WN,1)^semcode^adj^fp)
    if v.bridge:
        z^=mix(flow^((b+rotl(d,1)+rc(r,9))&MASK)^(c&rotl(d,1)))
    return z&MASK

def rnd(s,r,v):
    a=s&MASK; b=(s>>2)&MASK; c=(s>>4)&MASK; d=(s>>6)&MASK
    f=oracle(b,c,d,r,v)
    return b | (c<<2) | (d<<4) | (((a^f)&MASK)<<6)

def perm(s,rounds,v):
    for r in range(rounds): s=rnd(s,r,v)
    return s&FULL

def map_perm(rounds,v): return [perm(x,rounds,v) for x in range(SPACE)]

def anf(mp):
    weights=[i.bit_count() for i in range(SPACE)]
    degs=[]; terms=[]
    for bit in range(NVAR):
        f=[(y>>bit)&1 for y in mp]
        for i in range(NVAR):
            half=1<<i; block=half<<1
            for base in range(0,SPACE,block):
                for j in range(base,base+half): f[j+half]^=f[j]
        deg=0; cnt=0
        for m,c in enumerate(f):
            if c:
                cnt+=1; deg=max(deg,weights[m])
        degs.append(deg); terms.append(cnt)
    return {'degrees':degs,'max_degree':max(degs),'min_degree':min(degs),'avg_degree':sum(degs)/NVAR,'avg_terms':sum(terms)/NVAR,'terms':terms}

def diff_exact(mp):
    worst=0; wd=0; wo=0; probs=[]
    for dlt in range(1,SPACE):
        counts={}
        for x in range(SPACE):
            od=mp[x]^mp[x^dlt]
            counts[od]=counts.get(od,0)+1
        od,c=max(counts.items(),key=lambda kv:kv[1])
        probs.append(c/SPACE)
        if c>worst: worst=c; wd=dlt; wo=od
    return {'worst_probability':worst/SPACE,'worst_count':worst,'worst_input_delta_hex':hex(wd),'worst_output_delta_hex':hex(wo),'avg_max_probability':sum(probs)/len(probs),'median_max_probability':statistics.median(probs)}

def coord_inv(mp):
    found=[]
    for M in range(1,SPACE):
        comp=(~M)&FULL; y=comp; ok=True
        while True:
            if mp[y]&M: ok=False; break
            if y==0: break
            y=(y-1)&comp
        if ok: found.append(M)
    return {'found':bool(found),'count':len(found),'masks_hex':[hex(m) for m in found[:20]]}

def lin_inv(mp):
    found=[]
    for M in range(1,SPACE):
        ok=True
        for x,y in enumerate(mp):
            if (((x&M).bit_count()^(y&M).bit_count())&1): ok=False; break
        if ok: found.append(M)
    return {'found':bool(found),'count':len(found),'masks_hex':[hex(m) for m in found[:20]]}

def avalanche(mp):
    vals=[]
    for x in range(SPACE):
        y=mp[x]
        for i in range(NVAR): vals.append((y^mp[x^(1<<i)]).bit_count())
    return {'avg':sum(vals)/len(vals),'min':min(vals),'max':max(vals),'median':statistics.median(vals)}

def pearson(xs,ys):
    mx=sum(xs)/len(xs); my=sum(ys)/len(ys)
    vx=sum((x-mx)**2 for x in xs); vy=sum((y-my)**2 for y in ys)
    if vx==0 or vy==0: return None
    return sum((x-mx)*(y-my) for x,y in zip(xs,ys))/math.sqrt(vx*vy)

def k4_charge(c,m):
    p=c&1; n=(c>>1)&1
    if m==0: op=(p,n)
    elif m==1: op=(n,p)
    elif m==2: op=(1-p,1-n)
    else: op=(1-n,1-p)
    return op[0]|(op[1]<<1)

def raw2(c): return (c&1,(c>>1)&1)
def bal4(c):
    p,n=raw2(c); return (n,p,1-p,1-n)

def leakage(samples=100000,seed=20260624):
    rng=random.Random(seed)
    schemes={
        'raw_2bit_no_mask': lambda c: raw2(c),
        'raw_2bit_gauge2': lambda c: raw2(k4_charge(c,rng.randrange(2))),
        'raw_2bit_k4': lambda c: raw2(k4_charge(c,rng.randrange(4))),
        'balanced4_no_mask': lambda c: bal4(c),
        'balanced4_k4_railperm': lambda c: bal4(k4_charge(c,rng.randrange(4))),
    }
    out={}
    for name,fn in schemes.items():
        total=[]; rails=[[] for _ in range(4)]
        labels={k:[] for k in ['pos','neg','truth','false','top','bottom','classical','pole']}
        for _ in range(samples):
            c=rng.randrange(4); p,n=raw2(c); code=fn(c)
            total.append(sum(code))
            for i in range(4): rails[i].append(code[i] if i<len(code) else 0)
            labels['pos'].append(p); labels['neg'].append(n); labels['truth'].append(1 if (p,n)==(1,0) else 0); labels['false'].append(1 if (p,n)==(0,1) else 0); labels['top'].append(1 if (p,n)==(1,1) else 0); labels['bottom'].append(1 if (p,n)==(0,0) else 0); labels['classical'].append(1 if p^n else 0); labels['pole'].append(1 if p==n else 0)
        mean=sum(total)/len(total); one={'total_hw_mean':mean,'total_hw_var':sum((x-mean)**2 for x in total)/len(total)}
        for label,vec in labels.items():
            one[f'corr_total_hw_{label}']=pearson(total,vec)
            cors=[pearson(rail,vec) for rail in rails]
            cors=[c for c in cors if c is not None]
            one[f'max_abs_single_rail_corr_{label}']=max((abs(c) for c in cors), default=None)
        out[name]=one
    return out

def run():
    rounds=[1,2,3,4,5,6,8]
    res={'params':{'nvars':NVAR,'space':SPACE,'branch_bits':W},'leakage':leakage(),'variants':{}}
    for v in VARIANTS:
        print('[variant]',v.name,flush=True)
        vr={'config':asdict(v),'rounds':{}}
        for r in rounds:
            print('  r',r,flush=True)
            mp=map_perm(r,v)
            item={'bijective':len(set(mp))==SPACE,'anf':anf(mp),'differential':diff_exact(mp),'avalanche':avalanche(mp)}
            if r in (4,6,8):
                item['coordinate_zero_invariants']=coord_inv(mp)
                item['linear_invariants']=lin_inv(mp)
            vr['rounds'][str(r)]=item
        res['variants'][v.name]=vr
    return res

if __name__=='__main__':
    out=run()
    p=Path('/mnt/data/relcrypt_sigma_mini8_results.json')
    p.write_text(json.dumps(out,indent=2),encoding='utf-8')
    print('wrote',p)
