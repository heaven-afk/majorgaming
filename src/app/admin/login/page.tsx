import { redirect } from "next/navigation";
import { Suspense } from "react";
import LoginForm from "@/components/admin/LoginForm";
import { Mark } from "@/components/brand/Mark";
import { adminCopy } from "@/content/admin";
import { getAdmin } from "@/lib/admin/session";

const copy = adminCopy.login;

/** Already signed in: straight to the dashboard. */
async function SignedIn() {
  if (await getAdmin()) redirect("/admin");
  return null;
}

export default function LoginPage() {
  return (
    <main className="ad-login">
      <Suspense>
        <SignedIn />
      </Suspense>
      <div className="ad-login__card">
        <Mark size={40} tone="#f4f2ee" />
        <h1>{copy.title}</h1>
        <p>{copy.lede}</p>
        <LoginForm />
      </div>
    </main>
  );
}
