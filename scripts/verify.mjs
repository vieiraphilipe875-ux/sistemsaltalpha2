import {spawn} from 'node:child_process';
import {mkdir,mkdtemp,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {runFlows} from '../tests/flows.mjs';
const dir=await mkdtemp(join(tmpdir(),'postito-qa-')),base='http://127.0.0.1:3100';
const env={...process.env,DATABASE_URL:'',MAIL_TRANSPORT:'local',APP_URL:base,POSTITO_LOCAL_DB:dir+'/postgres',POSTITO_MAIL_DIR:dir+'/mail',POSTITO_STORAGE_DIR:dir+'/files'};
delete env.VERCEL;delete env.SUPABASE_URL;delete env.SUPABASE_SERVICE_ROLE_KEY;
await mkdir(dir,{recursive:true});await mkdir('evidence',{recursive:true});
const child=(args)=>new Promise((resolve,reject)=>{const c=spawn(process.execPath,args,{env,stdio:'inherit'});c.on('exit',code=>code?reject(new Error('Comando terminou com '+code)):resolve());});
await child(['--import','tsx','scripts/migrate.ts']);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3100','--hostname','127.0.0.1'],{env,stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
const results=[];
async function check(name,fn){try{await fn();results.push({name,status:'passed'});console.log('PASS '+name);}catch(e){results.push({name,status:'failed',error:e.message});throw e;}}
try{
 for(let i=0;i<120;i++){try{const r=await fetch(base);if(r.ok)break;}catch{}if(i===119)throw new Error('Servidor não iniciou');await new Promise(r=>setTimeout(r,500));}
 const state=await runFlows({base,mailDir:env.POSTITO_MAIL_DIR,check});
 if(process.argv.includes('--browser')){const {runBrowser}=await import('../tests/browser.mjs');await runBrowser({base,state,check});}
 console.log(`${results.length} cenários completos aprovados.`);
}catch(e){console.error(e);process.exitCode=1;}
finally{
 server.kill('SIGTERM');
 await writeFile(dir+'/server.log',log);
 await writeFile('evidence/results.json',JSON.stringify({date:new Date().toISOString(),mode:'local PostgreSQL (PGlite), caixa de e-mail local',results},null,2));
 console.log('Log privado de diagnóstico: '+dir+'/server.log');
}
