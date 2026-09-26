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
const ctx=vm.createContext({document:doc,navigator:{},window:{addEventListener(){}},Date:Clock,performance,setTimeout,clearTimeout,setInterval:()=>{},console});
const html=fs.readFileSync('index.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);const results=[];function check(name,fn){fn();results.push(name)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
run('setRing(sleepButton,.5);startListening()');await wait(80);
check('power-up starts quietly',()=>assert.ok(get('audio').volume>0&&get('audio').volume<.65));
await wait(320);check('fade reaches selected volume',()=>assert.ok(Math.abs(get('audio').volume-.65)<.001));
const angle=get('sleep').style['--angle'];run('stop()');
check('power-down does not abruptly pause',()=>assert.equal(get('audio').paused,false));
await wait(90);check('power-down fades',()=>assert.ok(get('audio').volume>0&&get('audio').volume<.65));
await wait(310);check('power-down finishes silent and paused',()=>{assert.equal(get('audio').volume,0);assert.equal(get('audio').paused,true);assert.equal(run('baseVolume'),.65);assert.equal(get('sleep').style['--angle'],angle)});
run('startListening()');await wait(400);run('stop()');await wait(80);run('startListening()');await wait(420);
check('rapid off/on cancels stale pause',()=>{assert.equal(get('audio').paused,false);assert.ok(Math.abs(get('audio').volume-.65)<.001)});
run('setRing(volumeControl,.3)');check('volume remains responsive',()=>assert.equal(get('audio').volume,.3));
run('sleepDeadline=Date.now()+15000;updateSleep()');check('sleep and power gains compose',()=>assert.equal(get('audio').volume,.15));
run('stop()');check('stopping during sleep fade does not increase level',()=>assert.ok(get('audio').volume<=.15));await wait(400);
check('sleep fade powers down silently',()=>{assert.equal(get('audio').volume,0);assert.equal(get('audio').paused,true)});
console.log(JSON.stringify({passed:results.length,checks:results},null,2));
})().catch(e=>{console.error(e);run('cancelPowerFade()');process.exitCode=1});
