import { redirect } from "next/navigation";
import { getManager } from "@/lib/fantasy/session";

/** On the join and sign-in pages: someone already signed in goes straight to fantasy. */
export async function SignedInGoHome() {
  if (await getManager()) redirect("/fantasy");
  return null;
}
