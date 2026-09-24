"use client";
import {useId,useState} from "react";
import {UserPlus,Search,Copy,Check,Link2,Mail} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogFooter} from "@/components/ui/dialog";
import {roleLabels,professionLabels,rolePermissionDefaults,permissionKeys,type PermissionKey} from "@/lib/permissions";
import type {Member,WorkspaceData} from "@/lib/workspace-types";
const permissionLabels:Record<PermissionKey,string>={"clients.view":"Visualizar clientes","clients.manage":"Gerenciar clientes","demands.create":"Criar e editar demandas","demands.execute":"Produzir demandas","crm.access":"Acessar CRM","finance.access":"Acessar financeiro"};
type Props={data:WorkspaceData;postAction:(p:object,s?:string)=>Promise<unknown>};
export function AccessFields({data,role,setRole,scope,setScope,clientIds,setClientIds,permissions,setPermissions}:PropsWithoutAction&{role:Member["role"];setRole:(v:Member["role"])=>void;scope:"all"|"selected";setScope:(v:"all"|"selected")=>void;clientIds:string[];setClientIds:(v:string[])=>void;permissions:PermissionKey[];setPermissions:(v:PermissionKey[])=>void}){
 const [search,setSearch]=useState("");
 const selectionHintId=useId();
 const selectedCount=data.clients.filter(c=>clientIds.includes(c.id)).length;
 const allSelected=data.clients.length>0&&selectedCount===data.clients.length;
 const partlySelected=selectedCount>0&&!allSelected;
 const visibleClients=data.clients.filter(c=>c.name.toLowerCase().includes(search.trim().toLowerCase()));
 return <div className="access-fields">
  <label>Permissão<select aria-label="Permissão" value={role} onChange={e=>{const next=e.target.value as Member["role"];setRole(next);setPermissions(rolePermissionDefaults[next]||[]);}}>{data.currentMember.role==="manager"&&<option value="admin">Administrador</option>}<option value="editor">Editor</option><option value="viewer">Leitor</option></select></label>
  {role==="admin"?<p className="notice">Administradores têm acesso a todos os clientes e funções desta agência.</p>:<label>Escopo de clientes<select aria-label="Escopo de clientes" value={scope} onChange={e=>setScope(e.target.value as "all"|"selected")}><option value="selected">Somente clientes selecionados e demandas atribuídas</option><option value="all">Todos os clientes atuais e futuros da agência</option></select></label>}
  {role!=="admin"&&scope==="all"&&<p className="mt-3 text-sm text-muted-foreground">O acesso inclui automaticamente os novos clientes cadastrados nesta agência.</p>}
  {role!=="admin"&&scope==="selected"&&<fieldset>
   <legend>Clientes liberados</legend>
   <Input aria-label="Buscar cliente para liberar" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar cliente para liberar..."/>
   <div className="mt-3 rounded-xl border bg-muted/40 px-3 py-2">
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
     <input type="checkbox" checked={allSelected} aria-checked={partlySelected?"mixed":allSelected} aria-describedby={selectionHintId} ref={input=>{if(input)input.indeterminate=partlySelected;}} disabled={!data.clients.length} onChange={e=>setClientIds(e.target.checked?data.clients.map(c=>c.id):[])}/>
     Selecionar todos os clientes
    </label>
    <p className="mt-1 text-xs text-muted-foreground" aria-live="polite">{selectedCount} de {data.clients.length} clientes selecionados</p>
   </div>
   <p id={selectionHintId} className="mt-2 text-xs text-muted-foreground">Seleciona os clientes atuais, inclusive fora da busca. Novos clientes precisam ser liberados depois.</p>
   <div className="scope-list">{visibleClients.map(c=><label key={c.id}><input type="checkbox" checked={clientIds.includes(c.id)} onChange={e=>setClientIds(e.target.checked?[...clientIds,c.id]:clientIds.filter(id=>id!==c.id))}/>{c.name}</label>)}{!data.clients.length?<p className="text-sm text-muted-foreground">Nenhum cliente cadastrado. Você poderá liberar clientes depois.</p>:!visibleClients.length&&<p className="text-sm text-muted-foreground">Nenhum cliente encontrado nesta busca.</p>}</div>
  </fieldset>}
  {role==="editor"&&<fieldset><legend>O que a pessoa poderá fazer</legend><div className="permission-grid">{permissionKeys.map(p=><label key={p}><input type="checkbox" checked={permissions.includes(p)} onChange={e=>setPermissions(e.target.checked?[...permissions,p]:permissions.filter(v=>v!==p))}/>{permissionLabels[p]}</label>)}</div></fieldset>}
  <p className="text-xs text-muted-foreground">O cargo profissional fica no perfil da pessoa. Estas permissões valem apenas nesta agência.</p>
 </div>;
}
type PropsWithoutAction={data:WorkspaceData};
type InviteResult={link:string;delivery:"link"|"email";emailStatus:"accepted"|"not_requested";recipient?:string};
export function InviteDialog({open,onOpenChange,data,postAction}:Props&{open:boolean;onOpenChange:(v:boolean)=>void}){
 const [email,setEmail]=useState(""),[delivery,setDelivery]=useState<"link"|"email">("email"),[role,setRole]=useState<Member["role"]>("editor"),[scope,setScope]=useState<"all"|"selected">("selected"),[clientIds,setClientIds]=useState<string[]>([]),[permissions,setPermissions]=useState<PermissionKey[]>(rolePermissionDefaults.editor),[busy,setBusy]=useState(false),[invitation,setInvitation]=useState<InviteResult|null>(null);
 async function submit(){
  if(busy)return;
  setBusy(true);
  const recipient=email.trim();
  try{
   const result=await postAction({action:"inviteMember",email:recipient||undefined,delivery,role,clientAccessMode:scope,clientIds,permissions}) as InviteResult;
   setInvitation({...result,recipient});
   toast.success(result.emailStatus==="accepted"?"Convite encaminhado por e-mail":"Link de convite criado");
  }catch(e){toast.error((e as Error).message);}finally{setBusy(false);}
 }
 return <Dialog open={open} onOpenChange={v=>{onOpenChange(v);if(!v)setInvitation(null);}}>
  <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
   <DialogHeader><DialogTitle>Convidar para {data.agency.name}</DialogTitle><DialogDescription>Uma conta pode participar de várias agências. Este convite vale por 7 dias e aceita uma pessoa.</DialogDescription></DialogHeader>
   {invitation?<div className="space-y-4">
    <p className="notice" role="status"><Check size={16}/>{invitation.delivery==="email"&&invitation.emailStatus==="accepted"?`Convite encaminhado para ${invitation.recipient}. Se não chegar, confira a pasta de spam ou compartilhe o link abaixo.`:"Link criado. Nenhum e-mail foi enviado. Compartilhe o link com a pessoa convidada."}</p>
    <label>Link do convite<Input value={invitation.link} readOnly onFocus={e=>e.target.select()}/></label>
    <Button onClick={async()=>{try{await navigator.clipboard.writeText(invitation.link);toast.success("Link copiado");}catch{toast.info("Selecione e copie o link acima.");}}}><Copy size={16}/>Copiar link</Button>
    <Button variant="outline" onClick={()=>{setInvitation(null);setEmail("");}}>Criar outro convite</Button>
   </div>:<>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Como enviar o convite">
     <Button aria-pressed={delivery==="email"} variant={delivery==="email"?"default":"outline"} onClick={()=>setDelivery("email")}><Mail size={16}/>Enviar por e-mail</Button>
     <Button aria-pressed={delivery==="link"} variant={delivery==="link"?"default":"outline"} onClick={()=>setDelivery("link")}><Link2 size={16}/>Gerar link</Button>
    </div>
    <p className="text-sm text-muted-foreground">{delivery==="email"?"O convite será enviado para o e-mail informado abaixo.":"Gerar um link não envia e-mail. Preencher o e-mail abaixo apenas restringe quem pode aceitar o convite."}</p>
    <label>E-mail {delivery==="link"?"(opcional, restringe quem pode aceitar)":""}<Input value={email} type="email" onChange={e=>setEmail(e.target.value)} placeholder="pessoa@agencia.com"/></label>
    <AccessFields data={data} role={role} setRole={setRole} scope={scope} setScope={setScope} clientIds={clientIds} setClientIds={setClientIds} permissions={permissions} setPermissions={setPermissions}/>
    <DialogFooter><Button variant="ghost" onClick={()=>onOpenChange(false)}>Cancelar</Button><Button disabled={busy||(delivery==="email"&&!email.includes("@"))} onClick={submit}>{busy?"Criando...":delivery==="email"?"Enviar convite":"Gerar link de convite"}</Button></DialogFooter>
   </>}
  </DialogContent>
 </Dialog>;
}
export function TeamPanel({data,postAction,onInvite}:Props&{onInvite:()=>void}){
 const [query,setQuery]=useState(""),[editing,setEditing]=useState<Member|null>(null),[role,setRole]=useState<Member["role"]>("editor"),[scope,setScope]=useState<"all"|"selected">("selected"),[clientIds,setClientIds]=useState<string[]>([]),[permissions,setPermissions]=useState<PermissionKey[]>([]),[busy,setBusy]=useState(false);
 function edit(m:Member){setEditing(m);setRole(m.role);setScope(m.clientAccessMode);setPermissions(m.permissions);setClientIds(data.clientMembers.filter(g=>g.memberId===m.id).map(g=>g.clientId));}
 async function save(status="active"){if(!editing)return;setBusy(true);try{await postAction({action:"updateMember",id:editing.id,role,status,clientIds,clientAccessMode:scope,permissions},"Acesso atualizado");setEditing(null);}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}}
 const pending=data.invites.filter(i=>!i.usedAt&&!i.revokedAt&&i.expiresAt>new Date().toISOString());
 return <section className="team-view"><div className="section-heading"><div><p className="eyebrow">PESSOAS & PERMISSÕES</p><h1>Pessoas e acessos</h1><p>Controle quem participa de {data.agency.name} e o que cada pessoa pode acessar.</p></div><Button onClick={onInvite}><UserPlus size={16}/>Convidar pessoa</Button></div><div className="team-toolbar"><div className="team-search"><Search size={17} aria-hidden="true"/><Input aria-label="Buscar pessoa ou profissão" placeholder="Buscar pessoa ou profissão..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="team-counts"><span>{data.members.filter(m=>m.status==="active").length} pessoas ativas</span><span>{pending.length} convites pendentes</span></div></div><div className="team-table"><div className="team-table-heading">EQUIPE DA AGÊNCIA</div>{data.members.filter(m=>`${m.name} ${m.email} ${professionLabels[m.profession]}`.toLowerCase().includes(query.toLowerCase())).map(m=><div className="team-row" data-inactive={m.status==="inactive"} key={m.id}><span className="picker-avatar">{m.name.slice(0,1)}</span><div className="min-w-0 flex-1"><strong>{m.name}</strong><p className="truncate text-sm text-muted-foreground">{m.email}</p></div><span className="hidden text-sm text-muted-foreground md:block">{professionLabels[m.profession]||m.profession}</span><span className="role-label">{m.status==="inactive"?"Inativo":roleLabels[m.role]}</span>{m.role!=="manager"&&(m.role!=="admin"||data.currentMember.role==="manager")&&m.id!==data.currentMember.id&&<Button variant="outline" size="sm" onClick={()=>edit(m)}>Editar acesso</Button>}</div>)}{!data.members.some(m=>`${m.name} ${m.email} ${professionLabels[m.profession]}`.toLowerCase().includes(query.toLowerCase()))&&<p className="team-empty">Nenhuma pessoa encontrada. Tente outro nome ou profissão.</p>}</div>
 <div className="team-invites"><h2 className="text-lg font-semibold">Convites pendentes <span className="text-muted-foreground">{pending.length}</span></h2>{!pending.length&&<p className="mt-3 text-sm text-muted-foreground">Nenhum convite aguardando aceite.</p>}{pending.map(i=><div className="team-row mt-2" key={i.id}><Link2 size={16}/><div className="flex-1"><strong className="text-sm">{i.email||"Convite por link"}</strong><p className="text-xs text-muted-foreground">{roleLabels[i.role]} · Expira em {new Date(i.expiresAt).toLocaleDateString("pt-BR")}</p></div><Button variant="ghost" onClick={async()=>{try{await postAction({action:"revokeInvite",id:i.id},"Convite revogado");}catch(e){toast.error((e as Error).message);}}}>Revogar</Button></div>)}</div>
 <Dialog open={!!editing} onOpenChange={v=>!v&&setEditing(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>Acesso de {editing?.name}</DialogTitle><DialogDescription>Alterações afetam somente esta agência.</DialogDescription></DialogHeader><AccessFields data={data} role={role} setRole={setRole} scope={scope} setScope={setScope} clientIds={clientIds} setClientIds={setClientIds} permissions={permissions} setPermissions={setPermissions}/><DialogFooter><Button variant="outline" disabled={busy} onClick={()=>save(editing?.status==="inactive"?"active":"inactive")}>{editing?.status==="inactive"?"Reativar acesso":"Inativar acesso"}</Button><Button disabled={busy} onClick={()=>save(editing?.status||"active")}>{busy?"Salvando...":"Salvar permissões"}</Button></DialogFooter></DialogContent></Dialog></section>;
}
