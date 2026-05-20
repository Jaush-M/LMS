import { test, expect } from "@playwright/test";

// Seed credentials — must match prisma/seed.ts
const TEMP_PASSWORD = "TempPass123!";

const ROLES = [
  {
    email: "SA000001@lms.edu.mv",
    dashboard: /\/admin\/dashboard/,
    heading: /Super Administrator/i,
  },
  {
    email: "A000001@lms.edu.mv",
    dashboard: /\/admin\/dashboard/,
    heading: /Administrator Dashboard/i,
  },
  {
    email: "E000001@lms.edu.mv",
    dashboard: /\/educator\/dashboard/,
    heading: /Guided Learning Dashboard/i,
  },
  {
    email: "S000001@lms.edu.mv",
    dashboard: /\/student\/dashboard/,
    heading: /Guided Learning Dashboard/i,
  },
];

test.describe("authentication — TC-001", () => {
  for (const { email, dashboard, heading } of ROLES) {
    test(`${email} signs in and lands on correct dashboard`, async ({ page }) => {
      await page.goto("/sign-in");
      await page.getByLabel("Institutional email").fill(email);
      await page.getByLabel("Password").fill(TEMP_PASSWORD);
      await page.getByRole("button", { name: "Sign in" }).click();

      await expect(page).toHaveURL(dashboard);
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    });
  }
});

test.describe("authentication — error cases", () => {
  test("wrong credentials are rejected without revealing details", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill("SA000001@lms.edu.mv");
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.getByRole("alert")).not.toContainText("password");
  });

  test("unauthenticated request to protected route redirects to sign-in", async ({
    page,
  }) => {
    await page.goto("/admin/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("inactive User Account sign-in is rejected (TC-002)", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill("S000002@lms.edu.mv");
    await page.getByLabel("Password").fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("alert")).toBeVisible();
  });

  test("disabled User Account sign-in is rejected (TC-002)", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill("S000003@lms.edu.mv");
    await page.getByLabel("Password").fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL("/sign-in");
    await expect(page.getByRole("alert")).toBeVisible();
  });
});

test.describe("temporary password — force change flow", () => {
  test("user with mustChangePassword is redirected to change-password and lands on dashboard after", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Institutional email").fill("S000004@lms.edu.mv");
    await page.getByLabel("Password").fill(TEMP_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/change-password/);

    await page.getByLabel("New password").fill("NewSecurePass99!");
    await page.getByLabel("Confirm password").fill("NewSecurePass99!");
    await page.getByRole("button", { name: "Change password" }).click();

    await expect(page).toHaveURL(/\/student\/dashboard/);
  });
});
