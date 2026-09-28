// Aggregate-only analytics. No identifiers, page URLs, titles or raw referrers leave this script.
(() => {
 'use strict';
 const optedOut=()=>navigator.globalPrivacyControl===true||navigator.doNotTrack==='1'||window.doNotTrack==='1';
 if(optedOut()||location.origin!=='https://radio.maxpfennig.haus')return;
 const endpoint='https://offscreen-trackinghaus.maxpfennighaus.workers.dev/collect';
 function send(metric,value=1,station='',source=''){
  if(optedOut())return;
  fetch(endpoint,{method:'POST',mode:'cors',credentials:'omit',referrerPolicy:'no-referrer',keepalive:true,headers:{'Content-Type':'text/plain'},body:JSON.stringify({metric,value,station,source})}).catch(()=>{});
 }
 function source(){
  try{const host=new URL(document.referrer).hostname;if(host===location.hostname)return 'direct';
   if(/(^|\.)(google|bing|duckduckgo|kagi|yahoo|brave|ecosia|perplexity)\./i.test(host))return 'search';
   if(/(^|\.)(x|twitter|linkedin|mastodon|bsky|facebook|instagram|threads|reddit)\./i.test(host))return 'social';return 'referral';
  }catch{return 'direct';}
 }
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const visitKey='offscreen:analytics:visit:'+date;
 try{if(!sessionStorage.getItem(visitKey)){send('visit',1,'',source());sessionStorage.setItem(visitKey,'1');}}catch{send('visit',1,'',source());}
 document.querySelector('.download-link')?.addEventListener('click',()=>send('download'));
 let last=null,started=false,pending=0,station='',lastFlush=performance.now();
 function flush(){const seconds=Math.floor(pending);if(seconds>0)send('seconds',seconds,station);pending-=seconds;lastFlush=performance.now();}
 function sample(){
  const now=performance.now(),s=window.offscreenAnalyticsState?.();if(!s)return;
  if(optedOut()){pending=0;last=null;started=false;return;}
  if(station!==s.station){flush();station=s.station;started=false;last=null;pending=0;}
  if(!s.on){flush();started=false;last=null;return;}
  if(last){
   const elapsed=(now-last.now)/1000;
   // Max, not sum: two crossfading decks represent one listening interval.
   const deltas=s.decks.map((d,i)=>{const p=last.decks[i];if(!p||d.src!==p.src||d.paused||d.seeking||d.ready<3)return 0;const delta=d.time-p.time;return delta>0&&delta<=elapsed*1.25+.1?Math.min(delta,elapsed):0;});
   const seconds=Math.max(0,...deltas);
   if(elapsed<=90&&seconds>0){if(!started){send('play',1,station);started=true;}pending+=seconds;}
  }
  last={now,decks:s.decks};if(now-lastFlush>=60000)flush();
 }
 setInterval(sample,1000);
 document.addEventListener('visibilitychange',()=>{sample();flush();});
 window.addEventListener('pagehide',()=>{sample();flush();});
})();
