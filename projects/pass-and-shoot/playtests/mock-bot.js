// 패스 앤 슛 목업 봇 시뮬레이션.
// 사용: node playtests/mock-bot.js [판 수]            기본 선발끼리 대국, 판당 골·슛·태클 통계
//       node playtests/mock-bot.js --roles [판 수/역할]  역할 한계 가치: 무특성 11명(L0) vs 한 자리만 역할 X 인 팀. 200판/역할이면 약 15분
// 결과는 판당 골, 슛·패스·태클 횟수와 성공률. 규칙 수치는 mock.html 의 DEFAULT_CFG 를 따른다.
// 이 스크립트는 hook 이 아니라 사람이 직접 돌리는 분석 도구다 (레포 규약의 "hook 은 bash+jq" 와 무관).
const fs=require('fs');const path=require('path');const html=fs.readFileSync(path.join(__dirname,'mock.html'),'utf8');
const m=html.match(/\/\/ ==== ENGINE START[\s\S]*?\/\/ ==== ENGINE END/);const E={};
(new Function("E",m[0]+`
Object.assign(E,{DEFAULT_CFG,DEFAULT_LINEUP,ROLES,ROLE,TEAMS,CENTER,opp,dist,neighbors,inPA,isGK,newState,P,fieldPlayers,playerAt,holder,beginPlacement,placementErrors,confirmPlacement,canAct,canShootNow,tackleTarget,passTargets,canTrap,b2bAvailable,reachable,adjacentEnterable,doOpMove,doB2B,doMezzalaMove,doIFMove,startPass,startShot,startTackle,doTrap,resolveRoll,queueInfo,queueSkip,queueCell,queuePlayer,queueShoot,autoAdvance,endTurn,startSecondHalf,substitute,beginPK,pkShooters,startPK,sameCell,key,goalCells,inOwnHalf,label,passCalc,shotCalc,tackleCalc,distToGoal,resolveCalc,cornerCalc,TEAM_NAME});`))(E);
let seed=777;function rnd(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}const pick=a=>a[Math.floor(rnd()*a.length)];const d20=()=>1+Math.floor(rnd()*20);
const need=(s,calc)=>{const sum=calc.mods.reduce((a,x)=>a+x.v,0);return Math.max(1,calc.base-Math.max(-s.cfg.cap,Math.min(s.cfg.cap,sum)));};
const pWin=(s,calc)=>(21-need(s,calc))/20;
const st={games:0,goals:[],shots:0,shotOk:0,pass:0,passOk:0,tackle:0,tackleOk:0,byRole:{},shotsByDist:{},loose:0,intercept:0,rounds:0,mz:0,corners:0,cornerOk:0,fouls:0,pks:0,pkOk:0,fkShots:0};
function toward(s,p,goalTeam){const rc=E.reachable(s,p);if(!rc.length)return null;let best=null,bd=1e9;for(const c of rc){const d=E.distToGoal(goalTeam,c);const pen=E.neighbors(c).filter(n=>{const q=E.playerAt(s,n);return q&&q.team!==p.team;}).length*0.4;if(d+pen<bd){bd=d+pen;best=c;}}return best;}
function chooseOp(s){const team=s.turn.team,og=E.opp(team);const h=E.holder(s);
  // 1) 공 소유자: 슛 > 좋은 패스 > 드리블
  if(h&&h.team===team&&E.canAct(s,h)){
    if(E.canShootNow(s,h)){const c=E.shotCalc(s,h);if(pWin(s,c)>=0.3||c.d<=2)return()=>E.startShot(s,h.id);}
    if(h.role==='insideforward'){const ae=E.adjacentEnterable(s,h);const good=ae.filter(c=>E.distToGoal(og,c)<=shotRangeOf(h)&&E.distToGoal(og,c)<=4);if(good.length)return()=>E.doIFMove(s,h.id,good.sort((a,b)=>E.distToGoal(og,a)-E.distToGoal(og,b))[0]);}
    let bestPass=null,bv=-1;for(const t of E.passTargets(s,h)){const c=E.passCalc(s,h,t);const gain=E.distToGoal(og,h.pos)-E.distToGoal(og,t.pos);const v=pWin(s,c)*(1+gain*0.5)-(gain<0?0.3:0);if(v>bv){bv=v;bestPass={t,c,v};}}
    const mv=toward(s,h,og);const mvGain=mv?E.distToGoal(og,h.pos)-E.distToGoal(og,mv):-1;const threatened=E.neighbors(h.pos).some(n=>{const q=E.playerAt(s,n);return q&&q.team!==team;});
    if(h.role==='mezzala'&&bestPass&&bestPass.v>0.4){const ae=E.adjacentEnterable(s,h);if(ae.length)return()=>{st.mz++;E.doMezzalaMove(s,h.id,ae.sort((a,b)=>E.distToGoal(og,a)-E.distToGoal(og,b))[0]);};}
    if(bestPass&&(bestPass.v>0.45||(threatened&&bestPass.v>0.3))&&!(mvGain>=2&&!threatened))return()=>E.startPass(s,h.id,bestPass.t.id);
    if(mv&&mvGain>0)return()=>E.doOpMove(s,h.id,mv);
    if(bestPass&&bestPass.v>0.2)return()=>E.startPass(s,h.id,bestPass.t.id);
    if(mv)return()=>E.doOpMove(s,h.id,mv);}
  // 2) 루스볼 트래핑
  for(const p of E.fieldPlayers(s,team))if(E.canAct(s,p)&&E.canTrap(s,p))return()=>E.doTrap(s,p.id);
  // 3) 수비: 태클 가능하면 가장 좋은 태클러
  if(h&&h.team!==team){let best=null,bp=0;for(const p of E.fieldPlayers(s,team)){if(!E.canAct(s,p)||!E.tackleTarget(s,p))continue;const c=E.tackleCalc(s,p,h);const pw=pWin(s,c);if(pw>bp){bp=pw;best=p;}}if(best)return()=>E.startTackle(s,best.id);
    // 소유자에게 접근
    let bestMove=null,bd=1e9;for(const p of E.fieldPlayers(s,team)){if(!E.canAct(s,p)||E.isGK(p))continue;for(const c of E.reachable(s,p)){const d=E.dist(c,h.pos);if(d<bd){bd=d;bestMove={p,c};}}}
    if(bestMove&&bd<=2)return()=>E.doOpMove(s,bestMove.p.id,bestMove.c);}
  // 4) 공격: 전진 (공 소유 팀이면 공 없는 선수 전진)
  let cand=[];for(const p of E.fieldPlayers(s,team)){if(!E.canAct(s,p)||E.isGK(p))continue;const mv=toward(s,p,og);if(mv){const gain=E.distToGoal(og,p.pos)-E.distToGoal(og,mv);if(gain>0)cand.push({p,mv,gain,d:E.distToGoal(og,mv)});}}
  if(cand.length){cand.sort((a,b)=>(b.gain-a.gain)||(a.d-b.d));const c=cand[0];return()=>E.doOpMove(s,c.p.id,c.mv);}
  return null;}
function shotRangeOf(p){const b={GK:0,DF:3,MF:4,FW:5}[E.ROLE[p.role].pos];return p.role==='winger'?b+1:p.role==='poacher'?3:b;}
function handleQueue(s){const info=E.queueInfo(s);const it=info.it;const team=s.turn.team;
  if(info.roll){const ctx=s.queue[0].ctx,calc=s.queue[0].calc;const r=E.resolveRoll(s,d20());
    if(ctx.kind==='shot'){st.shots++;if(r.success)st.shotOk++;const k='d'+calc.d;st.shotsByDist[k]=st.shotsByDist[k]||{n:0,ok:0};st.shotsByDist[k].n++;if(r.success)st.shotsByDist[k].ok++;const role=E.P(s,ctx.pid).role;st.byRole[role]=st.byRole[role]||{shots:0,goals:0};st.byRole[role].shots++;if(r.success)st.byRole[role].goals++;}
    if(ctx.kind==='pass'||ctx.kind==='layoff'){st.pass++;if(r.success)st.passOk++;if(!r.success){if(s.ball.holder)st.intercept++;else st.loose++;}}
    if(ctx.kind==='tackle'){st.tackle++;if(r.success)st.tackleOk++;if(!r.success&&s.queue[0]&&(s.queue[0].type==='freekick'||s.queue[0].type==='pkKick'))st.fouls++;}
    if(ctx.kind==='corner'){st.corners++;if(r.success)st.cornerOk++;}if(ctx.kind==='pkInPlay'){st.pks++;if(r.success)st.pkOk++;}return;}
  const og=E.opp(info.team||team);
  if(it.type==='shadow'){E.queueCell(s,info.cells[0]);return;}
  if(it.type==='pmMove'||it.type==='false9cell'){const p=E.P(s,it.player);const goalT=E.opp(p.team);const c=info.cells.slice().sort((a,b)=>E.distToGoal(goalT,a)-E.distToGoal(goalT,b))[0];if(E.distToGoal(goalT,c)<E.distToGoal(goalT,p.pos))E.queueCell(s,c);else E.queueSkip(s);return;}
  if(it.type==='false9pick'){const f=E.P(s,it.f9);const goalT=E.opp(f.team);const ps=info.players.map(id=>E.P(s,id)).sort((a,b)=>E.distToGoal(goalT,a.pos)-E.distToGoal(goalT,b.pos));E.queuePlayer(s,ps[0].id);return;}
  if(it.type==='layoff'){const t=E.P(s,it.tm);const goalT=E.opp(t.team);let best=null,bv=0;for(const id of info.players){const q=E.P(s,id);const c=E.passCalc(s,t,q);const v=pWin(s,c)+(E.distToGoal(goalT,q.pos)<E.distToGoal(goalT,t.pos)?0.2:0);if(v>bv){bv=v;best=id;}}if(best&&bv>0.6)E.queuePlayer(s,best);else E.queueSkip(s);return;}
  if(it.type==='intercept'){E.queuePlayer(s,info.players[0]);return;}
  if(it.type==='passAfterMove'){const p=E.P(s,it.pid);const goalT=E.opp(p.team);let best=null,bv=0;for(const id of info.players){const q=E.P(s,id);const c=E.passCalc(s,p,q);const v=pWin(s,c)+(E.distToGoal(goalT,q.pos)<E.distToGoal(goalT,p.pos)?0.3:0);if(v>bv){bv=v;best=id;}}if(best&&bv>0.5)E.queuePlayer(s,best);else E.queueSkip(s);return;}
  if(it.type==='shotAfterMove'){if(info.shoot)E.queueShoot(s);else E.queueSkip(s);return;}
  if(it.type==='corner'){const goalT=E.opp(it.team);let best=null,bv=-1;for(const id of info.players){const q=E.P(s,id);const c=E.cornerCalc(s,it.team,s.ball.pos,q);const v=pWin(s,c)+(E.distToGoal(goalT,q.pos)<=2?0.3:0);if(v>bv){bv=v;best=id;}}E.queuePlayer(s,best);return;}
  if(it.type==='cornerSide'){E.queueCell(s,info.cells[0]);return;}
  if(it.type==='pkKick'){const ps=info.players.map(id=>E.P(s,id));const po=ps.find(q=>q.role==='poacher');E.queuePlayer(s,(po||ps[0]).id);return;}
  if(it.type==='freekick'){const p=E.P(s,it.pid);const goalT=E.opp(p.team);if(info.shoot){const c=E.shotCalc(s,p,{setPiece:true});if(pWin(s,c)>=0.3){st.fkShots++;E.queueShoot(s);return;}}
    let best=null,bv=0;for(const id of info.players){const q=E.P(s,id);const c=E.passCalc(s,p,q,{setPiece:true});const v=pWin(s,c)+(E.distToGoal(goalT,q.pos)<E.distToGoal(goalT,p.pos)?0.3:0);if(v>bv){bv=v;best=id;}}if(best&&bv>0.6)E.queuePlayer(s,best);else E.queueSkip(s);return;}
  if(it.type==='b2bFree'){const p=E.P(s,it.player);const goalT=E.opp(p.team);const c=info.cells.slice().sort((a,b)=>E.distToGoal(goalT,a)-E.distToGoal(goalT,b))[0];if(E.distToGoal(goalT,c)<E.distToGoal(goalT,p.pos))E.queueCell(s,c);else E.queueSkip(s);return;}
  E.queueSkip(s);}
function play(lineups,cfgOver){const s=E.newState(Object.assign({},E.DEFAULT_CFG,cfgOver||{}),lineups);E.beginPlacement(s,'A','start');E.confirmPlacement(s);let steps=0;
  while(s.phase!=='end'){if(++steps>30000)throw new Error('stuck');
    if(s.phase==='placement'){E.confirmPlacement(s);E.autoAdvance(s);continue;}
    if(s.phase==='halftime'){E.startSecondHalf(s);continue;}
    if(s.phase==='pk'){if(s.queue.length){E.resolveRoll(s,d20());continue;}E.startPK(s,pick(E.pkShooters(s)).id);continue;}
    if(s.queue.length){handleQueue(s);E.autoAdvance(s);continue;}
    // 박투박 공짜 이동: 전진
    for(const p of E.fieldPlayers(s,s.turn.team)){if(E.b2bAvailable(s,p)){const og=E.opp(p.team);const ae=E.adjacentEnterable(s,p).sort((a,b)=>E.distToGoal(og,a)-E.distToGoal(og,b));if(E.distToGoal(og,ae[0])<E.distToGoal(og,p.pos)){E.doB2B(s,p.id,ae[0]);E.autoAdvance(s);}else{s.turn.b2bUsed.push(p.id);}break;}}
    if(s.phase!=='play'||s.queue.length)continue;
    const act=chooseOp(s);if(!act){E.endTurn(s);continue;}act();E.autoAdvance(s);}
  st.games++;st.goals.push(s.score.A+s.score.B);return s;}
const args=process.argv.slice(2);
if(args[0]==='--roles'){
  const N=parseInt(args[1]||'100',10);
  const PLAIN=[['plain_gk','GK'],['plain_df1','DF'],['plain_df2','DF'],['plain_df3','DF'],['plain_df4','DF'],['plain_mf1','MF'],['plain_mf2','MF'],['plain_mf3','MF'],['plain_fw1','FW'],['plain_fw2','FW'],['plain_fw3','FW']];
  for(const [id,pos] of PLAIN){const r={id,name:'무특성 '+pos,pos,ab:pos,desc:''};E.ROLES.push(r);E.ROLE[id]=r;}
  const L0=PLAIN.map(x=>x[0]);const roles=E.ROLES.filter(r=>!r.id.startsWith('plain_'));
  let base=0,bg=0;for(let i=0;i<N;i++){const s=play({A:L0,B:L0},{pk:false});base+=s.score.A-s.score.B;bg+=s.score.A+s.score.B;}
  console.log('기준선 L0 vs L0: 선공 A - B 평균 '+(base/N).toFixed(3)+', 판당 골 '+(bg/N).toFixed(2)+' ('+N+'판)');
  const rows=[];
  for(const r of roles){const LX=L0.slice();LX[LX.findIndex(id=>E.ROLE[id].pos===r.pos)]=r.id;let diff=0,sq=0,own=0,xshots=0;
    for(let i=0;i<N;i++){const xT=i%2?'B':'A';const s=play(xT==='A'?{A:LX,B:L0}:{A:L0,B:LX},{pk:false});const d=s.score[xT]-s.score[E.opp(xT)];diff+=d;sq+=d*d;own+=s.score[xT];
      const nm=E.TEAM_NAME[xT]+' '+r.name+' ';s.log.forEach(l=>{if(l.includes(nm)&&l.includes('슛 거리')&&l.includes('시도'))xshots++;});}
    const mean=diff/N,se=Math.sqrt(Math.max(0,sq/N-mean*mean))/Math.sqrt(N);rows.push({role:r.name,pos:r.pos,mean,se,own:own/N,xshots:xshots/N});process.stderr.write(r.name+' '+mean.toFixed(3)+'\n');}
  rows.sort((a,b)=>b.mean-a.mean);
  console.log('\n| 역할 | 포지션 | 골 득실 차/판 (±SE) | 팀 골/판 | 본인 슛/판 |');console.log('|---|---|---|---|---|');
  for(const r of rows)console.log('| '+r.role+' | '+r.pos+' | '+(r.mean>=0?'+':'')+r.mean.toFixed(2)+' (±'+r.se.toFixed(2)+') | '+r.own.toFixed(2)+' | '+r.xshots.toFixed(2)+' |');
}else{
  const N=parseInt(args[0]||'200',10);let last;
  for(let i=0;i<N;i++){const lineups={A:E.DEFAULT_LINEUP.A.slice(),B:E.DEFAULT_LINEUP.B.slice()};if(i%2){const t=lineups.A;lineups.A=lineups.B;lineups.B=t;}last=play(lineups);}
  const tot=st.goals.reduce((a,b)=>a+b,0);const dist={};st.goals.forEach(g=>dist[g]=(dist[g]||0)+1);
  console.log('games',st.games,'goals/game',(tot/st.games).toFixed(2),'분포',JSON.stringify(dist));
  console.log('shots/game',(st.shots/st.games).toFixed(1),'shot%',(100*st.shotOk/st.shots).toFixed(0),'by dist',JSON.stringify(st.shotsByDist));
  console.log('pass/game',(st.pass/st.games).toFixed(1),'pass%',(100*st.passOk/st.pass).toFixed(0),'intercept',st.intercept,'loose',st.loose);
  console.log('tackle/game',(st.tackle/st.games).toFixed(1),'tackle%',(100*st.tackleOk/Math.max(1,st.tackle)).toFixed(0),'fouls/game',(st.fouls/st.games).toFixed(2),'freekick shots',st.fkShots,'PK',st.pks,'PK goals',st.pkOk);
  console.log('corners/game',(st.corners/st.games).toFixed(2),'corner%',(100*st.cornerOk/Math.max(1,st.corners)).toFixed(0));
  console.log('shots by role',JSON.stringify(st.byRole));
  console.log('--- 표본 로그 (마지막 게임 전반 R1~R4) ---');console.log(last.log.filter(l=>/전반 R[1-4] /.test(l)).join('\n'));
}
