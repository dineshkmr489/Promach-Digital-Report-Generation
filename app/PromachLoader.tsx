"use client";

import Image from "next/image";

export function PromachLoader({
  label = "Loading",
  size = "medium",
  inline = false,
}: {
  label?: string;
  size?: "small" | "medium" | "large";
  inline?: boolean;
}) {
  return (
    <span
      aria-label={label}
      className={`promach-loader ${size} ${inline ? "inline" : ""}`}
      role="status"
    >
      <span>
        <Image
          alt=""
          aria-hidden="true"
          height={40}
          priority={size === "large"}
          src="/brand/promach-logo.png"
          width={40}
        />
      </span>
      {!inline && <small>{label}</small>}
    </span>
  );
}
