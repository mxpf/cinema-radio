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
const ctx=vm.createContext({document:doc,navigator:{},window:{addEventListener(){},matchMedia:()=>({matches:false,addEventListener(){}})},Date:Clock,performance,setTimeout,clearTimeout,setInterval:()=>{},requestAnimationFrame:()=>{},console});
const html=fs.readFileSync('index.html','utf8');const script=html.match(/<script>([\s\S]*)<\/script>/)[1];vm.runInContext(script,ctx);
const run=s=>vm.runInContext(s,ctx);const results=[];function check(name,fn){fn();results.push(name)}
const wait=ms=>new Promise(r=>setTimeout(r,ms));

let created=0,cancelled=0,frames,options;
const clip=get('title'),text=get('title-text');clip.clientWidth=200;text.scrollWidth=160;
get('title-track').animate=(f,o)=>{created++;frames=f;options=o;return {play(){},pause(){},cancel(){cancelled++}}};
run('fitTitle()');assert.equal(created,0);
text.scrollWidth=420;run('fitTitle()');assert.equal(created,1);assert.equal(frames[1].transform,'translateX(-452px)');assert.equal(options.duration,(452/22)*1000);assert.equal(get('title-copy').textContent,text.textContent);assert.equal(get('title-copy').hidden,false);assert.equal(frames.length,2);assert.equal(options.delay,2000);assert.equal(options.easing,'steps(151, end)');
run('fitTitle();fitTitle()');assert.equal(created,1);
clip.clientWidth=260;run('fitTitle()');assert.equal(created,2);assert.equal(cancelled,1);assert.equal(frames[1].transform,'translateX(-452px)');
run('titleMotion.matches=true;fitTitle()');assert.equal(cancelled,2);assert.equal(run('titleAnimation'),null);assert.equal(get('title-copy').hidden,true);
console.log('Marquee checks passed: short titles stay still, overflowing titles loop left at 22px/s with a seamless duplicate and two-second opening pause, repeated ticks preserve motion, resize recalculates, reduced motion disables scrolling.');
