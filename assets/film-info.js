(() => {
 const button=document.getElementById('film-info'),screen=document.querySelector('.lcd'),view=document.getElementById('film-synopsis');
 const track=view.firstElementChild,paragraph=track.firstElementChild,copy=track.lastElementChild;
 const motion=matchMedia('(prefers-reduced-motion: reduce)');
 let open=false,key='',animation=null;
 function cancel(){if(animation)animation.cancel();animation=null;}
 function layout(){
  cancel();view.scrollTop=0;
  if(!open||!document.body.classList.contains('powered')||motion.matches)return;
  paragraph.style.minHeight=copy.style.minHeight=(view.clientHeight+18)+'px';
  const height=paragraph.offsetHeight,distance=height;
  const words=paragraph.textContent.trim().split(/\s+/).length;
  const visibleWords=words*Math.min(1,view.clientHeight/(height-18));
  const pause=Math.max(3,visibleWords/200*60),travel=distance/9;
  animation=track.animate([{transform:'translateY(0)',offset:0},{transform:'translateY(0)',offset:pause/(pause+travel)},{transform:`translateY(-${distance}px)`,offset:1}],{duration:(pause+travel)*1000,delay:440,iterations:Infinity,easing:'linear'});
 }
 function refresh(){
  const next=document.getElementById('title-text').textContent+' ('+document.getElementById('year').textContent+')';
  if(next===key)return;key=next;
  paragraph.textContent=window.OFFSCREEN_SYNOPSES[key]||'A synopsis for this film is not available yet.';copy.textContent=paragraph.textContent;
  view.setAttribute('aria-label','Synopsis: '+key);layout();
 }
 button.addEventListener('click',()=>{
  if(!document.body.classList.contains('powered'))return;
  open=!open;button.setAttribute('aria-pressed',String(open));button.setAttribute('aria-label',open?'Show film title':'Show film synopsis');
  screen.classList.toggle('info-open',open);view.setAttribute('aria-hidden',String(!open));refresh();layout();
 });
 new MutationObserver(refresh).observe(document.getElementById('title-text'),{childList:true,characterData:true,subtree:true});
 new MutationObserver(refresh).observe(document.getElementById('year'),{childList:true});
 let powered=document.body.classList.contains('powered');
 new MutationObserver(()=>{const next=document.body.classList.contains('powered');if(next!==powered){powered=next;button.disabled=!next;layout();}}).observe(document.body,{attributes:true,attributeFilter:['class']});
 button.disabled=!powered;
 new ResizeObserver(layout).observe(view);motion.addEventListener('change',layout);
 document.fonts.ready.then(layout);refresh();
})();
