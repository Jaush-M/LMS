import { test, expect } from "@playwright/test";

// Seed credentials — must match prisma/seed.ts
const SA_EMAIL = "superadmin@lms.local";
const SA_PASSWORD = "TempPass123!";

test.describe("authentication", () => {
  test("Super Administrator signs in and lands on dashboard", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill(SA_EMAIL);
    await page.getByLabel("Password").fill(SA_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/super-administrator\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Super Administrator/i })
    ).toBeVisible();
  });

  test("wrong credentials are rejected without revealing details", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill(SA_EMAIL);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).not.toContainText("password");
  });

  test("unauthenticated request to protected route redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/super-administrator/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("inactive User Account sign-in is rejected (TC-002)", async ({
    page,
  }) => {
    // Inactive account created by seed
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill("inactive@lms.local");
    await page.getByLabel("Password").fill("TempPass123!");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("alert")).toBeVisible();
  });
});
