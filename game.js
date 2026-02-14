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
const CW=canvas.width/GRID_W,CH=canvas.height/GRID_H;
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
    ctx.fillStyle="rgba(0,0,0,0.1)";ctx.beginPath();ctx.ellipse(6,8,10,8,0,0,6.28);ctx.fill();
    ctx.beginPath();
    const s=12;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;const px=Math.cos(a)*s,py=Math.sin(a)*s;i?ctx.lineTo(px,py):ctx.moveTo(px,py)}
    ctx.closePath();
    ctx.fillStyle=selected?"#e2a500":"#d6a21d";ctx.strokeStyle="#6b4a00";ctx.lineWidth=2;ctx.fill();ctx.stroke();
    // Capacity bar
    const f=Math.max(0,Math.min(1,this.honey/this.capacity));
    ctx.translate(-18,18);
    ctx.fillStyle="rgba(0,0,0,0.12)";ctx.fillRect(0,0,36,6);
    ctx.fillStyle="#f2b300";ctx.fillRect(0,0,36*f,6);
    ctx.strokeStyle="rgba(0,0,0,0.25)";ctx.strokeRect(0,0,36,6);
    ctx.restore();
    for(const b of this.workers)b.draw(ctx)
  }
}
class Game{
  constructor(){
    this.map=new MapGrid(GRID_W,GRID_H,CW,CH);
    this.keys={};
    this.touchDir={x:0,y:0};
    this.hives=[];this.selected=-1;
    this.queen=new Queen(canvas.width/2,canvas.height/2);
    this.last=performance.now();
    this.totalProduced=0;this.score=0;this.highScore=parseInt(localStorage.getItem("biekoloni.highScore")||"0",10)||0;
    this.money=parseInt(localStorage.getItem("biekoloni.money")||"0",10)||0;
    this.bind();
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop)
  }
  bind(){
    window.addEventListener("keydown",e=>{this.keys[e.key]=true});
    window.addEventListener("keyup",e=>{this.keys[e.key]=false});
    canvas.addEventListener("click",e=>{
      const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;
      let idx=-1,min=18;for(let i=0;i<this.hives.length;i++){const h=this.hives[i];const d=Math.hypot(x-h.x,y-h.y);if(d<min){min=d;idx=i}}
      this.selected=idx
    });
    // Touch/Pointer joystick
    const dead=6, maxR=60;
    const updateDir=(cx,cy)=>{
      const r=canvas.getBoundingClientRect();
      const x=cx-r.left,y=cy-r.top;
      const dx=x-this._touchStartX,dy=y-this._touchStartY;
      const d=Math.hypot(dx,dy);
      if(d<dead){this.touchDir.x=0;this.touchDir.y=0;return;}
      const k=Math.min(1,d/maxR);
      this.touchDir.x=(dx/d)*k;
      this.touchDir.y=(dy/d)*k;
    };
    canvas.addEventListener("pointerdown",(e)=>{
      this._touchStartX=e.clientX;this._touchStartY=e.clientY;
      this.touchDir.x=0;this.touchDir.y=0;
      canvas.setPointerCapture?.(e.pointerId);
    });
    canvas.addEventListener("pointermove",(e)=>{
      if(this._touchStartX!=null){updateDir(e.clientX,e.clientY)}
    });
    const endTouch=()=>{this._touchStartX=null;this._touchStartY=null;this.touchDir.x=0;this.touchDir.y=0};
    canvas.addEventListener("pointerup",endTouch);
    canvas.addEventListener("pointercancel",endTouch);
    btnEstablish.addEventListener("click",()=>{
      if(!this.queen)return;
      const gx=Math.max(0,Math.min(GRID_W-1,Math.floor(this.queen.x/CW)));
      const gy=Math.max(0,Math.min(GRID_H-1,Math.floor(this.queen.y/CH)));
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
      this.map=new MapGrid(GRID_W,GRID_H,CW,CH);
      this.hives=[];this.selected=-1;
      this.queen=new Queen(canvas.width/2,canvas.height/2);
      this.totalProduced=0;this.score=0
    })
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
    let active=0,t=0;
    for(const h of this.hives){active++;t+=h.totalProduced+h.honey}
    this.score=Math.floor(t+active*50);
    if(this.score>this.highScore){this.highScore=this.score;localStorage.setItem("biekoloni.highScore",String(this.highScore))}
  }
  draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    this.map.draw(ctx);
    for(let i=0;i<this.hives.length;i++){this.hives[i].draw(i===this.selected)}
    this.queen.draw(ctx)
  }
  ui(){
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
