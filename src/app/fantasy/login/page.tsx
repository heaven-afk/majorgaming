import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/fantasy/game/AuthForms";
import { AuthCard } from "@/components/fantasy/game/Chrome";
import { SignedInGoHome } from "@/components/fantasy/game/SignedIn";
import { fantasyPage } from "@/content/fantasy";
import { preview } from "@/lib/fantasy/preview";

export const metadata: Metadata = { title: "Sign in · MGL Fantasy" };

async function Form({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm next={next ?? "/fantasy"} previewing={preview} />;
}

export default function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const c = fantasyPage.auth.login;
  return (
    <>
      <Suspense>
        <SignedInGoHome />
      </Suspense>
      <AuthCard title={c.title} lede={c.lede}>
        <Suspense>
          <Form searchParams={searchParams} />
        </Suspense>
      </AuthCard>
    </>
  );
}
