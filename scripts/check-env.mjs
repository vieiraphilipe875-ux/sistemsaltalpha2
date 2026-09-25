const provider=process.env.MAIL_PROVIDER||'resend';
if(!['resend','brevo'].includes(provider)){
 console.error('MAIL_PROVIDER deve ser resend ou brevo.');process.exit(1);
}
const required=['APP_URL','DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY',...(provider==='brevo'?['BREVO_API_KEY','BREVO_FROM_EMAIL']:['RESEND_API_KEY','RESEND_FROM_EMAIL'])];
const missing=required.filter(key=>!process.env[key]);
if(missing.length){console.error('Configuração pendente: '+missing.join(', '));process.exitCode=1;}
else{
 const app=new URL(process.env.APP_URL),database=new URL(process.env.DATABASE_URL);
 if(app.protocol!=='https:'||!['postgres:','postgresql:'].includes(database.protocol)||process.env.MAIL_TRANSPORT==='local'){
  console.error('Produção exige APP_URL HTTPS, conexão PostgreSQL e envio real de e-mails.');process.exitCode=1;
 }else console.log('Variáveis presentes. Execute os testes de conexão, armazenamento e entrega de e-mail no ambiente publicado.');
}
