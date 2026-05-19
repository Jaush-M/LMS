import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  LOCAL_STORAGE_PATH: z.string().default("./uploads"),
});

export function parseEnv(raw: Record<string, string | undefined>) {
  const result = schema.safeParse(raw);
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => i.path.join("."))
      .join(", ");
    throw new Error(`Missing required environment variables: ${missing}`);
  }
  return result.data;
}

export const env = parseEnv(process.env as Record<string, string | undefined>);
