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

async function navigateToEducatorContent(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/educator/modules");
  await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
  await page.getByRole("link", { name: /^Content$/i }).click();
  await expect(page).toHaveURL(/\/educator\/modules\/.+\/content$/);
}

async function navigateToStudentContent(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/student/modules");
  await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
  await page.getByRole("link", { name: /^Content$/i }).click();
  await expect(page).toHaveURL(/\/student\/modules\/.+\/content$/);
}

// ── TC-014: Module Content ────────────────────────────────────────────────────

test.describe("Module Content — TC-014", () => {
  test("Educator sees seeded content section and published item", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorContent(page);

    await expect(page.getByText("Week 1: Introduction")).toBeVisible();
    await expect(page.getByText("Course Overview")).toBeVisible();
    await expect(page.getByText("Setup Instructions (Draft)")).toBeVisible();
  });

  test("Educator creates a new content section", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorContent(page);

    await page.getByPlaceholder("New section title").fill("Week 2: Variables");
    await page.getByRole("button", { name: "Add Section" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/content$/);
    await expect(page.getByText("Week 2: Variables")).toBeVisible();
  });

  test("Educator publishes a draft content item", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorContent(page);

    // find the draft item row and click Publish
    const draftRow = page.getByText("Setup Instructions (Draft)").locator("..");
    await draftRow.getByRole("button", { name: "Publish" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/content$/);
    // item is now published — DRAFT badge is gone from that item
    const updatedRow = page.getByText("Setup Instructions (Draft)").locator("..");
    await expect(updatedRow.getByText("PUBLISHED")).toBeVisible();
  });

  test("Student sees published content but not drafts", async ({ page }) => {
    await signInAsStudent(page);
    await navigateToStudentContent(page);

    await expect(page.getByText("Course Overview")).toBeVisible();
    await expect(page.getByText("Week 1: Introduction")).toBeVisible();
    // draft item must not appear
    await expect(page.getByText("Setup Instructions (Draft)")).not.toBeVisible();
  });
});
