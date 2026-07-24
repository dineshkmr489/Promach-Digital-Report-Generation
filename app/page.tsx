import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClientSigningApp } from "./ClientSigningApp";
import { getChatGPTUser, requireChatGPTUser } from "./chatgpt-auth";
import { DigitalServiceApp } from "./DigitalServiceApp";

export const metadata: Metadata = {
  description:
    "Create, share, digitally sign, and archive Promach service reports.",
};

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sign?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = Array.isArray(params.sign) ? params.sign[0] : params.sign;
  if (token) return <ClientSigningApp token={token} />;
  return <AuthenticatedAdmin />;
}

async function AuthenticatedAdmin() {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "";
  const local = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const user = local
    ? (await getChatGPTUser()) ?? {
        displayName: "Promach Admin",
        email: "local-admin@promach.local",
        fullName: "Promach Admin",
      }
    : await requireChatGPTUser("/");

  return (
    <DigitalServiceApp adminName={user.displayName} adminEmail={user.email} />
  );
}
