import { test } from 'vitest'; import assert from 'node:assert/strict';
import { httpCheck } from '../src/experiment/http-check.js'; import { baselineSuite, generate } from '../src/engine/suites.js';
test('HTTP transport matches in-process results; reference passes; defects detected',{timeout:60000},async()=>{
  const r=await httpCheck([...baselineSuite,...generate(1337,120)]);
  for(const h of Object.keys(r))assert.equal(r[h].mismatchesVsInProcess,0,h);
  assert.equal(r.correct.failingOverHttp,0);
  for(const h of ['D1','D2','D3','D4','D5'])assert.ok(r[h].failingOverHttp>0,h);});
