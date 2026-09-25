// Reproducible, local-only product captures. Never uses hosted data or mail.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readdir,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium,expect} from '@playwright/test';
import sharp from 'sharp';
const dir=await mkdtemp(join(tmpdir(),'postito-marketing-'));
const base='http://127.0.0.1:3100';
const env={...process.env,DATABASE_URL:'',MAIL_TRANSPORT:'local',APP_URL:base,POSTITO_LOCAL_DB:dir+'/postgres',POSTITO_MAIL_DIR:dir+'/mail',POSTITO_STORAGE_DIR:dir+'/files'};
delete env.VERCEL;delete env.SUPABASE_URL;delete env.SUPABASE_SERVICE_ROLE_KEY;
const run=args=>new Promise((resolve,reject)=>{const child=spawn(process.execPath,args,{env,stdio:'inherit'});child.on('exit',code=>code?reject(new Error('Fixture command failed: '+code)):resolve());});
await run(['--import','tsx','scripts/migrate.ts']);
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3100','--hostname','127.0.0.1'],{env,stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
const password='Marketing-Fixture-2026!';
class Person {
 constructor(email,name){this.email=email;this.name=name;this.cookie='';}
 async request(path,data){const response=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,...(this.cookie?{Cookie:this.cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},body:data?JSON.stringify(data):undefined});const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));return result;}
 action(action,values={}){return this.request('/api/actions',{action,...values});}
 workspace(){return this.request('/api/workspace');}
}
async function register(person,profession){await person.request('/api/auth/signup',{email:person.email,name:person.name,password,profession});let html;for(const name of await readdir(dir+'/mail')){const mail=JSON.parse(await readFile(dir+'/mail/'+name,'utf8'));if(mail.to===person.email)html=mail.html;}const code=html?.match(/>(\d{6})<\/p>/)?.[1];assert(code);await person.request('/api/auth/verify',{email:person.email,code});}
let browser;
try {
 for(let i=0;i<120;i++){try{if((await fetch(base+'/login')).ok)break;}catch{}if(i===119)throw new Error('Local fixture server did not start');await new Promise(r=>setTimeout(r,500));}
 const owner=new Person('sofia@postito.example.invalid','Sofia Andrade');await register(owner,'manager');
 await owner.action('createAgency',{name:'Casa Criativa'});
 const team=[new Person('lia@postito.example.invalid','Lia Costa'),new Person('davi@postito.example.invalid','Davi Reis'),new Person('tomas@postito.example.invalid','Tomás Mello')];
 for(const [index,person] of team.entries()){await register(person,['designer','copywriter','social'][index]);const invite=await owner.action('inviteMember',{email:person.email,role:'editor',clientAccessMode:'all'});await person.action('acceptInvite',{token:new URL(invite.link).searchParams.get('invite')});}
 const now=new Date(),month=now.toISOString().slice(0,7),period=now.toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
 const clients=[];for(const [index,name] of ['Ateliê Lume','Botânica','Forma','Sereno'].entries())clients.push(await owner.action('createClient',{name,handle:['@atelielume','@botanica','@forma','@sereno'][index],period,revenue:[480000,360000,520000,280000][index],dueDay:28}));
 const people=(await owner.workspace()).members;
 const titles=['Campanha: uma nova estação','Roteiro de lançamento','Carrossel de apresentação','Stories da semana','Manifesto da marca','Bastidores da coleção','Conteúdo para a comunidade','Design do próximo encontro','Editorial de primavera','Novos caminhos','Pauta de outubro','Detalhes que fazem a diferença','Guia de boas-vindas','Campanha institucional','Nossa forma de criar','Um novo olhar'];
 for(const [index,title] of titles.entries()){
  const assignee=people[index%people.length];const due=new Date(now);due.setDate(now.getDate()+(index%7)-1);due.setHours(17,0,0,0);
  const task=await owner.action('createDeliverable',{boardId:clients[index<8?0:(index%3)+1].boardId,title,kind:['carousel','reels','static','stories'][index%4],slideCount:index%4===0?5:1,assigneeId:assignee.id,dueAt:due.toISOString(),notes:'Demanda de demonstração. Alinhar mensagem, direção visual e prazo com a equipe.'});
  const status=['briefing','production','review','approved','production'][index%5];if(status!=='briefing')await owner.action('updateDeliverable',{id:task.id,status});
 }
 for(const [index,company] of ['Nativa','Casa Coral','Estúdio Horizonte','Alva','Órbita','Flora'].entries()){
  const deal=await owner.action('createCrmDeal',{company,value:[480000,320000,680000,280000,550000,390000][index],nextAction:['Apresentar proposta','Alinhar briefing','Reunião de descoberta'][index%3]});
  await owner.action('updateCrmDeal',{id:deal.id,stage:['discovery','solution','proposal','negotiation','decision','contract'][index]});
 }
 for(const [index,description] of ['Ferramentas de criação','Produção de conteúdo','Serviços de apoio'].entries())await owner.action('createTransaction',{type:'expense',amount:[49000,180000,65000][index],category:'Operação',status:index===0?'paid':'open',competence:month,dueDate:month+'-28',clientId:null,recurring:false,description});
 const ws=await owner.workspace();for(const tx of ws.transactions.filter(tx=>tx.type==='income'&&tx.competence===month).slice(0,2))await owner.action('updateTransaction',{id:tx.id,status:'paid'});
 browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1600,height:1050},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'});
 const [cookieName,...cookieValue]=owner.cookie.split('=');await context.addCookies([{name:cookieName,value:cookieValue.join('='),url:base}]);
 const page=await context.newPage();await mkdir('public/marketing',{recursive:true});await mkdir('evidence',{recursive:true});
 async function capture(name){await page.evaluate(()=>document.fonts.ready);await page.locator('.workspace-content').waitFor();await sharp(await page.screenshot({animations:'disabled',fullPage:false})).webp({quality:88}).toFile('public/marketing/'+name+'.webp');console.log('Captured '+name);}
 await page.goto(base);await expect(page.getByRole('heading',{name:/Sofia/})).toBeVisible();await capture('visao-geral');
 await page.goto(base+'/?client='+clients[0].clientId);await expect(page.getByRole('heading',{name:'Ateliê Lume',exact:true})).toBeVisible();await capture('pautas');
 await page.getByRole('button',{name:'CRM comercial',exact:true}).click();await page.getByRole('tab',{name:'Oportunidades',exact:true}).click();await capture('crm');
 await page.getByRole('button',{name:'Financeiro',exact:true}).click();await capture('financeiro');
 await context.close();const publicContext=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',reducedMotion:'reduce'});const landing=await publicContext.newPage();await landing.goto(base);await expect(landing.getByRole('heading',{level:1})).toContainText('Sua agência.');await landing.evaluate(()=>document.fonts.ready);await landing.screenshot({path:'evidence/redesign-v4-landing-desktop.png',fullPage:true,animations:'disabled'});
 await landing.goto(base+'/login');await expect(landing.getByLabel('E-mail',{exact:true})).toBeEnabled();await landing.screenshot({path:'evidence/redesign-v4-login-desktop.png',fullPage:true,animations:'disabled'});
 await landing.setViewportSize({width:390,height:844});await landing.goto(base);await landing.screenshot({path:'evidence/redesign-v4-landing-mobile.png',fullPage:true,animations:'disabled'});await publicContext.close();
 await writeFile('public/marketing/README.md','Capturas reais da interface Postito com dados inteiramente fictícios, geradas por scripts/capture-marketing.mjs em banco e caixa postal locais isolados. Nenhum dado de usuário real.\n');
 console.log('Marketing captures generated using isolated fixtures.');
} finally {await browser?.close();server.kill('SIGTERM');await writeFile(dir+'/server.log',log);console.log('Local capture log: '+dir+'/server.log');}
