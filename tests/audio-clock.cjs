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
class Param {
 constructor(){this.value=1;this.events=[]}
 cancelScheduledValues(t){this.events=this.events.filter(e=>e.t<t)}
 setValueAtTime(v,t){this.events.push({v,t,ramp:false})}
 linearRampToValueAtTime(v,t){this.events.push({v,t,ramp:true})}
 at(t){let prev={v:this.value,t:0};for(const e of this.events){if(e.t>t)return e.ramp?prev.v+(e.v-prev.v)*(t-prev.t)/(e.t-prev.t):prev.v;prev=e}return prev.v}
}
class AudioContext {
 get currentTime(){return now/1000} get state(){return 'running'}
 createGain(){return {gain:new Param(),connect(){}}}
 createMediaElementSource(){return {connect(){}}}
}
const ctx=vm.createContext({document:doc,navigator:{},window:{AudioContext,addEventListener(){}},Date:Clock,performance,setTimeout,clearTimeout,setInterval:()=>{},requestAnimationFrame:()=>{},console});
const html=fs.readFileSync('index.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);const results=[];function check(name,fn){fn();results.push(name)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
run('startListening()');await wait(400);
run('sleepDeadline=Date.now()+20000;updateSleep()');
const gain=run('sleepBus.gain'),t=now/1000;
check('sleep holds full volume until final ten seconds',()=>assert.equal(gain.at(t+10),1));
check('sleep is half volume five seconds before expiry',()=>assert.equal(gain.at(t+15),.5));
check('sleep reaches silence without a JavaScript tick',()=>assert.equal(gain.at(t+20),0));
run('sleepDeadline=0;updateSleep()');check('cancelling sleep restores gain',()=>assert.equal(gain.at(t+20),1));
run('beginCrossfade(decks[0],decks[1],3)');
check('crossfade has complementary gains halfway through',()=>{assert.equal(run('decks[0].node.gain').at(t+1.5),.5);assert.equal(run('decks[1].node.gain').at(t+1.5),.5)});
check('crossfade completes without JavaScript ticks',()=>{assert.equal(run('decks[0].node.gain').at(t+3),0);assert.equal(run('decks[1].node.gain').at(t+3),1)});
now+=3000;run('updateCrossfade()');check('outgoing deck is retired',()=>assert.equal(run('decks[0].element.paused'),true));
run('stop()');await wait(400);check('both decks stop',()=>assert.ok(run('decks.every(d=>d.element.paused)')));
console.log(JSON.stringify({passed:results.length,checks:results},null,2));
})().catch(e=>{console.error(e);run('cancelPowerFade()');process.exitCode=1});
