const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let hour=6,interval;const events={};
const root={dataset:{}};
const doc={documentElement:root,addEventListener:(name,fn)=>events[name]=fn};
class Clock{getHours(){return hour}}
vm.runInNewContext(fs.readFileSync('theme.js','utf8'),{document:doc,window:{addEventListener:(name,fn)=>events[name]=fn},Date:Clock,setInterval(fn,ms){assert.equal(ms,60000);interval=fn}});
assert.equal(root.dataset.timeTheme,'night');
for(const [h,theme] of [[7,'day'],[18,'day'],[19,'night'],[23,'night'],[0,'night']]){hour=h;interval();assert.equal(root.dataset.timeTheme,theme)}
hour=12;events.visibilitychange();assert.equal(root.dataset.timeTheme,'day');
hour=22;events.pageshow();assert.equal(root.dataset.timeTheme,'night');
console.log('Local theme boundaries and wake/return updates passed.');
