import { test, expect } from "@playwright/test";

const TEMP_PASSWORD = "TempPass123!";

async function signInAsEducator(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill("E000001@lms.edu.mv");
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL("/sign-in");
}

async function signInAsStudent(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill("S000001@lms.edu.mv");
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL("/sign-in");
}

// ── TC-016: Module Feedback ───────────────────────────────────────────────────

test.describe("Educator feedback report — TC-016", () => {
  test("Educator sees aggregated feedback report for Programming Fundamentals", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Feedback/i }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/feedback$/);

    // seeded period is closed (Feb 2025), 1 response, avg rating 4.0
    await expect(page.getByText("4.0")).toBeVisible();
    await expect(page.getByText("1")).toBeVisible(); // response count
    await expect(page.getByText(/Well-structured lectures/i)).toBeVisible();
  });
});

test.describe("Student feedback — TC-016", () => {
  test("Student sees closed-period message for Programming Fundamentals", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Feedback/i }).click();

    await expect(page).toHaveURL(/\/student\/modules\/.+\/feedback$/);

    // S000001 already responded to the closed period
    await expect(page.getByText(/feedback has been submitted/i)).toBeVisible();
    await expect(page.getByText("4/5")).toBeVisible();
  });

  test("Student submits feedback for Data Structures (open period)", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/modules");
    await page.getByRole("link", { name: /Data Structures/i }).click();
    await page.getByRole("link", { name: /Feedback/i }).click();

    await expect(page).toHaveURL(/\/student\/modules\/.+\/feedback$/);

    // open feedback period — form should be visible
    await expect(page.getByRole("radio", { name: "5" })).toBeVisible();

    await page.getByRole("radio", { name: "5" }).check();
    await page.getByLabel(/Comment/i).fill("Excellent course material.");
    await page.getByRole("button", { name: "Submit Feedback" }).click();

    await expect(page).toHaveURL(/\/student\/modules\/.+\/feedback$/);
    await expect(page.getByText(/feedback has been submitted/i)).toBeVisible();
    await expect(page.getByText("5/5")).toBeVisible();
  });
});
