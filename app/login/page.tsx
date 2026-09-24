import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { AuthShell } from "@/components/auth-shell";
import { verifySession } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Entrar | Postito" };
export default async function Login({searchParams}:{searchParams:Promise<{invite?:string}>}) {
  const {invite}=await searchParams;
  if(await verifySession()) redirect(invite?`/?invite=${encodeURIComponent(invite)}`:"/");
  return <AuthShell><AuthForm invite={invite}/></AuthShell>;
}
