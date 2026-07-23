import type { Metadata } from "next";
import { DigitalServiceApp } from "./DigitalServiceApp";

export const metadata: Metadata = {
  description:
    "Verified July 2026 service reports for Changi General Hospital and Tuas Power Generation.",
};

export default function Home() {
  return <DigitalServiceApp />;
}
