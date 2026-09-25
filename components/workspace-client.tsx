"use client";
import dynamic from 'next/dynamic';
import type {WorkspaceData} from '@/lib/workspace-types';
const Workspace=dynamic(()=>import('./pauta-app').then(m=>m.PautaApp),{ssr:false,loading:()=> <div role="status" className="grid min-h-screen place-items-center text-muted-foreground">Abrindo seu espaço…</div>});
export function WorkspaceClient(props:{initialData:WorkspaceData;initialClientId?:string}){return <Workspace {...props}/>;}
