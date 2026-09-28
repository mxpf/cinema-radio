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
doc.head=get('head');doc.querySelectorAll=()=>[];get('body').classList.toggle=()=>{};
const messages=[];const native={postMessage:s=>messages.push(JSON.parse(s))};
const ctx=vm.createContext({document:doc,navigator:{},RadioNative:native,window:{RadioNative:native,addEventListener(){}},Date:Clock,performance,setTimeout,clearTimeout,setInterval:()=>{},requestAnimationFrame:()=>{},console});
const html=fs.readFileSync('index.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);const results=[];function check(name,fn){fn();results.push(name)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
run('globalThis.oldTick=tick');
vm.runInContext(fs.readFileSync('android/web/android-bridge.js','utf8'),ctx);
run('window.renderNativeRadio({powered:true,playing:true,station:0,volume:.65,sleepSeconds:30,slug:tracks[0].slug,error:""})');
run('oldTick()');
assert.ok(run('decks.every(d=>!d.element.src && d.element.paused)'), 'Captured browser callbacks must not start web audio');
run('setRing(volumeControl,.2);setRing(sleepButton,.5);stop()');
assert.deepEqual(messages.slice(-3),[{action:'volume',value:.2},{action:'sleep',value:30},{action:'power',value:false}]);
console.log('Android bridge: native controls only; captured browser ticks cannot start audio.');
