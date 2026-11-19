# SRTM 1초(약 30m) 고도 타일로 코스별 고도 프로필과 오르막·내리막 구간을 만든다.
# 타일: N37E126.hgt, N37E127.hgt (NASA SRTM, 공개 데이터). 이 저장소에는 용량 때문에 넣지 않았다.
#   받는 곳 예: https://media.githubusercontent.com/media/hslyu/sionna-scene-baker/HEAD/data/snu/terrain/N37E126.hgt.gz
# 실행: python3 tools/build_elevation.py <타일 폴더>  → data/elevation.json
import sys,json,math
import numpy as np
D=sys.argv[1] if len(sys.argv)>1 else '.'
T={}
def tile(key):
    if key not in T:
        a=np.fromfile(f'{D}/{key}.hgt',dtype='>i2'); n=int(math.isqrt(a.size)); T[key]=(a.reshape(n,n).astype(float),n)
    return T[key]
def elev(la,lo):
    a,n=tile(f'N{int(la)}E{int(lo)}')
    r=(int(la)+1-la)*(n-1); c=(lo-int(lo))*(n-1); r0,c0=int(r),int(c); fr,fc=r-r0,c-c0
    return a[r0,c0]*(1-fr)*(1-fc)+a[r0+1,c0]*fr*(1-fc)+a[r0,c0+1]*(1-fr)*fc+a[r0+1,c0+1]*fr*fc
def dist(p,q): return math.hypot((q[1]-p[1])*math.cos(math.radians(p[0]))*111320,(q[0]-p[0])*110540)
R=json.load(open('data/routes.json'))
STEP=25; out={}
for k,v in R.items():
    pts=v['route']; cum=[0]
    for p,q in zip(pts,pts[1:]): cum.append(cum[-1]+dist(p,q))
    total=cum[-1]; samples=[]
    for s in np.arange(0,total+0.01,STEP):
        i=max(1,min(len(cum)-1,int(np.searchsorted(cum,s))))
        t=(s-cum[i-1])/((cum[i]-cum[i-1]) or 1); a,b=pts[i-1],pts[i]
        samples.append(elev(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))
    e=np.array(samples); k5=np.ones(5)/5
    sm=np.convolve(np.pad(e,4,mode="edge"),np.ones(9)/9,mode="valid")
    # 225m 이동평균(SRTM은 나무·건물 높이가 섞인 표면 고도라 잡음을 줄임) 후 100m 단위 경사 ±3%로 구간 나누기
    seg=[]; W=4
    for i in range(0,len(sm)-1,W):
        j=min(i+W,len(sm)-1); g=(sm[j]-sm[i])/((j-i)*STEP)*100
        t='up' if g>3 else "down" if g<-3 else 'flat'
        f0,f1=i*STEP/total,min(1,j*STEP/total)
        if seg and seg[-1]['type']==t: seg[-1]['to']=round(f1,3)
        else: seg.append({'from':round(f0,3),'to':round(f1,3),'type':t})
    seg[-1]['to']=1
    out[k]={'profile':[round(x,1) for x in sm[::2]],'terrain':seg,'min':round(float(sm.min()),1),'max':round(float(sm.max()),1),'gain':round(float(np.clip(np.diff(sm),0,None).sum()))}
    print(k,'고도',out[k]['min'],'~',out[k]['max'],'m  누적 오르막',out[k]['gain'],'m  구간',[(s['type'],s['from'],s['to']) for s in seg])
json.dump(out,open('data/elevation.json','w'))
