import dashboard from './dashboard.html';
export const stations={repertory:'Repertory',noir:'Noir & Mystery',comedy:'Comedy',drama:'Drama & Romance',musicals:'Musicals','sci-fi':'Sci-Fi & Fantasy',westerns:'Westerns','late-night-talk':'Late Night Talk'};
export function validEvent(x){
 if(!x||typeof x!=='object'||Object.keys(x).some(k=>!['metric','value','station','source'].includes(k)))return false;
 if(!Number.isInteger(x.value)||!['visit','download','play','seconds'].includes(x.metric))return false;
 if(x.metric==='seconds'?(x.value<1||x.value>180):x.value!==1)return false;
 if(['seconds','play'].includes(x.metric)?!Object.hasOwn(stations,x.station):x.station!=='')return false;
 return x.metric==='visit'?['direct','search','social','referral'].includes(x.source):x.source==='';
}
export function day(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const headers={'Access-Control-Allow-Origin':'https://radio.maxpfennig.haus','Vary':'Origin','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
 const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
 if(url.pathname==='/collect'){
  if(origin!=='https://radio.maxpfennig.haus')return json({error:'origin'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}});
  if(request.method!=='POST')return json({error:'method'},405);
  if(request.headers.get('Sec-GPC')==='1'||request.headers.get('DNT')==='1')return new Response(null,{status:204,headers});
  if(Number(request.headers.get('Content-Length'))>512)return json({error:'size'},413);
  // Read a bounded stream so chunked bodies cannot evade the payload limit.
  const reader=request.body?.getReader();let body='',bytes=0;
  if(!reader)return json({error:'body'},400);
  try{for(;;){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>512){await reader.cancel();return json({error:'size'},413);}body+=new TextDecoder().decode(value);}
   const event=JSON.parse(body);if(!validEvent(event))return json({error:'event'},400);
   await env.DB.prepare('INSERT INTO daily(day,metric,station,source,value) VALUES(?,?,?,?,?) ON CONFLICT(day,metric,station,source) DO UPDATE SET value=value+excluded.value').bind(day(),event.metric,event.station,event.source,event.value).run();
   return json({ok:true},202);
  }catch{return json({error:'unavailable'},503);}
 }
 if(request.method!=='GET')return json({error:'method'},405);
 if(url.pathname==='/api/stats'){
  const today=day(),start=new Date(today+'T12:00:00Z');start.setUTCDate(start.getUTCDate()-13);
  const {results}=await env.DB.prepare('SELECT day,metric,station,source,value FROM daily WHERE day>=? AND day<=? ORDER BY day').bind(start.toISOString().slice(0,10),today).all();
  return json({today,timeZone:'America/New_York',stations,rows:results});
 }
 if(url.pathname==='/')return new Response(dashboard,{headers:{...headers,'Content-Type':'text/html;charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"}});
 return json({error:'not_found'},404);
}};
