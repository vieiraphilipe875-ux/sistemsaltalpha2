"use server";
import { deleteSession } from "@/lib/auth";
import { redirect } from "next/navigation";
export async function logout() { await deleteSession(); redirect("/"); }
