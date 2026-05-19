import { execSync } from "child_process";

export default function globalSetup() {
  execSync("bun prisma/teardown.ts && bun prisma/seed.ts", { stdio: "inherit" });
}
