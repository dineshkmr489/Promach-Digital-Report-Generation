import type { Metadata } from "next";
import { readWorkspace } from "../server/database.ts";
import { ClientSigningApp } from "./ClientSigningApp";
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
  const workspace = await readWorkspace();
  return (
    <DigitalServiceApp
      adminName={process.env.ADMIN_NAME?.trim() || "Promach Admin"}
      adminEmail={process.env.ADMIN_EMAIL?.trim() || "admin@promach.local"}
      initialWorkspace={workspace}
    />
  );
}
