import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/auth/me", route => route.fulfill({ json: signedIn ? [{ id: "user-id", email: "student@umass.edu", favoriteFoods: [], allergies: [] }] : [] }));
  await page.route("**/api/authenticate", route => { signedIn = true; return route.fulfill({ json: { success: true } }); });
  await page.route("**/api/auth/logout", route => { signedIn = false; return route.fulfill({ json: [] }); });
  await page.route("**/api/users", route => route.fulfill({ status: 409, json: { error: "username already taken" } }));
});

test("guests can navigate to Map, Profile, About, and Menus", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  for (const [name, heading] of [["Map", "Campus map"], ["Profile", "Profile"], ["About", "Good food. Great company."], ["Menus", "Choose where to eat"]]) {
    await navigation.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await navigation.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page).toHaveURL("/");
});

test("login validates inputs and keeps rejected credentials signed out", async ({ page }) => {
  await page.route("**/api/authenticate", route => route.fulfill({ status: 401, json: { success: false } }));
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Log in", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Welcome back" });
  const email = dialog.getByLabel("Email", { exact: true });
  const password = dialog.getByLabel("Password", { exact: true });
  const submit = dialog.getByRole("button", { name: "Log in", exact: true });
  await submit.click();
  await expect(email).toBeFocused();
  await email.fill("not-an-email");
  await password.fill("Test-password-123");
  await submit.click();
  await expect(email).toBeFocused();
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await email.fill("student@example.com");
  await submit.click();
  await expect(dialog.getByRole("alert")).toHaveText("Invalid email or password. Please try again.");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole("navigation").getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("heading", { name: /browsing as a guest/ })).toBeVisible();
});

test("signup reports mismatched passwords and allows continuing as a guest", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Sign up", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Create your account" });
  await dialog.getByLabel("Name", { exact: true }).fill("Test Student");
  await dialog.getByLabel("Email", { exact: true }).fill("student@example.com");
  await dialog.getByLabel("Password", { exact: true }).fill("Test-password-123");
  const confirmation = dialog.getByLabel("Confirm password", { exact: true });
  await confirmation.fill("Different-password");
  await dialog.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("Your passwords don’t match.");
  await expect(confirmation).toHaveAttribute("aria-invalid", "true");
  await expect(confirmation).toBeFocused();
  await confirmation.fill("Test-password-123");
  await expect(dialog.getByRole("alert")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(dialog.getByRole("alert")).toHaveText("An account with this email already exists.");
  await dialog.getByRole("button", { name: "Continue as guest" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page).toHaveURL("/");
});

test("switching login and signup resets the form and Escape restores focus", async ({ page }) => {
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Log in", exact: true });
  await trigger.click();
  await page.getByRole("dialog").getByLabel("Email", { exact: true }).fill("student@example.com");
  await page.getByRole("dialog").getByRole("button", { name: "Sign up", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Create your account" })).toBeVisible();
  await expect(page.getByRole("dialog").getByLabel("Email", { exact: true })).toHaveValue("");
  await page.getByRole("dialog").getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Welcome back" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});


test("verified login opens profile, logout clears state, and reload restores session", async ({ page }) => {
  let signedIn = false;
  await page.route("**/api/auth/me", route => route.fulfill({ json: signedIn ? [{ id: "user-id", email: "student@umass.edu", favoriteFoods: [], allergies: [] }] : [] }));
  await page.route("**/api/auth/logout", route => { signedIn = false; return route.fulfill({ json: [] }); });
  await page.route("**/api/authenticate", async route => {
    signedIn = true;
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ username: "student@umass.edu", password: "Test-password-123" });
    await route.fulfill({ json: { success: true } });
  });
  await page.goto("/");
  async function login() {
    await page.getByRole("button", { name: "Log in", exact: true }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Email", { exact: true }).fill("student@umass.edu");
    await dialog.getByLabel("Password", { exact: true }).fill("Test-password-123");
    await dialog.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page).toHaveURL("/profile");
    await expect(page.getByText("student@umass.edu", { exact: true })).toBeVisible();
  }
  await login();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page.getByRole("heading", { name: /browsing as a guest/ })).toBeVisible();
  await login();
  await page.reload();
  await expect(page.getByText("student@umass.edu", { exact: true })).toBeVisible();
});
