import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source=fs.readFileSync('app.js','utf8');
const start=source.indexOf('function stabilityCheck');
const end=source.indexOf('function nextAction',start);
assert.ok(start>=0&&end>start,'stabilityCheck must exist');
const ctx={};
vm.createContext(ctx);
vm.runInContext("const sgread=b=>b.readings;"+source.slice(start,end)+";globalThis.check=stabilityCheck;",ctx);
const r=(sg,day)=>({sg,ts:new Date(Date.UTC(2026,0,day)).toISOString()});
assert.equal(ctx.check({readings:[r(1.080,1),r(1.079,4)]}).ready,true,'exact 0.001 drop must be stable');
assert.equal(ctx.check({readings:[r(1.001,1),r(1.000,4)]}).ready,true,'exact 0.001 low-SG drop must be stable');
assert.equal(ctx.check({readings:[r(1.080,1),r(1.078,4)]}).ready,false,'0.002 change must not be stable');
assert.equal(ctx.check({readings:[r(1.080,1),r(1.080,2)]}).ready,false,'readings less than 2 days apart must not be stable');
assert.equal(ctx.check({readings:[r(1.080,1)]}).ready,false,'one reading must not be stable');
console.log('behavior: SG stability boundary assertions passed');
