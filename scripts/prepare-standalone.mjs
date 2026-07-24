import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const standaloneRoot = resolve(".next/standalone");
const staticTarget = resolve(standaloneRoot, ".next/static");
const publicTarget = resolve(standaloneRoot, "public");

await Promise.all([
  rm(staticTarget, { force: true, recursive: true }),
  rm(publicTarget, { force: true, recursive: true }),
]);
await mkdir(resolve(standaloneRoot, ".next"), { recursive: true });
await Promise.all([
  cp(resolve(".next/static"), staticTarget, { recursive: true }),
  cp(resolve("public"), publicTarget, { recursive: true }),
]);

process.stdout.write(
  "EC2 standalone bundle prepared in .next/standalone.\n",
);
