class Queen{
  constructor(x,y){
    this.x=x;this.y=y;this.vx=0;this.vy=0;this.wing=0
  }
  update(keys,dt,limits){
    let ax=0,ay=0;
    if(keys["a"]||keys["ArrowLeft"])ax-=1;
    if(keys["d"]||keys["ArrowRight"])ax+=1;
    if(keys["w"]||keys["ArrowUp"])ay-=1;
    if(keys["s"]||keys["ArrowDown"])ay+=1;
    const n=Math.hypot(ax,ay)||1;
    const speed=140;
    this.vx=ax/n*speed*dt;
    this.vy=ay/n*speed*dt;
    this.x=Math.max(0,Math.min(limits.w-1,this.x+this.vx));
    this.y=Math.max(0,Math.min(limits.h-1,this.y+this.vy));
    this.wing+=dt*12
  }
  draw(ctx){
    ctx.save();ctx.translate(this.x,this.y);
    ctx.fillStyle="rgba(0,0,0,0.12)";ctx.beginPath();ctx.ellipse(6,8,8,6,0,0,6.28);ctx.fill();
    ctx.fillStyle="#ffd34d";ctx.beginPath();ctx.arc(0,0,10,0,6.28);ctx.fill();
    ctx.fillStyle="#6b4a00";ctx.fillRect(-8,-2,16,4);
    ctx.fillStyle="#f2c200";ctx.beginPath();ctx.moveTo(-6,-10);ctx.lineTo(0,-15);ctx.lineTo(6,-10);ctx.fill();
    ctx.save();ctx.rotate(Math.sin(this.wing)*0.3);ctx.fillStyle="rgba(120,200,230,0.7)";ctx.beginPath();ctx.ellipse(-6,-6,6,10,0,0,6.28);ctx.fill();ctx.restore();
    ctx.save();ctx.rotate(-Math.sin(this.wing)*0.3);ctx.fillStyle="rgba(120,200,230,0.7)";ctx.beginPath();ctx.ellipse(6,-6,6,10,0,0,6.28);ctx.fill();ctx.restore();
    ctx.restore()
  }
}
class WorkerBee{
  constructor(hive,map){
    this.hive=hive;this.map=map;this.x=hive.x;this.y=hive.y;
    this.state="idle";this.target=null;this.carry=0
  }
  chooseTarget(){
    const t=this.map.randomFlower();
    if(t){this.state="toFlower";this.target=t;const c=this.map.centerOf(t.gx,t.gy);this.tx=c.x;this.ty=c.y}
  }
  stepTo(dt,tx,ty,s){
    const dx=tx-this.x,dy=ty-this.y;const d=Math.hypot(dx,dy)||1;
    const sp=s*dt;const nx=dx/d,ny=dy/d;
    if(d<sp){this.x=tx;this.y=ty;return true}
    this.x+=nx*sp;this.y+=ny*sp;return false
  }
  update(dt){
    if(this.state==="idle"){this.chooseTarget();return}
    if(this.state==="toFlower"){
      const done=this.stepTo(dt,this.tx,this.ty,60);
      if(done){
        if(this.target&&this.target.c.active){
          this.carry=this.target.c.value;
          this.target.c.active=false;
          this.target.c.timer=10;
        }else this.carry=0;
        this.state="toHive"
      }
      return
    }
    if(this.state==="toHive"){
      const done=this.stepTo(dt,this.hive.x,this.hive.y,70);
      if(done){
        this.hive.honey+=this.carry;
        this.hive.totalProduced+=this.carry;
        this.carry=0;this.state="idle"
      }
    }
  }
  draw(ctx){
    ctx.save();ctx.translate(this.x,this.y);
    ctx.fillStyle="rgba(0,0,0,0.12)";ctx.beginPath();ctx.ellipse(2,3,2.5,2,0,0,6.28);ctx.fill();
    ctx.fillStyle="#f7c84a";ctx.beginPath();ctx.arc(0,0,2.5,0,6.28);ctx.fill();
    ctx.restore()
  }
}
window.Queen=Queen;
window.WorkerBee=WorkerBee;
