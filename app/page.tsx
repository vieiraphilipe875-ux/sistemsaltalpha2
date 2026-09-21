import {WorkspaceClient} from "@/components/workspace-client";
import {AuthForm} from "@/components/auth-form";
import {AuthShell} from "@/components/auth-shell";
import {Onboarding} from "@/components/onboarding";
import {getWorkspaceData,getAgencyList} from "@/lib/server-workspace";
import {verifySession} from "@/lib/auth";
export const dynamic="force-dynamic";
export default async function Home({searchParams}:{searchParams:Promise<{invite?:string;client?:string}>}){
 const query=await searchParams,session=await verifySession();
 if(!session)return <AuthShell><AuthForm invite={query.invite}/></AuthShell>;
 const data=await getWorkspaceData();
 if(query.invite||!data)return <main className="onboarding-shell"><Onboarding name={session.user.name} invite={query.invite} agencies={await getAgencyList(session.userId)}/></main>;
 return <WorkspaceClient key={data.agency.id} initialData={data} initialClientId={query.client}/>;
}
