import { test, expect } from "@playwright/test";

const TEMP_PASSWORD = "TempPass123!";

async function signInAsAdmin(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill("A000001@lms.edu.mv");
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL("/sign-in");
}

async function signInAsEducator(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/sign-in");
  await page.getByLabel("Institutional email").fill("E000001@lms.edu.mv");
  await page.getByLabel("Password").fill(TEMP_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL("/sign-in");
}

// Navigate to the January 2025 offering's sessions page
async function navigateToAdminSessions(page: Parameters<Parameters<typeof test>[1]>[0]) {
  await page.goto("/administrator/course-offerings");
  await page.getByRole("link", { name: "BSc CS — January 2025" }).click();
  const offeringUrl = page.url();
  const id = offeringUrl.split("/").at(-1)!;
  await page.goto(`/administrator/course-offerings/${id}/sessions`);
  await expect(page).toHaveURL(/\/administrator\/course-offerings\/.+\/sessions$/);
}

// ── TC-006: Session scheduling ────────────────────────────────────────────────

test.describe("Class Session scheduling — TC-006", () => {
  test("Administrator schedules a new class session", async ({ page }) => {
    await signInAsAdmin(page);
    await navigateToAdminSessions(page);

    await page.getByRole("link", { name: "+ Schedule Session" }).click();
    await expect(page).toHaveURL(/\/sessions\/new$/);

    await page.getByLabel("Module").selectOption({ label: "Programming Fundamentals" });
    await page.getByLabel("Session Type").selectOption({ label: "Lecture" });
    await page.getByLabel("Start").fill("2025-06-10T09:00");
    await page.getByLabel("Finish").fill("2025-06-10T11:00");
    await page.getByLabel("Location (optional)").fill("Room B201");

    await page.getByRole("button", { name: "Schedule Session" }).click();

    await expect(page).toHaveURL(/\/administrator\/course-offerings\/.+\/sessions$/);
    await expect(page.getByText("Room B201")).toBeVisible();
  });

  test("Administrator sees seeded sessions in the list", async ({ page }) => {
    await signInAsAdmin(page);
    await navigateToAdminSessions(page);

    // at least two sessions seeded plus the one created above
    await expect(page.getByText("Lecture")).toBeVisible();
    await expect(page.getByText("Room A101")).toBeVisible();
  });
});

// ── TC-007: Attendance ────────────────────────────────────────────────────────

test.describe("Attendance submission — TC-007", () => {
  test("Educator sees sessions list with lock and submit states", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Class Sessions/i }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/sessions$/);
    // recent session is not locked → shows View / Correct
    await expect(page.getByRole("link", { name: "View / Correct" })).toBeVisible();
    // locked session shows Locked badge, no action link
    await expect(page.getByText("Locked")).toBeVisible();
  });

  test("Educator corrects attendance for the recent session", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Class Sessions/i }).click();

    await page.getByRole("link", { name: "View / Correct" }).click();
    await expect(page).toHaveURL(/\/sessions\/.+\/attendance$/);

    // at least one student row is visible with radio buttons
    await expect(page.getByRole("radio", { name: /Present/i }).first()).toBeVisible();

    // change first student's status to Late
    const lateRadio = page.locator("tr:has(input[name^='status_']) input[value='LATE']").first();
    await lateRadio.check();

    await page.getByRole("button", { name: "Submit Attendance" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/sessions$/);
  });
});
