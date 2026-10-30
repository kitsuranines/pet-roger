// ===== Roger desktop pet: full-screen transparent overlay, click-through except over Roger/ball/tools =====
const $=id=>document.getElementById(id);
window.__log=[];const log=(...a)=>{window.__log.push(a.join(' '));console.log(...a);};
const W=()=>innerWidth, H=()=>innerHeight, SZ=230;
let S={hunger:80,mood:70,energy:80,clean:80,asleep:false,walking:true,last:Date.now()};
const clamp=v=>Math.max(0,Math.min(100,v));

// ---- icons (inline SVG with black outlines, no emoji) ----
const ICON={
 hunger:'<svg viewBox="0 0 24 24"><path d="M14 3c4 0 7 3 7 7 0 3-2 5-5 6l-3 1-4 4-2-2 4-4 1-3c1-3 0-9 2-9z" fill="#e8a25a" stroke="#000" stroke-width="1.6"/><circle cx="5" cy="19" r="2.2" fill="#fff" stroke="#000" stroke-width="1.4"/></svg>',
 mood:'<svg viewBox="0 0 24 24"><path d="M12 21C4 15 2 11 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 3-2 7-10 13z" fill="#ff5c8a" stroke="#000" stroke-width="1.6"/></svg>',
 energy:'<svg viewBox="0 0 24 24"><path d="M13 2L4 14h7l-2 8 10-13h-7l1-7z" fill="#ffd23f" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/></svg>',
 clean:'<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#7fe3ff" stroke="#000" stroke-width="1.6" stroke-linejoin="round"/><circle cx="19" cy="4" r="2" fill="#7fe3ff" stroke="#000" stroke-width="1.2"/></svg>',
 sparkle:'<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" fill="#fff6a8" stroke="#000" stroke-width="1.3"/></svg>',
 heart:'<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 21C4 15 2 11 2 8a5 5 0 0 1 10-1 5 5 0 0 1 10 1c0 3-2 7-10 13z" fill="#ff5c8a" stroke="#000" stroke-width="1.5"/></svg>',
 bubble:'<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="9" fill="#bdf3ff88" stroke="#000" stroke-width="1.3"/><circle cx="9" cy="9" r="2" fill="#fff"/></svg>',
 hand:'<svg viewBox="0 0 64 64" width="64" height="64"><path d="M18 40V20a4 4 0 0 1 8 0v12V12a4 4 0 0 1 8 0v20V14a4 4 0 0 1 8 0v20-12a4 4 0 0 1 8 0v22c0 10-7 16-16 16h-2c-6 0-10-3-13-8l-7-11a4 4 0 0 1 6-5z" fill="#ffd9c2" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/></svg>',
 brush:'<svg viewBox="0 0 64 64" width="64" height="64"><rect x="8" y="10" width="40" height="18" rx="6" fill="#b5651d" stroke="#000" stroke-width="2.5"/><g stroke="#000" stroke-width="2.2">'+[12,18,24,30,36,42].map(x=>`<line x1="${x}" y1="28" x2="${x}" y2="40"/>`).join('')+'</g><rect x="46" y="14" width="14" height="10" rx="4" fill="#ff8a1e" stroke="#000" stroke-width="2.5"/></svg>'
};
document.querySelectorAll('[data-ic]').forEach(e=>e.innerHTML=ICON[e.dataset.ic]);

// ---- preload every sprite once as stacked layers; swapping = visibility toggle (no src reloads, no flashes) ----
const SPR={};let curSprite=null;
['idle_body','scruff','happy','annoyed','sleeping','eat_cheese','eat_steak','eat_candy','eat_heart'].forEach(k=>{
  const i=new Image();i.src=`sprites/${k}.webp`;i.draggable=false;i.className='layer';i.style.visibility='hidden';
  $('sprite').appendChild(i);SPR[k]=i;});
SPR.idle=SPR.idle_body;
// 3-segment tail (base > mid > tip), nested so rotations compound into a curl
{const mk=(id,src)=>{const d=document.createElement('div');d.className=id==='tail'?'layer tseg':'tseg';d.id=id;const i=new Image();i.src=src;i.draggable=false;d.appendChild(i);return d;};
 const t0=mk('tail','sprites/tail0.webp'),t1=mk('t1','sprites/tail1.webp'),t2=mk('t2','sprites/tail2.webp');
 t0.appendChild(t1);t1.appendChild(t2);t0.style.visibility='hidden';$('sprite').insertBefore(t0,SPR.idle_body);SPR.idle_tail=t0;}
{const w=document.createElement('div');w.className='layer walksheet';w.style.visibility='hidden';$('sprite').appendChild(w);SPR.walk=w;}
// ---- roger state ----
const R={hop:{st:'pause',t:0,d:.1,T:.36,h:24},falling:false,vy:0,dist:0,x:0,y:0,tx:null,ty:null,dir:-1,mode:'idle',frame:0,carry:false,pause:60};
let temp=null,tempUntil=0,eatSprite='eat_cheese',bubbleT=null,lastInteract=Date.now(),lastComplain=0,tool=null;
function groundY(){return H()-SZ;}
function say(t,ms=3800){const b=$('bubble');b.textContent=t;b.classList.add('show');clearTimeout(bubbleT);bubbleT=setTimeout(()=>b.classList.remove('show'),ms);log('say',t);}
function setTemp(s,ms=2500){temp=s;tempUntil=Date.now()+ms;}
function anim(cls){const s=$('sprite');s.classList.remove('hop','squish','wiggle','thud');void s.offsetWidth;s.classList.add(cls);setTimeout(()=>s.classList.remove(cls),cls==='hop'?1400:400);}
function particle(kind,x,y,n=3){for(let i=0;i<n;i++){const p=document.createElement('div');p.className='p';p.innerHTML=ICON[kind];p.style.left=(x+Math.random()*40-20)+'px';p.style.top=(y+Math.random()*30-15)+'px';p.style.setProperty('--dx',(Math.random()*60-30)+'px');document.body.appendChild(p);setTimeout(()=>p.remove(),1000);}}
function moving(){return R.tx!==null;}
function spriteName(){
  if(S.asleep) return 'sleeping';
  if(dragging||R.falling) return 'scruff'; // dangling by the scruff (also while falling)
  if(moving()) return 'walk';
  if(temp&&Date.now()<tempUntil) return temp==='eating'?eatSprite:temp;
  return 'idle';
}
function render(){
  const n=spriteName();
  if(n!==curSprite){for(const k in SPR)SPR[k].style.visibility=(k===n||(n==='idle'&&k==='idle_tail'))?'visible':'hidden';curSprite=n;}
  const gait=n==='walk'&&!(R.mode==='chase'||R.mode==='return');
  if(n==='walk')SPR.walk.classList.toggle('gait',gait);
  if(gait){const f=R.dir>0?-1:1,fr=Math.floor(R.dist/9)%8;SPR.walk.style.backgroundPosition=`${-fr*230}px 0`;SPR.walk.style.transform=`scaleX(${f})`;}
  else if(n==='walk'){SPR.walk.style.backgroundPosition='0 0';const H=R.hop,f=R.dir>0?-1:1;let y=0,rot=0,sx=1,sy=1;
    if(H.st==='crouch'){const k=1-H.t/H.d;sx=1+.12*k;sy=1-.14*k;}
    else if(H.st==='air'){const p=Math.min(H.t/H.T,1);y=-4*H.h*p*(1-p);const up=1-2*p;rot=-7*up;sx=1-.06*Math.abs(up);sy=1+.08*Math.abs(up);}
    else if(H.st==='land'){const k=H.t/H.d;sx=1+.14*k;sy=1-.15*k;}
    SPR.walk.style.transform=`translateY(${y.toFixed(1)}px) scaleX(${f}) rotate(${rot.toFixed(1)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`;}
  if(n==='scruff')SPR.scruff.style.transform=`rotate(${sway.a.toFixed(2)}deg)`;
  if(n==='idle'){const T=SPR.idle_tail;T.style.transform=`rotate(${wag.a[0].toFixed(2)}deg)`;T.firstChild.nextSibling.style.transform=`rotate(${wag.a[1].toFixed(2)}deg)`;T.firstChild.nextSibling.lastChild.style.transform=`rotate(${wag.a[2].toFixed(2)}deg)`;}
  const el=$('sprite');
  el.classList.toggle('dirty',S.clean<35);
  el.classList.toggle('breathe',!moving());
  $('roger').style.transform=`translate3d(${R.x.toFixed(1)}px,${R.y.toFixed(1)}px,0)`;
  const bx=Math.min(Math.max(R.x-15,4),W()-270),by=Math.max(R.y-30,4);
  const b=$('bubble');b.style.left=bx+'px';b.style.top=by+'px';b.style.transform=`translateY(-100%)`;
  $('zzz').style.left=(R.x+170)+'px';$('zzz').style.top=(R.y+90)+'px';$('zzz').style.display=S.asleep?'block':'none';
  const bars=$('bars');bars.style.left=(R.x+15)+'px';bars.style.top=Math.min(R.y+SZ+2,H()-22)+'px';
  for(const k of ['hunger','mood','energy','clean']) $('b-'+k).querySelector('i').style.width=S[k]+'%';
}
function save(){S.last=Date.now();window.api.save(S);}
function decay(mins){
  S.hunger=clamp(S.hunger-0.7*mins);S.clean=clamp(S.clean-0.4*mins);
  // sleep = fast recharge; sitting idle = slow recharge; wandering = slight drain; playing/tools = drain
  const busy=tool||R.carry||ball.on||R.mode==='chase'||R.mode==='return';
  const rate=S.asleep?6:busy?-1.5:(R.tx!=null?-0.3:2);
  S.energy=clamp(S.energy+rate*mins);
  const neglect=(S.hunger<30)+(S.clean<30)+(S.energy<20);S.mood=clamp(S.mood-(0.4+neglect*0.4)*mins);
}

// ---- mouse capture: click-through unless over Roger / ball / tool active ----
let capturing=false;
function setCapture(on){if(on!==capturing){capturing=on;window.api.capture(on);}}
function overRoger(x,y){return x>R.x+25&&x<R.x+SZ-25&&y>R.y+20&&y<R.y+SZ;}
function overBall(x,y){return ball.on&&Math.hypot(x-ball.x,y-ball.y)<30;}

// ---- tools: pet hand & brush ----
function startTool(kind){
  endTool(true);R.tx=null;R.ty=null;tool={kind,acc:0,strokes:0,lastX:null,lastY:null,lastMove:Date.now()};
  $('tool').innerHTML=ICON[kind==='pet'?'hand':'brush'];$('tool').style.display='block';
  document.body.classList.add('capture');setCapture(true);
  $('hint').textContent=kind==='pet'?'Stroke Roger\'s head with the hand. Right-click or Esc to stop.':'Brush Roger\'s fur. Right-click or Esc to stop.';$('hint').style.display='block';
  say(pick(kind==='pet'?LINES.petStart:LINES.cleanStart));
}
function endTool(silent){if(!tool)return;const k=tool.kind,st=tool.strokes;tool=null;$('tool').style.display='none';$('hint').style.display='none';document.body.classList.remove('capture');setCapture(false);
  if(!silent&&st>0)say(pick(k==='pet'?LINES.petDone:LINES.cleanDone));save();}
function toolMove(x,y){
  $('tool').style.left=x+'px';$('tool').style.top=y+'px';
  if(tool.lastX!==null){
    const d=Math.hypot(x-tool.lastX,y-tool.lastY);tool.lastMove=Date.now();
    const zone=tool.kind==='pet'?(x>R.x+40&&x<R.x+SZ-40&&y>R.y+20&&y<R.y+SZ*0.5):overRoger(x,y);
    if(zone){tool.acc+=d;
      if(tool.acc>140){tool.acc=0;tool.strokes++;lastInteract=Date.now();
        if(tool.kind==='pet'){S.mood=clamp(S.mood+4);particle('heart',x,y-20,2);anim('squish');setTemp('happy',1500);}
        else{S.clean=clamp(S.clean+6);S.mood=clamp(S.mood+1);particle('sparkle',x,y,3);particle('bubble',x,y,1);anim('wiggle');setTemp(tool.strokes%3?'happy':'annoyed',1200);}
        if(tool.strokes%4===1)say(pick(tool.kind==='pet'?LINES.pet:LINES.clean),2500);
        if(tool.kind==='clean'&&S.clean>=100){S.clean=100;endTool();}
      }}
  }
  tool.lastX=x;tool.lastY=y;
}

// ---- ball ----
const ball={touched:0,on:false,x:0,y:0,vx:0,vy:0,held:false,hist:[],throwX:0,throwY:0,owner:false};
function stopPlay(){ // Play OFF: ball gone; if he's up in the air he drops to the floor (same fall + landing as a scruff release)
  ball.on=false;ball.held=false;ball.owner=false;const b=$('ball');b.style.opacity=0;setTimeout(()=>{if(!ball.on)b.style.display='none';},600);
  const wasCarry=R.carry;R.carry=false;if(R.mode==='chase'||R.mode==='hold'||R.mode==='return'){R.tx=null;R.ty=null;R.mode='idle';}
  if(R.y<groundY()-1&&!dragging){R.falling=true;R.vy=0;}R.pause=150+Math.random()*250;log('play off',wasCarry);save();}
function startPlay(){
  if(S.energy<15){say(pick(LINES.tired));setTemp('annoyed',2500);anim('wiggle');return;}
  ball.on=true;ball.touched=Date.now();$('ball').style.opacity=1;ball.held=false;ball.owner=false;R.carry=false;ball.x=R.x+SZ/2;ball.y=R.y-40;ball.vx=0;ball.vy=0;
  $('ball').style.display='block';say(pick(LINES.playStart));setTemp('happy',2000);anim('hop');
}
function stepBall(dt){
  if(!ball.on)return;
  if(R.carry){ball.x=R.x+SZ*0.4;ball.y=R.y+SZ*0.56;} // held in his mouth (front-facing sit pose)
  else if(!ball.held){
    ball.vy+=1500*dt;ball.x+=ball.vx*dt;ball.y+=ball.vy*dt;const r=22;
    if(ball.x<r){ball.x=r;ball.vx=-ball.vx*.8;} if(ball.x>W()-r){ball.x=W()-r;ball.vx=-ball.vx*.8;}
    if(ball.y<r){ball.y=r;ball.vy=-ball.vy*.8;}
    if(ball.y>H()-r){ball.y=H()-r;ball.vy=-ball.vy*.65;ball.vx*=.92;if(Math.abs(ball.vy)<60)ball.vy=0;}
    // chase it anywhere on screen once thrown
    if(ball.owner&&!S.asleep){R.tx=ball.x-SZ/2;R.ty=Math.min(ball.y-SZ*0.6,groundY());R.mode='chase';
      if(Math.random()<.01)say(pick(LINES.chase),1500);
      if(Math.hypot(ball.x-(R.x+SZ/2),ball.y-(R.y+SZ*0.55))<90){ // pounce & catch
        ball.owner=false;anim('hop');say(pick(LINES.catch));S.mood=clamp(S.mood+15);S.energy=clamp(S.energy-8);S.hunger=clamp(S.hunger-4);S.clean=clamp(S.clean-4);
        // stay put where caught: drop the ball at his feet (it falls to the floor if caught midair); 5s fade timer starts now
        // hold it in his mouth and hover exactly where caught (even mid-air) until the 5s fade
        R.carry=true;ball.vx=0;ball.vy=0;ball.touched=Date.now();setTemp('happy',2000);
        R.hop.st='pause';R.hop.t=.1;R.tx=null;R.ty=null;R.mode='hold';
        R.pause=200+Math.random()*300;lastInteract=Date.now();log('caught',Math.round(R.x));save();}
    }
  }
  $('ball').style.transform=`translate(${ball.x-22}px,${ball.y-22}px) rotate(${ball.x*2}deg)`;
}

// ---- actions from right-click menu ----
function act(a){
  log('action',a);lastInteract=Date.now();if(tool&&!['stats','walk','sit','wander'].includes(a))endTool(true);
  if(S.asleep&&!['sleep','stats','walk','sit','wander'].includes(a)){S.asleep=false;S.mood=clamp(S.mood-10);say(pick(LINES.wake));setTemp('annoyed');save();return render();}
  const [verb,arg]=a.split(':');
  if(verb==='feed'){
    if(S.hunger>92){say(pick(LINES.full));setTemp('annoyed');anim('wiggle');return render();}
    const v={cheese:[25,8],steak:[40,15],candy:[15,-3],heart:[35,15]}[arg]||[20,5];
    S.hunger=clamp(S.hunger+v[0]);S.mood=clamp(S.mood+v[1]);S.clean=clamp(S.clean-5);
    eatSprite='eat_'+arg;R.tx=null;say(pick(LINES.feed[arg]));setTemp('eating',2600);setTimeout(()=>setTemp(v[1]<0?'annoyed':'happy',2000),2600);
  } else if(verb==='pet') startTool('pet');
  else if(verb==='play'){if(ball.on)stopPlay();else startPlay();}
  else if(verb==='clean') startTool('clean');
  else if(verb==='sleep'){S.asleep=!S.asleep;R.tx=null;if(S.asleep){R.ty=null;R.y=groundY();}say(pick(S.asleep?LINES.sleep:LINES.wake));if(!S.asleep)setTemp('annoyed');}
  else if(verb==='sit'||verb==='wander'||verb==='walk'){S.walking=verb==='walk'?!S.walking:verb==='wander';if(!S.walking&&R.mode==='wander'){R.tx=null;R.ty=null;}say(S.walking?"Fine, I'll stretch my legs.":"I'm staying RIGHT here.");}
  else if(verb==='stats'){$('bars').classList.toggle('show');say(`Hunger ${S.hunger|0} / Mood ${S.mood|0} / Energy ${S.energy|0} / Clean ${S.clean|0}`,5000);}
  save();render();
}
window.api.onAction(act);

// ---- lazy, judgemental tail wag (idle pose only) ----
const wag={a:[0,0,0],t:0,until:0,next:performance.now()+2000,flick:false};
// lazy swish: slow eased sine, mid/tip lag behind base so the tail curls; sometimes a single sharp flick
function stepWag(now){
  if(now>wag.next&&now>wag.until){wag.flick=Math.random()<0.3;wag.t=now;
    wag.until=now+(wag.flick?700:(2+Math.floor(Math.random()*2))*1700);wag.next=wag.until+2500+Math.random()*6000;}
  let tgt=[0,0,0];
  if(now<wag.until){const el=now-wag.t,left=wag.until-now;
    if(wag.flick){const p=el/700*Math.PI,s=Math.sin(p);tgt=[-2*s,-5*Math.sin(p-.35),-10*Math.sin(Math.max(0,p-.6))];}
    else{const env=Math.min(1,el/700,left/900),p=el/1700*Math.PI*2;
      tgt=[3*Math.sin(p)*env,5*Math.sin(p-.9)*env,8*Math.sin(p-1.8)*env];}}
  for(let i=0;i<3;i++)wag.a[i]+=(tgt[i]-wag.a[i])*(now<wag.until?0.35:0.06);
}
// ---- scruff pendulum: hangs from the cursor, swings opposite to hand acceleration ----
const SCRUFF={x:SZ*0.5,y:SZ*0.016};
const sway={a:0,v:0,hvx:0,px:null,pt:0};
function stepSway(dt){
  let acc=0;
  if(dragging){const now=performance.now();if(sway.px!==null){const t=Math.max((now-sway.pt)/1000,1/240);const vx=(R.x-sway.px)/t;acc=(vx-sway.hvx)/Math.max(dt,1/240);sway.hvx+=(vx-sway.hvx)*0.5;}sway.px=R.x;sway.pt=now;}
  else{sway.px=null;sway.hvx=0;}
  // theta'' = -(g/L) theta - damping*theta' - a_hand/L   (degrees)
  sway.v+=(-38*sway.a-(dragging?6:4)*sway.v-acc*0.012)*dt;sway.a+=sway.v*dt;
  sway.a=Math.max(-12,Math.min(12,sway.a));
}
// ---- main loop ----
let last=performance.now(),frameT=0;
function loop(now){
  const dt=Math.min((now-last)/1000,0.05);last=now;
  stepBall(dt);stepWag(now);stepSway(dt);
  // gravity after a scruff-drop: accelerate down to the bottom of the work area, then thud
  if(R.falling&&!dragging){R.vy=Math.min(R.vy+2600*dt,3000);R.y+=R.vy*dt;
    if(R.y>=groundY()){R.y=groundY();R.falling=false;const hard=R.vy>900;R.vy=0;anim('thud');
      say(pick(hard?LINES.landHard:LINES.land),2800);setTemp('annoyed',1500);R.pause=90;log('landed',hard);}}
  // wandering along the ground
  if(!S.asleep&&!dragging&&!R.falling&&R.tx===null&&!(temp&&Date.now()<tempUntil)&&!tool){
    if(R.carry){} // holding the ball: stay put
    else if(R.y<groundY()-1){R.falling=true;R.vy=0;} // off the floor: drop back down (same fall + landing as a scruff release)
    else if(S.walking&&--R.pause<0){R.tx=Math.random()*(W()-SZ);R.ty=groundY();R.mode='wander';}
  }
  if(R.tx!==null&&!dragging&&!R.falling){
    const sp=R.mode==='chase'?420:R.mode==='return'?260:90;
    const dx=R.tx-R.x,dy=(R.ty??R.y)-R.y,d=Math.hypot(dx,dy);
    if(Math.abs(dx)>2)R.dir=dx>0?1:-1;
    if(d<2){R.x=R.tx;R.y=R.ty??R.y;R.hop.st='pause';R.hop.t=.1;
      if(R.mode==='return'&&R.carry){R.carry=false;ball.touched=Date.now();ball.vx=0;ball.vy=0;say("There. Fetch is beneath me, by the way.",2500);setTemp('happy',2000);}
      if(R.mode!=='chase'){const wasHome=R.mode==='home';R.tx=null;R.ty=null;R.mode='idle';if(!wasHome)R.pause=120+Math.random()*400;}
    } else {
      if(!(R.mode==='chase'||R.mode==='return')){const st=Math.min(sp*dt,d);R.x+=dx/d*st;R.y+=dy/d*st;R.dist+=st;} // walk cycle: frame = distance/9px (~10fps at 90px/s)
      else {
      // hopping locomotion: crouch -> airborne arc (moves only in the air) -> land squash -> short pause
      const H=R.hop,chase=R.mode==='chase'||R.mode==='return';
      if(H.st==='pause'){H.t-=dt;if(H.t<=0){H.st='crouch';H.d=H.t=chase?.06:.09;}}
      else if(H.st==='crouch'){H.t-=dt;if(H.t<=0){const big=Math.random()<(chase?.3:.15);H.st='air';H.t=0;H.T=chase?(big?.42:.32):(big?.5:.36);H.h=chase?(big?48:34):(big?40:24);}}
      else if(H.st==='air'){H.t+=dt;const v=sp*(chase?1.4:2.2);const st=Math.min(v*dt,d);R.x+=dx/d*st;R.y+=dy/d*st;R.dist+=st;if(H.t>=H.T){H.st='land';H.d=H.t=.12;}}
      else if(H.st==='land'){H.t-=dt;if(H.t<=0){H.st='pause';H.t=chase?.05+Math.random()*.08:.15+Math.random()*.25;}}
      }
    }
    frameT+=dt;const fps=R.mode==='chase'?14:8;if(frameT>1/fps){frameT=0;R.frame++;}
  }
  if(!dragging)R.x=Math.max(-20,Math.min(R.x,W()-SZ+20));R.y=Math.max(dragging?-SZ:-20,Math.min(R.y,groundY()));if(dragging)R.x=Math.max(-SZ/2,Math.min(R.x,W()-SZ/2));
  render();requestAnimationFrame(loop);
}

// ---- input ----
let dragging=false,moved=0,lx=0,ly=0;
window.addEventListener('mousemove',e=>{
  const x=e.clientX,y=e.clientY;
  if(tool){toolMove(x,y);return;}
  if(ball.held){ball.x=x;ball.y=y;ball.hist.push([x,y,performance.now()]);if(ball.hist.length>6)ball.hist.shift();return;}
  if(dragging){R.x=x-SCRUFF.x;R.y=y-SCRUFF.y;moved+=Math.abs(x-lx)+Math.abs(y-ly);lx=x;ly=y;if(moved>40&&moved<60)say(pick(LINES.drag),2000);return;}
  setCapture(overRoger(x,y)||overBall(x,y));
});
window.addEventListener('mousedown',e=>{
  const x=e.clientX,y=e.clientY;
  if(e.button===2){if(tool){endTool();e.preventDefault();}return;}
  if(tool)return;
  if(overBall(x,y)){ball.touched=Date.now();ball.held=true;R.carry=false;ball.owner=false;R.tx=null;ball.hist=[[x,y,performance.now()]];setCapture(true);return;}
  if(overRoger(x,y)){dragging=true;moved=0;lx=x;ly=y;R.x=x-SCRUFF.x;R.y=y-SCRUFF.y;sway.v+=(x-(R.x+SZ/2))*0.1;R.tx=null;R.ty=null;R.carry=false;R.falling=false;R.vy=0;setCapture(true);}
});
window.addEventListener('mouseup',e=>{
  if(ball.held){ball.held=false;const h=ball.hist,a=h[0],b=h[h.length-1],t=Math.max((b[2]-a[2])/1000,0.016);
    ball.vx=(b[0]-a[0])/t;ball.vy=(b[1]-a[1])/t;const sp=Math.hypot(ball.vx,ball.vy);if(sp>2600){ball.vx*=2600/sp;ball.vy*=2600/sp;}
    if(Math.hypot(ball.vx,ball.vy)<200){ball.vx=(Math.random()<.5?-1:1)*(600+Math.random()*500);ball.vy=-900;} // simple click = toss
    ball.touched=Date.now();ball.throwX=e.clientX;ball.throwY=e.clientY;ball.owner=true;log('throw',ball.vx|0,ball.vy|0);return;}
  if(dragging&&moved<5){say(pick(LINES.click),2500);}
  if(dragging&&R.y<groundY()-1&&!S.asleep){R.falling=true;R.vy=0;log('drop',R.y|0);}
  else if(dragging&&R.y<groundY()-1){R.falling=true;R.vy=0;}
  dragging=false;
});
window.addEventListener('dblclick',e=>{if(!tool&&overRoger(e.clientX,e.clientY)){S.mood=clamp(S.mood+5);particle('heart',R.x+SZ/2,R.y+40,3);anim('squish');say(pick(LINES.pet),2500);}});
window.addEventListener('contextmenu',e=>{e.preventDefault();if(!tool)window.api.menu(S.walking,ball.on);});
window.addEventListener('keydown',e=>{if(e.key==='Escape'){endTool();}});
// double right-click-free way to put the ball away: it vanishes after 2 min idle
// ball fades away after 5s untouched (never mid-chase / while carried / while held)
// (no auto-vanish: the ball stays out until Play is toggled off)
// tool auto-exit after 15s of no movement
setInterval(()=>{if(tool&&Date.now()-tool.lastMove>15000)endTool();},1000);

// ---- stat tick & complaints ----
setInterval(()=>{decay(1/60);const now=Date.now();
  if(!S.asleep&&now-lastComplain>45000&&!tool){let l=null;
    if(S.hunger<25)l=LINES.hungry;else if(S.clean<25)l=LINES.dirty;else if(S.energy<15)l=LINES.sleepy;else if(S.mood<25)l=LINES.sad;
    else if(now-lastInteract>90000&&Math.random()<.5)l=LINES.idle;
    if(l){say(pick(l));lastComplain=now;if(l!==LINES.idle)setTemp('annoyed',3000);}}
  if(S.energy<=0&&!S.asleep){S.asleep=true;R.tx=null;R.y=groundY();say("I'm passing out. Your fault.");}
  if(S.asleep&&S.energy>=100){S.asleep=false;say("Fully recharged. Fear me.");}
},1000);
setInterval(save,15000);

window.api.load().then(d=>{
  if(d){S=Object.assign(S,d);const mins=Math.min((Date.now()-S.last)/60000,60*24);decay(mins);
    if(mins>240)say("You left me for "+Math.round(mins/60)+" hours. I've written a strongly worded diary entry.",6000);else say(pick(LINES.hello));}
  else say("I'm Roger. Fox. Demon. Your superior. Right-click me, peasant.",6000);
  R.x=W()-SZ-60;R.y=groundY();save();render();requestAnimationFrame(loop);
});
