import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calcMatrix,lifePeriods,periodForecast,yearForecast} from '../public/js/core/matrixCore.js';

test('все 64 неравномерных периода соответствуют getAgeKey источника',()=>{
 const p=lifePeriods(calcMatrix('10.06.2006'));
 const bounds=[0,1,2.5,3.5,5,6,7.5,8.5,10];
 assert.equal(p.length,64);
 for(let d=0;d<8;d++) for(let i=0;i<8;i++){
  const row=p[d*8+i]; assert.equal(row.age,d*10+bounds[i]); assert.equal(row.endAge,d*10+bounds[i+1]);
  if(d*8+i>0) assert.equal(p[d*8+i-1].endAge,row.age);
 }
});
test('10.06.2006: переходы 21, 22.5, 23.5 без округления к году',()=>{
 const p=periodForecast('10.06.2006',2026,6);
 assert.deepEqual(p.map(x=>[x.age,x.endAge,x.energy]),[[20,21,6],[21,22.5,14],[22.5,23.5,8],[23.5,25,10],[25,26,20]]);
 assert.equal(p[2].startsOn,'10.12.2028'); assert.equal(p[2].endsOn,'10.12.2029');
 assert.deepEqual(yearForecast('10.06.2006',2026,6).map(x=>x.energy),[6,14,14,8,10,20]);
 assert.equal(periodForecast('10.06.2006',2028,1)[0].startsOn,'10.06.2027');
});
test('полгода, конец месяца, високосный день, край кольца',()=>{
 assert.equal(periodForecast('31.08.2000',2022,1).find(x=>x.age===22.5).startsOn,'28.02.2023');
 assert.equal(periodForecast('29.02.2000',2025,1)[0].startsOn,'01.03.2025');
 assert.equal(periodForecast('29.02.2000',2022,1).find(x=>x.age===22.5).startsOn,'01.09.2022');
 assert.deepEqual(periodForecast('10.06.2006',2086,10),[]);
 assert.deepEqual(periodForecast('10.06.2006',2026,0),[]);
 assert.equal(periodForecast('10.06.2006',2085,1).at(-1).endsOn,'10.06.2086');
 assert.throws(()=>periodForecast('10.06.2006',2005),RangeError);
});
