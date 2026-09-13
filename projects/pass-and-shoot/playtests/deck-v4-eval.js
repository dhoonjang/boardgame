// 패스 앤 슛 덱 v4 평가기: 성향 토큰 + 저지 아이콘 + 밴드 트랙 (구조·덱 모두 제안)
// 사용: node playtests/deck-v4-eval.js            통계와 검증
//       node playtests/deck-v4-eval.js --md       카드 목록·수치표 마크다운
//       node playtests/deck-v4-eval.js --opt      아이콘 배치 담금질 최적화 (ITERS, MAXT, K 환경변수)
//
// 모델:
//   특성 4: 템포(점유/전환 vs 압박/후퇴), 폭(측면/중앙 vs 봉쇄/밀집), 공간(뒷공간/발밑 vs 하이/딥), 조직(패턴/개인 vs 지역/대인)
//   두 장의 아이콘을 특성별로 합치고 반대 성향은 1:1 상쇄, 상쇄 쌍마다 혼선 -1 (그 특성 결과에).
//   수비 아이콘은 공격 성향과 같은 모양에 빗금(저지). 특성별 v (D-10, FORMULA B): 상대가 내 성향을 저지(같은 모양)하면 -(a+d), 같은 특성의 다른 모양을 저지하면 +(a+d), 한쪽만 있으면 ±세기. 상쇄 후 세기가 MINSTR(기본 2) 미만이면 그 특성은 없는 것으로 본다. 혼선: 상쇄 쌍마다 -CONF (기본 2). 호흡·텍스트 보너스 없음. (FORMULA=C 는 ×2 변형, 비교용)
//   경계 4개 기본 [2,8,14,18] 이 특성 [템포,조직,폭,공간] 의 v 만큼 왼쪽으로 이동. 0~20 으로 자르고 위치순 정렬해 왼쪽부터 ①②③④ 로 읽는다.
//   밴드: ≤① 카운터 0 / ≤② 소유 상실 15 / ≤③ 전진 40 / ≤④ 찬스 70 / 그 위 결정적 찬스 100. d20 (한 방 카드는 2d20 큰 값, 상대 지우개면 무효).
'use strict';
const args=process.argv.slice(2);
const TR=['템포','폭','공간','조직'];
const TEN_EN={'점유':'Possession','전환':'Transition','측면':'Wide','중앙':'Central','뒷공간':'In behind','발밑':'To feet','패턴':'Pattern play','개인':'1v1'};
const BLK_EN={'점유 저지':'Press','전환 저지':'Drop','측면 저지':'Show inside','중앙 저지':'Show outside','뒷공간 저지':'Deep line','발밑 저지':'High line','패턴 저지':'Man-oriented','개인 저지':'Zonal cover'};
const AT=[['점유','전환'],['측면','중앙'],['뒷공간','발밑'],['패턴','개인']];
const DT=[['점유 저지','전환 저지'],['측면 저지','중앙 저지'],['뒷공간 저지','발밑 저지'],['패턴 저지','개인 저지']];
// 칸 유형 [공격 성향 idx][수비 성향 idx]: P 뚫음, C 잡힘, F 힘겨루기
const CELL=[ [['C','P'],['P','C']], [['C','P'],['P','C']], [['C','P'],['P','C']], [['C','P'],['P','C']] ];
const K=parseFloat(process.env.K||'2');const FORMULA=process.env.FORMULA||'B';const MINSTR=parseInt(process.env.MINSTR||'2',10);
const BOUND_TRAIT=[0,3,1,2]; // 경계 ①②③④ 를 움직이는 특성 인덱스 (템포, 조직, 폭, 공간)
const BASE_B=[2,8,14,18];
const U=[0,15,40,70,100];
const SORT=process.env.SORT!=='0';const CONF=parseInt(process.env.CONF||'2',10);const BAL=parseFloat(process.env.BAL||'0.5');

// 카드: icons {성향:개수}, fx: 'max'(한 방) 'safe'(안전: ①=1 고정) 'cut'(끊기: ④=20) 'erase'(지우개), bonus {특성idx:+n}
// adj: 튜너가 만질 수 있는 보조 성향 목록 (0~2 사이에서만)
const ATT=[
 {id:'A01',name:'후방 빌드업',en:'Build-up from the back',grade:'S',icons:{점유:3,발밑:1,패턴:1},adj:['발밑','패턴'],desc:'골키퍼와 센터백부터 짧게 연결해 전진한다.'},
 {id:'A02',name:'티키타카',en:'Tiki-taka',grade:'S',icons:{점유:3,패턴:2,발밑:1},adj:['중앙','발밑'],desc:'짧은 패스로 상대를 끌어내고 공간을 만든다.'},
 {id:'A03',name:'롱볼',en:'Long ball',grade:'S',icons:{전환:3,뒷공간:2,중앙:1},adj:['개인','중앙'],desc:'후방에서 한 번에 전방으로 보낸다.'},
 {id:'A04',name:'측면 오버로드',en:'Wide overload',grade:'S',icons:{점유:3,측면:2},adj:['점유','패턴'],desc:'한쪽 측면에 수적 우위를 만든다.'},
 {id:'A05',name:'스위칭 플레이',en:'Switch of play',grade:'S',icons:{측면:2,점유:2},adj:['점유','패턴'],desc:'긴 횡패스로 반대편으로 전환한다.'},
 {id:'A06',name:'중거리 슛',en:'Long-range shot',grade:'S',icons:{개인:2,중앙:1},adj:['중앙','발밑'],fx:'max',desc:'박스 밖에서 때린다. 한 방.'},
 {id:'A07',name:'템포 조절',en:'Game management',grade:'S',icons:{점유:2,패턴:1,발밑:1},adj:['발밑','패턴'],fx:'safe',desc:'공을 돌리며 위험을 피한다. 카운터를 맞지 않는다.'},
 {id:'A08',name:'오버래핑 풀백',en:'Overlapping full-back',grade:'C',icons:{측면:2,전환:1},adj:['전환','개인'],desc:'풀백이 윙어 바깥으로 올라가 폭을 만든다.'},
 {id:'A09',name:'얼리 크로스',en:'Early cross',grade:'C',icons:{측면:2,전환:2,뒷공간:1},adj:['뒷공간','전환'],desc:'수비가 자리 잡기 전에 일찍 올린다.'},
 {id:'A10',name:'컷백',en:'Cut-back',grade:'C',icons:{측면:2,발밑:1,패턴:1},adj:['패턴','발밑'],desc:'엔드라인까지 가서 뒤로 내준다.'},
 {id:'A11',name:'하프스페이스 침투',en:'Half-space run',grade:'C',icons:{중앙:3,패턴:2},adj:['발밑','점유'],desc:'측면과 중앙 사이 공간으로 파고든다.'},
 {id:'A12',name:'스루패스',en:'Through ball',grade:'C',icons:{중앙:2,뒷공간:2,패턴:2},adj:['전환','패턴'],desc:'수비 라인 사이로 찔러 넣는다.'},
 {id:'A13',name:'인버티드 윙어',en:'Inverted winger',grade:'C',icons:{중앙:3,개인:2},adj:['발밑','전환'],desc:'윙어가 안쪽으로 접어 들어온다.'},
 {id:'A14',name:'세컨볼 회수',en:'Second ball',grade:'C',icons:{전환:3,뒷공간:2,개인:1},adj:['개인','뒷공간'],desc:'떨어지는 공을 먼저 줍는다.'},
 {id:'A15',name:'파울 유도',en:'Winning free kicks',grade:'C',icons:{개인:2,측면:1},adj:['측면','발밑'],desc:'파울을 끌어내 프리킥·코너로 간다.'},
 {id:'A16',name:'역습',en:'Counter-attack',grade:'X',icons:{전환:3},adj:['개인','뒷공간'],desc:'공을 얻자마자 빠르게 앞으로.'},
 {id:'A17',name:'라인 브레이킹 런',en:'Run in behind',grade:'X',icons:{뒷공간:2,전환:2},adj:['전환','개인'],fx:'max',desc:'수비 라인 뒤로 달린다.'},
 {id:'A18',name:'1대1 돌파',en:'Take-on',grade:'X',icons:{개인:2,측면:2},adj:['측면','발밑'],fx:'max',desc:'한 명이 1대1로 제친다.'},
 {id:'A19',name:'타겟맨 활용',en:'Hold-up play',grade:'X',icons:{발밑:2,개인:2},adj:['전환','중앙'],desc:'큰 공격수가 공을 지키고 떨궈 준다.'},
 {id:'A20',name:'폴스 나인',en:'False nine',grade:'X',icons:{발밑:2,패턴:2},adj:['점유','중앙'],desc:'공격수가 내려와 센터백을 끌어낸다.'},
];
const DEF=[
 {id:'D01',name:'하이 프레스',en:'High press',grade:'S',icons:{'점유 저지':3,'발밑 저지':2,'패턴 저지':1},adj:['발밑 저지','패턴 저지'],desc:'상대 진영에서부터 압박한다.'},
 {id:'D02',name:'미들 블록',en:'Mid block',grade:'S',icons:{'중앙 저지':2,'개인 저지':2,'전환 저지':2},adj:['전환 저지','뒷공간 저지'],desc:'중원에 블록을 세우고 기다린다.'},
 {id:'D03',name:'로우 블록',en:'Low block',grade:'S',icons:{'전환 저지':2,'뒷공간 저지':1},adj:['뒷공간 저지','중앙 저지'],desc:'자기 진영 깊숙이 내려선다.'},
 {id:'D04',name:'지역 수비',en:'Zonal marking',grade:'S',icons:{'개인 저지':2,'중앙 저지':2,'뒷공간 저지':1},adj:['중앙 저지','뒷공간 저지'],desc:'사람이 아니라 공간을 지킨다.'},
 {id:'D05',name:'맨마킹',en:'Man-marking',grade:'S',icons:{'패턴 저지':2,'측면 저지':2},adj:['점유 저지','측면 저지'],desc:'사람을 따라붙는다.'},
 {id:'D06',name:'컴팩트',en:'Compactness',grade:'S',icons:{'중앙 저지':2,'개인 저지':1},adj:['개인 저지','뒷공간 저지'],fx:'erase',desc:'간격을 좁혀 한 방을 지운다. 상대의 2d20 효과 무효.'},
 {id:'D07',name:'딥 라인',en:'Deep line',grade:'S',icons:{'뒷공간 저지':3,'전환 저지':2,'개인 저지':1},adj:['전환 저지','개인 저지'],desc:'수비 라인을 내려 뒷공간을 없앤다.'},
 {id:'D08',name:'게겐프레싱',en:'Counter-press',grade:'C',icons:{'점유 저지':2,'패턴 저지':2,'발밑 저지':1},adj:['발밑 저지','패턴 저지'],desc:'공을 잃은 직후 되찾는다.'},
 {id:'D09',name:'하이 라인',en:'High line',grade:'C',icons:{'발밑 저지':2,'점유 저지':2},adj:['점유 저지','개인 저지'],desc:'수비 라인을 올려 공간을 압축한다.'},
 {id:'D10',name:'오프사이드 트랩',en:'Offside trap',grade:'C',icons:{'발밑 저지':3,'점유 저지':1},adj:['개인 저지','점유 저지'],desc:'라인을 맞춰 올려 침투를 걸어 낸다.'},
 {id:'D11',name:'스위퍼 키퍼',en:'Sweeper-keeper',grade:'C',icons:{'발밑 저지':2,'점유 저지':1},adj:['점유 저지','개인 저지'],desc:'골키퍼가 나와 뒷공간을 정리한다.'},
 {id:'D12',name:'박스 밀집',en:'Packing the box',grade:'C',icons:{'뒷공간 저지':2,'중앙 저지':2,'개인 저지':1,'전환 저지':1},adj:['개인 저지','전환 저지'],desc:'페널티 박스 안에 몸을 던진다.'},
 {id:'D13',name:'5백',en:'Back five',grade:'C',icons:{'측면 저지':2,'개인 저지':1,'전환 저지':1,'뒷공간 저지':1},adj:['전환 저지','뒷공간 저지'],desc:'센터백 3명과 윙백으로 폭을 막는다.'},
 {id:'D14',name:'더블 피봇',en:'Double pivot',grade:'C',icons:{'중앙 저지':2,'개인 저지':1},adj:['개인 저지','전환 저지'],desc:'수비형 미드필더 둘이 중앙을 잠근다.'},
 {id:'D15',name:'측면 더블팀',en:'Doubling up wide',grade:'C',icons:{'측면 저지':3,'패턴 저지':2,'점유 저지':1},adj:['패턴 저지','점유 저지'],desc:'윙어를 바깥으로 몰고 더블팀한다.'},
 {id:'D16',name:'압박 트리거',en:'Pressing trigger',grade:'X',icons:{'점유 저지':3},adj:['발밑 저지','개인 저지'],desc:'백패스·횡패스 순간에만 달려든다.'},
 {id:'D17',name:'전술적 파울',en:'Tactical foul',grade:'X',icons:{'패턴 저지':2,'측면 저지':1,'전환 저지':1},adj:['전환 저지','측면 저지'],fx:'cut',desc:'위험해지기 전에 끊는다. 결정적 찬스를 주지 않는다.'},
 {id:'D18',name:'역습 세팅',en:'Sit and counter',grade:'X',icons:{'전환 저지':3},adj:['뒷공간 저지','패턴 저지'],desc:'뒤에 남았다가 뺏는 즉시 달린다.'},
 {id:'D19',name:'슛 스토퍼',en:'Shot-stopper',grade:'X',icons:{'뒷공간 저지':3},adj:['전환 저지','중앙 저지'],desc:'골키퍼가 라인을 지킨다.'},
 {id:'D20',name:'세트피스 수비',en:'Set-piece defending',grade:'X',icons:{'개인 저지':2,'뒷공간 저지':1},adj:['중앙 저지','뒷공간 저지'],desc:'코너·프리킥에서 지역과 사람을 섞어 막는다.'},
];
for(const c of [...ATT,...DEF]){c.bonus=c.bonus||{};}
if(process.env.SEED_FILE){const line=require('fs').readFileSync(process.env.SEED_FILE,'utf8').split('\n').find(l=>l.startsWith('ICONS '));if(line){const st=JSON.parse(line.slice(6));for(const c of [...ATT,...DEF])if(st[c.id]){c.icons=st[c.id][0];c.bonus=st[c.id][1]||{};}}}

// ---------- 모델 ----------
const tIdxA={},tIdxD={};AT.forEach((p,t)=>p.forEach((n,k)=>tIdxA[n]=[t,k]));DT.forEach((p,t)=>p.forEach((n,k)=>tIdxD[n]=[t,k]));
function profile(cards,tIdx){const cnt=[[0,0],[0,0],[0,0],[0,0]];const bonus=[0,0,0,0];
  for(const c of cards){for(const [n,v] of Object.entries(c.icons)){const [t,k]=tIdx[n];cnt[t][k]+=v;}for(const [t,b] of Object.entries(c.bonus))bonus[+t]+=b;}
  return cnt.map(([x,y],t)=>{const cancel=Math.min(x,y);const st=Math.abs(x-y);const side=st>=MINSTR?(x>y?0:1):-1;return {side,str:side<0?0:st,cancel,bonus:bonus[t]};});}
const P1=Array.from({length:21},(_,k)=>k?1/20:0),PMAX=Array.from({length:21},(_,k)=>k?(2*k-1)/400:0);
const CASCADE=process.env.CASCADE!=='0';const VSCALE=parseFloat(process.env.VSCALE||'3');
function bandsFor(vs,fxA,fxD){let B;if(CASCADE){let acc=0;B=BASE_B.map((b,i)=>{acc+=vs[BOUND_TRAIT[i]]*VSCALE;return Math.max(0,Math.min(20,b-acc));});}else B=BASE_B.map((b,i)=>Math.max(0,Math.min(20,b-vs[BOUND_TRAIT[i]]*VSCALE)));
  if(fxA.has('safe'))B[0]=Math.min(B[0],1);if(fxD.has('cut'))B[3]=20;
  if(SORT)B=B.slice().sort((a,b)=>a-b);else{for(let i=1;i<4;i++)B[i]=Math.max(B[i],B[i-1]);}
  return B;}
function ev(ai,aj,di,dj){const A=[ATT[ai],ATT[aj]],D=[DEF[di],DEF[dj]];const pa=profile(A,tIdxA),pd=profile(D,tIdxD);const vs=[0,0,0,0];
  for(let t=0;t<4;t++){const a=pa[t],d=pd[t];let v=0;
    if(a.side>=0&&d.side>=0){const hit=a.side===d.side;
      if(FORMULA==='A')v=hit?a.str-K*d.str:a.str+d.str;
      else if(FORMULA==='B')v=hit?-(a.str+d.str):a.str+d.str;
      else v=hit?-(a.str+K*d.str):K*a.str+d.str;}
    else if(a.side>=0)v=a.str;else if(d.side>=0)v=-d.str;
    v+=-a.cancel*CONF+d.cancel*CONF+a.bonus-d.bonus;vs[t]=v;}
  const fxA=new Set(A.map(c=>c.fx)),fxD=new Set(D.map(c=>c.fx));const B=bandsFor(vs,fxA,fxD);
  const P=(fxA.has('max')&&!fxD.has('erase'))?PMAX:P1;let e=0;
  for(let r=1;r<=20;r++){let b=4;for(let i=0;i<4;i++){if(r<=B[i]){b=i;break;}}e+=P[r]*U[b];}
  return e;}
const pairs=[];for(let i=0;i<20;i++)for(let j=i+1;j<20;j++)pairs.push([i,j]);
function evaluate(){const M=pairs.map(p=>pairs.map(q=>ev(p[0],p[1],q[0],q[1])));
  const VA=M.map(r=>r.reduce((a,b)=>a+b,0)/r.length);const VD=pairs.map((_,q)=>100-M.reduce((a,r)=>a+r[q],0)/pairs.length);
  const cardA=ATT.map((_,i)=>{const xs=pairs.map((p,k)=>p.includes(i)?VA[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  const cardD=DEF.map((_,i)=>{const xs=pairs.map((p,k)=>p.includes(i)?VD[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  return {M,VA,VD,cardA,cardD};}
const mean=xs=>xs.reduce((a,b)=>a+b,0)/xs.length,sd=xs=>{const m=mean(xs);return Math.sqrt(mean(xs.map(x=>(x-m)*(x-m))));};
function dupes(xs,dg){const seen={};let d=0;for(const x of xs){const k=x.toFixed(dg);if(seen[k])d++;seen[k]=1;}return d;}
function gradeStats(cards,vals){const g={};cards.forEach((c,i)=>{(g[c.grade]=g[c.grade]||[]).push(vals[i]);});return Object.fromEntries(Object.entries(g).map(([k,v])=>[k,{n:v.length,mean:mean(v),spread:Math.max(...v)-Math.min(...v)}]));}
function total(c){return Object.values(c.icons).reduce((a,b)=>a+b,0);}
function violation(R){let s=0;for(const [cards,vals,T] of [[ATT,R.cardA,TARGET_A],[DEF,R.cardD,TARGET_D]])cards.forEach((c,i)=>{s+=Math.abs(vals[i]-T[c.grade]);});return s;}
const TARGET_A={S:46,C:44,X:42},TARGET_D={S:58,C:56,X:54};

// ---------- 튜너: 보조 아이콘(0~2)과 특성 보너스(-1~+1, 카드당 하나) 로 등급 목표 접근 ----------
function tune(){const tIdxOf=(c)=>c.id[0]==='A'?tIdxA:tIdxD;let R=evaluate();let best=violation(R);
  for(let it=0;it<60;it++){let improved=false;
    const all=[...ATT.map((c,i)=>({c,i,side:'A'})),...DEF.map((c,i)=>({c,i,side:'D'}))];
    // 목표에서 가장 먼 카드부터
    all.sort((x,y)=>{const vx=x.side==='A'?R.cardA[x.i]-TARGET_A[x.c.grade]:R.cardD[x.i]-TARGET_D[x.c.grade];const vy=y.side==='A'?R.cardA[y.i]-TARGET_A[y.c.grade]:R.cardD[y.i]-TARGET_D[y.c.grade];return Math.abs(vy)-Math.abs(vx);});
    for(const {c} of all.slice(0,8)){const moves=[];
      for(const n of c.adj){const cur=c.icons[n]||0;const [t,k]=tIdxOf(c)[n];const opp=(c.id[0]==='A'?AT:DT)[t][1-k];if(c.icons[opp])continue;
        if(cur<2&&total(c)<5)moves.push({n,d:1});if(cur>0)moves.push({n,d:-1});}
      const mainT=tIdxOf(c)[Object.entries(c.icons).sort((x,y)=>y[1]-x[1])[0][0]][0];
      for(const d of [1,-1]){const cur=c.bonus[mainT]||0;if(Math.abs(cur+d)<=1)moves.push({bonusT:mainT,d});}
      let bestMove=null,bestVal=best;
      for(const m of moves){apply(c,m,1);const r=evaluate();const v=violation(r);apply(c,m,-1);if(v<bestVal-0.05){bestVal=v;bestMove=m;}}
      if(bestMove){apply(c,bestMove,1);best=bestVal;R=evaluate();improved=true;}}
    if(!improved)break;}
  return R;}
function apply(c,m,sign){if(m.n!==undefined){c.icons[m.n]=(c.icons[m.n]||0)+m.d*sign;if(c.icons[m.n]===0)delete c.icons[m.n];}else{c.bonus[m.bonusT]=(c.bonus[m.bonusT]||0)+m.d*sign;if(c.bonus[m.bonusT]===0)delete c.bonus[m.bonusT];}}

// ---------- 최적화: 담금질. 주 성향(가장 많은 아이콘)은 2~3 사이, 보조 성향(adj)은 0~2, 카드당 총 3~5, 같은 특성의 반대 성향 금지 ----------
function objective(R){let pen=0;const gA=gradeStats(ATT,R.cardA),gD=gradeStats(DEF,R.cardD);
  for(const g of Object.values(gA))pen+=Math.max(0,g.spread-4.2)**2;for(const g of Object.values(gD))pen+=Math.max(0,g.spread-4.2)**2;
  pen+=2*Math.max(0,STDT-sd(R.VA))**2+2*Math.max(0,STDT-sd(R.VD))**2;
  pen+=0.5*Math.max(0,dupes(R.VA,6)-10)+0.5*Math.max(0,dupes(R.VD,6)-10);
  const mA=mean(R.VA);pen+=0.2*Math.max(0,Math.abs(mA-47)-5)**2;
  for(const [cards,T] of [[ATT,AT],[DEF,DT]])for(let t=0;t<4;t++){const n0=cards.reduce((a,c)=>a+(c.icons[T[t][0]]||0),0),n1=cards.reduce((a,c)=>a+(c.icons[T[t][1]]||0),0);pen+=BAL*Math.max(0,Math.abs(n0-n1)-2)**2;}const nb=[...ATT,...DEF].filter(c=>Object.keys(c.bonus).length).length;pen+=3*Math.max(0,nb-MAXB);return pen;}
const MAXB=parseInt(process.env.MAXB||'0',10),MAXT=parseInt(process.env.MAXT||'6',10);const T0=parseFloat(process.env.T0||'1.5'),STDT=parseFloat(process.env.STDT||'20.5');
function randomMove(c){const isA=c.id[0]==='A';const tIdx=isA?tIdxA:tIdxD;const T=isA?AT:DT;const cand=[];
  const main=c.main||Object.entries(c.icons).sort((x,y)=>y[1]-x[1])[0][0];c.main=main;
  for(const n of [...c.adj,main]){const cur=c.icons[n]||0;const [t,k]=tIdx[n];const opp=T[t][1-k];if(c.icons[opp])continue;
    const lo=n===main?2:0,hi=n===main?3:2;if(cur<hi&&total(c)<MAXT)cand.push({n,d:1});if(cur>lo&&total(c)>3)cand.push({n,d:-1});}
  if(MAXB>0){const mt=tIdx[main][0];const cb=c.bonus[mt]||0;if(cb<1)cand.push({bonusT:mt,d:1});if(cb>-1)cand.push({bonusT:mt,d:-1});}
  if(!cand.length)return null;return cand[Math.floor(Math.random()*cand.length)];}
function optimize(iters){let R=evaluate();let cur=objective(R);let best=cur;let bestState=JSON.stringify([...ATT,...DEF].map(c=>[c.icons,c.bonus]));const all=[...ATT,...DEF];
  for(let it=0;it<iters;it++){const c=all[Math.floor(Math.random()*all.length)];const m=randomMove(c);if(!m)continue;apply(c,m,1);
    const r=evaluate();const o=objective(r);const T=Math.max(0.02,T0*(1-it/iters));
    if(o<=cur||Math.random()<Math.exp((cur-o)/T)){cur=o;R=r;if(o<best){best=o;bestState=JSON.stringify(all.map(c=>[c.icons,c.bonus]));}}else apply(c,m,-1);
    if(it%200===0)process.stderr.write('it '+it+' cur '+cur.toFixed(2)+' best '+best.toFixed(2)+'\n');}
  const st=JSON.parse(bestState);all.forEach((c,i)=>{c.icons=st[i][0];c.bonus=st[i][1];});return evaluate();}

// ---------- 진단: 상대가 특성을 비울 확률, 쌓기별 기댓값 (공식 B vs C) ----------
if(args.includes('--probe')){
  const dp=pairs.map(q=>profile([DEF[q[0]],DEF[q[1]]],tIdxD)),ap=pairs.map(p=>profile([ATT[p[0]],ATT[p[1]]],tIdxA));
  console.log('특성 | 수비 조합이 그 특성을 비운 비율 | 공격 조합이 비운 비율 | 수비 평균 세기(있을 때) | 공격 평균 세기(있을 때)');
  for(let t=0;t<4;t++){const dn=dp.filter(x=>x[t].side<0).length/190,an=ap.filter(x=>x[t].side<0).length/190;const dd=mean(dp.filter(x=>x[t].side>=0).map(x=>x[t].str)),aa=mean(ap.filter(x=>x[t].side>=0).map(x=>x[t].str));
    console.log(TR[t]+' | '+(100*dn).toFixed(0)+'% | '+(100*an).toFixed(0)+'% | '+dd.toFixed(2)+' | '+aa.toFixed(2));}
  // 공격 성향별: 상대 수비 190 조합 중 제대로 짚음 / 잘못 짚음 / 없음 비율과, 쌓기 a 별 기댓값 (혼선·밴드 제외, v 만)
  console.log('\n공격 성향 | 제대로 짚힘 | 잘못 짚음 | 없음 | E[v] a=1 (B/C) | a=3 (B/C) | a=6 (B/C)');
  for(let t=0;t<4;t++)for(let k=0;k<2;k++){const hit=dp.filter(x=>x[t].side===k),miss=dp.filter(x=>x[t].side===1-k),none=dp.filter(x=>x[t].side<0);
    const ev=(a,F)=>(hit.reduce((s,x)=>s+(F==='B'?-(a+x[t].str):-(a+2*x[t].str)),0)+miss.reduce((s,x)=>s+(F==='B'?(a+x[t].str):(2*a+x[t].str)),0)+none.length*a)/190;
    console.log(AT[t][k]+' | '+(100*hit.length/190).toFixed(0)+'% | '+(100*miss.length/190).toFixed(0)+'% | '+(100*none.length/190).toFixed(0)+'% | '+ev(1,'B').toFixed(1)+' / '+ev(1,'C').toFixed(1)+' | '+ev(3,'B').toFixed(1)+' / '+ev(3,'C').toFixed(1)+' | '+ev(6,'B').toFixed(1)+' / '+ev(6,'C').toFixed(1));}
  console.log('\n수비 저지 | 제대로 짚음 | 잘못 짚음 | 없음 | E[수비 이득] d=1 (B/C) | d=3 (B/C) | d=6 (B/C)');
  for(let t=0;t<4;t++)for(let k=0;k<2;k++){const hit=ap.filter(x=>x[t].side===k),miss=ap.filter(x=>x[t].side===1-k),none=ap.filter(x=>x[t].side<0);
    const ev=(d,F)=>(hit.reduce((s,x)=>s+(F==='B'?(x[t].str+d):(x[t].str+2*d)),0)+miss.reduce((s,x)=>s+(F==='B'?-(x[t].str+d):-(2*x[t].str+d)),0)+none.length*d)/190;
    console.log(DT[t][k]+' | '+(100*hit.length/190).toFixed(0)+'% | '+(100*miss.length/190).toFixed(0)+'% | '+(100*none.length/190).toFixed(0)+'% | '+ev(1,'B').toFixed(1)+' / '+ev(1,'C').toFixed(1)+' | '+ev(3,'B').toFixed(1)+' / '+ev(3,'C').toFixed(1)+' | '+ev(6,'B').toFixed(1)+' / '+ev(6,'C').toFixed(1));}
  process.exit(0);}

// ---------- 카드 디자인 시트 (--cards): assets/deck-v4-cards.html 의 원본 ----------
// 아이콘 체계 (2026-09-09, D-11): 특성 = 색. 같은 특성의 두 성향은 같은 재료를 반대 방향으로 그려서 나란히 놓으면 서로 지우는 것이 보인다.
// 수비 아이콘은 특성 색 방패 안에 노리는 공격 성향을 새긴 것이다 (빗금 아님). 이름은 코칭 용어 (BLK_KO).
const BLK_KO={'점유 저지':'압박','전환 저지':'내려서기','측면 저지':'측면 봉쇄','중앙 저지':'중앙 밀집','뒷공간 저지':'딥 라인','발밑 저지':'하이 라인','패턴 저지':'대인','개인 저지':'지역 커버'};
if(args.includes('--cards')){
  const COL={0:'#e4572e',1:'#3aa35b',2:'#e9b62f',3:'#3b7dd8'};const TRN=['템포','폭','공간','조직'];
  // 24×24 좌표계 글리프. c = 색, w = 선 굵기
  const AH=(p,d,c,s=3.6)=>{const n=[-d[1],d[0]];const b=[p[0]-d[0]*s,p[1]-d[1]*s];const h=s*0.62;return `<polygon points="${p[0]},${p[1]} ${b[0]+n[0]*h},${b[1]+n[1]*h} ${b[0]-n[0]*h},${b[1]-n[1]*h}" fill="${c}"/>`;};
  const S=(d,c,w)=>`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const D=(x,y,r,c)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  const G={
    // 템포: 점유 = 공을 돌리는 원형 화살표 / 전환 = 앞으로 내달리는 겹화살
    '점유':(c,w)=>D(12,12,2.5,c)+S('M16 5.07A8 8 0 1 1 4.48 9.26',c,w)+AH([4.48,9.26],[0.342,-0.94],c),
    '전환':(c,w)=>S('M6 12.5L12 6.5L18 12.5',c,w+0.2)+S('M6 19.5L12 13.5L18 19.5',c,w+0.2),
    // 폭: 측면 = 가운데에서 바깥으로 벌리는 화살 / 중앙 = 바깥에서 가운데로 모으는 화살
    '측면':(c,w)=>S('M12 7.5V16.5',c,w+0.6)+S('M9.5 12H6',c,w+0.4)+AH([2.4,12],[-1,0],c,4.2)+S('M14.5 12H18',c,w+0.4)+AH([21.6,12],[1,0],c,4.2),
    '중앙':(c,w)=>S('M12 7.5V16.5',c,w+0.6)+S('M2.4 12H5',c,w+0.4)+AH([9.6,12],[1,0],c,4.2)+S('M21.6 12H19',c,w+0.4)+AH([14.4,12],[-1,0],c,4.2),
    // 공간: 뒷공간 = 수비 라인을 넘기는 호 / 발밑 = 발 앞의 공으로 내려꽂는 화살
    '뒷공간':(c,w)=>S('M13 12V20.5',c,w+0.2)+S('M4 18Q12 -1 19.5 13',c,w)+AH([19.9,13.9],[0.47,0.88],c),
    '발밑':(c,w)=>S('M6 20.5H18',c,w+0.2)+D(12,16.8,2.1,c)+S('M12 3V9.5',c,w)+AH([12,13.2],[0,1],c),
    // 조직: 패턴 = 세 점을 잇는 패스 삼각형 / 개인 = 혼자 흔들며 뚫는 드리블
    '패턴':(c,w)=>S('M12 5.5L5 18.5H19Z',c,w-0.2)+D(12,5.5,2.4,c)+D(5,18.5,2.4,c)+D(19,18.5,2.4,c),
    '개인':(c,w)=>D(6.5,17.5,2.6,c)+S('M8.8 15.3C10.3 10 14 19.5 16.7 8.6',c,w)+AH([17.5,5.6],[0.25,-0.97],c),
  };
  const SHIELD='M12 1.8L21 5.2V12.2C21 16.9 17.2 20.4 12 22.2C6.8 20.4 3 16.9 3 12.2V5.2Z';
  // 아이콘 하나: 공격은 글리프, 수비는 방패 + 안에 새긴 공격 글리프 (bg 색)
  const icon=(t,k,isDef,bg)=>{const c=COL[t];const name=AT[t][k];
    return isDef?`<path d="${SHIELD}" fill="${c}"/><g transform="translate(12 11.6) scale(0.68) translate(-12 -12)">${G[name](bg,3.4)}</g>`:G[name](c,2.2);};
  const strip=(t,k,n,isDef,bg,sz)=>{let g='';for(let i=0;i<n;i++)g+=`<g transform="translate(${i*26} 0)">${icon(t,k,isDef,bg)}</g>`;return `<svg viewBox="0 0 ${n*26-2} 24" width="${(n*26-2)*sz/24}" height="${sz}">${g}</svg>`;};
  const iconRow=(c,isA)=>{const tIdx=isA?tIdxA:tIdxD;const rows=[];const byT={};const bg=isA?'#f3efe4':'#262b31';
    for(const [n,v] of Object.entries(c.icons)){const [t,k]=tIdx[n];(byT[t]=byT[t]||[]).push({n,k,v});}
    for(const t of Object.keys(byT).sort()){for(const {n,k,v} of byT[t]){
      const label=isA?`<span class="ten">${n} · ${TEN_EN[n]}</span>`:`<span class="lab"><span class="ten">${BLK_KO[n]} · ${BLK_EN[n]}</span><span class="vs">vs ${AT[+t][k]}</span></span>`;
      rows.push(`<div class="row">${strip(+t,k,v,!isA,bg,26)}<span class="lbl" style="color:${COL[+t]}">${TRN[+t]}</span>${label}</div>`);}}
    return rows.join('');};
  const fx=c=>{const f=[];if(c.fx==='max')f.push('한 방: 2d20 중 큰 값');if(c.fx==='safe')f.push('안전: 카운터 경계를 1 로');if(c.fx==='cut')f.push('끊기: 찬스 경계를 20 으로');if(c.fx==='erase')f.push('지우개: 상대 한 방 무효');return f.join(' · ');};
  const card=(c,isA)=>`<div class="card ${isA?'att':'def'} g${c.grade}"><div class="head"><div class="id">${c.id}</div><div class="grade">${c.grade}</div></div><div class="name">${c.name}</div><div class="en">${c.en}</div><div class="icons">${iconRow(c,isA)}</div>${c.fx?`<div class="fx">${fx(c)}</div>`:''}<div class="desc">${c.desc}</div><div class="foot">${isA?'Attack':'Defence'} · Pass &amp; Shoot v4</div></div>`;
  const one=(t,k,isDef,bg)=>`<svg viewBox="0 0 24 24" width="26" height="26">${icon(t,k,isDef,bg)}</svg>`;
  const legendRows=[0,3,1,2].map(t=>{const [a0,a1]=AT[t];const [d0,d1]=DT[t];const bg='#2a3a30';
    return `<tr><th style="color:${COL[t]}">${TRN[t]}</th>
<td>${one(t,0,false)} <b>${a0}</b> <i>${TEN_EN[a0]}</i></td><td>${one(t,1,false)} <b>${a1}</b> <i>${TEN_EN[a1]}</i></td>
<td>${one(t,0,true,bg)} <b>${BLK_KO[d0]}</b> <i>${BLK_EN[d0]}</i> <span class="vs">vs ${a0}</span></td><td>${one(t,1,true,bg)} <b>${BLK_KO[d1]}</b> <i>${BLK_EN[d1]}</i> <span class="vs">vs ${a1}</span></td></tr>`;}).join('');
  const legend=`<div class="card ref"><div class="name">판정 절차</div><ol class="ref-list">
<li>양쪽 2장. 특성(색)마다 아이콘을 더한다. 같은 색의 <b>반대 방향 성향은 1:1 로 지우고</b>, 지운 쌍마다 <b>혼선 −2</b>. 남은 세기가 <b>2 미만이면 없는 것</b>.</li>
<li>특성마다 내 세기 a, 상대 세기 d. 상대 <b>방패 안의 성향이 내 성향과 같으면 카운터 −(a+d)</b>, 같은 색의 <b>다른 성향이면 헛짚음 +(a+d)</b>, 상대가 없으면 +a, 내가 없으면 −d.</li>
<li>마커 4개(기본 2/8/14/18)를 결과 1점마다 <b>__SLOT__칸</b> 옮긴다. 양수는 왼쪽. 특성은 자기 마커와 오른쪽 마커를 모두 옮긴다: <span style="color:${COL[0]}">템포</span> ①②③④ · <span style="color:${COL[3]}">조직</span> ②③④ · <span style="color:${COL[1]}">폭</span> ③④ · <span style="color:${COL[2]}">공간</span> ④.</li>
<li>d20. ① 이하 카운터 / ② 소유 상실 / ③ 전진 / ④ 찬스 / 그 위 결정적 찬스.</li></ol>
<table class="legend"><thead><tr><th></th><th colspan="2">공격 성향 (서로 반대 방향, 함께 내면 지워진다)</th><th colspan="2">수비 (방패 안의 성향을 노린다)</th></tr></thead><tbody>${legendRows}</tbody></table></div>`;
  const css=`<title>패스 앤 슛 카드 v4</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Do+Hyeon&family=Oswald:wght@500;600&family=Noto+Sans+KR:wght@400;700&display=swap">
<style>
:root{--board:#1f2a24;--chalk:#e9e4d4;--paper:#f3efe4;--ink:#1d2420;--slate:#262b31;--slate-ink:#ece6d6;--muted:#6f6a5d;--muted-dark:#a9a397;--line:#d6cfbd;--ribbon:#f7e6a6;--ribbon-ink:#4a3c05}
body{margin:0;background:var(--board);color:var(--chalk);font-family:"Noto Sans KR",-apple-system,"Apple SD Gothic Neo",sans-serif}
.wrap{max-width:1180px;margin:0 auto;padding:22px 18px 40px}
h1{font-family:"Do Hyeon","Noto Sans KR",sans-serif;font-weight:400;font-size:34px;margin:0;letter-spacing:.01em}
.sub{font-family:Oswald,"Noto Sans KR",sans-serif;font-weight:500;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted-dark);margin:2px 0 14px}
h2{font-family:Oswald,"Noto Sans KR",sans-serif;font-weight:600;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:var(--muted-dark);margin:26px 0 10px;display:flex;align-items:center;gap:10px}
h2::after{content:"";flex:1;height:1px;background:rgba(233,228,212,.18)}
.hint{color:var(--muted-dark);font-size:12.5px;line-height:1.5;margin:0 0 6px;max-width:70ch}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(224px,1fr));gap:14px}
.card{position:relative;aspect-ratio:63/88;border-radius:9px;padding:10px 12px 9px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 2px 0 rgba(0,0,0,.25),0 8px 18px rgba(0,0,0,.28)}
.card.att{background:var(--paper);color:var(--ink)}.card.def{background:var(--slate);color:var(--slate-ink)}
.card::before{content:"";position:absolute;right:-34px;bottom:-34px;width:118px;height:118px;border-radius:50%;border:2px solid currentColor;opacity:.08;pointer-events:none}
.card::after{content:"";position:absolute;left:0;right:0;bottom:30px;height:2px;background:currentColor;opacity:.07;pointer-events:none}
.head{display:flex;justify-content:space-between;align-items:center;font-family:Oswald,sans-serif;font-weight:500;font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
.grade{font-weight:600;border:1px solid currentColor;border-radius:3px;padding:0 5px;opacity:1}
.name{font-family:"Do Hyeon","Noto Sans KR",sans-serif;font-size:24px;line-height:1.1;margin-top:7px;text-wrap:balance}
.en{font-family:Oswald,sans-serif;font-weight:500;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;opacity:.7;margin:2px 0 9px}
.icons{display:flex;flex-direction:column;gap:7px}
.row{display:flex;align-items:center;gap:7px}.row svg{flex:none}.lab{display:flex;flex-direction:column;line-height:1.15}
.lbl{font-family:Oswald,sans-serif;font-weight:600;font-size:10px;letter-spacing:.1em;min-width:26px}
.ten{font-size:11px;opacity:.85}.vs{font-family:Oswald,sans-serif;font-size:9.5px;letter-spacing:.06em;opacity:.55;text-transform:uppercase}
.fx{font-size:11px;background:var(--ribbon);color:var(--ribbon-ink);border-radius:4px;padding:4px 7px;margin-top:8px;font-weight:700}
.desc{font-size:11px;line-height:1.4;margin-top:auto;padding-top:8px;opacity:.85;border-top:1px dashed currentColor}
.card.att .desc{border-color:var(--line)}.card.def .desc{border-color:rgba(236,230,214,.25)}
.foot{font-family:Oswald,sans-serif;font-size:9px;letter-spacing:.14em;text-transform:uppercase;opacity:.45;margin-top:6px}
.card.ref{background:#2a3a30;color:var(--chalk);aspect-ratio:auto;grid-column:1/-1;border:1px solid rgba(233,228,212,.2);box-shadow:none}
.card.ref .name{font-size:22px}.ref-list{font-size:13px;line-height:1.6;padding-left:20px;margin:6px 0 4px;max-width:72ch}
table.legend{border-collapse:collapse;margin-top:10px;font-size:12.5px}
table.legend th{font-family:Oswald,sans-serif;font-weight:600;letter-spacing:.08em;text-align:left;padding:4px 14px 4px 0;font-size:11px;text-transform:uppercase;color:var(--muted-dark)}
table.legend tbody th{font-size:13px;text-transform:none;color:inherit}
table.legend td{padding:5px 18px 5px 0;white-space:nowrap;vertical-align:middle}
table.legend td svg{vertical-align:middle;margin-right:3px}table.legend td b{font-weight:700}table.legend td i{font-style:normal;font-family:Oswald,sans-serif;font-size:11px;letter-spacing:.05em;opacity:.7;margin-left:3px}
.ref .table-wrap{overflow-x:auto}
@media print{body{background:#fff}.wrap{max-width:none;padding:0}.grid{grid-template-columns:repeat(3,1fr);gap:5mm;padding:6mm}.card{break-inside:avoid;box-shadow:none;border:1px solid #bbb}.card.ref{break-after:page}h1,h2,.hint,.sub{display:none}}
</style>`;
  const html=css+`<div class="wrap"><h1>패스 앤 슛 카드 v4</h1><div class="sub">Pass &amp; Shoot · Tactics deck · Attack 20 / Defence 20</div>
<p class="hint">공격 카드는 홈 유니폼(밝은 종이), 수비 카드는 원정 유니폼(어두운 종이). 특성은 색으로 읽는다: <span style="color:${COL[0]}">템포</span>, <span style="color:${COL[3]}">조직</span>, <span style="color:${COL[1]}">폭</span>, <span style="color:${COL[2]}">공간</span>. 같은 색의 두 성향은 반대 방향이라 함께 내면 서로 지워진다. 수비의 방패는 안에 새겨진 공격 성향을 노린다. 인쇄하면 A4 한 장에 9장.</p>
<h2>Reference</h2><div class="grid">${legend}</div>
<h2>Attack · 공격 20장</h2><div class="grid">${ATT.map(c=>card(c,true)).join('')}</div>
<h2>Defence · 수비 20장</h2><div class="grid">${DEF.map(c=>card(c,false)).join('')}</div></div>`;
  console.log(html.replace('__SLOT__',String(VSCALE)));process.exit(0);}

// ---------- 출력 ----------
let R=args.includes('--opt')?optimize(parseInt(process.env.ITERS||'3000',10)):args.includes('--tune')?tune():evaluate();
const gA=gradeStats(ATT,R.cardA),gD=gradeStats(DEF,R.cardD);
const iconStr=c=>Object.entries(c.icons).map(([n,v])=>n+' '+'●'.repeat(v)).join(', ');
const fxStr=c=>{const f=[];if(c.fx==='max')f.push('한 방 (2d20 큰 값)');if(c.fx==='safe')f.push('안전 (카운터 경계 1 고정)');if(c.fx==='cut')f.push('끊기 (찬스 경계 20 고정)');if(c.fx==='erase')f.push('지우개 (상대 한 방 무효)');for(const [t,b] of Object.entries(c.bonus))f.push(TR[+t]+' 판정 '+(b>0?'+':'')+b);return f.join(', ')||'-';};
if(args.includes('--md')){const out=[];const nm=i=>ATT[i].name,nd=i=>DEF[i].name;
  for(const [side,cards,vals] of [['공격',ATT,R.cardA],['수비',DEF,R.cardD]]){out.push('### '+side+' 20장\n');out.push('| ID | 카드 | 등급 | 아이콘 | 텍스트 | 카드 value | 컨셉 |');out.push('|---|---|---|---|---|---|---|');
    cards.forEach((c,i)=>out.push('| '+c.id+' | '+c.name+' ('+c.en+') | '+c.grade+' | '+iconStr(c)+' | '+fxStr(c)+' | '+vals[i].toFixed(1)+' | '+c.desc+' |'));out.push('');}
  out.push('### 검증 수치\n');out.push('| 항목 | 공격 | 수비 | 요구 |');out.push('|---|---|---|---|');
  out.push('| 조합 value 평균 | '+mean(R.VA).toFixed(1)+' | '+mean(R.VD).toFixed(1)+' | - |');
  out.push('| 조합 value 표준편차 | '+sd(R.VA).toFixed(1)+' | '+sd(R.VD).toFixed(1)+' | ≥ 20 |');
  out.push('| 조합 value 최소 / 최대 | '+Math.min(...R.VA).toFixed(1)+' / '+Math.max(...R.VA).toFixed(1)+' | '+Math.min(...R.VD).toFixed(1)+' / '+Math.max(...R.VD).toFixed(1)+' | - |');
  out.push('| 190 조합 중 value 가 정확히 같은 조합 수 | '+dupes(R.VA,6)+' | '+dupes(R.VD,6)+' | < 20 |');
  for(const g of ['S','C','X'])out.push('| 등급 '+g+' 카드 value 평균 / 편차폭 | '+gA[g].mean.toFixed(1)+' / '+gA[g].spread.toFixed(1)+' | '+gD[g].mean.toFixed(1)+' / '+gD[g].spread.toFixed(1)+' | 편차폭 < 5 |');
  const allM=R.M.flat();out.push('| 매치업 36,100 평균 / 표준편차 / 최소 / 최대 | '+mean(allM).toFixed(1)+' / '+sd(allM).toFixed(1)+' / '+Math.min(...allM).toFixed(1)+' / '+Math.max(...allM).toFixed(1)+' | | |');
  out.push('| 공격 조합 하나가 수비에 따라 갈리는 폭 (행 표준편차 평균) | '+mean(R.M.map(r=>sd(r))).toFixed(1)+' | | |');out.push('');
  const top=(vals,n,f)=>vals.map((v,k)=>[v,k]).sort((a,b)=>b[0]-a[0]).slice(0,n).map(([v,k])=>f(pairs[k][0])+' + '+f(pairs[k][1])+' ('+v.toFixed(1)+')');
  const bot=(vals,n,f)=>vals.map((v,k)=>[v,k]).sort((a,b)=>a[0]-b[0]).slice(0,n).map(([v,k])=>f(pairs[k][0])+' + '+f(pairs[k][1])+' ('+v.toFixed(1)+')');
  out.push('### 조합 value 상·하위\n');out.push('공격 상위 8: '+top(R.VA,8,nm).join(' · '));out.push('\n공격 하위 8: '+bot(R.VA,8,nm).join(' · '));out.push('\n수비 상위 8: '+top(R.VD,8,nd).join(' · '));out.push('\n수비 하위 8: '+bot(R.VD,8,nd).join(' · '));
  const bestA=R.VA.indexOf(Math.max(...R.VA));const row=R.M[bestA];const mx=row.indexOf(Math.max(...row)),mn=row.indexOf(Math.min(...row));
  out.push('\n### 매치업 예시\n');out.push('공격 최강 조합 '+nm(pairs[bestA][0])+' + '+nm(pairs[bestA][1])+' 은 수비 '+nd(pairs[mn][0])+' + '+nd(pairs[mn][1])+' 을 만나면 '+row[mn].toFixed(1)+', '+nd(pairs[mx][0])+' + '+nd(pairs[mx][1])+' 을 만나면 '+row[mx].toFixed(1)+'.');
  console.log(out.join('\n'));}
else{
  console.log('공격 조합 value: 평균',mean(R.VA).toFixed(2),'표준편차',sd(R.VA).toFixed(2),'범위',Math.min(...R.VA).toFixed(1),'~',Math.max(...R.VA).toFixed(1),'중복',dupes(R.VA,6));
  console.log('수비 조합 value: 평균',mean(R.VD).toFixed(2),'표준편차',sd(R.VD).toFixed(2),'범위',Math.min(...R.VD).toFixed(1),'~',Math.max(...R.VD).toFixed(1),'중복',dupes(R.VD,6));
  console.log('매치업 행 표준편차 평균',mean(R.M.map(r=>sd(r))).toFixed(1));
  {const bucket=(cards,tIdx,vals,rows)=>{const g={};pairs.forEach((p,k)=>{const pr=profile([cards[p[0]],cards[p[1]]],tIdx);const mx=Math.max(...pr.map(x=>x.str));(g[mx]=g[mx]||[]).push([vals[k],sd(rows[k])]);});return Object.entries(g).map(([m,xs])=>m+':'+xs.length+'개 평균 '+mean(xs.map(x=>x[0])).toFixed(1)+' 진폭 '+mean(xs.map(x=>x[1])).toFixed(1)).join(' | ');};
   console.log('공격 최대 쌓기별 (세기: 조합 수, 평균 value, 상대별 진폭)',bucket(ATT,tIdxA,R.VA,R.M));
   const MT=pairs.map((_,q)=>R.M.map(r=>100-r[q]));console.log('수비 최대 쌓기별',bucket(DEF,tIdxD,R.VD,MT));}
  console.log('공격 등급별',JSON.stringify(gA));console.log('수비 등급별',JSON.stringify(gD));
  console.log('공격 카드',ATT.map((c,i)=>c.name+'('+c.grade+')='+R.cardA[i].toFixed(1)).join(' | '));
  console.log('수비 카드',DEF.map((c,i)=>c.name+'('+c.grade+')='+R.cardD[i].toFixed(1)).join(' | '));
  if(args.includes('--tune')||args.includes('--opt')){console.log('ICONS '+JSON.stringify(Object.fromEntries([...ATT,...DEF].map(c=>[c.id,[c.icons,c.bonus]]))));}
}
