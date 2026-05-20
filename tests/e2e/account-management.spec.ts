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
  await expect(page).not.toHaveURL("/sign-in");
}

test.describe("Administrator account management", () => {
  test("Administrator activates an inactive Student account", async ({ page }) => {
    await signIn(page, "A000001@lms.edu.mv");
    await page.goto("/admin/accounts");

    await expect(page.getByText("S000005@lms.edu.mv")).toBeVisible();
    await expect(page.getByRole("row", { name: /S000005/ })).toContainText("Inactive");

    await page
      .getByRole("row", { name: /S000005/ })
      .getByRole("button", { name: "Activate" })
      .click();

    await expect(page.getByRole("row", { name: /S000005/ })).toContainText("Active");
  });

  test("Administrator disables an active Student account", async ({ page }) => {
    await signIn(page, "A000001@lms.edu.mv");
    await page.goto("/admin/accounts");

    await expect(page.getByText("S000006@lms.edu.mv")).toBeVisible();
    await expect(
      page.getByRole("row", { name: /S000006/ }).getByRole("button", { name: "Disable" })
    ).toBeVisible();

    await page
      .getByRole("row", { name: /S000006/ })
      .getByRole("button", { name: "Disable" })
      .click();

    await expect(page.getByRole("row", { name: /S000006/ })).toContainText("Disabled");
  });
});

test.describe("Super Administrator system settings", () => {
  test("Super Administrator updates a system setting and sees the updated value", async ({
    page,
  }) => {
    await signIn(page, "SA000001@lms.edu.mv");
    await page.goto("/admin/system-settings");

    await expect(page.getByRole("heading", { name: /System Settings/i })).toBeVisible();

    const field = page.getByLabel("Default reminder period (days)");
    await field.fill("20");
    await page.getByRole("button", { name: "Save settings" }).click();

    await expect(field).toHaveValue("20");
  });
});
