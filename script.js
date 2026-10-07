const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.getElementById('year').textContent = new Date().getFullYear();
document.querySelectorAll('.project-grid, .skill-grid, .about-grid').forEach(group => {
 Array.from(group.children).forEach((child,index) => child.style.setProperty('--reveal-delay',Math.min(index,3)*65+'ms'));
});
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)document.documentElement.classList.remove('js-motion');});
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js-motion');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.06 });
  document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
}
const belt = document.querySelector('.skills-belt');
const beltToggle = document.querySelector('.belt-toggle');
beltToggle.addEventListener('click', () => {
 const paused = belt.classList.toggle('is-paused');
 beltToggle.setAttribute('aria-pressed', String(paused));
 beltToggle.setAttribute('aria-label', paused ? 'Resume skills animation' : 'Pause skills animation');
 beltToggle.firstElementChild.textContent = paused ? '▷' : 'Ⅱ';
});
// A layered wave lattice: geometry assembles, flows, and resolves continuously.
const canvas = document.getElementById('flow-field');
const ctx = canvas.getContext('2d');
if (ctx) {
 let width=0,height=0,time=0,frame=0,visible=true,last=0;
 let pointerX=0,pointerY=0,targetX=0,targetY=0,latticeGradient;
 function resize(){
  const r=canvas.getBoundingClientRect();width=r.width;height=r.height;if(!width||!height)return;
  const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
  latticeGradient=ctx.createLinearGradient(width*.1,0,width*.9,height);
  latticeGradient.addColorStop(0,'rgba(162,128,255,.08)');latticeGradient.addColorStop(.5,'rgba(190,158,255,.85)');latticeGradient.addColorStop(1,'rgba(162,128,255,.08)');
  draw();
 }
 canvas.addEventListener('pointermove',event=>{
  if(event.pointerType==='touch'||reducedMotion.matches)return;
  const r=canvas.getBoundingClientRect();
  targetX=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1));targetY=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));
 });
 canvas.addEventListener('pointerleave',()=>{targetX=targetY=0;});
 function point(u,v){
  const wave=Math.sin(u*5.4+time*.55+v*1.8)*.095+Math.cos(v*4.2-time*.38+u*1.6)*.075;
  return{x:width*(.5+u*.33+v*.17+pointerX*.025),y:height*(.5+v*.2-u*.12-wave+pointerY*.025)};
 }
 function draw(){
  if(!width||!height)return;
  ctx.clearRect(0,0,width,height);
  // Faint registration grid grounds the more fluid central form.
  ctx.fillStyle='#a280ff20';
  for(let x=24;x<width;x+=24)for(let y=64;y<height-64;y+=24)ctx.fillRect(x,y,1,1);
  const rows=width<420?18:24,columns=width<420?16:24,samples=width<420?40:60;
  for(let row=0;row<=rows;row++){
   const v=-1+row*2/rows;ctx.beginPath();
   for(let col=0;col<=samples;col++){const p=point(-1+col*2/samples,v);col?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   ctx.strokeStyle=latticeGradient;ctx.globalAlpha=.45+.45*Math.sin(row/rows*Math.PI);ctx.lineWidth=row%6===0?1.3:.7;ctx.stroke();
  }
  ctx.globalAlpha=1;
  for(let col=0;col<=columns;col++){
   ctx.beginPath();for(let row=0;row<=samples;row++){const p=point(-1+col*2/columns,-1+row*2/samples);row?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   ctx.strokeStyle='#a280ff35';ctx.lineWidth=.65;ctx.stroke();
  }
  // Small lime pulses travel along the same paths as the lattice.
  for(let n=0;n<6;n++){
   const u=((time*.13+n*.34)%2)-1,v=Math.sin(n*5.1)*.85;
   for(let tail=8;tail>=0;tail--){
    const p=point(u-tail*.012,v),size=tail===0?3:1.7;
    ctx.shadowColor='#d0f568';ctx.shadowBlur=tail===0?10:0;ctx.fillStyle='rgba(208,245,104,'+((1-tail/9)*.85)+')';ctx.fillRect(p.x-size/2,p.y-size/2,size,size);
   }
  }
  ctx.shadowBlur=0;
 }
 function animate(t){
  frame=0;if(!visible||document.hidden||reducedMotion.matches)return;
  const delta=Math.max(0,t-last);
  if(delta>=15){const dt=Math.min(delta,50)*.001;time+=dt;last=t;const ease=1-Math.exp(-dt*5);pointerX+=(targetX-pointerX)*ease;pointerY+=(targetY-pointerY)*ease;draw();}
  frame=requestAnimationFrame(animate);
 }
 function sync(){if(frame)cancelAnimationFrame(frame);frame=0;if(visible&&!document.hidden&&!reducedMotion.matches){last=performance.now();frame=requestAnimationFrame(animate);}else {if(reducedMotion.matches)pointerX=pointerY=0;draw();}}
 if('ResizeObserver' in window)new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
 document.addEventListener('visibilitychange',sync);reducedMotion.addEventListener('change',sync);resize();sync();
}
