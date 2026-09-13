// 패스 앤 슛 덱 v2 평가기: 성향 토큰 + 밴드 트랙 (구조는 D-9, 덱은 제안)
// 사용: node playtests/deck-v2-eval.js            통계와 검증
//       node playtests/deck-v2-eval.js --md       카드 목록·수치표 마크다운
//       node playtests/deck-v2-eval.js --tune     보조 아이콘·특성 보너스를 등급 목표에 맞게 조정한 뒤 출력
//
// 모델:
//   특성 4: 템포(점유/전환 vs 압박/후퇴), 폭(측면/중앙 vs 봉쇄/밀집), 공간(뒷공간/발밑 vs 하이/딥), 조직(패턴/개인 vs 지역/대인)
//   두 장의 아이콘을 특성별로 합치고 반대 성향은 1:1 상쇄, 상쇄 쌍마다 혼선 -1 (그 특성 결과에).
//   특성별 v: 뚫음 +(a+d), 잡힘 -(a+d), 힘겨루기 a-d, 한쪽만 ±세기, 둘 다 없으면 0. 특성 보너스는 v 에 더한다.
//   경계 4개 기본 [2,8,14,18] 이 특성 [템포,조직,폭,공간] 의 v 만큼 왼쪽으로 이동. 0~20 으로 자르고 위치순 정렬해 왼쪽부터 ①②③④ 로 읽는다.
//   밴드: ≤① 카운터 0 / ≤② 소유 상실 15 / ≤③ 전진 40 / ≤④ 찬스 70 / 그 위 결정적 찬스 100. d20 (한 방 카드는 2d20 큰 값, 상대 지우개면 무효).
'use strict';
const args=process.argv.slice(2);
const TR=['템포','폭','공간','조직'];
const AT=[['점유','전환'],['측면','중앙'],['뒷공간','발밑'],['패턴','개인']];
const DT=[['압박','후퇴'],['봉쇄','밀집'],['하이','딥'],['지역','대인']];
// 칸 유형 [공격 성향 idx][수비 성향 idx]: P 뚫음, C 잡힘, F 힘겨루기
const CELL=[ [['F','C'],['P','F']], [['F','P'],['C','F']], [['P','C'],['F','F']], [['F','P'],['C','F']] ];
const BOUND_TRAIT=[0,3,1,2]; // 경계 ①②③④ 를 움직이는 특성 인덱스 (템포, 조직, 폭, 공간)
const BASE_B=[2,8,14,18];
const U=[0,15,40,70,100];
const SORT=process.env.SORT!=='0';const CONF=parseInt(process.env.CONF||'1',10);const BAL=parseFloat(process.env.BAL||'0.5');

// 카드: icons {성향:개수}, fx: 'max'(한 방) 'safe'(안전: ①=1 고정) 'cut'(끊기: ④=20) 'erase'(지우개), bonus {특성idx:+n}
// adj: 튜너가 만질 수 있는 보조 성향 목록 (0~2 사이에서만)
const ATT=[
 {id:'A01',name:'후방 빌드업',grade:'S',icons:{점유:2,패턴:1,발밑:1},adj:['발밑','패턴'],desc:'골키퍼와 센터백부터 짧게 연결해 전진한다.'},
 {id:'A02',name:'티키타카',grade:'S',icons:{점유:2,패턴:2,발밑:1,중앙:1},adj:['중앙','발밑'],desc:'짧은 패스로 상대를 끌어내고 공간을 만든다.'},
 {id:'A03',name:'롱볼',grade:'X',icons:{전환:2,뒷공간:2,중앙:1},adj:['개인','중앙'],desc:'후방에서 한 번에 전방으로 보낸다.'},
 {id:'A04',name:'측면 오버로드',grade:'S',icons:{측면:2,점유:2},adj:['점유','패턴'],desc:'한쪽 측면에 수적 우위를 만든다.'},
 {id:'A05',name:'스위칭 플레이',grade:'S',icons:{측면:2,점유:2},bonus:{"1": 1},adj:['점유','패턴'],desc:'긴 횡패스로 반대편으로 전환한다.'},
 {id:'A06',name:'중거리 슛',grade:'S',icons:{개인:2,중앙:2,발밑:1},adj:['중앙','발밑'],fx:'max',desc:'박스 밖에서 때린다. 한 방.'},
 {id:'A07',name:'템포 조절',grade:'S',icons:{점유:3,발밑:1},bonus:{"0": -1},adj:['발밑','패턴'],fx:'safe',desc:'공을 돌리며 위험을 피한다. 카운터를 맞지 않는다.'},
 {id:'A08',name:'오버래핑 풀백',grade:'C',icons:{측면:2,개인:1},adj:['전환','개인'],desc:'풀백이 윙어 바깥으로 올라가 폭을 만든다.'},
 {id:'A09',name:'얼리 크로스',grade:'C',icons:{측면:2,뒷공간:2},adj:['뒷공간','전환'],desc:'수비가 자리 잡기 전에 일찍 올린다.'},
 {id:'A10',name:'컷백',grade:'C',icons:{측면:2,발밑:1},adj:['패턴','발밑'],desc:'엔드라인까지 가서 뒤로 내준다.'},
 {id:'A11',name:'하프스페이스 침투',grade:'C',icons:{중앙:2,패턴:2,발밑:1},adj:['발밑','점유'],desc:'측면과 중앙 사이 공간으로 파고든다.'},
 {id:'A12',name:'스루패스',grade:'C',icons:{중앙:2,뒷공간:2,전환:2},adj:['전환','패턴'],desc:'수비 라인 사이로 찔러 넣는다.'},
 {id:'A13',name:'인버티드 윙어',grade:'C',icons:{중앙:2,개인:2,전환:2},bonus:{"1": 1},adj:['발밑','전환'],desc:'윙어가 안쪽으로 접어 들어온다.'},
 {id:'A14',name:'세컨볼 회수',grade:'C',icons:{전환:2,뒷공간:1},adj:['개인','뒷공간'],desc:'떨어지는 공을 먼저 줍는다.'},
 {id:'A15',name:'세트피스 유도',grade:'C',icons:{개인:2,측면:2,발밑:1},adj:['측면','발밑'],desc:'파울을 끌어내 프리킥·코너로 간다.'},
 {id:'A16',name:'역습',grade:'X',icons:{전환:2,뒷공간:2},adj:['개인','뒷공간'],desc:'공을 얻자마자 빠르게 앞으로.'},
 {id:'A17',name:'라인 브레이킹 런',grade:'X',icons:{뒷공간:3},adj:['전환','개인'],fx:'max',desc:'수비 라인 뒤로 달린다.'},
 {id:'A18',name:'개인 돌파',grade:'X',icons:{개인:2,발밑:2},bonus:{"3": 1},adj:['측면','발밑'],fx:'max',desc:'한 명이 1대1로 제친다.'},
 {id:'A19',name:'타겟맨 활용',grade:'X',icons:{발밑:2,개인:2,전환:2},adj:['전환','중앙'],desc:'큰 공격수가 공을 지키고 떨궈 준다.'},
 {id:'A20',name:'폴스 나인',grade:'S',icons:{발밑:2,패턴:2,점유:2},adj:['점유','중앙'],desc:'공격수가 내려와 센터백을 끌어낸다.'},
];
const DEF=[
 {id:'D01',name:'하이 프레스',grade:'S',icons:{압박:3},bonus:{"0": 1},adj:['하이','대인'],desc:'상대 진영에서부터 압박한다.'},
 {id:'D02',name:'미들 블록',grade:'S',icons:{밀집:2,지역:2,딥:1},adj:['후퇴','딥'],desc:'중원에 블록을 세우고 기다린다.'},
 {id:'D03',name:'로우 블록',grade:'S',icons:{후퇴:2,딥:1},bonus:{"0": -1},adj:['딥','밀집'],desc:'자기 진영 깊숙이 내려선다.'},
 {id:'D04',name:'지역 수비',grade:'S',icons:{지역:2,밀집:2},adj:['밀집','딥'],desc:'사람이 아니라 공간을 지킨다.'},
 {id:'D05',name:'맨마킹',grade:'S',icons:{대인:3,봉쇄:2},bonus:{"3": 1},adj:['압박','봉쇄'],desc:'사람을 따라붙는다.'},
 {id:'D06',name:'컴팩트',grade:'C',icons:{밀집:3},adj:['지역','딥'],fx:'erase',desc:'간격을 좁혀 한 방을 지운다. 상대의 2d20 효과 무효.'},
 {id:'D07',name:'딥 라인',grade:'S',icons:{딥:3},bonus:{"2": 1},adj:['후퇴','지역'],desc:'수비 라인을 내려 뒷공간을 없앤다.'},
 {id:'D08',name:'게겐프레싱',grade:'C',icons:{압박:3,대인:1,하이:1},adj:['하이','대인'],desc:'공을 잃은 직후 되찾는다.'},
 {id:'D09',name:'하이 라인',grade:'C',icons:{하이:3},adj:['압박','지역'],desc:'수비 라인을 올려 공간을 압축한다.'},
 {id:'D10',name:'오프사이드 트랩',grade:'C',icons:{하이:3,압박:2},adj:['지역','압박'],desc:'라인을 맞춰 올려 침투를 걸어 낸다.'},
 {id:'D11',name:'스위퍼 키퍼',grade:'C',icons:{하이:2,압박:2},adj:['압박','지역'],desc:'골키퍼가 나와 뒷공간을 정리한다.'},
 {id:'D12',name:'박스 밀집',grade:'C',icons:{딥:2,밀집:2},bonus:{"2": -1},adj:['지역','후퇴'],desc:'페널티 박스 안에 몸을 던진다.'},
 {id:'D13',name:'5백',grade:'S',icons:{봉쇄:2,지역:1},bonus:{"1": -1},adj:['후퇴','딥'],desc:'센터백 3명과 윙백으로 폭을 막는다.'},
 {id:'D14',name:'더블 피봇',grade:'C',icons:{밀집:3},adj:['지역','후퇴'],desc:'수비형 미드필더 둘이 중앙을 잠근다.'},
 {id:'D15',name:'측면 봉쇄',grade:'C',icons:{봉쇄:2,대인:2},adj:['대인','압박'],desc:'윙어를 바깥으로 몰고 더블팀한다.'},
 {id:'D16',name:'압박 트리거',grade:'X',icons:{압박:2,지역:2},bonus:{"0": 1},adj:['하이','지역'],desc:'백패스·횡패스 순간에만 달려든다.'},
 {id:'D17',name:'전술적 파울',grade:'X',icons:{대인:2,봉쇄:2,후퇴:1},bonus:{"3": -1},adj:['후퇴','봉쇄'],fx:'cut',desc:'위험해지기 전에 끊는다. 결정적 찬스를 주지 않는다.'},
 {id:'D18',name:'역습 세팅',grade:'X',icons:{후퇴:3,대인:2},adj:['딥','대인'],desc:'뒤에 남았다가 뺏는 즉시 달린다.'},
 {id:'D19',name:'슛 스토퍼 GK',grade:'X',icons:{딥:3,후퇴:2},adj:['후퇴','밀집'],desc:'골키퍼가 라인을 지킨다.'},
 {id:'D20',name:'세트피스 수비',grade:'X',icons:{지역:2,딥:1},adj:['밀집','딥'],desc:'코너·프리킥에서 지역과 사람을 섞어 막는다.'},
];
for(const c of [...ATT,...DEF]){c.bonus=c.bonus||{};c.grade0=c.grade;}
const MAXSWAP=parseInt(process.env.MAXSWAP||'0',10);const STDT=parseFloat(process.env.STDT||'20.5'),SPT=parseFloat(process.env.SPT||'4.2'),SPW=parseFloat(process.env.SPW||'1'),T0=parseFloat(process.env.T0||'1.5');
if(process.env.SEED_FILE){const line=require('fs').readFileSync(process.env.SEED_FILE,'utf8').split('\n').find(l=>l.startsWith('ICONS '));if(line){const st=JSON.parse(line.slice(6));for(const c of [...ATT,...DEF])if(st[c.id]){c.icons=st[c.id][0];c.bonus=st[c.id][1]||{};if(st[c.id][2])c.grade=st[c.id][2];}}}

// ---------- 모델 ----------
const tIdxA={},tIdxD={};AT.forEach((p,t)=>p.forEach((n,k)=>tIdxA[n]=[t,k]));DT.forEach((p,t)=>p.forEach((n,k)=>tIdxD[n]=[t,k]));
function profile(cards,tIdx){const cnt=[[0,0],[0,0],[0,0],[0,0]];const bonus=[0,0,0,0];
  for(const c of cards){for(const [n,v] of Object.entries(c.icons)){const [t,k]=tIdx[n];cnt[t][k]+=v;}for(const [t,b] of Object.entries(c.bonus))bonus[+t]+=b;}
  return cnt.map(([x,y],t)=>{const cancel=Math.min(x,y);return {side:x>y?0:y>x?1:-1,str:Math.abs(x-y),cancel,bonus:bonus[t]};});}
const P1=Array.from({length:21},(_,k)=>k?1/20:0),PMAX=Array.from({length:21},(_,k)=>k?(2*k-1)/400:0);
const CASCADE=process.env.CASCADE!=='0';const VSCALE=parseFloat(process.env.VSCALE||'4');
function bandsFor(vs,fxA,fxD){let B;if(CASCADE){let acc=0;B=BASE_B.map((b,i)=>{acc+=vs[BOUND_TRAIT[i]]*VSCALE;return Math.max(0,Math.min(20,b-acc));});}else B=BASE_B.map((b,i)=>Math.max(0,Math.min(20,b-vs[BOUND_TRAIT[i]]*VSCALE)));
  if(fxA.has('safe'))B[0]=Math.min(B[0],1);if(fxD.has('cut'))B[3]=20;
  if(SORT)B=B.slice().sort((a,b)=>a-b);else{for(let i=1;i<4;i++)B[i]=Math.max(B[i],B[i-1]);}
  return B;}
function ev(ai,aj,di,dj){const A=[ATT[ai],ATT[aj]],D=[DEF[di],DEF[dj]];const pa=profile(A,tIdxA),pd=profile(D,tIdxD);const vs=[0,0,0,0];
  for(let t=0;t<4;t++){const a=pa[t],d=pd[t];let v=0;
    if(a.side>=0&&d.side>=0){const ty=CELL[t][a.side][d.side];v=ty==='P'?a.str+d.str:ty==='C'?-(a.str+d.str):a.str-d.str;}
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
  for(const g of Object.values(gA))pen+=SPW*Math.max(0,g.spread-SPT)**2;for(const g of Object.values(gD))pen+=SPW*Math.max(0,g.spread-SPT)**2;
  pen+=2*Math.max(0,STDT-sd(R.VA))**2+2*Math.max(0,STDT-sd(R.VD))**2;
  pen+=0.5*Math.max(0,dupes(R.VA,6)-10)+0.5*Math.max(0,dupes(R.VD,6)-10);
  const mA=mean(R.VA);pen+=0.2*Math.max(0,Math.abs(mA-47)-5)**2;
  for(const [cards,T] of [[ATT,AT],[DEF,DT]])for(let t=0;t<4;t++){const n0=cards.reduce((a,c)=>a+(c.icons[T[t][0]]||0),0),n1=cards.reduce((a,c)=>a+(c.icons[T[t][1]]||0),0);pen+=BAL*Math.max(0,Math.abs(n0-n1)-2)**2;}const nb=[...ATT,...DEF].filter(c=>Object.keys(c.bonus).length).length;pen+=3*Math.max(0,nb-MAXB);const ns=[...ATT,...DEF].filter(c=>c.grade!==c.grade0).length;pen+=3*Math.max(0,ns-MAXSWAP);return pen;}
const MAXB=parseInt(process.env.MAXB||'12',10),MAXT=parseInt(process.env.MAXT||'6',10);
function randomMove(c){const isA=c.id[0]==='A';const tIdx=isA?tIdxA:tIdxD;const T=isA?AT:DT;const cand=[];
  const main=c.main||Object.entries(c.icons).sort((x,y)=>y[1]-x[1])[0][0];c.main=main;
  for(const n of [...c.adj,main]){const cur=c.icons[n]||0;const [t,k]=tIdx[n];const opp=T[t][1-k];if(c.icons[opp])continue;
    const lo=n===main?2:0,hi=n===main?3:2;if(cur<hi&&total(c)<MAXT)cand.push({n,d:1});if(cur>lo&&total(c)>3)cand.push({n,d:-1});}
  const mt=tIdx[main][0];const cb=c.bonus[mt]||0;if(cb<1)cand.push({bonusT:mt,d:1});if(cb>-1)cand.push({bonusT:mt,d:-1});
  if(!cand.length)return null;return cand[Math.floor(Math.random()*cand.length)];}
function optimize(iters){let R=evaluate();let cur=objective(R);let best=cur;let bestState=JSON.stringify([...ATT,...DEF].map(c=>[c.icons,c.bonus,c.grade]));const all=[...ATT,...DEF];
  for(let it=0;it<iters;it++){
    if(MAXSWAP>0&&Math.random()<0.06){const side=Math.random()<0.5?ATT:DEF;const c1=side[Math.floor(Math.random()*20)],c2=side[Math.floor(Math.random()*20)];if(c1.grade===c2.grade)continue;const g1=c1.grade,g2=c2.grade;c1.grade=g2;c2.grade=g1;const r=evaluate();const o=objective(r);const T=Math.max(0.02,T0*(1-it/iters));if(o<=cur||Math.random()<Math.exp((cur-o)/T)){cur=o;R=r;if(o<best){best=o;bestState=JSON.stringify(all.map(c=>[c.icons,c.bonus,c.grade]));}}else{c1.grade=g1;c2.grade=g2;}continue;}
    const c=all[Math.floor(Math.random()*all.length)];const m=randomMove(c);if(!m)continue;apply(c,m,1);
    const r=evaluate();const o=objective(r);const T=Math.max(0.02,T0*(1-it/iters));
    if(o<=cur||Math.random()<Math.exp((cur-o)/T)){cur=o;R=r;if(o<best){best=o;bestState=JSON.stringify(all.map(c=>[c.icons,c.bonus,c.grade]));}}else apply(c,m,-1);
    if(it%200===0)process.stderr.write('it '+it+' cur '+cur.toFixed(2)+' best '+best.toFixed(2)+'\n');}
  const st=JSON.parse(bestState);all.forEach((c,i)=>{c.icons=st[i][0];c.bonus=st[i][1];if(st[i][2])c.grade=st[i][2];});return evaluate();}

// ---------- 출력 ----------
let R=args.includes('--opt')?optimize(parseInt(process.env.ITERS||'3000',10)):args.includes('--tune')?tune():evaluate();
const gA=gradeStats(ATT,R.cardA),gD=gradeStats(DEF,R.cardD);
const iconStr=c=>Object.entries(c.icons).map(([n,v])=>n+' '+'●'.repeat(v)).join(', ');
const fxStr=c=>{const f=[];if(c.fx==='max')f.push('한 방 (2d20 큰 값)');if(c.fx==='safe')f.push('안전 (카운터 경계 1 고정)');if(c.fx==='cut')f.push('끊기 (찬스 경계 20 고정)');if(c.fx==='erase')f.push('지우개 (상대 한 방 무효)');for(const [t,b] of Object.entries(c.bonus))f.push(TR[+t]+' 판정 '+(b>0?'+':'')+b);return f.join(', ')||'-';};
if(args.includes('--md')){const out=[];const nm=i=>ATT[i].name,nd=i=>DEF[i].name;
  for(const [side,cards,vals] of [['공격',ATT,R.cardA],['수비',DEF,R.cardD]]){out.push('### '+side+' 20장\n');out.push('| ID | 카드 | 등급 | 아이콘 | 텍스트 | 카드 value | 컨셉 |');out.push('|---|---|---|---|---|---|---|');
    cards.forEach((c,i)=>out.push('| '+c.id+' | '+c.name+' | '+c.grade+' | '+iconStr(c)+' | '+fxStr(c)+' | '+vals[i].toFixed(1)+' | '+c.desc+' |'));out.push('');}
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
  console.log('공격 등급별',JSON.stringify(gA));console.log('수비 등급별',JSON.stringify(gD));
  console.log('공격 카드',ATT.map((c,i)=>c.name+'('+c.grade+')='+R.cardA[i].toFixed(1)).join(' | '));
  console.log('수비 카드',DEF.map((c,i)=>c.name+'('+c.grade+')='+R.cardD[i].toFixed(1)).join(' | '));
  if(args.includes('--tune')||args.includes('--opt')){console.log('ICONS '+JSON.stringify(Object.fromEntries([...ATT,...DEF].map(c=>[c.id,[c.icons,c.bonus,c.grade]]))));}
}
