import { test, expect } from "@playwright/test";

const TEMP_PASSWORD = "TempPass123!";

async function signIn(
  page: Parameters<Parameters<typeof test>[1]>[0],
  email: string
) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill(email);
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test.describe("role-based access control", () => {
  test("Educator cannot access Administrator dashboard by URL", async ({
    page,
  }) => {
    await signIn(page, "E000001@lms.edu.mv");
    await expect(page).toHaveURL(/\/educator\/dashboard/);

    await page.goto("/administrator/dashboard");
    await expect(page).toHaveURL(/\/educator\/dashboard/);
  });

  test("Student cannot access Administrator dashboard by URL", async ({
    page,
  }) => {
    await signIn(page, "S000001@lms.edu.mv");
    await expect(page).toHaveURL(/\/student\/dashboard/);

    await page.goto("/administrator/dashboard");
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });
});

test.describe("account creation — Super Administrator creates Administrator", () => {
  test("SA submits form and sees generated credentials", async ({ page }) => {
    await signIn(page, "SA000001@lms.edu.mv");
    await expect(page).toHaveURL(/\/super-administrator\/dashboard/);

    await page.getByRole("link", { name: "Create administrator" }).click();
    await expect(page).toHaveURL(/\/super-administrator\/create-administrator/);

    await page.getByLabel("Full name").fill("New Administrator");
    await page.getByRole("button", { name: "Create administrator" }).click();

    await expect(
      page.getByRole("heading", { name: "Account created" })
    ).toBeVisible();
    await expect(page.getByText(/A\d{6}@lms\.edu\.mv/)).toBeVisible();
  });
});

test.describe("account creation — Administrator creates Student or Educator", () => {
  test("Administrator creates a Student account", async ({ page }) => {
    await signIn(page, "A000001@lms.edu.mv");
    await expect(page).toHaveURL(/\/administrator\/dashboard/);

    await page.getByRole("link", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/administrator\/create-account/);

    await page.getByLabel("Full name").fill("New Student");
    await page.getByLabel("Role").selectOption("STUDENT");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(
      page.getByRole("heading", { name: "Account created" })
    ).toBeVisible();
    await expect(page.getByText(/S\d{6}@lms\.edu\.mv/)).toBeVisible();
  });
});
