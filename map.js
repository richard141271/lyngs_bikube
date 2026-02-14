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
    const W=this.w*this.cw,H=this.h*this.ch;
    // sky + sol
    const g=ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,"#ffeaa7");g.addColorStop(0.35,"#f7f3df");g.addColorStop(1,"#d7ebc8");
    ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.globalAlpha=0.35;
    const sunX=W*0.12,sunY=H*0.18, sunR=Math.min(W,H)*0.12;
    const sg=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,sunR*2);
    sg.addColorStop(0,"rgba(255,230,120,1)");
    sg.addColorStop(1,"rgba(255,230,120,0)");
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sunX,sunY,sunR*2.2,0,6.28);ctx.fill();
    ctx.globalAlpha=1;ctx.restore();
    // enkle skyer
    const drawCloud=(x,y,s)=>{
      ctx.fillStyle="rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(x,y,s,0,6.28);
      ctx.arc(x+s*0.8,y-s*0.2,s*0.8,0,6.28);
      ctx.arc(x-s*0.8,y-s*0.2,s*0.9,0,6.28);
      ctx.fill();
    };
    drawCloud(W*0.35,H*0.15,18);
    drawCloud(W*0.6,H*0.12,22);
    drawCloud(W*0.8,H*0.18,16);
    ctx.strokeStyle="rgba(0,0,0,0.05)";ctx.lineWidth=1;
    for(let y=0;y<this.h;y++){for(let x=0;x<this.w;x++){
      const cx=x*this.cw,cy=y*this.ch;
      const c=this.cells[this.idx(x,y)];
      if(c.kind===2){
        ctx.save();
        ctx.translate(cx+this.cw/2,cy+this.ch/2);
        ctx.fillStyle="rgba(0,0,0,0.1)";ctx.beginPath();ctx.ellipse(4,6,this.cw*0.22,this.ch*0.18,0,0,6.28);ctx.fill();
        const tg=ctx.createLinearGradient(-6,-8,6,8);tg.addColorStop(0,"#6a4b2a");tg.addColorStop(1,"#523a1f");
        ctx.fillStyle=tg;ctx.beginPath();ctx.arc(0,2,Math.min(this.cw,this.ch)*0.32,0,6.28);ctx.fill();
        ctx.fillStyle="#2c6b2f";ctx.beginPath();ctx.arc(0,-2,Math.min(this.cw,this.ch)*0.24,0,6.28);ctx.fill();
        ctx.restore()
      }
      if(c.kind===1){
        ctx.save();
        ctx.translate(cx+this.cw/2,cy+this.ch/2);
        if(c.active){
          const r=Math.min(this.cw,this.ch)*0.18;
          if(c.fType==="yellow"){
            ctx.fillStyle="rgba(0,0,0,0.08)";ctx.beginPath();ctx.ellipse(3,4,r*1.2,r*0.9,0,0,6.28);ctx.fill();
            for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.fillStyle="#ffffff";ctx.beginPath();ctx.ellipse(Math.cos(a)*r*0.8,Math.sin(a)*r*0.8,r*0.65,r*0.35,a,0,6.28);ctx.fill();}
            ctx.fillStyle="#ffd24d";ctx.beginPath();ctx.arc(0,0,r*0.72,0,6.28);ctx.fill();
            ctx.fillStyle="#2c792e";ctx.fillRect(-1,r*0.6,2,r*0.9);
          }else if(c.fType==="purple"){
            ctx.fillStyle="rgba(0,0,0,0.06)";ctx.beginPath();ctx.ellipse(2,5,r*1.1,r*0.8,0,0,6.28);ctx.fill();
            ctx.strokeStyle="#6a3ea1";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,r*1.1);ctx.lineTo(0,-r*0.6);ctx.stroke();
            ctx.fillStyle="#b38be6";for(let i=0;i<5;i++){ctx.beginPath();ctx.arc((Math.random()*2-1)*r*0.6,-i*r*0.25, r*0.22,0,6.28);ctx.fill();}
          }else{
            ctx.fillStyle="rgba(0,0,0,0.07)";ctx.beginPath();ctx.ellipse(3,4,r*1.2,r*0.9,0,0,6.28);ctx.fill();
            ctx.fillStyle="#fefefe";for(let i=0;i<5;i++){const a=i*2*Math.PI/5;ctx.beginPath();ctx.ellipse(Math.cos(a)*r*0.75,Math.sin(a)*r*0.75,r*0.6,r*0.35,a,0,6.28);ctx.fill();}
            ctx.fillStyle="#ffd85e";ctx.beginPath();ctx.arc(0,0,r*0.6,0,6.28);ctx.fill();
            ctx.fillStyle="#2c792e";ctx.fillRect(-1,r*0.6,2,r*0.9);
          }
        }
        ctx.restore()
      }
    }}
    const vw=this.w*this.cw,vh=this.h*this.ch;
    const vg=ctx.createRadialGradient(vw/2,vh*0.6,Math.min(vw,vh)*0.2,vw/2,vh*0.6,Math.max(vw,vh)*0.8);
    vg.addColorStop(0,"rgba(0,0,0,0)");
    vg.addColorStop(1,"rgba(0,0,0,0.08)");
    ctx.fillStyle=vg;ctx.fillRect(0,0,vw,vh);
    ctx.strokeStyle="rgba(0,0,0,0.08)";ctx.strokeRect(0,0,vw,vh)
  }
}
window.MapGrid=MapGrid;
window.GRID_W=GRID_W;
window.GRID_H=GRID_H;
