import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, copyFile, symlink, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:net';
import http from 'node:http';
test('HTTP server confines decoded paths and symlinks to public', async () => {
 const dir=await mkdtemp(join(tmpdir(),'static-security-'));
 const reservation=createServer(); reservation.listen(0,'127.0.0.1'); await once(reservation,'listening');
 const port=reservation.address().port; await new Promise(r=>reservation.close(r));
 let child;
 try {
  await mkdir(join(dir,'public')); await mkdir(join(dir,'public-private'));
  await writeFile(join(dir,'public/index.html'),'PUBLIC'); await writeFile(join(dir,'public-private/secret.txt'),'SECRET');
  await symlink('../public-private/secret.txt',join(dir,'public/leak.txt'));
  await copyFile(new URL('../server.js',import.meta.url),join(dir,'server.mjs'));
  child=spawn(process.execPath,[join(dir,'server.mjs')],{env:{...process.env,PORT:String(port),HOST:'127.0.0.1'}});
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('Server exited');})]);
  const get=path=>new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,body}));}).on('error',reject);});
  assert.deepEqual(await get('/'),{status:200,body:'PUBLIC'});
  for(const path of ['/..%2fpublic-private/secret.txt','/leak.txt']) {const r=await get(path);assert.equal(r.status,403);assert.ok(!r.body.includes('SECRET'));}
  for(const path of ['/%ZZ','/%00','/%5c..%5csecret.txt']) assert.equal((await get(path)).status,400);
  assert.equal((await get('/missing')).status,404); assert.equal((await get('/health')).status,200);
 } finally { if(child){child.kill();await once(child,'exit');} await rm(dir,{recursive:true,force:true}); }
});
