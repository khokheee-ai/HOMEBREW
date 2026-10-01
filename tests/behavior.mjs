import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('app.js','utf8');
function slice(a,b){const s=source.indexOf(a),e=source.indexOf(b,s);assert.ok(s>=0&&e>s,a+' block missing');return source.slice(s,e)}
function context(extra='',block=''){
  const ctx={console,Date,Math,JSON,Set,Number,Object,Array,Error,alert:()=>{},confirm:()=>true,...globalThis};
  vm.createContext(ctx); vm.runInContext(extra+block,ctx); return ctx;
}
const r=(sg,day)=>({sg,ts:new Date(Date.UTC(2026,0,day)).toISOString()});
const stabilityBlock=slice('function stabilityCheck','function nextAction');
let ctx=context("const readings=b=>[...(b.readings||[])].sort((a,z)=>new Date(a.ts)-new Date(z.ts));const sgread=b=>readings(b).filter(r=>Number.isFinite(r.sg));",stabilityBlock+";globalThis.check=stabilityCheck;");
assert.equal(ctx.check({readings:[r(1.080,1),r(1.079,4)]}).ready,true);
assert.equal(ctx.check({readings:[r(1.001,1),r(1.000,4)]}).ready,true);
assert.equal(ctx.check({readings:[r(1.080,1),r(1.078,4)]}).ready,false);
assert.equal(ctx.check({readings:[r(1.080,1),r(1.080,2)]}).ready,false);

const normBlock=slice('function normalizeBackup','function validBackup');
ctx=context('',normBlock+";globalThis.norm=normalizeBackup;");
let clean=ctx.norm({activeId:'a',batches:[{id:'a',name:'Legacy',route:'full',status:'active',currentStep:16,startDate:'2026-09-01',readings:[]}]});
assert.deepEqual(Array.from(clean.batches[0].completedSteps),[]);
assert.equal(Object.keys(clean.batches[0].checks).length,0);
assert.equal(clean.activeId,'a');
clean=ctx.norm({activeId:'f',batches:[{id:'f',name:'Done',route:'easy',status:'finished',currentStep:8,startDate:'2026-09-01',readings:[]}]});
assert.equal(clean.activeId,null);
assert.throws(()=>ctx.norm({batches:[{id:'x',name:'Bad',route:'easy',status:'active',currentStep:9,readings:[]}]}));

const completionBlock=slice('window.completeStep','function logView');
function completionCase(route,step,readings){
  let saved=0,rendered=0; const b={id:'b',route,currentStep:step,status:'active',completedSteps:[],checks:{},readings};
  const fakeWindow={};
  const extra="const window=globalThis.window;let S=globalThis.S,view='brew',selectedBatchId=null;const active=()=>S.batches.find(b=>b.id===S.activeId&&!['archived','finished'].includes(b.status));const readings=b=>[...(b.readings||[])].sort((a,z)=>new Date(a.ts)-new Date(z.ts));const sgread=b=>readings(b).filter(r=>Number.isFinite(r.sg));const save=()=>{globalThis.saved++};const render=()=>{globalThis.rendered++};"+stabilityBlock;
  const c={window:fakeWindow,S:{activeId:'b',batches:[b]},saved,rendered,console,Date,Math,Number,Array,Object,Set,alert:()=>{},confirm:()=>true};
  vm.createContext(c);vm.runInContext(extra+completionBlock,c);c.window.completeStep();return {b:c.S.batches[0],S:c.S};
}
let x=completionCase('full',20,[r(1.000,1)]);assert.equal(x.b.status,'active','full Finish must block without stability');
x=completionCase('easy',8,[r(1.000,1)]);assert.equal(x.b.status,'active','easy Finish must block without stability');
x=completionCase('full',20,[r(1.000,1),r(1.000,4)]);assert.equal(x.b.status,'finished');assert.equal(x.S.activeId,null);
x=completionCase('easy',8,[r(1.000,1),r(1.000,4)]);assert.equal(x.b.status,'finished');assert.equal(x.S.activeId,null);
console.log('behavior: stability, completion state and backup normalization passed');
