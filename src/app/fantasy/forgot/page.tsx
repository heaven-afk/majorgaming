import type { Metadata } from "next";
import { ForgotForm } from "@/components/fantasy/game/AuthForms";
import { AuthCard } from "@/components/fantasy/game/Chrome";
import { fantasyPage } from "@/content/fantasy";

export const metadata: Metadata = { title: "Reset your password · MGL Fantasy" };

export default function ForgotPage() {
  const c = fantasyPage.auth.forgot;
  return (
    <>
      <AuthCard title={c.title} lede={c.lede}>
        <ForgotForm />
      </AuthCard>
    </>
  );
}
