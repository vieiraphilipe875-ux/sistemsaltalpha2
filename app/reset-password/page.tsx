import {AuthForm} from "@/components/auth-form";
import {AuthShell} from "@/components/auth-shell";
export default async function Reset({searchParams}:{searchParams:Promise<{id?:string;token?:string}>}){const p=await searchParams;return <AuthShell><AuthForm initialView="reset" resetId={p.id} resetToken={p.token}/></AuthShell>}
