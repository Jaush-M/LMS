import { describe, it, expect } from "vitest";
import { parseEnv } from "./env";

describe("env validation", () => {
  const valid = {
    DATABASE_URL: "postgresql://localhost/lms_db",
    BETTER_AUTH_SECRET: "test-secret",
    BETTER_AUTH_URL: "http://localhost:3000",
  };

  it("throws when DATABASE_URL is missing", () => {
    const { DATABASE_URL: _, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/DATABASE_URL/);
  });

  it("throws when BETTER_AUTH_SECRET is missing", () => {
    const { BETTER_AUTH_SECRET: _, ...rest } = valid;
    expect(() => parseEnv(rest)).toThrow(/BETTER_AUTH_SECRET/);
  });

  it("returns parsed env when all required vars are present", () => {
    const result = parseEnv(valid);
    expect(result.DATABASE_URL).toBe("postgresql://localhost/lms_db");
    expect(result.BETTER_AUTH_SECRET).toBe("test-secret");
  });

  it("BETTER_AUTH_URL defaults to http://localhost:3000 when not set", () => {
    const { BETTER_AUTH_URL: _, ...rest } = valid;
    const result = parseEnv(rest);
    expect(result.BETTER_AUTH_URL).toBe("http://localhost:3000");
  });
});
