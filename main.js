const canvas=document.getElementById("game");
const ctx=canvas.getContext("2d");
const btnEstablish=document.getElementById("btnEstablish");
const btnSwarm=document.getElementById("btnSwarm");
const btnRestart=document.getElementById("btnRestart");
const elActiveHives=document.getElementById("activeHives");
const elTotalHoney=document.getElementById("totalHoney");
const elScore=document.getElementById("score");
const elHighScore=document.getElementById("highScore");
const elSelBees=document.getElementById("selBees");
const elSelHoney=document.getElementById("selHoney");
const elSelLarvae=document.getElementById("selLarvae");
let seed=Math.floor(Math.random()*1e9);
function rnd(){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(Math.abs(seed)%1e6)/1e6}
const WIDTH=canvas.width;
const HEIGHT=canvas.height;
const TILE=32;
const GRID_W=Math.floor(WIDTH/TILE);
const GRID_H=Math.floor(HEIGHT/TILE);
const FLOWER_MAX=8;
const FLOWER_REGEN=0.004;
const FLOWER_DEPLETION=0.02;
const QUEEN_SPEED=2.2;
const HONEY_PER_BEE=0.02;
const LARVAE_RATE=0.01;
const LARVAE_MATURE_TIME=12;
const BEE_COST=2;
const MAINT_COST=0.004;
const SWARM_REQ_BEES=35;
const SWARM_REQ_HONEY=40;
const SWARM_SPLIT=0.45;
const HIVE_RADIUS=96;
const MAX_BEES_DRAW=36;
function clamp(v,min,max){return Math.max(min,Math.min(max,v))}
function dist(ax,ay,bx,by){const dx=ax-bx,dy=ay-by;return Math.hypot(dx,dy)}
function lerp(a,b,t){return a+(b-a)*t}
class FlowerField{
  constructor(){
    this.v=new Float32Array(GRID_W*GRID_H);
    for(let y=0;y<GRID_H;y++){
      for(let x=0;x<GRID_W;x++){
        const i=y*GRID_W+x;
        const n=this.noise(x*0.17,y*0.17);
        const base=n*0.6+0.4;
        this.v[i]=base*FLOWER_MAX;
      }
    }
  }
  idx(x,y){return y*GRID_W+x}
  noise(x,y){
    const s=Math.sin(x*2.3+3.1)+Math.sin(y*2.1+1.7)+Math.sin((x+y)*0.7+5.3);
    return clamp((s/3+1)/2,0,1)
  }
  takeAt(px,py,amount){
    const gx=clamp(Math.floor(px/TILE),0,GRID_W-1);
    const gy=clamp(Math.floor(py/TILE),0,GRID_H-1);
    const i=this.idx(gx,gy);
    const got=Math.min(this.v[i],amount);
    this.v[i]-=got;
    return got
  }
  regen(dt){
    for(let i=0;i<this.v.length;i++){
      this.v[i]=clamp(this.v[i]+FLOWER_REGEN*dt,0,FLOWER_MAX)
    }
  }
  draw(){
    for(let y=0;y<GRID_H;y++){
      for(let x=0;x<GRID_W;x++){
        const i=this.idx(x,y);
        const t=this.v[i]/FLOWER_MAX;
        const g=lerp(200,40,t);
        const r=lerp(229,180,t);
        const b=lerp(218,60,t);
        ctx.fillStyle=`rgb(${r|0},${g|0},${b|0})`;
        ctx.fillRect(x*TILE,y*TILE,TILE,TILE)
      }
    }
  }
}
class Hive{
  constructor(x,y){
    this.x=x;
    this.y=y;
    this.honey=20;
    this.bees=10;
    this.larvae=0;
    this.larvaeTimer=0;
    this.alive=true;
    this.totalProduced=0;
    this.angles=new Float32Array(MAX_BEES_DRAW);
    for(let i=0;i<MAX_BEES_DRAW;i++)this.angles[i]=rnd()*Math.PI*2
  }
  update(dt,flowers){
    if(!this.alive)return;
    let gathered=0;
    const trips=Math.min(this.bees,50);
    for(let i=0;i<trips;i++){
      const a=rnd()*Math.PI*2;
      const r=HIVE_RADIUS*rnd();
      const px=this.x+Math.cos(a)*r;
      const py=this.y+Math.sin(a)*r;
      gathered+=flowers.takeAt(px,py,FLOWER_DEPLETION*dt)
    }
    const honeyGain=gathered*HONEY_PER_BEE*10;
    this.honey+=honeyGain;
    this.totalProduced+=Math.max(0,honeyGain);
    const larvaeMake=Math.min(this.honey/BEE_COST,LARVAE_RATE*dt);
    this.honey-=larvaeMake*BEE_COST;
    this.larvae+=larvaeMake;
    this.larvaeTimer+=dt;
    while(this.larvaeTimer>=LARVAE_MATURE_TIME&&this.larvae>=1){
      this.larvae-=1;
      this.bees+=1;
      this.larvaeTimer-=LARVAE_MATURE_TIME
    }
    const maint=this.bees*MAINT_COST*dt;
    this.honey-=maint;
    if(this.honey<0){
      const bleed=Math.min(this.bees,Math.ceil((-this.honey)*0.5));
      this.bees-=bleed;
      this.honey=0
    }
    if(this.bees<=0&&this.honey<=0)this.alive=false
  }
  canSwarm(){return this.alive&&this.bees>=SWARM_REQ_BEES&&this.honey>=SWARM_REQ_HONEY}
  splitForSwarm(){
    const part=Math.floor(this.bees*SWARM_SPLIT);
    const honeyTake=this.honey*SWARM_SPLIT;
    this.bees-=part;
    this.honey-=honeyTake;
    return{bees:part,honey:honeyTake}
  }
  draw(selected){
    if(!this.alive)return;
    ctx.save();
    ctx.translate(this.x,this.y);
    const size=14;
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3;
      const px=Math.cos(a)*size;
      const py=Math.sin(a)*size;
      if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py)
    }
    ctx.closePath();
    ctx.fillStyle=selected?"#e2a500":"#d6a21d";
    ctx.strokeStyle=selected?"#775000":"#6b4a00";
    ctx.lineWidth=2;
    ctx.fill();
    ctx.stroke();
    const drawCount=clamp(Math.floor(this.bees/3),0,MAX_BEES_DRAW);
    for(let i=0;i<drawCount;i++){
      this.angles[i]+=0.03+0.02*rnd();
      const ra=20+HIVE_RADIUS*0.3+Math.sin(this.angles[i]*2+i)*6;
      const bx=Math.cos(this.angles[i])*ra;
      const by=Math.sin(this.angles[i])*ra;
      ctx.fillStyle="#272";
      ctx.beginPath();
      ctx.arc(bx,by,2,0,Math.PI*2);
      ctx.fill()
    }
    ctx.restore()
  }
}
class Queen{
  constructor(x,y){
    this.x=x;
    this.y=y;
    this.vx=0;
    this.vy=0
  }
  update(keys){
    let ax=0,ay=0;
    if(keys["ArrowLeft"]||keys["a"])ax-=1;
    if(keys["ArrowRight"]||keys["d"])ax+=1;
    if(keys["ArrowUp"]||keys["w"])ay-=1;
    if(keys["ArrowDown"]||keys["s"])ay+=1;
    const n=Math.hypot(ax,ay)||1;
    this.vx=ax/n*QUEEN_SPEED;
    this.vy=ay/n*QUEEN_SPEED;
    this.x=clamp(this.x+this.vx,0,WIDTH);
    this.y=clamp(this.y+this.vy,0,HEIGHT)
  }
  draw(){
    ctx.save();
    ctx.translate(this.x,this.y);
    ctx.fillStyle="#3b2";
    ctx.beginPath();
    ctx.arc(0,0,7,0,Math.PI*2);
    ctx.fill();
    ctx.fillStyle="#f2c200";
    ctx.beginPath();
    ctx.moveTo(-6,-6);
    ctx.lineTo(0,-11);
    ctx.lineTo(6,-6);
    ctx.fill();
    ctx.restore()
  }
}
class Game{
  constructor(){
    this.flowers=new FlowerField();
    this.hives=[];
    this.selected=-1;
    this.keys={};
    this.queen=new Queen(WIDTH*0.5,HEIGHT*0.5);
    this.totalProduced=0;
    this.highScore=parseInt(localStorage.getItem("biekoloni.highScore")||"0",10)||0;
    this.score=0;
    this.swarmPayload=null;
    this.bind();
    this.last=performance.now();
    this.loop=this.loop.bind(this);
    requestAnimationFrame(this.loop)
  }
  bind(){
    window.addEventListener("keydown",e=>{this.keys[e.key]=true});
    window.addEventListener("keyup",e=>{this.keys[e.key]=false});
    canvas.addEventListener("click",e=>{
      const r=canvas.getBoundingClientRect();
      const x=e.clientX-r.left;
      const y=e.clientY-r.top;
      let idx=-1,min=18;
      for(let i=0;i<this.hives.length;i++){
        const h=this.hives[i];
        if(!h.alive)continue;
        const d=dist(x,y,h.x,h.y);
        if(d<min){min=d;idx=i}
      }
      this.selected=idx
    });
    btnEstablish.addEventListener("click",()=>{
      if(!this.queen)return;
      const h=new Hive(this.queen.x,this.queen.y);
      if(this.swarmPayload){
        h.bees=Math.max(5,Math.floor(this.swarmPayload.bees));
        h.honey=Math.max(10,this.swarmPayload.honey);
        this.swarmPayload=null
      }
      this.hives.push(h);
      this.selected=this.hives.length-1;
      this.queen=null
    });
    btnSwarm.addEventListener("click",()=>{
      const h=this.hives[this.selected];
      if(h&&h.canSwarm()){
        const take=h.splitForSwarm();
        this.swarmPayload=take;
        this.queen=new Queen(h.x+8,h.y+8)
      }
    });
    btnRestart.addEventListener("click",()=>{this.reset()})
  }
  reset(){
    this.flowers=new FlowerField();
    this.hives=[];
    this.selected=-1;
    this.keys={};
    this.queen=new Queen(WIDTH*0.5,HEIGHT*0.5);
    this.totalProduced=0;
    this.score=0;
    this.swarmPayload=null
  }
  update(dt){
    if(this.queen)this.queen.update(this.keys);
    this.flowers.regen(dt);
    for(const h of this.hives)h.update(dt,this.flowers);
    this.totalProduced=0;
    let active=0;
    for(const h of this.hives){
      if(h.alive){
        active++;
        this.totalProduced+=h.totalProduced
      }
    }
    this.score=Math.floor(this.totalProduced+active*100);
    if(this.score>this.highScore){
      this.highScore=this.score;
      localStorage.setItem("biekoloni.highScore",String(this.highScore))
    }
    if(this.selected>=0){
      const h=this.hives[this.selected];
      if(!h||!h.alive)this.selected=-1
    }
  }
  draw(){
    this.flowers.draw();
    for(let i=0;i<this.hives.length;i++){
      this.hives[i].draw(i===this.selected)
    }
    if(this.queen)this.queen.draw()
  }
  ui(){
    const active=this.hives.filter(h=>h.alive).length;
    elActiveHives.textContent=String(active);
    elTotalHoney.textContent=String(Math.floor(this.totalProduced));
    elScore.textContent=String(this.score);
    elHighScore.textContent=String(this.highScore);
    const h=this.hives[this.selected];
    if(h){
      elSelBees.textContent=String(h.bees);
      elSelHoney.textContent=String(Math.floor(h.honey));
      elSelLarvae.textContent=String(Math.floor(h.larvae));
    }else{
      elSelBees.textContent="0";
      elSelHoney.textContent="0";
      elSelLarvae.textContent="0"
    }
    btnEstablish.disabled=!this.queen;
    btnSwarm.disabled=!(h&&h.canSwarm())
  }
  loop(t){
    const dt=Math.min(0.033,(t-this.last)/1000);
    this.last=t;
    this.update(dt*60);
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    this.draw();
    this.ui();
    requestAnimationFrame(this.loop)
  }
}
const game=new Game();
