import type { Metadata, Viewport } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const bodyFont = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
});

const displayFont = Manrope({
  variable: "--font-display",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "promach-dsr.openai.site";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const baseUrl = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/og-workflow.png", baseUrl).toString();

  return {
    metadataBase: baseUrl,
    title: "Promach DSR | Digital Service Reports",
    description:
      "Create, share, digitally sign, and archive Promach service reports.",
    icons: {
      icon: "/favicon.png",
      shortcut: "/favicon.png",
    },
    openGraph: {
      type: "website",
      title: "Promach DSR",
      description: "Create once. Share securely. Sign digitally.",
      images: [{ url: socialImage, width: 1727, height: 911 }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Promach DSR",
      description: "Create once. Share securely. Sign digitally.",
      images: [socialImage],
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#12382e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${bodyFont.variable} ${displayFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
