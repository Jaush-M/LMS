import { test, expect } from "@playwright/test";

const TEMP_PASSWORD = "TempPass123!";

async function signInAsAdmin(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill("A000001@lms.edu.mv");
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL("/sign-in");
}

// ── TC-003: Course Offering creation ─────────────────────────────────────────

test.describe("Course Offering list (TC-003)", () => {
  test("Administrator sees the seeded course offerings in the list", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/administrator/course-offerings");

    await expect(page.getByRole("heading", { name: /Course Offerings/i })).toBeVisible();
    await expect(page.getByText("BSc CS — January 2025")).toBeVisible();
    await expect(page.getByText("BSc CS — May 2025")).toBeVisible();
    await expect(page.getByRole("link", { name: /Create/i })).toBeVisible();
  });
});

test.describe("Course Offering creation — TC-003", () => {
  test("Administrator creates a Course Offering from a Curriculum Template", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/administrator/course-offerings/new");

    await expect(page.getByRole("heading", { name: /Create Course Offering/i })).toBeVisible();

    // core fields
    await page.getByLabel("Name").fill("BSc CS — September 2025");
    await page.getByLabel("Course").selectOption({ label: "BSC-CS — BSc Computer Science" });
    await page.getByLabel("Intake").selectOption({ label: "September" });
    await page.getByLabel("Study mode").selectOption({ label: "Face-to-Face" });
    await page.getByLabel("Start date").fill("2025-09-15");
    await page.getByLabel("Finish date").fill("2026-06-15");
    await page.getByLabel("Capacity").fill("24");

    // template module educator assignments (two modules in the seeded template)
    const educatorSelects = page.getByRole("combobox", { name: /Educator for/i });
    const count = await educatorSelects.count();
    for (let i = 0; i < count; i++) {
      await educatorSelects.nth(i).selectOption({ label: "Educator (E000001)" });
    }

    await page.getByRole("button", { name: "Create Course Offering" }).click();

    // redirected to the new offering's detail page
    await expect(page).toHaveURL(/\/administrator\/course-offerings\/[^/]+$/);
    await expect(page.getByText("BSc CS — September 2025")).toBeVisible();

    // module offerings generated from template
    await expect(page.getByText("Programming Fundamentals")).toBeVisible();
    await expect(page.getByText("Data Structures")).toBeVisible();
  });
});

// ── TC-004: Enrollment capacity warning and override ─────────────────────────

test.describe("Enrollment capacity warning and override — TC-004", () => {
  test("Administrator sees capacity warning and can override with a reason", async ({ page }) => {
    await signInAsAdmin(page);

    // navigate to the full-capacity offering (BSc CS — January 2025, capacity 2, 2 enrolled)
    await page.goto("/administrator/course-offerings");
    await page.getByRole("link", { name: "BSc CS — January 2025" }).click();

    await expect(page).toHaveURL(/\/administrator\/course-offerings\/[^/]+$/);

    // click Enroll Student
    await page.getByRole("link", { name: /Enroll/i }).click();
    await expect(page).toHaveURL(/\/administrator\/course-offerings\/[^/]+\/enroll$/);

    // select the third student (S000007)
    await page.getByLabel("Student").selectOption({ label: "Enrollment Test Student (S000007)" });

    await page.getByRole("button", { name: /Enroll/i }).click();

    // capacity warning appears
    await expect(page.getByRole("alert", { name: "Capacity exceeded" })).toBeVisible();

    // fill override reason and confirm
    await page.getByLabel("Override reason").fill("Exception approved by Faculty Head");
    await page.getByRole("button", { name: "Confirm enrollment with override" }).click();

    // back on detail page, enrollment listed
    await expect(page).toHaveURL(/\/administrator\/course-offerings\/[^/]+$/);
    await expect(page.getByText("Enrollment Test Student")).toBeVisible();
  });
});

// ── TC-005: CSV enrollment import preview ────────────────────────────────────

test.describe("CSV enrollment import — TC-005", () => {
  test("Administrator uploads CSV, sees preview, and commits valid rows", async ({ page }) => {
    await signInAsAdmin(page);
    await page.goto("/administrator/enrollment-import");

    await expect(page.getByRole("heading", { name: /Enrollment Import/i })).toBeVisible();

    // select the May 2025 offering (has capacity)
    await page.getByLabel("Course Offering").selectOption({ label: "BSc CS — May 2025 - BSC-CS BSc Computer Science - May" });

    // provide CSV text with: 1 valid row (by identifier), 1 invalid row (bad email)
    const csv = [
      "Student Identifier,Institutional Email,Name",
      "S000004,,Force Change Student",    // valid: exists by identifier
      ",bad-email@,Should Fail",          // invalid: malformed email
    ].join("\n");

    await page.getByLabel("CSV text").fill(csv);
    await page.getByRole("button", { name: "Preview enrollment CSV" }).click();

    // preview shows valid and invalid row counts
    await expect(page.getByText("Valid: 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Invalid: 1", { exact: true })).toBeVisible();

    // commit
    await page.getByRole("button", { name: "Commit valid enrollment rows" }).click();
    await expect(page.getByText(/Enrolled: 1/i)).toBeVisible();
  });
});
