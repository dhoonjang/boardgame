// 패스 앤 슛 v5 판정 엔진. 평가기(deck-v5-eval.js)와 웹 게임(play.html)이 같이 쓴다.
// 규칙: D-12(위치 트랙·다섯 결과·맞대기 −d/+a), D-14(마커 1~19 겹침 없음), D-16(혼선 없음, 기본 4/8/12/16), D-17(시스템+플레이), D-18(카드 고유 효과와 단계 순서).
(function(root,factory){if(typeof module!=='undefined'&&module.exports)module.exports=factory();else root.ENGINE=factory();})(this,function(){
const TR=['템포','폭','공간','조직'];
const AT=[['점유','전환'],['측면','중앙'],['뒷공간','발밑'],['패턴','개인']];
const DT=[['점유 저지','전환 저지'],['측면 저지','중앙 저지'],['뒷공간 저지','발밑 저지'],['패턴 저지','개인 저지']];
const BLK_KO={'점유 저지':'압박','전환 저지':'내려서기','측면 저지':'측면 봉쇄','중앙 저지':'중앙 밀집','뒷공간 저지':'딥 라인','발밑 저지':'하이 라인','패턴 저지':'대인','개인 저지':'지역 커버'};
const tIdxA={},tIdxD={};AT.forEach((p,t)=>p.forEach((n,k)=>tIdxA[n]=[t,k]));DT.forEach((p,t)=>p.forEach((n,k)=>tIdxD[n]=[t,k]));
const BANDS=['카운터','소유 상실','교착','전진','돌파'];
const BOUND=[0,3,1,2],PAIRS=[[0,1],[1,2],[2,3],[3,0]],MK=['①','②','③','④'];
const P={MINSTR:2,BASE:[4,8,12,16],VSCALE:1};

// ---- 카드 고유 효과 (D-18). 단계: icon → trait → marker → remap → move → arrive. 같은 단계에서는 수비(시스템→플레이) 먼저, 공격(시스템→플레이) 나중.
// pos 는 공격자 기준 공 위치. 수비 카드의 pos 조건도 공격자 기준으로 적는다.
const EFFECTS={
 // 공격 시스템
 A01:{text:'자기 진영(−2·−1)에서 교착은 전진으로 본다',fx:[{ph:'remap',from:2,to:3,pos:[-2,-1]}]},
 A02:{text:'상대 압박 아이콘 1개를 지운다',fx:[{ph:'icon',remove:'점유 저지'}]},
 A03:{text:'자기 진영(−2·−1)에서 전진·돌파가 +1 더 간다',fx:[{ph:'move',band:[3,4],extra:1,pos:[-2,-1]}]},
 A04:{text:'폭에서 이기면(+) 마커 ④ 를 1칸 왼쪽',fx:[{ph:'marker',m:3,shift:-1,trait:1}]},
 A07:{text:'마커 ① 을 1 로 (카운터는 눈 1 뿐)',fx:[{ph:'marker',m:0,set:1}]},
 A13:{text:'상대 진영(1·2)에서 돌파는 +3',fx:[{ph:'move',band:[4],extra:1,pos:[1,2]}]},
 A19:{text:'내 플레이 카드의 전환 아이콘 +1',fx:[{ph:'icon',addOwn:'전환',on:'P'}]},
 A20:{text:'상대 대인 아이콘 1개를 지운다',fx:[{ph:'icon',remove:'패턴 저지'}]},
 // 공격 플레이
 A05:{text:'상대 측면 봉쇄 아이콘 1개를 지운다',fx:[{ph:'icon',remove:'측면 저지'}]},
 A06:{text:'위치 1 이상에서 전진도 골',fx:[{ph:'arrive',goalOnBand:3,pos:[1,2]}]},
 A08:{text:'폭에서 이기면(+) 전진은 돌파로 본다',fx:[{ph:'remap',from:3,to:4,trait:1}]},
 A09:{text:'위치 0 에서 전진은 +2',fx:[{ph:'move',band:[3],extra:1,pos:[0]}]},
 A10:{text:'위치 2 에서 교착은 전진으로 본다 (골)',fx:[{ph:'remap',from:2,to:3,pos:[2]}]},
 A11:{text:'위치 0·1 에서 교착은 전진으로 본다',fx:[{ph:'remap',from:2,to:3,pos:[0,1]}]},
 A12:{text:'공간에서 이기면(+) 돌파는 +3',fx:[{ph:'move',band:[4],extra:1,trait:2}]},
 A14:{text:'소유 상실은 교착으로 본다',fx:[{ph:'remap',from:1,to:2}]},
 A15:{text:'카운터는 소유 상실로 본다',fx:[{ph:'remap',from:0,to:1}]},
 A16:{text:'위치 −1·0 에서 전진·돌파가 +1 더 간다',fx:[{ph:'move',band:[3,4],extra:1,pos:[-1,0]}]},
 A17:{text:'돌파는 +3',fx:[{ph:'move',band:[4],extra:1}]},
 A18:{text:'상대 지역 커버 아이콘 1개를 지운다',fx:[{ph:'icon',remove:'개인 저지'}]},
 // 수비 시스템
 D01:{text:'공격자가 자기 진영(−2·−1)에 있으면 소유 상실은 카운터로 본다',fx:[{ph:'remap',from:1,to:0,pos:[-2,-1]}]},
 D02:{text:'위치 0 에서 상대 전진은 교착으로 본다',fx:[{ph:'remap',from:3,to:2,pos:[0]}]},
 D03:{text:'위치 1 에서 상대 돌파는 전진으로 본다',fx:[{ph:'remap',from:4,to:3,pos:[1]}]},
 D06:{text:'상대 전진의 추가 이동(+)을 무효로',fx:[{ph:'move',cancelExtra:[3]}]},
 D07:{text:'상대 돌파의 추가 이동(+)을 무효로',fx:[{ph:'move',cancelExtra:[4]}]},
 D09:{text:'상대 돌파는 +3 이 된다. 대신 마커 ④ 를 1칸 오른쪽',fx:[{ph:'marker',m:3,shift:1},{ph:'move',band:[4],extra:1,forOpp:true}]},
 D13:{text:'상대 폭 결과가 + 면 1 줄인다',fx:[{ph:'trait',t:1,ifPositive:true,delta:-1}]},
 D14:{text:'위치 0 에서 상대 돌파는 전진으로 본다',fx:[{ph:'remap',from:4,to:3,pos:[0]}]},
 // 수비 플레이
 D04:{text:'위치 1 에서 상대 전진은 교착으로 본다',fx:[{ph:'remap',from:3,to:2,pos:[1]}]},
 D05:{text:'대인으로 잡으면 1 더 세게 (−d−1)',fx:[{ph:'trait',t:3,ifHitSide:0,delta:-1}]},
 D08:{text:'소유 상실은 카운터로 본다',fx:[{ph:'remap',from:1,to:0}]},
 D10:{text:'상대가 전진·돌파로 위치 2 에 도착하면 오프사이드: 소유 상실',fx:[{ph:'arrive',offside:true}]},
 D11:{text:'상대 뒷공간 아이콘 1개를 지운다',fx:[{ph:'icon',remove:'뒷공간'}]},
 D12:{text:'위치 2 에서 상대 전진은 교착으로 본다',fx:[{ph:'remap',from:3,to:2,pos:[2]}]},
 D15:{text:'측면 봉쇄로 잡으면 1 더 세게 (−d−1)',fx:[{ph:'trait',t:1,ifHitSide:0,delta:-1}]},
 D16:{text:'카운터면 상대 위치 +2',fx:[{ph:'move',counterExtra:1}]},
 D17:{text:'마커 ④ 를 19 로 (돌파는 눈 20 뿐)',fx:[{ph:'marker',m:3,set:19}]},
 D18:{text:'카운터면 상대 위치 +3',fx:[{ph:'move',counterExtra:2}]},
 D19:{text:'골이 나면 위치 2 에서 교착 (선방)',fx:[{ph:'arrive',save:true}]},
 D20:{text:'위치 2 에서 상대 교착은 소유 상실로 본다',fx:[{ph:'remap',from:2,to:1,pos:[2]}]},
};
function effectText(id){return EFFECTS[id]?EFFECTS[id].text:'';}

// ---- 한 라운드. A=[시스템,플레이] 공격 카드, D=[시스템,플레이] 수비 카드 (플레이는 null 가능 = 빈 플레이). opts:{swapA,swapD}
// 반환: {vs, why, B, mlog, eff, outcome(band,pos) → {kind, swap, np, goal, concede, notes}}
function evalRound(A,D,opts){opts=opts||{};
 const active=(cards,side)=>cards.map(c=>c?{c,side,type:c.type,fx:(EFFECTS[c.id]?EFFECTS[c.id].fx:[])}:null);
 const aE=active(A,'A'),dE=active(D,'D');const notes0=[];
 const fxOf=(list,ph)=>{const out=[];for(const e of list){if(!e)continue;for(const f of e.fx)if(f.ph===ph)out.push({...f,card:e.c,side:e.side});}return out;};
 // 1. 아이콘: 상대 아이콘 지우기, 내 플레이 아이콘 더하기
 const cnt=(cards,tIdx)=>{const c=[[0,0],[0,0],[0,0],[0,0]];for(const x of cards){if(!x)continue;for(const [n,v] of Object.entries(x.icons)){const [t,k]=tIdx[n];c[t][k]+=v;}}return c;};
 const ca=cnt(A,tIdxA),cd=cnt(D,tIdxD);const icNotes=[];
 for(const f of fxOf(aE,'icon')){if(f.remove){const [t,k]=tIdxD[f.remove];if(cd[t][k]>0){cd[t][k]--;icNotes.push(f.card.name+': 상대 '+BLK_KO[f.remove]+' −1');}}
  if(f.addOwn&&A[1]){const [t,k]=tIdxA[f.addOwn];ca[t][k]++;icNotes.push(f.card.name+': 플레이 '+f.addOwn+' +1');}}
 for(const f of fxOf(dE,'icon')){if(f.remove){const [t,k]=tIdxA[f.remove];if(ca[t][k]>0){ca[t][k]--;icNotes.push(f.card.name+': 상대 '+f.remove+' −1');}}}
 const prof=c=>c.map(([x,y])=>{const st=Math.abs(x-y);const side=st>=P.MINSTR?(x>y?0:1):-1;return {side,str:side<0?0:st,x,y};});
 const pa=prof(ca),pd=prof(cd);
 // 2. 맞대기
 const vs=[0,0,0,0],why=[];
 for(let t=0;t<4;t++){const a=pa[t],d=pd[t];let v=0,txt;const an=a.side>=0?AT[t][a.side]+' '+a.str:'없음',dn=d.side>=0?BLK_KO[DT[t][d.side]]+' '+d.str:'없음';
  if(a.side>=0&&d.side>=0){const hit=a.side===d.side;v=hit?-d.str:a.str;txt=hit?'잡힘 −'+d.str:'헛짚음 +'+a.str;}
  else if(a.side>=0){v=a.str;txt='상대 없음 +'+a.str;}else if(d.side>=0){v=-d.str;txt='내가 없음 −'+d.str;}else txt='둘 다 없음 0';
  vs[t]=v;why.push({t,an,dn,txt});}
 if(opts.vsDelta)for(let t=0;t<4;t++)vs[t]+=opts.vsDelta[t]; // 진단용
 // 2b. 맞대기 수정 (수비 효과)
 for(const f of fxOf(dE,'trait')){const t=f.t;let ok=false;if(f.ifPositive&&vs[t]>0)ok=true;if(f.ifHitSide!=null&&pa[t].side>=0&&pd[t].side===f.ifHitSide&&pa[t].side===pd[t].side)ok=true;
  if(ok){vs[t]+=f.delta;why[t].txt+=' · '+f.card.name+' '+(f.delta>0?'+':'')+f.delta;}}
 // 3. 마커 이동 (동시 밀기, 1~19 겹침 없음) → 칸 이동 효과 합산 → 고정 효과
 const disp=[0,0,0,0];for(let s=0;s<4;s++){const t=BOUND[s];for(const m of PAIRS[s])disp[m]-=vs[t]*P.VSCALE;}
 const B=P.BASE.slice(),placed=[false,false,false,false],ord=[0,1,2,3].sort((x,y)=>Math.abs(disp[y])-Math.abs(disp[x])||x-y),mlog=[];
 for(const m of ord){let lo=1+m,hi=19-(3-m);for(let j=0;j<m;j++)if(placed[j])lo=Math.max(lo,B[j]+(m-j));for(let j=m+1;j<4;j++)if(placed[j])hi=Math.min(hi,B[j]-(j-m));
  const from=B[m],target=Math.max(lo,Math.min(hi,B[m]+disp[m])),d=target-B[m];B[m]=target;const pushed=[];
  if(d<0){for(let j=m-1;j>=0;j--)if(!placed[j]&&B[j]>B[m]-(m-j)){B[j]=B[m]-(m-j);pushed.push(j);}}else if(d>0){for(let j=m+1;j<4;j++)if(!placed[j]&&B[j]<B[m]+(j-m)){B[j]=B[m]+(j-m);pushed.push(j);}}
  placed[m]=true;mlog.push(MK[m]+' '+(disp[m]>0?'+':'')+disp[m]+'칸 ('+from+'→'+target+')'+(pushed.length?' · '+pushed.map(j=>MK[j]).join('')+' 밀림':''));}
 const eff=[];let sh=[0,0,0,0];
 if(opts.swapA){sh[0]+=1;eff.push('공격 시스템 교체: ① +1');}if(opts.swapD){sh[3]-=1;eff.push('수비 시스템 교체: ④ −1');}
 for(const f of fxOf(dE,'marker').concat(fxOf(aE,'marker'))){if(f.shift!=null){if(f.trait!=null&&!(vs[f.trait]>0))continue;sh[f.m]+=f.shift;eff.push(f.card.name+': '+MK[f.m]+' '+(f.shift>0?'+':'')+f.shift);}}
 if(sh[0]){B[0]=Math.max(1,Math.min(B[1]-1,B[0]+sh[0]));}if(sh[3]){B[3]=Math.max(B[2]+1,Math.min(19,B[3]+sh[3]));}
 for(const f of fxOf(dE,'marker').concat(fxOf(aE,'marker'))){if(f.set!=null){if(f.m===0){if(B[0]!==1){B[0]=1;eff.push(f.card.name+': ① → 1');}}else if(f.m===3){if(B[3]!==19){B[3]=19;eff.push(f.card.name+': ④ → 19');}}}}
 const notes=notes0.concat(icNotes);
 // 4~6. 결과 → 이동 → 도착 (밴드와 위치가 주어졌을 때)
 function outcome(b0,p){const nt=[];let b=b0;
  for(const f of fxOf(dE,'remap').concat(fxOf(aE,'remap'))){if(b!==f.from)continue;if(f.pos&&!f.pos.includes(p))continue;if(f.trait!=null&&!(vs[f.trait]>0))continue;b=f.to;nt.push(f.card.name+': '+BANDS[f.from]+' → '+BANDS[f.to]);}
  let swap=false,np;
  if(b===0){swap=true;np=-p+1;let ce=0;for(const f of fxOf(dE,'move'))if(f.counterExtra){ce+=f.counterExtra;nt.push(f.card.name+': 상대 위치 +'+(1+f.counterExtra));}np+=ce;}
  else if(b===1){swap=true;np=-p;}
  else if(b===2)np=p;
  else{const base=b===3?1:2;let extra=0;const ex=[];
   for(const f of fxOf(aE,'move').concat(fxOf(dE,'move'))){if(f.extra==null)continue;if(!f.band.includes(b))continue;if(f.pos&&!f.pos.includes(p))continue;if(f.trait!=null&&!(vs[f.trait]>0))continue;if(f.side==='D'&&!f.forOpp)continue;extra+=f.extra;ex.push(f.card.name+': '+BANDS[b]+' +'+f.extra);}
   let cancelled=false;for(const f of fxOf(dE,'move')){if(f.cancelExtra&&f.cancelExtra.includes(b)&&extra>0){extra=0;cancelled=true;nt.push(f.card.name+': 추가 이동 무효');}}
   if(!cancelled)nt.push(...ex);np=p+base+extra;
   for(const f of fxOf(aE,'arrive')){if(f.goalOnBand===b&&f.pos.includes(p)&&np<=2){np=3;nt.push(f.card.name+': 골');}}}
  if(swap){if(np>2)return {kind:'concede',notes:nt};return {kind:'swap',swap:true,np,notes:nt};}
  if(np===2&&p<2&&b>=3){for(const f of fxOf(dE,'arrive'))if(f.offside){nt.push(f.card.name+': 오프사이드');return {kind:'swap',swap:true,np:-2,notes:nt};}}
  if(np>2){for(const f of fxOf(dE,'arrive'))if(f.save){nt.push(f.card.name+': 선방');return {kind:'saved',np:2,notes:nt};}return {kind:'goal',goal:true,notes:nt};}
  return {kind:'stay',np,notes:nt};}
 return {vs,why,pa,pd,B,mlog,eff,notes,outcome};}
function band(r,B){for(let i=0;i<4;i++)if(r<=B[i])return i;return 4;}
return {TR,AT,DT,BLK_KO,tIdxA,tIdxD,BANDS,MK,P,EFFECTS,effectText,evalRound,band};
});
