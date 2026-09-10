"use server";

import { redirect } from "next/navigation";
import { deleteAuthSession } from "@/server/auth";

export async function logout() {
  await deleteAuthSession();
  redirect("/login");
}
