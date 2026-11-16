import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomBytes,pbkdf2Sync} from 'node:crypto';
import {createServer} from 'node:net';
import {testProfile} from '../../Zentro.Front/tests/fixtures/profile.ts';
const folder=mkdtempSync(path.join(tmpdir(),'zentro-habita-'));
const listener=createServer();await new Promise(r=>listener.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+listener.address().port;await new Promise(r=>listener.close(r));
const token=randomBytes(32).toString('hex');let child,output='';
async function start(production=false){
 const salt=randomBytes(16);const hash=`pbkdf2-sha256$600000$${salt.toString('base64')}$${pbkdf2Sync('SyntheticPassword',salt,600000,32,'sha256').toString('base64')}`;
 child=spawn('dotnet',[process.env.ZENTRO_TEST_API_DLL||path.resolve('checks/habita-api/Zentro.Api.dll')],{cwd:path.resolve('Zentro.Api'),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ASPNETCORE_ENVIRONMENT:production?'Production':'Development',ASPNETCORE_URLS:base,Zentro__DatabasePath:path.join(folder,'test.db'),Zentro__BackupDirectory:path.join(folder,'backups'),Zentro__Habita__Token:token,...(production?{Zentro__Authentication__PasswordHash:hash,Zentro__Authentication__TotpSecret:'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'}:{})}});
 child.stdout.on('data',x=>output+=x);child.stderr.on('data',x=>output+=x);
 for(let i=0;i<100;i++){try{if((await fetch(base+'/api/health')).ok)return}catch{}if(child.exitCode!==null)throw Error(output);await new Promise(r=>setTimeout(r,100))}throw Error(output);
}
function stop(){if(child?.pid)spawnSync('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'})}
const endpoint='/api/integrations/habita/v1/snapshot';const auth={Authorization:'Bearer '+token};
try{
 await start();assert.equal((await fetch(base+endpoint)).status,401);
 const p=testProfile();p.monthlyNetSalary=300000;p.savingsPlacements=[{id:'deposit',name:'Synthetic deposit',kind:'deposit',amount:20000,annualRateBps:200,rateType:'tin',withholdingBps:1900,start:'2026-01-01',months:12}];
 const saved=await fetch(base+'/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(p)});assert.equal(saved.status,204);
 let r=await fetch(base+endpoint,{headers:auth});assert.equal(r.status,200);const etag=r.headers.get('etag');const s=await r.json();
 assert.equal(s.savingsTotal,51400);assert.equal(s.liquidSavings,31400);assert.equal(s.investedCapital,20000);assert.equal(s.wealth,71400);assert.equal(s.internalDebt,6000);assert.equal(s.deposits[0].maturity,'2027-01-01');assert.equal(s.monthlyNetIncome,300000);
 assert.equal(s.unit,'cents');assert(!('daily' in s));assert(!('incomes' in s));assert(!JSON.stringify(s).includes('expense'));assert.equal((await fetch(base+endpoint,{headers:{...auth,'If-None-Match':etag}})).status,304);
 assert.deepEqual(await (await fetch(base+'/api/state')).json(),p);
 stop();await start(true);
 assert.equal((await fetch(base+endpoint,{headers:auth})).status,200);
 assert.equal((await fetch(base+endpoint,{headers:{Authorization:'Bearer incorrect'}})).status,401);
 assert.equal((await fetch(base+'/api/state',{headers:auth})).status,401);
 assert.equal((await fetch(base+'/api/state',{method:'PUT',headers:{...auth,'Content-Type':'application/json','X-Zentro-Client':'web'},body:JSON.stringify(p)})).status,401);
 assert.equal((await fetch(base+endpoint,{method:'POST',headers:auth})).status,401);
 console.log('PASS: Habita read-only aggregate contract, cents, deposit separation, wealth parity, no transaction leakage, ETag, token required in development and token scoped in production.');
}finally{stop();if(path.resolve(folder).startsWith(path.resolve(tmpdir())+path.sep))rmSync(folder,{recursive:true,force:true,maxRetries:10,retryDelay:100})}
