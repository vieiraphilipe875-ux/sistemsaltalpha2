import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { members, sessions, agencyMemberships } from "@/db/schema";
import { digest, randomToken } from "./security";
export {hashPassword, verifyPassword} from "./security";

export async function createSession(userId:string) {
  const token=randomToken(), now=new Date().toISOString();
  const expiresAt=new Date(Date.now()+7*86400000).toISOString();
  const [membership]=await getDb().select().from(agencyMemberships).where(and(eq(agencyMemberships.memberId,userId),eq(agencyMemberships.status,"active"))).limit(1);
  await getDb().insert(sessions).values({tokenHash:digest(token),memberId:userId,agencyId:membership?.agencyId || null,createdAt:now,expiresAt});
  (await cookies()).set("postito_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:new Date(expiresAt)});
}
export async function verifySession() {
  const token=(await cookies()).get("postito_session")?.value;
  if (!token) return null;
  const [row]=await getDb().select({session:sessions,user:members}).from(sessions).innerJoin(members,eq(sessions.memberId,members.id)).where(and(eq(sessions.tokenHash,digest(token)),gt(sessions.expiresAt,new Date().toISOString()))).limit(1);
  if (!row || row.user.status!=="active" || !row.user.emailVerifiedAt) return null;
  return {userId:row.user.id,agencyId:row.session.agencyId,tokenHash:row.session.tokenHash,user:row.user};
}
export async function deleteSession() {
  const jar=await cookies(),token=jar.get("postito_session")?.value;
  if(token) await getDb().delete(sessions).where(eq(sessions.tokenHash,digest(token)));
  jar.delete("postito_session");
}
export async function switchAgency(agencyId:string) {
  const session=await verifySession();
  if(!session) return false;
  const [membership]=await getDb().select().from(agencyMemberships).where(and(eq(agencyMemberships.agencyId,agencyId),eq(agencyMemberships.memberId,session.userId),eq(agencyMemberships.status,"active"))).limit(1);
  if(!membership) return false;
  await getDb().update(sessions).set({agencyId}).where(eq(sessions.tokenHash,session.tokenHash));
  return true;
}
