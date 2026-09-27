const fs=require('fs'),vm=require('vm'),assert=require('assert');
const h=fs.readFileSync('index.html','utf8');const start=h.indexOf('function playbackSegments('),end=h.indexOf('let stationIndex=0;',start);
const ctx=vm.createContext({tracks:[{slug:'one',duration:100,skip:[[0,10],[40,50],[90,100]]},{slug:'two',duration:50}],stations:[{indices:[0,1]}],epoch:0,stationIndex:0});
vm.runInContext(h.slice(start,end),ctx);vm.runInContext(h.slice(h.indexOf('function programme('),h.indexOf("const audio=document",start)),ctx);
const run=s=>vm.runInContext(s,ctx);
assert.equal(run('stations[0].duration'),120);
for(const [time,index,source] of [[0,0,10],[29999,0,39.999],[30000,0,50],[69999,0,89.999],[70000,1,0],[120000,0,10],[-1000,1,49]]){
 const p=run(`programme(${time})`);assert.equal(p.index,index);assert.ok(Math.abs(p.mediaOffset-source)<.00001);
}
assert.equal(run('playbackSegments({duration:100,skip:[[20,40],[10,30],[40,50]]}).map(([a,b])=>b-a).reduce((a,b)=>a+b)'),60);
for(const skip of [[[0,100]],[[20,10]],[[-1,10]],[[0,101]],[[0,'5']]])assert.throws(()=>run(`playbackSegments({duration:100,skip:${JSON.stringify(skip)}})`));
assert.equal(run('sourceOffset(tracks[1],25)'),25);
console.log('Skip ranges: opening, internal and ending cuts; UTC wrap; overlap merging; invalid ranges; unchanged untrimmed playback passed.');
