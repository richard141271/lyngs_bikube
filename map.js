const GRID_W=20;
const GRID_H=15;
class Cell{
  constructor(kind,value,fType){
    this.kind=kind;
    this.value=value;
    this.fType=fType||null; // 'yellow'|'white'|'purple'
    this.active=true;
    this.timer=0
  }
}
class MapGrid{
  constructor(w,h,cw,ch){
    this.w=w;this.h=h;this.cw=cw;this.ch=ch;
    this.cells=new Array(w*h);
    this.bgHue=95
    ;for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const n=this.noise(x*0.27,y*0.21);
        let kind=0,value=0,fType=null;
        if(n>0.62){
          kind=1;value=1+((Math.random()*5)|0);
          const r=Math.random();
          fType=r<0.5?"yellow":(r<0.8?"white":"purple");
        }
        if(n<0.18&&Math.random()<0.4){kind=2}
        this.cells[y*w+x]=new Cell(kind,value,fType)
      }
    }
  }
  setCellSize(cw,ch){this.cw=cw;this.ch=ch}
  noise(x,y){
    const s=Math.sin(x*1.7+2.3)+Math.sin(y*1.9+4.1)+Math.sin((x+y)*0.6+1.1);
    return (s/3+1)/2
  }
  idx(x,y){return y*this.w+x}
  inBounds(gx,gy){return gx>=0&&gy>=0&&gx<this.w&&gy<this.h}
  cellAtPx(px,py){
    const gx=Math.floor(px/this.cw),gy=Math.floor(py/this.ch);
    if(!this.inBounds(gx,gy))return null;
    return this.cells[this.idx(gx,gy)]
  }
  centerOf(gx,gy){return {x:gx*this.cw+this.cw/2,y:gy*this.ch+this.ch/2}}
  randomFlower(){
    const tries=50;
    for(let i=0;i<tries;i++){
      const gx=(Math.random()*this.w)|0;
      const gy=(Math.random()*this.h)|0;
      const c=this.cells[this.idx(gx,gy)];
      if(c.kind===1&&c.active)return {gx,gy,c}
    }
    return null
  }
  yields(c){
    // Map flower type to nectar/pollen yields
    const base=c.value;
    if(c.fType==="yellow") return {nectar: base*1.2, pollen: base*0.6};
    if(c.fType==="purple") return {nectar: base*0.6, pollen: base*1.2};
    return {nectar: base*0.9, pollen: base*0.9};
  }
  update(dt){
    for(const c of this.cells){
      if(c.kind===1&&!c.active){
        c.timer-=dt;
        if(c.timer<=0){c.active=true}
      }
    }
  }
  draw(ctx){
    const g=ctx.createLinearGradient(0,0,0,this.h*this.ch);
    g.addColorStop(0,"#e7f3dc");g.addColorStop(1,"#d7ebc8");
    ctx.fillStyle=g;ctx.fillRect(0,0,this.w*this.cw,this.h*this.ch);
    ctx.strokeStyle="rgba(0,0,0,0.06)";ctx.lineWidth=1;
    for(let y=0;y<this.h;y++){for(let x=0;x<this.w;x++){
      const cx=x*this.cw,cy=y*this.ch;
      const c=this.cells[this.idx(x,y)];
      if(c.kind===2){
        ctx.save();
        ctx.translate(cx+this.cw/2,cy+this.ch/2);
        ctx.fillStyle="rgba(0,0,0,0.1)";
        ctx.beginPath();ctx.ellipse(4,6,this.cw*0.22,this.ch*0.18,0,0,6.28);ctx.fill();
        ctx.fillStyle="#5a3b21";
        ctx.fillRect(-3,3,6,8);
        ctx.fillStyle="#2c6b2f";
        ctx.beginPath();ctx.arc(0,0,Math.min(this.cw,this.ch)*0.35,0,6.28);ctx.fill();
        ctx.restore()
      }
      if(c.kind===1){
        ctx.save();
        ctx.translate(cx+this.cw/2,cy+this.ch/2);
        if(c.active){
          const r=Math.min(this.cw,this.ch)*0.18;
          let col="#ffffff";
          if(c.fType==="yellow") col="#ffd24d";
          else if(c.fType==="purple") col="#b38be6";
          else col="#ffffff";
          ctx.fillStyle="rgba(0,0,0,0.08)";
          ctx.beginPath();ctx.ellipse(3,4,r*1.2,r*0.9,0,0,6.28);ctx.fill();
          ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();
          ctx.fillStyle="#2c792e";ctx.beginPath();ctx.arc(0,r*0.9,r*0.7,0,3.14);ctx.fill();
        }
        ctx.restore()
      }
    }}
    ctx.strokeStyle="rgba(0,0,0,0.08)";ctx.strokeRect(0,0,this.w*this.cw,this.h*this.ch)
  }
}
window.MapGrid=MapGrid;
window.GRID_W=GRID_W;
window.GRID_H=GRID_H;
