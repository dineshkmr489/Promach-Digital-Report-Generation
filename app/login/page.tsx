import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Administrator sign in | Promach DSR",
  description: "Secure administrator access to Promach Digital Service Reports.",
};

export const dynamic = "force-dynamic";

function safeNextPath(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (
    candidate?.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.startsWith("/login")
  ) {
    return candidate;
  }
  return "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  return <LoginForm nextPath={safeNextPath(params.next)} />;
}
