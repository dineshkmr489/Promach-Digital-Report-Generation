import type { Metadata } from "next";
import { DigitalServiceApp } from "./DigitalServiceApp";

export const metadata: Metadata = {
  description:
    "Create, review, sign, and archive professional equipment service reports.",
};

export default function Home() {
  return <DigitalServiceApp />;
}
