const fs=require('fs'),vm=require('vm'),assert=require('assert');
class El {
 constructor(){this.style={setProperty:(k,v)=>this.style[k]=v};this.attrs={};this.events={};this.children=[];this.classList={add:()=>{},remove:()=>{}};this.readyState=1;this.duration=10000;this.currentTime=0;this.paused=true;}
 setAttribute(k,v){this.attrs[k]=v} getAttribute(k){return this.attrs[k]}
 addEventListener(k,f){(this.events[k]??=[]).push(f)} removeEventListener(){}
 dispatch(k,e={}){for(const f of this.events[k]??[])f(e)}
 appendChild(x){this.children.push(x)}focus(){}setPointerCapture(){}
 getBoundingClientRect(){return {left:0,top:0,width:320,height:320}}
 load(){this.readyState=1}pause(){this.paused=true}async play(){this.paused=false;this.dispatch('playing')}
}
const els={};const get=k=>els[k]??=new El();const doc={getElementById:get,querySelector:get,createElement:()=>new El(),addEventListener:()=>{},body:get('body'),hidden:false};
let now=Date.UTC(2026,8,26,1);class Clock extends Date{static now(){return now}}
let noiseStarts=0,noiseStops=0;
class Node {constructor(){this.gain={setValueAtTime(){},linearRampToValueAtTime(){}};this.frequency={};this.Q={}}connect(){}disconnect(){}start(){noiseStarts++}stop(){noiseStops++}}
class AudioContext {constructor(){this.sampleRate=8000;this.currentTime=0;this.state='running';this.destination={}}createBuffer(ch,n){return {getChannelData:()=>new Float32Array(n)}}createBufferSource(){return new Node()}createBiquadFilter(){return new Node()}createGain(){return new Node()}}
const storage={};
const ctx=vm.createContext({document:doc,navigator:{},window:{addEventListener(){},AudioContext},localStorage:{getItem:k=>storage[k],setItem:(k,v)=>storage[k]=v},Date:Clock,performance,setTimeout,clearTimeout,setInterval:()=>{},requestAnimationFrame:()=>{},console});
const html=fs.readFileSync('index.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);const results=[];function check(name,fn){fn();results.push(name)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

(async()=>{
check('all tracks have one category, film stations meet minimum, Sci-Fi combines the former series channels',()=>{
 const categories=run('stations.slice(1).flatMap(s=>s.indices)');assert.equal(categories.length,run('tracks.length'));assert.equal(new Set(categories).size,run('tracks.length'));assert.equal(run('stations[0].indices.length'),80);
 for(const station of run('stations.slice(1,5)')) assert.ok(station.indices.length>=(station.id==='musicals'?19:20));
 assert.equal(run("stations.find(s=>s.id==='sci-fi').indices.length"),7);
 assert.equal(run("stations.some(s=>['doctor-who','star-wars'].includes(s.id))"),false);
});
check('every station follows UTC offsets and wraps its own schedule',()=>{
 for(let j=0;j<run('stations.length');j++){
  let offset=0;const indices=run(`stations[${j}].indices`);
  for(const i of indices){assert.equal(run(`programme(epoch+${(offset+.1)*1000},${j}).index`),i);offset+=run(`tracks[${i}].duration`)}
  assert.equal(run(`programme(epoch+${(offset+.1)*1000},${j}).index`),indices[0]);
  assert.equal(run(`programme(epoch-1000,${j}).index`),indices.at(-1));
 }
});
run('setStation(2)');
check('off tuning changes labels and persists selection silently',()=>{assert.equal(get('station-name').textContent,'Comedy');assert.equal(storage['cinema-radio-station'],'comedy');assert.equal(get('audio').paused,true);assert.equal(noiseStarts,0)});
run('setRing(sleepButton,.5);setRing(volumeControl,.4);startListening()');await wait(400);
const deadline=run('sleepDeadline');run('setStation(1)');
check('tuning pauses the old programme without static',()=>{assert.equal(get('audio').paused,true);assert.equal(run('tuning'),true);assert.equal(noiseStarts,0);assert.equal(get('audio').volume,0)});
run('tick()');check('clock tick does not interrupt tuning',()=>assert.equal(get('audio').paused,true));
await wait(680);
check('new station joins its live position and restores selected volume',()=>{assert.equal(get('audio').src,run('programme().track.file'));assert.ok(Math.abs(get('audio').currentTime-run('programme().offset'))<.01);assert.equal(get('audio').volume,.4);assert.equal(run('sleepDeadline'),deadline)});
run('setStation(3)');await wait(50);run('setStation(4)');await wait(680);
check('rapid changes settle on the last station',()=>{assert.equal(get('station-name').textContent,'Musicals');assert.equal(get('audio').src,run('programme().track.file'));assert.equal(run('tuning'),false)});
run('setStation(2);stop()');await wait(650);
check('power off during tuning cancels the pending join',()=>{assert.equal(run('listening'),false);assert.equal(get('audio').paused,true);assert.equal(run('tuning'),false)});
const key=k=>get('station-tuner').dispatch('keydown',{key:k,preventDefault(){}});
key('Home');assert.equal(run('stationIndex'),0);key('ArrowUp');assert.equal(run('stationIndex'),1);key('End');assert.equal(run('stationIndex'),run('stations.length-1'));key(' ');assert.equal(run('stationIndex'),0);
check('keyboard tunes and Home/End reach either end',()=>assert.equal(get('station-tuner').attrs['aria-valuenow'],'1'));
const t=get('station-tuner');t.dispatch('pointerdown',{button:0,clientY:100,pointerId:1,preventDefault(){}});t.dispatch('pointermove',{clientY:48});t.dispatch('pointerup');
check('dragging moves through detents without a duplicate tap change',()=>assert.equal(run('stationIndex'),2));
t.dispatch('pointerdown',{button:0,clientY:100,pointerId:1,preventDefault(){}});t.dispatch('pointerup');check('tap advances one station',()=>assert.equal(run('stationIndex'),3));
run('setRing(volumeControl,0);startListening()');await wait(400);const count=noiseStarts;run('setStation(4)');await wait(650);
check('zero volume silences both tuning and programme',()=>{assert.equal(noiseStarts,count);assert.equal(get('audio').volume,0)});
run('stop()');
console.log(JSON.stringify({passed:results.length,checks:results},null,2));
})().catch(e=>{console.error(e);run('cancelTuning();cancelPowerFade()');process.exitCode=1});
