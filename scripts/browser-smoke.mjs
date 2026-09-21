import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base='http://127.0.0.1:3000';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1'],{env:{...process.env,MAIL_TRANSPORT:'local',APP_URL:base},stdio:['ignore','pipe','pipe']});
let log=''; server.stdout.on('data',x=>log+=x); server.stderr.on('data',x=>log+=x);
const run=(args)=>new Promise((resolve,reject)=>{const p=spawn('npx',['--yes','agent-browser',...args],{env:{...process.env,AGENT_BROWSER_EXECUTABLE_PATH:chromium.executablePath()},stdio:['ignore','pipe','pipe']});let out='';p.stdout.on('data',x=>out+=x);p.stderr.on('data',x=>out+=x);p.on('exit',code=>code?reject(new Error(out)):resolve(out));});
try{
 for(let i=0;i<120;i++){try{if((await fetch(base)).ok)break;}catch{}if(i===119)throw new Error('Servidor indisponível: '+log);await new Promise(r=>setTimeout(r,500));}
 await mkdir('evidence',{recursive:true});
 const browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(base);await page.getByRole('heading').first().waitFor();
 console.log(await page.locator('body').innerText());
 await page.screenshot({path:'evidence/login-desktop.png',fullPage:true});
 await browser.close();

}finally{server.kill('SIGTERM');await writeFile('evidence/smoke-server.log',log).catch(()=>{});}
