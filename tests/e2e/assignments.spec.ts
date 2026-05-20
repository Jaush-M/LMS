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

async function navigateToEducatorAssignments(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/educator/modules");
  await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
  await page.getByRole("link", { name: /Assignments/i }).click();
  await expect(page).toHaveURL(/\/educator\/modules\/.+\/assignments$/);
}

// ── TC-008: Assignments ───────────────────────────────────────────────────────

test.describe("Assignments list — TC-008", () => {
  test("Educator sees the seeded published assignment", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorAssignments(page);

    await expect(page.getByRole("link", { name: /Assignment 1: Hello World/i })).toBeVisible();
    await expect(page.getByText("PUBLISHED")).toBeVisible();
  });

  test("Educator creates a new draft assignment", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorAssignments(page);

    await page.getByRole("button", { name: "+ New Assignment" }).click();
    await page.getByLabel("Title").fill("Quiz 1: Basic Syntax");
    await page.getByLabel("Deadline").fill("2025-05-31T23:59");
    await page.getByLabel("Maximum Mark").fill("50");
    await page.getByRole("button", { name: "Create Assignment" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/assignments$/);
    await expect(page.getByText("Quiz 1: Basic Syntax")).toBeVisible();
  });
});

test.describe("Assignment publish/unpublish — TC-008", () => {
  test("Educator can unpublish then republish the seeded assignment", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorAssignments(page);

    await page.getByRole("link", { name: /Assignment 1: Hello World/i }).click();
    await expect(page).toHaveURL(/\/educator\/modules\/.+\/assignments\/.+$/);

    // unpublish
    await page.getByRole("button", { name: "Unpublish" }).click();
    await expect(page.getByRole("button", { name: "Publish" })).toBeVisible();

    // republish
    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Unpublish" })).toBeVisible();
  });

  test("Educator can extend the assignment deadline", async ({ page }) => {
    await signInAsEducator(page);
    await navigateToEducatorAssignments(page);

    await page.getByRole("link", { name: /Assignment 1: Hello World/i }).click();
    await page.getByRole("button", { name: "Extend Deadline" }).click();

    await page.getByLabel("New Deadline").fill("2025-04-15T23:59");
    await page.getByLabel("Reason").fill("Extended for revision week");
    await page.getByRole("button", { name: "Extend Deadline" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/assignments\/.+$/);
    await expect(page.getByText(/Deadline extended/i)).toBeVisible();
  });
});

// ── TC-010: Mark entry ────────────────────────────────────────────────────────

test.describe("Assessment marks — TC-010", () => {
  test("Educator enters a component mark for a student", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Grades/i }).click();
    await expect(page).toHaveURL(/\/educator\/modules\/.+\/grades$/);

    await expect(page.getByText("Assignment 1")).toBeVisible();
    await expect(page.getByText("Final Exam")).toBeVisible();

    // enter mark for the Assignment 1 component
    const markForm = page.locator("form").filter({ hasText: "Enter Mark" }).first();
    await markForm.getByRole("combobox").selectOption({ label: /Student \(S000001\)/i });
    await markForm.locator("input[name='score']").fill("75");
    await markForm.locator("input[name='feedback']").fill("Good work");
    await markForm.getByRole("button", { name: "Enter Mark" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/grades$/);
    await expect(page.getByText("75")).toBeVisible();
  });
});

// ── TC-009: Student assignment view ──────────────────────────────────────────

test.describe("Student assignment view — TC-009", () => {
  test("Student sees published assignment", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Assignments/i }).click();
    await expect(page).toHaveURL(/\/student\/modules\/.+\/assignments$/);

    await expect(page.getByText("Assignment 1: Hello World")).toBeVisible();
    await expect(page.getByText(/Due/i)).toBeVisible();
  });
});
