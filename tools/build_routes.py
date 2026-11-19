# OpenStreetMap 내보내기(data/osm-export.geojson)에서 코스별 출발→도착 경로를 뽑는다.
# 실행: python3 tools/build_routes.py  (pip install networkx)  → data/routes.json
# 결과의 route 값을 js/courses.js에 넣는다. 데이터 © OpenStreetMap contributors (ODbL)
import json,math,networkx as nx,itertools
d=json.load(open('data/osm-export.geojson'))
fs=[f for f in d['features'] if f['geometry']['type']=='LineString']
K=lambda lo,la:(round(lo,7),round(la,7))
def dist(a,b): return math.hypot((a[0]-b[0])*math.cos(math.radians(37.55))*111320,(a[1]-b[1])*110540)
def graph(sel,snap=60):
    G=nx.Graph(); ends=[]
    for f in fs:
        if not sel(f['properties']): continue
        c=[K(*p) for p in f['geometry']['coordinates']]
        for a,b in zip(c,c[1:]): G.add_edge(a,b,w=dist(a,b))
        ends+= [c[0],c[-1]]
    # 내보내기에서 끊긴 이음새를 가까운 끝점끼리 연결
    comps={n:i for i,cc in enumerate(nx.connected_components(G)) for n in cc}
    for a,b in itertools.combinations(set(ends),2):
        if comps[a]!=comps[b] and dist(a,b)<=snap: G.add_edge(a,b,w=dist(a,b),snap=True)
    return G
def near(G,la,lo): return min(G.nodes,key=lambda n:dist(n,(lo,la)))
def route(G,a,b):
    path=nx.shortest_path(G,a,b,weight='w'); return path,sum(dist(p,q) for p,q in zip(path,path[1:]))
def simplify(pts,eps=2.5):
    if len(pts)<3: return pts
    a,b=pts[0],pts[-1]
    def pd(p):
        ax,ay=0,0; bx,by=(b[0]-a[0])*88300,(b[1]-a[1])*110540; px,py=(p[0]-a[0])*88300,(p[1]-a[1])*110540
        L=math.hypot(bx,by) or 1; return abs(bx*py-by*px)/L
    i,dm=max(((i,pd(p)) for i,p in enumerate(pts[1:-1],1)),key=lambda x:x[1])
    return simplify(pts[:i+1],eps)[:-1]+simplify(pts[i:],eps) if dm>eps else [a,b]
def frac_of(path,la,lo):
    cum=[0]
    for p,q in zip(path,path[1:]): cum.append(cum[-1]+dist(p,q))
    i=min(range(len(path)),key=lambda k:dist(path[k],(lo,la)))
    return cum[i]/cum[-1], dist(path[i],(lo,la))
def mid(name):
    for f in fs:
        if f['properties'].get('name')==name:
            c=f['geometry']['coordinates']; return c[len(c)//2][1],c[len(c)//2][0]
res={}
G=graph(lambda p:'경춘선 숲길' in (p.get('name') or ''))
p,L=route(G,near(G,37.62701,127.07664),near(G,37.62297,127.08993)); res['easy']=(p,L,{})
G=graph(lambda p:(p.get('name') or '')=='한강남자전거길')
p,L=route(G,near(G,37.50541,126.97807),near(G,37.51090,126.99824))
cps={n:frac_of(p,*mid(n)) for n in ['서래섬나들목','세빛섬 연결다리']}
res['normal']=(p,L,cps)
G=graph(lambda p:p.get('highway')=='service' and (p.get('name') or '') in ('남산북측순환로','남산공원길'))
east=near(G,37.55078,126.99838)
comp=[c for c in nx.connected_components(G) if east in c][0]
west=min(comp,key=lambda n:n[0])
p,L=route(G,east,west); res['hard']=(p,L,{})
out={}
for k,(p,L,cps) in res.items():
    s=simplify(p)
    print(k,'pts',len(p),'->',len(s),'len',round(L),'m start',(round(p[0][1],5),round(p[0][0],5)),'end',(round(p[-1][1],5),round(p[-1][0],5)),'cps',{n:(round(f,3),round(dd)) for n,(f,dd) in cps.items()})
    out[k]={'len':L,'route':[[round(q[1],6),round(q[0],6)] for q in s],'cps':{n:f for n,(f,dd) in cps.items()}}
json.dump(out,open('data/routes.json','w'),ensure_ascii=False)
