(() => {
 const button=document.getElementById('film-info'),screen=document.querySelector('.lcd'),view=document.getElementById('film-synopsis');
 const track=view.firstElementChild,paragraph=track.firstElementChild,copy=track.lastElementChild;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let open=false,key='',animation=null;
 function cancel(){if(animation)animation.cancel();animation=null;}
 function fadeOut(){if(animation)animation.pause();setTimeout(()=>{if(!open)cancel();},200);}
 function layout(){
  const housing=document.querySelector('.radio'),unit=document.querySelector('.screen-unit');
  const scale=housing.getBoundingClientRect().width/housing.offsetWidth;
  const gap=(housing.getBoundingClientRect().right-unit.getBoundingClientRect().right)/scale;
  button.style.top=`calc(100% + ${Math.max(0,gap*.66)}px)`;
  const available=screen.clientHeight-22,line=parseFloat(getComputedStyle(track).lineHeight);
  view.style.bottom='auto';
  view.style.height=(Math.max(1,Math.floor((available-4)/line))*line+4)+'px';
  cancel();view.scrollTop=0;copy.hidden=true;
  paragraph.style.minHeight=copy.style.minHeight='';
  if(!open||!document.body.classList.contains('powered')||motion.matches)return;
  const height=paragraph.offsetHeight,distance=height;
  if(height-18<=view.clientHeight+1)return;
  copy.hidden=false;
  const words=paragraph.textContent.trim().split(/\s+/).length;
  const visibleWords=words*Math.min(1,view.clientHeight/(height-18));
  const pause=Math.max(3,visibleWords/200*60),travel=distance/9;
  animation=track.animate([{transform:'translateY(0)'},{transform:`translateY(-${distance}px)`}],{duration:travel*1000,delay:440+pause*1000,iterations:Infinity,easing:`steps(${Math.ceil(distance/1.5)}, end)`});
 }
 function refresh(){
  const next=document.getElementById('title-text').textContent+' ('+document.getElementById('year').textContent+')';
  if(next===key)return;key=next;
  paragraph.textContent=window.OFFSCREEN_SYNOPSES[key]||'A synopsis for this film is not available yet.';copy.textContent=paragraph.textContent;
  view.setAttribute('aria-label','Synopsis: '+key);layout();
 }
 button.addEventListener('click',()=>{
  if(!document.body.classList.contains('powered')||document.body.classList.contains('buffering'))return;
  open=!open;button.setAttribute('aria-pressed',String(open));button.setAttribute('aria-label',open?'Show film title':'Show film synopsis');
  screen.classList.toggle('info-open',open);view.setAttribute('aria-hidden',String(!open));if(open){refresh();layout();}else fadeOut();
 });
 let station=document.getElementById('station-number').textContent;
 new MutationObserver(()=>{
  const next=document.getElementById('station-number').textContent;if(next===station)return;station=next;
  open=false;fadeOut();button.setAttribute('aria-pressed','false');button.setAttribute('aria-label','Show film synopsis');screen.classList.remove('info-open');view.setAttribute('aria-hidden','true');
 }).observe(document.getElementById('station-number'),{childList:true,characterData:true,subtree:true});
 new MutationObserver(refresh).observe(document.getElementById('title-text'),{childList:true,characterData:true,subtree:true});
 new MutationObserver(refresh).observe(document.getElementById('year'),{childList:true});
 let powered=document.body.classList.contains('powered');
 new MutationObserver(()=>{const next=document.body.classList.contains('powered');if(next!==powered){powered=next;layout();}}).observe(document.body,{attributes:true,attributeFilter:['class']});

 new ResizeObserver(layout).observe(screen);motion.addEventListener('change',layout);
 document.fonts.ready.then(layout);refresh();
})();
