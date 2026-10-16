import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const modular=fs.existsSync(new URL('../public/js/ui/saved.js',import.meta.url));
const source=fs.readFileSync(new URL(modular?'../public/js/ui/saved.js':'../public/js/app.js',import.meta.url),'utf8');
const storeSource=modular?fs.readFileSync(new URL('../public/js/ui/store.js',import.meta.url),'utf8'):source;
function harness(blocked=false) {
 let data='[]';const messages=[];const handlers={};
 const slide={innerHTML:'',querySelector:()=>({addEventListener:(ev,fn)=>handlers.save=fn}),querySelectorAll:sel=>sel==='.saved-del'?[{dataset:{i:'0'},addEventListener:(ev,fn)=>handlers.del=fn}]:[]};
 const context={localStorage:{getItem:()=>data,setItem:(k,v)=>{if(blocked)throw Error('Quota');data=v}},$:()=>slide,toast:m=>messages.push(m),prompt:()=> 'Test',lastResult:{},mode:'single',drums1:{getValue:()=> '2000-02-29'},drums2:{getValue:()=> '2001-01-01'}};
 vm.createContext(context);
 const store=storeSource.slice(storeSource.indexOf('const store ='),storeSource.indexOf('};',storeSource.indexOf('const store ='))+2);
 const start=source.indexOf('function savedList()');
 let body=source.slice(start,modular?undefined:source.indexOf('/* ================= События'));
 body=body.replace('export function renderSavedSlide','function renderSavedSlide');
 vm.runInContext(store+'\n'+body+'\nthis.renderSavedSlide=renderSavedSlide;',context);
 const ctx={getMode:()=>context.mode,getLastResult:()=>context.lastResult,drums1:context.drums1,drums2:context.drums2};
 context.renderSavedSlide(ctx);
 return {handlers,messages,slide,getData:()=>JSON.parse(data),setData:v=>data=JSON.stringify(v),block:()=>blocked=true};
}
test('successful save persists a leap-day calculation and reports success',()=>{const h=harness();h.handlers.save();assert.equal(h.getData()[0].d1,'2000-02-29');assert.ok(h.messages[0].includes('сохранено'));});
test('failed save reports failure without success or lost entries',()=>{const h=harness();h.setData([{label:'Existing',mode:'single',d1:'1999-01-01',d2:null}]);h.block();h.handlers.save();assert.equal(h.getData().length,1);assert.equal(h.getData()[0].label,'Existing');assert.ok(h.messages.every(x=>!x.includes('сохранено')));assert.match(h.messages[0],/Не удалось/);});
test('failed deletion preserves saved entries and reports failure',()=>{const h=harness();h.setData([{label:'Existing'}]);h.block();h.handlers.del();assert.equal(h.getData().length,1);assert.match(h.messages[0],/Не удалось/);});
