const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const btnEstablish=document.getElementById("btnEstablish");
const btnSwarm=document.getElementById("btnSwarm");
const btnRestart=document.getElementById("btnRestart");
const btnSell=document.getElementById("btnSell");
const elActiveHives=document.getElementById("activeHives");
const elTotalHoney=document.getElementById("totalHoney");
const elScore=document.getElementById("score");
const elHighScore=document.getElementById("highScore");
const elMoney=document.getElementById("money");
const elSelBees=document.getElementById("selBees");
const elSelHoney=document.getElementById("selHoney");
const elSelLarvae=document.getElementById("selLarvae");
class Hive{
  constructor(x,y){
    this.x=x;this.y=y;
    this.honey=5;this.nectar=0;this.pollen=0;
    this.capacity=120;
    this.bees=3;this.life=10;
    this.totalProduced=0;this.workers=[];
  }
  update(dt,map){
    while(this.workers.length<this.bees){this.workers.push(new WorkerBee(this,map))}
    for(const b of this.workers)b.update(dt);
    const rate=0.15*dt;
    const consume=Math.min(this.nectar,rate);
    // Simple processing: nectar -> honey (1:1), boosted slightly by pollen
    const boost=1+Math.min(this.pollen/100,0.2);
    const produce=consume*boost;
    this.nectar-=consume;
    this.honey=Math.min(this.capacity,this.honey+produce);
    // Passive pollen decay used for brood, omitted in MVP
  }
  draw(selected){
    ctx.save();ctx.translate(this.x,this.y);
    ctx.fillStyle="rgba(0,0,0,0.12)";ctx.beginPath();ctx.ellipse(8,10,12,9,0,0,6.28);ctx.fill();
    const base=selected?"#e6b123":"#d9a018";
    const g=ctx.createLinearGradient(0,-18,0,18);g.addColorStop(0,base);g.addColorStop(1,"#b8830f");
    ctx.fillStyle=g;ctx.strokeStyle="#6b4a00";ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-4,18,12,0,0,6.28);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,4,16,10,0,0,6.28);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.ellipse(0,12,14,8,0,0,6.28);ctx.fill();ctx.stroke();
    ctx.fillStyle="#3b2b1a";ctx.beginPath();ctx.ellipse(0,6,4,3,0,0,6.28);ctx.fill();
    const f=Math.max(0,Math.min(1,this.honey/this.capacity));
    ctx.translate(-20,22);
    ctx.fillStyle="rgba(0,0,0,0.12)";ctx.fillRect(0,0,40,6);
    ctx.fillStyle="#f2b300";ctx.fillRect(0,0,40*f,6);
    ctx.strokeStyle="rgba(0,0,0,0.25)";ctx.strokeRect(0,0,40,6);
    ctx.restore();
    for(const b of this.workers)b.draw(ctx)
  }
}
class Game{
  constructor(){
    this.map=new MapGrid(GRID_W,GRID_H,canvas.width/GRID_W,canvas.height/GRID_H);
    this.keys={};
    this.touchDir={x:0,y:0};
    this.particles=[];
    this.hives=[];this.selected=-1;
    this.resizeCanvas();
    this.queen=new Queen(canvas.width/2,canvas.height/2);
    this.last=performance.now();
    this.totalProduced=0;this.score=0;this.highScore=parseInt(localStorage.getItem("biekoloni.highScore")||"0",10)||0;
    this.money=parseInt(localStorage.getItem("biekoloni.money")||"0",10)||0;
    this.bind();
    window.__emitParticle=(x,y,color,glow=0.8)=>{
      for(let i=0;i<1;i++){
        const a=Math.random()*Math.PI*2,m=40+Math.random()*60;
        const vx=Math.cos(a)*m,vy=Math.sin(a)*m;
        this.particles.push({x,y,vx,vy,life:0.7+Math.random()*0.6,color,glow});
      }
    };
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop)
  }
  bind(){
    window.addEventListener("resize",()=>this.resizeCanvas());
    window.addEventListener("orientationchange",()=>this.resizeCanvas());
    window.addEventListener("keydown",e=>{this.keys[e.key]=true});
    window.addEventListener("keyup",e=>{this.keys[e.key]=false});
    canvas.addEventListener("click",e=>{
      const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
      let idx=-1,min=18;for(let i=0;i<this.hives.length;i++){const h=this.hives[i];const d=Math.hypot(x-h.x,y-h.y);if(d<min){min=d;idx=i}}
      this.selected=idx
    });
    // Touch/Pointer joystick
    const dead=6, maxR=60;
    const toCanvas=(cx,cy)=>{
      const r=canvas.getBoundingClientRect();
      const sx=canvas.width/r.width, sy=canvas.height/r.height;
      return {x:(cx-r.left)*sx, y:(cy-r.top)*sy};
    };
    const updateDir=(cx,cy)=>{
      const p=toCanvas(cx,cy);
      const dx=p.x-this._touchStartX,dy=p.y-this._touchStartY;
      const d=Math.hypot(dx,dy);
      if(d<dead){this.touchDir.x=0;this.touchDir.y=0;return;}
      const k=Math.min(1,d/maxR);
      this.touchDir.x=(dx/d)*k;
      this.touchDir.y=(dy/d)*k;
    };
    canvas.addEventListener("pointerdown",(e)=>{
      e.preventDefault();
      const p=toCanvas(e.clientX,e.clientY);
      this._touchStartX=p.x;this._touchStartY=p.y;
      this.touchDir.x=0;this.touchDir.y=0;
      canvas.setPointerCapture?.(e.pointerId);
    },{passive:false});
    canvas.addEventListener("pointermove",(e)=>{
      if(this._touchStartX!=null){e.preventDefault();updateDir(e.clientX,e.clientY)}
    },{passive:false});
    const endTouch=(e)=>{e&&e.preventDefault&&e.preventDefault();this._touchStartX=null;this._touchStartY=null;this.touchDir.x=0;this.touchDir.y=0};
    canvas.addEventListener("pointerup",endTouch,{passive:false});
    canvas.addEventListener("pointercancel",endTouch,{passive:false});
    btnEstablish.addEventListener("click",()=>{
      if(!this.queen)return;
      const gx=Math.max(0,Math.min(GRID_W-1,Math.floor(this.queen.x/this.map.cw)));
      const gy=Math.max(0,Math.min(GRID_H-1,Math.floor(this.queen.y/this.map.ch)));
      const c=this.map.cells[this.map.idx(gx,gy)];
      if(c.kind!==2){
        const center=this.map.centerOf(gx,gy);
        const h=new Hive(center.x,center.y);
        this.hives.push(h);this.selected=this.hives.length-1
      }
    });
    btnSwarm.addEventListener("click",()=>{});
    btnSell.addEventListener("click",()=>{
      const h=this.hives[this.selected];
      if(!h) return;
      const amount=Math.min(25,Math.floor(h.honey));
      if(amount>0){
        h.honey-=amount;
        this.money+=amount*5; // pris 5 per honning
        localStorage.setItem("biekoloni.money",String(this.money));
      }
    });
    btnRestart.addEventListener("click",()=>{
      this.map=new MapGrid(GRID_W,GRID_H,canvas.width/GRID_W,canvas.height/GRID_H);
      this.hives=[];this.selected=-1;
      this.queen=new Queen(canvas.width/2,canvas.height/2);
      this.totalProduced=0;this.score=0
    })
  }
  resizeCanvas(){
    const ui=document.getElementById("ui");
    const padding=16;
    const availW=window.innerWidth - padding*2;
    const uiH=ui.getBoundingClientRect().height;
    const availH=window.innerHeight - uiH - padding*2;
    const ratio=GRID_W/GRID_H;
    let w=Math.min(availW, availH*ratio);
    let h=w/ratio;
    if(h>availH){h=availH;w=h*ratio}
    w=Math.max(320,Math.floor(w));
    h=Math.max(240,Math.floor(h));
    canvas.width=w;
    canvas.height=h;
    // Update cell size for rendering and logic
    this.map.setCellSize(w/GRID_W,h/GRID_H);
  }
  update(dt){
    this.queen.update(this.keys,dt,{w:canvas.width,h:canvas.height},this.touchDir);
    const c=this.map.cellAtPx(this.queen.x,this.queen.y);
    if(c&&c.kind===1&&c.active){
      const y=this.map.yields(c);
      // Queen gathers a little nectar too
      this.totalProduced+=y.nectar*0.5;
      c.active=false;c.timer=10
    }
    this.map.update(dt);
    for(const h of this.hives)h.update(dt,this.map);
    // particles
    for(let i=this.particles.length-1;i>=0;i--){
      const p=this.particles[i];
      p.life-=dt;
      if(p.life<=0){this.particles.splice(i,1);continue}
      p.vy+=12*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;
    }
    let active=0,t=0;
    for(const h of this.hives){active++;t+=h.totalProduced+h.honey}
    this.score=Math.floor(t+active*50);
    if(this.score>this.highScore){this.highScore=this.score;localStorage.setItem("biekoloni.highScore",String(this.highScore))}
  }
  draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    this.map.draw(ctx);
    for(let i=0;i<this.hives.length;i++){this.hives[i].draw(i===this.selected)}
    // particles (under queen highlight)
    ctx.save();ctx.globalCompositeOperation="lighter";
    for(const p of this.particles){
      ctx.globalAlpha=Math.max(0,p.life);
      const r=3+3*p.glow;
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*3);
      g.addColorStop(0,p.color);g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(p.x,p.y,r,0,6.28);ctx.fill();
    }
    ctx.restore();
    // queen highlight
    ctx.save();ctx.strokeStyle="rgba(255,210,70,0.8)";ctx.lineWidth=3;
    ctx.beginPath();ctx.arc(this.queen.x,this.queen.y,16+Math.sin(performance.now()/180)*2,0,6.28);ctx.stroke();
    ctx.restore();
    this.queen.draw(ctx)
  }
  ui(){
    const uiEl=document.getElementById("ui");
    elActiveHives.textContent=String(this.hives.length);
    elTotalHoney.textContent=String(Math.floor(this.totalProduced));
    elScore.textContent=String(this.score);
    elHighScore.textContent=String(this.highScore);
    const h=this.hives[this.selected];
    if(h){elSelBees.textContent=String(h.bees);elSelHoney.textContent=String(Math.floor(h.honey));elSelLarvae.textContent="0"}
    else{elSelBees.textContent="0";elSelHoney.textContent="0";elSelLarvae.textContent="0"}
    elMoney.textContent=String(this.money);
    btnEstablish.disabled=!this.queen;
    btnSell.disabled=!(h&&h.honey>=1)
    const hNow=Math.ceil(uiEl.getBoundingClientRect().height);
    if(this._lastUIH!==hNow){this._lastUIH=hNow;canvas.style.marginTop=`${hNow+8}px`;this.resizeCanvas()}
  }
  loop(t){
    const dt=Math.min(0.033,(t-this.last)/1000);this.last=t;
    this.update(dt);
    this.draw();
    this.ui();
    requestAnimationFrame(this.loop)
  }
}
window.addEventListener("load",()=>{new Game()});
