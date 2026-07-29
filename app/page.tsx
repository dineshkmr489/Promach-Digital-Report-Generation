import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { adminIdentityFromCookieHeader } from "../server/adminAuth.ts";
import { findUser, readWorkspace } from "../server/database.ts";
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
  const requestHeaders = await headers();
  const sessionUser = adminIdentityFromCookieHeader(
    requestHeaders.get("cookie"),
  );
  if (!sessionUser) redirect("/login");
  const workspace = await readWorkspace();
  const currentUser = await findUser(sessionUser.id);
  if (!currentUser?.active) redirect("/login");
  return (
    <DigitalServiceApp
      currentUser={currentUser}
      initialWorkspace={workspace}
    />
  );
}
