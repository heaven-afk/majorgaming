import type { Metadata } from "next";
import { Suspense } from "react";
import { JoinForm } from "@/components/fantasy/game/AuthForms";
import { AuthCard } from "@/components/fantasy/game/Chrome";
import { SignedInGoHome } from "@/components/fantasy/game/SignedIn";
import { fantasyPage } from "@/content/fantasy";

export const metadata: Metadata = { title: "Create your manager · MGL Fantasy" };

export default function JoinPage() {
  const c = fantasyPage.auth.join;
  return (
    <>
      <Suspense>
        <SignedInGoHome />
      </Suspense>
      <AuthCard title={c.title} lede={c.lede}>
        <JoinForm />
      </AuthCard>
    </>
  );
}
