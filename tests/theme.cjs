const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const SunCalc=require('../assets/vendor/suncalc/suncalc.js');
function harness({time='2026-09-26T12:00:00Z',saved=null,storageFails=false}={}){
 let now=new Date(time),requests=0,success,failure,interval;
 const events={},attrs={},storage={};if(saved)storage['cinema-radio-solar-location']=JSON.stringify(saved);
 const root={dataset:{}},button={setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k],addEventListener:(k,f)=>events.click=f},status={hidden:true};
 const doc={documentElement:root,readyState:'complete',getElementById:id=>id==='solar-location'?button:status,addEventListener:(name,fn)=>events[name]=fn};
 class Clock extends Date{constructor(...args){super(...(args.length?args:[now]))}}
 const ctx={SunCalc,document:doc,window:{addEventListener:(name,fn)=>events[name]=fn},navigator:{geolocation:{getCurrentPosition(a,b,options){requests++;success=a;failure=b;assert.equal(options.enableHighAccuracy,false);assert.equal(options.timeout,12000)}}},Date:Clock,setInterval(fn){interval=fn},setTimeout(){},clearTimeout(){},localStorage:{getItem:k=>storage[k]??null,setItem(k,v){if(storageFails)throw Error();storage[k]=v},removeItem:k=>delete storage[k]}};
 vm.runInNewContext(fs.readFileSync('theme.js','utf8'),ctx);
 return {root,button,status,attrs,storage,events,get requests(){return requests},date(d){now=new Date(d);interval()},allow(){success({coords:{latitude:40.7128,longitude:-74.006}})},deny(){failure({code:1})}};
}
let h=harness();assert.equal(h.requests,0,'no location request on load');
for(const [hour,theme] of [[6,'night'],[7,'day'],[18,'day'],[19,'night'],[23,'night'],[0,'night']]){
 const d=new Date();d.setHours(hour,0,0,0);h.date(d);assert.equal(h.root.dataset.timeTheme,theme);
}
h.events.click();assert.equal(h.requests,1);assert.equal(h.button.disabled,true);h.deny();assert.equal(h.button.disabled,false);assert.equal(h.attrs['aria-pressed'],'false');assert.match(h.status.textContent,/wasn’t allowed/);
h.events.click();h.allow();assert.equal(h.attrs['aria-pressed'],'true');assert.deepEqual(JSON.parse(h.storage['cinema-radio-solar-location']),{lat:40.7,lng:-74});
const times=SunCalc.getTimes(new Date('2026-09-26T16:00:00Z'),40.7,-74);
assert.equal(times.sunrise.getUTCDate(),26);assert.ok(times.sunrise.getUTCHours()>=10 && times.sunrise.getUTCHours()<=11);
for(const [time,theme] of [[+times.sunrise-1,'night'],[+times.sunrise,'day'],[+times.sunset-1,'day'],[+times.sunset,'night']]){h.date(time);assert.equal(h.root.dataset.timeTheme,theme)}
h.events.click();assert.equal(h.storage['cinema-radio-solar-location'],undefined);assert.equal(h.attrs['aria-pressed'],'false');
h=harness({saved:{lat:40.7,lng:-74}});assert.equal(h.requests,0);assert.equal(h.attrs['aria-pressed'],'true');
h=harness({saved:{lat:78,lng:15},time:'2026-06-21T12:00:00Z'});assert.equal(h.root.dataset.timeTheme,'day');
h.date('2026-12-21T12:00:00Z');assert.equal(h.root.dataset.timeTheme,'night');
h=harness({storageFails:true});h.events.click();h.allow();assert.equal(h.attrs['aria-pressed'],'true');
console.log('Theme checks passed: clock/solar boundaries, opt-in only, denial/retry, coarse storage, forgetting, restored location, polar day/night, and unavailable storage.');
