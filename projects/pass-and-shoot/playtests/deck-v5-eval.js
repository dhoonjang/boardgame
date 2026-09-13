// 패스 앤 슛 덱 v4 평가기: 성향 토큰 + 저지 아이콘 + 밴드 트랙 (구조·덱 모두 제안)
// 사용: node playtests/deck-v4-eval.js            통계와 검증
//       node playtests/deck-v4-eval.js --md       카드 목록·수치표 마크다운
//       node playtests/deck-v4-eval.js --opt      아이콘 배치 담금질 최적화 (ITERS, MAXT, K 환경변수)
//
// 모델:
//   특성 4: 템포(점유/전환 vs 압박/후퇴), 폭(측면/중앙 vs 봉쇄/밀집), 공간(뒷공간/발밑 vs 하이/딥), 조직(패턴/개인 vs 지역/대인)
//   두 장의 아이콘을 특성별로 합치고 반대 성향은 1:1 상쇄 (혼선 벌점 없음, D-16). 상쇄 후 세기가 2 미만이면 없는 것.
//   수비 아이콘은 방패 안에 노리는 공격 성향 (D-11). 특성별 v (D-12, FORMULA D): 잡히거나 내가 없으면 -d, 안 잡히거나 상대가 없으면 +a. 마커는 특성마다 2개(순환), 합쳐서 한 번에, 겹침 없음(D-14). 공 위치 -2~2 공유, 2 초과 = 골.
//   경계 4개 기본 [2,8,14,18] 이 특성 [템포,조직,폭,공간] 의 v 만큼 왼쪽으로 이동. 0~20 으로 자르고 위치순 정렬해 왼쪽부터 ①②③④ 로 읽는다.
//   밴드: ≤① 카운터 0 / ≤② 소유 상실 15 / ≤③ 전진 40 / ≤④ 찬스 70 / 그 위 결정적 찬스 100. d20 (한 방 카드는 2d20 큰 값, 상대 지우개면 무효).
'use strict';
const args=process.argv.slice(2);
const TR=['템포','폭','공간','조직'];
const ENGINE=require('./engine-v5.js');
const BLK_KO={'점유 저지':'압박','전환 저지':'내려서기','측면 저지':'측면 봉쇄','중앙 저지':'중앙 밀집','뒷공간 저지':'딥 라인','발밑 저지':'하이 라인','패턴 저지':'대인','개인 저지':'지역 커버'};
const ignKo=n=>n.endsWith(' 저지')?BLK_KO[n]:n;
const TEN_EN={'점유':'Possession','전환':'Transition','측면':'Wide','중앙':'Central','뒷공간':'In behind','발밑':'To feet','패턴':'Pattern play','개인':'1v1'};
const BLK_EN={'점유 저지':'Press','전환 저지':'Drop','측면 저지':'Show inside','중앙 저지':'Show outside','뒷공간 저지':'Deep line','발밑 저지':'High line','패턴 저지':'Man-oriented','개인 저지':'Zonal cover'};
const AT=[['점유','전환'],['측면','중앙'],['뒷공간','발밑'],['패턴','개인']];
const DT=[['점유 저지','전환 저지'],['측면 저지','중앙 저지'],['뒷공간 저지','발밑 저지'],['패턴 저지','개인 저지']];
// 칸 유형 [공격 성향 idx][수비 성향 idx]: P 뚫음, C 잡힘, F 힘겨루기
const CELL=[ [['C','P'],['P','C']], [['C','P'],['P','C']], [['C','P'],['P','C']], [['C','P'],['P','C']] ];
const K=parseFloat(process.env.K||'2');const FORMULA=process.env.FORMULA||'D';const MINSTR=parseInt(process.env.MINSTR||'2',10);
const BOUND_TRAIT=[0,3,1,2]; // 경계 ①②③④ 를 움직이는 특성 인덱스 (템포, 조직, 폭, 공간)
const BASE_B=[4,8,12,16]; // D-16: 다섯 결과 20% 씩, 직관적인 기본 위치
const BANDS=['카운터','소유 상실','교착','전진','돌파'];
// 공 위치 -2~2 (공격자 기준) 의 가치. 골 = 100. 소유가 넘어가면 상대 가치의 보수.
const VPOS={'-2':30,'-1':42,'0':55,'1':70,'2':85};const POSW=[1,1,1,1,1]; // 위치별 가중치 (평균에 쓰임)
// value 는 위치마다 카운터 = 0, 돌파(또는 골) = 100 으로 정규화한 뒤 위치 평균. v1~v4 의 0~100 척도와 같다.
const SORT=process.env.SORT!=='0';const CONF=parseInt(process.env.CONF||'0',10);const BAL=parseFloat(process.env.BAL||'0.5'); // CONF: 혼선은 2026-09-10 에 폐지 (D-16). 반대 성향은 1:1 로 지우기만 한다

// 카드: icons {성향:개수}, fx: 'max'(한 방) 'safe'(안전: ①=1 고정) 'cut'(끊기: ④=20) 'erase'(지우개), bonus {특성idx:+n}
// adj: 튜너가 만질 수 있는 보조 성향 목록 (0~2 사이에서만)
const ATT=[
 {id:'A01',type:'S',name:'후방 빌드업',en:'Build-up from the back',grade:'S',icons:{점유:3,패턴:1},adj:['발밑','패턴'],desc:'골키퍼와 센터백부터 짧게 연결해 전진한다.'},
 {id:'A02',type:'S',name:'티키타카',en:'Tiki-taka',grade:'S',icons:{점유:3,패턴:2,중앙:1},adj:['중앙','발밑'],desc:'짧은 패스로 상대를 끌어내고 공간을 만든다.'},
 {id:'A03',type:'S',name:'롱볼',en:'Long ball',grade:'S',icons:{전환:2,뒷공간:2,개인:1},adj:['개인','중앙'],desc:'후방에서 한 번에 전방으로 보낸다.'},
 {id:'A04',type:'S',name:'측면 오버로드',en:'Wide overload',grade:'S',icons:{점유:3,측면:2,패턴:1},adj:['점유','패턴'],desc:'한쪽 측면에 수적 우위를 만든다.'},
 {id:'A05',type:'P',name:'스위칭 플레이',en:'Switch of play',grade:'S',icons:{측면:2,점유:2,패턴:1},adj:['점유','패턴'],desc:'긴 횡패스로 반대편으로 전환한다.'},
 {id:'A06',type:'P',name:'중거리 슛',en:'Long-range shot',grade:'S',icons:{개인:2,중앙:2,발밑:1},adj:['중앙','발밑'],desc:'박스 밖에서 때린다. 한 방.'},
 {id:'A07',type:'S',name:'템포 조절',en:'Game management',grade:'S',icons:{점유:2,패턴:2},adj:['발밑','패턴'],desc:'공을 돌리며 위험을 피한다. 카운터를 맞지 않는다.'},
 {id:'A08',type:'P',name:'오버래핑 풀백',en:'Overlapping full-back',grade:'C',icons:{측면:3,전환:1},adj:['전환','개인'],desc:'풀백이 윙어 바깥으로 올라가 폭을 만든다.'},
 {id:'A09',type:'P',name:'얼리 크로스',en:'Early cross',grade:'C',icons:{측면:2,뒷공간:2,전환:1},adj:['뒷공간','전환'],desc:'수비가 자리 잡기 전에 일찍 올린다.'},
 {id:'A10',type:'P',name:'컷백',en:'Cut-back',grade:'C',icons:{측면:3,발밑:1},adj:['패턴','발밑'],desc:'엔드라인까지 가서 뒤로 내준다.'},
 {id:'A11',type:'P',name:'하프스페이스 침투',en:'Half-space run',grade:'C',icons:{중앙:2,패턴:2,점유:1},adj:['발밑','점유'],desc:'측면과 중앙 사이 공간으로 파고든다.'},
 {id:'A12',type:'P',name:'스루패스',en:'Through ball',grade:'C',icons:{중앙:2,뒷공간:2,전환:1},adj:['전환','패턴'],desc:'수비 라인 사이로 찔러 넣는다.'},
 {id:'A13',type:'S',name:'인버티드 윙어',en:'Inverted winger',grade:'C',icons:{중앙:2,개인:2,전환:1},adj:['발밑','전환'],desc:'윙어가 안쪽으로 접어 들어온다.'},
 {id:'A14',type:'P',name:'세컨볼 회수',en:'Second ball',grade:'C',icons:{전환:3},adj:['개인','뒷공간'],desc:'떨어지는 공을 먼저 줍는다.'},
 {id:'A15',type:'P',name:'파울 유도',en:'Winning free kicks',grade:'C',icons:{개인:2,발밑:1},adj:['측면','발밑'],desc:'파울을 끌어내 프리킥·코너로 간다.'},
 {id:'A16',type:'P',name:'역습',en:'Counter-attack',grade:'X',icons:{전환:3,뒷공간:2},adj:['개인','뒷공간'],desc:'공을 얻자마자 빠르게 앞으로.'},
 {id:'A17',type:'P',name:'라인 브레이킹 런',en:'Run in behind',grade:'X',icons:{뒷공간:3,개인:1,전환:1},adj:['전환','개인'],desc:'수비 라인 뒤로 달린다.'},
 {id:'A18',type:'P',name:'1대1 돌파',en:'Take-on',grade:'X',icons:{개인:3,발밑:2,측면:1},adj:['측면','발밑'],desc:'한 명이 1대1로 제친다.'},
 {id:'A19',type:'S',name:'타겟맨 활용',en:'Hold-up play',grade:'X',icons:{전환:2,발밑:2,개인:1},adj:['발밑','개인'],desc:'큰 공격수에게 직선적으로 넣고, 떨궈 주는 공을 받는다.'},
 {id:'A20',type:'S',name:'폴스 나인',en:'False nine',grade:'X',icons:{발밑:2,패턴:2,중앙:2},adj:['점유','중앙'],desc:'공격수가 내려와 센터백을 끌어낸다.'},
];
const DEF=[
 {id:'D01',type:'S',name:'하이 프레스',en:'High press',grade:'S',icons:{'점유 저지':2,'발밑 저지':1,'패턴 저지':1},adj:['발밑 저지','패턴 저지'],desc:'상대 진영에서부터 압박한다.'},
 {id:'D02',type:'S',name:'미들 블록',en:'Mid block',grade:'S',icons:{'중앙 저지':2,'개인 저지':2,'전환 저지':1},adj:['전환 저지','뒷공간 저지'],desc:'중원에 블록을 세우고 기다린다.'},
 {id:'D03',type:'S',name:'로우 블록',en:'Low block',grade:'S',icons:{'전환 저지':3},adj:['뒷공간 저지','중앙 저지'],desc:'자기 진영 깊숙이 내려선다.'},
 {id:'D04',type:'P',name:'지역 수비',en:'Zonal marking',grade:'S',icons:{'개인 저지':2,'뒷공간 저지':1},adj:['중앙 저지','뒷공간 저지'],desc:'사람이 아니라 공간을 지킨다.'},
 {id:'D05',type:'P',name:'맨마킹',en:'Man-marking',grade:'S',icons:{'패턴 저지':3,'측면 저지':2},adj:['점유 저지','측면 저지'],desc:'사람을 따라붙는다.'},
 {id:'D06',type:'S',name:'컴팩트',en:'Compactness',grade:'S',icons:{'중앙 저지':2,'뒷공간 저지':2,'개인 저지':1},adj:['개인 저지','뒷공간 저지'],desc:'간격을 좁혀 한 번에 뚫리지 않는다.'},
 {id:'D07',type:'S',name:'딥 라인',en:'Deep line',grade:'S',icons:{'뒷공간 저지':3},adj:['전환 저지','개인 저지'],desc:'수비 라인을 내려 뒷공간을 없앤다.'},
 {id:'D08',type:'P',name:'게겐프레싱',en:'Counter-press',grade:'C',icons:{'점유 저지':2,'패턴 저지':2,'발밑 저지':1},adj:['발밑 저지','패턴 저지'],desc:'공을 잃은 직후 되찾는다.'},
 {id:'D09',type:'S',name:'하이 라인',en:'High line',grade:'C',icons:{'발밑 저지':3,'점유 저지':1},adj:['점유 저지','개인 저지'],desc:'수비 라인을 올려 공간을 압축한다.'},
 {id:'D10',type:'P',name:'오프사이드 트랩',en:'Offside trap',grade:'C',icons:{'발밑 저지':3,'개인 저지':2},adj:['개인 저지','점유 저지'],desc:'라인을 맞춰 올려 침투를 걸어 낸다.'},
 {id:'D11',type:'P',name:'스위퍼 키퍼',en:'Sweeper-keeper',grade:'C',icons:{'발밑 저지':2,'개인 저지':2},adj:['점유 저지','개인 저지'],desc:'골키퍼가 나와 뒷공간을 정리한다.'},
 {id:'D12',type:'P',name:'박스 밀집',en:'Packing the box',grade:'C',icons:{'뒷공간 저지':2,'중앙 저지':2,'전환 저지':1},adj:['개인 저지','전환 저지'],desc:'페널티 박스 안에 몸을 던진다.'},
 {id:'D13',type:'S',name:'5백',en:'Back five',grade:'C',icons:{'측면 저지':3,'개인 저지':1,'뒷공간 저지':2},adj:['전환 저지','뒷공간 저지'],desc:'센터백 3명과 윙백으로 폭을 막는다.'},
 {id:'D14',type:'S',name:'더블 피봇',en:'Double pivot',grade:'C',icons:{'중앙 저지':2,'개인 저지':1,'전환 저지':2},adj:['개인 저지','전환 저지'],desc:'수비형 미드필더 둘이 중앙을 잠근다.'},
 {id:'D15',type:'P',name:'측면 더블팀',en:'Doubling up wide',grade:'C',icons:{'측면 저지':2,'점유 저지':2,'패턴 저지':2},adj:['패턴 저지','점유 저지'],desc:'윙어를 바깥으로 몰고 더블팀한다.'},
 {id:'D16',type:'P',name:'압박 트리거',en:'Pressing trigger',grade:'X',icons:{'점유 저지':3,'발밑 저지':2},adj:['발밑 저지','개인 저지'],desc:'백패스·횡패스 순간에만 달려든다.'},
 {id:'D17',type:'P',name:'전술적 파울',en:'Tactical foul',grade:'X',icons:{'패턴 저지':3,'측면 저지':2},adj:['전환 저지','측면 저지'],desc:'위험해지기 전에 끊는다. 돌파는 20 한 눈만 남는다.'},
 {id:'D18',type:'P',name:'역습 세팅',en:'Sit and counter',grade:'X',icons:{'전환 저지':2,'패턴 저지':1},adj:['뒷공간 저지','패턴 저지'],desc:'뒤에 남았다가 뺏는 즉시 달린다.'},
 {id:'D19',type:'P',name:'슛 스토퍼',en:'Shot-stopper',grade:'X',icons:{'뒷공간 저지':2,'전환 저지':1},adj:['전환 저지','중앙 저지'],desc:'골키퍼가 라인을 지킨다.'},
 {id:'D20',type:'P',name:'세트피스 수비',en:'Set-piece defending',grade:'X',icons:{'개인 저지':2,'중앙 저지':2},adj:['중앙 저지','뒷공간 저지'],desc:'코너·프리킥에서 지역과 사람을 섞어 막는다.'},
];
for(const c of [...ATT,...DEF]){c.bonus=c.bonus||{};}
if(process.env.SEED_FILE){const line=require('fs').readFileSync(process.env.SEED_FILE,'utf8').split('\n').find(l=>l.startsWith('ICONS '));if(line){const st=JSON.parse(line.slice(6));for(const c of [...ATT,...DEF])if(st[c.id]){c.icons=st[c.id][0];c.bonus=st[c.id][1]||{};}}}

// ---------- 모델 ----------
const tIdxA={},tIdxD={};AT.forEach((p,t)=>p.forEach((n,k)=>tIdxA[n]=[t,k]));DT.forEach((p,t)=>p.forEach((n,k)=>tIdxD[n]=[t,k]));
const VSCALE=parseFloat(process.env.VSCALE||'1');
if(process.env.BASE){const b=process.env.BASE.split(',').map(Number);BASE_B.splice(0,4,...b);}
ENGINE.P.MINSTR=MINSTR;ENGINE.P.BASE=BASE_B;ENGINE.P.VSCALE=VSCALE;
const NOFX=new Set();
function utilOf(o){if(o.kind==='concede')return 0;if(o.kind==='swap')return 100-VPOS[o.np];if(o.kind==='goal')return 100;if(o.kind==='saved')return VPOS[2];return VPOS[o.np];}
function rawLoHi(p){const cn=-p+1;const lo=cn>2?0:100-VPOS[cn];const br=p+2;const hi=br>2?100:VPOS[br];return [lo,hi];}
const ROUNDS=parseInt(process.env.ROUNDS||'18',10);
function goalsFromT(T,rounds){let dist={0:1},goals=0;for(let r=0;r<rounds;r++){const nd={};let g=0;for(const [p,w] of Object.entries(dist)){const t=T[+p+2];g+=w*(t.goal+t.concede);for(const [np,x] of Object.entries(t.next))nd[np]=(nd[np]||0)+w*x;nd[0]=(nd[0]||0)+w*(t.goal+t.concede);}goals+=g;dist=nd;}return goals;}
// 한 매치업의 value: 위치마다 (효과 없는 카운터 = 0, 효과 없는 돌파 = 100) 정규화, 다섯 위치 평균. TACC 가 있으면 전이도 누적
function evRound(A,D,opts){const R=ENGINE.evalRound(A,D,opts||{});const pr=[0,0,0,0,0];for(let r=1;r<=20;r++)pr[ENGINE.band(r,R.B)]+=0.05;
  let e=0,w=0;for(let k=0;k<5;k++){const p=k-2;const [lo,hi]=rawLoHi(p);let u=0;for(let b=0;b<5;b++){if(!pr[b])continue;const o=R.outcome(b,p);u+=pr[b]*100*(utilOf(o)-lo)/(hi-lo);
    if(TACC){const t=TACC[k];const ww=pr[b]/NM;if(o.kind==='goal')t.goal+=ww;else if(o.kind==='concede')t.concede+=ww;else t.next[o.np]=(t.next[o.np]||0)+ww;}}
    e+=POSW[k]*u;w+=POSW[k];}
  return {e:e/w,R,pr};}
let TACC=null; // evaluate 중 전이 누적
function ev(ai,aj,di,dj){return evRound([ATT[ai],ATT[aj]],[DEF[di],DEF[dj]]).e;}
// 조합 = 시스템 1장 + 플레이 1장 (D-17). 공격 96, 수비 96
function typePairs(cards){const S=[],P=[];cards.forEach((c,i)=>(c.type==='S'?S:P).push(i));const out=[];for(const i of S)for(const j of P)out.push([i,j]);return out;}
const pairsA=typePairs(ATT),pairsD=typePairs(DEF),NM=pairsA.length*pairsD.length;const pairs=pairsA; // pairs 는 공격 조합 (옛 코드 호환)
function evaluate(){TACC=[0,1,2,3,4].map(()=>({goal:0,concede:0,next:{}}));const M=pairsA.map(p=>pairsD.map(q=>ev(p[0],p[1],q[0],q[1])));const T=TACC;TACC=null;const goals=goalsFromT(T,ROUNDS);
  const VA=M.map(r=>r.reduce((a,b)=>a+b,0)/r.length);const VD=pairsD.map((_,q)=>100-M.reduce((a,r)=>a+r[q],0)/pairsA.length);
  const cardA=ATT.map((_,i)=>{const xs=pairsA.map((p,k)=>p.includes(i)?VA[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  const cardD=DEF.map((_,i)=>{const xs=pairsD.map((p,k)=>p.includes(i)?VD[k]:null).filter(x=>x!==null);return xs.reduce((a,b)=>a+b,0)/xs.length;});
  const rowMin=M.map(r=>Math.min(...r)),colMax=pairsD.map((_,q)=>Math.max(...M.map(r=>r[q])));
  return {M,VA,VD,cardA,cardD,goals,T,rowMin,colMax};}
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
const GOAL_LO=parseFloat(process.env.GOAL_LO||'2.5'),GOAL_HI=parseFloat(process.env.GOAL_HI||'3.5');
function objective(R){let pen=0;
  const spA=Math.max(...R.cardA)-Math.min(...R.cardA),spD=Math.max(...R.cardD)-Math.min(...R.cardD);pen+=3*Math.max(0,spA-4.5)**2+3*Math.max(0,spD-4.5)**2;
  for(const x of R.rowMin)pen+=0.5*Math.max(0,x-40)**2;for(const x of R.colMax)pen+=0.5*Math.max(0,60-x)**2;
  for(const v of R.VA)pen+=0.5*(Math.max(0,v-85)**2+Math.max(0,15-v)**2);for(const v of R.VD)pen+=0.5*(Math.max(0,v-85)**2+Math.max(0,15-v)**2);
  pen+=20*(Math.max(0,GOAL_LO-R.goals)**2+Math.max(0,R.goals-GOAL_HI)**2);
  const mA=mean(R.VA);pen+=0.2*Math.max(0,Math.abs(mA-50)-3)**2;
  for(const [cards,T] of [[ATT,AT],[DEF,DT]])for(let t=0;t<4;t++){const n0=cards.reduce((a,c)=>a+(c.icons[T[t][0]]||0),0),n1=cards.reduce((a,c)=>a+(c.icons[T[t][1]]||0),0);pen+=BAL*Math.max(0,Math.abs(n0-n1)-2)**2;}
  const nb=[...ATT,...DEF].filter(c=>Object.keys(c.bonus).length).length;pen+=3*Math.max(0,nb-MAXB);return pen;}
const MAXB=parseInt(process.env.MAXB||'0',10),MAXT=parseInt(process.env.MAXT||'6',10);const T0=parseFloat(process.env.T0||'1.5'),STDT=parseFloat(process.env.STDT||'0'); // 분산 조건은 2026-09-10 에 보류. STDT=0 이면 벌점 없음
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

// ---------- 웹 게임용 데이터 (--json) ----------
if(args.includes('--json')){const cards=[...ATT.map(c=>({...c,side:'A'})),...DEF.map(c=>({...c,side:'D'}))].map(c=>({id:c.id,side:c.side,type:c.type,name:c.name,en:c.en,icons:c.icons,effect:ENGINE.effectText(c.id),desc:c.desc}));
  console.log(JSON.stringify({cards,params:{BASE:BASE_B,VSCALE,MINSTR},TR,AT,DT,TEN_EN,BLK_KO,BLK_EN}));process.exit(0);}

// ---------- 진단: 밴드 확률과 위치별 골 확률 (--bands) ----------
if(args.includes('--bands')){const acc=[0,0,0,0,0];const goal=[0,0,0,0,0],own=[0,0,0,0,0];let n=0;
  for(const p of pairsA)for(const q of pairsD){const {R,pr}=evRound([ATT[p[0]],ATT[p[1]]],[DEF[q[0]],DEF[q[1]]]);for(let b=0;b<5;b++)acc[b]+=pr[b];
    for(let k=0;k<5;k++){const pos=k-2;for(let b=0;b<5;b++){if(!pr[b])continue;const o=R.outcome(b,pos);if(o.kind==='goal')goal[k]+=pr[b];if(o.kind==='concede')own[k]+=pr[b];}}n++;}
  console.log('밴드(효과 반영 전) 확률: '+ENGINE.BANDS.map((nm,b)=>nm+' '+(100*acc[b]/n).toFixed(0)+'%').join(' | '));
  console.log('공 위치 | 이번 라운드 득점 확률 | 이번 라운드 실점(카운터로) 확률');
  for(let k=0;k<5;k++)console.log((k-2)+' | '+(100*goal[k]/n).toFixed(1)+'% | '+(100*own[k]/n).toFixed(1)+'%');process.exit(0);}

// ---------- 진단: 특성 1점의 가치 (--traitval) ----------
if(args.includes('--traitval')){const sum=[[0,0],[0,0],[0,0],[0,0]];let n=0;
  for(const p of pairsA)for(const q of pairsD){const A=[ATT[p[0]],ATT[p[1]]],D=[DEF[q[0]],DEF[q[1]]];const base=evRound(A,D).e;
    for(let t=0;t<4;t++){const up=[0,0,0,0];up[t]=1;const dn=[0,0,0,0];dn[t]=-1;sum[t][0]+=evRound(A,D,{vsDelta:up}).e-base;sum[t][1]+=base-evRound(A,D,{vsDelta:dn}).e;}n++;}
  console.log('1점 = '+VSCALE+'칸, 기본 위치 '+BASE_B.join('/'));console.log('특성 | +1점의 평균 가치 | -1점의 평균 손실 | 맡는 마커');const own=['①②','③④','④①','②③'];
  for(let t=0;t<4;t++)console.log(TR[t]+' | '+(sum[t][0]/n).toFixed(2)+' | '+(sum[t][1]/n).toFixed(2)+' | '+own[t]);process.exit(0);}

// ---------- 진단: 성향별 짚힘 비율 (--probe) ----------
if(args.includes('--probe')){const hit={},miss={},none={};const key=(t,k)=>AT[t][k];
  for(const p of pairsA)for(const q of pairsD){const {R}=evRound([ATT[p[0]],ATT[p[1]]],[DEF[q[0]],DEF[q[1]]]);for(let t=0;t<4;t++){const a=R.pa[t],d=R.pd[t];if(a.side<0)continue;const k=key(t,a.side);if(d.side<0)none[k]=(none[k]||0)+1;else if(d.side===a.side)hit[k]=(hit[k]||0)+1;else miss[k]=(miss[k]||0)+1;}}
  console.log('공격 성향 | 제대로 짚힘 | 잘못 짚음 | 없음 (그 성향을 냈을 때)');for(let t=0;t<4;t++)for(let k=0;k<2;k++){const n=key(t,k);const tot=(hit[n]||0)+(miss[n]||0)+(none[n]||0)||1;console.log(n+' | '+(100*(hit[n]||0)/tot).toFixed(0)+'% | '+(100*(miss[n]||0)/tot).toFixed(0)+'% | '+(100*(none[n]||0)/tot).toFixed(0)+'%');}process.exit(0);}

// ---------- 카드 디자인 시트 (--cards): assets/deck-v4-cards.html 의 원본 ----------
// 아이콘 체계 (2026-09-09, D-11): 특성 = 색. 같은 특성의 두 성향은 같은 재료를 반대 방향으로 그려서 나란히 놓으면 서로 지우는 것이 보인다.
// 수비 아이콘은 특성 색 방패 안에 노리는 공격 성향을 새긴 것이다 (빗금 아님). 이름은 코칭 용어 (BLK_KO).
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
  const fx=c=>ENGINE.effectText(c.id);
  const card=(c,isA)=>`<div class="card ${isA?'att':'def'} g${c.grade}"><div class="head"><div class="id">${c.id}</div><div class="grade">${c.type==='S'?'System · 시스템':'Play · 플레이'}</div></div><div class="name">${c.name}</div><div class="en">${c.en}</div><div class="icons">${iconRow(c,isA)}</div>${fx(c)?`<div class="fx">${fx(c)}</div>`:''}<div class="desc">${c.desc}</div><div class="foot">${isA?'Attack':'Defence'} · Pass &amp; Shoot v5</div></div>`;
  const one=(t,k,isDef,bg)=>`<svg viewBox="0 0 24 24" width="26" height="26">${icon(t,k,isDef,bg)}</svg>`;
  const legendRows=[0,3,1,2].map(t=>{const [a0,a1]=AT[t];const [d0,d1]=DT[t];const bg='#2a3a30';
    return `<tr><th style="color:${COL[t]}">${TRN[t]}</th>
<td>${one(t,0,false)} <b>${a0}</b> <i>${TEN_EN[a0]}</i></td><td>${one(t,1,false)} <b>${a1}</b> <i>${TEN_EN[a1]}</i></td>
<td>${one(t,0,true,bg)} <b>${BLK_KO[d0]}</b> <i>${BLK_EN[d0]}</i> <span class="vs">vs ${a0}</span></td><td>${one(t,1,true,bg)} <b>${BLK_KO[d1]}</b> <i>${BLK_EN[d1]}</i> <span class="vs">vs ${a1}</span></td></tr>`;}).join('');
  const legend=`<div class="card ref"><div class="name">판정 절차</div><ol class="ref-list">
<li>시스템 + 플레이. 특성(색)마다 아이콘을 더한다. 같은 색의 <b>반대 방향 성향은 1:1 로 지운다</b>. 남은 세기가 <b>2 미만이면 없는 것</b>. 아이콘을 지우거나 더하는 카드 효과는 이 전에.</li>
<li>특성마다 내 세기 a, 상대 세기 d. 상대 <b>방패가 내 성향을 노리거나 내가 없으면 −d</b>, 상대 방패가 <b>다른 성향을 노리거나 상대가 없으면 +a</b>. 읽기에서 이긴 쪽이 자기 판돈을 받는다.</li>
<li>마커 4개(기본 ${BASE_B.join('/')}). 마커는 1~19 의 서로 다른 칸에 순서대로 놓인다(겹치지 않으니 다섯 결과 모두 최소 1/20). 마커마다 맡은 두 특성의 결과를 더해 1점 = <b>__SLOT__칸</b> 옮긴다(양수는 왼쪽): ① <span style="color:${COL[0]}">템포</span>+<span style="color:${COL[2]}">공간</span> · ② <span style="color:${COL[0]}">템포</span>+<span style="color:${COL[3]}">조직</span> · ③ <span style="color:${COL[3]}">조직</span>+<span style="color:${COL[1]}">폭</span> · ④ <span style="color:${COL[1]}">폭</span>+<span style="color:${COL[2]}">공간</span>. <b>많이 움직이는 마커부터</b>. 아직 안 옮긴 마커에 닿으면 옆 칸에 붙여 밀고 가고, 이미 옮긴 마커나 벽(1, 19)에 닿으면 멈춘다.</li>
<li>d20. ① 이하 <b>카운터</b> / ② 이하 <b>소유 상실</b> / ③ 이하 <b>교착</b> / ④ 이하 <b>전진</b> / 그 위 <b>돌파</b>. 카드 효과는 단계 순서로 적용한다: 아이콘 → 맞대기 → 마커 → 결과 바꾸기 → 이동량 → 도착. 같은 단계에서는 수비(시스템→플레이) 먼저, 공격(시스템→플레이) 나중.</li>
<li>공 위치 −2~2 를 옮긴다. <b>2 를 넘으면 골</b>, 실점 팀이 위치 0 에서 킥오프.</li></ol>
<table class="outcome"><tr><th>카운터</th><td>공격권 교대. 상대 기준 위치 +1 (내가 −2 면 바로 실점)</td><th>전진</th><td>위치 +1</td></tr>
<tr><th>소유 상실</th><td>공격권 교대. 위치 그대로(부호만 반대)</td><th>돌파</th><td>위치 +2 (1 이상이면 골)</td></tr>
<tr><th>교착</th><td>같은 공격자. 위치 그대로</td><th></th><td></td></tr></table>
<table class="legend"><thead><tr><th></th><th colspan="2">공격 성향 (서로 반대 방향, 함께 내면 지워진다)</th><th colspan="2">수비 (방패 안의 성향을 노린다)</th></tr></thead><tbody>${legendRows}</tbody></table></div>`;
  const widget=`<div class="card ref widget"><div class="name">판정 트랙 시뮬레이터</div>
<p class="hint" style="margin-top:4px">특성 결과 네 개를 넣으면 마커가 어디로 가고, d20 의 눈마다 무엇이 나오는지 보여 준다. 마커는 ① 템포+공간 · ② 템포+조직 · ③ 조직+폭 · ④ 폭+공간. 1점 = ${VSCALE}칸. 마커는 1~19 의 서로 다른 칸에 놓이므로 다섯 결과 모두 최소 한 눈은 남는다.</p>
<div class="wctl">
<label><b style="color:${COL[0]}">템포</b><input type="number" id="w0" value="0" min="-12" max="12"></label>
<label><b style="color:${COL[3]}">조직</b><input type="number" id="w1" value="0" min="-12" max="12"></label>
<label><b style="color:${COL[1]}">폭</b><input type="number" id="w2" value="0" min="-12" max="12"></label>
<label><b style="color:${COL[2]}">공간</b><input type="number" id="w3" value="0" min="-12" max="12"></label>
<label class="chk"><input type="checkbox" id="wsafe"> 안전 (① 을 1 로)</label>
<label class="chk"><input type="checkbox" id="wcut"> 끊기 (④ 를 19 로)</label>
<label>공 위치 <select id="wpos"><option value="-2">−2 자기 PA</option><option value="-1">−1 자기 진영</option><option value="0" selected>0 중원</option><option value="1">1 상대 진영</option><option value="2">2 상대 PA</option></select></label>
<span class="presets">예: <button type="button" data-v="0,0,0,0">기본</button><button type="button" data-v="4,2,0,5">뚫림 (+4/+2/0/+5)</button><button type="button" data-v="-5,-2,0,-3">막힘 (−5/−2/0/−3)</button><button type="button" data-v="3,-2,2,-1">혼전 (+3/−2/+2/−1)</button></span>
</div>
<div class="wmove" id="wmove"></div>
<div class="wtrack" id="wtrack"></div>
<div class="wmarks" id="wmarks"></div>
<div class="wlegend" id="wlegend"></div>
<table class="wout" id="wout"></table>
</div>
<script>
(function(){
var BN=['카운터','소유 상실','교착','전진','돌파'],BC=['#c9402f','#e0803a','#8a8578','#3aa35b','#e9b62f'],S=${VSCALE},BASE=[${BASE_B.join(',')}],PAIRS=[[0,1],[1,2],[2,3],[3,0]],TN=['템포','조직','폭','공간'];
function markers(vs,safe,cut){var disp=[0,0,0,0],i,j,m;for(i=0;i<4;i++){for(j=0;j<2;j++)disp[PAIRS[i][j]]-=vs[i]*S;}
  var B=BASE.slice(),placed=[false,false,false,false],ord=[0,1,2,3].sort(function(x,y){return Math.abs(disp[y])-Math.abs(disp[x])||x-y;}),log=[];
  for(i=0;i<4;i++){m=ord[i];var lo=1+m,hi=19-(3-m);for(j=0;j<m;j++)if(placed[j])lo=Math.max(lo,B[j]+(m-j));for(j=m+1;j<4;j++)if(placed[j])hi=Math.min(hi,B[j]-(j-m));
    var want=B[m]+disp[m],target=Math.max(lo,Math.min(hi,want)),d=target-B[m],from=B[m];B[m]=target;var pushed=[];
    if(d<0){for(j=m-1;j>=0;j--)if(!placed[j]&&B[j]>B[m]-(m-j)){B[j]=B[m]-(m-j);pushed.push(j);}}else if(d>0){for(j=m+1;j<4;j++)if(!placed[j]&&B[j]<B[m]+(j-m)){B[j]=B[m]+(j-m);pushed.push(j);}}
    placed[m]=true;log.push({m:m,disp:disp[m],from:from,to:target,pushed:pushed});}
  var eff=[];if(safe&&B[0]>1){B[0]=1;eff.push('안전: ① → 1');}if(cut&&B[3]<19){B[3]=19;eff.push('끊기: ④ → 19');}
  return {B:B,log:log,eff:eff,disp:disp};}
function band(r,B){for(var i=0;i<4;i++)if(r<=B[i])return i;return 4;}
function outcome(b,p){var np;if(b===0){np=-p+1;return np>2?'실점':'상대 공격, 상대 위치 '+np;}if(b===1){np=-p;return '상대 공격, 상대 위치 '+np;}if(b===2)return '내 공격, 위치 '+p+' 그대로';if(b===3){np=p+1;return np>2?'골':'내 공격, 위치 '+np;}np=p+2;return np>2?'골':'내 공격, 위치 '+np;}
var MK=['①','②','③','④'];
function render(){var vs=[0,1,2,3].map(function(i){return parseInt(document.getElementById('w'+i).value||'0',10);});var safe=document.getElementById('wsafe').checked,cut=document.getElementById('wcut').checked,p=parseInt(document.getElementById('wpos').value,10);
  var R=markers(vs,safe,cut),B=R.B;
  var mv='';R.log.forEach(function(L){mv+='<span>'+MK[L.m]+' '+(L.disp>0?'+':'')+L.disp+'칸 ('+L.from+'→'+L.to+')'+(L.pushed.length?' · '+L.pushed.map(function(j){return MK[j];}).join('')+' 밀림':'')+'</span>';});
  R.eff.forEach(function(e){mv+='<span>'+e+'</span>';});document.getElementById('wmove').innerHTML='<b>마커 이동 (많이 움직이는 순)</b> '+mv;
  var cells='';for(var r=1;r<=20;r++){var b=band(r,B);cells+='<div class="wc" style="background:'+BC[b]+'" title="'+r+': '+BN[b]+'">'+r+'</div>';}document.getElementById('wtrack').innerHTML=cells;
  var marks='';for(var i=0;i<4;i++){marks+='<div class="wm" style="left:'+(B[i]/20*100)+'%">'+MK[i]+'<small>'+B[i]+'</small></div>';}document.getElementById('wmarks').innerHTML=marks;
  var cnt=[0,0,0,0,0];for(r=1;r<=20;r++)cnt[band(r,B)]++;
  var lg='';for(i=0;i<5;i++)lg+='<span><i style="background:'+BC[i]+'"></i>'+BN[i]+' '+(cnt[i]*5)+'%</span>';document.getElementById('wlegend').innerHTML=lg;
  var rows='<tr><th>결과</th><th>눈</th><th>공 위치 '+p+' 에서</th></tr>';for(i=0;i<5;i++){var lo=i===0?1:B[i-1]+1,hi=i===4?20:B[i];var rng=cnt[i]===0?'—':(lo===hi?String(lo):lo+'~'+hi);rows+='<tr><td><i style="background:'+BC[i]+'"></i>'+BN[i]+'</td><td>'+rng+'</td><td>'+outcome(i,p)+'</td></tr>';}document.getElementById('wout').innerHTML=rows;}
['w0','w1','w2','w3','wsafe','wcut','wpos'].forEach(function(id){document.getElementById(id).addEventListener('input',render);document.getElementById(id).addEventListener('change',render);});
Array.prototype.forEach.call(document.querySelectorAll('.presets button'),function(btn){btn.addEventListener('click',function(){var v=btn.getAttribute('data-v').split(',');for(var i=0;i<4;i++)document.getElementById('w'+i).value=v[i];render();});});
render();})();
</script>`;
  const css=`<title>패스 앤 슛 카드 v5</title>
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
table.outcome{border-collapse:collapse;margin:8px 0 2px;font-size:12.5px;width:auto;align-self:flex-start}table.outcome th{text-align:left;padding:3px 10px 3px 0;font-weight:700;white-space:nowrap}table.outcome td{padding:3px 22px 3px 0;opacity:.85}
table.legend{border-collapse:collapse;margin-top:10px;font-size:12.5px}
table.legend th{font-family:Oswald,sans-serif;font-weight:600;letter-spacing:.08em;text-align:left;padding:4px 14px 4px 0;font-size:11px;text-transform:uppercase;color:var(--muted-dark)}
table.legend tbody th{font-size:13px;text-transform:none;color:inherit}
table.legend td{padding:5px 18px 5px 0;white-space:nowrap;vertical-align:middle}
table.legend td svg{vertical-align:middle;margin-right:3px}table.legend td b{font-weight:700}table.legend td i{font-style:normal;font-family:Oswald,sans-serif;font-size:11px;letter-spacing:.05em;opacity:.7;margin-left:3px}
.ref .table-wrap{overflow-x:auto}
.widget .hint{color:var(--muted-dark)}
.wctl{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;margin:8px 0 10px;font-size:13px}
.wctl label{display:flex;align-items:center;gap:6px}.wctl input[type=number]{width:52px;padding:3px 4px;border:1px solid rgba(233,228,212,.35);border-radius:4px;background:rgba(0,0,0,.25);color:var(--chalk);font:inherit;font-variant-numeric:tabular-nums}
.wctl select{padding:3px 4px;border:1px solid rgba(233,228,212,.35);border-radius:4px;background:rgba(0,0,0,.25);color:var(--chalk);font:inherit}
.wctl .chk{gap:4px}.presets{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.presets button{font:inherit;font-size:12px;padding:3px 8px;border-radius:4px;border:1px solid rgba(233,228,212,.35);background:rgba(233,228,212,.08);color:var(--chalk);cursor:pointer}.presets button:hover{background:rgba(233,228,212,.18)}.presets button:focus-visible{outline:2px solid var(--ribbon)}
.wmove{font-size:12.5px;display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 8px;font-variant-numeric:tabular-nums}.wmove b{margin-right:4px}
.wtrack{display:grid;grid-template-columns:repeat(20,1fr);gap:2px}.wc{height:34px;display:flex;align-items:center;justify-content:center;font-family:Oswald,sans-serif;font-weight:600;font-size:13px;color:#1d2420;border-radius:3px}
.wmarks{position:relative;height:34px;margin-top:2px}.wm{position:absolute;transform:translateX(-50%);font-family:Oswald,sans-serif;font-size:14px;line-height:1;text-align:center;padding-top:4px}.wm small{display:block;font-size:10px;opacity:.7;margin-top:2px}
.wlegend{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px;margin:2px 0 8px}.wlegend i,.wout i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
table.wout{border-collapse:collapse;font-size:12.5px;align-self:flex-start}table.wout th{text-align:left;font-family:Oswald,sans-serif;font-weight:600;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted-dark);padding:2px 18px 4px 0}table.wout td{padding:3px 18px 3px 0;font-variant-numeric:tabular-nums}
@media print{body{background:#fff}.wrap{max-width:none;padding:0}.grid{grid-template-columns:repeat(3,1fr);gap:5mm;padding:6mm}.card{break-inside:avoid;box-shadow:none;border:1px solid #bbb}.card.ref{break-after:page}h1,h2,.hint,.sub,.widget{display:none}}
</style>`;
  const html=css+`<div class="wrap"><h1>패스 앤 슛 카드 v5</h1><div class="sub">Pass &amp; Shoot · Tactics deck · Attack 20 / Defence 20</div>
<p class="hint">공격 카드는 홈 유니폼(밝은 종이), 수비 카드는 원정 유니폼(어두운 종이). 특성은 색으로 읽는다: <span style="color:${COL[0]}">템포</span>, <span style="color:${COL[3]}">조직</span>, <span style="color:${COL[1]}">폭</span>, <span style="color:${COL[2]}">공간</span>. 같은 색의 두 성향은 반대 방향이라 함께 내면 서로 지워진다. 수비의 방패는 안에 새겨진 공격 성향을 노린다. 인쇄하면 A4 한 장에 9장.</p>
<h2>Reference</h2><div class="grid">${legend}</div>
<h2>Track · 판정 트랙</h2><div class="grid">${widget}</div>
<h2>Attack · 공격 20장</h2><div class="grid">${ATT.map(c=>card(c,true)).join('')}</div>
<h2>Defence · 수비 20장</h2><div class="grid">${DEF.map(c=>card(c,false)).join('')}</div></div>`;
  console.log(html.replace('__SLOT__',String(VSCALE)));process.exit(0);}

// ---------- 출력 ----------
let R=args.includes('--opt')?optimize(parseInt(process.env.ITERS||'3000',10)):args.includes('--tune')?tune():evaluate();
const gA=gradeStats(ATT,R.cardA),gD=gradeStats(DEF,R.cardD);
const iconStr=c=>Object.entries(c.icons).map(([n,v])=>n+' '+'●'.repeat(v)).join(', ');
const fxStr=c=>{const f=[];const tx=ENGINE.effectText(c.id);if(tx)f.push(tx);for(const [t,b] of Object.entries(c.bonus))f.push(TR[+t]+' 판정 '+(b>0?'+':'')+b);return f.join(', ')||'-';};
if(args.includes('--md')){const out=[];const nm=i=>ATT[i].name,nd=i=>DEF[i].name;
  for(const [side,cards,vals] of [['공격',ATT,R.cardA],['수비',DEF,R.cardD]]){out.push('### '+side+' 20장\n');out.push('| ID | 카드 | 종류 | 아이콘 | 텍스트 | 카드 value | 컨셉 |');out.push('|---|---|---|---|---|---|---|');
    cards.forEach((c,i)=>out.push('| '+c.id+' | '+c.name+' ('+c.en+') | '+(c.type==='S'?'시스템':'플레이')+' | '+iconStr(c)+' | '+fxStr(c)+' | '+vals[i].toFixed(1)+' | '+c.desc+' |'));out.push('');}
  out.push('### 검증 수치\n');out.push('| 항목 | 공격 | 수비 | 요구 |');out.push('|---|---|---|---|');
  out.push('| 카드 value 최소 / 최대 / 편차폭 | '+Math.min(...R.cardA).toFixed(1)+' / '+Math.max(...R.cardA).toFixed(1)+' / '+(Math.max(...R.cardA)-Math.min(...R.cardA)).toFixed(1)+' | '+Math.min(...R.cardD).toFixed(1)+' / '+Math.max(...R.cardD).toFixed(1)+' / '+(Math.max(...R.cardD)-Math.min(...R.cardD)).toFixed(1)+' | 편차폭 ≤ 5 |');
  out.push('| 카운터 없는 조합 수 (조합 = 시스템+플레이 96개씩. 공격: 어떤 수비에도 40 초과 / 수비: 어떤 공격에도 60 미만) | '+R.rowMin.filter(x=>x>40).length+' | '+R.colMax.filter(x=>x<60).length+' | 0 |');
  out.push('| 조합 value 최소 / 최대 | '+Math.min(...R.VA).toFixed(1)+' / '+Math.max(...R.VA).toFixed(1)+' | '+Math.min(...R.VD).toFixed(1)+' / '+Math.max(...R.VD).toFixed(1)+' | 15 ~ 85 |');
  out.push('| 무작위 플레이 '+ROUNDS+' 라운드 기대 골 | '+R.goals.toFixed(2)+' | | 2 ~ 4 |');
  out.push('| 조합 value 평균 | '+mean(R.VA).toFixed(1)+' | '+mean(R.VD).toFixed(1)+' | 차이 ≤ 6 |');
  out.push('| 조합 value 표준편차 (정보) | '+sd(R.VA).toFixed(1)+' | '+sd(R.VD).toFixed(1)+' | - |');
  out.push('| 96 조합 중 value 가 정확히 같은 조합 수 (정보) | '+dupes(R.VA,6)+' | '+dupes(R.VD,6)+' | - |');
  const allM=R.M.flat();out.push('| 매치업 9,216 평균 / 표준편차 / 최소 / 최대 | '+mean(allM).toFixed(1)+' / '+sd(allM).toFixed(1)+' / '+Math.min(...allM).toFixed(1)+' / '+Math.max(...allM).toFixed(1)+' | | |');
  out.push('| 공격 조합 하나가 수비에 따라 갈리는 폭 (행 표준편차 평균) | '+mean(R.M.map(r=>sd(r))).toFixed(1)+' | | |');out.push('');
  const top=(vals,n,f,pp)=>vals.map((v,k)=>[v,k]).sort((a,b)=>b[0]-a[0]).slice(0,n).map(([v,k])=>f(pp[k][0])+' + '+f(pp[k][1])+' ('+v.toFixed(1)+')');
  const bot=(vals,n,f,pp)=>vals.map((v,k)=>[v,k]).sort((a,b)=>a[0]-b[0]).slice(0,n).map(([v,k])=>f(pp[k][0])+' + '+f(pp[k][1])+' ('+v.toFixed(1)+')');
  out.push('### 조합 value 상·하위\n');out.push('공격 상위 8: '+top(R.VA,8,nm,pairsA).join(' · '));out.push('\n공격 하위 8: '+bot(R.VA,8,nm,pairsA).join(' · '));out.push('\n수비 상위 8: '+top(R.VD,8,nd,pairsD).join(' · '));out.push('\n수비 하위 8: '+bot(R.VD,8,nd,pairsD).join(' · '));
  const bestA=R.VA.indexOf(Math.max(...R.VA));const row=R.M[bestA];const mx=row.indexOf(Math.max(...row)),mn=row.indexOf(Math.min(...row));
  out.push('\n### 매치업 예시\n');out.push('공격 최강 조합 '+nm(pairsA[bestA][0])+' + '+nm(pairsA[bestA][1])+' 은 수비 '+nd(pairsD[mn][0])+' + '+nd(pairsD[mn][1])+' 을 만나면 '+row[mn].toFixed(1)+', '+nd(pairsD[mx][0])+' + '+nd(pairsD[mx][1])+' 을 만나면 '+row[mx].toFixed(1)+'.');
  console.log(out.join('\n'));}
else{
  console.log('공격 조합 value: 평균',mean(R.VA).toFixed(2),'표준편차',sd(R.VA).toFixed(2),'범위',Math.min(...R.VA).toFixed(1),'~',Math.max(...R.VA).toFixed(1),'중복',dupes(R.VA,6));
  console.log('수비 조합 value: 평균',mean(R.VD).toFixed(2),'표준편차',sd(R.VD).toFixed(2),'범위',Math.min(...R.VD).toFixed(1),'~',Math.max(...R.VD).toFixed(1),'중복',dupes(R.VD,6));
  console.log('매치업 행 표준편차 평균',mean(R.M.map(r=>sd(r))).toFixed(1));
  console.log('카드 value 편차폭 공격',(Math.max(...R.cardA)-Math.min(...R.cardA)).toFixed(2),'수비',(Math.max(...R.cardD)-Math.min(...R.cardD)).toFixed(2),'| 기대 골',ROUNDS,'라운드',R.goals.toFixed(2),'| 카운터 없는 조합',R.rowMin.filter(x=>x>40).length,'/',R.colMax.filter(x=>x<60).length);
  console.log('공격 카드',ATT.map((c,i)=>c.name+'='+R.cardA[i].toFixed(1)).join(' | '));
  console.log('수비 카드',DEF.map((c,i)=>c.name+'='+R.cardD[i].toFixed(1)).join(' | '));
  if(args.includes('--tune')||args.includes('--opt')){console.log('ICONS '+JSON.stringify(Object.fromEntries([...ATT,...DEF].map(c=>[c.id,[c.icons,c.bonus]]))));}
}
