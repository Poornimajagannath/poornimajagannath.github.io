import { test } from "@e2e-dev/web";
import { expect } from "e2e";

const linkedIn = "https://www.linkedin.com/in/poornima-j/";

test("a visitor reads an essay from the homepage", async ({ app, screen, browser }) => {
  await app.open("/");

  await expect(
    screen.getByRole("heading", "Poornima Jagannath", { level: 1 }),
  ).toBeVisible();
  await expect(screen.getByRole("link", "Read the essays")).toBeVisible();

  await screen.getByRole("link", "Read the essays").tap();
  await expect(screen.getByRole("heading", "Essays", { level: 2 })).toBeVisible();

  await screen.getByRole("link", /How this site came together/).tap();
  await expect(browser).toHaveURL(/\/writing\/building-this-site-in-the-ai-era\/?$/);
  await expect(
    screen.getByRole("heading", "How this site came together", { level: 1 }),
  ).toBeVisible();
  await expect(screen.getByText("That became the workflow.")).toBeVisible();
});

test("a visitor opens every section from the header", async ({ app, screen, browser }) => {
  await app.open("/");

  await screen.getByRole("link", "Writing", { visible: true }).tap();
  await expect(browser).toHaveURL(/\/writing\/?$/);
  await expect(screen.getByRole("heading", "Writing", { level: 1 })).toBeVisible();
  await screen
    .getByRole("main")
    .getByRole("link", "Buying back time with AI agents")
    .tap();
  await expect(browser).toHaveURL(/\/writing\/buying-back-time-with-ai-agents\/?$/);
  await expect(screen.getByText("So far, it is working.")).toBeVisible();

  await screen.getByRole("link", "Building", { visible: true }).tap();
  await expect(screen.getByRole("heading", "Building", { level: 1 })).toBeVisible();
  await screen
    .getByRole("main")
    .getByRole("listitem")
    .getByRole("link", /What.s This in Kannada/)
    .tap();
  await expect(browser).toHaveURL(/\/building\/whats-this-in-kannada\/?$/);
  await expect(screen.getByRole("heading", /What.s This in Kannada/, { level: 1 })).toBeVisible();
  await expect(screen.getByText(/The squirrel has more to do/)).toBeVisible();

  await screen.getByRole("link", "Connect", { visible: true }).tap();
  await expect(screen.getByRole("heading", "Say hello", { level: 1 })).toBeVisible();

  await screen.getByRole("link", "Home", { visible: true }).tap();
  await expect(
    screen.getByRole("heading", "Poornima Jagannath", { level: 1 }),
  ).toBeVisible();
});

test("a visitor can reach LinkedIn, the QR page, and the public video series", async ({
  app,
  screen,
}) => {
  await app.open("/");

  const series = screen.getByRole("link", /Cybersource Developer Education Series/);
  await expect(series).toHaveAttribute(
    "href",
    "https://www.youtube.com/playlist?list=PL9qINLsWlhs2fzbdsdEBTMNgasNhbG4er",
  );
  await expect(series).toHaveAttribute("target", "_blank");

  await screen.getByRole("link", "Say hello").tap();
  await expect(screen.getByRole("heading", "Say hello", { level: 1 })).toBeVisible();

  const linkedInLink = screen.getByRole("main").getByRole("link", "Open LinkedIn");
  await expect(linkedInLink).toHaveAttribute("href", linkedIn);

  await screen.getByRole("link", "Read the essays").tap();
  await expect(screen.getByRole("heading", "Writing", { level: 1 })).toBeVisible();
  await app.open("/connect");

  await screen.getByRole("link", "See what I am building").tap();
  await expect(screen.getByRole("heading", "Building", { level: 1 })).toBeVisible();
  await app.open("/connect");

  await screen.getByRole("link", "Open the LinkedIn QR page").tap();
  await expect(
    screen.getByRole("heading", "Connect with me on LinkedIn", { level: 1 }),
  ).toBeVisible();
  await expect(
    screen.getByRole("image", "QR code linking to Poornima Jagannath on LinkedIn"),
  ).toBeVisible();
  await expect(screen.getByRole("link", "Open LinkedIn")).toHaveAttribute("href", linkedIn);
});

test("search finds a page and opens it", async ({ app, screen, browser }) => {
  await app.open("/");

  await screen.getByRole("button", "Search").tap();
  const dialog = screen.getByRole("dialog", "Search docs");
  await expect(dialog.getByRole("link", "Say hello")).toBeVisible();

  await dialog.getByRole("searchbox", "Search docs").fill("Kannada");
  const result = dialog.getByRole("link", /^Building What.s This in Kannada/);
  await expect(result).toBeVisible();
  await result.tap();

  await expect(browser).toHaveURL(/\/building\/whats-this-in-kannada\/?$/);
  await expect(screen.getByRole("heading", /What.s This in Kannada/, { level: 1 })).toBeVisible();
});

test("the color theme sticks on the next page", async ({ app, screen, browser }) => {
  await app.open("/");

  await expect
    .poll(() => browser.evaluate(() => document.documentElement.dataset.theme))
    .toBe("light");

  await screen.getByRole("button", "Toggle color theme").tap();
  await expect
    .poll(() => browser.evaluate(() => document.documentElement.dataset.theme))
    .toBe("dark");

  await screen.getByRole("link", "Writing", { visible: true }).tap();
  await expect(screen.getByRole("heading", "Writing", { level: 1 })).toBeVisible();
  await expect
    .poll(() => browser.evaluate(() => document.documentElement.dataset.theme))
    .toBe("dark");
  await expect
    .poll(() => browser.evaluate(() => localStorage.getItem("blume-theme")))
    .toBe("dark");
});

test("a phone visitor opens the menu and reaches Connect", async ({ app, screen, browser }) => {
  await browser.setViewport({ width: 390, height: 844 });
  await app.open("/");

  await expect(screen.getByRole("link", "Connect", { visible: true })).toBeHidden();
  await screen.getByRole("button", "Toggle navigation").tap();
  await screen.getByRole("link", "Connect", { visible: true }).tap();

  await expect(browser).toHaveURL(/\/connect\/?$/);
  await expect(screen.getByRole("heading", "Say hello", { level: 1 })).toBeVisible();
  await expect(screen.getByRole("link", "Open LinkedIn")).toBeVisible();
});

test("choosing a book shows its note", async ({ app, screen, browser }) => {
  await app.open("/");

  await screen
    .getByRole("list", "Books on the shelf")
    .getByRole("listitem")
    .nth(3)
    .tap();

  await expect(browser.locator('[data-book-note="3"].is-active')).toContainText(
    "Honest about the awkward middle of learning to lead",
  );
});

test("a missing page offers a way home", async ({ app, screen, browser }) => {
  await app.open("/this-page-does-not-exist");

  await expect(screen.getByRole("heading", "Page not found", { level: 1 })).toBeVisible();
  await screen.getByRole("link", "Back to home").tap();

  await expect(browser).toHaveURL(/\/$/);
  await expect(
    screen.getByRole("heading", "Poornima Jagannath", { level: 1 }),
  ).toBeVisible();
});

test("page feedback thanks the visitor", async ({ app, screen }) => {
  await app.open("/connect");

  const feedback = screen.getByRole("region", "Was this page helpful?");
  await feedback.getByRole("button", "Yes").tap();
  await expect(feedback.getByText("Thanks for your feedback!")).toBeVisible();
  await expect(feedback.getByRole("button", "Yes")).toBeHidden();
});
