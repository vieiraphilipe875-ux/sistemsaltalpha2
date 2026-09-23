"use client";
import {useState} from "react";
import {ChangePasswordForm} from "./change-password-form";
import {Plus,Building2,Check,Search,FolderOpen,ArrowRight} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
import {professionLabels} from "@/lib/permissions";
import type {WorkspaceData} from "@/lib/workspace-types";
import {toast} from "sonner";
export function AgencySwitcher({data}:{data:WorkspaceData}){
 const [open,setOpen]=useState(false),[name,setName]=useState(""),[busy,setBusy]=useState(false);
 async function act(p:object){setBusy(true);try{const r=await fetch("/api/actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});const body=await r.json();if(!r.ok)throw new Error(body.error);window.location.assign("/");}catch(e){toast.error((e as Error).message);setBusy(false);}}
 return <div className="agency-switcher"><label htmlFor="agency-switch">ESPAÇO ATUAL</label><div className="flex items-center gap-2"><Building2 size={15}/><select id="agency-switch" aria-label="Trocar agência" value={data.agency.id} disabled={busy} onChange={e=>void act({action:"switchAgency",agencyId:e.target.value})}>{data.agencies.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button onClick={()=>setOpen(true)} aria-label="Criar outra agência"><Plus size={16}/></button></div><Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>Criar outra agência</DialogTitle><DialogDescription>A nova agência terá clientes, equipe e financeiro próprios.</DialogDescription></DialogHeader><label>Nome da agência<Input value={name} onChange={e=>setName(e.target.value)}/></label><DialogFooter><Button disabled={busy||name.trim().length<2} onClick={()=>act({action:"createAgency",name})}>Criar agência</Button></DialogFooter></DialogContent></Dialog></div>;
}
export function ProfileDialog({open,onOpenChange,data,reload}:{open:boolean;onOpenChange:(v:boolean)=>void;data:WorkspaceData;reload:()=>Promise<void>}){
 const [name,setName]=useState(data.currentMember.name),[profession,setProfession]=useState(data.currentMember.profession),[busy,setBusy]=useState(false),[changingPassword,setChangingPassword]=useState(false);
 async function save(){setBusy(true);try{const r=await fetch("/api/auth/profile",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,profession})});const b=await r.json();if(!r.ok)throw new Error(b.error);await reload();toast.success("Perfil atualizado");onOpenChange(false);}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
 return <Dialog open={open} onOpenChange={value=>{onOpenChange(value);if(!value)setChangingPassword(false);}}><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{changingPassword?"Alterar sua senha":"Seu perfil"}</DialogTitle><DialogDescription>{changingPassword?"Confirme a senha atual para proteger sua conta em todas as agências.":"Seu nome e profissão acompanham sua conta em todas as agências."}</DialogDescription></DialogHeader>{changingPassword?<ChangePasswordForm onCancel={()=>setChangingPassword(false)}/>:<><label>Nome<Input value={name} onChange={e=>setName(e.target.value)}/></label><label>Profissão<select className="profile-select" value={profession} onChange={e=>setProfession(e.target.value)}>{Object.entries(professionLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select></label><p className="text-sm text-muted-foreground">{data.currentMember.email}</p><DialogFooter><Button variant="outline" onClick={()=>setChangingPassword(true)}>Alterar senha</Button><Button disabled={busy||name.trim().length<2} onClick={save}>{busy?"Salvando...":"Salvar perfil"}</Button></DialogFooter></>}</DialogContent></Dialog>;
}
export function GlobalSearch({data,onClient,onTask}:{data:WorkspaceData;onClient:(id:string)=>void;onTask:(id:string)=>void}){
 const [query,setQuery]=useState(""),[open,setOpen]=useState(false);
 const term=query.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu,"");
 const match=(s:string)=>s.toLocaleLowerCase("pt-BR").normalize("NFD").replace(/\p{Diacritic}/gu,"").includes(term);
 const tasks=data.deliverables.filter(t=>match(t.title)).slice(0,6),clients=data.clients.filter(c=>match(c.name)).slice(0,4);
 function select(fn:(id:string)=>void,id:string){fn(id);setQuery("");setOpen(false);}
 return <div className="global-search"><Search size={17}/><input aria-label="Buscar clientes ou demandas" placeholder="Buscar clientes ou demandas..." value={query} onChange={e=>{setQuery(e.target.value);setOpen(true);}} onFocus={()=>setOpen(true)} onKeyDown={e=>{if(e.key==="Escape")setOpen(false);}}/>{query&&open&&<div className="search-results"><p>CLIENTES</p>{clients.map(c=><button key={c.id} onClick={()=>select(onClient,c.id)}><FolderOpen size={16}/>{c.name}</button>)}<p>DEMANDAS</p>{tasks.map(t=><button key={t.id} onClick={()=>select(onTask,t.id)}><ArrowRight size={16}/>{t.title}</button>)}{!tasks.length&&!clients.length&&<span>Nenhum resultado neste espaço.</span>}<button className="text-action" onClick={()=>setOpen(false)}>Fechar busca</button></div>}</div>;
}
