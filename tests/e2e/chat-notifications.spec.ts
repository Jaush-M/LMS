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

// ── TC-012: Group chat ────────────────────────────────────────────────────────

test.describe("Group Chat — TC-012", () => {
  test("Educator sees seeded messages and sends a new message", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Group Chat/i }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/chat$/);

    // seeded messages are visible
    await expect(page.getByText("Welcome to the module chat!")).toBeVisible();
    await expect(page.getByText("@E000001 When is Assignment 1 due?")).toBeVisible();

    // send a new message
    await page.getByPlaceholder(/Type a message/i).fill("The deadline is 15 March. Good luck!");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page).toHaveURL(/\/educator\/modules\/.+\/chat$/);
    await expect(page.getByText("The deadline is 15 March. Good luck!")).toBeVisible();
  });

  test("Student sees chat messages and sends a message", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/modules");
    await page.getByRole("link", { name: /Programming Fundamentals.*January 2025/i }).click();
    await page.getByRole("link", { name: /Group Chat/i }).click();

    await expect(page).toHaveURL(/\/student\/modules\/.+\/chat$/);
    await expect(page.getByText("Welcome to the module chat!")).toBeVisible();

    await page.getByPlaceholder(/Type a message/i).fill("Thank you!");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page).toHaveURL(/\/student\/modules\/.+\/chat$/);
    await expect(page.getByText("Thank you!")).toBeVisible();
  });
});

// ── TC-013: Notifications ─────────────────────────────────────────────────────

test.describe("Notification Center — TC-013", () => {
  test("Student sees seeded unread notifications", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/notification-center");

    await expect(page.getByRole("heading", { name: /Notification Center/i })).toBeVisible();
    // seeded assignment and mention notifications
    await expect(page.getByText("New Assignment Published")).toBeVisible();
  });

  test("Student marks a notification as read", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/notification-center");

    await page.getByRole("button", { name: "Mark read" }).first().click();

    await expect(page).toHaveURL(/\/student\/notification-center/);
    // after marking one read the button count decreases or unread count updates
  });

  test("Student marks all notifications as read", async ({ page }) => {
    await signInAsStudent(page);
    await page.goto("/student/notification-center");

    await page.getByRole("button", { name: "Mark all read" }).click();

    await expect(page).toHaveURL(/\/student\/notification-center/);
    // no unread notifications remain — mark-all button disappears
    await expect(page.getByRole("button", { name: "Mark all read" })).not.toBeVisible();
  });

  test("Educator sees mention notification in notification center", async ({ page }) => {
    await signInAsEducator(page);
    await page.goto("/educator/notification-center");

    await expect(page.getByRole("heading", { name: /Notification Center/i })).toBeVisible();
    await expect(page.getByText("You were mentioned in module chat")).toBeVisible();
  });
});
