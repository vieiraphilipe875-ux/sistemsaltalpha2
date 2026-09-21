"use client";
import Link from "next/link";
import {useState} from "react";
import {ArrowRight,Building2,LogOut,Check} from "lucide-react";
import {logout} from "@/app/actions/auth";
export function Onboarding({name,invite,agencies}:{name:string;invite?:string;agencies:{id:string;name:string}[]}){
 const [agency,setAgency]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 async function act(body:object){setBusy(true);setError("");try{const response=await fetch("/api/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const r=await response.json();if(!response.ok)throw new Error(r.error);window.location.assign(r.clientId?`/?client=${r.clientId}`:"/");}catch(e){setError((e as Error).message);setBusy(false);}}
 return <div className="onboarding"><img src="/postito-logo.png" alt="Postito" width={200}/><span className="eyebrow">SEU ESPAÇO DE TRABALHO</span><h1>Olá, {name.split(" ")[0]}.</h1><p>{invite?"Você recebeu um convite para uma agência. Ao aceitar, os acessos definidos por ela serão vinculados à sua conta.":"Crie o espaço da sua agência ou aceite o link de convite enviado pela sua equipe."}</p>{error&&<p role="alert" className="form-error">{error}</p>}
 {invite?<><button className="primary-action" disabled={busy} onClick={()=>act({action:"acceptInvite",token:invite})}><Check size={18}/>Aceitar convite</button><Link className="text-action" href="/">Ir para minhas agências</Link></>:<><form onSubmit={e=>{e.preventDefault();void act({action:"createAgency",name:agency});}}><label>Nome da agência<input name="agency" required minLength={2} maxLength={100} value={agency} onChange={e=>setAgency(e.target.value)} placeholder="Como sua agência se chama?"/></label><button className="primary-action" disabled={busy}>Criar agência <ArrowRight size={18}/></button></form>{agencies.length>0&&<div className="agency-list">{agencies.map(a=><button key={a.id} disabled={busy} onClick={()=>act({action:"switchAgency",agencyId:a.id})}><Building2 size={18}/>{a.name}<ArrowRight size={16}/></button>)}</div>}</>}
 <form action={logout}><button className="text-action" type="submit"><LogOut size={14}/>Sair da conta</button></form></div>;
}
