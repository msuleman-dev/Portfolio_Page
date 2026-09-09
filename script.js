const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
document.getElementById('year').textContent = new Date().getFullYear();
if ('IntersectionObserver' in window && !reducedMotion.matches) {
  document.documentElement.classList.add('js-motion');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); } });
  }, { threshold: 0.08 });
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
 function resize(){const r=canvas.getBoundingClientRect();width=r.width;height=r.height;const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=width*dpr;canvas.height=height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
 function point(u,v){
  const wave=Math.sin(u*6+time*.65+v*2)*.11+Math.cos(v*5-time*.5+u*2)*.085;
  return{x:width*(.5+u*.33+v*.17),y:height*(.5+v*.2-u*.12-wave)};
 }
 function draw(){
  ctx.clearRect(0,0,width,height);
  // Faint registration grid grounds the more fluid central form.
  ctx.fillStyle='#a280ff20';
  for(let x=24;x<width;x+=24)for(let y=64;y<height-64;y+=24)ctx.fillRect(x,y,1,1);
  for(let row=0;row<=24;row++){
   const v=-1+row/12;ctx.beginPath();
   for(let col=0;col<=60;col++){const p=point(-1+col/30,v);col?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   const gradient=ctx.createLinearGradient(width*.1,0,width*.9,height);
   gradient.addColorStop(0,'rgba(162,128,255,.12)');gradient.addColorStop(.5,`rgba(185,147,255,${.45+row/65})`);gradient.addColorStop(1,'rgba(162,128,255,.12)');
   ctx.strokeStyle=gradient;ctx.lineWidth=row%6===0?1.3:.7;ctx.stroke();
  }
  for(let col=0;col<=24;col++){
   ctx.beginPath();for(let row=0;row<=48;row++){const p=point(-1+col/12,-1+row/24);row?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}
   ctx.strokeStyle='#a280ff35';ctx.lineWidth=.65;ctx.stroke();
  }
  // Small lime pulses travel along the same paths as the lattice.
  for(let n=0;n<7;n++){
   const u=((time*.16+n*.29)%2)-1,v=Math.sin(n*5.1)*.85,p=point(u,v);
   ctx.shadowColor='#d0f568';ctx.shadowBlur=12;ctx.fillStyle='#d0f568';ctx.fillRect(p.x-2,p.y-2,4,4);ctx.shadowBlur=0;
  }
 }
 function animate(t){frame=0;if(!visible||document.hidden||reducedMotion.matches)return;time+=Math.min(t-last,40)*.001;last=t;draw();frame=requestAnimationFrame(animate);}
 function sync(){if(frame)cancelAnimationFrame(frame);frame=0;if(visible&&!document.hidden&&!reducedMotion.matches){last=performance.now();frame=requestAnimationFrame(animate);}else draw();}
 new ResizeObserver(resize).observe(canvas);
 if('IntersectionObserver' in window)new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();}).observe(canvas);
 document.addEventListener('visibilitychange',sync);reducedMotion.addEventListener('change',sync);resize();sync();
}
